// src/xai-provider.ts
import {
  NoSuchModelError
} from "@ai-sdk/provider";
import {
  generateId,
  loadApiKey,
  withoutTrailingSlash,
  withUserAgentSuffix
} from "@ai-sdk/provider-utils";

// src/xai-chat-language-model.ts
import {
  APICallError
} from "@ai-sdk/provider";
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  extractResponseHeaders,
  parseProviderOptions,
  postJsonToApi,
  safeParseJSON
} from "@ai-sdk/provider-utils";
import { z as z3 } from "zod/v4";

// src/convert-to-xai-chat-messages.ts
import {
  UnsupportedFunctionalityError
} from "@ai-sdk/provider";
import { convertToBase64 } from "@ai-sdk/provider-utils";
function convertToXaiChatMessages(prompt) {
  var _a;
  const messages = [];
  const warnings = [];
  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        messages.push({ role: "system", content });
        break;
      }
      case "user": {
        if (content.length === 1 && content[0].type === "text") {
          messages.push({ role: "user", content: content[0].text });
          break;
        }
        messages.push({
          role: "user",
          content: content.map((part) => {
            switch (part.type) {
              case "text": {
                return { type: "text", text: part.text };
              }
              case "file": {
                if (part.mediaType.startsWith("image/")) {
                  const mediaType = part.mediaType === "image/*" ? "image/jpeg" : part.mediaType;
                  return {
                    type: "image_url",
                    image_url: {
                      url: part.data instanceof URL ? part.data.toString() : `data:${mediaType};base64,${convertToBase64(part.data)}`
                    }
                  };
                } else {
                  throw new UnsupportedFunctionalityError({
                    functionality: `file part media type ${part.mediaType}`
                  });
                }
              }
            }
          })
        });
        break;
      }
      case "assistant": {
        let text = "";
        const toolCalls = [];
        for (const part of content) {
          switch (part.type) {
            case "text": {
              text += part.text;
              break;
            }
            case "tool-call": {
              toolCalls.push({
                id: part.toolCallId,
                type: "function",
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.input)
                }
              });
              break;
            }
          }
        }
        messages.push({
          role: "assistant",
          content: text,
          tool_calls: toolCalls.length > 0 ? toolCalls : void 0
        });
        break;
      }
      case "tool": {
        for (const toolResponse of content) {
          if (toolResponse.type === "tool-approval-response") {
            continue;
          }
          const output = toolResponse.output;
          let contentValue;
          switch (output.type) {
            case "text":
            case "error-text":
              contentValue = output.value;
              break;
            case "execution-denied":
              contentValue = (_a = output.reason) != null ? _a : "Tool execution denied.";
              break;
            case "content":
            case "json":
            case "error-json":
              contentValue = JSON.stringify(output.value);
              break;
          }
          messages.push({
            role: "tool",
            tool_call_id: toolResponse.toolCallId,
            content: contentValue
          });
        }
        break;
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }
  return { messages, warnings };
}

// src/convert-xai-chat-usage.ts
function convertXaiChatUsage(usage) {
  var _a, _b, _c, _d;
  const cacheReadTokens = (_b = (_a = usage.prompt_tokens_details) == null ? void 0 : _a.cached_tokens) != null ? _b : 0;
  const reasoningTokens = (_d = (_c = usage.completion_tokens_details) == null ? void 0 : _c.reasoning_tokens) != null ? _d : 0;
  const promptTokensIncludesCached = cacheReadTokens <= usage.prompt_tokens;
  return {
    inputTokens: {
      total: promptTokensIncludesCached ? usage.prompt_tokens : usage.prompt_tokens + cacheReadTokens,
      noCache: promptTokensIncludesCached ? usage.prompt_tokens - cacheReadTokens : usage.prompt_tokens,
      cacheRead: cacheReadTokens,
      cacheWrite: void 0
    },
    outputTokens: {
      total: usage.completion_tokens + reasoningTokens,
      text: usage.completion_tokens,
      reasoning: reasoningTokens
    },
    raw: usage
  };
}

// src/get-response-metadata.ts
function getResponseMetadata({
  id,
  model,
  created,
  created_at
}) {
  const unixTime = created != null ? created : created_at;
  return {
    id: id != null ? id : void 0,
    modelId: model != null ? model : void 0,
    timestamp: unixTime != null ? new Date(unixTime * 1e3) : void 0
  };
}

// src/map-xai-finish-reason.ts
function mapXaiFinishReason(finishReason) {
  switch (finishReason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "tool_calls":
    case "function_call":
      return "tool-calls";
    case "content_filter":
      return "content-filter";
    default:
      return "other";
  }
}

// src/xai-chat-options.ts
import { z } from "zod/v4";
var webSourceSchema = z.object({
  type: z.literal("web"),
  country: z.string().length(2).optional(),
  excludedWebsites: z.array(z.string()).max(5).optional(),
  allowedWebsites: z.array(z.string()).max(5).optional(),
  safeSearch: z.boolean().optional()
});
var xSourceSchema = z.object({
  type: z.literal("x"),
  excludedXHandles: z.array(z.string()).optional(),
  includedXHandles: z.array(z.string()).optional(),
  postFavoriteCount: z.number().int().optional(),
  postViewCount: z.number().int().optional(),
  /**
   * @deprecated use `includedXHandles` instead
   */
  xHandles: z.array(z.string()).optional()
});
var newsSourceSchema = z.object({
  type: z.literal("news"),
  country: z.string().length(2).optional(),
  excludedWebsites: z.array(z.string()).max(5).optional(),
  safeSearch: z.boolean().optional()
});
var rssSourceSchema = z.object({
  type: z.literal("rss"),
  links: z.array(z.string().url()).max(1)
  // currently only supports one RSS link
});
var searchSourceSchema = z.discriminatedUnion("type", [
  webSourceSchema,
  xSourceSchema,
  newsSourceSchema,
  rssSourceSchema
]);
var xaiLanguageModelChatOptions = z.object({
  reasoningEffort: z.enum(["low", "high"]).optional(),
  logprobs: z.boolean().optional(),
  topLogprobs: z.number().int().min(0).max(8).optional(),
  /**
   * Whether to enable parallel function calling during tool use.
   * When true, the model can call multiple functions in parallel.
   * When false, the model will call functions sequentially.
   * Defaults to true.
   */
  parallel_function_calling: z.boolean().optional(),
  searchParameters: z.object({
    /**
     * search mode preference
     * - "off": disables search completely
     * - "auto": model decides whether to search (default)
     * - "on": always enables search
     */
    mode: z.enum(["off", "auto", "on"]),
    /**
     * whether to return citations in the response
     * defaults to true
     */
    returnCitations: z.boolean().optional(),
    /**
     * start date for search data (ISO8601 format: YYYY-MM-DD)
     */
    fromDate: z.string().optional(),
    /**
     * end date for search data (ISO8601 format: YYYY-MM-DD)
     */
    toDate: z.string().optional(),
    /**
     * maximum number of search results to consider
     * defaults to 20
     */
    maxSearchResults: z.number().min(1).max(50).optional(),
    /**
     * data sources to search from.
     * defaults to [{ type: 'web' }, { type: 'x' }] if not specified.
     *
     * @example
     * sources: [{ type: 'web', country: 'US' }, { type: 'x' }]
     */
    sources: z.array(searchSourceSchema).optional()
  }).optional()
});

// src/xai-error.ts
import { createJsonErrorResponseHandler } from "@ai-sdk/provider-utils";
import { z as z2 } from "zod/v4";
var xaiErrorDataSchema = z2.object({
  error: z2.object({
    message: z2.string(),
    type: z2.string().nullish(),
    param: z2.any().nullish(),
    code: z2.union([z2.string(), z2.number()]).nullish()
  })
});
var xaiFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: xaiErrorDataSchema,
  errorToMessage: (data) => data.error.message
});

// src/xai-prepare-tools.ts
import {
  UnsupportedFunctionalityError as UnsupportedFunctionalityError2
} from "@ai-sdk/provider";
function prepareTools({
  tools,
  toolChoice
}) {
  tools = (tools == null ? void 0 : tools.length) ? tools : void 0;
  const toolWarnings = [];
  if (tools == null) {
    return { tools: void 0, toolChoice: void 0, toolWarnings };
  }
  const xaiTools2 = [];
  for (const tool of tools) {
    if (tool.type === "provider") {
      toolWarnings.push({
        type: "unsupported",
        feature: `provider-defined tool ${tool.name}`
      });
    } else {
      xaiTools2.push({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          ...tool.strict != null ? { strict: tool.strict } : {}
        }
      });
    }
  }
  if (toolChoice == null) {
    return { tools: xaiTools2, toolChoice: void 0, toolWarnings };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
    case "none":
      return { tools: xaiTools2, toolChoice: type, toolWarnings };
    case "required":
      return { tools: xaiTools2, toolChoice: "required", toolWarnings };
    case "tool":
      return {
        tools: xaiTools2,
        toolChoice: {
          type: "function",
          function: { name: toolChoice.toolName }
        },
        toolWarnings
      };
    default: {
      const _exhaustiveCheck = type;
      throw new UnsupportedFunctionalityError2({
        functionality: `tool choice type: ${_exhaustiveCheck}`
      });
    }
  }
}

