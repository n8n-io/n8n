"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textGeneration = textGeneration;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
/**
 * Use to continue text from a prompt. This is a very generic task. Recommended model: gpt2 (it’s a simple model, but fun to play with).
 */
async function textGeneration(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "text-generation");
    const { data: response } = await (0, request_js_1.innerRequest)(args, providerHelper, {
        ...options,
        task: "text-generation",
    });
    return providerHelper.getResponse(response);
}
