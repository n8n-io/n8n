import { getBearerTokenProvider } from '@azure/identity';
import { NodeOperationError, type ISupplyDataFunctions } from 'n8n-workflow';

import { N8nOAuth2TokenCredential } from './N8nOAuth2TokenCredential';
import type {
	AzureEntraCognitiveServicesOAuth2ApiCredential,
	AzureOpenAIOAuth2ModelConfig,
} from '../types';

const AZURE_OPENAI_SCOPE = 'https://cognitiveservices.azure.com/.default';
/**
 * Creates Entra ID (OAuth2) authentication for Azure OpenAI
 */
export async function setupOAuth2Authentication(
	this: ISupplyDataFunctions,
	credentialName: string,
): Promise<AzureOpenAIOAuth2ModelConfig> {
	try {
		const credential =
			await this.getCredentials<AzureEntraCognitiveServicesOAuth2ApiCredential>(credentialName);
		// Create a TokenCredential
		const entraTokenCredential = new N8nOAuth2TokenCredential(this.getNode(), credential);
		const deploymentDetails = await entraTokenCredential.getDeploymentDetails();

		// Use getBearerTokenProvider to create the function LangChain expects
		// Pass the required scope for Azure Cognitive Services
		const azureADTokenProvider = getBearerTokenProvider(entraTokenCredential, AZURE_OPENAI_SCOPE);

		this.logger.debug('Successfully created Azure AD Token Provider.');

		return {
			azureADTokenProvider,
			azureOpenAIApiInstanceName: deploymentDetails.resourceName,
			azureOpenAIApiVersion: deploymentDetails.apiVersion,
			azureOpenAIEndpoint: deploymentDetails.endpoint,
		};
	} catch (error) {
		this.logger.error(`Error setting up Entra ID authentication: ${error.message}`, error);

		throw new NodeOperationError(
			this.getNode(),
			`Error setting up Entra ID authentication: ${error.message}`,
			error,
		);
	}
}
