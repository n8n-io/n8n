"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioToAudio = audioToAudio;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
const utils_js_1 = require("./utils.js");
/**
 * This task reads some audio input and outputs one or multiple audio files.
 * Example model: speechbrain/sepformer-wham does audio source separation.
 */
async function audioToAudio(args, options) {
    const model = "inputs" in args ? args.model : undefined;
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, model);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "audio-to-audio");
    const payload = (0, utils_js_1.preparePayload)(args);
    const { data: res } = await (0, request_js_1.innerRequest)(payload, providerHelper, {
        ...options,
        task: "audio-to-audio",
    });
    return providerHelper.getResponse(res);
}
