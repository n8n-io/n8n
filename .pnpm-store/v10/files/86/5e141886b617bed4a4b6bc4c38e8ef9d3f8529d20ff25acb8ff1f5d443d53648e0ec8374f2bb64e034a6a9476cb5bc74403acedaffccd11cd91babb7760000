"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatCompletion = chatCompletion;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
const providerHelper_js_1 = require("../../providers/providerHelper.js");
/**
 * Use the chat completion endpoint to generate a response to a prompt, using OpenAI message completion API no stream
 */
async function chatCompletion(args, options) {
    let providerHelper;
    if (!args.provider || args.provider === "auto") {
        // Special case: we have a dedicated auto-router for conversational models. No need to fetch provider mapping.
        providerHelper = new providerHelper_js_1.AutoRouterConversationalTask();
    }
    else {
        const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
        providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "conversational");
    }
    const { data: response } = await (0, request_js_1.innerRequest)(args, providerHelper, {
        ...options,
        task: "conversational",
    });
    return providerHelper.getResponse(response);
}
