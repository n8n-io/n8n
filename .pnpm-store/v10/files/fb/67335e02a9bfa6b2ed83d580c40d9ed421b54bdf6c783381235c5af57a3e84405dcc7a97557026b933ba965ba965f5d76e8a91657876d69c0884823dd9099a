"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TogetherTextToImageTask = exports.TogetherTextGenerationTask = exports.TogetherConversationalTask = void 0;
const omit_js_1 = require("../utils/omit.js");
const providerHelper_js_1 = require("./providerHelper.js");
const errors_js_1 = require("../errors.js");
const TOGETHER_API_BASE_URL = "https://api.together.xyz";
class TogetherConversationalTask extends providerHelper_js_1.BaseConversationalTask {
    constructor() {
        super("together", TOGETHER_API_BASE_URL);
    }
    preparePayload(params) {
        const payload = super.preparePayload(params);
        const response_format = payload.response_format;
        if (response_format?.type === "json_schema" && response_format?.json_schema?.schema) {
            payload.response_format = {
                type: "json_schema",
                schema: response_format.json_schema.schema,
            };
        }
        return payload;
    }
}
exports.TogetherConversationalTask = TogetherConversationalTask;
class TogetherTextGenerationTask extends providerHelper_js_1.BaseTextGenerationTask {
    constructor() {
        super("together", TOGETHER_API_BASE_URL);
    }
    preparePayload(params) {
        return {
            model: params.model,
            ...params.args,
            prompt: params.args.inputs,
        };
    }
    async getResponse(response) {
        if (typeof response === "object" &&
            "choices" in response &&
            Array.isArray(response?.choices) &&
            typeof response?.model === "string") {
            const completion = response.choices[0];
            return {
                generated_text: completion.text,
            };
        }
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from Together text generation API");
    }
}
exports.TogetherTextGenerationTask = TogetherTextGenerationTask;
class TogetherTextToImageTask extends providerHelper_js_1.TaskProviderHelper {
    constructor() {
        super("together", TOGETHER_API_BASE_URL);
    }
    makeRoute() {
        return "v1/images/generations";
    }
    preparePayload(params) {
        return {
            ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            prompt: params.args.inputs,
            response_format: params.outputType === "url" ? "url" : "base64",
            model: params.model,
        };
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
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from Together text-to-image API");
    }
}
exports.TogetherTextToImageTask = TogetherTextToImageTask;
