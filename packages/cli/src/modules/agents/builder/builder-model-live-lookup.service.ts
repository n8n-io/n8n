import {
	AI_GATEWAY_MANAGED_TAG,
	getAgentModelProviderCredentialTypes,
	type AgentModelsUnavailableReason,
} from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsHelper } from '@/credentials-helper';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import type { ModelChoice } from './model-lookup.types';
import { mapCredentialForProvider } from '@/credentials/credential-field-mapping';
import { AzureFoundryDeploymentsService } from '../azure-foundry-deployments.service';
import { LLM_PROVIDER_DEFAULTS } from '../llm-provider-defaults';
import { decryptAgentCredential } from '../utils/decrypt-agent-credential';

export type ModelCatalogPolicy = 'curated' | 'endpoint-only' | 'managed';

export type LiveModelLookupResult =
	| {
			status: 'success';
			models: ModelChoice[];
			policy: ModelCatalogPolicy;
	  }
	| {
			status: 'unavailable';
			error: unknown;
			policy: ModelCatalogPolicy;
			/** Set when the user can fix the cause, so the picker can say how. */
			reason?: AgentModelsUnavailableReason;
	  };

/**
 * Why a Foundry credential has no deployment list, written for the Agent
 * Builder, which tells the user how to fix it.
 */
const FOUNDRY_UNAVAILABLE_MESSAGES: Record<AgentModelsUnavailableReason, string> = {
	endpoint_type_unsupported:
		'This Azure OpenAI credential uses the Classic endpoint type. Agents need a Microsoft Foundry credential. Ask the user to select or create one.',
	project_missing:
		'This Microsoft Foundry credential has no project, so n8n cannot list its deployments. Ask the user to add the Foundry project to the credential.',
	project_not_found:
		'Microsoft Foundry does not know the project on this credential. Ask the user to check the project name in the credential.',
};

interface ModelLookupOptions {
	useEvalModelCatalog?: boolean;
}

/**
 * Fetches a provider's live chat-model list for a credential, via the shared
 * `@n8n/ai-utilities/model-discovery` functions (the same provider knowledge
 * that backs the chat sub-nodes' model dropdowns). Nothing from
 * `@n8n/n8n-nodes-langchain` is loaded on this path.
 *
 * The credential must be usable by the user within the given project.
 * Agent lookups exclude resolvable credentials and credentials available only
 * through the personal route.
 */
