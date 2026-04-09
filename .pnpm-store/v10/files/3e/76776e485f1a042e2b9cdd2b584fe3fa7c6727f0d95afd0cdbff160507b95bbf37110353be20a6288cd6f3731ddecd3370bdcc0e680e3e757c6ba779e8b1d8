import {
  APICallError,
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  LanguageModelV3Usage,
  SharedV3Warning,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  extractResponseHeaders,
  FetchFunction,
  parseProviderOptions,
  ParseResult,
  postJsonToApi,
  safeParseJSON,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import { convertToXaiChatMessages } from './convert-to-xai-chat-messages';
import { convertXaiChatUsage } from './convert-xai-chat-usage';
import { getResponseMetadata } from './get-response-metadata';
import { mapXaiFinishReason } from './map-xai-finish-reason';
import {
  XaiChatModelId,
  xaiLanguageModelChatOptions,
} from './xai-chat-options';
import { xaiFailedResponseHandler } from './xai-error';
import { prepareTools } from './xai-prepare-tools';

type XaiChatConfig = {
  provider: string;
  baseURL: string | undefined;
  headers: () => Record<string, string | undefined>;
  generateId: () => string;
  fetch?: FetchFunction;
};

export class XaiChatLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3';

  readonly modelId: XaiChatModelId;

  private readonly config: XaiChatConfig;

  constructor(modelId: XaiChatModelId, config: XaiChatConfig) {
    this.modelId = modelId;
    this.config = config;
  }

  get provider(): string {
    return this.config.provider;
  }

  readonly supportedUrls: Record<string, RegExp[]> = {
    'image/*': [/^https?:\/\/.*$/],
  };

  private async getArgs({
    prompt,
    maxOutputTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    seed,
    responseFormat,
    providerOptions,
    tools,
    toolChoice,
  }: LanguageModelV3CallOptions) {
    const warnings: SharedV3Warning[] = [];

    // parse xai-specific provider options
    const options =
      (await parseProviderOptions({
        provider: 'xai',
        providerOptions,
        schema: xaiLanguageModelChatOptions,
      })) ?? {};

    // check for unsupported parameters
    if (topK != null) {
      warnings.push({ type: 'unsupported', feature: 'topK' });
    }

    if (frequencyPenalty != null) {
      warnings.push({ type: 'unsupported', feature: 'frequencyPenalty' });
    }

    if (presencePenalty != null) {
      warnings.push({ type: 'unsupported', feature: 'presencePenalty' });
    }

    if (stopSequences != null) {
      warnings.push({ type: 'unsupported', feature: 'stopSequences' });
    }

    // convert ai sdk messages to xai format
    const { messages, warnings: messageWarnings } =
      convertToXaiChatMessages(prompt);
    warnings.push(...messageWarnings);

    // prepare tools for xai
    const {
      tools: xaiTools,
      toolChoice: xaiToolChoice,
      toolWarnings,
    } = prepareTools({
      tools,
      toolChoice,
    });
    warnings.push(...toolWarnings);

    const baseArgs = {
      // model id
      model: this.modelId,

      // standard generation settings
      logprobs:
        options.logprobs === true || options.topLogprobs != null
          ? true
          : undefined,
      top_logprobs: options.topLogprobs,
      max_completion_tokens: maxOutputTokens,
      temperature,
      top_p: topP,
      seed,
      reasoning_effort: options.reasoningEffort,

      // parallel function calling
      parallel_function_calling: options.parallel_function_calling,

      // response format
      response_format:
        responseFormat?.type === 'json'
          ? responseFormat.schema != null
            ? {
                type: 'json_schema',
                json_schema: {
                  name: responseFormat.name ?? 'response',
                  schema: responseFormat.schema,
                  strict: true,
                },
              }
            : { type: 'json_object' }
          : undefined,

      // search parameters
      search_parameters: options.searchParameters
        ? {
            mode: options.searchParameters.mode,
            return_citations: options.searchParameters.returnCitations,
            from_date: options.searchParameters.fromDate,
            to_date: options.searchParameters.toDate,
            max_search_results: options.searchParameters.maxSearchResults,
            sources: options.searchParameters.sources?.map(source => ({
              type: source.type,
              ...(source.type === 'web' && {
                country: source.country,
                excluded_websites: source.excludedWebsites,
                allowed_websites: source.allowedWebsites,
                safe_search: source.safeSearch,
              }),
              ...(source.type === 'x' && {
                excluded_x_handles: source.excludedXHandles,
                included_x_handles: source.includedXHandles ?? source.xHandles,
                post_favorite_count: source.postFavoriteCount,
                post_view_count: source.postViewCount,
              }),
              ...(source.type === 'news' && {
                country: source.country,
                excluded_websites: source.excludedWebsites,
                safe_search: source.safeSearch,
              }),
              ...(source.type === 'rss' && {
                links: source.links,
              }),
            })),
          }
        : undefined,

      // messages in xai format
      messages,

      // tools in xai format
      tools: xaiTools,
      tool_choice: xaiToolChoice,
    };

    return {
      args: baseArgs,
      warnings,
    };
  }

  async doGenerate(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3GenerateResult> {
    const { args: body, warnings } = await this.getArgs(options);

    const url = `${this.config.baseURL ?? 'https://api.x.ai/v1'}/chat/completions`;

    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse,
    } = await postJsonToApi({
      url,
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        xaiChatResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    if (response.error != null) {
      throw new APICallError({
        message: response.error,
        url,
        requestBodyValues: body,
        statusCode: 200,
        responseHeaders,
        responseBody: JSON.stringify(rawResponse),
        isRetryable: response.code === 'The service is currently unavailable',
      });
    }

    const choice = response.choices![0];
    const content: Array<LanguageModelV3Content> = [];

    // extract text content
    if (choice.message.content != null && choice.message.content.length > 0) {
      let text = choice.message.content;

      // skip if this content duplicates the last assistant message
      const lastMessage = body.messages[body.messages.length - 1];
      if (lastMessage?.role === 'assistant' && text === lastMessage.content) {
        text = '';
      }

      if (text.length > 0) {
        content.push({ type: 'text', text });
      }
    }

    // extract reasoning content
    if (
      choice.message.reasoning_content != null &&
      choice.message.reasoning_content.length > 0
    ) {
      content.push({
        type: 'reasoning',
        text: choice.message.reasoning_content,
      });
    }

    // extract tool calls
    if (choice.message.tool_calls != null) {
      for (const toolCall of choice.message.tool_calls) {
        content.push({
          type: 'tool-call',
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          input: toolCall.function.arguments,
        });
      }
    }

    // extract citations
    if (response.citations != null) {
      for (const url of response.citations) {
        content.push({
          type: 'source',
          sourceType: 'url',
          id: this.config.generateId(),
          url,
        });
      }
    }

    return {
      content,
      finishReason: {
        unified: mapXaiFinishReason(choice.finish_reason),
        raw: choice.finish_reason ?? undefined,
      },
      usage: response.usage
        ? convertXaiChatUsage(response.usage)
        : {
            inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 0, text: 0, reasoning: 0 },
          },
      request: { body },
      response: {
        ...getResponseMetadata(response),
        headers: responseHeaders,
        body: rawResponse,
      },
      warnings,
    };
  }

  async doStream(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3StreamResult> {
    const { args, warnings } = await this.getArgs(options);
    const body = {
      ...args,
      stream: true,
      stream_options: {
        include_usage: true,
      },
    };

    const url = `${this.config.baseURL ?? 'https://api.x.ai/v1'}/chat/completions`;

    const { responseHeaders, value: response } = await postJsonToApi({
      url,
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: async ({ response }) => {
        const responseHeaders = extractResponseHeaders(response);
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          const responseBody = await response.text();
          const parsedError = await safeParseJSON({
            text: responseBody,
            schema: xaiStreamErrorSchema,
          });

          if (parsedError.success) {
            throw new APICallError({
              message: parsedError.value.error,
              url,
              requestBodyValues: body,
              statusCode: 200,
              responseHeaders,
              responseBody,
              isRetryable:
                parsedError.value.code ===
                'The service is currently unavailable',
            });
          }

          throw new APICallError({
            message: 'Invalid JSON response',
            url,
            requestBodyValues: body,
            statusCode: 200,
            responseHeaders,
            responseBody,
          });
        }

        return createEventSourceResponseHandler(xaiChatChunkSchema)({
          response,
          url,
          requestBodyValues: body,
        });
      },
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    let finishReason: LanguageModelV3FinishReason = {
      unified: 'other',
      raw: undefined,
    };
    let usage: LanguageModelV3Usage | undefined = undefined;
    let isFirstChunk = true;
    const contentBlocks: Record<
      string,
      { type: 'text' | 'reasoning'; ended: boolean }
    > = {};
    const lastReasoningDeltas: Record<string, string> = {};
    let activeReasoningBlockId: string | undefined = undefined;

    const self = this;

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof xaiChatChunkSchema>>,
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

            if (!chunk.success) {
              controller.enqueue({ type: 'error', error: chunk.error });
              return;
            }

            const value = chunk.value;

            // emit response metadata on first chunk
            if (isFirstChunk) {
              controller.enqueue({
                type: 'response-metadata',
                ...getResponseMetadata(value),
              });
              isFirstChunk = false;
            }

            // emit citations if present (they come in the last chunk according to docs)
            if (value.citations != null) {
              for (const url of value.citations) {
                controller.enqueue({
                  type: 'source',
                  sourceType: 'url',
                  id: self.config.generateId(),
                  url,
                });
              }
            }

            // update usage if present
            if (value.usage != null) {
              usage = convertXaiChatUsage(value.usage);
            }

            const choice = value.choices[0];

            // update finish reason if present
            if (choice?.finish_reason != null) {
              finishReason = {
                unified: mapXaiFinishReason(choice.finish_reason),
                raw: choice.finish_reason,
              };
            }

            // exit if no delta to process
            if (choice?.delta == null) {
              return;
            }

            const delta = choice.delta;
            const choiceIndex = choice.index;

            // process text content
            if (delta.content != null && delta.content.length > 0) {
              const textContent = delta.content;

              // end active reasoning block when text content arrives
              if (
                activeReasoningBlockId != null &&
                !contentBlocks[activeReasoningBlockId].ended
              ) {
                controller.enqueue({
                  type: 'reasoning-end',
                  id: activeReasoningBlockId,
                });
                contentBlocks[activeReasoningBlockId].ended = true;
                activeReasoningBlockId = undefined;
              }

              // skip if this content duplicates the last assistant message
              const lastMessage = body.messages[body.messages.length - 1];
              if (
                lastMessage?.role === 'assistant' &&
                textContent === lastMessage.content
              ) {
                return;
              }

              const blockId = `text-${value.id || choiceIndex}`;

              if (contentBlocks[blockId] == null) {
                contentBlocks[blockId] = { type: 'text', ended: false };
                controller.enqueue({
                  type: 'text-start',
                  id: blockId,
                });
              }

              controller.enqueue({
                type: 'text-delta',
                id: blockId,
                delta: textContent,
              });
            }

            // process reasoning content
            if (
              delta.reasoning_content != null &&
              delta.reasoning_content.length > 0
            ) {
              const blockId = `reasoning-${value.id || choiceIndex}`;

              // skip if this reasoning content duplicates the last delta
              if (lastReasoningDeltas[blockId] === delta.reasoning_content) {
                return;
              }
              lastReasoningDeltas[blockId] = delta.reasoning_content;

              if (contentBlocks[blockId] == null) {
                contentBlocks[blockId] = { type: 'reasoning', ended: false };
                activeReasoningBlockId = blockId;
                controller.enqueue({
                  type: 'reasoning-start',
                  id: blockId,
                });
              }

              controller.enqueue({
                type: 'reasoning-delta',
                id: blockId,
                delta: delta.reasoning_content,
              });
            }

            // process tool calls
            if (delta.tool_calls != null) {
              // end active reasoning block before tool calls start
              if (
                activeReasoningBlockId != null &&
                !contentBlocks[activeReasoningBlockId].ended
              ) {
                controller.enqueue({
                  type: 'reasoning-end',
                  id: activeReasoningBlockId,
                });
                contentBlocks[activeReasoningBlockId].ended = true;
                activeReasoningBlockId = undefined;
              }

              for (const toolCall of delta.tool_calls) {
                // xai tool calls come in one piece (like mistral)
                const toolCallId = toolCall.id;

                controller.enqueue({
                  type: 'tool-input-start',
                  id: toolCallId,
                  toolName: toolCall.function.name,
                });

                controller.enqueue({
                  type: 'tool-input-delta',
                  id: toolCallId,
                  delta: toolCall.function.arguments,
                });

                controller.enqueue({
                  type: 'tool-input-end',
                  id: toolCallId,
                });

                controller.enqueue({
                  type: 'tool-call',
                  toolCallId,
                  toolName: toolCall.function.name,
                  input: toolCall.function.arguments,
                });
              }
            }
          },

          flush(controller) {
            // end any blocks that haven't been ended yet
            for (const [blockId, block] of Object.entries(contentBlocks)) {
              if (!block.ended) {
                controller.enqueue({
                  type: block.type === 'text' ? 'text-end' : 'reasoning-end',
                  id: blockId,
                });
              }
            }

            controller.enqueue({
              type: 'finish',
              finishReason,
              usage: usage ?? {
                inputTokens: {
                  total: 0,
                  noCache: 0,
                  cacheRead: 0,
                  cacheWrite: 0,
                },
                outputTokens: { total: 0, text: 0, reasoning: 0 },
              },
            });
          },
        }),
      ),
      request: { body },
      response: { headers: responseHeaders },
    };
  }
}

