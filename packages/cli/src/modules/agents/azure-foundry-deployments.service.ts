import { hasAzureApiKey, type ResolvedCredential } from '@n8n/agents';
import {
	AzureProjectNotFoundError,
	listAzureOpenAiModels,
	type ProviderModel,
} from '@n8n/ai-utilities/model-discovery';
import type { AgentModelsUnavailableReason } from '@n8n/api-types';
import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import { mapCredentialForProvider } from './json-config/credential-field-mapping';

export type FoundryDeploymentsResult =
	| { status: 'success'; deployments: ProviderModel[] }
	| { status: 'unavailable'; reason?: AgentModelsUnavailableReason; error?: unknown };

/** The deployments call needs a token for the Foundry audience, not the inference one. */
const AZURE_AI_FOUNDRY_RESOURCE = 'https://ai.azure.com/';

const EntraCredentialSchema = z.object({
	clientId: z.string().min(1),
	clientSecret: z.string().optional(),
	accessTokenUrl: z.string().min(1),
	scope: z.string().optional(),
	authentication: z.enum(['body', 'header']).optional(),
});

/**
 * Lists the chat deployments of the Microsoft Foundry project on an Azure
 * OpenAI credential (API key or Entra ID). Agents send the deployment name as
 * the model id, so this list is what the model picker offers.
 */
@Service()
export class AzureFoundryDeploymentsService {
	constructor(
		private readonly outboundHttp: OutboundHttp,
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly ssrfProtectionConfig: SsrfProtectionConfig,
	) {}

	async list(credential: ResolvedCredential): Promise<FoundryDeploymentsResult> {
		const mapped = mapCredentialForProvider('azure-openai', credential);
		if (mapped.endpointType !== 'foundry') {
			return { status: 'unavailable', reason: 'endpoint_type_unsupported' };
		}
		const project = typeof credential.project === 'string' ? credential.project.trim() : '';
		if (!project) return { status: 'unavailable', reason: 'project_missing' };

		try {
			const deployments = await listAzureOpenAiModels({
				baseURL: foundryOrigin(mapped.baseURL),
				project,
				headers: await this.authHeaders(credential),
				fetch: createAiProxyFetch(this.outboundHttp),
				openAiCompatibleOnly: true,
			});
			return { status: 'success', deployments };
		} catch (error) {
			if (error instanceof AzureProjectNotFoundError) {
				return { status: 'unavailable', reason: 'project_not_found', error };
			}
			return { status: 'unavailable', error };
		}
	}

	private async authHeaders(credential: ResolvedCredential): Promise<Record<string, string>> {
		if (hasAzureApiKey(credential)) return { 'api-key': String(credential.apiKey) };
		return { Authorization: `Bearer ${await this.mintEntraToken(credential)}` };
	}

	private async mintEntraToken(credential: ResolvedCredential): Promise<string> {
		const parsed = EntraCredentialSchema.safeParse(credential);
		if (!parsed.success) {
			throw new UserError('The Microsoft Foundry credential has no API key or Entra ID client');
		}
		const { clientId, clientSecret, accessTokenUrl, scope, authentication } = parsed.data;
		const { ClientOAuth2 } = await import('@n8n/client-oauth2');
		const client = new ClientOAuth2({
			clientId,
			clientSecret,
			accessTokenUri: accessTokenUrl,
			scopes: scope?.split(' '),
			authentication,
			additionalBodyProperties: { resource: AZURE_AI_FOUNDRY_RESOURCE },
			// The token URL is stored on the credential, so keep the client secret
			// within the instance's outbound network policy.
			ssrfBridge: this.ssrfProtectionConfig.enabled ? this.ssrfProtectionService : undefined,
		});
		const token = await client.credentials.getToken();
		return token.data.access_token;
	}
}

/** The deployments API lives on the origin of the Foundry inference endpoint. */
function foundryOrigin(baseURL: unknown): string {
	if (typeof baseURL !== 'string' || !URL.canParse(baseURL)) {
		throw new UserError('The Microsoft Foundry credential has no valid endpoint');
	}
	return new URL(baseURL).origin;
}
