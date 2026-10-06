import { getBearerTokenProvider } from '@azure/identity';
import { NodeOperationError, type ISupplyDataFunctions } from 'n8n-workflow';

import { N8nOAuth2TokenCredential } from './N8nOAuth2TokenCredential';
import { normalizeEndpoint } from './normalizeEndpoint';
import { requireFoundryEndpoint } from './requireFoundryEndpoint';
import type {
	AzureEntraCognitiveServicesOAuth2ApiCredential,
	AzureOpenAIOAuth2ModelConfig,
} from '../types';
import { AZURE_OPENAI_INFERENCE_AUDIENCE } from '../types';

const AZURE_OPENAI_SCOPE = `${AZURE_OPENAI_INFERENCE_AUDIENCE}/.default`;
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
		// Mints tokens for the inference audience (the default).
		const entraTokenCredential = new N8nOAuth2TokenCredential(
			this.getNode(),
			credential,
			undefined,
			this.helpers.getSecureEgressFilter(),
		);
		const deploymentDetails = await entraTokenCredential.getDeploymentDetails();

		// getBearerTokenProvider caches the token across calls. It requires a scope, but the
		// audience comes from the credential above; the v1.0 endpoint reads `resource`, not `scope`.
		const azureADTokenProvider = getBearerTokenProvider(entraTokenCredential, AZURE_OPENAI_SCOPE);

		this.logger.debug('Successfully created Azure AD Token Provider.');

		return {
			azureADTokenProvider,
			azureOpenAIApiInstanceName: deploymentDetails.resourceName,
			azureOpenAIApiVersion: deploymentDetails.apiVersion,
			azureOpenAIEndpoint: normalizeEndpoint(deploymentDetails.endpoint),
			...(deploymentDetails.endpointType === 'foundry' && deploymentDetails.foundryEndpoint
				? {
						azureFoundryBaseURL: requireFoundryEndpoint(
							this.getNode(),
							deploymentDetails.foundryEndpoint,
						),
					}
				: {}),
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
