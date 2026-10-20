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
import type { AgentPersistenceOptions, ModelConfig, PromptCachingConfig } from '../sdk/agent';

export interface VolatileInstructionsContext {
	persistence?: AgentPersistenceOptions;
}

export type VolatileInstructionsProvider = (
	context: VolatileInstructionsContext,
) => Promise<string | undefined>;

/**
 * One model call's view of provider-reported billed cost. Responses are
 * attributed through the wrapped transport, so a window never counts another
 * call's response even when transports are shared.
 */
export interface BilledUsageWindow {
	/** Wrap a transport so responses passing through it are attributed to this window. */
	wrap(fetch: FetchFn | undefined): FetchFn;
	/** Total billed USD captured through this window; undefined when no response reported a cost. */
	settle(): number | undefined;
}

/**
 * Reports the billed USD a provider returned on a proxied response. The
 * runtime opens one window per model call on gateway-managed models and
 * prefers the settled amount over the catalog estimate.
 */
export interface BilledUsageCollector {
	startWindow(): BilledUsageWindow;
}

export interface AgentRuntimeConfig {
	name: string;
	model: ModelConfig;
	/**
	 * Proxy-aware `fetch` used for all model calls in this runtime (main model and
	 * title generation). When unset, model construction falls back to the ambient
	 * HTTP_PROXY resolver.
	 */
	modelFetch?: FetchFn;
	/**
	 * Provider-billed cost source for gateway-managed models. Each model call
	 * opens a window and stamps `usage.cost` with the settled amount; calls
	 * without a reported cost keep the catalog estimate.
	 */
	billedUsage?: BilledUsageCollector;
	instructions: string;
	skillSource?: RuntimeSkillSource;
	instructionProviderOptions?: ProviderOptions;
	tools?: BuiltTool[];
	deferredTools?: BuiltTool[];
	workspaceFilesystem?: WorkspaceFilesystem;
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
}
