// package.json
var package_default = {
  name: "@n8n_io/ai-assistant-sdk",
  version: "1.20.0",
  description: "n8n AI assistant SDK",
  author: "",
  private: false,
  license: "UNLICENSED",
  engines: {
    node: ">=20.15",
    pnpm: ">=8.14"
  },
  main: "./dist/index.js",
  types: "./dist/index.d.ts",
  module: "./dist/index.mjs",
  packageManager: "pnpm@9.10.0",
  scripts: {
    typecheck: "tsc --noEmit",
    build: "tsup",
    format: "prettier --write . --ignore-path ../.prettierignore",
    lint: "eslint ./src --quiet -c ../.eslintrc.js",
    start: "node ./dist/index.js",
    test: "node --import tsx --test test/**.test.ts",
    "test:dev": "node --import tsx --test --watch test/**.test.ts",
    watch: "tsup src/index.ts --watch"
  },
  devDependencies: {
    "@faker-js/faker": "^8.4.1",
    "@types/node": "^22.4.0",
    eslint: "^9.6.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.1.3",
    nock: "^14.0.0-beta.9",
    prettier: "^3.3.2",
    tsup: "^8.1.0",
    tsx: "^4.17.0",
    typescript: "^5.5.3"
  }
};

// src/error.ts
var ApplicationError = class extends Error {
  level;
  name;
  statusCode;
  constructor(message, { level, name, statusCode } = {}) {
    super(message);
    this.level = level ?? "error";
    this.name = name ?? "AIServiceSDKError";
    this.statusCode = statusCode;
  }
};
var APIResponseError = class extends ApplicationError {
  constructor(message, statusCode) {
    super(message, { name: "AIServiceAPIResponseError", level: "error", statusCode });
  }
};
var AuthError = class extends ApplicationError {
  constructor(message) {
    super(message, { name: "AuthError", level: "warning" });
  }
};

