"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textToSpeech = textToSpeech;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
/**
 * This task synthesize an audio of a voice pronouncing a given text.
 * Recommended model: espnet/kan-bayashi_ljspeech_vits
 */
async function textToSpeech(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "text-to-speech");
    const { data: res } = await (0, request_js_1.innerRequest)(args, providerHelper, {
        ...options,
        task: "text-to-speech",
    });
    return providerHelper.getResponse(res);
}
