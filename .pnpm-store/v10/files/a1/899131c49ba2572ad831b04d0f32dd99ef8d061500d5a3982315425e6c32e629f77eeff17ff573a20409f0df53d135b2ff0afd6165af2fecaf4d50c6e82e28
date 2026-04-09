"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name5 in all)
    __defProp(target, name5, { get: all[name5], enumerable: true });
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

// internal/index.ts
var internal_exports = {};
__export(internal_exports, {
  asLanguageModelUsage: () => asLanguageModelUsage,
  convertAsyncIteratorToReadableStream: () => import_provider_utils9.convertAsyncIteratorToReadableStream,
  convertToLanguageModelPrompt: () => convertToLanguageModelPrompt,
  prepareCallSettings: () => prepareCallSettings,
  prepareRetries: () => prepareRetries,
  prepareToolsAndToolChoice: () => prepareToolsAndToolChoice,
  standardizePrompt: () => standardizePrompt
});
module.exports = __toCommonJS(internal_exports);
var import_provider_utils9 = require("@ai-sdk/provider-utils");

// src/prompt/convert-to-language-model-prompt.ts
var import_provider_utils5 = require("@ai-sdk/provider-utils");

// src/util/detect-media-type.ts
var import_provider_utils = require("@ai-sdk/provider-utils");
var imageMediaTypeSignatures = [
  {
    mediaType: "image/gif",
    bytesPrefix: [71, 73, 70]
    // GIF
  },
  {
    mediaType: "image/png",
    bytesPrefix: [137, 80, 78, 71]
    // PNG
  },
  {
    mediaType: "image/jpeg",
    bytesPrefix: [255, 216]
    // JPEG
  },
  {
    mediaType: "image/webp",
    bytesPrefix: [
      82,
      73,
      70,
      70,
      // "RIFF"
      null,
      null,
      null,
      null,
      // file size (variable)
      87,
      69,
      66,
      80
      // "WEBP"
    ]
  },
  {
    mediaType: "image/bmp",
    bytesPrefix: [66, 77]
  },
  {
    mediaType: "image/tiff",
    bytesPrefix: [73, 73, 42, 0]
  },
  {
    mediaType: "image/tiff",
    bytesPrefix: [77, 77, 0, 42]
  },
  {
    mediaType: "image/avif",
    bytesPrefix: [
      0,
      0,
      0,
      32,
      102,
      116,
      121,
      112,
      97,
      118,
      105,
      102
    ]
  },
  {
    mediaType: "image/heic",
    bytesPrefix: [
      0,
      0,
      0,
      32,
      102,
      116,
      121,
      112,
      104,
      101,
      105,
      99
    ]
  }
];
var stripID3 = (data) => {
  const bytes = typeof data === "string" ? (0, import_provider_utils.convertBase64ToUint8Array)(data) : data;
  const id3Size = (bytes[6] & 127) << 21 | (bytes[7] & 127) << 14 | (bytes[8] & 127) << 7 | bytes[9] & 127;
  return bytes.slice(id3Size + 10);
};
function stripID3TagsIfPresent(data) {
  const hasId3 = typeof data === "string" && data.startsWith("SUQz") || typeof data !== "string" && data.length > 10 && data[0] === 73 && // 'I'
  data[1] === 68 && // 'D'
  data[2] === 51;
  return hasId3 ? stripID3(data) : data;
}
function detectMediaType({
  data,
  signatures
}) {
  const processedData = stripID3TagsIfPresent(data);
  const bytes = typeof processedData === "string" ? (0, import_provider_utils.convertBase64ToUint8Array)(
    processedData.substring(0, Math.min(processedData.length, 24))
  ) : processedData;
  for (const signature of signatures) {
    if (bytes.length >= signature.bytesPrefix.length && signature.bytesPrefix.every(
      (byte, index) => byte === null || bytes[index] === byte
    )) {
      return signature.mediaType;
    }
  }
  return void 0;
}

// src/util/download/download.ts
var import_provider_utils2 = require("@ai-sdk/provider-utils");
var import_provider_utils3 = require("@ai-sdk/provider-utils");

// src/version.ts
var VERSION = true ? "6.0.141" : "0.0.0-test";

// src/util/download/download.ts
var download = async ({
  url,
  maxBytes,
  abortSignal
}) => {
  var _a5;
  const urlText = url.toString();
  (0, import_provider_utils2.validateDownloadUrl)(urlText);
  try {
    const response = await fetch(urlText, {
      headers: (0, import_provider_utils3.withUserAgentSuffix)(
        {},
        `ai-sdk/${VERSION}`,
        (0, import_provider_utils3.getRuntimeEnvironmentUserAgent)()
      ),
      signal: abortSignal
    });
    if (response.redirected) {
      (0, import_provider_utils2.validateDownloadUrl)(response.url);
    }
    if (!response.ok) {
      throw new import_provider_utils2.DownloadError({
        url: urlText,
        statusCode: response.status,
        statusText: response.statusText
      });
    }
    const data = await (0, import_provider_utils2.readResponseWithSizeLimit)({
      response,
      url: urlText,
      maxBytes: maxBytes != null ? maxBytes : import_provider_utils2.DEFAULT_MAX_DOWNLOAD_SIZE
    });
    return {
      data,
      mediaType: (_a5 = response.headers.get("content-type")) != null ? _a5 : void 0
    };
  } catch (error) {
    if (import_provider_utils2.DownloadError.isInstance(error)) {
      throw error;
    }
    throw new import_provider_utils2.DownloadError({ url: urlText, cause: error });
  }
};

