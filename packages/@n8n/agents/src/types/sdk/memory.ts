import type { EmbeddingModel } from 'ai';

import type { AgentExecutionCounter, ModelConfig, SerializableAgentState } from './agent';
import type { AgentDbMessage } from './message';
import type {
	BuiltObservationLogStore,
	ObservationLogEntry,
	ObservationLogObserveFn,
	ObservationLogReflectFn,
	ObservationLogScope,
} from './observation-log';
import type { JSONObject } from '../utils/json';

/**
 * Serializable descriptor returned by BuiltMemory.describe().
 * Contains enough information to reconstruct the backend from a schema without exposing secrets.
 */
export interface MemoryDescriptor<TParams extends JSONObject = JSONObject> {
	/** Backend name (e.g. 'n8n', 'memory'). Used as key in memoryRegistry. */
	name: string;
	/** Constructor name (e.g. 'N8nMemory', 'InMemoryMemory'). Used to construct the backend. */
	constructorName: string;
	/** Non-secret, serializable connection parameters. CredentialConfig refs are safe to store. */
	connectionParams: TParams | null;
}

export interface Thread {
	id: string;
	resourceId: string; // The user/entity this thread belongs to
	title?: string;
	createdAt: Date;
	updatedAt: Date;
	metadata?: Record<string, unknown>;
}

export interface BuiltMemory {
	// --- Thread management ---
	getThread(threadId: string): Promise<Thread | null>;
	saveThread(thread: Omit<Thread, 'createdAt' | 'updatedAt'>): Promise<Thread>;
	deleteThread(threadId: string): Promise<void>;
	// --- Message persistence ---
	getMessages(
		threadId: string,
		opts?: {
			limit?: number; // last N messages
			before?: Date; // pagination cursor
			resourceId?: string; // per-resource isolation for shared threads
		},
	): Promise<AgentDbMessage[]>;
	/**
	 * Upsert messages into a thread by `id`: insert messages with a new `id`, and replace
	 * in place (preserving position) any whose `id` already exists. Implementations MUST be
	 * idempotent on `id` — the runtime persists a turn's input eagerly (so it survives an
	 * aborted or abandoned-HITL turn) and again at end of turn, so the same message id is
	 * saved more than once; an append-only backend would duplicate it. Each entry must be a
	 * full {@link AgentDbMessage}: stable string `id` and `createdAt` (the runtime sets both
	 * when messages pass through its internal list). Custom backends must persist and return
	 * those fields from `getMessages` so ordering, pagination (`before` / limit), and filters
	 * stay consistent; when both a column and serialized JSON exist, treat the stored sort
	 * key / column as authoritative for `createdAt` on load.
	 */
	saveMessages(args: {
		threadId: string;
		resourceId: string;
		messages: AgentDbMessage[];
	}): Promise<void>;
	deleteMessages(messageIds: string[]): Promise<void>;
	// --- Episodic memory (optional — runtime handles extraction and embeddings) ---
	episodic?: EpisodicMemoryMethods;
	// --- Lifecycle (optional) ---
	/** Close the connection pool / release resources. No-op for in-memory backends. */
	close?(): Promise<void>;
	/** Return a serializable descriptor of this backend for schema persistence. */
	describe(): MemoryDescriptor;
}

export type EpisodicMemoryStatus = 'active' | 'superseded' | 'dropped';

export interface EpisodicMemoryScope {
	resourceId: string;
}

export interface EpisodicMemoryEntry {
	id: string;
	resourceId: string;
	content: string;
	contentHash: string;
	status: EpisodicMemoryStatus;
	supersededBy: string | null;
	embedding?: number[];
	embeddingModel?: string;
	metadata?: JSONObject | null;
	createdAt: Date;
	updatedAt: Date;
	lastSeenAt: Date;
}

export type NewEpisodicMemoryEntry = Omit<
	EpisodicMemoryEntry,
	'id' | 'contentHash' | 'status' | 'supersededBy' | 'createdAt' | 'updatedAt' | 'lastSeenAt'
> & {
	contentHash?: string;
	createdAt?: Date;
	lastSeenAt?: Date;
};

export interface EpisodicMemoryEntrySource {
	id: string;
	memoryEntryId: string;
	observationId: string;
	threadId: string;
	evidenceText: string;
	createdAt: Date;
}

