import type { z } from 'zod';

import type { ModelConfig, SerializableAgentState } from './agent';
import type { AgentDbMessage } from './message';
import type { BuiltObservationStore, ObservationalMemoryConfig } from './observation';
import type { JSONObject } from '../utils/json';

/**
 * Serializable descriptor returned by BuiltMemory.describe().
 * Contains enough information to reconstruct the backend from a schema without exposing secrets.
 */
export interface MemoryDescriptor<TParams extends JSONObject = JSONObject> {
	/** Backend name (e.g. 'postgres', 'sqlite', 'memory'). Used as key in memoryRegistry. */
	name: string;
	/** Constructor name (e.g. 'PostgresMemory', 'SqliteMemory'). Used to construct the backend. */
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
			/**
			 * Keyset cursor: return only messages strictly after `(createdAt, id) >
			 * (since.sinceCreatedAt, since.sinceMessageId)`, ordered ascending.
			 */
			since?: { sinceCreatedAt: Date; sinceMessageId: string };
		},
	): Promise<AgentDbMessage[]>;
	/**
	 * Append messages to a thread. Each entry must be a full {@link AgentDbMessage}:
	 * stable string `id` and `createdAt` (the runtime sets both when messages pass through
	 * its internal list). Custom backends must persist and return those fields from
	 * `getMessages` so ordering, pagination (`before` / limit), and filters stay consistent;
	 * when both a column and serialized JSON exist, treat the stored sort key / column as
	 * authoritative for `createdAt` on load.
	 */
	saveMessages(args: {
		threadId: string;
		resourceId: string;
		messages: AgentDbMessage[];
	}): Promise<void>;
	deleteMessages(messageIds: string[]): Promise<void>;
	// --- Semantic recall (optional) ---
	search?(
		query: string,
		opts?: {
			/** @default 'resource' */
			scope?: 'thread' | 'resource';
			threadId?: string;
			resourceId?: string;
			topK?: number;
			messageRange?: { before: number; after: number };
		},
	): Promise<AgentDbMessage[]>;
	// --- Working memory (optional) ---
	getWorkingMemory?(params: {
		threadId: string;
		resourceId: string;
		scope: 'resource' | 'thread';
	}): Promise<string | null>;
	saveWorkingMemory?(
		params: { threadId: string; resourceId: string; scope: 'resource' | 'thread' },
		content: string,
	): Promise<void>;
	// --- Tier 3: Vector operations (optional — runtime handles embeddings) ---
	saveEmbeddings?(opts: {
		scope?: 'thread' | 'resource';
		threadId?: string;
		resourceId?: string;
		entries: Array<{
			id: string;
			vector: number[];
			text: string;
			model: string;
		}>;
	}): Promise<void>;
	queryEmbeddings?(opts: {
		/** @default 'resource' */
		scope?: 'thread' | 'resource';
		threadId?: string;
		resourceId?: string;
		vector: number[];
		topK: number;
	}): Promise<Array<{ id: string; score: number }>>;
	// --- Lifecycle (optional) ---
	/** Close the connection pool / release resources. No-op for in-memory backends. */
	close?(): Promise<void>;
	/** Return a serializable descriptor of this backend for schema persistence. */
	describe(): MemoryDescriptor;
}

// --- Semantic Recall Config ---

export interface SemanticRecallConfig {
	/** @default 'resource' */
	scope?: 'thread' | 'resource';
	topK: number;
	messageRange?: { before: number; after: number };
	embedder?: string; // e.g. 'openai/text-embedding-3-small' — required for queryEmbeddings(), optional for search()-based backends
	/** API key for the embedder provider. Falls back to environment variables if not set. */
	apiKey?: string;
}

export interface TitleGenerationConfig {
	/** Model to use for title generation (e.g. 'anthropic/claude-haiku-4-5'). Falls back to the agent's own model. */
	model?: ModelConfig;
	/** Custom instructions for the title generation prompt. Replaces the defaults entirely. */
	instructions?: string;
	/** When true, title generation is awaited before returning the result. Default: false (fire-and-forget). */
	sync?: boolean;
}

export type ObservationCapableMemory = BuiltMemory & BuiltObservationStore;

interface MemoryConfigBase {
	lastMessages: number;
	workingMemory?: {
		template: string;
		structured: boolean;
		schema?: z.ZodObject<z.ZodRawShape>;
		scope: 'resource' | 'thread';
		/**
		 * Custom instruction text injected into the system prompt in place of the default.
		 * When omitted the runtime uses {@link WORKING_MEMORY_DEFAULT_INSTRUCTION}.
		 */
		instruction?: string;
	};
	semanticRecall?: SemanticRecallConfig;
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
