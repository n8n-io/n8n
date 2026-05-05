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

interface StoredMessage {
	message: AgentDbMessage;
	createdAt: Date;
	seq: number;
}

function scopeKey(scopeKind: ScopeKind, scopeId: string): string {
	return `${scopeKind}:${scopeId}`;
}

/**
 * In-memory implementation of BuiltMemory and BuiltObservationStore.
 * All data is lost on process restart — suitable for development and testing.
 *
 * Thread context for `saveMessages` is established by calling `saveThread` first.
 * The most recently saved thread is used when `saveMessages` is called.
 */
export class InMemoryMemory implements BuiltMemory, BuiltObservationStore {
	private threads = new Map<string, Thread>();

	private messagesByThread = new Map<string, StoredMessage[]>();

	private nextSeq = 1;

	private workingMemoryByKey = new Map<string, string>();

	private observationsByScope = new Map<string, Observation[]>();

	private cursorsByScope = new Map<string, ObservationCursor>();

	private locksByScope = new Map<string, ObservationLockHandle>();

	// eslint-disable-next-line @typescript-eslint/require-await
	async getWorkingMemory(params: { threadId: string; resourceId?: string }): Promise<
		string | null
	> {
		return this.workingMemoryByKey.get(params.resourceId ?? params.threadId) ?? null;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async saveWorkingMemory(
		params: { threadId: string; resourceId?: string },
		content: string,
	): Promise<void> {
		this.workingMemoryByKey.set(params.resourceId ?? params.threadId, content);
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
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getMessages(
		threadId: string,
		opts?: { limit?: number; before?: Date; sinceSeq?: number },
	): Promise<AgentDbMessage[]> {
		let stored = this.messagesByThread.get(threadId) ?? [];
		if (opts?.before) {
			const cutoff = opts.before.getTime();
			stored = stored.filter((s) => s.createdAt.getTime() < cutoff);
		}
		if (opts?.sinceSeq !== undefined) {
			const cursor = opts.sinceSeq;
			stored = stored.filter((s) => s.seq > cursor);
		}
		if (opts?.limit) stored = stored.slice(-opts.limit);
		return stored.map((s) => ({ ...s.message, createdAt: s.createdAt, seq: s.seq }));
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
		for (const msg of args.messages) {
			const idx = byId.get(msg.id);
			if (idx !== undefined) {
				// Upsert preserves the original seq so downstream cursors stay valid.
				existing[idx] = { message: msg, createdAt: msg.createdAt, seq: existing[idx].seq };
			} else {
				const entry: StoredMessage = {
					message: msg,
					createdAt: msg.createdAt,
					seq: this.nextSeq++,
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
	async appendObservations(rows: NewObservation[]): Promise<Observation[]> {
		const persisted: Observation[] = [];
		for (const row of rows) {
			const key = scopeKey(row.scopeKind, row.scopeId);
			const bucket = this.observationsByScope.get(key) ?? [];
			const seq = bucket.length > 0 ? bucket[bucket.length - 1].seq + 1 : 1;
			const obs: Observation = {
				...row,
				id: crypto.randomUUID(),
				seq,
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
		sinceSeq?: number;
		kindIs?: string;
		limit?: number;
		schemaVersionAtMost?: number;
		onlyUncompacted?: boolean;
	}): Promise<Observation[]> {
		const bucket = this.observationsByScope.get(scopeKey(opts.scopeKind, opts.scopeId)) ?? [];
		let rows = bucket;
		if (opts.sinceSeq !== undefined) {
			const cursor = opts.sinceSeq;
			rows = rows.filter((r) => r.seq > cursor);
		}
		if (opts.kindIs !== undefined) {
			const kind = opts.kindIs;
			rows = rows.filter((r) => r.kind === kind);
		}
		if (opts.onlyUncompacted) {
			rows = rows.filter((r) => r.compactedAt === null);
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
	async markObservationsCompacted(ids: string[], compactedAt: Date): Promise<void> {
		const idSet = new Set(ids);
		for (const bucket of this.observationsByScope.values()) {
			for (const row of bucket) {
				if (idSet.has(row.id) && row.compactedAt === null) {
					row.compactedAt = compactedAt;
				}
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getCursor(scopeKind: ScopeKind, scopeId: string): Promise<ObservationCursor | null> {
		return this.cursorsByScope.get(scopeKey(scopeKind, scopeId)) ?? null;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setCursor(cursor: ObservationCursor): Promise<void> {
		this.cursorsByScope.set(scopeKey(cursor.scopeKind, cursor.scopeId), { ...cursor });
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async acquireObservationLock(
		scopeKind: ScopeKind,
		scopeId: string,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLockHandle | null> {
		const key = scopeKey(scopeKind, scopeId);
		const existing = this.locksByScope.get(key);
		const now = Date.now();
		if (existing && existing.holderId !== opts.holderId && existing.heldUntil.getTime() > now) {
			return null;
		}
		const handle: ObservationLockHandle = {
			scopeKind,
			scopeId,
			holderId: opts.holderId,
			heldUntil: new Date(now + opts.ttlMs),
		};
		this.locksByScope.set(key, handle);
		return { ...handle };
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async releaseObservationLock(handle: ObservationLockHandle): Promise<void> {
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
