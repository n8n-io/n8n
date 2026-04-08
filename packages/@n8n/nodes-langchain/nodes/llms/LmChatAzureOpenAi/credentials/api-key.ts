import { NodeOperationError, OperationalError, type ISupplyDataFunctions } from 'n8n-workflow';

import type { AzureOpenAIApiKeyModelConfig } from '../types';

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
