export type GenerativeOpenAIConfigBase = {
    baseURL?: string;
    frequencyPenaltyProperty?: number;
    maxTokensProperty?: number;
    presencePenaltyProperty?: number;
    temperatureProperty?: number;
    topPProperty?: number;
};
export type GenerativeAWSConfig = {
    region: string;
    service: string;
    model?: string;
    endpoint?: string;
    maxTokens?: number;
};
export type GenerativeAnthropicConfig = {
    baseURL?: string;
    maxTokens?: number;
    model?: string;
    stopSequences?: string[];
    temperature?: number;
    topK?: number;
    topP?: number;
};
export type GenerativeAnyscaleConfig = {
    baseURL?: string;
    model?: string;
    temperature?: number;
};
export type GenerativeCohereConfig = {
    kProperty?: number;
    model?: string;
    maxTokensProperty?: number;
    returnLikelihoodsProperty?: string;
    stopSequencesProperty?: string[];
    temperatureProperty?: number;
};
export type GenerativeDatabricksConfig = {
    endpoint: string;
    maxTokens?: number;
    temperature?: number;
    topK?: number;
    topP?: number;
};
export type GenerativeFriendliAIConfig = {
    baseURL?: string;
    maxTokens?: number;
    model?: string;
    temperature?: number;
};
export type GenerativeMistralConfig = {
    baseURL?: string;
    maxTokens?: number;
    model?: string;
    temperature?: number;
};
export type GenerativeNvidiaConfig = {
    baseURL?: string;
    maxTokens?: number;
    model?: string;
    temperature?: number;
};
export type GenerativeOllamaConfig = {
    apiEndpoint?: string;
    model?: string;
};
export type GenerativeOpenAIConfig = GenerativeOpenAIConfigBase & {
    model?: string;
};
export type GenerativeAzureOpenAIConfig = GenerativeOpenAIConfigBase & {
    resourceName: string;
    deploymentId: string;
};
/** @deprecated Use `GenerativeGoogleConfig` instead. */
export type GenerativePaLMConfig = GenerativeGoogleConfig;
export type GenerativeGoogleConfig = {
    apiEndpoint?: string;
    maxOutputTokens?: number;
    model?: string;
    /** @deprecated Use `model` instead. */
    modelId?: string;
    projectId?: string;
    temperature?: number;
    topK?: number;
    topP?: number;
};
export type GenerativeXAIConfig = {
    baseURL?: string;
    maxTokens?: number;
    model?: string;
    temperature?: number;
    topP?: number;
};
export type GenerativeConfig = GenerativeAnthropicConfig | GenerativeAnyscaleConfig | GenerativeAWSConfig | GenerativeAzureOpenAIConfig | GenerativeCohereConfig | GenerativeDatabricksConfig | GenerativeGoogleConfig | GenerativeFriendliAIConfig | GenerativeMistralConfig | GenerativeOllamaConfig | GenerativeOpenAIConfig | GenerativePaLMConfig | GenerativeXAIConfig | Record<string, any> | undefined;
export type GenerativeConfigType<G> = G extends 'generative-anthropic' ? GenerativeAnthropicConfig : G extends 'generative-anyscale' ? GenerativeAnyscaleConfig : G extends 'generative-aws' ? GenerativeAWSConfig : G extends 'generative-azure-openai' ? GenerativeAzureOpenAIConfig : G extends 'generative-cohere' ? GenerativeCohereConfig : G extends 'generative-databricks' ? GenerativeDatabricksConfig : G extends 'generative-google' ? GenerativeGoogleConfig : G extends 'generative-friendliai' ? GenerativeFriendliAIConfig : G extends 'generative-mistral' ? GenerativeMistralConfig : G extends 'generative-ollama' ? GenerativeOllamaConfig : G extends 'generative-openai' ? GenerativeOpenAIConfig : G extends GenerativePalm ? GenerativePaLMConfig : G extends 'generative-xai' ? GenerativeXAIConfig : G extends 'none' ? undefined : Record<string, any> | undefined;
/** @deprecated Use `generative-google` instead. */
type GenerativePalm = 'generative-palm';
export type GenerativeSearch = 'generative-anthropic' | 'generative-anyscale' | 'generative-aws' | 'generative-azure-openai' | 'generative-cohere' | 'generative-databricks' | 'generative-google' | 'generative-friendliai' | 'generative-mistral' | 'generative-ollama' | 'generative-openai' | GenerativePalm | 'generative-xai' | 'none' | string;
export {};