@Service()
export class BuilderModelLiveLookupService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly outboundHttp: OutboundHttp,
		private readonly aiGatewayService: AiGatewayService,
		private readonly azureFoundryDeploymentsService: AzureFoundryDeploymentsService,
	) {}

	/**
	 * Returns `{ name, value }` pairs (value = the provider's model id, exactly
	 * as the provider API expects it). For the n8n Connect managed tag, resolves
	 * the synthetic gateway credential (so discovery hits the gateway's
	 * allowlisted `/models`); otherwise the credential must be usable by the user
	 * in the project, its type must match, and the provider must support discovery.
	 */
	async list(
		user: User,
		projectId: string,
		credentialId: string,
		credentialType: string,
		provider: string,
		options?: ModelLookupOptions,
	): Promise<ModelChoice[]> {
		const result = await this.lookup(
			user,
			projectId,
			credentialId,
			credentialType,
			provider,
			options,
		);
		if (result.status === 'success') return result.models;
		if (result.reason) throw new UserError(FOUNDRY_UNAVAILABLE_MESSAGES[result.reason]);
		throw result.error;
	}

	async lookup(
		user: User,
		projectId: string,
		credentialId: string,
		credentialType: string,
		provider: string,
		options?: ModelLookupOptions,
	): Promise<LiveModelLookupResult> {
		if (credentialId === AI_GATEWAY_MANAGED_TAG) {
			if (options?.useEvalModelCatalog) {
				return this.getEvalModelCatalog(credentialType, provider, 'managed');
			}
			return await this.lookupAiGatewayManagedModels(projectId, provider, user);
		}

		const usable = await this.findUsableCredential(user, projectId, credentialId, [credentialType]);
		if (options?.useEvalModelCatalog) {
			return this.getEvalModelCatalog(credentialType, provider, 'curated');
		}

		const credentialData = await decryptAgentCredential(this.credentialsHelper, usable, {
			projectId,
			userId: user.id,
		});

		if (provider === 'azure-openai') return await this.listFoundryDeployments(credentialData);
		return await this.discoverModels(provider, credentialData);
	}

	/**
	 * Lists the deployments of the Microsoft Foundry project on an Azure OpenAI
	 * credential. The deployment names are the exact model ids, so the list is
	 * authoritative (`endpoint-only`) and has no static catalog fallback.
	 */
	async lookupAzureFoundryDeployments(
		user: User,
		projectId: string,
		credentialId: string,
	): Promise<LiveModelLookupResult> {
		const usable = await this.findUsableCredential(
			user,
			projectId,
			credentialId,
			getAgentModelProviderCredentialTypes('azure-openai'),
		);
		const credentialData = await decryptAgentCredential(this.credentialsHelper, usable, {
			projectId,
			userId: user.id,
		});

		return await this.listFoundryDeployments(credentialData);
	}

	private async listFoundryDeployments(
		credentialData: Record<string, unknown>,
	): Promise<LiveModelLookupResult> {
		const result = await this.azureFoundryDeploymentsService.list(credentialData);
		if (result.status === 'unavailable') {
			const { error, reason } = result;
			return { status: 'unavailable', error, reason, policy: 'endpoint-only' };
		}
		return {
			status: 'success',
			models: result.deployments.map(({ id, name, modelName }) => ({
				name,
				value: id,
				...(modelName ? { servedModel: modelName } : {}),
			})),
			policy: 'endpoint-only',
		};
	}

	/** The credential must be usable by the user in the project and have one of the given types. */
	private async findUsableCredential(
		user: User,
		projectId: string,
		credentialId: string,
		credentialTypes: readonly string[],
	) {
		const usableCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			user,
			{ projectId, excludePersonalRoute: true, excludeResolvable: true },
		);
		const usable = usableCredentials.find((c) => c.id === credentialId);
		if (!usable || !credentialTypes.includes(usable.type)) {
			throw new Error(`Credential ${credentialId} not found or not accessible`);
		}
		return usable;
	}

	private getEvalModelCatalog(
		credentialType: string,
		provider: string,
		policy: ModelCatalogPolicy,
	): LiveModelLookupResult {
		const configuredDefault = LLM_PROVIDER_DEFAULTS[credentialType];
		const model =
			configuredDefault?.provider === provider && configuredDefault.defaultModel
				? configuredDefault.defaultModel
				: `eval-${provider}-model`;

		return {
			status: 'success',
			models: [{ name: model, value: model }],
			policy,
		};
	}

	/**
	 * Looks up the chat models n8n Connect (AI Gateway) allows for a provider.
	 * Gateway resolution or discovery failures are returned as managed-policy
	 * unavailability so `list` can preserve its throwing behavior.
	 */
	private async lookupAiGatewayManagedModels(
		projectId: string,
		provider: string,
		user?: User,
	): Promise<LiveModelLookupResult> {
		try {
			const credentialType = await this.aiGatewayService.getCredentialTypeForProvider(provider);
			if (!credentialType) {
				throw new Error(`Gateway credits do not support the "${provider}" model provider`);
			}
			const raw = await this.aiGatewayService.getSyntheticCredential({
				credentialType,
				userId: user?.id,
				projectId,
			});
			return await this.discoverModels(provider, raw, 'managed');
		} catch (error) {
			return { status: 'unavailable', error, policy: 'managed' };
		}
	}

	/**
	 * Runs provider model discovery against a resolved credential record (a
	 * decrypted stored credential or the gateway synthetic credential),
	 * preserving the applicable catalog policy.
	 */
	private async discoverModels(
		provider: string,
		rawData: object,
		policyOverride?: ModelCatalogPolicy,
	): Promise<LiveModelLookupResult> {
		const { isOpenAiCustomEndpoint, listModelsForProvider } = await import(
			'@n8n/ai-utilities/model-discovery'
		);
		const credentialData: Record<string, unknown> = { apiKey: '', ...rawData };
		const mapped = mapCredentialForProvider(provider, credentialData);
		const apiKey = typeof mapped.apiKey === 'string' ? mapped.apiKey : '';
		const baseURL =
			typeof mapped.baseURL === 'string' && mapped.baseURL ? mapped.baseURL : undefined;
		const policy =
			policyOverride ??
			(provider === 'openai' && isOpenAiCustomEndpoint(baseURL) ? 'endpoint-only' : 'curated');
		const headers = this.getOpenAiHeaders(provider, credentialData);

		try {
			const models = await listModelsForProvider(provider, {
				apiKey,
				baseURL,
				fetch: createAiProxyFetch(this.outboundHttp),
				...(headers ? { headers } : {}),
			});

			// Every supported chat provider offers models, so an empty list means a
			// broken request or a drifted response shape, not a zero-model account.
			if (models.length === 0) {
				throw new Error(`Provider ${provider} returned no models`);
			}

			return {
				status: 'success',
				models: models.map((model) => ({
					name: model.name,
					value: model.id,
					...(model.priority !== undefined ? { priority: model.priority } : {}),
				})),
				policy,
			};
		} catch (error) {
			return { status: 'unavailable', error, policy };
		}
	}

	private getOpenAiHeaders(
		provider: string,
		credentialData: Record<string, unknown>,
	): Record<string, string> | undefined {
		if (provider !== 'openai') return undefined;

		const headers: Record<string, string> = {};
		if (
			typeof credentialData.organizationId === 'string' &&
			credentialData.organizationId.length > 0
		) {
			headers['OpenAI-Organization'] = credentialData.organizationId;
		}

		if (
			credentialData.header === true &&
			typeof credentialData.headerName === 'string' &&
			credentialData.headerName.length > 0 &&
			typeof credentialData.headerValue === 'string'
		) {
			const normalizedName = credentialData.headerName.toLowerCase();
			let headerName = credentialData.headerName;
			if (normalizedName === 'authorization') {
				headerName = 'Authorization';
			} else if (normalizedName === 'openai-organization') {
				headerName = 'OpenAI-Organization';
			}
			headers[headerName] = credentialData.headerValue;
		}

		return Object.keys(headers).length > 0 ? headers : undefined;
	}
}
