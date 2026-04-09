import {
  JSONValue,
  LanguageModelV3FinishReason,
  LanguageModelV3StreamPart,
  LanguageModelV3Usage,
  SharedV3ProviderMetadata,
  SharedV3Warning,
} from '@ai-sdk/provider';
import {
  createIdGenerator,
  DelayedPromise,
  FlexibleSchema,
  ProviderOptions,
  type InferSchema,
} from '@ai-sdk/provider-utils';
import { ServerResponse } from 'http';
import { logWarnings } from '../logger/log-warnings';
import { resolveLanguageModel } from '../model/resolve-model';
import { CallSettings } from '../prompt/call-settings';
import { convertToLanguageModelPrompt } from '../prompt/convert-to-language-model-prompt';
import { prepareCallSettings } from '../prompt/prepare-call-settings';
import { Prompt } from '../prompt/prompt';
import { standardizePrompt } from '../prompt/standardize-prompt';
import { wrapGatewayError } from '../prompt/wrap-gateway-error';
import { assembleOperationName } from '../telemetry/assemble-operation-name';
import { getBaseTelemetryAttributes } from '../telemetry/get-base-telemetry-attributes';
import { getTracer } from '../telemetry/get-tracer';
import { recordSpan } from '../telemetry/record-span';
import { selectTelemetryAttributes } from '../telemetry/select-telemetry-attributes';
import { stringifyForTelemetry } from '../telemetry/stringify-for-telemetry';
import { TelemetrySettings } from '../telemetry/telemetry-settings';
import { createTextStreamResponse } from '../text-stream/create-text-stream-response';
import { pipeTextStreamToResponse } from '../text-stream/pipe-text-stream-to-response';
import {
  CallWarning,
  FinishReason,
  LanguageModel,
} from '../types/language-model';
import { LanguageModelRequestMetadata } from '../types/language-model-request-metadata';
import { LanguageModelResponseMetadata } from '../types/language-model-response-metadata';
import { ProviderMetadata } from '../types/provider-metadata';
import {
  asLanguageModelUsage,
  createNullLanguageModelUsage,
  LanguageModelUsage,
} from '../types/usage';
import { DeepPartial, isDeepEqualData, parsePartialJson } from '../util';
import {
  AsyncIterableStream,
  createAsyncIterableStream,
} from '../util/async-iterable-stream';
import { createStitchableStream } from '../util/create-stitchable-stream';
import { DownloadFunction } from '../util/download/download-function';
import { now as originalNow } from '../util/now';
import { prepareRetries } from '../util/prepare-retries';
import { getOutputStrategy, OutputStrategy } from './output-strategy';
import { parseAndValidateObjectResultWithRepair } from './parse-and-validate-object-result';
import { RepairTextFunction } from './repair-text';
import { ObjectStreamPart, StreamObjectResult } from './stream-object-result';
import { validateObjectGenerationInput } from './validate-object-generation-input';

const originalGenerateId = createIdGenerator({ prefix: 'aiobj', size: 24 });

/**
 * Callback that is set using the `onError` option.
 *
 * @param event - The event that is passed to the callback.
 */
export type StreamObjectOnErrorCallback = (event: {
  error: unknown;
}) => Promise<void> | void;

/**
 * Callback that is set using the `onFinish` option.
 *
 * @param event - The event that is passed to the callback.
 */
export type StreamObjectOnFinishCallback<RESULT> = (event: {
  /**
   * The token usage of the generated response.
   */
  usage: LanguageModelUsage;

  /**
   * The generated object. Can be undefined if the final object does not match the schema.
   */
  object: RESULT | undefined;

  /**
   * Optional error object. This is e.g. a TypeValidationError when the final object does not match the schema.
   */
  error: unknown | undefined;

  /**
   * Response metadata.
   */
  response: LanguageModelResponseMetadata;

  /**
   * Warnings from the model provider (e.g. unsupported settings).
   */
  warnings?: CallWarning[];

  /**
   * Additional provider-specific metadata. They are passed through
   * to the provider from the AI SDK and enable provider-specific
   * functionality that can be fully encapsulated in the provider.
   */
  providerMetadata: ProviderMetadata | undefined;
}) => Promise<void> | void;

