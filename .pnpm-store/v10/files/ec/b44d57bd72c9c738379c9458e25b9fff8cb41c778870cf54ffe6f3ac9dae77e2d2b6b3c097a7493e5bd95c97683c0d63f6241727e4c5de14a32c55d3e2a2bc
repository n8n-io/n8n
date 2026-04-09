import { omit } from "../utils/omit.js";
import { BaseConversationalTask, BaseTextGenerationTask, TaskProviderHelper, } from "./providerHelper.js";
import { InferenceClientInputError, InferenceClientProviderOutputError } from "../errors.js";
const HYPERBOLIC_API_BASE_URL = "https://api.hyperbolic.xyz";
export class HyperbolicConversationalTask extends BaseConversationalTask {
    constructor() {
        super("hyperbolic", HYPERBOLIC_API_BASE_URL);
    }
}
export class HyperbolicTextGenerationTask extends BaseTextGenerationTask {
    constructor() {
        super("hyperbolic", HYPERBOLIC_API_BASE_URL);
    }
    makeRoute() {
        return "v1/chat/completions";
    }
    preparePayload(params) {
        return {
            messages: [{ content: params.args.inputs, role: "user" }],
            ...(params.args.parameters
                ? {
                    max_tokens: params.args.parameters.max_new_tokens,
                    ...omit(params.args.parameters, "max_new_tokens"),
                }
                : undefined),
            ...omit(params.args, ["inputs", "parameters"]),
            model: params.model,
        };
    }
    async getResponse(response) {
        if (typeof response === "object" &&
            "choices" in response &&
            Array.isArray(response?.choices) &&
            typeof response?.model === "string") {
            const completion = response.choices[0];
            return {
                generated_text: completion.message.content,
            };
        }
        throw new InferenceClientProviderOutputError("Received malformed response from Hyperbolic text generation API");
    }
}
export class HyperbolicTextToImageTask extends TaskProviderHelper {
    constructor() {
        super("hyperbolic", HYPERBOLIC_API_BASE_URL);
    }
    makeRoute(params) {
        void params;
        return `/v1/images/generations`;
    }
    preparePayload(params) {
        if (params.outputType === "url") {
            throw new InferenceClientInputError("hyperbolic provider does not support URL output. Use outputType 'blob', 'dataUrl' or 'json' instead.");
        }
        return {
            ...omit(params.args, ["inputs", "parameters"]),
            ...params.args.parameters,
            prompt: params.args.inputs,
            model_name: params.model,
        };
    }
    async getResponse(response, url, headers, outputType) {
        if (typeof response === "object" &&
            "images" in response &&
            Array.isArray(response.images) &&
            response.images[0] &&
            typeof response.images[0].image === "string") {
            if (outputType === "json") {
                return { ...response };
            }
            if (outputType === "dataUrl") {
                return `data:image/jpeg;base64,${response.images[0].image}`;
            }
            return fetch(`data:image/jpeg;base64,${response.images[0].image}`).then((res) => res.blob());
        }
        throw new InferenceClientProviderOutputError("Received malformed response from Hyperbolic text-to-image API");
    }
}