export type NewEpisodicMemoryEntrySource = Omit<EpisodicMemoryEntrySource, 'id' | 'createdAt'> & {
	createdAt?: Date;
};

export type NewEpisodicMemoryEntrySourceForEntry = Omit<
	NewEpisodicMemoryEntrySource,
	'memoryEntryId'
>;

export interface EpisodicMemoryCursor extends ObservationLogScope {
	lastIndexedObservationId: string;
	lastIndexedObservationCreatedAt: Date;
	updatedAt: Date;
}

export type NewEpisodicMemoryCursor = Omit<EpisodicMemoryCursor, 'updatedAt'> & {
	updatedAt?: Date;
};

export interface RetrievedEpisodicMemoryEntry extends EpisodicMemoryEntry {
	lexicalScore: number;
	vectorScore: number;
	rrfScore: number;
	finalScore: number;
}

export interface EpisodicMemorySearchOptions {
	topK?: number;
	queryEmbedding?: number[];
	includeStatuses?: EpisodicMemoryStatus[];
}

export interface EpisodicMemoryTaskLockHandle {
	resourceId: string;
	holderId: string;
	heldUntil: Date;
}

export interface EpisodicMemoryTaskLockMethods {
	acquire(
		resourceId: string,
		opts: { ttlMs: number; holderId: string },
	): Promise<EpisodicMemoryTaskLockHandle | null>;
	release(handle: EpisodicMemoryTaskLockHandle): Promise<void>;
}

export interface EpisodicMemoryMethods {
	saveEntryWithSources(
		entry: NewEpisodicMemoryEntry,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
	): Promise<EpisodicMemoryEntry | null>;
	searchEntries(
		scope: EpisodicMemoryScope,
		query: string,
		opts?: EpisodicMemorySearchOptions,
	): Promise<RetrievedEpisodicMemoryEntry[]>;
	getEntrySources(entryIds: string[]): Promise<EpisodicMemoryEntrySource[]>;
	applyReflection(
		scope: EpisodicMemoryScope,
		reflection: EpisodicMemoryReflectionApply,
	): Promise<EpisodicMemoryReflectionResult>;
	getCursor(scope: ObservationLogScope): Promise<EpisodicMemoryCursor | null>;
	setCursor(cursor: NewEpisodicMemoryCursor): Promise<void>;
	taskLock?: EpisodicMemoryTaskLockMethods;
}

export interface BuiltEpisodicMemoryStore {
	episodic: EpisodicMemoryMethods;
}

export interface EpisodicMemoryExtractionCandidate {
	content: string;
	sources: Array<{
		observationId: string;
		evidence: string;
	}>;
}

export interface EpisodicMemoryExtractorInput {
	scope: EpisodicMemoryScope;
	observationScope: ObservationLogScope;
	now: Date;
	observations: ObservationLogEntry[];
	renderedObservations: string;
	existingEntries: RetrievedEpisodicMemoryEntry[];
	executionCounter?: AgentExecutionCounter;
}

export interface EpisodicMemoryExtraction {
	entries: EpisodicMemoryExtractionCandidate[];
}

export type EpisodicMemoryExtractFn = (
	input: EpisodicMemoryExtractorInput,
) => Promise<EpisodicMemoryExtraction>;

export interface EpisodicMemoryReflectionMerge {
	supersedes: string[];
	content: string;
}

export interface EpisodicMemoryReflection {
	drop: string[];
	merge: EpisodicMemoryReflectionMerge[];
}

export interface EpisodicMemoryReflectorInput {
	scope: EpisodicMemoryScope;
	now: Date;
	seedEntryIds: string[];
	entries: RetrievedEpisodicMemoryEntry[];
	sources: EpisodicMemoryEntrySource[];
	executionCounter?: AgentExecutionCounter;
}

export type EpisodicMemoryReflectFn = (
	input: EpisodicMemoryReflectorInput,
) => Promise<EpisodicMemoryReflection>;

export interface EpisodicMemoryReflectionApplyMerge {
	supersedes: string[];
	entry: NewEpisodicMemoryEntry;
}

export interface EpisodicMemoryReflectionApply {
	drop: string[];
	merge: EpisodicMemoryReflectionApplyMerge[];
}

