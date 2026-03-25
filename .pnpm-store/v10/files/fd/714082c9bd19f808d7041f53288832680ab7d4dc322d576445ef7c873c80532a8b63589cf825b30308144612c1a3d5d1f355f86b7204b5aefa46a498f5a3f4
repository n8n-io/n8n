declare const INFERENCE_PROVIDERS: readonly ["cerebras", "cohere", "fal-ai", "fireworks-ai", "hf-inference", "hyperbolic", "ovhcloud", "replicate", "sambanova", "together"];
export type SnippetInferenceProvider = (typeof INFERENCE_PROVIDERS)[number] | string;
export declare const HF_HUB_INFERENCE_PROXY_TEMPLATE = "https://router.huggingface.co/{{PROVIDER}}";
/**
 * URL to set as baseUrl in the OpenAI SDK.
 *
 * TODO(Expose this from InferenceClient in the future?)
 */
export declare function openAIbaseUrl(provider: SnippetInferenceProvider): string;
export {};
//# sourceMappingURL=inference-providers.d.ts.map