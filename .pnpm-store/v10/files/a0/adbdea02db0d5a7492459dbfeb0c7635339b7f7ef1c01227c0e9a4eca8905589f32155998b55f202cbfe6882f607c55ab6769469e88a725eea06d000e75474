"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sentenceSimilarity = sentenceSimilarity;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
/**
 * Calculate the semantic similarity between one text and a list of other sentences by comparing their embeddings.
 */
async function sentenceSimilarity(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "sentence-similarity");
    const { data: res } = await (0, request_js_1.innerRequest)(args, providerHelper, {
        ...options,
        task: "sentence-similarity",
    });
    return providerHelper.getResponse(res);
}
