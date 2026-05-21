import { hashEpisodicMemoryContent, rankEpisodicMemoryEntries } from './episodic-memory';
import {
	activeLifecycleState,
	markLifecycleActive,
	markLifecycleDropped,
	markLifecycleSuperseded,
	normalizeFlatReflectionActions,
	uniqueStrings,
} from './memory-lifecycle';
import { normalizeObservationLogReflection } from './observation-log-reflector';
import type {
	BuiltEpisodicMemoryStore,
	BuiltMemory,
	EpisodicMemoryCursor,
	EpisodicMemoryEntry,
	EpisodicMemoryEntrySource,
	EpisodicMemoryMethods,
	EpisodicMemoryReflectionApply,
	EpisodicMemoryReflectionResult,
	EpisodicMemoryScope,
	EpisodicMemorySearchOptions,
	MemoryDescriptor,
	NewEpisodicMemoryCursor,
	NewEpisodicMemoryEntry,
	NewEpisodicMemoryEntrySource,
	NewEpisodicMemoryEntrySourceForEntry,
	RetrievedEpisodicMemoryEntry,
	Thread,
} from '../types';
import type { AgentDbMessage } from '../types/sdk/message';
import type { ObservationCursor } from '../types/sdk/observation';
import {
	createObservationLogThreadScopePrefix,
	estimateObservationTokens,
} from '../types/sdk/observation-log';
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

interface StoredMessage {
	message: AgentDbMessage;
	createdAt: Date;
	resourceId: string;
}

