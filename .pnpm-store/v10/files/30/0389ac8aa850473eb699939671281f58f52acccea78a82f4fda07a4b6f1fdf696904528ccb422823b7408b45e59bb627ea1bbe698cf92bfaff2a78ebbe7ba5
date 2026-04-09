"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name8 in all)
    __defProp(target, name8, { get: all[name8], enumerable: true });
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
  GatewayAuthenticationError: () => GatewayAuthenticationError,
  GatewayError: () => GatewayError,
  GatewayInternalServerError: () => GatewayInternalServerError,
  GatewayInvalidRequestError: () => GatewayInvalidRequestError,
  GatewayModelNotFoundError: () => GatewayModelNotFoundError,
  GatewayRateLimitError: () => GatewayRateLimitError,
  GatewayResponseError: () => GatewayResponseError,
  createGateway: () => createGatewayProvider,
  createGatewayProvider: () => createGatewayProvider,
  gateway: () => gateway
});
module.exports = __toCommonJS(index_exports);

// src/gateway-provider.ts
var import_provider_utils13 = require("@ai-sdk/provider-utils");

// src/errors/as-gateway-error.ts
var import_provider = require("@ai-sdk/provider");

// src/errors/create-gateway-error.ts
var import_v42 = require("zod/v4");

// src/errors/gateway-error.ts
var marker = "vercel.ai.gateway.error";
var symbol = Symbol.for(marker);
var _a, _b;
var GatewayError = class _GatewayError extends (_b = Error, _a = symbol, _b) {
  constructor({
    message,
    statusCode = 500,
    cause,
    generationId
  }) {
    super(generationId ? `${message} [${generationId}]` : message);
    this[_a] = true;
    this.statusCode = statusCode;
    this.cause = cause;
    this.generationId = generationId;
  }
  /**
   * Checks if the given error is a Gateway Error.
   * @param {unknown} error - The error to check.
   * @returns {boolean} True if the error is a Gateway Error, false otherwise.
   */
  static isInstance(error) {
    return _GatewayError.hasMarker(error);
  }
  static hasMarker(error) {
    return typeof error === "object" && error !== null && symbol in error && error[symbol] === true;
  }
};

// src/errors/gateway-authentication-error.ts
var name = "GatewayAuthenticationError";
var marker2 = `vercel.ai.gateway.error.${name}`;
var symbol2 = Symbol.for(marker2);
var _a2, _b2;
var GatewayAuthenticationError = class _GatewayAuthenticationError extends (_b2 = GatewayError, _a2 = symbol2, _b2) {
  constructor({
    message = "Authentication failed",
    statusCode = 401,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a2] = true;
    // used in isInstance
    this.name = name;
    this.type = "authentication_error";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol2 in error;
  }
  /**
   * Creates a contextual error message when authentication fails
   */
  static createContextualError({
    apiKeyProvided,
    oidcTokenProvided,
    message = "Authentication failed",
    statusCode = 401,
    cause,
    generationId
  }) {
    let contextualMessage;
    if (apiKeyProvided) {
      contextualMessage = `AI Gateway authentication failed: Invalid API key.

Create a new API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys

Provide via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.`;
    } else if (oidcTokenProvided) {
      contextualMessage = `AI Gateway authentication failed: Invalid OIDC token.

Run 'npx vercel link' to link your project, then 'vc env pull' to fetch the token.

Alternatively, use an API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys`;
    } else {
      contextualMessage = `AI Gateway authentication failed: No authentication provided.

Option 1 - API key:
Create an API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys
Provide via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.

Option 2 - OIDC token:
Run 'npx vercel link' to link your project, then 'vc env pull' to fetch the token.`;
    }
    return new _GatewayAuthenticationError({
      message: contextualMessage,
      statusCode,
      cause,
      generationId
    });
  }
};

// src/errors/gateway-invalid-request-error.ts
var name2 = "GatewayInvalidRequestError";
var marker3 = `vercel.ai.gateway.error.${name2}`;
var symbol3 = Symbol.for(marker3);
var _a3, _b3;
var GatewayInvalidRequestError = class extends (_b3 = GatewayError, _a3 = symbol3, _b3) {
  constructor({
    message = "Invalid request",
    statusCode = 400,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a3] = true;
    // used in isInstance
    this.name = name2;
    this.type = "invalid_request_error";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol3 in error;
  }
};

// src/errors/gateway-rate-limit-error.ts
var name3 = "GatewayRateLimitError";
var marker4 = `vercel.ai.gateway.error.${name3}`;
var symbol4 = Symbol.for(marker4);
var _a4, _b4;
var GatewayRateLimitError = class extends (_b4 = GatewayError, _a4 = symbol4, _b4) {
  constructor({
    message = "Rate limit exceeded",
    statusCode = 429,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a4] = true;
    // used in isInstance
    this.name = name3;
    this.type = "rate_limit_exceeded";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol4 in error;
  }
};

// src/errors/gateway-model-not-found-error.ts
var import_v4 = require("zod/v4");
var import_provider_utils = require("@ai-sdk/provider-utils");
var name4 = "GatewayModelNotFoundError";
var marker5 = `vercel.ai.gateway.error.${name4}`;
var symbol5 = Symbol.for(marker5);
var modelNotFoundParamSchema = (0, import_provider_utils.lazySchema)(
  () => (0, import_provider_utils.zodSchema)(
    import_v4.z.object({
      modelId: import_v4.z.string()
    })
  )
);
var _a5, _b5;
var GatewayModelNotFoundError = class extends (_b5 = GatewayError, _a5 = symbol5, _b5) {
  constructor({
    message = "Model not found",
    statusCode = 404,
    modelId,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a5] = true;
    // used in isInstance
    this.name = name4;
    this.type = "model_not_found";
    this.modelId = modelId;
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol5 in error;
  }
};

// src/errors/gateway-internal-server-error.ts
var name5 = "GatewayInternalServerError";
var marker6 = `vercel.ai.gateway.error.${name5}`;
var symbol6 = Symbol.for(marker6);
var _a6, _b6;
var GatewayInternalServerError = class extends (_b6 = GatewayError, _a6 = symbol6, _b6) {
  constructor({
    message = "Internal server error",
    statusCode = 500,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a6] = true;
    // used in isInstance
    this.name = name5;
    this.type = "internal_server_error";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol6 in error;
  }
};

// src/errors/gateway-response-error.ts
var name6 = "GatewayResponseError";
var marker7 = `vercel.ai.gateway.error.${name6}`;
var symbol7 = Symbol.for(marker7);
var _a7, _b7;
var GatewayResponseError = class extends (_b7 = GatewayError, _a7 = symbol7, _b7) {
  constructor({
    message = "Invalid response from Gateway",
    statusCode = 502,
    response,
    validationError,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a7] = true;
    // used in isInstance
    this.name = name6;
    this.type = "response_error";
    this.response = response;
    this.validationError = validationError;
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol7 in error;
  }
};

