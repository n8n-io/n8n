import { proxyFetch } from '@n8n/ai-utilities';
import { listAzureOpenAiModels } from '@n8n/ai-utilities/model-discovery';
import type { ILoadOptionsFunctions, INode, INodeListSearchResult } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { N8nOAuth2TokenCredential } from '../credentials/N8nOAuth2TokenCredential';
import { requireFoundryEndpoint } from '../credentials/requireFoundryEndpoint';
import { AuthenticationType, AZURE_AI_FOUNDRY_AUDIENCE } from '../types';
import type { AzureEntraCognitiveServicesOAuth2ApiCredential } from '../types';

interface AzureResourceCredential {
	endpointType?: 'classic' | 'foundry';
	foundryEndpoint?: string;
}

/**
 * The deployments-list endpoint only exists on the Foundry data plane. A
 * Classic (kind: OpenAI) resource has no `services.ai.azure.com` host at all
 * (confirmed against a live resource: DNS fails), and its deployments are
 * only reachable through the ARM control plane, which this call doesn't use.
 */
function resolveFoundryBaseURL(node: INode, foundryEndpoint?: string): string {
	return new URL(requireFoundryEndpoint(node, foundryEndpoint)).origin;
}

// The dropdown shows only the message, so it also says how to fix the problem.
function classicCredentialError(node: INode): NodeOperationError {
	return new NodeOperationError(
		node,
		"Only an Azure AI Foundry credential can list deployments. Select By ID and enter the deployment name, or set the credential's Endpoint Type to Azure AI Foundry.",
	);
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
		if (credential.endpointType !== 'foundry') {
			throw classicCredentialError(this.getNode());
		}
		baseURL = resolveFoundryBaseURL(this.getNode(), credential.foundryEndpoint);
		headers = { 'api-key': credential.apiKey };
	} else {
		const credential = await this.getCredentials<AzureEntraCognitiveServicesOAuth2ApiCredential>(
			'azureEntraCognitiveServicesOAuth2Api',
		);
		if (credential.endpointType !== 'foundry') {
			throw classicCredentialError(this.getNode());
		}
		baseURL = resolveFoundryBaseURL(this.getNode(), credential.foundryEndpoint);
		// Mints a token for the Foundry audience, which this call needs.
		const token = await new N8nOAuth2TokenCredential(
			this.getNode(),
			credential,
			AZURE_AI_FOUNDRY_AUDIENCE,
			egressFilter,
		).getToken();
		if (!token) {
			throw new NodeOperationError(this.getNode(), 'Failed to retrieve access token');
		}
		headers = { Authorization: `Bearer ${token.token}` };
	}

	// Without this, the list call reports `Project "" was not found`.
	if (!project) {
		throw new NodeOperationError(
			this.getNode(),
			'Enter the Project to list its deployments. Or select By ID and enter the deployment name.',
		);
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
