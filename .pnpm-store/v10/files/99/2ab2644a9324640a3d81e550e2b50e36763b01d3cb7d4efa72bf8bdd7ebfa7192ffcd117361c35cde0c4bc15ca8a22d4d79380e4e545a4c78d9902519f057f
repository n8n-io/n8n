"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarization = summarization;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
/**
 * This task is well known to summarize longer text into shorter text. Be careful, some models have a maximum length of input. That means that the summary cannot handle full books for instance. Be careful when choosing your model.
 */
async function summarization(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "summarization");
    const { data: res } = await (0, request_js_1.innerRequest)(args, providerHelper, {
        ...options,
        task: "summarization",
    });
    return providerHelper.getResponse(res);
}