// src/errors/create-gateway-error.ts
var import_provider_utils2 = require("@ai-sdk/provider-utils");
async function createGatewayErrorFromResponse({
  response,
  statusCode,
  defaultMessage = "Gateway request failed",
  cause,
  authMethod
}) {
  var _a9;
  const parseResult = await (0, import_provider_utils2.safeValidateTypes)({
    value: response,
    schema: gatewayErrorResponseSchema
  });
  if (!parseResult.success) {
    const rawGenerationId = typeof response === "object" && response !== null && "generationId" in response ? response.generationId : void 0;
    return new GatewayResponseError({
      message: `Invalid error response format: ${defaultMessage}`,
      statusCode,
      response,
      validationError: parseResult.error,
      cause,
      generationId: rawGenerationId
    });
  }
  const validatedResponse = parseResult.value;
  const errorType = validatedResponse.error.type;
  const message = validatedResponse.error.message;
  const generationId = (_a9 = validatedResponse.generationId) != null ? _a9 : void 0;
  switch (errorType) {
    case "authentication_error":
      return GatewayAuthenticationError.createContextualError({
        apiKeyProvided: authMethod === "api-key",
        oidcTokenProvided: authMethod === "oidc",
        statusCode,
        cause,
        generationId
      });
    case "invalid_request_error":
      return new GatewayInvalidRequestError({
        message,
        statusCode,
        cause,
        generationId
      });
    case "rate_limit_exceeded":
      return new GatewayRateLimitError({
        message,
        statusCode,
        cause,
        generationId
      });
    case "model_not_found": {
      const modelResult = await (0, import_provider_utils2.safeValidateTypes)({
        value: validatedResponse.error.param,
        schema: modelNotFoundParamSchema
      });
      return new GatewayModelNotFoundError({
        message,
        statusCode,
        modelId: modelResult.success ? modelResult.value.modelId : void 0,
        cause,
        generationId
      });
    }
    case "internal_server_error":
      return new GatewayInternalServerError({
        message,
        statusCode,
        cause,
        generationId
      });
    default:
      return new GatewayInternalServerError({
        message,
        statusCode,
        cause,
        generationId
      });
  }
}
var gatewayErrorResponseSchema = (0, import_provider_utils2.lazySchema)(
  () => (0, import_provider_utils2.zodSchema)(
    import_v42.z.object({
      error: import_v42.z.object({
        message: import_v42.z.string(),
        type: import_v42.z.string().nullish(),
        param: import_v42.z.unknown().nullish(),
        code: import_v42.z.union([import_v42.z.string(), import_v42.z.number()]).nullish()
      }),
      generationId: import_v42.z.string().nullish()
    })
  )
);

// src/errors/gateway-timeout-error.ts
var name7 = "GatewayTimeoutError";
var marker8 = `vercel.ai.gateway.error.${name7}`;
var symbol8 = Symbol.for(marker8);
var _a8, _b8;
var GatewayTimeoutError = class _GatewayTimeoutError extends (_b8 = GatewayError, _a8 = symbol8, _b8) {
  constructor({
    message = "Request timed out",
    statusCode = 408,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a8] = true;
    // used in isInstance
    this.name = name7;
    this.type = "timeout_error";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol8 in error;
  }
  /**
   * Creates a helpful timeout error message with troubleshooting guidance
   */
  static createTimeoutError({
    originalMessage,
    statusCode = 408,
    cause,
    generationId
  }) {
    const message = `Gateway request timed out: ${originalMessage}

    This is a client-side timeout. To resolve this, increase your timeout configuration: https://vercel.com/docs/ai-gateway/capabilities/video-generation#extending-timeouts-for-node.js`;
    return new _GatewayTimeoutError({
      message,
      statusCode,
      cause,
      generationId
    });
  }
};

// src/errors/as-gateway-error.ts
function isTimeoutError(error) {
  if (!(error instanceof Error)) {
    return false;
  }
  const errorCode = error.code;
  if (typeof errorCode === "string") {
    const undiciTimeoutCodes = [
      "UND_ERR_HEADERS_TIMEOUT",
      "UND_ERR_BODY_TIMEOUT",
      "UND_ERR_CONNECT_TIMEOUT"
    ];
    return undiciTimeoutCodes.includes(errorCode);
  }
  return false;
}
async function asGatewayError(error, authMethod) {
  var _a9;
  if (GatewayError.isInstance(error)) {
    return error;
  }
  if (isTimeoutError(error)) {
    return GatewayTimeoutError.createTimeoutError({
      originalMessage: error instanceof Error ? error.message : "Unknown error",
      cause: error
    });
  }
  if (import_provider.APICallError.isInstance(error)) {
    if (error.cause && isTimeoutError(error.cause)) {
      return GatewayTimeoutError.createTimeoutError({
        originalMessage: error.message,
        cause: error
      });
    }
    return await createGatewayErrorFromResponse({
      response: extractApiCallResponse(error),
      statusCode: (_a9 = error.statusCode) != null ? _a9 : 500,
      defaultMessage: "Gateway request failed",
      cause: error,
      authMethod
    });
  }
  return await createGatewayErrorFromResponse({
    response: {},
    statusCode: 500,
    defaultMessage: error instanceof Error ? `Gateway request failed: ${error.message}` : "Unknown Gateway error",
    cause: error,
    authMethod
  });
}

// src/errors/extract-api-call-response.ts
function extractApiCallResponse(error) {
  if (error.data !== void 0) {
    return error.data;
  }
  if (error.responseBody != null) {
    try {
      return JSON.parse(error.responseBody);
    } catch (e) {
      return error.responseBody;
    }
  }
  return {};
}

// src/errors/parse-auth-method.ts
var import_v43 = require("zod/v4");
var import_provider_utils3 = require("@ai-sdk/provider-utils");
var GATEWAY_AUTH_METHOD_HEADER = "ai-gateway-auth-method";
async function parseAuthMethod(headers) {
  const result = await (0, import_provider_utils3.safeValidateTypes)({
    value: headers[GATEWAY_AUTH_METHOD_HEADER],
    schema: gatewayAuthMethodSchema
  });
  return result.success ? result.value : void 0;
}
var gatewayAuthMethodSchema = (0, import_provider_utils3.lazySchema)(
  () => (0, import_provider_utils3.zodSchema)(import_v43.z.union([import_v43.z.literal("api-key"), import_v43.z.literal("oidc")]))
);