// src/util/download/download-function.ts
var createDefaultDownloadFunction = (download2 = download) => (requestedDownloads) => Promise.all(
  requestedDownloads.map(
    async (requestedDownload) => requestedDownload.isUrlSupportedByModel ? null : download2(requestedDownload)
  )
);

// src/prompt/data-content.ts
var import_provider = require("@ai-sdk/provider");
var import_provider_utils4 = require("@ai-sdk/provider-utils");
var import_v4 = require("zod/v4");

// src/prompt/split-data-url.ts
function splitDataUrl(dataUrl) {
  try {
    const [header, base64Content] = dataUrl.split(",");
    return {
      mediaType: header.split(";")[0].split(":")[1],
      base64Content
    };
  } catch (error) {
    return {
      mediaType: void 0,
      base64Content: void 0
    };
  }
}

// src/prompt/data-content.ts
var dataContentSchema = import_v4.z.union([
  import_v4.z.string(),
  import_v4.z.instanceof(Uint8Array),
  import_v4.z.instanceof(ArrayBuffer),
  import_v4.z.custom(
    // Buffer might not be available in some environments such as CloudFlare:
    (value) => {
      var _a5, _b;
      return (_b = (_a5 = globalThis.Buffer) == null ? void 0 : _a5.isBuffer(value)) != null ? _b : false;
    },
    { message: "Must be a Buffer" }
  )
]);
function convertToLanguageModelV3DataContent(content) {
  if (content instanceof Uint8Array) {
    return { data: content, mediaType: void 0 };
  }
  if (content instanceof ArrayBuffer) {
    return { data: new Uint8Array(content), mediaType: void 0 };
  }
  if (typeof content === "string") {
    try {
      content = new URL(content);
    } catch (error) {
    }
  }
  if (content instanceof URL && content.protocol === "data:") {
    const { mediaType: dataUrlMediaType, base64Content } = splitDataUrl(
      content.toString()
    );
    if (dataUrlMediaType == null || base64Content == null) {
      throw new import_provider.AISDKError({
        name: "InvalidDataContentError",
        message: `Invalid data URL format in content ${content.toString()}`
      });
    }
    return { data: base64Content, mediaType: dataUrlMediaType };
  }
  return { data: content, mediaType: void 0 };
}

// src/prompt/invalid-message-role-error.ts
var import_provider2 = require("@ai-sdk/provider");
var name = "AI_InvalidMessageRoleError";
var marker = `vercel.ai.error.${name}`;
var symbol = Symbol.for(marker);
var _a;
var InvalidMessageRoleError = class extends import_provider2.AISDKError {
  constructor({
    role,
    message = `Invalid message role: '${role}'. Must be one of: "system", "user", "assistant", "tool".`
  }) {
    super({ name, message });
    this[_a] = true;
    this.role = role;
  }
  static isInstance(error) {
    return import_provider2.AISDKError.hasMarker(error, marker);
  }
};
_a = symbol;

// src/util/as-array.ts
function asArray(value) {
  return value === void 0 ? [] : Array.isArray(value) ? value : [value];
}

// src/error/missing-tool-result-error.ts
var import_provider3 = require("@ai-sdk/provider");
var name2 = "AI_MissingToolResultsError";
var marker2 = `vercel.ai.error.${name2}`;
var symbol2 = Symbol.for(marker2);
var _a2;
var MissingToolResultsError = class extends import_provider3.AISDKError {
  constructor({ toolCallIds }) {
    super({
      name: name2,
      message: `Tool result${toolCallIds.length > 1 ? "s are" : " is"} missing for tool call${toolCallIds.length > 1 ? "s" : ""} ${toolCallIds.join(
        ", "
      )}.`
    });
    this[_a2] = true;
    this.toolCallIds = toolCallIds;
  }
  static isInstance(error) {
    return import_provider3.AISDKError.hasMarker(error, marker2);
  }
};
_a2 = symbol2;

