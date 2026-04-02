import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients';
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
import { McpOAuthAuthorizationCodeService } from './mcp-oauth-authorization-code.service';
import { McpOAuthTokenService } from './mcp-oauth-token.service';
import { OAuthSessionService } from './oauth-session.service';

export const SUPPORTED_SCOPES = ['tool:listWorkflows', 'tool:getWorkflowDetails'];

/** Maximum number of redirect URIs per client */
const MAX_REDIRECT_URIS = 10;

/** Maximum length for a single redirect URI */
const MAX_REDIRECT_URI_LENGTH = 2048;

/**
 * OAuth 2.1 server implementation for MCP
 * Implements MCP SDK OAuthServerProvider interface for client registration, authorization, and token management
 */
@Service()
export class McpOAuthService implements OAuthServerProvider {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly oauthSessionService: OAuthSessionService,
		private readonly oauthClientRepository: OAuthClientRepository,
		private readonly tokenService: McpOAuthTokenService,
		private readonly authorizationCodeService: McpOAuthAuthorizationCodeService,
		private readonly userConsentRepository: UserConsentRepository,
	) {}

	get clientsStore(): OAuthRegisteredClientsStore {
		return {
			getClient: async (clientId: string): Promise<OAuthClientInformationFull | undefined> => {
				const client = await this.oauthClientRepository.findOneBy({ id: clientId });
				if (!client) {
					return undefined;
				}

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
					scope: SUPPORTED_SCOPES.join(' '),
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

	/**
	 * Check count after insert to avoid race condition between count() and insert().
	 * If over limit, rolls back by deleting the just-inserted client.
	 */
	private async enforceClientLimit(clientId: string): Promise<void> {
		const clientCount = await this.oauthClientRepository.count();
		if (clientCount > this.globalConfig.endpoints.mcpMaxRegisteredClients) {
			await this.oauthClientRepository.delete({ id: clientId });
			throw new Error(
				`Maximum number of registered clients (${this.globalConfig.endpoints.mcpMaxRegisteredClients}) reached`,
			);
		}
	}

	private validateClientRegistration(client: OAuthClientInformationFull): void {
		if (client.redirect_uris) {
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
	}

	async authorize(
		client: OAuthClientInformationFull,
		params: AuthorizationParams,
		res: Response,
	): Promise<void> {
		this.logger.debug('Starting OAuth authorization', { clientId: client.client_id });

		try {
			this.oauthSessionService.createSession(res, {
				clientId: client.client_id,
				redirectUri: params.redirectUri,
				codeChallenge: params.codeChallenge,
				state: params.state ?? null,
			});

			res.redirect('/oauth/consent');
		} catch (error) {
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
	): Promise<OAuthTokens> {
		const authRecord = await this.authorizationCodeService.validateAndConsumeAuthorizationCode(
			authorizationCode,
			client.client_id,
			redirectUri,
		);

		const { accessToken, refreshToken } = this.tokenService.generateTokenPair(
			authRecord.userId,
			client.client_id,
		);

		await this.tokenService.saveTokenPair(
			accessToken,
			refreshToken,
			client.client_id,
			authRecord.userId,
		);

		this.logger.info('Authorization code exchanged for tokens', {
			clientId: client.client_id,
			userId: authRecord.userId,
		});

		return {
			access_token: accessToken,
			token_type: 'Bearer',
			expires_in: 3600,
			refresh_token: refreshToken,
		};
	}

	async exchangeRefreshToken(
		client: OAuthClientInformationFull,
		refreshToken: string,
		_scopes?: string[],
	): Promise<OAuthTokens> {
		return await this.tokenService.validateAndRotateRefreshToken(refreshToken, client.client_id);
	}

	async verifyAccessToken(token: string): Promise<AuthInfo> {
		return await this.tokenService.verifyAccessToken(token);
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
	 * Get all OAuth clients for a specific user (excluding sensitive data)
	 */
	async getAllClients(
		userId: string,
	): Promise<Array<Omit<OAuthClient, 'clientSecret' | 'clientSecretExpiresAt' | 'setUpdateDate'>>> {
		// Get all consents for the user with client information
		const userConsents = await this.userConsentRepository.findByUserWithClient(userId);

		// Extract and sanitize the client information
		return userConsents.map((consent) => {
			const { clientSecret, clientSecretExpiresAt, ...sanitizedClient } = consent.client;
			return sanitizedClient;
		});
	}

	/**
	 * Delete an OAuth client and all related data.
	 * Verifies that the requesting user has a consent relationship with the client.
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

		this.logger.info('Deleting OAuth client and related data', { clientId });

		await this.oauthClientRepository.delete({ id: clientId });

		this.logger.info('OAuth client deleted successfully', {
			clientId,
			clientName: client.name,
		});
	}
}
