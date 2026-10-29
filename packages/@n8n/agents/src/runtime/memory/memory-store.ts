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
import { observationCursorsMatch, prepareObservationLogBatchCursor } from './observation-log-batch';
import type { RuntimeSkillState, RuntimeSkillStateStore } from '../../skills/types';
import type {
	BuiltEpisodicMemoryCaptureStore,
	BuiltEpisodicMemoryStore,
	BuiltMemory,
	EpisodicMemoryCaptureCandidate,
	EpisodicMemoryEntry,
	EpisodicMemoryEntrySource,
	EpisodicMemoryReflectionApply,
	EpisodicMemoryReflectionApplyMerge,
	EpisodicMemoryReflectionResult,
	EpisodicMemoryScope,
	EpisodicMemorySearchOptions,
	EpisodicMemoryTaskLockHandle,
	MemoryDescriptor,
	NewEpisodicMemoryCaptureCandidate,
	NewEpisodicMemoryEntry,
	NewEpisodicMemoryEntrySource,
	NewEpisodicMemoryEntrySourceForEntry,
	RetrievedEpisodicMemoryEntry,
	Thread,
} from '../../types';
import type { AgentDbMessage } from '../../types/sdk/message';
import type { ObservationCursor } from '../../types/sdk/observation';
import type {
	BuiltObservationLogStore,
	BuiltObservationLogTaskLockStore,
	NewObservationLogEntry,
	ObservationLogBatch,
	ObservationLogBatchCommitResult,
	ObservationLogEntry,
	ObservationLogReadOptions,
	ObservationLogReflection,
	ObservationLogReflectionResult,
	ObservationLogScope,
	ObservationLogTaskKind,
	ObservationLogTaskLockHandle,
} from '../../types/sdk/observation-log';
import { estimateObservationTokens } from '../model/model-token-counter';

