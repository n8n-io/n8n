import type { Client, InArgs } from '@libsql/client';

import type { BuiltMemory, Thread } from '../types/sdk/memory';
import type { AgentDbMessage } from '../types/sdk/message';

/** Safe JSON.parse wrapper — returns undefined on failure. */
function parseJsonSafe(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return undefined;
	}
}

/** Convert a number[] embedding to a Buffer of raw float32 bytes. */
function float32ToBuffer(arr: number[]): Buffer {
	const f32 = new Float32Array(arr);
	return Buffer.from(f32.buffer);
}

export interface SqliteMemoryConfig {
	url: string; // e.g. 'file:./data.db'
	namespace?: string; // table name prefix
}

export class SqliteMemory implements BuiltMemory {
	private initPromise: Promise<Client> | null = null;

	private embeddingsInitPromise: Promise<void> | null = null;

	private readonly config: SqliteMemoryConfig;

	private readonly ns: string;

	constructor(config: SqliteMemoryConfig) {
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

	private async ensureInitialized(): Promise<Client> {
		this.initPromise ??= this._initialize().catch((error) => {
			this.initPromise = null;
			throw error;
		});
		return await this.initPromise;
	}

	private async _initialize(): Promise<Client> {
		const { createClient } = await import('@libsql/client');
		const client = createClient({ url: this.config.url });

		await client.batch(
			[
				`CREATE TABLE IF NOT EXISTS ${this.ns}threads (
				id TEXT PRIMARY KEY,
				resourceId TEXT NOT NULL,
				title TEXT,
				metadata TEXT,
				createdAt TEXT NOT NULL,
				updatedAt TEXT NOT NULL
			)`,
				`CREATE TABLE IF NOT EXISTS ${this.ns}messages (
				seq INTEGER PRIMARY KEY AUTOINCREMENT,
				id TEXT NOT NULL UNIQUE,
				threadId TEXT NOT NULL,
				role TEXT NOT NULL,
				content TEXT NOT NULL,
				createdAt TEXT NOT NULL
			)`,
				`CREATE TABLE IF NOT EXISTS ${this.ns}working_memory (
			key TEXT NOT NULL,
			scope TEXT NOT NULL CHECK(scope IN ('resource', 'thread')),
			content TEXT NOT NULL,
			updatedAt TEXT NOT NULL,
			PRIMARY KEY (key, scope)
		)`,
			],
			'write',
		);

		return client;
	}

	// ── Thread management ────────────────────────────────────────────────

	async getThread(threadId: string): Promise<Thread | null> {
		const db = await this.ensureInitialized();
		const result = await db.execute({
			sql: `SELECT id, resourceId, title, metadata, createdAt, updatedAt FROM ${this.ns}threads WHERE id = ?`,
			args: [threadId],
		});

		if (result.rows.length === 0) return null;

		const row = result.rows[0];
		return {
			id: row.id as string,
			resourceId: row.resourceId as string,
			title: (row.title as string | null) ?? undefined,
			metadata: row.metadata
				? (parseJsonSafe(row.metadata as string) as Record<string, unknown> | undefined)
				: undefined,
			createdAt: new Date(row.createdAt as string),
			updatedAt: new Date(row.updatedAt as string),
		};
	}

	async saveThread(thread: Omit<Thread, 'createdAt' | 'updatedAt'>): Promise<Thread> {
		const db = await this.ensureInitialized();
		const now = new Date().toISOString();

		const titleArg = thread.title ?? null;
		const metadataArg = thread.metadata ? JSON.stringify(thread.metadata) : null;

		await db.execute({
			sql: `INSERT INTO ${this.ns}threads (id, resourceId, title, metadata, createdAt, updatedAt)
				  VALUES (?, ?, ?, ?, ?, ?)
				  ON CONFLICT(id) DO UPDATE SET
				    resourceId = excluded.resourceId,
				    title = COALESCE(excluded.title, title),
				    metadata = COALESCE(excluded.metadata, metadata),
				    updatedAt = excluded.updatedAt`,
			args: [thread.id, thread.resourceId, titleArg, metadataArg, now, now],
		});

		const saved = await this.getThread(thread.id);
		return saved!;
	}

	async deleteThread(threadId: string): Promise<void> {
		const db = await this.ensureInitialized();
		const statements = [
			{ sql: `DELETE FROM ${this.ns}messages WHERE threadId = ?`, args: [threadId] },
			{ sql: `DELETE FROM ${this.ns}threads WHERE id = ?`, args: [threadId] },
		];
		await db.batch(statements, 'write');

		// Always attempt to clean up embeddings — the table may not exist yet.
		try {
			await db.execute({
				sql: `DELETE FROM ${this.ns}message_embeddings WHERE threadId = ?`,
				args: [threadId],
			});
		} catch (e: unknown) {
			// Table does not exist yet — nothing to clean up.
			// Rethrow anything that isn't a missing-table error.
			if (!(e instanceof Error && /no such table/i.test(e.message))) throw e;
		}
	}

	// ── Message persistence ──────────────────────────────────────────────

	async getMessages(
		threadId: string,
		opts?: { limit?: number; before?: Date },
	): Promise<AgentDbMessage[]> {
		const db = await this.ensureInitialized();

		let sql: string;
		const args: Array<string | number> = [threadId];

		// Use seq (autoincrement) as tiebreaker for messages with identical createdAt timestamps
		if (opts?.limit !== undefined && opts?.before !== undefined) {
			sql = `SELECT * FROM (
				SELECT id, threadId, role, content, createdAt, seq
				FROM ${this.ns}messages
				WHERE threadId = ? AND createdAt < ?
				ORDER BY createdAt DESC, seq DESC
				LIMIT ?
			) ORDER BY createdAt ASC, seq ASC`;
			args.push(opts.before.toISOString(), opts.limit);
		} else if (opts?.limit !== undefined) {
			sql = `SELECT * FROM (
				SELECT id, threadId, role, content, createdAt, seq
				FROM ${this.ns}messages
				WHERE threadId = ?
				ORDER BY createdAt DESC, seq DESC
				LIMIT ?
			) ORDER BY createdAt ASC, seq ASC`;
			args.push(opts.limit);
		} else if (opts?.before !== undefined) {
			sql = `SELECT id, threadId, role, content, createdAt
				FROM ${this.ns}messages
				WHERE threadId = ? AND createdAt < ?
				ORDER BY createdAt ASC, seq ASC`;
			args.push(opts.before.toISOString());
		} else {
			sql = `SELECT id, threadId, role, content, createdAt
				FROM ${this.ns}messages
				WHERE threadId = ?
				ORDER BY createdAt ASC, seq ASC`;
		}

		const result = await db.execute({ sql, args });

		return result.rows
			.map((row) => {
				const msg = parseJsonSafe(row.content as string) as AgentDbMessage;
				if (!msg) return undefined;
				msg.id = row.id as string;
				msg.createdAt = new Date(row.createdAt as string);
				return msg;
			})
			.filter((m): m is AgentDbMessage => m !== undefined);
	}

	async saveMessages(args: {
		threadId: string;
		resourceId?: string;
		messages: AgentDbMessage[];
	}): Promise<void> {
		const db = await this.ensureInitialized();

		if (args.messages.length === 0) return;

		const statements = args.messages.map((msg) => {
			// Use the message's own createdAt (assigned monotonically by AgentMessageList)
			// so the DB column reflects the authoritative insertion order.
			const createdAt =
				msg.createdAt instanceof Date ? msg.createdAt.toISOString() : new Date().toISOString();
			const role = 'role' in msg ? (msg.role as string) : 'custom';
			return {
				sql: `INSERT OR REPLACE INTO ${this.ns}messages (id, threadId, role, content, createdAt)
					  VALUES (?, ?, ?, ?, ?)`,
				args: [msg.id, args.threadId, role, JSON.stringify(msg), createdAt],
			};
		});

		await db.batch(statements, 'write');
	}

	async deleteMessages(messageIds: string[]): Promise<void> {
		const db = await this.ensureInitialized();

		if (messageIds.length === 0) return;

		const placeholders = messageIds.map(() => '?').join(', ');
		await db.execute({
			sql: `DELETE FROM ${this.ns}messages WHERE id IN (${placeholders})`,
			args: messageIds,
		});

		// Always attempt to clean up embeddings — the table may not exist yet.
		try {
			await db.execute({
				sql: `DELETE FROM ${this.ns}message_embeddings WHERE id IN (${placeholders})`,
				args: messageIds,
			});
		} catch (e: unknown) {
			// Table does not exist yet — nothing to clean up.
			// Rethrow anything that isn't a missing-table error.
			if (!(e instanceof Error && /no such table/i.test(e.message))) throw e;
		}
	}

	// ── Working memory ───────────────────────────────────────────────────

	async getWorkingMemory(params: { threadId: string; resourceId?: string }): Promise<
		string | null
	> {
		const db = await this.ensureInitialized();
		const key = params.resourceId ?? params.threadId;
		const scope: 'resource' | 'thread' = params.resourceId !== undefined ? 'resource' : 'thread';
		const result = await db.execute({
			sql: `SELECT content FROM ${this.ns}working_memory WHERE key = ? AND scope = ?`,
			args: [key, scope],
		});

		if (result.rows.length === 0) return null;
		return result.rows[0].content as string;
	}

	async saveWorkingMemory(
		params: { threadId: string; resourceId?: string },
		content: string,
	): Promise<void> {
		const db = await this.ensureInitialized();
		const key = params.resourceId ?? params.threadId;
		const scope: 'resource' | 'thread' = params.resourceId !== undefined ? 'resource' : 'thread';
		const now = new Date().toISOString();

		await db.execute({
			sql: `INSERT OR REPLACE INTO ${this.ns}working_memory (key, scope, content, updatedAt)
				  VALUES (?, ?, ?, ?)`,
			args: [key, scope, content, now],
		});
	}

	// ── Tier 3: Vector operations ───────────────────────────────────────

	/**
	 * Lazily create the message_embeddings table with the correct F32_BLOB dimension.
	 * Called on first saveEmbeddings() — we don't know the dimension until we see
	 * the first vector from the runtime's embedder.
	 */
	private embeddingDimension: number | null = null;

	private async ensureEmbeddingsTable(db: Client, dimension: number): Promise<void> {
		if (this.embeddingDimension !== null && this.embeddingDimension !== dimension) {
			throw new Error(
				`Embedding dimension mismatch: table was created with ${this.embeddingDimension} but received ${dimension}. ` +
					'This usually means the embedder model changed. Drop the embeddings table and re-index.',
			);
		}
		this.embeddingsInitPromise ??= this._initializeEmbeddingsTable(db, dimension).catch((error) => {
			this.embeddingsInitPromise = null;
			throw error;
		});
		await this.embeddingsInitPromise;
	}

	private async _initializeEmbeddingsTable(db: Client, dimension: number): Promise<void> {
		// Check if the table already exists with a different dimension
		const existing = await db.execute(
			`SELECT sql FROM sqlite_master WHERE type='table' AND name='${this.ns}message_embeddings'`,
		);
		if (existing.rows.length > 0) {
			// Extract dimension from F32_BLOB(N) in the CREATE TABLE sql
			const sql = existing.rows[0].sql as string;
			const match = /F32_BLOB\((\d+)\)/i.exec(sql);
			if (match) {
				const existingDim = parseInt(match[1], 10);
				if (existingDim !== dimension) {
					throw new Error(
						`Embedding dimension mismatch: table was created with ${existingDim} but received ${dimension}. ` +
							'This usually means the embedder model changed. Drop the embeddings table and re-index.',
					);
				}
			}
		} else {
			await db.execute(
				`CREATE TABLE IF NOT EXISTS ${this.ns}message_embeddings (
					id TEXT PRIMARY KEY,
					threadId TEXT NOT NULL,
					resourceId TEXT NOT NULL DEFAULT '',
					embedding F32_BLOB(${dimension}) NOT NULL,
					contentText TEXT NOT NULL,
					createdAt TEXT NOT NULL
				)`,
			);

			await db.execute(
				`CREATE INDEX IF NOT EXISTS ${this.ns}idx_embeddings_vector
					ON ${this.ns}message_embeddings (libsql_vector_idx(embedding))`,
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
		const db = await this.ensureInitialized();
		if (opts.entries.length === 0) return;

		const threadId = opts.threadId ?? '';
		const resourceId = opts.resourceId ?? '';

		// Lazily create the embeddings table with the correct dimension
		const dimension = opts.entries[0].vector.length;
		await this.ensureEmbeddingsTable(db, dimension);

		const statements = opts.entries.map((entry) => ({
			sql: `INSERT OR REPLACE INTO ${this.ns}message_embeddings (id, threadId, resourceId, embedding, contentText, createdAt)
				  VALUES (?, ?, ?, ?, ?, ?)`,
			args: [
				entry.id,
				threadId,
				resourceId,
				float32ToBuffer(entry.vector),
				entry.text,
				new Date().toISOString(),
			] as InArgs,
		}));

		await db.batch(statements, 'write');
	}

	async queryEmbeddings(opts: {
		scope?: 'thread' | 'resource';
		threadId?: string;
		resourceId?: string;
		vector: number[];
		topK: number;
	}): Promise<Array<{ id: string; score: number }>> {
		const db = await this.ensureInitialized();

		// Ensure the table exists (may not have been created yet if no embeddings saved)
		await this.ensureEmbeddingsTable(db, opts.vector.length);

		const queryBuffer = float32ToBuffer(opts.vector);

		let sql = `SELECT id, vector_distance_cos(embedding, ?) as distance
			FROM ${this.ns}message_embeddings`;
		const params: InArgs = [queryBuffer];

		const scope = opts.scope ?? 'resource';
		if (scope === 'thread' && opts.threadId) {
			sql += ' WHERE threadId = ?';
			params.push(opts.threadId);
		} else if (scope === 'resource' && opts.resourceId) {
			sql += ' WHERE resourceId = ?';
			params.push(opts.resourceId);
		}

		sql += ' ORDER BY distance ASC LIMIT ?';
		params.push(opts.topK);

		const result = await db.execute({ sql, args: params });

		return result.rows.map((r) => ({
			id: r.id as string,
			score: 1 - (r.distance as number),
		}));
	}
}
