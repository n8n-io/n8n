import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { AuthenticationType } from '../types';
import type {
	AzureEntraCognitiveServicesOAuth2ApiCredential,
	AzureOpenAiApiCredential,
} from '../types';

/**
 * Type guard to check if value is a valid AuthenticationType
 */
function isAuthenticationType(value: unknown): value is AuthenticationType {
	return value === AuthenticationType.ApiKey || value === AuthenticationType.EntraOAuth2;
}

/**
 * Fetches approved models from credential configuration
 * Returns models defined in the approvedModels field as dropdown options
 */
export async function getDeployments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	try {
		const authenticationMethodValue = this.getNodeParameter('authentication', 0);
		if (!isAuthenticationType(authenticationMethodValue)) {
			throw new Error('Invalid authentication method');
		}
		const authenticationMethod = authenticationMethodValue;

		let approvedModels = '';

		if (authenticationMethod === AuthenticationType.ApiKey) {
			// API Key authentication
			const credential = await this.getCredentials<AzureOpenAiApiCredential>('azureOpenAiApi');
			approvedModels = credential.approvedModels || '';
		} else {
			// OAuth2 authentication
			const credential = await this.getCredentials<AzureEntraCognitiveServicesOAuth2ApiCredential>(
				'azureEntraCognitiveServicesOAuth2Api',
			);
			approvedModels = credential.approvedModels || '';
		}

		// If no approved models configured, return a hint
		if (!approvedModels.trim()) {
			return [
				{
					name: 'No Approved Models Configured - Enter Manually',
					value: '',
					description: 'Configure "Approved Models" in your credential to populate this dropdown',
				},
			];
		}

		// Parse comma-separated list and create options
		const models = approvedModels
			.split(',')
			.map((m) => m.trim())
			.filter(Boolean);

		for (const model of models) {
			returnData.push({
				name: model,
				value: model,
			});
		}

		// Sort alphabetically
		returnData.sort((a, b) => a.name.localeCompare(b.name));
	} catch (error) {
		// If we can't read credentials, return empty list with a hint
		const errorMessage = error instanceof Error ? error.message : String(error);
		returnData.push({
			name: 'Could Not Load Models - Enter Manually',
			value: '',
			description: `Error: ${errorMessage}`,
		});
	}

	return returnData;
}
