"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SambanovaFeatureExtractionTask = exports.SambanovaConversationalTask = void 0;
const providerHelper_js_1 = require("./providerHelper.js");
const errors_js_1 = require("../errors.js");
class SambanovaConversationalTask extends providerHelper_js_1.BaseConversationalTask {
    constructor() {
        super("sambanova", "https://api.sambanova.ai");
    }
    preparePayload(params) {
        const responseFormat = params.args.response_format;
        if (responseFormat?.type === "json_schema" && responseFormat.json_schema) {
            if (responseFormat.json_schema.strict ?? true) {
                responseFormat.json_schema.strict = false;
            }
        }
        const payload = super.preparePayload(params);
        return payload;
    }
}
exports.SambanovaConversationalTask = SambanovaConversationalTask;
class SambanovaFeatureExtractionTask extends providerHelper_js_1.TaskProviderHelper {
    constructor() {
        super("sambanova", "https://api.sambanova.ai");
    }
    makeRoute() {
        return `/v1/embeddings`;
    }
    async getResponse(response) {
        if (typeof response === "object" && "data" in response && Array.isArray(response.data)) {
            return response.data.map((item) => item.embedding);
        }
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from Sambanova feature-extraction (embeddings) API");
    }
    preparePayload(params) {
        return {
            model: params.model,
            input: params.args.inputs,
            ...params.args,
        };
    }
}
exports.SambanovaFeatureExtractionTask = SambanovaFeatureExtractionTask;
