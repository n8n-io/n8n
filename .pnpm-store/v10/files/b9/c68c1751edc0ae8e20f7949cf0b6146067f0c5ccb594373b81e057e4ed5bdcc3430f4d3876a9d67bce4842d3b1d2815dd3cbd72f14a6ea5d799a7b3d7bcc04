import { BaseConversationalTask, TaskProviderHelper } from "./providerHelper.js";
import { InferenceClientProviderOutputError } from "../errors.js";
export class SambanovaConversationalTask extends BaseConversationalTask {
    constructor() {
        super("sambanova", "https://api.sambanova.ai");
    }
}
export class SambanovaFeatureExtractionTask extends TaskProviderHelper {
    constructor() {
        super("sambanova", "https://api.sambanova.ai");
    }
    makeRoute() {
        return `/v1/embeddings`;
    }
    async getResponse(response) {
        if (typeof response === "object" && "data" in response && Array.isArray(response.data)) {
            return response.data.map((item) => item.embedding);
        }
        throw new InferenceClientProviderOutputError("Received malformed response from Sambanova feature-extraction (embeddings) API");
    }
    preparePayload(params) {
        return {
            model: params.model,
            input: params.args.inputs,
            ...params.args,
        };
    }
}
