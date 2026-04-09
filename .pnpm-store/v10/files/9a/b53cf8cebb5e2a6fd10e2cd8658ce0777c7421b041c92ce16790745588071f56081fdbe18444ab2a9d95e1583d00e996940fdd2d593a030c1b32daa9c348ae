"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = request;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
const logger_js_1 = require("../../lib/logger.js");
/**
 * Primitive to make custom calls to the inference provider
 * @deprecated Use specific task functions instead. This function will be removed in a future version.
 */
async function request(args, options) {
    const logger = (0, logger_js_1.getLogger)();
    logger.warn("The request method is deprecated and will be removed in a future version of huggingface.js. Use specific task functions instead.");
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, options?.task);
    const result = await (0, request_js_1.innerRequest)(args, providerHelper, options);
    return result.data;
}
