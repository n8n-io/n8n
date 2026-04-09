// src/google-generative-ai-language-model.ts
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  generateId,
  lazySchema as lazySchema3,
  parseProviderOptions,
  postJsonToApi,
  resolve,
  zodSchema as zodSchema3
} from "@ai-sdk/provider-utils";
import { z as z3 } from "zod/v4";

// src/convert-google-generative-ai-usage.ts
function convertGoogleGenerativeAIUsage(usage) {
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
  const promptTokens = (_a = usage.promptTokenCount) != null ? _a : 0;
  const candidatesTokens = (_b = usage.candidatesTokenCount) != null ? _b : 0;
  const cachedContentTokens = (_c = usage.cachedContentTokenCount) != null ? _c : 0;
  const thoughtsTokens = (_d = usage.thoughtsTokenCount) != null ? _d : 0;
  return {
    inputTokens: {
      total: promptTokens,
      noCache: promptTokens - cachedContentTokens,
      cacheRead: cachedContentTokens,
      cacheWrite: void 0
    },
    outputTokens: {
      total: candidatesTokens + thoughtsTokens,
      text: candidatesTokens,
      reasoning: thoughtsTokens
    },
    raw: usage
  };
}

// src/convert-json-schema-to-openapi-schema.ts
function convertJSONSchemaToOpenAPISchema(jsonSchema, isRoot = true) {
  if (jsonSchema == null) {
    return void 0;
  }
  if (isEmptyObjectSchema(jsonSchema)) {
    if (isRoot) {
      return void 0;
    }
    if (typeof jsonSchema === "object" && jsonSchema.description) {
      return { type: "object", description: jsonSchema.description };
    }
    return { type: "object" };
  }
  if (typeof jsonSchema === "boolean") {
    return { type: "boolean", properties: {} };
  }
  const {
    type,
    description,
    required,
    properties,
    items,
    allOf,
    anyOf,
    oneOf,
    format,
    const: constValue,
    minLength,
    enum: enumValues
  } = jsonSchema;
  const result = {};
  if (description) result.description = description;
  if (required) result.required = required;
  if (format) result.format = format;
  if (constValue !== void 0) {
    result.enum = [constValue];
  }
  if (type) {
    if (Array.isArray(type)) {
      const hasNull = type.includes("null");
      const nonNullTypes = type.filter((t) => t !== "null");
      if (nonNullTypes.length === 0) {
        result.type = "null";
      } else {
        result.anyOf = nonNullTypes.map((t) => ({ type: t }));
        if (hasNull) {
          result.nullable = true;
        }
      }
    } else {
      result.type = type;
    }
  }
  if (enumValues !== void 0) {
    result.enum = enumValues;
  }
  if (properties != null) {
    result.properties = Object.entries(properties).reduce(
      (acc, [key, value]) => {
        acc[key] = convertJSONSchemaToOpenAPISchema(value, false);
        return acc;
      },
      {}
    );
  }
  if (items) {
    result.items = Array.isArray(items) ? items.map((item) => convertJSONSchemaToOpenAPISchema(item, false)) : convertJSONSchemaToOpenAPISchema(items, false);
  }
  if (allOf) {
    result.allOf = allOf.map(
      (item) => convertJSONSchemaToOpenAPISchema(item, false)
    );
  }
  if (anyOf) {
    if (anyOf.some(
      (schema) => typeof schema === "object" && (schema == null ? void 0 : schema.type) === "null"
    )) {
      const nonNullSchemas = anyOf.filter(
        (schema) => !(typeof schema === "object" && (schema == null ? void 0 : schema.type) === "null")
      );
      if (nonNullSchemas.length === 1) {
        const converted = convertJSONSchemaToOpenAPISchema(
          nonNullSchemas[0],
          false
        );
        if (typeof converted === "object") {
          result.nullable = true;
          Object.assign(result, converted);
        }
      } else {
        result.anyOf = nonNullSchemas.map(
          (item) => convertJSONSchemaToOpenAPISchema(item, false)
        );
        result.nullable = true;
      }
    } else {
      result.anyOf = anyOf.map(
        (item) => convertJSONSchemaToOpenAPISchema(item, false)
      );
    }
  }
  if (oneOf) {
    result.oneOf = oneOf.map(
      (item) => convertJSONSchemaToOpenAPISchema(item, false)
    );
  }
  if (minLength !== void 0) {
    result.minLength = minLength;
  }
  return result;
}
function isEmptyObjectSchema(jsonSchema) {
  return jsonSchema != null && typeof jsonSchema === "object" && jsonSchema.type === "object" && (jsonSchema.properties == null || Object.keys(jsonSchema.properties).length === 0) && !jsonSchema.additionalProperties;
}

