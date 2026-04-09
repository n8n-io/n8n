"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NebiusFeatureExtractionTask = exports.NebiusTextToImageTask = exports.NebiusTextGenerationTask = exports.NebiusConversationalTask = void 0;
const omit_js_1 = require("../utils/omit.js");
const providerHelper_js_1 = require("./providerHelper.js");
const errors_js_1 = require("../errors.js");
const NEBIUS_API_BASE_URL = "https://api.studio.nebius.ai";
class NebiusConversationalTask extends providerHelper_js_1.BaseConversationalTask {
    constructor() {
        super("nebius", NEBIUS_API_BASE_URL);
    }
    preparePayload(params) {
        const payload = super.preparePayload(params);
        const responseFormat = params.args.response_format;
        if (responseFormat?.type === "json_schema" && responseFormat.json_schema?.schema) {
            payload["guided_json"] = responseFormat.json_schema.schema;
        }
        return payload;
    }
}
exports.NebiusConversationalTask = NebiusConversationalTask;
class NebiusTextGenerationTask extends providerHelper_js_1.BaseTextGenerationTask {
    constructor() {
        super("nebius", NEBIUS_API_BASE_URL);
    }
    preparePayload(params) {
        return {
            ...params.args,
            model: params.model,
            prompt: params.args.inputs,
        };
    }
    async getResponse(response) {
        if (typeof response === "object" &&
            "choices" in response &&
            Array.isArray(response?.choices) &&
            response.choices.length > 0 &&
            typeof response.choices[0]?.text === "string") {
            return {
                generated_text: response.choices[0].text,
            };
        }
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from Nebius text generation API");
    }
}
exports.NebiusTextGenerationTask = NebiusTextGenerationTask;
class NebiusTextToImageTask extends providerHelper_js_1.TaskProviderHelper {
    constructor() {
        super("nebius", NEBIUS_API_BASE_URL);
    }
    preparePayload(params) {
        return {
            ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            response_format: params.outputType === "url" ? "url" : "b64_json",
            prompt: params.args.inputs,
            model: params.model,
        };
    }
    makeRoute() {
        return "v1/images/generations";
    }
    async getResponse(response, url, headers, outputType) {
        if (typeof response === "object" &&
            "data" in response &&
            Array.isArray(response.data) &&
            response.data.length > 0) {
            if (outputType === "json") {
                return { ...response };
            }
            if ("url" in response.data[0] && typeof response.data[0].url === "string") {
                return response.data[0].url;
            }
            if ("b64_json" in response.data[0] && typeof response.data[0].b64_json === "string") {
                const base64Data = response.data[0].b64_json;
                if (outputType === "dataUrl") {
                    return `data:image/jpeg;base64,${base64Data}`;
                }
                return fetch(`data:image/jpeg;base64,${base64Data}`).then((res) => res.blob());
            }
        }
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from Nebius text-to-image API");
    }
}
exports.NebiusTextToImageTask = NebiusTextToImageTask;
class NebiusFeatureExtractionTask extends providerHelper_js_1.TaskProviderHelper {
    constructor() {
        super("nebius", NEBIUS_API_BASE_URL);
    }
    preparePayload(params) {
        return {
            input: params.args.inputs,
            model: params.model,
        };
    }
    makeRoute() {
        return "v1/embeddings";
    }
    async getResponse(response) {
        return response.data.map((item) => item.embedding);
    }
}
exports.NebiusFeatureExtractionTask = NebiusFeatureExtractionTask;