// src/prompt/convert-to-language-model-prompt.ts
async function convertToLanguageModelPrompt({
  prompt,
  supportedUrls,
  download: download2 = createDefaultDownloadFunction()
}) {
  const downloadedAssets = await downloadAssets(
    prompt.messages,
    download2,
    supportedUrls
  );
  const approvalIdToToolCallId = /* @__PURE__ */ new Map();
  for (const message of prompt.messages) {
    if (message.role === "assistant" && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === "tool-approval-request" && "approvalId" in part && "toolCallId" in part) {
          approvalIdToToolCallId.set(
            part.approvalId,
            part.toolCallId
          );
        }
      }
    }
  }
  const approvedToolCallIds = /* @__PURE__ */ new Set();
  for (const message of prompt.messages) {
    if (message.role === "tool") {
      for (const part of message.content) {
        if (part.type === "tool-approval-response") {
          const toolCallId = approvalIdToToolCallId.get(part.approvalId);
          if (toolCallId) {
            approvedToolCallIds.add(toolCallId);
          }
        }
      }
    }
  }
  const messages = [
    ...prompt.system != null ? typeof prompt.system === "string" ? [{ role: "system", content: prompt.system }] : asArray(prompt.system).map((message) => ({
      role: "system",
      content: message.content,
      providerOptions: message.providerOptions
    })) : [],
    ...prompt.messages.map(
      (message) => convertToLanguageModelMessage({ message, downloadedAssets })
    )
  ];
  const combinedMessages = [];
  for (const message of messages) {
    if (message.role !== "tool") {
      combinedMessages.push(message);
      continue;
    }
    const lastCombinedMessage = combinedMessages.at(-1);
    if ((lastCombinedMessage == null ? void 0 : lastCombinedMessage.role) === "tool") {
      lastCombinedMessage.content.push(...message.content);
    } else {
      combinedMessages.push(message);
    }
  }
  const toolCallIds = /* @__PURE__ */ new Set();
  for (const message of combinedMessages) {
    switch (message.role) {
      case "assistant": {
        for (const content of message.content) {
          if (content.type === "tool-call" && !content.providerExecuted) {
            toolCallIds.add(content.toolCallId);
          }
        }
        break;
      }
      case "tool": {
        for (const content of message.content) {
          if (content.type === "tool-result") {
            toolCallIds.delete(content.toolCallId);
          }
        }
        break;
      }
      case "user":
      case "system":
        for (const id of approvedToolCallIds) {
          toolCallIds.delete(id);
        }
        if (toolCallIds.size > 0) {
          throw new MissingToolResultsError({
            toolCallIds: Array.from(toolCallIds)
          });
        }
        break;
    }
  }
  for (const id of approvedToolCallIds) {
    toolCallIds.delete(id);
  }
  if (toolCallIds.size > 0) {
    throw new MissingToolResultsError({ toolCallIds: Array.from(toolCallIds) });
  }
  return combinedMessages.filter(
    // Filter out empty tool messages (e.g. if they only contained
    // tool-approval-response parts that were removed).
    // This prevents sending invalid empty messages to the provider.
    // Note: provider-executed tool-approval-response parts are preserved.
    (message) => message.role !== "tool" || message.content.length > 0
  );
}
function convertToLanguageModelMessage({
  message,
  downloadedAssets
}) {
  const role = message.role;
  switch (role) {
    case "system": {
      return {
        role: "system",
        content: message.content,
        providerOptions: message.providerOptions
      };
    }
    case "user": {
      if (typeof message.content === "string") {
        return {
          role: "user",
          content: [{ type: "text", text: message.content }],
          providerOptions: message.providerOptions
        };
      }
      return {
        role: "user",
        content: message.content.map((part) => convertPartToLanguageModelPart(part, downloadedAssets)).filter((part) => part.type !== "text" || part.text !== ""),
        providerOptions: message.providerOptions
      };
    }
    case "assistant": {
      if (typeof message.content === "string") {
        return {
          role: "assistant",
          content: [{ type: "text", text: message.content }],
          providerOptions: message.providerOptions
        };
      }
      return {
        role: "assistant",
        content: message.content.filter(
          // remove empty text parts (no text, and no provider options):
          (part) => part.type !== "text" || part.text !== "" || part.providerOptions != null
        ).filter(
          (part) => part.type !== "tool-approval-request"
        ).map((part) => {
          const providerOptions = part.providerOptions;
          switch (part.type) {
            case "file": {
              const { data, mediaType } = convertToLanguageModelV3DataContent(
                part.data
              );
              return {
                type: "file",
                data,
                filename: part.filename,
                mediaType: mediaType != null ? mediaType : part.mediaType,
                providerOptions
              };
            }
            case "reasoning": {
              return {
                type: "reasoning",
                text: part.text,
                providerOptions
              };
            }
            case "text": {
              return {
                type: "text",
                text: part.text,
                providerOptions
              };
            }
            case "tool-call": {
              return {
                type: "tool-call",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                input: part.input,
                providerExecuted: part.providerExecuted,
                providerOptions
              };
            }
            case "tool-result": {
              return {
                type: "tool-result",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                output: mapToolResultOutput(part.output),
                providerOptions
              };
            }
          }
        }),
        providerOptions: message.providerOptions
      };
    }
    case "tool": {
      return {
        role: "tool",
        content: message.content.filter(
          // Only include tool-approval-response for provider-executed tools
          (part) => part.type !== "tool-approval-response" || part.providerExecuted
        ).map((part) => {
          switch (part.type) {
            case "tool-result": {
              return {
                type: "tool-result",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                output: mapToolResultOutput(part.output),
                providerOptions: part.providerOptions
              };
            }
            case "tool-approval-response": {
              return {
                type: "tool-approval-response",
                approvalId: part.approvalId,
                approved: part.approved,
                reason: part.reason
              };
            }
          }
        }),
        providerOptions: message.providerOptions
      };
    }
    default: {
      const _exhaustiveCheck = role;
      throw new InvalidMessageRoleError({ role: _exhaustiveCheck });
    }
  }
}
async function downloadAssets(messages, download2, supportedUrls) {
  const plannedDownloads = messages.filter((message) => message.role === "user").map((message) => message.content).filter(
    (content) => Array.isArray(content)
  ).flat().filter(
    (part) => part.type === "image" || part.type === "file"
  ).map((part) => {
    var _a5;
    const mediaType = (_a5 = part.mediaType) != null ? _a5 : part.type === "image" ? "image/*" : void 0;
    let data = part.type === "image" ? part.image : part.data;
    if (typeof data === "string") {
      try {
        data = new URL(data);
      } catch (ignored) {
      }
    }
    return { mediaType, data };
  }).filter(
    (part) => part.data instanceof URL
  ).map((part) => ({
    url: part.data,
    isUrlSupportedByModel: part.mediaType != null && (0, import_provider_utils5.isUrlSupported)({
      url: part.data.toString(),
      mediaType: part.mediaType,
      supportedUrls
    })
  }));
  const downloadedFiles = await download2(plannedDownloads);
  return Object.fromEntries(
    downloadedFiles.map(
      (file, index) => file == null ? null : [
        plannedDownloads[index].url.toString(),
        { data: file.data, mediaType: file.mediaType }
      ]
    ).filter((file) => file != null)
  );
}
function convertPartToLanguageModelPart(part, downloadedAssets) {
  var _a5;
  if (part.type === "text") {
    return {
      type: "text",
      text: part.text,
      providerOptions: part.providerOptions
    };
  }
  let originalData;
  const type = part.type;
  switch (type) {
    case "image":
      originalData = part.image;
      break;
    case "file":
      originalData = part.data;
      break;
    default:
      throw new Error(`Unsupported part type: ${type}`);
  }
  const { data: convertedData, mediaType: convertedMediaType } = convertToLanguageModelV3DataContent(originalData);
  let mediaType = convertedMediaType != null ? convertedMediaType : part.mediaType;
  let data = convertedData;
  if (data instanceof URL) {
    const downloadedFile = downloadedAssets[data.toString()];
    if (downloadedFile) {
      data = downloadedFile.data;
      mediaType != null ? mediaType : mediaType = downloadedFile.mediaType;
    }
  }
  switch (type) {
    case "image": {
      if (data instanceof Uint8Array || typeof data === "string") {
        mediaType = (_a5 = detectMediaType({ data, signatures: imageMediaTypeSignatures })) != null ? _a5 : mediaType;
      }
      return {
        type: "file",
        mediaType: mediaType != null ? mediaType : "image/*",
        // any image
        filename: void 0,
        data,
        providerOptions: part.providerOptions
      };
    }
    case "file": {
      if (mediaType == null) {
        throw new Error(`Media type is missing for file part`);
      }
      return {
        type: "file",
        mediaType,
        filename: part.filename,
        data,
        providerOptions: part.providerOptions
      };
    }
  }
}
function mapToolResultOutput(output) {
  if (output.type !== "content") {
    return output;
  }
  return {
    type: "content",
    value: output.value.map((item) => {
      if (item.type !== "media") {
        return item;
      }
      if (item.mediaType.startsWith("image/")) {
        return {
          type: "image-data",
          data: item.data,
          mediaType: item.mediaType
        };
      }
      return {
        type: "file-data",
        data: item.data,
        mediaType: item.mediaType
      };
    })
  };
}

