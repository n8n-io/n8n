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
import { AuthenticatedRequest } from '@n8n/db';
import { Service } from '@n8n/di';
import { Response } from 'express';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { AccessTokenRepository } from './oauth-access-token.repository';
import { AuthorizationCodeRepository } from './oauth-authorization-code.repository';
import { OAuthClientRepository } from './oauth-client.repository';
import { RefreshTokenRepository } from './oauth-refresh-token.repository';
import { UserConsentRepository } from './oauth-user-consent.repository';

// eslint-disable-next-line import-x/extensions
import { AuthService } from '@/auth/auth.service';

@Service()
export class McpOAuthService implements OAuthServerProvider {
	constructor(
		private readonly logger: Logger,
		private readonly authService: AuthService,
		private readonly oauthClientRepository: OAuthClientRepository,
		private readonly authorizationCodeRepository: AuthorizationCodeRepository,
		private readonly accessTokenRepository: AccessTokenRepository,
		private readonly refreshTokenRepository: RefreshTokenRepository,
		private readonly userConsentRepository: UserConsentRepository,
	) {}
	get clientsStore(): OAuthRegisteredClientsStore {
		return {
			getClient: async (clientId: string): Promise<OAuthClientInformationFull | undefined> => {
				const client = await this.oauthClientRepository.findOne({ where: { id: clientId } });
				if (!client) {
					return undefined;
				}

				console.log('Found OAuth client', { clientId: client.id });

				return {
					client_id: client.id,
					client_name: client.name,
					redirect_uris: client.redirectUris,
					grant_types: client.grantTypes,
					token_endpoint_auth_method: client.tokenEndpointAuthMethod,
					response_types: ['code'],
				};
			},
			registerClient: async (
				client: OAuthClientInformationFull,
			): Promise<OAuthClientInformationFull> => {
				console.log('Registering new OAuth client', JSON.stringify(client));

				await this.oauthClientRepository.save({
					id: client.client_id,
					name: client.client_name,
					redirectUris: client.redirect_uris,
					grantTypes: client.grant_types,
					tokenEndpointAuthMethod: client.token_endpoint_auth_method ?? 'none',
				});

				client.token_endpoint_auth_method = 'none';

				this.logger.info('OAuth client registered', { clientId: client.client_id });
				return client;
			},
		};
	}

