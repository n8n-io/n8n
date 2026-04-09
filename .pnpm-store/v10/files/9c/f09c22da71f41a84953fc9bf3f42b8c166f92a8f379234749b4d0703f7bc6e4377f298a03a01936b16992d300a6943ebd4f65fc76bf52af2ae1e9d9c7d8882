import {
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
  FetchFunction,
  parseProviderOptions,
  ParseResult,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import { getResponseMetadata } from '../get-response-metadata';
import { xaiFailedResponseHandler } from '../xai-error';
import { convertToXaiResponsesInput } from './convert-to-xai-responses-input';
import { convertXaiResponsesUsage } from './convert-xai-responses-usage';
import { mapXaiResponsesFinishReason } from './map-xai-responses-finish-reason';
import {
  XaiResponsesIncludeOptions,
  xaiResponsesChunkSchema,
  xaiResponsesResponseSchema,
} from './xai-responses-api';
import {
  XaiResponsesModelId,
  xaiLanguageModelResponsesOptions,
} from './xai-responses-options';
import { prepareResponsesTools } from './xai-responses-prepare-tools';

type XaiResponsesConfig = {
  provider: string;
  baseURL: string | undefined;
  headers: () => Record<string, string | undefined>;
  generateId: () => string;
  fetch?: FetchFunction;
};

export class XaiResponsesLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3';

  readonly modelId: XaiResponsesModelId;

  private readonly config: XaiResponsesConfig;

  constructor(modelId: XaiResponsesModelId, config: XaiResponsesConfig) {
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
    stopSequences,
    seed,
    responseFormat,
    providerOptions,
    tools,
    toolChoice,
  }: LanguageModelV3CallOptions) {
    const warnings: SharedV3Warning[] = [];

    const options =
      (await parseProviderOptions({
        provider: 'xai',
        providerOptions,
        schema: xaiLanguageModelResponsesOptions,
      })) ?? {};

    if (stopSequences != null) {
      warnings.push({ type: 'unsupported', feature: 'stopSequences' });
    }

    const webSearchToolName = tools?.find(
      tool => tool.type === 'provider' && tool.id === 'xai.web_search',
    )?.name;

    const xSearchToolName = tools?.find(
      tool => tool.type === 'provider' && tool.id === 'xai.x_search',
    )?.name;

    const codeExecutionToolName = tools?.find(
      tool => tool.type === 'provider' && tool.id === 'xai.code_execution',
    )?.name;

    const mcpToolName = tools?.find(
      tool => tool.type === 'provider' && tool.id === 'xai.mcp',
    )?.name;

    const fileSearchToolName = tools?.find(
      tool => tool.type === 'provider' && tool.id === 'xai.file_search',
    )?.name;

    const { input, inputWarnings } = await convertToXaiResponsesInput({
      prompt,
      store: true,
    });
    warnings.push(...inputWarnings);

    const {
      tools: xaiTools,
      toolChoice: xaiToolChoice,
      toolWarnings,
    } = await prepareResponsesTools({
      tools,
      toolChoice,
    });
    warnings.push(...toolWarnings);

    // Build include array based on provider options and store setting
    let include: XaiResponsesIncludeOptions = options.include
      ? [...options.include]
      : undefined;

    if (options.store === false) {
      // When store is false, we need to include reasoning.encrypted_content
      // to preserve reasoning tokens in the response
      if (include == null) {
        include = ['reasoning.encrypted_content'];
      } else {
        include = [...include, 'reasoning.encrypted_content'];
      }
    }

    const baseArgs: Record<string, unknown> = {
      model: this.modelId,
      input,
      logprobs:
        options.logprobs === true || options.topLogprobs != null
          ? true
          : undefined,
      top_logprobs: options.topLogprobs,
      max_output_tokens: maxOutputTokens,
      temperature,
      top_p: topP,
      seed,
      ...(responseFormat?.type === 'json' && {
        text: {
          format:
            responseFormat.schema != null
              ? {
                  type: 'json_schema',
                  strict: true,
                  name: responseFormat.name ?? 'response',
                  description: responseFormat.description,
                  schema: responseFormat.schema,
                }
              : { type: 'json_object' },
        },
      }),
      ...(options.reasoningEffort != null && {
        reasoning: { effort: options.reasoningEffort },
      }),
      ...(options.store === false && {
        store: options.store,
      }),
      ...(include != null && {
        include,
      }),
      ...(options.previousResponseId != null && {
        previous_response_id: options.previousResponseId,
      }),
    };

    if (xaiTools && xaiTools.length > 0) {
      baseArgs.tools = xaiTools;
    }

    if (xaiToolChoice != null) {
      baseArgs.tool_choice = xaiToolChoice;
    }

    return {
      args: baseArgs,
      warnings,
      webSearchToolName,
      xSearchToolName,
      codeExecutionToolName,
      mcpToolName,
      fileSearchToolName,
    };
  }

  async doGenerate(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3GenerateResult> {
    const {
      args: body,
      warnings,
      webSearchToolName,
      xSearchToolName,
      codeExecutionToolName,
      mcpToolName,
      fileSearchToolName,
    } = await this.getArgs(options);

    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse,
    } = await postJsonToApi({
      url: `${this.config.baseURL ?? 'https://api.x.ai/v1'}/responses`,
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        xaiResponsesResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const content: Array<LanguageModelV3Content> = [];

    const webSearchSubTools = [
      'web_search',
      'web_search_with_snippets',
      'browse_page',
    ];
    const xSearchSubTools = [
      'x_user_search',
      'x_keyword_search',
      'x_semantic_search',
      'x_thread_fetch',
    ];

    for (const part of response.output) {
      if (part.type === 'file_search_call') {
        const toolName = fileSearchToolName ?? 'file_search';

        content.push({
          type: 'tool-call',
          toolCallId: part.id,
          toolName,
          input: '',
          providerExecuted: true,
        });

        content.push({
          type: 'tool-result',
          toolCallId: part.id,
          toolName,
          result: {
            queries: part.queries ?? [],
            results:
              part.results?.map(result => ({
                fileId: result.file_id,
                filename: result.filename,
                score: result.score,
                text: result.text,
              })) ?? null,
          },
        });

        continue;
      }

      if (
        part.type === 'web_search_call' ||
        part.type === 'x_search_call' ||
        part.type === 'code_interpreter_call' ||
        part.type === 'code_execution_call' ||
        part.type === 'view_image_call' ||
        part.type === 'view_x_video_call' ||
        part.type === 'custom_tool_call' ||
        part.type === 'mcp_call'
      ) {
        let toolName = part.name ?? '';
        if (
          webSearchSubTools.includes(part.name ?? '') ||
          part.type === 'web_search_call'
        ) {
          toolName = webSearchToolName ?? 'web_search';
        } else if (
          xSearchSubTools.includes(part.name ?? '') ||
          part.type === 'x_search_call'
        ) {
          toolName = xSearchToolName ?? 'x_search';
        } else if (
          part.name === 'code_execution' ||
          part.type === 'code_interpreter_call' ||
          part.type === 'code_execution_call'
        ) {
          toolName = codeExecutionToolName ?? 'code_execution';
        } else if (part.type === 'mcp_call') {
          toolName = mcpToolName ?? part.name ?? 'mcp';
        }

        const toolInput =
          part.type === 'custom_tool_call'
            ? (part.input ?? '')
            : part.type === 'mcp_call'
              ? (part.arguments ?? '')
              : (part.arguments ?? '');

        content.push({
          type: 'tool-call',
          toolCallId: part.id,
          toolName,
          input: toolInput,
          providerExecuted: true,
        });

        continue;
      }

      switch (part.type) {
        case 'message': {
          for (const contentPart of part.content) {
            if (contentPart.text) {
              content.push({
                type: 'text',
                text: contentPart.text,
              });
            }

            if (contentPart.annotations) {
              for (const annotation of contentPart.annotations) {
                if (annotation.type === 'url_citation' && 'url' in annotation) {
                  content.push({
                    type: 'source',
                    sourceType: 'url',
                    id: this.config.generateId(),
                    url: annotation.url,
                    title: annotation.title ?? annotation.url,
                  });
                }
              }
            }
          }

          break;
        }

        case 'function_call': {
          content.push({
            type: 'tool-call',
            toolCallId: part.call_id,
            toolName: part.name,
            input: part.arguments,
          });
          break;
        }

        case 'reasoning': {
          const summaryTexts = part.summary
            .map(s => s.text)
            .filter(text => text && text.length > 0);

          if (summaryTexts.length > 0) {
            const reasoningText = summaryTexts.join('');
            if (part.encrypted_content || part.id) {
              content.push({
                type: 'reasoning',
                text: reasoningText,
                providerMetadata: {
                  xai: {
                    ...(part.encrypted_content && {
                      reasoningEncryptedContent: part.encrypted_content,
                    }),
                    ...(part.id && { itemId: part.id }),
                  },
                },
              });
            } else {
              content.push({
                type: 'reasoning',
                text: reasoningText,
              });
            }
          }
          break;
        }

        default: {
          break;
        }
      }
    }

    return {
      content,
      finishReason: {
        unified: mapXaiResponsesFinishReason(response.status),
        raw: response.status ?? undefined,
      },
      usage: response.usage
        ? convertXaiResponsesUsage(response.usage)
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
    const {
      args,
      warnings,
      webSearchToolName,
      xSearchToolName,
      codeExecutionToolName,
      mcpToolName,
      fileSearchToolName,
    } = await this.getArgs(options);
    const body = {
      ...args,
      stream: true,
    };

    const { responseHeaders, value: response } = await postJsonToApi({
      url: `${this.config.baseURL ?? 'https://api.x.ai/v1'}/responses`,
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        xaiResponsesChunkSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    let finishReason: LanguageModelV3FinishReason = {
      unified: 'other',
      raw: undefined,
    };
    let usage: LanguageModelV3Usage | undefined = undefined;
    let isFirstChunk = true;
    const contentBlocks: Record<string, { type: 'text' }> = {};
    const seenToolCalls = new Set<string>();

    // Track ongoing function calls by output_index so we can stream
    // arguments via response.function_call_arguments.delta events.
    const ongoingToolCalls: Record<
      number,
      { toolName: string; toolCallId: string } | undefined
    > = {};

    const activeReasoning: Record<
      string,
      { encryptedContent?: string | null }
    > = {};

    const self = this;

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof xaiResponsesChunkSchema>>,
          LanguageModelV3StreamPart
        >({
          start(controller) {
            controller.enqueue({ type: 'stream-start', warnings });
          },

          transform(chunk, controller) {
            if (options.includeRawChunks) {
              controller.enqueue({ type: 'raw', rawValue: chunk.rawValue });
            }

            if (!chunk.success) {
              controller.enqueue({ type: 'error', error: chunk.error });
              return;
            }

            const event = chunk.value;

            if (
              event.type === 'response.created' ||
              event.type === 'response.in_progress'
            ) {
              if (isFirstChunk) {
                controller.enqueue({
                  type: 'response-metadata',
                  ...getResponseMetadata(event.response),
                });
                isFirstChunk = false;
              }
              return;
            }

            if (event.type === 'response.reasoning_summary_part.added') {
              const blockId = `reasoning-${event.item_id}`;

              activeReasoning[event.item_id] = {};
              controller.enqueue({
                type: 'reasoning-start',
                id: blockId,
                providerMetadata: {
                  xai: {
                    itemId: event.item_id,
                  },
                },
              });
            }

            if (event.type === 'response.reasoning_summary_text.delta') {
              const blockId = `reasoning-${event.item_id}`;

              controller.enqueue({
                type: 'reasoning-delta',
                id: blockId,
                delta: event.delta,
                providerMetadata: {
                  xai: {
                    itemId: event.item_id,
                  },
                },
              });

              return;
            }

            if (event.type === 'response.reasoning_summary_text.done') {
              return;
            }

            if (event.type === 'response.reasoning_text.delta') {
              const blockId = `reasoning-${event.item_id}`;

              if (activeReasoning[event.item_id] == null) {
                activeReasoning[event.item_id] = {};
                controller.enqueue({
                  type: 'reasoning-start',
                  id: blockId,
                  providerMetadata: {
                    xai: {
                      itemId: event.item_id,
                    },
                  },
                });
              }

              controller.enqueue({
                type: 'reasoning-delta',
                id: blockId,
                delta: event.delta,
                providerMetadata: {
                  xai: {
                    itemId: event.item_id,
                  },
                },
              });

              return;
            }

            if (event.type === 'response.reasoning_text.done') {
              return;
            }

            if (event.type === 'response.output_text.delta') {
              const blockId = `text-${event.item_id}`;

              if (contentBlocks[blockId] == null) {
                contentBlocks[blockId] = { type: 'text' };
                controller.enqueue({
                  type: 'text-start',
                  id: blockId,
                });
              }

              controller.enqueue({
                type: 'text-delta',
                id: blockId,
                delta: event.delta,
              });

              return;
            }

            if (event.type === 'response.output_text.done') {
              if (event.annotations) {
                for (const annotation of event.annotations) {
                  if (
                    annotation.type === 'url_citation' &&
                    'url' in annotation
                  ) {
                    controller.enqueue({
                      type: 'source',
                      sourceType: 'url',
                      id: self.config.generateId(),
                      url: annotation.url,
                      title: annotation.title ?? annotation.url,
                    });
                  }
                }
              }

              return;
            }

            if (event.type === 'response.output_text.annotation.added') {
              const annotation = event.annotation;
              if (annotation.type === 'url_citation' && 'url' in annotation) {
                controller.enqueue({
                  type: 'source',
                  sourceType: 'url',
                  id: self.config.generateId(),
                  url: annotation.url,
                  title: annotation.title ?? annotation.url,
                });
              }

              return;
            }

            if (
              event.type === 'response.done' ||
              event.type === 'response.completed'
            ) {
              const response = event.response;

              if (response.usage) {
                usage = convertXaiResponsesUsage(response.usage);
              }

              if (response.status) {
                finishReason = {
                  unified: mapXaiResponsesFinishReason(response.status),
                  raw: response.status,
                };
              }

              return;
            }

            // Custom tool call input streaming - already handled by output_item events
            if (
              event.type === 'response.custom_tool_call_input.delta' ||
              event.type === 'response.custom_tool_call_input.done'
            ) {
              return;
            }

            // Function call arguments streaming (standard function tools)
            if (event.type === 'response.function_call_arguments.delta') {
              const toolCall = ongoingToolCalls[event.output_index];
              if (toolCall != null) {
                controller.enqueue({
                  type: 'tool-input-delta',
                  id: toolCall.toolCallId,
                  delta: event.delta,
                });
              }
              return;
            }
            if (event.type === 'response.function_call_arguments.done') {
              // Arguments are fully received; output_item.done will
              // emit tool-input-end and tool-call with the final arguments.
              return;
            }

            if (
              event.type === 'response.output_item.added' ||
              event.type === 'response.output_item.done'
            ) {
              const part = event.item;
              if (part.type === 'reasoning') {
                if (event.type === 'response.output_item.done') {
                  const blockId = `reasoning-${part.id}`;

                  // Emit reasoning-start if not already emitted (e.g., for encrypted reasoning
                  // where reasoning_summary_part.added events may not be sent)
                  if (!(part.id in activeReasoning)) {
                    activeReasoning[part.id] = {};
                    controller.enqueue({
                      type: 'reasoning-start',
                      id: blockId,
                      providerMetadata: {
                        xai: {
                          ...(part.id && { itemId: part.id }),
                        },
                      },
                    });
                  }

                  controller.enqueue({
                    type: 'reasoning-end',
                    id: blockId,
                    providerMetadata: {
                      xai: {
                        ...(part.encrypted_content && {
                          reasoningEncryptedContent: part.encrypted_content,
                        }),
                        ...(part.id && { itemId: part.id }),
                      },
                    },
                  });
                  delete activeReasoning[part.id];
                }
                return;
              }

              if (part.type === 'file_search_call') {
                const toolName = fileSearchToolName ?? 'file_search';

                if (!seenToolCalls.has(part.id)) {
                  seenToolCalls.add(part.id);

                  controller.enqueue({
                    type: 'tool-input-start',
                    id: part.id,
                    toolName,
                  });

                  controller.enqueue({
                    type: 'tool-input-delta',
                    id: part.id,
                    delta: '',
                  });

                  controller.enqueue({
                    type: 'tool-input-end',
                    id: part.id,
                  });

                  controller.enqueue({
                    type: 'tool-call',
                    toolCallId: part.id,
                    toolName,
                    input: '',
                    providerExecuted: true,
                  });
                }

                if (event.type === 'response.output_item.done') {
                  controller.enqueue({
                    type: 'tool-result',
                    toolCallId: part.id,
                    toolName,
                    result: {
                      queries: part.queries ?? [],
                      results:
                        part.results?.map(result => ({
                          fileId: result.file_id,
                          filename: result.filename,
                          score: result.score,
                          text: result.text,
                        })) ?? null,
                    },
                  });
                }

                return;
              }

              if (
                part.type === 'web_search_call' ||
                part.type === 'x_search_call' ||
                part.type === 'code_interpreter_call' ||
                part.type === 'code_execution_call' ||
                part.type === 'view_image_call' ||
                part.type === 'view_x_video_call' ||
                part.type === 'custom_tool_call' ||
                part.type === 'mcp_call'
              ) {
                const webSearchSubTools = [
                  'web_search',
                  'web_search_with_snippets',
                  'browse_page',
                ];
                const xSearchSubTools = [
                  'x_user_search',
                  'x_keyword_search',
                  'x_semantic_search',
                  'x_thread_fetch',
                ];

                let toolName = part.name ?? '';
                if (
                  webSearchSubTools.includes(part.name ?? '') ||
                  part.type === 'web_search_call'
                ) {
                  toolName = webSearchToolName ?? 'web_search';
                } else if (
                  xSearchSubTools.includes(part.name ?? '') ||
                  part.type === 'x_search_call'
                ) {
                  toolName = xSearchToolName ?? 'x_search';
                } else if (
                  part.name === 'code_execution' ||
                  part.type === 'code_interpreter_call' ||
                  part.type === 'code_execution_call'
                ) {
                  toolName = codeExecutionToolName ?? 'code_execution';
                } else if (part.type === 'mcp_call') {
                  toolName = mcpToolName ?? part.name ?? 'mcp';
                }

                const toolInput =
                  part.type === 'custom_tool_call'
                    ? (part.input ?? '')
                    : part.type === 'mcp_call'
                      ? (part.arguments ?? '')
                      : (part.arguments ?? '');

                const shouldEmit =
                  part.type === 'custom_tool_call'
                    ? event.type === 'response.output_item.done'
                    : !seenToolCalls.has(part.id);

                if (shouldEmit && !seenToolCalls.has(part.id)) {
                  seenToolCalls.add(part.id);

                  controller.enqueue({
                    type: 'tool-input-start',
                    id: part.id,
                    toolName,
                  });

                  controller.enqueue({
                    type: 'tool-input-delta',
                    id: part.id,
                    delta: toolInput,
                  });

                  controller.enqueue({
                    type: 'tool-input-end',
                    id: part.id,
                  });

                  controller.enqueue({
                    type: 'tool-call',
                    toolCallId: part.id,
                    toolName,
                    input: toolInput,
                    providerExecuted: true,
                  });
                }

                return;
              }

              if (part.type === 'message') {
                for (const contentPart of part.content) {
                  if (contentPart.text && contentPart.text.length > 0) {
                    const blockId = `text-${part.id}`;

                    // Only emit text if we haven't already streamed it via output_text.delta events
                    if (contentBlocks[blockId] == null) {
                      contentBlocks[blockId] = { type: 'text' };
                      controller.enqueue({
                        type: 'text-start',
                        id: blockId,
                      });

                      controller.enqueue({
                        type: 'text-delta',
                        id: blockId,
                        delta: contentPart.text,
                      });
                    }
                  }

                  if (contentPart.annotations) {
                    for (const annotation of contentPart.annotations) {
                      if (
                        annotation.type === 'url_citation' &&
                        'url' in annotation
                      ) {
                        controller.enqueue({
                          type: 'source',
                          sourceType: 'url',
                          id: self.config.generateId(),
                          url: annotation.url,
                          title: annotation.title ?? annotation.url,
                        });
                      }
                    }
                  }
                }
              } else if (part.type === 'function_call') {
                if (event.type === 'response.output_item.added') {
                  // Track the call so function_call_arguments.delta events
                  // can stream the arguments incrementally.
                  ongoingToolCalls[event.output_index] = {
                    toolName: part.name,
                    toolCallId: part.call_id,
                  };

                  controller.enqueue({
                    type: 'tool-input-start',
                    id: part.call_id,
                    toolName: part.name,
                  });
                } else if (event.type === 'response.output_item.done') {
                  ongoingToolCalls[event.output_index] = undefined;

                  controller.enqueue({
                    type: 'tool-input-end',
                    id: part.call_id,
                  });

                  controller.enqueue({
                    type: 'tool-call',
                    toolCallId: part.call_id,
                    toolName: part.name,
                    input: part.arguments,
                  });
                }
              }
            }
          },

          flush(controller) {
            for (const [blockId, block] of Object.entries(contentBlocks)) {
              if (block.type === 'text') {
                controller.enqueue({
                  type: 'text-end',
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
