import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type { JSONSchema7 } from 'json-schema';
import type { z } from 'zod';

import type { FetchFn } from '../../runtime/model/model-factory';
import type { ScopedMemoryTaskEvent } from '../../runtime/memory/scoped-memory-task-runner';
import type { AgentEventBus } from '../../runtime/state/event-bus';
import type { RunStateManager } from '../../runtime/state/run-state';
import type { ModelCost } from '../../sdk/catalog';
import type { RuntimeSkillSource } from '../../skills/types';
import type { WorkspaceFilesystem } from '../../workspace';
import type {
	AgentMessage,
	BuiltFileStore,
	BuiltMemory,
	BuiltProviderTool,
	BuiltTelemetry,
	BuiltTool,
	CheckpointStore,
	EpisodicMemoryConfig,
	McpConnectionFailedEvent,
	ObservationalMemoryConfig,
	ObservationLogMemoryConfig,
	ReasoningLevel,
	ThinkingConfig,
	TitleGenerationConfig,
} from '../index';
import type {
	AgentPersistenceOptions,
	ModelConfig,
	NativeToolDeferralConfig,
	PromptCachingConfig,
	ToolDeferralConfig,
} from '../sdk/agent';

export interface VolatileInstructionsContext {
	persistence?: AgentPersistenceOptions;
}

/** A piece of guidance that a context note provider wants the model to see now. */
export interface ContextNote {
	/**
	 * Stable id. The runtime skips a note whose id is already in the visible
	 * conversation. Observation masking can hide a sent note, so it can be sent again.
	 */
	id: string;
	content: string;
}

export interface ContextNoteRequest {
	/** Messages the model sees, oldest first, before this model call. */
	messages: readonly AgentMessage[];
	/** Skills that are active for this run. */
	activeSkillIds: readonly string[];
	/** Ids of the notes that the conversation already contains. */
	sentNoteIds: ReadonlySet<string>;
	persistence?: AgentPersistenceOptions;
	abortSignal?: AbortSignal;
}

/**
 * Supplies notes before each model call. The runtime saves the notes in the
 * conversation as a `<system-reminder>`, after the earlier messages, so the
 * prompt cache stays valid. A provider failure skips its notes for that call.
 */
export type ContextNoteProvider = (request: ContextNoteRequest) => Promise<ContextNote[]>;

export type VolatileInstructionsProvider = (
	context: VolatileInstructionsContext,
) => Promise<string | undefined>;

export interface AgentRuntimeConfig {
	name: string;
	model: ModelConfig;
	/**
	 * Proxy-aware `fetch` used for all model and catalog calls in this runtime (main model,
	 * title generation and memory tasks). When unset, model construction falls back to the ambient
	 * HTTP_PROXY resolver.
	 */
	modelFetch?: FetchFn;
	/**
	 * Caller identity sent as the `x-n8n-function-id` header on this runtime's model
	 * calls. Side calls add a suffix (`.memory-observer`, `.title`). Unset: no header.
	 */
	functionId?: string;
	instructions: string;
	skillSource?: RuntimeSkillSource;
	instructionProviderOptions?: ProviderOptions;
	tools?: BuiltTool[];
	deferredTools?: BuiltTool[];
	workspaceFilesystem?: WorkspaceFilesystem;
	/** Starts preparing the agent's workspace. Called for tools with `requiresWorkspace`. */
	prewarmWorkspace?: () => void;
	nativeToolDeferral?: NativeToolDeferralConfig;
	/** How `deferredTools` reach the model. Default: provider tool search, else the tool catalog. */
	toolDeferral?: ToolDeferralConfig;
	/** Tool catalog mode: the tool group each deferred tool is listed under, by tool name. */
	deferredToolGroups?: Record<string, string>;
	/** Tool catalog mode: one line on what each tool group holds, by tool group. */
	deferredToolGroupDescriptions?: Record<string, string>;
	/** Tool catalog mode: the most tools a `find_tools` query returns. */
	toolSearch?: {
		topK?: number;
	};
	providerTools?: BuiltProviderTool[];
	memory?: BuiltMemory;
	/** Host store resolving file-reference content parts to bytes before LLM calls. */
	fileStore?: BuiltFileStore;
	observationLog?: ObservationLogMemoryConfig;
	observationalMemory?: ObservationalMemoryConfig;
	episodicMemory?: EpisodicMemoryConfig;
	structuredOutput?: z.ZodType | JSONSchema7;
	checkpointStorage?: 'memory' | CheckpointStore;
	thinking?: ThinkingConfig;
	reasoning?: ReasoningLevel;
	promptCaching?: PromptCachingConfig;
	eventBus?: AgentEventBus;
	/** Number of tool calls to execute concurrently. Default `1` (sequential). */
	toolCallConcurrency?: number;
	titleGeneration?: TitleGenerationConfig;
	telemetry?: BuiltTelemetry;
	/** Existing run id to continue, used when resuming a suspended run. */
	runId?: string;
	/**
	 * Pre-fetched model cost from the catalog. When provided, skips the per-run
	 * catalog fetch. Set once during Agent.build() and shared across per-run runtimes.
	 */
	modelCost?: ModelCost;
	/**
	 * Shared RunStateManager for suspend/resume. When provided, per-run runtimes
	 * use the same store so resume() can find state from a prior run.
	 */
	runState?: RunStateManager;
	/** Host callback for observational-memory background task lifecycle events. */
	onMemoryTaskEvent?: (event: ScopedMemoryTaskEvent) => void;
	/**
	 * Per-server MCP connection failures recorded during `Agent.build()` when
	 * resolving MCP tools. Tools from these servers were skipped; the runtime
	 * surfaces each as a non-fatal `warning` stream chunk at the start of a
	 * stream so hosts can tell the user an MCP server was unavailable without
	 * aborting the run.
	 */
	mcpConnectionFailures?: McpConnectionFailedEvent[];
	/** The runtime loads these host instructions before each model call but does not save them. */
	volatileInstructionsProvider?: VolatileInstructionsProvider;
	/** The runtime asks these providers for notes before each model call. */
	contextNoteProviders?: ContextNoteProvider[];
}
