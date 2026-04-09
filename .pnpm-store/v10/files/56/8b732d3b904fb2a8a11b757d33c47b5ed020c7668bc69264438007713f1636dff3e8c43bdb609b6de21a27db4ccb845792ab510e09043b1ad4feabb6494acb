"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageToVideo = imageToVideo;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
const makeRequestOptions_js_1 = require("../../lib/makeRequestOptions.js");
/**
 * This task reads some text input and outputs an image.
 * Recommended model: Wan-AI/Wan2.1-I2V-14B-720P
 */
async function imageToVideo(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "image-to-video");
    const payload = await providerHelper.preparePayloadAsync(args);
    const { data: res } = await (0, request_js_1.innerRequest)(payload, providerHelper, {
        ...options,
        task: "image-to-video",
    });
    const { url, info } = await (0, makeRequestOptions_js_1.makeRequestOptions)(args, providerHelper, { ...options, task: "image-to-video" });
    return providerHelper.getResponse(res, url, info.headers);
}
