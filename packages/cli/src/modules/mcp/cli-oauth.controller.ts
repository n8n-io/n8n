import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Get, Post, RootLevelController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { McpOAuthAuthorizationCodeService } from './mcp-oauth-authorization-code.service';
import { McpOAuthTokenService } from './mcp-oauth-token.service';
import { McpOAuthHelpers } from './mcp-oauth.helpers';
import { OAuthSessionService } from './oauth-session.service';
import { OAuthClientRepository } from './database/repositories/oauth-client.repository';

const CLI_AUDIENCE = 'public-api';

/**
 * Validates that a redirect URI is a safe loopback address per RFC 8252 §7.3.
 * Only http://127.0.0.1 and http://localhost are accepted (port is ignored).
 */
function isValidLoopbackRedirectUri(redirectUri: string): boolean {
	try {
		const url = new URL(redirectUri);
		if (url.protocol !== 'http:') return false;
		const hostname = url.hostname;
		return hostname === '127.0.0.1' || hostname === 'localhost';
	} catch {
		return false;
	}
}

@RootLevelController('/')
export class CliOAuthController {
	constructor(
		private readonly logger: Logger,
		private readonly oauthSessionService: OAuthSessionService,
		private readonly oauthClientRepository: OAuthClientRepository,
		private readonly authorizationCodeService: McpOAuthAuthorizationCodeService,
		private readonly tokenService: McpOAuthTokenService,
	) {}

