"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicateImageToImageTask = exports.ReplicateAutomaticSpeechRecognitionTask = exports.ReplicateTextToVideoTask = exports.ReplicateTextToSpeechTask = exports.ReplicateTextToImageTask = void 0;
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
const dataUrlFromBlob_js_1 = require("../utils/dataUrlFromBlob.js");
const omit_js_1 = require("../utils/omit.js");
const providerHelper_js_1 = require("./providerHelper.js");
const base64FromBytes_js_1 = require("../utils/base64FromBytes.js");
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
        // Handle string output
        if (typeof res === "object" && "output" in res && typeof res.output === "string" && (0, isUrl_js_1.isUrl)(res.output)) {
            if (outputType === "json") {
                return { ...res };
            }
            if (outputType === "url") {
                return res.output;
            }
            const urlResponse = await fetch(res.output);
            const blob = await urlResponse.blob();
            return outputType === "dataUrl" ? (0, dataUrlFromBlob_js_1.dataUrlFromBlob)(blob) : blob;
        }
        // Handle array output
        if (typeof res === "object" &&
            "output" in res &&
            Array.isArray(res.output) &&
            res.output.length > 0 &&
            typeof res.output[0] === "string") {
            if (outputType === "json") {
                return { ...res };
            }
            if (outputType === "url") {
                return res.output[0];
            }
            const urlResponse = await fetch(res.output[0]);
            const blob = await urlResponse.blob();
            return outputType === "dataUrl" ? (0, dataUrlFromBlob_js_1.dataUrlFromBlob)(blob) : blob;
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
class ReplicateAutomaticSpeechRecognitionTask extends ReplicateTask {
    preparePayload(params) {
        return {
            input: {
                ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
                ...params.args.parameters,
                audio: params.args.inputs, // This will be processed in preparePayloadAsync
            },
            version: params.model.includes(":") ? params.model.split(":")[1] : undefined,
        };
    }
    async preparePayloadAsync(args) {
        const blob = "data" in args && args.data instanceof Blob ? args.data : "inputs" in args ? args.inputs : undefined;
        if (!blob || !(blob instanceof Blob)) {
            throw new Error("Audio input must be a Blob");
        }
        // Convert Blob to base64 data URL
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const base64 = (0, base64FromBytes_js_1.base64FromBytes)(bytes);
        const audioInput = `data:${blob.type || "audio/wav"};base64,${base64}`;
        return {
            ...("data" in args ? (0, omit_js_1.omit)(args, "data") : (0, omit_js_1.omit)(args, "inputs")),
            inputs: audioInput,
        };
    }
    async getResponse(response) {
        if (typeof response?.output === "string")
            return { text: response.output };
        if (Array.isArray(response?.output) && typeof response.output[0] === "string")
            return { text: response.output[0] };
        const out = response?.output;
        if (out && typeof out === "object") {
            if (typeof out.transcription === "string")
                return { text: out.transcription };
            if (typeof out.translation === "string")
                return { text: out.translation };
            if (typeof out.txt_file === "string") {
                const r = await fetch(out.txt_file);
                return { text: await r.text() };
            }
        }
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from Replicate automatic-speech-recognition API");
    }
}
exports.ReplicateAutomaticSpeechRecognitionTask = ReplicateAutomaticSpeechRecognitionTask;
class ReplicateImageToImageTask extends ReplicateTask {
    preparePayload(params) {
        const imageInput = params.args.inputs; // This will be processed in preparePayloadAsync
        return {
            input: {
                ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
                ...params.args.parameters,
                // Different Replicate models expect the image in different keys
                image: imageInput,
                images: [imageInput],
                input_image: imageInput,
                input_images: [imageInput],
                lora_weights: params.mapping?.adapter === "lora" && params.mapping.adapterWeightsPath
                    ? `https://huggingface.co/${params.mapping.hfModelId}`
                    : undefined,
            },
            version: params.model.includes(":") ? params.model.split(":")[1] : undefined,
        };
    }
    async preparePayloadAsync(args) {
        const { inputs, ...restArgs } = args;
        // Convert Blob to base64 data URL
        const bytes = new Uint8Array(await inputs.arrayBuffer());
        const base64 = (0, base64FromBytes_js_1.base64FromBytes)(bytes);
        const imageInput = `data:${inputs.type || "image/jpeg"};base64,${base64}`;
        return {
            ...restArgs,
            inputs: imageInput,
        };
    }
    async getResponse(response) {
        if (typeof response === "object" &&
            !!response &&
            "output" in response &&
            Array.isArray(response.output) &&
            response.output.length > 0 &&
            typeof response.output[0] === "string") {
            const urlResponse = await fetch(response.output[0]);
            return await urlResponse.blob();
        }
        if (typeof response === "object" &&
            !!response &&
            "output" in response &&
            typeof response.output === "string" &&
            (0, isUrl_js_1.isUrl)(response.output)) {
            const urlResponse = await fetch(response.output);
            return await urlResponse.blob();
        }
        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from Replicate image-to-image API");
    }
}
exports.ReplicateImageToImageTask = ReplicateImageToImageTask;
