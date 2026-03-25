"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillMask = fillMask;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
/**
 * Tries to fill in a hole with a missing word (token to be precise). That’s the base task for BERT models.
 */
async function fillMask(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "fill-mask");
    const { data: res } = await (0, request_js_1.innerRequest)(args, providerHelper, {
        ...options,
        task: "fill-mask",
    });
    return providerHelper.getResponse(res);
}
