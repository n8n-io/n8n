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
  OpenAICompatibleChatLanguageModel: () => OpenAICompatibleChatLanguageModel,
  OpenAICompatibleCompletionLanguageModel: () => OpenAICompatibleCompletionLanguageModel,
  OpenAICompatibleEmbeddingModel: () => OpenAICompatibleEmbeddingModel,
  OpenAICompatibleImageModel: () => OpenAICompatibleImageModel,
  VERSION: () => VERSION,
  createOpenAICompatible: () => createOpenAICompatible
});
module.exports = __toCommonJS(index_exports);

// src/chat/openai-compatible-chat-language-model.ts
var import_provider3 = require("@ai-sdk/provider");
var import_provider_utils2 = require("@ai-sdk/provider-utils");
var import_v43 = require("zod/v4");

// src/openai-compatible-error.ts
var import_v4 = require("zod/v4");
var openaiCompatibleErrorDataSchema = import_v4.z.object({
  error: import_v4.z.object({
    message: import_v4.z.string(),
    // The additional information below is handled loosely to support
    // OpenAI-compatible providers that have slightly different error
    // responses:
    type: import_v4.z.string().nullish(),
    param: import_v4.z.any().nullish(),
    code: import_v4.z.union([import_v4.z.string(), import_v4.z.number()]).nullish()
  })
});
var defaultOpenAICompatibleErrorStructure = {
  errorSchema: openaiCompatibleErrorDataSchema,
  errorToMessage: (data) => data.error.message
};

// src/chat/convert-openai-compatible-chat-usage.ts
function convertOpenAICompatibleChatUsage(usage) {
  var _a, _b, _c, _d, _e, _f;
  if (usage == null) {
    return {
      inputTokens: {
        total: void 0,
        noCache: void 0,
        cacheRead: void 0,
        cacheWrite: void 0
      },
      outputTokens: {
        total: void 0,
        text: void 0,
        reasoning: void 0
      },
      raw: void 0
    };
  }
  const promptTokens = (_a = usage.prompt_tokens) != null ? _a : 0;
  const completionTokens = (_b = usage.completion_tokens) != null ? _b : 0;
  const cacheReadTokens = (_d = (_c = usage.prompt_tokens_details) == null ? void 0 : _c.cached_tokens) != null ? _d : 0;
  const reasoningTokens = (_f = (_e = usage.completion_tokens_details) == null ? void 0 : _e.reasoning_tokens) != null ? _f : 0;
  return {
    inputTokens: {
      total: promptTokens,
      noCache: promptTokens - cacheReadTokens,
      cacheRead: cacheReadTokens,
      cacheWrite: void 0
    },
    outputTokens: {
      total: completionTokens,
      text: completionTokens - reasoningTokens,
      reasoning: reasoningTokens
    },
    raw: usage
  };
}