// src/gateway-fetch-metadata.ts
var import_provider_utils4 = require("@ai-sdk/provider-utils");
var import_v44 = require("zod/v4");
var GatewayFetchMetadata = class {
  constructor(config) {
    this.config = config;
  }
  async getAvailableModels() {
    try {
      const { value } = await (0, import_provider_utils4.getFromApi)({
        url: `${this.config.baseURL}/config`,
        headers: await (0, import_provider_utils4.resolve)(this.config.headers()),
        successfulResponseHandler: (0, import_provider_utils4.createJsonResponseHandler)(
          gatewayAvailableModelsResponseSchema
        ),
        failedResponseHandler: (0, import_provider_utils4.createJsonErrorResponseHandler)({
          errorSchema: import_v44.z.any(),
          errorToMessage: (data) => data
        }),
        fetch: this.config.fetch
      });
      return value;
    } catch (error) {
      throw await asGatewayError(error);
    }
  }
  async getCredits() {
    try {
      const baseUrl = new URL(this.config.baseURL);
      const { value } = await (0, import_provider_utils4.getFromApi)({
        url: `${baseUrl.origin}/v1/credits`,
        headers: await (0, import_provider_utils4.resolve)(this.config.headers()),
        successfulResponseHandler: (0, import_provider_utils4.createJsonResponseHandler)(
          gatewayCreditsResponseSchema
        ),
        failedResponseHandler: (0, import_provider_utils4.createJsonErrorResponseHandler)({
          errorSchema: import_v44.z.any(),
          errorToMessage: (data) => data
        }),
        fetch: this.config.fetch
      });
      return value;
    } catch (error) {
      throw await asGatewayError(error);
    }
  }
};
var gatewayAvailableModelsResponseSchema = (0, import_provider_utils4.lazySchema)(
  () => (0, import_provider_utils4.zodSchema)(
    import_v44.z.object({
      models: import_v44.z.array(
        import_v44.z.object({
          id: import_v44.z.string(),
          name: import_v44.z.string(),
          description: import_v44.z.string().nullish(),
          pricing: import_v44.z.object({
            input: import_v44.z.string(),
            output: import_v44.z.string(),
            input_cache_read: import_v44.z.string().nullish(),
            input_cache_write: import_v44.z.string().nullish()
          }).transform(
            ({ input, output, input_cache_read, input_cache_write }) => ({
              input,
              output,
              ...input_cache_read ? { cachedInputTokens: input_cache_read } : {},
              ...input_cache_write ? { cacheCreationInputTokens: input_cache_write } : {}
            })
          ).nullish(),
          specification: import_v44.z.object({
            specificationVersion: import_v44.z.literal("v3"),
            provider: import_v44.z.string(),
            modelId: import_v44.z.string()
          }),
          modelType: import_v44.z.enum(["embedding", "image", "language", "video"]).nullish()
        })
      )
    })
  )
);
var gatewayCreditsResponseSchema = (0, import_provider_utils4.lazySchema)(
  () => (0, import_provider_utils4.zodSchema)(
    import_v44.z.object({
      balance: import_v44.z.string(),
      total_used: import_v44.z.string()
    }).transform(({ balance, total_used }) => ({
      balance,
      totalUsed: total_used
    }))
  )
);

// src/gateway-spend-report.ts
var import_provider_utils5 = require("@ai-sdk/provider-utils");
var import_v45 = require("zod/v4");
var GatewaySpendReport = class {
  constructor(config) {
    this.config = config;
  }
  async getSpendReport(params) {
    try {
      const baseUrl = new URL(this.config.baseURL);
      const searchParams = new URLSearchParams();
      searchParams.set("start_date", params.startDate);
      searchParams.set("end_date", params.endDate);
      if (params.groupBy) {
        searchParams.set("group_by", params.groupBy);
      }
      if (params.datePart) {
        searchParams.set("date_part", params.datePart);
      }
      if (params.userId) {
        searchParams.set("user_id", params.userId);
      }
      if (params.model) {
        searchParams.set("model", params.model);
      }
      if (params.provider) {
        searchParams.set("provider", params.provider);
      }
      if (params.credentialType) {
        searchParams.set("credential_type", params.credentialType);
      }
      if (params.tags && params.tags.length > 0) {
        searchParams.set("tags", params.tags.join(","));
      }
      const { value } = await (0, import_provider_utils5.getFromApi)({
        url: `${baseUrl.origin}/v1/report?${searchParams.toString()}`,
        headers: await (0, import_provider_utils5.resolve)(this.config.headers()),
        successfulResponseHandler: (0, import_provider_utils5.createJsonResponseHandler)(
          gatewaySpendReportResponseSchema
        ),
        failedResponseHandler: (0, import_provider_utils5.createJsonErrorResponseHandler)({
          errorSchema: import_v45.z.any(),
          errorToMessage: (data) => data
        }),
        fetch: this.config.fetch
      });
      return value;
    } catch (error) {
      throw await asGatewayError(error);
    }
  }
};
var gatewaySpendReportResponseSchema = (0, import_provider_utils5.lazySchema)(
  () => (0, import_provider_utils5.zodSchema)(
    import_v45.z.object({
      results: import_v45.z.array(
        import_v45.z.object({
          day: import_v45.z.string().optional(),
          hour: import_v45.z.string().optional(),
          user: import_v45.z.string().optional(),
          model: import_v45.z.string().optional(),
          tag: import_v45.z.string().optional(),
          provider: import_v45.z.string().optional(),
          credential_type: import_v45.z.enum(["byok", "system"]).optional(),
          total_cost: import_v45.z.number(),
          market_cost: import_v45.z.number().optional(),
          input_tokens: import_v45.z.number().optional(),
          output_tokens: import_v45.z.number().optional(),
          cached_input_tokens: import_v45.z.number().optional(),
          cache_creation_input_tokens: import_v45.z.number().optional(),
          reasoning_tokens: import_v45.z.number().optional(),
          request_count: import_v45.z.number().optional()
        }).transform(
          ({
            credential_type,
            total_cost,
            market_cost,
            input_tokens,
            output_tokens,
            cached_input_tokens,
            cache_creation_input_tokens,
            reasoning_tokens,
            request_count,
            ...rest
          }) => ({
            ...rest,
            ...credential_type !== void 0 ? { credentialType: credential_type } : {},
            totalCost: total_cost,
            ...market_cost !== void 0 ? { marketCost: market_cost } : {},
            ...input_tokens !== void 0 ? { inputTokens: input_tokens } : {},
            ...output_tokens !== void 0 ? { outputTokens: output_tokens } : {},
            ...cached_input_tokens !== void 0 ? { cachedInputTokens: cached_input_tokens } : {},
            ...cache_creation_input_tokens !== void 0 ? { cacheCreationInputTokens: cache_creation_input_tokens } : {},
            ...reasoning_tokens !== void 0 ? { reasoningTokens: reasoning_tokens } : {},
            ...request_count !== void 0 ? { requestCount: request_count } : {}
          })
        )
      )
    })
  )
);

