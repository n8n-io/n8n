import type { Pool, PoolClient } from 'pg';
import type { ConnectionOptions } from 'tls';

import type { BuiltMemory, Thread } from '../types/sdk/memory';
import type { AgentDbMessage, AgentMessage } from '../types/sdk/message';

interface ThreadRow {
	id: string;
	resourceId: string;
	title: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: Date;
	updatedAt: Date;
}

interface MessageRow {
	id: string;
	threadId: string;
	role: string;
	content: unknown;
	createdAt: Date;
	seq: number;
}

interface EmbeddingDimRow {
	atttypmod: number;
}

interface EmbeddingResultRow {
	id: string;
	distance: number;
}

/** Safe JSON.parse wrapper — returns undefined on failure. */
function parseJsonSafe(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return undefined;
	}
}

export interface PostgresConnectionConfig {
	/** Postgres host. Defaults to 'localhost'. */
	host?: string;
	/** Postgres port. Defaults to 5432. */
	port?: number;
	/** Database name. */
	database?: string;
	/** Database user. */
	user?: string;
	/** Database password. */
	password?: string | (() => string | Promise<string>);
}

export interface PostgresMemoryConfig {
	// --- Connection ---
	/** Connection URL string (e.g. 'postgresql://user:pass@localhost:5432/db') or individual connection parameters. */
	connection: string | PostgresConnectionConfig;

	// --- Pool settings ---
	/** Connection pool configuration. */
	pool?: {
		/** Maximum number of connections. Defaults to 10. */
		max?: number;
		/** Minimum number of connections. Defaults to 0. */
		min?: number;
		/** Close idle connections after this many ms. Defaults to 10000. */
		idleTimeoutMillis?: number;
		/** Connection timeout in ms. Defaults to 0 (no timeout). */
		connectionTimeoutMillis?: number;
		/** Allow the pool to exit even if connections are idle. */
		allowExitOnIdle?: boolean;
	};

	// --- Security ---
	/** SSL configuration. `true` for default SSL, or a TLS ConnectionOptions object. */
	ssl?: boolean | ConnectionOptions;

	// --- SDK options ---
	/** Table name prefix for multi-tenant isolation. Alphanumeric and underscores only. */
	namespace?: string;
}

export class PostgresMemory implements BuiltMemory {
	private initPromise: Promise<Pool> | null = null;

	private embeddingsInitPromise: Promise<void> | null = null;

	private readonly config: PostgresMemoryConfig;

	private readonly ns: string;

	constructor(config: PostgresMemoryConfig) {
		if (config.namespace !== undefined) {
			if (!/^[a-zA-Z0-9_]+$/.test(config.namespace)) {
				throw new Error(
					`Invalid namespace "${config.namespace}": must be alphanumeric and underscores only`,
				);
			}
		}
		this.config = config;
		this.ns = config.namespace ? `${config.namespace}_` : '';
	}

	// ── Lazy initialisation ──────────────────────────────────────────────

	private async ensureInitialized(): Promise<Pool> {
		this.initPromise ??= this._initialize().catch((error) => {
			this.initPromise = null;
			throw error;
		});
		return await this.initPromise;
	}