// src/xai-chat-language-model.ts
var XaiChatLanguageModel = class {
  constructor(modelId, config) {
    this.specificationVersion = "v3";
    this.supportedUrls = {
      "image/*": [/^https?:\/\/.*$/]
    };
    this.modelId = modelId;
    this.config = config;
  }
  get provider() {
    return this.config.provider;
  }
  async getArgs({
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
    toolChoice
  }) {
    var _a, _b, _c;
    const warnings = [];
    const options = (_a = await parseProviderOptions({
      provider: "xai",
      providerOptions,
      schema: xaiLanguageModelChatOptions
    })) != null ? _a : {};
    if (topK != null) {
      warnings.push({ type: "unsupported", feature: "topK" });
    }
    if (frequencyPenalty != null) {
      warnings.push({ type: "unsupported", feature: "frequencyPenalty" });
    }
    if (presencePenalty != null) {
      warnings.push({ type: "unsupported", feature: "presencePenalty" });
    }
    if (stopSequences != null) {
      warnings.push({ type: "unsupported", feature: "stopSequences" });
    }
    const { messages, warnings: messageWarnings } = convertToXaiChatMessages(prompt);
    warnings.push(...messageWarnings);
    const {
      tools: xaiTools2,
      toolChoice: xaiToolChoice,
      toolWarnings
    } = prepareTools({
      tools,
      toolChoice
    });
    warnings.push(...toolWarnings);
    const baseArgs = {
      // model id
      model: this.modelId,
      // standard generation settings
      logprobs: options.logprobs === true || options.topLogprobs != null ? true : void 0,
      top_logprobs: options.topLogprobs,
      max_completion_tokens: maxOutputTokens,
      temperature,
      top_p: topP,
      seed,
      reasoning_effort: options.reasoningEffort,
      // parallel function calling
      parallel_function_calling: options.parallel_function_calling,
      // response format
      response_format: (responseFormat == null ? void 0 : responseFormat.type) === "json" ? responseFormat.schema != null ? {
        type: "json_schema",
        json_schema: {
          name: (_b = responseFormat.name) != null ? _b : "response",
          schema: responseFormat.schema,
          strict: true
        }
      } : { type: "json_object" } : void 0,
      // search parameters
      search_parameters: options.searchParameters ? {
        mode: options.searchParameters.mode,
        return_citations: options.searchParameters.returnCitations,
        from_date: options.searchParameters.fromDate,
        to_date: options.searchParameters.toDate,
        max_search_results: options.searchParameters.maxSearchResults,
        sources: (_c = options.searchParameters.sources) == null ? void 0 : _c.map((source) => {
          var _a2;
          return {
            type: source.type,
            ...source.type === "web" && {
              country: source.country,
              excluded_websites: source.excludedWebsites,
              allowed_websites: source.allowedWebsites,
              safe_search: source.safeSearch
            },
            ...source.type === "x" && {
              excluded_x_handles: source.excludedXHandles,
              included_x_handles: (_a2 = source.includedXHandles) != null ? _a2 : source.xHandles,
              post_favorite_count: source.postFavoriteCount,
              post_view_count: source.postViewCount
            },
            ...source.type === "news" && {
              country: source.country,
              excluded_websites: source.excludedWebsites,
              safe_search: source.safeSearch
            },
            ...source.type === "rss" && {
              links: source.links
            }
          };
        })
      } : void 0,
      // messages in xai format
      messages,
      // tools in xai format
      tools: xaiTools2,
      tool_choice: xaiToolChoice
    };
    return {
      args: baseArgs,
      warnings
    };
  }
  async doGenerate(options) {
    var _a, _b;
    const { args: body, warnings } = await this.getArgs(options);
    const url = `${(_a = this.config.baseURL) != null ? _a : "https://api.x.ai/v1"}/chat/completions`;
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await postJsonToApi({
      url,
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        xaiChatResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    if (response.error != null) {
      throw new APICallError({
        message: response.error,
        url,
        requestBodyValues: body,
        statusCode: 200,
        responseHeaders,
        responseBody: JSON.stringify(rawResponse),
        isRetryable: response.code === "The service is currently unavailable"
      });
    }
    const choice = response.choices[0];
    const content = [];
    if (choice.message.content != null && choice.message.content.length > 0) {
      let text = choice.message.content;
      const lastMessage = body.messages[body.messages.length - 1];
      if ((lastMessage == null ? void 0 : lastMessage.role) === "assistant" && text === lastMessage.content) {
        text = "";
      }
      if (text.length > 0) {
        content.push({ type: "text", text });
      }
    }
    if (choice.message.reasoning_content != null && choice.message.reasoning_content.length > 0) {
      content.push({
        type: "reasoning",
        text: choice.message.reasoning_content
      });
    }
    if (choice.message.tool_calls != null) {
      for (const toolCall of choice.message.tool_calls) {
        content.push({
          type: "tool-call",
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          input: toolCall.function.arguments
        });
      }
    }
    if (response.citations != null) {
      for (const url2 of response.citations) {
        content.push({
          type: "source",
          sourceType: "url",
          id: this.config.generateId(),
          url: url2
        });
      }
    }
    return {
      content,
      finishReason: {
        unified: mapXaiFinishReason(choice.finish_reason),
        raw: (_b = choice.finish_reason) != null ? _b : void 0
      },
      usage: response.usage ? convertXaiChatUsage(response.usage) : {
        inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 0, text: 0, reasoning: 0 }
      },
      request: { body },
      response: {
        ...getResponseMetadata(response),
        headers: responseHeaders,
        body: rawResponse
      },
      warnings
    };
  }
  async doStream(options) {
    var _a;
    const { args, warnings } = await this.getArgs(options);
    const body = {
      ...args,
      stream: true,
      stream_options: {
        include_usage: true
      }
    };
    const url = `${(_a = this.config.baseURL) != null ? _a : "https://api.x.ai/v1"}/chat/completions`;
    const { responseHeaders, value: response } = await postJsonToApi({
      url,
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: async ({ response: response2 }) => {
        const responseHeaders2 = extractResponseHeaders(response2);
        const contentType = response2.headers.get("content-type");
        if (contentType == null ? void 0 : contentType.includes("application/json")) {
          const responseBody = await response2.text();
          const parsedError = await safeParseJSON({
            text: responseBody,
            schema: xaiStreamErrorSchema
          });
          if (parsedError.success) {
            throw new APICallError({
              message: parsedError.value.error,
              url,
              requestBodyValues: body,
              statusCode: 200,
              responseHeaders: responseHeaders2,
              responseBody,
              isRetryable: parsedError.value.code === "The service is currently unavailable"
            });
          }
          throw new APICallError({
            message: "Invalid JSON response",
            url,
            requestBodyValues: body,
            statusCode: 200,
            responseHeaders: responseHeaders2,
            responseBody
          });
        }
        return createEventSourceResponseHandler(xaiChatChunkSchema)({
          response: response2,
          url,
          requestBodyValues: body
        });
      },
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    let finishReason = {
      unified: "other",
      raw: void 0
    };
    let usage = void 0;
    let isFirstChunk = true;
    const contentBlocks = {};
    const lastReasoningDeltas = {};
    let activeReasoningBlockId = void 0;
    const self = this;
    return {
      stream: response.pipeThrough(
        new TransformStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings });
          },
          transform(chunk, controller) {
            if (options.includeRawChunks) {
              controller.enqueue({ type: "raw", rawValue: chunk.rawValue });
            }
            if (!chunk.success) {
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }
            const value = chunk.value;
            if (isFirstChunk) {
              controller.enqueue({
                type: "response-metadata",
                ...getResponseMetadata(value)
              });
              isFirstChunk = false;
            }
            if (value.citations != null) {
              for (const url2 of value.citations) {
                controller.enqueue({
                  type: "source",
                  sourceType: "url",
                  id: self.config.generateId(),
                  url: url2
                });
              }
            }
            if (value.usage != null) {
              usage = convertXaiChatUsage(value.usage);
            }
            const choice = value.choices[0];
            if ((choice == null ? void 0 : choice.finish_reason) != null) {
              finishReason = {
                unified: mapXaiFinishReason(choice.finish_reason),
                raw: choice.finish_reason
              };
            }
            if ((choice == null ? void 0 : choice.delta) == null) {
              return;
            }
            const delta = choice.delta;
            const choiceIndex = choice.index;
            if (delta.content != null && delta.content.length > 0) {
              const textContent = delta.content;
              if (activeReasoningBlockId != null && !contentBlocks[activeReasoningBlockId].ended) {
                controller.enqueue({
                  type: "reasoning-end",
                  id: activeReasoningBlockId
                });
                contentBlocks[activeReasoningBlockId].ended = true;
                activeReasoningBlockId = void 0;
              }
              const lastMessage = body.messages[body.messages.length - 1];
              if ((lastMessage == null ? void 0 : lastMessage.role) === "assistant" && textContent === lastMessage.content) {
                return;
              }
              const blockId = `text-${value.id || choiceIndex}`;
              if (contentBlocks[blockId] == null) {
                contentBlocks[blockId] = { type: "text", ended: false };
                controller.enqueue({
                  type: "text-start",
                  id: blockId
                });
              }
              controller.enqueue({
                type: "text-delta",
                id: blockId,
                delta: textContent
              });
            }
            if (delta.reasoning_content != null && delta.reasoning_content.length > 0) {
              const blockId = `reasoning-${value.id || choiceIndex}`;
              if (lastReasoningDeltas[blockId] === delta.reasoning_content) {
                return;
              }
              lastReasoningDeltas[blockId] = delta.reasoning_content;
              if (contentBlocks[blockId] == null) {
                contentBlocks[blockId] = { type: "reasoning", ended: false };
                activeReasoningBlockId = blockId;
                controller.enqueue({
                  type: "reasoning-start",
                  id: blockId
                });
              }
              controller.enqueue({
                type: "reasoning-delta",
                id: blockId,
                delta: delta.reasoning_content
              });
            }
            if (delta.tool_calls != null) {
              if (activeReasoningBlockId != null && !contentBlocks[activeReasoningBlockId].ended) {
                controller.enqueue({
                  type: "reasoning-end",
                  id: activeReasoningBlockId
                });
                contentBlocks[activeReasoningBlockId].ended = true;
                activeReasoningBlockId = void 0;
              }
              for (const toolCall of delta.tool_calls) {
                const toolCallId = toolCall.id;
                controller.enqueue({
                  type: "tool-input-start",
                  id: toolCallId,
                  toolName: toolCall.function.name
                });
                controller.enqueue({
                  type: "tool-input-delta",
                  id: toolCallId,
                  delta: toolCall.function.arguments
                });
                controller.enqueue({
                  type: "tool-input-end",
                  id: toolCallId
                });
                controller.enqueue({
                  type: "tool-call",
                  toolCallId,
                  toolName: toolCall.function.name,
                  input: toolCall.function.arguments
                });
              }
            }
          },
          flush(controller) {
            for (const [blockId, block] of Object.entries(contentBlocks)) {
              if (!block.ended) {
                controller.enqueue({
                  type: block.type === "text" ? "text-end" : "reasoning-end",
                  id: blockId
                });
              }
            }
            controller.enqueue({
              type: "finish",
              finishReason,
              usage: usage != null ? usage : {
                inputTokens: {
                  total: 0,
                  noCache: 0,
                  cacheRead: 0,
                  cacheWrite: 0
                },
                outputTokens: { total: 0, text: 0, reasoning: 0 }
              }
            });
          }
        })
      ),
      request: { body },
      response: { headers: responseHeaders }
    };
  }
};
var xaiUsageSchema = z3.object({
  prompt_tokens: z3.number(),
  completion_tokens: z3.number(),
  total_tokens: z3.number(),
  prompt_tokens_details: z3.object({
    text_tokens: z3.number().nullish(),
    audio_tokens: z3.number().nullish(),
    image_tokens: z3.number().nullish(),
    cached_tokens: z3.number().nullish()
  }).nullish(),
  completion_tokens_details: z3.object({
    reasoning_tokens: z3.number().nullish(),
    audio_tokens: z3.number().nullish(),
    accepted_prediction_tokens: z3.number().nullish(),
    rejected_prediction_tokens: z3.number().nullish()
  }).nullish()
});
var xaiChatResponseSchema = z3.object({
  id: z3.string().nullish(),
  created: z3.number().nullish(),
  model: z3.string().nullish(),
  choices: z3.array(
    z3.object({
      message: z3.object({
        role: z3.literal("assistant"),
        content: z3.string().nullish(),
        reasoning_content: z3.string().nullish(),
        tool_calls: z3.array(
          z3.object({
            id: z3.string(),
            type: z3.literal("function"),
            function: z3.object({
              name: z3.string(),
              arguments: z3.string()
            })
          })
        ).nullish()
      }),
      index: z3.number(),
      finish_reason: z3.string().nullish()
    })
  ).nullish(),
  object: z3.literal("chat.completion").nullish(),
  usage: xaiUsageSchema.nullish(),
  citations: z3.array(z3.string().url()).nullish(),
  code: z3.string().nullish(),
  error: z3.string().nullish()
});
var xaiChatChunkSchema = z3.object({
  id: z3.string().nullish(),
  created: z3.number().nullish(),
  model: z3.string().nullish(),
  choices: z3.array(
    z3.object({
      delta: z3.object({
        role: z3.enum(["assistant"]).optional(),
        content: z3.string().nullish(),
        reasoning_content: z3.string().nullish(),
        tool_calls: z3.array(
          z3.object({
            id: z3.string(),
            type: z3.literal("function"),
            function: z3.object({
              name: z3.string(),
              arguments: z3.string()
            })
          })
        ).nullish()
      }),
      finish_reason: z3.string().nullish(),
      index: z3.number()
    })
  ),
  usage: xaiUsageSchema.nullish(),
  citations: z3.array(z3.string().url()).nullish()
});
var xaiStreamErrorSchema = z3.object({
  code: z3.string(),
  error: z3.string()
});