interface StoredMessage {
	message: AgentDbMessage;
	createdAt: Date;
	resourceId: string;
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

export function compareKeyset(
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
		BuiltEpisodicMemoryStore,
		BuiltEpisodicMemoryCaptureStore
{
	private threads = new Map<string, Thread>();

	private messagesByThread = new Map<string, StoredMessage[]>();
	private skillsByThread = new Map<string, Map<string, RuntimeSkillState>>();

	readonly skillState: RuntimeSkillStateStore = {
		load: async ({ threadId, resourceId, agentName }) =>
			structuredClone(
				this.skillsByThread.get(threadId)?.get(JSON.stringify([resourceId, agentName])),
			),
		save: async ({ threadId, resourceId, agentName }, state) => {
			const states = this.skillsByThread.get(threadId) ?? new Map<string, RuntimeSkillState>();
			states.set(JSON.stringify([resourceId, agentName]), structuredClone(state));
			this.skillsByThread.set(threadId, states);
		},
	};

	private observationLogByScope = new Map<string, ObservationLogEntry[]>();

	private cursorsByScope = new Map<string, ObservationCursor>();

	private locksByScope = new Map<string, ObservationLogTaskLockHandle>();

	private episodicMemory: EpisodicMemoryEntry[] = [];

	private episodicMemorySources: EpisodicMemoryEntrySource[] = [];

	private episodicMemoryCaptureCandidates: EpisodicMemoryCaptureCandidate[] = [];

	private episodicMemoryLocksByResource = new Map<string, EpisodicMemoryTaskLockHandle>();

	readonly episodic: BuiltEpisodicMemoryCaptureStore['episodic'] = {
		getEntriesByContentHashes: async (scope, contentHashes) => {
			const hashes = new Set(contentHashes);
			return await Promise.resolve(
				this.episodicMemory
					.filter(
						(entry) =>
							entry.resourceId === episodicWriteScopeId(scope) && hashes.has(entry.contentHash),
					)
					.map(cloneEpisodicMemoryEntry),
			);
		},
		saveEntryWithSources: async (entry, sources) =>
			await this.saveEpisodicMemoryEntryWithSources(entry, sources),
		// Ranking uses the query embedding in `opts`, not the query text.
		searchEntries: async (scope, _query, opts) =>
			await this.searchEpisodicMemoryEntries(scope, opts),
		getEntrySources: async (entryIds) => await this.getEpisodicMemoryEntrySources(entryIds),
		applyReflection: async (scope, reflection) =>
			await this.applyEpisodicMemoryReflection(scope, reflection),
		enqueueCaptureCandidate: async (candidate) =>
			await this.enqueueEpisodicMemoryCaptureCandidate(candidate),
		getPendingCaptureCandidates: async (scope, opts) =>
			await this.getPendingEpisodicMemoryCaptureCandidates(scope, opts),
		completeCaptureCandidates: async (ids) =>
			await this.completeEpisodicMemoryCaptureCandidates(ids),
		recordCaptureCandidateFailure: async (ids, maxAttempts) =>
			await this.recordEpisodicMemoryCaptureCandidateFailure(ids, maxAttempts),
		findSimilarEntries: async (scope, embeddings, opts) =>
			await this.findSimilarEpisodicMemoryEntries(scope, embeddings, opts),
		addEntrySources: async (entryId, sources, lastSeenAt) =>
			await this.addEpisodicMemoryEntrySources(entryId, sources, lastSeenAt),
		taskLock: {
			acquire: async (scope, opts) =>
				await this.acquireEpisodicMemoryTaskLock(episodicWriteScopeId(scope), opts),
			release: async (handle) => await this.releaseEpisodicMemoryTaskLock(handle),
		},
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
		this.skillsByThread.delete(threadId);
		this.messagesByThread.delete(threadId);
		this.observationLogByScope.delete(threadId);
		this.cursorsByScope.delete(threadId);
		this.locksByScope.delete(threadId);
		const affectedEntryIds = uniqueStrings(
			this.episodicMemorySources
				.filter((source) => source.threadId === threadId)
				.map((source) => source.memoryEntryId),
		);
		this.episodicMemorySources = this.episodicMemorySources.filter(
			(source) => source.threadId !== threadId,
		);
		this.episodicMemoryCaptureCandidates = this.episodicMemoryCaptureCandidates.filter(
			(candidate) => candidate.threadId !== threadId,
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
		for (const candidate of this.episodicMemoryCaptureCandidates) {
			if (candidate.sourceMessageId && idSet.has(candidate.sourceMessageId)) {
				candidate.sourceMessageId = null;
				candidate.updatedAt = new Date();
			}
		}
	}

	describe(): MemoryDescriptor {
		return { name: 'memory', constructorName: this.constructor.name, connectionParams: {} };
	}

	// ── Observational memory ─────────────────────────────────────────────

	async commitObservationLogBatch(
		batch: ObservationLogBatch,
	): Promise<ObservationLogBatchCommitResult> {
		const cursor = prepareObservationLogBatchCursor(batch);
		const storedCursor = this.cursorsByScope.get(batch.observationScopeId) ?? null;
		if (!cursor || !observationCursorsMatch(storedCursor, batch.expectedCursor)) {
			return 'stale';
		}

		const staged: ObservationLogEntry[] = [];
		for (const entry of batch.entries) {
			staged.push({
				id: crypto.randomUUID(),
				observationScopeId: batch.observationScopeId,
				marker: entry.marker,
				text: entry.text,
				parentId: entry.parentIndex === null ? null : staged[entry.parentIndex].id,
				tokenCount: entry.tokenCount,
				createdAt: new Date(entry.createdAt),
				...activeLifecycleState(),
			});
		}
		const existing = this.observationLogByScope.get(batch.observationScopeId) ?? [];
		this.observationLogByScope.set(batch.observationScopeId, [...existing, ...staged]);
		this.cursorsByScope.set(batch.observationScopeId, cursor);
		return await Promise.resolve('committed');
	}

	async appendObservationLogEntries(
		rows: NewObservationLogEntry[],
	): Promise<ObservationLogEntry[]> {
		const prepared = await Promise.all(
			rows.map(async (row) => {
				const createdAt = row.createdAt ?? new Date();
				return {
					observationScopeId: row.observationScopeId,
					marker: row.marker,
					text: row.text,
					parentId: row.parentId ?? null,
					tokenCount: row.tokenCount ?? (await estimateObservationTokens(row.text)),
					createdAt,
				};
			}),
		);

		const persisted: ObservationLogEntry[] = [];
		for (const row of prepared) {
			const key = row.observationScopeId;
			const bucket = this.observationLogByScope.get(key) ?? [];
			const entry: ObservationLogEntry = {
				id: crypto.randomUUID(),
				observationScopeId: row.observationScopeId,
				marker: row.marker,
				text: row.text,
				parentId: row.parentId,
				tokenCount: row.tokenCount,
				...activeLifecycleState(),
				createdAt: row.createdAt,
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
		const bucket = this.observationLogByScope.get(opts.observationScopeId) ?? [];
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
				observationScopeId: scope.observationScopeId,
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
	async getMessagesForObservationScope(
		observationScopeId: string,
		opts?: { since?: { sinceCreatedAt: Date; sinceMessageId: string } },
	): Promise<AgentDbMessage[]> {
		const candidates = this.messagesByThread.get(observationScopeId) ?? [];
		let rows = candidates.sort((a, b) =>
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
	async getCursor(observationScopeId: string): Promise<ObservationCursor | null> {
		const cursor = this.cursorsByScope.get(observationScopeId);
		return cursor ? cloneCursor(cursor) : null;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setCursor(cursor: ObservationCursor): Promise<void> {
		this.cursorsByScope.set(cursor.observationScopeId, cloneCursor(cursor));
	}

	async acquireObservationLogTaskLock(
		observationScopeId: string,
		taskKind: ObservationLogTaskKind,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLogTaskLockHandle | null> {
		const handle = await this.acquireScopeLock(observationScopeId, opts, taskKind);
		if (!handle) return null;
		return { observationScopeId, taskKind, holderId: handle.holderId, heldUntil: handle.heldUntil };
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async acquireScopeLock(
		observationScopeId: string,
		opts: { ttlMs: number; holderId: string },
		taskKind: ObservationLogTaskKind,
	): Promise<ObservationLogTaskLockHandle | null> {
		const key = observationScopeId;
		const existing = this.locksByScope.get(key);
		const now = Date.now();
		if (existing && existing.holderId !== opts.holderId && existing.heldUntil.getTime() > now) {
			return null;
		}
		const handle: ObservationLogTaskLockHandle = {
			observationScopeId,
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
		const key = handle.observationScopeId;
		const current = this.locksByScope.get(key);
		if (current?.holderId === handle.holderId) {
			this.locksByScope.delete(key);
		}
	}

	// ── Episodic memory ──────────────────────────────────────────────────

	// eslint-disable-next-line @typescript-eslint/require-await
	private async enqueueEpisodicMemoryCaptureCandidate(
		candidate: NewEpisodicMemoryCaptureCandidate,
	): Promise<EpisodicMemoryCaptureCandidate> {
		const existing = this.episodicMemoryCaptureCandidates.find(
			(row) => row.runId === candidate.runId && row.toolCallId === candidate.toolCallId,
		);
		if (existing) return cloneEpisodicMemoryCaptureCandidate(existing);

		const now = new Date();
		const { episodic: _episodic, ...candidateData } = candidate;
		const row: EpisodicMemoryCaptureCandidate = {
			...candidateData,
			resourceId: episodicWriteScopeId(candidate),
			id: crypto.randomUUID(),
			status: 'pending',
			attemptCount: 0,
			createdAt: now,
			updatedAt: now,
		};
		this.episodicMemoryCaptureCandidates.push(row);
		return cloneEpisodicMemoryCaptureCandidate(row);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async getPendingEpisodicMemoryCaptureCandidates(
		scope: EpisodicMemoryScope,
		opts?: { limit?: number },
	): Promise<EpisodicMemoryCaptureCandidate[]> {
		return this.episodicMemoryCaptureCandidates
			.filter(
				(candidate) =>
					candidate.resourceId === episodicWriteScopeId(scope) && candidate.status === 'pending',
			)
			.sort((a, b) => compareKeyset(a, b))
			.slice(0, opts?.limit)
			.map(cloneEpisodicMemoryCaptureCandidate);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async completeEpisodicMemoryCaptureCandidates(ids: string[]): Promise<void> {
		const idSet = new Set(ids);
		for (const candidate of this.episodicMemoryCaptureCandidates) {
			if (!idSet.has(candidate.id) || candidate.status !== 'pending') continue;
			candidate.status = 'completed';
			candidate.updatedAt = new Date();
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async recordEpisodicMemoryCaptureCandidateFailure(
		ids: string[],
		maxAttempts: number,
	): Promise<void> {
		const idSet = new Set(ids);
		for (const candidate of this.episodicMemoryCaptureCandidates) {
			if (!idSet.has(candidate.id) || candidate.status !== 'pending') continue;
			candidate.attemptCount += 1;
			if (candidate.attemptCount >= maxAttempts) candidate.status = 'failed';
			candidate.updatedAt = new Date();
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async saveEpisodicMemoryEntries(
		entries: NewEpisodicMemoryEntry[],
	): Promise<EpisodicMemoryEntry[]> {
		const now = new Date();
		const saved: EpisodicMemoryEntry[] = [];
		for (const entry of entries) {
			const contentHash = entry.contentHash ?? hashEpisodicMemoryContent(entry.content);
			const resourceId = episodicWriteScopeId(entry);
			const duplicate = this.episodicMemory.find(
				(existing) => existing.resourceId === resourceId && existing.contentHash === contentHash,
			);
			if (duplicate) {
				refreshEpisodicMemoryEntry(duplicate, entry, now);
				saved.push(cloneEpisodicMemoryEntry(duplicate));
				continue;
			}

			const row: EpisodicMemoryEntry = {
				id: crypto.randomUUID(),
				resourceId,
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
					(existing.observationId ?? null) === (source.observationId ?? null) &&
					(existing.candidateId ?? null) === (source.candidateId ?? null) &&
					existing.evidenceText === source.evidenceText,
			);
			if (duplicate) {
				saved.push(cloneEpisodicMemorySource(duplicate));
				continue;
			}
			const provenance = provenanceOf(source);
			if (!provenance) continue;
			const row: EpisodicMemoryEntrySource = {
				id: crypto.randomUUID(),
				memoryEntryId: source.memoryEntryId,
				...provenance,
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
		opts?: EpisodicMemorySearchOptions,
	): Promise<RetrievedEpisodicMemoryEntry[]> {
		const scopeIds = opts?.writeScopeOnly
			? [episodicWriteScopeId(scope)]
			: episodicReadScopeIds(scope);
		// The same fact told in two scopes is one memory to the reader.
		const newestByContent = new Map<string, EpisodicMemoryEntry>();
		for (const entry of this.episodicMemory) {
			if (!scopeIds.includes(entry.resourceId)) continue;
			const key = `${entry.status}\n${entry.contentHash}`;
			const seen = newestByContent.get(key);
			if (!seen || entry.lastSeenAt > seen.lastSeenAt) newestByContent.set(key, entry);
		}
		const scoped = [...newestByContent.values()].map(cloneEpisodicMemoryEntry);
		return rankEpisodicMemoryEntries(scoped, opts);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async findSimilarEpisodicMemoryEntries(
		scope: EpisodicMemoryScope,
		embeddings: number[][],
		opts: Pick<EpisodicMemorySearchOptions, 'topK' | 'minSimilarity'>,
	): Promise<RetrievedEpisodicMemoryEntry[][]> {
		const resourceId = episodicWriteScopeId(scope);
		const active = this.episodicMemory
			.filter((entry) => entry.resourceId === resourceId && entry.status === 'active')
			.map(cloneEpisodicMemoryEntry);
		return embeddings.map((queryEmbedding) =>
			rankEpisodicMemoryEntries(active, { ...opts, queryEmbedding }),
		);
	}

	private async addEpisodicMemoryEntrySources(
		entryId: string,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
		lastSeenAt: Date,
	): Promise<EpisodicMemoryEntry | null> {
		const entry = this.episodicMemory.find(
			(candidate) => candidate.id === entryId && candidate.status === 'active',
		);
		if (!entry) return null;
		await this.saveEpisodicMemoryEntrySources(
			sources.map((source) => ({ ...source, memoryEntryId: entry.id })),
		);
		entry.lastSeenAt = lastSeenAt;
		entry.updatedAt = new Date();
		return cloneEpisodicMemoryEntry(entry);
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
				.filter(
					(entry) => entry.resourceId === episodicWriteScopeId(scope) && entry.status === 'active',
				)
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
			await this.saveEpisodicMemoryEntrySources(this.replacementSources(merge, replacement.id));
			await this.supersedeEpisodicMemoryEntries(supersedes, replacement.id);
			supersededIds.push(...supersedes.filter((id) => id !== replacement.id));
		}

		return {
			droppedIds: normalized.drop,
			supersededIds,
			inserted,
		};
	}

	/** The sources of the superseded entries, then the sources the merge adds. */
	private replacementSources(
		merge: EpisodicMemoryReflectionApplyMerge,
		replacementId: string,
	): NewEpisodicMemoryEntrySource[] {
		const copied = this.episodicMemorySources
			.filter((source) => merge.supersedes.includes(source.memoryEntryId))
			.flatMap((source): NewEpisodicMemoryEntrySource[] => {
				const provenance = provenanceOf(source);
				if (!provenance) return [];
				return [
					{
						memoryEntryId: replacementId,
						threadId: source.threadId,
						evidenceText: source.evidenceText,
						createdAt: merge.entry.createdAt ?? new Date(),
						...provenance,
					},
				];
			});
		const added = (merge.sources ?? []).map((source) => ({
			...source,
			memoryEntryId: replacementId,
		}));
		return [...copied, ...added];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async acquireEpisodicMemoryTaskLock(
		resourceId: string,
		opts: { ttlMs: number; holderId: string },
	): Promise<EpisodicMemoryTaskLockHandle | null> {
		const existing = this.episodicMemoryLocksByResource.get(resourceId);
		const now = Date.now();
		if (existing && existing.holderId !== opts.holderId && existing.heldUntil.getTime() > now) {
			return null;
		}
		const handle: EpisodicMemoryTaskLockHandle = {
			resourceId,
			holderId: opts.holderId,
			heldUntil: new Date(now + opts.ttlMs),
		};
		this.episodicMemoryLocksByResource.set(resourceId, handle);
		return { ...handle };
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async releaseEpisodicMemoryTaskLock(handle: EpisodicMemoryTaskLockHandle): Promise<void> {
		const current = this.episodicMemoryLocksByResource.get(handle.resourceId);
		if (current?.holderId === handle.holderId) {
			this.episodicMemoryLocksByResource.delete(handle.resourceId);
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
	hostMetadata?: Parameters<BuiltMemory['saveMessages']>[0]['hostMetadata'],
): Promise<void> {
	await memory.saveThread({ id: threadId, resourceId });
	await memory.saveMessages({
		threadId,
		resourceId,
		messages,
		...(hostMetadata && { hostMetadata }),
	});
}

function refreshEpisodicMemoryEntry(
	entry: EpisodicMemoryEntry,
	update: NewEpisodicMemoryEntry,
	now: Date,
): void {
	markLifecycleActive(entry);
	entry.lastSeenAt = update.lastSeenAt ?? now;
	entry.updatedAt = now;
	if (update.embedding !== undefined) entry.embedding = [...update.embedding];
	if (update.embeddingModel !== undefined) entry.embeddingModel = update.embeddingModel;
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

function cloneEpisodicMemoryCaptureCandidate(
	candidate: EpisodicMemoryCaptureCandidate,
): EpisodicMemoryCaptureCandidate {
	return {
		...candidate,
		createdAt: new Date(candidate.createdAt),
		updatedAt: new Date(candidate.updatedAt),
	};
}

function cloneEpisodicMemorySource(source: EpisodicMemoryEntrySource): EpisodicMemoryEntrySource {
	return { ...source, createdAt: new Date(source.createdAt) };
}

function provenanceOf(source: {
	observationId?: string | null;
	candidateId?: string | null;
}): { observationId: string } | { candidateId: string } | null {
	if (source.observationId) return { observationId: source.observationId };
	if (source.candidateId) return { candidateId: source.candidateId };
	return null;
}

/** The scope a turn writes to. A host-resolved scope wins over the resource. */
function episodicWriteScopeId(scope: Pick<EpisodicMemoryScope, 'resourceId' | 'episodic'>): string {
	return scope.episodic?.writeScopeId ?? scope.resourceId;
}

function episodicReadScopeIds(scope: EpisodicMemoryScope): string[] {
	return scope.episodic?.readScopeIds ?? [scope.resourceId];
}
