"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScalewayFeatureExtractionTask = exports.ScalewayTextGenerationTask = exports.ScalewayConversationalTask = void 0;
const errors_js_1 = require("../errors.js");
const providerHelper_js_1 = require("./providerHelper.js");
const SCALEWAY_API_BASE_URL = "https://api.scaleway.ai";
class ScalewayConversationalTask extends providerHelper_js_1.BaseConversationalTask {
    constructor() {
        super("scaleway", SCALEWAY_API_BASE_URL);
    }
}
exports.ScalewayConversationalTask = ScalewayConversationalTask;
class ScalewayTextGenerationTask extends providerHelper_js_1.BaseTextGenerationTask {
    constructor() {
        super("scaleway", SCALEWAY_API_BASE_URL);
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
            response !== null &&
            "choices" in response &&
            Array.isArray(response.choices) &&
            response.choices.length > 0) {
            const completion = response.choices[0];
            if (typeof completion === "object" &&
                !!completion &&
                "text" in completion &&
                completion.text &&
                typeof completion.text === "string") {
                return {
                    generated_text: completion.text,
                };
            }
        }
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from Scaleway text generation API");
    }
}
exports.ScalewayTextGenerationTask = ScalewayTextGenerationTask;
class ScalewayFeatureExtractionTask extends providerHelper_js_1.TaskProviderHelper {
    constructor() {
        super("scaleway", SCALEWAY_API_BASE_URL);
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
exports.ScalewayFeatureExtractionTask = ScalewayFeatureExtractionTask;
