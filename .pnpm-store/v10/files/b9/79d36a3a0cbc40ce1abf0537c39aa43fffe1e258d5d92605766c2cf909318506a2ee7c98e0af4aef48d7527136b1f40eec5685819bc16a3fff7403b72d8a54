"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  VERSION: () => VERSION,
  codeExecution: () => codeExecution,
  createXai: () => createXai,
  mcpServer: () => mcpServer,
  viewImage: () => viewImage,
  viewXVideo: () => viewXVideo,
  webSearch: () => webSearch,
  xSearch: () => xSearch,
  xai: () => xai,
  xaiTools: () => xaiTools
});
module.exports = __toCommonJS(index_exports);

// src/xai-provider.ts
var import_provider7 = require("@ai-sdk/provider");
var import_provider_utils17 = require("@ai-sdk/provider-utils");

// src/xai-chat-language-model.ts
var import_provider3 = require("@ai-sdk/provider");
var import_provider_utils3 = require("@ai-sdk/provider-utils");
var import_v43 = require("zod/v4");

// src/convert-to-xai-chat-messages.ts
var import_provider = require("@ai-sdk/provider");
var import_provider_utils = require("@ai-sdk/provider-utils");
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
                      url: part.data instanceof URL ? part.data.toString() : `data:${mediaType};base64,${(0, import_provider_utils.convertToBase64)(part.data)}`
                    }
                  };
                } else {
                  throw new import_provider.UnsupportedFunctionalityError({
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
var import_v4 = require("zod/v4");
var webSourceSchema = import_v4.z.object({
  type: import_v4.z.literal("web"),
  country: import_v4.z.string().length(2).optional(),
  excludedWebsites: import_v4.z.array(import_v4.z.string()).max(5).optional(),
  allowedWebsites: import_v4.z.array(import_v4.z.string()).max(5).optional(),
  safeSearch: import_v4.z.boolean().optional()
});
var xSourceSchema = import_v4.z.object({
  type: import_v4.z.literal("x"),
  excludedXHandles: import_v4.z.array(import_v4.z.string()).optional(),
  includedXHandles: import_v4.z.array(import_v4.z.string()).optional(),
  postFavoriteCount: import_v4.z.number().int().optional(),
  postViewCount: import_v4.z.number().int().optional(),
  /**
   * @deprecated use `includedXHandles` instead
   */
  xHandles: import_v4.z.array(import_v4.z.string()).optional()
});
var newsSourceSchema = import_v4.z.object({
  type: import_v4.z.literal("news"),
  country: import_v4.z.string().length(2).optional(),
  excludedWebsites: import_v4.z.array(import_v4.z.string()).max(5).optional(),
  safeSearch: import_v4.z.boolean().optional()
});
var rssSourceSchema = import_v4.z.object({
  type: import_v4.z.literal("rss"),
  links: import_v4.z.array(import_v4.z.string().url()).max(1)
  // currently only supports one RSS link
});
var searchSourceSchema = import_v4.z.discriminatedUnion("type", [
  webSourceSchema,
  xSourceSchema,
  newsSourceSchema,
  rssSourceSchema
]);
var xaiLanguageModelChatOptions = import_v4.z.object({
  reasoningEffort: import_v4.z.enum(["low", "high"]).optional(),
  logprobs: import_v4.z.boolean().optional(),
  topLogprobs: import_v4.z.number().int().min(0).max(8).optional(),
  /**
   * Whether to enable parallel function calling during tool use.
   * When true, the model can call multiple functions in parallel.
   * When false, the model will call functions sequentially.
   * Defaults to true.
   */
  parallel_function_calling: import_v4.z.boolean().optional(),
  searchParameters: import_v4.z.object({
    /**
     * search mode preference
     * - "off": disables search completely
     * - "auto": model decides whether to search (default)
     * - "on": always enables search
     */
    mode: import_v4.z.enum(["off", "auto", "on"]),
    /**
     * whether to return citations in the response
     * defaults to true
     */
    returnCitations: import_v4.z.boolean().optional(),
    /**
     * start date for search data (ISO8601 format: YYYY-MM-DD)
     */
    fromDate: import_v4.z.string().optional(),
    /**
     * end date for search data (ISO8601 format: YYYY-MM-DD)
     */
    toDate: import_v4.z.string().optional(),
    /**
     * maximum number of search results to consider
     * defaults to 20
     */
    maxSearchResults: import_v4.z.number().min(1).max(50).optional(),
    /**
     * data sources to search from.
     * defaults to [{ type: 'web' }, { type: 'x' }] if not specified.
     *
     * @example
     * sources: [{ type: 'web', country: 'US' }, { type: 'x' }]
     */
    sources: import_v4.z.array(searchSourceSchema).optional()
  }).optional()
});

// src/xai-error.ts
var import_provider_utils2 = require("@ai-sdk/provider-utils");
var import_v42 = require("zod/v4");
var xaiErrorDataSchema = import_v42.z.object({
  error: import_v42.z.object({
    message: import_v42.z.string(),
    type: import_v42.z.string().nullish(),
    param: import_v42.z.any().nullish(),
    code: import_v42.z.union([import_v42.z.string(), import_v42.z.number()]).nullish()
  })
});
var xaiFailedResponseHandler = (0, import_provider_utils2.createJsonErrorResponseHandler)({
  errorSchema: xaiErrorDataSchema,
  errorToMessage: (data) => data.error.message
});

// src/xai-prepare-tools.ts
var import_provider2 = require("@ai-sdk/provider");
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
      throw new import_provider2.UnsupportedFunctionalityError({
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
    const options = (_a = await (0, import_provider_utils3.parseProviderOptions)({
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
    } = await (0, import_provider_utils3.postJsonToApi)({
      url,
      headers: (0, import_provider_utils3.combineHeaders)(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils3.createJsonResponseHandler)(
        xaiChatResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    if (response.error != null) {
      throw new import_provider3.APICallError({
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
    const { responseHeaders, value: response } = await (0, import_provider_utils3.postJsonToApi)({
      url,
      headers: (0, import_provider_utils3.combineHeaders)(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: async ({ response: response2 }) => {
        const responseHeaders2 = (0, import_provider_utils3.extractResponseHeaders)(response2);
        const contentType = response2.headers.get("content-type");
        if (contentType == null ? void 0 : contentType.includes("application/json")) {
          const responseBody = await response2.text();
          const parsedError = await (0, import_provider_utils3.safeParseJSON)({
            text: responseBody,
            schema: xaiStreamErrorSchema
          });
          if (parsedError.success) {
            throw new import_provider3.APICallError({
              message: parsedError.value.error,
              url,
              requestBodyValues: body,
              statusCode: 200,
              responseHeaders: responseHeaders2,
              responseBody,
              isRetryable: parsedError.value.code === "The service is currently unavailable"
            });
          }
          throw new import_provider3.APICallError({
            message: "Invalid JSON response",
            url,
            requestBodyValues: body,
            statusCode: 200,
            responseHeaders: responseHeaders2,
            responseBody
          });
        }
        return (0, import_provider_utils3.createEventSourceResponseHandler)(xaiChatChunkSchema)({
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
var xaiUsageSchema = import_v43.z.object({
  prompt_tokens: import_v43.z.number(),
  completion_tokens: import_v43.z.number(),
  total_tokens: import_v43.z.number(),
  prompt_tokens_details: import_v43.z.object({
    text_tokens: import_v43.z.number().nullish(),
    audio_tokens: import_v43.z.number().nullish(),
    image_tokens: import_v43.z.number().nullish(),
    cached_tokens: import_v43.z.number().nullish()
  }).nullish(),
  completion_tokens_details: import_v43.z.object({
    reasoning_tokens: import_v43.z.number().nullish(),
    audio_tokens: import_v43.z.number().nullish(),
    accepted_prediction_tokens: import_v43.z.number().nullish(),
    rejected_prediction_tokens: import_v43.z.number().nullish()
  }).nullish()
});
var xaiChatResponseSchema = import_v43.z.object({
  id: import_v43.z.string().nullish(),
  created: import_v43.z.number().nullish(),
  model: import_v43.z.string().nullish(),
  choices: import_v43.z.array(
    import_v43.z.object({
      message: import_v43.z.object({
        role: import_v43.z.literal("assistant"),
        content: import_v43.z.string().nullish(),
        reasoning_content: import_v43.z.string().nullish(),
        tool_calls: import_v43.z.array(
          import_v43.z.object({
            id: import_v43.z.string(),
            type: import_v43.z.literal("function"),
            function: import_v43.z.object({
              name: import_v43.z.string(),
              arguments: import_v43.z.string()
            })
          })
        ).nullish()
      }),
      index: import_v43.z.number(),
      finish_reason: import_v43.z.string().nullish()
    })
  ).nullish(),
  object: import_v43.z.literal("chat.completion").nullish(),
  usage: xaiUsageSchema.nullish(),
  citations: import_v43.z.array(import_v43.z.string().url()).nullish(),
  code: import_v43.z.string().nullish(),
  error: import_v43.z.string().nullish()
});
var xaiChatChunkSchema = import_v43.z.object({
  id: import_v43.z.string().nullish(),
  created: import_v43.z.number().nullish(),
  model: import_v43.z.string().nullish(),
  choices: import_v43.z.array(
    import_v43.z.object({
      delta: import_v43.z.object({
        role: import_v43.z.enum(["assistant"]).optional(),
        content: import_v43.z.string().nullish(),
        reasoning_content: import_v43.z.string().nullish(),
        tool_calls: import_v43.z.array(
          import_v43.z.object({
            id: import_v43.z.string(),
            type: import_v43.z.literal("function"),
            function: import_v43.z.object({
              name: import_v43.z.string(),
              arguments: import_v43.z.string()
            })
          })
        ).nullish()
      }),
      finish_reason: import_v43.z.string().nullish(),
      index: import_v43.z.number()
    })
  ),
  usage: xaiUsageSchema.nullish(),
  citations: import_v43.z.array(import_v43.z.string().url()).nullish()
});
var xaiStreamErrorSchema = import_v43.z.object({
  code: import_v43.z.string(),
  error: import_v43.z.string()
});

// src/xai-image-model.ts
var import_provider_utils4 = require("@ai-sdk/provider-utils");
var import_v45 = require("zod/v4");

// src/xai-image-options.ts
var import_v44 = require("zod/v4");
var xaiImageModelOptions = import_v44.z.object({
  aspect_ratio: import_v44.z.string().optional(),
  output_format: import_v44.z.string().optional(),
  sync_mode: import_v44.z.boolean().optional(),
  resolution: import_v44.z.enum(["1k", "2k"]).optional(),
  quality: import_v44.z.enum(["low", "medium", "high"]).optional(),
  user: import_v44.z.string().optional()
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
    const xaiOptions = await (0, import_provider_utils4.parseProviderOptions)({
      provider: "xai",
      providerOptions,
      schema: xaiImageModelOptions
    });
    const hasFiles = files != null && files.length > 0;
    const imageUrls = hasFiles ? files.map((file) => (0, import_provider_utils4.convertImageModelFileToDataUri)(file)) : [];
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
    const { value: response, responseHeaders } = await (0, import_provider_utils4.postJsonToApi)({
      url: `${baseURL}${endpoint}`,
      headers: (0, import_provider_utils4.combineHeaders)(this.config.headers(), headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils4.createJsonResponseHandler)(
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
    const { value } = await (0, import_provider_utils4.getFromApi)({
      url,
      abortSignal,
      failedResponseHandler: (0, import_provider_utils4.createStatusCodeErrorResponseHandler)(),
      successfulResponseHandler: (0, import_provider_utils4.createBinaryResponseHandler)(),
      fetch: this.config.fetch
    });
    return value;
  }
};
var xaiImageResponseSchema = import_v45.z.object({
  data: import_v45.z.array(
    import_v45.z.object({
      url: import_v45.z.string().nullish(),
      b64_json: import_v45.z.string().nullish(),
      revised_prompt: import_v45.z.string().nullish()
    })
  ),
  usage: import_v45.z.object({
    cost_in_usd_ticks: import_v45.z.number().nullish()
  }).nullish()
});

// src/responses/xai-responses-language-model.ts
var import_provider_utils11 = require("@ai-sdk/provider-utils");

// src/responses/convert-to-xai-responses-input.ts
var import_provider4 = require("@ai-sdk/provider");
var import_provider_utils5 = require("@ai-sdk/provider-utils");
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
                const imageUrl = block.data instanceof URL ? block.data.toString() : `data:${mediaType};base64,${(0, import_provider_utils5.convertToBase64)(block.data)}`;
                contentParts.push({ type: "input_image", image_url: imageUrl });
              } else {
                throw new import_provider4.UnsupportedFunctionalityError({
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
var import_v46 = require("zod/v4");
var annotationSchema = import_v46.z.union([
  import_v46.z.object({
    type: import_v46.z.literal("url_citation"),
    url: import_v46.z.string(),
    title: import_v46.z.string().optional()
  }),
  import_v46.z.object({
    type: import_v46.z.string()
  })
]);
var messageContentPartSchema = import_v46.z.object({
  type: import_v46.z.string(),
  text: import_v46.z.string().optional(),
  logprobs: import_v46.z.array(import_v46.z.any()).optional(),
  annotations: import_v46.z.array(annotationSchema).optional()
});
var reasoningSummaryPartSchema = import_v46.z.object({
  type: import_v46.z.string(),
  text: import_v46.z.string()
});
var toolCallSchema = import_v46.z.object({
  name: import_v46.z.string().optional(),
  arguments: import_v46.z.string().optional(),
  input: import_v46.z.string().optional(),
  call_id: import_v46.z.string().optional(),
  id: import_v46.z.string(),
  status: import_v46.z.string(),
  action: import_v46.z.any().optional()
});
var mcpCallSchema = import_v46.z.object({
  name: import_v46.z.string().optional(),
  arguments: import_v46.z.string().optional(),
  output: import_v46.z.string().optional(),
  error: import_v46.z.string().optional(),
  id: import_v46.z.string(),
  status: import_v46.z.string(),
  server_label: import_v46.z.string().optional()
});
var outputItemSchema = import_v46.z.discriminatedUnion("type", [
  import_v46.z.object({
    type: import_v46.z.literal("web_search_call"),
    ...toolCallSchema.shape
  }),
  import_v46.z.object({
    type: import_v46.z.literal("x_search_call"),
    ...toolCallSchema.shape
  }),
  import_v46.z.object({
    type: import_v46.z.literal("code_interpreter_call"),
    ...toolCallSchema.shape
  }),
  import_v46.z.object({
    type: import_v46.z.literal("code_execution_call"),
    ...toolCallSchema.shape
  }),
  import_v46.z.object({
    type: import_v46.z.literal("view_image_call"),
    ...toolCallSchema.shape
  }),
  import_v46.z.object({
    type: import_v46.z.literal("view_x_video_call"),
    ...toolCallSchema.shape
  }),
  import_v46.z.object({
    type: import_v46.z.literal("file_search_call"),
    id: import_v46.z.string(),
    status: import_v46.z.string(),
    queries: import_v46.z.array(import_v46.z.string()).optional(),
    results: import_v46.z.array(
      import_v46.z.object({
        file_id: import_v46.z.string(),
        filename: import_v46.z.string(),
        score: import_v46.z.number(),
        text: import_v46.z.string()
      })
    ).nullish()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("custom_tool_call"),
    ...toolCallSchema.shape
  }),
  import_v46.z.object({
    type: import_v46.z.literal("mcp_call"),
    ...mcpCallSchema.shape
  }),
  import_v46.z.object({
    type: import_v46.z.literal("message"),
    role: import_v46.z.string(),
    content: import_v46.z.array(messageContentPartSchema),
    id: import_v46.z.string(),
    status: import_v46.z.string()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("function_call"),
    name: import_v46.z.string(),
    arguments: import_v46.z.string(),
    call_id: import_v46.z.string(),
    id: import_v46.z.string()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("reasoning"),
    id: import_v46.z.string(),
    summary: import_v46.z.array(reasoningSummaryPartSchema),
    status: import_v46.z.string(),
    encrypted_content: import_v46.z.string().nullish()
  })
]);
var xaiResponsesUsageSchema = import_v46.z.object({
  input_tokens: import_v46.z.number(),
  output_tokens: import_v46.z.number(),
  total_tokens: import_v46.z.number().optional(),
  input_tokens_details: import_v46.z.object({
    cached_tokens: import_v46.z.number().optional()
  }).optional(),
  output_tokens_details: import_v46.z.object({
    reasoning_tokens: import_v46.z.number().optional()
  }).optional(),
  num_sources_used: import_v46.z.number().optional(),
  num_server_side_tools_used: import_v46.z.number().optional()
});
var xaiResponsesResponseSchema = import_v46.z.object({
  id: import_v46.z.string().nullish(),
  created_at: import_v46.z.number().nullish(),
  model: import_v46.z.string().nullish(),
  object: import_v46.z.literal("response"),
  output: import_v46.z.array(outputItemSchema),
  usage: xaiResponsesUsageSchema.nullish(),
  status: import_v46.z.string()
});
var xaiResponsesChunkSchema = import_v46.z.union([
  import_v46.z.object({
    type: import_v46.z.literal("response.created"),
    response: xaiResponsesResponseSchema.partial({ usage: true, status: true })
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.in_progress"),
    response: xaiResponsesResponseSchema.partial({ usage: true, status: true })
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.output_item.added"),
    item: outputItemSchema,
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.output_item.done"),
    item: outputItemSchema,
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.content_part.added"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    content_index: import_v46.z.number(),
    part: messageContentPartSchema
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.content_part.done"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    content_index: import_v46.z.number(),
    part: messageContentPartSchema
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.output_text.delta"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    content_index: import_v46.z.number(),
    delta: import_v46.z.string(),
    logprobs: import_v46.z.array(import_v46.z.any()).optional()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.output_text.done"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    content_index: import_v46.z.number(),
    text: import_v46.z.string(),
    logprobs: import_v46.z.array(import_v46.z.any()).optional(),
    annotations: import_v46.z.array(annotationSchema).optional()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.output_text.annotation.added"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    content_index: import_v46.z.number(),
    annotation_index: import_v46.z.number(),
    annotation: annotationSchema
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.reasoning_summary_part.added"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    summary_index: import_v46.z.number(),
    part: reasoningSummaryPartSchema
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.reasoning_summary_part.done"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    summary_index: import_v46.z.number(),
    part: reasoningSummaryPartSchema
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.reasoning_summary_text.delta"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    summary_index: import_v46.z.number(),
    delta: import_v46.z.string()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.reasoning_summary_text.done"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    summary_index: import_v46.z.number(),
    text: import_v46.z.string()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.reasoning_text.delta"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    content_index: import_v46.z.number(),
    delta: import_v46.z.string()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.reasoning_text.done"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    content_index: import_v46.z.number(),
    text: import_v46.z.string()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.web_search_call.in_progress"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.web_search_call.searching"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.web_search_call.completed"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.x_search_call.in_progress"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.x_search_call.searching"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.x_search_call.completed"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.file_search_call.in_progress"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.file_search_call.searching"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.file_search_call.completed"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.code_execution_call.in_progress"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.code_execution_call.executing"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.code_execution_call.completed"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.code_interpreter_call.in_progress"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.code_interpreter_call.executing"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.code_interpreter_call.interpreting"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.code_interpreter_call.completed"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  // Code interpreter code streaming events
  import_v46.z.object({
    type: import_v46.z.literal("response.code_interpreter_call_code.delta"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    delta: import_v46.z.string()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.code_interpreter_call_code.done"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    code: import_v46.z.string()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.custom_tool_call_input.delta"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    delta: import_v46.z.string()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.custom_tool_call_input.done"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    input: import_v46.z.string()
  }),
  // Function call arguments streaming events (standard function tools)
  import_v46.z.object({
    type: import_v46.z.literal("response.function_call_arguments.delta"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    delta: import_v46.z.string()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.function_call_arguments.done"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    arguments: import_v46.z.string()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.mcp_call.in_progress"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.mcp_call.executing"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.mcp_call.completed"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.mcp_call.failed"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.mcp_call_arguments.delta"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    delta: import_v46.z.string()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.mcp_call_arguments.done"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    arguments: import_v46.z.string().optional()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.mcp_call_output.delta"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    delta: import_v46.z.string()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.mcp_call_output.done"),
    item_id: import_v46.z.string(),
    output_index: import_v46.z.number(),
    output: import_v46.z.string().optional()
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.done"),
    response: xaiResponsesResponseSchema
  }),
  import_v46.z.object({
    type: import_v46.z.literal("response.completed"),
    response: xaiResponsesResponseSchema
  })
]);

// src/responses/xai-responses-options.ts
var import_v47 = require("zod/v4");
var xaiLanguageModelResponsesOptions = import_v47.z.object({
  /**
   * Constrains how hard a reasoning model thinks before responding.
   * Possible values are `low` (uses fewer reasoning tokens), `medium` and `high` (uses more reasoning tokens).
   */
  reasoningEffort: import_v47.z.enum(["low", "medium", "high"]).optional(),
  logprobs: import_v47.z.boolean().optional(),
  topLogprobs: import_v47.z.number().int().min(0).max(8).optional(),
  /**
   * Whether to store the input message(s) and model response for later retrieval.
   * @default true
   */
  store: import_v47.z.boolean().optional(),
  /**
   * The ID of the previous response from the model.
   */
  previousResponseId: import_v47.z.string().optional(),
  /**
   * Specify additional output data to include in the model response.
   * Example values: 'file_search_call.results'.
   */
  include: import_v47.z.array(import_v47.z.enum(["file_search_call.results"])).nullish()
});

// src/responses/xai-responses-prepare-tools.ts
var import_provider5 = require("@ai-sdk/provider");
var import_provider_utils10 = require("@ai-sdk/provider-utils");

// src/tool/file-search.ts
var import_provider_utils6 = require("@ai-sdk/provider-utils");
var import_v48 = require("zod/v4");
var fileSearchArgsSchema = (0, import_provider_utils6.lazySchema)(
  () => (0, import_provider_utils6.zodSchema)(
    import_v48.z.object({
      vectorStoreIds: import_v48.z.array(import_v48.z.string()),
      maxNumResults: import_v48.z.number().optional()
    })
  )
);
var fileSearchOutputSchema = (0, import_provider_utils6.lazySchema)(
  () => (0, import_provider_utils6.zodSchema)(
    import_v48.z.object({
      queries: import_v48.z.array(import_v48.z.string()),
      results: import_v48.z.array(
        import_v48.z.object({
          fileId: import_v48.z.string(),
          filename: import_v48.z.string(),
          score: import_v48.z.number().min(0).max(1),
          text: import_v48.z.string()
        })
      ).nullable()
    })
  )
);
var fileSearchToolFactory = (0, import_provider_utils6.createProviderToolFactoryWithOutputSchema)({
  id: "xai.file_search",
  inputSchema: (0, import_provider_utils6.lazySchema)(() => (0, import_provider_utils6.zodSchema)(import_v48.z.object({}))),
  outputSchema: fileSearchOutputSchema
});
var fileSearch = (args) => fileSearchToolFactory(args);

// src/tool/mcp-server.ts
var import_provider_utils7 = require("@ai-sdk/provider-utils");
var import_v49 = require("zod/v4");
var mcpServerArgsSchema = (0, import_provider_utils7.lazySchema)(
  () => (0, import_provider_utils7.zodSchema)(
    import_v49.z.object({
      serverUrl: import_v49.z.string().describe("The URL of the MCP server"),
      serverLabel: import_v49.z.string().optional().describe("A label for the MCP server"),
      serverDescription: import_v49.z.string().optional().describe("Description of the MCP server"),
      allowedTools: import_v49.z.array(import_v49.z.string()).optional().describe("List of allowed tool names"),
      headers: import_v49.z.record(import_v49.z.string(), import_v49.z.string()).optional().describe("Custom headers to send"),
      authorization: import_v49.z.string().optional().describe("Authorization header value")
    })
  )
);
var mcpServerOutputSchema = (0, import_provider_utils7.lazySchema)(
  () => (0, import_provider_utils7.zodSchema)(
    import_v49.z.object({
      name: import_v49.z.string(),
      arguments: import_v49.z.string(),
      result: import_v49.z.unknown()
    })
  )
);
var mcpServerToolFactory = (0, import_provider_utils7.createProviderToolFactoryWithOutputSchema)({
  id: "xai.mcp",
  inputSchema: (0, import_provider_utils7.lazySchema)(() => (0, import_provider_utils7.zodSchema)(import_v49.z.object({}))),
  outputSchema: mcpServerOutputSchema
});
var mcpServer = (args) => mcpServerToolFactory(args);

// src/tool/web-search.ts
var import_provider_utils8 = require("@ai-sdk/provider-utils");
var import_v410 = require("zod/v4");
var webSearchArgsSchema = (0, import_provider_utils8.lazySchema)(
  () => (0, import_provider_utils8.zodSchema)(
    import_v410.z.object({
      allowedDomains: import_v410.z.array(import_v410.z.string()).max(5).optional(),
      excludedDomains: import_v410.z.array(import_v410.z.string()).max(5).optional(),
      enableImageUnderstanding: import_v410.z.boolean().optional()
    })
  )
);
var webSearchOutputSchema = (0, import_provider_utils8.lazySchema)(
  () => (0, import_provider_utils8.zodSchema)(
    import_v410.z.object({
      query: import_v410.z.string(),
      sources: import_v410.z.array(
        import_v410.z.object({
          title: import_v410.z.string(),
          url: import_v410.z.string(),
          snippet: import_v410.z.string()
        })
      )
    })
  )
);
var webSearchToolFactory = (0, import_provider_utils8.createProviderToolFactoryWithOutputSchema)({
  id: "xai.web_search",
  inputSchema: (0, import_provider_utils8.lazySchema)(() => (0, import_provider_utils8.zodSchema)(import_v410.z.object({}))),
  outputSchema: webSearchOutputSchema
});
var webSearch = (args = {}) => webSearchToolFactory(args);

// src/tool/x-search.ts
var import_provider_utils9 = require("@ai-sdk/provider-utils");
var import_v411 = require("zod/v4");
var xSearchArgsSchema = (0, import_provider_utils9.lazySchema)(
  () => (0, import_provider_utils9.zodSchema)(
    import_v411.z.object({
      allowedXHandles: import_v411.z.array(import_v411.z.string()).max(10).optional(),
      excludedXHandles: import_v411.z.array(import_v411.z.string()).max(10).optional(),
      fromDate: import_v411.z.string().optional(),
      toDate: import_v411.z.string().optional(),
      enableImageUnderstanding: import_v411.z.boolean().optional(),
      enableVideoUnderstanding: import_v411.z.boolean().optional()
    })
  )
);
var xSearchOutputSchema = (0, import_provider_utils9.lazySchema)(
  () => (0, import_provider_utils9.zodSchema)(
    import_v411.z.object({
      query: import_v411.z.string(),
      posts: import_v411.z.array(
        import_v411.z.object({
          author: import_v411.z.string(),
          text: import_v411.z.string(),
          url: import_v411.z.string(),
          likes: import_v411.z.number()
        })
      )
    })
  )
);
var xSearchToolFactory = (0, import_provider_utils9.createProviderToolFactoryWithOutputSchema)({
  id: "xai.x_search",
  inputSchema: (0, import_provider_utils9.lazySchema)(() => (0, import_provider_utils9.zodSchema)(import_v411.z.object({}))),
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
          const args = await (0, import_provider_utils10.validateTypes)({
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
          const args = await (0, import_provider_utils10.validateTypes)({
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
          const args = await (0, import_provider_utils10.validateTypes)({
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
          const args = await (0, import_provider_utils10.validateTypes)({
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
      throw new import_provider5.UnsupportedFunctionalityError({
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
    const options = (_a = await (0, import_provider_utils11.parseProviderOptions)({
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
    } = await (0, import_provider_utils11.postJsonToApi)({
      url: `${(_a = this.config.baseURL) != null ? _a : "https://api.x.ai/v1"}/responses`,
      headers: (0, import_provider_utils11.combineHeaders)(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils11.createJsonResponseHandler)(
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
    const { responseHeaders, value: response } = await (0, import_provider_utils11.postJsonToApi)({
      url: `${(_a = this.config.baseURL) != null ? _a : "https://api.x.ai/v1"}/responses`,
      headers: (0, import_provider_utils11.combineHeaders)(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils11.createEventSourceResponseHandler)(
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
var import_provider_utils12 = require("@ai-sdk/provider-utils");
var import_v412 = require("zod/v4");
var codeExecutionOutputSchema = import_v412.z.object({
  output: import_v412.z.string().describe("the output of the code execution"),
  error: import_v412.z.string().optional().describe("any error that occurred")
});
var codeExecutionToolFactory = (0, import_provider_utils12.createProviderToolFactoryWithOutputSchema)({
  id: "xai.code_execution",
  inputSchema: import_v412.z.object({}).describe("no input parameters"),
  outputSchema: codeExecutionOutputSchema
});
var codeExecution = (args = {}) => codeExecutionToolFactory(args);

// src/tool/view-image.ts
var import_provider_utils13 = require("@ai-sdk/provider-utils");
var import_v413 = require("zod/v4");
var viewImageOutputSchema = import_v413.z.object({
  description: import_v413.z.string().describe("description of the image"),
  objects: import_v413.z.array(import_v413.z.string()).optional().describe("objects detected in the image")
});
var viewImageToolFactory = (0, import_provider_utils13.createProviderToolFactoryWithOutputSchema)({
  id: "xai.view_image",
  inputSchema: import_v413.z.object({}).describe("no input parameters"),
  outputSchema: viewImageOutputSchema
});
var viewImage = (args = {}) => viewImageToolFactory(args);

// src/tool/view-x-video.ts
var import_provider_utils14 = require("@ai-sdk/provider-utils");
var import_v414 = require("zod/v4");
var viewXVideoOutputSchema = import_v414.z.object({
  transcript: import_v414.z.string().optional().describe("transcript of the video"),
  description: import_v414.z.string().describe("description of the video content"),
  duration: import_v414.z.number().optional().describe("duration in seconds")
});
var viewXVideoToolFactory = (0, import_provider_utils14.createProviderToolFactoryWithOutputSchema)({
  id: "xai.view_x_video",
  inputSchema: import_v414.z.object({}).describe("no input parameters"),
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
var import_provider6 = require("@ai-sdk/provider");
var import_provider_utils16 = require("@ai-sdk/provider-utils");
var import_v416 = require("zod/v4");

// src/xai-video-options.ts
var import_provider_utils15 = require("@ai-sdk/provider-utils");
var import_v415 = require("zod/v4");
var xaiVideoModelOptionsSchema = (0, import_provider_utils15.lazySchema)(
  () => (0, import_provider_utils15.zodSchema)(
    import_v415.z.object({
      pollIntervalMs: import_v415.z.number().positive().nullish(),
      pollTimeoutMs: import_v415.z.number().positive().nullish(),
      resolution: import_v415.z.enum(["480p", "720p"]).nullish(),
      videoUrl: import_v415.z.string().nullish()
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
    const xaiOptions = await (0, import_provider_utils16.parseProviderOptions)({
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
        const base64Data = typeof options.image.data === "string" ? options.image.data : (0, import_provider_utils16.convertUint8ArrayToBase64)(options.image.data);
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
    const { value: createResponse } = await (0, import_provider_utils16.postJsonToApi)({
      url: `${baseURL}/videos/${isEdit ? "edits" : "generations"}`,
      headers: (0, import_provider_utils16.combineHeaders)(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils16.createJsonResponseHandler)(
        xaiCreateVideoResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const requestId = createResponse.request_id;
    if (!requestId) {
      throw new import_provider6.AISDKError({
        name: "XAI_VIDEO_GENERATION_ERROR",
        message: `No request_id returned from xAI API. Response: ${JSON.stringify(createResponse)}`
      });
    }
    const pollIntervalMs = (_e = xaiOptions == null ? void 0 : xaiOptions.pollIntervalMs) != null ? _e : 5e3;
    const pollTimeoutMs = (_f = xaiOptions == null ? void 0 : xaiOptions.pollTimeoutMs) != null ? _f : 6e5;
    const startTime = Date.now();
    let responseHeaders;
    while (true) {
      await (0, import_provider_utils16.delay)(pollIntervalMs, { abortSignal: options.abortSignal });
      if (Date.now() - startTime > pollTimeoutMs) {
        throw new import_provider6.AISDKError({
          name: "XAI_VIDEO_GENERATION_TIMEOUT",
          message: `Video generation timed out after ${pollTimeoutMs}ms`
        });
      }
      const { value: statusResponse, responseHeaders: pollHeaders } = await (0, import_provider_utils16.getFromApi)({
        url: `${baseURL}/videos/${requestId}`,
        headers: (0, import_provider_utils16.combineHeaders)(this.config.headers(), options.headers),
        successfulResponseHandler: (0, import_provider_utils16.createJsonResponseHandler)(
          xaiVideoStatusResponseSchema
        ),
        failedResponseHandler: xaiFailedResponseHandler,
        abortSignal: options.abortSignal,
        fetch: this.config.fetch
      });
      responseHeaders = pollHeaders;
      if (statusResponse.status === "done" || statusResponse.status == null && ((_g = statusResponse.video) == null ? void 0 : _g.url)) {
        if (((_h = statusResponse.video) == null ? void 0 : _h.respect_moderation) === false) {
          throw new import_provider6.AISDKError({
            name: "XAI_VIDEO_MODERATION_ERROR",
            message: "Video generation was blocked due to a content policy violation."
          });
        }
        if (!((_i = statusResponse.video) == null ? void 0 : _i.url)) {
          throw new import_provider6.AISDKError({
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
        throw new import_provider6.AISDKError({
          name: "XAI_VIDEO_GENERATION_EXPIRED",
          message: "Video generation request expired."
        });
      }
    }
  }
};
var xaiCreateVideoResponseSchema = import_v416.z.object({
  request_id: import_v416.z.string().nullish()
});
var xaiVideoStatusResponseSchema = import_v416.z.object({
  status: import_v416.z.string().nullish(),
  video: import_v416.z.object({
    url: import_v416.z.string(),
    duration: import_v416.z.number().nullish(),
    respect_moderation: import_v416.z.boolean().nullish()
  }).nullish(),
  model: import_v416.z.string().nullish(),
  usage: import_v416.z.object({
    cost_in_usd_ticks: import_v416.z.number().nullish()
  }).nullish()
});

// src/xai-provider.ts
function createXai(options = {}) {
  var _a;
  const baseURL = (0, import_provider_utils17.withoutTrailingSlash)(
    (_a = options.baseURL) != null ? _a : "https://api.x.ai/v1"
  );
  const getHeaders = () => (0, import_provider_utils17.withUserAgentSuffix)(
    {
      Authorization: `Bearer ${(0, import_provider_utils17.loadApiKey)({
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
      generateId: import_provider_utils17.generateId,
      fetch: options.fetch
    });
  };
  const createResponsesLanguageModel = (modelId) => {
    return new XaiResponsesLanguageModel(modelId, {
      provider: "xai.responses",
      baseURL,
      headers: getHeaders,
      generateId: import_provider_utils17.generateId,
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
    throw new import_provider7.NoSuchModelError({ modelId, modelType: "embeddingModel" });
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
//# sourceMappingURL=index.js.map