	private async _initialize(): Promise<Pool> {
		const { Pool: PgPool } = await import('pg');
		const conn = this.config.connection;
		const connectionOpts =
			typeof conn === 'string'
				? { connectionString: conn }
				: {
						...(conn.host && { host: conn.host }),
						...(conn.port && { port: conn.port }),
						...(conn.database && { database: conn.database }),
						...(conn.user && { user: conn.user }),
						...(conn.password !== undefined && { password: conn.password }),
					};

		const pool = new PgPool({
			...connectionOpts,
			// Pool
			...(this.config.pool?.max !== undefined && { max: this.config.pool.max }),
			...(this.config.pool?.min !== undefined && { min: this.config.pool.min }),
			...(this.config.pool?.idleTimeoutMillis !== undefined && {
				idleTimeoutMillis: this.config.pool.idleTimeoutMillis,
			}),
			...(this.config.pool?.connectionTimeoutMillis !== undefined && {
				connectionTimeoutMillis: this.config.pool.connectionTimeoutMillis,
			}),
			...(this.config.pool?.allowExitOnIdle !== undefined && {
				allowExitOnIdle: this.config.pool.allowExitOnIdle,
			}),
			// Security
			...(this.config.ssl !== undefined && { ssl: this.config.ssl }),
		});

		await pool.query(
			`CREATE TABLE IF NOT EXISTS ${this.ns}threads (
				id TEXT PRIMARY KEY,
				"resourceId" TEXT NOT NULL,
				title TEXT,
				metadata JSONB,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL
			)`,
		);

		await pool.query(
			`CREATE TABLE IF NOT EXISTS ${this.ns}messages (
				seq SERIAL PRIMARY KEY,
				id TEXT NOT NULL UNIQUE,
				"threadId" TEXT NOT NULL,
				role TEXT NOT NULL,
				content JSONB NOT NULL,
				"createdAt" TIMESTAMPTZ NOT NULL
			)`,
		);

		await pool.query(
			`CREATE TABLE IF NOT EXISTS ${this.ns}working_memory (
				key TEXT NOT NULL,
				scope TEXT NOT NULL CHECK(scope IN ('resource', 'thread')),
				content TEXT NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL,
				PRIMARY KEY (key, scope)
			)`,
		);

		return pool;
	}

	// ── Thread management ────────────────────────────────────────────────

	async getThread(threadId: string): Promise<Thread | null> {
		const pool = await this.ensureInitialized();
		const result = await pool.query<ThreadRow>(
			`SELECT id, "resourceId", title, metadata, "createdAt", "updatedAt"
			 FROM ${this.ns}threads WHERE id = $1`,
			[threadId],
		);

		if (result.rows.length === 0) return null;

		const row = result.rows[0];
		return {
			id: row.id,
			resourceId: row.resourceId,
			title: row.title ?? undefined,
			metadata: row.metadata ?? undefined,
			createdAt: new Date(row.createdAt),
			updatedAt: new Date(row.updatedAt),
		};
	}

	async saveThread(thread: Omit<Thread, 'createdAt' | 'updatedAt'>): Promise<Thread> {
		const pool = await this.ensureInitialized();
		const now = new Date().toISOString();

		const titleArg = thread.title ?? null;
		const metadataArg = thread.metadata ? JSON.stringify(thread.metadata) : null;

		const result = await pool.query<ThreadRow>(
			`INSERT INTO ${this.ns}threads (id, "resourceId", title, metadata, "createdAt", "updatedAt")
			 VALUES ($1, $2, $3, $4, $5, $6)
			 ON CONFLICT (id) DO UPDATE SET
				"resourceId" = EXCLUDED."resourceId",
				title = COALESCE(EXCLUDED.title, ${this.ns}threads.title),
				metadata = COALESCE(EXCLUDED.metadata, ${this.ns}threads.metadata),
				"updatedAt" = EXCLUDED."updatedAt"
			 RETURNING id, "resourceId", title, metadata, "createdAt", "updatedAt"`,
			[thread.id, thread.resourceId, titleArg, metadataArg, now, now],
		);

		const row = result.rows[0];
		return {
			id: row.id,
			resourceId: row.resourceId,
			title: row.title ?? undefined,
			metadata: row.metadata ?? undefined,
			createdAt: new Date(row.createdAt),
			updatedAt: new Date(row.updatedAt),
		};
	}

	async deleteThread(threadId: string): Promise<void> {
		const pool = await this.ensureInitialized();

		const client: PoolClient = await pool.connect();
		try {
			await client.query('BEGIN');
			await client.query(`DELETE FROM ${this.ns}messages WHERE "threadId" = $1`, [threadId]);
			await client.query(`DELETE FROM ${this.ns}threads WHERE id = $1`, [threadId]);
			await client.query('COMMIT');
		} catch (deleteError: unknown) {
			await client.query('ROLLBACK');
			throw deleteError;
		} finally {
			client.release();
		}

		// Always attempt to clean up embeddings — the table may not exist yet.
		try {
			await pool.query(`DELETE FROM ${this.ns}message_embeddings WHERE "threadId" = $1`, [
				threadId,
			]);
		} catch (e: unknown) {
			// Table does not exist yet — nothing to clean up.
			// Rethrow anything that isn't a missing-table error.
			if (!(e instanceof Error && /does not exist/i.test(e.message))) throw e;
		}
	}

