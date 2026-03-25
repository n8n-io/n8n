"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageClassification = imageClassification;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
const utils_js_1 = require("./utils.js");
/**
 * This task reads some image input and outputs the likelihood of classes.
 * Recommended model: google/vit-base-patch16-224
 */
async function imageClassification(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "image-classification");
    const payload = (0, utils_js_1.preparePayload)(args);
    const { data: res } = await (0, request_js_1.innerRequest)(payload, providerHelper, {
        ...options,
        task: "image-classification",
    });
    return providerHelper.getResponse(res);
}