// src/gateway-generation-info.ts
var import_provider_utils6 = require("@ai-sdk/provider-utils");
var import_v46 = require("zod/v4");
var GatewayGenerationInfoFetcher = class {
  constructor(config) {
    this.config = config;
  }
  async getGenerationInfo(params) {
    try {
      const baseUrl = new URL(this.config.baseURL);
      const { value } = await (0, import_provider_utils6.getFromApi)({
        url: `${baseUrl.origin}/v1/generation?id=${encodeURIComponent(params.id)}`,
        headers: await (0, import_provider_utils6.resolve)(this.config.headers()),
        successfulResponseHandler: (0, import_provider_utils6.createJsonResponseHandler)(
          gatewayGenerationInfoResponseSchema
        ),
        failedResponseHandler: (0, import_provider_utils6.createJsonErrorResponseHandler)({
          errorSchema: import_v46.z.any(),
          errorToMessage: (data) => data
        }),
        fetch: this.config.fetch
      });
      return value;
    } catch (error) {
      throw await asGatewayError(error);
    }
  }
};
var gatewayGenerationInfoResponseSchema = (0, import_provider_utils6.lazySchema)(
  () => (0, import_provider_utils6.zodSchema)(
    import_v46.z.object({
      data: import_v46.z.object({
        id: import_v46.z.string(),
        total_cost: import_v46.z.number(),
        upstream_inference_cost: import_v46.z.number(),
        usage: import_v46.z.number(),
        created_at: import_v46.z.string(),
        model: import_v46.z.string(),
        is_byok: import_v46.z.boolean(),
        provider_name: import_v46.z.string(),
        streamed: import_v46.z.boolean(),
        finish_reason: import_v46.z.string(),
        latency: import_v46.z.number(),
        generation_time: import_v46.z.number(),
        native_tokens_prompt: import_v46.z.number(),
        native_tokens_completion: import_v46.z.number(),
        native_tokens_reasoning: import_v46.z.number(),
        native_tokens_cached: import_v46.z.number(),
        native_tokens_cache_creation: import_v46.z.number(),
        billable_web_search_calls: import_v46.z.number()
      }).transform(
        ({
          total_cost,
          upstream_inference_cost,
          created_at,
          is_byok,
          provider_name,
          finish_reason,
          generation_time,
          native_tokens_prompt,
          native_tokens_completion,
          native_tokens_reasoning,
          native_tokens_cached,
          native_tokens_cache_creation,
          billable_web_search_calls,
          ...rest
        }) => ({
          ...rest,
          totalCost: total_cost,
          upstreamInferenceCost: upstream_inference_cost,
          createdAt: created_at,
          isByok: is_byok,
          providerName: provider_name,
          finishReason: finish_reason,
          generationTime: generation_time,
          promptTokens: native_tokens_prompt,
          completionTokens: native_tokens_completion,
          reasoningTokens: native_tokens_reasoning,
          cachedTokens: native_tokens_cached,
          cacheCreationTokens: native_tokens_cache_creation,
          billableWebSearchCalls: billable_web_search_calls
        })
      )
    }).transform(({ data }) => data)
  )
);

// src/gateway-language-model.ts
var import_provider_utils7 = require("@ai-sdk/provider-utils");
var import_v47 = require("zod/v4");
var GatewayLanguageModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
    this.supportedUrls = { "*/*": [/.*/] };
  }
  get provider() {
    return this.config.provider;
  }
  async getArgs(options) {
    const { abortSignal: _abortSignal, ...optionsWithoutSignal } = options;
    return {
      args: this.maybeEncodeFileParts(optionsWithoutSignal),
      warnings: []
    };
  }
  async doGenerate(options) {
    const { args, warnings } = await this.getArgs(options);
    const { abortSignal } = options;
    const resolvedHeaders = await (0, import_provider_utils7.resolve)(this.config.headers());
    try {
      const {
        responseHeaders,
        value: responseBody,
        rawValue: rawResponse
      } = await (0, import_provider_utils7.postJsonToApi)({
        url: this.getUrl(),
        headers: (0, import_provider_utils7.combineHeaders)(
          resolvedHeaders,
          options.headers,
          this.getModelConfigHeaders(this.modelId, false),
          await (0, import_provider_utils7.resolve)(this.config.o11yHeaders)
        ),
        body: args,
        successfulResponseHandler: (0, import_provider_utils7.createJsonResponseHandler)(import_v47.z.any()),
        failedResponseHandler: (0, import_provider_utils7.createJsonErrorResponseHandler)({
          errorSchema: import_v47.z.any(),
          errorToMessage: (data) => data
        }),
        ...abortSignal && { abortSignal },
        fetch: this.config.fetch
      });
      return {
        ...responseBody,
        request: { body: args },
        response: { headers: responseHeaders, body: rawResponse },
        warnings
      };
    } catch (error) {
      throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders));
    }
  }
  async doStream(options) {
    const { args, warnings } = await this.getArgs(options);
    const { abortSignal } = options;
    const resolvedHeaders = await (0, import_provider_utils7.resolve)(this.config.headers());
    try {
      const { value: response, responseHeaders } = await (0, import_provider_utils7.postJsonToApi)({
        url: this.getUrl(),
        headers: (0, import_provider_utils7.combineHeaders)(
          resolvedHeaders,
          options.headers,
          this.getModelConfigHeaders(this.modelId, true),
          await (0, import_provider_utils7.resolve)(this.config.o11yHeaders)
        ),
        body: args,
        successfulResponseHandler: (0, import_provider_utils7.createEventSourceResponseHandler)(import_v47.z.any()),
        failedResponseHandler: (0, import_provider_utils7.createJsonErrorResponseHandler)({
          errorSchema: import_v47.z.any(),
          errorToMessage: (data) => data
        }),
        ...abortSignal && { abortSignal },
        fetch: this.config.fetch
      });
      return {
        stream: response.pipeThrough(
          new TransformStream({
            start(controller) {
              if (warnings.length > 0) {
                controller.enqueue({ type: "stream-start", warnings });
              }
            },
            transform(chunk, controller) {
              if (chunk.success) {
                const streamPart = chunk.value;
                if (streamPart.type === "raw" && !options.includeRawChunks) {
                  return;
                }
                if (streamPart.type === "response-metadata" && streamPart.timestamp && typeof streamPart.timestamp === "string") {
                  streamPart.timestamp = new Date(streamPart.timestamp);
                }
                controller.enqueue(streamPart);
              } else {
                controller.error(
                  chunk.error
                );
              }
            }
          })
        ),
        request: { body: args },
        response: { headers: responseHeaders }
      };
    } catch (error) {
      throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders));
    }
  }
  isFilePart(part) {
    return part && typeof part === "object" && "type" in part && part.type === "file";
  }
  /**
   * Encodes file parts in the prompt to base64. Mutates the passed options
   * instance directly to avoid copying the file data.
   * @param options - The options to encode.
   * @returns The options with the file parts encoded.
   */
  maybeEncodeFileParts(options) {
    for (const message of options.prompt) {
      for (const part of message.content) {
        if (this.isFilePart(part)) {
          const filePart = part;
          if (filePart.data instanceof Uint8Array) {
            const buffer = Uint8Array.from(filePart.data);
            const base64Data = Buffer.from(buffer).toString("base64");
            filePart.data = new URL(
              `data:${filePart.mediaType || "application/octet-stream"};base64,${base64Data}`
            );
          }
        }
      }
    }
    return options;
  }
  getUrl() {
    return `${this.config.baseURL}/language-model`;
  }
  getModelConfigHeaders(modelId, streaming) {
    return {
      "ai-language-model-specification-version": "3",
      "ai-language-model-id": modelId,
      "ai-language-model-streaming": String(streaming)
    };
  }
};

