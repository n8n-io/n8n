"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tableQuestionAnswering = tableQuestionAnswering;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
/**
 * Don’t know SQL? Don’t want to dive into a large spreadsheet? Ask questions in plain english! Recommended model: google/tapas-base-finetuned-wtq.
 */
async function tableQuestionAnswering(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "table-question-answering");
    const { data: res } = await (0, request_js_1.innerRequest)(args, providerHelper, {
        ...options,
        task: "table-question-answering",
    });
    return providerHelper.getResponse(res);
}
