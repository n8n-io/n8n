/**
 * See the registered mapping of HF model ID => OVHcloud model ID here:
 *
 * https://huggingface.co/api/partners/ovhcloud/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at OVHcloud and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to OVHcloud, please open an issue on the present repo
 * and we will tag OVHcloud team members.
 *
 * Thanks!
 */
import { BaseConversationalTask, BaseTextGenerationTask } from "./providerHelper.js";
import { omit } from "../utils/omit.js";
import { InferenceClientProviderOutputError } from "../errors.js";
const OVHCLOUD_API_BASE_URL = "https://oai.endpoints.kepler.ai.cloud.ovh.net";
export class OvhCloudConversationalTask extends BaseConversationalTask {
    constructor() {
        super("ovhcloud", OVHCLOUD_API_BASE_URL);
    }
}
export class OvhCloudTextGenerationTask extends BaseTextGenerationTask {
    constructor() {
        super("ovhcloud", OVHCLOUD_API_BASE_URL);
    }
    preparePayload(params) {
        return {
            model: params.model,
            ...omit(params.args, ["inputs", "parameters"]),
            ...(params.args.parameters
                ? {
                    max_tokens: params.args.parameters.max_new_tokens,
                    ...omit(params.args.parameters, "max_new_tokens"),
                }
                : undefined),
            prompt: params.args.inputs,
        };
    }
    async getResponse(response) {
        if (typeof response === "object" &&
            "choices" in response &&
            Array.isArray(response?.choices) &&
            typeof response?.model === "string") {
            const completion = response.choices[0];
            return {
                generated_text: completion.text,
            };
        }
        throw new InferenceClientProviderOutputError("Received malformed response from OVHcloud text generation API");
    }
}