// src/gateway-embedding-model.ts
var import_provider_utils8 = require("@ai-sdk/provider-utils");
var import_v48 = require("zod/v4");
var GatewayEmbeddingModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
    this.maxEmbeddingsPerCall = 2048;
    this.supportsParallelCalls = true;
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
    var _a9;
    const resolvedHeaders = await (0, import_provider_utils8.resolve)(this.config.headers());
    try {
      const {
        responseHeaders,
        value: responseBody,
        rawValue
      } = await (0, import_provider_utils8.postJsonToApi)({
        url: this.getUrl(),
        headers: (0, import_provider_utils8.combineHeaders)(
          resolvedHeaders,
          headers != null ? headers : {},
          this.getModelConfigHeaders(),
          await (0, import_provider_utils8.resolve)(this.config.o11yHeaders)
        ),
        body: {
          values,
          ...providerOptions ? { providerOptions } : {}
        },
        successfulResponseHandler: (0, import_provider_utils8.createJsonResponseHandler)(
          gatewayEmbeddingResponseSchema
        ),
        failedResponseHandler: (0, import_provider_utils8.createJsonErrorResponseHandler)({
          errorSchema: import_v48.z.any(),
          errorToMessage: (data) => data
        }),
        ...abortSignal && { abortSignal },
        fetch: this.config.fetch
      });
      return {
        embeddings: responseBody.embeddings,
        usage: (_a9 = responseBody.usage) != null ? _a9 : void 0,
        providerMetadata: responseBody.providerMetadata,
        response: { headers: responseHeaders, body: rawValue },
        warnings: []
      };
    } catch (error) {
      throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders));
    }
  }
  getUrl() {
    return `${this.config.baseURL}/embedding-model`;
  }
  getModelConfigHeaders() {
    return {
      "ai-embedding-model-specification-version": "3",
      "ai-model-id": this.modelId
    };
  }
};
var gatewayEmbeddingResponseSchema = (0, import_provider_utils8.lazySchema)(
  () => (0, import_provider_utils8.zodSchema)(
    import_v48.z.object({
      embeddings: import_v48.z.array(import_v48.z.array(import_v48.z.number())),
      usage: import_v48.z.object({ tokens: import_v48.z.number() }).nullish(),
      providerMetadata: import_v48.z.record(import_v48.z.string(), import_v48.z.record(import_v48.z.string(), import_v48.z.unknown())).optional()
    })
  )
);

// src/gateway-image-model.ts
var import_provider_utils9 = require("@ai-sdk/provider-utils");
var import_v49 = require("zod/v4");
var GatewayImageModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
    // Set a very large number to prevent client-side splitting of requests
    this.maxImagesPerCall = Number.MAX_SAFE_INTEGER;
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
    files,
    mask,
    providerOptions,
    headers,
    abortSignal
  }) {
    var _a9, _b9, _c, _d;
    const resolvedHeaders = await (0, import_provider_utils9.resolve)(this.config.headers());
    try {
      const {
        responseHeaders,
        value: responseBody,
        rawValue
      } = await (0, import_provider_utils9.postJsonToApi)({
        url: this.getUrl(),
        headers: (0, import_provider_utils9.combineHeaders)(
          resolvedHeaders,
          headers != null ? headers : {},
          this.getModelConfigHeaders(),
          await (0, import_provider_utils9.resolve)(this.config.o11yHeaders)
        ),
        body: {
          prompt,
          n,
          ...size && { size },
          ...aspectRatio && { aspectRatio },
          ...seed && { seed },
          ...providerOptions && { providerOptions },
          ...files && {
            files: files.map((file) => maybeEncodeImageFile(file))
          },
          ...mask && { mask: maybeEncodeImageFile(mask) }
        },
        successfulResponseHandler: (0, import_provider_utils9.createJsonResponseHandler)(
          gatewayImageResponseSchema
        ),
        failedResponseHandler: (0, import_provider_utils9.createJsonErrorResponseHandler)({
          errorSchema: import_v49.z.any(),
          errorToMessage: (data) => data
        }),
        ...abortSignal && { abortSignal },
        fetch: this.config.fetch
      });
      return {
        images: responseBody.images,
        // Always base64 strings from server
        warnings: (_a9 = responseBody.warnings) != null ? _a9 : [],
        providerMetadata: responseBody.providerMetadata,
        response: {
          timestamp: /* @__PURE__ */ new Date(),
          modelId: this.modelId,
          headers: responseHeaders
        },
        ...responseBody.usage != null && {
          usage: {
            inputTokens: (_b9 = responseBody.usage.inputTokens) != null ? _b9 : void 0,
            outputTokens: (_c = responseBody.usage.outputTokens) != null ? _c : void 0,
            totalTokens: (_d = responseBody.usage.totalTokens) != null ? _d : void 0
          }
        }
      };
    } catch (error) {
      throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders));
    }
  }
  getUrl() {
    return `${this.config.baseURL}/image-model`;
  }
  getModelConfigHeaders() {
    return {
      "ai-image-model-specification-version": "3",
      "ai-model-id": this.modelId
    };
  }
};
function maybeEncodeImageFile(file) {
  if (file.type === "file" && file.data instanceof Uint8Array) {
    return {
      ...file,
      data: (0, import_provider_utils9.convertUint8ArrayToBase64)(file.data)
    };
  }
  return file;
}
var providerMetadataEntrySchema = import_v49.z.object({
  images: import_v49.z.array(import_v49.z.unknown()).optional()
}).catchall(import_v49.z.unknown());
var gatewayImageWarningSchema = import_v49.z.discriminatedUnion("type", [
  import_v49.z.object({
    type: import_v49.z.literal("unsupported"),
    feature: import_v49.z.string(),
    details: import_v49.z.string().optional()
  }),
  import_v49.z.object({
    type: import_v49.z.literal("compatibility"),
    feature: import_v49.z.string(),
    details: import_v49.z.string().optional()
  }),
  import_v49.z.object({
    type: import_v49.z.literal("other"),
    message: import_v49.z.string()
  })
]);
var gatewayImageUsageSchema = import_v49.z.object({
  inputTokens: import_v49.z.number().nullish(),
  outputTokens: import_v49.z.number().nullish(),
  totalTokens: import_v49.z.number().nullish()
});
var gatewayImageResponseSchema = import_v49.z.object({
  images: import_v49.z.array(import_v49.z.string()),
  // Always base64 strings over the wire
  warnings: import_v49.z.array(gatewayImageWarningSchema).optional(),
  providerMetadata: import_v49.z.record(import_v49.z.string(), providerMetadataEntrySchema).optional(),
  usage: gatewayImageUsageSchema.optional()
});

