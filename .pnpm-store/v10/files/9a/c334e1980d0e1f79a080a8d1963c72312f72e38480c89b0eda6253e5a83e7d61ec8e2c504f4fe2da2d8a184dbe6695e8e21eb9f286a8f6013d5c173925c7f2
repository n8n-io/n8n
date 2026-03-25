"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textGenerationStream = textGenerationStream;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
/**
 * Use to continue text from a prompt. Same as `textGeneration` but returns generator that can be read one token at a time
 */
async function* textGenerationStream(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "text-generation");
    yield* (0, request_js_1.innerStreamingRequest)(args, providerHelper, {
        ...options,
        task: "text-generation",
    });
}