/**
 * Generate a structured, typed object for a given prompt and schema using a language model.
 *
 * This function streams the output. If you do not want to stream the output, use `generateObject` instead.
 *
 * @param model - The language model to use.
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
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @param schema - The schema of the object that the model should generate.
 * @param schemaName - Optional name of the output that should be generated.
 * Used by some providers for additional LLM guidance, e.g.
 * via tool or schema name.
 * @param schemaDescription - Optional description of the output that should be generated.
 * Used by some providers for additional LLM guidance, e.g.
 * via tool or schema description.
 *
 * @param output - The type of the output.
 *
 * - 'object': The output is an object.
 * - 'array': The output is an array.
 * - 'enum': The output is an enum.
 * - 'no-schema': The output is not a schema.
 *
 * @param experimental_telemetry - Optional telemetry configuration (experimental).
 *
 * @param providerOptions - Additional provider-specific options. They are passed through
 * to the provider from the AI SDK and enable provider-specific
 * functionality that can be fully encapsulated in the provider.
 *
 * @returns
 * A result object for accessing the partial object stream and additional information.
 *
 * @deprecated Use `streamText` with an `output` setting instead.
 */
export function streamObject<
  SCHEMA extends FlexibleSchema<unknown> = FlexibleSchema<JSONValue>,
  OUTPUT extends 'object' | 'array' | 'enum' | 'no-schema' =
    InferSchema<SCHEMA> extends string ? 'enum' : 'object',
  RESULT = OUTPUT extends 'array'
    ? Array<InferSchema<SCHEMA>>
    : InferSchema<SCHEMA>,
>(
  options: Omit<CallSettings, 'stopSequences'> &
    Prompt &
    (OUTPUT extends 'enum'
      ? {
          /**
           * The enum values that the model should use.
           */
          enum: Array<RESULT>;
          output: 'enum';
        }
      : OUTPUT extends 'no-schema'
        ? {}
        : {
            /**
             * The schema of the object that the model should generate.
             */
            schema: SCHEMA;

            /**
             * Optional name of the output that should be generated.
             * Used by some providers for additional LLM guidance, e.g.
             * via tool or schema name.
             */
            schemaName?: string;

            /**
             * Optional description of the output that should be generated.
             * Used by some providers for additional LLM guidance, e.g.
             * via tool or schema description.
             */
            schemaDescription?: string;
          }) & {
      output?: OUTPUT;

      /**
       * The language model to use.
       */
      model: LanguageModel;

      /**
       * A function that attempts to repair the raw output of the model
       * to enable JSON parsing.
       */
      experimental_repairText?: RepairTextFunction;

      /**
       * Optional telemetry configuration (experimental).
       */

      experimental_telemetry?: TelemetrySettings;

      /**
       * Custom download function to use for URLs.
       *
       * By default, files are downloaded if the model does not support the URL for the given media type.
       */
      experimental_download?: DownloadFunction | undefined;

      /**
       * Additional provider-specific options. They are passed through
       * to the provider from the AI SDK and enable provider-specific
       * functionality that can be fully encapsulated in the provider.
       */
      providerOptions?: ProviderOptions;

      /**
       * Callback that is invoked when an error occurs during streaming.
       * You can use it to log errors.
       * The stream processing will pause until the callback promise is resolved.
       */
      onError?: StreamObjectOnErrorCallback;

      /**
       * Callback that is called when the LLM response and the final object validation are finished.
       */
      onFinish?: StreamObjectOnFinishCallback<RESULT>;

      /**
       * Internal. For test use only. May change without notice.
       */
      _internal?: {
        generateId?: () => string;
        currentDate?: () => Date;
        now?: () => number;
      };
    },
): StreamObjectResult<
  OUTPUT extends 'enum'
    ? string
    : OUTPUT extends 'array'
      ? RESULT
      : DeepPartial<RESULT>,
  OUTPUT extends 'array' ? RESULT : RESULT,
  OUTPUT extends 'array'
    ? RESULT extends Array<infer U>
      ? AsyncIterableStream<U>
      : never
    : never
