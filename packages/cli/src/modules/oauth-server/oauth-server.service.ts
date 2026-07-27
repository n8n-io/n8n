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
import type { McpClientConnectedPeriod, McpClientTypeFilter } from '@n8n/api-types';
import { getMcpClientType, MCP_CLIENT_TYPE_FILTER_BUCKETS } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { Response } from 'express';

import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';

import { OAuthClient } from './database/entities/oauth-client.entity';
import { OAuthClientRepository } from './database/repositories/oauth-client.repository';
import { UserConsentRepository } from './database/repositories/oauth-user-consent.repository';
import { OAuthAuthorizationCodeService } from './oauth-authorization-code.service';
import { OAuthSessionService } from './oauth-session.service';
import { OAuthTokenService } from './oauth-token.service';
import { OAuthClientLimitReachedError } from './oauth.errors';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { UserManagementMailer } from '@/user-management/email';

/** Maximum number of redirect URIs per client */
const MAX_REDIRECT_URIS = 10;

export type ConnectedOAuthClientOwner = {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
};

/** A client the user has consented to, enriched with the grant details of the consent. */
export type ConnectedOAuthClient = Omit<
	OAuthClient,
	'clientSecret' | 'clientSecretExpiresAt' | 'setUpdateDate'
> & {
	grantedAt: number;
	scopes: string[];
	/** Consent owner; present only when listing across users (ownership=all). */
	owner?: ConnectedOAuthClientOwner;
};

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

/** Sort owners by display name so the "Connected by" dropdown reads naturally. */
function sortOwners(owners: ConnectedOAuthClientOwner[]): ConnectedOAuthClientOwner[] {
	return [...owners].sort((a, b) => {
		const nameA = [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email;
		const nameB = [b.firstName, b.lastName].filter(Boolean).join(' ') || b.email;
		return nameA.localeCompare(nameB);
	});
}

/** Maximum length for a single redirect URI */
const MAX_REDIRECT_URI_LENGTH = 2048;

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
	) {}

	get clientsStore(): OAuthRegisteredClientsStore {
		return {
			getClient: async (clientId: string): Promise<OAuthClientInformationFull | undefined> => {
				const client = await this.oauthClientRepository.findOneBy({ id: clientId });
				if (!client) {
					return undefined;
				}

				// Some clients echo back the `scope` they saw on registration and
				// reject responses that include `scope: ''`. Omit the field
				// entirely when no scopes are advertised.
				const supportedScopes = this.resourceRegistry.getAllScopes();

				return {
					client_id: client.id,
					client_name: client.name,
					redirect_uris: client.redirectUris,
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
				});

				await this.enforceClientLimit(client.client_id);

				return client;
			},
		};
	}

	/** Returns true when the instance is already at or above the registered-client cap. */
	async isClientLimitReached(): Promise<boolean> {
		const clientCount = await this.oauthClientRepository.count();
		return clientCount >= this.globalConfig.endpoints.mcpMaxRegisteredClients;
	}

	async getInstanceClientStats(): Promise<{
		count: number;
		limit: number;
		atCapacity: boolean;
	}> {
		const count = await this.oauthClientRepository.count();
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
		const clientCount = await this.oauthClientRepository.count();
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

		if (client.redirect_uris.length > MAX_REDIRECT_URIS) {
			throw new Error(`redirect_uris exceeds maximum count of ${MAX_REDIRECT_URIS}`);
		}

		for (const uri of client.redirect_uris) {
			if (uri.length > MAX_REDIRECT_URI_LENGTH) {
				throw new Error(
					`redirect_uri exceeds maximum length of ${MAX_REDIRECT_URI_LENGTH} characters`,
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

		let requested: URL;
		try {
			requested = new URL(redirectUri);
		} catch {
			return false;
		}

		if (!this.isLoopbackHost(requested.hostname)) {
			return false;
		}

		return allowedUris.some((allowed) => {
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

	private isLoopbackHost(hostname: string): boolean {
		return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
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
			if (allowedUris.length > 0 && !this.isRedirectUriAllowed(allowedUris, params.redirectUri)) {
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

		return normalizedResource;
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
	 * together with the grant details of each consent. `ownership: 'all'`
	 * returns every user's consents with owner info and requires `mcp:manage`.
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
			});
			clientIds = registered
				.filter((client) => matchesTypeFilter(client.name, options.type!))
				.map((client) => client.id);
		}

		const { rows: consents, total } =
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
						skip: options.skip,
						take: options.take,
					});

		const clients: ConnectedOAuthClient[] = consents.map((consent) => {
			const { clientSecret, clientSecretExpiresAt, ...sanitizedClient } = consent.client;
			return {
				...sanitizedClient,
				// bigint columns come back as strings on Postgres
				grantedAt: Number(consent.grantedAt),
				scopes: consent.scope,
				...(listAll
					? {
							owner: {
								id: consent.user.id,
								firstName: consent.user.firstName ?? null,
								lastName: consent.user.lastName ?? null,
								email: consent.user.email,
							},
						}
					: {}),
			};
		});
		const count = total;

		// Owners and the tab totals reflect the unfiltered set, so they come from
		// dedicated counts rather than the filtered page above.
		const [consentOwners, mineCount, allCount] = await Promise.all([
			listAll ? this.userConsentRepository.findConsentOwners() : undefined,
			this.userConsentRepository.countBy({ userId: user.id }),
			canSeeAll ? this.userConsentRepository.count() : undefined,
		]);
		const owners = consentOwners ? sortOwners(consentOwners) : undefined;
		const totals: ConnectedOAuthClientTotals = { mine: mineCount };
		if (allCount !== undefined) {
			totals.all = allCount;
		}

		return { clients, count, totals, owners };
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
	 */
	async deleteClient(clientId: string, userId: string, revoker?: User): Promise<void> {
		// First check if the client exists
		const client = await this.oauthClientRepository.findOne({
			where: { id: clientId },
		});

		if (!client) {
			throw new Error(`OAuth client with ID ${clientId} not found`);
		}

		// Verify the target user has a consent relationship with this client
		const consent = await this.userConsentRepository.findOne({
			where: { clientId, userId },
			relations: ['user'],
		});
		if (!consent) {
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

		// Garbage-collect the client only when no consents remain. One conditional
		// delete keeps it atomic: a concurrent authorization for the same client
		// either commits its consent first (NOT EXISTS keeps the client) or fails
		// cleanly on the FK instead of being silently cascade-deleted.
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

		if (revoker && revoker.id !== userId) {
			this.mailer
				.notifyMcpClientRevoked({ clientName: client.name, owner: consent.user, revoker })
				.catch((e) => {
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