// src/xai-image-model.ts
import {
  combineHeaders as combineHeaders2,
  convertImageModelFileToDataUri,
  createBinaryResponseHandler,
  createJsonResponseHandler as createJsonResponseHandler2,
  createStatusCodeErrorResponseHandler,
  getFromApi,
  parseProviderOptions as parseProviderOptions2,
  postJsonToApi as postJsonToApi2
} from "@ai-sdk/provider-utils";
import { z as z5 } from "zod/v4";

// src/xai-image-options.ts
import { z as z4 } from "zod/v4";
var xaiImageModelOptions = z4.object({
  aspect_ratio: z4.string().optional(),
  output_format: z4.string().optional(),
  sync_mode: z4.boolean().optional(),
  resolution: z4.enum(["1k", "2k"]).optional(),
  quality: z4.enum(["low", "medium", "high"]).optional(),
  user: z4.string().optional()
});

// src/xai-image-model.ts
var XaiImageModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
    this.maxImagesPerCall = 3;
  }
  get provider() {
    return this.config.provider;
  }
  async doGenerate({
    prompt,
    n,
    size,
    aspectRatio,
    seed,
    providerOptions,
    headers,
    abortSignal,
    files,
    mask
  }) {
    var _a, _b, _c, _d, _e;
    const warnings = [];
    if (size != null) {
      warnings.push({
        type: "unsupported",
        feature: "size",
        details: "This model does not support the `size` option. Use `aspectRatio` instead."
      });
    }
    if (seed != null) {
      warnings.push({
        type: "unsupported",
        feature: "seed"
      });
    }
    if (mask != null) {
      warnings.push({
        type: "unsupported",
        feature: "mask"
      });
    }
    const xaiOptions = await parseProviderOptions2({
      provider: "xai",
      providerOptions,
      schema: xaiImageModelOptions
    });
    const hasFiles = files != null && files.length > 0;
    const imageUrls = hasFiles ? files.map((file) => convertImageModelFileToDataUri(file)) : [];
    const endpoint = hasFiles ? "/images/edits" : "/images/generations";
    const body = {
      model: this.modelId,
      prompt,
      n,
      response_format: "b64_json"
    };
    if (aspectRatio != null) {
      body.aspect_ratio = aspectRatio;
    }
    if ((xaiOptions == null ? void 0 : xaiOptions.output_format) != null) {
      body.output_format = xaiOptions.output_format;
    }
    if ((xaiOptions == null ? void 0 : xaiOptions.sync_mode) != null) {
      body.sync_mode = xaiOptions.sync_mode;
    }
    if ((xaiOptions == null ? void 0 : xaiOptions.aspect_ratio) != null && aspectRatio == null) {
      body.aspect_ratio = xaiOptions.aspect_ratio;
    }
    if ((xaiOptions == null ? void 0 : xaiOptions.resolution) != null) {
      body.resolution = xaiOptions.resolution;
    }
    if ((xaiOptions == null ? void 0 : xaiOptions.quality) != null) {
      body.quality = xaiOptions.quality;
    }
    if ((xaiOptions == null ? void 0 : xaiOptions.user) != null) {
      body.user = xaiOptions.user;
    }
    if (imageUrls.length === 1) {
      body.image = { url: imageUrls[0], type: "image_url" };
    } else if (imageUrls.length > 1) {
      body.images = imageUrls.map((url) => ({ url, type: "image_url" }));
    }
    const baseURL = (_a = this.config.baseURL) != null ? _a : "https://api.x.ai/v1";
    const currentDate = (_d = (_c = (_b = this.config._internal) == null ? void 0 : _b.currentDate) == null ? void 0 : _c.call(_b)) != null ? _d : /* @__PURE__ */ new Date();
    const { value: response, responseHeaders } = await postJsonToApi2({
      url: `${baseURL}${endpoint}`,
      headers: combineHeaders2(this.config.headers(), headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler2(
        xaiImageResponseSchema
      ),
      abortSignal,
      fetch: this.config.fetch
    });
    const hasAllBase64 = response.data.every((image) => image.b64_json != null);
    const images = hasAllBase64 ? response.data.map((image) => image.b64_json) : await Promise.all(
      response.data.map(
        (image) => this.downloadImage(image.url, abortSignal)
      )
    );
    return {
      images,
      warnings,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders
      },
      providerMetadata: {
        xai: {
          images: response.data.map((item) => ({
            ...item.revised_prompt ? { revisedPrompt: item.revised_prompt } : {}
          })),
          ...((_e = response.usage) == null ? void 0 : _e.cost_in_usd_ticks) != null ? { costInUsdTicks: response.usage.cost_in_usd_ticks } : {}
        }
      }
    };
  }
  async downloadImage(url, abortSignal) {
    const { value } = await getFromApi({
      url,
      abortSignal,
      failedResponseHandler: createStatusCodeErrorResponseHandler(),
      successfulResponseHandler: createBinaryResponseHandler(),
      fetch: this.config.fetch
    });
    return value;
  }
};
var xaiImageResponseSchema = z5.object({
  data: z5.array(
    z5.object({
      url: z5.string().nullish(),
      b64_json: z5.string().nullish(),
      revised_prompt: z5.string().nullish()
    })
  ),
  usage: z5.object({
    cost_in_usd_ticks: z5.number().nullish()
  }).nullish()
});

// src/responses/xai-responses-language-model.ts
import {
  combineHeaders as combineHeaders3,
  createEventSourceResponseHandler as createEventSourceResponseHandler2,
  createJsonResponseHandler as createJsonResponseHandler3,
  parseProviderOptions as parseProviderOptions3,
  postJsonToApi as postJsonToApi3
} from "@ai-sdk/provider-utils";

// src/responses/convert-to-xai-responses-input.ts
import {
  UnsupportedFunctionalityError as UnsupportedFunctionalityError3
} from "@ai-sdk/provider";
import { convertToBase64 as convertToBase642 } from "@ai-sdk/provider-utils";
async function convertToXaiResponsesInput({
  prompt
}) {
  var _a, _b, _c, _d, _e;
  const input = [];
  const inputWarnings = [];
  for (const message of prompt) {
    switch (message.role) {
      case "system": {
        input.push({
          role: "system",
          content: message.content
        });
        break;
      }
      case "user": {
        const contentParts = [];
        for (const block of message.content) {
          switch (block.type) {
            case "text": {
              contentParts.push({ type: "input_text", text: block.text });
              break;
            }
            case "file": {
              if (block.mediaType.startsWith("image/")) {
                const mediaType = block.mediaType === "image/*" ? "image/jpeg" : block.mediaType;
                const imageUrl = block.data instanceof URL ? block.data.toString() : `data:${mediaType};base64,${convertToBase642(block.data)}`;
                contentParts.push({ type: "input_image", image_url: imageUrl });
              } else {
                throw new UnsupportedFunctionalityError3({
                  functionality: `file part media type ${block.mediaType}`
                });
              }
              break;
            }
            default: {
              const _exhaustiveCheck = block;
              inputWarnings.push({
                type: "other",
                message: "xAI Responses API does not support this content type in user messages"
              });
            }
          }
        }
        input.push({
          role: "user",
          content: contentParts
        });
        break;
      }
      case "assistant": {
        for (const part of message.content) {
          switch (part.type) {
            case "text": {
              const id = typeof ((_b = (_a = part.providerOptions) == null ? void 0 : _a.xai) == null ? void 0 : _b.itemId) === "string" ? part.providerOptions.xai.itemId : void 0;
              input.push({
                role: "assistant",
                content: part.text,
                id
              });
              break;
            }
            case "tool-call": {
              if (part.providerExecuted) {
                break;
              }
              const id = typeof ((_d = (_c = part.providerOptions) == null ? void 0 : _c.xai) == null ? void 0 : _d.itemId) === "string" ? part.providerOptions.xai.itemId : void 0;
              input.push({
                type: "function_call",
                id: id != null ? id : part.toolCallId,
                call_id: part.toolCallId,
                name: part.toolName,
                arguments: JSON.stringify(part.input),
                status: "completed"
              });
              break;
            }
            case "tool-result": {
              break;
            }
            case "reasoning":
            case "file": {
              inputWarnings.push({
                type: "other",
                message: `xAI Responses API does not support ${part.type} in assistant messages`
              });
              break;
            }
            default: {
              const _exhaustiveCheck = part;
              inputWarnings.push({
                type: "other",
                message: "xAI Responses API does not support this content type in assistant messages"
              });
            }
          }
        }
        break;
      }
      case "tool": {
        for (const part of message.content) {
          if (part.type === "tool-approval-response") {
            continue;
          }
          const output = part.output;
          let outputValue;
          switch (output.type) {
            case "text":
            case "error-text":
              outputValue = output.value;
              break;
            case "execution-denied":
              outputValue = (_e = output.reason) != null ? _e : "tool execution denied";
              break;
            case "json":
            case "error-json":
              outputValue = JSON.stringify(output.value);
              break;
            case "content":
              outputValue = output.value.map((item) => {
                if (item.type === "text") {
                  return item.text;
                }
                return "";
              }).join("");
              break;
            default: {
              const _exhaustiveCheck = output;
              outputValue = "";
            }
          }
          input.push({
            type: "function_call_output",
            call_id: part.toolCallId,
            output: outputValue
          });
        }
        break;
      }
      default: {
        const _exhaustiveCheck = message;
        inputWarnings.push({
          type: "other",
          message: "unsupported message role"
        });
      }
    }
  }
  return { input, inputWarnings };
}

