import type { OAuth2CredentialData } from '@n8n/client-oauth2';
/**
 * Common interfaces for Azure OpenAI configuration
 */

/**
 * Basic Azure OpenAI API configuration options
 */
export interface AzureOpenAIConfig {
	apiVersion: string;
	resourceName: string;
	endpoint?: string;
}

/**
 * Configuration for API Key authentication
 */
export interface AzureOpenAIApiKeyConfig extends AzureOpenAIConfig {
	apiKey: string;
}

/**
 * Azure OpenAI node options
 */
export interface AzureOpenAIOptions {
	frequencyPenalty?: number;
	maxTokens?: number;
	maxRetries?: number;
	timeout?: number;
	presencePenalty?: number;
	temperature?: number;
	topP?: number;
	responseFormat?: 'text' | 'json_object';
}

/**
 * Base model configuration that can be passed to AzureChatOpenAI constructor
 */
export interface AzureOpenAIBaseModelConfig {
	azureOpenAIApiInstanceName: string;
	azureOpenAIApiVersion: string;
	azureOpenAIEndpoint?: string;
	/**
	 * Full OpenAI-compatible base URL for Azure AI Foundry
	 * (`*.services.ai.azure.com/openai/v1`). When set, the node uses ChatOpenAI
	 * against this URL instead of AzureChatOpenAI's deployment-based path.
	 */
	azureFoundryBaseURL?: string;
}

/**
 * API Key model configuration that can be passed to AzureChatOpenAI constructor
 */
export interface AzureOpenAIApiKeyModelConfig extends AzureOpenAIBaseModelConfig {
	azureOpenAIApiKey: string;
	azureADTokenProvider?: undefined;
}

/**
 * OAuth2 model configuration that can be passed to AzureChatOpenAI constructor
 */
export interface AzureOpenAIOAuth2ModelConfig extends AzureOpenAIBaseModelConfig {
	azureOpenAIApiKey?: undefined;
	azureADTokenProvider: () => Promise<string>;
}

/** Audience for the node's inference requests. */
export const AZURE_OPENAI_INFERENCE_AUDIENCE = 'https://cognitiveservices.azure.com';

/** The same audience in the form `getBearerTokenProvider` expects. */
export const AZURE_OPENAI_INFERENCE_SCOPE = `${AZURE_OPENAI_INFERENCE_AUDIENCE}/.default`;

/**
 * Audience for the Foundry deployments-list call. Each tenant's Entra ID app
 * registration grants access per audience, so this is requested only for the
 * call that needs it, not for every token the node mints.
 */
export const AZURE_AI_FOUNDRY_AUDIENCE = 'https://ai.azure.com';

/**
 * Authentication types supported by Azure OpenAI node
 */
export const enum AuthenticationType {
	ApiKey = 'azureOpenAiApi',
	EntraOAuth2 = 'azureEntraCognitiveServicesOAuth2Api',
}

/**
 * Error types for Azure OpenAI node
 */
export const enum AzureOpenAIErrorType {
	AuthenticationError = 'AuthenticationError',
	ConfigurationError = 'ConfigurationError',
	APIError = 'APIError',
	UnknownError = 'UnknownError',
}

/**
 * OAuth2 credential type used by Azure OpenAI node
 */
type TokenData = OAuth2CredentialData['oauthTokenData'] & {
	expires_on: number;
	ext_expires_on: number;
};
export type AzureEntraCognitiveServicesOAuth2ApiCredential = OAuth2CredentialData & {
	customScopes: boolean;
	authentication: string;
	apiVersion?: string;
	endpoint?: string;
	resourceName?: string;
	endpointType?: 'classic' | 'foundry';
	foundryEndpoint?: string;
	tenantId: string;
	oauthTokenData?: TokenData;
};
