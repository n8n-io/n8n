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
export type AzureEntraCognitiveServicesOAuth2ApiCredential = OAuth2CredentialData & {
	customScopes: boolean;
	authentication: string;
	apiVersion: string;
	endpoint: string;
	resourceName: string;
	tenantId: string;
	oauthTokenData: TokenData;
};