	/**
	 * OAuth 2.1 authorization endpoint for CLI
	 * Validates client, stores session, redirects to consent UI
	 */
	@Get('/oauth/authorize', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: { limit: 50, windowMs: 5 * Time.minutes.toMilliseconds },
	})
	async authorize(req: Request, res: Response) {
		const {
			client_id: clientId,
			redirect_uri: redirectUri,
			response_type: responseType,
			code_challenge: codeChallenge,
			code_challenge_method: codeChallengeMethod,
			state,
			scope,
		} = req.query as Record<string, string | undefined>;

		// Validate required params
		if (!clientId || !redirectUri || !codeChallenge) {
			res.status(400).json({
				error: 'invalid_request',
				error_description: 'Missing required parameters: client_id, redirect_uri, code_challenge',
			});
			return;
		}

		if (responseType !== 'code') {
			res.status(400).json({
				error: 'unsupported_response_type',
				error_description: 'Only response_type=code is supported',
			});
			return;
		}

		if (codeChallengeMethod !== 'S256') {
			res.status(400).json({
				error: 'invalid_request',
				error_description: 'Only code_challenge_method=S256 is supported',
			});
			return;
		}

		// Validate redirect URI: loopback only (RFC 8252 §7.3)
		if (!isValidLoopbackRedirectUri(redirectUri)) {
			res.status(400).json({
				error: 'invalid_request',
				error_description: 'redirect_uri must use http scheme with 127.0.0.1 or localhost hostname',
			});
			return;
		}

		// Validate client exists
		const client = await this.oauthClientRepository.findOneBy({ id: clientId });
		if (!client) {
			res.status(400).json({
				error: 'invalid_client',
				error_description: 'Unknown client_id',
			});
			return;
		}

		// Parse requested scopes
		const scopes = scope ? scope.split(' ').filter(Boolean) : [];

		try {
			this.oauthSessionService.createSession(res, {
				clientId,
				redirectUri,
				codeChallenge,
				state: state ?? null,
				scopes,
			});

			res.redirect('/oauth/cli-consent');
		} catch (error) {
			this.logger.error('Error in CLI OAuth authorize', { error, clientId });
			this.oauthSessionService.clearSession(res);
			res.status(500).json({
				error: 'server_error',
				error_description: 'Internal server error',
			});
		}
	}

	/**
	 * OAuth 2.1 token endpoint for CLI
	 * Handles authorization_code and refresh_token grant types
	 */
	@Post('/oauth/token', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: { limit: 20, windowMs: 5 * Time.minutes.toMilliseconds },
	})
	async token(req: Request, res: Response) {
		const { grant_type: grantType } = req.body as Record<string, string>;

		if (grantType === 'authorization_code') {
			await this.handleAuthorizationCodeGrant(req, res);
		} else if (grantType === 'refresh_token') {
			await this.handleRefreshTokenGrant(req, res);
		} else {
			res.status(400).json({
				error: 'unsupported_grant_type',
				error_description: 'Only authorization_code and refresh_token grant types are supported',
			});
		}
	}

	/**
	 * OAuth 2.1 token revocation endpoint for CLI
	 */
	@Post('/oauth/revoke', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: { limit: 30, windowMs: 5 * Time.minutes.toMilliseconds },
	})
	async revoke(req: Request, res: Response) {
		const {
			token,
			token_type_hint: tokenTypeHint,
			client_id: clientId,
		} = req.body as Record<string, string>;

		if (!token || !clientId) {
			res.status(400).json({
				error: 'invalid_request',
				error_description: 'Missing required parameters: token, client_id',
			});
			return;
		}

		try {
			if (!tokenTypeHint || tokenTypeHint === 'access_token') {
				const revoked = await this.tokenService.revokeAccessToken(token, clientId);
				if (revoked) {
					res.status(200).json({});
					return;
				}
			}

			if (!tokenTypeHint || tokenTypeHint === 'refresh_token') {
				const revoked = await this.tokenService.revokeRefreshToken(token, clientId);
				if (revoked) {
					res.status(200).json({});
					return;
				}
			}

			// Per RFC 7009, revocation of unknown tokens is not an error
			res.status(200).json({});
		} catch (error) {
			this.logger.error('Error revoking token', { error, clientId });
			res.status(500).json({
				error: 'server_error',
				error_description: 'Failed to revoke token',
			});
		}
	}

	private async handleAuthorizationCodeGrant(req: Request, res: Response) {
		const {
			code,
			code_verifier: codeVerifier,
			redirect_uri: redirectUri,
			client_id: clientId,
		} = req.body as Record<string, string>;

		if (!code || !codeVerifier || !clientId) {
			res.status(400).json({
				error: 'invalid_request',
				error_description: 'Missing required parameters: code, code_verifier, client_id',
			});
			return;
		}

		try {
			// Step 1: Find and validate the auth code (without consuming)
			const authRecord = await this.authorizationCodeService.findAndValidateAuthorizationCode(
				code,
				clientId,
			);

			// Step 2: Verify PKCE BEFORE consuming the code
			// If PKCE fails, the code is NOT consumed and can be retried
			if (!McpOAuthHelpers.verifyPkceS256(codeVerifier, authRecord.codeChallenge)) {
				res.status(400).json({
					error: 'invalid_grant',
					error_description: 'PKCE verification failed',
				});
				return;
			}

			// Step 3: Verify redirect URI if provided
			if (redirectUri && authRecord.redirectUri !== redirectUri) {
				res.status(400).json({
					error: 'invalid_grant',
					error_description: 'Redirect URI mismatch',
				});
				return;
			}

			// Step 4: Consume the auth code (atomically mark as used)
			await this.authorizationCodeService.validateAndConsumeAuthorizationCode(
				code,
				clientId,
				redirectUri,
			);

			// Step 5: Read approved scopes from the auth code
			const approvedScopes = authRecord.scopes
				? (JSON.parse(authRecord.scopes) as string[])
				: undefined;

			// Step 6: Generate token pair with public-api audience and scopes
			const { accessToken, refreshToken } = this.tokenService.generateTokenPair(
				authRecord.userId,
				clientId,
				CLI_AUDIENCE,
				approvedScopes,
			);

			await this.tokenService.saveTokenPair(
				accessToken,
				refreshToken,
				clientId,
				authRecord.userId,
				approvedScopes,
			);

			this.logger.info('CLI OAuth authorization code exchanged for tokens', {
				clientId,
				userId: authRecord.userId,
			});

			const response: Record<string, unknown> = {
				access_token: accessToken,
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: refreshToken,
			};

			if (approvedScopes && approvedScopes.length > 0) {
				response.scope = approvedScopes.join(' ');
			}

			res.json(response);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Token exchange failed';
			this.logger.error('CLI OAuth token exchange failed', { error, clientId });
			res.status(400).json({
				error: 'invalid_grant',
				error_description: message,
			});
		}
	}

	private async handleRefreshTokenGrant(req: Request, res: Response) {
		const { refresh_token: refreshToken, client_id: clientId } = req.body as Record<string, string>;

		if (!refreshToken || !clientId) {
			res.status(400).json({
				error: 'invalid_request',
				error_description: 'Missing required parameters: refresh_token, client_id',
			});
			return;
		}

		try {
			const tokens = await this.tokenService.validateAndRotateRefreshToken(
				refreshToken,
				clientId,
				CLI_AUDIENCE,
			);

			res.json(tokens);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Token refresh failed';
			this.logger.error('CLI OAuth token refresh failed', { error, clientId });
			res.status(400).json({
				error: 'invalid_grant',
				error_description: message,
			});
		}
	}
}
