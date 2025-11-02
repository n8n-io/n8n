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
import { randomBytes, randomUUID } from 'node:crypto';

import { JwtService } from '@/services/jwt.service';

import { AccessTokenRepository } from './oauth-access-token.repository';
import { AuthorizationCodeRepository } from './oauth-authorization-code.repository';
import { OAuthClientRepository } from './oauth-client.repository';
import { RefreshTokenRepository } from './oauth-refresh-token.repository';
import { OAuthSessionService, type OAuthSessionPayload } from './oauth-session.service';
import { UserConsentRepository } from './oauth-user-consent.repository';

type OAuthClientInformationFullWithScopes = OAuthClientInformationFull & {};

@Service()
export class McpOAuthService implements OAuthServerProvider {
	private readonly MCP_AUDIENCE = 'mcp-server-api';

	constructor(
		private readonly logger: Logger,
		private readonly jwtService: JwtService,
		private readonly oauthSessionService: OAuthSessionService,
		private readonly oauthClientRepository: OAuthClientRepository,
		private readonly authorizationCodeRepository: AuthorizationCodeRepository,
		private readonly accessTokenRepository: AccessTokenRepository,
		private readonly refreshTokenRepository: RefreshTokenRepository,
		private readonly userConsentRepository: UserConsentRepository,
	) {}

	/**
	 * Helper: Create and set OAuth session cookie, then redirect to consent page
	 */
	private redirectToConsentPage(
		res: Response,
		client: OAuthClientInformationFull,
		params: AuthorizationParams,
	): void {
		this.oauthSessionService.createSession(res, {
			clientId: client.client_id,
			redirectUri: params.redirectUri,
			codeChallenge: params.codeChallenge,
			state: params.state ?? null,
		});

		res.redirect('/oauth/consent');
	}

	/**
	 * Helper: Generate and save authorization code
	 */
	private async createAuthorizationCode(
		clientId: string,
		userId: string,
		redirectUri: string,
		codeChallenge: string,
		state: string | null,
	): Promise<string> {
		const code = randomBytes(32).toString('hex');

		await this.authorizationCodeRepository.save({
			code,
			clientId,
			userId,
			redirectUri,
			codeChallenge,
			codeChallengeMethod: 'S256',
			state,
			expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
			used: false,
		});

		return code;
	}

	/**
	 * Helper: Build redirect URL with authorization code
	 */
	private buildSuccessRedirectUrl(redirectUri: string, code: string, state: string | null): string {
		const targetUrl = new URL(redirectUri);
		targetUrl.searchParams.set('code', code);
		if (state) {
			targetUrl.searchParams.set('state', state);
		}
		return targetUrl.toString();
	}

	/**
	 * Helper: Find and validate authorization code (without consuming)
	 * Returns the auth record if valid, throws if invalid/expired
	 */
	private async findAndValidateAuthorizationCode(authorizationCode: string, clientId: string) {
		const authRecord = await this.authorizationCodeRepository.findOne({
			where: {
				code: authorizationCode,
				clientId,
			},
		});

		if (!authRecord) {
			throw new Error('Invalid authorization code');
		}

		if (authRecord.expiresAt < Date.now()) {
			await this.authorizationCodeRepository.remove(authRecord);
			throw new Error('Authorization code expired');
		}

		return authRecord;
	}

	/**
	 * Helper: Validate and consume authorization code
	 * Returns the auth record if valid, throws if invalid/expired/used
	 */
	private async validateAndConsumeAuthorizationCode(
		authorizationCode: string,
		clientId: string,
		redirectUri?: string,
	) {
		const authRecord = await this.findAndValidateAuthorizationCode(authorizationCode, clientId);

		if (authRecord.used) {
			await this.authorizationCodeRepository.remove(authRecord);
			throw new Error('Authorization code already used');
		}

		if (redirectUri && authRecord.redirectUri !== redirectUri) {
			throw new Error('Redirect URI mismatch');
		}

		// Mark as used
		authRecord.used = true;
		await this.authorizationCodeRepository.save(authRecord);

		return authRecord;
	}

	/**
	 * Helper: Generate token pair (access + refresh)
	 * Access token: JWT with MCP audience claim
	 * Refresh token: Opaque token
	 */
	private generateTokenPair(
		userId: string,
		clientId: string,
	): { accessToken: string; refreshToken: string } {
		const accessToken = this.jwtService.sign({
			sub: userId,
			aud: this.MCP_AUDIENCE,
			client_id: clientId,
			jti: randomUUID(),
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
		});

		const refreshToken = randomBytes(32).toString('hex');

		return { accessToken, refreshToken };
	}

	/**
	 * Helper: Save token pair to database
	 */
	private async saveTokenPair(
		accessToken: string,
		refreshToken: string,
		clientId: string,
		userId: string,
	): Promise<void> {
		const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 3600 * 1000; // 30 days

		// TODO: Wrap in transaction for atomicity
		// TODO: Add expiresAt when implementing JWT tokens (ACCESS_TOKEN_EXPIRY_MS = 3600 * 1000)
		await this.accessTokenRepository.save({
			token: accessToken,
			clientId,
			userId,
			revoked: false,
		});

		await this.refreshTokenRepository.save({
			token: refreshToken,
			clientId,
			userId,
			expiresAt: Date.now() + REFRESH_TOKEN_EXPIRY_MS,
		});
	}

