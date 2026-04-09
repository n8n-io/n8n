import type { LanguageModelV3ToolChoice } from '@ai-sdk/provider';
import type {
  ModelMessage,
  ProviderOptions,
  SystemModelMessage,
} from '@ai-sdk/provider-utils';
import type { TimeoutConfiguration } from '../prompt/call-settings';
import type { ToolChoice } from '../types/language-model';
import type { LanguageModelUsage } from '../types/usage';
import type { Output } from './output';
import type { StepResult } from './step-result';
import type { StopCondition } from './stop-condition';
import type { TypedToolCall } from './tool-call';
import type { ToolSet } from './tool-set';

/**
 * Common model information used across callback events.
 */
export interface CallbackModelInfo {
  /** The provider identifier (e.g., 'openai', 'anthropic'). */
  readonly provider: string;
  /** The specific model identifier (e.g., 'gpt-4o'). */
  readonly modelId: string;
}

/**
 * Event passed to the `onStart` callback.
 *
 * Called when the generation operation begins, before any LLM calls.
 */
export interface OnStartEvent<
  TOOLS extends ToolSet = ToolSet,
  OUTPUT extends Output = Output,
  INCLUDE = { requestBody?: boolean; responseBody?: boolean },
> {
  /** The model being used for generation. */
  readonly model: CallbackModelInfo;

  /** The system message(s) provided to the model. */
  readonly system:
    | string
    | SystemModelMessage
    | Array<SystemModelMessage>
    | undefined;

  /** The prompt string or array of messages if using the prompt option. */
  readonly prompt: string | Array<ModelMessage> | undefined;

  /** The messages array if using the messages option. */
  readonly messages: Array<ModelMessage> | undefined;

  /** The tools available for this generation. */
  readonly tools: TOOLS | undefined;

  /** The tool choice strategy for this generation. */
  readonly toolChoice: ToolChoice<NoInfer<TOOLS>> | undefined;

  /** Limits which tools are available for the model to call. */
  readonly activeTools: Array<keyof TOOLS> | undefined;

  /** Maximum number of tokens to generate. */
  readonly maxOutputTokens: number | undefined;
  /** Sampling temperature for generation. */
  readonly temperature: number | undefined;
  /** Top-p (nucleus) sampling parameter. */
  readonly topP: number | undefined;
  /** Top-k sampling parameter. */
  readonly topK: number | undefined;
  /** Presence penalty for generation. */
  readonly presencePenalty: number | undefined;
  /** Frequency penalty for generation. */
  readonly frequencyPenalty: number | undefined;
  /** Sequences that will stop generation. */
  readonly stopSequences: string[] | undefined;
  /** Random seed for reproducible generation. */
  readonly seed: number | undefined;
  /** Maximum number of retries for failed requests. */
  readonly maxRetries: number;

  /**
   * Timeout configuration for the generation.
   * Can be a number (milliseconds) or an object with totalMs, stepMs, chunkMs.
   */
  readonly timeout: TimeoutConfiguration | undefined;

  /** Additional HTTP headers sent with the request. */
  readonly headers: Record<string, string | undefined> | undefined;

  /** Additional provider-specific options. */
  readonly providerOptions: ProviderOptions | undefined;

  /**
   * Condition(s) for stopping the generation.
   * When the condition is an array, any of the conditions can be met to stop.
   */
  readonly stopWhen:
    | StopCondition<TOOLS>
    | Array<StopCondition<TOOLS>>
    | undefined;

  /** The output specification for structured outputs, if configured. */
  readonly output: OUTPUT | undefined;

  /** Abort signal for cancelling the operation. */
  readonly abortSignal: AbortSignal | undefined;

  /**
   * Settings for controlling what data is included in step results.
   */
  readonly include: INCLUDE | undefined;

  /** Identifier from telemetry settings for grouping related operations. */
  readonly functionId: string | undefined;

  /** Additional metadata passed to the generation. */
  readonly metadata: Record<string, unknown> | undefined;

  /**
   * User-defined context object that flows through the entire generation lifecycle.
   * Can be accessed and modified in `prepareStep` and tool `execute` functions.
   */
  readonly experimental_context: unknown;
}

/**
 * Event passed to the `onStepStart` callback.
 *
 * Called when a step (LLM call) begins, before the provider is called.
 * Each step represents a single LLM invocation.
 */
export interface OnStepStartEvent<
  TOOLS extends ToolSet = ToolSet,
  OUTPUT extends Output = Output,
  INCLUDE = { requestBody?: boolean; responseBody?: boolean },
