import { InferenceClientProviderOutputError } from "../errors.js";
import { BaseConversationalTask, TaskProviderHelper, BaseTextGenerationTask } from "./providerHelper.js";
const SCALEWAY_API_BASE_URL = "https://api.scaleway.ai";
export class ScalewayConversationalTask extends BaseConversationalTask {
    constructor() {
        super("scaleway", SCALEWAY_API_BASE_URL);
    }
}
export class ScalewayTextGenerationTask extends BaseTextGenerationTask {
    constructor() {
        super("scaleway", SCALEWAY_API_BASE_URL);
    }
    preparePayload(params) {
        return {
            model: params.model,
            ...params.args,
            prompt: params.args.inputs,
        };
    }
    async getResponse(response) {
        if (typeof response === "object" &&
            response !== null &&
            "choices" in response &&
            Array.isArray(response.choices) &&
            response.choices.length > 0) {
            const completion = response.choices[0];
            if (typeof completion === "object" &&
                !!completion &&
                "text" in completion &&
                completion.text &&
                typeof completion.text === "string") {
                return {
                    generated_text: completion.text,
                };
            }
        }
        throw new InferenceClientProviderOutputError("Received malformed response from Scaleway text generation API");
    }
}
export class ScalewayFeatureExtractionTask extends TaskProviderHelper {
    constructor() {
        super("scaleway", SCALEWAY_API_BASE_URL);
    }
    preparePayload(params) {
        return {
            input: params.args.inputs,
            model: params.model,
        };
    }
    makeRoute() {
        return "v1/embeddings";
    }
    async getResponse(response) {
        return response.data.map((item) => item.embedding);
    }
}
