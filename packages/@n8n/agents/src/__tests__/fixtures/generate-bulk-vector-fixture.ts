/**
 * One-time (re-)generation script for bulk-vector-fixture.json — a committed
 * corpus of real documents with precomputed embeddings used by the
 * vector-store-bulk-*.test.ts and agent-vector-store-*.test.ts suites to
 * exercise all three vector store backends against a real corpus without
 * making OpenAI calls to embed documents at test time.
 *
 * Pulls 30 rows from the Hugging Face dataset
 * Qdrant/dbpedia-entities-openai3-text-embedding-3-small-1536-100K (already
 * embedded with text-embedding-3-small at its native 1536 dims — matches
 * live query embeddings from the same model with no truncation needed), and
 * assigns synthetic round-robin categories for filter tests. Embeds a
 * handful of natural-language queries via the AI SDK and computes each
 * query's local top match so the test suite has ground truth that doesn't
 * depend on any backend's exact search semantics.
 *
 * Run with: pnpm fixtures:generate
 */
import { randomUUID } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { config as loadEnv } from 'dotenv';
import { embedMany } from 'ai';

import {
	cosineSimilarity,
	type BulkFixture,
	type FixtureDocument,
	type FixtureQuery,
} from '../integration/vector-store-helpers';
import { createEmbeddingModel } from '../../runtime/model/model-factory';

loadEnv({ path: path.resolve(__dirname, '../../../.env') });

const DOC_COUNT = 30;
const DIMENSIONS = 1536;
const CATEGORIES = ['history', 'science', 'geography'] as const;
const HF_DATASET = 'Qdrant/dbpedia-entities-openai3-text-embedding-3-small-1536-100K';
const EMBEDDING_FIELD = 'text-embedding-3-small-1536-embedding';
const OUT_PATH = path.join(__dirname, 'bulk-vector-fixture.json');

// Picked from the corpus after inspecting the printed titles below — distinctive
// enough that the top match isn't ambiguous with the #2 result.
const QUERIES = [
	'What lake is located in Jefferson County, Florida?',
	'What is the tallest federal building in Manhattan, and how many stories does it have?',
	'Which cricketer played as a wicketkeeper for South Africa against Australia in 1970?',
	'Who commanded the ANZAC forces during the Gallipoli campaign?',
];

interface HfRow {
	title: string;
	text: string;
	[EMBEDDING_FIELD]: number[];
}

function roundVector(vector: number[]): number[] {
	return vector.map((value) => Math.round(value * 1e6) / 1e6);
}

async function fetchWithRetry(url: string, retries = 5): Promise<Response> {
	for (let attempt = 1; attempt <= retries; attempt++) {
		const res = await fetch(url);
		if (res.ok) return res;
		if (attempt === retries) {
			throw new Error(
				`Request failed after ${retries} attempts: ${res.status} ${await res.text()}`,
			);
		}
		console.warn(`  Request failed (${res.status}), retrying (${attempt}/${retries})...`);
		await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
	}
	throw new Error('unreachable');
}

async function fetchHfRows(): Promise<HfRow[]> {
	const url =
		`https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(HF_DATASET)}` +
		`&config=default&split=train&offset=0&length=${DOC_COUNT}`;
	const res = await fetchWithRetry(url);
	const body = (await res.json()) as { rows: Array<{ row: HfRow }> };
	return body.rows.map((r) => r.row);
}

async function embedQueries(queries: string[]): Promise<number[][]> {
	if (!process.env.OPENAI_API_KEY) {
		throw new Error('OPENAI_API_KEY is required to embed the fixture queries.');
	}
	const { embeddings } = await embedMany({
		model: createEmbeddingModel('openai/text-embedding-3-small'),
		values: queries,
	});
	return embeddings;
}

async function main(): Promise<void> {
	await rm(OUT_PATH, { force: true });

	console.log(`Fetching ${DOC_COUNT} rows from ${HF_DATASET}...`);
	const rows = await fetchHfRows();
	console.log('Titles fetched (for picking distinctive queries):');
	for (const row of rows) console.log(`  - ${row.title}`);

	const documents: FixtureDocument[] = rows.map((row, index) => ({
		id: randomUUID(),
		content: row.text,
		metadata: { title: row.title, category: CATEGORIES[index % CATEGORIES.length] },
		vector: roundVector(row[EMBEDDING_FIELD]),
	}));

	console.log(`\nEmbedding ${QUERIES.length} queries...`);
	const queryEmbeddings = await embedQueries(QUERIES);

	const queries: FixtureQuery[] = QUERIES.map((text, i) => {
		const vector = roundVector(queryEmbeddings[i]);
		const ranked = documents
			.map((doc) => ({
				id: doc.id,
				title: doc.metadata.title,
				score: cosineSimilarity(vector, doc.vector),
			}))
			.sort((a, b) => b.score - a.score)
			.slice(0, 3);

		console.log(`\nQuery: "${text}"`);
		for (const r of ranked) console.log(`  ${r.score.toFixed(4)}  ${r.title}`);
		const gap = ranked[0].score - ranked[1].score;
		if (gap < 0.02) {
			console.warn(
				`  WARNING: top-1/top-2 score gap is only ${gap.toFixed(4)} — consider picking a more distinctive query.`,
			);
		}

		return { text, vector, expectedTopId: ranked[0].id };
	});

	const fixture: BulkFixture = { dimensions: DIMENSIONS, documents, queries };
	await writeFile(OUT_PATH, JSON.stringify(fixture));
	console.log(`\nWrote ${documents.length} documents and ${queries.length} queries to ${OUT_PATH}`);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
