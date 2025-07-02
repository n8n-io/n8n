import { NodeOperationError, OperationalError, type ISupplyDataFunctions } from 'n8n-workflow';

import { ClientTokenManager } from '../../../../utils/ClientTokenManager';
import type { AzureOpenAIApiKeyModelConfig } from '../types';

export const authUrl = 'https://id.cisco.com/oauth2/default/v1/token';
const clientTokenManager = new ClientTokenManager();
/**
 * Handles API Key authentication setup for Azure OpenAI
 */
export async function setupApiKeyAuthentication(
	this: ISupplyDataFunctions,
	credentialName: string,
): Promise<AzureOpenAIApiKeyModelConfig> {
	try {
		// Get Azure OpenAI Config (Endpoint, Version, etc.)
		const configCredentials = await this.getCredentials<{
			apiKey?: string;
			resourceName: string;
			apiVersion: string;
			endpoint?: string;
		}>(credentialName);

		if (!configCredentials.apiKey) {
			throw new NodeOperationError(
				this.getNode(),
				'API Key is missing in the selected Azure OpenAI API credential. Please configure the API Key or choose Entra ID authentication.',
			);
		}

		this.logger.info('Using API Key authentication for Azure OpenAI.');

		return {
			azureOpenAIApiKey: configCredentials.apiKey,
			azureOpenAIApiInstanceName: configCredentials.resourceName,
			azureOpenAIApiVersion: configCredentials.apiVersion,
			azureOpenAIEndpoint: configCredentials.endpoint,
		};
	} catch (error) {
		if (error instanceof OperationalError) {
			throw error;
		}

		this.logger.error(`Error setting up API Key authentication: ${error.message}`, error);

		throw new NodeOperationError(this.getNode(), 'Failed to retrieve API Key', error);
	}
}

interface FetchApiKeyResponse {
	error: Error | null;
	token: string;
}

// Define a function to fetch the API key
async function fetchApiKey(clientId: string, clientSecret: string): Promise<FetchApiKeyResponse> {
	try {
		// Check if the client token is already cached
		const hasToken = await clientTokenManager.hasToken(clientId);
		if (hasToken) {
			// Return the cached token
			const cachedToken = await clientTokenManager.getToken(clientId);
			if (cachedToken) {
				console.log('Using cached access token:', cachedToken);
				return { error: null, token: cachedToken };
			}
		}
		// If not cached, make a request to fetch the API key
		const response = await fetch(authUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'client_credentials', // Typically used grant type for machine-to-machine authentication
			}).toString(),
		});

		if (!response.ok) {
			console.error(`Error in fetching API key: ${response.statusText}`);
			return {
				error: new Error(`Error in fetching API key: ${response.statusText}`),
				token: '',
			};
		}

		// Parse the response
		const data = await response.json();
		// @ts-ignore
		console.log('Access Token:', data.access_token);

		// Cache the access token
		// @ts-ignore
		await clientTokenManager.storeToken(clientId, data.access_token);
		// Return the access token (or API key)
		// @ts-ignore
		return { error: null, token: data.access_token };
	} catch (error) {
		console.error(error);
		return {
			error: new Error(`Failed to fetch API key: ${error.message}`),
			token: '',
		};
	}
}

export async function setupClientApiKeyAuthentication(
	this: ISupplyDataFunctions,
	credentialName: string,
): Promise<AzureOpenAIApiKeyModelConfig> {
	try {
		// Get Azure OpenAI Config (Endpoint, Version, etc.)
		const configCredentials = await this.getCredentials<{
			clientId?: string;
			clientSecret?: string;
			resourceName: string;
			apiVersion: string;
			endpoint?: string;
		}>(credentialName);

		if (!configCredentials.clientId || !configCredentials.clientSecret) {
			throw new NodeOperationError(
				this.getNode(),
				'Client Id or Client Secret is missing in the selected Azure OpenAI' +
					' API credential. Please configure the API Key or choose Client ' +
					' authentication.',
			);
		}
		const fetchResponse = await fetchApiKey(
			configCredentials.clientId,
			configCredentials.clientSecret,
		);
		if (fetchResponse.error) {
			throw new NodeOperationError(
				this.getNode(),
				`Failed to fetch API Key: ${fetchResponse.error}`,
			);
		}

		this.logger.info('Using Client Id and Secret authentication for Azure OpenAI.');

		return {
			azureOpenAIApiKey: fetchResponse.token,
			azureOpenAIApiInstanceName: configCredentials.resourceName,
			azureOpenAIApiVersion: configCredentials.apiVersion,
			azureOpenAIEndpoint: configCredentials.endpoint,
		};
	} catch (error) {
		if (error instanceof OperationalError) {
			throw error;
		}

		this.logger.error(`Error setting up API Key authentication: ${error.message}`, error);

		throw new NodeOperationError(this.getNode(), 'Failed to retrieve API Key', error);
	}
}