function scopeKey(scopeKind: ObservationLogScopeKind, scopeId: string): string {
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
 * In-memory implementation of BuiltMemory and BuiltObservationLogStore.
 * All data is lost on process restart — suitable for development and testing.
 *
 * Thread context for `saveMessages` is established by calling `saveThread` first.
 * The most recently saved thread is used when `saveMessages` is called.
 */
export class InMemoryMemory
	implements
		BuiltMemory,
		BuiltObservationLogStore,
		BuiltObservationLogTaskLockStore,
		BuiltEpisodicMemoryStore
{
	private threads = new Map<string, Thread>();

	private messagesByThread = new Map<string, StoredMessage[]>();

	private observationLogByScope = new Map<string, ObservationLogEntry[]>();

	private cursorsByScope = new Map<string, ObservationCursor>();

	private locksByScope = new Map<string, ObservationLogTaskLockHandle>();

	private episodicMemory: EpisodicMemoryEntry[] = [];

	private episodicMemorySources: EpisodicMemoryEntrySource[] = [];

	private episodicMemoryCursorsByScope = new Map<string, EpisodicMemoryCursor>();

	readonly episodic: EpisodicMemoryMethods = {
		saveEntryWithSources: async (entry, sources) =>
			await this.saveEpisodicMemoryEntryWithSources(entry, sources),
		searchEntries: async (scope, query, opts) =>
			await this.searchEpisodicMemoryEntries(scope, query, opts),
		getEntrySources: async (entryIds) => await this.getEpisodicMemoryEntrySources(entryIds),
		applyReflection: async (scope, reflection) =>
			await this.applyEpisodicMemoryReflection(scope, reflection),
		getCursor: async (scope) => await this.getEpisodicMemoryCursor(scope),
		setCursor: async (cursor) => await this.setEpisodicMemoryCursor(cursor),
	};

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
		const legacyKey = scopeKey('thread', threadId);
		const resourceScopePrefix = scopeKey('thread', createObservationLogThreadScopePrefix(threadId));
		for (const key of this.observationLogByScope.keys()) {
			if (key === legacyKey || key.startsWith(resourceScopePrefix)) {
				this.observationLogByScope.delete(key);
			}
		}
		for (const key of this.cursorsByScope.keys()) {
			if (key === legacyKey || key.startsWith(resourceScopePrefix)) {
				this.cursorsByScope.delete(key);
			}
		}
		for (const key of this.locksByScope.keys()) {
			if (key === legacyKey || key.startsWith(resourceScopePrefix)) {
				this.locksByScope.delete(key);
			}
		}
		const affectedEntryIds = uniqueStrings(
			this.episodicMemorySources
				.filter((source) => source.threadId === threadId)
				.map((source) => source.memoryEntryId),
		);
		this.episodicMemorySources = this.episodicMemorySources.filter(
			(source) => source.threadId !== threadId,
		);
		if (affectedEntryIds.length > 0) {
			const entriesWithSources = new Set(
				this.episodicMemorySources.map((source) => source.memoryEntryId),
			);
			for (const memoryEntry of this.episodicMemory) {
				const hasLostLastSource =
					affectedEntryIds.includes(memoryEntry.id) && !entriesWithSources.has(memoryEntry.id);
				if (hasLostLastSource) {
					markLifecycleDropped(memoryEntry);
					memoryEntry.updatedAt = new Date();
				}
			}
		}
		for (const key of this.episodicMemoryCursorsByScope.keys()) {
			if (key === legacyKey || key.startsWith(resourceScopePrefix)) {
				this.episodicMemoryCursorsByScope.delete(key);
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getMessages(
		threadId: string,
		opts?: {
			limit?: number;
			before?: Date;
			resourceId?: string;
		},
	): Promise<AgentDbMessage[]> {
		let stored = this.messagesByThread.get(threadId) ?? [];
		if (opts?.resourceId !== undefined) {
			stored = stored.filter((s) => s.resourceId === opts.resourceId);
		}
		if (opts?.before) {
			const cutoff = opts.before.getTime();
			stored = stored.filter((s) => s.createdAt.getTime() < cutoff);
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
				...activeLifecycleState(),
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
					markLifecycleDropped(entry);
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
					markLifecycleSuperseded(entry, supersededBy);
				}
			}
		}
	}

	async applyObservationLogReflection(
		scope: ObservationLogScope,
		reflection: ObservationLogReflection,
	): Promise<ObservationLogReflectionResult> {
		const normalized = normalizeObservationLogReflection(
			await this.getActiveObservationLog(scope),
			reflection,
		);
		const inserted = await this.appendObservationLogEntries(
			normalized.merge.map((entry) => ({
				scopeKind: scope.scopeKind,
				scopeId: scope.scopeId,
				marker: entry.marker,
				text: entry.text,
				parentId: entry.parentId,
				tokenCount: entry.tokenCount,
				createdAt: entry.createdAt,
			})),
		);

		await this.dropObservationLogEntries(normalized.drop);
		for (const [index, merge] of normalized.merge.entries()) {
			const replacement = inserted[index];
			if (replacement) {
				await this.supersedeObservationLogEntries(merge.supersedes, replacement.id);
			}
		}

		return {
			droppedIds: [...normalized.drop],
			supersededIds: normalized.merge.flatMap((entry) => entry.supersedes),
			inserted,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getMessagesForScope(
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
		opts?: { since?: { sinceCreatedAt: Date; sinceMessageId: string }; resourceId?: string },
	): Promise<AgentDbMessage[]> {
		if (scopeKind !== 'thread') {
			throw new Error(`getMessagesForScope: scopeKind='${scopeKind}' is not supported in v1`);
		}
		const candidates = this.messagesByThread.get(scopeId) ?? [];
		let rows = candidates
			.filter((s) => opts?.resourceId === undefined || s.resourceId === opts.resourceId)
			.sort((a, b) =>
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
	async getCursor(
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
	): Promise<ObservationCursor | null> {
		const cursor = this.cursorsByScope.get(scopeKey(scopeKind, scopeId));
		return cursor ? cloneCursor(cursor) : null;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setCursor(cursor: ObservationCursor): Promise<void> {
		const key = scopeKey(cursor.scopeKind, cursor.scopeId);
		this.cursorsByScope.set(key, cloneCursor(cursor));
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
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
		opts: { ttlMs: number; holderId: string },
		taskKind: ObservationLogTaskKind,
	): Promise<ObservationLogTaskLockHandle | null> {
		const key = scopeKey(scopeKind, scopeId);
		const existing = this.locksByScope.get(key);
		const now = Date.now();
		if (existing && existing.holderId !== opts.holderId && existing.heldUntil.getTime() > now) {
			return null;
		}
		const handle: ObservationLogTaskLockHandle = {
			scopeKind,
			scopeId,
			taskKind,
			holderId: opts.holderId,
			heldUntil: new Date(now + opts.ttlMs),
		};
		this.locksByScope.set(key, handle);
		return { ...handle };
	}

	async releaseObservationLogTaskLock(handle: ObservationLogTaskLockHandle): Promise<void> {
		await this.releaseScopeLock(handle);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async releaseScopeLock(handle: ObservationLogTaskLockHandle): Promise<void> {
		const key = scopeKey(handle.scopeKind, handle.scopeId);
		const current = this.locksByScope.get(key);
		if (current && current.holderId === handle.holderId) {
			this.locksByScope.delete(key);
		}
	}

	// ── Episodic memory ──────────────────────────────────────────────────

	// eslint-disable-next-line @typescript-eslint/require-await
	private async saveEpisodicMemoryEntries(
		entries: NewEpisodicMemoryEntry[],
	): Promise<EpisodicMemoryEntry[]> {
		const now = new Date();
		const saved: EpisodicMemoryEntry[] = [];
		for (const entry of entries) {
			const contentHash = entry.contentHash ?? hashEpisodicMemoryContent(entry.content);
			const duplicate = this.episodicMemory.find(
				(existing) =>
					existing.resourceId === entry.resourceId && existing.contentHash === contentHash,
			);
			if (duplicate) {
				markLifecycleActive(duplicate);
				duplicate.lastSeenAt = entry.lastSeenAt ?? now;
				duplicate.updatedAt = now;
				saved.push(cloneEpisodicMemoryEntry(duplicate));
				continue;
			}

			const row: EpisodicMemoryEntry = {
				id: crypto.randomUUID(),
				resourceId: entry.resourceId,
				content: entry.content,
				contentHash,
				...activeLifecycleState(),
				...(entry.embedding ? { embedding: [...entry.embedding] } : {}),
				...(entry.embeddingModel ? { embeddingModel: entry.embeddingModel } : {}),
				metadata: entry.metadata ?? null,
				createdAt: entry.createdAt ?? now,
				updatedAt: now,
				lastSeenAt: entry.lastSeenAt ?? now,
			};
			this.episodicMemory.push(row);
			saved.push(cloneEpisodicMemoryEntry(row));
		}
		return saved;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async saveEpisodicMemoryEntrySources(
		sources: NewEpisodicMemoryEntrySource[],
	): Promise<EpisodicMemoryEntrySource[]> {
		const saved: EpisodicMemoryEntrySource[] = [];
		for (const source of sources) {
			const duplicate = this.episodicMemorySources.find(
				(existing) =>
					existing.memoryEntryId === source.memoryEntryId &&
					existing.observationId === source.observationId &&
					existing.evidenceText === source.evidenceText,
			);
			if (duplicate) {
				saved.push(cloneEpisodicMemorySource(duplicate));
				continue;
			}
			const row: EpisodicMemoryEntrySource = {
				id: crypto.randomUUID(),
				memoryEntryId: source.memoryEntryId,
				observationId: source.observationId,
				threadId: source.threadId,
				evidenceText: source.evidenceText,
				createdAt: source.createdAt ?? new Date(),
			};
			this.episodicMemorySources.push(row);
			saved.push(cloneEpisodicMemorySource(row));
		}
		return saved;
	}

	private async saveEpisodicMemoryEntryWithSources(
		entry: NewEpisodicMemoryEntry,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
	): Promise<EpisodicMemoryEntry | null> {
		const memorySnapshot = this.episodicMemory.map(cloneEpisodicMemoryEntry);
		const sourceSnapshot = this.episodicMemorySources.map(cloneEpisodicMemorySource);
		try {
			const [saved] = await this.saveEpisodicMemoryEntries([entry]);
			if (!saved) return null;
			await this.saveEpisodicMemoryEntrySources(
				sources.map((source) => ({ ...source, memoryEntryId: saved.id })),
			);
			return saved;
		} catch (error) {
			this.episodicMemory = memorySnapshot;
			this.episodicMemorySources = sourceSnapshot;
			throw error;
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async searchEpisodicMemoryEntries(
		scope: EpisodicMemoryScope,
		query: string,
		opts?: EpisodicMemorySearchOptions,
	): Promise<RetrievedEpisodicMemoryEntry[]> {
		const scoped = this.episodicMemory
			.filter((entry) => entry.resourceId === scope.resourceId)
			.map(cloneEpisodicMemoryEntry);
		return rankEpisodicMemoryEntries(scoped, query, opts);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async supersedeEpisodicMemoryEntries(ids: string[], supersededBy: string): Promise<void> {
		const idSet = new Set(ids);
		for (const entry of this.episodicMemory) {
			if (!idSet.has(entry.id) || entry.id === supersededBy) continue;
			markLifecycleSuperseded(entry, supersededBy);
			entry.updatedAt = new Date();
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async getEpisodicMemoryEntrySources(
		entryIds: string[],
	): Promise<EpisodicMemoryEntrySource[]> {
		const idSet = new Set(entryIds);
		return this.episodicMemorySources
			.filter((source) => idSet.has(source.memoryEntryId))
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
			.map(cloneEpisodicMemorySource);
	}

	private async applyEpisodicMemoryReflection(
		scope: EpisodicMemoryScope,
		reflection: EpisodicMemoryReflectionApply,
	): Promise<EpisodicMemoryReflectionResult> {
		const activeIds = new Set(
			this.episodicMemory
				.filter((entry) => entry.resourceId === scope.resourceId && entry.status === 'active')
				.map((entry) => entry.id),
		);
		const normalized = normalizeFlatReflectionActions({
			activeIds,
			drop: reflection.drop,
			merge: reflection.merge,
			normalizeMerge: (entry, supersedes) => ({ ...entry, supersedes }),
		});
		for (const entry of this.episodicMemory) {
			if (!normalized.drop.includes(entry.id)) continue;
			markLifecycleDropped(entry);
			entry.updatedAt = new Date();
		}

		const inserted: EpisodicMemoryEntry[] = [];
		const supersededIds: string[] = [];
		for (const merge of normalized.merge) {
			const { supersedes } = merge;
			const [replacement] = await this.saveEpisodicMemoryEntries([merge.entry]);
			if (!replacement) continue;
			inserted.push(replacement);
			const copiedSources = this.episodicMemorySources
				.filter((source) => supersedes.includes(source.memoryEntryId))
				.map((source) => ({
					memoryEntryId: replacement.id,
					observationId: source.observationId,
					threadId: source.threadId,
					evidenceText: source.evidenceText,
					createdAt: merge.entry.createdAt ?? new Date(),
				}));
			await this.saveEpisodicMemoryEntrySources(copiedSources);
			await this.supersedeEpisodicMemoryEntries(supersedes, replacement.id);
			supersededIds.push(...supersedes.filter((id) => id !== replacement.id));
		}

		return {
			droppedIds: normalized.drop,
			supersededIds,
			inserted,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async getEpisodicMemoryCursor(
		scope: ObservationLogScope,
	): Promise<EpisodicMemoryCursor | null> {
		const cursor = this.episodicMemoryCursorsByScope.get(scopeKey(scope.scopeKind, scope.scopeId));
		return cursor ? cloneEpisodicMemoryCursor(cursor) : null;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async setEpisodicMemoryCursor(cursor: NewEpisodicMemoryCursor): Promise<void> {
		const now = new Date();
		this.episodicMemoryCursorsByScope.set(scopeKey(cursor.scopeKind, cursor.scopeId), {
			...cursor,
			lastIndexedObservationCreatedAt: new Date(cursor.lastIndexedObservationCreatedAt),
			updatedAt: cursor.updatedAt ?? now,
		});
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

function cloneEpisodicMemoryEntry(entry: EpisodicMemoryEntry): EpisodicMemoryEntry {
	return {
		...entry,
		...(entry.embedding ? { embedding: [...entry.embedding] } : {}),
		createdAt: new Date(entry.createdAt),
		updatedAt: new Date(entry.updatedAt),
		lastSeenAt: new Date(entry.lastSeenAt),
	};
}

function cloneEpisodicMemorySource(source: EpisodicMemoryEntrySource): EpisodicMemoryEntrySource {
	return { ...source, createdAt: new Date(source.createdAt) };
}

function cloneEpisodicMemoryCursor(cursor: EpisodicMemoryCursor): EpisodicMemoryCursor {
	return {
		...cursor,
		lastIndexedObservationCreatedAt: new Date(cursor.lastIndexedObservationCreatedAt),
		updatedAt: new Date(cursor.updatedAt),
	};
}