	get clientsStore(): OAuthRegisteredClientsStore {
		return {
			getClient: async (
				clientId: string,
			): Promise<OAuthClientInformationFullWithScopes | undefined> => {
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
					scope: client.scopes,
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
						scopes: client.scope ?? '',
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
			this.redirectToConsentPage(res, client, params);
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
		const authRecord = await this.findAndValidateAuthorizationCode(
			authorizationCode,
			client.client_id,
		);

		// Return the code challenge for PKCE verification
		return authRecord.codeChallenge;
	}
	async exchangeAuthorizationCode(
		client: OAuthClientInformationFull,
		authorizationCode: string,
		_codeVerifier?: string,
		redirectUri?: string,
	): Promise<OAuthTokens> {
		// Validate and consume the authorization code
		const authRecord = await this.validateAndConsumeAuthorizationCode(
			authorizationCode,
			client.client_id,
			redirectUri,
		);

		// Generate token pair with user and client info
		const { accessToken, refreshToken } = this.generateTokenPair(
			authRecord.userId,
			client.client_id,
		);

		// Persist tokens to database
		await this.saveTokenPair(accessToken, refreshToken, client.client_id, authRecord.userId);

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
		// Validate refresh token
		const refreshTokenRecord = await this.refreshTokenRepository.findOne({
			where: {
				token: refreshToken,
				clientId: client.client_id,
			},
		});

		if (!refreshTokenRecord) {
			throw new Error('Invalid refresh token');
		}

		if (refreshTokenRecord.expiresAt < Date.now()) {
			await this.refreshTokenRepository.remove(refreshTokenRecord);
			throw new Error('Refresh token expired');
		}

		// Generate new token pair (refresh token rotation for OAuth 2.1 security)
		const { accessToken, refreshToken: newRefreshToken } = this.generateTokenPair(
			refreshTokenRecord.userId,
			client.client_id,
		);

		// Invalidate old refresh token (prevents reuse)
		await this.refreshTokenRepository.remove(refreshTokenRecord);

		// Save new token pair to database
		await this.saveTokenPair(
			accessToken,
			newRefreshToken,
			client.client_id,
			refreshTokenRecord.userId,
		);

		this.logger.info('Refresh token rotated and new access token issued', {
			clientId: client.client_id,
			userId: refreshTokenRecord.userId,
		});

		return {
			access_token: accessToken,
			token_type: 'Bearer',
			expires_in: 3600,
			refresh_token: newRefreshToken, // Return new refresh token (rotation)
		};
	}

	async verifyAccessToken(token: string): Promise<AuthInfo> {
		// Step 1: Verify JWT signature and decode claims
		let decoded: {
			sub: string;
			aud: string;
			client_id: string;
			jti: string;
			iat: number;
			exp: number;
		};

		try {
			decoded = this.jwtService.verify(token);
		} catch (error) {
			throw new Error('Invalid access token: JWT verification failed');
		}

		// Step 2: Validate audience (MCP spec requirement - RFC 8707)
		if (decoded.aud !== this.MCP_AUDIENCE) {
			throw new Error(`Invalid token audience: expected ${this.MCP_AUDIENCE}, got ${decoded.aud}`);
		}

		// Step 3: Check database for revocation (immediate revocation on user action)
		const accessTokenRecord = await this.accessTokenRepository.findOne({
			where: { token },
		});

		if (!accessTokenRecord) {
			throw new Error('Invalid access token: not found in database');
		}

		if (accessTokenRecord.revoked) {
			throw new Error('Access token has been revoked');
		}

		// JWT expiry is validated by jwtService.verify(), no need to check expiresAt again

		// Return auth info from JWT claims
		return {
			token,
			clientId: decoded.client_id,
			scopes: [], // TODO: Implement scopes support
			extra: {
				userId: decoded.sub,
			},
		};
	}

	/**
	 * Get consent details from session cookie
	 * Verifies JWT session token and returns client information
	 */
	async getConsentDetails(sessionToken: string): Promise<{
		clientName: string;
		clientId: string;
		scopes: string[];
	} | null> {
		try {
			// Verify and decode the JWT session token
			const sessionPayload = this.oauthSessionService.verifySession(sessionToken);

			// Look up the client
			const client = await this.oauthClientRepository.findOne({
				where: { id: sessionPayload.clientId },
			});

			if (!client) {
				return null;
			}

			return {
				clientName: client.name,
				clientId: client.id,
				scopes: client.scopes.split(' '),
			};
		} catch (error) {
			this.logger.error('Error getting consent details', { error });
			return null;
		}
	}

	/**
	 * Handle consent approval/denial
	 * Uses JWT session token instead of database lookup
	 */
	async handleConsentDecision(
		sessionToken: string,
		userId: string,
		approved: boolean,
	): Promise<{ redirectUrl: string }> {
		// Verify the JWT session token
		let sessionPayload: OAuthSessionPayload;
		try {
			sessionPayload = this.oauthSessionService.verifySession(sessionToken);
		} catch (error) {
			throw new Error('Invalid or expired session');
		}

		const redirectUrl = new URL(sessionPayload.redirectUri);

		if (!approved) {
			// User denied consent
			redirectUrl.searchParams.set('error', 'access_denied');
			redirectUrl.searchParams.set('error_description', 'User denied the authorization request');

			this.logger.info('Consent denied', {
				clientId: sessionPayload.clientId,
				userId,
			});
		} else {
			// User approved - save consent and generate authorization code
			await this.userConsentRepository.save({
				userId,
				clientId: sessionPayload.clientId,
				grantedAt: Date.now(),
			});

			const code = await this.createAuthorizationCode(
				sessionPayload.clientId,
				userId,
				sessionPayload.redirectUri,
				sessionPayload.codeChallenge,
				sessionPayload.state,
			);

			const successRedirectUrl = this.buildSuccessRedirectUrl(
				sessionPayload.redirectUri,
				code,
				sessionPayload.state,
			);

			this.logger.info('Consent approved', {
				clientId: sessionPayload.clientId,
				userId,
			});

			return { redirectUrl: successRedirectUrl };
		}

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
