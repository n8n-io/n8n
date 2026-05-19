import type { BuiltMemory, MemoryDescriptor, Thread } from '../types';
import type { AgentDbMessage } from '../types/sdk/message';
import type {
	BuiltObservationStore,
	NewObservation,
	Observation,
	ObservationCursor,
	ObservationLockHandle,
	ScopeKind,
} from '../types/sdk/observation';
import type {
	BuiltObservationLogStore,
	BuiltObservationLogTaskLockStore,
	NewObservationLogEntry,
	ObservationLogEntry,
	ObservationLogReadOptions,
	ObservationLogReflection,
	ObservationLogReflectionResult,
	ObservationLogScope,
	ObservationLogScopeKind,
	ObservationLogTaskKind,
	ObservationLogTaskLockHandle,
} from '../types/sdk/observation-log';
import { estimateObservationTokens } from '../types/sdk/observation-log';

interface StoredMessage {
	message: AgentDbMessage;
	createdAt: Date;
	resourceId: string;
}

function scopeKey(scopeKind: ScopeKind, scopeId: string): string {
	return `${scopeKind}:${scopeId}`;
}

function cloneCursor(cursor: ObservationCursor): ObservationCursor {
	return {
		...cursor,
		lastObservedAt: new Date(cursor.lastObservedAt),
		updatedAt: new Date(cursor.updatedAt),
	};
}

function cloneObservationLogEntry(entry: ObservationLogEntry): ObservationLogEntry {
	return { ...entry, createdAt: new Date(entry.createdAt) };
}

