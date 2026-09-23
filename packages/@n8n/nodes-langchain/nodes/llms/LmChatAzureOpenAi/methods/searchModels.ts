import { proxyFetch } from '@n8n/ai-utilities';
import { listAzureOpenAiModels } from '@n8n/ai-utilities/model-discovery';
import type { ILoadOptionsFunctions, INode, INodeListSearchResult } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { N8nOAuth2TokenCredential } from '../credentials/N8nOAuth2TokenCredential';
import { requireFoundryEndpoint } from '../credentials/requireFoundryEndpoint';
import { AuthenticationType, AZURE_AI_FOUNDRY_AUDIENCE } from '../types';
import type { AzureEntraCognitiveServicesOAuth2ApiCredential } from '../types';

interface AzureResourceCredential {
	resourceName?: string;
	endpointType?: 'classic' | 'foundry';
	foundryEndpoint?: string;
}

/** The deployments-list endpoint lives on the same host for Classic and Foundry. */
function resolveBaseURL(node: INode, credential: AzureResourceCredential): string {
	if (credential.endpointType === 'foundry') {
		return new URL(requireFoundryEndpoint(node, credential.foundryEndpoint)).origin;
	}

	if (!credential.resourceName?.trim()) {
		throw new NodeOperationError(
			node,
			'Resource Name is missing in the selected Azure OpenAI credential.',
		);
	}
	return `https://${credential.resourceName}.services.ai.azure.com`;
}

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const authenticationMethod = this.getNodeParameter(
		'authentication',
		AuthenticationType.ApiKey,
	) as AuthenticationType;
	const project = this.getNodeParameter('project', '') as string;
	const egressFilter = this.helpers.getSecureEgressFilter();

	let baseURL: string;
	let headers: Record<string, string>;

	if (authenticationMethod === AuthenticationType.ApiKey) {
		const credential = await this.getCredentials<AzureResourceCredential & { apiKey: string }>(
			'azureOpenAiApi',
		);
		baseURL = resolveBaseURL(this.getNode(), credential);
		headers = { 'api-key': credential.apiKey };
	} else {
		const credential = await this.getCredentials<AzureEntraCognitiveServicesOAuth2ApiCredential>(
			'azureEntraCognitiveServicesOAuth2Api',
		);
		baseURL = resolveBaseURL(this.getNode(), credential);
		// Mints a token for the Foundry audience, which this call needs.
		const token = await new N8nOAuth2TokenCredential(
			this.getNode(),
			credential,
			AZURE_AI_FOUNDRY_AUDIENCE,
		).getToken();
		if (!token) {
			throw new NodeOperationError(this.getNode(), 'Failed to retrieve access token');
		}
		headers = { Authorization: `Bearer ${token.token}` };
	}

	const models = await listAzureOpenAiModels({
		baseURL,
		project,
		headers,
		fetch: async (input, init) => await proxyFetch({ input, init, egressFilter }),
	});

	return {
		results: models
			.filter((model) => !filter || model.id.toLowerCase().includes(filter.toLowerCase()))
			.map((model) => ({ name: model.name, value: model.id })),
	};
}
