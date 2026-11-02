import {
	hasAzureApiKey,
	mintAzureFoundryDeploymentsToken,
	type ResolvedCredential,
} from '@n8n/agents';
import {
	AzureProjectNotFoundError,
	getAzureFoundryOrigin,
	listAzureOpenAiModels,
	type AzureDeploymentModel,
	type ProviderModel,
} from '@n8n/ai-utilities/model-discovery';
import { AZURE_FOUNDRY_ANTHROPIC_PREFIX, type AgentModelsUnavailableReason } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { UserError } from 'n8n-workflow';

import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

/** A redeployed model shows up within this time. */
const UNDERLYING_MODEL_CACHE_TTL_MS = 10 * Time.minutes.toMilliseconds;

import { mapCredentialForProvider } from '@/credentials/credential-field-mapping';

/** A deployment as the model picker offers it, plus the model it serves. */
export interface FoundryDeployment extends ProviderModel {
	modelName?: string;
}

export type FoundryDeploymentsResult =
	| { status: 'success'; deployments: FoundryDeployment[] }
	| { status: 'unavailable'; reason?: AgentModelsUnavailableReason; error?: unknown };

/**
 * Lists the chat deployments of the Microsoft Foundry project on an Azure
 * OpenAI credential (API key or Entra ID). Agents send the deployment name as
 * the model id, so this list is what the model picker offers. A Claude
 * deployment gets the `anthropic/` prefix so the runtime uses the Anthropic API.
 */
@Service()
export class AzureFoundryDeploymentsService {
	/** Model each deployment serves, for each credential, keyed by the agent model id. */
	private readonly underlyingModels = new Map<
		string,
		{ expiresAt: number; byModelId: Map<string, string | undefined> }
	>();

	constructor(
		private readonly logger: Logger,
		private readonly outboundHttp: OutboundHttp,
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly ssrfProtectionConfig: SsrfProtectionConfig,
	) {
		this.logger = this.logger.scoped('agents');
	}

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
			});
			return { status: 'success', deployments: deployments.map(toAgentModel) };
		} catch (error) {
			if (error instanceof AzureProjectNotFoundError) {
				return { status: 'unavailable', reason: 'project_not_found', error };
			}
			return { status: 'unavailable', error };
		}
	}

	/**
	 * The model a deployment serves, for cost and capability lookups. The result
	 * is cached for each credential, so a run does not list the deployments every
	 * time. A listed deployment without a model name is cached as undefined. A
	 * deployment that is not in the cache causes a new listing, so a new
	 * deployment resolves on its first run. A failed listing returns undefined and
	 * is not cached.
	 */
	async findUnderlyingModel(
		credentialId: string,
		credential: ResolvedCredential,
		agentModelName: string,
	): Promise<string | undefined> {
		const cached = this.underlyingModels.get(credentialId);
		if (cached && cached.expiresAt > Date.now() && cached.byModelId.has(agentModelName)) {
			return cached.byModelId.get(agentModelName);
		}

		const result = await this.list(credential);
		if (result.status !== 'success') {
			this.logger.warn(
				'Could not resolve the model a Foundry deployment serves. Its usage has no cost.',
				{
					credentialId,
					reason: result.reason,
					error: result.error === undefined ? undefined : getErrorMessage(result.error),
				},
			);
			return undefined;
		}
		const byModelId = new Map(result.deployments.map(({ id, modelName }) => [id, modelName]));
		this.underlyingModels.set(credentialId, {
			expiresAt: Date.now() + UNDERLYING_MODEL_CACHE_TTL_MS,
			byModelId,
		});
		return byModelId.get(agentModelName);
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

function toAgentModel({
	id,
	name,
	modelFamily,
	modelName,
}: AzureDeploymentModel): FoundryDeployment {
	return {
		id: modelFamily === 'anthropic' ? `${AZURE_FOUNDRY_ANTHROPIC_PREFIX}${id}` : id,
		name,
		...(modelName ? { modelName } : {}),
	};
}

/** Rejects a missing or invalid endpoint with a message the picker can log. */
function foundryOrigin(baseURL: unknown): string {
	if (typeof baseURL !== 'string' || !URL.canParse(baseURL.trim())) {
		throw new UserError('The Microsoft Foundry credential has no valid endpoint');
	}
	return getAzureFoundryOrigin(baseURL);
}
