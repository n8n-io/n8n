"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageSegmentation = imageSegmentation;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
const makeRequestOptions_js_1 = require("../../lib/makeRequestOptions.js");
/**
 * This task reads some image input and outputs the likelihood of classes & bounding boxes of detected objects.
 * Recommended model: facebook/detr-resnet-50-panoptic
 */
async function imageSegmentation(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "image-segmentation");
    const payload = await providerHelper.preparePayloadAsync(args);
    const { data: res } = await (0, request_js_1.innerRequest)(payload, providerHelper, {
        ...options,
        task: "image-segmentation",
    });
    const { url, info } = await (0, makeRequestOptions_js_1.makeRequestOptions)(args, providerHelper, { ...options, task: "image-segmentation" });
    return providerHelper.getResponse(res, url, info.headers);
}
