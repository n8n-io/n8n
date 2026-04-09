import {
  getErrorMessage,
  LanguageModelV3,
  LanguageModelV3ToolChoice,
  SharedV3Warning,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import {
  createIdGenerator,
  DelayedPromise,
  IdGenerator,
  isAbortError,
  ModelMessage,
  ProviderOptions,
  SystemModelMessage,
  ToolApprovalResponse,
  ToolContent,
} from '@ai-sdk/provider-utils';
import { Span } from '@opentelemetry/api';
import { ServerResponse } from 'node:http';
import { NoOutputGeneratedError } from '../error';
import { Listener, notify } from '../util/notify';
import { logWarnings } from '../logger/log-warnings';
import { resolveLanguageModel } from '../model/resolve-model';
import {
  CallSettings,
  getChunkTimeoutMs,
  getStepTimeoutMs,
  getTotalTimeoutMs,
  TimeoutConfiguration,
} from '../prompt/call-settings';
import { convertToLanguageModelPrompt } from '../prompt/convert-to-language-model-prompt';
import { createToolModelOutput } from '../prompt/create-tool-model-output';
import { prepareCallSettings } from '../prompt/prepare-call-settings';
import { prepareToolsAndToolChoice } from '../prompt/prepare-tools-and-tool-choice';
import { Prompt } from '../prompt/prompt';
import { standardizePrompt } from '../prompt/standardize-prompt';
import { wrapGatewayError } from '../prompt/wrap-gateway-error';
import { assembleOperationName } from '../telemetry/assemble-operation-name';
import { getBaseTelemetryAttributes } from '../telemetry/get-base-telemetry-attributes';
import { getTracer } from '../telemetry/get-tracer';
import { recordSpan } from '../telemetry/record-span';
import { selectTelemetryAttributes } from '../telemetry/select-telemetry-attributes';
import { stringifyForTelemetry } from '../telemetry/stringify-for-telemetry';
import { getGlobalTelemetryIntegration } from '../telemetry/get-global-telemetry-integration';
import { TelemetrySettings } from '../telemetry/telemetry-settings';
import { createTextStreamResponse } from '../text-stream/create-text-stream-response';
import { pipeTextStreamToResponse } from '../text-stream/pipe-text-stream-to-response';
import { LanguageModelRequestMetadata } from '../types';
import {
  CallWarning,
  FinishReason,
  LanguageModel,
  ToolChoice,
} from '../types/language-model';
import { ProviderMetadata } from '../types/provider-metadata';
import {
  addLanguageModelUsage,
  createNullLanguageModelUsage,
  LanguageModelUsage,
} from '../types/usage';
import { UIMessage } from '../ui';
import { createUIMessageStreamResponse } from '../ui-message-stream/create-ui-message-stream-response';
import { getResponseUIMessageId } from '../ui-message-stream/get-response-ui-message-id';
import { handleUIMessageStreamFinish } from '../ui-message-stream/handle-ui-message-stream-finish';
import { pipeUIMessageStreamToResponse } from '../ui-message-stream/pipe-ui-message-stream-to-response';
import {
  InferUIMessageChunk,
  UIMessageChunk,
} from '../ui-message-stream/ui-message-chunks';
import { UIMessageStreamResponseInit } from '../ui-message-stream/ui-message-stream-response-init';
import { InferUIMessageData, InferUIMessageMetadata } from '../ui/ui-messages';
import { asArray } from '../util/as-array';
import {
  AsyncIterableStream,
  createAsyncIterableStream,
} from '../util/async-iterable-stream';
import { consumeStream } from '../util/consume-stream';
import { createStitchableStream } from '../util/create-stitchable-stream';
import { DownloadFunction } from '../util/download/download-function';
import { mergeAbortSignals } from '../util/merge-abort-signals';
import { mergeObjects } from '../util/merge-objects';
import { now as originalNow } from '../util/now';
import { prepareRetries } from '../util/prepare-retries';
import { collectToolApprovals } from './collect-tool-approvals';
import type {
  OnFinishEvent,
  OnStartEvent,
  OnStepFinishEvent,
  OnStepStartEvent,
  OnToolCallFinishEvent,
  OnToolCallStartEvent,
} from './callback-events';
import { ContentPart } from './content-part';
import { executeToolCall } from './execute-tool-call';
import { Output, text } from './output';
import {
  InferCompleteOutput,
  InferElementOutput,
  InferPartialOutput,
} from './output-utils';
import { PrepareStepFunction } from './prepare-step';
import { ResponseMessage } from './response-message';
import {
  runToolsTransformation,
  SingleRequestTextStreamPart,
} from './run-tools-transformation';
import { DefaultStepResult, StepResult } from './step-result';
import {
  isStopConditionMet,
  stepCountIs,
  StopCondition,
} from './stop-condition';
import {
  ConsumeStreamOptions,
  StreamTextResult,
  TextStreamPart,
  UIMessageStreamOptions,
} from './stream-text-result';
import { toResponseMessages } from './to-response-messages';
import { TypedToolCall } from './tool-call';
import { ToolCallRepairFunction } from './tool-call-repair-function';
import { ToolOutput } from './tool-output';
import { StaticToolOutputDenied } from './tool-output-denied';
import { ToolSet } from './tool-set';

const originalGenerateId = createIdGenerator({
  prefix: 'aitxt',
  size: 24,
});

/**
 * A transformation that is applied to the stream.
 *
 * @param stopStream - A function that stops the source stream.
 * @param tools - The tools that are accessible to and can be called by the model. The model needs to support calling tools.
 */
export type StreamTextTransform<TOOLS extends ToolSet> = (options: {
  tools: TOOLS; // for type inference
  stopStream: () => void;
}) => TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>;

/**
 * Callback that is set using the `onError` option.
 *
 * @param event - The event that is passed to the callback.
 */
export type StreamTextOnErrorCallback = (event: {
  error: unknown;
}) => PromiseLike<void> | void;

/**
 * Callback that is set using the `onStepFinish` option.
 *
 * @param stepResult - The result of the step.
 */
export type StreamTextOnStepFinishCallback<TOOLS extends ToolSet> = (
  event: OnStepFinishEvent<TOOLS>,
) => PromiseLike<void> | void;

/**
 * Callback that is set using the `onChunk` option.
 *
 * @param event - The event that is passed to the callback.
 */
export type StreamTextOnChunkCallback<TOOLS extends ToolSet> = (event: {
  chunk: Extract<
    TextStreamPart<TOOLS>,
    {
      type:
        | 'text-delta'
        | 'reasoning-delta'
        | 'source'
        | 'tool-call'
        | 'tool-input-start'
        | 'tool-input-delta'
        | 'tool-result'
        | 'raw';
    }
  >;
}) => PromiseLike<void> | void;

/**
 * Callback that is set using the `onFinish` option.
 *
 * @param event - The event that is passed to the callback.
 */
export type StreamTextOnFinishCallback<TOOLS extends ToolSet> = (
  event: OnFinishEvent<TOOLS>,
) => PromiseLike<void> | void;

/**
 * Callback that is set using the `onAbort` option.
 *
 * @param event - The event that is passed to the callback.
 */
export type StreamTextOnAbortCallback<TOOLS extends ToolSet> = (event: {
  /**
   * Details for all previously finished steps.
   */
  readonly steps: StepResult<TOOLS>[];
}) => PromiseLike<void> | void;

/**
 * Include settings for streamText (requestBody only).
 */
type StreamTextIncludeSettings = { requestBody?: boolean };

/**
 * Callback that is set using the `experimental_onStart` option.
 *
 * Called when the streamText operation begins, before any LLM calls.
 * Use this callback for logging, analytics, or initializing state at the
 * start of a generation.
 *
 * @param event - The event object containing generation configuration.
 */
export type StreamTextOnStartCallback<
  TOOLS extends ToolSet = ToolSet,
  OUTPUT extends Output = Output,
> = (
  event: OnStartEvent<TOOLS, OUTPUT, StreamTextIncludeSettings>,
) => PromiseLike<void> | void;

/**
 * Callback that is set using the `experimental_onStepStart` option.
 *
 * Called when a step (LLM call) begins, before the provider is called.
 * Each step represents a single LLM invocation. Multiple steps occur when
 * using tool calls (the model may be called multiple times in a loop).
 *
 * @param event - The event object containing step configuration.
 */
export type StreamTextOnStepStartCallback<
  TOOLS extends ToolSet = ToolSet,
  OUTPUT extends Output = Output,
> = (
  event: OnStepStartEvent<TOOLS, OUTPUT, StreamTextIncludeSettings>,
) => PromiseLike<void> | void;

export type StreamTextOnToolCallStartCallback<TOOLS extends ToolSet = ToolSet> =
  (event: OnToolCallStartEvent<TOOLS>) => PromiseLike<void> | void;

export type StreamTextOnToolCallFinishCallback<
  TOOLS extends ToolSet = ToolSet,
> = (event: OnToolCallFinishEvent<TOOLS>) => PromiseLike<void> | void;

/**
 * Generate a text and call tools for a given prompt using a language model.
 *
 * This function streams the output. If you do not want to stream the output, use `generateText` instead.
 *
 * @param model - The language model to use.
 * @param tools - Tools that are accessible to and can be called by the model. The model needs to support calling tools.
 *
 * @param system - A system message that will be part of the prompt.
 * @param prompt - A simple text prompt. You can either use `prompt` or `messages` but not both.
 * @param messages - A list of messages. You can either use `prompt` or `messages` but not both.
 *
 * @param maxOutputTokens - Maximum number of tokens to generate.
 * @param temperature - Temperature setting.
 * The value is passed through to the provider. The range depends on the provider and model.
 * It is recommended to set either `temperature` or `topP`, but not both.
 * @param topP - Nucleus sampling.
 * The value is passed through to the provider. The range depends on the provider and model.
 * It is recommended to set either `temperature` or `topP`, but not both.
 * @param topK - Only sample from the top K options for each subsequent token.
 * Used to remove "long tail" low probability responses.
 * Recommended for advanced use cases only. You usually only need to use temperature.
 * @param presencePenalty - Presence penalty setting.
 * It affects the likelihood of the model to repeat information that is already in the prompt.
 * The value is passed through to the provider. The range depends on the provider and model.
 * @param frequencyPenalty - Frequency penalty setting.
 * It affects the likelihood of the model to repeatedly use the same words or phrases.
 * The value is passed through to the provider. The range depends on the provider and model.
 * @param stopSequences - Stop sequences.
 * If set, the model will stop generating text when one of the stop sequences is generated.
 * @param seed - The seed (integer) to use for random sampling.
 * If set and supported by the model, calls will generate deterministic results.
 *
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param timeout - An optional timeout in milliseconds. The call will be aborted if it takes longer than the specified timeout.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @param onChunk - Callback that is called for each chunk of the stream. The stream processing will pause until the callback promise is resolved.
 * @param onError - Callback that is called when an error occurs during streaming. You can use it to log errors.
 * @param onStepFinish - Callback that is called when each step (LLM call) is finished, including intermediate steps.
 * @param onFinish - Callback that is called when all steps are finished and the response is complete.
 *
 * @returns
 * A result object for accessing different stream types and additional information.
 */
export function streamText<
  TOOLS extends ToolSet,
  OUTPUT extends Output = Output<string, string, never>,
>({
  model,
  tools,
  toolChoice,
  system,
  prompt,
  messages,
  maxRetries,
  abortSignal,
  timeout,
  headers,
  stopWhen = stepCountIs(1),
  experimental_output,
  output = experimental_output,
  experimental_telemetry: telemetry,
  prepareStep,
  providerOptions,
  experimental_activeTools,
  activeTools = experimental_activeTools,
  experimental_repairToolCall: repairToolCall,
  experimental_transform: transform,
  experimental_download: download,
  includeRawChunks = false,
  onChunk,
  onError = ({ error }) => {
    console.error(error);
  },
  onFinish,
  onAbort,
  onStepFinish,
  experimental_onStart: onStart,
  experimental_onStepStart: onStepStart,
  experimental_onToolCallStart: onToolCallStart,
  experimental_onToolCallFinish: onToolCallFinish,
  experimental_context,
  experimental_include: include,
  _internal: { now = originalNow, generateId = originalGenerateId } = {},
  ...settings
}: CallSettings &
  Prompt & {
    /**
     * The language model to use.
     */
    model: LanguageModel;

    /**
     * The tools that the model can call. The model needs to support calling tools.
     */
    tools?: TOOLS;

    /**
     * The tool choice strategy. Default: 'auto'.
     */
    toolChoice?: ToolChoice<TOOLS>;

    /**
     * Condition for stopping the generation when there are tool results in the last step.
     * When the condition is an array, any of the conditions can be met to stop the generation.
     *
     * @default stepCountIs(1)
     */
    stopWhen?:
      | StopCondition<NoInfer<TOOLS>>
      | Array<StopCondition<NoInfer<TOOLS>>>;

    /**
     * Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;

    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;

    /**
     * @deprecated Use `activeTools` instead.
     */
    experimental_activeTools?: Array<keyof NoInfer<TOOLS>>;

    /**
     * Limits the tools that are available for the model to call without
     * changing the tool call and result types in the result.
     */
    activeTools?: Array<keyof NoInfer<TOOLS>>;

    /**
     * Optional specification for parsing structured outputs from the LLM response.
     */
    output?: OUTPUT;

    /**
     * Optional specification for parsing structured outputs from the LLM response.
     *
     * @deprecated Use `output` instead.
     */
    experimental_output?: OUTPUT;

    /**
     * Optional function that you can use to provide different settings for a step.
     *
     * @param options - The options for the step.
     * @param options.steps - The steps that have been executed so far.
     * @param options.stepNumber - The number of the step that is being executed.
     * @param options.model - The model that is being used.
     *
     * @returns An object that contains the settings for the step.
     * If you return undefined (or for undefined settings), the settings from the outer level will be used.
     */
    prepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;

    /**
     * A function that attempts to repair a tool call that failed to parse.
     */
    experimental_repairToolCall?: ToolCallRepairFunction<TOOLS>;

    /**
     * Optional stream transformations.
     * They are applied in the order they are provided.
     * The stream transformations must maintain the stream structure for streamText to work correctly.
     */
    experimental_transform?:
      | StreamTextTransform<TOOLS>
      | Array<StreamTextTransform<TOOLS>>;

    /**
     * Custom download function to use for URLs.
     *
     * By default, files are downloaded if the model does not support the URL for the given media type.
     */
    experimental_download?: DownloadFunction | undefined;

    /**
     * Whether to include raw chunks from the provider in the stream.
     * When enabled, you will receive raw chunks with type 'raw' that contain the unprocessed data from the provider.
     * This allows access to cutting-edge provider features not yet wrapped by the AI SDK.
     * Defaults to false.
     */
    includeRawChunks?: boolean;

    /**
     * Callback that is called for each chunk of the stream.
     * The stream processing will pause until the callback promise is resolved.
     */
    onChunk?: StreamTextOnChunkCallback<TOOLS>;

    /**
     * Callback that is invoked when an error occurs during streaming.
     * You can use it to log errors.
     * The stream processing will pause until the callback promise is resolved.
     */
    onError?: StreamTextOnErrorCallback;

    /**
     * Callback that is called when the LLM response and all request tool executions
     * (for tools that have an `execute` function) are finished.
     *
     * The usage is the combined usage of all steps.
     */
    onFinish?: StreamTextOnFinishCallback<TOOLS>;

    onAbort?: StreamTextOnAbortCallback<TOOLS>;

    /**
     * Callback that is called when each step (LLM call) is finished, including intermediate steps.
     */
    onStepFinish?: StreamTextOnStepFinishCallback<TOOLS>;

    /**
     * Callback that is called when the streamText operation begins,
     * before any LLM calls are made.
     */
    experimental_onStart?: StreamTextOnStartCallback<NoInfer<TOOLS>, OUTPUT>;

    /**
     * Callback that is called when a step (LLM call) begins,
     * before the provider is called.
     */
    experimental_onStepStart?: StreamTextOnStepStartCallback<
      NoInfer<TOOLS>,
      OUTPUT
    >;

    /**
     * Callback that is called right before a tool's execute function runs.
     */
    experimental_onToolCallStart?: StreamTextOnToolCallStartCallback<
      NoInfer<TOOLS>
    >;

    /**
     * Callback that is called right after a tool's execute function completes (or errors).
     */
    experimental_onToolCallFinish?: StreamTextOnToolCallFinishCallback<
      NoInfer<TOOLS>
    >;

    /**
     * Context that is passed into tool execution.
     *
     * Experimental (can break in patch releases).
     *
     * @default undefined
     */
    experimental_context?: unknown;

    /**
     * Settings for controlling what data is included in step results.
     * Disabling inclusion can help reduce memory usage when processing
     * large payloads like images.
     *
     * By default, all data is included for backwards compatibility.
     */
    experimental_include?: {
      /**
       * Whether to retain the request body in step results.
       * The request body can be large when sending images or files.
       * @default true
       */
      requestBody?: boolean;
    };

    /**
     * Internal. For test use only. May change without notice.
     */
    _internal?: {
      now?: () => number;
      generateId?: IdGenerator;
    };
  }): StreamTextResult<TOOLS, OUTPUT> {
  const totalTimeoutMs = getTotalTimeoutMs(timeout);
  const stepTimeoutMs = getStepTimeoutMs(timeout);
  const chunkTimeoutMs = getChunkTimeoutMs(timeout);
  const stepAbortController =
    stepTimeoutMs != null ? new AbortController() : undefined;
  const chunkAbortController =
    chunkTimeoutMs != null ? new AbortController() : undefined;
  return new DefaultStreamTextResult<TOOLS, OUTPUT>({
    model: resolveLanguageModel(model),
    telemetry,
    headers,
    settings,
    maxRetries,
    abortSignal: mergeAbortSignals(
      abortSignal,
      totalTimeoutMs != null ? AbortSignal.timeout(totalTimeoutMs) : undefined,
      stepAbortController?.signal,
      chunkAbortController?.signal,
    ),
    stepTimeoutMs,
    stepAbortController,
    chunkTimeoutMs,
    chunkAbortController,
    system,
    prompt,
    messages,
    tools,
    toolChoice,
    transforms: asArray(transform),
    activeTools,
    repairToolCall,
    stopConditions: asArray(stopWhen),
    output,
    providerOptions,
    prepareStep,
    includeRawChunks,
    timeout,
    stopWhen,
    originalAbortSignal: abortSignal,
    onChunk,
    onError,
    onFinish,
    onAbort,
    onStepFinish,
    onStart,
    onStepStart,
    onToolCallStart,
    onToolCallFinish,
    now,
    generateId,
    experimental_context,
    download,
    include,
  });
}

export type EnrichedStreamPart<TOOLS extends ToolSet, PARTIAL_OUTPUT> = {
  part: TextStreamPart<TOOLS>;
  partialOutput: PARTIAL_OUTPUT | undefined;
};

function createOutputTransformStream<
  TOOLS extends ToolSet,
  OUTPUT extends Output,
>(
  output: OUTPUT,
): TransformStream<
  TextStreamPart<TOOLS>,
  EnrichedStreamPart<TOOLS, InferPartialOutput<OUTPUT>>
> {
  let firstTextChunkId: string | undefined = undefined;
  let text = '';
  let textChunk = '';
  let textProviderMetadata: ProviderMetadata | undefined = undefined;
  let lastPublishedJson = '';

  function publishTextChunk({
    controller,
    partialOutput = undefined,
  }: {
    controller: TransformStreamDefaultController<
      EnrichedStreamPart<TOOLS, InferPartialOutput<OUTPUT>>
    >;
    partialOutput?: InferPartialOutput<OUTPUT>;
  }) {
    controller.enqueue({
      part: {
        type: 'text-delta',
        id: firstTextChunkId!,
        text: textChunk,
        providerMetadata: textProviderMetadata,
      },
      partialOutput,
    });
    textChunk = '';
  }

  return new TransformStream<
    TextStreamPart<TOOLS>,
    EnrichedStreamPart<TOOLS, InferPartialOutput<OUTPUT>>
  >({
    async transform(chunk, controller) {
      // ensure that we publish the last text chunk before the step finish:
      if (chunk.type === 'finish-step' && textChunk.length > 0) {
        publishTextChunk({ controller });
      }

      if (
        chunk.type !== 'text-delta' &&
        chunk.type !== 'text-start' &&
        chunk.type !== 'text-end'
      ) {
        controller.enqueue({ part: chunk, partialOutput: undefined });
        return;
      }

      // we have to pick a text chunk which contains the json text
      // since we are streaming, we have to pick the first text chunk
      if (firstTextChunkId == null) {
        firstTextChunkId = chunk.id;
      } else if (chunk.id !== firstTextChunkId) {
        controller.enqueue({ part: chunk, partialOutput: undefined });
        return;
      }

      if (chunk.type === 'text-start') {
        controller.enqueue({ part: chunk, partialOutput: undefined });
        return;
      }

      if (chunk.type === 'text-end') {
        if (textChunk.length > 0) {
          publishTextChunk({ controller });
        }
        controller.enqueue({ part: chunk, partialOutput: undefined });
        return;
      }

      text += chunk.text;
      textChunk += chunk.text;
      textProviderMetadata = chunk.providerMetadata ?? textProviderMetadata;

      // only publish if partial json can be parsed:
      const result = await output.parsePartialOutput({ text });

      // null should be allowed (valid JSON value) but undefined should not:
      if (result !== undefined) {
        // only send new json if it has changed:
        const currentJson = JSON.stringify(result.partial);
        if (currentJson !== lastPublishedJson) {
          publishTextChunk({ controller, partialOutput: result.partial });
          lastPublishedJson = currentJson;
        }
      }
    },
  });
}

class DefaultStreamTextResult<
  TOOLS extends ToolSet,
  OUTPUT extends Output,
> implements StreamTextResult<TOOLS, OUTPUT> {
  private readonly _totalUsage = new DelayedPromise<
    Awaited<StreamTextResult<TOOLS, OUTPUT>['usage']>
  >();
  private readonly _finishReason = new DelayedPromise<
    Awaited<StreamTextResult<TOOLS, OUTPUT>['finishReason']>
  >();
  private readonly _rawFinishReason = new DelayedPromise<
    Awaited<StreamTextResult<TOOLS, OUTPUT>['rawFinishReason']>
  >();
  private readonly _steps = new DelayedPromise<
    Awaited<StreamTextResult<TOOLS, OUTPUT>['steps']>
  >();

  private readonly addStream: (
    stream: ReadableStream<TextStreamPart<TOOLS>>,
  ) => void;

  private readonly closeStream: () => void;

  private baseStream: ReadableStream<
    EnrichedStreamPart<TOOLS, InferPartialOutput<OUTPUT>>
  >;

  private outputSpecification: OUTPUT | undefined;

  private includeRawChunks: boolean;

  private tools: TOOLS | undefined;

  constructor({
    model,
    telemetry,
    headers,
    settings,
    maxRetries: maxRetriesArg,
    abortSignal,
    stepTimeoutMs,
    stepAbortController,
    chunkTimeoutMs,
    chunkAbortController,
    system,
    prompt,
    messages,
    tools,
    toolChoice,
    transforms,
    activeTools,
    repairToolCall,
    stopConditions,
    output,
    providerOptions,
    prepareStep,
    includeRawChunks,
    now,
    generateId,
    timeout,
    stopWhen,
    originalAbortSignal,
    onChunk,
    onError,
    onFinish,
    onAbort,
    onStepFinish,
    onStart,
    onStepStart,
    onToolCallStart,
    onToolCallFinish,
    experimental_context,
    download,
    include,
  }: {
    model: LanguageModelV3;
    telemetry: TelemetrySettings | undefined;
    headers: Record<string, string | undefined> | undefined;
    settings: Omit<CallSettings, 'abortSignal' | 'headers'>;
    maxRetries: number | undefined;
    abortSignal: AbortSignal | undefined;
    stepTimeoutMs: number | undefined;
    stepAbortController: AbortController | undefined;
    chunkTimeoutMs: number | undefined;
    chunkAbortController: AbortController | undefined;
    system: Prompt['system'];
    prompt: Prompt['prompt'];
    messages: Prompt['messages'];
    tools: TOOLS | undefined;
    toolChoice: ToolChoice<TOOLS> | undefined;
    transforms: Array<StreamTextTransform<TOOLS>>;
    activeTools: Array<keyof TOOLS> | undefined;
    repairToolCall: ToolCallRepairFunction<TOOLS> | undefined;
    stopConditions: Array<StopCondition<NoInfer<TOOLS>>>;
    output: OUTPUT | undefined;
    providerOptions: ProviderOptions | undefined;
    prepareStep: PrepareStepFunction<NoInfer<TOOLS>> | undefined;
    includeRawChunks: boolean;
    now: () => number;
    generateId: () => string;
    timeout: TimeoutConfiguration | undefined;
    stopWhen:
      | StopCondition<NoInfer<TOOLS>>
      | Array<StopCondition<NoInfer<TOOLS>>>
      | undefined;
    originalAbortSignal: AbortSignal | undefined;
    experimental_context: unknown;
    download: DownloadFunction | undefined;
    include: { requestBody?: boolean } | undefined;

    // callbacks:
    onChunk: undefined | StreamTextOnChunkCallback<TOOLS>;
    onError: StreamTextOnErrorCallback;
    onFinish: undefined | StreamTextOnFinishCallback<TOOLS>;
    onAbort: undefined | StreamTextOnAbortCallback<TOOLS>;
    onStepFinish: undefined | StreamTextOnStepFinishCallback<TOOLS>;
    onStart: undefined | StreamTextOnStartCallback<TOOLS, OUTPUT>;
    onStepStart: undefined | StreamTextOnStepStartCallback<TOOLS, OUTPUT>;
    onToolCallStart: undefined | StreamTextOnToolCallStartCallback<TOOLS>;
    onToolCallFinish: undefined | StreamTextOnToolCallFinishCallback<TOOLS>;
  }) {
    this.outputSpecification = output;
    this.includeRawChunks = includeRawChunks;
    this.tools = tools;

    const createGlobalTelemetry = getGlobalTelemetryIntegration<
      TOOLS,
      OUTPUT
    >();
    const globalTelemetry = createGlobalTelemetry(telemetry?.integrations);

    // promise to ensure that the step has been fully processed by the event processor
    // before a new step is started. This is required because the continuation condition
    // needs the updated steps to determine if another step is needed.
    let stepFinish!: DelayedPromise<void>;

    let recordedContent: Array<ContentPart<TOOLS>> = [];
    const recordedResponseMessages: Array<ResponseMessage> = [];
    let recordedFinishReason: FinishReason | undefined = undefined;
    let recordedRawFinishReason: string | undefined = undefined;
    let recordedTotalUsage: LanguageModelUsage | undefined = undefined;
    let recordedRequest: LanguageModelRequestMetadata = {};
    let recordedWarnings: Array<CallWarning> = [];
    const recordedSteps: StepResult<TOOLS>[] = [];

    // Track provider-executed tool calls that support deferred results
    // (e.g., code_execution in programmatic tool calling scenarios).
    // These tools may not return their results in the same turn as their call.
    const pendingDeferredToolCalls = new Map<string, { toolName: string }>();

    let rootSpan!: Span;

    let activeTextContent: Record<
      string,
      {
        type: 'text';
        text: string;
        providerMetadata: ProviderMetadata | undefined;
      }
    > = {};

    let activeReasoningContent: Record<
      string,
      {
        type: 'reasoning';
        text: string;
        providerMetadata: ProviderMetadata | undefined;
      }
    > = {};

    const eventProcessor = new TransformStream<
      EnrichedStreamPart<TOOLS, InferPartialOutput<OUTPUT>>,
      EnrichedStreamPart<TOOLS, InferPartialOutput<OUTPUT>>
    >({
      async transform(chunk, controller) {
        controller.enqueue(chunk); // forward the chunk to the next stream

        const { part } = chunk;

        if (
          part.type === 'text-delta' ||
          part.type === 'reasoning-delta' ||
          part.type === 'source' ||
          part.type === 'tool-call' ||
          part.type === 'tool-result' ||
          part.type === 'tool-input-start' ||
          part.type === 'tool-input-delta' ||
          part.type === 'raw'
        ) {
          await onChunk?.({ chunk: part });
        }

        if (part.type === 'error') {
          await onError({ error: wrapGatewayError(part.error) });
        }

        if (part.type === 'text-start') {
          activeTextContent[part.id] = {
            type: 'text',
            text: '',
            providerMetadata: part.providerMetadata,
          };

          recordedContent.push(activeTextContent[part.id]);
        }

        if (part.type === 'text-delta') {
          const activeText = activeTextContent[part.id];

          if (activeText == null) {
            controller.enqueue({
              part: {
                type: 'error',
                error: `text part ${part.id} not found`,
              },
              partialOutput: undefined,
            });
            return;
          }

          activeText.text += part.text;
          activeText.providerMetadata =
            part.providerMetadata ?? activeText.providerMetadata;
        }

        if (part.type === 'text-end') {
          const activeText = activeTextContent[part.id];

          if (activeText == null) {
            controller.enqueue({
              part: {
                type: 'error',
                error: `text part ${part.id} not found`,
              },
              partialOutput: undefined,
            });
            return;
          }

          activeText.providerMetadata =
            part.providerMetadata ?? activeText.providerMetadata;

          delete activeTextContent[part.id];
        }

        if (part.type === 'reasoning-start') {
          activeReasoningContent[part.id] = {
            type: 'reasoning',
            text: '',
            providerMetadata: part.providerMetadata,
          };

          recordedContent.push(activeReasoningContent[part.id]);
        }

        if (part.type === 'reasoning-delta') {
          const activeReasoning = activeReasoningContent[part.id];

          if (activeReasoning == null) {
            controller.enqueue({
              part: {
                type: 'error',
                error: `reasoning part ${part.id} not found`,
              },
              partialOutput: undefined,
            });
            return;
          }

          activeReasoning.text += part.text;
          activeReasoning.providerMetadata =
            part.providerMetadata ?? activeReasoning.providerMetadata;
        }

        if (part.type === 'reasoning-end') {
          const activeReasoning = activeReasoningContent[part.id];

          if (activeReasoning == null) {
            controller.enqueue({
              part: {
                type: 'error',
                error: `reasoning part ${part.id} not found`,
              },
              partialOutput: undefined,
            });
            return;
          }

          activeReasoning.providerMetadata =
            part.providerMetadata ?? activeReasoning.providerMetadata;

          delete activeReasoningContent[part.id];
        }

        if (part.type === 'file') {
          recordedContent.push({
            type: 'file',
            file: part.file,
            ...(part.providerMetadata != null
              ? { providerMetadata: part.providerMetadata }
              : {}),
          });
        }

        if (part.type === 'source') {
          recordedContent.push(part);
        }

        if (part.type === 'tool-call') {
          recordedContent.push(part);
        }

        if (part.type === 'tool-result' && !part.preliminary) {
          recordedContent.push(part);
        }

        if (part.type === 'tool-approval-request') {
          recordedContent.push(part);
        }

        if (part.type === 'tool-error') {
          recordedContent.push(part);
        }

        if (part.type === 'start-step') {
          // reset the recorded data when a new step starts:
          recordedContent = [];
          activeReasoningContent = {};
          activeTextContent = {};

          recordedRequest = part.request;
          recordedWarnings = part.warnings;
        }

        if (part.type === 'finish-step') {
          const stepMessages = await toResponseMessages({
            content: recordedContent,
            tools,
          });

          // Add step information (after response messages are updated):
          const currentStepResult: StepResult<TOOLS> = new DefaultStepResult({
            stepNumber: recordedSteps.length,
            model: modelInfo,
            ...callbackTelemetryProps,
            experimental_context,
            content: recordedContent,
            finishReason: part.finishReason,
            rawFinishReason: part.rawFinishReason,
            usage: part.usage,
            warnings: recordedWarnings,
            request: recordedRequest,
            response: {
              ...part.response,
              messages: [...recordedResponseMessages, ...stepMessages],
            },
            providerMetadata: part.providerMetadata,
          });

          await notify({
            event: currentStepResult,
            callbacks: [onStepFinish, globalTelemetry.onStepFinish],
          });

          logWarnings({
            warnings: recordedWarnings,
            provider: modelInfo.provider,
            model: modelInfo.modelId,
          });

          recordedSteps.push(currentStepResult);

          recordedResponseMessages.push(...stepMessages);

          // resolve the promise to signal that the step has been fully processed
          // by the event processor:
          stepFinish.resolve();
        }

        if (part.type === 'finish') {
          recordedTotalUsage = part.totalUsage;
          recordedFinishReason = part.finishReason;
          recordedRawFinishReason = part.rawFinishReason;
        }
      },

      async flush(controller) {
        try {
          if (recordedSteps.length === 0) {
            const error = abortSignal?.aborted
              ? abortSignal.reason
              : new NoOutputGeneratedError({
                  message: 'No output generated. Check the stream for errors.',
                });

            self._finishReason.reject(error);
            self._rawFinishReason.reject(error);
            self._totalUsage.reject(error);
            self._steps.reject(error);

            return; // no steps recorded (e.g. in error scenario)
          }

          // derived:
          const finishReason = recordedFinishReason ?? 'other';
          const totalUsage =
            recordedTotalUsage ?? createNullLanguageModelUsage();

          // from finish:
          self._finishReason.resolve(finishReason);
          self._rawFinishReason.resolve(recordedRawFinishReason);
          self._totalUsage.resolve(totalUsage);

          // aggregate results:
          self._steps.resolve(recordedSteps);

          // call onFinish callback:
          const finalStep = recordedSteps[recordedSteps.length - 1];

          await notify({
            event: {
              stepNumber: finalStep.stepNumber,
              model: finalStep.model,
              functionId: finalStep.functionId,
              metadata: finalStep.metadata,
              experimental_context: finalStep.experimental_context,
              finishReason: finalStep.finishReason,
              rawFinishReason: finalStep.rawFinishReason,
              totalUsage,
              usage: finalStep.usage,
              content: finalStep.content,
              text: finalStep.text,
              reasoningText: finalStep.reasoningText,
              reasoning: finalStep.reasoning,
              files: finalStep.files,
              sources: finalStep.sources,
              toolCalls: finalStep.toolCalls,
              staticToolCalls: finalStep.staticToolCalls,
              dynamicToolCalls: finalStep.dynamicToolCalls,
              toolResults: finalStep.toolResults,
              staticToolResults: finalStep.staticToolResults,
              dynamicToolResults: finalStep.dynamicToolResults,
              request: finalStep.request,
              response: finalStep.response,
              warnings: finalStep.warnings,
              providerMetadata: finalStep.providerMetadata,
              steps: recordedSteps,
            },
            callbacks: [
              onFinish,
              globalTelemetry.onFinish as
                | undefined
                | StreamTextOnFinishCallback<TOOLS>,
            ],
          });

          // Add response information to the root span:
          rootSpan.setAttributes(
            await selectTelemetryAttributes({
              telemetry,
              attributes: {
                'ai.response.finishReason': finishReason,
                'ai.response.text': { output: () => finalStep.text },
                'ai.response.reasoning': {
                  output: () => finalStep.reasoningText,
                },
                'ai.response.toolCalls': {
                  output: () =>
                    finalStep.toolCalls?.length
                      ? JSON.stringify(finalStep.toolCalls)
                      : undefined,
                },
                'ai.response.providerMetadata': JSON.stringify(
                  finalStep.providerMetadata,
                ),
                'ai.usage.inputTokens': totalUsage.inputTokens,
                'ai.usage.inputTokenDetails.noCacheTokens':
                  totalUsage.inputTokenDetails?.noCacheTokens,
                'ai.usage.inputTokenDetails.cacheReadTokens':
                  totalUsage.inputTokenDetails?.cacheReadTokens,
                'ai.usage.inputTokenDetails.cacheWriteTokens':
                  totalUsage.inputTokenDetails?.cacheWriteTokens,
                'ai.usage.outputTokens': totalUsage.outputTokens,
                'ai.usage.outputTokenDetails.textTokens':
                  totalUsage.outputTokenDetails?.textTokens,
                'ai.usage.outputTokenDetails.reasoningTokens':
                  totalUsage.outputTokenDetails?.reasoningTokens,
                'ai.usage.totalTokens': totalUsage.totalTokens,
                'ai.usage.reasoningTokens':
                  totalUsage.outputTokenDetails?.reasoningTokens,
                'ai.usage.cachedInputTokens':
                  totalUsage.inputTokenDetails?.cacheReadTokens,
              },
            }),
          );
        } catch (error) {
          controller.error(error);
        } finally {
          rootSpan.end();
        }
      },
    });

    // initialize the stitchable stream and the transformed stream:
    const stitchableStream = createStitchableStream<TextStreamPart<TOOLS>>();
    this.addStream = stitchableStream.addStream;
    this.closeStream = stitchableStream.close;

    // resilient stream that handles abort signals and errors:
    const reader = stitchableStream.stream.getReader();
    let stream = new ReadableStream<TextStreamPart<TOOLS>>({
      async start(controller) {
        // send start event:
        controller.enqueue({ type: 'start' });
      },

      async pull(controller) {
        // abort handling:
        function abort() {
          onAbort?.({ steps: recordedSteps });
          controller.enqueue({
            type: 'abort',
            // The `reason` is usually of type DOMException, but it can also be of any type,
            // so we use getErrorMessage for serialization because it is already designed to accept values of the unknown type.
            // See: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/reason
            ...(abortSignal?.reason !== undefined
              ? { reason: getErrorMessage(abortSignal.reason) }
              : {}),
          });
          controller.close();
        }

        try {
          const { done, value } = await reader.read();

          if (done) {
            controller.close();
            return;
          }

          if (abortSignal?.aborted) {
            abort();
            return;
          }

          controller.enqueue(value);
        } catch (error) {
          if (isAbortError(error) && abortSignal?.aborted) {
            abort();
          } else {
            controller.error(error);
          }
        }
      },

      cancel(reason) {
        return stitchableStream.stream.cancel(reason);
      },
    });

    // transform the stream before output parsing
    // to enable replacement of stream segments:
    for (const transform of transforms) {
      stream = stream.pipeThrough(
        transform({
          tools: tools as TOOLS,
          stopStream() {
            stitchableStream.terminate();
          },
        }),
      );
    }

    this.baseStream = stream
      .pipeThrough(createOutputTransformStream(output ?? text()))
      .pipeThrough(eventProcessor);

    const { maxRetries, retry } = prepareRetries({
      maxRetries: maxRetriesArg,
      abortSignal,
    });

    const tracer = getTracer(telemetry);

    const callSettings = prepareCallSettings(settings);

    const baseTelemetryAttributes = getBaseTelemetryAttributes({
      model,
      telemetry,
      headers,
      settings: { ...callSettings, maxRetries },
    });

    const self = this;

    const modelInfo = { provider: model.provider, modelId: model.modelId };
    const callbackTelemetryProps = {
      functionId: telemetry?.functionId,
      metadata: telemetry?.metadata as Record<string, unknown> | undefined,
    };

    recordSpan({
      name: 'ai.streamText',
      attributes: selectTelemetryAttributes({
        telemetry,
        attributes: {
          ...assembleOperationName({ operationId: 'ai.streamText', telemetry }),
          ...baseTelemetryAttributes,
          // specific settings that only make sense on the outer level:
          'ai.prompt': {
            input: () => JSON.stringify({ system, prompt, messages }),
          },
        },
      }),
      tracer,
      endWhenDone: false,
      fn: async rootSpanArg => {
        rootSpan = rootSpanArg;

        const initialPrompt = await standardizePrompt({
          system,
          prompt,
          messages,
        } as Prompt);

        await notify({
          event: {
            model: modelInfo,
            system,
            prompt,
            messages,
            tools,
            toolChoice,
            activeTools,
            maxOutputTokens: callSettings.maxOutputTokens,
            temperature: callSettings.temperature,
            topP: callSettings.topP,
            topK: callSettings.topK,
            presencePenalty: callSettings.presencePenalty,
            frequencyPenalty: callSettings.frequencyPenalty,
            stopSequences: callSettings.stopSequences,
            seed: callSettings.seed,
            maxRetries,
            timeout,
            headers,
            providerOptions,
            stopWhen,
            output,
            abortSignal: originalAbortSignal,
            include,
            ...callbackTelemetryProps,
            experimental_context,
          },
          callbacks: [
            onStart,
            globalTelemetry.onStart as
              | undefined
              | StreamTextOnStartCallback<TOOLS, OUTPUT>,
          ],
        });

        const initialMessages = initialPrompt.messages;
        const initialResponseMessages: Array<ResponseMessage> = [];

        const { approvedToolApprovals, deniedToolApprovals } =
          collectToolApprovals<TOOLS>({ messages: initialMessages });

        // initial tool execution step stream
        if (
          deniedToolApprovals.length > 0 ||
          approvedToolApprovals.length > 0
        ) {
          const providerExecutedToolApprovals = [
            ...approvedToolApprovals,
            ...deniedToolApprovals,
          ].filter(toolApproval => toolApproval.toolCall.providerExecuted);

          const localApprovedToolApprovals = approvedToolApprovals.filter(
            toolApproval => !toolApproval.toolCall.providerExecuted,
          );
          const localDeniedToolApprovals = deniedToolApprovals.filter(
            toolApproval => !toolApproval.toolCall.providerExecuted,
          );

          const deniedProviderExecutedToolApprovals =
            deniedToolApprovals.filter(
              toolApproval => toolApproval.toolCall.providerExecuted,
            );

          let toolExecutionStepStreamController:
            | ReadableStreamDefaultController<TextStreamPart<TOOLS>>
            | undefined;
          const toolExecutionStepStream = new ReadableStream<
            TextStreamPart<TOOLS>
          >({
            start(controller) {
              toolExecutionStepStreamController = controller;
            },
          });

          self.addStream(toolExecutionStepStream);

          try {
            for (const toolApproval of [
              ...localDeniedToolApprovals,
              ...deniedProviderExecutedToolApprovals,
            ]) {
              toolExecutionStepStreamController?.enqueue({
                type: 'tool-output-denied',
                toolCallId: toolApproval.toolCall.toolCallId,
                toolName: toolApproval.toolCall.toolName,
              } as StaticToolOutputDenied<TOOLS>);
            }

            const toolOutputs: Array<ToolOutput<TOOLS>> = [];

            await Promise.all(
              localApprovedToolApprovals.map(async toolApproval => {
                const result = await executeToolCall({
                  toolCall: toolApproval.toolCall,
                  tools,
                  tracer,
                  telemetry,
                  messages: initialMessages,
                  abortSignal,
                  experimental_context,
                  stepNumber: recordedSteps.length,
                  model: modelInfo,
                  onToolCallStart: [
                    onToolCallStart,
                    globalTelemetry.onToolCallStart as
                      | undefined
                      | StreamTextOnToolCallStartCallback<TOOLS>,
                  ],
                  onToolCallFinish: [
                    onToolCallFinish,
                    globalTelemetry.onToolCallFinish,
                  ],
                  onPreliminaryToolResult: result => {
                    toolExecutionStepStreamController?.enqueue(result);
                  },
                });

                if (result != null) {
                  toolExecutionStepStreamController?.enqueue(result);
                  toolOutputs.push(result);
                }
              }),
            );

            // forward provider-executed approval responses to the provider (do not execute locally):
            if (providerExecutedToolApprovals.length > 0) {
              initialResponseMessages.push({
                role: 'tool',
                content: providerExecutedToolApprovals.map(
                  toolApproval =>
                    ({
                      type: 'tool-approval-response',
                      approvalId: toolApproval.approvalResponse.approvalId,
                      approved: toolApproval.approvalResponse.approved,
                      reason: toolApproval.approvalResponse.reason,
                      providerExecuted: true,
                    }) satisfies ToolApprovalResponse,
                ),
              });
            }

            // Local tool results (approved + denied) are sent as tool results:
            if (toolOutputs.length > 0 || localDeniedToolApprovals.length > 0) {
              const localToolContent: ToolContent = [];

              // add regular tool results for approved tool calls:
              for (const output of toolOutputs) {
                localToolContent.push({
                  type: 'tool-result' as const,
                  toolCallId: output.toolCallId,
                  toolName: output.toolName,
                  output: await createToolModelOutput({
                    toolCallId: output.toolCallId,
                    input: output.input,
                    tool: tools?.[output.toolName],
                    output:
                      output.type === 'tool-result'
                        ? output.output
                        : output.error,
                    errorMode: output.type === 'tool-error' ? 'text' : 'none',
                  }),
                });
              }

              // add execution denied tool results for denied local tool approvals:
              for (const toolApproval of localDeniedToolApprovals) {
                localToolContent.push({
                  type: 'tool-result' as const,
                  toolCallId: toolApproval.toolCall.toolCallId,
                  toolName: toolApproval.toolCall.toolName,
                  output: {
                    type: 'execution-denied' as const,
                    reason: toolApproval.approvalResponse.reason,
                  },
                });
              }

              initialResponseMessages.push({
                role: 'tool',
                content: localToolContent,
              });
            }
          } finally {
            toolExecutionStepStreamController?.close();
          }
        }

        recordedResponseMessages.push(...initialResponseMessages);

        async function streamStep({
          currentStep,
          responseMessages,
          usage,
        }: {
          currentStep: number;
          responseMessages: Array<ResponseMessage>;
          usage: LanguageModelUsage;
        }) {
          const includeRawChunks = self.includeRawChunks;

          // Set up step timeout if configured
          const stepTimeoutId =
            stepTimeoutMs != null
              ? setTimeout(() => stepAbortController!.abort(), stepTimeoutMs)
              : undefined;

          // Set up chunk timeout tracking (will be reset on each chunk)
          let chunkTimeoutId: ReturnType<typeof setTimeout> | undefined =
            undefined;

          function resetChunkTimeout() {
            if (chunkTimeoutMs != null) {
              if (chunkTimeoutId != null) {
                clearTimeout(chunkTimeoutId);
              }
              chunkTimeoutId = setTimeout(
                () => chunkAbortController!.abort(),
                chunkTimeoutMs,
              );
            }
          }

          function clearChunkTimeout() {
            if (chunkTimeoutId != null) {
              clearTimeout(chunkTimeoutId);
              chunkTimeoutId = undefined;
            }
          }

          function clearStepTimeout() {
            if (stepTimeoutId != null) {
              clearTimeout(stepTimeoutId);
            }
          }

          try {
            stepFinish = new DelayedPromise<void>();

            const stepInputMessages = [...initialMessages, ...responseMessages];

            const prepareStepResult = await prepareStep?.({
              model,
              steps: recordedSteps,
              stepNumber: recordedSteps.length,
              messages: stepInputMessages,
              experimental_context,
            });

            const stepModel = resolveLanguageModel(
              prepareStepResult?.model ?? model,
            );
            const stepModelInfo = {
              provider: stepModel.provider,
              modelId: stepModel.modelId,
            };

            const promptMessages = await convertToLanguageModelPrompt({
              prompt: {
                system: prepareStepResult?.system ?? initialPrompt.system,
                messages: prepareStepResult?.messages ?? stepInputMessages,
              },
              supportedUrls: await stepModel.supportedUrls,
              download,
            });

            const stepActiveTools =
              prepareStepResult?.activeTools ?? activeTools;

            const { toolChoice: stepToolChoice, tools: stepTools } =
              await prepareToolsAndToolChoice({
                tools,
                toolChoice: prepareStepResult?.toolChoice ?? toolChoice,
                activeTools: stepActiveTools,
              });

            experimental_context =
              prepareStepResult?.experimental_context ?? experimental_context;

            const stepMessages =
              prepareStepResult?.messages ?? stepInputMessages;

            const stepSystem =
              prepareStepResult?.system ?? initialPrompt.system;

            const stepProviderOptions = mergeObjects(
              providerOptions,
              prepareStepResult?.providerOptions,
            );

            await notify({
              event: {
                stepNumber: recordedSteps.length,
                model: stepModelInfo,
                system: stepSystem,
                messages: stepMessages,
                tools,
                toolChoice: stepToolChoice,
                activeTools: stepActiveTools,
                steps: [...recordedSteps],
                providerOptions: stepProviderOptions,
                timeout,
                headers,
                stopWhen,
                output,
                abortSignal: originalAbortSignal,
                include,
                ...callbackTelemetryProps,
                experimental_context,
              },
              callbacks: [
                onStepStart,
                globalTelemetry.onStepStart as
                  | undefined
                  | StreamTextOnStepStartCallback<TOOLS, OUTPUT>,
              ],
            });

            const {
              result: { stream, response, request },
              doStreamSpan,
              startTimestampMs,
            } = await retry(() =>
              recordSpan({
                name: 'ai.streamText.doStream',
                attributes: selectTelemetryAttributes({
                  telemetry,
                  attributes: {
                    ...assembleOperationName({
                      operationId: 'ai.streamText.doStream',
                      telemetry,
                    }),
                    ...baseTelemetryAttributes,
                    // model:
                    'ai.model.provider': stepModel.provider,
                    'ai.model.id': stepModel.modelId,
                    // prompt:
                    'ai.prompt.messages': {
                      input: () => stringifyForTelemetry(promptMessages),
                    },
                    'ai.prompt.tools': {
                      // convert the language model level tools:
                      input: () => stepTools?.map(tool => JSON.stringify(tool)),
                    },
                    'ai.prompt.toolChoice': {
                      input: () =>
                        stepToolChoice != null
                          ? JSON.stringify(stepToolChoice)
                          : undefined,
                    },

                    // standardized gen-ai llm span attributes:
                    'gen_ai.system': stepModel.provider,
                    'gen_ai.request.model': stepModel.modelId,
                    'gen_ai.request.frequency_penalty':
                      callSettings.frequencyPenalty,
                    'gen_ai.request.max_tokens': callSettings.maxOutputTokens,
                    'gen_ai.request.presence_penalty':
                      callSettings.presencePenalty,
                    'gen_ai.request.stop_sequences': callSettings.stopSequences,
                    'gen_ai.request.temperature': callSettings.temperature,
                    'gen_ai.request.top_k': callSettings.topK,
                    'gen_ai.request.top_p': callSettings.topP,
                  },
                }),
                tracer,
                endWhenDone: false,
                fn: async doStreamSpan => ({
                  startTimestampMs: now(), // get before the call
                  doStreamSpan,
                  result: await stepModel.doStream({
                    ...callSettings,
                    tools: stepTools,
                    toolChoice: stepToolChoice,
                    responseFormat: await output?.responseFormat,
                    prompt: promptMessages,
                    providerOptions: stepProviderOptions,
                    abortSignal,
                    headers,
                    includeRawChunks,
                  }),
                }),
              }),
            );

            const streamWithToolResults = runToolsTransformation({
              tools,
              generatorStream: stream,
              tracer,
              telemetry,
              system,
              messages: stepInputMessages,
              repairToolCall,
              abortSignal,
              experimental_context,
              generateId,
              stepNumber: recordedSteps.length,
              model: stepModelInfo,
              onToolCallStart: [
                onToolCallStart,
                globalTelemetry.onToolCallStart as
                  | undefined
                  | StreamTextOnToolCallStartCallback<TOOLS>,
              ],
              onToolCallFinish: [
                onToolCallFinish,
                globalTelemetry.onToolCallFinish,
              ],
            });

            // Conditionally include request.body based on include settings.
            // Large payloads (e.g., base64-encoded images) can cause memory issues.
            const stepRequest: LanguageModelRequestMetadata =
              (include?.requestBody ?? true)
                ? (request ?? {})
                : { ...request, body: undefined };
            const stepToolCalls: TypedToolCall<TOOLS>[] = [];
            const stepToolOutputs: ToolOutput<TOOLS>[] = [];
            let warnings: SharedV3Warning[] | undefined;

            const activeToolCallToolNames: Record<string, string> = {};

            let stepFinishReason: FinishReason = 'other';
            let stepRawFinishReason: string | undefined = undefined;

            let stepUsage: LanguageModelUsage = createNullLanguageModelUsage();
            let stepProviderMetadata: ProviderMetadata | undefined;
            let stepFirstChunk = true;
            let stepResponse: { id: string; timestamp: Date; modelId: string } =
              {
                id: generateId(),
                timestamp: new Date(),
                modelId: modelInfo.modelId,
              };

            // raw text as it comes from the provider. recorded for telemetry.
            let activeText = '';

            self.addStream(
              streamWithToolResults.pipeThrough(
                new TransformStream<
                  SingleRequestTextStreamPart<TOOLS>,
                  TextStreamPart<TOOLS>
                >({
                  async transform(chunk, controller): Promise<void> {
                    resetChunkTimeout();

                    if (chunk.type === 'stream-start') {
                      warnings = chunk.warnings;
                      return; // stream start chunks are sent immediately and do not count as first chunk
                    }

                    if (stepFirstChunk) {
                      // Telemetry for first chunk:
                      const msToFirstChunk = now() - startTimestampMs;

                      stepFirstChunk = false;

                      doStreamSpan.addEvent('ai.stream.firstChunk', {
                        'ai.response.msToFirstChunk': msToFirstChunk,
                      });

                      doStreamSpan.setAttributes({
                        'ai.response.msToFirstChunk': msToFirstChunk,
                      });

                      // Step start:
                      controller.enqueue({
                        type: 'start-step',
                        request: stepRequest,
                        warnings: warnings ?? [],
                      });
                    }

                    const chunkType = chunk.type;
                    switch (chunkType) {
                      case 'tool-approval-request':
                      case 'text-start':
                      case 'text-end': {
                        controller.enqueue(chunk);
                        break;
                      }

                      case 'text-delta': {
                        if (chunk.delta.length > 0) {
                          controller.enqueue({
                            type: 'text-delta',
                            id: chunk.id,
                            text: chunk.delta,
                            providerMetadata: chunk.providerMetadata,
                          });
                          activeText += chunk.delta;
                        }
                        break;
                      }

                      case 'reasoning-start':
                      case 'reasoning-end': {
                        controller.enqueue(chunk);
                        break;
                      }

                      case 'reasoning-delta': {
                        controller.enqueue({
                          type: 'reasoning-delta',
                          id: chunk.id,
                          text: chunk.delta,
                          providerMetadata: chunk.providerMetadata,
                        });
                        break;
                      }

                      case 'tool-call': {
                        controller.enqueue(chunk);
                        // store tool calls for onFinish callback and toolCalls promise:
                        stepToolCalls.push(chunk);
                        break;
                      }

                      case 'tool-result': {
                        controller.enqueue(chunk);

                        if (!chunk.preliminary) {
                          stepToolOutputs.push(chunk);
                        }

                        break;
                      }

                      case 'tool-error': {
                        controller.enqueue(chunk);
                        stepToolOutputs.push(chunk);
                        break;
                      }

                      case 'response-metadata': {
                        stepResponse = {
                          id: chunk.id ?? stepResponse.id,
                          timestamp: chunk.timestamp ?? stepResponse.timestamp,
                          modelId: chunk.modelId ?? stepResponse.modelId,
                        };
                        break;
                      }

                      case 'finish': {
                        // Note: tool executions might not be finished yet when the finish event is emitted.
                        // store usage and finish reason for promises and onFinish callback:
                        stepUsage = chunk.usage;
                        stepFinishReason = chunk.finishReason;
                        stepRawFinishReason = chunk.rawFinishReason;
                        stepProviderMetadata = chunk.providerMetadata;

                        // Telemetry for finish event timing
                        // (since tool executions can take longer and distort calculations)
                        const msToFinish = now() - startTimestampMs;
                        doStreamSpan.addEvent('ai.stream.finish');
                        doStreamSpan.setAttributes({
                          'ai.response.msToFinish': msToFinish,
                          'ai.response.avgOutputTokensPerSecond':
                            (1000 * (stepUsage.outputTokens ?? 0)) / msToFinish,
                        });

                        break;
                      }

                      case 'file': {
                        controller.enqueue(chunk);
                        break;
                      }

                      case 'source': {
                        controller.enqueue(chunk);
                        break;
                      }

                      case 'tool-input-start': {
                        activeToolCallToolNames[chunk.id] = chunk.toolName;

                        const tool = tools?.[chunk.toolName];
                        if (tool?.onInputStart != null) {
                          await tool.onInputStart({
                            toolCallId: chunk.id,
                            messages: stepInputMessages,
                            abortSignal,
                            experimental_context,
                          });
                        }

                        controller.enqueue({
                          ...chunk,
                          dynamic: chunk.dynamic ?? tool?.type === 'dynamic',
                          title: tool?.title,
                        });
                        break;
                      }

                      case 'tool-input-end': {
                        delete activeToolCallToolNames[chunk.id];
                        controller.enqueue(chunk);
                        break;
                      }

                      case 'tool-input-delta': {
                        const toolName = activeToolCallToolNames[chunk.id];
                        const tool = tools?.[toolName];

                        if (tool?.onInputDelta != null) {
                          await tool.onInputDelta({
                            inputTextDelta: chunk.delta,
                            toolCallId: chunk.id,
                            messages: stepInputMessages,
                            abortSignal,
                            experimental_context,
                          });
                        }

                        controller.enqueue(chunk);
                        break;
                      }

                      case 'error': {
                        controller.enqueue(chunk);
                        stepFinishReason = 'error';
                        break;
                      }

                      case 'raw': {
                        if (includeRawChunks) {
                          controller.enqueue(chunk);
                        }
                        break;
                      }

                      default: {
                        const exhaustiveCheck: never = chunkType;
                        throw new Error(
                          `Unknown chunk type: ${exhaustiveCheck}`,
                        );
                      }
                    }
                  },

                  // invoke onFinish callback and resolve toolResults promise when the stream is about to close:
                  async flush(controller) {
                    const stepToolCallsJson =
                      stepToolCalls.length > 0
                        ? JSON.stringify(stepToolCalls)
                        : undefined;

                    // record telemetry attributes that don't depend on transforms:
                    try {
                      doStreamSpan.setAttributes(
                        await selectTelemetryAttributes({
                          telemetry,
                          attributes: {
                            'ai.response.finishReason': stepFinishReason,
                            'ai.response.toolCalls': {
                              output: () => stepToolCallsJson,
                            },
                            'ai.response.id': stepResponse.id,
                            'ai.response.model': stepResponse.modelId,
                            'ai.response.timestamp':
                              stepResponse.timestamp.toISOString(),
                            'ai.usage.inputTokens': stepUsage.inputTokens,
                            'ai.usage.inputTokenDetails.noCacheTokens':
                              stepUsage.inputTokenDetails?.noCacheTokens,
                            'ai.usage.inputTokenDetails.cacheReadTokens':
                              stepUsage.inputTokenDetails?.cacheReadTokens,
                            'ai.usage.inputTokenDetails.cacheWriteTokens':
                              stepUsage.inputTokenDetails?.cacheWriteTokens,
                            'ai.usage.outputTokens': stepUsage.outputTokens,
                            'ai.usage.outputTokenDetails.textTokens':
                              stepUsage.outputTokenDetails?.textTokens,
                            'ai.usage.outputTokenDetails.reasoningTokens':
                              stepUsage.outputTokenDetails?.reasoningTokens,
                            'ai.usage.totalTokens': stepUsage.totalTokens,
                            'ai.usage.reasoningTokens':
                              stepUsage.outputTokenDetails?.reasoningTokens,
                            'ai.usage.cachedInputTokens':
                              stepUsage.inputTokenDetails?.cacheReadTokens,

                            // standardized gen-ai llm span attributes:
                            'gen_ai.response.finish_reasons': [
                              stepFinishReason,
                            ],
                            'gen_ai.response.id': stepResponse.id,
                            'gen_ai.response.model': stepResponse.modelId,
                            'gen_ai.usage.input_tokens': stepUsage.inputTokens,
                            'gen_ai.usage.output_tokens':
                              stepUsage.outputTokens,
                          },
                        }),
                      );
                    } catch (error) {
                      // ignore error setting telemetry attributes
                    }

                    controller.enqueue({
                      type: 'finish-step',
                      finishReason: stepFinishReason,
                      rawFinishReason: stepRawFinishReason,
                      usage: stepUsage,
                      providerMetadata: stepProviderMetadata,
                      response: {
                        ...stepResponse,
                        headers: response?.headers,
                      },
                    });

                    const combinedUsage = addLanguageModelUsage(
                      usage,
                      stepUsage,
                    );

                    // wait for the step to be fully processed by the event processor
                    // to ensure that the recorded steps are complete:
                    await stepFinish.promise;

                    // set transform-dependent attributes after the step has been
                    // fully processed (post-transform) by the event processor:
                    const processedStep =
                      recordedSteps[recordedSteps.length - 1];
                    try {
                      doStreamSpan.setAttributes(
                        await selectTelemetryAttributes({
                          telemetry,
                          attributes: {
                            'ai.response.text': {
                              output: () => processedStep.text,
                            },
                            'ai.response.reasoning': {
                              output: () => processedStep.reasoningText,
                            },
                            'ai.response.providerMetadata': JSON.stringify(
                              processedStep.providerMetadata,
                            ),
                          },
                        }),
                      );
                    } catch (error) {
                      // ignore error setting telemetry attributes
                    } finally {
                      doStreamSpan.end();
                    }

                    const clientToolCalls = stepToolCalls.filter(
                      toolCall => toolCall.providerExecuted !== true,
                    );
                    const clientToolOutputs = stepToolOutputs.filter(
                      toolOutput => toolOutput.providerExecuted !== true,
                    );

                    // Track provider-executed tool calls that support deferred results.
                    // In programmatic tool calling, a server tool (e.g., code_execution) may
                    // trigger a client tool, and the server tool's result is deferred until
                    // the client tool's result is sent back.
                    for (const toolCall of stepToolCalls) {
                      if (toolCall.providerExecuted !== true) continue;
                      const tool = tools?.[toolCall.toolName];
                      if (
                        tool?.type === 'provider' &&
                        tool.supportsDeferredResults
                      ) {
                        // Check if this tool call already has a result in the current step
                        const hasResultInStep = stepToolOutputs.some(
                          output =>
                            (output.type === 'tool-result' ||
                              output.type === 'tool-error') &&
                            output.toolCallId === toolCall.toolCallId,
                        );
                        if (!hasResultInStep) {
                          pendingDeferredToolCalls.set(toolCall.toolCallId, {
                            toolName: toolCall.toolName,
                          });
                        }
                      }
                    }

                    // Mark deferred tool calls as resolved when we receive their results
                    for (const output of stepToolOutputs) {
                      if (
                        output.type === 'tool-result' ||
                        output.type === 'tool-error'
                      ) {
                        pendingDeferredToolCalls.delete(output.toolCallId);
                      }
                    }

                    // Clear the step and chunk timeouts before the next step is started
                    clearStepTimeout();
                    clearChunkTimeout();

                    if (
                      // Continue if:
                      // 1. There are client tool calls that have all been executed, OR
                      // 2. There are pending deferred results from provider-executed tools
                      ((clientToolCalls.length > 0 &&
                        clientToolOutputs.length === clientToolCalls.length) ||
                        pendingDeferredToolCalls.size > 0) &&
                      // continue until a stop condition is met:
                      !(await isStopConditionMet({
                        stopConditions,
                        steps: recordedSteps,
                      }))
                    ) {
                      // append to messages for the next step:
                      responseMessages.push(
                        ...(await toResponseMessages({
                          content:
                            // use transformed content to create the messages for the next step:
                            recordedSteps[recordedSteps.length - 1].content,
                          tools,
                        })),
                      );

                      try {
                        await streamStep({
                          currentStep: currentStep + 1,
                          responseMessages,
                          usage: combinedUsage,
                        });
                      } catch (error) {
                        controller.enqueue({
                          type: 'error',
                          error,
                        });

                        self.closeStream();
                      }
                    } else {
                      controller.enqueue({
                        type: 'finish',
                        finishReason: stepFinishReason,
                        rawFinishReason: stepRawFinishReason,
                        totalUsage: combinedUsage,
                      });

                      self.closeStream(); // close the stitchable stream
                    }
                  },
                }),
              ),
            );
          } finally {
            clearStepTimeout();
            clearChunkTimeout();
          }
        }

        // add the initial stream to the stitchable stream
        await streamStep({
          currentStep: 0,
          responseMessages: initialResponseMessages,
          usage: createNullLanguageModelUsage(),
        });
      },
    }).catch(error => {
      // add an error stream part and close the streams:
      self.addStream(
        new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'error', error });
            controller.close();
          },
        }),
      );
      self.closeStream();
    });
  }

  get steps() {
    // when any of the promises are accessed, the stream is consumed
    // so it resolves without needing to consume the stream separately
    this.consumeStream();

    return this._steps.promise;
  }

  private get finalStep() {
    return this.steps.then(steps => steps[steps.length - 1]);
  }

  get content() {
    return this.finalStep.then(step => step.content);
  }

  get warnings() {
    return this.finalStep.then(step => step.warnings);
  }

  get providerMetadata() {
    return this.finalStep.then(step => step.providerMetadata);
  }

  get text() {
    return this.finalStep.then(step => step.text);
  }

  get reasoningText() {
    return this.finalStep.then(step => step.reasoningText);
  }

  get reasoning() {
    return this.finalStep.then(step => step.reasoning);
  }

  get sources() {
    return this.finalStep.then(step => step.sources);
  }

  get files() {
    return this.finalStep.then(step => step.files);
  }

  get toolCalls() {
    return this.finalStep.then(step => step.toolCalls);
  }

  get staticToolCalls() {
    return this.finalStep.then(step => step.staticToolCalls);
  }

  get dynamicToolCalls() {
    return this.finalStep.then(step => step.dynamicToolCalls);
  }

  get toolResults() {
    return this.finalStep.then(step => step.toolResults);
  }

  get staticToolResults() {
    return this.finalStep.then(step => step.staticToolResults);
  }

  get dynamicToolResults() {
    return this.finalStep.then(step => step.dynamicToolResults);
  }

  get usage() {
    return this.finalStep.then(step => step.usage);
  }

  get request() {
    return this.finalStep.then(step => step.request);
  }

  get response() {
    return this.finalStep.then(step => step.response);
  }

  get totalUsage() {
    // when any of the promises are accessed, the stream is consumed
    // so it resolves without needing to consume the stream separately
    this.consumeStream();

    return this._totalUsage.promise;
  }

  get finishReason() {
    // when any of the promises are accessed, the stream is consumed
    // so it resolves without needing to consume the stream separately
    this.consumeStream();

    return this._finishReason.promise;
  }

  get rawFinishReason() {
    // when any of the promises are accessed, the stream is consumed
    // so it resolves without needing to consume the stream separately
    this.consumeStream();

    return this._rawFinishReason.promise;
  }

  /**
   * Split out a new stream from the original stream.
   * The original stream is replaced to allow for further splitting,
   * since we do not know how many times the stream will be split.
   *
   * Note: this leads to buffering the stream content on the server.
   * However, the LLM results are expected to be small enough to not cause issues.
   */
  private teeStream() {
    const [stream1, stream2] = this.baseStream.tee();
    this.baseStream = stream2;
    return stream1;
  }

  get textStream(): AsyncIterableStream<string> {
    return createAsyncIterableStream(
      this.teeStream().pipeThrough(
        new TransformStream<
          EnrichedStreamPart<TOOLS, InferPartialOutput<OUTPUT>>,
          string
        >({
          transform({ part }, controller) {
            if (part.type === 'text-delta') {
              controller.enqueue(part.text);
            }
          },
        }),
      ),
    );
  }

  get fullStream(): AsyncIterableStream<TextStreamPart<TOOLS>> {
    return createAsyncIterableStream(
      this.teeStream().pipeThrough(
        new TransformStream<
          EnrichedStreamPart<TOOLS, InferPartialOutput<OUTPUT>>,
          TextStreamPart<TOOLS>
        >({
          transform({ part }, controller) {
            controller.enqueue(part);
          },
        }),
      ),
    );
  }

  async consumeStream(options?: ConsumeStreamOptions): Promise<void> {
    try {
      await consumeStream({
        stream: this.fullStream,
        onError: options?.onError,
      });
    } catch (error) {
      options?.onError?.(error);
    }
  }

  get experimental_partialOutputStream(): AsyncIterableStream<
    InferPartialOutput<OUTPUT>
  > {
    return this.partialOutputStream;
  }

  get partialOutputStream(): AsyncIterableStream<InferPartialOutput<OUTPUT>> {
    return createAsyncIterableStream(
      this.teeStream().pipeThrough(
        new TransformStream<
          EnrichedStreamPart<TOOLS, InferPartialOutput<OUTPUT>>,
          InferPartialOutput<OUTPUT>
        >({
          transform({ partialOutput }, controller) {
            if (partialOutput != null) {
              controller.enqueue(partialOutput);
            }
          },
        }),
      ),
    );
  }

  get elementStream(): AsyncIterableStream<InferElementOutput<OUTPUT>> {
    const transform = this.outputSpecification?.createElementStreamTransform();

    if (transform == null) {
      throw new UnsupportedFunctionalityError({
        functionality: `element streams in ${this.outputSpecification?.name ?? 'text'} mode`,
      });
    }

    return createAsyncIterableStream(this.teeStream().pipeThrough(transform));
  }

  get output(): Promise<InferCompleteOutput<OUTPUT>> {
    return this.finalStep.then(step => {
      const output = this.outputSpecification ?? text();
      return output.parseCompleteOutput(
        { text: step.text },
        {
          response: step.response,
          usage: step.usage,
          finishReason: step.finishReason,
        },
      );
    });
  }

  toUIMessageStream<UI_MESSAGE extends UIMessage>({
    originalMessages,
    generateMessageId,
    onFinish,
    messageMetadata,
    sendReasoning = true,
    sendSources = false,
    sendStart = true,
    sendFinish = true,
    onError = getErrorMessage,
  }: UIMessageStreamOptions<UI_MESSAGE> = {}): AsyncIterableStream<
    InferUIMessageChunk<UI_MESSAGE>
  > {
    const responseMessageId =
      generateMessageId != null
        ? getResponseUIMessageId({
            originalMessages,
            responseMessageId: generateMessageId,
          })
        : undefined;

    // TODO simplify once dynamic is no longer needed for invalid tool inputs
    const isDynamic = (part: { toolName: string; dynamic?: boolean }) => {
      const tool = this.tools?.[part.toolName];

      // provider-executed, dynamic tools are not listed in the tools object
      if (tool == null) {
        return part.dynamic;
      }

      return tool?.type === 'dynamic' ? true : undefined;
    };

    const baseStream = this.fullStream.pipeThrough(
      new TransformStream<
        TextStreamPart<TOOLS>,
        UIMessageChunk<
          InferUIMessageMetadata<UI_MESSAGE>,
          InferUIMessageData<UI_MESSAGE>
        >
      >({
        transform: async (part, controller) => {
          const messageMetadataValue = messageMetadata?.({ part });

          const partType = part.type;
          switch (partType) {
            case 'text-start': {
              controller.enqueue({
                type: 'text-start',
                id: part.id,
                ...(part.providerMetadata != null
                  ? { providerMetadata: part.providerMetadata }
                  : {}),
              });
              break;
            }

            case 'text-delta': {
              controller.enqueue({
                type: 'text-delta',
                id: part.id,
                delta: part.text,
                ...(part.providerMetadata != null
                  ? { providerMetadata: part.providerMetadata }
                  : {}),
              });
              break;
            }

            case 'text-end': {
              controller.enqueue({
                type: 'text-end',
                id: part.id,
                ...(part.providerMetadata != null
                  ? { providerMetadata: part.providerMetadata }
                  : {}),
              });
              break;
            }

            case 'reasoning-start': {
              controller.enqueue({
                type: 'reasoning-start',
                id: part.id,
                ...(part.providerMetadata != null
                  ? { providerMetadata: part.providerMetadata }
                  : {}),
              });
              break;
            }

            case 'reasoning-delta': {
              if (sendReasoning) {
                controller.enqueue({
                  type: 'reasoning-delta',
                  id: part.id,
                  delta: part.text,
                  ...(part.providerMetadata != null
                    ? { providerMetadata: part.providerMetadata }
                    : {}),
                });
              }
              break;
            }

            case 'reasoning-end': {
              controller.enqueue({
                type: 'reasoning-end',
                id: part.id,
                ...(part.providerMetadata != null
                  ? { providerMetadata: part.providerMetadata }
                  : {}),
              });
              break;
            }

            case 'file': {
              controller.enqueue({
                type: 'file',
                mediaType: part.file.mediaType,
                url: `data:${part.file.mediaType};base64,${part.file.base64}`,
                ...(part.providerMetadata != null
                  ? { providerMetadata: part.providerMetadata }
                  : {}),
              });
              break;
            }

            case 'source': {
              if (sendSources && part.sourceType === 'url') {
                controller.enqueue({
                  type: 'source-url',
                  sourceId: part.id,
                  url: part.url,
                  title: part.title,
                  ...(part.providerMetadata != null
                    ? { providerMetadata: part.providerMetadata }
                    : {}),
                });
              }

              if (sendSources && part.sourceType === 'document') {
                controller.enqueue({
                  type: 'source-document',
                  sourceId: part.id,
                  mediaType: part.mediaType,
                  title: part.title,
                  filename: part.filename,
                  ...(part.providerMetadata != null
                    ? { providerMetadata: part.providerMetadata }
                    : {}),
                });
              }
              break;
            }

            case 'tool-input-start': {
              const dynamic = isDynamic(part);

              controller.enqueue({
                type: 'tool-input-start',
                toolCallId: part.id,
                toolName: part.toolName,
                ...(part.providerExecuted != null
                  ? { providerExecuted: part.providerExecuted }
                  : {}),
                ...(part.providerMetadata != null
                  ? { providerMetadata: part.providerMetadata }
                  : {}),
                ...(dynamic != null ? { dynamic } : {}),
                ...(part.title != null ? { title: part.title } : {}),
              });
              break;
            }

            case 'tool-input-delta': {
              controller.enqueue({
                type: 'tool-input-delta',
                toolCallId: part.id,
                inputTextDelta: part.delta,
              });
              break;
            }

            case 'tool-call': {
              const dynamic = isDynamic(part);

              if (part.invalid) {
                controller.enqueue({
                  type: 'tool-input-error',
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  input: part.input,
                  ...(part.providerExecuted != null
                    ? { providerExecuted: part.providerExecuted }
                    : {}),
                  ...(part.providerMetadata != null
                    ? { providerMetadata: part.providerMetadata }
                    : {}),
                  ...(dynamic != null ? { dynamic } : {}),
                  errorText: onError(part.error),
                  ...(part.title != null ? { title: part.title } : {}),
                });
              } else {
                controller.enqueue({
                  type: 'tool-input-available',
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  input: part.input,
                  ...(part.providerExecuted != null
                    ? { providerExecuted: part.providerExecuted }
                    : {}),
                  ...(part.providerMetadata != null
                    ? { providerMetadata: part.providerMetadata }
                    : {}),
                  ...(dynamic != null ? { dynamic } : {}),
                  ...(part.title != null ? { title: part.title } : {}),
                });
              }

              break;
            }

            case 'tool-approval-request': {
              controller.enqueue({
                type: 'tool-approval-request',
                approvalId: part.approvalId,
                toolCallId: part.toolCall.toolCallId,
              });
              break;
            }

            case 'tool-result': {
              const dynamic = isDynamic(part);

              controller.enqueue({
                type: 'tool-output-available',
                toolCallId: part.toolCallId,
                output: part.output,
                ...(part.providerExecuted != null
                  ? { providerExecuted: part.providerExecuted }
                  : {}),
                ...(part.providerMetadata != null
                  ? { providerMetadata: part.providerMetadata }
                  : {}),
                ...(part.preliminary != null
                  ? { preliminary: part.preliminary }
                  : {}),
                ...(dynamic != null ? { dynamic } : {}),
              });
              break;
            }

            case 'tool-error': {
              const dynamic = isDynamic(part);

              controller.enqueue({
                type: 'tool-output-error',
                toolCallId: part.toolCallId,
                errorText: part.providerExecuted
                  ? typeof part.error === 'string'
                    ? part.error
                    : JSON.stringify(part.error)
                  : onError(part.error),
                ...(part.providerExecuted != null
                  ? { providerExecuted: part.providerExecuted }
                  : {}),
                ...(part.providerMetadata != null
                  ? { providerMetadata: part.providerMetadata }
                  : {}),
                ...(dynamic != null ? { dynamic } : {}),
              });
              break;
            }

            case 'tool-output-denied': {
              controller.enqueue({
                type: 'tool-output-denied',
                toolCallId: part.toolCallId,
              });
              break;
            }

            case 'error': {
              controller.enqueue({
                type: 'error',
                errorText: onError(part.error),
              });
              break;
            }

            case 'start-step': {
              controller.enqueue({ type: 'start-step' });
              break;
            }

            case 'finish-step': {
              controller.enqueue({ type: 'finish-step' });
              break;
            }

            case 'start': {
              if (sendStart) {
                controller.enqueue({
                  type: 'start',
                  ...(messageMetadataValue != null
                    ? { messageMetadata: messageMetadataValue }
                    : {}),
                  ...(responseMessageId != null
                    ? { messageId: responseMessageId }
                    : {}),
                });
              }
              break;
            }

            case 'finish': {
              if (sendFinish) {
                controller.enqueue({
                  type: 'finish',
                  finishReason: part.finishReason,
                  ...(messageMetadataValue != null
                    ? { messageMetadata: messageMetadataValue }
                    : {}),
                });
              }
              break;
            }

            case 'abort': {
              controller.enqueue(part);
              break;
            }

            case 'tool-input-end': {
              break;
            }

            case 'raw': {
              // Raw chunks are not included in UI message streams
              // as they contain provider-specific data for developer use
              break;
            }

            default: {
              const exhaustiveCheck: never = partType;
              throw new Error(`Unknown chunk type: ${exhaustiveCheck}`);
            }
          }

          // start and finish events already have metadata
          // so we only need to send metadata for other parts
          if (
            messageMetadataValue != null &&
            partType !== 'start' &&
            partType !== 'finish'
          ) {
            controller.enqueue({
              type: 'message-metadata',
              messageMetadata: messageMetadataValue,
            });
          }
        },
      }),
    );

    return createAsyncIterableStream(
      handleUIMessageStreamFinish<UI_MESSAGE>({
        stream: baseStream,
        messageId: responseMessageId ?? generateMessageId?.(),
        originalMessages,
        onFinish,
        onError,
      }),
    );
  }

  pipeUIMessageStreamToResponse<UI_MESSAGE extends UIMessage>(
    response: ServerResponse,
    {
      originalMessages,
      generateMessageId,
      onFinish,
      messageMetadata,
      sendReasoning,
      sendSources,
      sendFinish,
      sendStart,
      onError,
      ...init
    }: UIMessageStreamResponseInit & UIMessageStreamOptions<UI_MESSAGE> = {},
  ) {
    pipeUIMessageStreamToResponse({
      response,
      stream: this.toUIMessageStream({
        originalMessages,
        generateMessageId,
        onFinish,
        messageMetadata,
        sendReasoning,
        sendSources,
        sendFinish,
        sendStart,
        onError,
      }),
      ...init,
    });
  }

  pipeTextStreamToResponse(response: ServerResponse, init?: ResponseInit) {
    pipeTextStreamToResponse({
      response,
      textStream: this.textStream,
      ...init,
    });
  }

  toUIMessageStreamResponse<UI_MESSAGE extends UIMessage>({
    originalMessages,
    generateMessageId,
    onFinish,
    messageMetadata,
    sendReasoning,
    sendSources,
    sendFinish,
    sendStart,
    onError,
    ...init
  }: UIMessageStreamResponseInit &
    UIMessageStreamOptions<UI_MESSAGE> = {}): Response {
    return createUIMessageStreamResponse({
      stream: this.toUIMessageStream({
        originalMessages,
        generateMessageId,
        onFinish,
        messageMetadata,
        sendReasoning,
        sendSources,
        sendFinish,
        sendStart,
        onError,
      }),
      ...init,
    });
  }

  toTextStreamResponse(init?: ResponseInit): Response {
    return createTextStreamResponse({
      textStream: this.textStream,
      ...init,
    });
  }
}
