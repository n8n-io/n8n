"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatherlessAITextGenerationTask = exports.FeatherlessAIConversationalTask = void 0;
const providerHelper_js_1 = require("./providerHelper.js");
const omit_js_1 = require("../utils/omit.js");
const errors_js_1 = require("../errors.js");
const FEATHERLESS_API_BASE_URL = "https://api.featherless.ai";
class FeatherlessAIConversationalTask extends providerHelper_js_1.BaseConversationalTask {
    constructor() {
        super("featherless-ai", FEATHERLESS_API_BASE_URL);
    }
}
exports.FeatherlessAIConversationalTask = FeatherlessAIConversationalTask;
class FeatherlessAITextGenerationTask extends providerHelper_js_1.BaseTextGenerationTask {
    constructor() {
        super("featherless-ai", FEATHERLESS_API_BASE_URL);
    }
    preparePayload(params) {
        return {
            model: params.model,
            ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
            ...(params.args.parameters
                ? {
                    max_tokens: params.args.parameters.max_new_tokens,
                    ...(0, omit_js_1.omit)(params.args.parameters, "max_new_tokens"),
                }
                : undefined),
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
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from Featherless AI text generation API");
    }
}
exports.FeatherlessAITextGenerationTask = FeatherlessAITextGenerationTask;
