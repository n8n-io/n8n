import type {
	CredentialProvider,
	ResolvedCredential,
	CredentialListItem,
	FetchFn,
} from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import type { CredentialsEntity, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsHelper } from '@/credentials-helper';
import { AiGatewayService } from '@/services/ai-gateway.service';

import type { AiGatewayModelCredentialResolver } from '../json-config/model-config';
import type { AiGatewaySearchCredentialResolver } from '../json-config/web-search-credential';
import { decryptAgentCredential } from '../utils/decrypt-agent-credential';

function toResolvedCredential(data: unknown): ResolvedCredential & { apiKey: string } {
	const resolved = data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {};
	const apiKey = 'apiKey' in resolved && typeof resolved.apiKey === 'string' ? resolved.apiKey : '';

	return { ...resolved, apiKey };
}

/**
 * Resolves and lists n8n credentials for use by SDK agents.
 *
 * This is not a DI-managed singleton — a new instance is created per request,
 * scoped to a specific project. When a request user is provided, list/resolve
 * follows the same credential set as the workflow editor for that project.
 * Published runtime execution can omit the user and stays project-scoped.
 */
export class AgentsCredentialProvider
	implements CredentialProvider, AiGatewayModelCredentialResolver, AiGatewaySearchCredentialResolver
{
	/**
	 * AI Gateway tokens this provider set in model configs, and the origins they
	 * are sent to. A sub-agent built later can get a newer token, so there can be
	 * more than one.
	 */
	private aiGatewayModelMint?: {
		credentialType: string;
		configTokens: Set<string>;
		origins: Set<string>;
	};

	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly projectId: string,
		private readonly user?: User,
		private readonly agentId?: string,
	) {}

	/**
	 * Mint the n8n Connect (AI Gateway) synthetic credential for a model slot
	 * marked with `AI_GATEWAY_MANAGED_TAG`, keyed by the model's provider prefix
	 * (e.g. `openai`). The provider → credential-type mapping and support check
	 * live in `AiGatewayService`, resolved lazily so no gateway wiring leaks into
	 * this provider's construction sites.
	 */
	async resolveAiGatewayModelCredential(provider: string): Promise<ResolvedCredential> {
		const credentialType =
			await Container.get(AiGatewayService).getCredentialTypeForProvider(provider);
		if (!credentialType) {
			throw new UserError(`Gateway credits do not support the "${provider}" model provider.`);
		}
		return await this.mintAiGatewayModelCredential(credentialType);
	}

	/**
	 * Create a model `fetch` that sets the current AI Gateway token on a request
	 * that carries a token from this provider. The token expires, but the runtime
	 * that holds the model config can live longer. Other requests pass through.
	 */
	createAiGatewayTokenRefreshFetch(baseFetch: FetchFn): FetchFn {
		return async (input, init) => {
			const mint = this.aiGatewayModelMint;
			const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
			if (!mint || !init?.headers || !URL.canParse(url) || !mint.origins.has(new URL(url).origin)) {
				return await baseFetch(input, init);
			}

			const headers = new Headers(init.headers);
			let token: string | undefined;
			for (const [name, value] of [...headers]) {
				const sentToken = value.replace(/^Bearer /, '');
				if (!mint.configTokens.has(sentToken)) continue;
				token ??= await this.mintGatewayCredential(mint.credentialType).then(
					(credential) => toResolvedCredential(credential).apiKey,
					// The sent token can still be valid, so a failed mint must not fail the request.
					(error: unknown) => {
						Container.get(Logger).warn(
							'Failed to refresh the AI Gateway token of a model request',
							{
								error: error instanceof Error ? error.message : String(error),
							},
						);
						return undefined;
					},
				);
				if (!token) return await baseFetch(input, init);
				headers.set(name, value.replace(sentToken, token));
			}
			if (!token) return await baseFetch(input, init);

			return await baseFetch(input, { ...init, headers });
		};
	}

	/**
	 * Mint the n8n Connect (AI Gateway) synthetic credential for a web-search
	 * provider, keyed by n8n credential type (e.g. `braveSearchApi`). Same gateway
	 * mint as models — the returned credential points the search at the gateway
	 * instead of the real provider, so no user API key is needed.
	 */
	async resolveAiGatewaySearchCredential(credentialType: string): Promise<ResolvedCredential> {
		return toResolvedCredential(await this.mintGatewayCredential(credentialType));
	}

	/** Mint a model credential and record its token for `createAiGatewayTokenRefreshFetch`. */
	private async mintAiGatewayModelCredential(credentialType: string) {
		const credential = await this.mintGatewayCredential(credentialType);
		const mint = (this.aiGatewayModelMint ??= {
			credentialType,
			configTokens: new Set(),
			origins: new Set(),
		});
		const { apiKey } = toResolvedCredential(credential);
		if (apiKey) mint.configTokens.add(apiKey);
		for (const value of Object.values(credential)) {
			if (typeof value === 'string' && URL.canParse(value)) mint.origins.add(new URL(value).origin);
		}
		return credential;
	}

	/** Mint the gateway synthetic credential for an already-resolved credential type. */
	private async mintGatewayCredential(credentialType: string) {
		return await Container.get(AiGatewayService).getSyntheticCredential({
			credentialType,
			userId: this.user?.id,
			projectId: this.projectId,
			agentId: this.agentId,
		});
	}

	/**
	 * Resolve a credential by ID, then decrypt and return the usable data.
	 *
	 * Only credentials visible to this provider's scope are considered — the
	 * same user-scoped intersection as `list()` when a request user is set, so
	 * a user can never decrypt a credential they wouldn't see listed.
	 */
	async resolve(credentialId: string): Promise<ResolvedCredential> {
		const credential = await this.findCredentialEntity(credentialId);

		if (!credential) {
			throw new Error(`Credential "${credentialId}" not found or not accessible`);
		}

		const data = await decryptAgentCredential(Container.get(CredentialsHelper), credential, {
			userId: this.user?.id,
			projectId: this.projectId,
		});
		return toResolvedCredential(data);
	}

	/**
	 * List all credentials available in this provider's scope.
	 */
	async list(): Promise<CredentialListItem[]> {
		if (this.user) {
			const accessible = await this.getUserAccessibleCredentials();

			return accessible.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
			}));
		}

		// this fetches all credentials accessible to the project
		const accessible = await this.getAllProjectAndGlobalCredentials();

		return accessible.map((c) => ({
			id: c.id,
			name: c.name,
			type: c.type,
		}));
	}

	private async findCredentialEntity(credentialId: string): Promise<CredentialsEntity | null> {
		if (this.user) {
			// Same user-scoped intersection as list() — a credential the project
			// or global scope allows but this user can't see must not resolve.
			const userAccessible = await this.getUserAccessibleCredentials();
			if (!userAccessible.some((c) => c.id === credentialId)) return null;
		}

		const accessible = await this.getAllProjectAndGlobalCredentials();
		return accessible.find((c) => c.id === credentialId) ?? null;
	}

	private async getUserAccessibleCredentials() {
		if (!this.user) return [];
		// this fetches intersection of project and global credentials the user has access to
		// credentials available to project but not user are not listed
		// used to limit available credentials to the user's access when calling agent builder
		return await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(this.user, {
			projectId: this.projectId,
			excludePersonalRoute: true,
		});
	}

	private async getAllProjectAndGlobalCredentials(): Promise<CredentialsEntity[]> {
		const projectCredentials = await this.credentialsService.findAllCredentialIdsForProject(
			this.projectId,
		);
		// No `includeData` — only id/name/type are read here, and `getDecrypted`
		// re-reads the row it decrypts.
		const globalCredentials = await this.credentialsService.findAllGlobalCredentialIds();
		const allCredsSet = new Set();
		const allCreds: CredentialsEntity[] = [];

		const addCreds = (creds: CredentialsEntity[]) => {
			for (const cred of creds) {
				if (!allCredsSet.has(cred.id)) {
					allCredsSet.add(cred.id);
					allCreds.push(cred);
				}
			}
		};

		addCreds(projectCredentials);
		addCreds(globalCredentials);

		return allCreds;
	}
}
