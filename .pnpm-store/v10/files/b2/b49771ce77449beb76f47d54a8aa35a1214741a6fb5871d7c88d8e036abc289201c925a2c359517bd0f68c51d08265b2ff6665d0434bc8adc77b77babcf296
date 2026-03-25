"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zeroShotImageClassification = zeroShotImageClassification;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const base64FromBytes_js_1 = require("../../utils/base64FromBytes.js");
const request_js_1 = require("../../utils/request.js");
async function preparePayload(args) {
    if (args.inputs instanceof Blob) {
        return {
            ...args,
            inputs: {
                image: (0, base64FromBytes_js_1.base64FromBytes)(new Uint8Array(await args.inputs.arrayBuffer())),
            },
        };
    }
    else {
        return {
            ...args,
            inputs: {
                image: (0, base64FromBytes_js_1.base64FromBytes)(new Uint8Array(args.inputs.image instanceof ArrayBuffer ? args.inputs.image : await args.inputs.image.arrayBuffer())),
            },
        };
    }
}
/**
 * Classify an image to specified classes.
 * Recommended model: openai/clip-vit-large-patch14-336
 */
async function zeroShotImageClassification(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "zero-shot-image-classification");
    const payload = await preparePayload(args);
    const { data: res } = await (0, request_js_1.innerRequest)(payload, providerHelper, {
        ...options,
        task: "zero-shot-image-classification",
    });
    return providerHelper.getResponse(res);
}