export interface EpisodicMemoryReflectionResult {
	droppedIds: string[];
	supersededIds: string[];
	inserted: EpisodicMemoryEntry[];
}

export interface EpisodicMemoryPrompts {
	extraction?: string;
	reflection?: string;
	recallToolInstruction?: string;
}

export interface EpisodicMemoryEmbeddingProviderOptions {
	apiKey?: string;
	baseURL?: string;
}

export interface EpisodicMemoryConfig {
	enabled?: boolean;
	topK?: number;
	maxEntriesPerRun?: number;
	embedder?: EmbeddingModel;
	embeddingModel?: string;
	embeddingProviderOptions?: string | EpisodicMemoryEmbeddingProviderOptions;
	extract?: EpisodicMemoryExtractFn;
	reflect?: EpisodicMemoryReflectFn;
	prompts?: EpisodicMemoryPrompts;
}

export interface TitleGenerationConfig {
	/** Model to use for title generation (e.g. 'anthropic/claude-haiku-4-5'). Falls back to the agent's own model. */
	model?: ModelConfig;
	/** Custom instructions for the title generation prompt. Replaces the defaults entirely. */
	instructions?: string;
	/** When true, title generation is awaited before returning the result. Default: false (fire-and-forget). */
	sync?: boolean;
}

export type ObservationCapableMemory = BuiltMemory & BuiltObservationLogStore;

export interface ObservationLogMemoryConfig {
	/** Maximum estimated tokens to render into the system prompt. */
	renderTokenBudget?: number;
}

export interface ObservationalMemoryConfig {
	/** Estimated tokens in unobserved transcript required before the Observer runs. */
	observerThresholdTokens?: number;
	/** Estimated active observation-log tokens required before the Reflector runs. */
	reflectorThresholdTokens?: number;
	/** Maximum estimated tokens to render into the system prompt. */
	renderTokenBudget?: number;
	/** Number of recent observations sent to the Observer as log-tail context. */
	observationLogTailLimit?: number;
	/** Lease duration for scoped background memory task locks. */
	lockTtlMs?: number;
	/** Policy callback that turns transcript deltas into markdown observations. */
	observe?: ObservationLogObserveFn;
	/** Policy callback that returns drop/merge instructions for the active observation log. */
	reflect?: ObservationLogReflectFn;
}

interface MemoryConfigBase {
	observationLog?: ObservationLogMemoryConfig;
	episodicMemory?: EpisodicMemoryConfig;
	titleGeneration?: TitleGenerationConfig;
}

/** Full memory configuration bundle passed from builder to runtime. */
export type MemoryConfig =
	| (MemoryConfigBase & {
			memory: BuiltMemory;
			observationalMemory?: undefined;
	  })
	| (MemoryConfigBase & {
			memory: ObservationCapableMemory;
			observationalMemory: ObservationalMemoryConfig;
	  });

/**
 * Interface for persisting agent execution snapshots (used for tool approval / human-in-the-loop).
 *
 * The execution engine implements this backed by its own database.
 * The SDK uses it internally to provide durable snapshot storage that
 * survives process restarts. Transient execution state (step results,
 * workflow state) is handled in-memory by the runtime — only snapshots
 * need external persistence.
 *
 * Snapshot data is opaque and JSON-serializable. The engine stores and
 * retrieves it without inspecting the contents.
 *
 * The `key` parameter is a composite identifier (e.g. `workflowName:runId`)
 * that uniquely identifies a snapshot. The engine should treat it as an
 * opaque string key.
 */
export interface CheckpointStore {
	/** Persist a snapshot. Overwrites any existing snapshot for the same key. */
	save(key: string, state: SerializableAgentState): Promise<void>;
	/**
	 * Load a snapshot by key. Returns `undefined` if not found.
	 *
	 * Multi-process implementations MUST guarantee that concurrent load+delete
	 * calls for the same key are atomic (only one caller receives the state).
	 * Use a compare-and-delete primitive (e.g. Redis SET NX, SQL SELECT FOR UPDATE)
	 * to prevent double-execution when two processes race to resume the same run.
	 * For single-process use the MemoryCheckpointStore in RunStateManager provides this guarantee.
	 */
	load(key: string): Promise<SerializableAgentState | undefined>;
	/** Delete a snapshot by key. */
	delete(key: string): Promise<void>;
}
