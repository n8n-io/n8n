"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferenceProviderMappingCache = void 0;
exports.fetchInferenceProviderMappingForModel = fetchInferenceProviderMappingForModel;
exports.getInferenceProviderMapping = getInferenceProviderMapping;
exports.resolveProvider = resolveProvider;
const config_js_1 = require("../config.js");
const consts_js_1 = require("../providers/consts.js");
const hf_inference_js_1 = require("../providers/hf-inference.js");
const typedInclude_js_1 = require("../utils/typedInclude.js");
const errors_js_1 = require("../errors.js");
exports.inferenceProviderMappingCache = new Map();
/**
 * Normalize inferenceProviderMapping to always return an array format.
 * This provides backward and forward compatibility for the API changes.
 *
 * Vendored from @huggingface/hub to avoid extra dependency.
 */
function normalizeInferenceProviderMapping(modelId, inferenceProviderMapping) {
    if (!inferenceProviderMapping) {
        return [];
    }
    // If it's already an array, return it as is
    if (Array.isArray(inferenceProviderMapping)) {
        return inferenceProviderMapping;
    }
    // Convert mapping to array format
    return Object.entries(inferenceProviderMapping).map(([provider, mapping]) => ({
        provider,
        hfModelId: modelId,
        providerId: mapping.providerId,
        status: mapping.status,
        task: mapping.task,
    }));
}
async function fetchInferenceProviderMappingForModel(modelId, accessToken, options) {
    let inferenceProviderMapping;
    if (exports.inferenceProviderMappingCache.has(modelId)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        inferenceProviderMapping = exports.inferenceProviderMappingCache.get(modelId);
    }
    else {
        const url = `${config_js_1.HF_HUB_URL}/api/models/${modelId}?expand[]=inferenceProviderMapping`;
        const resp = await (options?.fetch ?? fetch)(url, {
            headers: accessToken?.startsWith("hf_") ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!resp.ok) {
            if (resp.headers.get("Content-Type")?.startsWith("application/json")) {
                const error = await resp.json();
                if ("error" in error && typeof error.error === "string") {
                    throw new errors_js_1.InferenceClientHubApiError(`Failed to fetch inference provider mapping for model ${modelId}: ${error.error}`, { url, method: "GET" }, { requestId: resp.headers.get("x-request-id") ?? "", status: resp.status, body: error });
                }
            }
            else {
                throw new errors_js_1.InferenceClientHubApiError(`Failed to fetch inference provider mapping for model ${modelId}`, { url, method: "GET" }, { requestId: resp.headers.get("x-request-id") ?? "", status: resp.status, body: await resp.text() });
            }
        }
        let payload = null;
        try {
            payload = await resp.json();
        }
        catch {
            throw new errors_js_1.InferenceClientHubApiError(`Failed to fetch inference provider mapping for model ${modelId}: malformed API response, invalid JSON`, { url, method: "GET" }, { requestId: resp.headers.get("x-request-id") ?? "", status: resp.status, body: await resp.text() });
        }
        if (!payload?.inferenceProviderMapping) {
            throw new errors_js_1.InferenceClientHubApiError(`We have not been able to find inference provider information for model ${modelId}.`, { url, method: "GET" }, { requestId: resp.headers.get("x-request-id") ?? "", status: resp.status, body: await resp.text() });
        }
        inferenceProviderMapping = normalizeInferenceProviderMapping(modelId, payload.inferenceProviderMapping);
        exports.inferenceProviderMappingCache.set(modelId, inferenceProviderMapping);
    }
    return inferenceProviderMapping;
}
async function getInferenceProviderMapping(params, options) {
    if (consts_js_1.HARDCODED_MODEL_INFERENCE_MAPPING[params.provider][params.modelId]) {
        return consts_js_1.HARDCODED_MODEL_INFERENCE_MAPPING[params.provider][params.modelId];
    }
    const mappings = await fetchInferenceProviderMappingForModel(params.modelId, params.accessToken, options);
    const providerMapping = mappings.find((mapping) => mapping.provider === params.provider);
    if (providerMapping) {
        const equivalentTasks = params.provider === "hf-inference" && (0, typedInclude_js_1.typedInclude)(hf_inference_js_1.EQUIVALENT_SENTENCE_TRANSFORMERS_TASKS, params.task)
            ? hf_inference_js_1.EQUIVALENT_SENTENCE_TRANSFORMERS_TASKS
            : [params.task];
        if (!(0, typedInclude_js_1.typedInclude)(equivalentTasks, providerMapping.task)) {
            throw new errors_js_1.InferenceClientInputError(`Model ${params.modelId} is not supported for task ${params.task} and provider ${params.provider}. Supported task: ${providerMapping.task}.`);
        }
        if (providerMapping.status === "staging") {
            console.warn(`Model ${params.modelId} is in staging mode for provider ${params.provider}. Meant for test purposes only.`);
        }
        return providerMapping;
    }
    return null;
}
async function resolveProvider(provider, modelId, endpointUrl) {
    if (endpointUrl) {
        if (provider) {
            throw new errors_js_1.InferenceClientInputError("Specifying both endpointUrl and provider is not supported.");
        }
        /// Defaulting to hf-inference helpers / API
        return "hf-inference";
    }
    if (!provider) {
        console.log("Defaulting to 'auto' which will select the first provider available for the model, sorted by the user's order in https://hf.co/settings/inference-providers.");
        provider = "auto";
    }
    if (provider === "auto") {
        if (!modelId) {
            throw new errors_js_1.InferenceClientInputError("Specifying a model is required when provider is 'auto'");
        }
        const mappings = await fetchInferenceProviderMappingForModel(modelId);
        provider = mappings[0]?.provider;
    }
    if (!provider) {
        throw new errors_js_1.InferenceClientInputError(`No Inference Provider available for model ${modelId}.`);
    }
    return provider;
}
