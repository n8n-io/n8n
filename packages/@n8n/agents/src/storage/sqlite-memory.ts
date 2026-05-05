import type { Client, InArgs } from '@libsql/client';
import { z } from 'zod';

import { BaseMemory } from './base-memory';
import type { Thread } from '../types/sdk/memory';
import type { AgentDbMessage } from '../types/sdk/message';
import type {
	BuiltObservationStore,
	NewObservation,
	Observation,
	ObservationCursor,
	ObservationLockHandle,
	ScopeKind,
} from '../types/sdk/observation';

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

export const SqliteMemoryConfigSchema = z.object({
	/** libsql connection URL. Use `'file:./path/to/db.sqlite'` for a local file. */
	url: z.string().min(1),
	/** Optional table name prefix for multi-tenant isolation. Alphanumeric and underscores only. */
	namespace: z
		.string()
		.regex(/^[a-zA-Z0-9_]+$/)
		.optional(),
});

export type SqliteMemoryConfig = z.infer<typeof SqliteMemoryConfigSchema>;

export class SqliteMemory extends BaseMemory<SqliteMemoryConfig> implements BuiltObservationStore {
	private initPromise: Promise<Client> | null = null;

	private embeddingsInitPromise: Promise<void> | null = null;

	private readonly config: SqliteMemoryConfig;

	private readonly ns: string;

