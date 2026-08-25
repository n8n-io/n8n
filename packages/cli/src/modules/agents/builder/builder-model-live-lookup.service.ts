import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsHelper } from '@/credentials-helper';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import { mapCredentialForProvider } from '../json-config/credential-field-mapping';

export type ModelCatalogPolicy = 'curated' | 'endpoint-only' | 'managed';

export type LiveModelLookupResult =
	| {
			status: 'success';
			models: Array<{ name: string; value: string }>;
			policy: ModelCatalogPolicy;
	  }
	| { status: 'unavailable'; error: unknown; policy: ModelCatalogPolicy };

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
	): Promise<Array<{ name: string; value: string }>> {
		const result = await this.lookup(user, projectId, credentialId, credentialType, provider);
		if (result.status === 'unavailable') throw result.error;
		return result.models;
	}

	async lookup(
		user: User,
		projectId: string,
		credentialId: string,
		credentialType: string,
		provider: string,
	): Promise<LiveModelLookupResult> {
		if (credentialId === AI_GATEWAY_MANAGED_TAG) {
			return await this.lookupAiGatewayManagedModels(projectId, provider, user);
		}

		const usableCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			user,
			{ projectId },
		);
		const usable = usableCredentials.find((c) => c.id === credentialId);
		if (!usable || usable.type !== credentialType) {
			throw new Error(`Credential ${credentialId} not found or not accessible`);
		}

		const credentialData = await this.decryptWithExpressions(usable, projectId, user);

		return await this.discoverModels(provider, credentialData);
	}

	/**
	 * Decrypt the way node execution does, so credential defaults are applied and
	 * expressions resolved. A base URL computed from sibling fields (region,
	 * workspace) is otherwise absent or still literal expression text.
	 *
	 * There is no workflow or execution here, so `additionalData` comes from
	 * `getBase()` and the mode is `internal` — which skips dynamic-credential
	 * resolution, leaving a per-user credential on its static stored data. Same
	 * as `AgentsCredentialProvider`.
	 */
	private async decryptWithExpressions(
		credential: { id: string; name: string; type: string },
		projectId: string,
		user: User,
	): Promise<ICredentialDataDecryptedObject> {
		// Imported lazily: pulls in the execution stack, and model lookup is not on
		// every request.
		const { getBase } = await import('@/workflow-execute-additional-data.js');
		const additionalData = await getBase({ userId: user.id, projectId });

		return await this.credentialsHelper.getDecrypted(
			additionalData,
			{ id: credential.id, name: credential.name },
			credential.type,
			'internal',
		);
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
				throw new Error(`n8n credits does not support the "${provider}" model provider`);
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
				fetch: createAiProxyFetch(this.outboundHttp) as typeof globalThis.fetch,
				...(headers ? { headers } : {}),
			});

			// Every supported chat provider offers models, so an empty list means a
			// broken request or a drifted response shape, not a zero-model account.
			if (models.length === 0) {
				throw new Error(`Provider ${provider} returned no models`);
			}

			return {
				status: 'success',
				models: models.map((model) => ({ name: model.name, value: model.id })),
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
			const headerName =
				normalizedName === 'authorization'
					? 'Authorization'
					: normalizedName === 'openai-organization'
						? 'OpenAI-Organization'
						: credentialData.headerName;
			headers[headerName] = credentialData.headerValue;
		}

		return Object.keys(headers).length > 0 ? headers : undefined;
	}
}