// XAI API Response Schemas
const xaiUsageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
  prompt_tokens_details: z
    .object({
      text_tokens: z.number().nullish(),
      audio_tokens: z.number().nullish(),
      image_tokens: z.number().nullish(),
      cached_tokens: z.number().nullish(),
    })
    .nullish(),
  completion_tokens_details: z
    .object({
      reasoning_tokens: z.number().nullish(),
      audio_tokens: z.number().nullish(),
      accepted_prediction_tokens: z.number().nullish(),
      rejected_prediction_tokens: z.number().nullish(),
    })
    .nullish(),
});

export type XaiChatUsage = z.infer<typeof xaiUsageSchema>;

const xaiChatResponseSchema = z.object({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z
    .array(
      z.object({
        message: z.object({
          role: z.literal('assistant'),
          content: z.string().nullish(),
          reasoning_content: z.string().nullish(),
          tool_calls: z
            .array(
              z.object({
                id: z.string(),
                type: z.literal('function'),
                function: z.object({
                  name: z.string(),
                  arguments: z.string(),
                }),
              }),
            )
            .nullish(),
        }),
        index: z.number(),
        finish_reason: z.string().nullish(),
      }),
    )
    .nullish(),
  object: z.literal('chat.completion').nullish(),
  usage: xaiUsageSchema.nullish(),
  citations: z.array(z.string().url()).nullish(),
  code: z.string().nullish(),
  error: z.string().nullish(),
});

const xaiChatChunkSchema = z.object({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z.array(
    z.object({
      delta: z.object({
        role: z.enum(['assistant']).optional(),
        content: z.string().nullish(),
        reasoning_content: z.string().nullish(),
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              type: z.literal('function'),
              function: z.object({
                name: z.string(),
                arguments: z.string(),
              }),
            }),
          )
          .nullish(),
      }),
      finish_reason: z.string().nullish(),
      index: z.number(),
    }),
  ),
  usage: xaiUsageSchema.nullish(),
  citations: z.array(z.string().url()).nullish(),
});

const xaiStreamErrorSchema = z.object({
  code: z.string(),
  error: z.string(),
});