> {
  /** Zero-based index of the current step. */
  readonly stepNumber: number;

  /** The model being used for this step. */
  readonly model: CallbackModelInfo;

  /**
   * The system message for this step.
   */
  readonly system:
    | string
    | SystemModelMessage
    | Array<SystemModelMessage>
    | undefined;

  /**
   * The messages that will be sent to the model for this step.
   * Uses the user-facing `ModelMessage` format.
   * May be overridden by prepareStep.
   */
  readonly messages: Array<ModelMessage>;

  /** The tools available for this generation. */
  readonly tools: TOOLS | undefined;

  /** The tool choice configuration for this step. */
  readonly toolChoice: LanguageModelV3ToolChoice | undefined;

  /** Limits which tools are available for this step. */
  readonly activeTools: Array<keyof TOOLS> | undefined;

  /** Array of results from previous steps (empty for first step). */
  readonly steps: ReadonlyArray<StepResult<TOOLS>>;

  /** Additional provider-specific options for this step. */
  readonly providerOptions: ProviderOptions | undefined;

  /**
   * Timeout configuration for the generation.
   * Can be a number (milliseconds) or an object with totalMs, stepMs, chunkMs.
   */
  readonly timeout: TimeoutConfiguration | undefined;

  /** Additional HTTP headers sent with the request. */
  readonly headers: Record<string, string | undefined> | undefined;

  /**
   * Condition(s) for stopping the generation.
   * When the condition is an array, any of the conditions can be met to stop.
   */
  readonly stopWhen:
    | StopCondition<TOOLS>
    | Array<StopCondition<TOOLS>>
    | undefined;

  /** The output specification for structured outputs, if configured. */
  readonly output: OUTPUT | undefined;

  /** Abort signal for cancelling the operation. */
  readonly abortSignal: AbortSignal | undefined;

  /**
   * Settings for controlling what data is included in step results.
   */
  readonly include: INCLUDE | undefined;

  /** Identifier from telemetry settings for grouping related operations. */
  readonly functionId: string | undefined;

  /** Additional metadata from telemetry settings. */
  readonly metadata: Record<string, unknown> | undefined;

  /**
   * User-defined context object. May be updated from `prepareStep` between steps.
   */
  readonly experimental_context: unknown;
}

/**
 * Event passed to the `onToolCallStart` callback.
 *
 * Called when a tool execution begins, before the tool's `execute` function is invoked.
 */
export interface OnToolCallStartEvent<TOOLS extends ToolSet = ToolSet> {
  /** Zero-based index of the current step where this tool call occurs. */
  readonly stepNumber: number | undefined;

  /** The model being used for this step. */
  readonly model: CallbackModelInfo | undefined;

  /** The full tool call object. */
  readonly toolCall: TypedToolCall<TOOLS>;

  /** The conversation messages available at tool execution time. */
  readonly messages: Array<ModelMessage>;

  /** Signal for cancelling the operation. */
  readonly abortSignal: AbortSignal | undefined;

  /** Identifier from telemetry settings for grouping related operations. */
  readonly functionId: string | undefined;

  /** Additional metadata from telemetry settings. */
  readonly metadata: Record<string, unknown> | undefined;

  /** User-defined context object flowing through the generation. */
  readonly experimental_context: unknown;
}

/**
 * Event passed to the `onToolCallFinish` callback.
 *
 * Called when a tool execution completes, either successfully or with an error.
 * Uses a discriminated union on the `success` field.
 */
export type OnToolCallFinishEvent<TOOLS extends ToolSet = ToolSet> = {
  /** Zero-based index of the current step where this tool call occurred. */
  readonly stepNumber: number | undefined;

  /** The model being used for this step. */
  readonly model: CallbackModelInfo | undefined;

  /** The full tool call object. */
  readonly toolCall: TypedToolCall<TOOLS>;

  /** The conversation messages available at tool execution time. */
  readonly messages: Array<ModelMessage>;

  /** Signal for cancelling the operation. */
  readonly abortSignal: AbortSignal | undefined;

  /** Execution time of the tool call in milliseconds. */
  readonly durationMs: number;

  /** Identifier from telemetry settings for grouping related operations. */
  readonly functionId: string | undefined;

  /** Additional metadata from telemetry settings. */
  readonly metadata: Record<string, unknown> | undefined;

  /** User-defined context object flowing through the generation. */
  readonly experimental_context: unknown;
} & (
  | {
      /** Indicates the tool call succeeded. */
      readonly success: true;
      /** The tool's return value. */
      readonly output: unknown;
      readonly error?: never;
    }
  | {
      /** Indicates the tool call failed. */
      readonly success: false;
      readonly output?: never;
      /** The error that occurred during tool execution. */
      readonly error: unknown;
    }
);

/**
 * Event passed to the `onStepFinish` callback.
 *
 * Called when a step (LLM call) completes.
 * This is simply the StepResult for that step.
 */
export type OnStepFinishEvent<TOOLS extends ToolSet = ToolSet> =
  StepResult<TOOLS>;

/**
 * Event passed to the `onFinish` callback.
 *
 * Called when the entire generation completes (all steps finished).
 * Includes the final step's result along with aggregated data from all steps.
 */
export type OnFinishEvent<TOOLS extends ToolSet = ToolSet> =
  StepResult<TOOLS> & {
    /** Array containing results from all steps in the generation. */
    readonly steps: StepResult<TOOLS>[];

    /** Aggregated token usage across all steps. */
    readonly totalUsage: LanguageModelUsage;

    /**
     * The final state of the user-defined context object.
     *
     * Experimental (can break in patch releases).
     *
     * @default undefined
     */
    experimental_context: unknown;

    /** Identifier from telemetry settings for grouping related operations. */
    readonly functionId: string | undefined;

    /** Additional metadata from telemetry settings. */
    readonly metadata: Record<string, unknown> | undefined;
  };