// src/prompt/prepare-tools-and-tool-choice.ts
var import_provider_utils6 = require("@ai-sdk/provider-utils");

// src/util/is-non-empty-object.ts
function isNonEmptyObject(object) {
  return object != null && Object.keys(object).length > 0;
}

// src/prompt/prepare-tools-and-tool-choice.ts
async function prepareToolsAndToolChoice({
  tools,
  toolChoice,
  activeTools
}) {
  if (!isNonEmptyObject(tools)) {
    return {
      tools: void 0,
      toolChoice: void 0
    };
  }
  const filteredTools = activeTools != null ? Object.entries(tools).filter(
    ([name5]) => activeTools.includes(name5)
  ) : Object.entries(tools);
  const languageModelTools = [];
  for (const [name5, tool] of filteredTools) {
    const toolType = tool.type;
    switch (toolType) {
      case void 0:
      case "dynamic":
      case "function":
        languageModelTools.push({
          type: "function",
          name: name5,
          description: tool.description,
          inputSchema: await (0, import_provider_utils6.asSchema)(tool.inputSchema).jsonSchema,
          ...tool.inputExamples != null ? { inputExamples: tool.inputExamples } : {},
          providerOptions: tool.providerOptions,
          ...tool.strict != null ? { strict: tool.strict } : {}
        });
        break;
      case "provider":
        languageModelTools.push({
          type: "provider",
          name: name5,
          id: tool.id,
          args: tool.args
        });
        break;
      default: {
        const exhaustiveCheck = toolType;
        throw new Error(`Unsupported tool type: ${exhaustiveCheck}`);
      }
    }
  }
  return {
    tools: languageModelTools,
    toolChoice: toolChoice == null ? { type: "auto" } : typeof toolChoice === "string" ? { type: toolChoice } : { type: "tool", toolName: toolChoice.toolName }
  };
}