// src/responses/convert-xai-responses-usage.ts
function convertXaiResponsesUsage(usage) {
  var _a, _b, _c, _d;
  const cacheReadTokens = (_b = (_a = usage.input_tokens_details) == null ? void 0 : _a.cached_tokens) != null ? _b : 0;
  const reasoningTokens = (_d = (_c = usage.output_tokens_details) == null ? void 0 : _c.reasoning_tokens) != null ? _d : 0;
  const inputTokensIncludesCached = cacheReadTokens <= usage.input_tokens;
  return {
    inputTokens: {
      total: inputTokensIncludesCached ? usage.input_tokens : usage.input_tokens + cacheReadTokens,
      noCache: inputTokensIncludesCached ? usage.input_tokens - cacheReadTokens : usage.input_tokens,
      cacheRead: cacheReadTokens,
      cacheWrite: void 0
    },
    outputTokens: {
      total: usage.output_tokens,
      text: usage.output_tokens - reasoningTokens,
      reasoning: reasoningTokens
    },
    raw: usage
  };
}

// src/responses/map-xai-responses-finish-reason.ts
function mapXaiResponsesFinishReason(finishReason) {
  switch (finishReason) {
    case "stop":
    case "completed":
      return "stop";
    case "length":
      return "length";
    case "tool_calls":
    case "function_call":
      return "tool-calls";
    case "content_filter":
      return "content-filter";
    default:
      return "other";
  }
}