// src/chat/convert-to-openai-compatible-chat-messages.ts
var import_provider = require("@ai-sdk/provider");
var import_provider_utils = require("@ai-sdk/provider-utils");
function getOpenAIMetadata(message) {
  var _a, _b;
  return (_b = (_a = message == null ? void 0 : message.providerOptions) == null ? void 0 : _a.openaiCompatible) != null ? _b : {};
}
function getAudioFormat(mediaType) {
  switch (mediaType) {
    case "audio/wav":
      return "wav";
    case "audio/mp3":
    case "audio/mpeg":
      return "mp3";
    default:
      return null;
  }
}
function convertToOpenAICompatibleChatMessages(prompt) {
  var _a, _b, _c;
  const messages = [];
  for (const { role, content, ...message } of prompt) {
    const metadata = getOpenAIMetadata({ ...message });
    switch (role) {
      case "system": {
        messages.push({ role: "system", content, ...metadata });
        break;
      }
      case "user": {
        if (content.length === 1 && content[0].type === "text") {
          messages.push({
            role: "user",
            content: content[0].text,
            ...getOpenAIMetadata(content[0])
          });
          break;
        }
        messages.push({
          role: "user",
          content: content.map((part) => {
            var _a2;
            const partMetadata = getOpenAIMetadata(part);
            switch (part.type) {
              case "text": {
                return { type: "text", text: part.text, ...partMetadata };
              }
              case "file": {
                if (part.mediaType.startsWith("image/")) {
                  const mediaType = part.mediaType === "image/*" ? "image/jpeg" : part.mediaType;
                  return {
                    type: "image_url",
                    image_url: {
                      url: part.data instanceof URL ? part.data.toString() : `data:${mediaType};base64,${(0, import_provider_utils.convertToBase64)(part.data)}`
                    },
                    ...partMetadata
                  };
                }
                if (part.mediaType.startsWith("audio/")) {
                  if (part.data instanceof URL) {
                    throw new import_provider.UnsupportedFunctionalityError({
                      functionality: "audio file parts with URLs"
                    });
                  }
                  const format = getAudioFormat(part.mediaType);
                  if (format === null) {
                    throw new import_provider.UnsupportedFunctionalityError({
                      functionality: `audio media type ${part.mediaType}`
                    });
                  }
                  return {
                    type: "input_audio",
                    input_audio: {
                      data: (0, import_provider_utils.convertToBase64)(part.data),
                      format
                    },
                    ...partMetadata
                  };
                }
                if (part.mediaType === "application/pdf") {
                  if (part.data instanceof URL) {
                    throw new import_provider.UnsupportedFunctionalityError({
                      functionality: "PDF file parts with URLs"
                    });
                  }
                  return {
                    type: "file",
                    file: {
                      filename: (_a2 = part.filename) != null ? _a2 : "document.pdf",
                      file_data: `data:application/pdf;base64,${(0, import_provider_utils.convertToBase64)(part.data)}`
                    },
                    ...partMetadata
                  };
                }
                if (part.mediaType.startsWith("text/")) {
                  const textContent = part.data instanceof URL ? part.data.toString() : typeof part.data === "string" ? new TextDecoder().decode(
                    (0, import_provider_utils.convertBase64ToUint8Array)(part.data)
                  ) : new TextDecoder().decode(part.data);
                  return {
                    type: "text",
                    text: textContent,
                    ...partMetadata
                  };
                }
                throw new import_provider.UnsupportedFunctionalityError({
                  functionality: `file part media type ${part.mediaType}`
                });
              }
            }
          }),
          ...metadata
        });
        break;
      }
      case "assistant": {
        let text = "";
        let reasoning = "";
        const toolCalls = [];
        for (const part of content) {
          const partMetadata = getOpenAIMetadata(part);
          switch (part.type) {
            case "text": {
              text += part.text;
              break;
            }
            case "reasoning": {
              reasoning += part.text;
              break;
            }
            case "tool-call": {
              const thoughtSignature = (_b = (_a = part.providerOptions) == null ? void 0 : _a.google) == null ? void 0 : _b.thoughtSignature;
              toolCalls.push({
                id: part.toolCallId,
                type: "function",
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.input)
                },
                ...partMetadata,
                // Include extra_content for Google Gemini thought signatures
                ...thoughtSignature ? {
                  extra_content: {
                    google: {
                      thought_signature: String(thoughtSignature)
                    }
                  }
                } : {}
              });
              break;
            }
          }
        }
        messages.push({
          role: "assistant",
          content: text,
          ...reasoning.length > 0 ? { reasoning_content: reasoning } : {},
          tool_calls: toolCalls.length > 0 ? toolCalls : void 0,
          ...metadata
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
              contentValue = (_c = output.reason) != null ? _c : "Tool execution denied.";
              break;
            case "content":
            case "json":
            case "error-json":
              contentValue = JSON.stringify(output.value);
              break;
          }
          const toolResponseMetadata = getOpenAIMetadata(toolResponse);
          messages.push({
            role: "tool",
            tool_call_id: toolResponse.toolCallId,
            content: contentValue,
            ...toolResponseMetadata
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
  return messages;
}

// src/chat/get-response-metadata.ts
function getResponseMetadata({
  id,
  model,
  created
}) {
  return {
    id: id != null ? id : void 0,
    modelId: model != null ? model : void 0,
    timestamp: created != null ? new Date(created * 1e3) : void 0
  };
}

// src/chat/map-openai-compatible-finish-reason.ts
function mapOpenAICompatibleFinishReason(finishReason) {
  switch (finishReason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "content_filter":
      return "content-filter";
    case "function_call":
    case "tool_calls":
      return "tool-calls";
    default:
      return "other";
  }
}

// src/chat/openai-compatible-chat-options.ts
var import_v42 = require("zod/v4");
var openaiCompatibleLanguageModelChatOptions = import_v42.z.object({
  /**
   * A unique identifier representing your end-user, which can help the provider to
   * monitor and detect abuse.
   */
  user: import_v42.z.string().optional(),
  /**
   * Reasoning effort for reasoning models. Defaults to `medium`.
   */
  reasoningEffort: import_v42.z.string().optional(),
  /**
   * Controls the verbosity of the generated text. Defaults to `medium`.
   */
  textVerbosity: import_v42.z.string().optional(),
  /**
   * Whether to use strict JSON schema validation.
   * When true, the model uses constrained decoding to guarantee schema compliance.
   * Only used when the provider supports structured outputs and a schema is provided.
   *
   * @default true
   */
  strictJsonSchema: import_v42.z.boolean().optional()
});

// src/chat/openai-compatible-prepare-tools.ts
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
  const openaiCompatTools = [];
  for (const tool of tools) {
    if (tool.type === "provider") {
      toolWarnings.push({
        type: "unsupported",
        feature: `provider-defined tool ${tool.id}`
      });
    } else {
      openaiCompatTools.push({
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
    return { tools: openaiCompatTools, toolChoice: void 0, toolWarnings };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
    case "none":
    case "required":
      return { tools: openaiCompatTools, toolChoice: type, toolWarnings };
    case "tool":
      return {
        tools: openaiCompatTools,
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

// src/chat/openai-compatible-chat-language-model.ts
var OpenAICompatibleChatLanguageModel = class {
  // type inferred via constructor
  constructor(modelId, config) {
    this.specificationVersion = "v3";
    var _a, _b;
    this.modelId = modelId;
    this.config = config;
    const errorStructure = (_a = config.errorStructure) != null ? _a : defaultOpenAICompatibleErrorStructure;
    this.chunkSchema = createOpenAICompatibleChatChunkSchema(
      errorStructure.errorSchema
    );
    this.failedResponseHandler = (0, import_provider_utils2.createJsonErrorResponseHandler)(errorStructure);
    this.supportsStructuredOutputs = (_b = config.supportsStructuredOutputs) != null ? _b : false;
  }
  get provider() {
    return this.config.provider;
  }
  get providerOptionsName() {
    return this.config.provider.split(".")[0].trim();
  }
  get supportedUrls() {
    var _a, _b, _c;
    return (_c = (_b = (_a = this.config).supportedUrls) == null ? void 0 : _b.call(_a)) != null ? _c : {};
  }
  transformRequestBody(args) {
    var _a, _b, _c;
    return (_c = (_b = (_a = this.config).transformRequestBody) == null ? void 0 : _b.call(_a, args)) != null ? _c : args;
  }
  async getArgs({
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
    tools
  }) {
    var _a, _b, _c, _d, _e;
    const warnings = [];
    const deprecatedOptions = await (0, import_provider_utils2.parseProviderOptions)({
      provider: "openai-compatible",
      providerOptions,
      schema: openaiCompatibleLanguageModelChatOptions
    });
    if (deprecatedOptions != null) {
      warnings.push({
        type: "other",
        message: `The 'openai-compatible' key in providerOptions is deprecated. Use 'openaiCompatible' instead.`
      });
    }
    const compatibleOptions = Object.assign(
      deprecatedOptions != null ? deprecatedOptions : {},
      (_a = await (0, import_provider_utils2.parseProviderOptions)({
        provider: "openaiCompatible",
        providerOptions,
        schema: openaiCompatibleLanguageModelChatOptions
      })) != null ? _a : {},
      (_b = await (0, import_provider_utils2.parseProviderOptions)({
        provider: this.providerOptionsName,
        providerOptions,
        schema: openaiCompatibleLanguageModelChatOptions
      })) != null ? _b : {}
    );
    const strictJsonSchema = (_c = compatibleOptions == null ? void 0 : compatibleOptions.strictJsonSchema) != null ? _c : true;
    if (topK != null) {
      warnings.push({ type: "unsupported", feature: "topK" });
    }
    if ((responseFormat == null ? void 0 : responseFormat.type) === "json" && responseFormat.schema != null && !this.supportsStructuredOutputs) {
      warnings.push({
        type: "unsupported",
        feature: "responseFormat",
        details: "JSON response format schema is only supported with structuredOutputs"
      });
    }
    const {
      tools: openaiTools,
      toolChoice: openaiToolChoice,
      toolWarnings
    } = prepareTools({
      tools,
      toolChoice
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
        response_format: (responseFormat == null ? void 0 : responseFormat.type) === "json" ? this.supportsStructuredOutputs === true && responseFormat.schema != null ? {
          type: "json_schema",
          json_schema: {
            schema: responseFormat.schema,
            strict: strictJsonSchema,
            name: (_d = responseFormat.name) != null ? _d : "response",
            description: responseFormat.description
          }
        } : { type: "json_object" } : void 0,
        stop: stopSequences,
        seed,
        ...Object.fromEntries(
          Object.entries(
            (_e = providerOptions == null ? void 0 : providerOptions[this.providerOptionsName]) != null ? _e : {}
          ).filter(
            ([key]) => !Object.keys(
              openaiCompatibleLanguageModelChatOptions.shape
            ).includes(key)
          )
        ),
        reasoning_effort: compatibleOptions.reasoningEffort,
        verbosity: compatibleOptions.textVerbosity,
        // messages:
        messages: convertToOpenAICompatibleChatMessages(prompt),
        // tools:
        tools: openaiTools,
        tool_choice: openaiToolChoice
      },
      warnings: [...warnings, ...toolWarnings]
    };
  }
  async doGenerate(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { args, warnings } = await this.getArgs({ ...options });
    const transformedBody = this.transformRequestBody(args);
    const body = JSON.stringify(transformedBody);
    const {
      responseHeaders,
      value: responseBody,
      rawValue: rawResponse
    } = await (0, import_provider_utils2.postJsonToApi)({
      url: this.config.url({
        path: "/chat/completions",
        modelId: this.modelId
      }),
      headers: (0, import_provider_utils2.combineHeaders)(this.config.headers(), options.headers),
      body: transformedBody,
      failedResponseHandler: this.failedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils2.createJsonResponseHandler)(
        OpenAICompatibleChatResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const choice = responseBody.choices[0];
    const content = [];
    const text = choice.message.content;
    if (text != null && text.length > 0) {
      content.push({ type: "text", text });
    }
    const reasoning = (_a = choice.message.reasoning_content) != null ? _a : choice.message.reasoning;
    if (reasoning != null && reasoning.length > 0) {
      content.push({
        type: "reasoning",
        text: reasoning
      });
    }
    if (choice.message.tool_calls != null) {
      for (const toolCall of choice.message.tool_calls) {
        const thoughtSignature = (_c = (_b = toolCall.extra_content) == null ? void 0 : _b.google) == null ? void 0 : _c.thought_signature;
        content.push({
          type: "tool-call",
          toolCallId: (_d = toolCall.id) != null ? _d : (0, import_provider_utils2.generateId)(),
          toolName: toolCall.function.name,
          input: toolCall.function.arguments,
          ...thoughtSignature ? {
            providerMetadata: {
              [this.providerOptionsName]: { thoughtSignature }
            }
          } : {}
        });
      }
    }
    const providerMetadata = {
      [this.providerOptionsName]: {},
      ...await ((_f = (_e = this.config.metadataExtractor) == null ? void 0 : _e.extractMetadata) == null ? void 0 : _f.call(_e, {
        parsedBody: rawResponse
      }))
    };
    const completionTokenDetails = (_g = responseBody.usage) == null ? void 0 : _g.completion_tokens_details;
    if ((completionTokenDetails == null ? void 0 : completionTokenDetails.accepted_prediction_tokens) != null) {
      providerMetadata[this.providerOptionsName].acceptedPredictionTokens = completionTokenDetails == null ? void 0 : completionTokenDetails.accepted_prediction_tokens;
    }
    if ((completionTokenDetails == null ? void 0 : completionTokenDetails.rejected_prediction_tokens) != null) {
      providerMetadata[this.providerOptionsName].rejectedPredictionTokens = completionTokenDetails == null ? void 0 : completionTokenDetails.rejected_prediction_tokens;
    }
    return {
      content,
      finishReason: {
        unified: mapOpenAICompatibleFinishReason(choice.finish_reason),
        raw: (_h = choice.finish_reason) != null ? _h : void 0
      },
      usage: convertOpenAICompatibleChatUsage(responseBody.usage),
      providerMetadata,
      request: { body },
      response: {
        ...getResponseMetadata(responseBody),
        headers: responseHeaders,
        body: rawResponse
      },
      warnings
    };
  }
  async doStream(options) {
    var _a;
    const { args, warnings } = await this.getArgs({ ...options });
    const body = this.transformRequestBody({
      ...args,
      stream: true,
      // only include stream_options when in strict compatibility mode:
      stream_options: this.config.includeUsage ? { include_usage: true } : void 0
    });
    const metadataExtractor = (_a = this.config.metadataExtractor) == null ? void 0 : _a.createStreamExtractor();
    const { responseHeaders, value: response } = await (0, import_provider_utils2.postJsonToApi)({
      url: this.config.url({
        path: "/chat/completions",
        modelId: this.modelId
      }),
      headers: (0, import_provider_utils2.combineHeaders)(this.config.headers(), options.headers),
      body,
      failedResponseHandler: this.failedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils2.createEventSourceResponseHandler)(
        this.chunkSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const toolCalls = [];
    let finishReason = {
      unified: "other",
      raw: void 0
    };
    let usage = void 0;
    let isFirstChunk = true;
    const providerOptionsName = this.providerOptionsName;
    let isActiveReasoning = false;
    let isActiveText = false;
    return {
      stream: response.pipeThrough(
        new TransformStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings });
          },
          transform(chunk, controller) {
            var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r;
            if (options.includeRawChunks) {
              controller.enqueue({ type: "raw", rawValue: chunk.rawValue });
            }
            if (!chunk.success) {
              finishReason = { unified: "error", raw: void 0 };
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }
            metadataExtractor == null ? void 0 : metadataExtractor.processChunk(chunk.rawValue);
            if ("error" in chunk.value) {
              finishReason = { unified: "error", raw: void 0 };
              controller.enqueue({
                type: "error",
                error: chunk.value.error.message
              });
              return;
            }
            const value = chunk.value;
            if (isFirstChunk) {
              isFirstChunk = false;
              controller.enqueue({
                type: "response-metadata",
                ...getResponseMetadata(value)
              });
            }
            if (value.usage != null) {
              usage = value.usage;
            }
            const choice = value.choices[0];
            if ((choice == null ? void 0 : choice.finish_reason) != null) {
              finishReason = {
                unified: mapOpenAICompatibleFinishReason(choice.finish_reason),
                raw: (_a2 = choice.finish_reason) != null ? _a2 : void 0
              };
            }
            if ((choice == null ? void 0 : choice.delta) == null) {
              return;
            }
            const delta = choice.delta;
            const reasoningContent = (_b = delta.reasoning_content) != null ? _b : delta.reasoning;
            if (reasoningContent) {
              if (!isActiveReasoning) {
                controller.enqueue({
                  type: "reasoning-start",
                  id: "reasoning-0"
                });
                isActiveReasoning = true;
              }
              controller.enqueue({
                type: "reasoning-delta",
                id: "reasoning-0",
                delta: reasoningContent
              });
            }
            if (delta.content) {
              if (isActiveReasoning) {
                controller.enqueue({
                  type: "reasoning-end",
                  id: "reasoning-0"
                });
                isActiveReasoning = false;
              }
              if (!isActiveText) {
                controller.enqueue({ type: "text-start", id: "txt-0" });
                isActiveText = true;
              }
              controller.enqueue({
                type: "text-delta",
                id: "txt-0",
                delta: delta.content
              });
            }
            if (delta.tool_calls != null) {
              if (isActiveReasoning) {
                controller.enqueue({
                  type: "reasoning-end",
                  id: "reasoning-0"
                });
                isActiveReasoning = false;
              }
              for (const toolCallDelta of delta.tool_calls) {
                const index = (_c = toolCallDelta.index) != null ? _c : toolCalls.length;
                if (toolCalls[index] == null) {
                  if (toolCallDelta.id == null) {
                    throw new import_provider3.InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'id' to be a string.`
                    });
                  }
                  if (((_d = toolCallDelta.function) == null ? void 0 : _d.name) == null) {
                    throw new import_provider3.InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function.name' to be a string.`
                    });
                  }
                  controller.enqueue({
                    type: "tool-input-start",
                    id: toolCallDelta.id,
                    toolName: toolCallDelta.function.name
                  });
                  toolCalls[index] = {
                    id: toolCallDelta.id,
                    type: "function",
                    function: {
                      name: toolCallDelta.function.name,
                      arguments: (_e = toolCallDelta.function.arguments) != null ? _e : ""
                    },
                    hasFinished: false,
                    thoughtSignature: (_h = (_g = (_f = toolCallDelta.extra_content) == null ? void 0 : _f.google) == null ? void 0 : _g.thought_signature) != null ? _h : void 0
                  };
                  const toolCall2 = toolCalls[index];
                  if (((_i = toolCall2.function) == null ? void 0 : _i.name) != null && ((_j = toolCall2.function) == null ? void 0 : _j.arguments) != null) {
                    if (toolCall2.function.arguments.length > 0) {
                      controller.enqueue({
                        type: "tool-input-delta",
                        id: toolCall2.id,
                        delta: toolCall2.function.arguments
                      });
                    }
                    if ((0, import_provider_utils2.isParsableJson)(toolCall2.function.arguments)) {
                      controller.enqueue({
                        type: "tool-input-end",
                        id: toolCall2.id
                      });
                      controller.enqueue({
                        type: "tool-call",
                        toolCallId: (_k = toolCall2.id) != null ? _k : (0, import_provider_utils2.generateId)(),
                        toolName: toolCall2.function.name,
                        input: toolCall2.function.arguments,
                        ...toolCall2.thoughtSignature ? {
                          providerMetadata: {
                            [providerOptionsName]: {
                              thoughtSignature: toolCall2.thoughtSignature
                            }
                          }
                        } : {}
                      });
                      toolCall2.hasFinished = true;
                    }
                  }
                  continue;
                }
                const toolCall = toolCalls[index];
                if (toolCall.hasFinished) {
                  continue;
                }
                if (((_l = toolCallDelta.function) == null ? void 0 : _l.arguments) != null) {
                  toolCall.function.arguments += (_n = (_m = toolCallDelta.function) == null ? void 0 : _m.arguments) != null ? _n : "";
                }
                controller.enqueue({
                  type: "tool-input-delta",
                  id: toolCall.id,
                  delta: (_o = toolCallDelta.function.arguments) != null ? _o : ""
                });
                if (((_p = toolCall.function) == null ? void 0 : _p.name) != null && ((_q = toolCall.function) == null ? void 0 : _q.arguments) != null && (0, import_provider_utils2.isParsableJson)(toolCall.function.arguments)) {
                  controller.enqueue({
                    type: "tool-input-end",
                    id: toolCall.id
                  });
                  controller.enqueue({
                    type: "tool-call",
                    toolCallId: (_r = toolCall.id) != null ? _r : (0, import_provider_utils2.generateId)(),
                    toolName: toolCall.function.name,
                    input: toolCall.function.arguments,
                    ...toolCall.thoughtSignature ? {
                      providerMetadata: {
                        [providerOptionsName]: {
                          thoughtSignature: toolCall.thoughtSignature
                        }
                      }
                    } : {}
                  });
                  toolCall.hasFinished = true;
                }
              }
            }
          },
          flush(controller) {
            var _a2, _b, _c, _d, _e;
            if (isActiveReasoning) {
              controller.enqueue({ type: "reasoning-end", id: "reasoning-0" });
            }
            if (isActiveText) {
              controller.enqueue({ type: "text-end", id: "txt-0" });
            }
            for (const toolCall of toolCalls.filter(
              (toolCall2) => !toolCall2.hasFinished
            )) {
              controller.enqueue({
                type: "tool-input-end",
                id: toolCall.id
              });
              controller.enqueue({
                type: "tool-call",
                toolCallId: (_a2 = toolCall.id) != null ? _a2 : (0, import_provider_utils2.generateId)(),
                toolName: toolCall.function.name,
                input: toolCall.function.arguments,
                ...toolCall.thoughtSignature ? {
                  providerMetadata: {
                    [providerOptionsName]: {
                      thoughtSignature: toolCall.thoughtSignature
                    }
                  }
                } : {}
              });
            }
            const providerMetadata = {
              [providerOptionsName]: {},
              ...metadataExtractor == null ? void 0 : metadataExtractor.buildMetadata()
            };
            if (((_b = usage == null ? void 0 : usage.completion_tokens_details) == null ? void 0 : _b.accepted_prediction_tokens) != null) {
              providerMetadata[providerOptionsName].acceptedPredictionTokens = (_c = usage == null ? void 0 : usage.completion_tokens_details) == null ? void 0 : _c.accepted_prediction_tokens;
            }
            if (((_d = usage == null ? void 0 : usage.completion_tokens_details) == null ? void 0 : _d.rejected_prediction_tokens) != null) {
              providerMetadata[providerOptionsName].rejectedPredictionTokens = (_e = usage == null ? void 0 : usage.completion_tokens_details) == null ? void 0 : _e.rejected_prediction_tokens;
            }
            controller.enqueue({
              type: "finish",
              finishReason,
              usage: convertOpenAICompatibleChatUsage(usage),
              providerMetadata
            });
          }
        })
      ),
      request: { body },
      response: { headers: responseHeaders }
    };
  }
};
var openaiCompatibleTokenUsageSchema = import_v43.z.looseObject({
  prompt_tokens: import_v43.z.number().nullish(),
  completion_tokens: import_v43.z.number().nullish(),
  total_tokens: import_v43.z.number().nullish(),
  prompt_tokens_details: import_v43.z.object({
    cached_tokens: import_v43.z.number().nullish()
  }).nullish(),
  completion_tokens_details: import_v43.z.object({
    reasoning_tokens: import_v43.z.number().nullish(),
    accepted_prediction_tokens: import_v43.z.number().nullish(),
    rejected_prediction_tokens: import_v43.z.number().nullish()
  }).nullish()
}).nullish();
var OpenAICompatibleChatResponseSchema = import_v43.z.looseObject({
  id: import_v43.z.string().nullish(),
  created: import_v43.z.number().nullish(),
  model: import_v43.z.string().nullish(),
  choices: import_v43.z.array(
    import_v43.z.object({
      message: import_v43.z.object({
        role: import_v43.z.literal("assistant").nullish(),
        content: import_v43.z.string().nullish(),
        reasoning_content: import_v43.z.string().nullish(),
        reasoning: import_v43.z.string().nullish(),
        tool_calls: import_v43.z.array(
          import_v43.z.object({
            id: import_v43.z.string().nullish(),
            function: import_v43.z.object({
              name: import_v43.z.string(),
              arguments: import_v43.z.string()
            }),
            // Support for Google Gemini thought signatures via OpenAI compatibility
            extra_content: import_v43.z.object({
              google: import_v43.z.object({
                thought_signature: import_v43.z.string().nullish()
              }).nullish()
            }).nullish()
          })
        ).nullish()
      }),
      finish_reason: import_v43.z.string().nullish()
    })
  ),
  usage: openaiCompatibleTokenUsageSchema
});
var chunkBaseSchema = import_v43.z.looseObject({
  id: import_v43.z.string().nullish(),
  created: import_v43.z.number().nullish(),
  model: import_v43.z.string().nullish(),
  choices: import_v43.z.array(
    import_v43.z.object({
      delta: import_v43.z.object({
        role: import_v43.z.enum(["assistant"]).nullish(),
        content: import_v43.z.string().nullish(),
        // Most openai-compatible models set `reasoning_content`, but some
        // providers serving `gpt-oss` set `reasoning`. See #7866
        reasoning_content: import_v43.z.string().nullish(),
        reasoning: import_v43.z.string().nullish(),
        tool_calls: import_v43.z.array(
          import_v43.z.object({
            index: import_v43.z.number().nullish(),
            //google does not send index
            id: import_v43.z.string().nullish(),
            function: import_v43.z.object({
              name: import_v43.z.string().nullish(),
              arguments: import_v43.z.string().nullish()
            }),
            // Support for Google Gemini thought signatures via OpenAI compatibility
            extra_content: import_v43.z.object({
              google: import_v43.z.object({
                thought_signature: import_v43.z.string().nullish()
              }).nullish()
            }).nullish()
          })
        ).nullish()
      }).nullish(),
      finish_reason: import_v43.z.string().nullish()
    })
  ),
  usage: openaiCompatibleTokenUsageSchema
});
var createOpenAICompatibleChatChunkSchema = (errorSchema) => import_v43.z.union([chunkBaseSchema, errorSchema]);

// src/completion/openai-compatible-completion-language-model.ts
var import_provider_utils3 = require("@ai-sdk/provider-utils");
var import_v45 = require("zod/v4");

// src/completion/convert-openai-compatible-completion-usage.ts
function convertOpenAICompatibleCompletionUsage(usage) {
  var _a, _b;
  if (usage == null) {
    return {
      inputTokens: {
        total: void 0,
        noCache: void 0,
        cacheRead: void 0,
        cacheWrite: void 0
      },
      outputTokens: {
        total: void 0,
        text: void 0,
        reasoning: void 0
      },
      raw: void 0
    };
  }
  const promptTokens = (_a = usage.prompt_tokens) != null ? _a : 0;
  const completionTokens = (_b = usage.completion_tokens) != null ? _b : 0;
  return {
    inputTokens: {
      total: promptTokens,
      noCache: promptTokens,
      cacheRead: void 0,
      cacheWrite: void 0
    },
    outputTokens: {
      total: completionTokens,
      text: completionTokens,
      reasoning: void 0
    },
    raw: usage
  };
}

// src/completion/convert-to-openai-compatible-completion-prompt.ts
var import_provider4 = require("@ai-sdk/provider");
function convertToOpenAICompatibleCompletionPrompt({
  prompt,
  user = "user",
  assistant = "assistant"
}) {
  let text = "";
  if (prompt[0].role === "system") {
    text += `${prompt[0].content}

`;
    prompt = prompt.slice(1);
  }
  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        throw new import_provider4.InvalidPromptError({
          message: "Unexpected system message in prompt: ${content}",
          prompt
        });
      }
      case "user": {
        const userMessage = content.map((part) => {
          switch (part.type) {
            case "text": {
              return part.text;
            }
          }
        }).filter(Boolean).join("");
        text += `${user}:
${userMessage}

`;
        break;
      }
      case "assistant": {
        const assistantMessage = content.map((part) => {
          switch (part.type) {
            case "text": {
              return part.text;
            }
            case "tool-call": {
              throw new import_provider4.UnsupportedFunctionalityError({
                functionality: "tool-call messages"
              });
            }
          }
        }).join("");
        text += `${assistant}:
${assistantMessage}

`;
        break;
      }
      case "tool": {
        throw new import_provider4.UnsupportedFunctionalityError({
          functionality: "tool messages"
        });
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }
  text += `${assistant}:
`;
  return {
    prompt: text,
    stopSequences: [`
${user}:`]
  };
}

// src/completion/get-response-metadata.ts
function getResponseMetadata2({
  id,
  model,
  created
}) {
  return {
    id: id != null ? id : void 0,
    modelId: model != null ? model : void 0,
    timestamp: created != null ? new Date(created * 1e3) : void 0
  };
}

// src/completion/map-openai-compatible-finish-reason.ts
function mapOpenAICompatibleFinishReason2(finishReason) {
  switch (finishReason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "content_filter":
      return "content-filter";
    case "function_call":
    case "tool_calls":
      return "tool-calls";
    default:
      return "other";
  }
}

// src/completion/openai-compatible-completion-options.ts
var import_v44 = require("zod/v4");
var openaiCompatibleLanguageModelCompletionOptions = import_v44.z.object({
  /**
   * Echo back the prompt in addition to the completion.
   */
  echo: import_v44.z.boolean().optional(),
  /**
   * Modify the likelihood of specified tokens appearing in the completion.
   *
   * Accepts a JSON object that maps tokens (specified by their token ID in
   * the GPT tokenizer) to an associated bias value from -100 to 100.
   */
  logitBias: import_v44.z.record(import_v44.z.string(), import_v44.z.number()).optional(),
  /**
   * The suffix that comes after a completion of inserted text.
   */
  suffix: import_v44.z.string().optional(),
  /**
   * A unique identifier representing your end-user, which can help providers to
   * monitor and detect abuse.
   */
  user: import_v44.z.string().optional()
});

// src/completion/openai-compatible-completion-language-model.ts
var OpenAICompatibleCompletionLanguageModel = class {
  // type inferred via constructor
  constructor(modelId, config) {
    this.specificationVersion = "v3";
    var _a;
    this.modelId = modelId;
    this.config = config;
    const errorStructure = (_a = config.errorStructure) != null ? _a : defaultOpenAICompatibleErrorStructure;
    this.chunkSchema = createOpenAICompatibleCompletionChunkSchema(
      errorStructure.errorSchema
    );
    this.failedResponseHandler = (0, import_provider_utils3.createJsonErrorResponseHandler)(errorStructure);
  }
  get provider() {
    return this.config.provider;
  }
  get providerOptionsName() {
    return this.config.provider.split(".")[0].trim();
  }
  get supportedUrls() {
    var _a, _b, _c;
    return (_c = (_b = (_a = this.config).supportedUrls) == null ? void 0 : _b.call(_a)) != null ? _c : {};
  }
  async getArgs({
    prompt,
    maxOutputTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences: userStopSequences,
    responseFormat,
    seed,
    providerOptions,
    tools,
    toolChoice
  }) {
    var _a;
    const warnings = [];
    const completionOptions = (_a = await (0, import_provider_utils3.parseProviderOptions)({
      provider: this.providerOptionsName,
      providerOptions,
      schema: openaiCompatibleLanguageModelCompletionOptions
    })) != null ? _a : {};
    if (topK != null) {
      warnings.push({ type: "unsupported", feature: "topK" });
    }
    if (tools == null ? void 0 : tools.length) {
      warnings.push({ type: "unsupported", feature: "tools" });
    }
    if (toolChoice != null) {
      warnings.push({ type: "unsupported", feature: "toolChoice" });
    }
    if (responseFormat != null && responseFormat.type !== "text") {
      warnings.push({
        type: "unsupported",
        feature: "responseFormat",
        details: "JSON response format is not supported."
      });
    }
    const { prompt: completionPrompt, stopSequences } = convertToOpenAICompatibleCompletionPrompt({ prompt });
    const stop = [...stopSequences != null ? stopSequences : [], ...userStopSequences != null ? userStopSequences : []];
    return {
      args: {
        // model id:
        model: this.modelId,
        // model specific settings:
        echo: completionOptions.echo,
        logit_bias: completionOptions.logitBias,
        suffix: completionOptions.suffix,
        user: completionOptions.user,
        // standardized settings:
        max_tokens: maxOutputTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        seed,
        ...providerOptions == null ? void 0 : providerOptions[this.providerOptionsName],
        // prompt:
        prompt: completionPrompt,
        // stop sequences:
        stop: stop.length > 0 ? stop : void 0
      },
      warnings
    };
  }
  async doGenerate(options) {
    const { args, warnings } = await this.getArgs(options);
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await (0, import_provider_utils3.postJsonToApi)({
      url: this.config.url({
        path: "/completions",
        modelId: this.modelId
      }),
      headers: (0, import_provider_utils3.combineHeaders)(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: this.failedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils3.createJsonResponseHandler)(
        openaiCompatibleCompletionResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const choice = response.choices[0];
    const content = [];
    if (choice.text != null && choice.text.length > 0) {
      content.push({ type: "text", text: choice.text });
    }
    return {
      content,
      usage: convertOpenAICompatibleCompletionUsage(response.usage),
      finishReason: {
        unified: mapOpenAICompatibleFinishReason2(choice.finish_reason),
        raw: choice.finish_reason
      },
      request: { body: args },
      response: {
        ...getResponseMetadata2(response),
        headers: responseHeaders,
        body: rawResponse
      },
      warnings
    };
  }
  async doStream(options) {
    const { args, warnings } = await this.getArgs(options);
    const body = {
      ...args,
      stream: true,
      // only include stream_options when in strict compatibility mode:
      stream_options: this.config.includeUsage ? { include_usage: true } : void 0
    };
    const { responseHeaders, value: response } = await (0, import_provider_utils3.postJsonToApi)({
      url: this.config.url({
        path: "/completions",
        modelId: this.modelId
      }),
      headers: (0, import_provider_utils3.combineHeaders)(this.config.headers(), options.headers),
      body,
      failedResponseHandler: this.failedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils3.createEventSourceResponseHandler)(
        this.chunkSchema
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
    return {
      stream: response.pipeThrough(
        new TransformStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings });
          },
          transform(chunk, controller) {
            var _a;
            if (options.includeRawChunks) {
              controller.enqueue({ type: "raw", rawValue: chunk.rawValue });
            }
            if (!chunk.success) {
              finishReason = { unified: "error", raw: void 0 };
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }
            const value = chunk.value;
            if ("error" in value) {
              finishReason = { unified: "error", raw: void 0 };
              controller.enqueue({ type: "error", error: value.error });
              return;
            }
            if (isFirstChunk) {
              isFirstChunk = false;
              controller.enqueue({
                type: "response-metadata",
                ...getResponseMetadata2(value)
              });
              controller.enqueue({
                type: "text-start",
                id: "0"
              });
            }
            if (value.usage != null) {
              usage = value.usage;
            }
            const choice = value.choices[0];
            if ((choice == null ? void 0 : choice.finish_reason) != null) {
              finishReason = {
                unified: mapOpenAICompatibleFinishReason2(choice.finish_reason),
                raw: (_a = choice.finish_reason) != null ? _a : void 0
              };
            }
            if ((choice == null ? void 0 : choice.text) != null) {
              controller.enqueue({
                type: "text-delta",
                id: "0",
                delta: choice.text
              });
            }
          },
          flush(controller) {
            if (!isFirstChunk) {
              controller.enqueue({ type: "text-end", id: "0" });
            }
            controller.enqueue({
              type: "finish",
              finishReason,
              usage: convertOpenAICompatibleCompletionUsage(usage)
            });
          }
        })
      ),
      request: { body },
      response: { headers: responseHeaders }
    };
  }
};
var usageSchema = import_v45.z.object({
  prompt_tokens: import_v45.z.number(),
  completion_tokens: import_v45.z.number(),
  total_tokens: import_v45.z.number()
});
var openaiCompatibleCompletionResponseSchema = import_v45.z.object({
  id: import_v45.z.string().nullish(),
  created: import_v45.z.number().nullish(),
  model: import_v45.z.string().nullish(),
  choices: import_v45.z.array(
    import_v45.z.object({
      text: import_v45.z.string(),
      finish_reason: import_v45.z.string()
    })
  ),
  usage: usageSchema.nullish()
});
var createOpenAICompatibleCompletionChunkSchema = (errorSchema) => import_v45.z.union([
  import_v45.z.object({
    id: import_v45.z.string().nullish(),
    created: import_v45.z.number().nullish(),
    model: import_v45.z.string().nullish(),
    choices: import_v45.z.array(
      import_v45.z.object({
        text: import_v45.z.string(),
        finish_reason: import_v45.z.string().nullish(),
        index: import_v45.z.number()
      })
    ),
    usage: usageSchema.nullish()
  }),
  errorSchema
]);

// src/embedding/openai-compatible-embedding-model.ts
var import_provider5 = require("@ai-sdk/provider");
var import_provider_utils4 = require("@ai-sdk/provider-utils");
var import_v47 = require("zod/v4");

// src/embedding/openai-compatible-embedding-options.ts
var import_v46 = require("zod/v4");
var openaiCompatibleEmbeddingModelOptions = import_v46.z.object({
  /**
   * The number of dimensions the resulting output embeddings should have.
   * Only supported in text-embedding-3 and later models.
   */
  dimensions: import_v46.z.number().optional(),
  /**
   * A unique identifier representing your end-user, which can help providers to
   * monitor and detect abuse.
   */
  user: import_v46.z.string().optional()
});

// src/embedding/openai-compatible-embedding-model.ts
var OpenAICompatibleEmbeddingModel = class {
  constructor(modelId, config) {
    this.specificationVersion = "v3";
    this.modelId = modelId;
    this.config = config;
  }
  get provider() {
    return this.config.provider;
  }
  get maxEmbeddingsPerCall() {
    var _a;
    return (_a = this.config.maxEmbeddingsPerCall) != null ? _a : 2048;
  }
  get supportsParallelCalls() {
    var _a;
    return (_a = this.config.supportsParallelCalls) != null ? _a : true;
  }
  get providerOptionsName() {
    return this.config.provider.split(".")[0].trim();
  }
  async doEmbed({
    values,
    headers,
    abortSignal,
    providerOptions
  }) {
    var _a, _b, _c;
    const warnings = [];
    const deprecatedOptions = await (0, import_provider_utils4.parseProviderOptions)({
      provider: "openai-compatible",
      providerOptions,
      schema: openaiCompatibleEmbeddingModelOptions
    });
    if (deprecatedOptions != null) {
      warnings.push({
        type: "other",
        message: `The 'openai-compatible' key in providerOptions is deprecated. Use 'openaiCompatible' instead.`
      });
    }
    const compatibleOptions = Object.assign(
      deprecatedOptions != null ? deprecatedOptions : {},
      (_a = await (0, import_provider_utils4.parseProviderOptions)({
        provider: "openaiCompatible",
        providerOptions,
        schema: openaiCompatibleEmbeddingModelOptions
      })) != null ? _a : {},
      (_b = await (0, import_provider_utils4.parseProviderOptions)({
        provider: this.providerOptionsName,
        providerOptions,
        schema: openaiCompatibleEmbeddingModelOptions
      })) != null ? _b : {}
    );
    if (values.length > this.maxEmbeddingsPerCall) {
      throw new import_provider5.TooManyEmbeddingValuesForCallError({
        provider: this.provider,
        modelId: this.modelId,
        maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
        values
      });
    }
    const {
      responseHeaders,
      value: response,
      rawValue
    } = await (0, import_provider_utils4.postJsonToApi)({
      url: this.config.url({
        path: "/embeddings",
        modelId: this.modelId
      }),
      headers: (0, import_provider_utils4.combineHeaders)(this.config.headers(), headers),
      body: {
        model: this.modelId,
        input: values,
        encoding_format: "float",
        dimensions: compatibleOptions.dimensions,
        user: compatibleOptions.user
      },
      failedResponseHandler: (0, import_provider_utils4.createJsonErrorResponseHandler)(
        (_c = this.config.errorStructure) != null ? _c : defaultOpenAICompatibleErrorStructure
      ),
      successfulResponseHandler: (0, import_provider_utils4.createJsonResponseHandler)(
        openaiTextEmbeddingResponseSchema
      ),
      abortSignal,
      fetch: this.config.fetch
    });
    return {
      warnings,
      embeddings: response.data.map((item) => item.embedding),
      usage: response.usage ? { tokens: response.usage.prompt_tokens } : void 0,
      providerMetadata: response.providerMetadata,
      response: { headers: responseHeaders, body: rawValue }
    };
  }
};
var openaiTextEmbeddingResponseSchema = import_v47.z.object({
  data: import_v47.z.array(import_v47.z.object({ embedding: import_v47.z.array(import_v47.z.number()) })),
  usage: import_v47.z.object({ prompt_tokens: import_v47.z.number() }).nullish(),
  providerMetadata: import_v47.z.record(import_v47.z.string(), import_v47.z.record(import_v47.z.string(), import_v47.z.any())).optional()
});

// src/image/openai-compatible-image-model.ts
var import_provider_utils5 = require("@ai-sdk/provider-utils");
var import_v48 = require("zod/v4");
var OpenAICompatibleImageModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
    this.maxImagesPerCall = 10;
  }
  get provider() {
    return this.config.provider;
  }
  /**
   * The provider options key used to extract provider-specific options.
   */
  get providerOptionsKey() {
    return this.config.provider.split(".")[0].trim();
  }
  // TODO: deprecate non-camelCase keys and remove in future major version
  getArgs(providerOptions) {
    return {
      ...providerOptions[this.providerOptionsKey],
      ...providerOptions[toCamelCase(this.providerOptionsKey)]
    };
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
    if (aspectRatio != null) {
      warnings.push({
        type: "unsupported",
        feature: "aspectRatio",
        details: "This model does not support aspect ratio. Use `size` instead."
      });
    }
    if (seed != null) {
      warnings.push({ type: "unsupported", feature: "seed" });
    }
    const currentDate = (_c = (_b = (_a = this.config._internal) == null ? void 0 : _a.currentDate) == null ? void 0 : _b.call(_a)) != null ? _c : /* @__PURE__ */ new Date();
    const args = this.getArgs(providerOptions);
    if (files != null && files.length > 0) {
      const { value: response2, responseHeaders: responseHeaders2 } = await (0, import_provider_utils5.postFormDataToApi)({
        url: this.config.url({
          path: "/images/edits",
          modelId: this.modelId
        }),
        headers: (0, import_provider_utils5.combineHeaders)(this.config.headers(), headers),
        formData: (0, import_provider_utils5.convertToFormData)({
          model: this.modelId,
          prompt,
          image: await Promise.all(files.map((file) => fileToBlob(file))),
          mask: mask != null ? await fileToBlob(mask) : void 0,
          n,
          size,
          ...args
        }),
        failedResponseHandler: (0, import_provider_utils5.createJsonErrorResponseHandler)(
          (_d = this.config.errorStructure) != null ? _d : defaultOpenAICompatibleErrorStructure
        ),
        successfulResponseHandler: (0, import_provider_utils5.createJsonResponseHandler)(
          openaiCompatibleImageResponseSchema
        ),
        abortSignal,
        fetch: this.config.fetch
      });
      return {
        images: response2.data.map((item) => item.b64_json),
        warnings,
        response: {
          timestamp: currentDate,
          modelId: this.modelId,
          headers: responseHeaders2
        }
      };
    }
    const { value: response, responseHeaders } = await (0, import_provider_utils5.postJsonToApi)({
      url: this.config.url({
        path: "/images/generations",
        modelId: this.modelId
      }),
      headers: (0, import_provider_utils5.combineHeaders)(this.config.headers(), headers),
      body: {
        model: this.modelId,
        prompt,
        n,
        size,
        ...args,
        response_format: "b64_json"
      },
      failedResponseHandler: (0, import_provider_utils5.createJsonErrorResponseHandler)(
        (_e = this.config.errorStructure) != null ? _e : defaultOpenAICompatibleErrorStructure
      ),
      successfulResponseHandler: (0, import_provider_utils5.createJsonResponseHandler)(
        openaiCompatibleImageResponseSchema
      ),
      abortSignal,
      fetch: this.config.fetch
    });
    return {
      images: response.data.map((item) => item.b64_json),
      warnings,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders
      }
    };
  }
};
var openaiCompatibleImageResponseSchema = import_v48.z.object({
  data: import_v48.z.array(import_v48.z.object({ b64_json: import_v48.z.string() }))
});
async function fileToBlob(file) {
  if (file.type === "url") {
    return (0, import_provider_utils5.downloadBlob)(file.url);
  }
  const data = file.data instanceof Uint8Array ? file.data : (0, import_provider_utils5.convertBase64ToUint8Array)(file.data);
  return new Blob([data], { type: file.mediaType });
}
function toCamelCase(str) {
  return str.replace(/[_-]([a-z])/g, (g) => g[1].toUpperCase());
}

// src/openai-compatible-provider.ts
var import_provider_utils6 = require("@ai-sdk/provider-utils");

// src/version.ts
var VERSION = true ? "2.0.37" : "0.0.0-test";

// src/openai-compatible-provider.ts
function createOpenAICompatible(options) {
  const baseURL = (0, import_provider_utils6.withoutTrailingSlash)(options.baseURL);
  const providerName = options.name;
  const headers = {
    ...options.apiKey && { Authorization: `Bearer ${options.apiKey}` },
    ...options.headers
  };
  const getHeaders = () => (0, import_provider_utils6.withUserAgentSuffix)(headers, `ai-sdk/openai-compatible/${VERSION}`);
  const getCommonModelConfig = (modelType) => ({
    provider: `${providerName}.${modelType}`,
    url: ({ path }) => {
      const url = new URL(`${baseURL}${path}`);
      if (options.queryParams) {
        url.search = new URLSearchParams(options.queryParams).toString();
      }
      return url.toString();
    },
    headers: getHeaders,
    fetch: options.fetch
  });
  const createLanguageModel = (modelId) => createChatModel(modelId);
  const createChatModel = (modelId) => new OpenAICompatibleChatLanguageModel(modelId, {
    ...getCommonModelConfig("chat"),
    includeUsage: options.includeUsage,
    supportsStructuredOutputs: options.supportsStructuredOutputs,
    transformRequestBody: options.transformRequestBody,
    metadataExtractor: options.metadataExtractor
  });
  const createCompletionModel = (modelId) => new OpenAICompatibleCompletionLanguageModel(modelId, {
    ...getCommonModelConfig("completion"),
    includeUsage: options.includeUsage
  });
  const createEmbeddingModel = (modelId) => new OpenAICompatibleEmbeddingModel(modelId, {
    ...getCommonModelConfig("embedding")
  });
  const createImageModel = (modelId) => new OpenAICompatibleImageModel(modelId, getCommonModelConfig("image"));
  const provider = (modelId) => createLanguageModel(modelId);
  provider.specificationVersion = "v3";
  provider.languageModel = createLanguageModel;
  provider.chatModel = createChatModel;
  provider.completionModel = createCompletionModel;
  provider.embeddingModel = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.imageModel = createImageModel;
  return provider;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  OpenAICompatibleChatLanguageModel,
  OpenAICompatibleCompletionLanguageModel,
  OpenAICompatibleEmbeddingModel,
  OpenAICompatibleImageModel,
  VERSION,
  createOpenAICompatible
});
//# sourceMappingURL=index.js.map