// src/gateway-video-model.ts
var import_provider2 = require("@ai-sdk/provider");
var import_provider_utils10 = require("@ai-sdk/provider-utils");
var import_v410 = require("zod/v4");
var GatewayVideoModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
    // Set a very large number to prevent client-side splitting of requests
    this.maxVideosPerCall = Number.MAX_SAFE_INTEGER;
  }
  get provider() {
    return this.config.provider;
  }
  async doGenerate({
    prompt,
    n,
    aspectRatio,
    resolution,
    duration,
    fps,
    seed,
    image,
    providerOptions,
    headers,
    abortSignal
  }) {
    var _a9;
    const resolvedHeaders = await (0, import_provider_utils10.resolve)(this.config.headers());
    try {
      const { responseHeaders, value: responseBody } = await (0, import_provider_utils10.postJsonToApi)({
        url: this.getUrl(),
        headers: (0, import_provider_utils10.combineHeaders)(
          resolvedHeaders,
          headers != null ? headers : {},
          this.getModelConfigHeaders(),
          await (0, import_provider_utils10.resolve)(this.config.o11yHeaders),
          { accept: "text/event-stream" }
        ),
        body: {
          prompt,
          n,
          ...aspectRatio && { aspectRatio },
          ...resolution && { resolution },
          ...duration && { duration },
          ...fps && { fps },
          ...seed && { seed },
          ...providerOptions && { providerOptions },
          ...image && { image: maybeEncodeVideoFile(image) }
        },
        successfulResponseHandler: async ({
          response,
          url,
          requestBodyValues
        }) => {
          if (response.body == null) {
            throw new import_provider2.APICallError({
              message: "SSE response body is empty",
              url,
              requestBodyValues,
              statusCode: response.status
            });
          }
          const eventStream = (0, import_provider_utils10.parseJsonEventStream)({
            stream: response.body,
            schema: gatewayVideoEventSchema
          });
          const reader = eventStream.getReader();
          const { done, value: parseResult } = await reader.read();
          reader.releaseLock();
          if (done || !parseResult) {
            throw new import_provider2.APICallError({
              message: "SSE stream ended without a data event",
              url,
              requestBodyValues,
              statusCode: response.status
            });
          }
          if (!parseResult.success) {
            throw new import_provider2.APICallError({
              message: "Failed to parse video SSE event",
              cause: parseResult.error,
              url,
              requestBodyValues,
              statusCode: response.status
            });
          }
          const event = parseResult.value;
          if (event.type === "error") {
            throw new import_provider2.APICallError({
              message: event.message,
              statusCode: event.statusCode,
              url,
              requestBodyValues,
              responseHeaders: Object.fromEntries([...response.headers]),
              responseBody: JSON.stringify(event),
              data: {
                error: {
                  message: event.message,
                  type: event.errorType,
                  param: event.param
                }
              }
            });
          }
          return {
            value: {
              videos: event.videos,
              warnings: event.warnings,
              providerMetadata: event.providerMetadata
            },
            responseHeaders: Object.fromEntries([...response.headers])
          };
        },
        failedResponseHandler: (0, import_provider_utils10.createJsonErrorResponseHandler)({
          errorSchema: import_v410.z.any(),
          errorToMessage: (data) => data
        }),
        ...abortSignal && { abortSignal },
        fetch: this.config.fetch
      });
      return {
        videos: responseBody.videos,
        warnings: (_a9 = responseBody.warnings) != null ? _a9 : [],
        providerMetadata: responseBody.providerMetadata,
        response: {
          timestamp: /* @__PURE__ */ new Date(),
          modelId: this.modelId,
          headers: responseHeaders
        }
      };
    } catch (error) {
      throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders));
    }
  }
  getUrl() {
    return `${this.config.baseURL}/video-model`;
  }
  getModelConfigHeaders() {
    return {
      "ai-video-model-specification-version": "3",
      "ai-model-id": this.modelId
    };
  }
};
function maybeEncodeVideoFile(file) {
  if (file.type === "file" && file.data instanceof Uint8Array) {
    return {
      ...file,
      data: (0, import_provider_utils10.convertUint8ArrayToBase64)(file.data)
    };
  }
  return file;
}
var providerMetadataEntrySchema2 = import_v410.z.object({
  videos: import_v410.z.array(import_v410.z.unknown()).optional()
}).catchall(import_v410.z.unknown());
var gatewayVideoDataSchema = import_v410.z.union([
  import_v410.z.object({
    type: import_v410.z.literal("url"),
    url: import_v410.z.string(),
    mediaType: import_v410.z.string()
  }),
  import_v410.z.object({
    type: import_v410.z.literal("base64"),
    data: import_v410.z.string(),
    mediaType: import_v410.z.string()
  })
]);
var gatewayVideoWarningSchema = import_v410.z.discriminatedUnion("type", [
  import_v410.z.object({
    type: import_v410.z.literal("unsupported"),
    feature: import_v410.z.string(),
    details: import_v410.z.string().optional()
  }),
  import_v410.z.object({
    type: import_v410.z.literal("compatibility"),
    feature: import_v410.z.string(),
    details: import_v410.z.string().optional()
  }),
  import_v410.z.object({
    type: import_v410.z.literal("other"),
    message: import_v410.z.string()
  })
]);
var gatewayVideoEventSchema = import_v410.z.discriminatedUnion("type", [
  import_v410.z.object({
    type: import_v410.z.literal("result"),
    videos: import_v410.z.array(gatewayVideoDataSchema),
    warnings: import_v410.z.array(gatewayVideoWarningSchema).optional(),
    providerMetadata: import_v410.z.record(import_v410.z.string(), providerMetadataEntrySchema2).optional()
  }),
  import_v410.z.object({
    type: import_v410.z.literal("error"),
    message: import_v410.z.string(),
    errorType: import_v410.z.string(),
    statusCode: import_v410.z.number(),
    param: import_v410.z.unknown().nullable()
  })
]);