// src/prompt/standardize-prompt.ts
var import_provider4 = require("@ai-sdk/provider");
var import_provider_utils7 = require("@ai-sdk/provider-utils");
var import_v46 = require("zod/v4");

// src/prompt/message.ts
var import_v45 = require("zod/v4");

// src/types/provider-metadata.ts
var import_v43 = require("zod/v4");

// src/types/json-value.ts
var import_v42 = require("zod/v4");
var jsonValueSchema = import_v42.z.lazy(
  () => import_v42.z.union([
    import_v42.z.null(),
    import_v42.z.string(),
    import_v42.z.number(),
    import_v42.z.boolean(),
    import_v42.z.record(import_v42.z.string(), jsonValueSchema.optional()),
    import_v42.z.array(jsonValueSchema)
  ])
);

// src/types/provider-metadata.ts
var providerMetadataSchema = import_v43.z.record(
  import_v43.z.string(),
  import_v43.z.record(import_v43.z.string(), jsonValueSchema.optional())
);

// src/prompt/content-part.ts
var import_v44 = require("zod/v4");
var textPartSchema = import_v44.z.object({
  type: import_v44.z.literal("text"),
  text: import_v44.z.string(),
  providerOptions: providerMetadataSchema.optional()
});
var imagePartSchema = import_v44.z.object({
  type: import_v44.z.literal("image"),
  image: import_v44.z.union([dataContentSchema, import_v44.z.instanceof(URL)]),
  mediaType: import_v44.z.string().optional(),
  providerOptions: providerMetadataSchema.optional()
});
var filePartSchema = import_v44.z.object({
  type: import_v44.z.literal("file"),
  data: import_v44.z.union([dataContentSchema, import_v44.z.instanceof(URL)]),
  filename: import_v44.z.string().optional(),
  mediaType: import_v44.z.string(),
  providerOptions: providerMetadataSchema.optional()
});
var reasoningPartSchema = import_v44.z.object({
  type: import_v44.z.literal("reasoning"),
  text: import_v44.z.string(),
  providerOptions: providerMetadataSchema.optional()
});
var toolCallPartSchema = import_v44.z.object({
  type: import_v44.z.literal("tool-call"),
  toolCallId: import_v44.z.string(),
  toolName: import_v44.z.string(),
  input: import_v44.z.unknown(),
  providerOptions: providerMetadataSchema.optional(),
  providerExecuted: import_v44.z.boolean().optional()
});
var outputSchema = import_v44.z.discriminatedUnion(
  "type",
  [
    import_v44.z.object({
      type: import_v44.z.literal("text"),
      value: import_v44.z.string(),
      providerOptions: providerMetadataSchema.optional()
    }),
    import_v44.z.object({
      type: import_v44.z.literal("json"),
      value: jsonValueSchema,
      providerOptions: providerMetadataSchema.optional()
    }),
    import_v44.z.object({
      type: import_v44.z.literal("execution-denied"),
      reason: import_v44.z.string().optional(),
      providerOptions: providerMetadataSchema.optional()
    }),
    import_v44.z.object({
      type: import_v44.z.literal("error-text"),
      value: import_v44.z.string(),
      providerOptions: providerMetadataSchema.optional()
    }),
    import_v44.z.object({
      type: import_v44.z.literal("error-json"),
      value: jsonValueSchema,
      providerOptions: providerMetadataSchema.optional()
    }),
    import_v44.z.object({
      type: import_v44.z.literal("content"),
      value: import_v44.z.array(
        import_v44.z.union([
          import_v44.z.object({
            type: import_v44.z.literal("text"),
            text: import_v44.z.string(),
            providerOptions: providerMetadataSchema.optional()
          }),
          import_v44.z.object({
            type: import_v44.z.literal("media"),
            data: import_v44.z.string(),
            mediaType: import_v44.z.string()
          }),
          import_v44.z.object({
            type: import_v44.z.literal("file-data"),
            data: import_v44.z.string(),
            mediaType: import_v44.z.string(),
            filename: import_v44.z.string().optional(),
            providerOptions: providerMetadataSchema.optional()
          }),
          import_v44.z.object({
            type: import_v44.z.literal("file-url"),
            url: import_v44.z.string(),
            providerOptions: providerMetadataSchema.optional()
          }),
          import_v44.z.object({
            type: import_v44.z.literal("file-id"),
            fileId: import_v44.z.union([import_v44.z.string(), import_v44.z.record(import_v44.z.string(), import_v44.z.string())]),
            providerOptions: providerMetadataSchema.optional()
          }),
          import_v44.z.object({
            type: import_v44.z.literal("image-data"),
            data: import_v44.z.string(),
            mediaType: import_v44.z.string(),
            providerOptions: providerMetadataSchema.optional()
          }),
          import_v44.z.object({
            type: import_v44.z.literal("image-url"),
            url: import_v44.z.string(),
            providerOptions: providerMetadataSchema.optional()
          }),
          import_v44.z.object({
            type: import_v44.z.literal("image-file-id"),
            fileId: import_v44.z.union([import_v44.z.string(), import_v44.z.record(import_v44.z.string(), import_v44.z.string())]),
            providerOptions: providerMetadataSchema.optional()
          }),
          import_v44.z.object({
            type: import_v44.z.literal("custom"),
            providerOptions: providerMetadataSchema.optional()
          })
        ])
      )
    })
  ]
);
var toolResultPartSchema = import_v44.z.object({
  type: import_v44.z.literal("tool-result"),
  toolCallId: import_v44.z.string(),
  toolName: import_v44.z.string(),
  output: outputSchema,
  providerOptions: providerMetadataSchema.optional()
});
var toolApprovalRequestSchema = import_v44.z.object({
  type: import_v44.z.literal("tool-approval-request"),
  approvalId: import_v44.z.string(),
  toolCallId: import_v44.z.string()
});
var toolApprovalResponseSchema = import_v44.z.object({
  type: import_v44.z.literal("tool-approval-response"),
  approvalId: import_v44.z.string(),
  approved: import_v44.z.boolean(),
  reason: import_v44.z.string().optional()
});