function compareKeyset(
	a: { createdAt: Date; id: string },
	b: { createdAt: Date; id: string },
): number {
	const t = a.createdAt.getTime() - b.createdAt.getTime();
	if (t !== 0) return t;
	return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * In-memory implementation of BuiltMemory and BuiltObservationStore.
 * All data is lost on process restart — suitable for development and testing.
 *
 * Thread context for `saveMessages` is established by calling `saveThread` first.
 * The most recently saved thread is used when `saveMessages` is called.
 */
export class InMemoryMemory
	implements
		BuiltMemory,
		BuiltObservationStore,
		BuiltObservationLogStore,
		BuiltObservationLogTaskLockStore
{
	private threads = new Map<string, Thread>();

	private messagesByThread = new Map<string, StoredMessage[]>();

	private workingMemoryByKey = new Map<string, string>();

	private observationsByScope = new Map<string, Observation[]>();

	private observationLogByScope = new Map<string, ObservationLogEntry[]>();

	private cursorsByScope = new Map<string, ObservationCursor>();

	private locksByScope = new Map<string, ObservationLockHandle>();

	// eslint-disable-next-line @typescript-eslint/require-await
	async getWorkingMemory(params: {
		threadId: string;
		resourceId?: string;
		scope: 'resource' | 'thread';
	}): Promise<string | null> {
		return this.workingMemoryByKey.get(this.workingMemoryKey(params)) ?? null;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async saveWorkingMemory(
		params: { threadId: string; resourceId?: string; scope: 'resource' | 'thread' },
		content: string,
	): Promise<void> {
		this.workingMemoryByKey.set(this.workingMemoryKey(params), content);
	}

	private workingMemoryKey(params: {
		threadId: string;
		resourceId?: string;
		scope: 'resource' | 'thread';
	}): string {
		const id = params.scope === 'thread' ? params.threadId : (params.resourceId ?? params.threadId);
		return `${params.scope}:${id}`;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getThread(threadId: string): Promise<Thread | null> {
		return this.threads.get(threadId) ?? null;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async saveThread(thread: Omit<Thread, 'createdAt' | 'updatedAt'>): Promise<Thread> {
		const existing = this.threads.get(thread.id);
		const now = new Date();
		const saved: Thread = {
			...thread,
			title: thread.title ?? existing?.title,
			metadata: thread.metadata ?? existing?.metadata,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		};
		this.threads.set(thread.id, saved);
		return saved;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async deleteThread(threadId: string): Promise<void> {
		this.threads.delete(threadId);
		this.messagesByThread.delete(threadId);
		const key = scopeKey('thread', threadId);
		this.observationsByScope.delete(key);
		this.observationLogByScope.delete(key);
		this.cursorsByScope.delete(key);
		this.locksByScope.delete(key);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getMessages(
		threadId: string,
		opts?: {
			limit?: number;
			before?: Date;
			since?: { sinceCreatedAt: Date; sinceMessageId: string };
		},
	): Promise<AgentDbMessage[]> {
		let stored = this.messagesByThread.get(threadId) ?? [];
		if (opts?.before) {
			const cutoff = opts.before.getTime();
			stored = stored.filter((s) => s.createdAt.getTime() < cutoff);
		}
		if (opts?.since) {
			const { sinceCreatedAt, sinceMessageId } = opts.since;
			stored = stored.filter(
				(s) =>
					compareKeyset(
						{ createdAt: s.createdAt, id: s.message.id },
						{ createdAt: sinceCreatedAt, id: sinceMessageId },
					) > 0,
			);
		}
		stored = [...stored].sort((a, b) =>
			compareKeyset(
				{ createdAt: a.createdAt, id: a.message.id },
				{ createdAt: b.createdAt, id: b.message.id },
			),
		);
		if (opts?.limit) stored = stored.slice(-opts.limit);
		return stored.map((s) => ({ ...s.message, createdAt: s.createdAt }));
	}

	/**
	 * Save messages to the thread established by the most recent `saveThread` call.
	 * Always call `saveThread` before `saveMessages` to set the thread context.
	 * Upserts by message id — if a message with the same id already exists, it is
	 * replaced in place (preserving insertion order). New messages are appended.
	 */
	// eslint-disable-next-line @typescript-eslint/require-await
	async saveMessages(args: {
		threadId: string;
		resourceId?: string;
		messages: AgentDbMessage[];
	}): Promise<void> {
		const existing = this.messagesByThread.get(args.threadId) ?? [];
		const byId = new Map(existing.map((s, i) => [s.message.id, i]));
		const resourceId = args.resourceId ?? '';
		for (const msg of args.messages) {
			const idx = byId.get(msg.id);
			if (idx !== undefined) {
				existing[idx] = { message: msg, createdAt: msg.createdAt, resourceId };
			} else {
				const entry: StoredMessage = {
					message: msg,
					createdAt: msg.createdAt,
					resourceId,
				};
				byId.set(msg.id, existing.length);
				existing.push(entry);
			}
		}
		this.messagesByThread.set(args.threadId, existing);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async deleteMessages(messageIds: string[]): Promise<void> {
		const idSet = new Set(messageIds);
		for (const [threadId, messages] of this.messagesByThread.entries()) {
			this.messagesByThread.set(
				threadId,
				messages.filter((s) => !idSet.has(s.message.id)),
			);
		}
	}

	describe(): MemoryDescriptor {
		return { name: 'memory', constructorName: this.constructor.name, connectionParams: {} };
	}

	// ── Observational memory ─────────────────────────────────────────────

	// eslint-disable-next-line @typescript-eslint/require-await
	async appendObservationLogEntries(
		rows: NewObservationLogEntry[],
	): Promise<ObservationLogEntry[]> {
		const persisted: ObservationLogEntry[] = [];
		for (const row of rows) {
			const key = scopeKey(row.scopeKind, row.scopeId);
			const bucket = this.observationLogByScope.get(key) ?? [];
			const entry: ObservationLogEntry = {
				id: crypto.randomUUID(),
				scopeKind: row.scopeKind,
				scopeId: row.scopeId,
				marker: row.marker,
				text: row.text,
				parentId: row.parentId ?? null,
				tokenCount: row.tokenCount ?? estimateObservationTokens(row.text),
				status: 'active',
				supersededBy: null,
				createdAt: row.createdAt ?? new Date(),
			};
			bucket.push(entry);
			this.observationLogByScope.set(key, bucket);
			persisted.push(cloneObservationLogEntry(entry));
		}
		return persisted;
	}

	async getActiveObservationLog(
		scope: ObservationLogScope & { limit?: number; order?: 'asc' | 'desc' },
	): Promise<ObservationLogEntry[]> {
		return await this.getObservationLog({ ...scope, status: 'active' });
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getObservationLog(opts: ObservationLogReadOptions): Promise<ObservationLogEntry[]> {
		const bucket = this.observationLogByScope.get(scopeKey(opts.scopeKind, opts.scopeId)) ?? [];
		let rows = [...bucket].sort((a, b) =>
			compareKeyset({ createdAt: a.createdAt, id: a.id }, { createdAt: b.createdAt, id: b.id }),
		);
		if (opts.order === 'desc') rows.reverse();
		if (opts.status !== undefined) {
			rows = rows.filter((entry) => entry.status === opts.status);
		}
		if (opts.parentId !== undefined) {
			rows = rows.filter((entry) => entry.parentId === opts.parentId);
		}
		if (opts.limit !== undefined) {
			rows = rows.slice(0, opts.limit);
		}
		return rows.map(cloneObservationLogEntry);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async dropObservationLogEntries(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		const idSet = new Set(ids);
		for (const bucket of this.observationLogByScope.values()) {
			for (const entry of bucket) {
				if (idSet.has(entry.id)) {
					entry.status = 'dropped';
					entry.supersededBy = null;
				}
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async supersedeObservationLogEntries(ids: string[], supersededBy: string): Promise<void> {
		if (ids.length === 0) return;
		const idSet = new Set(ids);
		for (const bucket of this.observationLogByScope.values()) {
			for (const entry of bucket) {
				if (idSet.has(entry.id)) {
					entry.status = 'superseded';
					entry.supersededBy = supersededBy;
				}
			}
		}
	}

	async applyObservationLogReflection(
		scope: ObservationLogScope,
		reflection: ObservationLogReflection,
	): Promise<ObservationLogReflectionResult> {
		const inserted = await this.appendObservationLogEntries(
			reflection.merge.map((entry) => ({
				scopeKind: scope.scopeKind,
				scopeId: scope.scopeId,
				marker: entry.marker,
				text: entry.text,
				parentId: entry.parentId,
				tokenCount: entry.tokenCount,
				createdAt: entry.createdAt,
			})),
		);

		await this.dropObservationLogEntries(reflection.drop);
		for (const [index, merge] of reflection.merge.entries()) {
			const replacement = inserted[index];
			if (replacement) {
				await this.supersedeObservationLogEntries(merge.supersedes, replacement.id);
			}
		}

		return {
			droppedIds: [...reflection.drop],
			supersededIds: reflection.merge.flatMap((entry) => entry.supersedes),
			inserted,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async appendObservations(rows: NewObservation[]): Promise<Observation[]> {
		const persisted: Observation[] = [];
		for (const row of rows) {
			const key = scopeKey(row.scopeKind, row.scopeId);
			const bucket = this.observationsByScope.get(key) ?? [];
			const obs: Observation = {
				...row,
				id: crypto.randomUUID(),
			};
			bucket.push(obs);
			this.observationsByScope.set(key, bucket);
			persisted.push(obs);
		}
		return persisted;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getObservations(opts: {
		scopeKind: ScopeKind;
		scopeId: string;
		since?: { sinceCreatedAt: Date; sinceObservationId: string };
		kindIs?: string;
		limit?: number;
		schemaVersionAtMost?: number;
	}): Promise<Observation[]> {
		const bucket = this.observationsByScope.get(scopeKey(opts.scopeKind, opts.scopeId)) ?? [];
		let rows = [...bucket].sort((a, b) =>
			compareKeyset({ createdAt: a.createdAt, id: a.id }, { createdAt: b.createdAt, id: b.id }),
		);
		if (opts.since) {
			const { sinceCreatedAt, sinceObservationId } = opts.since;
			rows = rows.filter(
				(r) =>
					compareKeyset(
						{ createdAt: r.createdAt, id: r.id },
						{ createdAt: sinceCreatedAt, id: sinceObservationId },
					) > 0,
			);
		}
		if (opts.kindIs !== undefined) {
			const kind = opts.kindIs;
			rows = rows.filter((r) => r.kind === kind);
		}
		if (opts.schemaVersionAtMost !== undefined) {
			const max = opts.schemaVersionAtMost;
			rows = rows.filter((r) => r.schemaVersion <= max);
		}
		if (opts.limit !== undefined) {
			rows = rows.slice(0, opts.limit);
		}
		return rows.map((r) => ({ ...r }));
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getMessagesForScope(
		scopeKind: ScopeKind,
		scopeId: string,
		opts?: { since?: { sinceCreatedAt: Date; sinceMessageId: string } },
	): Promise<AgentDbMessage[]> {
		if (scopeKind !== 'thread') {
			throw new Error(`getMessagesForScope: scopeKind='${scopeKind}' is not supported in v1`);
		}
		const candidates = this.messagesByThread.get(scopeId) ?? [];
		let rows = [...candidates].sort((a, b) =>
			compareKeyset(
				{ createdAt: a.createdAt, id: a.message.id },
				{ createdAt: b.createdAt, id: b.message.id },
			),
		);
		if (opts?.since) {
			const { sinceCreatedAt, sinceMessageId } = opts.since;
			rows = rows.filter(
				(s) =>
					compareKeyset(
						{ createdAt: s.createdAt, id: s.message.id },
						{ createdAt: sinceCreatedAt, id: sinceMessageId },
					) > 0,
			);
		}
		return rows.map((s) => ({ ...s.message, createdAt: s.createdAt }));
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async deleteObservations(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		const idSet = new Set(ids);
		for (const [key, bucket] of this.observationsByScope.entries()) {
			this.observationsByScope.set(
				key,
				bucket.filter((row) => !idSet.has(row.id)),
			);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getCursor(scopeKind: ScopeKind, scopeId: string): Promise<ObservationCursor | null> {
		const cursor = this.cursorsByScope.get(scopeKey(scopeKind, scopeId));
		return cursor ? cloneCursor(cursor) : null;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setCursor(cursor: ObservationCursor): Promise<void> {
		const key = scopeKey(cursor.scopeKind, cursor.scopeId);
		this.cursorsByScope.set(key, cloneCursor(cursor));
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async acquireObservationLock(
		scopeKind: ScopeKind,
		scopeId: string,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLockHandle | null> {
		return await this.acquireScopeLock(scopeKind, scopeId, opts);
	}

	async acquireObservationLogTaskLock(
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
		taskKind: ObservationLogTaskKind,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLogTaskLockHandle | null> {
		const handle = await this.acquireScopeLock(scopeKind, scopeId, opts, taskKind);
		if (!handle) return null;
		return { scopeKind, scopeId, taskKind, holderId: handle.holderId, heldUntil: handle.heldUntil };
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async acquireScopeLock(
		scopeKind: ScopeKind,
		scopeId: string,
		opts: { ttlMs: number; holderId: string },
		taskKind?: ObservationLogTaskKind,
	): Promise<(ObservationLockHandle & { taskKind?: ObservationLogTaskKind }) | null> {
		const key = scopeKey(scopeKind, scopeId);
		const existing = this.locksByScope.get(key);
		const now = Date.now();
		if (existing && existing.holderId !== opts.holderId && existing.heldUntil.getTime() > now) {
			return null;
		}
		const handle: ObservationLockHandle & { taskKind?: ObservationLogTaskKind } = {
			scopeKind,
			scopeId,
			holderId: opts.holderId,
			heldUntil: new Date(now + opts.ttlMs),
			...(taskKind !== undefined && { taskKind }),
		};
		this.locksByScope.set(key, handle);
		return { ...handle };
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async releaseObservationLock(handle: ObservationLockHandle): Promise<void> {
		await this.releaseScopeLock(handle);
	}

	async releaseObservationLogTaskLock(handle: ObservationLogTaskLockHandle): Promise<void> {
		await this.releaseScopeLock(handle);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async releaseScopeLock(handle: ObservationLockHandle): Promise<void> {
		const key = scopeKey(handle.scopeKind, handle.scopeId);
		const current = this.locksByScope.get(key);
		if (current && current.holderId === handle.holderId) {
			this.locksByScope.delete(key);
		}
	}
}

/**
 * Save messages to a specific thread, ensuring the thread exists first.
 * Always call this instead of `memory.saveMessages()` directly, as it
 * establishes the thread context required by implementations like InMemoryMemory.
 */
export async function saveMessagesToThread(
	memory: BuiltMemory,
	threadId: string,
	resourceId: string,
	messages: AgentDbMessage[],
): Promise<void> {
	await memory.saveThread({ id: threadId, resourceId });
	await memory.saveMessages({ threadId, resourceId, messages });
}