> {
  const {
    model,
    output = 'object',
    system,
    prompt,
    messages,
    maxRetries,
    abortSignal,
    headers,
    experimental_repairText: repairText,
    experimental_telemetry: telemetry,
    experimental_download: download,
    providerOptions,
    onError = ({ error }: { error: unknown }) => {
      console.error(error);
    },
    onFinish,
    _internal: {
      generateId = originalGenerateId,
      currentDate = () => new Date(),
      now = originalNow,
    } = {},
    ...settings
  } = options;

  const enumValues =
    'enum' in options && options.enum ? options.enum : undefined;

  const {
    schema: inputSchema,
    schemaDescription,
    schemaName,
  } = 'schema' in options ? options : {};

  validateObjectGenerationInput({
    output,
    schema: inputSchema,
    schemaName,
    schemaDescription,
    enumValues,
  });

  const outputStrategy = getOutputStrategy({
    output,
    schema: inputSchema,
    enumValues,
  });

  return new DefaultStreamObjectResult({
    model,
    telemetry,
    headers,
    settings,
    maxRetries,
    abortSignal,
    outputStrategy,
    system,
    prompt,
    messages,
    schemaName,
    schemaDescription,
    providerOptions,
    repairText,
    onError,
    onFinish,
    download,
    generateId,
    currentDate,
    now,
  });
}

class DefaultStreamObjectResult<
  PARTIAL,
  RESULT,
  ELEMENT_STREAM,
