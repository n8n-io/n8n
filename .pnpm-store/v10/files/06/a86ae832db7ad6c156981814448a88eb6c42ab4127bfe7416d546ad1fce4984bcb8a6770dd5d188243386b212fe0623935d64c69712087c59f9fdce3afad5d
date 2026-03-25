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
import { base64FromBytes } from "../utils/base64FromBytes.js";
import { isUrl } from "../lib/isUrl.js";
import { delay } from "../utils/delay.js";
import { omit } from "../utils/omit.js";
import { TaskProviderHelper, } from "./providerHelper.js";
import { HF_HUB_URL } from "../config.js";
import { InferenceClientInputError, InferenceClientProviderApiError, InferenceClientProviderOutputError, } from "../errors.js";
export const FAL_AI_SUPPORTED_BLOB_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"];
class FalAITask extends TaskProviderHelper {
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
function buildLoraPath(modelId, adapterWeightsPath) {
    return `${HF_HUB_URL}/${modelId}/resolve/main/${adapterWeightsPath}`;
}
export class FalAITextToImageTask extends FalAITask {
    preparePayload(params) {
        const payload = {
            ...omit(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            sync_mode: true,
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
    async getResponse(response, outputType) {
        if (typeof response === "object" &&
            "images" in response &&
            Array.isArray(response.images) &&
            response.images.length > 0 &&
            "url" in response.images[0] &&
            typeof response.images[0].url === "string") {
            if (outputType === "url") {
                return response.images[0].url;
            }
            const urlResponse = await fetch(response.images[0].url);
            return await urlResponse.blob();
        }
        throw new InferenceClientProviderOutputError("Received malformed response from Fal.ai text-to-image API");
    }
}
export class FalAITextToVideoTask extends FalAITask {
    constructor() {
        super("https://queue.fal.run");
    }
    makeRoute(params) {
        if (params.authMethod !== "provider-key") {
            return `/${params.model}?_subdomain=queue`;
        }
        return `/${params.model}`;
    }
    preparePayload(params) {
        return {
            ...omit(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            prompt: params.args.inputs,
        };
    }
    async getResponse(response, url, headers) {
        if (!url || !headers) {
            throw new InferenceClientInputError("URL and headers are required for text-to-video task");
        }
        const requestId = response.request_id;
        if (!requestId) {
            throw new InferenceClientProviderOutputError("Received malformed response from Fal.ai text-to-video API: no request ID found in the response");
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
            await delay(500);
            const statusResponse = await fetch(statusUrl, { headers });
            if (!statusResponse.ok) {
                throw new InferenceClientProviderApiError("Failed to fetch response status from fal-ai API", { url: statusUrl, method: "GET" }, {
                    requestId: statusResponse.headers.get("x-request-id") ?? "",
                    status: statusResponse.status,
                    body: await statusResponse.text(),
                });
            }
            try {
                status = (await statusResponse.json()).status;
            }
            catch (error) {
                throw new InferenceClientProviderOutputError("Failed to parse status response from fal-ai API: received malformed response");
            }
        }
        const resultResponse = await fetch(resultUrl, { headers });
        let result;
        try {
            result = await resultResponse.json();
        }
        catch (error) {
            throw new InferenceClientProviderOutputError("Failed to parse result response from fal-ai API: received malformed response");
        }
        if (typeof result === "object" &&
            !!result &&
            "video" in result &&
            typeof result.video === "object" &&
            !!result.video &&
            "url" in result.video &&
            typeof result.video.url === "string" &&
            isUrl(result.video.url)) {
            const urlResponse = await fetch(result.video.url);
            return await urlResponse.blob();
        }
        else {
            throw new InferenceClientProviderOutputError(`Received malformed response from Fal.ai text-to-video API: expected { video: { url: string } } result format, got instead: ${JSON.stringify(result)}`);
        }
    }
}
export class FalAIAutomaticSpeechRecognitionTask extends FalAITask {
    prepareHeaders(params, binary) {
        const headers = super.prepareHeaders(params, binary);
        headers["Content-Type"] = "application/json";
        return headers;
    }
    async getResponse(response) {
        const res = response;
        if (typeof res?.text !== "string") {
            throw new InferenceClientProviderOutputError(`Received malformed response from Fal.ai Automatic Speech Recognition API: expected { text: string } format, got instead: ${JSON.stringify(response)}`);
        }
        return { text: res.text };
    }
    async preparePayloadAsync(args) {
        const blob = "data" in args && args.data instanceof Blob ? args.data : "inputs" in args ? args.inputs : undefined;
        const contentType = blob?.type;
        if (!contentType) {
            throw new InferenceClientInputError(`Unable to determine the input's content-type. Make sure your are passing a Blob when using provider fal-ai.`);
        }
        if (!FAL_AI_SUPPORTED_BLOB_TYPES.includes(contentType)) {
            throw new InferenceClientInputError(`Provider fal-ai does not support blob type ${contentType} - supported content types are: ${FAL_AI_SUPPORTED_BLOB_TYPES.join(", ")}`);
        }
        const base64audio = base64FromBytes(new Uint8Array(await blob.arrayBuffer()));
        return {
            ...("data" in args ? omit(args, "data") : omit(args, "inputs")),
            audio_url: `data:${contentType};base64,${base64audio}`,
        };
    }
}
export class FalAITextToSpeechTask extends FalAITask {
    preparePayload(params) {
        return {
            ...omit(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            text: params.args.inputs,
        };
    }
    async getResponse(response) {
        const res = response;
        if (typeof res?.audio?.url !== "string") {
            throw new InferenceClientProviderOutputError(`Received malformed response from Fal.ai Text-to-Speech API: expected { audio: { url: string } } format, got instead: ${JSON.stringify(response)}`);
        }
        const urlResponse = await fetch(res.audio.url);
        if (!urlResponse.ok) {
            throw new InferenceClientProviderApiError(`Failed to fetch audio from ${res.audio.url}: ${urlResponse.statusText}`, { url: res.audio.url, method: "GET", headers: { "Content-Type": "application/json" } }, {
                requestId: urlResponse.headers.get("x-request-id") ?? "",
                status: urlResponse.status,
                body: await urlResponse.text(),
            });
        }
        try {
            return await urlResponse.blob();
        }
        catch (error) {
            throw new InferenceClientProviderApiError(`Failed to fetch audio from ${res.audio.url}: ${error instanceof Error ? error.message : String(error)}`, { url: res.audio.url, method: "GET", headers: { "Content-Type": "application/json" } }, {
                requestId: urlResponse.headers.get("x-request-id") ?? "",
                status: urlResponse.status,
                body: await urlResponse.text(),
            });
        }
    }
}
