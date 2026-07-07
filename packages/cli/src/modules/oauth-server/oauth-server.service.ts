import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients';
import {
	InvalidGrantError,
	InvalidTargetError,
} from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type {
	AuthorizationParams,
	OAuthServerProvider,
} from '@modelcontextprotocol/sdk/server/auth/provider';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types';
import type {
	OAuthClientInformationFull,
	OAuthTokens,
	OAuthTokenRevocationRequest,
} from '@modelcontextprotocol/sdk/shared/auth';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Response } from 'express';

import { OAuthClient } from './database/entities/oauth-client.entity';
import { OAuthClientRepository } from './database/repositories/oauth-client.repository';
import { UserConsentRepository } from './database/repositories/oauth-user-consent.repository';
import { OAuthAuthorizationCodeService } from './oauth-authorization-code.service';
import { OAuthSessionService } from './oauth-session.service';
import { OAuthTokenService } from './oauth-token.service';
import { OAuthClientLimitReachedError } from './oauth.errors';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';

/** Maximum number of redirect URIs per client */
const MAX_REDIRECT_URIS = 10;

/** A client the user has consented to, enriched with the grant details of the consent. */
export type ConnectedOAuthClient = Omit<
	OAuthClient,
	'clientSecret' | 'clientSecretExpiresAt' | 'setUpdateDate'
> & {
	grantedAt: number;
	scopes: string[] | null;
	lastActiveAt: number | null;
};

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

		// Substitutes the pre-scoping migration sentinel with full scopes for
		// auth codes inserted by a not-yet-updated instance (rolling deploys).
		const grantedScopes = await this.tokenService.resolveGrantedScopes(
			authRecord.scope,
			finalResource,
		);

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
	 * Get all OAuth clients the user has consented to (excluding sensitive
	 * data), together with the grant details of the consent itself.
	 */
	async getAllClients(userId: string): Promise<ConnectedOAuthClient[]> {
		// Get all consents for the user with client information
		const userConsents = await this.userConsentRepository.findByUserWithClient(userId);

		// Extract and sanitize the client information
		return userConsents.map((consent) => {
			const { clientSecret, clientSecretExpiresAt, ...sanitizedClient } = consent.client;
			return {
				...sanitizedClient,
				// bigint columns come back as strings on Postgres
				grantedAt: Number(consent.grantedAt),
				// NULL = consent predates scoping = full access
				scopes: consent.scope,
				lastActiveAt: consent.lastActiveAt === null ? null : Number(consent.lastActiveAt),
			};
		});
	}

	/**
	 * Revoke the requesting user's grant for a client: their consent, tokens,
	 * and authorization codes. Other users' grants for the same client are
	 * untouched. The client registration itself is garbage-collected once the
	 * last consent is gone, freeing a slot under the instance client cap.
	 */
	async deleteClient(clientId: string, userId: string): Promise<void> {
		// First check if the client exists
		const client = await this.oauthClientRepository.findOne({
			where: { id: clientId },
		});

		if (!client) {
			throw new Error(`OAuth client with ID ${clientId} not found`);
		}

		// Verify the requesting user has a consent relationship with this client
		const consent = await this.userConsentRepository.findOneBy({ clientId, userId });
		if (!consent) {
			throw new Error(`OAuth client with ID ${clientId} not found`);
		}

		this.logger.info('Revoking OAuth client access for user', { clientId, userId });

		await this.tokenService.revokeAllTokensForGrant(clientId, userId);
		await this.authorizationCodeService.deleteForGrant(clientId, userId);
		await this.userConsentRepository.delete({ clientId, userId });

		const remainingConsents = await this.userConsentRepository.countBy({ clientId });
		if (remainingConsents === 0) {
			await this.oauthClientRepository.delete({ id: clientId });
			this.logger.info('OAuth client deleted after last consent was revoked', {
				clientId,
				clientName: client.name,
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
