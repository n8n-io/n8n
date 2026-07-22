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
	apimConfig?: ApimConfig;
}

/**
 * APIM (Azure API Management) configuration for custom gateway access
 */
export interface ApimConfig {
	basePath?: string;
	queryParams?: Record<string, string>;
	headers?: Record<string, string>;
}

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
/**
 * APIM credential field types for fixedCollection
 */
export interface ApimQueryParam {
	name: string;
	value: string;
}

export interface ApimHeader {
	name: string;
	value: string;
}

export type AzureEntraCognitiveServicesOAuth2ApiCredential = OAuth2CredentialData & {
	customScopes: boolean;
	authentication: string;
	apiVersion: string;
	endpoint: string;
	resourceName: string;
	tenantId: string;
	oauthTokenData: TokenData;
	// APIM configuration fields
	useApim?: boolean;
	apimBasePath?: string;
	apimQueryParams?: {
		params?: ApimQueryParam[];
	};
	apimHeaders?: {
		headers?: ApimHeader[];
	};
	// Approved models list (comma-separated)
	approvedModels?: string;
};

/**
 * API Key credential type used by Azure OpenAI node
 */
export interface AzureOpenAiApiCredential {
	apiKey: string;
	resourceName: string;
	apiVersion: string;
	endpoint?: string;
	approvedModels?: string;
}
