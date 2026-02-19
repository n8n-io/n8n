import { getBearerTokenProvider } from '@azure/identity';
import { NodeOperationError, type ISupplyDataFunctions } from 'n8n-workflow';

import { N8nOAuth2TokenCredential } from './N8nOAuth2TokenCredential';
import type {
	AzureEntraCognitiveServicesOAuth2ApiCredential,
	AzureOpenAIOAuth2ModelConfig,
	ApimConfig,
} from '../types';

const AZURE_OPENAI_SCOPE = 'https://cognitiveservices.azure.com/.default';

/**
 * Extracts APIM configuration from credential if useApim is enabled
 */
function extractApimConfig(
	credential: AzureEntraCognitiveServicesOAuth2ApiCredential,
): ApimConfig | undefined {
	if (!credential.useApim) {
		return undefined;
	}

	const config: ApimConfig = {};

	if (credential.apimBasePath) {
		config.basePath = credential.apimBasePath;
	}

	// Convert array of {name, value} to Record<string, string>
	if (credential.apimQueryParams?.params?.length) {
		config.queryParams = {};
		for (const param of credential.apimQueryParams.params) {
			if (param.name && param.value) {
				config.queryParams[param.name] = param.value;
			}
		}
	}

	if (credential.apimHeaders?.headers?.length) {
		config.headers = {};
		for (const header of credential.apimHeaders.headers) {
			if (header.name && header.value) {
				config.headers[header.name] = header.value;
			}
		}
	}

	// Only return config if at least one property is set
	if (config.basePath || config.queryParams || config.headers) {
		return config;
	}

	return undefined;
}
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

		// Extract APIM configuration if enabled
		const apimConfig = extractApimConfig(credential);

		this.logger.debug('Successfully created Azure AD Token Provider.');
		if (apimConfig) {
			this.logger.debug('APIM configuration detected and will be applied to LLM requests.');
		}

		return {
			azureADTokenProvider,
			azureOpenAIApiInstanceName: deploymentDetails.resourceName,
			azureOpenAIApiVersion: deploymentDetails.apiVersion,
			azureOpenAIEndpoint: deploymentDetails.endpoint,
			apimConfig,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		this.logger.error(`Error setting up Entra ID authentication: ${errorMessage}`, { error });

		throw new NodeOperationError(
			this.getNode(),
			`Error setting up Entra ID authentication: ${errorMessage}`,
		);
	}
}
