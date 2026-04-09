"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WavespeedAIImageTextToVideoTask = exports.WavespeedAIImageTextToImageTask = exports.WavespeedAIImageToVideoTask = exports.WavespeedAIImageToImageTask = exports.WavespeedAITextToVideoTask = exports.WavespeedAITextToImageTask = void 0;
const dataUrlFromBlob_js_1 = require("../utils/dataUrlFromBlob.js");
const delay_js_1 = require("../utils/delay.js");
const omit_js_1 = require("../utils/omit.js");
const base64FromBytes_js_1 = require("../utils/base64FromBytes.js");
const providerHelper_js_1 = require("./providerHelper.js");
const errors_js_1 = require("../errors.js");
const WAVESPEEDAI_API_BASE_URL = "https://api.wavespeed.ai";
async function buildImagesField(inputs, hasImages) {
    const base = (0, base64FromBytes_js_1.base64FromBytes)(new Uint8Array(inputs instanceof ArrayBuffer ? inputs : await inputs.arrayBuffer()));
    const images = Array.isArray(hasImages) && hasImages.every((value) => typeof value === "string")
        ? hasImages
        : [base];
    return { base, images };
}
class WavespeedAITask extends providerHelper_js_1.TaskProviderHelper {
    constructor(url) {
        super("wavespeed", url || WAVESPEEDAI_API_BASE_URL);
    }
    makeRoute(params) {
        return `/api/v3/${params.model}`;
    }
    preparePayload(params) {
        const payload = {
            ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
            ...(params.args.parameters ? (0, omit_js_1.omit)(params.args.parameters, ["images"]) : undefined),
            prompt: params.args.inputs,
        };
        // Add LoRA support if adapter is specified in the mapping
        if (params.mapping?.adapter === "lora") {
            payload.loras = [
                {
                    path: params.mapping.hfModelId,
                    scale: 1, // Default scale value
                },
            ];
        }
        return payload;
    }
    async getResponse(response, url, headers, outputType) {
        if (!url || !headers) {
            throw new errors_js_1.InferenceClientInputError("Headers are required for WaveSpeed AI API calls");
        }
        const parsedUrl = new URL(url);
        const resultPath = new URL(response.data.urls.get).pathname;
        /// override the base url to use the router.huggingface.co if going through huggingface router
        const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.host === "router.huggingface.co" ? "/wavespeed" : ""}`;
        const resultUrl = `${baseUrl}${resultPath}`;
        // Poll for results until completion
        while (true) {
            const resultResponse = await fetch(resultUrl, { headers });
            if (!resultResponse.ok) {
                throw new errors_js_1.InferenceClientProviderApiError("Failed to fetch response status from WaveSpeed AI API", { url: resultUrl, method: "GET" }, {
                    requestId: resultResponse.headers.get("x-request-id") ?? "",
                    status: resultResponse.status,
                    body: await resultResponse.text(),
                });
            }
            const result = await resultResponse.json();
            const taskResult = result.data;
            switch (taskResult.status) {
                case "completed": {
                    // Get the media data from the first output URL
                    if (!taskResult.outputs?.[0]) {
                        throw new errors_js_1.InferenceClientProviderOutputError("Received malformed response from WaveSpeed AI API: No output URL in completed response");
                    }
                    const mediaUrl = taskResult.outputs[0];
                    if (outputType === "url") {
                        return mediaUrl;
                    }
                    if (outputType === "json") {
                        return result;
                    }
                    // Default: fetch and return blob
                    const mediaResponse = await fetch(mediaUrl);
                    if (!mediaResponse.ok) {
                        throw new errors_js_1.InferenceClientProviderApiError("Failed to fetch generation output from WaveSpeed AI API", { url: mediaUrl, method: "GET" }, {
                            requestId: mediaResponse.headers.get("x-request-id") ?? "",
                            status: mediaResponse.status,
                            body: await mediaResponse.text(),
                        });
                    }
                    const blob = await mediaResponse.blob();
                    return outputType === "dataUrl" ? (0, dataUrlFromBlob_js_1.dataUrlFromBlob)(blob) : blob;
                }
                case "failed": {
                    throw new errors_js_1.InferenceClientProviderOutputError(taskResult.error || "Task failed");
                }
                default: {
                    // Wait before polling again
                    await (0, delay_js_1.delay)(500);
                    continue;
                }
            }
        }
    }
}
class WavespeedAITextToImageTask extends WavespeedAITask {
    constructor() {
        super(WAVESPEEDAI_API_BASE_URL);
    }
}
exports.WavespeedAITextToImageTask = WavespeedAITextToImageTask;
class WavespeedAITextToVideoTask extends WavespeedAITask {
    constructor() {
        super(WAVESPEEDAI_API_BASE_URL);
    }
    async getResponse(response, url, headers) {
        return super.getResponse(response, url, headers);
    }
}
exports.WavespeedAITextToVideoTask = WavespeedAITextToVideoTask;
class WavespeedAIImageToImageTask extends WavespeedAITask {
    constructor() {
        super(WAVESPEEDAI_API_BASE_URL);
    }
    async preparePayloadAsync(args) {
        const hasImages = args.images ?? args.parameters?.images;
        const { base, images } = await buildImagesField(args.inputs, hasImages);
        return { ...args, inputs: args.parameters?.prompt, image: base, images };
    }
    async getResponse(response, url, headers) {
        return super.getResponse(response, url, headers);
    }
}
exports.WavespeedAIImageToImageTask = WavespeedAIImageToImageTask;
class WavespeedAIImageToVideoTask extends WavespeedAITask {
    constructor() {
        super(WAVESPEEDAI_API_BASE_URL);
    }
    async preparePayloadAsync(args) {
        const hasImages = args.images ?? args.parameters?.images;
        const { base, images } = await buildImagesField(args.inputs, hasImages);
        return { ...args, inputs: args.parameters?.prompt, image: base, images };
    }
    async getResponse(response, url, headers) {
        return super.getResponse(response, url, headers);
    }
}
exports.WavespeedAIImageToVideoTask = WavespeedAIImageToVideoTask;
// 1x1 fully transparent PNG for use when no input image is provided
const TRANSPARENT_1PX_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
function getTransparentPngBlob() {
    const bytes = Uint8Array.from(Buffer.from(TRANSPARENT_1PX_PNG_BASE64, "base64"));
    return new Blob([bytes], { type: "image/png" });
}
class WavespeedAIImageTextToImageTask extends WavespeedAIImageToImageTask {
    constructor() {
        super();
    }
    async preparePayloadAsync(args) {
        const inputs = args.inputs ?? getTransparentPngBlob();
        return super.preparePayloadAsync({ ...args, inputs });
    }
}
exports.WavespeedAIImageTextToImageTask = WavespeedAIImageTextToImageTask;
class WavespeedAIImageTextToVideoTask extends WavespeedAIImageToVideoTask {
    constructor() {
        super();
    }
    async preparePayloadAsync(args) {
        const inputs = args.inputs ?? getTransparentPngBlob();
        return super.preparePayloadAsync({ ...args, inputs });
    }
}
exports.WavespeedAIImageTextToVideoTask = WavespeedAIImageTextToVideoTask;
