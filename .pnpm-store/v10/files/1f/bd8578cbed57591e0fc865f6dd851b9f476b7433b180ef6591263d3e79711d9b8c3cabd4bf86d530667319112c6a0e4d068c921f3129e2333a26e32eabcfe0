"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textToImage = textToImage;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const makeRequestOptions_js_1 = require("../../lib/makeRequestOptions.js");
const request_js_1 = require("../../utils/request.js");
async function textToImage(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "text-to-image");
    const { data: res } = await (0, request_js_1.innerRequest)(args, providerHelper, {
        ...options,
        task: "text-to-image",
    });
    const { url, info } = await (0, makeRequestOptions_js_1.makeRequestOptions)(args, providerHelper, { ...options, task: "text-to-image" });
    return providerHelper.getResponse(res, url, info.headers, options?.outputType);
}
