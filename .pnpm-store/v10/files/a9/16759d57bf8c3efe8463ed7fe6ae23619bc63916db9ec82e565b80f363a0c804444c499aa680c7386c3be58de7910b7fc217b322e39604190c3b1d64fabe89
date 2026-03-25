import { omit } from "../utils/omit.js";
import { BaseConversationalTask, BaseTextGenerationTask, TaskProviderHelper, } from "./providerHelper.js";
import { InferenceClientProviderOutputError } from "../errors.js";
const TOGETHER_API_BASE_URL = "https://api.together.xyz";
export class TogetherConversationalTask extends BaseConversationalTask {
    constructor() {
        super("together", TOGETHER_API_BASE_URL);
    }
}
export class TogetherTextGenerationTask extends BaseTextGenerationTask {
    constructor() {
        super("together", TOGETHER_API_BASE_URL);
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
            "choices" in response &&
            Array.isArray(response?.choices) &&
            typeof response?.model === "string") {
            const completion = response.choices[0];
            return {
                generated_text: completion.text,
            };
        }
        throw new InferenceClientProviderOutputError("Received malformed response from Together text generation API");
    }
}
export class TogetherTextToImageTask extends TaskProviderHelper {
    constructor() {
        super("together", TOGETHER_API_BASE_URL);
    }
    makeRoute() {
        return "v1/images/generations";
    }
    preparePayload(params) {
        return {
            ...omit(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            prompt: params.args.inputs,
            response_format: "base64",
            model: params.model,
        };
    }
    async getResponse(response, outputType) {
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
        throw new InferenceClientProviderOutputError("Received malformed response from Together text-to-image API");
    }
}
