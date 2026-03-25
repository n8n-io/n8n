import { GenerativeAWSConfig, GenerativeAnthropicConfig, GenerativeAnyscaleConfig, GenerativeDatabricksConfig, GenerativeFriendliAIConfig, GenerativeMistralConfig, GenerativeNvidiaConfig, GenerativeOllamaConfig, GenerativePaLMConfig, GenerativeXAIConfig } from '../../index.js';
export type GenerativeOpenAIConfigBaseCreate = {
    baseURL?: string;
    frequencyPenalty?: number;
    maxTokens?: number;
    presencePenalty?: number;
    temperature?: number;
    topP?: number;
};
export type GenerativeAnthropicConfigCreate = GenerativeAnthropicConfig;
export type GenerativeAnyscaleConfigCreate = GenerativeAnyscaleConfig;
export type GenerativeAWSConfigCreate = GenerativeAWSConfig;
export type GenerativeAzureOpenAIConfigCreate = GenerativeOpenAIConfigBaseCreate & {
    resourceName: string;
    deploymentId: string;
};
export type GenerativeCohereConfigCreate = {
    k?: number;
    maxTokens?: number;
    model?: string;
    returnLikelihoods?: string;
    stopSequences?: string[];
    temperature?: number;
};
export type GenerativeDatabricksConfigCreate = GenerativeDatabricksConfig;
export type GenerativeFriendliAIConfigCreate = GenerativeFriendliAIConfig;
export type GenerativeMistralConfigCreate = GenerativeMistralConfig;
export type GenerativeNvidiaConfigCreate = GenerativeNvidiaConfig;
export type GenerativeOllamaConfigCreate = GenerativeOllamaConfig;
export type GenerativeOpenAIConfigCreate = GenerativeOpenAIConfigBaseCreate & {
    model?: string;
};
export type GenerativePaLMConfigCreate = GenerativePaLMConfig;
export type GenerativeXAIConfigCreate = GenerativeXAIConfig;
export type GenerativeConfigCreate = GenerativeAnthropicConfigCreate | GenerativeAnyscaleConfigCreate | GenerativeAWSConfigCreate | GenerativeAzureOpenAIConfigCreate | GenerativeCohereConfigCreate | GenerativeDatabricksConfigCreate | GenerativeFriendliAIConfigCreate | GenerativeMistralConfigCreate | GenerativeNvidiaConfigCreate | GenerativeOllamaConfigCreate | GenerativeOpenAIConfigCreate | GenerativePaLMConfigCreate | GenerativeXAIConfigCreate | Record<string, any> | undefined;
export type GenerativeConfigCreateType<G> = G extends 'generative-anthropic' ? GenerativeAnthropicConfigCreate : G extends 'generative-aws' ? GenerativeAWSConfigCreate : G extends 'generative-azure-openai' ? GenerativeAzureOpenAIConfigCreate : G extends 'generative-cohere' ? GenerativeCohereConfigCreate : G extends 'generative-databricks' ? GenerativeDatabricksConfigCreate : G extends 'generative-friendliai' ? GenerativeFriendliAIConfigCreate : G extends 'generative-mistral' ? GenerativeMistralConfigCreate : G extends 'generative-nvidia' ? GenerativeNvidiaConfigCreate : G extends 'generative-ollama' ? GenerativeOllamaConfigCreate : G extends 'generative-openai' ? GenerativeOpenAIConfigCreate : G extends 'generative-palm' ? GenerativePaLMConfigCreate : G extends 'generative-xai' ? GenerativeXAIConfigCreate : G extends 'none' ? undefined : Record<string, any> | undefined;