// src/prompt/message.ts
var systemModelMessageSchema = import_v45.z.object(
  {
    role: import_v45.z.literal("system"),
    content: import_v45.z.string(),
    providerOptions: providerMetadataSchema.optional()
  }
);
var userModelMessageSchema = import_v45.z.object({
  role: import_v45.z.literal("user"),
  content: import_v45.z.union([
    import_v45.z.string(),
    import_v45.z.array(import_v45.z.union([textPartSchema, imagePartSchema, filePartSchema]))
  ]),
  providerOptions: providerMetadataSchema.optional()
});
var assistantModelMessageSchema = import_v45.z.object({
  role: import_v45.z.literal("assistant"),
  content: import_v45.z.union([
    import_v45.z.string(),
    import_v45.z.array(
      import_v45.z.union([
        textPartSchema,
        filePartSchema,
        reasoningPartSchema,
        toolCallPartSchema,
        toolResultPartSchema,
        toolApprovalRequestSchema
      ])
    )
  ]),
  providerOptions: providerMetadataSchema.optional()
});
var toolModelMessageSchema = import_v45.z.object({
  role: import_v45.z.literal("tool"),
  content: import_v45.z.array(import_v45.z.union([toolResultPartSchema, toolApprovalResponseSchema])),
  providerOptions: providerMetadataSchema.optional()
});
var modelMessageSchema = import_v45.z.union([
  systemModelMessageSchema,
  userModelMessageSchema,
  assistantModelMessageSchema,
  toolModelMessageSchema
]);

// src/prompt/standardize-prompt.ts
async function standardizePrompt(prompt) {
  if (prompt.prompt == null && prompt.messages == null) {
    throw new import_provider4.InvalidPromptError({
      prompt,
      message: "prompt or messages must be defined"
    });
  }
  if (prompt.prompt != null && prompt.messages != null) {
    throw new import_provider4.InvalidPromptError({
      prompt,
      message: "prompt and messages cannot be defined at the same time"
    });
  }
  if (prompt.system != null && typeof prompt.system !== "string" && !asArray(prompt.system).every(
    (message) => typeof message === "object" && message !== null && "role" in message && message.role === "system"
  )) {
    throw new import_provider4.InvalidPromptError({
      prompt,
      message: "system must be a string, SystemModelMessage, or array of SystemModelMessage"
    });
  }
  let messages;
  if (prompt.prompt != null && typeof prompt.prompt === "string") {
    messages = [{ role: "user", content: prompt.prompt }];
  } else if (prompt.prompt != null && Array.isArray(prompt.prompt)) {
    messages = prompt.prompt;
  } else if (prompt.messages != null) {
    messages = prompt.messages;
  } else {
    throw new import_provider4.InvalidPromptError({
      prompt,
      message: "prompt or messages must be defined"
    });
  }
  if (messages.length === 0) {
    throw new import_provider4.InvalidPromptError({
      prompt,
      message: "messages must not be empty"
    });
  }
  const validationResult = await (0, import_provider_utils7.safeValidateTypes)({
    value: messages,
    schema: import_v46.z.array(modelMessageSchema)
  });
  if (!validationResult.success) {
    throw new import_provider4.InvalidPromptError({
      prompt,
      message: "The messages do not match the ModelMessage[] schema.",
      cause: validationResult.error
    });
  }
  return {
    messages,
    system: prompt.system
  };
}

