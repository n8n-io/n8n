import { omit } from "../utils/omit.js";
import { BaseConversationalTask, TaskProviderHelper } from "./providerHelper.js";
import { InferenceClientInputError, InferenceClientProviderOutputError } from "../errors.js";
const NSCALE_API_BASE_URL = "https://inference.api.nscale.com";
export class NscaleConversationalTask extends BaseConversationalTask {
    constructor() {
        super("nscale", NSCALE_API_BASE_URL);
    }
}
export class NscaleTextToImageTask extends TaskProviderHelper {
    constructor() {
        super("nscale", NSCALE_API_BASE_URL);
    }
    preparePayload(params) {
        if (params.outputType === "url") {
            throw new InferenceClientInputError("nscale provider does not support URL output. Use outputType 'blob', 'dataUrl' or 'json' instead.");
        }
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
            if (outputType === "json") {
                return { ...response };
            }
            const base64Data = response.data[0].b64_json;
            if (outputType === "dataUrl") {
                return `data:image/jpeg;base64,${base64Data}`;
            }
            return fetch(`data:image/jpeg;base64,${base64Data}`).then((res) => res.blob());
        }
        throw new InferenceClientProviderOutputError("Received malformed response from Nscale text-to-image API");
    }
}