> implements StreamObjectResult<PARTIAL, RESULT, ELEMENT_STREAM> {
  private readonly _object = new DelayedPromise<RESULT>();
  private readonly _usage = new DelayedPromise<LanguageModelUsage>();
  private readonly _providerMetadata = new DelayedPromise<
    ProviderMetadata | undefined
  >();
  private readonly _warnings = new DelayedPromise<CallWarning[] | undefined>();
  private readonly _request =
    new DelayedPromise<LanguageModelRequestMetadata>();
  private readonly _response =
    new DelayedPromise<LanguageModelResponseMetadata>();
  private readonly _finishReason = new DelayedPromise<FinishReason>();

  private readonly baseStream: ReadableStream<ObjectStreamPart<PARTIAL>>;

  private readonly outputStrategy: OutputStrategy<
    PARTIAL,
    RESULT,
    ELEMENT_STREAM
  >;

  constructor({
    model: modelArg,
    headers,
    telemetry,
    settings,
    maxRetries: maxRetriesArg,
    abortSignal,
    outputStrategy,
    system,
    prompt,
    messages,
    schemaName,
    schemaDescription,
    providerOptions,
    repairText,
    onError,
    onFinish,
    download,
    generateId,
    currentDate,
    now,
  }: {
    model: LanguageModel;
    telemetry: TelemetrySettings | undefined;
    headers: Record<string, string | undefined> | undefined;
    settings: Omit<CallSettings, 'abortSignal' | 'headers'>;
    maxRetries: number | undefined;
    abortSignal: AbortSignal | undefined;
    outputStrategy: OutputStrategy<PARTIAL, RESULT, ELEMENT_STREAM>;
    system: Prompt['system'];
    prompt: Prompt['prompt'];
    messages: Prompt['messages'];
    schemaName: string | undefined;
    schemaDescription: string | undefined;
    providerOptions: ProviderOptions | undefined;
    repairText: RepairTextFunction | undefined;
    onError: StreamObjectOnErrorCallback;
    onFinish: StreamObjectOnFinishCallback<RESULT> | undefined;
    download: DownloadFunction | undefined;
    generateId: () => string;
    currentDate: () => Date;
    now: () => number;
  }) {
    const model = resolveLanguageModel(modelArg);

    const { maxRetries, retry } = prepareRetries({
      maxRetries: maxRetriesArg,
      abortSignal,
    });

    const callSettings = prepareCallSettings(settings);

    const baseTelemetryAttributes = getBaseTelemetryAttributes({
      model,
      telemetry,
      headers,
      settings: { ...callSettings, maxRetries },
    });

    const tracer = getTracer(telemetry);
    const self = this;

    const stitchableStream =
      createStitchableStream<ObjectStreamPart<PARTIAL>>();

    const eventProcessor = new TransformStream<
      ObjectStreamPart<PARTIAL>,
      ObjectStreamPart<PARTIAL>
    >({
      transform(chunk, controller) {
        controller.enqueue(chunk);

        if (chunk.type === 'error') {
          onError({ error: wrapGatewayError(chunk.error) });
        }
      },
    });

    this.baseStream = stitchableStream.stream.pipeThrough(eventProcessor);

    recordSpan({
      name: 'ai.streamObject',
      attributes: selectTelemetryAttributes({
        telemetry,
        attributes: {
          ...assembleOperationName({
            operationId: 'ai.streamObject',
            telemetry,
          }),
          ...baseTelemetryAttributes,
          // specific settings that only make sense on the outer level:
          'ai.prompt': {
            input: () => JSON.stringify({ system, prompt, messages }),
          },
          'ai.schema': {
            input: async () =>
              JSON.stringify(await outputStrategy.jsonSchema()),
          },
          'ai.schema.name': schemaName,
          'ai.schema.description': schemaDescription,
          'ai.settings.output': outputStrategy.type,
        },
      }),
      tracer,
      endWhenDone: false,
      fn: async rootSpan => {
        const standardizedPrompt = await standardizePrompt({
          system,
          prompt,
          messages,
        } as Prompt);

        const callOptions = {
          responseFormat: {
            type: 'json' as const,
            schema: await outputStrategy.jsonSchema(),
            name: schemaName,
            description: schemaDescription,
          },
          ...prepareCallSettings(settings),
          prompt: await convertToLanguageModelPrompt({
            prompt: standardizedPrompt,
            supportedUrls: await model.supportedUrls,
            download,
          }),
          providerOptions,
          abortSignal,
          headers,
          includeRawChunks: false,
        };

        const transformer: Transformer<
          LanguageModelV3StreamPart,
          ObjectStreamInputPart
        > = {
          transform: (chunk, controller) => {
            switch (chunk.type) {
              case 'text-delta':
                controller.enqueue(chunk.delta);
                break;
              case 'response-metadata':
              case 'finish':
              case 'error':
              case 'stream-start':
                controller.enqueue(chunk);
                break;
            }
          },
        };

        const {
          result: { stream, response, request },
          doStreamSpan,
          startTimestampMs,
        } = await retry(() =>
          recordSpan({
            name: 'ai.streamObject.doStream',
            attributes: selectTelemetryAttributes({
              telemetry,
              attributes: {
                ...assembleOperationName({
                  operationId: 'ai.streamObject.doStream',
                  telemetry,
                }),
                ...baseTelemetryAttributes,
                'ai.prompt.messages': {
                  input: () => stringifyForTelemetry(callOptions.prompt),
                },

                // standardized gen-ai llm span attributes:
                'gen_ai.system': model.provider,
                'gen_ai.request.model': model.modelId,
                'gen_ai.request.frequency_penalty':
                  callSettings.frequencyPenalty,
                'gen_ai.request.max_tokens': callSettings.maxOutputTokens,
                'gen_ai.request.presence_penalty': callSettings.presencePenalty,
                'gen_ai.request.temperature': callSettings.temperature,
                'gen_ai.request.top_k': callSettings.topK,
                'gen_ai.request.top_p': callSettings.topP,
              },
            }),
            tracer,
            endWhenDone: false,
            fn: async doStreamSpan => ({
              startTimestampMs: now(),
              doStreamSpan,
              result: await model.doStream(callOptions),
            }),
          }),
        );

        self._request.resolve(request ?? {});

        // store information for onFinish callback:
        let warnings: SharedV3Warning[] | undefined;
        let usage: LanguageModelUsage = createNullLanguageModelUsage();
        let finishReason: FinishReason | undefined;
        let providerMetadata: ProviderMetadata | undefined;
        let object: RESULT | undefined;
        let error: unknown | undefined;

        // pipe chunks through a transformation stream that extracts metadata:
        let accumulatedText = '';
        let textDelta = '';
        let fullResponse: {
          id: string;
          timestamp: Date;
          modelId: string;
        } = {
          id: generateId(),
          timestamp: currentDate(),
          modelId: model.modelId,
        };

        // Keep track of raw parse result before type validation, since e.g. Zod might
        // change the object by mapping properties.
        let latestObjectJson: JSONValue | undefined = undefined;
        let latestObject: PARTIAL | undefined = undefined;
        let isFirstChunk = true;
        let isFirstDelta = true;

        const transformedStream = stream
          .pipeThrough(new TransformStream(transformer))
          .pipeThrough(
            new TransformStream<
              string | ObjectStreamInputPart,
              ObjectStreamPart<PARTIAL>
            >({
              async transform(chunk, controller): Promise<void> {
                if (
                  typeof chunk === 'object' &&
                  chunk.type === 'stream-start'
                ) {
                  warnings = chunk.warnings;
                  return; // stream start chunks are sent immediately and do not count as first chunk
                }

                // Telemetry event for first chunk:
                if (isFirstChunk) {
                  const msToFirstChunk = now() - startTimestampMs;

                  isFirstChunk = false;

                  doStreamSpan.addEvent('ai.stream.firstChunk', {
                    'ai.stream.msToFirstChunk': msToFirstChunk,
                  });

                  doStreamSpan.setAttributes({
                    'ai.stream.msToFirstChunk': msToFirstChunk,
                  });
                }

                // process partial text chunks
                if (typeof chunk === 'string') {
                  accumulatedText += chunk;
                  textDelta += chunk;

                  const { value: currentObjectJson, state: parseState } =
                    await parsePartialJson(accumulatedText);

                  if (
                    currentObjectJson !== undefined &&
                    !isDeepEqualData(latestObjectJson, currentObjectJson)
                  ) {
                    const validationResult =
                      await outputStrategy.validatePartialResult({
                        value: currentObjectJson,
                        textDelta,
                        latestObject,
                        isFirstDelta,
                        isFinalDelta: parseState === 'successful-parse',
                      });

                    if (
                      validationResult.success &&
                      !isDeepEqualData(
                        latestObject,
                        validationResult.value.partial,
                      )
                    ) {
                      // inside inner check to correctly parse the final element in array mode:
                      latestObjectJson = currentObjectJson;
                      latestObject = validationResult.value.partial;

                      controller.enqueue({
                        type: 'object',
                        object: latestObject,
                      });

                      controller.enqueue({
                        type: 'text-delta',
                        textDelta: validationResult.value.textDelta,
                      });

                      textDelta = '';
                      isFirstDelta = false;
                    }
                  }

                  return;
                }

                switch (chunk.type) {
                  case 'response-metadata': {
                    fullResponse = {
                      id: chunk.id ?? fullResponse.id,
                      timestamp: chunk.timestamp ?? fullResponse.timestamp,
                      modelId: chunk.modelId ?? fullResponse.modelId,
                    };
                    break;
                  }

                  case 'finish': {
                    // send final text delta:
                    if (textDelta !== '') {
                      controller.enqueue({ type: 'text-delta', textDelta });
                    }

                    // store finish reason for telemetry:
                    finishReason = chunk.finishReason.unified;

                    // store usage and metadata for promises and onFinish callback:
                    usage = asLanguageModelUsage(chunk.usage);
                    providerMetadata = chunk.providerMetadata;

                    controller.enqueue({
                      ...chunk,
                      finishReason: chunk.finishReason.unified,
                      usage,
                      response: fullResponse,
                    });

                    // log warnings:
                    logWarnings({
                      warnings: warnings ?? [],
                      provider: model.provider,
                      model: model.modelId,
                    });

                    // resolve promises that can be resolved now:
                    self._usage.resolve(usage);
                    self._providerMetadata.resolve(providerMetadata);
                    self._warnings.resolve(warnings);
                    self._response.resolve({
                      ...fullResponse,
                      headers: response?.headers,
                    });
                    self._finishReason.resolve(finishReason ?? 'other');

                    try {
                      object = await parseAndValidateObjectResultWithRepair(
                        accumulatedText,
                        outputStrategy,
                        repairText,
                        {
                          response: fullResponse,
                          usage,
                          finishReason,
                        },
                      );
                      self._object.resolve(object);
                    } catch (e) {
                      error = e;
                      self._object.reject(e);
                    }
                    break;
                  }

                  default: {
                    controller.enqueue(chunk);
                    break;
                  }
                }
              },

              // invoke onFinish callback and resolve toolResults promise when the stream is about to close:
              async flush(controller) {
                try {
                  const finalUsage = usage ?? {
                    promptTokens: NaN,
                    completionTokens: NaN,
                    totalTokens: NaN,
                  };

                  doStreamSpan.setAttributes(
                    await selectTelemetryAttributes({
                      telemetry,
                      attributes: {
                        'ai.response.finishReason': finishReason,
                        'ai.response.object': {
                          output: () => JSON.stringify(object),
                        },
                        'ai.response.id': fullResponse.id,
                        'ai.response.model': fullResponse.modelId,
                        'ai.response.timestamp':
                          fullResponse.timestamp.toISOString(),
                        'ai.response.providerMetadata':
                          JSON.stringify(providerMetadata),

                        'ai.usage.inputTokens': finalUsage.inputTokens,
                        'ai.usage.outputTokens': finalUsage.outputTokens,
                        'ai.usage.totalTokens': finalUsage.totalTokens,
                        'ai.usage.reasoningTokens': finalUsage.reasoningTokens,
                        'ai.usage.cachedInputTokens':
                          finalUsage.cachedInputTokens,

                        // standardized gen-ai llm span attributes:
                        'gen_ai.response.finish_reasons': [finishReason],
                        'gen_ai.response.id': fullResponse.id,
                        'gen_ai.response.model': fullResponse.modelId,
                        'gen_ai.usage.input_tokens': finalUsage.inputTokens,
                        'gen_ai.usage.output_tokens': finalUsage.outputTokens,
                      },
                    }),
                  );

                  // finish doStreamSpan before other operations for correct timing:
                  doStreamSpan.end();

                  // Add response information to the root span:
                  rootSpan.setAttributes(
                    await selectTelemetryAttributes({
                      telemetry,
                      attributes: {
                        'ai.usage.inputTokens': finalUsage.inputTokens,
                        'ai.usage.outputTokens': finalUsage.outputTokens,
                        'ai.usage.totalTokens': finalUsage.totalTokens,
                        'ai.usage.reasoningTokens': finalUsage.reasoningTokens,
                        'ai.usage.cachedInputTokens':
                          finalUsage.cachedInputTokens,
                        'ai.response.object': {
                          output: () => JSON.stringify(object),
                        },
                        'ai.response.providerMetadata':
                          JSON.stringify(providerMetadata),
                      },
                    }),
                  );

                  // call onFinish callback:
                  await onFinish?.({
                    usage: finalUsage,
                    object,
                    error,
                    response: {
                      ...fullResponse,
                      headers: response?.headers,
                    },
                    warnings,
                    providerMetadata,
                  });
                } catch (error) {
                  controller.enqueue({ type: 'error', error });
                } finally {
                  rootSpan.end();
                }
              },
            }),
          );

        stitchableStream.addStream(transformedStream);
      },
    })
      .catch(error => {
        // add an empty stream with an error to break the stream:
        stitchableStream.addStream(
          new ReadableStream({
            start(controller) {
              controller.enqueue({ type: 'error', error });
              controller.close();
            },
          }),
        );
      })
      .finally(() => {
        stitchableStream.close();
      });

    this.outputStrategy = outputStrategy;
  }

  get object() {
    return this._object.promise;
  }

  get usage() {
    return this._usage.promise;
  }

  get providerMetadata() {
    return this._providerMetadata.promise;
  }

  get warnings() {
    return this._warnings.promise;
  }

  get request() {
    return this._request.promise;
  }

  get response() {
    return this._response.promise;
  }

  get finishReason() {
    return this._finishReason.promise;
  }

  get partialObjectStream(): AsyncIterableStream<PARTIAL> {
    return createAsyncIterableStream(
      this.baseStream.pipeThrough(
        new TransformStream<ObjectStreamPart<PARTIAL>, PARTIAL>({
          transform(chunk, controller) {
            switch (chunk.type) {
              case 'object':
                controller.enqueue(chunk.object);
                break;

              case 'text-delta':
              case 'finish':
              case 'error': // suppress error (use onError instead)
                break;

              default: {
                const _exhaustiveCheck: never = chunk;
                throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
              }
            }
          },
        }),
      ),
    );
  }

  get elementStream(): ELEMENT_STREAM {
    return this.outputStrategy.createElementStream(this.baseStream);
  }

  get textStream(): AsyncIterableStream<string> {
    return createAsyncIterableStream(
      this.baseStream.pipeThrough(
        new TransformStream<ObjectStreamPart<PARTIAL>, string>({
          transform(chunk, controller) {
            switch (chunk.type) {
              case 'text-delta':
                controller.enqueue(chunk.textDelta);
                break;

              case 'object':
              case 'finish':
              case 'error': // suppress error (use onError instead)
                break;

              default: {
                const _exhaustiveCheck: never = chunk;
                throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
              }
            }
          },
        }),
      ),
    );
  }

  get fullStream(): AsyncIterableStream<ObjectStreamPart<PARTIAL>> {
    return createAsyncIterableStream(this.baseStream);
  }

  pipeTextStreamToResponse(response: ServerResponse, init?: ResponseInit) {
    pipeTextStreamToResponse({
      response,
      textStream: this.textStream,
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

export type ObjectStreamInputPart =
  | string
  | {
      type: 'stream-start';
      warnings: SharedV3Warning[];
    }
  | {
      type: 'error';
      error: unknown;
    }
  | {
      type: 'response-metadata';
      id?: string;
      timestamp?: Date;
      modelId?: string;
    }
  | {
      type: 'finish';
      finishReason: LanguageModelV3FinishReason;
      usage: LanguageModelV3Usage;
      providerMetadata?: SharedV3ProviderMetadata;
    };
