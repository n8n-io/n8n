import { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients';
import {
	AuthorizationParams,
	OAuthServerProvider,
} from '@modelcontextprotocol/sdk/server/auth/provider';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types';
import {
	OAuthClientInformationFull,
	OAuthTokens,
	OAuthTokenRevocationRequest,
} from '@modelcontextprotocol/sdk/shared/auth';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { Response } from 'express';

import { McpOAuthAuthorizationCodeService } from './mcp-oauth-authorization-code.service';
import { McpOAuthTokenService } from './mcp-oauth-token.service';
import { OAuthClientRepository } from './oauth-client.repository';
import { OAuthSessionService } from './oauth-session.service';

export const SUPPORTED_SCOPES = ['tool:listWorkflow', 'tool:getWorkflowDetails'];

@Service()
export class McpOAuthService implements OAuthServerProvider {
	constructor(
		private readonly logger: Logger,
		private readonly oauthSessionService: OAuthSessionService,
		private readonly oauthClientRepository: OAuthClientRepository,
		private readonly tokenService: McpOAuthTokenService,
		private readonly authorizationCodeService: McpOAuthAuthorizationCodeService,
	) {}

	get clientsStore(): OAuthRegisteredClientsStore {
		return {
			getClient: async (clientId: string): Promise<OAuthClientInformationFull | undefined> => {
				const client = await this.oauthClientRepository.findOne({ where: { id: clientId } });
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
				};
			},
			registerClient: async (
				client: OAuthClientInformationFull,
			): Promise<OAuthClientInformationFull> => {
				try {
					await this.oauthClientRepository.save({
						id: client.client_id,
						name: client.client_name,
						redirectUris: client.redirect_uris,
						grantTypes: client.grant_types,
						clientSecret: client.client_secret ?? null,
						clientSecretExpiresAt: client.client_secret_expires_at ?? null,
						tokenEndpointAuthMethod: client.token_endpoint_auth_method ?? 'none',
					});
				} catch (error) {
					this.logger.error('Error registering OAuth client', {
						error,
						clientId: client.client_id,
					});
				}

				return client;
			},
		};
	}

	async authorize(
		client: OAuthClientInformationFull,
		params: AuthorizationParams,
		res: Response,
	): Promise<void> {
		this.logger.debug('Starting OAuth authorization', { clientId: client.client_id });

		try {
			// Always redirect to consent screen
			// Note: MCP SDK validates all params (client_id, redirect_uri, code_challenge, etc.)
			// before calling this method, so we don't need to validate again.
			// - If authenticated: Consent page shows directly
			// - If not authenticated: Consent endpoint (skipAuth: false) redirects to login
			// Dynamic client registration creates new client_id on each connection,
			// so we can't rely on existing consent checks to skip the consent screen.
			// The consent table is still maintained for authorization history and user management.
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
		// Validate and consume the authorization code
		const authRecord = await this.authorizationCodeService.validateAndConsumeAuthorizationCode(
			authorizationCode,
			client.client_id,
			redirectUri,
		);

		// Generate and persist token pair
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

		// Try to revoke as access token first (or if hint is 'access_token')
		if (!token_type_hint || token_type_hint === 'access_token') {
			const revoked = await this.tokenService.revokeAccessToken(token, client.client_id);
			if (revoked) {
				return;
			}
		}

		// Try to revoke as refresh token
		if (!token_type_hint || token_type_hint === 'refresh_token') {
			const revoked = await this.tokenService.revokeRefreshToken(token, client.client_id);
			if (revoked) {
				return;
			}
		}

		// If token not found, silently succeed per OAuth 2.0 spec
		this.logger.debug('Token revocation requested for unknown token', {
			clientId: client.client_id,
		});
	}
}
