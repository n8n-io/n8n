"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicateTextToVideoTask = exports.ReplicateTextToSpeechTask = exports.ReplicateTextToImageTask = void 0;
/**
 * See the registered mapping of HF model ID => Replicate model ID here:
 *
 * https://huggingface.co/api/partners/replicate/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Replicate and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Replicate, please open an issue on the present repo
 * and we will tag Replicate team members.
 *
 * Thanks!
 */
const errors_js_1 = require("../errors.js");
const isUrl_js_1 = require("../lib/isUrl.js");
const omit_js_1 = require("../utils/omit.js");
const providerHelper_js_1 = require("./providerHelper.js");
class ReplicateTask extends providerHelper_js_1.TaskProviderHelper {
    constructor(url) {
        super("replicate", url || "https://api.replicate.com");
    }
    makeRoute(params) {
        if (params.model.includes(":")) {
            return "v1/predictions";
        }
        return `v1/models/${params.model}/predictions`;
    }
    preparePayload(params) {
        return {
            input: {
                ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
                ...params.args.parameters,
                prompt: params.args.inputs,
            },
            version: params.model.includes(":") ? params.model.split(":")[1] : undefined,
        };
    }
    prepareHeaders(params, binary) {
        const headers = { Authorization: `Bearer ${params.accessToken}`, Prefer: "wait" };
        if (!binary) {
            headers["Content-Type"] = "application/json";
        }
        return headers;
    }
    makeUrl(params) {
        const baseUrl = this.makeBaseUrl(params);
        if (params.model.includes(":")) {
            return `${baseUrl}/v1/predictions`;
        }
        return `${baseUrl}/v1/models/${params.model}/predictions`;
    }
}
class ReplicateTextToImageTask extends ReplicateTask {
    preparePayload(params) {
        return {
            input: {
                ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
                ...params.args.parameters,
                prompt: params.args.inputs,
                lora_weights: params.mapping?.adapter === "lora" && params.mapping.adapterWeightsPath
                    ? `https://huggingface.co/${params.mapping.hfModelId}`
                    : undefined,
            },
            version: params.model.includes(":") ? params.model.split(":")[1] : undefined,
        };
    }
    async getResponse(res, url, headers, outputType) {
        void url;
        void headers;
        if (typeof res === "object" &&
            "output" in res &&
            Array.isArray(res.output) &&
            res.output.length > 0 &&
            typeof res.output[0] === "string") {
            if (outputType === "url") {
                return res.output[0];
            }
            const urlResponse = await fetch(res.output[0]);
            return await urlResponse.blob();
        }
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from Replicate text-to-image API");
    }
}
exports.ReplicateTextToImageTask = ReplicateTextToImageTask;
class ReplicateTextToSpeechTask extends ReplicateTask {
    preparePayload(params) {
        const payload = super.preparePayload(params);
        const input = payload["input"];
        if (typeof input === "object" && input !== null && "prompt" in input) {
            const inputObj = input;
            inputObj["text"] = inputObj["prompt"];
            delete inputObj["prompt"];
        }
        return payload;
    }
    async getResponse(response) {
        if (response instanceof Blob) {
            return response;
        }
        if (response && typeof response === "object") {
            if ("output" in response) {
                if (typeof response.output === "string") {
                    const urlResponse = await fetch(response.output);
                    return await urlResponse.blob();
                }
                else if (Array.isArray(response.output)) {
                    const urlResponse = await fetch(response.output[0]);
                    return await urlResponse.blob();
                }
            }
        }
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from Replicate text-to-speech API");
    }
}
exports.ReplicateTextToSpeechTask = ReplicateTextToSpeechTask;
class ReplicateTextToVideoTask extends ReplicateTask {
    async getResponse(response) {
        if (typeof response === "object" &&
            !!response &&
            "output" in response &&
            typeof response.output === "string" &&
            (0, isUrl_js_1.isUrl)(response.output)) {
            const urlResponse = await fetch(response.output);
            return await urlResponse.blob();
        }
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from Replicate text-to-video API");
    }
}
exports.ReplicateTextToVideoTask = ReplicateTextToVideoTask;
