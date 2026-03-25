"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohereConversationalTask = void 0;
/**
 * See the registered mapping of HF model ID => Cohere model ID here:
 *
 * https://huggingface.co/api/partners/cohere/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Cohere and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Cohere, please open an issue on the present repo
 * and we will tag Cohere team members.
 *
 * Thanks!
 */
const providerHelper_js_1 = require("./providerHelper.js");
class CohereConversationalTask extends providerHelper_js_1.BaseConversationalTask {
    constructor() {
        super("cohere", "https://api.cohere.com");
    }
    makeRoute() {
        return "/compatibility/v1/chat/completions";
    }
}
exports.CohereConversationalTask = CohereConversationalTask;
