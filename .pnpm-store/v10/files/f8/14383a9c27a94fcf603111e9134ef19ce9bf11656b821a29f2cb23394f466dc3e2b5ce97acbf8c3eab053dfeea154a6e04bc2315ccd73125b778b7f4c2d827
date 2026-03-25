/// This list is for illustration purposes only.
/// in the `tasks` sub-package, we do not need actual strong typing of the inference providers.
const INFERENCE_PROVIDERS = [
    "cerebras",
    "cohere",
    "fal-ai",
    "fireworks-ai",
    "hf-inference",
    "hyperbolic",
    "ovhcloud",
    "replicate",
    "sambanova",
    "together",
];
export const HF_HUB_INFERENCE_PROXY_TEMPLATE = `https://router.huggingface.co/{{PROVIDER}}`;
/**
 * URL to set as baseUrl in the OpenAI SDK.
 *
 * TODO(Expose this from InferenceClient in the future?)
 */
export function openAIbaseUrl(provider) {
    const url = HF_HUB_INFERENCE_PROXY_TEMPLATE.replace("{{PROVIDER}}", provider);
    return provider === "hf-inference" ? `${url}/v1` : url;
}