	// ── Message persistence ──────────────────────────────────────────────

	async getMessages(
		threadId: string,
		opts?: { limit?: number; before?: Date },
	): Promise<AgentDbMessage[]> {
		const pool = await this.ensureInitialized();

		let sql: string;
		const args: Array<string | number> = [threadId];
		const paramIdx = 2;

		// Use seq (serial) as tiebreaker for messages with identical createdAt timestamps
		if (opts?.limit !== undefined && opts?.before !== undefined) {
			sql = `SELECT * FROM (
				SELECT id, "threadId", role, content, "createdAt", seq
				FROM ${this.ns}messages
				WHERE "threadId" = $1 AND "createdAt" < $${paramIdx}
				ORDER BY "createdAt" DESC, seq DESC
				LIMIT $${paramIdx + 1}
			) sub ORDER BY "createdAt" ASC, seq ASC`;
			args.push(opts.before.toISOString(), opts.limit);
		} else if (opts?.limit !== undefined) {
			sql = `SELECT * FROM (
				SELECT id, "threadId", role, content, "createdAt", seq
				FROM ${this.ns}messages
				WHERE "threadId" = $1
				ORDER BY "createdAt" DESC, seq DESC
				LIMIT $${paramIdx}
			) sub ORDER BY "createdAt" ASC, seq ASC`;
			args.push(opts.limit);
		} else if (opts?.before !== undefined) {
			sql = `SELECT id, "threadId", role, content, "createdAt"
				FROM ${this.ns}messages
				WHERE "threadId" = $1 AND "createdAt" < $${paramIdx}
				ORDER BY "createdAt" ASC, seq ASC`;
			args.push(opts.before.toISOString());
		} else {
			sql = `SELECT id, "threadId", role, content, "createdAt"
				FROM ${this.ns}messages
				WHERE "threadId" = $1
				ORDER BY "createdAt" ASC, seq ASC`;
		}

		const result = await pool.query<MessageRow>(sql, args);

		return result.rows
			.map((row) => {
				// Postgres returns JSONB as a parsed object already, but if it comes
				// back as a string for any reason, parse it.
				const content = typeof row.content === 'string' ? parseJsonSafe(row.content) : row.content;
				if (!content || typeof content !== 'object') return undefined;
				const msg = content as AgentMessage & { id?: string; createdAt?: Date };
				msg.id = row.id;
				msg.createdAt = new Date(row.createdAt);
				return msg as AgentDbMessage;
			})
			.filter((m): m is AgentDbMessage => m !== undefined);
	}

	async saveMessages(args: {
		threadId: string;
		resourceId?: string;
		messages: AgentDbMessage[];
	}): Promise<void> {
		const pool = await this.ensureInitialized();

		if (args.messages.length === 0) return;

		const client: PoolClient = await pool.connect();
		try {
			await client.query('BEGIN');

			for (const msg of args.messages) {
				// Use the message's own createdAt (assigned monotonically by AgentMessageList)
				// so the DB column reflects the authoritative insertion order.
				const createdAt =
					msg.createdAt instanceof Date ? msg.createdAt.toISOString() : new Date().toISOString();
				const role = 'role' in msg ? (msg.role as string) : 'custom';
				const id = msg.id;

				await client.query(
					`INSERT INTO ${this.ns}messages (id, "threadId", role, content, "createdAt")
					 VALUES ($1, $2, $3, $4, $5)
					 ON CONFLICT (id) DO UPDATE SET
						"threadId" = EXCLUDED."threadId",
						role = EXCLUDED.role,
						content = EXCLUDED.content,
						"createdAt" = EXCLUDED."createdAt"`,
					[id, args.threadId, role, JSON.stringify(msg), createdAt],
				);
			}

			await client.query('COMMIT');
		} catch (txError: unknown) {
			await client.query('ROLLBACK');
			throw txError;
		} finally {
			client.release();
		}
	}