// src/responses/xai-responses-api.ts
import { z as z6 } from "zod/v4";
var annotationSchema = z6.union([
  z6.object({
    type: z6.literal("url_citation"),
    url: z6.string(),
    title: z6.string().optional()
  }),
  z6.object({
    type: z6.string()
  })
]);
var messageContentPartSchema = z6.object({
  type: z6.string(),
  text: z6.string().optional(),
  logprobs: z6.array(z6.any()).optional(),
  annotations: z6.array(annotationSchema).optional()
});
var reasoningSummaryPartSchema = z6.object({
  type: z6.string(),
  text: z6.string()
});
var toolCallSchema = z6.object({
  name: z6.string().optional(),
  arguments: z6.string().optional(),
  input: z6.string().optional(),
  call_id: z6.string().optional(),
  id: z6.string(),
  status: z6.string(),
  action: z6.any().optional()
});
var mcpCallSchema = z6.object({
  name: z6.string().optional(),
  arguments: z6.string().optional(),
  output: z6.string().optional(),
  error: z6.string().optional(),
  id: z6.string(),
  status: z6.string(),
  server_label: z6.string().optional()
});
var outputItemSchema = z6.discriminatedUnion("type", [
  z6.object({
    type: z6.literal("web_search_call"),
    ...toolCallSchema.shape
  }),
  z6.object({
    type: z6.literal("x_search_call"),
    ...toolCallSchema.shape
  }),
  z6.object({
    type: z6.literal("code_interpreter_call"),
    ...toolCallSchema.shape
  }),
  z6.object({
    type: z6.literal("code_execution_call"),
    ...toolCallSchema.shape
  }),
  z6.object({
    type: z6.literal("view_image_call"),
    ...toolCallSchema.shape
  }),
  z6.object({
    type: z6.literal("view_x_video_call"),
    ...toolCallSchema.shape
  }),
  z6.object({
    type: z6.literal("file_search_call"),
    id: z6.string(),
    status: z6.string(),
    queries: z6.array(z6.string()).optional(),
    results: z6.array(
      z6.object({
        file_id: z6.string(),
        filename: z6.string(),
        score: z6.number(),
        text: z6.string()
      })
    ).nullish()
  }),
  z6.object({
    type: z6.literal("custom_tool_call"),
    ...toolCallSchema.shape
  }),
  z6.object({
    type: z6.literal("mcp_call"),
    ...mcpCallSchema.shape
  }),
  z6.object({
    type: z6.literal("message"),
    role: z6.string(),
    content: z6.array(messageContentPartSchema),
    id: z6.string(),
    status: z6.string()
  }),
  z6.object({
    type: z6.literal("function_call"),
    name: z6.string(),
    arguments: z6.string(),
    call_id: z6.string(),
    id: z6.string()
  }),
  z6.object({
    type: z6.literal("reasoning"),
    id: z6.string(),
    summary: z6.array(reasoningSummaryPartSchema),
    status: z6.string(),
    encrypted_content: z6.string().nullish()
  })
]);
var xaiResponsesUsageSchema = z6.object({
  input_tokens: z6.number(),
  output_tokens: z6.number(),
  total_tokens: z6.number().optional(),
  input_tokens_details: z6.object({
    cached_tokens: z6.number().optional()
  }).optional(),
  output_tokens_details: z6.object({
    reasoning_tokens: z6.number().optional()
  }).optional(),
  num_sources_used: z6.number().optional(),
  num_server_side_tools_used: z6.number().optional()
});
var xaiResponsesResponseSchema = z6.object({
  id: z6.string().nullish(),
  created_at: z6.number().nullish(),
  model: z6.string().nullish(),
  object: z6.literal("response"),
  output: z6.array(outputItemSchema),
  usage: xaiResponsesUsageSchema.nullish(),
  status: z6.string()
});
var xaiResponsesChunkSchema = z6.union([
  z6.object({
    type: z6.literal("response.created"),
    response: xaiResponsesResponseSchema.partial({ usage: true, status: true })
  }),
  z6.object({
    type: z6.literal("response.in_progress"),
    response: xaiResponsesResponseSchema.partial({ usage: true, status: true })
  }),
  z6.object({
    type: z6.literal("response.output_item.added"),
    item: outputItemSchema,
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.output_item.done"),
    item: outputItemSchema,
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.content_part.added"),
    item_id: z6.string(),
    output_index: z6.number(),
    content_index: z6.number(),
    part: messageContentPartSchema
  }),
  z6.object({
    type: z6.literal("response.content_part.done"),
    item_id: z6.string(),
    output_index: z6.number(),
    content_index: z6.number(),
    part: messageContentPartSchema
  }),
  z6.object({
    type: z6.literal("response.output_text.delta"),
    item_id: z6.string(),
    output_index: z6.number(),
    content_index: z6.number(),
    delta: z6.string(),
    logprobs: z6.array(z6.any()).optional()
  }),
  z6.object({
    type: z6.literal("response.output_text.done"),
    item_id: z6.string(),
    output_index: z6.number(),
    content_index: z6.number(),
    text: z6.string(),
    logprobs: z6.array(z6.any()).optional(),
    annotations: z6.array(annotationSchema).optional()
  }),
  z6.object({
    type: z6.literal("response.output_text.annotation.added"),
    item_id: z6.string(),
    output_index: z6.number(),
    content_index: z6.number(),
    annotation_index: z6.number(),
    annotation: annotationSchema
  }),
  z6.object({
    type: z6.literal("response.reasoning_summary_part.added"),
    item_id: z6.string(),
    output_index: z6.number(),
    summary_index: z6.number(),
    part: reasoningSummaryPartSchema
  }),
  z6.object({
    type: z6.literal("response.reasoning_summary_part.done"),
    item_id: z6.string(),
    output_index: z6.number(),
    summary_index: z6.number(),
    part: reasoningSummaryPartSchema
  }),
  z6.object({
    type: z6.literal("response.reasoning_summary_text.delta"),
    item_id: z6.string(),
    output_index: z6.number(),
    summary_index: z6.number(),
    delta: z6.string()
  }),
  z6.object({
    type: z6.literal("response.reasoning_summary_text.done"),
    item_id: z6.string(),
    output_index: z6.number(),
    summary_index: z6.number(),
    text: z6.string()
  }),
  z6.object({
    type: z6.literal("response.reasoning_text.delta"),
    item_id: z6.string(),
    output_index: z6.number(),
    content_index: z6.number(),
    delta: z6.string()
  }),
  z6.object({
    type: z6.literal("response.reasoning_text.done"),
    item_id: z6.string(),
    output_index: z6.number(),
    content_index: z6.number(),
    text: z6.string()
  }),
  z6.object({
    type: z6.literal("response.web_search_call.in_progress"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.web_search_call.searching"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.web_search_call.completed"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.x_search_call.in_progress"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.x_search_call.searching"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.x_search_call.completed"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.file_search_call.in_progress"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.file_search_call.searching"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.file_search_call.completed"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.code_execution_call.in_progress"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.code_execution_call.executing"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.code_execution_call.completed"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.code_interpreter_call.in_progress"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.code_interpreter_call.executing"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.code_interpreter_call.interpreting"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.code_interpreter_call.completed"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  // Code interpreter code streaming events
  z6.object({
    type: z6.literal("response.code_interpreter_call_code.delta"),
    item_id: z6.string(),
    output_index: z6.number(),
    delta: z6.string()
  }),
  z6.object({
    type: z6.literal("response.code_interpreter_call_code.done"),
    item_id: z6.string(),
    output_index: z6.number(),
    code: z6.string()
  }),
  z6.object({
    type: z6.literal("response.custom_tool_call_input.delta"),
    item_id: z6.string(),
    output_index: z6.number(),
    delta: z6.string()
  }),
  z6.object({
    type: z6.literal("response.custom_tool_call_input.done"),
    item_id: z6.string(),
    output_index: z6.number(),
    input: z6.string()
  }),
  // Function call arguments streaming events (standard function tools)
  z6.object({
    type: z6.literal("response.function_call_arguments.delta"),
    item_id: z6.string(),
    output_index: z6.number(),
    delta: z6.string()
  }),
  z6.object({
    type: z6.literal("response.function_call_arguments.done"),
    item_id: z6.string(),
    output_index: z6.number(),
    arguments: z6.string()
  }),
  z6.object({
    type: z6.literal("response.mcp_call.in_progress"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.mcp_call.executing"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.mcp_call.completed"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.mcp_call.failed"),
    item_id: z6.string(),
    output_index: z6.number()
  }),
  z6.object({
    type: z6.literal("response.mcp_call_arguments.delta"),
    item_id: z6.string(),
    output_index: z6.number(),
    delta: z6.string()
  }),
  z6.object({
    type: z6.literal("response.mcp_call_arguments.done"),
    item_id: z6.string(),
    output_index: z6.number(),
    arguments: z6.string().optional()
  }),
  z6.object({
    type: z6.literal("response.mcp_call_output.delta"),
    item_id: z6.string(),
    output_index: z6.number(),
    delta: z6.string()
  }),
  z6.object({
    type: z6.literal("response.mcp_call_output.done"),
    item_id: z6.string(),
    output_index: z6.number(),
    output: z6.string().optional()
  }),
  z6.object({
    type: z6.literal("response.done"),
    response: xaiResponsesResponseSchema
  }),
  z6.object({
    type: z6.literal("response.completed"),
    response: xaiResponsesResponseSchema
  })
]);

// src/responses/xai-responses-options.ts
import { z as z7 } from "zod/v4";
var xaiLanguageModelResponsesOptions = z7.object({
  /**
   * Constrains how hard a reasoning model thinks before responding.
   * Possible values are `low` (uses fewer reasoning tokens), `medium` and `high` (uses more reasoning tokens).
   */
  reasoningEffort: z7.enum(["low", "medium", "high"]).optional(),
  logprobs: z7.boolean().optional(),
  topLogprobs: z7.number().int().min(0).max(8).optional(),
  /**
   * Whether to store the input message(s) and model response for later retrieval.
   * @default true
   */
  store: z7.boolean().optional(),
  /**
   * The ID of the previous response from the model.
   */
  previousResponseId: z7.string().optional(),
  /**
   * Specify additional output data to include in the model response.
   * Example values: 'file_search_call.results'.
   */
  include: z7.array(z7.enum(["file_search_call.results"])).nullish()
});

// src/responses/xai-responses-prepare-tools.ts
import {
  UnsupportedFunctionalityError as UnsupportedFunctionalityError4
} from "@ai-sdk/provider";
import { validateTypes } from "@ai-sdk/provider-utils";

// src/tool/file-search.ts
import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema
} from "@ai-sdk/provider-utils";
import { z as z8 } from "zod/v4";
var fileSearchArgsSchema = lazySchema(
  () => zodSchema(
    z8.object({
      vectorStoreIds: z8.array(z8.string()),
      maxNumResults: z8.number().optional()
    })
  )
);
var fileSearchOutputSchema = lazySchema(
  () => zodSchema(
    z8.object({
      queries: z8.array(z8.string()),
      results: z8.array(
        z8.object({
          fileId: z8.string(),
          filename: z8.string(),
          score: z8.number().min(0).max(1),
          text: z8.string()
        })
      ).nullable()
    })
  )
);
var fileSearchToolFactory = createProviderToolFactoryWithOutputSchema({
  id: "xai.file_search",
  inputSchema: lazySchema(() => zodSchema(z8.object({}))),
  outputSchema: fileSearchOutputSchema
});
var fileSearch = (args) => fileSearchToolFactory(args);

// src/tool/mcp-server.ts
import {
  createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema2,
  lazySchema as lazySchema2,
  zodSchema as zodSchema2
} from "@ai-sdk/provider-utils";
import { z as z9 } from "zod/v4";
var mcpServerArgsSchema = lazySchema2(
  () => zodSchema2(
    z9.object({
      serverUrl: z9.string().describe("The URL of the MCP server"),
      serverLabel: z9.string().optional().describe("A label for the MCP server"),
      serverDescription: z9.string().optional().describe("Description of the MCP server"),
      allowedTools: z9.array(z9.string()).optional().describe("List of allowed tool names"),
      headers: z9.record(z9.string(), z9.string()).optional().describe("Custom headers to send"),
      authorization: z9.string().optional().describe("Authorization header value")
    })
  )
);
var mcpServerOutputSchema = lazySchema2(
  () => zodSchema2(
    z9.object({
      name: z9.string(),
      arguments: z9.string(),
      result: z9.unknown()
    })
  )
);
var mcpServerToolFactory = createProviderToolFactoryWithOutputSchema2({
  id: "xai.mcp",
  inputSchema: lazySchema2(() => zodSchema2(z9.object({}))),
  outputSchema: mcpServerOutputSchema
});
var mcpServer = (args) => mcpServerToolFactory(args);

// src/tool/web-search.ts
import {
  createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema3,
  lazySchema as lazySchema3,
  zodSchema as zodSchema3
} from "@ai-sdk/provider-utils";
import { z as z10 } from "zod/v4";
var webSearchArgsSchema = lazySchema3(
  () => zodSchema3(
    z10.object({
      allowedDomains: z10.array(z10.string()).max(5).optional(),
      excludedDomains: z10.array(z10.string()).max(5).optional(),
      enableImageUnderstanding: z10.boolean().optional()
    })
  )
);
var webSearchOutputSchema = lazySchema3(
  () => zodSchema3(
    z10.object({
      query: z10.string(),
      sources: z10.array(
        z10.object({
          title: z10.string(),
          url: z10.string(),
          snippet: z10.string()
        })
      )
    })
  )
);
var webSearchToolFactory = createProviderToolFactoryWithOutputSchema3({
  id: "xai.web_search",
  inputSchema: lazySchema3(() => zodSchema3(z10.object({}))),
  outputSchema: webSearchOutputSchema
});
var webSearch = (args = {}) => webSearchToolFactory(args);

// src/tool/x-search.ts
import {
  createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema4,
  lazySchema as lazySchema4,
  zodSchema as zodSchema4
} from "@ai-sdk/provider-utils";
import { z as z11 } from "zod/v4";
var xSearchArgsSchema = lazySchema4(
  () => zodSchema4(
    z11.object({
      allowedXHandles: z11.array(z11.string()).max(10).optional(),
      excludedXHandles: z11.array(z11.string()).max(10).optional(),
      fromDate: z11.string().optional(),
      toDate: z11.string().optional(),
      enableImageUnderstanding: z11.boolean().optional(),
      enableVideoUnderstanding: z11.boolean().optional()
    })
  )
);
var xSearchOutputSchema = lazySchema4(
  () => zodSchema4(
    z11.object({
      query: z11.string(),
      posts: z11.array(
        z11.object({
          author: z11.string(),
          text: z11.string(),
          url: z11.string(),
          likes: z11.number()
        })
      )
    })
  )
);
var xSearchToolFactory = createProviderToolFactoryWithOutputSchema4({
  id: "xai.x_search",
  inputSchema: lazySchema4(() => zodSchema4(z11.object({}))),
  outputSchema: xSearchOutputSchema
});
var xSearch = (args = {}) => xSearchToolFactory(args);

// src/responses/xai-responses-prepare-tools.ts
async function prepareResponsesTools({
  tools,
  toolChoice
}) {
  const normalizedTools = (tools == null ? void 0 : tools.length) ? tools : void 0;
  const toolWarnings = [];
  if (normalizedTools == null) {
    return { tools: void 0, toolChoice: void 0, toolWarnings };
  }
  const xaiTools2 = [];
  const toolByName = /* @__PURE__ */ new Map();
  for (const tool of normalizedTools) {
    toolByName.set(tool.name, tool);
    if (tool.type === "provider") {
      switch (tool.id) {
        case "xai.web_search": {
          const args = await validateTypes({
            value: tool.args,
            schema: webSearchArgsSchema
          });
          xaiTools2.push({
            type: "web_search",
            allowed_domains: args.allowedDomains,
            excluded_domains: args.excludedDomains,
            enable_image_understanding: args.enableImageUnderstanding
          });
          break;
        }
        case "xai.x_search": {
          const args = await validateTypes({
            value: tool.args,
            schema: xSearchArgsSchema
          });
          xaiTools2.push({
            type: "x_search",
            allowed_x_handles: args.allowedXHandles,
            excluded_x_handles: args.excludedXHandles,
            from_date: args.fromDate,
            to_date: args.toDate,
            enable_image_understanding: args.enableImageUnderstanding,
            enable_video_understanding: args.enableVideoUnderstanding
          });
          break;
        }
        case "xai.code_execution": {
          xaiTools2.push({
            type: "code_interpreter"
          });
          break;
        }
        case "xai.view_image": {
          xaiTools2.push({
            type: "view_image"
          });
          break;
        }
        case "xai.view_x_video": {
          xaiTools2.push({
            type: "view_x_video"
          });
          break;
        }
        case "xai.file_search": {
          const args = await validateTypes({
            value: tool.args,
            schema: fileSearchArgsSchema
          });
          xaiTools2.push({
            type: "file_search",
            vector_store_ids: args.vectorStoreIds,
            max_num_results: args.maxNumResults
          });
          break;
        }
        case "xai.mcp": {
          const args = await validateTypes({
            value: tool.args,
            schema: mcpServerArgsSchema
          });
          xaiTools2.push({
            type: "mcp",
            server_url: args.serverUrl,
            server_label: args.serverLabel,
            server_description: args.serverDescription,
            allowed_tools: args.allowedTools,
            headers: args.headers,
            authorization: args.authorization
          });
          break;
        }
        default: {
          toolWarnings.push({
            type: "unsupported",
            feature: `provider-defined tool ${tool.name}`
          });
          break;
        }
      }
    } else {
      xaiTools2.push({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
        ...tool.strict != null ? { strict: tool.strict } : {}
      });
    }
  }
  if (toolChoice == null) {
    return { tools: xaiTools2, toolChoice: void 0, toolWarnings };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
    case "none":
      return { tools: xaiTools2, toolChoice: type, toolWarnings };
    case "required":
      return { tools: xaiTools2, toolChoice: "required", toolWarnings };
    case "tool": {
      const selectedTool = toolByName.get(toolChoice.toolName);
      if (selectedTool == null) {
        return {
          tools: xaiTools2,
          toolChoice: void 0,
          toolWarnings
        };
      }
      if (selectedTool.type === "provider") {
        toolWarnings.push({
          type: "unsupported",
          feature: `toolChoice for server-side tool "${selectedTool.name}"`
        });
        return { tools: xaiTools2, toolChoice: void 0, toolWarnings };
      }
      return {
        tools: xaiTools2,
        toolChoice: { type: "function", name: selectedTool.name },
        toolWarnings
      };
    }
    default: {
      const _exhaustiveCheck = type;
      throw new UnsupportedFunctionalityError4({
        functionality: `tool choice type: ${_exhaustiveCheck}`
      });
    }
  }
}

// src/responses/xai-responses-language-model.ts
var XaiResponsesLanguageModel = class {
  constructor(modelId, config) {
    this.specificationVersion = "v3";
    this.supportedUrls = {
      "image/*": [/^https?:\/\/.*$/]
    };
    this.modelId = modelId;
    this.config = config;
  }
  get provider() {
    return this.config.provider;
  }
  async getArgs({
    prompt,
    maxOutputTokens,
    temperature,
    topP,
    stopSequences,
    seed,
    responseFormat,
    providerOptions,
    tools,
    toolChoice
  }) {
    var _a, _b, _c, _d, _e, _f, _g;
    const warnings = [];
    const options = (_a = await parseProviderOptions3({
      provider: "xai",
      providerOptions,
      schema: xaiLanguageModelResponsesOptions
    })) != null ? _a : {};
    if (stopSequences != null) {
      warnings.push({ type: "unsupported", feature: "stopSequences" });
    }
    const webSearchToolName = (_b = tools == null ? void 0 : tools.find(
      (tool) => tool.type === "provider" && tool.id === "xai.web_search"
    )) == null ? void 0 : _b.name;
    const xSearchToolName = (_c = tools == null ? void 0 : tools.find(
      (tool) => tool.type === "provider" && tool.id === "xai.x_search"
    )) == null ? void 0 : _c.name;
    const codeExecutionToolName = (_d = tools == null ? void 0 : tools.find(
      (tool) => tool.type === "provider" && tool.id === "xai.code_execution"
    )) == null ? void 0 : _d.name;
    const mcpToolName = (_e = tools == null ? void 0 : tools.find(
      (tool) => tool.type === "provider" && tool.id === "xai.mcp"
    )) == null ? void 0 : _e.name;
    const fileSearchToolName = (_f = tools == null ? void 0 : tools.find(
      (tool) => tool.type === "provider" && tool.id === "xai.file_search"
    )) == null ? void 0 : _f.name;
    const { input, inputWarnings } = await convertToXaiResponsesInput({
      prompt,
      store: true
    });
    warnings.push(...inputWarnings);
    const {
      tools: xaiTools2,
      toolChoice: xaiToolChoice,
      toolWarnings
    } = await prepareResponsesTools({
      tools,
      toolChoice
    });
    warnings.push(...toolWarnings);
    let include = options.include ? [...options.include] : void 0;
    if (options.store === false) {
      if (include == null) {
        include = ["reasoning.encrypted_content"];
      } else {
        include = [...include, "reasoning.encrypted_content"];
      }
    }
    const baseArgs = {
      model: this.modelId,
      input,
      logprobs: options.logprobs === true || options.topLogprobs != null ? true : void 0,
      top_logprobs: options.topLogprobs,
      max_output_tokens: maxOutputTokens,
      temperature,
      top_p: topP,
      seed,
      ...(responseFormat == null ? void 0 : responseFormat.type) === "json" && {
        text: {
          format: responseFormat.schema != null ? {
            type: "json_schema",
            strict: true,
            name: (_g = responseFormat.name) != null ? _g : "response",
            description: responseFormat.description,
            schema: responseFormat.schema
          } : { type: "json_object" }
        }
      },
      ...options.reasoningEffort != null && {
        reasoning: { effort: options.reasoningEffort }
      },
      ...options.store === false && {
        store: options.store
      },
      ...include != null && {
        include
      },
      ...options.previousResponseId != null && {
        previous_response_id: options.previousResponseId
      }
    };
    if (xaiTools2 && xaiTools2.length > 0) {
      baseArgs.tools = xaiTools2;
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
      fileSearchToolName
    };
  }
  async doGenerate(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
    const {
      args: body,
      warnings,
      webSearchToolName,
      xSearchToolName,
      codeExecutionToolName,
      mcpToolName,
      fileSearchToolName
    } = await this.getArgs(options);
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await postJsonToApi3({
      url: `${(_a = this.config.baseURL) != null ? _a : "https://api.x.ai/v1"}/responses`,
      headers: combineHeaders3(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler3(
        xaiResponsesResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const content = [];
    const webSearchSubTools = [
      "web_search",
      "web_search_with_snippets",
      "browse_page"
    ];
    const xSearchSubTools = [
      "x_user_search",
      "x_keyword_search",
      "x_semantic_search",
      "x_thread_fetch"
    ];
    for (const part of response.output) {
      if (part.type === "file_search_call") {
        const toolName = fileSearchToolName != null ? fileSearchToolName : "file_search";
        content.push({
          type: "tool-call",
          toolCallId: part.id,
          toolName,
          input: "",
          providerExecuted: true
        });
        content.push({
          type: "tool-result",
          toolCallId: part.id,
          toolName,
          result: {
            queries: (_b = part.queries) != null ? _b : [],
            results: (_d = (_c = part.results) == null ? void 0 : _c.map((result) => ({
              fileId: result.file_id,
              filename: result.filename,
              score: result.score,
              text: result.text
            }))) != null ? _d : null
          }
        });
        continue;
      }
      if (part.type === "web_search_call" || part.type === "x_search_call" || part.type === "code_interpreter_call" || part.type === "code_execution_call" || part.type === "view_image_call" || part.type === "view_x_video_call" || part.type === "custom_tool_call" || part.type === "mcp_call") {
        let toolName = (_e = part.name) != null ? _e : "";
        if (webSearchSubTools.includes((_f = part.name) != null ? _f : "") || part.type === "web_search_call") {
          toolName = webSearchToolName != null ? webSearchToolName : "web_search";
        } else if (xSearchSubTools.includes((_g = part.name) != null ? _g : "") || part.type === "x_search_call") {
          toolName = xSearchToolName != null ? xSearchToolName : "x_search";
        } else if (part.name === "code_execution" || part.type === "code_interpreter_call" || part.type === "code_execution_call") {
          toolName = codeExecutionToolName != null ? codeExecutionToolName : "code_execution";
        } else if (part.type === "mcp_call") {
          toolName = (_h = mcpToolName != null ? mcpToolName : part.name) != null ? _h : "mcp";
        }
        const toolInput = part.type === "custom_tool_call" ? (_i = part.input) != null ? _i : "" : part.type === "mcp_call" ? (_j = part.arguments) != null ? _j : "" : (_k = part.arguments) != null ? _k : "";
        content.push({
          type: "tool-call",
          toolCallId: part.id,
          toolName,
          input: toolInput,
          providerExecuted: true
        });
        continue;
      }
      switch (part.type) {
        case "message": {
          for (const contentPart of part.content) {
            if (contentPart.text) {
              content.push({
                type: "text",
                text: contentPart.text
              });
            }
            if (contentPart.annotations) {
              for (const annotation of contentPart.annotations) {
                if (annotation.type === "url_citation" && "url" in annotation) {
                  content.push({
                    type: "source",
                    sourceType: "url",
                    id: this.config.generateId(),
                    url: annotation.url,
                    title: (_l = annotation.title) != null ? _l : annotation.url
                  });
                }
              }
            }
          }
          break;
        }
        case "function_call": {
          content.push({
            type: "tool-call",
            toolCallId: part.call_id,
            toolName: part.name,
            input: part.arguments
          });
          break;
        }
        case "reasoning": {
          const summaryTexts = part.summary.map((s) => s.text).filter((text) => text && text.length > 0);
          if (summaryTexts.length > 0) {
            const reasoningText = summaryTexts.join("");
            if (part.encrypted_content || part.id) {
              content.push({
                type: "reasoning",
                text: reasoningText,
                providerMetadata: {
                  xai: {
                    ...part.encrypted_content && {
                      reasoningEncryptedContent: part.encrypted_content
                    },
                    ...part.id && { itemId: part.id }
                  }
                }
              });
            } else {
              content.push({
                type: "reasoning",
                text: reasoningText
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
        raw: (_m = response.status) != null ? _m : void 0
      },
      usage: response.usage ? convertXaiResponsesUsage(response.usage) : {
        inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 0, text: 0, reasoning: 0 }
      },
      request: { body },
      response: {
        ...getResponseMetadata(response),
        headers: responseHeaders,
        body: rawResponse
      },
      warnings
    };
  }
  async doStream(options) {
    var _a;
    const {
      args,
      warnings,
      webSearchToolName,
      xSearchToolName,
      codeExecutionToolName,
      mcpToolName,
      fileSearchToolName
    } = await this.getArgs(options);
    const body = {
      ...args,
      stream: true
    };
    const { responseHeaders, value: response } = await postJsonToApi3({
      url: `${(_a = this.config.baseURL) != null ? _a : "https://api.x.ai/v1"}/responses`,
      headers: combineHeaders3(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler2(
        xaiResponsesChunkSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    let finishReason = {
      unified: "other",
      raw: void 0
    };
    let usage = void 0;
    let isFirstChunk = true;
    const contentBlocks = {};
    const seenToolCalls = /* @__PURE__ */ new Set();
    const ongoingToolCalls = {};
    const activeReasoning = {};
    const self = this;
    return {
      stream: response.pipeThrough(
        new TransformStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings });
          },
          transform(chunk, controller) {
            var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
            if (options.includeRawChunks) {
              controller.enqueue({ type: "raw", rawValue: chunk.rawValue });
            }
            if (!chunk.success) {
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }
            const event = chunk.value;
            if (event.type === "response.created" || event.type === "response.in_progress") {
              if (isFirstChunk) {
                controller.enqueue({
                  type: "response-metadata",
                  ...getResponseMetadata(event.response)
                });
                isFirstChunk = false;
              }
              return;
            }
            if (event.type === "response.reasoning_summary_part.added") {
              const blockId = `reasoning-${event.item_id}`;
              activeReasoning[event.item_id] = {};
              controller.enqueue({
                type: "reasoning-start",
                id: blockId,
                providerMetadata: {
                  xai: {
                    itemId: event.item_id
                  }
                }
              });
            }
            if (event.type === "response.reasoning_summary_text.delta") {
              const blockId = `reasoning-${event.item_id}`;
              controller.enqueue({
                type: "reasoning-delta",
                id: blockId,
                delta: event.delta,
                providerMetadata: {
                  xai: {
                    itemId: event.item_id
                  }
                }
              });
              return;
            }
            if (event.type === "response.reasoning_summary_text.done") {
              return;
            }
            if (event.type === "response.reasoning_text.delta") {
              const blockId = `reasoning-${event.item_id}`;
              if (activeReasoning[event.item_id] == null) {
                activeReasoning[event.item_id] = {};
                controller.enqueue({
                  type: "reasoning-start",
                  id: blockId,
                  providerMetadata: {
                    xai: {
                      itemId: event.item_id
                    }
                  }
                });
              }
              controller.enqueue({
                type: "reasoning-delta",
                id: blockId,
                delta: event.delta,
                providerMetadata: {
                  xai: {
                    itemId: event.item_id
                  }
                }
              });
              return;
            }
            if (event.type === "response.reasoning_text.done") {
              return;
            }
            if (event.type === "response.output_text.delta") {
              const blockId = `text-${event.item_id}`;
              if (contentBlocks[blockId] == null) {
                contentBlocks[blockId] = { type: "text" };
                controller.enqueue({
                  type: "text-start",
                  id: blockId
                });
              }
              controller.enqueue({
                type: "text-delta",
                id: blockId,
                delta: event.delta
              });
              return;
            }
            if (event.type === "response.output_text.done") {
              if (event.annotations) {
                for (const annotation of event.annotations) {
                  if (annotation.type === "url_citation" && "url" in annotation) {
                    controller.enqueue({
                      type: "source",
                      sourceType: "url",
                      id: self.config.generateId(),
                      url: annotation.url,
                      title: (_a2 = annotation.title) != null ? _a2 : annotation.url
                    });
                  }
                }
              }
              return;
            }
            if (event.type === "response.output_text.annotation.added") {
              const annotation = event.annotation;
              if (annotation.type === "url_citation" && "url" in annotation) {
                controller.enqueue({
                  type: "source",
                  sourceType: "url",
                  id: self.config.generateId(),
                  url: annotation.url,
                  title: (_b = annotation.title) != null ? _b : annotation.url
                });
              }
              return;
            }
            if (event.type === "response.done" || event.type === "response.completed") {
              const response2 = event.response;
              if (response2.usage) {
                usage = convertXaiResponsesUsage(response2.usage);
              }
              if (response2.status) {
                finishReason = {
                  unified: mapXaiResponsesFinishReason(response2.status),
                  raw: response2.status
                };
              }
              return;
            }
            if (event.type === "response.custom_tool_call_input.delta" || event.type === "response.custom_tool_call_input.done") {
              return;
            }
            if (event.type === "response.function_call_arguments.delta") {
              const toolCall = ongoingToolCalls[event.output_index];
              if (toolCall != null) {
                controller.enqueue({
                  type: "tool-input-delta",
                  id: toolCall.toolCallId,
                  delta: event.delta
                });
              }
              return;
            }
            if (event.type === "response.function_call_arguments.done") {
              return;
            }
            if (event.type === "response.output_item.added" || event.type === "response.output_item.done") {
              const part = event.item;
              if (part.type === "reasoning") {
                if (event.type === "response.output_item.done") {
                  const blockId = `reasoning-${part.id}`;
                  if (!(part.id in activeReasoning)) {
                    activeReasoning[part.id] = {};
                    controller.enqueue({
                      type: "reasoning-start",
                      id: blockId,
                      providerMetadata: {
                        xai: {
                          ...part.id && { itemId: part.id }
                        }
                      }
                    });
                  }
                  controller.enqueue({
                    type: "reasoning-end",
                    id: blockId,
                    providerMetadata: {
                      xai: {
                        ...part.encrypted_content && {
                          reasoningEncryptedContent: part.encrypted_content
                        },
                        ...part.id && { itemId: part.id }
                      }
                    }
                  });
                  delete activeReasoning[part.id];
                }
                return;
              }
              if (part.type === "file_search_call") {
                const toolName = fileSearchToolName != null ? fileSearchToolName : "file_search";
                if (!seenToolCalls.has(part.id)) {
                  seenToolCalls.add(part.id);
                  controller.enqueue({
                    type: "tool-input-start",
                    id: part.id,
                    toolName
                  });
                  controller.enqueue({
                    type: "tool-input-delta",
                    id: part.id,
                    delta: ""
                  });
                  controller.enqueue({
                    type: "tool-input-end",
                    id: part.id
                  });
                  controller.enqueue({
                    type: "tool-call",
                    toolCallId: part.id,
                    toolName,
                    input: "",
                    providerExecuted: true
                  });
                }
                if (event.type === "response.output_item.done") {
                  controller.enqueue({
                    type: "tool-result",
                    toolCallId: part.id,
                    toolName,
                    result: {
                      queries: (_c = part.queries) != null ? _c : [],
                      results: (_e = (_d = part.results) == null ? void 0 : _d.map((result) => ({
                        fileId: result.file_id,
                        filename: result.filename,
                        score: result.score,
                        text: result.text
                      }))) != null ? _e : null
                    }
                  });
                }
                return;
              }
              if (part.type === "web_search_call" || part.type === "x_search_call" || part.type === "code_interpreter_call" || part.type === "code_execution_call" || part.type === "view_image_call" || part.type === "view_x_video_call" || part.type === "custom_tool_call" || part.type === "mcp_call") {
                const webSearchSubTools = [
                  "web_search",
                  "web_search_with_snippets",
                  "browse_page"
                ];
                const xSearchSubTools = [
                  "x_user_search",
                  "x_keyword_search",
                  "x_semantic_search",
                  "x_thread_fetch"
                ];
                let toolName = (_f = part.name) != null ? _f : "";
                if (webSearchSubTools.includes((_g = part.name) != null ? _g : "") || part.type === "web_search_call") {
                  toolName = webSearchToolName != null ? webSearchToolName : "web_search";
                } else if (xSearchSubTools.includes((_h = part.name) != null ? _h : "") || part.type === "x_search_call") {
                  toolName = xSearchToolName != null ? xSearchToolName : "x_search";
                } else if (part.name === "code_execution" || part.type === "code_interpreter_call" || part.type === "code_execution_call") {
                  toolName = codeExecutionToolName != null ? codeExecutionToolName : "code_execution";
                } else if (part.type === "mcp_call") {
                  toolName = (_i = mcpToolName != null ? mcpToolName : part.name) != null ? _i : "mcp";
                }
                const toolInput = part.type === "custom_tool_call" ? (_j = part.input) != null ? _j : "" : part.type === "mcp_call" ? (_k = part.arguments) != null ? _k : "" : (_l = part.arguments) != null ? _l : "";
                const shouldEmit = part.type === "custom_tool_call" ? event.type === "response.output_item.done" : !seenToolCalls.has(part.id);
                if (shouldEmit && !seenToolCalls.has(part.id)) {
                  seenToolCalls.add(part.id);
                  controller.enqueue({
                    type: "tool-input-start",
                    id: part.id,
                    toolName
                  });
                  controller.enqueue({
                    type: "tool-input-delta",
                    id: part.id,
                    delta: toolInput
                  });
                  controller.enqueue({
                    type: "tool-input-end",
                    id: part.id
                  });
                  controller.enqueue({
                    type: "tool-call",
                    toolCallId: part.id,
                    toolName,
                    input: toolInput,
                    providerExecuted: true
                  });
                }
                return;
              }
              if (part.type === "message") {
                for (const contentPart of part.content) {
                  if (contentPart.text && contentPart.text.length > 0) {
                    const blockId = `text-${part.id}`;
                    if (contentBlocks[blockId] == null) {
                      contentBlocks[blockId] = { type: "text" };
                      controller.enqueue({
                        type: "text-start",
                        id: blockId
                      });
                      controller.enqueue({
                        type: "text-delta",
                        id: blockId,
                        delta: contentPart.text
                      });
                    }
                  }
                  if (contentPart.annotations) {
                    for (const annotation of contentPart.annotations) {
                      if (annotation.type === "url_citation" && "url" in annotation) {
                        controller.enqueue({
                          type: "source",
                          sourceType: "url",
                          id: self.config.generateId(),
                          url: annotation.url,
                          title: (_m = annotation.title) != null ? _m : annotation.url
                        });
                      }
                    }
                  }
                }
              } else if (part.type === "function_call") {
                if (event.type === "response.output_item.added") {
                  ongoingToolCalls[event.output_index] = {
                    toolName: part.name,
                    toolCallId: part.call_id
                  };
                  controller.enqueue({
                    type: "tool-input-start",
                    id: part.call_id,
                    toolName: part.name
                  });
                } else if (event.type === "response.output_item.done") {
                  ongoingToolCalls[event.output_index] = void 0;
                  controller.enqueue({
                    type: "tool-input-end",
                    id: part.call_id
                  });
                  controller.enqueue({
                    type: "tool-call",
                    toolCallId: part.call_id,
                    toolName: part.name,
                    input: part.arguments
                  });
                }
              }
            }
          },
          flush(controller) {
            for (const [blockId, block] of Object.entries(contentBlocks)) {
              if (block.type === "text") {
                controller.enqueue({
                  type: "text-end",
                  id: blockId
                });
              }
            }
            controller.enqueue({
              type: "finish",
              finishReason,
              usage: usage != null ? usage : {
                inputTokens: {
                  total: 0,
                  noCache: 0,
                  cacheRead: 0,
                  cacheWrite: 0
                },
                outputTokens: { total: 0, text: 0, reasoning: 0 }
              }
            });
          }
        })
      ),
      request: { body },
      response: { headers: responseHeaders }
    };
  }
};

// src/tool/code-execution.ts
import { createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema5 } from "@ai-sdk/provider-utils";
import { z as z12 } from "zod/v4";
var codeExecutionOutputSchema = z12.object({
  output: z12.string().describe("the output of the code execution"),
  error: z12.string().optional().describe("any error that occurred")
});
var codeExecutionToolFactory = createProviderToolFactoryWithOutputSchema5({
  id: "xai.code_execution",
  inputSchema: z12.object({}).describe("no input parameters"),
  outputSchema: codeExecutionOutputSchema
});
var codeExecution = (args = {}) => codeExecutionToolFactory(args);

// src/tool/view-image.ts
import { createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema6 } from "@ai-sdk/provider-utils";
import { z as z13 } from "zod/v4";
var viewImageOutputSchema = z13.object({
  description: z13.string().describe("description of the image"),
  objects: z13.array(z13.string()).optional().describe("objects detected in the image")
});
var viewImageToolFactory = createProviderToolFactoryWithOutputSchema6({
  id: "xai.view_image",
  inputSchema: z13.object({}).describe("no input parameters"),
  outputSchema: viewImageOutputSchema
});
var viewImage = (args = {}) => viewImageToolFactory(args);

// src/tool/view-x-video.ts
import { createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema7 } from "@ai-sdk/provider-utils";
import { z as z14 } from "zod/v4";
var viewXVideoOutputSchema = z14.object({
  transcript: z14.string().optional().describe("transcript of the video"),
  description: z14.string().describe("description of the video content"),
  duration: z14.number().optional().describe("duration in seconds")
});
var viewXVideoToolFactory = createProviderToolFactoryWithOutputSchema7({
  id: "xai.view_x_video",
  inputSchema: z14.object({}).describe("no input parameters"),
  outputSchema: viewXVideoOutputSchema
});
var viewXVideo = (args = {}) => viewXVideoToolFactory(args);

// src/tool/index.ts
var xaiTools = {
  codeExecution,
  fileSearch,
  mcpServer,
  viewImage,
  viewXVideo,
  webSearch,
  xSearch
};

// src/version.ts
var VERSION = true ? "3.0.74" : "0.0.0-test";

// src/xai-video-model.ts
import {
  AISDKError
} from "@ai-sdk/provider";
import {
  combineHeaders as combineHeaders4,
  convertUint8ArrayToBase64,
  createJsonResponseHandler as createJsonResponseHandler4,
  delay,
  getFromApi as getFromApi2,
  parseProviderOptions as parseProviderOptions4,
  postJsonToApi as postJsonToApi4
} from "@ai-sdk/provider-utils";
import { z as z16 } from "zod/v4";

// src/xai-video-options.ts
import { lazySchema as lazySchema5, zodSchema as zodSchema5 } from "@ai-sdk/provider-utils";
import { z as z15 } from "zod/v4";
var xaiVideoModelOptionsSchema = lazySchema5(
  () => zodSchema5(
    z15.object({
      pollIntervalMs: z15.number().positive().nullish(),
      pollTimeoutMs: z15.number().positive().nullish(),
      resolution: z15.enum(["480p", "720p"]).nullish(),
      videoUrl: z15.string().nullish()
    }).passthrough()
  )
);

// src/xai-video-model.ts
var RESOLUTION_MAP = {
  "1280x720": "720p",
  "854x480": "480p",
  "640x480": "480p"
};
var XaiVideoModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
    this.maxVideosPerCall = 1;
  }
  get provider() {
    return this.config.provider;
  }
  async doGenerate(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const currentDate = (_c = (_b = (_a = this.config._internal) == null ? void 0 : _a.currentDate) == null ? void 0 : _b.call(_a)) != null ? _c : /* @__PURE__ */ new Date();
    const warnings = [];
    const xaiOptions = await parseProviderOptions4({
      provider: "xai",
      providerOptions: options.providerOptions,
      schema: xaiVideoModelOptionsSchema
    });
    const isEdit = (xaiOptions == null ? void 0 : xaiOptions.videoUrl) != null;
    if (options.fps != null) {
      warnings.push({
        type: "unsupported",
        feature: "fps",
        details: "xAI video models do not support custom FPS."
      });
    }
    if (options.seed != null) {
      warnings.push({
        type: "unsupported",
        feature: "seed",
        details: "xAI video models do not support seed."
      });
    }
    if (options.n != null && options.n > 1) {
      warnings.push({
        type: "unsupported",
        feature: "n",
        details: "xAI video models do not support generating multiple videos per call. Only 1 video will be generated."
      });
    }
    if (isEdit && options.duration != null) {
      warnings.push({
        type: "unsupported",
        feature: "duration",
        details: "xAI video editing does not support custom duration."
      });
    }
    if (isEdit && options.aspectRatio != null) {
      warnings.push({
        type: "unsupported",
        feature: "aspectRatio",
        details: "xAI video editing does not support custom aspect ratio."
      });
    }
    if (isEdit && ((xaiOptions == null ? void 0 : xaiOptions.resolution) != null || options.resolution != null)) {
      warnings.push({
        type: "unsupported",
        feature: "resolution",
        details: "xAI video editing does not support custom resolution."
      });
    }
    const body = {
      model: this.modelId,
      prompt: options.prompt
    };
    if (!isEdit && options.duration != null) {
      body.duration = options.duration;
    }
    if (!isEdit && options.aspectRatio != null) {
      body.aspect_ratio = options.aspectRatio;
    }
    if (!isEdit && (xaiOptions == null ? void 0 : xaiOptions.resolution) != null) {
      body.resolution = xaiOptions.resolution;
    } else if (!isEdit && options.resolution != null) {
      const mapped = RESOLUTION_MAP[options.resolution];
      if (mapped != null) {
        body.resolution = mapped;
      } else {
        warnings.push({
          type: "unsupported",
          feature: "resolution",
          details: `Unrecognized resolution "${options.resolution}". Use providerOptions.xai.resolution with "480p" or "720p" instead.`
        });
      }
    }
    if ((xaiOptions == null ? void 0 : xaiOptions.videoUrl) != null) {
      body.video = { url: xaiOptions.videoUrl };
    }
    if (options.image != null) {
      if (options.image.type === "url") {
        body.image = { url: options.image.url };
      } else {
        const base64Data = typeof options.image.data === "string" ? options.image.data : convertUint8ArrayToBase64(options.image.data);
        body.image = {
          url: `data:${options.image.mediaType};base64,${base64Data}`
        };
      }
    }
    if (xaiOptions != null) {
      for (const [key, value] of Object.entries(xaiOptions)) {
        if (![
          "pollIntervalMs",
          "pollTimeoutMs",
          "resolution",
          "videoUrl"
        ].includes(key)) {
          body[key] = value;
        }
      }
    }
    const baseURL = (_d = this.config.baseURL) != null ? _d : "https://api.x.ai/v1";
    const { value: createResponse } = await postJsonToApi4({
      url: `${baseURL}/videos/${isEdit ? "edits" : "generations"}`,
      headers: combineHeaders4(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler4(
        xaiCreateVideoResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const requestId = createResponse.request_id;
    if (!requestId) {
      throw new AISDKError({
        name: "XAI_VIDEO_GENERATION_ERROR",
        message: `No request_id returned from xAI API. Response: ${JSON.stringify(createResponse)}`
      });
    }
    const pollIntervalMs = (_e = xaiOptions == null ? void 0 : xaiOptions.pollIntervalMs) != null ? _e : 5e3;
    const pollTimeoutMs = (_f = xaiOptions == null ? void 0 : xaiOptions.pollTimeoutMs) != null ? _f : 6e5;
    const startTime = Date.now();
    let responseHeaders;
    while (true) {
      await delay(pollIntervalMs, { abortSignal: options.abortSignal });
      if (Date.now() - startTime > pollTimeoutMs) {
        throw new AISDKError({
          name: "XAI_VIDEO_GENERATION_TIMEOUT",
          message: `Video generation timed out after ${pollTimeoutMs}ms`
        });
      }
      const { value: statusResponse, responseHeaders: pollHeaders } = await getFromApi2({
        url: `${baseURL}/videos/${requestId}`,
        headers: combineHeaders4(this.config.headers(), options.headers),
        successfulResponseHandler: createJsonResponseHandler4(
          xaiVideoStatusResponseSchema
        ),
        failedResponseHandler: xaiFailedResponseHandler,
        abortSignal: options.abortSignal,
        fetch: this.config.fetch
      });
      responseHeaders = pollHeaders;
      if (statusResponse.status === "done" || statusResponse.status == null && ((_g = statusResponse.video) == null ? void 0 : _g.url)) {
        if (((_h = statusResponse.video) == null ? void 0 : _h.respect_moderation) === false) {
          throw new AISDKError({
            name: "XAI_VIDEO_MODERATION_ERROR",
            message: "Video generation was blocked due to a content policy violation."
          });
        }
        if (!((_i = statusResponse.video) == null ? void 0 : _i.url)) {
          throw new AISDKError({
            name: "XAI_VIDEO_GENERATION_ERROR",
            message: "Video generation completed but no video URL was returned."
          });
        }
        return {
          videos: [
            {
              type: "url",
              url: statusResponse.video.url,
              mediaType: "video/mp4"
            }
          ],
          warnings,
          response: {
            timestamp: currentDate,
            modelId: this.modelId,
            headers: responseHeaders
          },
          providerMetadata: {
            xai: {
              requestId,
              videoUrl: statusResponse.video.url,
              ...statusResponse.video.duration != null ? { duration: statusResponse.video.duration } : {},
              ...((_j = statusResponse.usage) == null ? void 0 : _j.cost_in_usd_ticks) != null ? { costInUsdTicks: statusResponse.usage.cost_in_usd_ticks } : {}
            }
          }
        };
      }
      if (statusResponse.status === "expired") {
        throw new AISDKError({
          name: "XAI_VIDEO_GENERATION_EXPIRED",
          message: "Video generation request expired."
        });
      }
    }
  }
};
var xaiCreateVideoResponseSchema = z16.object({
  request_id: z16.string().nullish()
});
var xaiVideoStatusResponseSchema = z16.object({
  status: z16.string().nullish(),
  video: z16.object({
    url: z16.string(),
    duration: z16.number().nullish(),
    respect_moderation: z16.boolean().nullish()
  }).nullish(),
  model: z16.string().nullish(),
  usage: z16.object({
    cost_in_usd_ticks: z16.number().nullish()
  }).nullish()
});

// src/xai-provider.ts
function createXai(options = {}) {
  var _a;
  const baseURL = withoutTrailingSlash(
    (_a = options.baseURL) != null ? _a : "https://api.x.ai/v1"
  );
  const getHeaders = () => withUserAgentSuffix(
    {
      Authorization: `Bearer ${loadApiKey({
        apiKey: options.apiKey,
        environmentVariableName: "XAI_API_KEY",
        description: "xAI API key"
      })}`,
      ...options.headers
    },
    `ai-sdk/xai/${VERSION}`
  );
  const createChatLanguageModel = (modelId) => {
    return new XaiChatLanguageModel(modelId, {
      provider: "xai.chat",
      baseURL,
      headers: getHeaders,
      generateId,
      fetch: options.fetch
    });
  };
  const createResponsesLanguageModel = (modelId) => {
    return new XaiResponsesLanguageModel(modelId, {
      provider: "xai.responses",
      baseURL,
      headers: getHeaders,
      generateId,
      fetch: options.fetch
    });
  };
  const createImageModel = (modelId) => {
    return new XaiImageModel(modelId, {
      provider: "xai.image",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch
    });
  };
  const createVideoModel = (modelId) => {
    return new XaiVideoModel(modelId, {
      provider: "xai.video",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch
    });
  };
  const provider = (modelId) => createChatLanguageModel(modelId);
  provider.specificationVersion = "v3";
  provider.languageModel = createChatLanguageModel;
  provider.chat = createChatLanguageModel;
  provider.responses = createResponsesLanguageModel;
  provider.embeddingModel = (modelId) => {
    throw new NoSuchModelError({ modelId, modelType: "embeddingModel" });
  };
  provider.textEmbeddingModel = provider.embeddingModel;
  provider.imageModel = createImageModel;
  provider.image = createImageModel;
  provider.videoModel = createVideoModel;
  provider.video = createVideoModel;
  provider.tools = xaiTools;
  return provider;
}
var xai = createXai();
export {
  VERSION,
  codeExecution,
  createXai,
  mcpServer,
  viewImage,
  viewXVideo,
  webSearch,
  xSearch,
  xai,
  xaiTools
};
//# sourceMappingURL=index.mjs.map