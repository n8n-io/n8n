"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZaiTextToImageTask = exports.ZaiConversationalTask = void 0;
/**
 * See the registered mapping of HF model ID => ZAI model ID here:
 *
 * https://huggingface.co/api/partners/zai-org/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at zai and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to zai, please open an issue on the present repo
 * and we will tag zai team members.
 *
 * Thanks!
 */
const errors_js_1 = require("../errors.js");
const isUrl_js_1 = require("../lib/isUrl.js");
const dataUrlFromBlob_js_1 = require("../utils/dataUrlFromBlob.js");
const delay_js_1 = require("../utils/delay.js");
const omit_js_1 = require("../utils/omit.js");
const providerHelper_js_1 = require("./providerHelper.js");
const ZAI_API_BASE_URL = "https://api.z.ai";
class ZaiConversationalTask extends providerHelper_js_1.BaseConversationalTask {
    constructor() {
        super("zai-org", ZAI_API_BASE_URL);
    }
    prepareHeaders(params, binary) {
        const headers = super.prepareHeaders(params, binary);
        headers["x-source-channel"] = "hugging_face";
        headers["accept-language"] = "en-US,en";
        return headers;
    }
    makeRoute() {
        return "/api/paas/v4/chat/completions";
    }
}
exports.ZaiConversationalTask = ZaiConversationalTask;
const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 5000;
class ZaiTextToImageTask extends providerHelper_js_1.TaskProviderHelper {
    constructor() {
        super("zai-org", ZAI_API_BASE_URL);
    }
    prepareHeaders(params, binary) {
        const headers = {
            Authorization: `Bearer ${params.accessToken}`,
            "x-source-channel": "hugging_face",
            "accept-language": "en-US,en",
        };
        if (!binary) {
            headers["Content-Type"] = "application/json";
        }
        return headers;
    }
    makeRoute() {
        return "/api/paas/v4/async/images/generations";
    }
    preparePayload(params) {
        return {
            ...(0, omit_js_1.omit)(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            model: params.model,
            prompt: params.args.inputs,
        };
    }
    async getResponse(response, url, headers, outputType) {
        if (!url || !headers) {
            throw new errors_js_1.InferenceClientInputError(`URL and headers are required for 'text-to-image' task`);
        }
        if (typeof response !== "object" ||
            !response ||
            !("task_status" in response) ||
            !("id" in response) ||
            typeof response.id !== "string") {
            throw new errors_js_1.InferenceClientProviderOutputError(`Received malformed response from ZAI text-to-image API: expected { id: string, task_status: string }, got: ${JSON.stringify(response)}`);
        }
        if (response.task_status === "FAIL") {
            throw new errors_js_1.InferenceClientProviderOutputError("ZAI API returned task status: FAIL");
        }
        const taskId = response.id;
        const parsedUrl = new URL(url);
        const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.host === "router.huggingface.co" ? "/zai-org" : ""}`;
        const pollUrl = `${baseUrl}/api/paas/v4/async-result/${taskId}`;
        const pollHeaders = {
            ...headers,
            "x-source-channel": "hugging_face",
            "accept-language": "en-US,en",
        };
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
            await (0, delay_js_1.delay)(POLL_INTERVAL_MS);
            const resp = await fetch(pollUrl, {
                method: "GET",
                headers: pollHeaders,
            });
            if (!resp.ok) {
                throw new errors_js_1.InferenceClientProviderApiError(`Failed to fetch result from ZAI text-to-image API: ${resp.status}`, { url: pollUrl, method: "GET" }, { requestId: resp.headers.get("x-request-id") ?? "", status: resp.status, body: await resp.text() });
            }
            const result = await resp.json();
            if (result.task_status === "FAIL") {
                throw new errors_js_1.InferenceClientProviderOutputError("ZAI text-to-image API task failed");
            }
            if (result.task_status === "SUCCESS") {
                if (!result.image_result ||
                    !Array.isArray(result.image_result) ||
                    result.image_result.length === 0 ||
                    typeof result.image_result[0]?.url !== "string" ||
                    !(0, isUrl_js_1.isUrl)(result.image_result[0].url)) {
                    throw new errors_js_1.InferenceClientProviderOutputError(`Received malformed response from ZAI text-to-image API: expected { image_result: Array<{ url: string }> }, got: ${JSON.stringify(result)}`);
                }
                const imageUrl = result.image_result[0].url;
                if (outputType === "json") {
                    return { ...result };
                }
                if (outputType === "url") {
                    return imageUrl;
                }
                const imageResponse = await fetch(imageUrl);
                const blob = await imageResponse.blob();
                return outputType === "dataUrl" ? (0, dataUrlFromBlob_js_1.dataUrlFromBlob)(blob) : blob;
            }
        }
        throw new errors_js_1.InferenceClientProviderOutputError(`Timed out while waiting for the result from ZAI API - aborting after ${MAX_POLL_ATTEMPTS} attempts`);
    }
}
exports.ZaiTextToImageTask = ZaiTextToImageTask;
