"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visualQuestionAnswering = visualQuestionAnswering;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const base64FromBytes_js_1 = require("../../utils/base64FromBytes.js");
const request_js_1 = require("../../utils/request.js");
/**
 * Answers a question on an image. Recommended model: dandelin/vilt-b32-finetuned-vqa.
 */
async function visualQuestionAnswering(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "visual-question-answering");
    const reqArgs = {
        ...args,
        inputs: {
            question: args.inputs.question,
            // convert Blob or ArrayBuffer to base64
            image: (0, base64FromBytes_js_1.base64FromBytes)(new Uint8Array(await args.inputs.image.arrayBuffer())),
        },
    };
    const { data: res } = await (0, request_js_1.innerRequest)(reqArgs, providerHelper, {
        ...options,
        task: "visual-question-answering",
    });
    return providerHelper.getResponse(res);
}
