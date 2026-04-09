// src/openai-provider.ts
import {
  loadApiKey,
  loadOptionalSetting,
  withoutTrailingSlash,
  withUserAgentSuffix
} from "@ai-sdk/provider-utils";

// src/chat/openai-chat-language-model.ts
import {
  InvalidResponseDataError
} from "@ai-sdk/provider";
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  generateId,
  isParsableJson,
  parseProviderOptions,
  postJsonToApi
} from "@ai-sdk/provider-utils";

// src/openai-error.ts
import { z } from "zod/v4";
import { createJsonErrorResponseHandler } from "@ai-sdk/provider-utils";
var openaiErrorDataSchema = z.object({
  error: z.object({
    message: z.string(),
    // The additional information below is handled loosely to support
    // OpenAI-compatible providers that have slightly different error
    // responses:
    type: z.string().nullish(),
    param: z.any().nullish(),
    code: z.union([z.string(), z.number()]).nullish()
  })
});
var openaiFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: openaiErrorDataSchema,
  errorToMessage: (data) => data.error.message
});

// src/openai-language-model-capabilities.ts
function getOpenAILanguageModelCapabilities(modelId) {
  const supportsFlexProcessing = modelId.startsWith("o3") || modelId.startsWith("o4-mini") || modelId.startsWith("gpt-5") && !modelId.startsWith("gpt-5-chat");
  const supportsPriorityProcessing = modelId.startsWith("gpt-4") || modelId.startsWith("gpt-5") && !modelId.startsWith("gpt-5-nano") && !modelId.startsWith("gpt-5-chat") && !modelId.startsWith("gpt-5.4-nano") || modelId.startsWith("o3") || modelId.startsWith("o4-mini");
  const isReasoningModel = modelId.startsWith("o1") || modelId.startsWith("o3") || modelId.startsWith("o4-mini") || modelId.startsWith("gpt-5") && !modelId.startsWith("gpt-5-chat");
  const supportsNonReasoningParameters = modelId.startsWith("gpt-5.1") || modelId.startsWith("gpt-5.2") || modelId.startsWith("gpt-5.3") || modelId.startsWith("gpt-5.4");
  const systemMessageMode = isReasoningModel ? "developer" : "system";
  return {
    supportsFlexProcessing,
    supportsPriorityProcessing,
    isReasoningModel,
    systemMessageMode,
    supportsNonReasoningParameters
  };
}

