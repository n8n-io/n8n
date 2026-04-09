import { dataUrlFromBlob } from "../utils/dataUrlFromBlob.js";
import { delay } from "../utils/delay.js";
import { omit } from "../utils/omit.js";
import { base64FromBytes } from "../utils/base64FromBytes.js";
import { TaskProviderHelper } from "./providerHelper.js";
import { InferenceClientInputError, InferenceClientProviderApiError, InferenceClientProviderOutputError, } from "../errors.js";
const WAVESPEEDAI_API_BASE_URL = "https://api.wavespeed.ai";
async function buildImagesField(inputs, hasImages) {
    const base = base64FromBytes(new Uint8Array(inputs instanceof ArrayBuffer ? inputs : await inputs.arrayBuffer()));
    const images = Array.isArray(hasImages) && hasImages.every((value) => typeof value === "string")
        ? hasImages
        : [base];
    return { base, images };
}
class WavespeedAITask extends TaskProviderHelper {
    constructor(url) {
        super("wavespeed", url || WAVESPEEDAI_API_BASE_URL);
    }
    makeRoute(params) {
        return `/api/v3/${params.model}`;
    }
    preparePayload(params) {
        const payload = {
            ...omit(params.args, ["inputs", "parameters"]),
            ...(params.args.parameters ? omit(params.args.parameters, ["images"]) : undefined),
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
            throw new InferenceClientInputError("Headers are required for WaveSpeed AI API calls");
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
                throw new InferenceClientProviderApiError("Failed to fetch response status from WaveSpeed AI API", { url: resultUrl, method: "GET" }, {
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
                        throw new InferenceClientProviderOutputError("Received malformed response from WaveSpeed AI API: No output URL in completed response");
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
                        throw new InferenceClientProviderApiError("Failed to fetch generation output from WaveSpeed AI API", { url: mediaUrl, method: "GET" }, {
                            requestId: mediaResponse.headers.get("x-request-id") ?? "",
                            status: mediaResponse.status,
                            body: await mediaResponse.text(),
                        });
                    }
                    const blob = await mediaResponse.blob();
                    return outputType === "dataUrl" ? dataUrlFromBlob(blob) : blob;
                }
                case "failed": {
                    throw new InferenceClientProviderOutputError(taskResult.error || "Task failed");
                }
                default: {
                    // Wait before polling again
                    await delay(500);
                    continue;
                }
            }
        }
    }
}
export class WavespeedAITextToImageTask extends WavespeedAITask {
    constructor() {
        super(WAVESPEEDAI_API_BASE_URL);
    }
}
export class WavespeedAITextToVideoTask extends WavespeedAITask {
    constructor() {
        super(WAVESPEEDAI_API_BASE_URL);
    }
    async getResponse(response, url, headers) {
        return super.getResponse(response, url, headers);
    }
}
export class WavespeedAIImageToImageTask extends WavespeedAITask {
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
export class WavespeedAIImageToVideoTask extends WavespeedAITask {
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
// 1x1 fully transparent PNG for use when no input image is provided
const TRANSPARENT_1PX_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
function getTransparentPngBlob() {
    const bytes = Uint8Array.from(Buffer.from(TRANSPARENT_1PX_PNG_BASE64, "base64"));
    return new Blob([bytes], { type: "image/png" });
}
export class WavespeedAIImageTextToImageTask extends WavespeedAIImageToImageTask {
    constructor() {
        super();
    }
    async preparePayloadAsync(args) {
        const inputs = args.inputs ?? getTransparentPngBlob();
        return super.preparePayloadAsync({ ...args, inputs });
    }
}
export class WavespeedAIImageTextToVideoTask extends WavespeedAIImageToVideoTask {
    constructor() {
        super();
    }
    async preparePayloadAsync(args) {
        const inputs = args.inputs ?? getTransparentPngBlob();
        return super.preparePayloadAsync({ ...args, inputs });
    }
}