// src/index.ts
var isObjectWithErrorMessage = (data) => {
  return typeof data === "object" && data !== null && "message" in data && typeof data?.message === "string";
};
var DEFAULT_SERVICE_BASE_URL = "https://ai-assistant.n8n.io";
var AiAssistantClient = class {
  licenseCert;
  consumerId;
  n8nVersion;
  instanceId;
  baseUrl = DEFAULT_SERVICE_BASE_URL;
  logLevel = "info";
  activeToken;
  /**
   * Create a client for the AI service.
   * @param licenseCert - The license certificate. You can get it from the n8n.
   * @param consumerId - The consumer ID.
   * @param n8nVersion - The n8n version.
   * @param instanceId - The n8n instance ID.
   * @param baseUrl - The base URL of the AI service API.
   * @returns {RequestHandler}
   */
  constructor({
    licenseCert,
    consumerId,
    n8nVersion,
    instanceId,
    baseUrl,
    logLevel
  }) {
    this.licenseCert = licenseCert;
    this.consumerId = consumerId;
    this.n8nVersion = n8nVersion;
    this.instanceId = instanceId;
    this.baseUrl = baseUrl ?? this.baseUrl;
    this.logLevel = logLevel ?? this.logLevel;
    this.debug("Initializing AI Assistant Service Client", {
      baseUrl: this.baseUrl,
      consumerId: this.consumerId,
      n8nVersion: this.n8nVersion,
      licenseCert: this.licenseCert.substring(0, 5)
    });
  }
  async chat(payload, user) {
    return await this.postRequest("/v1/chat", payload, user);
  }
  async applySuggestion(payload, user) {
    const response = await this.postRequest("/v1/chat/apply-suggestion", payload, user);
    const data = await response.json();
    if (isValidApplySuggestionResponse(data)) {
      return data;
    }
    throw new APIResponseError("Invalid response from assistant service");
  }
  async askAi(payload, user) {
    {
      const response = await this.postRequest("/v1/ask-ai", payload, user);
      const data = await response.json();
      if (isValidAskAiResponse(data)) {
        return data;
      }
      throw new APIResponseError("Invalid response from assistant service");
    }
  }
  async generateAiCreditsCredentials(user) {
    {
      const url = `${this.baseUrl}/v1/ai-credits/credentials`;
      try {
        const response = await fetch(url, {
          headers: this.getHeaders(user),
          method: "POST",
          body: JSON.stringify({
            licenseCert: this.licenseCert
          })
        });
        const data = await response.json();
        if (isValidAiCreditsResponse(data)) {
          return data;
        }
        throw new APIResponseError("Invalid response from assistant service");
      } catch (error) {
        if (isObjectWithErrorMessage(error)) {
          throw new APIResponseError(error.message);
        } else {
          throw new APIResponseError("unknown error");
        }
      }
    }
  }
  getApiProxyBaseUrl() {
    return this.baseUrl + "/v1/api-proxy";
  }
  /**
   * Update the license certificate and clear the active token.
   * This should be called when the license is renewed or changed.
   * @param licenseCert - The new license certificate.
   */
  updateLicenseCert(licenseCert) {
    this.licenseCert = licenseCert;
    this.activeToken = void 0;
  }
  async getBuilderApiProxyToken(user, options) {
    const url = `${this.baseUrl}/v1/builder/api-proxy-token`;
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(user),
        method: "POST",
        body: JSON.stringify({
          licenseCert: this.licenseCert,
          userMessageId: options?.userMessageId
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = isObjectWithErrorMessage(errorData) ? errorData.message : `Failed to get builder API proxy token: ${response.statusText}`;
        throw new APIResponseError(errorMessage);
      }
      const data = await response.json();
      if (isValidBuilderApiProxyTokenResponse(data)) {
        return data;
      }
      throw new APIResponseError("Invalid response from assistant service");
    } catch (error) {
      if (isObjectWithErrorMessage(error)) {
        throw new APIResponseError(error.message);
      } else {
        throw new APIResponseError("unknown error");
      }
    }
  }
  async markBuilderSuccess(user, headers) {
    const url = `${this.baseUrl}/v1/builder/success`;
    try {
      const response = await fetch(url, {
        headers: {
          ...this.getHeaders(user),
          "x-authorization": headers.Authorization
        },
        body: JSON.stringify({
          licenseCert: this.licenseCert
        }),
        method: "POST"
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = isObjectWithErrorMessage(errorData) ? errorData.message : `Failed to mark builder success: ${response.statusText}`;
        throw new APIResponseError(errorMessage);
      }
      const data = await response.json();
      if (!isValidBuilderInstanceCreditsResponse(data)) {
        throw new APIResponseError("Invalid response from assistant service");
      }
      return data;
    } catch (error) {
      if (isObjectWithErrorMessage(error)) {
        throw new APIResponseError(error.message);
      } else {
        throw new APIResponseError("unknown error");
      }
    }
  }
  async getBuilderInstanceCredits(user) {
    const url = `${this.baseUrl}/v1/builder/usage`;
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(user),
        method: "POST",
        body: JSON.stringify({
          licenseCert: this.licenseCert
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = isObjectWithErrorMessage(errorData) ? errorData.message : `Failed to get builder usage: ${response.statusText}`;
        throw new APIResponseError(errorMessage);
      }
      const data = await response.json();
      if (isValidBuilderInstanceCreditsResponse(data)) {
        return data;
      }
      throw new APIResponseError("Invalid response from assistant service");
    } catch (error) {
      if (isObjectWithErrorMessage(error)) {
        throw new APIResponseError(error.message);
      } else {
        throw new APIResponseError("unknown error");
      }
    }
  }
  getHeadersWithAuthToken(user) {
    return {
      authorization: `Bearer ${this.activeToken}`,
      ...this.getHeaders(user)
    };
  }
  getHeaders(user) {
    return {
      "Content-Type": "application/json",
      "x-consumer-id": this.consumerId,
      "x-user-id": user.id,
      "x-sdk-version": package_default.version,
      "x-n8n-version": this.n8nVersion,
      "x-instance-id": this.instanceId
    };
  }
  async refreshAuthToken() {
    const response = await fetch(`${this.baseUrl}/auth/token`, {
      method: "POST",
      body: JSON.stringify({ licenseCert: this.licenseCert }),
      headers: { "Content-Type": "application/json" }
    });
    const data = await response.json();
    if (typeof data === "object" && data && "accessToken" in data && data.accessToken && typeof data.accessToken === "string") {
      this.activeToken = data.accessToken;
      return;
    }
    const errorMessage = isObjectWithErrorMessage(data) ? data.message : "Unknown error";
    throw new AuthError(`Could not retrieve access token: ${errorMessage}`);
  }
  async postRequest(endpoint, payload, user) {
    if (!this.activeToken) {
      await this.refreshAuthToken();
    }
    if (!this.activeToken) {
      throw new AuthError("No token to call assistant service");
    }
    const url = `${this.baseUrl}${endpoint}`;
    let response = await fetch(url, {
      headers: this.getHeadersWithAuthToken(user),
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (!response.ok && response.status === 401) {
      await this.refreshAuthToken();
      response = await fetch(url, {
        headers: this.getHeadersWithAuthToken(user),
        method: "POST",
        body: JSON.stringify(payload)
      });
    } else if (!response.ok) {
      const error = await response.json();
      this.debug(`API Error ${JSON.stringify(error)}`);
      const message = typeof error === "object" && error && "message" in error && typeof error.message === "string" ? error.message : response.statusText;
      throw new APIResponseError(message, response.status);
    }
    return response;
  }
  debug(message, debugInfo) {
    if (this.logLevel === "debug") {
      console.debug(formatLog(message), formatLog(JSON.stringify(debugInfo)));
    }
  }
};
function formatLog(message) {
  return `[ai-assistant-sdk] ${message}`;
}
function isValidApplySuggestionResponse(response) {
  return typeof response === "object" && !!response && "parameters" in response && "sessionId" in response;
}
function isValidAskAiResponse(response) {
  return typeof response === "object" && !!response && "code" in response;
}
function isValidAiCreditsResponse(response) {
  return typeof response === "object" && !!response && "apiKey" in response && "url" in response;
}
function isValidBuilderApiProxyTokenResponse(response) {
  return typeof response === "object" && !!response && "accessToken" in response && "tokenType" in response && typeof response.accessToken === "string" && typeof response.tokenType === "string";
}
function isValidBuilderInstanceCreditsResponse(response) {
  return typeof response === "object" && !!response && "creditsQuota" in response && "creditsClaimed" in response && typeof response.creditsQuota === "number" && typeof response.creditsClaimed === "number";
}
export {
  APIResponseError,
  AiAssistantClient,
  AuthError
};
