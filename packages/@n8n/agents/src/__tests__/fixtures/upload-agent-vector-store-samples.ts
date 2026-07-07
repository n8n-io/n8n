/**
 * One-off script: seeds all four agent vector store backends with sample data
 * so the "Connect vector store" frontend flow can be tested end to end.
 *
 * Pulls 40 rows from the Hugging Face dataset
 * Qdrant/dbpedia-entities-openai3-text-embedding-3-small-1536-100K (pre-embedded
 * with text-embedding-3-small at 1536 dims), assigns 4 round-robin categories,
 * and uploads one category per backend:
 *
 *   history   -> Pinecone  (index: agent-history)
 *   science   -> Supabase  (table: agent_science_docs, rpc: match_agent_science_docs)
 *   geography -> Qdrant    (collection: agent_geography_docs)
 *   culture   -> Postgres  (table: agent_culture_docs)
 *
 * Document ids are deterministic (derived from the title) so re-runs upsert
 * instead of duplicating.
 *
 * Run from packages/@n8n/agents: pnpm tsx src/__tests__/fixtures/upload-agent-vector-store-samples.ts
 */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { config as loadEnv } from 'dotenv';
import type { Pool } from 'pg';

import { PgVectorStore } from '../../vector-stores/postgres';
import { PineconeVectorStore } from '../../vector-stores/pinecone';
import { QdrantVectorStore } from '../../vector-stores/qdrant';
import { SupabaseVectorStore } from '../../vector-stores/supabase';

// Root .env holds the store credentials; the package .env additionally holds
// SUPABASE_TEST_DB_URL (direct Postgres connection, needed for Supabase DDL).
loadEnv({ path: path.resolve(__dirname, '../../../../../../.env') });
loadEnv({ path: path.resolve(__dirname, '../../../.env') });

const DOCS_PER_CATEGORY = 10;
const CATEGORIES = ['history', 'science', 'geography', 'culture'] as const;
const DOC_COUNT = DOCS_PER_CATEGORY * CATEGORIES.length;
const DIMENSIONS = 1536;
const HF_DATASET = 'Qdrant/dbpedia-entities-openai3-text-embedding-3-small-1536-100K';
const EMBEDDING_FIELD = 'text-embedding-3-small-1536-embedding';
const SUMMARY_PATH = path.join(__dirname, 'agent-vector-store-samples-summary.json');

const PINECONE_INDEX = 'agent-history';
const SUPABASE_TABLE = 'agent_science_docs';
const SUPABASE_QUERY = 'match_agent_science_docs';
const QDRANT_COLLECTION = 'agent_geography_docs';
const POSTGRES_TABLE = 'agent_culture_docs';

interface HfRow {
	title: string;
	text: string;
	[EMBEDDING_FIELD]: number[];
}

