/**
 * See the registered mapping of HF model ID => Black Forest Labs model ID here:
 *
 * https://huggingface.co/api/partners/blackforestlabs/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Black Forest Labs and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Black Forest Labs, please open an issue on the present repo
 * and we will tag Black Forest Labs team members.
 *
 * Thanks!
 */
import { InferenceClientInputError, InferenceClientProviderApiError, InferenceClientProviderOutputError, } from "../errors.js";
import { getLogger } from "../lib/logger.js";
import { delay } from "../utils/delay.js";
import { omit } from "../utils/omit.js";
import { TaskProviderHelper } from "./providerHelper.js";
const BLACK_FOREST_LABS_AI_API_BASE_URL = "https://api.us1.bfl.ai";
export class BlackForestLabsTextToImageTask extends TaskProviderHelper {
    constructor() {
        super("black-forest-labs", BLACK_FOREST_LABS_AI_API_BASE_URL);
    }
    preparePayload(params) {
        return {
            ...omit(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            prompt: params.args.inputs,
        };
    }
    prepareHeaders(params, binary) {
        const headers = {
            Authorization: params.authMethod !== "provider-key" ? `Bearer ${params.accessToken}` : `X-Key ${params.accessToken}`,
        };
        if (!binary) {
            headers["Content-Type"] = "application/json";
        }
        return headers;
    }
    makeRoute(params) {
        if (!params) {
            throw new InferenceClientInputError("Params are required");
        }
        return `/v1/${params.model}`;
    }
    async getResponse(response, url, headers, outputType) {
        const logger = getLogger();
        const urlObj = new URL(response.polling_url);
        for (let step = 0; step < 5; step++) {
            await delay(1000);
            logger.debug(`Polling Black Forest Labs API for the result... ${step + 1}/5`);
            urlObj.searchParams.set("attempt", step.toString(10));
            const resp = await fetch(urlObj, { headers: { "Content-Type": "application/json" } });
            if (!resp.ok) {
                throw new InferenceClientProviderApiError("Failed to fetch result from black forest labs API", { url: urlObj.toString(), method: "GET", headers: { "Content-Type": "application/json" } }, { requestId: resp.headers.get("x-request-id") ?? "", status: resp.status, body: await resp.text() });
            }
            const payload = await resp.json();
            if (typeof payload === "object" &&
                payload &&
                "status" in payload &&
                typeof payload.status === "string" &&
                payload.status === "Ready" &&
                "result" in payload &&
                typeof payload.result === "object" &&
                payload.result &&
                "sample" in payload.result &&
                typeof payload.result.sample === "string") {
                if (outputType === "json") {
                    return payload.result;
                }
                if (outputType === "url") {
                    return payload.result.sample;
                }
                const image = await fetch(payload.result.sample);
                return await image.blob();
            }
        }
        throw new InferenceClientProviderOutputError(`Timed out while waiting for the result from black forest labs API - aborting after 5 attempts`);
    }
}