// src/tool/parallel-search.ts
var import_provider_utils11 = require("@ai-sdk/provider-utils");
var import_zod = require("zod");
var parallelSearchInputSchema = (0, import_provider_utils11.lazySchema)(
  () => (0, import_provider_utils11.zodSchema)(
    import_zod.z.object({
      objective: import_zod.z.string().describe(
        "Natural-language description of the web research goal, including source or freshness guidance and broader context from the task. Maximum 5000 characters."
      ),
      search_queries: import_zod.z.array(import_zod.z.string()).optional().describe(
        "Optional search queries to supplement the objective. Maximum 200 characters per query."
      ),
      mode: import_zod.z.enum(["one-shot", "agentic"]).optional().describe(
        'Mode preset: "one-shot" for comprehensive results with longer excerpts (default), "agentic" for concise, token-efficient results for multi-step workflows.'
      ),
      max_results: import_zod.z.number().optional().describe(
        "Maximum number of results to return (1-20). Defaults to 10 if not specified."
      ),
      source_policy: import_zod.z.object({
        include_domains: import_zod.z.array(import_zod.z.string()).optional().describe("List of domains to include in search results."),
        exclude_domains: import_zod.z.array(import_zod.z.string()).optional().describe("List of domains to exclude from search results."),
        after_date: import_zod.z.string().optional().describe(
          "Only include results published after this date (ISO 8601 format)."
        )
      }).optional().describe(
        "Source policy for controlling which domains to include/exclude and freshness."
      ),
      excerpts: import_zod.z.object({
        max_chars_per_result: import_zod.z.number().optional().describe("Maximum characters per result."),
        max_chars_total: import_zod.z.number().optional().describe("Maximum total characters across all results.")
      }).optional().describe("Excerpt configuration for controlling result length."),
      fetch_policy: import_zod.z.object({
        max_age_seconds: import_zod.z.number().optional().describe(
          "Maximum age in seconds for cached content. Set to 0 to always fetch fresh content."
        )
      }).optional().describe("Fetch policy for controlling content freshness.")
    })
  )
);
var parallelSearchOutputSchema = (0, import_provider_utils11.lazySchema)(
  () => (0, import_provider_utils11.zodSchema)(
    import_zod.z.union([
      // Success response
      import_zod.z.object({
        searchId: import_zod.z.string(),
        results: import_zod.z.array(
          import_zod.z.object({
            url: import_zod.z.string(),
            title: import_zod.z.string(),
            excerpt: import_zod.z.string(),
            publishDate: import_zod.z.string().nullable().optional(),
            relevanceScore: import_zod.z.number().optional()
          })
        )
      }),
      // Error response
      import_zod.z.object({
        error: import_zod.z.enum([
          "api_error",
          "rate_limit",
          "timeout",
          "invalid_input",
          "configuration_error",
          "unknown"
        ]),
        statusCode: import_zod.z.number().optional(),
        message: import_zod.z.string()
      })
    ])
  )
);
var parallelSearchToolFactory = (0, import_provider_utils11.createProviderToolFactoryWithOutputSchema)({
  id: "gateway.parallel_search",
  inputSchema: parallelSearchInputSchema,
  outputSchema: parallelSearchOutputSchema
});
var parallelSearch = (config = {}) => parallelSearchToolFactory(config);

// src/tool/perplexity-search.ts
var import_provider_utils12 = require("@ai-sdk/provider-utils");
var import_zod2 = require("zod");
var perplexitySearchInputSchema = (0, import_provider_utils12.lazySchema)(
  () => (0, import_provider_utils12.zodSchema)(
    import_zod2.z.object({
      query: import_zod2.z.union([import_zod2.z.string(), import_zod2.z.array(import_zod2.z.string())]).describe(
        "Search query (string) or multiple queries (array of up to 5 strings). Multi-query searches return combined results from all queries."
      ),
      max_results: import_zod2.z.number().optional().describe(
        "Maximum number of search results to return (1-20, default: 10)"
      ),
      max_tokens_per_page: import_zod2.z.number().optional().describe(
        "Maximum number of tokens to extract per search result page (256-2048, default: 2048)"
      ),
      max_tokens: import_zod2.z.number().optional().describe(
        "Maximum total tokens across all search results (default: 25000, max: 1000000)"
      ),
      country: import_zod2.z.string().optional().describe(
        "Two-letter ISO 3166-1 alpha-2 country code for regional search results (e.g., 'US', 'GB', 'FR')"
      ),
      search_domain_filter: import_zod2.z.array(import_zod2.z.string()).optional().describe(
        "List of domains to include or exclude from search results (max 20). To include: ['nature.com', 'science.org']. To exclude: ['-example.com', '-spam.net']"
      ),
      search_language_filter: import_zod2.z.array(import_zod2.z.string()).optional().describe(
        "List of ISO 639-1 language codes to filter results (max 10, lowercase). Examples: ['en', 'fr', 'de']"
      ),
      search_after_date: import_zod2.z.string().optional().describe(
        "Include only results published after this date. Format: 'MM/DD/YYYY' (e.g., '3/1/2025'). Cannot be used with search_recency_filter."
      ),
      search_before_date: import_zod2.z.string().optional().describe(
        "Include only results published before this date. Format: 'MM/DD/YYYY' (e.g., '3/15/2025'). Cannot be used with search_recency_filter."
      ),
      last_updated_after_filter: import_zod2.z.string().optional().describe(
        "Include only results last updated after this date. Format: 'MM/DD/YYYY' (e.g., '3/1/2025'). Cannot be used with search_recency_filter."
      ),
      last_updated_before_filter: import_zod2.z.string().optional().describe(
        "Include only results last updated before this date. Format: 'MM/DD/YYYY' (e.g., '3/15/2025'). Cannot be used with search_recency_filter."
      ),
      search_recency_filter: import_zod2.z.enum(["day", "week", "month", "year"]).optional().describe(
        "Filter results by relative time period. Cannot be used with search_after_date or search_before_date."
      )
    })
  )
);
var perplexitySearchOutputSchema = (0, import_provider_utils12.lazySchema)(
  () => (0, import_provider_utils12.zodSchema)(
    import_zod2.z.union([
      // Success response
      import_zod2.z.object({
        results: import_zod2.z.array(
          import_zod2.z.object({
            title: import_zod2.z.string(),
            url: import_zod2.z.string(),
            snippet: import_zod2.z.string(),
            date: import_zod2.z.string().optional(),
            lastUpdated: import_zod2.z.string().optional()
          })
        ),
        id: import_zod2.z.string()
      }),
      // Error response
      import_zod2.z.object({
        error: import_zod2.z.enum([
          "api_error",
          "rate_limit",
          "timeout",
          "invalid_input",
          "unknown"
        ]),
        statusCode: import_zod2.z.number().optional(),
        message: import_zod2.z.string()
      })
    ])
  )
);
var perplexitySearchToolFactory = (0, import_provider_utils12.createProviderToolFactoryWithOutputSchema)({
  id: "gateway.perplexity_search",
  inputSchema: perplexitySearchInputSchema,
  outputSchema: perplexitySearchOutputSchema
});
var perplexitySearch = (config = {}) => perplexitySearchToolFactory(config);

// src/gateway-tools.ts
var gatewayTools = {
  /**
   * Search the web using Parallel AI's Search API for LLM-optimized excerpts.
   *
   * Takes a natural language objective and returns relevant excerpts,
   * replacing multiple keyword searches with a single call for broad
   * or complex queries. Supports different search types for depth vs
   * breadth tradeoffs.
   */
  parallelSearch,
  /**
   * Search the web using Perplexity's Search API for real-time information,
   * news, research papers, and articles.
   *
   * Provides ranked search results with advanced filtering options including
   * domain, language, date range, and recency filters.
   */
  perplexitySearch
};

