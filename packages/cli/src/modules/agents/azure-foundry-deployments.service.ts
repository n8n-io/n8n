import {
	hasAzureApiKey,
	mintAzureFoundryDeploymentsToken,
	type ResolvedCredential,
} from '@n8n/agents';
import {
	AzureProjectNotFoundError,
	getAzureFoundryOrigin,
	listAzureOpenAiModels,
	type ProviderModel,
} from '@n8n/ai-utilities/model-discovery';
import type { AgentModelsUnavailableReason } from '@n8n/api-types';
import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import { mapCredentialForProvider } from './json-config/credential-field-mapping';

export type FoundryDeploymentsResult =
	| { status: 'success'; deployments: ProviderModel[] }
	| { status: 'unavailable'; reason?: AgentModelsUnavailableReason; error?: unknown };

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
				headers: await this.authHeaders(mapped),
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

	/** Takes the credential mapped for `azure-openai`, as the Agents runtime uses it. */
	private async authHeaders(mapped: Record<string, unknown>): Promise<Record<string, string>> {
		if (hasAzureApiKey(mapped)) return { 'api-key': String(mapped.apiKey) };
		// The token URL is stored on the credential, so keep the client secret
		// within the instance's outbound network policy.
		const ssrfBridge = this.ssrfProtectionConfig.enabled ? this.ssrfProtectionService : undefined;
		return {
			Authorization: `Bearer ${await mintAzureFoundryDeploymentsToken(mapped, ssrfBridge)}`,
		};
	}
}

/** Rejects a missing or invalid endpoint with a message the picker can log. */
function foundryOrigin(baseURL: unknown): string {
	if (typeof baseURL !== 'string' || !URL.canParse(baseURL.trim())) {
		throw new UserError('The Microsoft Foundry credential has no valid endpoint');
	}
	return getAzureFoundryOrigin(baseURL);
}
