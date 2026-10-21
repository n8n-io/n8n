import { AI_GATEWAY_MANAGED_TAG, getAgentModelProviderCredentialTypes } from '@n8n/api-types';
import { createEntraTokenProvider, isAzureEntraCredential } from '@n8n/agents';
import { OutboundHttp, SsrfProtectionService, type SsrfBridge } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { SsrfProtectionConfig } from '@n8n/config';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsHelper } from '@/credentials-helper';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import type { ModelChoice } from './model-lookup.types';
import { mapCredentialForProvider } from '../json-config/credential-field-mapping';
import { LLM_PROVIDER_DEFAULTS } from '../llm-provider-defaults';
import { decryptAgentCredential } from '../utils/decrypt-agent-credential';

export type ModelCatalogPolicy = 'curated' | 'endpoint-only' | 'managed';

export type LiveModelLookupResult =
	| {
			status: 'success';
			models: ModelChoice[];
			policy: ModelCatalogPolicy;
	  }
	| { status: 'unavailable'; error: unknown; policy: ModelCatalogPolicy };

interface ModelLookupOptions {
	useEvalModelCatalog?: boolean;
}

/**
 * Audience for the Foundry deployments-list call. Mirrors
 * `AZURE_AI_FOUNDRY_AUDIENCE` in the LmChatAzureOpenAi node: each tenant's
 * Entra ID app registration grants access per audience, so this is requested
 * only for this call, not for inference tokens.
 */
const AZURE_AI_FOUNDRY_AUDIENCE = 'https://ai.azure.com';

/**
 * The usable-credential check. `azure-openai` is served by two credential
 * types (API key, Entra ID), so either is accepted; for every other provider
 * the requested type must match exactly.
 */
function isAcceptedCredentialType(provider: string, actual: string, requested: string): boolean {
	if (provider === 'azure-openai') {
		return getAgentModelProviderCredentialTypes(provider).includes(actual);
	}
	return actual === requested;
}

/**
 * Fetches a provider's live chat-model list for a credential, via the shared
 * `@n8n/ai-utilities/model-discovery` functions (the same provider knowledge
 * that backs the chat sub-nodes' model dropdowns). Nothing from
 * `@n8n/n8n-nodes-langchain` is loaded on this path.
 *
 * The credential must be usable by the user within the given project — the
 * same set as the workflow editor's credential picker.
 */
@Service()
export class BuilderModelLiveLookupService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly outboundHttp: OutboundHttp,
		private readonly aiGatewayService: AiGatewayService,
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly ssrfProtectionConfig: SsrfProtectionConfig,
	) {}

	/**
	 * The bridge that applies the instance's outbound network policy to Entra
	 * token requests, so a stored `accessTokenUrl` cannot send the client
	 * secret to a host the instance is not allowed to reach. `undefined` when
	 * the SSRF guard is disabled.
	 */
	private getSsrfBridge(): SsrfBridge | undefined {
		return this.ssrfProtectionConfig.enabled ? this.ssrfProtectionService : undefined;
	}

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
		if (result.status === 'unavailable') throw result.error;
		return result.models;
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

		const usableCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			user,
			{ projectId, excludePersonalRoute: true },
		);
		const usable = usableCredentials.find((c) => c.id === credentialId);
		if (!usable || !isAcceptedCredentialType(provider, usable.type, credentialType)) {
			throw new Error(`Credential ${credentialId} not found or not accessible`);
		}
		if (options?.useEvalModelCatalog) {
			return this.getEvalModelCatalog(credentialType, provider, 'curated');
		}

		const credentialData = await decryptAgentCredential(this.credentialsHelper, usable, {
			projectId,
			userId: user.id,
		});

		if (provider === 'azure-openai') {
			return await this.discoverAzureFoundryDeployments(credentialData);
		}
		return await this.discoverModels(provider, credentialData);
	}

	private getEvalModelCatalog(
		credentialType: string,
		provider: string,
		policy: ModelCatalogPolicy,
	): LiveModelLookupResult {
		const configuredDefault = LLM_PROVIDER_DEFAULTS[credentialType];
		const model =
			configuredDefault?.provider === provider
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

	/**
	 * Lists a Foundry project's chat-capable deployments for the agent model
	 * picker. Azure needs a project and pre-built auth headers, so it cannot go
	 * through `listModelsForProvider` (see `providers/azure.ts` in
	 * `@n8n/ai-utilities`); the shared helper is called directly instead.
	 *
	 * The deployment *name* is what the inference call accepts, so it becomes
	 * the model id the picker offers and saves.
	 */
	private async discoverAzureFoundryDeployments(
		rawData: Record<string, unknown>,
	): Promise<LiveModelLookupResult> {
		// The deployments-list endpoint only exists on the Foundry data plane: a
		// Classic (kind: OpenAI) resource has no services.ai.azure.com host, and
		// the list needs a project. Both keep the static-catalog fallback, which
		// the caller applies when this method throws.
		const mapped = mapCredentialForProvider('azure-openai', rawData);
		if (mapped.endpointType !== 'foundry') {
			throw new UserError('Only a Microsoft Foundry credential can list deployments');
		}
		const project = typeof rawData.project === 'string' ? rawData.project.trim() : '';
		if (!project) {
			throw new UserError('The credential has no Microsoft Foundry project set');
		}
		const foundryEndpoint = typeof mapped.baseURL === 'string' ? mapped.baseURL : '';
		if (!foundryEndpoint) {
			throw new UserError('The credential has no Microsoft Foundry endpoint set');
		}

		// The list call takes the origin of the Foundry endpoint.
		const baseURL = new URL(foundryEndpoint).origin;
		const { listAzureOpenAiModels } = await import('@n8n/ai-utilities/model-discovery');

		try {
			let headers: Record<string, string>;
			if (isAzureEntraCredential(rawData)) {
				// The deployments list needs a token for the Foundry audience, minted
				// through the instance's SSRF policy.
				const token = await createEntraTokenProvider(
					mapped,
					AZURE_AI_FOUNDRY_AUDIENCE,
					this.getSsrfBridge(),
				)();
				headers = { Authorization: `Bearer ${token}` };
			} else if (typeof rawData.apiKey === 'string' && rawData.apiKey.trim() !== '') {
				headers = { 'api-key': rawData.apiKey };
			} else {
				throw new UserError('The credential has neither an API key nor a connected Entra ID');
			}

			const models = await listAzureOpenAiModels({
				baseURL,
				project,
				headers,
				fetch: createAiProxyFetch(this.outboundHttp),
			});
			// A project with no chat-capable deployments reads as a broken or
			// drifted call, mirroring the generic path's empty-list guard.
			if (models.length === 0) {
				throw new Error('The Azure project returned no deployments');
			}

			return {
				status: 'success',
				// The live deployment list is authoritative: deployment names are
				// not catalog model ids, so the static catalog must not prune them.
				models: models.map((model) => ({ name: model.name, value: model.id })),
				policy: 'endpoint-only',
			};
		} catch (error) {
			return { status: 'unavailable', error, policy: 'endpoint-only' };
		}
	}
}