// src/vercel-environment.ts
var import_oidc = require("@vercel/oidc");
var import_oidc2 = require("@vercel/oidc");
async function getVercelRequestId() {
  var _a9;
  return (_a9 = (0, import_oidc.getContext)().headers) == null ? void 0 : _a9["x-vercel-id"];
}

// src/gateway-provider.ts
var import_provider_utils14 = require("@ai-sdk/provider-utils");

// src/version.ts
var VERSION = true ? "3.0.83" : "0.0.0-test";

// src/gateway-provider.ts
var AI_GATEWAY_PROTOCOL_VERSION = "0.0.1";
function createGatewayProvider(options = {}) {
  var _a9, _b9;
  let pendingMetadata = null;
  let metadataCache = null;
  const cacheRefreshMillis = (_a9 = options.metadataCacheRefreshMillis) != null ? _a9 : 1e3 * 60 * 5;
  let lastFetchTime = 0;
  const baseURL = (_b9 = (0, import_provider_utils13.withoutTrailingSlash)(options.baseURL)) != null ? _b9 : "https://ai-gateway.vercel.sh/v3/ai";
  const getHeaders = async () => {
    try {
      const auth = await getGatewayAuthToken(options);
      return (0, import_provider_utils14.withUserAgentSuffix)(
        {
          Authorization: `Bearer ${auth.token}`,
          "ai-gateway-protocol-version": AI_GATEWAY_PROTOCOL_VERSION,
          [GATEWAY_AUTH_METHOD_HEADER]: auth.authMethod,
          ...options.headers
        },
        `ai-sdk/gateway/${VERSION}`
      );
    } catch (error) {
      throw GatewayAuthenticationError.createContextualError({
        apiKeyProvided: false,
        oidcTokenProvided: false,
        statusCode: 401,
        cause: error
      });
    }
  };
  const createO11yHeaders = () => {
    const deploymentId = (0, import_provider_utils13.loadOptionalSetting)({
      settingValue: void 0,
      environmentVariableName: "VERCEL_DEPLOYMENT_ID"
    });
    const environment = (0, import_provider_utils13.loadOptionalSetting)({
      settingValue: void 0,
      environmentVariableName: "VERCEL_ENV"
    });
    const region = (0, import_provider_utils13.loadOptionalSetting)({
      settingValue: void 0,
      environmentVariableName: "VERCEL_REGION"
    });
    const projectId = (0, import_provider_utils13.loadOptionalSetting)({
      settingValue: void 0,
      environmentVariableName: "VERCEL_PROJECT_ID"
    });
    return async () => {
      const requestId = await getVercelRequestId();
      return {
        ...deploymentId && { "ai-o11y-deployment-id": deploymentId },
        ...environment && { "ai-o11y-environment": environment },
        ...region && { "ai-o11y-region": region },
        ...requestId && { "ai-o11y-request-id": requestId },
        ...projectId && { "ai-o11y-project-id": projectId }
      };
    };
  };
  const createLanguageModel = (modelId) => {
    return new GatewayLanguageModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  };
  const getAvailableModels = async () => {
    var _a10, _b10, _c;
    const now = (_c = (_b10 = (_a10 = options._internal) == null ? void 0 : _a10.currentDate) == null ? void 0 : _b10.call(_a10).getTime()) != null ? _c : Date.now();
    if (!pendingMetadata || now - lastFetchTime > cacheRefreshMillis) {
      lastFetchTime = now;
      pendingMetadata = new GatewayFetchMetadata({
        baseURL,
        headers: getHeaders,
        fetch: options.fetch
      }).getAvailableModels().then((metadata) => {
        metadataCache = metadata;
        return metadata;
      }).catch(async (error) => {
        throw await asGatewayError(
          error,
          await parseAuthMethod(await getHeaders())
        );
      });
    }
    return metadataCache ? Promise.resolve(metadataCache) : pendingMetadata;
  };
  const getCredits = async () => {
    return new GatewayFetchMetadata({
      baseURL,
      headers: getHeaders,
      fetch: options.fetch
    }).getCredits().catch(async (error) => {
      throw await asGatewayError(
        error,
        await parseAuthMethod(await getHeaders())
      );
    });
  };
  const getSpendReport = async (params) => {
    return new GatewaySpendReport({
      baseURL,
      headers: getHeaders,
      fetch: options.fetch
    }).getSpendReport(params).catch(async (error) => {
      throw await asGatewayError(
        error,
        await parseAuthMethod(await getHeaders())
      );
    });
  };
  const getGenerationInfo = async (params) => {
    return new GatewayGenerationInfoFetcher({
      baseURL,
      headers: getHeaders,
      fetch: options.fetch
    }).getGenerationInfo(params).catch(async (error) => {
      throw await asGatewayError(
        error,
        await parseAuthMethod(await getHeaders())
      );
    });
  };
  const provider = function(modelId) {
    if (new.target) {
      throw new Error(
        "The Gateway Provider model function cannot be called with the new keyword."
      );
    }
    return createLanguageModel(modelId);
  };
  provider.specificationVersion = "v3";
  provider.getAvailableModels = getAvailableModels;
  provider.getCredits = getCredits;
  provider.getSpendReport = getSpendReport;
  provider.getGenerationInfo = getGenerationInfo;
  provider.imageModel = (modelId) => {
    return new GatewayImageModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  };
  provider.languageModel = createLanguageModel;
  const createEmbeddingModel = (modelId) => {
    return new GatewayEmbeddingModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  };
  provider.embeddingModel = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.videoModel = (modelId) => {
    return new GatewayVideoModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  };
  provider.chat = provider.languageModel;
  provider.embedding = provider.embeddingModel;
  provider.image = provider.imageModel;
  provider.video = provider.videoModel;
  provider.tools = gatewayTools;
  return provider;
}
var gateway = createGatewayProvider();
async function getGatewayAuthToken(options) {
  const apiKey = (0, import_provider_utils13.loadOptionalSetting)({
    settingValue: options.apiKey,
    environmentVariableName: "AI_GATEWAY_API_KEY"
  });
  if (apiKey) {
    return {
      token: apiKey,
      authMethod: "api-key"
    };
  }
  const oidcToken = await (0, import_oidc2.getVercelOidcToken)();
  return {
    token: oidcToken,
    authMethod: "oidc"
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GatewayAuthenticationError,
  GatewayError,
  GatewayInternalServerError,
  GatewayInvalidRequestError,
  GatewayModelNotFoundError,
  GatewayRateLimitError,
  GatewayResponseError,
  createGateway,
  createGatewayProvider,
  gateway
});
//# sourceMappingURL=index.js.map