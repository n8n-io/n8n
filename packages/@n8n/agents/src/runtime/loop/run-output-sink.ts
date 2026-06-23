import type {
	LanguageModel,
	LanguageModelUsage,
	ModelMessage,
	Output,
	SystemModelMessage,
	TelemetrySettings,
	ToolCallRepairFunction,
	ToolSet,
} from 'ai';

import type { FinishReason, SerializableAgentState, TokenUsage } from '../../types';
import type { ExecutionOptions, RunOptions } from '../../types/sdk/agent';
import type { AgentMessage } from '../../types/sdk/message';
import type { JSONObject } from '../../types/utils/json';
import type { AgentMessageList } from '../model/message-list';
import type { ToolCallBatchResult, ToolCallSuspension } from '../tools/tool-call-executor';

type RunCallOptions = (RunOptions & ExecutionOptions) | undefined;

/** Normalized result of a single LLM turn, independent of generate vs stream. */
export interface ModelTurnResult {
	/** Raw AI SDK finish reason (used to detect the `tool-calls` continuation). */
	aiFinishReason: string;
	finishReason: FinishReason;
	usage: LanguageModelUsage | undefined;
	newMessages: AgentMessage[];
	toolCalls: Array<{
		toolCallId: string;
		toolName: string;
		input: unknown;
		providerExecuted?: boolean;
	}>;
	/** Resolved structured output, only when an output spec is set and the turn finished. */
	structuredOutput: unknown;
}

/** Per-iteration inputs for the LLM call, assembled by the shared loop. */
export interface ModelCallContext {
	model: LanguageModel;
	system: SystemModelMessage;
	messages: ModelMessage[];
	abortSignal: AbortSignal;
	hasTools: boolean;
	aiTools: ToolSet;
	providerOptions?: Record<string, JSONObject>;
	outputSpec?: ReturnType<typeof Output.object>;
	aiSdkOptions: {
		experimental_telemetry?: TelemetrySettings;
		experimental_repairToolCall?: ToolCallRepairFunction<NoInfer<ToolSet>>;
	};
}

/** Data needed to emit a terminal suspension result. */
export interface SuspendEmission {
	suspendRunId: string;
	list: AgentMessageList;
	usage: TokenUsage | undefined;
	suspensions: ToolCallSuspension[];
}

/** Data needed to emit a terminal completion result. */
export interface CompleteEmission {
	list: AgentMessageList;
	options: RunCallOptions;
	finishReason: FinishReason;
	usage: TokenUsage | undefined;
	structuredOutput: unknown;
}

/**
 * Runtime services the sinks call into for shared terminal concerns (cost,
 * memory persistence, title generation, telemetry flush, state). Implemented by
 * `AgentRuntime` and passed to each sink.
 */
export interface RunServices {
	readonly runId: string;
	readonly modelId: string;
	applyCost(usage: TokenUsage | undefined): TokenUsage | undefined;
	saveToMemory(list: AgentMessageList, options: RunCallOptions): Promise<void>;
	maybeGenerateTitle(list: AgentMessageList, options: RunCallOptions): Promise<void>;
	flushTelemetry(options: RunCallOptions): Promise<void>;
	cleanupRun(): Promise<void>;
	updateState(patch: Partial<SerializableAgentState>): void;
	emitAgentEnd(messages: AgentMessage[]): void;
	getState(): SerializableAgentState;
}

/**
 * Strategy that adapts the shared agentic loop to a concrete output channel:
 * `GenerateSink` accumulates a `GenerateResult`; `StreamSink` writes
 * `StreamChunk`s through the stream writer guard.
 */
export interface RunOutputSink<TResult> {
	/** Run one LLM turn. Streaming implementations also emit text/tool chunks here. */
	callModel(ctx: ModelCallContext): Promise<ModelTurnResult>;
	/**
	 * Report the run's cumulative token usage after each turn. Streaming
	 * implementations keep it so an aborted run can still emit a terminal
	 * finish chunk carrying the tokens consumed before the stop.
	 */
	reportUsage(usage: TokenUsage | undefined): void;
	/** Emit the results/errors of a completed tool-call batch. */
	emitToolBatch(batch: ToolCallBatchResult): Promise<void>;
	/** Produce the terminal result when the run suspends for HITL / suspend-resume. */
	finishSuspended(emission: SuspendEmission): Promise<TResult>;
	/** Produce the terminal result when the run completes normally. */
	finishComplete(emission: CompleteEmission): Promise<TResult>;
}