// src/error/invalid-argument-error.ts
var import_provider5 = require("@ai-sdk/provider");
var name3 = "AI_InvalidArgumentError";
var marker3 = `vercel.ai.error.${name3}`;
var symbol3 = Symbol.for(marker3);
var _a3;
var InvalidArgumentError = class extends import_provider5.AISDKError {
  constructor({
    parameter,
    value,
    message
  }) {
    super({
      name: name3,
      message: `Invalid argument for parameter ${parameter}: ${message}`
    });
    this[_a3] = true;
    this.parameter = parameter;
    this.value = value;
  }
  static isInstance(error) {
    return import_provider5.AISDKError.hasMarker(error, marker3);
  }
};
_a3 = symbol3;

// src/prompt/prepare-call-settings.ts
function prepareCallSettings({
  maxOutputTokens,
  temperature,
  topP,
  topK,
  presencePenalty,
  frequencyPenalty,
  seed,
  stopSequences
}) {
  if (maxOutputTokens != null) {
    if (!Number.isInteger(maxOutputTokens)) {
      throw new InvalidArgumentError({
        parameter: "maxOutputTokens",
        value: maxOutputTokens,
        message: "maxOutputTokens must be an integer"
      });
    }
    if (maxOutputTokens < 1) {
      throw new InvalidArgumentError({
        parameter: "maxOutputTokens",
        value: maxOutputTokens,
        message: "maxOutputTokens must be >= 1"
      });
    }
  }
  if (temperature != null) {
    if (typeof temperature !== "number") {
      throw new InvalidArgumentError({
        parameter: "temperature",
        value: temperature,
        message: "temperature must be a number"
      });
    }
  }
  if (topP != null) {
    if (typeof topP !== "number") {
      throw new InvalidArgumentError({
        parameter: "topP",
        value: topP,
        message: "topP must be a number"
      });
    }
  }
  if (topK != null) {
    if (typeof topK !== "number") {
      throw new InvalidArgumentError({
        parameter: "topK",
        value: topK,
        message: "topK must be a number"
      });
    }
  }
  if (presencePenalty != null) {
    if (typeof presencePenalty !== "number") {
      throw new InvalidArgumentError({
        parameter: "presencePenalty",
        value: presencePenalty,
        message: "presencePenalty must be a number"
      });
    }
  }
  if (frequencyPenalty != null) {
    if (typeof frequencyPenalty !== "number") {
      throw new InvalidArgumentError({
        parameter: "frequencyPenalty",
        value: frequencyPenalty,
        message: "frequencyPenalty must be a number"
      });
    }
  }
  if (seed != null) {
    if (!Number.isInteger(seed)) {
      throw new InvalidArgumentError({
        parameter: "seed",
        value: seed,
        message: "seed must be an integer"
      });
    }
  }
  return {
    maxOutputTokens,
    temperature,
    topP,
    topK,
    presencePenalty,
    frequencyPenalty,
    stopSequences,
    seed
  };
}

// src/util/retry-with-exponential-backoff.ts
var import_provider7 = require("@ai-sdk/provider");
var import_provider_utils8 = require("@ai-sdk/provider-utils");

// src/util/retry-error.ts
var import_provider6 = require("@ai-sdk/provider");
var name4 = "AI_RetryError";
var marker4 = `vercel.ai.error.${name4}`;
var symbol4 = Symbol.for(marker4);
var _a4;
var RetryError = class extends import_provider6.AISDKError {
  constructor({
    message,
    reason,
    errors
  }) {
    super({ name: name4, message });
    this[_a4] = true;
    this.reason = reason;
    this.errors = errors;
    this.lastError = errors[errors.length - 1];
  }
  static isInstance(error) {
    return import_provider6.AISDKError.hasMarker(error, marker4);
  }
};
_a4 = symbol4;

