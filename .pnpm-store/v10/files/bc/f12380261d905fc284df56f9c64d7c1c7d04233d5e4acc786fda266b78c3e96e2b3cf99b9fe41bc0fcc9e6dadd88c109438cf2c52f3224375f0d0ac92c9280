"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionAnswering = questionAnswering;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
/**
 * Want to have a nice know-it-all bot that can answer any question?. Recommended model: deepset/roberta-base-squad2
 */
async function questionAnswering(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "question-answering");
    const { data: res } = await (0, request_js_1.innerRequest)(args, providerHelper, {
        ...options,
        task: "question-answering",
    });
    return providerHelper.getResponse(res);
}
