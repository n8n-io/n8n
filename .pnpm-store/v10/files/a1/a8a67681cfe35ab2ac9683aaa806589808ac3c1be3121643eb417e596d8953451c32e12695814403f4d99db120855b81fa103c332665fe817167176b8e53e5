"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NscaleTextToImageTask = exports.NscaleConversationalTask = void 0;
const omit_js_1 = require("../utils/omit.js");
const providerHelper_js_1 = require("./providerHelper.js");
const errors_js_1 = require("../errors.js");
const NSCALE_API_BASE_URL = "https://inference.api.nscale.com";
class NscaleConversationalTask extends providerHelper_js_1.BaseConversationalTask {
    constructor() {
        super("nscale", NSCALE_API_BASE_URL);
    }
}
exports.NscaleConversationalTask = NscaleConversationalTask;
class NscaleTextToImageTask extends providerHelper_js_1.TaskProviderHelper {
    constructor() {
        super("nscale", NSCALE_API_BASE_URL);
    }
    preparePayload(params) {
        if (params.outputType === "url") {
            throw new errors_js_1.InferenceClientInputError("nscale provider does not support URL output. Use outputType 'blob', 'dataUrl' or 'json' instead.");
        }
        return {
            ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            response_format: "b64_json",
            prompt: params.args.inputs,
            model: params.model,
        };
    }
    makeRoute() {
        return "v1/images/generations";
    }
    async getResponse(response, url, headers, outputType) {
        if (typeof response === "object" &&
            "data" in response &&
            Array.isArray(response.data) &&
            response.data.length > 0 &&
            "b64_json" in response.data[0] &&
            typeof response.data[0].b64_json === "string") {
            if (outputType === "json") {
                return { ...response };
            }
            const base64Data = response.data[0].b64_json;
            if (outputType === "dataUrl") {
                return `data:image/jpeg;base64,${base64Data}`;
            }
            return fetch(`data:image/jpeg;base64,${base64Data}`).then((res) => res.blob());
        }
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from Nscale text-to-image API");
    }
}
exports.NscaleTextToImageTask = NscaleTextToImageTask;
