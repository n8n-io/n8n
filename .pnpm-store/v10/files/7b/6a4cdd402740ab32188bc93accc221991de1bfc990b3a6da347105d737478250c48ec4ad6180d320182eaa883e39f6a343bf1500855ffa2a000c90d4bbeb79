"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoRouterConversationalTask = exports.BaseTextGenerationTask = exports.BaseConversationalTask = exports.TaskProviderHelper = void 0;
const config_js_1 = require("../config.js");
const errors_js_1 = require("../errors.js");
const toArray_js_1 = require("../utils/toArray.js");
/**
 * Base class for task-specific provider helpers
 */
class TaskProviderHelper {
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
        return params.authMethod !== "provider-key" ? `${config_js_1.HF_ROUTER_URL}/${this.provider}` : this.baseUrl;
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
        if (params.urlTransform) {
            return params.urlTransform(`${baseUrl}/${route}`);
        }
        return `${baseUrl}/${route}`;
    }
    /**
     * Prepare the headers for the request
     */
    prepareHeaders(params, isBinary) {
        const headers = {};
        if (params.authMethod !== "none") {
            headers["Authorization"] = `Bearer ${params.accessToken}`;
        }
        if (!isBinary) {
            headers["Content-Type"] = "application/json";
        }
        return headers;
    }
}
exports.TaskProviderHelper = TaskProviderHelper;
// BASE IMPLEMENTATIONS FOR COMMON PATTERNS
class BaseConversationalTask extends TaskProviderHelper {
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
        throw new errors_js_1.InferenceClientProviderOutputError("Expected ChatCompletionOutput");
    }
}
exports.BaseConversationalTask = BaseConversationalTask;
class BaseTextGenerationTask extends TaskProviderHelper {
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
        const res = (0, toArray_js_1.toArray)(response);
        if (Array.isArray(res) &&
            res.length > 0 &&
            res.every((x) => typeof x === "object" && !!x && "generated_text" in x && typeof x.generated_text === "string")) {
            return res[0];
        }
        throw new errors_js_1.InferenceClientProviderOutputError("Expected Array<{generated_text: string}>");
    }
}
exports.BaseTextGenerationTask = BaseTextGenerationTask;
class AutoRouterConversationalTask extends BaseConversationalTask {
    constructor() {
        super("auto", "https://router.huggingface.co");
    }
    makeBaseUrl(params) {
        if (params.authMethod !== "hf-token") {
            throw new errors_js_1.InferenceClientRoutingError("Cannot select auto-router when using non-Hugging Face API key.");
        }
        return this.baseUrl;
    }
}
exports.AutoRouterConversationalTask = AutoRouterConversationalTask;
