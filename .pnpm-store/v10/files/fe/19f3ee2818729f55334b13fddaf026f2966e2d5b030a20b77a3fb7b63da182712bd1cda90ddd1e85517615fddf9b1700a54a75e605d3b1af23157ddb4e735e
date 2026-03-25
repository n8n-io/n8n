"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioClassification = audioClassification;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
const utils_js_1 = require("./utils.js");
/**
 * This task reads some audio input and outputs the likelihood of classes.
 * Recommended model:  superb/hubert-large-superb-er
 */
async function audioClassification(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "audio-classification");
    const payload = (0, utils_js_1.preparePayload)(args);
    const { data: res } = await (0, request_js_1.innerRequest)(payload, providerHelper, {
        ...options,
        task: "audio-classification",
    });
    return providerHelper.getResponse(res);
}
