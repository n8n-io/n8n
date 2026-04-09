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
  createGoogleGenerativeAI: () => createGoogleGenerativeAI,
  google: () => google
});
module.exports = __toCommonJS(index_exports);

// src/google-provider.ts
var import_provider_utils16 = require("@ai-sdk/provider-utils");

// src/version.ts
var VERSION = true ? "3.0.53" : "0.0.0-test";

// src/google-generative-ai-embedding-model.ts
var import_provider = require("@ai-sdk/provider");
var import_provider_utils3 = require("@ai-sdk/provider-utils");
var import_v43 = require("zod/v4");

// src/google-error.ts
var import_provider_utils = require("@ai-sdk/provider-utils");
var import_v4 = require("zod/v4");
var googleErrorDataSchema = (0, import_provider_utils.lazySchema)(
  () => (0, import_provider_utils.zodSchema)(
    import_v4.z.object({
      error: import_v4.z.object({
        code: import_v4.z.number().nullable(),
        message: import_v4.z.string(),
        status: import_v4.z.string()
      })
    })
  )
);
var googleFailedResponseHandler = (0, import_provider_utils.createJsonErrorResponseHandler)({
  errorSchema: googleErrorDataSchema,
  errorToMessage: (data) => data.error.message
});

// src/google-generative-ai-embedding-options.ts
var import_provider_utils2 = require("@ai-sdk/provider-utils");
var import_v42 = require("zod/v4");
var googleEmbeddingContentPartSchema = import_v42.z.union([
  import_v42.z.object({ text: import_v42.z.string() }),
  import_v42.z.object({
    inlineData: import_v42.z.object({
      mimeType: import_v42.z.string(),
      data: import_v42.z.string()
    })
  })
]);
var googleEmbeddingModelOptions = (0, import_provider_utils2.lazySchema)(
  () => (0, import_provider_utils2.zodSchema)(
    import_v42.z.object({
      /**
       * Optional. Optional reduced dimension for the output embedding.
       * If set, excessive values in the output embedding are truncated from the end.
       */
      outputDimensionality: import_v42.z.number().optional(),
      /**
       * Optional. Specifies the task type for generating embeddings.
       * Supported task types:
       * - SEMANTIC_SIMILARITY: Optimized for text similarity.
       * - CLASSIFICATION: Optimized for text classification.
       * - CLUSTERING: Optimized for clustering texts based on similarity.
       * - RETRIEVAL_DOCUMENT: Optimized for document retrieval.
       * - RETRIEVAL_QUERY: Optimized for query-based retrieval.
       * - QUESTION_ANSWERING: Optimized for answering questions.
       * - FACT_VERIFICATION: Optimized for verifying factual information.
       * - CODE_RETRIEVAL_QUERY: Optimized for retrieving code blocks based on natural language queries.
       */
      taskType: import_v42.z.enum([
        "SEMANTIC_SIMILARITY",
        "CLASSIFICATION",
        "CLUSTERING",
        "RETRIEVAL_DOCUMENT",
        "RETRIEVAL_QUERY",
        "QUESTION_ANSWERING",
        "FACT_VERIFICATION",
        "CODE_RETRIEVAL_QUERY"
      ]).optional(),
      /**
       * Optional. Per-value multimodal content parts for embedding non-text
       * content (images, video, PDF, audio). Each entry corresponds to the
       * embedding value at the same index and its parts are merged with the
       * text value in the request. Use `null` for entries that are text-only.
       *
       * The array length must match the number of values being embedded. In
       * the case of a single embedding, the array length must be 1.
       */
      content: import_v42.z.array(import_v42.z.array(googleEmbeddingContentPartSchema).min(1).nullable()).optional()
    })
  )
);

