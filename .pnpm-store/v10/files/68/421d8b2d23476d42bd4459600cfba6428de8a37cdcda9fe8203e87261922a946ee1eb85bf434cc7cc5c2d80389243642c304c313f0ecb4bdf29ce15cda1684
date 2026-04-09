"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FalAIImageSegmentationTask = exports.FalAITextToSpeechTask = exports.FalAIAutomaticSpeechRecognitionTask = exports.FalAIImageTextToVideoTask = exports.FalAIImageToVideoTask = exports.FalAITextToVideoTask = exports.FalAIImageTextToImageTask = exports.FalAIImageToImageTask = exports.FalAITextToImageTask = exports.FAL_AI_SUPPORTED_BLOB_TYPES = void 0;
/**
 * See the registered mapping of HF model ID => Fal model ID here:
 *
 * https://huggingface.co/api/partners/fal-ai/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Fal and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Fal, please open an issue on the present repo
 * and we will tag Fal team members.
 *
 * Thanks!
 */
const base64FromBytes_js_1 = require("../utils/base64FromBytes.js");
const dataUrlFromBlob_js_1 = require("../utils/dataUrlFromBlob.js");
const isUrl_js_1 = require("../lib/isUrl.js");
const delay_js_1 = require("../utils/delay.js");
const omit_js_1 = require("../utils/omit.js");
const providerHelper_js_1 = require("./providerHelper.js");
const config_js_1 = require("../config.js");
const errors_js_1 = require("../errors.js");
exports.FAL_AI_SUPPORTED_BLOB_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"];
class FalAITask extends providerHelper_js_1.TaskProviderHelper {
    constructor(url) {
        super("fal-ai", url || "https://fal.run");
    }
    preparePayload(params) {
        return params.args;
    }
    makeRoute(params) {
        return `/${params.model}`;
    }
    prepareHeaders(params, binary) {
        const headers = {
            Authorization: params.authMethod !== "provider-key" ? `Bearer ${params.accessToken}` : `Key ${params.accessToken}`,
        };
        if (!binary) {
            headers["Content-Type"] = "application/json";
        }
        return headers;
    }
}
class FalAiQueueTask extends FalAITask {
    makeRoute(params) {
        if (params.authMethod !== "provider-key") {
            return `/${params.model}?_subdomain=queue`;
        }
        return `/${params.model}`;
    }
    async getResponseFromQueueApi(response, url, headers) {
        if (!url || !headers) {
            throw new errors_js_1.InferenceClientInputError(`URL and headers are required for ${this.task} task`);
        }
        const requestId = response.request_id;
        if (!requestId) {
            throw new errors_js_1.InferenceClientProviderOutputError(`Received malformed response from Fal.ai ${this.task} API: no request ID found in the response`);
        }
        let status = response.status;
        const parsedUrl = new URL(url);
        const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.host === "router.huggingface.co" ? "/fal-ai" : ""}`;
        // extracting the provider model id for status and result urls
        // from the response as it might be different from the mapped model in `url`
        const modelId = new URL(response.response_url).pathname;
        const queryParams = parsedUrl.search;
        const statusUrl = `${baseUrl}${modelId}/status${queryParams}`;
        const resultUrl = `${baseUrl}${modelId}${queryParams}`;
        while (status !== "COMPLETED") {
            await (0, delay_js_1.delay)(500);
            const statusResponse = await fetch(statusUrl, { headers });
            if (!statusResponse.ok) {
                throw new errors_js_1.InferenceClientProviderApiError("Failed to fetch response status from fal-ai API", { url: statusUrl, method: "GET" }, {
                    requestId: statusResponse.headers.get("x-request-id") ?? "",
                    status: statusResponse.status,
                    body: await statusResponse.text(),
                });
            }
            try {
                status = (await statusResponse.json()).status;
            }
            catch (error) {
                throw new errors_js_1.InferenceClientProviderOutputError("Failed to parse status response from fal-ai API: received malformed response");
            }
        }
        const resultResponse = await fetch(resultUrl, { headers });
        let result;
        try {
            result = await resultResponse.json();
        }
        catch (error) {
            throw new errors_js_1.InferenceClientProviderOutputError("Failed to parse result response from fal-ai API: received malformed response");
        }
        return result;
    }
}
function buildLoraPath(modelId, adapterWeightsPath) {
    return `${config_js_1.HF_HUB_URL}/${modelId}/resolve/main/${adapterWeightsPath}`;
}
class FalAITextToImageTask extends FalAiQueueTask {
    task;
    constructor() {
        super("https://queue.fal.run");
        this.task = "text-to-image";
    }
    preparePayload(params) {
        const payload = {
            ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            prompt: params.args.inputs,
        };
        if (params.mapping?.adapter === "lora" && params.mapping.adapterWeightsPath) {
            payload.loras = [
                {
                    path: buildLoraPath(params.mapping.hfModelId, params.mapping.adapterWeightsPath),
                    scale: 1,
                },
            ];
            if (params.mapping.providerId === "fal-ai/lora") {
                payload.model_name = "stabilityai/stable-diffusion-xl-base-1.0";
            }
        }
        return payload;
    }
    async getResponse(response, url, headers, outputType) {
        const result = (await this.getResponseFromQueueApi(response, url, headers));
        if (typeof result === "object" &&
            "images" in result &&
            Array.isArray(result.images) &&
            result.images.length > 0 &&
            "url" in result.images[0] &&
            typeof result.images[0].url === "string" &&
            (0, isUrl_js_1.isUrl)(result.images[0].url)) {
            if (outputType === "json") {
                return { ...result };
            }
            if (outputType === "url") {
                return result.images[0].url;
            }
            const urlResponse = await fetch(result.images[0].url);
            const blob = await urlResponse.blob();
            return outputType === "dataUrl" ? (0, dataUrlFromBlob_js_1.dataUrlFromBlob)(blob) : blob;
        }
        throw new errors_js_1.InferenceClientProviderOutputError(`Received malformed response from Fal.ai text-to-image API: expected { images: Array<{ url: string }> } result format, got instead: ${JSON.stringify(result)}`);
    }
}
exports.FalAITextToImageTask = FalAITextToImageTask;
class FalAIImageToImageTask extends FalAiQueueTask {
    task;
    constructor() {
        super("https://queue.fal.run");
        this.task = "image-to-image";
    }
    preparePayload(params) {
        const payload = params.args;
        if (params.mapping?.adapter === "lora" && params.mapping.adapterWeightsPath) {
            payload.loras = [
                {
                    path: buildLoraPath(params.mapping.hfModelId, params.mapping.adapterWeightsPath),
                    scale: 1,
                },
            ];
        }
        return payload;
    }
    async preparePayloadAsync(args) {
        const mimeType = args.inputs instanceof Blob ? args.inputs.type : "image/png";
        const imageDataUrl = `data:${mimeType};base64,${(0, base64FromBytes_js_1.base64FromBytes)(new Uint8Array(args.inputs instanceof ArrayBuffer ? args.inputs : await args.inputs.arrayBuffer()))}`;
        return {
            ...(0, omit_js_1.omit)(args, ["inputs", "parameters"]),
            image_url: imageDataUrl,
            ...args.parameters,
            ...args,
            // Some fal endpoints (e.g. FLUX.2-dev) expect `image_urls` (array) instead of `image_url`
            image_urls: [imageDataUrl],
        };
    }
    async getResponse(response, url, headers) {
        const result = await this.getResponseFromQueueApi(response, url, headers);
        if (typeof result === "object" &&
            !!result &&
            "images" in result &&
            Array.isArray(result.images) &&
            result.images.length > 0 &&
            typeof result.images[0] === "object" &&
            !!result.images[0] &&
            "url" in result.images[0] &&
            typeof result.images[0].url === "string" &&
            (0, isUrl_js_1.isUrl)(result.images[0].url)) {
            const urlResponse = await fetch(result.images[0].url);
            return await urlResponse.blob();
        }
        else {
            throw new errors_js_1.InferenceClientProviderOutputError(`Received malformed response from Fal.ai image-to-image API: expected { images: Array<{ url: string }> } result format, got instead: ${JSON.stringify(result)}`);
        }
    }
}
exports.FalAIImageToImageTask = FalAIImageToImageTask;
class FalAIImageTextToImageTask extends FalAIImageToImageTask {
    constructor() {
        super();
        this.task = "image-text-to-image";
    }
    async preparePayloadAsync(args) {
        if (args.inputs) {
            return super.preparePayloadAsync(args);
        }
        return {
            ...(0, omit_js_1.omit)(args, ["inputs", "parameters"]),
            ...args.parameters,
            prompt: args.parameters?.prompt,
            urlTransform: (url) => {
                const urlObj = new URL(url);
                // Strip last path segment: fal-ai/flux-2/edit => fal-ai/flux-2
                urlObj.pathname = urlObj.pathname.split("/").slice(0, -1).join("/");
                return urlObj.toString();
            },
        };
    }
}
exports.FalAIImageTextToImageTask = FalAIImageTextToImageTask;
class FalAITextToVideoTask extends FalAiQueueTask {
    task;
    constructor() {
        super("https://queue.fal.run");
        this.task = "text-to-video";
    }
    preparePayload(params) {
        return {
            ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            prompt: params.args.inputs,
        };
    }
    async getResponse(response, url, headers) {
        const result = await this.getResponseFromQueueApi(response, url, headers);
        if (typeof result === "object" &&
            !!result &&
            "video" in result &&
            typeof result.video === "object" &&
            !!result.video &&
            "url" in result.video &&
            typeof result.video.url === "string" &&
            (0, isUrl_js_1.isUrl)(result.video.url)) {
            const urlResponse = await fetch(result.video.url);
            return await urlResponse.blob();
        }
        else {
            throw new errors_js_1.InferenceClientProviderOutputError(`Received malformed response from Fal.ai text-to-video API: expected { video: { url: string } } result format, got instead: ${JSON.stringify(result)}`);
        }
    }
}
exports.FalAITextToVideoTask = FalAITextToVideoTask;
class FalAIImageToVideoTask extends FalAiQueueTask {
    task;
    constructor() {
        super("https://queue.fal.run");
        this.task = "image-to-video";
    }
    /** Synchronous case – caller already gave us base64 or a URL */
    preparePayload(params) {
        return {
            ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            // args.inputs is expected to be a base64 data URI or an URL
            image_url: params.args.image_url,
        };
    }
    /** Asynchronous helper – caller gave us a Blob */
    async preparePayloadAsync(args) {
        const mimeType = args.inputs instanceof Blob ? args.inputs.type : "image/png";
        return {
            ...(0, omit_js_1.omit)(args, ["inputs", "parameters"]),
            image_url: `data:${mimeType};base64,${(0, base64FromBytes_js_1.base64FromBytes)(new Uint8Array(args.inputs instanceof ArrayBuffer ? args.inputs : await args.inputs.arrayBuffer()))}`,
            ...args.parameters,
            ...args,
        };
    }
    /** Queue polling + final download – mirrors Text‑to‑Video */
    async getResponse(response, url, headers) {
        const result = await this.getResponseFromQueueApi(response, url, headers);
        if (typeof result === "object" &&
            result !== null &&
            "video" in result &&
            typeof result.video === "object" &&
            result.video !== null &&
            "url" in result.video &&
            typeof result.video.url === "string" &&
            "url" in result.video &&
            (0, isUrl_js_1.isUrl)(result.video.url)) {
            const urlResponse = await fetch(result.video.url);
            return await urlResponse.blob();
        }
        throw new errors_js_1.InferenceClientProviderOutputError(`Received malformed response from Fal.ai image‑to‑video API: expected { video: { url: string } }, got: ${JSON.stringify(result)}`);
    }
}
exports.FalAIImageToVideoTask = FalAIImageToVideoTask;
class FalAIImageTextToVideoTask extends FalAIImageToVideoTask {
    constructor() {
        super();
        this.task = "image-text-to-video";
    }
    async preparePayloadAsync(args) {
        if (args.inputs) {
            return super.preparePayloadAsync(args);
        }
        return {
            ...(0, omit_js_1.omit)(args, ["inputs", "parameters"]),
            ...args.parameters,
            prompt: args.parameters?.prompt,
            urlTransform: (url) => {
                const urlObj = new URL(url);
                urlObj.pathname = urlObj.pathname.split("/").slice(0, -1).join("/");
                return urlObj.toString();
            },
        };
    }
}
exports.FalAIImageTextToVideoTask = FalAIImageTextToVideoTask;
class FalAIAutomaticSpeechRecognitionTask extends FalAITask {
    prepareHeaders(params, binary) {
        const headers = super.prepareHeaders(params, binary);
        headers["Content-Type"] = "application/json";
        return headers;
    }
    async getResponse(response) {
        const res = response;
        if (typeof res?.text !== "string") {
            throw new errors_js_1.InferenceClientProviderOutputError(`Received malformed response from Fal.ai Automatic Speech Recognition API: expected { text: string } format, got instead: ${JSON.stringify(response)}`);
        }
        return { text: res.text };
    }
    async preparePayloadAsync(args) {
        const blob = "data" in args && args.data instanceof Blob ? args.data : "inputs" in args ? args.inputs : undefined;
        const contentType = blob?.type;
        if (!contentType) {
            throw new errors_js_1.InferenceClientInputError(`Unable to determine the input's content-type. Make sure your are passing a Blob when using provider fal-ai.`);
        }
        if (!exports.FAL_AI_SUPPORTED_BLOB_TYPES.includes(contentType)) {
            throw new errors_js_1.InferenceClientInputError(`Provider fal-ai does not support blob type ${contentType} - supported content types are: ${exports.FAL_AI_SUPPORTED_BLOB_TYPES.join(", ")}`);
        }
        const base64audio = (0, base64FromBytes_js_1.base64FromBytes)(new Uint8Array(await blob.arrayBuffer()));
        return {
            ...("data" in args ? (0, omit_js_1.omit)(args, "data") : (0, omit_js_1.omit)(args, "inputs")),
            audio_url: `data:${contentType};base64,${base64audio}`,
        };
    }
}
exports.FalAIAutomaticSpeechRecognitionTask = FalAIAutomaticSpeechRecognitionTask;
class FalAITextToSpeechTask extends FalAITask {
    preparePayload(params) {
        return {
            ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            text: params.args.inputs,
        };
    }
    async getResponse(response) {
        const res = response;
        if (typeof res?.audio?.url !== "string") {
            throw new errors_js_1.InferenceClientProviderOutputError(`Received malformed response from Fal.ai Text-to-Speech API: expected { audio: { url: string } } format, got instead: ${JSON.stringify(response)}`);
        }
        const urlResponse = await fetch(res.audio.url);
        if (!urlResponse.ok) {
            throw new errors_js_1.InferenceClientProviderApiError(`Failed to fetch audio from ${res.audio.url}: ${urlResponse.statusText}`, { url: res.audio.url, method: "GET", headers: { "Content-Type": "application/json" } }, {
                requestId: urlResponse.headers.get("x-request-id") ?? "",
                status: urlResponse.status,
                body: await urlResponse.text(),
            });
        }
        try {
            return await urlResponse.blob();
        }
        catch (error) {
            throw new errors_js_1.InferenceClientProviderApiError(`Failed to fetch audio from ${res.audio.url}: ${error instanceof Error ? error.message : String(error)}`, { url: res.audio.url, method: "GET", headers: { "Content-Type": "application/json" } }, {
                requestId: urlResponse.headers.get("x-request-id") ?? "",
                status: urlResponse.status,
                body: await urlResponse.text(),
            });
        }
    }
}
exports.FalAITextToSpeechTask = FalAITextToSpeechTask;
class FalAIImageSegmentationTask extends FalAiQueueTask {
    task;
    constructor() {
        super("https://queue.fal.run");
        this.task = "image-segmentation";
    }
    preparePayload(params) {
        return {
            ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            sync_mode: true,
        };
    }
    async preparePayloadAsync(args) {
        const blob = "data" in args && args.data instanceof Blob ? args.data : "inputs" in args ? args.inputs : undefined;
        const mimeType = blob instanceof Blob ? blob.type : "image/png";
        const base64Image = (0, base64FromBytes_js_1.base64FromBytes)(new Uint8Array(blob instanceof ArrayBuffer ? blob : await blob.arrayBuffer()));
        return {
            ...(0, omit_js_1.omit)(args, ["inputs", "parameters", "data"]),
            ...args.parameters,
            ...args,
            image_url: `data:${mimeType};base64,${base64Image}`,
            sync_mode: true,
        };
    }
    async getResponse(response, url, headers) {
        const result = await this.getResponseFromQueueApi(response, url, headers);
        if (typeof result === "object" &&
            result !== null &&
            "image" in result &&
            typeof result.image === "object" &&
            result.image !== null &&
            "url" in result.image &&
            typeof result.image.url === "string") {
            const maskResponse = await fetch(result.image.url);
            if (!maskResponse.ok) {
                throw new errors_js_1.InferenceClientProviderApiError(`Failed to fetch segmentation mask from ${result.image.url}`, { url: result.image.url, method: "GET" }, {
                    requestId: maskResponse.headers.get("x-request-id") ?? "",
                    status: maskResponse.status,
                    body: await maskResponse.text(),
                });
            }
            const maskBlob = await maskResponse.blob();
            const maskArrayBuffer = await maskBlob.arrayBuffer();
            const maskBase64 = (0, base64FromBytes_js_1.base64FromBytes)(new Uint8Array(maskArrayBuffer));
            return [
                {
                    label: "mask", // placeholder label, as Fal does not provide labels in the response(?)
                    score: 1.0, // placeholder score, as Fal does not provide scores in the response(?)
                    mask: maskBase64,
                },
            ];
        }
        throw new errors_js_1.InferenceClientProviderOutputError(`Received malformed response from Fal.ai image-segmentation API: expected { image: { url: string } } format, got instead: ${JSON.stringify(response)}`);
    }
}
exports.FalAIImageSegmentationTask = FalAIImageSegmentationTask;