	async deleteMessages(messageIds: string[]): Promise<void> {
		const pool = await this.ensureInitialized();

		if (messageIds.length === 0) return;

		const placeholders = messageIds.map((_, i) => `$${i + 1}`).join(', ');
		await pool.query(`DELETE FROM ${this.ns}messages WHERE id IN (${placeholders})`, messageIds);

		// Always attempt to clean up embeddings — the table may not exist yet.
		try {
			await pool.query(
				`DELETE FROM ${this.ns}message_embeddings WHERE id IN (${placeholders})`,
				messageIds,
			);
		} catch (e: unknown) {
			// Table does not exist yet — nothing to clean up.
			// Rethrow anything that isn't a missing-table error.
			if (!(e instanceof Error && /does not exist/i.test(e.message))) throw e;
		}
	}

	// ── Working memory ───────────────────────────────────────────────────

	async getWorkingMemory(params: {
		threadId: string;
		resourceId: string;
		scope: 'resource' | 'thread';
	}): Promise<string | null> {
		const pool = await this.ensureInitialized();
		const key = params.scope === 'resource' ? params.resourceId : params.threadId;
		const result = await pool.query<{ content: string }>(
			`SELECT content FROM ${this.ns}working_memory WHERE key = $1 AND scope = $2`,
			[key, params.scope],
		);

		if (result.rows.length === 0) return null;
		return result.rows[0].content;
	}

	async saveWorkingMemory(
		params: { threadId: string; resourceId: string; scope: 'resource' | 'thread' },
		content: string,
	): Promise<void> {
		const pool = await this.ensureInitialized();
		const key = params.scope === 'resource' ? params.resourceId : params.threadId;
		const now = new Date().toISOString();

		await pool.query(
			`INSERT INTO ${this.ns}working_memory (key, scope, content, "updatedAt")
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (key, scope) DO UPDATE SET
				content = EXCLUDED.content,
				"updatedAt" = EXCLUDED."updatedAt"`,
			[key, params.scope, content, now],
		);
	}

	// ── Tier 3: Vector operations ───────────────────────────────────────

	/**
	 * Lazily create the message_embeddings table with the correct vector dimension.
	 * Called on first saveEmbeddings() — we don't know the dimension until we see
	 * the first vector from the runtime's embedder.
	 */
	private embeddingDimension: number | null = null;

	private async ensureEmbeddingsTable(pool: Pool, dimension: number): Promise<void> {
		if (this.embeddingDimension !== null && this.embeddingDimension !== dimension) {
			throw new Error(
				`Embedding dimension mismatch: table was created with ${this.embeddingDimension} but received ${dimension}. ` +
					'This usually means the embedder model changed. Drop the embeddings table and re-index.',
			);
		}
		this.embeddingsInitPromise ??= this._initializeEmbeddingsTable(pool, dimension).catch(
			(error) => {
				this.embeddingsInitPromise = null;
				throw error;
			},
		);
		await this.embeddingsInitPromise;
	}

	private async _initializeEmbeddingsTable(pool: Pool, dimension: number): Promise<void> {
		await pool.query('CREATE EXTENSION IF NOT EXISTS vector');

		// Check if the table already exists with a different dimension
		const existing = await pool.query(
			`SELECT udt_name FROM information_schema.columns
			 WHERE table_name = '${this.ns}message_embeddings' AND column_name = 'embedding'`,
		);
		if (existing.rows.length > 0) {
			// pgvector stores dimension in the UDT — but we can also check via atttypmod
			const dimCheck = await pool.query<EmbeddingDimRow>(
				`SELECT atttypmod FROM pg_attribute
				 WHERE attrelid = '${this.ns}message_embeddings'::regclass AND attname = 'embedding'`,
			);
			if (dimCheck.rows.length > 0) {
				const existingDim = dimCheck.rows[0].atttypmod;
				if (existingDim > 0 && existingDim !== dimension) {
					throw new Error(
						`Embedding dimension mismatch: table was created with ${existingDim} but received ${dimension}. ` +
							'This usually means the embedder model changed. Drop the embeddings table and re-index.',
					);
				}
			}
		} else {
			await pool.query(
				`CREATE TABLE IF NOT EXISTS ${this.ns}message_embeddings (
					id TEXT PRIMARY KEY,
					"threadId" TEXT NOT NULL,
					"resourceId" TEXT NOT NULL DEFAULT '',
					embedding vector(${dimension}) NOT NULL,
					"contentText" TEXT NOT NULL,
					"createdAt" TIMESTAMPTZ NOT NULL
				)`,
			);

			await pool.query(
				`CREATE INDEX IF NOT EXISTS ${this.ns}idx_embeddings_vector
				 ON ${this.ns}message_embeddings USING hnsw (embedding vector_cosine_ops)`,
			);
		}

		this.embeddingDimension = dimension;
	}