// src/convert-to-google-generative-ai-messages.ts
import {
  UnsupportedFunctionalityError
} from "@ai-sdk/provider";
import { convertToBase64 } from "@ai-sdk/provider-utils";
var dataUrlRegex = /^data:([^;,]+);base64,(.+)$/s;
function parseBase64DataUrl(value) {
  const match = dataUrlRegex.exec(value);
  if (match == null) {
    return void 0;
  }
  return {
    mediaType: match[1],
    data: match[2]
  };
}
function convertUrlToolResultPart(url) {
  const parsedDataUrl = parseBase64DataUrl(url);
  if (parsedDataUrl == null) {
    return void 0;
  }
  return {
    inlineData: {
      mimeType: parsedDataUrl.mediaType,
      data: parsedDataUrl.data
    }
  };
}
function appendToolResultParts(parts, toolName, outputValue) {
  const functionResponseParts = [];
  const responseTextParts = [];
  for (const contentPart of outputValue) {
    switch (contentPart.type) {
      case "text": {
        responseTextParts.push(contentPart.text);
        break;
      }
      case "image-data":
      case "file-data": {
        functionResponseParts.push({
          inlineData: {
            mimeType: contentPart.mediaType,
            data: contentPart.data
          }
        });
        break;
      }
      case "image-url":
      case "file-url": {
        const functionResponsePart = convertUrlToolResultPart(
          contentPart.url
        );
        if (functionResponsePart != null) {
          functionResponseParts.push(functionResponsePart);
        } else {
          responseTextParts.push(JSON.stringify(contentPart));
        }
        break;
      }
      default: {
        responseTextParts.push(JSON.stringify(contentPart));
        break;
      }
    }
  }
  parts.push({
    functionResponse: {
      name: toolName,
      response: {
        name: toolName,
        content: responseTextParts.length > 0 ? responseTextParts.join("\n") : "Tool executed successfully."
      },
      ...functionResponseParts.length > 0 ? { parts: functionResponseParts } : {}
    }
  });
}
function appendLegacyToolResultParts(parts, toolName, outputValue) {
  for (const contentPart of outputValue) {
    switch (contentPart.type) {
      case "text":
        parts.push({
          functionResponse: {
            name: toolName,
            response: {
              name: toolName,
              content: contentPart.text
            }
          }
        });
        break;
      case "image-data":
        parts.push(
          {
            inlineData: {
              mimeType: String(contentPart.mediaType),
              data: String(contentPart.data)
            }
          },
          {
            text: "Tool executed successfully and returned this image as a response"
          }
        );
        break;
      default:
        parts.push({ text: JSON.stringify(contentPart) });
        break;
    }
  }
}
function convertToGoogleGenerativeAIMessages(prompt, options) {
  var _a, _b, _c, _d;
  const systemInstructionParts = [];
  const contents = [];
  let systemMessagesAllowed = true;
  const isGemmaModel = (_a = options == null ? void 0 : options.isGemmaModel) != null ? _a : false;
  const providerOptionsName = (_b = options == null ? void 0 : options.providerOptionsName) != null ? _b : "google";
  const supportsFunctionResponseParts = (_c = options == null ? void 0 : options.supportsFunctionResponseParts) != null ? _c : true;
  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        if (!systemMessagesAllowed) {
          throw new UnsupportedFunctionalityError({
            functionality: "system messages are only supported at the beginning of the conversation"
          });
        }
        systemInstructionParts.push({ text: content });
        break;
      }
      case "user": {
        systemMessagesAllowed = false;
        const parts = [];
        for (const part of content) {
          switch (part.type) {
            case "text": {
              parts.push({ text: part.text });
              break;
            }
            case "file": {
              const mediaType = part.mediaType === "image/*" ? "image/jpeg" : part.mediaType;
              parts.push(
                part.data instanceof URL ? {
                  fileData: {
                    mimeType: mediaType,
                    fileUri: part.data.toString()
                  }
                } : {
                  inlineData: {
                    mimeType: mediaType,
                    data: convertToBase64(part.data)
                  }
                }
              );
              break;
            }
          }
        }
        contents.push({ role: "user", parts });
        break;
      }
      case "assistant": {
        systemMessagesAllowed = false;
        contents.push({
          role: "model",
          parts: content.map((part) => {
            var _a2, _b2, _c2, _d2;
            const providerOpts = (_d2 = (_a2 = part.providerOptions) == null ? void 0 : _a2[providerOptionsName]) != null ? _d2 : providerOptionsName !== "google" ? (_b2 = part.providerOptions) == null ? void 0 : _b2.google : (_c2 = part.providerOptions) == null ? void 0 : _c2.vertex;
            const thoughtSignature = (providerOpts == null ? void 0 : providerOpts.thoughtSignature) != null ? String(providerOpts.thoughtSignature) : void 0;
            switch (part.type) {
              case "text": {
                return part.text.length === 0 ? void 0 : {
                  text: part.text,
                  thoughtSignature
                };
              }
              case "reasoning": {
                return part.text.length === 0 ? void 0 : {
                  text: part.text,
                  thought: true,
                  thoughtSignature
                };
              }
              case "file": {
                if (part.data instanceof URL) {
                  throw new UnsupportedFunctionalityError({
                    functionality: "File data URLs in assistant messages are not supported"
                  });
                }
                return {
                  inlineData: {
                    mimeType: part.mediaType,
                    data: convertToBase64(part.data)
                  },
                  ...(providerOpts == null ? void 0 : providerOpts.thought) === true ? { thought: true } : {},
                  thoughtSignature
                };
              }
              case "tool-call": {
                return {
                  functionCall: {
                    name: part.toolName,
                    args: part.input
                  },
                  thoughtSignature
                };
              }
            }
          }).filter((part) => part !== void 0)
        });
        break;
      }
      case "tool": {
        systemMessagesAllowed = false;
        const parts = [];
        for (const part of content) {
          if (part.type === "tool-approval-response") {
            continue;
          }
          const output = part.output;
          if (output.type === "content") {
            if (supportsFunctionResponseParts) {
              appendToolResultParts(parts, part.toolName, output.value);
            } else {
              appendLegacyToolResultParts(parts, part.toolName, output.value);
            }
          } else {
            parts.push({
              functionResponse: {
                name: part.toolName,
                response: {
                  name: part.toolName,
                  content: output.type === "execution-denied" ? (_d = output.reason) != null ? _d : "Tool execution denied." : output.value
                }
              }
            });
          }
        }
        contents.push({
          role: "user",
          parts
        });
        break;
      }
    }
  }
  if (isGemmaModel && systemInstructionParts.length > 0 && contents.length > 0 && contents[0].role === "user") {
    const systemText = systemInstructionParts.map((part) => part.text).join("\n\n");
    contents[0].parts.unshift({ text: systemText + "\n\n" });
  }
  return {
    systemInstruction: systemInstructionParts.length > 0 && !isGemmaModel ? { parts: systemInstructionParts } : void 0,
    contents
  };
}

// src/get-model-path.ts
function getModelPath(modelId) {
  return modelId.includes("/") ? modelId : `models/${modelId}`;
}

// src/google-error.ts
import {
  createJsonErrorResponseHandler,
  lazySchema,
  zodSchema
} from "@ai-sdk/provider-utils";
import { z } from "zod/v4";
var googleErrorDataSchema = lazySchema(
  () => zodSchema(
    z.object({
      error: z.object({
        code: z.number().nullable(),
        message: z.string(),
        status: z.string()
      })
    })
  )
);
var googleFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: googleErrorDataSchema,
  errorToMessage: (data) => data.error.message
});

