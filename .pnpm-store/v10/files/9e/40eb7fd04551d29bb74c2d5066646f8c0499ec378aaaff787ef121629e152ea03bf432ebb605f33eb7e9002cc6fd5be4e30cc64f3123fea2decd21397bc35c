import {
  APICallError,
  InvalidResponseDataError,
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  SharedV3ProviderMetadata,
  SharedV3Warning,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonErrorResponseHandler,
  createJsonResponseHandler,
  FetchFunction,
  generateId,
  isParsableJson,
  parseProviderOptions,
  ParseResult,
  postJsonToApi,
  ResponseHandler,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import {
  defaultOpenAICompatibleErrorStructure,
  ProviderErrorStructure,
} from '../openai-compatible-error';
import { convertOpenAICompatibleChatUsage } from './convert-openai-compatible-chat-usage';
import { convertToOpenAICompatibleChatMessages } from './convert-to-openai-compatible-chat-messages';
import { getResponseMetadata } from './get-response-metadata';
import { mapOpenAICompatibleFinishReason } from './map-openai-compatible-finish-reason';
import {
  OpenAICompatibleChatModelId,
  openaiCompatibleLanguageModelChatOptions,
} from './openai-compatible-chat-options';
import { MetadataExtractor } from './openai-compatible-metadata-extractor';
import { prepareTools } from './openai-compatible-prepare-tools';

export type OpenAICompatibleChatConfig = {
  provider: string;
  headers: () => Record<string, string | undefined>;
  url: (options: { modelId: string; path: string }) => string;
  fetch?: FetchFunction;
  includeUsage?: boolean;
  errorStructure?: ProviderErrorStructure<any>;
  metadataExtractor?: MetadataExtractor;

  /**
   * Whether the model supports structured outputs.
   */
  supportsStructuredOutputs?: boolean;

  /**
   * The supported URLs for the model.
   */
  supportedUrls?: () => LanguageModelV3['supportedUrls'];

  /**
   * Optional function to transform the request body before sending it to the API.
   * This is useful for proxy providers that may require a different request format
   * than the official OpenAI API.
   */
  transformRequestBody?: (args: Record<string, any>) => Record<string, any>;
};

export class OpenAICompatibleChatLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3';

  readonly supportsStructuredOutputs: boolean;

  readonly modelId: OpenAICompatibleChatModelId;
  private readonly config: OpenAICompatibleChatConfig;
  private readonly failedResponseHandler: ResponseHandler<APICallError>;
  private readonly chunkSchema; // type inferred via constructor

  constructor(
    modelId: OpenAICompatibleChatModelId,
    config: OpenAICompatibleChatConfig,
  ) {
    this.modelId = modelId;
    this.config = config;

    // initialize error handling:
    const errorStructure =
      config.errorStructure ?? defaultOpenAICompatibleErrorStructure;
    this.chunkSchema = createOpenAICompatibleChatChunkSchema(
      errorStructure.errorSchema,
    );
    this.failedResponseHandler = createJsonErrorResponseHandler(errorStructure);

    this.supportsStructuredOutputs = config.supportsStructuredOutputs ?? false;
  }

  get provider(): string {
    return this.config.provider;
  }

  private get providerOptionsName(): string {
    return this.config.provider.split('.')[0].trim();
  }

  get supportedUrls() {
    return this.config.supportedUrls?.() ?? {};
  }

  private transformRequestBody(args: Record<string, any>): Record<string, any> {
    return this.config.transformRequestBody?.(args) ?? args;
  }

  private async getArgs({
    prompt,
    maxOutputTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    providerOptions,
    stopSequences,
    responseFormat,
    seed,
    toolChoice,
    tools,
  }: LanguageModelV3CallOptions) {
    const warnings: SharedV3Warning[] = [];

    // Parse provider options - check for deprecated 'openai-compatible' key
    const deprecatedOptions = await parseProviderOptions({
      provider: 'openai-compatible',
      providerOptions,
      schema: openaiCompatibleLanguageModelChatOptions,
    });

    if (deprecatedOptions != null) {
      warnings.push({
        type: 'other',
        message: `The 'openai-compatible' key in providerOptions is deprecated. Use 'openaiCompatible' instead.`,
      });
    }

    const compatibleOptions = Object.assign(
      deprecatedOptions ?? {},
      (await parseProviderOptions({
        provider: 'openaiCompatible',
        providerOptions,
        schema: openaiCompatibleLanguageModelChatOptions,
      })) ?? {},
      (await parseProviderOptions({
        provider: this.providerOptionsName,
        providerOptions,
        schema: openaiCompatibleLanguageModelChatOptions,
      })) ?? {},
    );

    const strictJsonSchema = compatibleOptions?.strictJsonSchema ?? true;

    if (topK != null) {
      warnings.push({ type: 'unsupported', feature: 'topK' });
    }

    if (
      responseFormat?.type === 'json' &&
      responseFormat.schema != null &&
      !this.supportsStructuredOutputs
    ) {
      warnings.push({
        type: 'unsupported',
        feature: 'responseFormat',
        details:
          'JSON response format schema is only supported with structuredOutputs',
      });
    }

    const {
      tools: openaiTools,
      toolChoice: openaiToolChoice,
      toolWarnings,
    } = prepareTools({
      tools,
      toolChoice,
    });

    return {
      args: {
        // model id:
        model: this.modelId,

        // model specific settings:
        user: compatibleOptions.user,

        // standardized settings:
        max_tokens: maxOutputTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        response_format:
          responseFormat?.type === 'json'
            ? this.supportsStructuredOutputs === true &&
              responseFormat.schema != null
              ? {
                  type: 'json_schema',
                  json_schema: {
                    schema: responseFormat.schema,
                    strict: strictJsonSchema,
                    name: responseFormat.name ?? 'response',
                    description: responseFormat.description,
                  },
                }
              : { type: 'json_object' }
            : undefined,

        stop: stopSequences,
        seed,
        ...Object.fromEntries(
          Object.entries(
            providerOptions?.[this.providerOptionsName] ?? {},
          ).filter(
            ([key]) =>
              !Object.keys(
                openaiCompatibleLanguageModelChatOptions.shape,
              ).includes(key),
          ),
        ),

        reasoning_effort: compatibleOptions.reasoningEffort,
        verbosity: compatibleOptions.textVerbosity,

        // messages:
        messages: convertToOpenAICompatibleChatMessages(prompt),

        // tools:
        tools: openaiTools,
        tool_choice: openaiToolChoice,
      },
      warnings: [...warnings, ...toolWarnings],
    };
  }

  async doGenerate(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3GenerateResult> {
    const { args, warnings } = await this.getArgs({ ...options });

    const transformedBody = this.transformRequestBody(args);
    const body = JSON.stringify(transformedBody);

    const {
      responseHeaders,
      value: responseBody,
      rawValue: rawResponse,
    } = await postJsonToApi({
      url: this.config.url({
        path: '/chat/completions',
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: transformedBody,
      failedResponseHandler: this.failedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        OpenAICompatibleChatResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const choice = responseBody.choices[0];
    const content: Array<LanguageModelV3Content> = [];

    // text content:
    const text = choice.message.content;
    if (text != null && text.length > 0) {
      content.push({ type: 'text', text });
    }

    // reasoning content:
    const reasoning =
      choice.message.reasoning_content ?? choice.message.reasoning;
    if (reasoning != null && reasoning.length > 0) {
      content.push({
        type: 'reasoning',
        text: reasoning,
      });
    }

    // tool calls:
    if (choice.message.tool_calls != null) {
      for (const toolCall of choice.message.tool_calls) {
        const thoughtSignature =
          toolCall.extra_content?.google?.thought_signature;
        content.push({
          type: 'tool-call',
          toolCallId: toolCall.id ?? generateId(),
          toolName: toolCall.function.name,
          input: toolCall.function.arguments!,
          ...(thoughtSignature
            ? {
                providerMetadata: {
                  [this.providerOptionsName]: { thoughtSignature },
                },
              }
            : {}),
        });
      }
    }

    // provider metadata:
    const providerMetadata: SharedV3ProviderMetadata = {
      [this.providerOptionsName]: {},
      ...(await this.config.metadataExtractor?.extractMetadata?.({
        parsedBody: rawResponse,
      })),
    };
    const completionTokenDetails =
      responseBody.usage?.completion_tokens_details;
    if (completionTokenDetails?.accepted_prediction_tokens != null) {
      providerMetadata[this.providerOptionsName].acceptedPredictionTokens =
        completionTokenDetails?.accepted_prediction_tokens;
    }
    if (completionTokenDetails?.rejected_prediction_tokens != null) {
      providerMetadata[this.providerOptionsName].rejectedPredictionTokens =
        completionTokenDetails?.rejected_prediction_tokens;
    }

    return {
      content,
      finishReason: {
        unified: mapOpenAICompatibleFinishReason(choice.finish_reason),
        raw: choice.finish_reason ?? undefined,
      },
      usage: convertOpenAICompatibleChatUsage(responseBody.usage),
      providerMetadata,
      request: { body },
      response: {
        ...getResponseMetadata(responseBody),
        headers: responseHeaders,
        body: rawResponse,
      },
      warnings,
    };
  }

  async doStream(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3StreamResult> {
    const { args, warnings } = await this.getArgs({ ...options });

    const body = this.transformRequestBody({
      ...args,
      stream: true,

      // only include stream_options when in strict compatibility mode:
      stream_options: this.config.includeUsage
        ? { include_usage: true }
        : undefined,
    });

    const metadataExtractor =
      this.config.metadataExtractor?.createStreamExtractor();

    const { responseHeaders, value: response } = await postJsonToApi({
      url: this.config.url({
        path: '/chat/completions',
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: this.failedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        this.chunkSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const toolCalls: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
      hasFinished: boolean;
      thoughtSignature?: string;
    }> = [];

    let finishReason: LanguageModelV3FinishReason = {
      unified: 'other',
      raw: undefined,
    };
    let usage: z.infer<typeof openaiCompatibleTokenUsageSchema> | undefined =
      undefined;
    let isFirstChunk = true;
    const providerOptionsName = this.providerOptionsName;
    let isActiveReasoning = false;
    let isActiveText = false;

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof this.chunkSchema>>,
          LanguageModelV3StreamPart
        >({
          start(controller) {
            controller.enqueue({ type: 'stream-start', warnings });
          },

          transform(chunk, controller) {
            // Emit raw chunk if requested (before anything else)
            if (options.includeRawChunks) {
              controller.enqueue({ type: 'raw', rawValue: chunk.rawValue });
            }

            // handle failed chunk parsing / validation:
            if (!chunk.success) {
              finishReason = { unified: 'error', raw: undefined };
              controller.enqueue({ type: 'error', error: chunk.error });
              return;
            }

            metadataExtractor?.processChunk(chunk.rawValue);

            // handle error chunks:
            if ('error' in chunk.value) {
              finishReason = { unified: 'error', raw: undefined };
              controller.enqueue({
                type: 'error',
                error: chunk.value.error.message,
              });
              return;
            }

            // TODO we lost type safety on Chunk, most likely due to the error schema. MUST FIX
            // remove this workaround when the issue is fixed
            const value = chunk.value as z.infer<typeof chunkBaseSchema>;

            if (isFirstChunk) {
              isFirstChunk = false;

              controller.enqueue({
                type: 'response-metadata',
                ...getResponseMetadata(value),
              });
            }

            if (value.usage != null) {
              usage = value.usage;
            }

            const choice = value.choices[0];

            if (choice?.finish_reason != null) {
              finishReason = {
                unified: mapOpenAICompatibleFinishReason(choice.finish_reason),
                raw: choice.finish_reason ?? undefined,
              };
            }

            if (choice?.delta == null) {
              return;
            }

            const delta = choice.delta;

            // enqueue reasoning before text deltas:
            const reasoningContent = delta.reasoning_content ?? delta.reasoning;
            if (reasoningContent) {
              if (!isActiveReasoning) {
                controller.enqueue({
                  type: 'reasoning-start',
                  id: 'reasoning-0',
                });
                isActiveReasoning = true;
              }

              controller.enqueue({
                type: 'reasoning-delta',
                id: 'reasoning-0',
                delta: reasoningContent,
              });
            }

            if (delta.content) {
              // end active reasoning block before text starts
              if (isActiveReasoning) {
                controller.enqueue({
                  type: 'reasoning-end',
                  id: 'reasoning-0',
                });
                isActiveReasoning = false;
              }

              if (!isActiveText) {
                controller.enqueue({ type: 'text-start', id: 'txt-0' });
                isActiveText = true;
              }

              controller.enqueue({
                type: 'text-delta',
                id: 'txt-0',
                delta: delta.content,
              });
            }

            if (delta.tool_calls != null) {
              // end active reasoning block before tool calls start
              if (isActiveReasoning) {
                controller.enqueue({
                  type: 'reasoning-end',
                  id: 'reasoning-0',
                });
                isActiveReasoning = false;
              }

              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index ?? toolCalls.length;

                if (toolCalls[index] == null) {
                  if (toolCallDelta.id == null) {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'id' to be a string.`,
                    });
                  }

                  if (toolCallDelta.function?.name == null) {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function.name' to be a string.`,
                    });
                  }

                  controller.enqueue({
                    type: 'tool-input-start',
                    id: toolCallDelta.id,
                    toolName: toolCallDelta.function.name,
                  });

                  toolCalls[index] = {
                    id: toolCallDelta.id,
                    type: 'function',
                    function: {
                      name: toolCallDelta.function.name,
                      arguments: toolCallDelta.function.arguments ?? '',
                    },
                    hasFinished: false,
                    thoughtSignature:
                      toolCallDelta.extra_content?.google?.thought_signature ??
                      undefined,
                  };

                  const toolCall = toolCalls[index];

                  if (
                    toolCall.function?.name != null &&
                    toolCall.function?.arguments != null
                  ) {
                    // send delta if the argument text has already started:
                    if (toolCall.function.arguments.length > 0) {
                      controller.enqueue({
                        type: 'tool-input-delta',
                        id: toolCall.id,
                        delta: toolCall.function.arguments,
                      });
                    }

                    // check if tool call is complete
                    // (some providers send the full tool call in one chunk):
                    if (isParsableJson(toolCall.function.arguments)) {
                      controller.enqueue({
                        type: 'tool-input-end',
                        id: toolCall.id,
                      });

                      controller.enqueue({
                        type: 'tool-call',
                        toolCallId: toolCall.id ?? generateId(),
                        toolName: toolCall.function.name,
                        input: toolCall.function.arguments,
                        ...(toolCall.thoughtSignature
                          ? {
                              providerMetadata: {
                                [providerOptionsName]: {
                                  thoughtSignature: toolCall.thoughtSignature,
                                },
                              },
                            }
                          : {}),
                      });
                      toolCall.hasFinished = true;
                    }
                  }

                  continue;
                }

                // existing tool call, merge if not finished
                const toolCall = toolCalls[index];

                if (toolCall.hasFinished) {
                  continue;
                }

                if (toolCallDelta.function?.arguments != null) {
                  toolCall.function!.arguments +=
                    toolCallDelta.function?.arguments ?? '';
                }

                // send delta
                controller.enqueue({
                  type: 'tool-input-delta',
                  id: toolCall.id,
                  delta: toolCallDelta.function.arguments ?? '',
                });

                // check if tool call is complete
                if (
                  toolCall.function?.name != null &&
                  toolCall.function?.arguments != null &&
                  isParsableJson(toolCall.function.arguments)
                ) {
                  controller.enqueue({
                    type: 'tool-input-end',
                    id: toolCall.id,
                  });

                  controller.enqueue({
                    type: 'tool-call',
                    toolCallId: toolCall.id ?? generateId(),
                    toolName: toolCall.function.name,
                    input: toolCall.function.arguments,
                    ...(toolCall.thoughtSignature
                      ? {
                          providerMetadata: {
                            [providerOptionsName]: {
                              thoughtSignature: toolCall.thoughtSignature,
                            },
                          },
                        }
                      : {}),
                  });
                  toolCall.hasFinished = true;
                }
              }
            }
          },

          flush(controller) {
            if (isActiveReasoning) {
              controller.enqueue({ type: 'reasoning-end', id: 'reasoning-0' });
            }

            if (isActiveText) {
              controller.enqueue({ type: 'text-end', id: 'txt-0' });
            }

            // go through all tool calls and send the ones that are not finished
            for (const toolCall of toolCalls.filter(
              toolCall => !toolCall.hasFinished,
            )) {
              controller.enqueue({
                type: 'tool-input-end',
                id: toolCall.id,
              });

              controller.enqueue({
                type: 'tool-call',
                toolCallId: toolCall.id ?? generateId(),
                toolName: toolCall.function.name,
                input: toolCall.function.arguments,
                ...(toolCall.thoughtSignature
                  ? {
                      providerMetadata: {
                        [providerOptionsName]: {
                          thoughtSignature: toolCall.thoughtSignature,
                        },
                      },
                    }
                  : {}),
              });
            }

            const providerMetadata: SharedV3ProviderMetadata = {
              [providerOptionsName]: {},
              ...metadataExtractor?.buildMetadata(),
            };
            if (
              usage?.completion_tokens_details?.accepted_prediction_tokens !=
              null
            ) {
              providerMetadata[providerOptionsName].acceptedPredictionTokens =
                usage?.completion_tokens_details?.accepted_prediction_tokens;
            }
            if (
              usage?.completion_tokens_details?.rejected_prediction_tokens !=
              null
            ) {
              providerMetadata[providerOptionsName].rejectedPredictionTokens =
                usage?.completion_tokens_details?.rejected_prediction_tokens;
            }

            controller.enqueue({
              type: 'finish',
              finishReason,
              usage: convertOpenAICompatibleChatUsage(usage),
              providerMetadata,
            });
          },
        }),
      ),
      request: { body },
      response: { headers: responseHeaders },
    };
  }
}

const openaiCompatibleTokenUsageSchema = z
  .looseObject({
    prompt_tokens: z.number().nullish(),
    completion_tokens: z.number().nullish(),
    total_tokens: z.number().nullish(),
    prompt_tokens_details: z
      .object({
        cached_tokens: z.number().nullish(),
      })
      .nullish(),
    completion_tokens_details: z
      .object({
        reasoning_tokens: z.number().nullish(),
        accepted_prediction_tokens: z.number().nullish(),
        rejected_prediction_tokens: z.number().nullish(),
      })
      .nullish(),
  })
  .nullish();

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const OpenAICompatibleChatResponseSchema = z.looseObject({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.literal('assistant').nullish(),
        content: z.string().nullish(),
        reasoning_content: z.string().nullish(),
        reasoning: z.string().nullish(),
        tool_calls: z
          .array(
            z.object({
              id: z.string().nullish(),
              function: z.object({
                name: z.string(),
                arguments: z.string(),
              }),
              // Support for Google Gemini thought signatures via OpenAI compatibility
              extra_content: z
                .object({
                  google: z
                    .object({
                      thought_signature: z.string().nullish(),
                    })
                    .nullish(),
                })
                .nullish(),
            }),
          )
          .nullish(),
      }),
      finish_reason: z.string().nullish(),
    }),
  ),
  usage: openaiCompatibleTokenUsageSchema,
});

