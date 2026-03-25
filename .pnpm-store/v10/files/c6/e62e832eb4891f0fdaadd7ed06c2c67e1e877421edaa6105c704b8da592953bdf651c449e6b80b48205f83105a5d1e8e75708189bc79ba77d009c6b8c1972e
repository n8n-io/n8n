"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automaticSpeechRecognition = automaticSpeechRecognition;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
const errors_js_1 = require("../../errors.js");
/**
 * This task reads some audio input and outputs the said words within the audio files.
 * Recommended model (english language): facebook/wav2vec2-large-960h-lv60-self
 */
async function automaticSpeechRecognition(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "automatic-speech-recognition");
    const payload = await providerHelper.preparePayloadAsync(args);
    const { data: res } = await (0, request_js_1.innerRequest)(payload, providerHelper, {
        ...options,
        task: "automatic-speech-recognition",
    });
    const isValidOutput = typeof res?.text === "string";
    if (!isValidOutput) {
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from automatic-speech-recognition API");
    }
    return providerHelper.getResponse(res);
}