// src/google-generative-ai-embedding-model.ts
var GoogleGenerativeAIEmbeddingModel = class {
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
    const googleOptions = await (0, import_provider_utils3.parseProviderOptions)({
      provider: "google",
      providerOptions,
      schema: googleEmbeddingModelOptions
    });
    if (values.length > this.maxEmbeddingsPerCall) {
      throw new import_provider.TooManyEmbeddingValuesForCallError({
        provider: this.provider,
        modelId: this.modelId,
        maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
        values
      });
    }
    const mergedHeaders = (0, import_provider_utils3.combineHeaders)(
      await (0, import_provider_utils3.resolve)(this.config.headers),
      headers
    );
    const multimodalContent = googleOptions == null ? void 0 : googleOptions.content;
    if (multimodalContent != null && multimodalContent.length !== values.length) {
      throw new Error(
        `The number of multimodal content entries (${multimodalContent.length}) must match the number of values (${values.length}).`
      );
    }
    if (values.length === 1) {
      const valueParts = multimodalContent == null ? void 0 : multimodalContent[0];
      const textPart = values[0] ? [{ text: values[0] }] : [];
      const parts = valueParts != null ? [...textPart, ...valueParts] : [{ text: values[0] }];
      const {
        responseHeaders: responseHeaders2,
        value: response2,
        rawValue: rawValue2
      } = await (0, import_provider_utils3.postJsonToApi)({
        url: `${this.config.baseURL}/models/${this.modelId}:embedContent`,
        headers: mergedHeaders,
        body: {
          model: `models/${this.modelId}`,
          content: {
            parts
          },
          outputDimensionality: googleOptions == null ? void 0 : googleOptions.outputDimensionality,
          taskType: googleOptions == null ? void 0 : googleOptions.taskType
        },
        failedResponseHandler: googleFailedResponseHandler,
        successfulResponseHandler: (0, import_provider_utils3.createJsonResponseHandler)(
          googleGenerativeAISingleEmbeddingResponseSchema
        ),
        abortSignal,
        fetch: this.config.fetch
      });
      return {
        warnings: [],
        embeddings: [response2.embedding.values],
        usage: void 0,
        response: { headers: responseHeaders2, body: rawValue2 }
      };
    }
    const {
      responseHeaders,
      value: response,
      rawValue
    } = await (0, import_provider_utils3.postJsonToApi)({
      url: `${this.config.baseURL}/models/${this.modelId}:batchEmbedContents`,
      headers: mergedHeaders,
      body: {
        requests: values.map((value, index) => {
          const valueParts = multimodalContent == null ? void 0 : multimodalContent[index];
          const textPart = value ? [{ text: value }] : [];
          return {
            model: `models/${this.modelId}`,
            content: {
              role: "user",
              parts: valueParts != null ? [...textPart, ...valueParts] : [{ text: value }]
            },
            outputDimensionality: googleOptions == null ? void 0 : googleOptions.outputDimensionality,
            taskType: googleOptions == null ? void 0 : googleOptions.taskType
          };
        })
      },
      failedResponseHandler: googleFailedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils3.createJsonResponseHandler)(
        googleGenerativeAITextEmbeddingResponseSchema
      ),
      abortSignal,
      fetch: this.config.fetch
    });
    return {
      warnings: [],
      embeddings: response.embeddings.map((item) => item.values),
      usage: void 0,
      response: { headers: responseHeaders, body: rawValue }
    };
  }
};
var googleGenerativeAITextEmbeddingResponseSchema = (0, import_provider_utils3.lazySchema)(
  () => (0, import_provider_utils3.zodSchema)(
    import_v43.z.object({
      embeddings: import_v43.z.array(import_v43.z.object({ values: import_v43.z.array(import_v43.z.number()) }))
    })
  )
);
var googleGenerativeAISingleEmbeddingResponseSchema = (0, import_provider_utils3.lazySchema)(
  () => (0, import_provider_utils3.zodSchema)(
    import_v43.z.object({
      embedding: import_v43.z.object({ values: import_v43.z.array(import_v43.z.number()) })
    })
  )
);

