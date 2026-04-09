"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageTextToImage = imageTextToImage;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
/**
 * This task takes an image and text input and outputs a new generated image.
 * Recommended model: black-forest-labs/FLUX.2-dev
 */
async function imageTextToImage(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "image-text-to-image");
    const payload = await providerHelper.preparePayloadAsync(args);
    const { data: res, requestContext } = await (0, request_js_1.innerRequest)(payload, providerHelper, {
        ...options,
        task: "image-text-to-image",
    });
    return providerHelper.getResponse(res, requestContext.url, requestContext.info.headers);
}