	async authorize(
		client: OAuthClientInformationFull,
		params: AuthorizationParams,
		res: Response,
	): Promise<void> {
		try {
			const req = res.req as unknown as AuthenticatedRequest;

			// Validate state parameter
			if (!params.state) {
				res
					.status(400)
					.json({ error: 'invalid_request', error_description: 'Missing state parameter' });
				return;
			}

			// Validate redirect URI
			if (!params.redirectUri || !client.redirect_uris.includes(params.redirectUri)) {
				res
					.status(400)
					.json({ error: 'invalid_request', error_description: 'Invalid redirect_uri' });
				return;
			}

			// Validate PKCE parameters
			if (!params.codeChallenge) {
				res
					.status(400)
					.json({ error: 'invalid_request', error_description: 'Missing PKCE code challenge' });
				return;
			}

			// Try to authenticate user
			const [user] = await this.authService.resolveJwt(req, res);

			if (!user) {
				// User is not authenticated - redirect to login with current URL as redirect
				const currentUrl = req.originalUrl;
				const loginUrl = `/signin?redirect=${encodeURIComponent(currentUrl)}`;
				res.redirect(loginUrl);
				return;
			}

			// User is authenticated - check if they have previously consented
			const existingConsent = await this.userConsentRepository.findOne({
				where: {
					userId: user.id,
					clientId: client.client_id,
				},
			});

			if (existingConsent) {
				// User has previously consented, generate authorization code
				const code = randomBytes(32).toString('hex');
				await this.authorizationCodeRepository.save({
					code,
					clientId: client.client_id,
					userId: user.id,
					redirectUri: params.redirectUri,
					codeChallenge: params.codeChallenge,
					codeChallengeMethod: 'S256',
					state: params.state ?? null,
					expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
					used: false,
				});

				// Redirect back to client with authorization code
				const targetUrl = new URL(params.redirectUri);
				targetUrl.searchParams.set('code', code);
				if (params.state) {
					targetUrl.searchParams.set('state', params.state);
				}
				res.redirect(targetUrl.toString());
				return;
			}

			// User needs to consent - create pending authorization and redirect to consent screen
			const sessionId = randomUUID();
			await this.authorizationCodeRepository.save({
				code: sessionId,
				clientId: client.client_id,
				userId: user.id,
				redirectUri: params.redirectUri,
				codeChallenge: params.codeChallenge,
				codeChallengeMethod: 'S256',
				state: params.state ?? null,
				expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
				used: false,
			});

			// Set session cookie for consent flow
			res.cookie('n8n-oauth-session', sessionId, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 10 * 60 * 1000, // 10 minutes
			});

			res.redirect('/oauth/consent');
		} catch (error) {
			this.logger.error('Error in authorize method', { error, clientId: client.client_id });
			res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
		}
	}

	async challengeForAuthorizationCode(
		client: OAuthClientInformationFull,
		authorizationCode: string,
	): Promise<string> {
		console.log('Challenging for authorization code', { clientId: client.client_id });
		// Find the authorization code record
		const authRecord = await this.authorizationCodeRepository.findOne({
			where: {
				code: authorizationCode,
				clientId: client.client_id,
			},
		});

		if (!authRecord) {
			throw new Error('Invalid authorization code');
		}

		// Check if expired
		if (authRecord.expiresAt < Date.now()) {
			await this.authorizationCodeRepository.remove(authRecord);
			throw new Error('Authorization code expired');
		}

		// Return the code challenge for PKCE verification
		return authRecord.codeChallenge;
	}
	async exchangeAuthorizationCode(
		client: OAuthClientInformationFull,
		authorizationCode: string,
		codeVerifier?: string,
		redirectUri?: string,
	): Promise<OAuthTokens> {
		console.log('exchangeAuthorizationCode', { clientId: client.client_id });

		// Find the authorization code record
		const authRecord = await this.authorizationCodeRepository.findOne({
			where: {
				code: authorizationCode,
				clientId: client.client_id,
			},
		});

		if (!authRecord) {
			throw new Error('Invalid authorization code');
		}

		// Check if expired
		if (authRecord.expiresAt < Date.now()) {
			await this.authorizationCodeRepository.remove(authRecord);
			throw new Error('Authorization code expired');
		}

		// Check if already used
		if (authRecord.used) {
			await this.authorizationCodeRepository.remove(authRecord);
			throw new Error('Authorization code already used');
		}

		// Validate redirect URI
		if (redirectUri && authRecord.redirectUri !== redirectUri) {
			throw new Error('Redirect URI mismatch');
		}

		// Verify PKCE code verifier
		if (codeVerifier) {
			const hash = createHash('sha256').update(codeVerifier).digest('base64url');
			if (hash !== authRecord.codeChallenge) {
				throw new Error('Invalid code verifier');
			}
		}

		// Mark authorization code as used
		authRecord.used = true;
		await this.authorizationCodeRepository.save(authRecord);

		// Generate access token
		const accessToken = randomBytes(32).toString('hex');
		const refreshToken = randomBytes(32).toString('hex');

		try {
			await this.accessTokenRepository.save({
				token: accessToken,
				clientId: client.client_id,
				userId: authRecord.userId,
				// expiresAt: Date.now() + 3600 * 1000, // 1 hour
				revoked: false,
			});
		} catch (e) {
			console.log(e);
		}
		// Save access token

		// Save refresh token
		await this.refreshTokenRepository.save({
			token: refreshToken,
			clientId: client.client_id,
			userId: authRecord.userId,
			expiresAt: Date.now() + 30 * 24 * 3600 * 1000, // 30 days
			revoked: false,
		});

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
		// Find the refresh token record
		const refreshTokenRecord = await this.refreshTokenRepository.findOne({
			where: {
				token: refreshToken,
				clientId: client.client_id,
			},
		});

		if (!refreshTokenRecord) {
			throw new Error('Invalid refresh token');
		}

		// Check if expired
		if (refreshTokenRecord.expiresAt < Date.now()) {
			await this.refreshTokenRepository.remove(refreshTokenRecord);
			throw new Error('Refresh token expired');
		}

		// Check if revoked
		if (refreshTokenRecord.revoked) {
			throw new Error('Refresh token has been revoked');
		}

		// Generate new access token
		const accessToken = randomBytes(32).toString('hex');

		// Save new access token
		await this.accessTokenRepository.save({
			token: accessToken,
			clientId: client.client_id,
			userId: refreshTokenRecord.userId,
			expiresAt: Date.now() + 3600 * 1000, // 1 hour
			revoked: false,
		});

		this.logger.info('Refresh token exchanged for new access token', {
			clientId: client.client_id,
			userId: refreshTokenRecord.userId,
		});

		return {
			access_token: accessToken,
			token_type: 'Bearer',
			expires_in: 3600,
			refresh_token: refreshToken, // Return same refresh token
		};
	}

	async verifyAccessToken(token: string): Promise<AuthInfo> {
		// Find the access token record
		const accessTokenRecord = await this.accessTokenRepository.findOne({
			where: {
				token,
			},
		});

		if (!accessTokenRecord) {
			throw new Error('Invalid access token');
		}

		// Check if expired
		if (accessTokenRecord.expiresAt < Date.now()) {
			await this.accessTokenRepository.remove(accessTokenRecord);
			throw new Error('Access token expired');
		}

		// Check if revoked
		if (accessTokenRecord.revoked) {
			throw new Error('Access token has been revoked');
		}

		// Return auth info
		return {
			token,
			clientId: accessTokenRecord.clientId,
			scopes: [], // TODO: Implement scopes support
			expiresAt: accessTokenRecord.expiresAt,
			extra: {
				userId: accessTokenRecord.userId,
			},
		};
	}

	/**
	 * Get consent details from session cookie
	 */
	async getConsentDetails(
		sessionId: string,
		userId: string,
	): Promise<{
		clientName: string;
		clientId: string;
		scopes: string[];
	} | null> {
		const authRecord = await this.authorizationCodeRepository.findOne({
			where: {
				code: sessionId,
				userId,
			},
		});

		if (!authRecord || authRecord.expiresAt < Date.now()) {
			if (authRecord) {
				await this.authorizationCodeRepository.remove(authRecord);
			}
			return null;
		}

		const client = await this.oauthClientRepository.findOne({
			where: { id: authRecord.clientId },
		});

		if (!client) {
			return null;
		}

		return {
			clientName: client.name,
			clientId: client.id,
			scopes: [], // TODO: Add scopes support
		};
	}

	/**
	 * Handle consent approval/denial
	 */
	async handleConsentDecision(
		sessionId: string,
		userId: string,
		approved: boolean,
	): Promise<{ redirectUrl: string }> {
		const authRecord = await this.authorizationCodeRepository.findOne({
			where: {
				code: sessionId,
				userId,
			},
		});

		if (!authRecord) {
			throw new Error('Invalid session');
		}

		if (authRecord.expiresAt < Date.now()) {
			await this.authorizationCodeRepository.remove(authRecord);
			throw new Error('Session expired');
		}

		const redirectUrl = new URL(authRecord.redirectUri);

		if (!approved) {
			// User denied consent
			redirectUrl.searchParams.set('error', 'access_denied');
			redirectUrl.searchParams.set('error_description', 'User denied the authorization request');

			// Clean up the pending authorization
			await this.authorizationCodeRepository.remove(authRecord);
		} else {
			// User approved - save consent and generate authorization code
			await this.userConsentRepository.save({
				userId,
				clientId: authRecord.clientId,
				grantedAt: Date.now(),
			});

			// Generate final authorization code
			// const code = randomBytes(32).toString('hex');
			// authRecord.code = code;
			await this.authorizationCodeRepository.save(authRecord);

			redirectUrl.searchParams.set('code', authRecord.code);
		}

		this.logger.info('Consent decision handled', {
			clientId: authRecord.clientId,
			userId,
			approved,
		});

		return { redirectUrl: redirectUrl.toString() };
	}

	async revokeToken(
		client: OAuthClientInformationFull,
		request: OAuthTokenRevocationRequest,
	): Promise<void> {
		const { token, token_type_hint } = request;

		// Try to revoke as access token first (or if hint is 'access_token')
		if (!token_type_hint || token_type_hint === 'access_token') {
			const accessTokenRecord = await this.accessTokenRepository.findOne({
				where: {
					token,
					clientId: client.client_id,
				},
			});

			if (accessTokenRecord) {
				accessTokenRecord.revoked = true;
				await this.accessTokenRepository.save(accessTokenRecord);
				this.logger.info('Access token revoked', {
					clientId: client.client_id,
					userId: accessTokenRecord.userId,
				});
				return;
			}
		}

		// Try to revoke as refresh token
		if (!token_type_hint || token_type_hint === 'refresh_token') {
			const refreshTokenRecord = await this.refreshTokenRepository.findOne({
				where: {
					token,
					clientId: client.client_id,
				},
			});

			if (refreshTokenRecord) {
				refreshTokenRecord.revoked = true;
				await this.refreshTokenRepository.save(refreshTokenRecord);
				this.logger.info('Refresh token revoked', {
					clientId: client.client_id,
					userId: refreshTokenRecord.userId,
				});
				return;
			}
		}

		// If token not found, silently succeed per OAuth 2.0 spec
		this.logger.debug('Token revocation requested for unknown token', {
			clientId: client.client_id,
		});
	}
}