// src/google-generative-ai-options.ts
import { lazySchema as lazySchema2, zodSchema as zodSchema2 } from "@ai-sdk/provider-utils";
import { z as z2 } from "zod/v4";
var googleLanguageModelOptions = lazySchema2(
  () => zodSchema2(
    z2.object({
      responseModalities: z2.array(z2.enum(["TEXT", "IMAGE"])).optional(),
      thinkingConfig: z2.object({
        thinkingBudget: z2.number().optional(),
        includeThoughts: z2.boolean().optional(),
        // https://ai.google.dev/gemini-api/docs/gemini-3?thinking=high#thinking_level
        thinkingLevel: z2.enum(["minimal", "low", "medium", "high"]).optional()
      }).optional(),
      /**
       * Optional.
       * The name of the cached content used as context to serve the prediction.
       * Format: cachedContents/{cachedContent}
       */
      cachedContent: z2.string().optional(),
      /**
       * Optional. Enable structured output. Default is true.
       *
       * This is useful when the JSON Schema contains elements that are
       * not supported by the OpenAPI schema version that
       * Google Generative AI uses. You can use this to disable
       * structured outputs if you need to.
       */
      structuredOutputs: z2.boolean().optional(),
      /**
       * Optional. A list of unique safety settings for blocking unsafe content.
       */
      safetySettings: z2.array(
        z2.object({
          category: z2.enum([
            "HARM_CATEGORY_UNSPECIFIED",
            "HARM_CATEGORY_HATE_SPEECH",
            "HARM_CATEGORY_DANGEROUS_CONTENT",
            "HARM_CATEGORY_HARASSMENT",
            "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "HARM_CATEGORY_CIVIC_INTEGRITY"
          ]),
          threshold: z2.enum([
            "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
            "BLOCK_LOW_AND_ABOVE",
            "BLOCK_MEDIUM_AND_ABOVE",
            "BLOCK_ONLY_HIGH",
            "BLOCK_NONE",
            "OFF"
          ])
        })
      ).optional(),
      threshold: z2.enum([
        "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
        "BLOCK_LOW_AND_ABOVE",
        "BLOCK_MEDIUM_AND_ABOVE",
        "BLOCK_ONLY_HIGH",
        "BLOCK_NONE",
        "OFF"
      ]).optional(),
      /**
       * Optional. Enables timestamp understanding for audio-only files.
       *
       * https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/audio-understanding
       */
      audioTimestamp: z2.boolean().optional(),
      /**
       * Optional. Defines labels used in billing reports. Available on Vertex AI only.
       *
       * https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/add-labels-to-api-calls
       */
      labels: z2.record(z2.string(), z2.string()).optional(),
      /**
       * Optional. If specified, the media resolution specified will be used.
       *
       * https://ai.google.dev/api/generate-content#MediaResolution
       */
      mediaResolution: z2.enum([
        "MEDIA_RESOLUTION_UNSPECIFIED",
        "MEDIA_RESOLUTION_LOW",
        "MEDIA_RESOLUTION_MEDIUM",
        "MEDIA_RESOLUTION_HIGH"
      ]).optional(),
      /**
       * Optional. Configures the image generation aspect ratio for Gemini models.
       *
       * https://ai.google.dev/gemini-api/docs/image-generation#aspect_ratios
       */
      imageConfig: z2.object({
        aspectRatio: z2.enum([
          "1:1",
          "2:3",
          "3:2",
          "3:4",
          "4:3",
          "4:5",
          "5:4",
          "9:16",
          "16:9",
          "21:9",
          "1:8",
          "8:1",
          "1:4",
          "4:1"
        ]).optional(),
        imageSize: z2.enum(["1K", "2K", "4K", "512"]).optional()
      }).optional(),
      /**
       * Optional. Configuration for grounding retrieval.
       * Used to provide location context for Google Maps and Google Search grounding.
       *
       * https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-maps
       */
      retrievalConfig: z2.object({
        latLng: z2.object({
          latitude: z2.number(),
          longitude: z2.number()
        }).optional()
      }).optional()
    })
  )
);