const chunkBaseSchema = z.looseObject({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z.array(
    z.object({
      delta: z
        .object({
          role: z.enum(['assistant']).nullish(),
          content: z.string().nullish(),
          // Most openai-compatible models set `reasoning_content`, but some
          // providers serving `gpt-oss` set `reasoning`. See #7866
          reasoning_content: z.string().nullish(),
          reasoning: z.string().nullish(),
          tool_calls: z
            .array(
              z.object({
                index: z.number().nullish(), //google does not send index
                id: z.string().nullish(),
                function: z.object({
                  name: z.string().nullish(),
                  arguments: z.string().nullish(),
                }),
                // Support for Google Gemini thought signatures via OpenAI compatibility
                extra_content: z
                  .object({
                    google: z
                      .object({
                        thought_signature: z.string().nullish(),
                      })
                      .nullish(),
                  })
                  .nullish(),
              }),
            )
            .nullish(),
        })
        .nullish(),
      finish_reason: z.string().nullish(),
    }),
  ),
  usage: openaiCompatibleTokenUsageSchema,
});

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const createOpenAICompatibleChatChunkSchema = <
  ERROR_SCHEMA extends z.core.$ZodType,
>(
  errorSchema: ERROR_SCHEMA,
) => z.union([chunkBaseSchema, errorSchema]);