	async saveEmbeddings(opts: {
		scope?: 'thread' | 'resource';
		threadId?: string;
		resourceId?: string;
		entries: Array<{
			id: string;
			vector: number[];
			text: string;
			model: string;
		}>;
	}): Promise<void> {
		const pool = await this.ensureInitialized();
		if (opts.entries.length === 0) return;

		const threadId = opts.threadId ?? '';
		const resourceId = opts.resourceId ?? '';

		// Lazily create the embeddings table with the correct dimension
		const dimension = opts.entries[0].vector.length;
		await this.ensureEmbeddingsTable(pool, dimension);

		const client: PoolClient = await pool.connect();
		try {
			await client.query('BEGIN');

			for (const entry of opts.entries) {
				// pgvector text format: '[1.0,2.0,3.0]'
				const vectorStr = `[${entry.vector.join(',')}]`;
				await client.query(
					`INSERT INTO ${this.ns}message_embeddings (id, "threadId", "resourceId", embedding, "contentText", "createdAt")
					 VALUES ($1, $2, $3, $4, $5, $6)
					 ON CONFLICT (id) DO UPDATE SET
						"threadId" = EXCLUDED."threadId",
						"resourceId" = EXCLUDED."resourceId",
						embedding = EXCLUDED.embedding,
						"contentText" = EXCLUDED."contentText",
						"createdAt" = EXCLUDED."createdAt"`,
					[entry.id, threadId, resourceId, vectorStr, entry.text, new Date().toISOString()],
				);
			}

			await client.query('COMMIT');
		} catch (txError: unknown) {
			await client.query('ROLLBACK');
			throw txError;
		} finally {
			client.release();
		}
	}

	async queryEmbeddings(opts: {
		scope?: 'thread' | 'resource';
		threadId?: string;
		resourceId?: string;
		vector: number[];
		topK: number;
	}): Promise<Array<{ id: string; score: number }>> {
		const pool = await this.ensureInitialized();

		// Ensure the table exists (may not have been created yet if no embeddings saved)
		await this.ensureEmbeddingsTable(pool, opts.vector.length);

		// pgvector text format: '[1.0,2.0,3.0]'
		const vectorStr = `[${opts.vector.join(',')}]`;

		let sql = `SELECT id, (embedding <=> $1) as distance
			FROM ${this.ns}message_embeddings`;
		const params: Array<string | number> = [vectorStr];
		let paramIdx = 2;

		const scope = opts.scope ?? 'resource';

		if (scope === 'thread' && opts.threadId === undefined) {
			throw new Error('threadId is required when scope is thread');
		}
		if (scope === 'resource' && opts.resourceId === undefined) {
			throw new Error('resourceId is required when scope is resource');
		}

		if (scope === 'thread' && opts.threadId) {
			sql += ` WHERE "threadId" = $${paramIdx}`;
			params.push(opts.threadId);
			paramIdx++;
		} else if (scope === 'resource' && opts.resourceId) {
			sql += ` WHERE "resourceId" = $${paramIdx}`;
			params.push(opts.resourceId);
			paramIdx++;
		}

		sql += ` ORDER BY distance ASC LIMIT $${paramIdx}`;
		params.push(opts.topK);

		const result = await pool.query<EmbeddingResultRow>(sql, params);

		return result.rows.map((r) => ({
			id: r.id,
			score: 1 - r.distance,
		}));
	}

	// ── Cleanup ──────────────────────────────────────────────────────────

	async close(): Promise<void> {
		if (this.initPromise) {
			const pool = await this.initPromise;
			await pool.end();
			this.initPromise = null;
			this.embeddingsInitPromise = null;
			this.embeddingDimension = null;
		}
	}
}