// src/google-generative-ai-language-model.ts
var import_provider_utils6 = require("@ai-sdk/provider-utils");
var import_v45 = require("zod/v4");

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
var import_provider2 = require("@ai-sdk/provider");
var import_provider_utils4 = require("@ai-sdk/provider-utils");
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
          throw new import_provider2.UnsupportedFunctionalityError({
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
                    data: (0, import_provider_utils4.convertToBase64)(part.data)
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
                  throw new import_provider2.UnsupportedFunctionalityError({
                    functionality: "File data URLs in assistant messages are not supported"
                  });
                }
                return {
                  inlineData: {
                    mimeType: part.mediaType,
                    data: (0, import_provider_utils4.convertToBase64)(part.data)
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

// src/google-generative-ai-options.ts
var import_provider_utils5 = require("@ai-sdk/provider-utils");
var import_v44 = require("zod/v4");
var googleLanguageModelOptions = (0, import_provider_utils5.lazySchema)(
  () => (0, import_provider_utils5.zodSchema)(
    import_v44.z.object({
      responseModalities: import_v44.z.array(import_v44.z.enum(["TEXT", "IMAGE"])).optional(),
      thinkingConfig: import_v44.z.object({
        thinkingBudget: import_v44.z.number().optional(),
        includeThoughts: import_v44.z.boolean().optional(),
        // https://ai.google.dev/gemini-api/docs/gemini-3?thinking=high#thinking_level
        thinkingLevel: import_v44.z.enum(["minimal", "low", "medium", "high"]).optional()
      }).optional(),
      /**
       * Optional.
       * The name of the cached content used as context to serve the prediction.
       * Format: cachedContents/{cachedContent}
       */
      cachedContent: import_v44.z.string().optional(),
      /**
       * Optional. Enable structured output. Default is true.
       *
       * This is useful when the JSON Schema contains elements that are
       * not supported by the OpenAPI schema version that
       * Google Generative AI uses. You can use this to disable
       * structured outputs if you need to.
       */
      structuredOutputs: import_v44.z.boolean().optional(),
      /**
       * Optional. A list of unique safety settings for blocking unsafe content.
       */
      safetySettings: import_v44.z.array(
        import_v44.z.object({
          category: import_v44.z.enum([
            "HARM_CATEGORY_UNSPECIFIED",
            "HARM_CATEGORY_HATE_SPEECH",
            "HARM_CATEGORY_DANGEROUS_CONTENT",
            "HARM_CATEGORY_HARASSMENT",
            "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "HARM_CATEGORY_CIVIC_INTEGRITY"
          ]),
          threshold: import_v44.z.enum([
            "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
            "BLOCK_LOW_AND_ABOVE",
            "BLOCK_MEDIUM_AND_ABOVE",
            "BLOCK_ONLY_HIGH",
            "BLOCK_NONE",
            "OFF"
          ])
        })
      ).optional(),
      threshold: import_v44.z.enum([
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
      audioTimestamp: import_v44.z.boolean().optional(),
      /**
       * Optional. Defines labels used in billing reports. Available on Vertex AI only.
       *
       * https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/add-labels-to-api-calls
       */
      labels: import_v44.z.record(import_v44.z.string(), import_v44.z.string()).optional(),
      /**
       * Optional. If specified, the media resolution specified will be used.
       *
       * https://ai.google.dev/api/generate-content#MediaResolution
       */
      mediaResolution: import_v44.z.enum([
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
      imageConfig: import_v44.z.object({
        aspectRatio: import_v44.z.enum([
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
        imageSize: import_v44.z.enum(["1K", "2K", "4K", "512"]).optional()
      }).optional(),
      /**
       * Optional. Configuration for grounding retrieval.
       * Used to provide location context for Google Maps and Google Search grounding.
       *
       * https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-maps
       */
      retrievalConfig: import_v44.z.object({
        latLng: import_v44.z.object({
          latitude: import_v44.z.number(),
          longitude: import_v44.z.number()
        }).optional()
      }).optional()
    })
  )
);

// src/google-prepare-tools.ts
var import_provider3 = require("@ai-sdk/provider");
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
      throw new import_provider3.UnsupportedFunctionalityError({
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
    this.generateId = (_a = config.generateId) != null ? _a : import_provider_utils6.generateId;
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
    let googleOptions = await (0, import_provider_utils6.parseProviderOptions)({
      provider: providerOptionsName,
      providerOptions,
      schema: googleLanguageModelOptions
    });
    if (googleOptions == null && providerOptionsName !== "google") {
      googleOptions = await (0, import_provider_utils6.parseProviderOptions)({
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
    const mergedHeaders = (0, import_provider_utils6.combineHeaders)(
      await (0, import_provider_utils6.resolve)(this.config.headers),
      options.headers
    );
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await (0, import_provider_utils6.postJsonToApi)({
      url: `${this.config.baseURL}/${getModelPath(
        this.modelId
      )}:generateContent`,
      headers: mergedHeaders,
      body: args,
      failedResponseHandler: googleFailedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils6.createJsonResponseHandler)(responseSchema),
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
    const headers = (0, import_provider_utils6.combineHeaders)(
      await (0, import_provider_utils6.resolve)(this.config.headers),
      options.headers
    );
    const { responseHeaders, value: response } = await (0, import_provider_utils6.postJsonToApi)({
      url: `${this.config.baseURL}/${getModelPath(
        this.modelId
      )}:streamGenerateContent?alt=sse`,
      headers,
      body: args,
      failedResponseHandler: googleFailedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils6.createEventSourceResponseHandler)(chunkSchema),
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
    const generateId3 = this.config.generateId;
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
              generateId: generateId3
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
                  const toolCallId = generateId3();
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
                generateId: generateId3,
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
  generateId: generateId3,
  providerOptionsName
}) {
  const functionCallParts = parts == null ? void 0 : parts.filter(
    (part) => "functionCall" in part
  );
  return functionCallParts == null || functionCallParts.length === 0 ? void 0 : functionCallParts.map((part) => ({
    type: "tool-call",
    toolCallId: generateId3(),
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
  generateId: generateId3
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
        id: generateId3(),
        url: chunk.web.uri,
        title: (_a = chunk.web.title) != null ? _a : void 0
      });
    } else if (chunk.image != null) {
      sources.push({
        type: "source",
        sourceType: "url",
        id: generateId3(),
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
          id: generateId3(),
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
          id: generateId3(),
          mediaType,
          title,
          filename
        });
      } else if (fileSearchStore) {
        const title = (_e = chunk.retrievedContext.title) != null ? _e : "Unknown Document";
        sources.push({
          type: "source",
          sourceType: "document",
          id: generateId3(),
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
          id: generateId3(),
          url: chunk.maps.uri,
          title: (_f = chunk.maps.title) != null ? _f : void 0
        });
      }
    }
  }
  return sources.length > 0 ? sources : void 0;
}
var getGroundingMetadataSchema = () => import_v45.z.object({
  webSearchQueries: import_v45.z.array(import_v45.z.string()).nullish(),
  imageSearchQueries: import_v45.z.array(import_v45.z.string()).nullish(),
  retrievalQueries: import_v45.z.array(import_v45.z.string()).nullish(),
  searchEntryPoint: import_v45.z.object({ renderedContent: import_v45.z.string() }).nullish(),
  groundingChunks: import_v45.z.array(
    import_v45.z.object({
      web: import_v45.z.object({ uri: import_v45.z.string(), title: import_v45.z.string().nullish() }).nullish(),
      image: import_v45.z.object({
        sourceUri: import_v45.z.string(),
        imageUri: import_v45.z.string(),
        title: import_v45.z.string().nullish(),
        domain: import_v45.z.string().nullish()
      }).nullish(),
      retrievedContext: import_v45.z.object({
        uri: import_v45.z.string().nullish(),
        title: import_v45.z.string().nullish(),
        text: import_v45.z.string().nullish(),
        fileSearchStore: import_v45.z.string().nullish()
      }).nullish(),
      maps: import_v45.z.object({
        uri: import_v45.z.string().nullish(),
        title: import_v45.z.string().nullish(),
        text: import_v45.z.string().nullish(),
        placeId: import_v45.z.string().nullish()
      }).nullish()
    })
  ).nullish(),
  groundingSupports: import_v45.z.array(
    import_v45.z.object({
      segment: import_v45.z.object({
        startIndex: import_v45.z.number().nullish(),
        endIndex: import_v45.z.number().nullish(),
        text: import_v45.z.string().nullish()
      }).nullish(),
      segment_text: import_v45.z.string().nullish(),
      groundingChunkIndices: import_v45.z.array(import_v45.z.number()).nullish(),
      supportChunkIndices: import_v45.z.array(import_v45.z.number()).nullish(),
      confidenceScores: import_v45.z.array(import_v45.z.number()).nullish(),
      confidenceScore: import_v45.z.array(import_v45.z.number()).nullish()
    })
  ).nullish(),
  retrievalMetadata: import_v45.z.union([
    import_v45.z.object({
      webDynamicRetrievalScore: import_v45.z.number()
    }),
    import_v45.z.object({})
  ]).nullish()
});
var getContentSchema = () => import_v45.z.object({
  parts: import_v45.z.array(
    import_v45.z.union([
      // note: order matters since text can be fully empty
      import_v45.z.object({
        functionCall: import_v45.z.object({
          name: import_v45.z.string(),
          args: import_v45.z.unknown()
        }),
        thoughtSignature: import_v45.z.string().nullish()
      }),
      import_v45.z.object({
        inlineData: import_v45.z.object({
          mimeType: import_v45.z.string(),
          data: import_v45.z.string()
        }),
        thought: import_v45.z.boolean().nullish(),
        thoughtSignature: import_v45.z.string().nullish()
      }),
      import_v45.z.object({
        executableCode: import_v45.z.object({
          language: import_v45.z.string(),
          code: import_v45.z.string()
        }).nullish(),
        codeExecutionResult: import_v45.z.object({
          outcome: import_v45.z.string(),
          output: import_v45.z.string().nullish()
        }).nullish(),
        text: import_v45.z.string().nullish(),
        thought: import_v45.z.boolean().nullish(),
        thoughtSignature: import_v45.z.string().nullish()
      })
    ])
  ).nullish()
});
var getSafetyRatingSchema = () => import_v45.z.object({
  category: import_v45.z.string().nullish(),
  probability: import_v45.z.string().nullish(),
  probabilityScore: import_v45.z.number().nullish(),
  severity: import_v45.z.string().nullish(),
  severityScore: import_v45.z.number().nullish(),
  blocked: import_v45.z.boolean().nullish()
});
var usageSchema = import_v45.z.object({
  cachedContentTokenCount: import_v45.z.number().nullish(),
  thoughtsTokenCount: import_v45.z.number().nullish(),
  promptTokenCount: import_v45.z.number().nullish(),
  candidatesTokenCount: import_v45.z.number().nullish(),
  totalTokenCount: import_v45.z.number().nullish(),
  // https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerateContentResponse#TrafficType
  trafficType: import_v45.z.string().nullish()
});
var getUrlContextMetadataSchema = () => import_v45.z.object({
  urlMetadata: import_v45.z.array(
    import_v45.z.object({
      retrievedUrl: import_v45.z.string(),
      urlRetrievalStatus: import_v45.z.string()
    })
  ).nullish()
});
var responseSchema = (0, import_provider_utils6.lazySchema)(
  () => (0, import_provider_utils6.zodSchema)(
    import_v45.z.object({
      candidates: import_v45.z.array(
        import_v45.z.object({
          content: getContentSchema().nullish().or(import_v45.z.object({}).strict()),
          finishReason: import_v45.z.string().nullish(),
          finishMessage: import_v45.z.string().nullish(),
          safetyRatings: import_v45.z.array(getSafetyRatingSchema()).nullish(),
          groundingMetadata: getGroundingMetadataSchema().nullish(),
          urlContextMetadata: getUrlContextMetadataSchema().nullish()
        })
      ),
      usageMetadata: usageSchema.nullish(),
      promptFeedback: import_v45.z.object({
        blockReason: import_v45.z.string().nullish(),
        safetyRatings: import_v45.z.array(getSafetyRatingSchema()).nullish()
      }).nullish()
    })
  )
);
var chunkSchema = (0, import_provider_utils6.lazySchema)(
  () => (0, import_provider_utils6.zodSchema)(
    import_v45.z.object({
      candidates: import_v45.z.array(
        import_v45.z.object({
          content: getContentSchema().nullish(),
          finishReason: import_v45.z.string().nullish(),
          finishMessage: import_v45.z.string().nullish(),
          safetyRatings: import_v45.z.array(getSafetyRatingSchema()).nullish(),
          groundingMetadata: getGroundingMetadataSchema().nullish(),
          urlContextMetadata: getUrlContextMetadataSchema().nullish()
        })
      ).nullish(),
      usageMetadata: usageSchema.nullish(),
      promptFeedback: import_v45.z.object({
        blockReason: import_v45.z.string().nullish(),
        safetyRatings: import_v45.z.array(getSafetyRatingSchema()).nullish()
      }).nullish()
    })
  )
);

// src/tool/code-execution.ts
var import_provider_utils7 = require("@ai-sdk/provider-utils");
var import_v46 = require("zod/v4");
var codeExecution = (0, import_provider_utils7.createProviderToolFactoryWithOutputSchema)({
  id: "google.code_execution",
  inputSchema: import_v46.z.object({
    language: import_v46.z.string().describe("The programming language of the code."),
    code: import_v46.z.string().describe("The code to be executed.")
  }),
  outputSchema: import_v46.z.object({
    outcome: import_v46.z.string().describe('The outcome of the execution (e.g., "OUTCOME_OK").'),
    output: import_v46.z.string().describe("The output from the code execution.")
  })
});

// src/tool/enterprise-web-search.ts
var import_provider_utils8 = require("@ai-sdk/provider-utils");
var import_v47 = require("zod/v4");
var enterpriseWebSearch = (0, import_provider_utils8.createProviderToolFactory)({
  id: "google.enterprise_web_search",
  inputSchema: (0, import_provider_utils8.lazySchema)(() => (0, import_provider_utils8.zodSchema)(import_v47.z.object({})))
});

// src/tool/file-search.ts
var import_provider_utils9 = require("@ai-sdk/provider-utils");
var import_v48 = require("zod/v4");
var fileSearchArgsBaseSchema = import_v48.z.object({
  /** The names of the file_search_stores to retrieve from.
   *  Example: `fileSearchStores/my-file-search-store-123`
   */
  fileSearchStoreNames: import_v48.z.array(import_v48.z.string()).describe(
    "The names of the file_search_stores to retrieve from. Example: `fileSearchStores/my-file-search-store-123`"
  ),
  /** The number of file search retrieval chunks to retrieve. */
  topK: import_v48.z.number().int().positive().describe("The number of file search retrieval chunks to retrieve.").optional(),
  /** Metadata filter to apply to the file search retrieval documents.
   *  See https://google.aip.dev/160 for the syntax of the filter expression.
   */
  metadataFilter: import_v48.z.string().describe(
    "Metadata filter to apply to the file search retrieval documents. See https://google.aip.dev/160 for the syntax of the filter expression."
  ).optional()
}).passthrough();
var fileSearchArgsSchema = (0, import_provider_utils9.lazySchema)(
  () => (0, import_provider_utils9.zodSchema)(fileSearchArgsBaseSchema)
);
var fileSearch = (0, import_provider_utils9.createProviderToolFactory)({
  id: "google.file_search",
  inputSchema: fileSearchArgsSchema
});

// src/tool/google-maps.ts
var import_provider_utils10 = require("@ai-sdk/provider-utils");
var import_v49 = require("zod/v4");
var googleMaps = (0, import_provider_utils10.createProviderToolFactory)({
  id: "google.google_maps",
  inputSchema: (0, import_provider_utils10.lazySchema)(() => (0, import_provider_utils10.zodSchema)(import_v49.z.object({})))
});

// src/tool/google-search.ts
var import_provider_utils11 = require("@ai-sdk/provider-utils");
var import_v410 = require("zod/v4");
var googleSearchToolArgsBaseSchema = import_v410.z.object({
  searchTypes: import_v410.z.object({
    webSearch: import_v410.z.object({}).optional(),
    imageSearch: import_v410.z.object({}).optional()
  }).optional(),
  timeRangeFilter: import_v410.z.object({
    startTime: import_v410.z.string(),
    endTime: import_v410.z.string()
  }).optional()
}).passthrough();
var googleSearchToolArgsSchema = (0, import_provider_utils11.lazySchema)(
  () => (0, import_provider_utils11.zodSchema)(googleSearchToolArgsBaseSchema)
);
var googleSearch = (0, import_provider_utils11.createProviderToolFactory)(
  {
    id: "google.google_search",
    inputSchema: googleSearchToolArgsSchema
  }
);

// src/tool/url-context.ts
var import_provider_utils12 = require("@ai-sdk/provider-utils");
var import_v411 = require("zod/v4");
var urlContext = (0, import_provider_utils12.createProviderToolFactory)({
  id: "google.url_context",
  inputSchema: (0, import_provider_utils12.lazySchema)(() => (0, import_provider_utils12.zodSchema)(import_v411.z.object({})))
});

// src/tool/vertex-rag-store.ts
var import_provider_utils13 = require("@ai-sdk/provider-utils");
var import_v412 = require("zod/v4");
var vertexRagStore = (0, import_provider_utils13.createProviderToolFactory)({
  id: "google.vertex_rag_store",
  inputSchema: import_v412.z.object({
    ragCorpus: import_v412.z.string(),
    topK: import_v412.z.number().optional()
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

// src/google-generative-ai-image-model.ts
var import_provider_utils14 = require("@ai-sdk/provider-utils");
var import_v413 = require("zod/v4");
var GoogleGenerativeAIImageModel = class {
  constructor(modelId, settings, config) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
    this.specificationVersion = "v3";
  }
  get maxImagesPerCall() {
    if (this.settings.maxImagesPerCall != null) {
      return this.settings.maxImagesPerCall;
    }
    if (isGeminiModel(this.modelId)) {
      return 10;
    }
    return 4;
  }
  get provider() {
    return this.config.provider;
  }
  async doGenerate(options) {
    if (isGeminiModel(this.modelId)) {
      return this.doGenerateGemini(options);
    }
    return this.doGenerateImagen(options);
  }
  async doGenerateImagen(options) {
    var _a, _b, _c;
    const {
      prompt,
      n = 1,
      size,
      aspectRatio = "1:1",
      seed,
      providerOptions,
      headers,
      abortSignal,
      files,
      mask
    } = options;
    const warnings = [];
    if (files != null && files.length > 0) {
      throw new Error(
        "Google Generative AI does not support image editing with Imagen models. Use Google Vertex AI (@ai-sdk/google-vertex) for image editing capabilities."
      );
    }
    if (mask != null) {
      throw new Error(
        "Google Generative AI does not support image editing with masks. Use Google Vertex AI (@ai-sdk/google-vertex) for image editing capabilities."
      );
    }
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
        feature: "seed",
        details: "This model does not support the `seed` option through this provider."
      });
    }
    const googleOptions = await (0, import_provider_utils14.parseProviderOptions)({
      provider: "google",
      providerOptions,
      schema: googleImageModelOptionsSchema
    });
    const currentDate = (_c = (_b = (_a = this.config._internal) == null ? void 0 : _a.currentDate) == null ? void 0 : _b.call(_a)) != null ? _c : /* @__PURE__ */ new Date();
    const parameters = {
      sampleCount: n
    };
    if (aspectRatio != null) {
      parameters.aspectRatio = aspectRatio;
    }
    if (googleOptions) {
      Object.assign(parameters, googleOptions);
    }
    const body = {
      instances: [{ prompt }],
      parameters
    };
    const { responseHeaders, value: response } = await (0, import_provider_utils14.postJsonToApi)({
      url: `${this.config.baseURL}/models/${this.modelId}:predict`,
      headers: (0, import_provider_utils14.combineHeaders)(await (0, import_provider_utils14.resolve)(this.config.headers), headers),
      body,
      failedResponseHandler: googleFailedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils14.createJsonResponseHandler)(
        googleImageResponseSchema
      ),
      abortSignal,
      fetch: this.config.fetch
    });
    return {
      images: response.predictions.map(
        (p) => p.bytesBase64Encoded
      ),
      warnings,
      providerMetadata: {
        google: {
          images: response.predictions.map(() => ({
            // Add any prediction-specific metadata here
          }))
        }
      },
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders
      }
    };
  }
  async doGenerateGemini(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const {
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
    } = options;
    const warnings = [];
    if (mask != null) {
      throw new Error(
        "Gemini image models do not support mask-based image editing."
      );
    }
    if (n != null && n > 1) {
      throw new Error(
        "Gemini image models do not support generating a set number of images per call. Use n=1 or omit the n parameter."
      );
    }
    if (size != null) {
      warnings.push({
        type: "unsupported",
        feature: "size",
        details: "This model does not support the `size` option. Use `aspectRatio` instead."
      });
    }
    const userContent = [];
    if (prompt != null) {
      userContent.push({ type: "text", text: prompt });
    }
    if (files != null && files.length > 0) {
      for (const file of files) {
        if (file.type === "url") {
          userContent.push({
            type: "file",
            data: new URL(file.url),
            mediaType: "image/*"
          });
        } else {
          userContent.push({
            type: "file",
            data: typeof file.data === "string" ? file.data : new Uint8Array(file.data),
            mediaType: file.mediaType
          });
        }
      }
    }
    const languageModelPrompt = [
      { role: "user", content: userContent }
    ];
    const languageModel = new GoogleGenerativeAILanguageModel(this.modelId, {
      provider: this.config.provider,
      baseURL: this.config.baseURL,
      headers: (_a = this.config.headers) != null ? _a : {},
      fetch: this.config.fetch,
      generateId: (_b = this.config.generateId) != null ? _b : import_provider_utils14.generateId
    });
    const result = await languageModel.doGenerate({
      prompt: languageModelPrompt,
      seed,
      providerOptions: {
        google: {
          responseModalities: ["IMAGE"],
          imageConfig: aspectRatio ? {
            aspectRatio
          } : void 0,
          ...(_c = providerOptions == null ? void 0 : providerOptions.google) != null ? _c : {}
        }
      },
      headers,
      abortSignal
    });
    const currentDate = (_f = (_e = (_d = this.config._internal) == null ? void 0 : _d.currentDate) == null ? void 0 : _e.call(_d)) != null ? _f : /* @__PURE__ */ new Date();
    const images = [];
    for (const part of result.content) {
      if (part.type === "file" && part.mediaType.startsWith("image/")) {
        images.push((0, import_provider_utils14.convertToBase64)(part.data));
      }
    }
    return {
      images,
      warnings,
      providerMetadata: {
        google: {
          images: images.map(() => ({}))
        }
      },
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: (_g = result.response) == null ? void 0 : _g.headers
      },
      usage: result.usage ? {
        inputTokens: result.usage.inputTokens.total,
        outputTokens: result.usage.outputTokens.total,
        totalTokens: ((_h = result.usage.inputTokens.total) != null ? _h : 0) + ((_i = result.usage.outputTokens.total) != null ? _i : 0)
      } : void 0
    };
  }
};
function isGeminiModel(modelId) {
  return modelId.startsWith("gemini-");
}
var googleImageResponseSchema = (0, import_provider_utils14.lazySchema)(
  () => (0, import_provider_utils14.zodSchema)(
    import_v413.z.object({
      predictions: import_v413.z.array(import_v413.z.object({ bytesBase64Encoded: import_v413.z.string() })).default([])
    })
  )
);
var googleImageModelOptionsSchema = (0, import_provider_utils14.lazySchema)(
  () => (0, import_provider_utils14.zodSchema)(
    import_v413.z.object({
      personGeneration: import_v413.z.enum(["dont_allow", "allow_adult", "allow_all"]).nullish(),
      aspectRatio: import_v413.z.enum(["1:1", "3:4", "4:3", "9:16", "16:9"]).nullish()
    })
  )
);

// src/google-generative-ai-video-model.ts
var import_provider4 = require("@ai-sdk/provider");
var import_provider_utils15 = require("@ai-sdk/provider-utils");
var import_v414 = require("zod/v4");
var GoogleGenerativeAIVideoModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
  }
  get provider() {
    return this.config.provider;
  }
  get maxVideosPerCall() {
    return 4;
  }
  async doGenerate(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const currentDate = (_c = (_b = (_a = this.config._internal) == null ? void 0 : _a.currentDate) == null ? void 0 : _b.call(_a)) != null ? _c : /* @__PURE__ */ new Date();
    const warnings = [];
    const googleOptions = await (0, import_provider_utils15.parseProviderOptions)({
      provider: "google",
      providerOptions: options.providerOptions,
      schema: googleVideoModelOptionsSchema
    });
    const instances = [{}];
    const instance = instances[0];
    if (options.prompt != null) {
      instance.prompt = options.prompt;
    }
    if (options.image != null) {
      if (options.image.type === "url") {
        warnings.push({
          type: "unsupported",
          feature: "URL-based image input",
          details: "Google Generative AI video models require base64-encoded images. URL will be ignored."
        });
      } else {
        const base64Data = typeof options.image.data === "string" ? options.image.data : (0, import_provider_utils15.convertUint8ArrayToBase64)(options.image.data);
        instance.image = {
          inlineData: {
            mimeType: options.image.mediaType || "image/png",
            data: base64Data
          }
        };
      }
    }
    if ((googleOptions == null ? void 0 : googleOptions.referenceImages) != null) {
      instance.referenceImages = googleOptions.referenceImages.map((refImg) => {
        if (refImg.bytesBase64Encoded) {
          return {
            inlineData: {
              mimeType: "image/png",
              data: refImg.bytesBase64Encoded
            }
          };
        } else if (refImg.gcsUri) {
          return {
            gcsUri: refImg.gcsUri
          };
        }
        return refImg;
      });
    }
    const parameters = {
      sampleCount: options.n
    };
    if (options.aspectRatio) {
      parameters.aspectRatio = options.aspectRatio;
    }
    if (options.resolution) {
      const resolutionMap = {
        "1280x720": "720p",
        "1920x1080": "1080p",
        "3840x2160": "4k"
      };
      parameters.resolution = resolutionMap[options.resolution] || options.resolution;
    }
    if (options.duration) {
      parameters.durationSeconds = options.duration;
    }
    if (options.seed) {
      parameters.seed = options.seed;
    }
    if (googleOptions != null) {
      const opts = googleOptions;
      if (opts.personGeneration !== void 0 && opts.personGeneration !== null) {
        parameters.personGeneration = opts.personGeneration;
      }
      if (opts.negativePrompt !== void 0 && opts.negativePrompt !== null) {
        parameters.negativePrompt = opts.negativePrompt;
      }
      for (const [key, value] of Object.entries(opts)) {
        if (![
          "pollIntervalMs",
          "pollTimeoutMs",
          "personGeneration",
          "negativePrompt",
          "referenceImages"
        ].includes(key)) {
          parameters[key] = value;
        }
      }
    }
    const { value: operation } = await (0, import_provider_utils15.postJsonToApi)({
      url: `${this.config.baseURL}/models/${this.modelId}:predictLongRunning`,
      headers: (0, import_provider_utils15.combineHeaders)(
        await (0, import_provider_utils15.resolve)(this.config.headers),
        options.headers
      ),
      body: {
        instances,
        parameters
      },
      successfulResponseHandler: (0, import_provider_utils15.createJsonResponseHandler)(
        googleOperationSchema
      ),
      failedResponseHandler: googleFailedResponseHandler,
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const operationName = operation.name;
    if (!operationName) {
      throw new import_provider4.AISDKError({
        name: "GOOGLE_VIDEO_GENERATION_ERROR",
        message: "No operation name returned from API"
      });
    }
    const pollIntervalMs = (_d = googleOptions == null ? void 0 : googleOptions.pollIntervalMs) != null ? _d : 1e4;
    const pollTimeoutMs = (_e = googleOptions == null ? void 0 : googleOptions.pollTimeoutMs) != null ? _e : 6e5;
    const startTime = Date.now();
    let finalOperation = operation;
    let responseHeaders;
    while (!finalOperation.done) {
      if (Date.now() - startTime > pollTimeoutMs) {
        throw new import_provider4.AISDKError({
          name: "GOOGLE_VIDEO_GENERATION_TIMEOUT",
          message: `Video generation timed out after ${pollTimeoutMs}ms`
        });
      }
      await (0, import_provider_utils15.delay)(pollIntervalMs);
      if ((_f = options.abortSignal) == null ? void 0 : _f.aborted) {
        throw new import_provider4.AISDKError({
          name: "GOOGLE_VIDEO_GENERATION_ABORTED",
          message: "Video generation request was aborted"
        });
      }
      const { value: statusOperation, responseHeaders: pollHeaders } = await (0, import_provider_utils15.getFromApi)({
        url: `${this.config.baseURL}/${operationName}`,
        headers: (0, import_provider_utils15.combineHeaders)(
          await (0, import_provider_utils15.resolve)(this.config.headers),
          options.headers
        ),
        successfulResponseHandler: (0, import_provider_utils15.createJsonResponseHandler)(
          googleOperationSchema
        ),
        failedResponseHandler: googleFailedResponseHandler,
        abortSignal: options.abortSignal,
        fetch: this.config.fetch
      });
      finalOperation = statusOperation;
      responseHeaders = pollHeaders;
    }
    if (finalOperation.error) {
      throw new import_provider4.AISDKError({
        name: "GOOGLE_VIDEO_GENERATION_FAILED",
        message: `Video generation failed: ${finalOperation.error.message}`
      });
    }
    const response = finalOperation.response;
    if (!((_g = response == null ? void 0 : response.generateVideoResponse) == null ? void 0 : _g.generatedSamples) || response.generateVideoResponse.generatedSamples.length === 0) {
      throw new import_provider4.AISDKError({
        name: "GOOGLE_VIDEO_GENERATION_ERROR",
        message: `No videos in response. Response: ${JSON.stringify(finalOperation)}`
      });
    }
    const videos = [];
    const videoMetadata = [];
    const resolvedHeaders = await (0, import_provider_utils15.resolve)(this.config.headers);
    const apiKey = resolvedHeaders == null ? void 0 : resolvedHeaders["x-goog-api-key"];
    for (const generatedSample of response.generateVideoResponse.generatedSamples) {
      if ((_h = generatedSample.video) == null ? void 0 : _h.uri) {
        const urlWithAuth = apiKey ? `${generatedSample.video.uri}${generatedSample.video.uri.includes("?") ? "&" : "?"}key=${apiKey}` : generatedSample.video.uri;
        videos.push({
          type: "url",
          url: urlWithAuth,
          mediaType: "video/mp4"
        });
        videoMetadata.push({
          uri: generatedSample.video.uri
        });
      }
    }
    if (videos.length === 0) {
      throw new import_provider4.AISDKError({
        name: "GOOGLE_VIDEO_GENERATION_ERROR",
        message: "No valid videos in response"
      });
    }
    return {
      videos,
      warnings,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders
      },
      providerMetadata: {
        google: {
          videos: videoMetadata
        }
      }
    };
  }
};
var googleOperationSchema = import_v414.z.object({
  name: import_v414.z.string().nullish(),
  done: import_v414.z.boolean().nullish(),
  error: import_v414.z.object({
    code: import_v414.z.number().nullish(),
    message: import_v414.z.string(),
    status: import_v414.z.string().nullish()
  }).nullish(),
  response: import_v414.z.object({
    generateVideoResponse: import_v414.z.object({
      generatedSamples: import_v414.z.array(
        import_v414.z.object({
          video: import_v414.z.object({
            uri: import_v414.z.string().nullish()
          }).nullish()
        })
      ).nullish()
    }).nullish()
  }).nullish()
});
var googleVideoModelOptionsSchema = (0, import_provider_utils15.lazySchema)(
  () => (0, import_provider_utils15.zodSchema)(
    import_v414.z.object({
      pollIntervalMs: import_v414.z.number().positive().nullish(),
      pollTimeoutMs: import_v414.z.number().positive().nullish(),
      personGeneration: import_v414.z.enum(["dont_allow", "allow_adult", "allow_all"]).nullish(),
      negativePrompt: import_v414.z.string().nullish(),
      referenceImages: import_v414.z.array(
        import_v414.z.object({
          bytesBase64Encoded: import_v414.z.string().nullish(),
          gcsUri: import_v414.z.string().nullish()
        })
      ).nullish()
    }).passthrough()
  )
);

// src/google-provider.ts
function createGoogleGenerativeAI(options = {}) {
  var _a, _b;
  const baseURL = (_a = (0, import_provider_utils16.withoutTrailingSlash)(options.baseURL)) != null ? _a : "https://generativelanguage.googleapis.com/v1beta";
  const providerName = (_b = options.name) != null ? _b : "google.generative-ai";
  const getHeaders = () => (0, import_provider_utils16.withUserAgentSuffix)(
    {
      "x-goog-api-key": (0, import_provider_utils16.loadApiKey)({
        apiKey: options.apiKey,
        environmentVariableName: "GOOGLE_GENERATIVE_AI_API_KEY",
        description: "Google Generative AI"
      }),
      ...options.headers
    },
    `ai-sdk/google/${VERSION}`
  );
  const createChatModel = (modelId) => {
    var _a2;
    return new GoogleGenerativeAILanguageModel(modelId, {
      provider: providerName,
      baseURL,
      headers: getHeaders,
      generateId: (_a2 = options.generateId) != null ? _a2 : import_provider_utils16.generateId,
      supportedUrls: () => ({
        "*": [
          // Google Generative Language "files" endpoint
          // e.g. https://generativelanguage.googleapis.com/v1beta/files/...
          new RegExp(`^${baseURL}/files/.*$`),
          // YouTube URLs (public or unlisted videos)
          new RegExp(
            `^https://(?:www\\.)?youtube\\.com/watch\\?v=[\\w-]+(?:&[\\w=&.-]*)?$`
          ),
          new RegExp(`^https://youtu\\.be/[\\w-]+(?:\\?[\\w=&.-]*)?$`)
        ]
      }),
      fetch: options.fetch
    });
  };
  const createEmbeddingModel = (modelId) => new GoogleGenerativeAIEmbeddingModel(modelId, {
    provider: providerName,
    baseURL,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createImageModel = (modelId, settings = {}) => new GoogleGenerativeAIImageModel(modelId, settings, {
    provider: providerName,
    baseURL,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createVideoModel = (modelId) => {
    var _a2;
    return new GoogleGenerativeAIVideoModel(modelId, {
      provider: providerName,
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      generateId: (_a2 = options.generateId) != null ? _a2 : import_provider_utils16.generateId
    });
  };
  const provider = function(modelId) {
    if (new.target) {
      throw new Error(
        "The Google Generative AI model function cannot be called with the new keyword."
      );
    }
    return createChatModel(modelId);
  };
  provider.specificationVersion = "v3";
  provider.languageModel = createChatModel;
  provider.chat = createChatModel;
  provider.generativeAI = createChatModel;
  provider.embedding = createEmbeddingModel;
  provider.embeddingModel = createEmbeddingModel;
  provider.textEmbedding = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.image = createImageModel;
  provider.imageModel = createImageModel;
  provider.video = createVideoModel;
  provider.videoModel = createVideoModel;
  provider.tools = googleTools;
  return provider;
}
var google = createGoogleGenerativeAI();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VERSION,
  createGoogleGenerativeAI,
  google
});
//# sourceMappingURL=index.js.map