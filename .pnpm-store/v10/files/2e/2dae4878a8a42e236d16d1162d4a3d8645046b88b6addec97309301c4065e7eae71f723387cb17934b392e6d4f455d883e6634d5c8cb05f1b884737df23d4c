import { HF_ROUTER_URL } from "../config.js";
import { InferenceClientProviderOutputError } from "../errors.js";
import { toArray } from "../utils/toArray.js";
/**
 * Base class for task-specific provider helpers
 */
export class TaskProviderHelper {
    provider;
    baseUrl;
    clientSideRoutingOnly;
    constructor(provider, baseUrl, clientSideRoutingOnly = false) {
        this.provider = provider;
        this.baseUrl = baseUrl;
        this.clientSideRoutingOnly = clientSideRoutingOnly;
    }
    /**
     * Prepare the base URL for the request
     */
    makeBaseUrl(params) {
        return params.authMethod !== "provider-key" ? `${HF_ROUTER_URL}/${this.provider}` : this.baseUrl;
    }
    /**
     * Prepare the body for the request
     */
    makeBody(params) {
        if ("data" in params.args && !!params.args.data) {
            return params.args.data;
        }
        return JSON.stringify(this.preparePayload(params));
    }
    /**
     * Prepare the URL for the request
     */
    makeUrl(params) {
        const baseUrl = this.makeBaseUrl(params);
        const route = this.makeRoute(params).replace(/^\/+/, "");
        return `${baseUrl}/${route}`;
    }
    /**
     * Prepare the headers for the request
     */
    prepareHeaders(params, isBinary) {
        const headers = { Authorization: `Bearer ${params.accessToken}` };
        if (!isBinary) {
            headers["Content-Type"] = "application/json";
        }
        return headers;
    }
}
// BASE IMPLEMENTATIONS FOR COMMON PATTERNS
export class BaseConversationalTask extends TaskProviderHelper {
    constructor(provider, baseUrl, clientSideRoutingOnly = false) {
        super(provider, baseUrl, clientSideRoutingOnly);
    }
    makeRoute() {
        return "v1/chat/completions";
    }
    preparePayload(params) {
        return {
            ...params.args,
            model: params.model,
        };
    }
    async getResponse(response) {
        if (typeof response === "object" &&
            Array.isArray(response?.choices) &&
            typeof response?.created === "number" &&
            typeof response?.id === "string" &&
            typeof response?.model === "string" &&
            /// Together.ai and Nebius do not output a system_fingerprint
            (response.system_fingerprint === undefined ||
                response.system_fingerprint === null ||
                typeof response.system_fingerprint === "string") &&
            typeof response?.usage === "object") {
            return response;
        }
        throw new InferenceClientProviderOutputError("Expected ChatCompletionOutput");
    }
}
export class BaseTextGenerationTask extends TaskProviderHelper {
    constructor(provider, baseUrl, clientSideRoutingOnly = false) {
        super(provider, baseUrl, clientSideRoutingOnly);
    }
    preparePayload(params) {
        return {
            ...params.args,
            model: params.model,
        };
    }
    makeRoute() {
        return "v1/completions";
    }
    async getResponse(response) {
        const res = toArray(response);
        if (Array.isArray(res) &&
            res.length > 0 &&
            res.every((x) => typeof x === "object" && !!x && "generated_text" in x && typeof x.generated_text === "string")) {
            return res[0];
        }
        throw new InferenceClientProviderOutputError("Expected Array<{generated_text: string}>");
    }
}