interface SampleDoc {
	id: string;
	content: string;
	metadata: { title: string; category: string };
	vector: number[];
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required env var: ${name}`);
	return value;
}

/** Deterministic UUID from the title (Qdrant requires UUID point ids). */
function titleToUuid(title: string): string {
	const hex = createHash('sha256').update(title).digest('hex').slice(0, 32);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function fetchHfRows(): Promise<HfRow[]> {
	const url =
		`https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(HF_DATASET)}` +
		`&config=default&split=train&offset=0&length=${DOC_COUNT}`;
	for (let attempt = 1; attempt <= 5; attempt++) {
		const res = await fetch(url);
		if (res.ok) {
			const body = (await res.json()) as { rows: Array<{ row: HfRow }> };
			return body.rows.map((r) => r.row);
		}
		if (attempt === 5) throw new Error(`HF request failed: ${res.status} ${await res.text()}`);
		console.warn(`  HF request failed (${res.status}), retrying (${attempt}/5)...`);
		await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
	}
	throw new Error('unreachable');
}

// DDL helpers inlined from ../integration/vector-store-helpers.ts (that file
// imports vitest and cannot be loaded outside a test run).
async function createPgVectorTable(
	pool: Pool,
	tableName: string,
	opts: { dimensions: number; hnswIndex?: boolean },
): Promise<void> {
	await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
	await pool.query(
		`CREATE TABLE IF NOT EXISTS "${tableName}" (
			id TEXT PRIMARY KEY,
			content TEXT NOT NULL,
			metadata JSONB NOT NULL DEFAULT '{}',
			embedding vector(${opts.dimensions}) NOT NULL
		);`,
	);
	if (opts.hnswIndex) {
		await pool.query(
			`CREATE INDEX IF NOT EXISTS "${tableName}_embedding_idx" ON "${tableName}" USING hnsw (embedding vector_cosine_ops);`,
		);
	}
}

async function createSupabaseVectorTableAndFunction(
	pool: Pool,
	tableName: string,
	queryName: string,
	dimensions: number,
): Promise<void> {
	await createPgVectorTable(pool, tableName, { dimensions });
	await pool.query(
		`CREATE OR REPLACE FUNCTION "${queryName}"(query_embedding vector(${dimensions}))
		 RETURNS TABLE (id text, content text, metadata jsonb, similarity float)
		 LANGUAGE sql STABLE AS $$
			SELECT id, content, metadata, 1 - (embedding <=> query_embedding) AS similarity
			FROM "${tableName}"
			ORDER BY embedding <=> query_embedding;
		 $$;`,
	);
	// PostgREST caches the schema; new tables/functions aren't servable until it reloads.
	await pool.query("NOTIFY pgrst, 'reload schema';");
}

/** PostgREST's schema cache reloads asynchronously after DDL — poll until the new function is servable. */
async function waitUntilQueryable(store: SupabaseVectorStore, dimensions: number): Promise<void> {
	const zeroVector = new Array<number>(dimensions).fill(0);
	const deadline = Date.now() + 15_000;
	for (;;) {
		try {
			await store.query(zeroVector, { topK: 1 });
			return;
		} catch (error) {
			if (Date.now() > deadline) throw error;
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}
}

function toRecords(docs: SampleDoc[]) {
	return docs.map((doc) => ({
		id: doc.id,
		vector: doc.vector,
		content: doc.content,
		metadata: doc.metadata,
	}));
}

async function uploadPinecone(docs: SampleDoc[]): Promise<void> {
	const apiKey = requireEnv('PINECONE_API_KEY');
	const { Pinecone } = await import('@pinecone-database/pinecone');
	const pc = new Pinecone({ apiKey });

	const existing = await pc.listIndexes();
	if (!existing.indexes?.some((index) => index.name === PINECONE_INDEX)) {
		console.log(`  Creating Pinecone index "${PINECONE_INDEX}"...`);
		await pc.createIndex({
			name: PINECONE_INDEX,
			dimension: DIMENSIONS,
			metric: 'cosine',
			spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
			waitUntilReady: true,
		});
	}

	const store = new PineconeVectorStore('agent-history', { apiKey, indexName: PINECONE_INDEX });
	await store.upsert(toRecords(docs));
	console.log(`  Pinecone: upserted ${docs.length} docs into index "${PINECONE_INDEX}"`);
}

async function uploadSupabase(docs: SampleDoc[]): Promise<void> {
	const url = requireEnv('SUPABASE_URL');
	const apiKey = requireEnv('SUPABASE_SECRET_KEY');
	const dbUrl = requireEnv('SUPABASE_TEST_DB_URL');

	const { Pool } = await import('pg');
	const pool = new Pool({ connectionString: dbUrl, max: 1 });
	try {
		console.log(`  Creating Supabase table "${SUPABASE_TABLE}" + rpc "${SUPABASE_QUERY}"...`);
		await createSupabaseVectorTableAndFunction(pool, SUPABASE_TABLE, SUPABASE_QUERY, DIMENSIONS);
	} finally {
		await pool.end();
	}

	const store = new SupabaseVectorStore('agent-science', {
		url,
		apiKey,
		tableName: SUPABASE_TABLE,
		queryName: SUPABASE_QUERY,
	});
	await waitUntilQueryable(store, DIMENSIONS);
	await store.upsert(toRecords(docs));
	console.log(`  Supabase: upserted ${docs.length} docs into table "${SUPABASE_TABLE}"`);
}

async function uploadQdrant(docs: SampleDoc[]): Promise<void> {
	const url = requireEnv('QDRANT_URL');
	const apiKey = requireEnv('QDRANT_API_KEY');
	const { QdrantClient } = await import('@qdrant/js-client-rest');
	const client = new QdrantClient({ url, apiKey });

	const { exists } = await client.collectionExists(QDRANT_COLLECTION);
	if (!exists) {
		console.log(`  Creating Qdrant collection "${QDRANT_COLLECTION}"...`);
		await client.createCollection(QDRANT_COLLECTION, {
			vectors: { size: DIMENSIONS, distance: 'Cosine' },
		});
	}
	// Metadata filters require a payload index on metadata.category.
	await client.createPayloadIndex(QDRANT_COLLECTION, {
		field_name: 'metadata.category',
		field_schema: 'keyword',
		wait: true,
	});

	const store = new QdrantVectorStore('agent-geography', {
		url,
		apiKey,
		collectionName: QDRANT_COLLECTION,
	});
	await store.upsert(toRecords(docs));
	console.log(`  Qdrant: upserted ${docs.length} docs into collection "${QDRANT_COLLECTION}"`);
}

async function uploadPostgres(docs: SampleDoc[]): Promise<void> {
	const connectionString = requireEnv('PG_VECTOR_TEST_URL');
	const { Pool } = await import('pg');
	const pool = new Pool({ connectionString, max: 1 });
	try {
		console.log(`  Creating Postgres table "${POSTGRES_TABLE}"...`);
		await createPgVectorTable(pool, POSTGRES_TABLE, { dimensions: DIMENSIONS, hnswIndex: true });
	} finally {
		await pool.end();
	}

	const store = new PgVectorStore('agent-culture', { connectionString, tableName: POSTGRES_TABLE });
	await store.upsert(toRecords(docs));
	await store.close();
	console.log(`  Postgres: upserted ${docs.length} docs into table "${POSTGRES_TABLE}"`);
}

async function main(): Promise<void> {
	console.log(`Fetching ${DOC_COUNT} rows from ${HF_DATASET}...`);
	const rows = await fetchHfRows();

	const documents: SampleDoc[] = rows.map((row, index) => ({
		id: titleToUuid(row.title),
		content: row.text,
		metadata: { title: row.title, category: CATEGORIES[index % CATEGORIES.length] },
		vector: row[EMBEDDING_FIELD],
	}));

	const byCategory = Object.fromEntries(
		CATEGORIES.map((category) => [
			category,
			documents.filter((doc) => doc.metadata.category === category),
		]),
	) as Record<(typeof CATEGORIES)[number], SampleDoc[]>;

	for (const category of CATEGORIES) {
		console.log(`\n[${category}] ${byCategory[category].length} docs:`);
		for (const doc of byCategory[category]) console.log(`  - ${doc.metadata.title}`);
	}

	console.log('\nUploading history -> Pinecone');
	await uploadPinecone(byCategory.history);

	console.log('\nUploading science -> Supabase');
	await uploadSupabase(byCategory.science);

	console.log('\nUploading geography -> Qdrant');
	await uploadQdrant(byCategory.geography);

	console.log('\nUploading culture -> Postgres');
	await uploadPostgres(byCategory.culture);

	// Write a summary (title + content snippet per store) for crafting test prompts.
	const summary = Object.fromEntries(
		CATEGORIES.map((category) => [
			category,
			byCategory[category].map((doc) => ({
				title: doc.metadata.title,
				snippet: doc.content.slice(0, 300),
			})),
		]),
	);
	await writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2));
	console.log(`\nDone. Wrote content summary to ${SUMMARY_PATH}`);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