	constructor(protected readonly constructorOptions: SqliteMemoryConfig) {
		super('sqlite', constructorOptions);
		this.config = SqliteMemoryConfigSchema.parse(constructorOptions);
		this.ns = constructorOptions.namespace ? `${constructorOptions.namespace}_` : '';
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

		// Schema additions only via new tables; column changes require migration
		// tooling not yet implemented in this package.
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
				`CREATE TABLE IF NOT EXISTS ${this.ns}observations (
				id TEXT PRIMARY KEY,
				scopeKind TEXT NOT NULL CHECK(scopeKind IN ('thread','resource','agent')),
				scopeId TEXT NOT NULL,
				seq INTEGER NOT NULL,
				kind TEXT NOT NULL,
				payload TEXT NOT NULL,
				durationMs INTEGER,
				schemaVersion INTEGER NOT NULL,
				createdAt TEXT NOT NULL,
				compactedAt TEXT,
				UNIQUE(scopeKind, scopeId, seq)
			)`,
				`CREATE INDEX IF NOT EXISTS ${this.ns}observations_scope_seq
				ON ${this.ns}observations (scopeKind, scopeId, seq)`,
				`CREATE INDEX IF NOT EXISTS ${this.ns}observations_scope_kind_created
				ON ${this.ns}observations (scopeKind, scopeId, kind, createdAt DESC)`,
				`CREATE TABLE IF NOT EXISTS ${this.ns}observation_cursors (
				scopeKind TEXT NOT NULL CHECK(scopeKind IN ('thread','resource','agent')),
				scopeId TEXT NOT NULL,
				lastObservedMessageId TEXT NOT NULL,
				lastObservedSeq INTEGER NOT NULL,
				updatedAt TEXT NOT NULL,
				PRIMARY KEY (scopeKind, scopeId)
			)`,
				`CREATE TABLE IF NOT EXISTS ${this.ns}observation_locks (
				scopeKind TEXT NOT NULL CHECK(scopeKind IN ('thread','resource','agent')),
				scopeId TEXT NOT NULL,
				holderId TEXT NOT NULL,
				heldUntil TEXT NOT NULL,
				PRIMARY KEY (scopeKind, scopeId)
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
		opts?: { limit?: number; before?: Date; sinceSeq?: number },
	): Promise<AgentDbMessage[]> {
		const db = await this.ensureInitialized();

		const args: Array<string | number> = [threadId];
		const where: string[] = ['threadId = ?'];
		if (opts?.before !== undefined) {
			where.push('createdAt < ?');
			args.push(opts.before.toISOString());
		}
		if (opts?.sinceSeq !== undefined) {
			where.push('seq > ?');
			args.push(opts.sinceSeq);
		}
		const whereClause = where.join(' AND ');

		// Use seq (autoincrement) as tiebreaker for messages with identical createdAt timestamps.
		let sql: string;
		if (opts?.limit !== undefined) {
			sql = `SELECT * FROM (
				SELECT id, threadId, role, content, createdAt, seq
				FROM ${this.ns}messages
				WHERE ${whereClause}
				ORDER BY createdAt DESC, seq DESC
				LIMIT ?
			) ORDER BY createdAt ASC, seq ASC`;
			args.push(opts.limit);
		} else {
			sql = `SELECT id, threadId, role, content, createdAt, seq
				FROM ${this.ns}messages
				WHERE ${whereClause}
				ORDER BY createdAt ASC, seq ASC`;
		}

		const result = await db.execute({ sql, args });

		return result.rows
			.map((row) => {
				const msg = parseJsonSafe(row.content as string) as AgentDbMessage;
				if (!msg) return undefined;
				msg.id = row.id as string;
				msg.createdAt = new Date(row.createdAt as string);
				msg.seq = Number(row.seq);
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

	// ── Observational memory: data ───────────────────────────────────────

	async appendObservations(rows: NewObservation[]): Promise<Observation[]> {
		if (rows.length === 0) return [];
		const db = await this.ensureInitialized();

		// Allocate seq values per scope. Single-leader deployment assumed: the
		// SELECT MAX + INSERT batch happens without external concurrent writers.
		// (Within a process libsql serializes write transactions, which protects
		// against same-process concurrency.)
		const nextSeqByScope = new Map<string, number>();
		for (const row of rows) {
			const key = `${row.scopeKind}:${row.scopeId}`;
			if (!nextSeqByScope.has(key)) {
				const r = await db.execute({
					sql: `SELECT COALESCE(MAX(seq), 0) AS m FROM ${this.ns}observations
						WHERE scopeKind = ? AND scopeId = ?`,
					args: [row.scopeKind, row.scopeId],
				});
				nextSeqByScope.set(key, Number(r.rows[0].m as number) + 1);
			}
		}

		const persisted: Observation[] = [];
		const statements: Array<{ sql: string; args: InArgs }> = [];
		for (const row of rows) {
			const key = `${row.scopeKind}:${row.scopeId}`;
			const seq = nextSeqByScope.get(key)!;
			nextSeqByScope.set(key, seq + 1);
			const id = crypto.randomUUID();
			statements.push({
				sql: `INSERT INTO ${this.ns}observations
					(id, scopeKind, scopeId, seq, kind, payload, durationMs, schemaVersion, createdAt, compactedAt)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				args: [
					id,
					row.scopeKind,
					row.scopeId,
					seq,
					row.kind,
					JSON.stringify(row.payload ?? null),
					row.durationMs,
					row.schemaVersion,
					row.createdAt.toISOString(),
					row.compactedAt ? row.compactedAt.toISOString() : null,
				],
			});
			persisted.push({ ...row, id, seq });
		}

		await db.batch(statements, 'write');
		return persisted;
	}

	async getObservations(opts: {
		scopeKind: ScopeKind;
		scopeId: string;
		sinceSeq?: number;
		kindIs?: string;
		limit?: number;
		schemaVersionAtMost?: number;
		onlyUncompacted?: boolean;
	}): Promise<Observation[]> {
		const db = await this.ensureInitialized();

		const where: string[] = ['scopeKind = ?', 'scopeId = ?'];
		const args: Array<string | number> = [opts.scopeKind, opts.scopeId];
		if (opts.sinceSeq !== undefined) {
			where.push('seq > ?');
			args.push(opts.sinceSeq);
		}
		if (opts.kindIs !== undefined) {
			where.push('kind = ?');
			args.push(opts.kindIs);
		}
		if (opts.onlyUncompacted) {
			where.push('compactedAt IS NULL');
		}
		if (opts.schemaVersionAtMost !== undefined) {
			where.push('schemaVersion <= ?');
			args.push(opts.schemaVersionAtMost);
		}

		let sql = `SELECT id, scopeKind, scopeId, seq, kind, payload, durationMs, schemaVersion, createdAt, compactedAt
			FROM ${this.ns}observations
			WHERE ${where.join(' AND ')}
			ORDER BY seq ASC`;
		if (opts.limit !== undefined) {
			sql += ' LIMIT ?';
			args.push(opts.limit);
		}

		const result = await db.execute({ sql, args });
		return result.rows.map((row) => ({
			id: row.id as string,
			scopeKind: row.scopeKind as ScopeKind,
			scopeId: row.scopeId as string,
			seq: Number(row.seq),
			kind: row.kind as string,
			payload: parseJsonSafe(row.payload as string) as Observation['payload'],
			durationMs: row.durationMs === null ? null : Number(row.durationMs),
			schemaVersion: Number(row.schemaVersion),
			createdAt: new Date(row.createdAt as string),
			compactedAt: row.compactedAt === null ? null : new Date(row.compactedAt as string),
		}));
	}

	async markObservationsCompacted(ids: string[], compactedAt: Date): Promise<void> {
		if (ids.length === 0) return;
		const db = await this.ensureInitialized();
		const placeholders = ids.map(() => '?').join(',');
		await db.execute({
			sql: `UPDATE ${this.ns}observations
				SET compactedAt = ?
				WHERE id IN (${placeholders}) AND compactedAt IS NULL`,
			args: [compactedAt.toISOString(), ...ids],
		});
	}

	// ── Observational memory: cursors ────────────────────────────────────

	async getCursor(scopeKind: ScopeKind, scopeId: string): Promise<ObservationCursor | null> {
		const db = await this.ensureInitialized();
		const result = await db.execute({
			sql: `SELECT scopeKind, scopeId, lastObservedMessageId, lastObservedSeq, updatedAt
				FROM ${this.ns}observation_cursors
				WHERE scopeKind = ? AND scopeId = ?`,
			args: [scopeKind, scopeId],
		});
		if (result.rows.length === 0) return null;
		const row = result.rows[0];
		return {
			scopeKind: row.scopeKind as ScopeKind,
			scopeId: row.scopeId as string,
			lastObservedMessageId: row.lastObservedMessageId as string,
			lastObservedSeq: Number(row.lastObservedSeq),
			updatedAt: new Date(row.updatedAt as string),
		};
	}

	async setCursor(cursor: ObservationCursor): Promise<void> {
		const db = await this.ensureInitialized();
		await db.execute({
			sql: `INSERT INTO ${this.ns}observation_cursors
				(scopeKind, scopeId, lastObservedMessageId, lastObservedSeq, updatedAt)
				VALUES (?, ?, ?, ?, ?)
				ON CONFLICT(scopeKind, scopeId) DO UPDATE SET
					lastObservedMessageId = excluded.lastObservedMessageId,
					lastObservedSeq = excluded.lastObservedSeq,
					updatedAt = excluded.updatedAt`,
			args: [
				cursor.scopeKind,
				cursor.scopeId,
				cursor.lastObservedMessageId,
				cursor.lastObservedSeq,
				cursor.updatedAt.toISOString(),
			],
		});
	}

	// ── Observational memory: locks ──────────────────────────────────────

	async acquireObservationLock(
		scopeKind: ScopeKind,
		scopeId: string,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLockHandle | null> {
		const db = await this.ensureInitialized();
		const now = new Date();
		const heldUntil = new Date(now.getTime() + opts.ttlMs);

		// Conditional upsert: insert when free, refresh when held by same
		// holder, displace when prior lock has expired. UPDATE WHERE clause
		// makes the upsert a no-op when held by another live holder.
		const result = await db.execute({
			sql: `INSERT INTO ${this.ns}observation_locks
				(scopeKind, scopeId, holderId, heldUntil)
				VALUES (?, ?, ?, ?)
				ON CONFLICT(scopeKind, scopeId) DO UPDATE SET
					holderId = excluded.holderId,
					heldUntil = excluded.heldUntil
				WHERE ${this.ns}observation_locks.heldUntil < ?
					OR ${this.ns}observation_locks.holderId = excluded.holderId`,
			args: [scopeKind, scopeId, opts.holderId, heldUntil.toISOString(), now.toISOString()],
		});
		if (result.rowsAffected === 0) return null;
		return { scopeKind, scopeId, holderId: opts.holderId, heldUntil };
	}

	async releaseObservationLock(handle: ObservationLockHandle): Promise<void> {
		const db = await this.ensureInitialized();
		await db.execute({
			sql: `DELETE FROM ${this.ns}observation_locks
				WHERE scopeKind = ? AND scopeId = ? AND holderId = ?`,
			args: [handle.scopeKind, handle.scopeId, handle.holderId],
		});
	}
}