// src/google-prepare-tools.ts
import {
  UnsupportedFunctionalityError as UnsupportedFunctionalityError2
} from "@ai-sdk/provider";
function prepareTools({
  tools,
  toolChoice,
  modelId
}) {
  var _a;
  tools = (tools == null ? void 0 : tools.length) ? tools : void 0;
  const toolWarnings = [];
  const isLatest = [
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-pro-latest"
  ].some((id) => id === modelId);
  const isGemini2orNewer = modelId.includes("gemini-2") || modelId.includes("gemini-3") || modelId.includes("nano-banana") || isLatest;
  const supportsFileSearch = modelId.includes("gemini-2.5") || modelId.includes("gemini-3");
  if (tools == null) {
    return { tools: void 0, toolConfig: void 0, toolWarnings };
  }
  const hasFunctionTools = tools.some((tool) => tool.type === "function");
  const hasProviderTools = tools.some((tool) => tool.type === "provider");
  if (hasFunctionTools && hasProviderTools) {
    toolWarnings.push({
      type: "unsupported",
      feature: `combination of function and provider-defined tools`
    });
  }
  if (hasProviderTools) {
    const googleTools2 = [];
    const ProviderTools = tools.filter((tool) => tool.type === "provider");
    ProviderTools.forEach((tool) => {
      switch (tool.id) {
        case "google.google_search":
          if (isGemini2orNewer) {
            googleTools2.push({ googleSearch: { ...tool.args } });
          } else {
            toolWarnings.push({
              type: "unsupported",
              feature: `provider-defined tool ${tool.id}`,
              details: "Google Search requires Gemini 2.0 or newer."
            });
          }
          break;
        case "google.enterprise_web_search":
          if (isGemini2orNewer) {
            googleTools2.push({ enterpriseWebSearch: {} });
          } else {
            toolWarnings.push({
              type: "unsupported",
              feature: `provider-defined tool ${tool.id}`,
              details: "Enterprise Web Search requires Gemini 2.0 or newer."
            });
          }
          break;
        case "google.url_context":
          if (isGemini2orNewer) {
            googleTools2.push({ urlContext: {} });
          } else {
            toolWarnings.push({
              type: "unsupported",
              feature: `provider-defined tool ${tool.id}`,
              details: "The URL context tool is not supported with other Gemini models than Gemini 2."
            });
          }
          break;
        case "google.code_execution":
          if (isGemini2orNewer) {
            googleTools2.push({ codeExecution: {} });
          } else {
            toolWarnings.push({
              type: "unsupported",
              feature: `provider-defined tool ${tool.id}`,
              details: "The code execution tools is not supported with other Gemini models than Gemini 2."
            });
          }
          break;
        case "google.file_search":
          if (supportsFileSearch) {
            googleTools2.push({ fileSearch: { ...tool.args } });
          } else {
            toolWarnings.push({
              type: "unsupported",
              feature: `provider-defined tool ${tool.id}`,
              details: "The file search tool is only supported with Gemini 2.5 models and Gemini 3 models."
            });
          }
          break;
        case "google.vertex_rag_store":
          if (isGemini2orNewer) {
            googleTools2.push({
              retrieval: {
                vertex_rag_store: {
                  rag_resources: {
                    rag_corpus: tool.args.ragCorpus
                  },
                  similarity_top_k: tool.args.topK
                }
              }
            });
          } else {
            toolWarnings.push({
              type: "unsupported",
              feature: `provider-defined tool ${tool.id}`,
              details: "The RAG store tool is not supported with other Gemini models than Gemini 2."
            });
          }
          break;
        case "google.google_maps":
          if (isGemini2orNewer) {
            googleTools2.push({ googleMaps: {} });
          } else {
            toolWarnings.push({
              type: "unsupported",
              feature: `provider-defined tool ${tool.id}`,
              details: "The Google Maps grounding tool is not supported with Gemini models other than Gemini 2 or newer."
            });
          }
          break;
        default:
          toolWarnings.push({
            type: "unsupported",
            feature: `provider-defined tool ${tool.id}`
          });
          break;
      }
    });
    return {
      tools: googleTools2.length > 0 ? googleTools2 : void 0,
      toolConfig: void 0,
      toolWarnings
    };
  }
  const functionDeclarations = [];
  let hasStrictTools = false;
  for (const tool of tools) {
    switch (tool.type) {
      case "function":
        functionDeclarations.push({
          name: tool.name,
          description: (_a = tool.description) != null ? _a : "",
          parameters: convertJSONSchemaToOpenAPISchema(tool.inputSchema)
        });
        if (tool.strict === true) {
          hasStrictTools = true;
        }
        break;
      default:
        toolWarnings.push({
          type: "unsupported",
          feature: `function tool ${tool.name}`
        });
        break;
    }
  }
  if (toolChoice == null) {
    return {
      tools: [{ functionDeclarations }],
      toolConfig: hasStrictTools ? { functionCallingConfig: { mode: "VALIDATED" } } : void 0,
      toolWarnings
    };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
      return {
        tools: [{ functionDeclarations }],
        toolConfig: {
          functionCallingConfig: {
            mode: hasStrictTools ? "VALIDATED" : "AUTO"
          }
        },
        toolWarnings
      };
    case "none":
      return {
        tools: [{ functionDeclarations }],
        toolConfig: { functionCallingConfig: { mode: "NONE" } },
        toolWarnings
      };
    case "required":
      return {
        tools: [{ functionDeclarations }],
        toolConfig: {
          functionCallingConfig: {
            mode: hasStrictTools ? "VALIDATED" : "ANY"
          }
        },
        toolWarnings
      };
    case "tool":
      return {
        tools: [{ functionDeclarations }],
        toolConfig: {
          functionCallingConfig: {
            mode: hasStrictTools ? "VALIDATED" : "ANY",
            allowedFunctionNames: [toolChoice.toolName]
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

// src/map-google-generative-ai-finish-reason.ts
function mapGoogleGenerativeAIFinishReason({
  finishReason,
  hasToolCalls
}) {
  switch (finishReason) {
    case "STOP":
      return hasToolCalls ? "tool-calls" : "stop";
    case "MAX_TOKENS":
      return "length";
    case "IMAGE_SAFETY":
    case "RECITATION":
    case "SAFETY":
    case "BLOCKLIST":
    case "PROHIBITED_CONTENT":
    case "SPII":
      return "content-filter";
    case "MALFORMED_FUNCTION_CALL":
      return "error";
    case "FINISH_REASON_UNSPECIFIED":
    case "OTHER":
    default:
      return "other";
  }
}

// src/google-generative-ai-language-model.ts
var GoogleGenerativeAILanguageModel = class {
  constructor(modelId, config) {
    this.specificationVersion = "v3";
    var _a;
    this.modelId = modelId;
    this.config = config;
    this.generateId = (_a = config.generateId) != null ? _a : generateId;
  }
  get provider() {
    return this.config.provider;
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
    stopSequences,
    responseFormat,
    seed,
    tools,
    toolChoice,
    providerOptions
  }) {
    var _a;
    const warnings = [];
    const providerOptionsName = this.config.provider.includes("vertex") ? "vertex" : "google";
    let googleOptions = await parseProviderOptions({
      provider: providerOptionsName,
      providerOptions,
      schema: googleLanguageModelOptions
    });
    if (googleOptions == null && providerOptionsName !== "google") {
      googleOptions = await parseProviderOptions({
        provider: "google",
        providerOptions,
        schema: googleLanguageModelOptions
      });
    }
    if ((tools == null ? void 0 : tools.some(
      (tool) => tool.type === "provider" && tool.id === "google.vertex_rag_store"
    )) && !this.config.provider.startsWith("google.vertex.")) {
      warnings.push({
        type: "other",
        message: `The 'vertex_rag_store' tool is only supported with the Google Vertex provider and might not be supported or could behave unexpectedly with the current Google provider (${this.config.provider}).`
      });
    }
    const isGemmaModel = this.modelId.toLowerCase().startsWith("gemma-");
    const supportsFunctionResponseParts = this.modelId.startsWith("gemini-3");
    const { contents, systemInstruction } = convertToGoogleGenerativeAIMessages(
      prompt,
      {
        isGemmaModel,
        providerOptionsName,
        supportsFunctionResponseParts
      }
    );
    const {
      tools: googleTools2,
      toolConfig: googleToolConfig,
      toolWarnings
    } = prepareTools({
      tools,
      toolChoice,
      modelId: this.modelId
    });
    return {
      args: {
        generationConfig: {
          // standardized settings:
          maxOutputTokens,
          temperature,
          topK,
          topP,
          frequencyPenalty,
          presencePenalty,
          stopSequences,
          seed,
          // response format:
          responseMimeType: (responseFormat == null ? void 0 : responseFormat.type) === "json" ? "application/json" : void 0,
          responseSchema: (responseFormat == null ? void 0 : responseFormat.type) === "json" && responseFormat.schema != null && // Google GenAI does not support all OpenAPI Schema features,
          // so this is needed as an escape hatch:
          // TODO convert into provider option
          ((_a = googleOptions == null ? void 0 : googleOptions.structuredOutputs) != null ? _a : true) ? convertJSONSchemaToOpenAPISchema(responseFormat.schema) : void 0,
          ...(googleOptions == null ? void 0 : googleOptions.audioTimestamp) && {
            audioTimestamp: googleOptions.audioTimestamp
          },
          // provider options:
          responseModalities: googleOptions == null ? void 0 : googleOptions.responseModalities,
          thinkingConfig: googleOptions == null ? void 0 : googleOptions.thinkingConfig,
          ...(googleOptions == null ? void 0 : googleOptions.mediaResolution) && {
            mediaResolution: googleOptions.mediaResolution
          },
          ...(googleOptions == null ? void 0 : googleOptions.imageConfig) && {
            imageConfig: googleOptions.imageConfig
          }
        },
        contents,
        systemInstruction: isGemmaModel ? void 0 : systemInstruction,
        safetySettings: googleOptions == null ? void 0 : googleOptions.safetySettings,
        tools: googleTools2,
        toolConfig: (googleOptions == null ? void 0 : googleOptions.retrievalConfig) ? {
          ...googleToolConfig,
          retrievalConfig: googleOptions.retrievalConfig
        } : googleToolConfig,
        cachedContent: googleOptions == null ? void 0 : googleOptions.cachedContent,
        labels: googleOptions == null ? void 0 : googleOptions.labels
      },
      warnings: [...warnings, ...toolWarnings],
      providerOptionsName
    };
  }
  async doGenerate(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const { args, warnings, providerOptionsName } = await this.getArgs(options);
    const mergedHeaders = combineHeaders(
      await resolve(this.config.headers),
      options.headers
    );
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await postJsonToApi({
      url: `${this.config.baseURL}/${getModelPath(
        this.modelId
      )}:generateContent`,
      headers: mergedHeaders,
      body: args,
      failedResponseHandler: googleFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(responseSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const candidate = response.candidates[0];
    const content = [];
    const parts = (_b = (_a = candidate.content) == null ? void 0 : _a.parts) != null ? _b : [];
    const usageMetadata = response.usageMetadata;
    let lastCodeExecutionToolCallId;
    for (const part of parts) {
      if ("executableCode" in part && ((_c = part.executableCode) == null ? void 0 : _c.code)) {
        const toolCallId = this.config.generateId();
        lastCodeExecutionToolCallId = toolCallId;
        content.push({
          type: "tool-call",
          toolCallId,
          toolName: "code_execution",
          input: JSON.stringify(part.executableCode),
          providerExecuted: true
        });
      } else if ("codeExecutionResult" in part && part.codeExecutionResult) {
        content.push({
          type: "tool-result",
          // Assumes a result directly follows its corresponding call part.
          toolCallId: lastCodeExecutionToolCallId,
          toolName: "code_execution",
          result: {
            outcome: part.codeExecutionResult.outcome,
            output: (_d = part.codeExecutionResult.output) != null ? _d : ""
          }
        });
        lastCodeExecutionToolCallId = void 0;
      } else if ("text" in part && part.text != null) {
        const thoughtSignatureMetadata = part.thoughtSignature ? {
          [providerOptionsName]: {
            thoughtSignature: part.thoughtSignature
          }
        } : void 0;
        if (part.text.length === 0) {
          if (thoughtSignatureMetadata != null && content.length > 0) {
            const lastContent = content[content.length - 1];
            lastContent.providerMetadata = thoughtSignatureMetadata;
          }
        } else {
          content.push({
            type: part.thought === true ? "reasoning" : "text",
            text: part.text,
            providerMetadata: thoughtSignatureMetadata
          });
        }
      } else if ("functionCall" in part) {
        content.push({
          type: "tool-call",
          toolCallId: this.config.generateId(),
          toolName: part.functionCall.name,
          input: JSON.stringify(part.functionCall.args),
          providerMetadata: part.thoughtSignature ? {
            [providerOptionsName]: {
              thoughtSignature: part.thoughtSignature
            }
          } : void 0
        });
      } else if ("inlineData" in part) {
        const hasThought = part.thought === true;
        const hasThoughtSignature = !!part.thoughtSignature;
        content.push({
          type: "file",
          data: part.inlineData.data,
          mediaType: part.inlineData.mimeType,
          providerMetadata: hasThought || hasThoughtSignature ? {
            [providerOptionsName]: {
              ...hasThought ? { thought: true } : {},
              ...hasThoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}
            }
          } : void 0
        });
      }
    }
    const sources = (_e = extractSources({
      groundingMetadata: candidate.groundingMetadata,
      generateId: this.config.generateId
    })) != null ? _e : [];
    for (const source of sources) {
      content.push(source);
    }
    return {
      content,
      finishReason: {
        unified: mapGoogleGenerativeAIFinishReason({
          finishReason: candidate.finishReason,
          // Only count client-executed tool calls for finish reason determination.
          hasToolCalls: content.some(
            (part) => part.type === "tool-call" && !part.providerExecuted
          )
        }),
        raw: (_f = candidate.finishReason) != null ? _f : void 0
      },
      usage: convertGoogleGenerativeAIUsage(usageMetadata),
      warnings,
      providerMetadata: {
        [providerOptionsName]: {
          promptFeedback: (_g = response.promptFeedback) != null ? _g : null,
          groundingMetadata: (_h = candidate.groundingMetadata) != null ? _h : null,
          urlContextMetadata: (_i = candidate.urlContextMetadata) != null ? _i : null,
          safetyRatings: (_j = candidate.safetyRatings) != null ? _j : null,
          usageMetadata: usageMetadata != null ? usageMetadata : null,
          finishMessage: (_k = candidate.finishMessage) != null ? _k : null
        }
      },
      request: { body: args },
      response: {
        // TODO timestamp, model id, id
        headers: responseHeaders,
        body: rawResponse
      }
    };
  }
  async doStream(options) {
    const { args, warnings, providerOptionsName } = await this.getArgs(options);
    const headers = combineHeaders(
      await resolve(this.config.headers),
      options.headers
    );
    const { responseHeaders, value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/${getModelPath(
        this.modelId
      )}:streamGenerateContent?alt=sse`,
      headers,
      body: args,
      failedResponseHandler: googleFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(chunkSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    let finishReason = {
      unified: "other",
      raw: void 0
    };
    let usage = void 0;
    let providerMetadata = void 0;
    let lastGroundingMetadata = null;
    let lastUrlContextMetadata = null;
    const generateId2 = this.config.generateId;
    let hasToolCalls = false;
    let currentTextBlockId = null;
    let currentReasoningBlockId = null;
    let blockCounter = 0;
    const emittedSourceUrls = /* @__PURE__ */ new Set();
    let lastCodeExecutionToolCallId;
    return {
      stream: response.pipeThrough(
        new TransformStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings });
          },
          transform(chunk, controller) {
            var _a, _b, _c, _d, _e, _f, _g;
            if (options.includeRawChunks) {
              controller.enqueue({ type: "raw", rawValue: chunk.rawValue });
            }
            if (!chunk.success) {
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }
            const value = chunk.value;
            const usageMetadata = value.usageMetadata;
            if (usageMetadata != null) {
              usage = usageMetadata;
            }
            const candidate = (_a = value.candidates) == null ? void 0 : _a[0];
            if (candidate == null) {
              return;
            }
            const content = candidate.content;
            if (candidate.groundingMetadata != null) {
              lastGroundingMetadata = candidate.groundingMetadata;
            }
            if (candidate.urlContextMetadata != null) {
              lastUrlContextMetadata = candidate.urlContextMetadata;
            }
            const sources = extractSources({
              groundingMetadata: candidate.groundingMetadata,
              generateId: generateId2
            });
            if (sources != null) {
              for (const source of sources) {
                if (source.sourceType === "url" && !emittedSourceUrls.has(source.url)) {
                  emittedSourceUrls.add(source.url);
                  controller.enqueue(source);
                }
              }
            }
            if (content != null) {
              const parts = (_b = content.parts) != null ? _b : [];
              for (const part of parts) {
                if ("executableCode" in part && ((_c = part.executableCode) == null ? void 0 : _c.code)) {
                  const toolCallId = generateId2();
                  lastCodeExecutionToolCallId = toolCallId;
                  controller.enqueue({
                    type: "tool-call",
                    toolCallId,
                    toolName: "code_execution",
                    input: JSON.stringify(part.executableCode),
                    providerExecuted: true
                  });
                } else if ("codeExecutionResult" in part && part.codeExecutionResult) {
                  const toolCallId = lastCodeExecutionToolCallId;
                  if (toolCallId) {
                    controller.enqueue({
                      type: "tool-result",
                      toolCallId,
                      toolName: "code_execution",
                      result: {
                        outcome: part.codeExecutionResult.outcome,
                        output: (_d = part.codeExecutionResult.output) != null ? _d : ""
                      }
                    });
                    lastCodeExecutionToolCallId = void 0;
                  }
                } else if ("text" in part && part.text != null) {
                  const thoughtSignatureMetadata = part.thoughtSignature ? {
                    [providerOptionsName]: {
                      thoughtSignature: part.thoughtSignature
                    }
                  } : void 0;
                  if (part.text.length === 0) {
                    if (thoughtSignatureMetadata != null && currentTextBlockId !== null) {
                      controller.enqueue({
                        type: "text-delta",
                        id: currentTextBlockId,
                        delta: "",
                        providerMetadata: thoughtSignatureMetadata
                      });
                    }
                  } else if (part.thought === true) {
                    if (currentTextBlockId !== null) {
                      controller.enqueue({
                        type: "text-end",
                        id: currentTextBlockId
                      });
                      currentTextBlockId = null;
                    }
                    if (currentReasoningBlockId === null) {
                      currentReasoningBlockId = String(blockCounter++);
                      controller.enqueue({
                        type: "reasoning-start",
                        id: currentReasoningBlockId,
                        providerMetadata: thoughtSignatureMetadata
                      });
                    }
                    controller.enqueue({
                      type: "reasoning-delta",
                      id: currentReasoningBlockId,
                      delta: part.text,
                      providerMetadata: thoughtSignatureMetadata
                    });
                  } else {
                    if (currentReasoningBlockId !== null) {
                      controller.enqueue({
                        type: "reasoning-end",
                        id: currentReasoningBlockId
                      });
                      currentReasoningBlockId = null;
                    }
                    if (currentTextBlockId === null) {
                      currentTextBlockId = String(blockCounter++);
                      controller.enqueue({
                        type: "text-start",
                        id: currentTextBlockId,
                        providerMetadata: thoughtSignatureMetadata
                      });
                    }
                    controller.enqueue({
                      type: "text-delta",
                      id: currentTextBlockId,
                      delta: part.text,
                      providerMetadata: thoughtSignatureMetadata
                    });
                  }
                } else if ("inlineData" in part) {
                  if (currentTextBlockId !== null) {
                    controller.enqueue({
                      type: "text-end",
                      id: currentTextBlockId
                    });
                    currentTextBlockId = null;
                  }
                  if (currentReasoningBlockId !== null) {
                    controller.enqueue({
                      type: "reasoning-end",
                      id: currentReasoningBlockId
                    });
                    currentReasoningBlockId = null;
                  }
                  const hasThought = part.thought === true;
                  const hasThoughtSignature = !!part.thoughtSignature;
                  const fileMeta = hasThought || hasThoughtSignature ? {
                    [providerOptionsName]: {
                      ...hasThought ? { thought: true } : {},
                      ...hasThoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}
                    }
                  } : void 0;
                  controller.enqueue({
                    type: "file",
                    mediaType: part.inlineData.mimeType,
                    data: part.inlineData.data,
                    providerMetadata: fileMeta
                  });
                }
              }
              const toolCallDeltas = getToolCallsFromParts({
                parts: content.parts,
                generateId: generateId2,
                providerOptionsName
              });
              if (toolCallDeltas != null) {
                for (const toolCall of toolCallDeltas) {
                  controller.enqueue({
                    type: "tool-input-start",
                    id: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    providerMetadata: toolCall.providerMetadata
                  });
                  controller.enqueue({
                    type: "tool-input-delta",
                    id: toolCall.toolCallId,
                    delta: toolCall.args,
                    providerMetadata: toolCall.providerMetadata
                  });
                  controller.enqueue({
                    type: "tool-input-end",
                    id: toolCall.toolCallId,
                    providerMetadata: toolCall.providerMetadata
                  });
                  controller.enqueue({
                    type: "tool-call",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    input: toolCall.args,
                    providerMetadata: toolCall.providerMetadata
                  });
                  hasToolCalls = true;
                }
              }
            }
            if (candidate.finishReason != null) {
              finishReason = {
                unified: mapGoogleGenerativeAIFinishReason({
                  finishReason: candidate.finishReason,
                  hasToolCalls
                }),
                raw: candidate.finishReason
              };
              providerMetadata = {
                [providerOptionsName]: {
                  promptFeedback: (_e = value.promptFeedback) != null ? _e : null,
                  groundingMetadata: lastGroundingMetadata,
                  urlContextMetadata: lastUrlContextMetadata,
                  safetyRatings: (_f = candidate.safetyRatings) != null ? _f : null,
                  usageMetadata: usageMetadata != null ? usageMetadata : null,
                  finishMessage: (_g = candidate.finishMessage) != null ? _g : null
                }
              };
            }
          },
          flush(controller) {
            if (currentTextBlockId !== null) {
              controller.enqueue({
                type: "text-end",
                id: currentTextBlockId
              });
            }
            if (currentReasoningBlockId !== null) {
              controller.enqueue({
                type: "reasoning-end",
                id: currentReasoningBlockId
              });
            }
            controller.enqueue({
              type: "finish",
              finishReason,
              usage: convertGoogleGenerativeAIUsage(usage),
              providerMetadata
            });
          }
        })
      ),
      response: { headers: responseHeaders },
      request: { body: args }
    };
  }
};
function getToolCallsFromParts({
  parts,
  generateId: generateId2,
  providerOptionsName
}) {
  const functionCallParts = parts == null ? void 0 : parts.filter(
    (part) => "functionCall" in part
  );
  return functionCallParts == null || functionCallParts.length === 0 ? void 0 : functionCallParts.map((part) => ({
    type: "tool-call",
    toolCallId: generateId2(),
    toolName: part.functionCall.name,
    args: JSON.stringify(part.functionCall.args),
    providerMetadata: part.thoughtSignature ? {
      [providerOptionsName]: {
        thoughtSignature: part.thoughtSignature
      }
    } : void 0
  }));
}
function extractSources({
  groundingMetadata,
  generateId: generateId2
}) {
  var _a, _b, _c, _d, _e, _f;
  if (!(groundingMetadata == null ? void 0 : groundingMetadata.groundingChunks)) {
    return void 0;
  }
  const sources = [];
  for (const chunk of groundingMetadata.groundingChunks) {
    if (chunk.web != null) {
      sources.push({
        type: "source",
        sourceType: "url",
        id: generateId2(),
        url: chunk.web.uri,
        title: (_a = chunk.web.title) != null ? _a : void 0
      });
    } else if (chunk.image != null) {
      sources.push({
        type: "source",
        sourceType: "url",
        id: generateId2(),
        // Google requires attribution to the source URI, not the actual image URI.
        // TODO: add another type in v7 to allow both the image and source URL to be included separately
        url: chunk.image.sourceUri,
        title: (_b = chunk.image.title) != null ? _b : void 0
      });
    } else if (chunk.retrievedContext != null) {
      const uri = chunk.retrievedContext.uri;
      const fileSearchStore = chunk.retrievedContext.fileSearchStore;
      if (uri && (uri.startsWith("http://") || uri.startsWith("https://"))) {
        sources.push({
          type: "source",
          sourceType: "url",
          id: generateId2(),
          url: uri,
          title: (_c = chunk.retrievedContext.title) != null ? _c : void 0
        });
      } else if (uri) {
        const title = (_d = chunk.retrievedContext.title) != null ? _d : "Unknown Document";
        let mediaType = "application/octet-stream";
        let filename = void 0;
        if (uri.endsWith(".pdf")) {
          mediaType = "application/pdf";
          filename = uri.split("/").pop();
        } else if (uri.endsWith(".txt")) {
          mediaType = "text/plain";
          filename = uri.split("/").pop();
        } else if (uri.endsWith(".docx")) {
          mediaType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          filename = uri.split("/").pop();
        } else if (uri.endsWith(".doc")) {
          mediaType = "application/msword";
          filename = uri.split("/").pop();
        } else if (uri.match(/\.(md|markdown)$/)) {
          mediaType = "text/markdown";
          filename = uri.split("/").pop();
        } else {
          filename = uri.split("/").pop();
        }
        sources.push({
          type: "source",
          sourceType: "document",
          id: generateId2(),
          mediaType,
          title,
          filename
        });
      } else if (fileSearchStore) {
        const title = (_e = chunk.retrievedContext.title) != null ? _e : "Unknown Document";
        sources.push({
          type: "source",
          sourceType: "document",
          id: generateId2(),
          mediaType: "application/octet-stream",
          title,
          filename: fileSearchStore.split("/").pop()
        });
      }
    } else if (chunk.maps != null) {
      if (chunk.maps.uri) {
        sources.push({
          type: "source",
          sourceType: "url",
          id: generateId2(),
          url: chunk.maps.uri,
          title: (_f = chunk.maps.title) != null ? _f : void 0
        });
      }
    }
  }
  return sources.length > 0 ? sources : void 0;
}
var getGroundingMetadataSchema = () => z3.object({
  webSearchQueries: z3.array(z3.string()).nullish(),
  imageSearchQueries: z3.array(z3.string()).nullish(),
  retrievalQueries: z3.array(z3.string()).nullish(),
  searchEntryPoint: z3.object({ renderedContent: z3.string() }).nullish(),
  groundingChunks: z3.array(
    z3.object({
      web: z3.object({ uri: z3.string(), title: z3.string().nullish() }).nullish(),
      image: z3.object({
        sourceUri: z3.string(),
        imageUri: z3.string(),
        title: z3.string().nullish(),
        domain: z3.string().nullish()
      }).nullish(),
      retrievedContext: z3.object({
        uri: z3.string().nullish(),
        title: z3.string().nullish(),
        text: z3.string().nullish(),
        fileSearchStore: z3.string().nullish()
      }).nullish(),
      maps: z3.object({
        uri: z3.string().nullish(),
        title: z3.string().nullish(),
        text: z3.string().nullish(),
        placeId: z3.string().nullish()
      }).nullish()
    })
  ).nullish(),
  groundingSupports: z3.array(
    z3.object({
      segment: z3.object({
        startIndex: z3.number().nullish(),
        endIndex: z3.number().nullish(),
        text: z3.string().nullish()
      }).nullish(),
      segment_text: z3.string().nullish(),
      groundingChunkIndices: z3.array(z3.number()).nullish(),
      supportChunkIndices: z3.array(z3.number()).nullish(),
      confidenceScores: z3.array(z3.number()).nullish(),
      confidenceScore: z3.array(z3.number()).nullish()
    })
  ).nullish(),
  retrievalMetadata: z3.union([
    z3.object({
      webDynamicRetrievalScore: z3.number()
    }),
    z3.object({})
  ]).nullish()
});
var getContentSchema = () => z3.object({
  parts: z3.array(
    z3.union([
      // note: order matters since text can be fully empty
      z3.object({
        functionCall: z3.object({
          name: z3.string(),
          args: z3.unknown()
        }),
        thoughtSignature: z3.string().nullish()
      }),
      z3.object({
        inlineData: z3.object({
          mimeType: z3.string(),
          data: z3.string()
        }),
        thought: z3.boolean().nullish(),
        thoughtSignature: z3.string().nullish()
      }),
      z3.object({
        executableCode: z3.object({
          language: z3.string(),
          code: z3.string()
        }).nullish(),
        codeExecutionResult: z3.object({
          outcome: z3.string(),
          output: z3.string().nullish()
        }).nullish(),
        text: z3.string().nullish(),
        thought: z3.boolean().nullish(),
        thoughtSignature: z3.string().nullish()
      })
    ])
  ).nullish()
});
var getSafetyRatingSchema = () => z3.object({
  category: z3.string().nullish(),
  probability: z3.string().nullish(),
  probabilityScore: z3.number().nullish(),
  severity: z3.string().nullish(),
  severityScore: z3.number().nullish(),
  blocked: z3.boolean().nullish()
});
var usageSchema = z3.object({
  cachedContentTokenCount: z3.number().nullish(),
  thoughtsTokenCount: z3.number().nullish(),
  promptTokenCount: z3.number().nullish(),
  candidatesTokenCount: z3.number().nullish(),
  totalTokenCount: z3.number().nullish(),
  // https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerateContentResponse#TrafficType
  trafficType: z3.string().nullish()
});
var getUrlContextMetadataSchema = () => z3.object({
  urlMetadata: z3.array(
    z3.object({
      retrievedUrl: z3.string(),
      urlRetrievalStatus: z3.string()
    })
  ).nullish()
});
var responseSchema = lazySchema3(
  () => zodSchema3(
    z3.object({
      candidates: z3.array(
        z3.object({
          content: getContentSchema().nullish().or(z3.object({}).strict()),
          finishReason: z3.string().nullish(),
          finishMessage: z3.string().nullish(),
          safetyRatings: z3.array(getSafetyRatingSchema()).nullish(),
          groundingMetadata: getGroundingMetadataSchema().nullish(),
          urlContextMetadata: getUrlContextMetadataSchema().nullish()
        })
      ),
      usageMetadata: usageSchema.nullish(),
      promptFeedback: z3.object({
        blockReason: z3.string().nullish(),
        safetyRatings: z3.array(getSafetyRatingSchema()).nullish()
      }).nullish()
    })
  )
);
var chunkSchema = lazySchema3(
  () => zodSchema3(
    z3.object({
      candidates: z3.array(
        z3.object({
          content: getContentSchema().nullish(),
          finishReason: z3.string().nullish(),
          finishMessage: z3.string().nullish(),
          safetyRatings: z3.array(getSafetyRatingSchema()).nullish(),
          groundingMetadata: getGroundingMetadataSchema().nullish(),
          urlContextMetadata: getUrlContextMetadataSchema().nullish()
        })
      ).nullish(),
      usageMetadata: usageSchema.nullish(),
      promptFeedback: z3.object({
        blockReason: z3.string().nullish(),
        safetyRatings: z3.array(getSafetyRatingSchema()).nullish()
      }).nullish()
    })
  )
);

// src/tool/code-execution.ts
import { createProviderToolFactoryWithOutputSchema } from "@ai-sdk/provider-utils";
import { z as z4 } from "zod/v4";
var codeExecution = createProviderToolFactoryWithOutputSchema({
  id: "google.code_execution",
  inputSchema: z4.object({
    language: z4.string().describe("The programming language of the code."),
    code: z4.string().describe("The code to be executed.")
  }),
  outputSchema: z4.object({
    outcome: z4.string().describe('The outcome of the execution (e.g., "OUTCOME_OK").'),
    output: z4.string().describe("The output from the code execution.")
  })
});

// src/tool/enterprise-web-search.ts
import {
  createProviderToolFactory,
  lazySchema as lazySchema4,
  zodSchema as zodSchema4
} from "@ai-sdk/provider-utils";
import { z as z5 } from "zod/v4";
var enterpriseWebSearch = createProviderToolFactory({
  id: "google.enterprise_web_search",
  inputSchema: lazySchema4(() => zodSchema4(z5.object({})))
});

// src/tool/file-search.ts
import {
  createProviderToolFactory as createProviderToolFactory2,
  lazySchema as lazySchema5,
  zodSchema as zodSchema5
} from "@ai-sdk/provider-utils";
import { z as z6 } from "zod/v4";
var fileSearchArgsBaseSchema = z6.object({
  /** The names of the file_search_stores to retrieve from.
   *  Example: `fileSearchStores/my-file-search-store-123`
   */
  fileSearchStoreNames: z6.array(z6.string()).describe(
    "The names of the file_search_stores to retrieve from. Example: `fileSearchStores/my-file-search-store-123`"
  ),
  /** The number of file search retrieval chunks to retrieve. */
  topK: z6.number().int().positive().describe("The number of file search retrieval chunks to retrieve.").optional(),
  /** Metadata filter to apply to the file search retrieval documents.
   *  See https://google.aip.dev/160 for the syntax of the filter expression.
   */
  metadataFilter: z6.string().describe(
    "Metadata filter to apply to the file search retrieval documents. See https://google.aip.dev/160 for the syntax of the filter expression."
  ).optional()
}).passthrough();
var fileSearchArgsSchema = lazySchema5(
  () => zodSchema5(fileSearchArgsBaseSchema)
);
var fileSearch = createProviderToolFactory2({
  id: "google.file_search",
  inputSchema: fileSearchArgsSchema
});

// src/tool/google-maps.ts
import {
  createProviderToolFactory as createProviderToolFactory3,
  lazySchema as lazySchema6,
  zodSchema as zodSchema6
} from "@ai-sdk/provider-utils";
import { z as z7 } from "zod/v4";
var googleMaps = createProviderToolFactory3({
  id: "google.google_maps",
  inputSchema: lazySchema6(() => zodSchema6(z7.object({})))
});

// src/tool/google-search.ts
import {
  createProviderToolFactory as createProviderToolFactory4,
  lazySchema as lazySchema7,
  zodSchema as zodSchema7
} from "@ai-sdk/provider-utils";
import { z as z8 } from "zod/v4";
var googleSearchToolArgsBaseSchema = z8.object({
  searchTypes: z8.object({
    webSearch: z8.object({}).optional(),
    imageSearch: z8.object({}).optional()
  }).optional(),
  timeRangeFilter: z8.object({
    startTime: z8.string(),
    endTime: z8.string()
  }).optional()
}).passthrough();
var googleSearchToolArgsSchema = lazySchema7(
  () => zodSchema7(googleSearchToolArgsBaseSchema)
);
var googleSearch = createProviderToolFactory4(
  {
    id: "google.google_search",
    inputSchema: googleSearchToolArgsSchema
  }
);

// src/tool/url-context.ts
import {
  createProviderToolFactory as createProviderToolFactory5,
  lazySchema as lazySchema8,
  zodSchema as zodSchema8
} from "@ai-sdk/provider-utils";
import { z as z9 } from "zod/v4";
var urlContext = createProviderToolFactory5({
  id: "google.url_context",
  inputSchema: lazySchema8(() => zodSchema8(z9.object({})))
});

// src/tool/vertex-rag-store.ts
import { createProviderToolFactory as createProviderToolFactory6 } from "@ai-sdk/provider-utils";
import { z as z10 } from "zod/v4";
var vertexRagStore = createProviderToolFactory6({
  id: "google.vertex_rag_store",
  inputSchema: z10.object({
    ragCorpus: z10.string(),
    topK: z10.number().optional()
  })
});

// src/google-tools.ts
var googleTools = {
  /**
   * Creates a Google search tool that gives Google direct access to real-time web content.
   * Must have name "google_search".
   */
  googleSearch,
  /**
   * Creates an Enterprise Web Search tool for grounding responses using a compliance-focused web index.
   * Designed for highly-regulated industries (finance, healthcare, public sector).
   * Does not log customer data and supports VPC service controls.
   * Must have name "enterprise_web_search".
   *
   * @note Only available on Vertex AI. Requires Gemini 2.0 or newer.
   *
   * @see https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/web-grounding-enterprise
   */
  enterpriseWebSearch,
  /**
   * Creates a Google Maps grounding tool that gives the model access to Google Maps data.
   * Must have name "google_maps".
   *
   * @see https://ai.google.dev/gemini-api/docs/maps-grounding
   * @see https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-maps
   */
  googleMaps,
  /**
   * Creates a URL context tool that gives Google direct access to real-time web content.
   * Must have name "url_context".
   */
  urlContext,
  /**
   * Enables Retrieval Augmented Generation (RAG) via the Gemini File Search tool.
   * Must have name "file_search".
   *
   * @param fileSearchStoreNames - Fully-qualified File Search store resource names.
   * @param metadataFilter - Optional filter expression to restrict the files that can be retrieved.
   * @param topK - Optional result limit for the number of chunks returned from File Search.
   *
   * @see https://ai.google.dev/gemini-api/docs/file-search
   */
  fileSearch,
  /**
   * A tool that enables the model to generate and run Python code.
   * Must have name "code_execution".
   *
   * @note Ensure the selected model supports Code Execution.
   * Multi-tool usage with the code execution tool is typically compatible with Gemini >=2 models.
   *
   * @see https://ai.google.dev/gemini-api/docs/code-execution (Google AI)
   * @see https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/code-execution-api (Vertex AI)
   */
  codeExecution,
  /**
   * Creates a Vertex RAG Store tool that enables the model to perform RAG searches against a Vertex RAG Store.
   * Must have name "vertex_rag_store".
   */
  vertexRagStore
};
export {
  GoogleGenerativeAILanguageModel,
  getGroundingMetadataSchema,
  getUrlContextMetadataSchema,
  googleTools
};
//# sourceMappingURL=index.mjs.map