// src/util/retry-with-exponential-backoff.ts
function getRetryDelayInMs({
  error,
  exponentialBackoffDelay
}) {
  const headers = error.responseHeaders;
  if (!headers)
    return exponentialBackoffDelay;
  let ms;
  const retryAfterMs = headers["retry-after-ms"];
  if (retryAfterMs) {
    const timeoutMs = parseFloat(retryAfterMs);
    if (!Number.isNaN(timeoutMs)) {
      ms = timeoutMs;
    }
  }
  const retryAfter = headers["retry-after"];
  if (retryAfter && ms === void 0) {
    const timeoutSeconds = parseFloat(retryAfter);
    if (!Number.isNaN(timeoutSeconds)) {
      ms = timeoutSeconds * 1e3;
    } else {
      ms = Date.parse(retryAfter) - Date.now();
    }
  }
  if (ms != null && !Number.isNaN(ms) && 0 <= ms && (ms < 60 * 1e3 || ms < exponentialBackoffDelay)) {
    return ms;
  }
  return exponentialBackoffDelay;
}
var retryWithExponentialBackoffRespectingRetryHeaders = ({
  maxRetries = 2,
  initialDelayInMs = 2e3,
  backoffFactor = 2,
  abortSignal
} = {}) => async (f) => _retryWithExponentialBackoff(f, {
  maxRetries,
  delayInMs: initialDelayInMs,
  backoffFactor,
  abortSignal
});
async function _retryWithExponentialBackoff(f, {
  maxRetries,
  delayInMs,
  backoffFactor,
  abortSignal
}, errors = []) {
  try {
    return await f();
  } catch (error) {
    if ((0, import_provider_utils8.isAbortError)(error)) {
      throw error;
    }
    if (maxRetries === 0) {
      throw error;
    }
    const errorMessage = (0, import_provider_utils8.getErrorMessage)(error);
    const newErrors = [...errors, error];
    const tryNumber = newErrors.length;
    if (tryNumber > maxRetries) {
      throw new RetryError({
        message: `Failed after ${tryNumber} attempts. Last error: ${errorMessage}`,
        reason: "maxRetriesExceeded",
        errors: newErrors
      });
    }
    if (error instanceof Error && import_provider7.APICallError.isInstance(error) && error.isRetryable === true && tryNumber <= maxRetries) {
      await (0, import_provider_utils8.delay)(
        getRetryDelayInMs({
          error,
          exponentialBackoffDelay: delayInMs
        }),
        { abortSignal }
      );
      return _retryWithExponentialBackoff(
        f,
        {
          maxRetries,
          delayInMs: backoffFactor * delayInMs,
          backoffFactor,
          abortSignal
        },
        newErrors
      );
    }
    if (tryNumber === 1) {
      throw error;
    }
    throw new RetryError({
      message: `Failed after ${tryNumber} attempts with non-retryable error: '${errorMessage}'`,
      reason: "errorNotRetryable",
      errors: newErrors
    });
  }
}

// src/util/prepare-retries.ts
function prepareRetries({
  maxRetries,
  abortSignal
}) {
  if (maxRetries != null) {
    if (!Number.isInteger(maxRetries)) {
      throw new InvalidArgumentError({
        parameter: "maxRetries",
        value: maxRetries,
        message: "maxRetries must be an integer"
      });
    }
    if (maxRetries < 0) {
      throw new InvalidArgumentError({
        parameter: "maxRetries",
        value: maxRetries,
        message: "maxRetries must be >= 0"
      });
    }
  }
  const maxRetriesResult = maxRetries != null ? maxRetries : 2;
  return {
    maxRetries: maxRetriesResult,
    retry: retryWithExponentialBackoffRespectingRetryHeaders({
      maxRetries: maxRetriesResult,
      abortSignal
    })
  };
}

// src/types/usage.ts
function asLanguageModelUsage(usage) {
  return {
    inputTokens: usage.inputTokens.total,
    inputTokenDetails: {
      noCacheTokens: usage.inputTokens.noCache,
      cacheReadTokens: usage.inputTokens.cacheRead,
      cacheWriteTokens: usage.inputTokens.cacheWrite
    },
    outputTokens: usage.outputTokens.total,
    outputTokenDetails: {
      textTokens: usage.outputTokens.text,
      reasoningTokens: usage.outputTokens.reasoning
    },
    totalTokens: addTokenCounts(
      usage.inputTokens.total,
      usage.outputTokens.total
    ),
    raw: usage.raw,
    reasoningTokens: usage.outputTokens.reasoning,
    cachedInputTokens: usage.inputTokens.cacheRead
  };
}
function addTokenCounts(tokenCount1, tokenCount2) {
  return tokenCount1 == null && tokenCount2 == null ? void 0 : (tokenCount1 != null ? tokenCount1 : 0) + (tokenCount2 != null ? tokenCount2 : 0);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  asLanguageModelUsage,
  convertAsyncIteratorToReadableStream,
  convertToLanguageModelPrompt,
  prepareCallSettings,
  prepareRetries,
  prepareToolsAndToolChoice,
  standardizePrompt
});
//# sourceMappingURL=index.js.map