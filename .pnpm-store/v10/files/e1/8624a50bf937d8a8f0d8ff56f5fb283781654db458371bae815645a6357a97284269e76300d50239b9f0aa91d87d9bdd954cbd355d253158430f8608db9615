"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageTextToVideo = imageTextToVideo;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
/**
 * This task takes an image and text input and outputs a generated video.
 * Recommended model: Lightricks/LTX-Video
 */
async function imageTextToVideo(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "image-text-to-video");
    const payload = await providerHelper.preparePayloadAsync(args);
    const { data: res, requestContext } = await (0, request_js_1.innerRequest)(payload, providerHelper, {
        ...options,
        task: "image-text-to-video",
    });
    return providerHelper.getResponse(res, requestContext.url, requestContext.info.headers);
}
