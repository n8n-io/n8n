import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import {
	InvalidGrantError,
	InvalidTargetError,
} from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type {
	AuthorizationParams,
	OAuthServerProvider,
} from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type {
	OAuthClientInformationFull,
	OAuthTokens,
	OAuthTokenRevocationRequest,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type {
	McpClientConnectedPeriod,
	McpClientTypeFilter,
	McpOAuthClientRegistration,
} from '@n8n/api-types';
import {
	getMcpClientType,
	MANUAL_OAUTH_CLIENT_GRANT_TYPES,
	MAX_OAUTH_REDIRECT_URI_LENGTH,
	MAX_OAUTH_REDIRECT_URIS,
	MCP_CLIENT_TYPE_FILTER_BUCKETS,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { randomBytes, randomUUID } from 'crypto';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { INSTANCE_MCP_RESOURCE_ID } from '@/modules/mcp/mcp-protected-resource';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import { UserManagementMailer } from '@/user-management/email';

import { OAuthClient } from './database/entities/oauth-client.entity';
import { OAuthClientRepository } from './database/repositories/oauth-client.repository';
import { UserConsentRepository } from './database/repositories/oauth-user-consent.repository';
import { getRequestedRedirectUri } from './loopback-redirect-uri-context';
import { OAuthAuthorizationCodeService } from './oauth-authorization-code.service';
import { OAuthSessionService } from './oauth-session.service';
import { OAuthTokenService } from './oauth-token.service';
import { buildOAuthClientLimitReachedMessage, OAuthClientLimitReachedError } from './oauth.errors';

export type ConnectedOAuthClientOwner = {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
};

/**
 * A client the user has consented to (enriched with the grant details of the
 * consent), or one they manually pre-registered and have not connected with yet.
 */
export type ConnectedOAuthClient = Omit<
	OAuthClient,
	'clientSecret' | 'clientSecretExpiresAt' | 'setUpdateDate' | 'createdBy' | 'creator'
> & {
	/** Unix ms of the consent; null for a manual client not yet connected with. */
	grantedAt: number | null;
	scopes: string[];
	registration: McpOAuthClientRegistration;
	/** Whether the caller may edit or delete the registration itself. */
	canManage: boolean;
	/**
	 * Consent owner, or the creator of a manual client that has no consent yet;
	 * present only when listing across users (ownership=all).
	 */
	owner?: ConnectedOAuthClientOwner;
};

/** Name and redirect URIs of a manually registered client, as typed by the user. */
export type ManualClientInput = {
	name: string;
	redirectUris: string[];
	/** Issue a client secret; omitted or false registers a public client. */
	confidential?: boolean;
};

/** Bytes of entropy behind a generated client secret. */
const CLIENT_SECRET_BYTES = 32;

/**
 * Secrets are stored as issued, matching the DCR path: the MCP SDK's client
 * authentication compares the value it reads from `clientsStore.getClient`
 * against the one the client sent, so a hash here would fail every exchange.
 * Hashing them means taking that comparison over from the SDK.
 */
function generateClientSecret(): string {
	return randomBytes(CLIENT_SECRET_BYTES).toString('base64url');
}

/** Per-ownership consent totals for the connected-clients tab badges. */
export type ConnectedOAuthClientTotals = { mine: number; all?: number };

export type ListConnectedClientsOptions = {
	ownership?: 'mine' | 'all';
	skip?: number;
	take?: number;
	name?: string;
	ownerId?: string;
	type?: McpClientTypeFilter;
	connected?: McpClientConnectedPeriod;
};

/** Whether a client's derived brand type falls in the requested filter bucket. */
function matchesTypeFilter(name: string, type: McpClientTypeFilter): boolean {
	const clientType = getMcpClientType(name);
	return clientType !== null && MCP_CLIENT_TYPE_FILTER_BUCKETS[type].includes(clientType);
}

function toOwner(user: User): ConnectedOAuthClientOwner {
	return {
		id: user.id,
		firstName: user.firstName ?? null,
		lastName: user.lastName ?? null,
		email: user.email,
	};
}

/** The same user can both own a consent and have registered a client by hand. */
function dedupeById(owners: ConnectedOAuthClientOwner[]): ConnectedOAuthClientOwner[] {
	return [...new Map(owners.map((owner) => [owner.id, owner])).values()];
}

/** Sort owners by display name so the "Connected by" dropdown reads naturally. */
function sortOwners(owners: ConnectedOAuthClientOwner[]): ConnectedOAuthClientOwner[] {
	return [...owners].sort((a, b) => {
		const nameA = [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email;
		const nameB = [b.firstName, b.lastName].filter(Boolean).join(' ') || b.email;
		return nameA.localeCompare(nameB);
	});
}

/**
 * OAuth 2.1 server implementation shared by all registered protected resources.
 * Implements MCP SDK OAuthServerProvider interface for client registration, authorization, and token management
 */
@Service()
export class OAuthServerService implements OAuthServerProvider {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly oauthSessionService: OAuthSessionService,
		private readonly oauthClientRepository: OAuthClientRepository,
		private readonly tokenService: OAuthTokenService,
		private readonly authorizationCodeService: OAuthAuthorizationCodeService,
		private readonly userConsentRepository: UserConsentRepository,
		private readonly resourceRegistry: ProtectedResourceRegistry,
		private readonly mailer: UserManagementMailer,
		private readonly urlService: UrlService,
		private readonly eventService: EventService,
	) {}

	get clientsStore(): OAuthRegisteredClientsStore {
		return {
			getClient: async (clientId: string): Promise<OAuthClientInformationFull | undefined> => {
				const client = await this.oauthClientRepository.findOneBy({ id: clientId });
				if (!client) {
					return await this.resolveVirtualClient(clientId);
				}

				// Some clients echo back the `scope` they saw on registration and
				// reject responses that include `scope: ''`. Omit the field
				// entirely when no scopes are advertised.
				const supportedScopes = this.resourceRegistry.getAllScopes();

				return {
					client_id: client.id,
					client_name: client.name,
					redirect_uris: this.registeredRedirectUris(client),
					grant_types: client.grantTypes,
					token_endpoint_auth_method: client.tokenEndpointAuthMethod,
					...(client.clientSecret && { client_secret: client.clientSecret }),
					...(client.clientSecretExpiresAt && {
						client_secret_expires_at: client.clientSecretExpiresAt,
					}),
					response_types: ['code'],
					...(supportedScopes.length > 0 && { scope: supportedScopes.join(' ') }),
					logo_uri: undefined,
					tos_uri: undefined,
				};
			},
			registerClient: async (
				client: OAuthClientInformationFull,
			): Promise<OAuthClientInformationFull> => {
				this.validateClientRegistration(client);

				await this.oauthClientRepository.insert({
					id: client.client_id,
					name: client.client_name,
					redirectUris: client.redirect_uris,
					grantTypes: client.grant_types,
					clientSecret: client.client_secret ?? null,
					clientSecretExpiresAt: client.client_secret_expires_at ?? null,
					tokenEndpointAuthMethod: client.token_endpoint_auth_method ?? 'none',
					isFirstParty: false,
				});

				await this.enforceClientLimit(client.client_id);

				return client;
			},
		};
	}

	/** Returns true when the instance is already at or above the registered-client cap. */
	async isClientLimitReached(): Promise<boolean> {
		const clientCount = await this.oauthClientRepository.countBy({ isFirstParty: false });
		return clientCount >= this.globalConfig.endpoints.mcpMaxRegisteredClients;
	}

	async getInstanceClientStats(): Promise<{
		count: number;
		limit: number;
		atCapacity: boolean;
	}> {
		const count = await this.oauthClientRepository.countBy({ isFirstParty: false });
		const limit = this.globalConfig.endpoints.mcpMaxRegisteredClients;
		return { count, limit, atCapacity: count >= limit };
	}

	/**
	 * Check count after insert to avoid race condition between count() and insert().
	 * If over limit, rolls back by deleting the just-inserted client.
	 *
	 * Throws `OAuthClientLimitReachedError` (a `ServerError` subclass), which the
	 * MCP SDK's register handler will surface as a 500 with our descriptive body
	 * — matching the response shape of the pre-check guard at the route layer.
	 */
	private async enforceClientLimit(clientId: string): Promise<void> {
		const clientCount = await this.oauthClientRepository.countBy({ isFirstParty: false });
		const limit = this.globalConfig.endpoints.mcpMaxRegisteredClients;
		if (clientCount > limit) {
			await this.oauthClientRepository.delete({ id: clientId });
			this.logger.warn(
				'OAuth client registration rejected: instance limit reached (post-insert rollback)',
				{ limit, clientCount },
			);
			throw new OAuthClientLimitReachedError(limit);
		}
	}

	/**
	 * On-demand per-trigger virtual client for a first-party protected resource
	 * (form trigger). Public + PKCE, single redirect_uri = the trigger URL (which
	 * equals the client_id and the resource URL). The row is persisted lazily only
	 * to satisfy the FKs from auth codes / tokens; it is never a DCR client and is
	 * excluded from the registered-client cap.
	 */
	private async resolveVirtualClient(
		clientId: string,
	): Promise<OAuthClientInformationFull | undefined> {
		// First-party resources are form triggers served under the (test) webhook base
		// URL, so a client_id that isn't can never resolve to one. Skip the resolver
		// sweep + lazy upsert for anything else, so the unauthenticated /authorize path
		// can't be used to fan out DB lookups on arbitrary client_ids.
		if (!this.isFormTriggerClientId(clientId)) {
			return undefined;
		}

		const resource = await this.resourceRegistry.getByResourceUrl(clientId);
		if (!resource?.isFirstParty) {
			return undefined;
		}

		await this.oauthClientRepository.upsert(
			{
				id: clientId,
				name: resource.displayName ?? clientId,
				redirectUris: [clientId],
				grantTypes: ['authorization_code'],
				tokenEndpointAuthMethod: 'none',
				clientSecret: null,
				clientSecretExpiresAt: null,
				isFirstParty: true,
			},
			['id'],
		);

		return {
			client_id: clientId,
			client_name: resource.displayName ?? clientId,
			redirect_uris: [clientId],
			grant_types: ['authorization_code'],
			token_endpoint_auth_method: 'none',
			response_types: ['code'],
			logo_uri: undefined,
			tos_uri: undefined,
		};
	}

	/** Whether a client_id could be a form-trigger resource URL (served under a webhook base URL). */
	private isFormTriggerClientId(clientId: string): boolean {
		return [this.urlService.getWebhookBaseUrl(), this.urlService.getTestWebhookBaseUrl()]
			.map((base) => (base.endsWith('/') ? base : `${base}/`))
			.some((base) => clientId.startsWith(base));
	}

	private validateClientRegistration(client: OAuthClientInformationFull): void {
		if (!client.client_name) {
			throw new Error('client_name is required');
		}

		if (!client.grant_types || client.grant_types.length === 0) {
			throw new Error('grant_types is required');
		}

		if (!client.redirect_uris || client.redirect_uris.length === 0) {
			throw new Error('redirect_uris is required');
		}

		if (client.redirect_uris.length > MAX_OAUTH_REDIRECT_URIS) {
			throw new Error(`redirect_uris exceeds maximum count of ${MAX_OAUTH_REDIRECT_URIS}`);
		}

		for (const uri of client.redirect_uris) {
			if (uri.length > MAX_OAUTH_REDIRECT_URI_LENGTH) {
				throw new Error(
					`redirect_uri exceeds maximum length of ${MAX_OAUTH_REDIRECT_URI_LENGTH} characters`,
				);
			}
		}
	}

	/**
	 * Checks a requested redirect URI against the configured allowlist.
	 *
	 * Non-loopback URIs must match an allowlist entry exactly. Loopback URIs
	 * (localhost / 127.0.0.1 / [::1]) match a loopback allowlist entry that
	 * shares the same scheme, host and path regardless of port: native clients
	 * bind an ephemeral port at request time, so the port cannot be known in
	 * advance (RFC 8252 §7.3).
	 */
	private isRedirectUriAllowed(allowedUris: string[], redirectUri: string): boolean {
		if (allowedUris.includes(redirectUri)) {
			return true;
		}

		return this.matchesLoopbackIgnoringPort(allowedUris, redirectUri);
	}

	/**
	 * Whether one of `candidates` is the same loopback URI as `redirectUri` up to
	 * its port: same scheme, host and path, any port. Native clients bind an
	 * ephemeral port at request time, so the port cannot be known in advance
	 * (RFC 8252 §7.3).
	 */
	private matchesLoopbackIgnoringPort(candidates: string[], redirectUri: string): boolean {
		let requested: URL;
		try {
			requested = new URL(redirectUri);
		} catch {
			return false;
		}

		if (!this.isLoopbackHost(requested.hostname)) {
			return false;
		}

		return candidates.some((allowed) => {
			let candidate: URL;
			try {
				candidate = new URL(allowed);
			} catch {
				return false;
			}

			return (
				this.isLoopbackHost(candidate.hostname) &&
				candidate.protocol === requested.protocol &&
				candidate.hostname === requested.hostname &&
				candidate.pathname === requested.pathname
			);
		});
	}

	/**
	 * The client's registered redirect URIs as the MCP SDK's authorize handler
	 * sees them. That handler requires an exact match, so for a manually
	 * registered client the exact loopback URI of the in-flight request is added
	 * when it differs from a registered one only by port — the port a native
	 * client binds can't be typed into the form in advance (RFC 8252 §7.3).
	 *
	 * Not applied to DCR clients: those register the URI they will actually use.
	 */
	private registeredRedirectUris(client: OAuthClient): string[] {
		if (!client.createdBy) return client.redirectUris;

		const requested = getRequestedRedirectUri();
		if (!requested || client.redirectUris.includes(requested)) return client.redirectUris;

		return this.matchesLoopbackIgnoringPort(client.redirectUris, requested)
			? [...client.redirectUris, requested]
			: client.redirectUris;
	}

	private isLoopbackHost(hostname: string): boolean {
		return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
	}

	private async isManuallyRegistered(clientId: string): Promise<boolean> {
		const client = await this.oauthClientRepository.findOne({
			where: { id: clientId },
			select: { id: true, createdBy: true },
		});
		return client?.createdBy !== null && client?.createdBy !== undefined;
	}

	/**
	 * Pre-register a client by hand, for MCP clients that don't implement Dynamic
	 * Client Registration (Gemini) or that let the user supply their own client id
	 * (ChatGPT). The resulting `client_id` is pasted into the client's connector
	 * settings; from there the authorization ceremony is identical to a
	 * DCR-registered client's.
	 *
	 * Registered as a public client (`token_endpoint_auth_method: 'none'`): PKCE,
	 * not a secret, authenticates it at the token endpoint, which is the
	 * spec-standard mode for native and local clients (RFC 8252).
	 */
	async createManualClient(
		user: User,
		input: ManualClientInput,
	): Promise<{ client: OAuthClient; clientSecret?: string }> {
		if (await this.isClientLimitReached()) {
			const limit = this.globalConfig.endpoints.mcpMaxRegisteredClients;
			this.logger.warn('Manual OAuth client registration rejected: instance limit reached', {
				limit,
				userId: user.id,
			});
			// A REST error, not the SDK's `OAuthClientLimitReachedError`: this path
			// answers the n8n UI, not an OAuth client.
			throw new BadRequestError(buildOAuthClientLimitReachedMessage(limit));
		}

		const clientSecret = input.confidential ? generateClientSecret() : null;

		const client = await this.oauthClientRepository.save({
			id: randomUUID(),
			name: input.name,
			redirectUris: input.redirectUris,
			grantTypes: MANUAL_OAUTH_CLIENT_GRANT_TYPES,
			// `client_secret_post` rather than basic: the SDK's client authentication
			// only reads the secret from the request body.
			tokenEndpointAuthMethod: clientSecret ? 'client_secret_post' : 'none',
			clientSecret,
			clientSecretExpiresAt: null,
			createdBy: user.id,
		});

		try {
			await this.enforceClientLimit(client.id);
		} catch (error) {
			if (error instanceof OAuthClientLimitReachedError) {
				throw new BadRequestError(error.message);
			}
			throw error;
		}

		this.logger.info('OAuth client manually registered', {
			clientId: client.id,
			clientName: client.name,
			userId: user.id,
			confidential: !!clientSecret,
		});

		return { client, ...(clientSecret ? { clientSecret } : {}) };
	}

	/**
	 * Issue a new secret for a confidential manual client, invalidating the old
	 * one. Existing access and refresh tokens keep working: the secret
	 * authenticates the client at the token endpoint, it does not carry the grant.
	 */
	async rotateManualClientSecret(user: User, clientId: string): Promise<string> {
		const client = await this.findManageableManualClient(user, clientId);

		if (!client.clientSecret) {
			throw new BadRequestError('This client was registered without a secret');
		}

		client.clientSecret = generateClientSecret();
		await this.oauthClientRepository.save(client);

		this.logger.info('Manually registered OAuth client secret rotated', {
			clientId,
			userId: user.id,
		});

		return client.clientSecret;
	}

	/**
	 * Edit a manually registered client's name and redirect URIs. Only the
	 * registration owner or an instance manager may edit; DCR clients are owned by
	 * the client app that registered them and are never editable here.
	 */
	async updateManualClient(
		user: User,
		clientId: string,
		input: ManualClientInput,
	): Promise<OAuthClient> {
		const client = await this.findManageableManualClient(user, clientId);

		client.name = input.name;
		client.redirectUris = input.redirectUris;
		await this.oauthClientRepository.save(client);

		this.logger.info('Manually registered OAuth client updated', {
			clientId,
			userId: user.id,
		});

		return client;
	}

	/**
	 * A manually registered client the given user is allowed to change. Throws
	 * `NotFoundError` when it doesn't exist or wasn't manually registered — an
	 * existing DCR client must not be distinguishable through this endpoint.
	 */
	private async findManageableManualClient(user: User, clientId: string): Promise<OAuthClient> {
		const client = await this.oauthClientRepository.findOne({ where: { id: clientId } });

		if (!client?.createdBy) {
			throw new NotFoundError(`OAuth client with ID ${clientId} not found`);
		}

		if (client.createdBy !== user.id && !hasGlobalScope(user, 'mcp:manage')) {
			throw new ForbiddenError('You are not allowed to change this OAuth client');
		}

		return client;
	}

	async authorize(
		client: OAuthClientInformationFull,
		params: AuthorizationParams,
		res: Response,
	): Promise<void> {
		this.logger.debug('Starting OAuth authorization', { clientId: client.client_id });

		try {
			const resource = await this.resolveAndValidateResourceIndicator(params.resource?.toString());

			const targetResource = resource
				? await this.resourceRegistry.getByResourceUrl(resource)
				: this.resourceRegistry.getDefaultResource();
			const allowedUris = (await targetResource?.getAllowedRedirectUris?.()) ?? [];
			// The allowlist gates clients that self-registered over the
			// unauthenticated DCR endpoint. A manually registered client's redirect
			// URIs were entered by an authenticated user in the UI, which is itself
			// the authorization, so they are taken as given.
			if (
				allowedUris.length > 0 &&
				!(await this.isManuallyRegistered(client.client_id)) &&
				!this.isRedirectUriAllowed(allowedUris, params.redirectUri)
			) {
				this.logger.warn(
					'MCP OAuth authorization rejected: requested redirect URI is not in the configured allowlist',
					{
						clientId: client.client_id,
						attemptedUri: params.redirectUri,
					},
				);
				res.status(400).json({
					error: 'invalid_request',
					error_description: 'Redirect URI not in allowed list',
				});
				return;
			}

			// Unknown requested scopes (e.g. `openid`) are dropped rather than
			// rejected — the user picks the effective scopes on the consent screen.
			const supportedScopes = targetResource?.scopes ?? [];
			const requestedScopes = params.scopes?.filter((scope) => supportedScopes.includes(scope));

			this.oauthSessionService.createSession(res, {
				clientId: client.client_id,
				redirectUri: params.redirectUri,
				codeChallenge: params.codeChallenge,
				state: params.state ?? null,
				resource,
				...(requestedScopes && requestedScopes.length > 0 && { requestedScopes }),
			});

			res.redirect('/oauth/consent');
		} catch (error) {
			if (error instanceof InvalidResourceIndicatorError) {
				this.logger.warn('Rejecting OAuth authorization request with invalid resource', {
					clientId: client.client_id,
					resource: error.resource,
					expectedResource: error.expectedResource,
				});
				this.oauthSessionService.clearSession(res);
				res.status(400).json({
					error: 'invalid_target',
					error_description: 'Invalid resource indicator',
				});
				return;
			}

			this.logger.error('Error in authorize method', { error, clientId: client.client_id });
			this.oauthSessionService.clearSession(res);
			res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
		}
	}

	async challengeForAuthorizationCode(
		client: OAuthClientInformationFull,
		authorizationCode: string,
	): Promise<string> {
		return await this.authorizationCodeService.getCodeChallenge(
			authorizationCode,
			client.client_id,
		);
	}

	async exchangeAuthorizationCode(
		client: OAuthClientInformationFull,
		authorizationCode: string,
		_codeVerifier?: string,
		redirectUri?: string,
		resource?: URL,
	): Promise<OAuthTokens> {
		const authRecord = await this.authorizationCodeService.findAuthorizationCode(
			authorizationCode,
			client.client_id,
			redirectUri,
		);

		if (!authRecord) {
			throw new InvalidGrantError('Invalid authorization code');
		}

		const resourceStr = resource?.toString();
		const tokenResource = await this.resolveAndValidateResourceIndicator(resourceStr);

		// RFC 8707: if both the token request and the auth code specify a resource, they must match
		// (token substitution defense). Otherwise either supplies the other, falling back to the
		// registry's default resource.
		let finalResource: string | undefined;
		const codeResource = authRecord.resource ?? undefined;

		if (tokenResource && codeResource) {
			if (tokenResource !== codeResource) {
				throw new InvalidResourceIndicatorError(tokenResource, codeResource);
			}
			finalResource = tokenResource;
		} else {
			finalResource = tokenResource ?? codeResource;
		}

		await this.authorizationCodeService.markAuthorizationCodeAsUsed(authorizationCode);

		const grantedScopes = authRecord.scope;

		const { accessToken, refreshToken } = this.tokenService.generateTokenPair(
			authRecord.userId,
			client.client_id,
			finalResource,
			grantedScopes,
		);

		await this.tokenService.saveTokenPair(
			accessToken,
			refreshToken,
			client.client_id,
			authRecord.userId,
			grantedScopes,
		);

		// Completion of the authorization-code grant is the point at which the user
		// has finished the OAuth flow for this client. The authorization server is
		// shared by every protected resource on the instance (MCP, forms, ...), so
		// only grants targeting the instance MCP server count as MCP usage.
		const grantedResource = finalResource
			? await this.resourceRegistry.getByResourceUrl(finalResource)
			: this.resourceRegistry.getDefaultResource();
		if (grantedResource?.id === INSTANCE_MCP_RESOURCE_ID) {
			this.eventService.emit('mcp-oauth-completed', {
				userId: authRecord.userId,
				clientId: client.client_id,
				clientName: client.client_name,
			});
		}

		return {
			access_token: accessToken,
			token_type: 'Bearer',
			expires_in: this.tokenService.getAccessTokenExpirySeconds(),
			refresh_token: refreshToken,
			// RFC 6749 §5.1: REQUIRED when the granted scopes differ from the
			// requested ones — the user picks them on the consent screen.
			scope: grantedScopes.join(' '),
		};
	}

	// `resource` (when present) is normalized and validated before rotation; if omitted,
	// the token service falls back to the default protected resource. `_scopes` is part of
	// the SDK contract but unused — OAuth 2.1 refresh tokens reuse the original grant's scopes.
	async exchangeRefreshToken(
		client: OAuthClientInformationFull,
		refreshToken: string,
		_scopes?: string[],
		resource?: URL,
	): Promise<OAuthTokens> {
		const resourceStr = resource?.toString();
		return await this.tokenService.validateAndRotateRefreshToken(
			refreshToken,
			client.client_id,
			await this.resolveAndValidateResourceIndicator(resourceStr),
		);
	}

	async verifyAccessToken(token: string): Promise<AuthInfo> {
		return await this.tokenService.verifyAccessToken(token);
	}

	// Exact-match against a registered resource, as required by RFC 8707 §2.1.
	// Prefix/wildcard matching would open the door to malicious-host or
	// path-traversal indicators like ".../mcp-server/http/../admin".
	private async resolveAndValidateResourceIndicator(
		resource: string | undefined,
	): Promise<string | undefined> {
		if (resource === undefined) {
			return undefined;
		}

		const normalizedResource = resource.replace(/\/$/, '');
		const match = await this.resourceRegistry.getByResourceUrl(normalizedResource);
		if (!match) {
			const knownResources = this.resourceRegistry
				.getAll()
				.map((registered) => registered.getResourceUrl())
				.join(', ');
			throw new InvalidResourceIndicatorError(resource, knownResources);
		}

		// Keep the caller's spelling when it exactly names one of the resource's own
		// URLs — the MCP server publishes several, and a client reaching it through the
		// instance hostname must get the audience it asked for.
		//
		// Otherwise return the canonical URL. Lookup deliberately tolerates equivalent
		// spellings (a webhook's `?method=` query survives percent-encoding), and
		// echoing one of those back would mint an `aud` that the resource gate — which
		// compares against `getAudiences()` — can never match, leaving the client
		// holding a token that silently 401s forever.
		const declaredUrls = match.getResourceUrls?.() ?? [match.getResourceUrl()];
		const isDeclared = declaredUrls.some((url) => url.replace(/\/$/, '') === normalizedResource);

		return isDeclared ? normalizedResource : match.getResourceUrl();
	}

	async revokeToken(
		client: OAuthClientInformationFull,
		request: OAuthTokenRevocationRequest,
	): Promise<void> {
		const { token, token_type_hint } = request;

		if (!token_type_hint || token_type_hint === 'access_token') {
			const revoked = await this.tokenService.revokeAccessToken(token, client.client_id);
			if (revoked) {
				return;
			}
		}

		if (!token_type_hint || token_type_hint === 'refresh_token') {
			const revoked = await this.tokenService.revokeRefreshToken(token, client.client_id);
			if (revoked) {
				return;
			}
		}

		this.logger.debug('Token revocation requested for unknown token', {
			clientId: client.client_id,
		});
	}

	/**
	 * Get OAuth clients users have consented to (excluding sensitive data),
	 * together with the grant details of each consent, plus manually registered
	 * clients that have not been connected with yet. `ownership: 'all'` returns
	 * every user's rows with owner info and requires `mcp:manage`.
	 *
	 * Filters and pagination are applied in memory after loading the ownership's
	 * consents: the set is small (bounded by the instance client cap) and the
	 * type filter reuses the shared name-pattern matchers, which SQL can't
	 * express. `count` is the filtered total, `clients` the requested page.
	 */
	async getAllClients(
		user: User,
		options: ListConnectedClientsOptions = {},
	): Promise<{
		clients: ConnectedOAuthClient[];
		count: number;
		totals: ConnectedOAuthClientTotals;
		owners?: ConnectedOAuthClientOwner[];
	}> {
		const canSeeAll = hasGlobalScope(user, 'mcp:manage');
		const listAll = options.ownership === 'all';

		if (listAll && !canSeeAll) {
			throw new ForbiddenError('You are not allowed to list connected clients of other users');
		}

		// The `type` filter is a name-pattern match SQL can't express. Resolve it
		// to the matching client ids first — bounded by the registered client cap,
		// not the (client × user) consent set — so filtering and paging stay in SQL.
		let clientIds: string[] | undefined;
		if (options.type) {
			const registered = await this.oauthClientRepository.find({
				select: { id: true, name: true },
				where: { isFirstParty: false },
			});
			clientIds = registered
				.filter((client) => matchesTypeFilter(client.name, options.type!))
				.map((client) => client.id);
		}

		// A manually registered client has no consent until its owner completes the
		// ceremony, so it can't be reached through the consent join. Those rows come
		// from a second query and sort ahead of the connected ones — they are the
		// ones still waiting to be pasted into a client. The `connected` filter is a
		// bucket over the consent date, so it excludes them by definition.
		const unconnected =
			clientIds?.length === 0 || options.connected
				? { rows: [], total: 0 }
				: await this.oauthClientRepository.findUnconnectedManualClients({
						createdBy: listAll ? options.ownerId : user.id,
						name: options.name,
						clientIds,
					});

		const skip = options.skip ?? 0;
		const take = options.take;
		const unconnectedPage =
			take === undefined ? unconnected.rows : unconnected.rows.slice(skip, skip + take);

		// The page can be filled entirely by unconnected rows; the consent query
		// still runs, because its `total` is part of the row count.
		const consentTake = take === undefined ? undefined : Math.max(take - unconnectedPage.length, 1);
		const { rows: consentRows, total: consentTotal } =
			clientIds?.length === 0
				? { rows: [], total: 0 }
				: await this.userConsentRepository.findConnectedClients({
						userId: listAll ? undefined : user.id,
						withOwner: listAll,
						name: options.name,
						ownerId: listAll ? options.ownerId : undefined,
						clientIds,
						connected: options.connected,
						now: Date.now(),
						skip: Math.max(skip - unconnected.total, 0),
						take: consentTake,
					});
		const consents =
			take === undefined ? consentRows : consentRows.slice(0, take - unconnectedPage.length);

		const clients: ConnectedOAuthClient[] = [
			...unconnectedPage.map((client) => ({
				...this.toListedClient(client, user, canSeeAll),
				grantedAt: null,
				scopes: [],
				...(listAll && client.creator ? { owner: toOwner(client.creator) } : {}),
			})),
			...consents.map((consent) => ({
				...this.toListedClient(consent.client, user, canSeeAll),
				// bigint columns come back as strings on Postgres
				grantedAt: Number(consent.grantedAt),
				scopes: consent.scope,
				...(listAll ? { owner: toOwner(consent.user) } : {}),
			})),
		];
		const count = unconnected.total + consentTotal;

		// Owners and the tab totals reflect the unfiltered set, so they come from
		// dedicated counts rather than the filtered page above.
		const [consentOwners, manualCreators, mineConsents, mineManual, allConsents, allManual] =
			await Promise.all([
				listAll ? this.userConsentRepository.findConsentOwners() : undefined,
				listAll ? this.oauthClientRepository.findManualClientCreators() : undefined,
				this.userConsentRepository.countConnectedConsents(user.id),
				this.oauthClientRepository.countUnconnectedManualClients(user.id),
				canSeeAll ? this.userConsentRepository.countConnectedConsents() : undefined,
				canSeeAll ? this.oauthClientRepository.countUnconnectedManualClients() : undefined,
			]);
		const owners = consentOwners
			? sortOwners(dedupeById([...consentOwners, ...(manualCreators ?? [])]))
			: undefined;
		const totals: ConnectedOAuthClientTotals = { mine: mineConsents + mineManual };
		if (allConsents !== undefined) {
			totals.all = allConsents + (allManual ?? 0);
		}

		return { clients, count, totals, owners };
	}

	/** Strips the secret columns and adds the fields the clients list renders. */
	private toListedClient(
		client: OAuthClient,
		user: User,
		canManageAll: boolean,
	): Omit<ConnectedOAuthClient, 'grantedAt' | 'scopes' | 'owner'> {
		const { clientSecret, clientSecretExpiresAt, createdBy, creator, ...sanitizedClient } = client;
		return {
			...sanitizedClient,
			registration: createdBy ? 'manual' : 'dcr',
			// DCR registrations belong to the client app that created them: there is
			// nothing to edit and revoking the grant is the only action.
			canManage: !!createdBy && (createdBy === user.id || canManageAll),
		};
	}

	/** Tool names each scope unlocks on this instance, for the clients list UI. */
	getInstanceScopeTools(): Record<string, string[]> | undefined {
		return this.resourceRegistry.getDefaultResource()?.getScopeTools?.();
	}

	/**
	 * Revoke a user's grant for a client: their consent, tokens, and
	 * authorization codes. Other users' grants for the same client are
	 * untouched. The client registration itself is garbage-collected once the
	 * last consent is gone, freeing a slot under the instance client cap.
	 * When a `revoker` other than the grant owner is given (admin revoke),
	 * the owner is notified by email.
	 *
	 * A manually registered client is deregistered outright when its own
	 * registrant is the target: its `client_id` lives in someone's MCP client
	 * config, so it has to stop working rather than linger unusable.
	 */
	async deleteClient(clientId: string, userId: string, revoker?: User): Promise<void> {
		// First check if the client exists
		const client = await this.oauthClientRepository.findOne({
			where: { id: clientId },
			relations: ['creator'],
		});

		if (!client) {
			throw new Error(`OAuth client with ID ${clientId} not found`);
		}

		const isRegistrant = !!client.createdBy && client.createdBy === userId;

		// Verify the target user has a consent relationship with this client. A
		// manual client the target registered but never connected with has none yet.
		const consent = await this.userConsentRepository.findOne({
			where: { clientId, userId },
			relations: ['user'],
		});
		if (!consent && !isRegistrant) {
			throw new Error(`OAuth client with ID ${clientId} not found`);
		}

		this.logger.info('Revoking OAuth client access for user', { clientId, userId });

		// Independent deletes across separate tables; the GC step below only needs
		// the consent gone, so run them together rather than serially.
		await Promise.all([
			this.tokenService.revokeAllTokensForGrant(clientId, userId),
			this.authorizationCodeService.deleteForGrant(clientId, userId),
			this.userConsentRepository.delete({ clientId, userId }),
		]);

		if (isRegistrant) {
			// Unconditional: other users' consents for this client cascade away with
			// it, which is the point — the registration is being withdrawn.
			await this.oauthClientRepository.delete({ id: clientId });
			this.logger.info('Manually registered OAuth client deleted', {
				clientId,
				clientName: client.name,
			});
		} else if (!client.createdBy) {
			// Garbage-collect a DCR client only when no consents remain. One
			// conditional delete keeps it atomic: a concurrent authorization for the
			// same client either commits its consent first (NOT EXISTS keeps the
			// client) or fails cleanly on the FK instead of being silently
			// cascade-deleted. Manual clients are never collected this way — they
			// outlive their grants until the registrant deletes them.
			const consentsTable = this.userConsentRepository.metadata.tableName;
			const result = await this.oauthClientRepository
				.createQueryBuilder()
				.delete()
				.from(OAuthClient)
				.where(
					`id = :clientId AND NOT EXISTS (SELECT 1 FROM ${consentsTable} WHERE "clientId" = :clientId)`,
					{ clientId },
				)
				.execute();

			if (result.affected && result.affected > 0) {
				this.logger.info('OAuth client deleted after last consent was revoked', {
					clientId,
					clientName: client.name,
				});
			}
		}

		const owner = consent?.user ?? client.creator;
		if (owner && revoker && revoker.id !== userId) {
			this.mailer.notifyMcpClientRevoked({ clientName: client.name, owner, revoker }).catch((e) => {
				this.logger.error('Failed to send MCP client revocation email', {
					clientId,
					ownerId: userId,
					error: e instanceof Error ? e.message : String(e),
				});
			});
		}
	}
}

// Per RFC 8707 §3.2 the error code MUST be 'invalid_target' (provided by InvalidTargetError's
// static errorCode). Don't change to 'invalid_resource': it isn't in the registered OAuth error
// set and compliant MCP clients will fail the negotiation.
class InvalidResourceIndicatorError extends InvalidTargetError {
	constructor(
		readonly resource: string,
		readonly expectedResource: string,
	) {
		super('Invalid resource indicator');
	}
}
