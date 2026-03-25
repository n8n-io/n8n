import { omit } from "../utils/omit.js";
import { BaseConversationalTask, BaseTextGenerationTask, TaskProviderHelper, } from "./providerHelper.js";
import { InferenceClientProviderOutputError } from "../errors.js";
const NEBIUS_API_BASE_URL = "https://api.studio.nebius.ai";
export class NebiusConversationalTask extends BaseConversationalTask {
    constructor() {
        super("nebius", NEBIUS_API_BASE_URL);
    }
}
export class NebiusTextGenerationTask extends BaseTextGenerationTask {
    constructor() {
        super("nebius", NEBIUS_API_BASE_URL);
    }
}
export class NebiusTextToImageTask extends TaskProviderHelper {
    constructor() {
        super("nebius", NEBIUS_API_BASE_URL);
    }
    preparePayload(params) {
        return {
            ...omit(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            response_format: "b64_json",
            prompt: params.args.inputs,
            model: params.model,
        };
    }
    makeRoute() {
        return "v1/images/generations";
    }
    async getResponse(response, url, headers, outputType) {
        if (typeof response === "object" &&
            "data" in response &&
            Array.isArray(response.data) &&
            response.data.length > 0 &&
            "b64_json" in response.data[0] &&
            typeof response.data[0].b64_json === "string") {
            const base64Data = response.data[0].b64_json;
            if (outputType === "url") {
                return `data:image/jpeg;base64,${base64Data}`;
            }
            return fetch(`data:image/jpeg;base64,${base64Data}`).then((res) => res.blob());
        }
        throw new InferenceClientProviderOutputError("Received malformed response from Nebius text-to-image API");
    }
}
export class NebiusFeatureExtractionTask extends TaskProviderHelper {
    constructor() {
        super("nebius", NEBIUS_API_BASE_URL);
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