// src/chat/convert-openai-chat-usage.ts
function convertOpenAIChatUsage(usage) {
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
  const cachedTokens = (_d = (_c = usage.prompt_tokens_details) == null ? void 0 : _c.cached_tokens) != null ? _d : 0;
  const reasoningTokens = (_f = (_e = usage.completion_tokens_details) == null ? void 0 : _e.reasoning_tokens) != null ? _f : 0;
  return {
    inputTokens: {
      total: promptTokens,
      noCache: promptTokens - cachedTokens,
      cacheRead: cachedTokens,
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

// src/chat/convert-to-openai-chat-messages.ts
import {
  UnsupportedFunctionalityError
} from "@ai-sdk/provider";
import { convertToBase64 } from "@ai-sdk/provider-utils";
function convertToOpenAIChatMessages({
  prompt,
  systemMessageMode = "system"
}) {
  var _a;
  const messages = [];
  const warnings = [];
  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        switch (systemMessageMode) {
          case "system": {
            messages.push({ role: "system", content });
            break;
          }
          case "developer": {
            messages.push({ role: "developer", content });
            break;
          }
          case "remove": {
            warnings.push({
              type: "other",
              message: "system messages are removed for this model"
            });
            break;
          }
          default: {
            const _exhaustiveCheck = systemMessageMode;
            throw new Error(
              `Unsupported system message mode: ${_exhaustiveCheck}`
            );
          }
        }
        break;
      }
      case "user": {
        if (content.length === 1 && content[0].type === "text") {
          messages.push({ role: "user", content: content[0].text });
          break;
        }
        messages.push({
          role: "user",
          content: content.map((part, index) => {
            var _a2, _b, _c;
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
                      url: part.data instanceof URL ? part.data.toString() : `data:${mediaType};base64,${convertToBase64(part.data)}`,
                      // OpenAI specific extension: image detail
                      detail: (_b = (_a2 = part.providerOptions) == null ? void 0 : _a2.openai) == null ? void 0 : _b.imageDetail
                    }
                  };
                } else if (part.mediaType.startsWith("audio/")) {
                  if (part.data instanceof URL) {
                    throw new UnsupportedFunctionalityError({
                      functionality: "audio file parts with URLs"
                    });
                  }
                  switch (part.mediaType) {
                    case "audio/wav": {
                      return {
                        type: "input_audio",
                        input_audio: {
                          data: convertToBase64(part.data),
                          format: "wav"
                        }
                      };
                    }
                    case "audio/mp3":
                    case "audio/mpeg": {
                      return {
                        type: "input_audio",
                        input_audio: {
                          data: convertToBase64(part.data),
                          format: "mp3"
                        }
                      };
                    }
                    default: {
                      throw new UnsupportedFunctionalityError({
                        functionality: `audio content parts with media type ${part.mediaType}`
                      });
                    }
                  }
                } else if (part.mediaType === "application/pdf") {
                  if (part.data instanceof URL) {
                    throw new UnsupportedFunctionalityError({
                      functionality: "PDF file parts with URLs"
                    });
                  }
                  return {
                    type: "file",
                    file: typeof part.data === "string" && part.data.startsWith("file-") ? { file_id: part.data } : {
                      filename: (_c = part.filename) != null ? _c : `part-${index}.pdf`,
                      file_data: `data:application/pdf;base64,${convertToBase64(part.data)}`
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

// src/chat/get-response-metadata.ts
function getResponseMetadata({
  id,
  model,
  created
}) {
  return {
    id: id != null ? id : void 0,
    modelId: model != null ? model : void 0,
    timestamp: created ? new Date(created * 1e3) : void 0
  };
}

// src/chat/map-openai-finish-reason.ts
function mapOpenAIFinishReason(finishReason) {
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

// src/chat/openai-chat-api.ts
import { lazySchema, zodSchema } from "@ai-sdk/provider-utils";
import { z as z2 } from "zod/v4";
var openaiChatResponseSchema = lazySchema(
  () => zodSchema(
    z2.object({
      id: z2.string().nullish(),
      created: z2.number().nullish(),
      model: z2.string().nullish(),
      choices: z2.array(
        z2.object({
          message: z2.object({
            role: z2.literal("assistant").nullish(),
            content: z2.string().nullish(),
            tool_calls: z2.array(
              z2.object({
                id: z2.string().nullish(),
                type: z2.literal("function"),
                function: z2.object({
                  name: z2.string(),
                  arguments: z2.string()
                })
              })
            ).nullish(),
            annotations: z2.array(
              z2.object({
                type: z2.literal("url_citation"),
                url_citation: z2.object({
                  start_index: z2.number(),
                  end_index: z2.number(),
                  url: z2.string(),
                  title: z2.string()
                })
              })
            ).nullish()
          }),
          index: z2.number(),
          logprobs: z2.object({
            content: z2.array(
              z2.object({
                token: z2.string(),
                logprob: z2.number(),
                top_logprobs: z2.array(
                  z2.object({
                    token: z2.string(),
                    logprob: z2.number()
                  })
                )
              })
            ).nullish()
          }).nullish(),
          finish_reason: z2.string().nullish()
        })
      ),
      usage: z2.object({
        prompt_tokens: z2.number().nullish(),
        completion_tokens: z2.number().nullish(),
        total_tokens: z2.number().nullish(),
        prompt_tokens_details: z2.object({
          cached_tokens: z2.number().nullish()
        }).nullish(),
        completion_tokens_details: z2.object({
          reasoning_tokens: z2.number().nullish(),
          accepted_prediction_tokens: z2.number().nullish(),
          rejected_prediction_tokens: z2.number().nullish()
        }).nullish()
      }).nullish()
    })
  )
);
var openaiChatChunkSchema = lazySchema(
  () => zodSchema(
    z2.union([
      z2.object({
        id: z2.string().nullish(),
        created: z2.number().nullish(),
        model: z2.string().nullish(),
        choices: z2.array(
          z2.object({
            delta: z2.object({
              role: z2.enum(["assistant"]).nullish(),
              content: z2.string().nullish(),
              tool_calls: z2.array(
                z2.object({
                  index: z2.number(),
                  id: z2.string().nullish(),
                  type: z2.literal("function").nullish(),
                  function: z2.object({
                    name: z2.string().nullish(),
                    arguments: z2.string().nullish()
                  })
                })
              ).nullish(),
              annotations: z2.array(
                z2.object({
                  type: z2.literal("url_citation"),
                  url_citation: z2.object({
                    start_index: z2.number(),
                    end_index: z2.number(),
                    url: z2.string(),
                    title: z2.string()
                  })
                })
              ).nullish()
            }).nullish(),
            logprobs: z2.object({
              content: z2.array(
                z2.object({
                  token: z2.string(),
                  logprob: z2.number(),
                  top_logprobs: z2.array(
                    z2.object({
                      token: z2.string(),
                      logprob: z2.number()
                    })
                  )
                })
              ).nullish()
            }).nullish(),
            finish_reason: z2.string().nullish(),
            index: z2.number()
          })
        ),
        usage: z2.object({
          prompt_tokens: z2.number().nullish(),
          completion_tokens: z2.number().nullish(),
          total_tokens: z2.number().nullish(),
          prompt_tokens_details: z2.object({
            cached_tokens: z2.number().nullish()
          }).nullish(),
          completion_tokens_details: z2.object({
            reasoning_tokens: z2.number().nullish(),
            accepted_prediction_tokens: z2.number().nullish(),
            rejected_prediction_tokens: z2.number().nullish()
          }).nullish()
        }).nullish()
      }),
      openaiErrorDataSchema
    ])
  )
);

// src/chat/openai-chat-options.ts
import { lazySchema as lazySchema2, zodSchema as zodSchema2 } from "@ai-sdk/provider-utils";
import { z as z3 } from "zod/v4";
var openaiLanguageModelChatOptions = lazySchema2(
  () => zodSchema2(
    z3.object({
      /**
       * Modify the likelihood of specified tokens appearing in the completion.
       *
       * Accepts a JSON object that maps tokens (specified by their token ID in
       * the GPT tokenizer) to an associated bias value from -100 to 100.
       */
      logitBias: z3.record(z3.coerce.number(), z3.number()).optional(),
      /**
       * Return the log probabilities of the tokens.
       *
       * Setting to true will return the log probabilities of the tokens that
       * were generated.
       *
       * Setting to a number will return the log probabilities of the top n
       * tokens that were generated.
       */
      logprobs: z3.union([z3.boolean(), z3.number()]).optional(),
      /**
       * Whether to enable parallel function calling during tool use. Default to true.
       */
      parallelToolCalls: z3.boolean().optional(),
      /**
       * A unique identifier representing your end-user, which can help OpenAI to
       * monitor and detect abuse.
       */
      user: z3.string().optional(),
      /**
       * Reasoning effort for reasoning models. Defaults to `medium`.
       */
      reasoningEffort: z3.enum(["none", "minimal", "low", "medium", "high", "xhigh"]).optional(),
      /**
       * Maximum number of completion tokens to generate. Useful for reasoning models.
       */
      maxCompletionTokens: z3.number().optional(),
      /**
       * Whether to enable persistence in responses API.
       */
      store: z3.boolean().optional(),
      /**
       * Metadata to associate with the request.
       */
      metadata: z3.record(z3.string().max(64), z3.string().max(512)).optional(),
      /**
       * Parameters for prediction mode.
       */
      prediction: z3.record(z3.string(), z3.any()).optional(),
      /**
       * Service tier for the request.
       * - 'auto': Default service tier. The request will be processed with the service tier configured in the
       *           Project settings. Unless otherwise configured, the Project will use 'default'.
       * - 'flex': 50% cheaper processing at the cost of increased latency. Only available for o3 and o4-mini models.
       * - 'priority': Higher-speed processing with predictably low latency at premium cost. Available for Enterprise customers.
       * - 'default': The request will be processed with the standard pricing and performance for the selected model.
       *
       * @default 'auto'
       */
      serviceTier: z3.enum(["auto", "flex", "priority", "default"]).optional(),
      /**
       * Whether to use strict JSON schema validation.
       *
       * @default true
       */
      strictJsonSchema: z3.boolean().optional(),
      /**
       * Controls the verbosity of the model's responses.
       * Lower values will result in more concise responses, while higher values will result in more verbose responses.
       */
      textVerbosity: z3.enum(["low", "medium", "high"]).optional(),
      /**
       * A cache key for prompt caching. Allows manual control over prompt caching behavior.
       * Useful for improving cache hit rates and working around automatic caching issues.
       */
      promptCacheKey: z3.string().optional(),
      /**
       * The retention policy for the prompt cache.
       * - 'in_memory': Default. Standard prompt caching behavior.
       * - '24h': Extended prompt caching that keeps cached prefixes active for up to 24 hours.
       *          Currently only available for 5.1 series models.
       *
       * @default 'in_memory'
       */
      promptCacheRetention: z3.enum(["in_memory", "24h"]).optional(),
      /**
       * A stable identifier used to help detect users of your application
       * that may be violating OpenAI's usage policies. The IDs should be a
       * string that uniquely identifies each user. We recommend hashing their
       * username or email address, in order to avoid sending us any identifying
       * information.
       */
      safetyIdentifier: z3.string().optional(),
      /**
       * Override the system message mode for this model.
       * - 'system': Use the 'system' role for system messages (default for most models)
       * - 'developer': Use the 'developer' role for system messages (used by reasoning models)
       * - 'remove': Remove system messages entirely
       *
       * If not specified, the mode is automatically determined based on the model.
       */
      systemMessageMode: z3.enum(["system", "developer", "remove"]).optional(),
      /**
       * Force treating this model as a reasoning model.
       *
       * This is useful for "stealth" reasoning models (e.g. via a custom baseURL)
       * where the model ID is not recognized by the SDK's allowlist.
       *
       * When enabled, the SDK applies reasoning-model parameter compatibility rules
       * and defaults `systemMessageMode` to `developer` unless overridden.
       */
      forceReasoning: z3.boolean().optional()
    })
  )
);

// src/chat/openai-chat-prepare-tools.ts
import {
  UnsupportedFunctionalityError as UnsupportedFunctionalityError2
} from "@ai-sdk/provider";
function prepareChatTools({
  tools,
  toolChoice
}) {
  tools = (tools == null ? void 0 : tools.length) ? tools : void 0;
  const toolWarnings = [];
  if (tools == null) {
    return { tools: void 0, toolChoice: void 0, toolWarnings };
  }
  const openaiTools2 = [];
  for (const tool of tools) {
    switch (tool.type) {
      case "function":
        openaiTools2.push({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
            ...tool.strict != null ? { strict: tool.strict } : {}
          }
        });
        break;
      default:
        toolWarnings.push({
          type: "unsupported",
          feature: `tool type: ${tool.type}`
        });
        break;
    }
  }
  if (toolChoice == null) {
    return { tools: openaiTools2, toolChoice: void 0, toolWarnings };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
    case "none":
    case "required":
      return { tools: openaiTools2, toolChoice: type, toolWarnings };
    case "tool":
      return {
        tools: openaiTools2,
        toolChoice: {
          type: "function",
          function: {
            name: toolChoice.toolName
          }
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

// src/chat/openai-chat-language-model.ts
var OpenAIChatLanguageModel = class {
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
    responseFormat,
    seed,
    tools,
    toolChoice,
    providerOptions
  }) {
    var _a, _b, _c, _d, _e;
    const warnings = [];
    const openaiOptions = (_a = await parseProviderOptions({
      provider: "openai",
      providerOptions,
      schema: openaiLanguageModelChatOptions
    })) != null ? _a : {};
    const modelCapabilities = getOpenAILanguageModelCapabilities(this.modelId);
    const isReasoningModel = (_b = openaiOptions.forceReasoning) != null ? _b : modelCapabilities.isReasoningModel;
    if (topK != null) {
      warnings.push({ type: "unsupported", feature: "topK" });
    }
    const { messages, warnings: messageWarnings } = convertToOpenAIChatMessages(
      {
        prompt,
        systemMessageMode: (_c = openaiOptions.systemMessageMode) != null ? _c : isReasoningModel ? "developer" : modelCapabilities.systemMessageMode
      }
    );
    warnings.push(...messageWarnings);
    const strictJsonSchema = (_d = openaiOptions.strictJsonSchema) != null ? _d : true;
    const baseArgs = {
      // model id:
      model: this.modelId,
      // model specific settings:
      logit_bias: openaiOptions.logitBias,
      logprobs: openaiOptions.logprobs === true || typeof openaiOptions.logprobs === "number" ? true : void 0,
      top_logprobs: typeof openaiOptions.logprobs === "number" ? openaiOptions.logprobs : typeof openaiOptions.logprobs === "boolean" ? openaiOptions.logprobs ? 0 : void 0 : void 0,
      user: openaiOptions.user,
      parallel_tool_calls: openaiOptions.parallelToolCalls,
      // standardized settings:
      max_tokens: maxOutputTokens,
      temperature,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      response_format: (responseFormat == null ? void 0 : responseFormat.type) === "json" ? responseFormat.schema != null ? {
        type: "json_schema",
        json_schema: {
          schema: responseFormat.schema,
          strict: strictJsonSchema,
          name: (_e = responseFormat.name) != null ? _e : "response",
          description: responseFormat.description
        }
      } : { type: "json_object" } : void 0,
      stop: stopSequences,
      seed,
      verbosity: openaiOptions.textVerbosity,
      // openai specific settings:
      // TODO AI SDK 6: remove, we auto-map maxOutputTokens now
      max_completion_tokens: openaiOptions.maxCompletionTokens,
      store: openaiOptions.store,
      metadata: openaiOptions.metadata,
      prediction: openaiOptions.prediction,
      reasoning_effort: openaiOptions.reasoningEffort,
      service_tier: openaiOptions.serviceTier,
      prompt_cache_key: openaiOptions.promptCacheKey,
      prompt_cache_retention: openaiOptions.promptCacheRetention,
      safety_identifier: openaiOptions.safetyIdentifier,
      // messages:
      messages
    };
    if (isReasoningModel) {
      if (openaiOptions.reasoningEffort !== "none" || !modelCapabilities.supportsNonReasoningParameters) {
        if (baseArgs.temperature != null) {
          baseArgs.temperature = void 0;
          warnings.push({
            type: "unsupported",
            feature: "temperature",
            details: "temperature is not supported for reasoning models"
          });
        }
        if (baseArgs.top_p != null) {
          baseArgs.top_p = void 0;
          warnings.push({
            type: "unsupported",
            feature: "topP",
            details: "topP is not supported for reasoning models"
          });
        }
        if (baseArgs.logprobs != null) {
          baseArgs.logprobs = void 0;
          warnings.push({
            type: "other",
            message: "logprobs is not supported for reasoning models"
          });
        }
      }
      if (baseArgs.frequency_penalty != null) {
        baseArgs.frequency_penalty = void 0;
        warnings.push({
          type: "unsupported",
          feature: "frequencyPenalty",
          details: "frequencyPenalty is not supported for reasoning models"
        });
      }
      if (baseArgs.presence_penalty != null) {
        baseArgs.presence_penalty = void 0;
        warnings.push({
          type: "unsupported",
          feature: "presencePenalty",
          details: "presencePenalty is not supported for reasoning models"
        });
      }
      if (baseArgs.logit_bias != null) {
        baseArgs.logit_bias = void 0;
        warnings.push({
          type: "other",
          message: "logitBias is not supported for reasoning models"
        });
      }
      if (baseArgs.top_logprobs != null) {
        baseArgs.top_logprobs = void 0;
        warnings.push({
          type: "other",
          message: "topLogprobs is not supported for reasoning models"
        });
      }
      if (baseArgs.max_tokens != null) {
        if (baseArgs.max_completion_tokens == null) {
          baseArgs.max_completion_tokens = baseArgs.max_tokens;
        }
        baseArgs.max_tokens = void 0;
      }
    } else if (this.modelId.startsWith("gpt-4o-search-preview") || this.modelId.startsWith("gpt-4o-mini-search-preview")) {
      if (baseArgs.temperature != null) {
        baseArgs.temperature = void 0;
        warnings.push({
          type: "unsupported",
          feature: "temperature",
          details: "temperature is not supported for the search preview models and has been removed."
        });
      }
    }
    if (openaiOptions.serviceTier === "flex" && !modelCapabilities.supportsFlexProcessing) {
      warnings.push({
        type: "unsupported",
        feature: "serviceTier",
        details: "flex processing is only available for o3, o4-mini, and gpt-5 models"
      });
      baseArgs.service_tier = void 0;
    }
    if (openaiOptions.serviceTier === "priority" && !modelCapabilities.supportsPriorityProcessing) {
      warnings.push({
        type: "unsupported",
        feature: "serviceTier",
        details: "priority processing is only available for supported models (gpt-4, gpt-5, gpt-5-mini, o3, o4-mini) and requires Enterprise access. gpt-5-nano is not supported"
      });
      baseArgs.service_tier = void 0;
    }
    const {
      tools: openaiTools2,
      toolChoice: openaiToolChoice,
      toolWarnings
    } = prepareChatTools({
      tools,
      toolChoice
    });
    return {
      args: {
        ...baseArgs,
        tools: openaiTools2,
        tool_choice: openaiToolChoice
      },
      warnings: [...warnings, ...toolWarnings]
    };
  }
  async doGenerate(options) {
    var _a, _b, _c, _d, _e, _f, _g;
    const { args: body, warnings } = await this.getArgs(options);
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await postJsonToApi({
      url: this.config.url({
        path: "/chat/completions",
        modelId: this.modelId
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        openaiChatResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const choice = response.choices[0];
    const content = [];
    const text = choice.message.content;
    if (text != null && text.length > 0) {
      content.push({ type: "text", text });
    }
    for (const toolCall of (_a = choice.message.tool_calls) != null ? _a : []) {
      content.push({
        type: "tool-call",
        toolCallId: (_b = toolCall.id) != null ? _b : generateId(),
        toolName: toolCall.function.name,
        input: toolCall.function.arguments
      });
    }
    for (const annotation of (_c = choice.message.annotations) != null ? _c : []) {
      content.push({
        type: "source",
        sourceType: "url",
        id: generateId(),
        url: annotation.url_citation.url,
        title: annotation.url_citation.title
      });
    }
    const completionTokenDetails = (_d = response.usage) == null ? void 0 : _d.completion_tokens_details;
    const promptTokenDetails = (_e = response.usage) == null ? void 0 : _e.prompt_tokens_details;
    const providerMetadata = { openai: {} };
    if ((completionTokenDetails == null ? void 0 : completionTokenDetails.accepted_prediction_tokens) != null) {
      providerMetadata.openai.acceptedPredictionTokens = completionTokenDetails == null ? void 0 : completionTokenDetails.accepted_prediction_tokens;
    }
    if ((completionTokenDetails == null ? void 0 : completionTokenDetails.rejected_prediction_tokens) != null) {
      providerMetadata.openai.rejectedPredictionTokens = completionTokenDetails == null ? void 0 : completionTokenDetails.rejected_prediction_tokens;
    }
    if (((_f = choice.logprobs) == null ? void 0 : _f.content) != null) {
      providerMetadata.openai.logprobs = choice.logprobs.content;
    }
    return {
      content,
      finishReason: {
        unified: mapOpenAIFinishReason(choice.finish_reason),
        raw: (_g = choice.finish_reason) != null ? _g : void 0
      },
      usage: convertOpenAIChatUsage(response.usage),
      request: { body },
      response: {
        ...getResponseMetadata(response),
        headers: responseHeaders,
        body: rawResponse
      },
      warnings,
      providerMetadata
    };
  }
  async doStream(options) {
    const { args, warnings } = await this.getArgs(options);
    const body = {
      ...args,
      stream: true,
      stream_options: {
        include_usage: true
      }
    };
    const { responseHeaders, value: response } = await postJsonToApi({
      url: this.config.url({
        path: "/chat/completions",
        modelId: this.modelId
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        openaiChatChunkSchema
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
    let metadataExtracted = false;
    let isActiveText = false;
    const providerMetadata = { openai: {} };
    return {
      stream: response.pipeThrough(
        new TransformStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings });
          },
          transform(chunk, controller) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q;
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
            if (!metadataExtracted) {
              const metadata = getResponseMetadata(value);
              if (Object.values(metadata).some(Boolean)) {
                metadataExtracted = true;
                controller.enqueue({
                  type: "response-metadata",
                  ...getResponseMetadata(value)
                });
              }
            }
            if (value.usage != null) {
              usage = value.usage;
              if (((_a = value.usage.completion_tokens_details) == null ? void 0 : _a.accepted_prediction_tokens) != null) {
                providerMetadata.openai.acceptedPredictionTokens = (_b = value.usage.completion_tokens_details) == null ? void 0 : _b.accepted_prediction_tokens;
              }
              if (((_c = value.usage.completion_tokens_details) == null ? void 0 : _c.rejected_prediction_tokens) != null) {
                providerMetadata.openai.rejectedPredictionTokens = (_d = value.usage.completion_tokens_details) == null ? void 0 : _d.rejected_prediction_tokens;
              }
            }
            const choice = value.choices[0];
            if ((choice == null ? void 0 : choice.finish_reason) != null) {
              finishReason = {
                unified: mapOpenAIFinishReason(choice.finish_reason),
                raw: choice.finish_reason
              };
            }
            if (((_e = choice == null ? void 0 : choice.logprobs) == null ? void 0 : _e.content) != null) {
              providerMetadata.openai.logprobs = choice.logprobs.content;
            }
            if ((choice == null ? void 0 : choice.delta) == null) {
              return;
            }
            const delta = choice.delta;
            if (delta.content != null) {
              if (!isActiveText) {
                controller.enqueue({ type: "text-start", id: "0" });
                isActiveText = true;
              }
              controller.enqueue({
                type: "text-delta",
                id: "0",
                delta: delta.content
              });
            }
            if (delta.tool_calls != null) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index;
                if (toolCalls[index] == null) {
                  if (toolCallDelta.type != null && toolCallDelta.type !== "function") {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function' type.`
                    });
                  }
                  if (toolCallDelta.id == null) {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'id' to be a string.`
                    });
                  }
                  if (((_f = toolCallDelta.function) == null ? void 0 : _f.name) == null) {
                    throw new InvalidResponseDataError({
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
                      arguments: (_g = toolCallDelta.function.arguments) != null ? _g : ""
                    },
                    hasFinished: false
                  };
                  const toolCall2 = toolCalls[index];
                  if (((_h = toolCall2.function) == null ? void 0 : _h.name) != null && ((_i = toolCall2.function) == null ? void 0 : _i.arguments) != null) {
                    if (toolCall2.function.arguments.length > 0) {
                      controller.enqueue({
                        type: "tool-input-delta",
                        id: toolCall2.id,
                        delta: toolCall2.function.arguments
                      });
                    }
                    if (isParsableJson(toolCall2.function.arguments)) {
                      controller.enqueue({
                        type: "tool-input-end",
                        id: toolCall2.id
                      });
                      controller.enqueue({
                        type: "tool-call",
                        toolCallId: (_j = toolCall2.id) != null ? _j : generateId(),
                        toolName: toolCall2.function.name,
                        input: toolCall2.function.arguments
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
                if (((_k = toolCallDelta.function) == null ? void 0 : _k.arguments) != null) {
                  toolCall.function.arguments += (_m = (_l = toolCallDelta.function) == null ? void 0 : _l.arguments) != null ? _m : "";
                }
                controller.enqueue({
                  type: "tool-input-delta",
                  id: toolCall.id,
                  delta: (_n = toolCallDelta.function.arguments) != null ? _n : ""
                });
                if (((_o = toolCall.function) == null ? void 0 : _o.name) != null && ((_p = toolCall.function) == null ? void 0 : _p.arguments) != null && isParsableJson(toolCall.function.arguments)) {
                  controller.enqueue({
                    type: "tool-input-end",
                    id: toolCall.id
                  });
                  controller.enqueue({
                    type: "tool-call",
                    toolCallId: (_q = toolCall.id) != null ? _q : generateId(),
                    toolName: toolCall.function.name,
                    input: toolCall.function.arguments
                  });
                  toolCall.hasFinished = true;
                }
              }
            }
            if (delta.annotations != null) {
              for (const annotation of delta.annotations) {
                controller.enqueue({
                  type: "source",
                  sourceType: "url",
                  id: generateId(),
                  url: annotation.url_citation.url,
                  title: annotation.url_citation.title
                });
              }
            }
          },
          flush(controller) {
            if (isActiveText) {
              controller.enqueue({ type: "text-end", id: "0" });
            }
            controller.enqueue({
              type: "finish",
              finishReason,
              usage: convertOpenAIChatUsage(usage),
              ...providerMetadata != null ? { providerMetadata } : {}
            });
          }
        })
      ),
      request: { body },
      response: { headers: responseHeaders }
    };
  }
};

// src/completion/openai-completion-language-model.ts
import {
  combineHeaders as combineHeaders2,
  createEventSourceResponseHandler as createEventSourceResponseHandler2,
  createJsonResponseHandler as createJsonResponseHandler2,
  parseProviderOptions as parseProviderOptions2,
  postJsonToApi as postJsonToApi2
} from "@ai-sdk/provider-utils";

// src/completion/convert-openai-completion-usage.ts
function convertOpenAICompletionUsage(usage) {
  var _a, _b, _c, _d;
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
      total: (_c = usage.prompt_tokens) != null ? _c : void 0,
      noCache: promptTokens,
      cacheRead: void 0,
      cacheWrite: void 0
    },
    outputTokens: {
      total: (_d = usage.completion_tokens) != null ? _d : void 0,
      text: completionTokens,
      reasoning: void 0
    },
    raw: usage
  };
}

// src/completion/convert-to-openai-completion-prompt.ts
import {
  InvalidPromptError,
  UnsupportedFunctionalityError as UnsupportedFunctionalityError3
} from "@ai-sdk/provider";
function convertToOpenAICompletionPrompt({
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
        throw new InvalidPromptError({
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
              throw new UnsupportedFunctionalityError3({
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
        throw new UnsupportedFunctionalityError3({
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

// src/completion/map-openai-finish-reason.ts
function mapOpenAIFinishReason2(finishReason) {
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

// src/completion/openai-completion-api.ts
import { z as z4 } from "zod/v4";
import { lazySchema as lazySchema3, zodSchema as zodSchema3 } from "@ai-sdk/provider-utils";
var openaiCompletionResponseSchema = lazySchema3(
  () => zodSchema3(
    z4.object({
      id: z4.string().nullish(),
      created: z4.number().nullish(),
      model: z4.string().nullish(),
      choices: z4.array(
        z4.object({
          text: z4.string(),
          finish_reason: z4.string(),
          logprobs: z4.object({
            tokens: z4.array(z4.string()),
            token_logprobs: z4.array(z4.number()),
            top_logprobs: z4.array(z4.record(z4.string(), z4.number())).nullish()
          }).nullish()
        })
      ),
      usage: z4.object({
        prompt_tokens: z4.number(),
        completion_tokens: z4.number(),
        total_tokens: z4.number()
      }).nullish()
    })
  )
);
var openaiCompletionChunkSchema = lazySchema3(
  () => zodSchema3(
    z4.union([
      z4.object({
        id: z4.string().nullish(),
        created: z4.number().nullish(),
        model: z4.string().nullish(),
        choices: z4.array(
          z4.object({
            text: z4.string(),
            finish_reason: z4.string().nullish(),
            index: z4.number(),
            logprobs: z4.object({
              tokens: z4.array(z4.string()),
              token_logprobs: z4.array(z4.number()),
              top_logprobs: z4.array(z4.record(z4.string(), z4.number())).nullish()
            }).nullish()
          })
        ),
        usage: z4.object({
          prompt_tokens: z4.number(),
          completion_tokens: z4.number(),
          total_tokens: z4.number()
        }).nullish()
      }),
      openaiErrorDataSchema
    ])
  )
);

// src/completion/openai-completion-options.ts
import { lazySchema as lazySchema4, zodSchema as zodSchema4 } from "@ai-sdk/provider-utils";
import { z as z5 } from "zod/v4";
var openaiLanguageModelCompletionOptions = lazySchema4(
  () => zodSchema4(
    z5.object({
      /**
       * Echo back the prompt in addition to the completion.
       */
      echo: z5.boolean().optional(),
      /**
       * Modify the likelihood of specified tokens appearing in the completion.
       *
       * Accepts a JSON object that maps tokens (specified by their token ID in
       * the GPT tokenizer) to an associated bias value from -100 to 100. You
       * can use this tokenizer tool to convert text to token IDs. Mathematically,
       * the bias is added to the logits generated by the model prior to sampling.
       * The exact effect will vary per model, but values between -1 and 1 should
       * decrease or increase likelihood of selection; values like -100 or 100
       * should result in a ban or exclusive selection of the relevant token.
       *
       * As an example, you can pass {"50256": -100} to prevent the <|endoftext|>
       * token from being generated.
       */
      logitBias: z5.record(z5.string(), z5.number()).optional(),
      /**
       * The suffix that comes after a completion of inserted text.
       */
      suffix: z5.string().optional(),
      /**
       * A unique identifier representing your end-user, which can help OpenAI to
       * monitor and detect abuse. Learn more.
       */
      user: z5.string().optional(),
      /**
       * Return the log probabilities of the tokens. Including logprobs will increase
       * the response size and can slow down response times. However, it can
       * be useful to better understand how the model is behaving.
       * Setting to true will return the log probabilities of the tokens that
       * were generated.
       * Setting to a number will return the log probabilities of the top n
       * tokens that were generated.
       */
      logprobs: z5.union([z5.boolean(), z5.number()]).optional()
    })
  )
);

// src/completion/openai-completion-language-model.ts
var OpenAICompletionLanguageModel = class {
  constructor(modelId, config) {
    this.specificationVersion = "v3";
    this.supportedUrls = {
      // No URLs are supported for completion models.
    };
    this.modelId = modelId;
    this.config = config;
  }
  get providerOptionsName() {
    return this.config.provider.split(".")[0].trim();
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
    stopSequences: userStopSequences,
    responseFormat,
    tools,
    toolChoice,
    seed,
    providerOptions
  }) {
    const warnings = [];
    const openaiOptions = {
      ...await parseProviderOptions2({
        provider: "openai",
        providerOptions,
        schema: openaiLanguageModelCompletionOptions
      }),
      ...await parseProviderOptions2({
        provider: this.providerOptionsName,
        providerOptions,
        schema: openaiLanguageModelCompletionOptions
      })
    };
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
    const { prompt: completionPrompt, stopSequences } = convertToOpenAICompletionPrompt({ prompt });
    const stop = [...stopSequences != null ? stopSequences : [], ...userStopSequences != null ? userStopSequences : []];
    return {
      args: {
        // model id:
        model: this.modelId,
        // model specific settings:
        echo: openaiOptions.echo,
        logit_bias: openaiOptions.logitBias,
        logprobs: (openaiOptions == null ? void 0 : openaiOptions.logprobs) === true ? 0 : (openaiOptions == null ? void 0 : openaiOptions.logprobs) === false ? void 0 : openaiOptions == null ? void 0 : openaiOptions.logprobs,
        suffix: openaiOptions.suffix,
        user: openaiOptions.user,
        // standardized settings:
        max_tokens: maxOutputTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        seed,
        // prompt:
        prompt: completionPrompt,
        // stop sequences:
        stop: stop.length > 0 ? stop : void 0
      },
      warnings
    };
  }
  async doGenerate(options) {
    var _a;
    const { args, warnings } = await this.getArgs(options);
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await postJsonToApi2({
      url: this.config.url({
        path: "/completions",
        modelId: this.modelId
      }),
      headers: combineHeaders2(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler2(
        openaiCompletionResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const choice = response.choices[0];
    const providerMetadata = { openai: {} };
    if (choice.logprobs != null) {
      providerMetadata.openai.logprobs = choice.logprobs;
    }
    return {
      content: [{ type: "text", text: choice.text }],
      usage: convertOpenAICompletionUsage(response.usage),
      finishReason: {
        unified: mapOpenAIFinishReason2(choice.finish_reason),
        raw: (_a = choice.finish_reason) != null ? _a : void 0
      },
      request: { body: args },
      response: {
        ...getResponseMetadata2(response),
        headers: responseHeaders,
        body: rawResponse
      },
      providerMetadata,
      warnings
    };
  }
  async doStream(options) {
    const { args, warnings } = await this.getArgs(options);
    const body = {
      ...args,
      stream: true,
      stream_options: {
        include_usage: true
      }
    };
    const { responseHeaders, value: response } = await postJsonToApi2({
      url: this.config.url({
        path: "/completions",
        modelId: this.modelId
      }),
      headers: combineHeaders2(this.config.headers(), options.headers),
      body,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler2(
        openaiCompletionChunkSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    let finishReason = {
      unified: "other",
      raw: void 0
    };
    const providerMetadata = { openai: {} };
    let usage = void 0;
    let isFirstChunk = true;
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
              controller.enqueue({ type: "text-start", id: "0" });
            }
            if (value.usage != null) {
              usage = value.usage;
            }
            const choice = value.choices[0];
            if ((choice == null ? void 0 : choice.finish_reason) != null) {
              finishReason = {
                unified: mapOpenAIFinishReason2(choice.finish_reason),
                raw: choice.finish_reason
              };
            }
            if ((choice == null ? void 0 : choice.logprobs) != null) {
              providerMetadata.openai.logprobs = choice.logprobs;
            }
            if ((choice == null ? void 0 : choice.text) != null && choice.text.length > 0) {
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
              providerMetadata,
              usage: convertOpenAICompletionUsage(usage)
            });
          }
        })
      ),
      request: { body },
      response: { headers: responseHeaders }
    };
  }
};

// src/embedding/openai-embedding-model.ts
import {
  TooManyEmbeddingValuesForCallError
} from "@ai-sdk/provider";
import {
  combineHeaders as combineHeaders3,
  createJsonResponseHandler as createJsonResponseHandler3,
  parseProviderOptions as parseProviderOptions3,
  postJsonToApi as postJsonToApi3
} from "@ai-sdk/provider-utils";

// src/embedding/openai-embedding-options.ts
import { lazySchema as lazySchema5, zodSchema as zodSchema5 } from "@ai-sdk/provider-utils";
import { z as z6 } from "zod/v4";
var openaiEmbeddingModelOptions = lazySchema5(
  () => zodSchema5(
    z6.object({
      /**
       * The number of dimensions the resulting output embeddings should have.
       * Only supported in text-embedding-3 and later models.
       */
      dimensions: z6.number().optional(),
      /**
       * A unique identifier representing your end-user, which can help OpenAI to
       * monitor and detect abuse. Learn more.
       */
      user: z6.string().optional()
    })
  )
);

// src/embedding/openai-embedding-api.ts
import { lazySchema as lazySchema6, zodSchema as zodSchema6 } from "@ai-sdk/provider-utils";
import { z as z7 } from "zod/v4";
var openaiTextEmbeddingResponseSchema = lazySchema6(
  () => zodSchema6(
    z7.object({
      data: z7.array(z7.object({ embedding: z7.array(z7.number()) })),
      usage: z7.object({ prompt_tokens: z7.number() }).nullish()
    })
  )
);

// src/embedding/openai-embedding-model.ts
var OpenAIEmbeddingModel = class {
  constructor(modelId, config) {
    this.specificationVersion = "v3";
    this.maxEmbeddingsPerCall = 2048;
    this.supportsParallelCalls = true;
    this.modelId = modelId;
    this.config = config;
  }
  get provider() {
    return this.config.provider;
  }
  async doEmbed({
    values,
    headers,
    abortSignal,
    providerOptions
  }) {
    var _a;
    if (values.length > this.maxEmbeddingsPerCall) {
      throw new TooManyEmbeddingValuesForCallError({
        provider: this.provider,
        modelId: this.modelId,
        maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
        values
      });
    }
    const openaiOptions = (_a = await parseProviderOptions3({
      provider: "openai",
      providerOptions,
      schema: openaiEmbeddingModelOptions
    })) != null ? _a : {};
    const {
      responseHeaders,
      value: response,
      rawValue
    } = await postJsonToApi3({
      url: this.config.url({
        path: "/embeddings",
        modelId: this.modelId
      }),
      headers: combineHeaders3(this.config.headers(), headers),
      body: {
        model: this.modelId,
        input: values,
        encoding_format: "float",
        dimensions: openaiOptions.dimensions,
        user: openaiOptions.user
      },
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler3(
        openaiTextEmbeddingResponseSchema
      ),
      abortSignal,
      fetch: this.config.fetch
    });
    return {
      warnings: [],
      embeddings: response.data.map((item) => item.embedding),
      usage: response.usage ? { tokens: response.usage.prompt_tokens } : void 0,
      response: { headers: responseHeaders, body: rawValue }
    };
  }
};

// src/image/openai-image-model.ts
import {
  combineHeaders as combineHeaders4,
  convertBase64ToUint8Array,
  convertToFormData,
  createJsonResponseHandler as createJsonResponseHandler4,
  downloadBlob,
  postFormDataToApi,
  postJsonToApi as postJsonToApi4
} from "@ai-sdk/provider-utils";

// src/image/openai-image-api.ts
import { lazySchema as lazySchema7, zodSchema as zodSchema7 } from "@ai-sdk/provider-utils";
import { z as z8 } from "zod/v4";
var openaiImageResponseSchema = lazySchema7(
  () => zodSchema7(
    z8.object({
      created: z8.number().nullish(),
      data: z8.array(
        z8.object({
          b64_json: z8.string(),
          revised_prompt: z8.string().nullish()
        })
      ),
      background: z8.string().nullish(),
      output_format: z8.string().nullish(),
      size: z8.string().nullish(),
      quality: z8.string().nullish(),
      usage: z8.object({
        input_tokens: z8.number().nullish(),
        output_tokens: z8.number().nullish(),
        total_tokens: z8.number().nullish(),
        input_tokens_details: z8.object({
          image_tokens: z8.number().nullish(),
          text_tokens: z8.number().nullish()
        }).nullish()
      }).nullish()
    })
  )
);

// src/image/openai-image-options.ts
var modelMaxImagesPerCall = {
  "dall-e-3": 1,
  "dall-e-2": 10,
  "gpt-image-1": 10,
  "gpt-image-1-mini": 10,
  "gpt-image-1.5": 10,
  "chatgpt-image-latest": 10
};
var defaultResponseFormatPrefixes = [
  "chatgpt-image-",
  "gpt-image-1-mini",
  "gpt-image-1.5",
  "gpt-image-1"
];
function hasDefaultResponseFormat(modelId) {
  return defaultResponseFormatPrefixes.some(
    (prefix) => modelId.startsWith(prefix)
  );
}

// src/image/openai-image-model.ts
var OpenAIImageModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
  }
  get maxImagesPerCall() {
    var _a;
    return (_a = modelMaxImagesPerCall[this.modelId]) != null ? _a : 1;
  }
  get provider() {
    return this.config.provider;
  }
  async doGenerate({
    prompt,
    files,
    mask,
    n,
    size,
    aspectRatio,
    seed,
    providerOptions,
    headers,
    abortSignal
  }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
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
    if (files != null) {
      const { value: response2, responseHeaders: responseHeaders2 } = await postFormDataToApi({
        url: this.config.url({
          path: "/images/edits",
          modelId: this.modelId
        }),
        headers: combineHeaders4(this.config.headers(), headers),
        formData: convertToFormData({
          model: this.modelId,
          prompt,
          image: await Promise.all(
            files.map(
              (file) => file.type === "file" ? new Blob(
                [
                  file.data instanceof Uint8Array ? new Blob([file.data], {
                    type: file.mediaType
                  }) : new Blob([convertBase64ToUint8Array(file.data)], {
                    type: file.mediaType
                  })
                ],
                { type: file.mediaType }
              ) : downloadBlob(file.url)
            )
          ),
          mask: mask != null ? await fileToBlob(mask) : void 0,
          n,
          size,
          ...(_d = providerOptions.openai) != null ? _d : {}
        }),
        failedResponseHandler: openaiFailedResponseHandler,
        successfulResponseHandler: createJsonResponseHandler4(
          openaiImageResponseSchema
        ),
        abortSignal,
        fetch: this.config.fetch
      });
      return {
        images: response2.data.map((item) => item.b64_json),
        warnings,
        usage: response2.usage != null ? {
          inputTokens: (_e = response2.usage.input_tokens) != null ? _e : void 0,
          outputTokens: (_f = response2.usage.output_tokens) != null ? _f : void 0,
          totalTokens: (_g = response2.usage.total_tokens) != null ? _g : void 0
        } : void 0,
        response: {
          timestamp: currentDate,
          modelId: this.modelId,
          headers: responseHeaders2
        },
        providerMetadata: {
          openai: {
            images: response2.data.map((item, index) => {
              var _a2, _b2, _c2, _d2, _e2, _f2;
              return {
                ...item.revised_prompt ? { revisedPrompt: item.revised_prompt } : {},
                created: (_a2 = response2.created) != null ? _a2 : void 0,
                size: (_b2 = response2.size) != null ? _b2 : void 0,
                quality: (_c2 = response2.quality) != null ? _c2 : void 0,
                background: (_d2 = response2.background) != null ? _d2 : void 0,
                outputFormat: (_e2 = response2.output_format) != null ? _e2 : void 0,
                ...distributeTokenDetails(
                  (_f2 = response2.usage) == null ? void 0 : _f2.input_tokens_details,
                  index,
                  response2.data.length
                )
              };
            })
          }
        }
      };
    }
    const { value: response, responseHeaders } = await postJsonToApi4({
      url: this.config.url({
        path: "/images/generations",
        modelId: this.modelId
      }),
      headers: combineHeaders4(this.config.headers(), headers),
      body: {
        model: this.modelId,
        prompt,
        n,
        size,
        ...(_h = providerOptions.openai) != null ? _h : {},
        ...!hasDefaultResponseFormat(this.modelId) ? { response_format: "b64_json" } : {}
      },
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler4(
        openaiImageResponseSchema
      ),
      abortSignal,
      fetch: this.config.fetch
    });
    return {
      images: response.data.map((item) => item.b64_json),
      warnings,
      usage: response.usage != null ? {
        inputTokens: (_i = response.usage.input_tokens) != null ? _i : void 0,
        outputTokens: (_j = response.usage.output_tokens) != null ? _j : void 0,
        totalTokens: (_k = response.usage.total_tokens) != null ? _k : void 0
      } : void 0,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders
      },
      providerMetadata: {
        openai: {
          images: response.data.map((item, index) => {
            var _a2, _b2, _c2, _d2, _e2, _f2;
            return {
              ...item.revised_prompt ? { revisedPrompt: item.revised_prompt } : {},
              created: (_a2 = response.created) != null ? _a2 : void 0,
              size: (_b2 = response.size) != null ? _b2 : void 0,
              quality: (_c2 = response.quality) != null ? _c2 : void 0,
              background: (_d2 = response.background) != null ? _d2 : void 0,
              outputFormat: (_e2 = response.output_format) != null ? _e2 : void 0,
              ...distributeTokenDetails(
                (_f2 = response.usage) == null ? void 0 : _f2.input_tokens_details,
                index,
                response.data.length
              )
            };
          })
        }
      }
    };
  }
};
function distributeTokenDetails(details, index, total) {
  if (details == null) {
    return {};
  }
  const result = {};
  if (details.image_tokens != null) {
    const base = Math.floor(details.image_tokens / total);
    const remainder = details.image_tokens - base * (total - 1);
    result.imageTokens = index === total - 1 ? remainder : base;
  }
  if (details.text_tokens != null) {
    const base = Math.floor(details.text_tokens / total);
    const remainder = details.text_tokens - base * (total - 1);
    result.textTokens = index === total - 1 ? remainder : base;
  }
  return result;
}
async function fileToBlob(file) {
  if (!file) return void 0;
  if (file.type === "url") {
    return downloadBlob(file.url);
  }
  const data = file.data instanceof Uint8Array ? file.data : convertBase64ToUint8Array(file.data);
  return new Blob([data], { type: file.mediaType });
}

// src/tool/apply-patch.ts
import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema as lazySchema8,
  zodSchema as zodSchema8
} from "@ai-sdk/provider-utils";
import { z as z9 } from "zod/v4";
var applyPatchInputSchema = lazySchema8(
  () => zodSchema8(
    z9.object({
      callId: z9.string(),
      operation: z9.discriminatedUnion("type", [
        z9.object({
          type: z9.literal("create_file"),
          path: z9.string(),
          diff: z9.string()
        }),
        z9.object({
          type: z9.literal("delete_file"),
          path: z9.string()
        }),
        z9.object({
          type: z9.literal("update_file"),
          path: z9.string(),
          diff: z9.string()
        })
      ])
    })
  )
);
var applyPatchOutputSchema = lazySchema8(
  () => zodSchema8(
    z9.object({
      status: z9.enum(["completed", "failed"]),
      output: z9.string().optional()
    })
  )
);
var applyPatchArgsSchema = lazySchema8(() => zodSchema8(z9.object({})));
var applyPatchToolFactory = createProviderToolFactoryWithOutputSchema({
  id: "openai.apply_patch",
  inputSchema: applyPatchInputSchema,
  outputSchema: applyPatchOutputSchema
});
var applyPatch = applyPatchToolFactory;

// src/tool/code-interpreter.ts
import {
  createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema2,
  lazySchema as lazySchema9,
  zodSchema as zodSchema9
} from "@ai-sdk/provider-utils";
import { z as z10 } from "zod/v4";
var codeInterpreterInputSchema = lazySchema9(
  () => zodSchema9(
    z10.object({
      code: z10.string().nullish(),
      containerId: z10.string()
    })
  )
);
var codeInterpreterOutputSchema = lazySchema9(
  () => zodSchema9(
    z10.object({
      outputs: z10.array(
        z10.discriminatedUnion("type", [
          z10.object({ type: z10.literal("logs"), logs: z10.string() }),
          z10.object({ type: z10.literal("image"), url: z10.string() })
        ])
      ).nullish()
    })
  )
);
var codeInterpreterArgsSchema = lazySchema9(
  () => zodSchema9(
    z10.object({
      container: z10.union([
        z10.string(),
        z10.object({
          fileIds: z10.array(z10.string()).optional()
        })
      ]).optional()
    })
  )
);
var codeInterpreterToolFactory = createProviderToolFactoryWithOutputSchema2({
  id: "openai.code_interpreter",
  inputSchema: codeInterpreterInputSchema,
  outputSchema: codeInterpreterOutputSchema
});
var codeInterpreter = (args = {}) => {
  return codeInterpreterToolFactory(args);
};

// src/tool/custom.ts
import {
  createProviderToolFactory,
  lazySchema as lazySchema10,
  zodSchema as zodSchema10
} from "@ai-sdk/provider-utils";
import { z as z11 } from "zod/v4";
var customArgsSchema = lazySchema10(
  () => zodSchema10(
    z11.object({
      name: z11.string(),
      description: z11.string().optional(),
      format: z11.union([
        z11.object({
          type: z11.literal("grammar"),
          syntax: z11.enum(["regex", "lark"]),
          definition: z11.string()
        }),
        z11.object({
          type: z11.literal("text")
        })
      ]).optional()
    })
  )
);
var customInputSchema = lazySchema10(() => zodSchema10(z11.string()));
var customToolFactory = createProviderToolFactory({
  id: "openai.custom",
  inputSchema: customInputSchema
});
var customTool = (args) => customToolFactory(args);

// src/tool/file-search.ts
import {
  createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema3,
  lazySchema as lazySchema11,
  zodSchema as zodSchema11
} from "@ai-sdk/provider-utils";
import { z as z12 } from "zod/v4";
var comparisonFilterSchema = z12.object({
  key: z12.string(),
  type: z12.enum(["eq", "ne", "gt", "gte", "lt", "lte", "in", "nin"]),
  value: z12.union([z12.string(), z12.number(), z12.boolean(), z12.array(z12.string())])
});
var compoundFilterSchema = z12.object({
  type: z12.enum(["and", "or"]),
  filters: z12.array(
    z12.union([comparisonFilterSchema, z12.lazy(() => compoundFilterSchema)])
  )
});
var fileSearchArgsSchema = lazySchema11(
  () => zodSchema11(
    z12.object({
      vectorStoreIds: z12.array(z12.string()),
      maxNumResults: z12.number().optional(),
      ranking: z12.object({
        ranker: z12.string().optional(),
        scoreThreshold: z12.number().optional()
      }).optional(),
      filters: z12.union([comparisonFilterSchema, compoundFilterSchema]).optional()
    })
  )
);
var fileSearchOutputSchema = lazySchema11(
  () => zodSchema11(
    z12.object({
      queries: z12.array(z12.string()),
      results: z12.array(
        z12.object({
          attributes: z12.record(z12.string(), z12.unknown()),
          fileId: z12.string(),
          filename: z12.string(),
          score: z12.number(),
          text: z12.string()
        })
      ).nullable()
    })
  )
);
var fileSearch = createProviderToolFactoryWithOutputSchema3({
  id: "openai.file_search",
  inputSchema: z12.object({}),
  outputSchema: fileSearchOutputSchema
});

// src/tool/image-generation.ts
import {
  createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema4,
  lazySchema as lazySchema12,
  zodSchema as zodSchema12
} from "@ai-sdk/provider-utils";
import { z as z13 } from "zod/v4";
var imageGenerationArgsSchema = lazySchema12(
  () => zodSchema12(
    z13.object({
      background: z13.enum(["auto", "opaque", "transparent"]).optional(),
      inputFidelity: z13.enum(["low", "high"]).optional(),
      inputImageMask: z13.object({
        fileId: z13.string().optional(),
        imageUrl: z13.string().optional()
      }).optional(),
      model: z13.string().optional(),
      moderation: z13.enum(["auto"]).optional(),
      outputCompression: z13.number().int().min(0).max(100).optional(),
      outputFormat: z13.enum(["png", "jpeg", "webp"]).optional(),
      partialImages: z13.number().int().min(0).max(3).optional(),
      quality: z13.enum(["auto", "low", "medium", "high"]).optional(),
      size: z13.enum(["1024x1024", "1024x1536", "1536x1024", "auto"]).optional()
    }).strict()
  )
);
var imageGenerationInputSchema = lazySchema12(() => zodSchema12(z13.object({})));
var imageGenerationOutputSchema = lazySchema12(
  () => zodSchema12(z13.object({ result: z13.string() }))
);
var imageGenerationToolFactory = createProviderToolFactoryWithOutputSchema4({
  id: "openai.image_generation",
  inputSchema: imageGenerationInputSchema,
  outputSchema: imageGenerationOutputSchema
});
var imageGeneration = (args = {}) => {
  return imageGenerationToolFactory(args);
};

// src/tool/local-shell.ts
import {
  createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema5,
  lazySchema as lazySchema13,
  zodSchema as zodSchema13
} from "@ai-sdk/provider-utils";
import { z as z14 } from "zod/v4";
var localShellInputSchema = lazySchema13(
  () => zodSchema13(
    z14.object({
      action: z14.object({
        type: z14.literal("exec"),
        command: z14.array(z14.string()),
        timeoutMs: z14.number().optional(),
        user: z14.string().optional(),
        workingDirectory: z14.string().optional(),
        env: z14.record(z14.string(), z14.string()).optional()
      })
    })
  )
);
var localShellOutputSchema = lazySchema13(
  () => zodSchema13(z14.object({ output: z14.string() }))
);
var localShell = createProviderToolFactoryWithOutputSchema5({
  id: "openai.local_shell",
  inputSchema: localShellInputSchema,
  outputSchema: localShellOutputSchema
});

// src/tool/shell.ts
import {
  createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema6,
  lazySchema as lazySchema14,
  zodSchema as zodSchema14
} from "@ai-sdk/provider-utils";
import { z as z15 } from "zod/v4";
var shellInputSchema = lazySchema14(
  () => zodSchema14(
    z15.object({
      action: z15.object({
        commands: z15.array(z15.string()),
        timeoutMs: z15.number().optional(),
        maxOutputLength: z15.number().optional()
      })
    })
  )
);
var shellOutputSchema = lazySchema14(
  () => zodSchema14(
    z15.object({
      output: z15.array(
        z15.object({
          stdout: z15.string(),
          stderr: z15.string(),
          outcome: z15.discriminatedUnion("type", [
            z15.object({ type: z15.literal("timeout") }),
            z15.object({ type: z15.literal("exit"), exitCode: z15.number() })
          ])
        })
      )
    })
  )
);
var shellSkillsSchema = z15.array(
  z15.discriminatedUnion("type", [
    z15.object({
      type: z15.literal("skillReference"),
      skillId: z15.string(),
      version: z15.string().optional()
    }),
    z15.object({
      type: z15.literal("inline"),
      name: z15.string(),
      description: z15.string(),
      source: z15.object({
        type: z15.literal("base64"),
        mediaType: z15.literal("application/zip"),
        data: z15.string()
      })
    })
  ])
).optional();
var shellArgsSchema = lazySchema14(
  () => zodSchema14(
    z15.object({
      environment: z15.union([
        z15.object({
          type: z15.literal("containerAuto"),
          fileIds: z15.array(z15.string()).optional(),
          memoryLimit: z15.enum(["1g", "4g", "16g", "64g"]).optional(),
          networkPolicy: z15.discriminatedUnion("type", [
            z15.object({ type: z15.literal("disabled") }),
            z15.object({
              type: z15.literal("allowlist"),
              allowedDomains: z15.array(z15.string()),
              domainSecrets: z15.array(
                z15.object({
                  domain: z15.string(),
                  name: z15.string(),
                  value: z15.string()
                })
              ).optional()
            })
          ]).optional(),
          skills: shellSkillsSchema
        }),
        z15.object({
          type: z15.literal("containerReference"),
          containerId: z15.string()
        }),
        z15.object({
          type: z15.literal("local").optional(),
          skills: z15.array(
            z15.object({
              name: z15.string(),
              description: z15.string(),
              path: z15.string()
            })
          ).optional()
        })
      ]).optional()
    })
  )
);
var shell = createProviderToolFactoryWithOutputSchema6({
  id: "openai.shell",
  inputSchema: shellInputSchema,
  outputSchema: shellOutputSchema
});

// src/tool/tool-search.ts
import {
  createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema7,
  lazySchema as lazySchema15,
  zodSchema as zodSchema15
} from "@ai-sdk/provider-utils";
import { z as z16 } from "zod/v4";
var toolSearchArgsSchema = lazySchema15(
  () => zodSchema15(
    z16.object({
      execution: z16.enum(["server", "client"]).optional(),
      description: z16.string().optional(),
      parameters: z16.record(z16.string(), z16.unknown()).optional()
    })
  )
);
var toolSearchInputSchema = lazySchema15(
  () => zodSchema15(
    z16.object({
      arguments: z16.unknown().optional(),
      call_id: z16.string().nullish()
    })
  )
);
var toolSearchOutputSchema = lazySchema15(
  () => zodSchema15(
    z16.object({
      tools: z16.array(z16.record(z16.string(), z16.unknown()))
    })
  )
);
var toolSearchToolFactory = createProviderToolFactoryWithOutputSchema7({
  id: "openai.tool_search",
  inputSchema: toolSearchInputSchema,
  outputSchema: toolSearchOutputSchema
});
var toolSearch = (args = {}) => toolSearchToolFactory(args);

// src/tool/web-search.ts
import {
  createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema8,
  lazySchema as lazySchema16,
  zodSchema as zodSchema16
} from "@ai-sdk/provider-utils";
import { z as z17 } from "zod/v4";
var webSearchArgsSchema = lazySchema16(
  () => zodSchema16(
    z17.object({
      externalWebAccess: z17.boolean().optional(),
      filters: z17.object({ allowedDomains: z17.array(z17.string()).optional() }).optional(),
      searchContextSize: z17.enum(["low", "medium", "high"]).optional(),
      userLocation: z17.object({
        type: z17.literal("approximate"),
        country: z17.string().optional(),
        city: z17.string().optional(),
        region: z17.string().optional(),
        timezone: z17.string().optional()
      }).optional()
    })
  )
);
var webSearchInputSchema = lazySchema16(() => zodSchema16(z17.object({})));
var webSearchOutputSchema = lazySchema16(
  () => zodSchema16(
    z17.object({
      action: z17.discriminatedUnion("type", [
        z17.object({
          type: z17.literal("search"),
          query: z17.string().optional()
        }),
        z17.object({
          type: z17.literal("openPage"),
          url: z17.string().nullish()
        }),
        z17.object({
          type: z17.literal("findInPage"),
          url: z17.string().nullish(),
          pattern: z17.string().nullish()
        })
      ]).optional(),
      sources: z17.array(
        z17.discriminatedUnion("type", [
          z17.object({ type: z17.literal("url"), url: z17.string() }),
          z17.object({ type: z17.literal("api"), name: z17.string() })
        ])
      ).optional()
    })
  )
);
var webSearchToolFactory = createProviderToolFactoryWithOutputSchema8({
  id: "openai.web_search",
  inputSchema: webSearchInputSchema,
  outputSchema: webSearchOutputSchema
});
var webSearch = (args = {}) => webSearchToolFactory(args);

// src/tool/web-search-preview.ts
import {
  createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema9,
  lazySchema as lazySchema17,
  zodSchema as zodSchema17
} from "@ai-sdk/provider-utils";
import { z as z18 } from "zod/v4";
var webSearchPreviewArgsSchema = lazySchema17(
  () => zodSchema17(
    z18.object({
      searchContextSize: z18.enum(["low", "medium", "high"]).optional(),
      userLocation: z18.object({
        type: z18.literal("approximate"),
        country: z18.string().optional(),
        city: z18.string().optional(),
        region: z18.string().optional(),
        timezone: z18.string().optional()
      }).optional()
    })
  )
);
var webSearchPreviewInputSchema = lazySchema17(
  () => zodSchema17(z18.object({}))
);
var webSearchPreviewOutputSchema = lazySchema17(
  () => zodSchema17(
    z18.object({
      action: z18.discriminatedUnion("type", [
        z18.object({
          type: z18.literal("search"),
          query: z18.string().optional()
        }),
        z18.object({
          type: z18.literal("openPage"),
          url: z18.string().nullish()
        }),
        z18.object({
          type: z18.literal("findInPage"),
          url: z18.string().nullish(),
          pattern: z18.string().nullish()
        })
      ]).optional()
    })
  )
);
var webSearchPreview = createProviderToolFactoryWithOutputSchema9({
  id: "openai.web_search_preview",
  inputSchema: webSearchPreviewInputSchema,
  outputSchema: webSearchPreviewOutputSchema
});

// src/tool/mcp.ts
import {
  createProviderToolFactoryWithOutputSchema as createProviderToolFactoryWithOutputSchema10,
  lazySchema as lazySchema18,
  zodSchema as zodSchema18
} from "@ai-sdk/provider-utils";
import { z as z19 } from "zod/v4";
var jsonValueSchema = z19.lazy(
  () => z19.union([
    z19.string(),
    z19.number(),
    z19.boolean(),
    z19.null(),
    z19.array(jsonValueSchema),
    z19.record(z19.string(), jsonValueSchema)
  ])
);
var mcpArgsSchema = lazySchema18(
  () => zodSchema18(
    z19.object({
      serverLabel: z19.string(),
      allowedTools: z19.union([
        z19.array(z19.string()),
        z19.object({
          readOnly: z19.boolean().optional(),
          toolNames: z19.array(z19.string()).optional()
        })
      ]).optional(),
      authorization: z19.string().optional(),
      connectorId: z19.string().optional(),
      headers: z19.record(z19.string(), z19.string()).optional(),
      requireApproval: z19.union([
        z19.enum(["always", "never"]),
        z19.object({
          never: z19.object({
            toolNames: z19.array(z19.string()).optional()
          }).optional()
        })
      ]).optional(),
      serverDescription: z19.string().optional(),
      serverUrl: z19.string().optional()
    }).refine(
      (v) => v.serverUrl != null || v.connectorId != null,
      "One of serverUrl or connectorId must be provided."
    )
  )
);
var mcpInputSchema = lazySchema18(() => zodSchema18(z19.object({})));
var mcpOutputSchema = lazySchema18(
  () => zodSchema18(
    z19.object({
      type: z19.literal("call"),
      serverLabel: z19.string(),
      name: z19.string(),
      arguments: z19.string(),
      output: z19.string().nullish(),
      error: z19.union([z19.string(), jsonValueSchema]).optional()
    })
  )
);
var mcpToolFactory = createProviderToolFactoryWithOutputSchema10({
  id: "openai.mcp",
  inputSchema: mcpInputSchema,
  outputSchema: mcpOutputSchema
});
var mcp = (args) => mcpToolFactory(args);

// src/openai-tools.ts
var openaiTools = {
  /**
   * The apply_patch tool lets GPT-5.1 create, update, and delete files in your
   * codebase using structured diffs. Instead of just suggesting edits, the model
   * emits patch operations that your application applies and then reports back on,
   * enabling iterative, multi-step code editing workflows.
   *
   */
  applyPatch,
  /**
   * Custom tools let callers constrain model output to a grammar (regex or
   * Lark syntax). The model returns a `custom_tool_call` output item whose
   * `input` field is a string matching the specified grammar.
   *
   * @param name - The name of the custom tool.
   * @param description - An optional description of the tool.
   * @param format - The output format constraint (grammar type, syntax, and definition).
   */
  customTool,
  /**
   * The Code Interpreter tool allows models to write and run Python code in a
   * sandboxed environment to solve complex problems in domains like data analysis,
   * coding, and math.
   *
   * @param container - The container to use for the code interpreter.
   */
  codeInterpreter,
  /**
   * File search is a tool available in the Responses API. It enables models to
   * retrieve information in a knowledge base of previously uploaded files through
   * semantic and keyword search.
   *
   * @param vectorStoreIds - The vector store IDs to use for the file search.
   * @param maxNumResults - The maximum number of results to return.
   * @param ranking - The ranking options to use for the file search.
   * @param filters - The filters to use for the file search.
   */
  fileSearch,
  /**
   * The image generation tool allows you to generate images using a text prompt,
   * and optionally image inputs. It leverages the GPT Image model,
   * and automatically optimizes text inputs for improved performance.
   *
   * @param background - Background type for the generated image. One of 'auto', 'opaque', or 'transparent'.
   * @param inputFidelity - Input fidelity for the generated image. One of 'low' or 'high'.
   * @param inputImageMask - Optional mask for inpainting. Contains fileId and/or imageUrl.
   * @param model - The image generation model to use. Default: gpt-image-1.
   * @param moderation - Moderation level for the generated image. Default: 'auto'.
   * @param outputCompression - Compression level for the output image (0-100).
   * @param outputFormat - The output format of the generated image. One of 'png', 'jpeg', or 'webp'.
   * @param partialImages - Number of partial images to generate in streaming mode (0-3).
   * @param quality - The quality of the generated image. One of 'auto', 'low', 'medium', or 'high'.
   * @param size - The size of the generated image. One of 'auto', '1024x1024', '1024x1536', or '1536x1024'.
   */
  imageGeneration,
  /**
   * Local shell is a tool that allows agents to run shell commands locally
   * on a machine you or the user provides.
   *
   * Supported models: `gpt-5-codex`
   */
  localShell,
  /**
   * The shell tool allows the model to interact with your local computer through
   * a controlled command-line interface. The model proposes shell commands; your
   * integration executes them and returns the outputs.
   *
   * Available through the Responses API for use with GPT-5.1.
   *
   * WARNING: Running arbitrary shell commands can be dangerous. Always sandbox
   * execution or add strict allow-/deny-lists before forwarding a command to
   * the system shell.
   */
  shell,
  /**
   * Web search allows models to access up-to-date information from the internet
   * and provide answers with sourced citations.
   *
   * @param searchContextSize - The search context size to use for the web search.
   * @param userLocation - The user location to use for the web search.
   */
  webSearchPreview,
  /**
   * Web search allows models to access up-to-date information from the internet
   * and provide answers with sourced citations.
   *
   * @param filters - The filters to use for the web search.
   * @param searchContextSize - The search context size to use for the web search.
   * @param userLocation - The user location to use for the web search.
   */
  webSearch,
  /**
   * MCP (Model Context Protocol) allows models to call tools exposed by
   * remote MCP servers or service connectors.
   *
   * @param serverLabel - Label to identify the MCP server.
   * @param allowedTools - Allowed tool names or filter object.
   * @param authorization - OAuth access token for the MCP server/connector.
   * @param connectorId - Identifier for a service connector.
   * @param headers - Optional headers to include in MCP requests.
   * // param requireApproval - Approval policy ('always'|'never'|filter object). (Removed - always 'never')
   * @param serverDescription - Optional description of the server.
   * @param serverUrl - URL for the MCP server.
   */
  mcp,
  /**
   * Tool search allows the model to dynamically search for and load deferred
   * tools into the model's context as needed. This helps reduce overall token
   * usage, cost, and latency by only loading tools when the model needs them.
   *
   * To use tool search, mark functions or namespaces with `defer_loading: true`
   * in the tools array. The model will use tool search to load these tools
   * when it determines they are needed.
   */
  toolSearch
};

// src/responses/openai-responses-language-model.ts
import {
  APICallError
} from "@ai-sdk/provider";
import {
  combineHeaders as combineHeaders5,
  createEventSourceResponseHandler as createEventSourceResponseHandler3,
  createJsonResponseHandler as createJsonResponseHandler5,
  createToolNameMapping,
  generateId as generateId2,
  parseProviderOptions as parseProviderOptions5,
  postJsonToApi as postJsonToApi5
} from "@ai-sdk/provider-utils";

// src/responses/convert-openai-responses-usage.ts
function convertOpenAIResponsesUsage(usage) {
  var _a, _b, _c, _d;
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
  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const cachedTokens = (_b = (_a = usage.input_tokens_details) == null ? void 0 : _a.cached_tokens) != null ? _b : 0;
  const reasoningTokens = (_d = (_c = usage.output_tokens_details) == null ? void 0 : _c.reasoning_tokens) != null ? _d : 0;
  return {
    inputTokens: {
      total: inputTokens,
      noCache: inputTokens - cachedTokens,
      cacheRead: cachedTokens,
      cacheWrite: void 0
    },
    outputTokens: {
      total: outputTokens,
      text: outputTokens - reasoningTokens,
      reasoning: reasoningTokens
    },
    raw: usage
  };
}

// src/responses/convert-to-openai-responses-input.ts
import {
  UnsupportedFunctionalityError as UnsupportedFunctionalityError4
} from "@ai-sdk/provider";
import {
  convertToBase64 as convertToBase642,
  isNonNullable,
  parseJSON,
  parseProviderOptions as parseProviderOptions4,
  validateTypes
} from "@ai-sdk/provider-utils";
import { z as z20 } from "zod/v4";
function isFileId(data, prefixes) {
  if (!prefixes) return false;
  return prefixes.some((prefix) => data.startsWith(prefix));
}
async function convertToOpenAIResponsesInput({
  prompt,
  toolNameMapping,
  systemMessageMode,
  providerOptionsName,
  fileIdPrefixes,
  store,
  hasConversation = false,
  hasLocalShellTool = false,
  hasShellTool = false,
  hasApplyPatchTool = false,
  customProviderToolNames
}) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q;
  let input = [];
  const warnings = [];
  const processedApprovalIds = /* @__PURE__ */ new Set();
  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        switch (systemMessageMode) {
          case "system": {
            input.push({ role: "system", content });
            break;
          }
          case "developer": {
            input.push({ role: "developer", content });
            break;
          }
          case "remove": {
            warnings.push({
              type: "other",
              message: "system messages are removed for this model"
            });
            break;
          }
          default: {
            const _exhaustiveCheck = systemMessageMode;
            throw new Error(
              `Unsupported system message mode: ${_exhaustiveCheck}`
            );
          }
        }
        break;
      }
      case "user": {
        input.push({
          role: "user",
          content: content.map((part, index) => {
            var _a2, _b2, _c2;
            switch (part.type) {
              case "text": {
                return { type: "input_text", text: part.text };
              }
              case "file": {
                if (part.mediaType.startsWith("image/")) {
                  const mediaType = part.mediaType === "image/*" ? "image/jpeg" : part.mediaType;
                  return {
                    type: "input_image",
                    ...part.data instanceof URL ? { image_url: part.data.toString() } : typeof part.data === "string" && isFileId(part.data, fileIdPrefixes) ? { file_id: part.data } : {
                      image_url: `data:${mediaType};base64,${convertToBase642(part.data)}`
                    },
                    detail: (_b2 = (_a2 = part.providerOptions) == null ? void 0 : _a2[providerOptionsName]) == null ? void 0 : _b2.imageDetail
                  };
                } else if (part.mediaType === "application/pdf") {
                  if (part.data instanceof URL) {
                    return {
                      type: "input_file",
                      file_url: part.data.toString()
                    };
                  }
                  return {
                    type: "input_file",
                    ...typeof part.data === "string" && isFileId(part.data, fileIdPrefixes) ? { file_id: part.data } : {
                      filename: (_c2 = part.filename) != null ? _c2 : `part-${index}.pdf`,
                      file_data: `data:application/pdf;base64,${convertToBase642(part.data)}`
                    }
                  };
                } else {
                  throw new UnsupportedFunctionalityError4({
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
        const reasoningMessages = {};
        for (const part of content) {
          switch (part.type) {
            case "text": {
              const providerOpts = (_a = part.providerOptions) == null ? void 0 : _a[providerOptionsName];
              const id = providerOpts == null ? void 0 : providerOpts.itemId;
              const phase = providerOpts == null ? void 0 : providerOpts.phase;
              if (hasConversation && id != null) {
                break;
              }
              if (store && id != null) {
                input.push({ type: "item_reference", id });
                break;
              }
              input.push({
                role: "assistant",
                content: [{ type: "output_text", text: part.text }],
                id,
                ...phase != null && { phase }
              });
              break;
            }
            case "tool-call": {
              const id = (_f = (_c = (_b = part.providerOptions) == null ? void 0 : _b[providerOptionsName]) == null ? void 0 : _c.itemId) != null ? _f : (_e = (_d = part.providerMetadata) == null ? void 0 : _d[providerOptionsName]) == null ? void 0 : _e.itemId;
              if (hasConversation && id != null) {
                break;
              }
              const resolvedToolName = toolNameMapping.toProviderToolName(
                part.toolName
              );
              if (resolvedToolName === "tool_search") {
                if (store && id != null) {
                  input.push({ type: "item_reference", id });
                  break;
                }
                const parsedInput = typeof part.input === "string" ? await parseJSON({
                  text: part.input,
                  schema: toolSearchInputSchema
                }) : await validateTypes({
                  value: part.input,
                  schema: toolSearchInputSchema
                });
                const execution = parsedInput.call_id != null ? "client" : "server";
                input.push({
                  type: "tool_search_call",
                  id: id != null ? id : part.toolCallId,
                  execution,
                  call_id: (_g = parsedInput.call_id) != null ? _g : null,
                  status: "completed",
                  arguments: parsedInput.arguments
                });
                break;
              }
              if (part.providerExecuted) {
                if (store && id != null) {
                  input.push({ type: "item_reference", id });
                }
                break;
              }
              if (store && id != null) {
                input.push({ type: "item_reference", id });
                break;
              }
              if (hasLocalShellTool && resolvedToolName === "local_shell") {
                const parsedInput = await validateTypes({
                  value: part.input,
                  schema: localShellInputSchema
                });
                input.push({
                  type: "local_shell_call",
                  call_id: part.toolCallId,
                  id,
                  action: {
                    type: "exec",
                    command: parsedInput.action.command,
                    timeout_ms: parsedInput.action.timeoutMs,
                    user: parsedInput.action.user,
                    working_directory: parsedInput.action.workingDirectory,
                    env: parsedInput.action.env
                  }
                });
                break;
              }
              if (hasShellTool && resolvedToolName === "shell") {
                const parsedInput = await validateTypes({
                  value: part.input,
                  schema: shellInputSchema
                });
                input.push({
                  type: "shell_call",
                  call_id: part.toolCallId,
                  id,
                  status: "completed",
                  action: {
                    commands: parsedInput.action.commands,
                    timeout_ms: parsedInput.action.timeoutMs,
                    max_output_length: parsedInput.action.maxOutputLength
                  }
                });
                break;
              }
              if (hasApplyPatchTool && resolvedToolName === "apply_patch") {
                const parsedInput = await validateTypes({
                  value: part.input,
                  schema: applyPatchInputSchema
                });
                input.push({
                  type: "apply_patch_call",
                  call_id: parsedInput.callId,
                  id,
                  status: "completed",
                  operation: parsedInput.operation
                });
                break;
              }
              if (customProviderToolNames == null ? void 0 : customProviderToolNames.has(resolvedToolName)) {
                input.push({
                  type: "custom_tool_call",
                  call_id: part.toolCallId,
                  name: resolvedToolName,
                  input: typeof part.input === "string" ? part.input : JSON.stringify(part.input),
                  id
                });
                break;
              }
              input.push({
                type: "function_call",
                call_id: part.toolCallId,
                name: resolvedToolName,
                arguments: JSON.stringify(part.input),
                id
              });
              break;
            }
            // assistant tool result parts are from provider-executed tools:
            case "tool-result": {
              if (part.output.type === "execution-denied" || part.output.type === "json" && typeof part.output.value === "object" && part.output.value != null && "type" in part.output.value && part.output.value.type === "execution-denied") {
                break;
              }
              if (hasConversation) {
                break;
              }
              const resolvedResultToolName = toolNameMapping.toProviderToolName(
                part.toolName
              );
              if (resolvedResultToolName === "tool_search") {
                const itemId = (_j = (_i = (_h = part.providerOptions) == null ? void 0 : _h[providerOptionsName]) == null ? void 0 : _i.itemId) != null ? _j : part.toolCallId;
                if (store) {
                  input.push({ type: "item_reference", id: itemId });
                } else if (part.output.type === "json") {
                  const parsedOutput = await validateTypes({
                    value: part.output.value,
                    schema: toolSearchOutputSchema
                  });
                  input.push({
                    type: "tool_search_output",
                    id: itemId,
                    execution: "server",
                    call_id: null,
                    status: "completed",
                    tools: parsedOutput.tools
                  });
                }
                break;
              }
              if (hasShellTool && resolvedResultToolName === "shell") {
                if (part.output.type === "json") {
                  const parsedOutput = await validateTypes({
                    value: part.output.value,
                    schema: shellOutputSchema
                  });
                  input.push({
                    type: "shell_call_output",
                    call_id: part.toolCallId,
                    output: parsedOutput.output.map((item) => ({
                      stdout: item.stdout,
                      stderr: item.stderr,
                      outcome: item.outcome.type === "timeout" ? { type: "timeout" } : {
                        type: "exit",
                        exit_code: item.outcome.exitCode
                      }
                    }))
                  });
                }
                break;
              }
              if (store) {
                const itemId = (_m = (_l = (_k = part.providerOptions) == null ? void 0 : _k[providerOptionsName]) == null ? void 0 : _l.itemId) != null ? _m : part.toolCallId;
                input.push({ type: "item_reference", id: itemId });
              } else {
                warnings.push({
                  type: "other",
                  message: `Results for OpenAI tool ${part.toolName} are not sent to the API when store is false`
                });
              }
              break;
            }
            case "reasoning": {
              const providerOptions = await parseProviderOptions4({
                provider: providerOptionsName,
                providerOptions: part.providerOptions,
                schema: openaiResponsesReasoningProviderOptionsSchema
              });
              const reasoningId = providerOptions == null ? void 0 : providerOptions.itemId;
              if (hasConversation && reasoningId != null) {
                break;
              }
              if (reasoningId != null) {
                const reasoningMessage = reasoningMessages[reasoningId];
                if (store) {
                  if (reasoningMessage === void 0) {
                    input.push({ type: "item_reference", id: reasoningId });
                    reasoningMessages[reasoningId] = {
                      type: "reasoning",
                      id: reasoningId,
                      summary: []
                    };
                  }
                } else {
                  const summaryParts = [];
                  if (part.text.length > 0) {
                    summaryParts.push({
                      type: "summary_text",
                      text: part.text
                    });
                  } else if (reasoningMessage !== void 0) {
                    warnings.push({
                      type: "other",
                      message: `Cannot append empty reasoning part to existing reasoning sequence. Skipping reasoning part: ${JSON.stringify(part)}.`
                    });
                  }
                  if (reasoningMessage === void 0) {
                    reasoningMessages[reasoningId] = {
                      type: "reasoning",
                      id: reasoningId,
                      encrypted_content: providerOptions == null ? void 0 : providerOptions.reasoningEncryptedContent,
                      summary: summaryParts
                    };
                    input.push(reasoningMessages[reasoningId]);
                  } else {
                    reasoningMessage.summary.push(...summaryParts);
                    if ((providerOptions == null ? void 0 : providerOptions.reasoningEncryptedContent) != null) {
                      reasoningMessage.encrypted_content = providerOptions.reasoningEncryptedContent;
                    }
                  }
                }
              } else {
                const encryptedContent = providerOptions == null ? void 0 : providerOptions.reasoningEncryptedContent;
                if (encryptedContent != null) {
                  const summaryParts = [];
                  if (part.text.length > 0) {
                    summaryParts.push({
                      type: "summary_text",
                      text: part.text
                    });
                  }
                  input.push({
                    type: "reasoning",
                    encrypted_content: encryptedContent,
                    summary: summaryParts
                  });
                } else {
                  warnings.push({
                    type: "other",
                    message: `Non-OpenAI reasoning parts are not supported. Skipping reasoning part: ${JSON.stringify(part)}.`
                  });
                }
              }
              break;
            }
          }
        }
        break;
      }
      case "tool": {
        for (const part of content) {
          if (part.type === "tool-approval-response") {
            const approvalResponse = part;
            if (processedApprovalIds.has(approvalResponse.approvalId)) {
              continue;
            }
            processedApprovalIds.add(approvalResponse.approvalId);
            if (store) {
              input.push({
                type: "item_reference",
                id: approvalResponse.approvalId
              });
            }
            input.push({
              type: "mcp_approval_response",
              approval_request_id: approvalResponse.approvalId,
              approve: approvalResponse.approved
            });
            continue;
          }
          const output = part.output;
          if (output.type === "execution-denied") {
            const approvalId = (_o = (_n = output.providerOptions) == null ? void 0 : _n.openai) == null ? void 0 : _o.approvalId;
            if (approvalId) {
              continue;
            }
          }
          const resolvedToolName = toolNameMapping.toProviderToolName(
            part.toolName
          );
          if (resolvedToolName === "tool_search" && output.type === "json") {
            const parsedOutput = await validateTypes({
              value: output.value,
              schema: toolSearchOutputSchema
            });
            input.push({
              type: "tool_search_output",
              execution: "client",
              call_id: part.toolCallId,
              status: "completed",
              tools: parsedOutput.tools
            });
            continue;
          }
          if (hasLocalShellTool && resolvedToolName === "local_shell" && output.type === "json") {
            const parsedOutput = await validateTypes({
              value: output.value,
              schema: localShellOutputSchema
            });
            input.push({
              type: "local_shell_call_output",
              call_id: part.toolCallId,
              output: parsedOutput.output
            });
            continue;
          }
          if (hasShellTool && resolvedToolName === "shell" && output.type === "json") {
            const parsedOutput = await validateTypes({
              value: output.value,
              schema: shellOutputSchema
            });
            input.push({
              type: "shell_call_output",
              call_id: part.toolCallId,
              output: parsedOutput.output.map((item) => ({
                stdout: item.stdout,
                stderr: item.stderr,
                outcome: item.outcome.type === "timeout" ? { type: "timeout" } : {
                  type: "exit",
                  exit_code: item.outcome.exitCode
                }
              }))
            });
            continue;
          }
          if (hasApplyPatchTool && part.toolName === "apply_patch" && output.type === "json") {
            const parsedOutput = await validateTypes({
              value: output.value,
              schema: applyPatchOutputSchema
            });
            input.push({
              type: "apply_patch_call_output",
              call_id: part.toolCallId,
              status: parsedOutput.status,
              output: parsedOutput.output
            });
            continue;
          }
          if (customProviderToolNames == null ? void 0 : customProviderToolNames.has(resolvedToolName)) {
            let outputValue;
            switch (output.type) {
              case "text":
              case "error-text":
                outputValue = output.value;
                break;
              case "execution-denied":
                outputValue = (_p = output.reason) != null ? _p : "Tool execution denied.";
                break;
              case "json":
              case "error-json":
                outputValue = JSON.stringify(output.value);
                break;
              case "content":
                outputValue = output.value.map((item) => {
                  var _a2;
                  switch (item.type) {
                    case "text":
                      return { type: "input_text", text: item.text };
                    case "image-data":
                      return {
                        type: "input_image",
                        image_url: `data:${item.mediaType};base64,${item.data}`
                      };
                    case "image-url":
                      return {
                        type: "input_image",
                        image_url: item.url
                      };
                    case "file-data":
                      return {
                        type: "input_file",
                        filename: (_a2 = item.filename) != null ? _a2 : "data",
                        file_data: `data:${item.mediaType};base64,${item.data}`
                      };
                    default:
                      warnings.push({
                        type: "other",
                        message: `unsupported custom tool content part type: ${item.type}`
                      });
                      return void 0;
                  }
                }).filter(isNonNullable);
                break;
              default:
                outputValue = "";
            }
            input.push({
              type: "custom_tool_call_output",
              call_id: part.toolCallId,
              output: outputValue
            });
            continue;
          }
          let contentValue;
          switch (output.type) {
            case "text":
            case "error-text":
              contentValue = output.value;
              break;
            case "execution-denied":
              contentValue = (_q = output.reason) != null ? _q : "Tool execution denied.";
              break;
            case "json":
            case "error-json":
              contentValue = JSON.stringify(output.value);
              break;
            case "content":
              contentValue = output.value.map((item) => {
                var _a2;
                switch (item.type) {
                  case "text": {
                    return { type: "input_text", text: item.text };
                  }
                  case "image-data": {
                    return {
                      type: "input_image",
                      image_url: `data:${item.mediaType};base64,${item.data}`
                    };
                  }
                  case "image-url": {
                    return {
                      type: "input_image",
                      image_url: item.url
                    };
                  }
                  case "file-data": {
                    return {
                      type: "input_file",
                      filename: (_a2 = item.filename) != null ? _a2 : "data",
                      file_data: `data:${item.mediaType};base64,${item.data}`
                    };
                  }
                  default: {
                    warnings.push({
                      type: "other",
                      message: `unsupported tool content part type: ${item.type}`
                    });
                    return void 0;
                  }
                }
              }).filter(isNonNullable);
              break;
          }
          input.push({
            type: "function_call_output",
            call_id: part.toolCallId,
            output: contentValue
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
  if (!store && input.some(
    (item) => "type" in item && item.type === "reasoning" && item.encrypted_content == null
  )) {
    warnings.push({
      type: "other",
      message: "Reasoning parts without encrypted content are not supported when store is false. Skipping reasoning parts."
    });
    input = input.filter(
      (item) => !("type" in item) || item.type !== "reasoning" || item.encrypted_content != null
    );
  }
  return { input, warnings };
}
var openaiResponsesReasoningProviderOptionsSchema = z20.object({
  itemId: z20.string().nullish(),
  reasoningEncryptedContent: z20.string().nullish()
});

// src/responses/map-openai-responses-finish-reason.ts
function mapOpenAIResponseFinishReason({
  finishReason,
  hasFunctionCall
}) {
  switch (finishReason) {
    case void 0:
    case null:
      return hasFunctionCall ? "tool-calls" : "stop";
    case "max_output_tokens":
      return "length";
    case "content_filter":
      return "content-filter";
    default:
      return hasFunctionCall ? "tool-calls" : "other";
  }
}

// src/responses/openai-responses-api.ts
import { lazySchema as lazySchema19, zodSchema as zodSchema19 } from "@ai-sdk/provider-utils";
import { z as z21 } from "zod/v4";
var jsonValueSchema2 = z21.lazy(
  () => z21.union([
    z21.string(),
    z21.number(),
    z21.boolean(),
    z21.null(),
    z21.array(jsonValueSchema2),
    z21.record(z21.string(), jsonValueSchema2.optional())
  ])
);
var openaiResponsesChunkSchema = lazySchema19(
  () => zodSchema19(
    z21.union([
      z21.object({
        type: z21.literal("response.output_text.delta"),
        item_id: z21.string(),
        delta: z21.string(),
        logprobs: z21.array(
          z21.object({
            token: z21.string(),
            logprob: z21.number(),
            top_logprobs: z21.array(
              z21.object({
                token: z21.string(),
                logprob: z21.number()
              })
            )
          })
        ).nullish()
      }),
      z21.object({
        type: z21.enum(["response.completed", "response.incomplete"]),
        response: z21.object({
          incomplete_details: z21.object({ reason: z21.string() }).nullish(),
          usage: z21.object({
            input_tokens: z21.number(),
            input_tokens_details: z21.object({ cached_tokens: z21.number().nullish() }).nullish(),
            output_tokens: z21.number(),
            output_tokens_details: z21.object({ reasoning_tokens: z21.number().nullish() }).nullish()
          }),
          service_tier: z21.string().nullish()
        })
      }),
      z21.object({
        type: z21.literal("response.failed"),
        response: z21.object({
          error: z21.object({
            code: z21.string().nullish(),
            message: z21.string()
          }).nullish(),
          incomplete_details: z21.object({ reason: z21.string() }).nullish(),
          usage: z21.object({
            input_tokens: z21.number(),
            input_tokens_details: z21.object({ cached_tokens: z21.number().nullish() }).nullish(),
            output_tokens: z21.number(),
            output_tokens_details: z21.object({ reasoning_tokens: z21.number().nullish() }).nullish()
          }).nullish(),
          service_tier: z21.string().nullish()
        })
      }),
      z21.object({
        type: z21.literal("response.created"),
        response: z21.object({
          id: z21.string(),
          created_at: z21.number(),
          model: z21.string(),
          service_tier: z21.string().nullish()
        })
      }),
      z21.object({
        type: z21.literal("response.output_item.added"),
        output_index: z21.number(),
        item: z21.discriminatedUnion("type", [
          z21.object({
            type: z21.literal("message"),
            id: z21.string(),
            phase: z21.enum(["commentary", "final_answer"]).nullish()
          }),
          z21.object({
            type: z21.literal("reasoning"),
            id: z21.string(),
            encrypted_content: z21.string().nullish()
          }),
          z21.object({
            type: z21.literal("function_call"),
            id: z21.string(),
            call_id: z21.string(),
            name: z21.string(),
            arguments: z21.string()
          }),
          z21.object({
            type: z21.literal("web_search_call"),
            id: z21.string(),
            status: z21.string()
          }),
          z21.object({
            type: z21.literal("computer_call"),
            id: z21.string(),
            status: z21.string()
          }),
          z21.object({
            type: z21.literal("file_search_call"),
            id: z21.string()
          }),
          z21.object({
            type: z21.literal("image_generation_call"),
            id: z21.string()
          }),
          z21.object({
            type: z21.literal("code_interpreter_call"),
            id: z21.string(),
            container_id: z21.string(),
            code: z21.string().nullable(),
            outputs: z21.array(
              z21.discriminatedUnion("type", [
                z21.object({ type: z21.literal("logs"), logs: z21.string() }),
                z21.object({ type: z21.literal("image"), url: z21.string() })
              ])
            ).nullable(),
            status: z21.string()
          }),
          z21.object({
            type: z21.literal("mcp_call"),
            id: z21.string(),
            status: z21.string(),
            approval_request_id: z21.string().nullish()
          }),
          z21.object({
            type: z21.literal("mcp_list_tools"),
            id: z21.string()
          }),
          z21.object({
            type: z21.literal("mcp_approval_request"),
            id: z21.string()
          }),
          z21.object({
            type: z21.literal("apply_patch_call"),
            id: z21.string(),
            call_id: z21.string(),
            status: z21.enum(["in_progress", "completed"]),
            operation: z21.discriminatedUnion("type", [
              z21.object({
                type: z21.literal("create_file"),
                path: z21.string(),
                diff: z21.string()
              }),
              z21.object({
                type: z21.literal("delete_file"),
                path: z21.string()
              }),
              z21.object({
                type: z21.literal("update_file"),
                path: z21.string(),
                diff: z21.string()
              })
            ])
          }),
          z21.object({
            type: z21.literal("custom_tool_call"),
            id: z21.string(),
            call_id: z21.string(),
            name: z21.string(),
            input: z21.string()
          }),
          z21.object({
            type: z21.literal("shell_call"),
            id: z21.string(),
            call_id: z21.string(),
            status: z21.enum(["in_progress", "completed", "incomplete"]),
            action: z21.object({
              commands: z21.array(z21.string())
            })
          }),
          z21.object({
            type: z21.literal("shell_call_output"),
            id: z21.string(),
            call_id: z21.string(),
            status: z21.enum(["in_progress", "completed", "incomplete"]),
            output: z21.array(
              z21.object({
                stdout: z21.string(),
                stderr: z21.string(),
                outcome: z21.discriminatedUnion("type", [
                  z21.object({ type: z21.literal("timeout") }),
                  z21.object({
                    type: z21.literal("exit"),
                    exit_code: z21.number()
                  })
                ])
              })
            )
          }),
          z21.object({
            type: z21.literal("tool_search_call"),
            id: z21.string(),
            execution: z21.enum(["server", "client"]),
            call_id: z21.string().nullable(),
            status: z21.enum(["in_progress", "completed", "incomplete"]),
            arguments: z21.unknown()
          }),
          z21.object({
            type: z21.literal("tool_search_output"),
            id: z21.string(),
            execution: z21.enum(["server", "client"]),
            call_id: z21.string().nullable(),
            status: z21.enum(["in_progress", "completed", "incomplete"]),
            tools: z21.array(z21.record(z21.string(), jsonValueSchema2.optional()))
          })
        ])
      }),
      z21.object({
        type: z21.literal("response.output_item.done"),
        output_index: z21.number(),
        item: z21.discriminatedUnion("type", [
          z21.object({
            type: z21.literal("message"),
            id: z21.string(),
            phase: z21.enum(["commentary", "final_answer"]).nullish()
          }),
          z21.object({
            type: z21.literal("reasoning"),
            id: z21.string(),
            encrypted_content: z21.string().nullish()
          }),
          z21.object({
            type: z21.literal("function_call"),
            id: z21.string(),
            call_id: z21.string(),
            name: z21.string(),
            arguments: z21.string(),
            status: z21.literal("completed")
          }),
          z21.object({
            type: z21.literal("custom_tool_call"),
            id: z21.string(),
            call_id: z21.string(),
            name: z21.string(),
            input: z21.string(),
            status: z21.literal("completed")
          }),
          z21.object({
            type: z21.literal("code_interpreter_call"),
            id: z21.string(),
            code: z21.string().nullable(),
            container_id: z21.string(),
            outputs: z21.array(
              z21.discriminatedUnion("type", [
                z21.object({ type: z21.literal("logs"), logs: z21.string() }),
                z21.object({ type: z21.literal("image"), url: z21.string() })
              ])
            ).nullable()
          }),
          z21.object({
            type: z21.literal("image_generation_call"),
            id: z21.string(),
            result: z21.string()
          }),
          z21.object({
            type: z21.literal("web_search_call"),
            id: z21.string(),
            status: z21.string(),
            action: z21.discriminatedUnion("type", [
              z21.object({
                type: z21.literal("search"),
                query: z21.string().nullish(),
                sources: z21.array(
                  z21.discriminatedUnion("type", [
                    z21.object({ type: z21.literal("url"), url: z21.string() }),
                    z21.object({ type: z21.literal("api"), name: z21.string() })
                  ])
                ).nullish()
              }),
              z21.object({
                type: z21.literal("open_page"),
                url: z21.string().nullish()
              }),
              z21.object({
                type: z21.literal("find_in_page"),
                url: z21.string().nullish(),
                pattern: z21.string().nullish()
              })
            ]).nullish()
          }),
          z21.object({
            type: z21.literal("file_search_call"),
            id: z21.string(),
            queries: z21.array(z21.string()),
            results: z21.array(
              z21.object({
                attributes: z21.record(
                  z21.string(),
                  z21.union([z21.string(), z21.number(), z21.boolean()])
                ),
                file_id: z21.string(),
                filename: z21.string(),
                score: z21.number(),
                text: z21.string()
              })
            ).nullish()
          }),
          z21.object({
            type: z21.literal("local_shell_call"),
            id: z21.string(),
            call_id: z21.string(),
            action: z21.object({
              type: z21.literal("exec"),
              command: z21.array(z21.string()),
              timeout_ms: z21.number().optional(),
              user: z21.string().optional(),
              working_directory: z21.string().optional(),
              env: z21.record(z21.string(), z21.string()).optional()
            })
          }),
          z21.object({
            type: z21.literal("computer_call"),
            id: z21.string(),
            status: z21.literal("completed")
          }),
          z21.object({
            type: z21.literal("mcp_call"),
            id: z21.string(),
            status: z21.string(),
            arguments: z21.string(),
            name: z21.string(),
            server_label: z21.string(),
            output: z21.string().nullish(),
            error: z21.union([
              z21.string(),
              z21.object({
                type: z21.string().optional(),
                code: z21.union([z21.number(), z21.string()]).optional(),
                message: z21.string().optional()
              }).loose()
            ]).nullish(),
            approval_request_id: z21.string().nullish()
          }),
          z21.object({
            type: z21.literal("mcp_list_tools"),
            id: z21.string(),
            server_label: z21.string(),
            tools: z21.array(
              z21.object({
                name: z21.string(),
                description: z21.string().optional(),
                input_schema: z21.any(),
                annotations: z21.record(z21.string(), z21.unknown()).optional()
              })
            ),
            error: z21.union([
              z21.string(),
              z21.object({
                type: z21.string().optional(),
                code: z21.union([z21.number(), z21.string()]).optional(),
                message: z21.string().optional()
              }).loose()
            ]).optional()
          }),
          z21.object({
            type: z21.literal("mcp_approval_request"),
            id: z21.string(),
            server_label: z21.string(),
            name: z21.string(),
            arguments: z21.string(),
            approval_request_id: z21.string().optional()
          }),
          z21.object({
            type: z21.literal("apply_patch_call"),
            id: z21.string(),
            call_id: z21.string(),
            status: z21.enum(["in_progress", "completed"]),
            operation: z21.discriminatedUnion("type", [
              z21.object({
                type: z21.literal("create_file"),
                path: z21.string(),
                diff: z21.string()
              }),
              z21.object({
                type: z21.literal("delete_file"),
                path: z21.string()
              }),
              z21.object({
                type: z21.literal("update_file"),
                path: z21.string(),
                diff: z21.string()
              })
            ])
          }),
          z21.object({
            type: z21.literal("shell_call"),
            id: z21.string(),
            call_id: z21.string(),
            status: z21.enum(["in_progress", "completed", "incomplete"]),
            action: z21.object({
              commands: z21.array(z21.string())
            })
          }),
          z21.object({
            type: z21.literal("shell_call_output"),
            id: z21.string(),
            call_id: z21.string(),
            status: z21.enum(["in_progress", "completed", "incomplete"]),
            output: z21.array(
              z21.object({
                stdout: z21.string(),
                stderr: z21.string(),
                outcome: z21.discriminatedUnion("type", [
                  z21.object({ type: z21.literal("timeout") }),
                  z21.object({
                    type: z21.literal("exit"),
                    exit_code: z21.number()
                  })
                ])
              })
            )
          }),
          z21.object({
            type: z21.literal("tool_search_call"),
            id: z21.string(),
            execution: z21.enum(["server", "client"]),
            call_id: z21.string().nullable(),
            status: z21.enum(["in_progress", "completed", "incomplete"]),
            arguments: z21.unknown()
          }),
          z21.object({
            type: z21.literal("tool_search_output"),
            id: z21.string(),
            execution: z21.enum(["server", "client"]),
            call_id: z21.string().nullable(),
            status: z21.enum(["in_progress", "completed", "incomplete"]),
            tools: z21.array(z21.record(z21.string(), jsonValueSchema2.optional()))
          })
        ])
      }),
      z21.object({
        type: z21.literal("response.function_call_arguments.delta"),
        item_id: z21.string(),
        output_index: z21.number(),
        delta: z21.string()
      }),
      z21.object({
        type: z21.literal("response.custom_tool_call_input.delta"),
        item_id: z21.string(),
        output_index: z21.number(),
        delta: z21.string()
      }),
      z21.object({
        type: z21.literal("response.image_generation_call.partial_image"),
        item_id: z21.string(),
        output_index: z21.number(),
        partial_image_b64: z21.string()
      }),
      z21.object({
        type: z21.literal("response.code_interpreter_call_code.delta"),
        item_id: z21.string(),
        output_index: z21.number(),
        delta: z21.string()
      }),
      z21.object({
        type: z21.literal("response.code_interpreter_call_code.done"),
        item_id: z21.string(),
        output_index: z21.number(),
        code: z21.string()
      }),
      z21.object({
        type: z21.literal("response.output_text.annotation.added"),
        annotation: z21.discriminatedUnion("type", [
          z21.object({
            type: z21.literal("url_citation"),
            start_index: z21.number(),
            end_index: z21.number(),
            url: z21.string(),
            title: z21.string()
          }),
          z21.object({
            type: z21.literal("file_citation"),
            file_id: z21.string(),
            filename: z21.string(),
            index: z21.number()
          }),
          z21.object({
            type: z21.literal("container_file_citation"),
            container_id: z21.string(),
            file_id: z21.string(),
            filename: z21.string(),
            start_index: z21.number(),
            end_index: z21.number()
          }),
          z21.object({
            type: z21.literal("file_path"),
            file_id: z21.string(),
            index: z21.number()
          })
        ])
      }),
      z21.object({
        type: z21.literal("response.reasoning_summary_part.added"),
        item_id: z21.string(),
        summary_index: z21.number()
      }),
      z21.object({
        type: z21.literal("response.reasoning_summary_text.delta"),
        item_id: z21.string(),
        summary_index: z21.number(),
        delta: z21.string()
      }),
      z21.object({
        type: z21.literal("response.reasoning_summary_part.done"),
        item_id: z21.string(),
        summary_index: z21.number()
      }),
      z21.object({
        type: z21.literal("response.apply_patch_call_operation_diff.delta"),
        item_id: z21.string(),
        output_index: z21.number(),
        delta: z21.string(),
        obfuscation: z21.string().nullish()
      }),
      z21.object({
        type: z21.literal("response.apply_patch_call_operation_diff.done"),
        item_id: z21.string(),
        output_index: z21.number(),
        diff: z21.string()
      }),
      z21.object({
        type: z21.literal("error"),
        sequence_number: z21.number(),
        error: z21.object({
          type: z21.string(),
          code: z21.string(),
          message: z21.string(),
          param: z21.string().nullish()
        })
      }),
      z21.object({ type: z21.string() }).loose().transform((value) => ({
        type: "unknown_chunk",
        message: value.type
      }))
      // fallback for unknown chunks
    ])
  )
);
var openaiResponsesResponseSchema = lazySchema19(
  () => zodSchema19(
    z21.object({
      id: z21.string().optional(),
      created_at: z21.number().optional(),
      error: z21.object({
        message: z21.string(),
        type: z21.string(),
        param: z21.string().nullish(),
        code: z21.string()
      }).nullish(),
      model: z21.string().optional(),
      output: z21.array(
        z21.discriminatedUnion("type", [
          z21.object({
            type: z21.literal("message"),
            role: z21.literal("assistant"),
            id: z21.string(),
            phase: z21.enum(["commentary", "final_answer"]).nullish(),
            content: z21.array(
              z21.object({
                type: z21.literal("output_text"),
                text: z21.string(),
                logprobs: z21.array(
                  z21.object({
                    token: z21.string(),
                    logprob: z21.number(),
                    top_logprobs: z21.array(
                      z21.object({
                        token: z21.string(),
                        logprob: z21.number()
                      })
                    )
                  })
                ).nullish(),
                annotations: z21.array(
                  z21.discriminatedUnion("type", [
                    z21.object({
                      type: z21.literal("url_citation"),
                      start_index: z21.number(),
                      end_index: z21.number(),
                      url: z21.string(),
                      title: z21.string()
                    }),
                    z21.object({
                      type: z21.literal("file_citation"),
                      file_id: z21.string(),
                      filename: z21.string(),
                      index: z21.number()
                    }),
                    z21.object({
                      type: z21.literal("container_file_citation"),
                      container_id: z21.string(),
                      file_id: z21.string(),
                      filename: z21.string(),
                      start_index: z21.number(),
                      end_index: z21.number()
                    }),
                    z21.object({
                      type: z21.literal("file_path"),
                      file_id: z21.string(),
                      index: z21.number()
                    })
                  ])
                )
              })
            )
          }),
          z21.object({
            type: z21.literal("web_search_call"),
            id: z21.string(),
            status: z21.string(),
            action: z21.discriminatedUnion("type", [
              z21.object({
                type: z21.literal("search"),
                query: z21.string().nullish(),
                sources: z21.array(
                  z21.discriminatedUnion("type", [
                    z21.object({ type: z21.literal("url"), url: z21.string() }),
                    z21.object({
                      type: z21.literal("api"),
                      name: z21.string()
                    })
                  ])
                ).nullish()
              }),
              z21.object({
                type: z21.literal("open_page"),
                url: z21.string().nullish()
              }),
              z21.object({
                type: z21.literal("find_in_page"),
                url: z21.string().nullish(),
                pattern: z21.string().nullish()
              })
            ]).nullish()
          }),
          z21.object({
            type: z21.literal("file_search_call"),
            id: z21.string(),
            queries: z21.array(z21.string()),
            results: z21.array(
              z21.object({
                attributes: z21.record(
                  z21.string(),
                  z21.union([z21.string(), z21.number(), z21.boolean()])
                ),
                file_id: z21.string(),
                filename: z21.string(),
                score: z21.number(),
                text: z21.string()
              })
            ).nullish()
          }),
          z21.object({
            type: z21.literal("code_interpreter_call"),
            id: z21.string(),
            code: z21.string().nullable(),
            container_id: z21.string(),
            outputs: z21.array(
              z21.discriminatedUnion("type", [
                z21.object({ type: z21.literal("logs"), logs: z21.string() }),
                z21.object({ type: z21.literal("image"), url: z21.string() })
              ])
            ).nullable()
          }),
          z21.object({
            type: z21.literal("image_generation_call"),
            id: z21.string(),
            result: z21.string()
          }),
          z21.object({
            type: z21.literal("local_shell_call"),
            id: z21.string(),
            call_id: z21.string(),
            action: z21.object({
              type: z21.literal("exec"),
              command: z21.array(z21.string()),
              timeout_ms: z21.number().optional(),
              user: z21.string().optional(),
              working_directory: z21.string().optional(),
              env: z21.record(z21.string(), z21.string()).optional()
            })
          }),
          z21.object({
            type: z21.literal("function_call"),
            call_id: z21.string(),
            name: z21.string(),
            arguments: z21.string(),
            id: z21.string()
          }),
          z21.object({
            type: z21.literal("custom_tool_call"),
            call_id: z21.string(),
            name: z21.string(),
            input: z21.string(),
            id: z21.string()
          }),
          z21.object({
            type: z21.literal("computer_call"),
            id: z21.string(),
            status: z21.string().optional()
          }),
          z21.object({
            type: z21.literal("reasoning"),
            id: z21.string(),
            encrypted_content: z21.string().nullish(),
            summary: z21.array(
              z21.object({
                type: z21.literal("summary_text"),
                text: z21.string()
              })
            )
          }),
          z21.object({
            type: z21.literal("mcp_call"),
            id: z21.string(),
            status: z21.string(),
            arguments: z21.string(),
            name: z21.string(),
            server_label: z21.string(),
            output: z21.string().nullish(),
            error: z21.union([
              z21.string(),
              z21.object({
                type: z21.string().optional(),
                code: z21.union([z21.number(), z21.string()]).optional(),
                message: z21.string().optional()
              }).loose()
            ]).nullish(),
            approval_request_id: z21.string().nullish()
          }),
          z21.object({
            type: z21.literal("mcp_list_tools"),
            id: z21.string(),
            server_label: z21.string(),
            tools: z21.array(
              z21.object({
                name: z21.string(),
                description: z21.string().optional(),
                input_schema: z21.any(),
                annotations: z21.record(z21.string(), z21.unknown()).optional()
              })
            ),
            error: z21.union([
              z21.string(),
              z21.object({
                type: z21.string().optional(),
                code: z21.union([z21.number(), z21.string()]).optional(),
                message: z21.string().optional()
              }).loose()
            ]).optional()
          }),
          z21.object({
            type: z21.literal("mcp_approval_request"),
            id: z21.string(),
            server_label: z21.string(),
            name: z21.string(),
            arguments: z21.string(),
            approval_request_id: z21.string().optional()
          }),
          z21.object({
            type: z21.literal("apply_patch_call"),
            id: z21.string(),
            call_id: z21.string(),
            status: z21.enum(["in_progress", "completed"]),
            operation: z21.discriminatedUnion("type", [
              z21.object({
                type: z21.literal("create_file"),
                path: z21.string(),
                diff: z21.string()
              }),
              z21.object({
                type: z21.literal("delete_file"),
                path: z21.string()
              }),
              z21.object({
                type: z21.literal("update_file"),
                path: z21.string(),
                diff: z21.string()
              })
            ])
          }),
          z21.object({
            type: z21.literal("shell_call"),
            id: z21.string(),
            call_id: z21.string(),
            status: z21.enum(["in_progress", "completed", "incomplete"]),
            action: z21.object({
              commands: z21.array(z21.string())
            })
          }),
          z21.object({
            type: z21.literal("shell_call_output"),
            id: z21.string(),
            call_id: z21.string(),
            status: z21.enum(["in_progress", "completed", "incomplete"]),
            output: z21.array(
              z21.object({
                stdout: z21.string(),
                stderr: z21.string(),
                outcome: z21.discriminatedUnion("type", [
                  z21.object({ type: z21.literal("timeout") }),
                  z21.object({
                    type: z21.literal("exit"),
                    exit_code: z21.number()
                  })
                ])
              })
            )
          }),
          z21.object({
            type: z21.literal("tool_search_call"),
            id: z21.string(),
            execution: z21.enum(["server", "client"]),
            call_id: z21.string().nullable(),
            status: z21.enum(["in_progress", "completed", "incomplete"]),
            arguments: z21.unknown()
          }),
          z21.object({
            type: z21.literal("tool_search_output"),
            id: z21.string(),
            execution: z21.enum(["server", "client"]),
            call_id: z21.string().nullable(),
            status: z21.enum(["in_progress", "completed", "incomplete"]),
            tools: z21.array(z21.record(z21.string(), jsonValueSchema2.optional()))
          })
        ])
      ).optional(),
      service_tier: z21.string().nullish(),
      incomplete_details: z21.object({ reason: z21.string() }).nullish(),
      usage: z21.object({
        input_tokens: z21.number(),
        input_tokens_details: z21.object({ cached_tokens: z21.number().nullish() }).nullish(),
        output_tokens: z21.number(),
        output_tokens_details: z21.object({ reasoning_tokens: z21.number().nullish() }).nullish()
      }).optional()
    })
  )
);

// src/responses/openai-responses-options.ts
import { lazySchema as lazySchema20, zodSchema as zodSchema20 } from "@ai-sdk/provider-utils";
import { z as z22 } from "zod/v4";
var TOP_LOGPROBS_MAX = 20;
var openaiResponsesReasoningModelIds = [
  "o1",
  "o1-2024-12-17",
  "o3",
  "o3-2025-04-16",
  "o3-mini",
  "o3-mini-2025-01-31",
  "o4-mini",
  "o4-mini-2025-04-16",
  "gpt-5",
  "gpt-5-2025-08-07",
  "gpt-5-codex",
  "gpt-5-mini",
  "gpt-5-mini-2025-08-07",
  "gpt-5-nano",
  "gpt-5-nano-2025-08-07",
  "gpt-5-pro",
  "gpt-5-pro-2025-10-06",
  "gpt-5.1",
  "gpt-5.1-chat-latest",
  "gpt-5.1-codex-mini",
  "gpt-5.1-codex",
  "gpt-5.1-codex-max",
  "gpt-5.2",
  "gpt-5.2-chat-latest",
  "gpt-5.2-pro",
  "gpt-5.2-codex",
  "gpt-5.3-chat-latest",
  "gpt-5.3-codex",
  "gpt-5.4",
  "gpt-5.4-2026-03-05",
  "gpt-5.4-mini",
  "gpt-5.4-mini-2026-03-17",
  "gpt-5.4-nano",
  "gpt-5.4-nano-2026-03-17",
  "gpt-5.4-pro",
  "gpt-5.4-pro-2026-03-05"
];
var openaiResponsesModelIds = [
  "gpt-4.1",
  "gpt-4.1-2025-04-14",
  "gpt-4.1-mini",
  "gpt-4.1-mini-2025-04-14",
  "gpt-4.1-nano",
  "gpt-4.1-nano-2025-04-14",
  "gpt-4o",
  "gpt-4o-2024-05-13",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-11-20",
  "gpt-4o-audio-preview",
  "gpt-4o-audio-preview-2024-12-17",
  "gpt-4o-search-preview",
  "gpt-4o-search-preview-2025-03-11",
  "gpt-4o-mini-search-preview",
  "gpt-4o-mini-search-preview-2025-03-11",
  "gpt-4o-mini",
  "gpt-4o-mini-2024-07-18",
  "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-1106",
  "gpt-5-chat-latest",
  ...openaiResponsesReasoningModelIds
];
var openaiLanguageModelResponsesOptionsSchema = lazySchema20(
  () => zodSchema20(
    z22.object({
      /**
       * The ID of the OpenAI Conversation to continue.
       * You must create a conversation first via the OpenAI API.
       * Cannot be used in conjunction with `previousResponseId`.
       * Defaults to `undefined`.
       * @see https://platform.openai.com/docs/api-reference/conversations/create
       */
      conversation: z22.string().nullish(),
      /**
       * The set of extra fields to include in the response (advanced, usually not needed).
       * Example values: 'reasoning.encrypted_content', 'file_search_call.results', 'message.output_text.logprobs'.
       */
      include: z22.array(
        z22.enum([
          "reasoning.encrypted_content",
          // handled internally by default, only needed for unknown reasoning models
          "file_search_call.results",
          "message.output_text.logprobs"
        ])
      ).nullish(),
      /**
       * Instructions for the model.
       * They can be used to change the system or developer message when continuing a conversation using the `previousResponseId` option.
       * Defaults to `undefined`.
       */
      instructions: z22.string().nullish(),
      /**
       * Return the log probabilities of the tokens. Including logprobs will increase
       * the response size and can slow down response times. However, it can
       * be useful to better understand how the model is behaving.
       *
       * Setting to true will return the log probabilities of the tokens that
       * were generated.
       *
       * Setting to a number will return the log probabilities of the top n
       * tokens that were generated.
       *
       * @see https://platform.openai.com/docs/api-reference/responses/create
       * @see https://cookbook.openai.com/examples/using_logprobs
       */
      logprobs: z22.union([z22.boolean(), z22.number().min(1).max(TOP_LOGPROBS_MAX)]).optional(),
      /**
       * The maximum number of total calls to built-in tools that can be processed in a response.
       * This maximum number applies across all built-in tool calls, not per individual tool.
       * Any further attempts to call a tool by the model will be ignored.
       */
      maxToolCalls: z22.number().nullish(),
      /**
       * Additional metadata to store with the generation.
       */
      metadata: z22.any().nullish(),
      /**
       * Whether to use parallel tool calls. Defaults to `true`.
       */
      parallelToolCalls: z22.boolean().nullish(),
      /**
       * The ID of the previous response. You can use it to continue a conversation.
       * Defaults to `undefined`.
       */
      previousResponseId: z22.string().nullish(),
      /**
       * Sets a cache key to tie this prompt to cached prefixes for better caching performance.
       */
      promptCacheKey: z22.string().nullish(),
      /**
       * The retention policy for the prompt cache.
       * - 'in_memory': Default. Standard prompt caching behavior.
       * - '24h': Extended prompt caching that keeps cached prefixes active for up to 24 hours.
       *          Currently only available for 5.1 series models.
       *
       * @default 'in_memory'
       */
      promptCacheRetention: z22.enum(["in_memory", "24h"]).nullish(),
      /**
       * Reasoning effort for reasoning models. Defaults to `medium`. If you use
       * `providerOptions` to set the `reasoningEffort` option, this model setting will be ignored.
       * Valid values: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
       *
       * The 'none' type for `reasoningEffort` is only available for OpenAI's GPT-5.1
       * models. Also, the 'xhigh' type for `reasoningEffort` is only available for
       * OpenAI's GPT-5.1-Codex-Max model. Setting `reasoningEffort` to 'none' or 'xhigh' with unsupported models will result in
       * an error.
       */
      reasoningEffort: z22.string().nullish(),
      /**
       * Controls reasoning summary output from the model.
       * Set to "auto" to automatically receive the richest level available,
       * or "detailed" for comprehensive summaries.
       */
      reasoningSummary: z22.string().nullish(),
      /**
       * The identifier for safety monitoring and tracking.
       */
      safetyIdentifier: z22.string().nullish(),
      /**
       * Service tier for the request.
       * Set to 'flex' for 50% cheaper processing at the cost of increased latency (available for o3, o4-mini, and gpt-5 models).
       * Set to 'priority' for faster processing with Enterprise access (available for gpt-4, gpt-5, gpt-5-mini, o3, o4-mini; gpt-5-nano is not supported).
       *
       * Defaults to 'auto'.
       */
      serviceTier: z22.enum(["auto", "flex", "priority", "default"]).nullish(),
      /**
       * Whether to store the generation. Defaults to `true`.
       */
      store: z22.boolean().nullish(),
      /**
       * Whether to use strict JSON schema validation.
       * Defaults to `true`.
       */
      strictJsonSchema: z22.boolean().nullish(),
      /**
       * Controls the verbosity of the model's responses. Lower values ('low') will result
       * in more concise responses, while higher values ('high') will result in more verbose responses.
       * Valid values: 'low', 'medium', 'high'.
       */
      textVerbosity: z22.enum(["low", "medium", "high"]).nullish(),
      /**
       * Controls output truncation. 'auto' (default) performs truncation automatically;
       * 'disabled' turns truncation off.
       */
      truncation: z22.enum(["auto", "disabled"]).nullish(),
      /**
       * A unique identifier representing your end-user, which can help OpenAI to
       * monitor and detect abuse.
       * Defaults to `undefined`.
       * @see https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids
       */
      user: z22.string().nullish(),
      /**
       * Override the system message mode for this model.
       * - 'system': Use the 'system' role for system messages (default for most models)
       * - 'developer': Use the 'developer' role for system messages (used by reasoning models)
       * - 'remove': Remove system messages entirely
       *
       * If not specified, the mode is automatically determined based on the model.
       */
      systemMessageMode: z22.enum(["system", "developer", "remove"]).optional(),
      /**
       * Force treating this model as a reasoning model.
       *
       * This is useful for "stealth" reasoning models (e.g. via a custom baseURL)
       * where the model ID is not recognized by the SDK's allowlist.
       *
       * When enabled, the SDK applies reasoning-model parameter compatibility rules
       * and defaults `systemMessageMode` to `developer` unless overridden.
       */
      forceReasoning: z22.boolean().optional()
    })
  )
);

// src/responses/openai-responses-prepare-tools.ts
import {
  UnsupportedFunctionalityError as UnsupportedFunctionalityError5
} from "@ai-sdk/provider";
import { validateTypes as validateTypes2 } from "@ai-sdk/provider-utils";
async function prepareResponsesTools({
  tools,
  toolChoice,
  toolNameMapping,
  customProviderToolNames
}) {
  var _a, _b;
  tools = (tools == null ? void 0 : tools.length) ? tools : void 0;
  const toolWarnings = [];
  if (tools == null) {
    return { tools: void 0, toolChoice: void 0, toolWarnings };
  }
  const openaiTools2 = [];
  const resolvedCustomProviderToolNames = customProviderToolNames != null ? customProviderToolNames : /* @__PURE__ */ new Set();
  for (const tool of tools) {
    switch (tool.type) {
      case "function": {
        const openaiOptions = (_a = tool.providerOptions) == null ? void 0 : _a.openai;
        const deferLoading = openaiOptions == null ? void 0 : openaiOptions.deferLoading;
        openaiTools2.push({
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          ...tool.strict != null ? { strict: tool.strict } : {},
          ...deferLoading != null ? { defer_loading: deferLoading } : {}
        });
        break;
      }
      case "provider": {
        switch (tool.id) {
          case "openai.file_search": {
            const args = await validateTypes2({
              value: tool.args,
              schema: fileSearchArgsSchema
            });
            openaiTools2.push({
              type: "file_search",
              vector_store_ids: args.vectorStoreIds,
              max_num_results: args.maxNumResults,
              ranking_options: args.ranking ? {
                ranker: args.ranking.ranker,
                score_threshold: args.ranking.scoreThreshold
              } : void 0,
              filters: args.filters
            });
            break;
          }
          case "openai.local_shell": {
            openaiTools2.push({
              type: "local_shell"
            });
            break;
          }
          case "openai.shell": {
            const args = await validateTypes2({
              value: tool.args,
              schema: shellArgsSchema
            });
            openaiTools2.push({
              type: "shell",
              ...args.environment && {
                environment: mapShellEnvironment(args.environment)
              }
            });
            break;
          }
          case "openai.apply_patch": {
            openaiTools2.push({
              type: "apply_patch"
            });
            break;
          }
          case "openai.web_search_preview": {
            const args = await validateTypes2({
              value: tool.args,
              schema: webSearchPreviewArgsSchema
            });
            openaiTools2.push({
              type: "web_search_preview",
              search_context_size: args.searchContextSize,
              user_location: args.userLocation
            });
            break;
          }
          case "openai.web_search": {
            const args = await validateTypes2({
              value: tool.args,
              schema: webSearchArgsSchema
            });
            openaiTools2.push({
              type: "web_search",
              filters: args.filters != null ? { allowed_domains: args.filters.allowedDomains } : void 0,
              external_web_access: args.externalWebAccess,
              search_context_size: args.searchContextSize,
              user_location: args.userLocation
            });
            break;
          }
          case "openai.code_interpreter": {
            const args = await validateTypes2({
              value: tool.args,
              schema: codeInterpreterArgsSchema
            });
            openaiTools2.push({
              type: "code_interpreter",
              container: args.container == null ? { type: "auto", file_ids: void 0 } : typeof args.container === "string" ? args.container : { type: "auto", file_ids: args.container.fileIds }
            });
            break;
          }
          case "openai.image_generation": {
            const args = await validateTypes2({
              value: tool.args,
              schema: imageGenerationArgsSchema
            });
            openaiTools2.push({
              type: "image_generation",
              background: args.background,
              input_fidelity: args.inputFidelity,
              input_image_mask: args.inputImageMask ? {
                file_id: args.inputImageMask.fileId,
                image_url: args.inputImageMask.imageUrl
              } : void 0,
              model: args.model,
              moderation: args.moderation,
              partial_images: args.partialImages,
              quality: args.quality,
              output_compression: args.outputCompression,
              output_format: args.outputFormat,
              size: args.size
            });
            break;
          }
          case "openai.mcp": {
            const args = await validateTypes2({
              value: tool.args,
              schema: mcpArgsSchema
            });
            const mapApprovalFilter = (filter) => ({
              tool_names: filter.toolNames
            });
            const requireApproval = args.requireApproval;
            const requireApprovalParam = requireApproval == null ? void 0 : typeof requireApproval === "string" ? requireApproval : requireApproval.never != null ? { never: mapApprovalFilter(requireApproval.never) } : void 0;
            openaiTools2.push({
              type: "mcp",
              server_label: args.serverLabel,
              allowed_tools: Array.isArray(args.allowedTools) ? args.allowedTools : args.allowedTools ? {
                read_only: args.allowedTools.readOnly,
                tool_names: args.allowedTools.toolNames
              } : void 0,
              authorization: args.authorization,
              connector_id: args.connectorId,
              headers: args.headers,
              require_approval: requireApprovalParam != null ? requireApprovalParam : "never",
              server_description: args.serverDescription,
              server_url: args.serverUrl
            });
            break;
          }
          case "openai.custom": {
            const args = await validateTypes2({
              value: tool.args,
              schema: customArgsSchema
            });
            openaiTools2.push({
              type: "custom",
              name: args.name,
              description: args.description,
              format: args.format
            });
            resolvedCustomProviderToolNames.add(args.name);
            break;
          }
          case "openai.tool_search": {
            const args = await validateTypes2({
              value: tool.args,
              schema: toolSearchArgsSchema
            });
            openaiTools2.push({
              type: "tool_search",
              ...args.execution != null ? { execution: args.execution } : {},
              ...args.description != null ? { description: args.description } : {},
              ...args.parameters != null ? { parameters: args.parameters } : {}
            });
            break;
          }
        }
        break;
      }
      default:
        toolWarnings.push({
          type: "unsupported",
          feature: `function tool ${tool}`
        });
        break;
    }
  }
  if (toolChoice == null) {
    return { tools: openaiTools2, toolChoice: void 0, toolWarnings };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
    case "none":
    case "required":
      return { tools: openaiTools2, toolChoice: type, toolWarnings };
    case "tool": {
      const resolvedToolName = (_b = toolNameMapping == null ? void 0 : toolNameMapping.toProviderToolName(toolChoice.toolName)) != null ? _b : toolChoice.toolName;
      return {
        tools: openaiTools2,
        toolChoice: resolvedToolName === "code_interpreter" || resolvedToolName === "file_search" || resolvedToolName === "image_generation" || resolvedToolName === "web_search_preview" || resolvedToolName === "web_search" || resolvedToolName === "mcp" || resolvedToolName === "apply_patch" ? { type: resolvedToolName } : resolvedCustomProviderToolNames.has(resolvedToolName) ? { type: "custom", name: resolvedToolName } : { type: "function", name: resolvedToolName },
        toolWarnings
      };
    }
    default: {
      const _exhaustiveCheck = type;
      throw new UnsupportedFunctionalityError5({
        functionality: `tool choice type: ${_exhaustiveCheck}`
      });
    }
  }
}
function mapShellEnvironment(environment) {
  if (environment.type === "containerReference") {
    const env2 = environment;
    return {
      type: "container_reference",
      container_id: env2.containerId
    };
  }
  if (environment.type === "containerAuto") {
    const env2 = environment;
    return {
      type: "container_auto",
      file_ids: env2.fileIds,
      memory_limit: env2.memoryLimit,
      network_policy: env2.networkPolicy == null ? void 0 : env2.networkPolicy.type === "disabled" ? { type: "disabled" } : {
        type: "allowlist",
        allowed_domains: env2.networkPolicy.allowedDomains,
        domain_secrets: env2.networkPolicy.domainSecrets
      },
      skills: mapShellSkills(env2.skills)
    };
  }
  const env = environment;
  return {
    type: "local",
    skills: env.skills
  };
}
function mapShellSkills(skills) {
  return skills == null ? void 0 : skills.map(
    (skill) => skill.type === "skillReference" ? {
      type: "skill_reference",
      skill_id: skill.skillId,
      version: skill.version
    } : {
      type: "inline",
      name: skill.name,
      description: skill.description,
      source: {
        type: "base64",
        media_type: skill.source.mediaType,
        data: skill.source.data
      }
    }
  );
}

// src/responses/openai-responses-language-model.ts
function extractApprovalRequestIdToToolCallIdMapping(prompt) {
  var _a, _b;
  const mapping = {};
  for (const message of prompt) {
    if (message.role !== "assistant") continue;
    for (const part of message.content) {
      if (part.type !== "tool-call") continue;
      const approvalRequestId = (_b = (_a = part.providerOptions) == null ? void 0 : _a.openai) == null ? void 0 : _b.approvalRequestId;
      if (approvalRequestId != null) {
        mapping[approvalRequestId] = part.toolCallId;
      }
    }
  }
  return mapping;
}
var OpenAIResponsesLanguageModel = class {
  constructor(modelId, config) {
    this.specificationVersion = "v3";
    this.supportedUrls = {
      "image/*": [/^https?:\/\/.*$/],
      "application/pdf": [/^https?:\/\/.*$/]
    };
    this.modelId = modelId;
    this.config = config;
  }
  get provider() {
    return this.config.provider;
  }
  async getArgs({
    maxOutputTokens,
    temperature,
    stopSequences,
    topP,
    topK,
    presencePenalty,
    frequencyPenalty,
    seed,
    prompt,
    providerOptions,
    tools,
    toolChoice,
    responseFormat
  }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const warnings = [];
    const modelCapabilities = getOpenAILanguageModelCapabilities(this.modelId);
    if (topK != null) {
      warnings.push({ type: "unsupported", feature: "topK" });
    }
    if (seed != null) {
      warnings.push({ type: "unsupported", feature: "seed" });
    }
    if (presencePenalty != null) {
      warnings.push({ type: "unsupported", feature: "presencePenalty" });
    }
    if (frequencyPenalty != null) {
      warnings.push({ type: "unsupported", feature: "frequencyPenalty" });
    }
    if (stopSequences != null) {
      warnings.push({ type: "unsupported", feature: "stopSequences" });
    }
    const providerOptionsName = this.config.provider.includes("azure") ? "azure" : "openai";
    let openaiOptions = await parseProviderOptions5({
      provider: providerOptionsName,
      providerOptions,
      schema: openaiLanguageModelResponsesOptionsSchema
    });
    if (openaiOptions == null && providerOptionsName !== "openai") {
      openaiOptions = await parseProviderOptions5({
        provider: "openai",
        providerOptions,
        schema: openaiLanguageModelResponsesOptionsSchema
      });
    }
    const isReasoningModel = (_a = openaiOptions == null ? void 0 : openaiOptions.forceReasoning) != null ? _a : modelCapabilities.isReasoningModel;
    if ((openaiOptions == null ? void 0 : openaiOptions.conversation) && (openaiOptions == null ? void 0 : openaiOptions.previousResponseId)) {
      warnings.push({
        type: "unsupported",
        feature: "conversation",
        details: "conversation and previousResponseId cannot be used together"
      });
    }
    const toolNameMapping = createToolNameMapping({
      tools,
      providerToolNames: {
        "openai.code_interpreter": "code_interpreter",
        "openai.file_search": "file_search",
        "openai.image_generation": "image_generation",
        "openai.local_shell": "local_shell",
        "openai.shell": "shell",
        "openai.web_search": "web_search",
        "openai.web_search_preview": "web_search_preview",
        "openai.mcp": "mcp",
        "openai.apply_patch": "apply_patch",
        "openai.tool_search": "tool_search"
      },
      resolveProviderToolName: (tool) => tool.id === "openai.custom" ? tool.args.name : void 0
    });
    const customProviderToolNames = /* @__PURE__ */ new Set();
    const {
      tools: openaiTools2,
      toolChoice: openaiToolChoice,
      toolWarnings
    } = await prepareResponsesTools({
      tools,
      toolChoice,
      toolNameMapping,
      customProviderToolNames
    });
    const { input, warnings: inputWarnings } = await convertToOpenAIResponsesInput({
      prompt,
      toolNameMapping,
      systemMessageMode: (_b = openaiOptions == null ? void 0 : openaiOptions.systemMessageMode) != null ? _b : isReasoningModel ? "developer" : modelCapabilities.systemMessageMode,
      providerOptionsName,
      fileIdPrefixes: this.config.fileIdPrefixes,
      store: (_c = openaiOptions == null ? void 0 : openaiOptions.store) != null ? _c : true,
      hasConversation: (openaiOptions == null ? void 0 : openaiOptions.conversation) != null,
      hasLocalShellTool: hasOpenAITool("openai.local_shell"),
      hasShellTool: hasOpenAITool("openai.shell"),
      hasApplyPatchTool: hasOpenAITool("openai.apply_patch"),
      customProviderToolNames: customProviderToolNames.size > 0 ? customProviderToolNames : void 0
    });
    warnings.push(...inputWarnings);
    const strictJsonSchema = (_d = openaiOptions == null ? void 0 : openaiOptions.strictJsonSchema) != null ? _d : true;
    let include = openaiOptions == null ? void 0 : openaiOptions.include;
    function addInclude(key) {
      if (include == null) {
        include = [key];
      } else if (!include.includes(key)) {
        include = [...include, key];
      }
    }
    function hasOpenAITool(id) {
      return (tools == null ? void 0 : tools.find((tool) => tool.type === "provider" && tool.id === id)) != null;
    }
    const topLogprobs = typeof (openaiOptions == null ? void 0 : openaiOptions.logprobs) === "number" ? openaiOptions == null ? void 0 : openaiOptions.logprobs : (openaiOptions == null ? void 0 : openaiOptions.logprobs) === true ? TOP_LOGPROBS_MAX : void 0;
    if (topLogprobs) {
      addInclude("message.output_text.logprobs");
    }
    const webSearchToolName = (_e = tools == null ? void 0 : tools.find(
      (tool) => tool.type === "provider" && (tool.id === "openai.web_search" || tool.id === "openai.web_search_preview")
    )) == null ? void 0 : _e.name;
    if (webSearchToolName) {
      addInclude("web_search_call.action.sources");
    }
    if (hasOpenAITool("openai.code_interpreter")) {
      addInclude("code_interpreter_call.outputs");
    }
    const store = openaiOptions == null ? void 0 : openaiOptions.store;
    if (store === false && isReasoningModel) {
      addInclude("reasoning.encrypted_content");
    }
    const baseArgs = {
      model: this.modelId,
      input,
      temperature,
      top_p: topP,
      max_output_tokens: maxOutputTokens,
      ...((responseFormat == null ? void 0 : responseFormat.type) === "json" || (openaiOptions == null ? void 0 : openaiOptions.textVerbosity)) && {
        text: {
          ...(responseFormat == null ? void 0 : responseFormat.type) === "json" && {
            format: responseFormat.schema != null ? {
              type: "json_schema",
              strict: strictJsonSchema,
              name: (_f = responseFormat.name) != null ? _f : "response",
              description: responseFormat.description,
              schema: responseFormat.schema
            } : { type: "json_object" }
          },
          ...(openaiOptions == null ? void 0 : openaiOptions.textVerbosity) && {
            verbosity: openaiOptions.textVerbosity
          }
        }
      },
      // provider options:
      conversation: openaiOptions == null ? void 0 : openaiOptions.conversation,
      max_tool_calls: openaiOptions == null ? void 0 : openaiOptions.maxToolCalls,
      metadata: openaiOptions == null ? void 0 : openaiOptions.metadata,
      parallel_tool_calls: openaiOptions == null ? void 0 : openaiOptions.parallelToolCalls,
      previous_response_id: openaiOptions == null ? void 0 : openaiOptions.previousResponseId,
      store,
      user: openaiOptions == null ? void 0 : openaiOptions.user,
      instructions: openaiOptions == null ? void 0 : openaiOptions.instructions,
      service_tier: openaiOptions == null ? void 0 : openaiOptions.serviceTier,
      include,
      prompt_cache_key: openaiOptions == null ? void 0 : openaiOptions.promptCacheKey,
      prompt_cache_retention: openaiOptions == null ? void 0 : openaiOptions.promptCacheRetention,
      safety_identifier: openaiOptions == null ? void 0 : openaiOptions.safetyIdentifier,
      top_logprobs: topLogprobs,
      truncation: openaiOptions == null ? void 0 : openaiOptions.truncation,
      // model-specific settings:
      ...isReasoningModel && ((openaiOptions == null ? void 0 : openaiOptions.reasoningEffort) != null || (openaiOptions == null ? void 0 : openaiOptions.reasoningSummary) != null) && {
        reasoning: {
          ...(openaiOptions == null ? void 0 : openaiOptions.reasoningEffort) != null && {
            effort: openaiOptions.reasoningEffort
          },
          ...(openaiOptions == null ? void 0 : openaiOptions.reasoningSummary) != null && {
            summary: openaiOptions.reasoningSummary
          }
        }
      }
    };
    if (isReasoningModel) {
      if (!((openaiOptions == null ? void 0 : openaiOptions.reasoningEffort) === "none" && modelCapabilities.supportsNonReasoningParameters)) {
        if (baseArgs.temperature != null) {
          baseArgs.temperature = void 0;
          warnings.push({
            type: "unsupported",
            feature: "temperature",
            details: "temperature is not supported for reasoning models"
          });
        }
        if (baseArgs.top_p != null) {
          baseArgs.top_p = void 0;
          warnings.push({
            type: "unsupported",
            feature: "topP",
            details: "topP is not supported for reasoning models"
          });
        }
      }
    } else {
      if ((openaiOptions == null ? void 0 : openaiOptions.reasoningEffort) != null) {
        warnings.push({
          type: "unsupported",
          feature: "reasoningEffort",
          details: "reasoningEffort is not supported for non-reasoning models"
        });
      }
      if ((openaiOptions == null ? void 0 : openaiOptions.reasoningSummary) != null) {
        warnings.push({
          type: "unsupported",
          feature: "reasoningSummary",
          details: "reasoningSummary is not supported for non-reasoning models"
        });
      }
    }
    if ((openaiOptions == null ? void 0 : openaiOptions.serviceTier) === "flex" && !modelCapabilities.supportsFlexProcessing) {
      warnings.push({
        type: "unsupported",
        feature: "serviceTier",
        details: "flex processing is only available for o3, o4-mini, and gpt-5 models"
      });
      delete baseArgs.service_tier;
    }
    if ((openaiOptions == null ? void 0 : openaiOptions.serviceTier) === "priority" && !modelCapabilities.supportsPriorityProcessing) {
      warnings.push({
        type: "unsupported",
        feature: "serviceTier",
        details: "priority processing is only available for supported models (gpt-4, gpt-5, gpt-5-mini, o3, o4-mini) and requires Enterprise access. gpt-5-nano is not supported"
      });
      delete baseArgs.service_tier;
    }
    const shellToolEnvType = (_i = (_h = (_g = tools == null ? void 0 : tools.find(
      (tool) => tool.type === "provider" && tool.id === "openai.shell"
    )) == null ? void 0 : _g.args) == null ? void 0 : _h.environment) == null ? void 0 : _i.type;
    const isShellProviderExecuted = shellToolEnvType === "containerAuto" || shellToolEnvType === "containerReference";
    return {
      webSearchToolName,
      args: {
        ...baseArgs,
        tools: openaiTools2,
        tool_choice: openaiToolChoice
      },
      warnings: [...warnings, ...toolWarnings],
      store,
      toolNameMapping,
      providerOptionsName,
      isShellProviderExecuted
    };
  }
  async doGenerate(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B;
    const {
      args: body,
      warnings,
      webSearchToolName,
      toolNameMapping,
      providerOptionsName,
      isShellProviderExecuted
    } = await this.getArgs(options);
    const url = this.config.url({
      path: "/responses",
      modelId: this.modelId
    });
    const approvalRequestIdToDummyToolCallIdFromPrompt = extractApprovalRequestIdToToolCallIdMapping(options.prompt);
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await postJsonToApi5({
      url,
      headers: combineHeaders5(this.config.headers(), options.headers),
      body,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler5(
        openaiResponsesResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    if (response.error) {
      throw new APICallError({
        message: response.error.message,
        url,
        requestBodyValues: body,
        statusCode: 400,
        responseHeaders,
        responseBody: rawResponse,
        isRetryable: false
      });
    }
    const content = [];
    const logprobs = [];
    let hasFunctionCall = false;
    const hostedToolSearchCallIds = [];
    for (const part of response.output) {
      switch (part.type) {
        case "reasoning": {
          if (part.summary.length === 0) {
            part.summary.push({ type: "summary_text", text: "" });
          }
          for (const summary of part.summary) {
            content.push({
              type: "reasoning",
              text: summary.text,
              providerMetadata: {
                [providerOptionsName]: {
                  itemId: part.id,
                  reasoningEncryptedContent: (_a = part.encrypted_content) != null ? _a : null
                }
              }
            });
          }
          break;
        }
        case "image_generation_call": {
          content.push({
            type: "tool-call",
            toolCallId: part.id,
            toolName: toolNameMapping.toCustomToolName("image_generation"),
            input: "{}",
            providerExecuted: true
          });
          content.push({
            type: "tool-result",
            toolCallId: part.id,
            toolName: toolNameMapping.toCustomToolName("image_generation"),
            result: {
              result: part.result
            }
          });
          break;
        }
        case "tool_search_call": {
          const toolCallId = (_b = part.call_id) != null ? _b : part.id;
          const isHosted = part.execution === "server";
          if (isHosted) {
            hostedToolSearchCallIds.push(toolCallId);
          }
          content.push({
            type: "tool-call",
            toolCallId,
            toolName: toolNameMapping.toCustomToolName("tool_search"),
            input: JSON.stringify({
              arguments: part.arguments,
              call_id: part.call_id
            }),
            ...isHosted ? { providerExecuted: true } : {},
            providerMetadata: {
              [providerOptionsName]: {
                itemId: part.id
              }
            }
          });
          break;
        }
        case "tool_search_output": {
          const toolCallId = (_d = (_c = part.call_id) != null ? _c : hostedToolSearchCallIds.shift()) != null ? _d : part.id;
          content.push({
            type: "tool-result",
            toolCallId,
            toolName: toolNameMapping.toCustomToolName("tool_search"),
            result: {
              tools: part.tools
            },
            providerMetadata: {
              [providerOptionsName]: {
                itemId: part.id
              }
            }
          });
          break;
        }
        case "local_shell_call": {
          content.push({
            type: "tool-call",
            toolCallId: part.call_id,
            toolName: toolNameMapping.toCustomToolName("local_shell"),
            input: JSON.stringify({
              action: part.action
            }),
            providerMetadata: {
              [providerOptionsName]: {
                itemId: part.id
              }
            }
          });
          break;
        }
        case "shell_call": {
          content.push({
            type: "tool-call",
            toolCallId: part.call_id,
            toolName: toolNameMapping.toCustomToolName("shell"),
            input: JSON.stringify({
              action: {
                commands: part.action.commands
              }
            }),
            ...isShellProviderExecuted && { providerExecuted: true },
            providerMetadata: {
              [providerOptionsName]: {
                itemId: part.id
              }
            }
          });
          break;
        }
        case "shell_call_output": {
          content.push({
            type: "tool-result",
            toolCallId: part.call_id,
            toolName: toolNameMapping.toCustomToolName("shell"),
            result: {
              output: part.output.map((item) => ({
                stdout: item.stdout,
                stderr: item.stderr,
                outcome: item.outcome.type === "exit" ? {
                  type: "exit",
                  exitCode: item.outcome.exit_code
                } : { type: "timeout" }
              }))
            }
          });
          break;
        }
        case "message": {
          for (const contentPart of part.content) {
            if (((_f = (_e = options.providerOptions) == null ? void 0 : _e[providerOptionsName]) == null ? void 0 : _f.logprobs) && contentPart.logprobs) {
              logprobs.push(contentPart.logprobs);
            }
            const providerMetadata2 = {
              itemId: part.id,
              ...part.phase != null && { phase: part.phase },
              ...contentPart.annotations.length > 0 && {
                annotations: contentPart.annotations
              }
            };
            content.push({
              type: "text",
              text: contentPart.text,
              providerMetadata: {
                [providerOptionsName]: providerMetadata2
              }
            });
            for (const annotation of contentPart.annotations) {
              if (annotation.type === "url_citation") {
                content.push({
                  type: "source",
                  sourceType: "url",
                  id: (_i = (_h = (_g = this.config).generateId) == null ? void 0 : _h.call(_g)) != null ? _i : generateId2(),
                  url: annotation.url,
                  title: annotation.title
                });
              } else if (annotation.type === "file_citation") {
                content.push({
                  type: "source",
                  sourceType: "document",
                  id: (_l = (_k = (_j = this.config).generateId) == null ? void 0 : _k.call(_j)) != null ? _l : generateId2(),
                  mediaType: "text/plain",
                  title: annotation.filename,
                  filename: annotation.filename,
                  providerMetadata: {
                    [providerOptionsName]: {
                      type: annotation.type,
                      fileId: annotation.file_id,
                      index: annotation.index
                    }
                  }
                });
              } else if (annotation.type === "container_file_citation") {
                content.push({
                  type: "source",
                  sourceType: "document",
                  id: (_o = (_n = (_m = this.config).generateId) == null ? void 0 : _n.call(_m)) != null ? _o : generateId2(),
                  mediaType: "text/plain",
                  title: annotation.filename,
                  filename: annotation.filename,
                  providerMetadata: {
                    [providerOptionsName]: {
                      type: annotation.type,
                      fileId: annotation.file_id,
                      containerId: annotation.container_id
                    }
                  }
                });
              } else if (annotation.type === "file_path") {
                content.push({
                  type: "source",
                  sourceType: "document",
                  id: (_r = (_q = (_p = this.config).generateId) == null ? void 0 : _q.call(_p)) != null ? _r : generateId2(),
                  mediaType: "application/octet-stream",
                  title: annotation.file_id,
                  filename: annotation.file_id,
                  providerMetadata: {
                    [providerOptionsName]: {
                      type: annotation.type,
                      fileId: annotation.file_id,
                      index: annotation.index
                    }
                  }
                });
              }
            }
          }
          break;
        }
        case "function_call": {
          hasFunctionCall = true;
          content.push({
            type: "tool-call",
            toolCallId: part.call_id,
            toolName: part.name,
            input: part.arguments,
            providerMetadata: {
              [providerOptionsName]: {
                itemId: part.id
              }
            }
          });
          break;
        }
        case "custom_tool_call": {
          hasFunctionCall = true;
          const toolName = toolNameMapping.toCustomToolName(part.name);
          content.push({
            type: "tool-call",
            toolCallId: part.call_id,
            toolName,
            input: JSON.stringify(part.input),
            providerMetadata: {
              [providerOptionsName]: {
                itemId: part.id
              }
            }
          });
          break;
        }
        case "web_search_call": {
          content.push({
            type: "tool-call",
            toolCallId: part.id,
            toolName: toolNameMapping.toCustomToolName(
              webSearchToolName != null ? webSearchToolName : "web_search"
            ),
            input: JSON.stringify({}),
            providerExecuted: true
          });
          content.push({
            type: "tool-result",
            toolCallId: part.id,
            toolName: toolNameMapping.toCustomToolName(
              webSearchToolName != null ? webSearchToolName : "web_search"
            ),
            result: mapWebSearchOutput(part.action)
          });
          break;
        }
        case "mcp_call": {
          const toolCallId = part.approval_request_id != null ? (_s = approvalRequestIdToDummyToolCallIdFromPrompt[part.approval_request_id]) != null ? _s : part.id : part.id;
          const toolName = `mcp.${part.name}`;
          content.push({
            type: "tool-call",
            toolCallId,
            toolName,
            input: part.arguments,
            providerExecuted: true,
            dynamic: true
          });
          content.push({
            type: "tool-result",
            toolCallId,
            toolName,
            result: {
              type: "call",
              serverLabel: part.server_label,
              name: part.name,
              arguments: part.arguments,
              ...part.output != null ? { output: part.output } : {},
              ...part.error != null ? { error: part.error } : {}
            },
            providerMetadata: {
              [providerOptionsName]: {
                itemId: part.id
              }
            }
          });
          break;
        }
        case "mcp_list_tools": {
          break;
        }
        case "mcp_approval_request": {
          const approvalRequestId = (_t = part.approval_request_id) != null ? _t : part.id;
          const dummyToolCallId = (_w = (_v = (_u = this.config).generateId) == null ? void 0 : _v.call(_u)) != null ? _w : generateId2();
          const toolName = `mcp.${part.name}`;
          content.push({
            type: "tool-call",
            toolCallId: dummyToolCallId,
            toolName,
            input: part.arguments,
            providerExecuted: true,
            dynamic: true
          });
          content.push({
            type: "tool-approval-request",
            approvalId: approvalRequestId,
            toolCallId: dummyToolCallId
          });
          break;
        }
        case "computer_call": {
          content.push({
            type: "tool-call",
            toolCallId: part.id,
            toolName: toolNameMapping.toCustomToolName("computer_use"),
            input: "",
            providerExecuted: true
          });
          content.push({
            type: "tool-result",
            toolCallId: part.id,
            toolName: toolNameMapping.toCustomToolName("computer_use"),
            result: {
              type: "computer_use_tool_result",
              status: part.status || "completed"
            }
          });
          break;
        }
        case "file_search_call": {
          content.push({
            type: "tool-call",
            toolCallId: part.id,
            toolName: toolNameMapping.toCustomToolName("file_search"),
            input: "{}",
            providerExecuted: true
          });
          content.push({
            type: "tool-result",
            toolCallId: part.id,
            toolName: toolNameMapping.toCustomToolName("file_search"),
            result: {
              queries: part.queries,
              results: (_y = (_x = part.results) == null ? void 0 : _x.map((result) => ({
                attributes: result.attributes,
                fileId: result.file_id,
                filename: result.filename,
                score: result.score,
                text: result.text
              }))) != null ? _y : null
            }
          });
          break;
        }
        case "code_interpreter_call": {
          content.push({
            type: "tool-call",
            toolCallId: part.id,
            toolName: toolNameMapping.toCustomToolName("code_interpreter"),
            input: JSON.stringify({
              code: part.code,
              containerId: part.container_id
            }),
            providerExecuted: true
          });
          content.push({
            type: "tool-result",
            toolCallId: part.id,
            toolName: toolNameMapping.toCustomToolName("code_interpreter"),
            result: {
              outputs: part.outputs
            }
          });
          break;
        }
        case "apply_patch_call": {
          content.push({
            type: "tool-call",
            toolCallId: part.call_id,
            toolName: toolNameMapping.toCustomToolName("apply_patch"),
            input: JSON.stringify({
              callId: part.call_id,
              operation: part.operation
            }),
            providerMetadata: {
              [providerOptionsName]: {
                itemId: part.id
              }
            }
          });
          break;
        }
      }
    }
    const providerMetadata = {
      [providerOptionsName]: {
        responseId: response.id,
        ...logprobs.length > 0 ? { logprobs } : {},
        ...typeof response.service_tier === "string" ? { serviceTier: response.service_tier } : {}
      }
    };
    const usage = response.usage;
    return {
      content,
      finishReason: {
        unified: mapOpenAIResponseFinishReason({
          finishReason: (_z = response.incomplete_details) == null ? void 0 : _z.reason,
          hasFunctionCall
        }),
        raw: (_B = (_A = response.incomplete_details) == null ? void 0 : _A.reason) != null ? _B : void 0
      },
      usage: convertOpenAIResponsesUsage(usage),
      request: { body },
      response: {
        id: response.id,
        timestamp: new Date(response.created_at * 1e3),
        modelId: response.model,
        headers: responseHeaders,
        body: rawResponse
      },
      providerMetadata,
      warnings
    };
  }
  async doStream(options) {
    const {
      args: body,
      warnings,
      webSearchToolName,
      toolNameMapping,
      store,
      providerOptionsName,
      isShellProviderExecuted
    } = await this.getArgs(options);
    const { responseHeaders, value: response } = await postJsonToApi5({
      url: this.config.url({
        path: "/responses",
        modelId: this.modelId
      }),
      headers: combineHeaders5(this.config.headers(), options.headers),
      body: {
        ...body,
        stream: true
      },
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler3(
        openaiResponsesChunkSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const self = this;
    const approvalRequestIdToDummyToolCallIdFromPrompt = extractApprovalRequestIdToToolCallIdMapping(options.prompt);
    const approvalRequestIdToDummyToolCallIdFromStream = /* @__PURE__ */ new Map();
    let finishReason = {
      unified: "other",
      raw: void 0
    };
    let usage = void 0;
    const logprobs = [];
    let responseId = null;
    const ongoingToolCalls = {};
    const ongoingAnnotations = [];
    let activeMessagePhase;
    let hasFunctionCall = false;
    const activeReasoning = {};
    let serviceTier;
    const hostedToolSearchCallIds = [];
    return {
      stream: response.pipeThrough(
        new TransformStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings });
          },
          transform(chunk, controller) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L;
            if (options.includeRawChunks) {
              controller.enqueue({ type: "raw", rawValue: chunk.rawValue });
            }
            if (!chunk.success) {
              finishReason = { unified: "error", raw: void 0 };
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }
            const value = chunk.value;
            if (isResponseOutputItemAddedChunk(value)) {
              if (value.item.type === "function_call") {
                ongoingToolCalls[value.output_index] = {
                  toolName: value.item.name,
                  toolCallId: value.item.call_id
                };
                controller.enqueue({
                  type: "tool-input-start",
                  id: value.item.call_id,
                  toolName: value.item.name
                });
              } else if (value.item.type === "custom_tool_call") {
                const toolName = toolNameMapping.toCustomToolName(
                  value.item.name
                );
                ongoingToolCalls[value.output_index] = {
                  toolName,
                  toolCallId: value.item.call_id
                };
                controller.enqueue({
                  type: "tool-input-start",
                  id: value.item.call_id,
                  toolName
                });
              } else if (value.item.type === "web_search_call") {
                ongoingToolCalls[value.output_index] = {
                  toolName: toolNameMapping.toCustomToolName(
                    webSearchToolName != null ? webSearchToolName : "web_search"
                  ),
                  toolCallId: value.item.id
                };
                controller.enqueue({
                  type: "tool-input-start",
                  id: value.item.id,
                  toolName: toolNameMapping.toCustomToolName(
                    webSearchToolName != null ? webSearchToolName : "web_search"
                  ),
                  providerExecuted: true
                });
                controller.enqueue({
                  type: "tool-input-end",
                  id: value.item.id
                });
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: value.item.id,
                  toolName: toolNameMapping.toCustomToolName(
                    webSearchToolName != null ? webSearchToolName : "web_search"
                  ),
                  input: JSON.stringify({}),
                  providerExecuted: true
                });
              } else if (value.item.type === "computer_call") {
                ongoingToolCalls[value.output_index] = {
                  toolName: toolNameMapping.toCustomToolName("computer_use"),
                  toolCallId: value.item.id
                };
                controller.enqueue({
                  type: "tool-input-start",
                  id: value.item.id,
                  toolName: toolNameMapping.toCustomToolName("computer_use"),
                  providerExecuted: true
                });
              } else if (value.item.type === "code_interpreter_call") {
                ongoingToolCalls[value.output_index] = {
                  toolName: toolNameMapping.toCustomToolName("code_interpreter"),
                  toolCallId: value.item.id,
                  codeInterpreter: {
                    containerId: value.item.container_id
                  }
                };
                controller.enqueue({
                  type: "tool-input-start",
                  id: value.item.id,
                  toolName: toolNameMapping.toCustomToolName("code_interpreter"),
                  providerExecuted: true
                });
                controller.enqueue({
                  type: "tool-input-delta",
                  id: value.item.id,
                  delta: `{"containerId":"${value.item.container_id}","code":"`
                });
              } else if (value.item.type === "file_search_call") {
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: value.item.id,
                  toolName: toolNameMapping.toCustomToolName("file_search"),
                  input: "{}",
                  providerExecuted: true
                });
              } else if (value.item.type === "image_generation_call") {
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: value.item.id,
                  toolName: toolNameMapping.toCustomToolName("image_generation"),
                  input: "{}",
                  providerExecuted: true
                });
              } else if (value.item.type === "tool_search_call") {
                const toolCallId = value.item.id;
                const toolName = toolNameMapping.toCustomToolName("tool_search");
                const isHosted = value.item.execution === "server";
                ongoingToolCalls[value.output_index] = {
                  toolName,
                  toolCallId,
                  toolSearchExecution: (_a = value.item.execution) != null ? _a : "server"
                };
                if (isHosted) {
                  controller.enqueue({
                    type: "tool-input-start",
                    id: toolCallId,
                    toolName,
                    providerExecuted: true
                  });
                }
              } else if (value.item.type === "tool_search_output") {
              } else if (value.item.type === "mcp_call" || value.item.type === "mcp_list_tools" || value.item.type === "mcp_approval_request") {
              } else if (value.item.type === "apply_patch_call") {
                const { call_id: callId, operation } = value.item;
                ongoingToolCalls[value.output_index] = {
                  toolName: toolNameMapping.toCustomToolName("apply_patch"),
                  toolCallId: callId,
                  applyPatch: {
                    // delete_file doesn't have diff
                    hasDiff: operation.type === "delete_file",
                    endEmitted: operation.type === "delete_file"
                  }
                };
                controller.enqueue({
                  type: "tool-input-start",
                  id: callId,
                  toolName: toolNameMapping.toCustomToolName("apply_patch")
                });
                if (operation.type === "delete_file") {
                  const inputString = JSON.stringify({
                    callId,
                    operation
                  });
                  controller.enqueue({
                    type: "tool-input-delta",
                    id: callId,
                    delta: inputString
                  });
                  controller.enqueue({
                    type: "tool-input-end",
                    id: callId
                  });
                } else {
                  controller.enqueue({
                    type: "tool-input-delta",
                    id: callId,
                    delta: `{"callId":"${escapeJSONDelta(callId)}","operation":{"type":"${escapeJSONDelta(operation.type)}","path":"${escapeJSONDelta(operation.path)}","diff":"`
                  });
                }
              } else if (value.item.type === "shell_call") {
                ongoingToolCalls[value.output_index] = {
                  toolName: toolNameMapping.toCustomToolName("shell"),
                  toolCallId: value.item.call_id
                };
              } else if (value.item.type === "shell_call_output") {
              } else if (value.item.type === "message") {
                ongoingAnnotations.splice(0, ongoingAnnotations.length);
                activeMessagePhase = (_b = value.item.phase) != null ? _b : void 0;
                controller.enqueue({
                  type: "text-start",
                  id: value.item.id,
                  providerMetadata: {
                    [providerOptionsName]: {
                      itemId: value.item.id,
                      ...value.item.phase != null && {
                        phase: value.item.phase
                      }
                    }
                  }
                });
              } else if (isResponseOutputItemAddedChunk(value) && value.item.type === "reasoning") {
                activeReasoning[value.item.id] = {
                  encryptedContent: value.item.encrypted_content,
                  summaryParts: { 0: "active" }
                };
                controller.enqueue({
                  type: "reasoning-start",
                  id: `${value.item.id}:0`,
                  providerMetadata: {
                    [providerOptionsName]: {
                      itemId: value.item.id,
                      reasoningEncryptedContent: (_c = value.item.encrypted_content) != null ? _c : null
                    }
                  }
                });
              }
            } else if (isResponseOutputItemDoneChunk(value)) {
              if (value.item.type === "message") {
                const phase = (_d = value.item.phase) != null ? _d : activeMessagePhase;
                activeMessagePhase = void 0;
                controller.enqueue({
                  type: "text-end",
                  id: value.item.id,
                  providerMetadata: {
                    [providerOptionsName]: {
                      itemId: value.item.id,
                      ...phase != null && { phase },
                      ...ongoingAnnotations.length > 0 && {
                        annotations: ongoingAnnotations
                      }
                    }
                  }
                });
              } else if (value.item.type === "function_call") {
                ongoingToolCalls[value.output_index] = void 0;
                hasFunctionCall = true;
                controller.enqueue({
                  type: "tool-input-end",
                  id: value.item.call_id
                });
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: value.item.call_id,
                  toolName: value.item.name,
                  input: value.item.arguments,
                  providerMetadata: {
                    [providerOptionsName]: {
                      itemId: value.item.id
                    }
                  }
                });
              } else if (value.item.type === "custom_tool_call") {
                ongoingToolCalls[value.output_index] = void 0;
                hasFunctionCall = true;
                const toolName = toolNameMapping.toCustomToolName(
                  value.item.name
                );
                controller.enqueue({
                  type: "tool-input-end",
                  id: value.item.call_id
                });
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: value.item.call_id,
                  toolName,
                  input: JSON.stringify(value.item.input),
                  providerMetadata: {
                    [providerOptionsName]: {
                      itemId: value.item.id
                    }
                  }
                });
              } else if (value.item.type === "web_search_call") {
                ongoingToolCalls[value.output_index] = void 0;
                controller.enqueue({
                  type: "tool-result",
                  toolCallId: value.item.id,
                  toolName: toolNameMapping.toCustomToolName(
                    webSearchToolName != null ? webSearchToolName : "web_search"
                  ),
                  result: mapWebSearchOutput(value.item.action)
                });
              } else if (value.item.type === "computer_call") {
                ongoingToolCalls[value.output_index] = void 0;
                controller.enqueue({
                  type: "tool-input-end",
                  id: value.item.id
                });
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: value.item.id,
                  toolName: toolNameMapping.toCustomToolName("computer_use"),
                  input: "",
                  providerExecuted: true
                });
                controller.enqueue({
                  type: "tool-result",
                  toolCallId: value.item.id,
                  toolName: toolNameMapping.toCustomToolName("computer_use"),
                  result: {
                    type: "computer_use_tool_result",
                    status: value.item.status || "completed"
                  }
                });
              } else if (value.item.type === "file_search_call") {
                ongoingToolCalls[value.output_index] = void 0;
                controller.enqueue({
                  type: "tool-result",
                  toolCallId: value.item.id,
                  toolName: toolNameMapping.toCustomToolName("file_search"),
                  result: {
                    queries: value.item.queries,
                    results: (_f = (_e = value.item.results) == null ? void 0 : _e.map((result) => ({
                      attributes: result.attributes,
                      fileId: result.file_id,
                      filename: result.filename,
                      score: result.score,
                      text: result.text
                    }))) != null ? _f : null
                  }
                });
              } else if (value.item.type === "code_interpreter_call") {
                ongoingToolCalls[value.output_index] = void 0;
                controller.enqueue({
                  type: "tool-result",
                  toolCallId: value.item.id,
                  toolName: toolNameMapping.toCustomToolName("code_interpreter"),
                  result: {
                    outputs: value.item.outputs
                  }
                });
              } else if (value.item.type === "image_generation_call") {
                controller.enqueue({
                  type: "tool-result",
                  toolCallId: value.item.id,
                  toolName: toolNameMapping.toCustomToolName("image_generation"),
                  result: {
                    result: value.item.result
                  }
                });
              } else if (value.item.type === "tool_search_call") {
                const toolCall = ongoingToolCalls[value.output_index];
                const isHosted = value.item.execution === "server";
                if (toolCall != null) {
                  const toolCallId = isHosted ? toolCall.toolCallId : (_g = value.item.call_id) != null ? _g : value.item.id;
                  if (isHosted) {
                    hostedToolSearchCallIds.push(toolCallId);
                  } else {
                    controller.enqueue({
                      type: "tool-input-start",
                      id: toolCallId,
                      toolName: toolCall.toolName
                    });
                  }
                  controller.enqueue({
                    type: "tool-input-end",
                    id: toolCallId
                  });
                  controller.enqueue({
                    type: "tool-call",
                    toolCallId,
                    toolName: toolCall.toolName,
                    input: JSON.stringify({
                      arguments: value.item.arguments,
                      call_id: isHosted ? null : toolCallId
                    }),
                    ...isHosted ? { providerExecuted: true } : {},
                    providerMetadata: {
                      [providerOptionsName]: {
                        itemId: value.item.id
                      }
                    }
                  });
                }
                ongoingToolCalls[value.output_index] = void 0;
              } else if (value.item.type === "tool_search_output") {
                const toolCallId = (_i = (_h = value.item.call_id) != null ? _h : hostedToolSearchCallIds.shift()) != null ? _i : value.item.id;
                controller.enqueue({
                  type: "tool-result",
                  toolCallId,
                  toolName: toolNameMapping.toCustomToolName("tool_search"),
                  result: {
                    tools: value.item.tools
                  },
                  providerMetadata: {
                    [providerOptionsName]: {
                      itemId: value.item.id
                    }
                  }
                });
              } else if (value.item.type === "mcp_call") {
                ongoingToolCalls[value.output_index] = void 0;
                const approvalRequestId = (_j = value.item.approval_request_id) != null ? _j : void 0;
                const aliasedToolCallId = approvalRequestId != null ? (_l = (_k = approvalRequestIdToDummyToolCallIdFromStream.get(
                  approvalRequestId
                )) != null ? _k : approvalRequestIdToDummyToolCallIdFromPrompt[approvalRequestId]) != null ? _l : value.item.id : value.item.id;
                const toolName = `mcp.${value.item.name}`;
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: aliasedToolCallId,
                  toolName,
                  input: value.item.arguments,
                  providerExecuted: true,
                  dynamic: true
                });
                controller.enqueue({
                  type: "tool-result",
                  toolCallId: aliasedToolCallId,
                  toolName,
                  result: {
                    type: "call",
                    serverLabel: value.item.server_label,
                    name: value.item.name,
                    arguments: value.item.arguments,
                    ...value.item.output != null ? { output: value.item.output } : {},
                    ...value.item.error != null ? { error: value.item.error } : {}
                  },
                  providerMetadata: {
                    [providerOptionsName]: {
                      itemId: value.item.id
                    }
                  }
                });
              } else if (value.item.type === "mcp_list_tools") {
                ongoingToolCalls[value.output_index] = void 0;
              } else if (value.item.type === "apply_patch_call") {
                const toolCall = ongoingToolCalls[value.output_index];
                if ((toolCall == null ? void 0 : toolCall.applyPatch) && !toolCall.applyPatch.endEmitted && value.item.operation.type !== "delete_file") {
                  if (!toolCall.applyPatch.hasDiff) {
                    controller.enqueue({
                      type: "tool-input-delta",
                      id: toolCall.toolCallId,
                      delta: escapeJSONDelta(value.item.operation.diff)
                    });
                  }
                  controller.enqueue({
                    type: "tool-input-delta",
                    id: toolCall.toolCallId,
                    delta: '"}}'
                  });
                  controller.enqueue({
                    type: "tool-input-end",
                    id: toolCall.toolCallId
                  });
                  toolCall.applyPatch.endEmitted = true;
                }
                if (toolCall && value.item.status === "completed") {
                  controller.enqueue({
                    type: "tool-call",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolNameMapping.toCustomToolName("apply_patch"),
                    input: JSON.stringify({
                      callId: value.item.call_id,
                      operation: value.item.operation
                    }),
                    providerMetadata: {
                      [providerOptionsName]: {
                        itemId: value.item.id
                      }
                    }
                  });
                }
                ongoingToolCalls[value.output_index] = void 0;
              } else if (value.item.type === "mcp_approval_request") {
                ongoingToolCalls[value.output_index] = void 0;
                const dummyToolCallId = (_o = (_n = (_m = self.config).generateId) == null ? void 0 : _n.call(_m)) != null ? _o : generateId2();
                const approvalRequestId = (_p = value.item.approval_request_id) != null ? _p : value.item.id;
                approvalRequestIdToDummyToolCallIdFromStream.set(
                  approvalRequestId,
                  dummyToolCallId
                );
                const toolName = `mcp.${value.item.name}`;
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: dummyToolCallId,
                  toolName,
                  input: value.item.arguments,
                  providerExecuted: true,
                  dynamic: true
                });
                controller.enqueue({
                  type: "tool-approval-request",
                  approvalId: approvalRequestId,
                  toolCallId: dummyToolCallId
                });
              } else if (value.item.type === "local_shell_call") {
                ongoingToolCalls[value.output_index] = void 0;
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: value.item.call_id,
                  toolName: toolNameMapping.toCustomToolName("local_shell"),
                  input: JSON.stringify({
                    action: {
                      type: "exec",
                      command: value.item.action.command,
                      timeoutMs: value.item.action.timeout_ms,
                      user: value.item.action.user,
                      workingDirectory: value.item.action.working_directory,
                      env: value.item.action.env
                    }
                  }),
                  providerMetadata: {
                    [providerOptionsName]: { itemId: value.item.id }
                  }
                });
              } else if (value.item.type === "shell_call") {
                ongoingToolCalls[value.output_index] = void 0;
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: value.item.call_id,
                  toolName: toolNameMapping.toCustomToolName("shell"),
                  input: JSON.stringify({
                    action: {
                      commands: value.item.action.commands
                    }
                  }),
                  ...isShellProviderExecuted && {
                    providerExecuted: true
                  },
                  providerMetadata: {
                    [providerOptionsName]: { itemId: value.item.id }
                  }
                });
              } else if (value.item.type === "shell_call_output") {
                controller.enqueue({
                  type: "tool-result",
                  toolCallId: value.item.call_id,
                  toolName: toolNameMapping.toCustomToolName("shell"),
                  result: {
                    output: value.item.output.map(
                      (item) => ({
                        stdout: item.stdout,
                        stderr: item.stderr,
                        outcome: item.outcome.type === "exit" ? {
                          type: "exit",
                          exitCode: item.outcome.exit_code
                        } : { type: "timeout" }
                      })
                    )
                  }
                });
              } else if (value.item.type === "reasoning") {
                const activeReasoningPart = activeReasoning[value.item.id];
                const summaryPartIndices = Object.entries(
                  activeReasoningPart.summaryParts
                ).filter(
                  ([_, status]) => status === "active" || status === "can-conclude"
                ).map(([summaryIndex]) => summaryIndex);
                for (const summaryIndex of summaryPartIndices) {
                  controller.enqueue({
                    type: "reasoning-end",
                    id: `${value.item.id}:${summaryIndex}`,
                    providerMetadata: {
                      [providerOptionsName]: {
                        itemId: value.item.id,
                        reasoningEncryptedContent: (_q = value.item.encrypted_content) != null ? _q : null
                      }
                    }
                  });
                }
                delete activeReasoning[value.item.id];
              }
            } else if (isResponseFunctionCallArgumentsDeltaChunk(value)) {
              const toolCall = ongoingToolCalls[value.output_index];
              if (toolCall != null) {
                controller.enqueue({
                  type: "tool-input-delta",
                  id: toolCall.toolCallId,
                  delta: value.delta
                });
              }
            } else if (isResponseCustomToolCallInputDeltaChunk(value)) {
              const toolCall = ongoingToolCalls[value.output_index];
              if (toolCall != null) {
                controller.enqueue({
                  type: "tool-input-delta",
                  id: toolCall.toolCallId,
                  delta: value.delta
                });
              }
            } else if (isResponseApplyPatchCallOperationDiffDeltaChunk(value)) {
              const toolCall = ongoingToolCalls[value.output_index];
              if (toolCall == null ? void 0 : toolCall.applyPatch) {
                controller.enqueue({
                  type: "tool-input-delta",
                  id: toolCall.toolCallId,
                  delta: escapeJSONDelta(value.delta)
                });
                toolCall.applyPatch.hasDiff = true;
              }
            } else if (isResponseApplyPatchCallOperationDiffDoneChunk(value)) {
              const toolCall = ongoingToolCalls[value.output_index];
              if ((toolCall == null ? void 0 : toolCall.applyPatch) && !toolCall.applyPatch.endEmitted) {
                if (!toolCall.applyPatch.hasDiff) {
                  controller.enqueue({
                    type: "tool-input-delta",
                    id: toolCall.toolCallId,
                    delta: escapeJSONDelta(value.diff)
                  });
                  toolCall.applyPatch.hasDiff = true;
                }
                controller.enqueue({
                  type: "tool-input-delta",
                  id: toolCall.toolCallId,
                  delta: '"}}'
                });
                controller.enqueue({
                  type: "tool-input-end",
                  id: toolCall.toolCallId
                });
                toolCall.applyPatch.endEmitted = true;
              }
            } else if (isResponseImageGenerationCallPartialImageChunk(value)) {
              controller.enqueue({
                type: "tool-result",
                toolCallId: value.item_id,
                toolName: toolNameMapping.toCustomToolName("image_generation"),
                result: {
                  result: value.partial_image_b64
                },
                preliminary: true
              });
            } else if (isResponseCodeInterpreterCallCodeDeltaChunk(value)) {
              const toolCall = ongoingToolCalls[value.output_index];
              if (toolCall != null) {
                controller.enqueue({
                  type: "tool-input-delta",
                  id: toolCall.toolCallId,
                  delta: escapeJSONDelta(value.delta)
                });
              }
            } else if (isResponseCodeInterpreterCallCodeDoneChunk(value)) {
              const toolCall = ongoingToolCalls[value.output_index];
              if (toolCall != null) {
                controller.enqueue({
                  type: "tool-input-delta",
                  id: toolCall.toolCallId,
                  delta: '"}'
                });
                controller.enqueue({
                  type: "tool-input-end",
                  id: toolCall.toolCallId
                });
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: toolCall.toolCallId,
                  toolName: toolNameMapping.toCustomToolName("code_interpreter"),
                  input: JSON.stringify({
                    code: value.code,
                    containerId: toolCall.codeInterpreter.containerId
                  }),
                  providerExecuted: true
                });
              }
            } else if (isResponseCreatedChunk(value)) {
              responseId = value.response.id;
              controller.enqueue({
                type: "response-metadata",
                id: value.response.id,
                timestamp: new Date(value.response.created_at * 1e3),
                modelId: value.response.model
              });
            } else if (isTextDeltaChunk(value)) {
              controller.enqueue({
                type: "text-delta",
                id: value.item_id,
                delta: value.delta
              });
              if (((_s = (_r = options.providerOptions) == null ? void 0 : _r[providerOptionsName]) == null ? void 0 : _s.logprobs) && value.logprobs) {
                logprobs.push(value.logprobs);
              }
            } else if (value.type === "response.reasoning_summary_part.added") {
              if (value.summary_index > 0) {
                const activeReasoningPart = activeReasoning[value.item_id];
                activeReasoningPart.summaryParts[value.summary_index] = "active";
                for (const summaryIndex of Object.keys(
                  activeReasoningPart.summaryParts
                )) {
                  if (activeReasoningPart.summaryParts[summaryIndex] === "can-conclude") {
                    controller.enqueue({
                      type: "reasoning-end",
                      id: `${value.item_id}:${summaryIndex}`,
                      providerMetadata: {
                        [providerOptionsName]: {
                          itemId: value.item_id
                        }
                      }
                    });
                    activeReasoningPart.summaryParts[summaryIndex] = "concluded";
                  }
                }
                controller.enqueue({
                  type: "reasoning-start",
                  id: `${value.item_id}:${value.summary_index}`,
                  providerMetadata: {
                    [providerOptionsName]: {
                      itemId: value.item_id,
                      reasoningEncryptedContent: (_u = (_t = activeReasoning[value.item_id]) == null ? void 0 : _t.encryptedContent) != null ? _u : null
                    }
                  }
                });
              }
            } else if (value.type === "response.reasoning_summary_text.delta") {
              controller.enqueue({
                type: "reasoning-delta",
                id: `${value.item_id}:${value.summary_index}`,
                delta: value.delta,
                providerMetadata: {
                  [providerOptionsName]: {
                    itemId: value.item_id
                  }
                }
              });
            } else if (value.type === "response.reasoning_summary_part.done") {
              if (store) {
                controller.enqueue({
                  type: "reasoning-end",
                  id: `${value.item_id}:${value.summary_index}`,
                  providerMetadata: {
                    [providerOptionsName]: {
                      itemId: value.item_id
                    }
                  }
                });
                activeReasoning[value.item_id].summaryParts[value.summary_index] = "concluded";
              } else {
                activeReasoning[value.item_id].summaryParts[value.summary_index] = "can-conclude";
              }
            } else if (isResponseFinishedChunk(value)) {
              finishReason = {
                unified: mapOpenAIResponseFinishReason({
                  finishReason: (_v = value.response.incomplete_details) == null ? void 0 : _v.reason,
                  hasFunctionCall
                }),
                raw: (_x = (_w = value.response.incomplete_details) == null ? void 0 : _w.reason) != null ? _x : void 0
              };
              usage = value.response.usage;
              if (typeof value.response.service_tier === "string") {
                serviceTier = value.response.service_tier;
              }
            } else if (isResponseFailedChunk(value)) {
              const incompleteReason = (_y = value.response.incomplete_details) == null ? void 0 : _y.reason;
              finishReason = {
                unified: incompleteReason ? mapOpenAIResponseFinishReason({
                  finishReason: incompleteReason,
                  hasFunctionCall
                }) : "error",
                raw: incompleteReason != null ? incompleteReason : "error"
              };
              usage = (_z = value.response.usage) != null ? _z : void 0;
            } else if (isResponseAnnotationAddedChunk(value)) {
              ongoingAnnotations.push(value.annotation);
              if (value.annotation.type === "url_citation") {
                controller.enqueue({
                  type: "source",
                  sourceType: "url",
                  id: (_C = (_B = (_A = self.config).generateId) == null ? void 0 : _B.call(_A)) != null ? _C : generateId2(),
                  url: value.annotation.url,
                  title: value.annotation.title
                });
              } else if (value.annotation.type === "file_citation") {
                controller.enqueue({
                  type: "source",
                  sourceType: "document",
                  id: (_F = (_E = (_D = self.config).generateId) == null ? void 0 : _E.call(_D)) != null ? _F : generateId2(),
                  mediaType: "text/plain",
                  title: value.annotation.filename,
                  filename: value.annotation.filename,
                  providerMetadata: {
                    [providerOptionsName]: {
                      type: value.annotation.type,
                      fileId: value.annotation.file_id,
                      index: value.annotation.index
                    }
                  }
                });
              } else if (value.annotation.type === "container_file_citation") {
                controller.enqueue({
                  type: "source",
                  sourceType: "document",
                  id: (_I = (_H = (_G = self.config).generateId) == null ? void 0 : _H.call(_G)) != null ? _I : generateId2(),
                  mediaType: "text/plain",
                  title: value.annotation.filename,
                  filename: value.annotation.filename,
                  providerMetadata: {
                    [providerOptionsName]: {
                      type: value.annotation.type,
                      fileId: value.annotation.file_id,
                      containerId: value.annotation.container_id
                    }
                  }
                });
              } else if (value.annotation.type === "file_path") {
                controller.enqueue({
                  type: "source",
                  sourceType: "document",
                  id: (_L = (_K = (_J = self.config).generateId) == null ? void 0 : _K.call(_J)) != null ? _L : generateId2(),
                  mediaType: "application/octet-stream",
                  title: value.annotation.file_id,
                  filename: value.annotation.file_id,
                  providerMetadata: {
                    [providerOptionsName]: {
                      type: value.annotation.type,
                      fileId: value.annotation.file_id,
                      index: value.annotation.index
                    }
                  }
                });
              }
            } else if (isErrorChunk(value)) {
              controller.enqueue({ type: "error", error: value });
            }
          },
          flush(controller) {
            const providerMetadata = {
              [providerOptionsName]: {
                responseId,
                ...logprobs.length > 0 ? { logprobs } : {},
                ...serviceTier !== void 0 ? { serviceTier } : {}
              }
            };
            controller.enqueue({
              type: "finish",
              finishReason,
              usage: convertOpenAIResponsesUsage(usage),
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
function isTextDeltaChunk(chunk) {
  return chunk.type === "response.output_text.delta";
}
function isResponseOutputItemDoneChunk(chunk) {
  return chunk.type === "response.output_item.done";
}
function isResponseFinishedChunk(chunk) {
  return chunk.type === "response.completed" || chunk.type === "response.incomplete";
}
function isResponseFailedChunk(chunk) {
  return chunk.type === "response.failed";
}
function isResponseCreatedChunk(chunk) {
  return chunk.type === "response.created";
}
function isResponseFunctionCallArgumentsDeltaChunk(chunk) {
  return chunk.type === "response.function_call_arguments.delta";
}
function isResponseCustomToolCallInputDeltaChunk(chunk) {
  return chunk.type === "response.custom_tool_call_input.delta";
}
function isResponseImageGenerationCallPartialImageChunk(chunk) {
  return chunk.type === "response.image_generation_call.partial_image";
}
function isResponseCodeInterpreterCallCodeDeltaChunk(chunk) {
  return chunk.type === "response.code_interpreter_call_code.delta";
}
function isResponseCodeInterpreterCallCodeDoneChunk(chunk) {
  return chunk.type === "response.code_interpreter_call_code.done";
}
function isResponseApplyPatchCallOperationDiffDeltaChunk(chunk) {
  return chunk.type === "response.apply_patch_call_operation_diff.delta";
}
function isResponseApplyPatchCallOperationDiffDoneChunk(chunk) {
  return chunk.type === "response.apply_patch_call_operation_diff.done";
}
function isResponseOutputItemAddedChunk(chunk) {
  return chunk.type === "response.output_item.added";
}
function isResponseAnnotationAddedChunk(chunk) {
  return chunk.type === "response.output_text.annotation.added";
}
function isErrorChunk(chunk) {
  return chunk.type === "error";
}
function mapWebSearchOutput(action) {
  var _a;
  if (action == null) {
    return {};
  }
  switch (action.type) {
    case "search":
      return {
        action: { type: "search", query: (_a = action.query) != null ? _a : void 0 },
        // include sources when provided by the Responses API (behind include flag)
        ...action.sources != null && { sources: action.sources }
      };
    case "open_page":
      return { action: { type: "openPage", url: action.url } };
    case "find_in_page":
      return {
        action: {
          type: "findInPage",
          url: action.url,
          pattern: action.pattern
        }
      };
  }
}
function escapeJSONDelta(delta) {
  return JSON.stringify(delta).slice(1, -1);
}

// src/speech/openai-speech-model.ts
import {
  combineHeaders as combineHeaders6,
  createBinaryResponseHandler,
  parseProviderOptions as parseProviderOptions6,
  postJsonToApi as postJsonToApi6
} from "@ai-sdk/provider-utils";

// src/speech/openai-speech-options.ts
import { lazySchema as lazySchema21, zodSchema as zodSchema21 } from "@ai-sdk/provider-utils";
import { z as z23 } from "zod/v4";
var openaiSpeechModelOptionsSchema = lazySchema21(
  () => zodSchema21(
    z23.object({
      instructions: z23.string().nullish(),
      speed: z23.number().min(0.25).max(4).default(1).nullish()
    })
  )
);

// src/speech/openai-speech-model.ts
var OpenAISpeechModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
  }
  get provider() {
    return this.config.provider;
  }
  async getArgs({
    text,
    voice = "alloy",
    outputFormat = "mp3",
    speed,
    instructions,
    language,
    providerOptions
  }) {
    const warnings = [];
    const openAIOptions = await parseProviderOptions6({
      provider: "openai",
      providerOptions,
      schema: openaiSpeechModelOptionsSchema
    });
    const requestBody = {
      model: this.modelId,
      input: text,
      voice,
      response_format: "mp3",
      speed,
      instructions
    };
    if (outputFormat) {
      if (["mp3", "opus", "aac", "flac", "wav", "pcm"].includes(outputFormat)) {
        requestBody.response_format = outputFormat;
      } else {
        warnings.push({
          type: "unsupported",
          feature: "outputFormat",
          details: `Unsupported output format: ${outputFormat}. Using mp3 instead.`
        });
      }
    }
    if (openAIOptions) {
      const speechModelOptions = {};
      for (const key in speechModelOptions) {
        const value = speechModelOptions[key];
        if (value !== void 0) {
          requestBody[key] = value;
        }
      }
    }
    if (language) {
      warnings.push({
        type: "unsupported",
        feature: "language",
        details: `OpenAI speech models do not support language selection. Language parameter "${language}" was ignored.`
      });
    }
    return {
      requestBody,
      warnings
    };
  }
  async doGenerate(options) {
    var _a, _b, _c;
    const currentDate = (_c = (_b = (_a = this.config._internal) == null ? void 0 : _a.currentDate) == null ? void 0 : _b.call(_a)) != null ? _c : /* @__PURE__ */ new Date();
    const { requestBody, warnings } = await this.getArgs(options);
    const {
      value: audio,
      responseHeaders,
      rawValue: rawResponse
    } = await postJsonToApi6({
      url: this.config.url({
        path: "/audio/speech",
        modelId: this.modelId
      }),
      headers: combineHeaders6(this.config.headers(), options.headers),
      body: requestBody,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createBinaryResponseHandler(),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    return {
      audio,
      warnings,
      request: {
        body: JSON.stringify(requestBody)
      },
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
        body: rawResponse
      }
    };
  }
};

// src/transcription/openai-transcription-model.ts
import {
  combineHeaders as combineHeaders7,
  convertBase64ToUint8Array as convertBase64ToUint8Array2,
  createJsonResponseHandler as createJsonResponseHandler6,
  mediaTypeToExtension,
  parseProviderOptions as parseProviderOptions7,
  postFormDataToApi as postFormDataToApi2
} from "@ai-sdk/provider-utils";

// src/transcription/openai-transcription-api.ts
import { lazySchema as lazySchema22, zodSchema as zodSchema22 } from "@ai-sdk/provider-utils";
import { z as z24 } from "zod/v4";
var openaiTranscriptionResponseSchema = lazySchema22(
  () => zodSchema22(
    z24.object({
      text: z24.string(),
      language: z24.string().nullish(),
      duration: z24.number().nullish(),
      words: z24.array(
        z24.object({
          word: z24.string(),
          start: z24.number(),
          end: z24.number()
        })
      ).nullish(),
      segments: z24.array(
        z24.object({
          id: z24.number(),
          seek: z24.number(),
          start: z24.number(),
          end: z24.number(),
          text: z24.string(),
          tokens: z24.array(z24.number()),
          temperature: z24.number(),
          avg_logprob: z24.number(),
          compression_ratio: z24.number(),
          no_speech_prob: z24.number()
        })
      ).nullish()
    })
  )
);

// src/transcription/openai-transcription-options.ts
import { lazySchema as lazySchema23, zodSchema as zodSchema23 } from "@ai-sdk/provider-utils";
import { z as z25 } from "zod/v4";
var openAITranscriptionModelOptions = lazySchema23(
  () => zodSchema23(
    z25.object({
      /**
       * Additional information to include in the transcription response.
       */
      include: z25.array(z25.string()).optional(),
      /**
       * The language of the input audio in ISO-639-1 format.
       */
      language: z25.string().optional(),
      /**
       * An optional text to guide the model's style or continue a previous audio segment.
       */
      prompt: z25.string().optional(),
      /**
       * The sampling temperature, between 0 and 1.
       * @default 0
       */
      temperature: z25.number().min(0).max(1).default(0).optional(),
      /**
       * The timestamp granularities to populate for this transcription.
       * @default ['segment']
       */
      timestampGranularities: z25.array(z25.enum(["word", "segment"])).default(["segment"]).optional()
    })
  )
);

// src/transcription/openai-transcription-model.ts
var languageMap = {
  afrikaans: "af",
  arabic: "ar",
  armenian: "hy",
  azerbaijani: "az",
  belarusian: "be",
  bosnian: "bs",
  bulgarian: "bg",
  catalan: "ca",
  chinese: "zh",
  croatian: "hr",
  czech: "cs",
  danish: "da",
  dutch: "nl",
  english: "en",
  estonian: "et",
  finnish: "fi",
  french: "fr",
  galician: "gl",
  german: "de",
  greek: "el",
  hebrew: "he",
  hindi: "hi",
  hungarian: "hu",
  icelandic: "is",
  indonesian: "id",
  italian: "it",
  japanese: "ja",
  kannada: "kn",
  kazakh: "kk",
  korean: "ko",
  latvian: "lv",
  lithuanian: "lt",
  macedonian: "mk",
  malay: "ms",
  marathi: "mr",
  maori: "mi",
  nepali: "ne",
  norwegian: "no",
  persian: "fa",
  polish: "pl",
  portuguese: "pt",
  romanian: "ro",
  russian: "ru",
  serbian: "sr",
  slovak: "sk",
  slovenian: "sl",
  spanish: "es",
  swahili: "sw",
  swedish: "sv",
  tagalog: "tl",
  tamil: "ta",
  thai: "th",
  turkish: "tr",
  ukrainian: "uk",
  urdu: "ur",
  vietnamese: "vi",
  welsh: "cy"
};
var OpenAITranscriptionModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
  }
  get provider() {
    return this.config.provider;
  }
  async getArgs({
    audio,
    mediaType,
    providerOptions
  }) {
    const warnings = [];
    const openAIOptions = await parseProviderOptions7({
      provider: "openai",
      providerOptions,
      schema: openAITranscriptionModelOptions
    });
    const formData = new FormData();
    const blob = audio instanceof Uint8Array ? new Blob([audio]) : new Blob([convertBase64ToUint8Array2(audio)]);
    formData.append("model", this.modelId);
    const fileExtension = mediaTypeToExtension(mediaType);
    formData.append(
      "file",
      new File([blob], "audio", { type: mediaType }),
      `audio.${fileExtension}`
    );
    if (openAIOptions) {
      const transcriptionModelOptions = {
        include: openAIOptions.include,
        language: openAIOptions.language,
        prompt: openAIOptions.prompt,
        // https://platform.openai.com/docs/api-reference/audio/createTranscription#audio_createtranscription-response_format
        // prefer verbose_json to get segments for models that support it
        response_format: [
          "gpt-4o-transcribe",
          "gpt-4o-mini-transcribe"
        ].includes(this.modelId) ? "json" : "verbose_json",
        temperature: openAIOptions.temperature,
        timestamp_granularities: openAIOptions.timestampGranularities
      };
      for (const [key, value] of Object.entries(transcriptionModelOptions)) {
        if (value != null) {
          if (Array.isArray(value)) {
            for (const item of value) {
              formData.append(`${key}[]`, String(item));
            }
          } else {
            formData.append(key, String(value));
          }
        }
      }
    }
    return {
      formData,
      warnings
    };
  }
  async doGenerate(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const currentDate = (_c = (_b = (_a = this.config._internal) == null ? void 0 : _a.currentDate) == null ? void 0 : _b.call(_a)) != null ? _c : /* @__PURE__ */ new Date();
    const { formData, warnings } = await this.getArgs(options);
    const {
      value: response,
      responseHeaders,
      rawValue: rawResponse
    } = await postFormDataToApi2({
      url: this.config.url({
        path: "/audio/transcriptions",
        modelId: this.modelId
      }),
      headers: combineHeaders7(this.config.headers(), options.headers),
      formData,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler6(
        openaiTranscriptionResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const language = response.language != null && response.language in languageMap ? languageMap[response.language] : void 0;
    return {
      text: response.text,
      segments: (_g = (_f = (_d = response.segments) == null ? void 0 : _d.map((segment) => ({
        text: segment.text,
        startSecond: segment.start,
        endSecond: segment.end
      }))) != null ? _f : (_e = response.words) == null ? void 0 : _e.map((word) => ({
        text: word.word,
        startSecond: word.start,
        endSecond: word.end
      }))) != null ? _g : [],
      language,
      durationInSeconds: (_h = response.duration) != null ? _h : void 0,
      warnings,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
        body: rawResponse
      }
    };
  }
};

// src/version.ts
var VERSION = true ? "3.0.48" : "0.0.0-test";

// src/openai-provider.ts
function createOpenAI(options = {}) {
  var _a, _b;
  const baseURL = (_a = withoutTrailingSlash(
    loadOptionalSetting({
      settingValue: options.baseURL,
      environmentVariableName: "OPENAI_BASE_URL"
    })
  )) != null ? _a : "https://api.openai.com/v1";
  const providerName = (_b = options.name) != null ? _b : "openai";
  const getHeaders = () => withUserAgentSuffix(
    {
      Authorization: `Bearer ${loadApiKey({
        apiKey: options.apiKey,
        environmentVariableName: "OPENAI_API_KEY",
        description: "OpenAI"
      })}`,
      "OpenAI-Organization": options.organization,
      "OpenAI-Project": options.project,
      ...options.headers
    },
    `ai-sdk/openai/${VERSION}`
  );
  const createChatModel = (modelId) => new OpenAIChatLanguageModel(modelId, {
    provider: `${providerName}.chat`,
    url: ({ path }) => `${baseURL}${path}`,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createCompletionModel = (modelId) => new OpenAICompletionLanguageModel(modelId, {
    provider: `${providerName}.completion`,
    url: ({ path }) => `${baseURL}${path}`,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createEmbeddingModel = (modelId) => new OpenAIEmbeddingModel(modelId, {
    provider: `${providerName}.embedding`,
    url: ({ path }) => `${baseURL}${path}`,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createImageModel = (modelId) => new OpenAIImageModel(modelId, {
    provider: `${providerName}.image`,
    url: ({ path }) => `${baseURL}${path}`,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createTranscriptionModel = (modelId) => new OpenAITranscriptionModel(modelId, {
    provider: `${providerName}.transcription`,
    url: ({ path }) => `${baseURL}${path}`,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createSpeechModel = (modelId) => new OpenAISpeechModel(modelId, {
    provider: `${providerName}.speech`,
    url: ({ path }) => `${baseURL}${path}`,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createLanguageModel = (modelId) => {
    if (new.target) {
      throw new Error(
        "The OpenAI model function cannot be called with the new keyword."
      );
    }
    return createResponsesModel(modelId);
  };
  const createResponsesModel = (modelId) => {
    return new OpenAIResponsesLanguageModel(modelId, {
      provider: `${providerName}.responses`,
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
      fileIdPrefixes: ["file-"]
    });
  };
  const provider = function(modelId) {
    return createLanguageModel(modelId);
  };
  provider.specificationVersion = "v3";
  provider.languageModel = createLanguageModel;
  provider.chat = createChatModel;
  provider.completion = createCompletionModel;
  provider.responses = createResponsesModel;
  provider.embedding = createEmbeddingModel;
  provider.embeddingModel = createEmbeddingModel;
  provider.textEmbedding = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.image = createImageModel;
  provider.imageModel = createImageModel;
  provider.transcription = createTranscriptionModel;
  provider.transcriptionModel = createTranscriptionModel;
  provider.speech = createSpeechModel;
  provider.speechModel = createSpeechModel;
  provider.tools = openaiTools;
  return provider;
}
var openai = createOpenAI();
export {
  VERSION,
  createOpenAI,
  openai
};
//# sourceMappingURL=index.mjs.map