import type { ClientOAuth2Options, OAuth2CredentialData } from '@n8n/client-oauth2';
import { ClientOAuth2, ClientOAuth2Token } from '@n8n/client-oauth2';
import { Get, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';
import omit from 'lodash/omit';
import set from 'lodash/set';
import split from 'lodash/split';
import {
	ensureError,
	type ICredentialDataDecryptedObject,
	jsonParse,
	jsonStringify,
} from 'n8n-workflow';
import pkceChallenge from 'pkce-challenge';
import * as qs from 'querystring';

import { GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE as GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE } from '@/constants';
import { OAuthRequest } from '@/requests';

import { AbstractOAuthController, skipAuthOnOAuthCallback } from './abstract-oauth.controller';

@RestController('/oauth2-credential')
export class OAuth2CredentialController extends AbstractOAuthController {
	override oauthVersion = 2;

	/** Get Authorization url */
	@Get('/auth')
	async getAuthUri(req: OAuthRequest.OAuth2Credential.Auth): Promise<string> {
		const credential = await this.getCredential(req);
		const additionalData = await this.getAdditionalData();
		const decryptedDataOriginal = await this.getDecryptedDataForAuthUri(credential, additionalData);

		// At some point in the past we saved hidden scopes to credentials (but shouldn't)
		// Delete scope before applying defaults to make sure new scopes are present on reconnect
		// Generic Oauth2 API is an exception because it needs to save the scope

		if (
			decryptedDataOriginal?.scope &&
			credential.type.includes('OAuth2') &&
			!GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE.includes(credential.type)
		) {
			delete decryptedDataOriginal.scope;
		}

		const oauthCredentials = await this.applyDefaultsAndOverwrites<OAuth2CredentialData>(
			credential,
			decryptedDataOriginal,
			additionalData,
		);

		// Generate a CSRF prevention token and send it as an OAuth2 state string
		const [csrfSecret, state] = this.createCsrfState(
			credential.id,
			skipAuthOnOAuthCallback ? undefined : req.user.id,
		);

		const oAuthOptions = {
			...this.convertCredentialToOptions(oauthCredentials),
			state,
		};

		if (oauthCredentials.authQueryParameters) {
			oAuthOptions.query = qs.parse(oauthCredentials.authQueryParameters);
		}

		await this.externalHooks.run('oauth2.authenticate', [oAuthOptions]);

		const toUpdate: ICredentialDataDecryptedObject = { csrfSecret };
		if (oauthCredentials.grantType === 'pkce') {
			const { code_verifier, code_challenge } = await pkceChallenge();
			oAuthOptions.query = {
				...oAuthOptions.query,
				code_challenge,
				code_challenge_method: 'S256',
			};
			toUpdate.codeVerifier = code_verifier;
		}

		await this.encryptAndSaveData(credential, toUpdate);

		const oAuthObj = new ClientOAuth2(oAuthOptions);
		const returnUri = oAuthObj.code.getUri();

		this.logger.debug('OAuth2 authorization url created for credential', {
			userId: req.user.id,
			credentialId: credential.id,
		});

		return returnUri.toString();
	}

	/** Verify and store app code. Generate access tokens and store for respective credential */
	@Get('/callback', { usesTemplates: true, skipAuth: skipAuthOnOAuthCallback })
	async handleCallback(req: OAuthRequest.OAuth2Credential.Callback, res: Response) {
		try {
			const { code, state: encodedState } = req.query;
			if (!code || !encodedState) {
				return this.renderCallbackError(
					res,
					'Insufficient parameters for OAuth2 callback.',
					`Received following query parameters: ${JSON.stringify(req.query)}`,
				);
			}

			const [credential, decryptedDataOriginal, oauthCredentials] =
				await this.resolveCredential<OAuth2CredentialData>(req);

			let options: Partial<ClientOAuth2Options> = {};

			const oAuthOptions = this.convertCredentialToOptions(oauthCredentials);

			if (oauthCredentials.grantType === 'pkce') {
				options = {
					body: { code_verifier: decryptedDataOriginal.codeVerifier },
				};
			} else if (oauthCredentials.authentication === 'body') {
				options = {
					body: {
						...(oAuthOptions.body ?? {}),
						client_id: oAuthOptions.clientId,
						client_secret: oAuthOptions.clientSecret,
					},
				};
				delete oAuthOptions.clientSecret;
			}

			await this.externalHooks.run('oauth2.callback', [oAuthOptions]);

			const oAuthObj = new ClientOAuth2(oAuthOptions);

			const queryParameters = req.originalUrl.split('?').splice(1, 1).join('');

			const oauthToken = await oAuthObj.code.getToken(
				`${oAuthOptions.redirectUri as string}?${queryParameters}`,
				options,
			);

			if (Object.keys(req.query).length > 2) {
				set(oauthToken.data, 'callbackQueryString', omit(req.query, 'state', 'code'));
			}

			// Only overwrite supplied data as some providers do for example just return the
			// refresh_token on the very first request and not on subsequent ones.
			let { oauthTokenData } = decryptedDataOriginal;
			oauthTokenData = {
				...(typeof oauthTokenData === 'object' ? oauthTokenData : {}),
				...oauthToken.data,
			};

			await this.encryptAndSaveData(credential, { oauthTokenData }, ['csrfSecret']);

			this.logger.debug('OAuth2 callback successful for credential', {
				credentialId: credential.id,
			});

			return res.render('oauth-callback');
		} catch (e) {
			const error = ensureError(e);
			return this.renderCallbackError(
				res,
				error.message,
				'body' in error ? jsonStringify(error.body) : undefined,
			);
		}
	}

	/** Refresh OAuth2 access token using refresh token */
	@Post('/refresh')
	async refreshToken(req: OAuthRequest.OAuth2Credential.Auth): Promise<{
		success: boolean;
		message: string;
		tokenData?: any;
		expiresAt?: string;
	}> {
		try {
			const credential = await this.getCredential(req);
			const additionalData = await this.getAdditionalData();
			const decryptedData = await this.getDecryptedDataForCallback(credential, additionalData);

			if (!decryptedData.oauthTokenData) {
				return {
					success: false,
					message: 'No OAuth token data found. Please re-authenticate.',
				};
			}

			const tokenData = decryptedData.oauthTokenData as any;
			if (!tokenData.refresh_token) {
				return {
					success: false,
					message: 'No refresh token available. Please re-authenticate.',
				};
			}

			const oauthCredentials = await this.applyDefaultsAndOverwrites<OAuth2CredentialData>(
				credential,
				decryptedData,
				additionalData,
			);

			const oAuthOptions = this.convertCredentialToOptions(oauthCredentials);
			const oAuthObj = new ClientOAuth2(oAuthOptions);

			// Create a token object from existing token data
			const existingToken = new ClientOAuth2Token(oAuthObj, tokenData);

			// Check if token is expired
			if (!existingToken.expired()) {
				const expiresAt = new Date(Date.now() + parseInt(tokenData.expires_in || '3600') * 1000);
				return {
					success: true,
					message: 'Token is still valid',
					tokenData: {
						access_token: tokenData.access_token,
						token_type: tokenData.token_type,
						expires_in: tokenData.expires_in,
					},
					expiresAt: expiresAt.toISOString(),
				};
			}

			// Refresh the token
			const refreshedToken = await existingToken.refresh();

			// Save the new token data
			const newTokenData = {
				...tokenData,
				...refreshedToken.data,
			};

			await this.encryptAndSaveData(credential, { oauthTokenData: newTokenData });

			this.logger.debug('OAuth2 token refreshed successfully', {
				userId: req.user.id,
				credentialId: credential.id,
			});

			const expiresAt = new Date(
				Date.now() + parseInt(refreshedToken.data.expires_in || '3600') * 1000,
			);

			return {
				success: true,
				message: 'Token refreshed successfully',
				tokenData: {
					access_token: refreshedToken.data.access_token,
					token_type: refreshedToken.data.token_type,
					expires_in: refreshedToken.data.expires_in,
				},
				expiresAt: expiresAt.toISOString(),
			};
		} catch (error) {
			this.logger.error('OAuth2 token refresh failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				success: false,
				message: error instanceof Error ? error.message : 'Token refresh failed',
			};
		}
	}

	/** Get OAuth2 token status and expiration information */
	@Get('/status')
	async getTokenStatus(req: OAuthRequest.OAuth2Credential.Auth): Promise<{
		isValid: boolean;
		isExpired: boolean;
		expiresAt?: string;
		hasRefreshToken: boolean;
		scope?: string;
		tokenType?: string;
		message: string;
	}> {
		try {
			const credential = await this.getCredential(req);
			const additionalData = await this.getAdditionalData();
			const decryptedData = await this.getDecryptedDataForCallback(credential, additionalData);

			if (!decryptedData.oauthTokenData) {
				return {
					isValid: false,
					isExpired: true,
					hasRefreshToken: false,
					message: 'No OAuth token data found',
				};
			}

			const tokenData = decryptedData.oauthTokenData as any;
			const hasRefreshToken = !!tokenData.refresh_token;

			if (!tokenData.access_token) {
				return {
					isValid: false,
					isExpired: true,
					hasRefreshToken,
					message: 'No access token found',
				};
			}

			const oauthCredentials = await this.applyDefaultsAndOverwrites<OAuth2CredentialData>(
				credential,
				decryptedData,
				additionalData,
			);

			const oAuthOptions = this.convertCredentialToOptions(oauthCredentials);
			const oAuthObj = new ClientOAuth2(oAuthOptions);
			const token = new ClientOAuth2Token(oAuthObj, tokenData);

			const isExpired = token.expired();
			const expiresAt = tokenData.expires_in
				? new Date(Date.now() + parseInt(tokenData.expires_in) * 1000).toISOString()
				: undefined;

			this.logger.debug('OAuth2 token status checked', {
				userId: req.user.id,
				credentialId: credential.id,
				isExpired,
				hasRefreshToken,
			});

			return {
				isValid: !isExpired,
				isExpired,
				expiresAt,
				hasRefreshToken,
				scope: tokenData.scope,
				tokenType: tokenData.token_type,
				message: isExpired
					? hasRefreshToken
						? 'Token expired but can be refreshed'
						: 'Token expired and no refresh token available'
					: 'Token is valid',
			};
		} catch (error) {
			this.logger.error('OAuth2 token status check failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				isValid: false,
				isExpired: true,
				hasRefreshToken: false,
				message: error instanceof Error ? error.message : 'Status check failed',
			};
		}
	}

	/** Complete OAuth2 credential flow with enhanced validation */
	@Post('/complete')
	async completeCredentialFlow(req: OAuthRequest.OAuth2Credential.Auth): Promise<{
		success: boolean;
		message: string;
		credentialId: string;
		tokenStatus?: any;
		flowMetadata?: any;
	}> {
		try {
			const credential = await this.getCredential(req);
			const additionalData = await this.getAdditionalData();
			const decryptedData = await this.getDecryptedDataForCallback(credential, additionalData);

			// Validate that OAuth flow was completed
			if (!decryptedData.oauthTokenData) {
				return {
					success: false,
					message: 'OAuth flow not completed. No token data found.',
					credentialId: credential.id,
				};
			}

			const tokenData = decryptedData.oauthTokenData as any;
			if (!tokenData.access_token) {
				return {
					success: false,
					message: 'OAuth flow incomplete. No access token found.',
					credentialId: credential.id,
				};
			}

			// Get token status
			const tokenStatus = await this.getTokenStatus(req);

			// Clean up any temporary data used during OAuth flow
			const cleanupData: string[] = ['csrfSecret', 'codeVerifier'];
			await this.encryptAndSaveData(credential, {}, cleanupData);

			// Emit completion event
			await this.externalHooks.run('oauth2.complete', [
				{
					credentialId: credential.id,
					userId: req.user.id,
					tokenData: {
						hasAccessToken: !!tokenData.access_token,
						hasRefreshToken: !!tokenData.refresh_token,
						tokenType: tokenData.token_type,
						scope: tokenData.scope,
					},
				},
			]);

			this.logger.info('OAuth2 credential flow completed successfully', {
				userId: req.user.id,
				credentialId: credential.id,
				hasRefreshToken: !!tokenData.refresh_token,
			});

			return {
				success: true,
				message: 'OAuth2 credential flow completed successfully',
				credentialId: credential.id,
				tokenStatus,
				flowMetadata: {
					completedAt: new Date().toISOString(),
					hasRefreshToken: !!tokenData.refresh_token,
					scope: tokenData.scope,
					tokenType: tokenData.token_type,
				},
			};
		} catch (error) {
			this.logger.error('OAuth2 credential flow completion failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				success: false,
				message: error instanceof Error ? error.message : 'Flow completion failed',
				credentialId: req.query.id as string,
			};
		}
	}

	/** Revoke OAuth2 tokens and reset credential */
	@Post('/revoke')
	async revokeToken(req: OAuthRequest.OAuth2Credential.Auth): Promise<{
		success: boolean;
		message: string;
		revokedTokens: string[];
	}> {
		try {
			const credential = await this.getCredential(req);
			const additionalData = await this.getAdditionalData();
			const decryptedData = await this.getDecryptedDataForCallback(credential, additionalData);

			if (!decryptedData.oauthTokenData) {
				return {
					success: false,
					message: 'No OAuth token data found to revoke',
					revokedTokens: [],
				};
			}

			const tokenData = decryptedData.oauthTokenData as any;
			const revokedTokens: string[] = [];

			const oauthCredentials = await this.applyDefaultsAndOverwrites<OAuth2CredentialData>(
				credential,
				decryptedData,
				additionalData,
			);

			// Attempt to revoke tokens at the OAuth provider if revocation endpoint is available
			if (oauthCredentials.revokeTokenUrl) {
				const oAuthOptions = this.convertCredentialToOptions(oauthCredentials);
				const oAuthObj = new ClientOAuth2(oAuthOptions);

				// Try to revoke refresh token first
				if (tokenData.refresh_token) {
					try {
						const token = new ClientOAuth2Token(oAuthObj, tokenData);
						// Note: The client-oauth2 library doesn't have built-in revoke method,
						// but we can make a direct request to the revocation endpoint
						await this.makeRevocationRequest(
							oauthCredentials.revokeTokenUrl,
							tokenData.refresh_token,
							oAuthOptions,
						);
						revokedTokens.push('refresh_token');
					} catch (error) {
						this.logger.warn('Failed to revoke refresh token at provider', {
							credentialId: credential.id,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				}

				// Try to revoke access token
				if (tokenData.access_token) {
					try {
						await this.makeRevocationRequest(
							oauthCredentials.revokeTokenUrl,
							tokenData.access_token,
							oAuthOptions,
						);
						revokedTokens.push('access_token');
					} catch (error) {
						this.logger.warn('Failed to revoke access token at provider', {
							credentialId: credential.id,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				}
			}

			// Always clear token data from credential
			await this.encryptAndSaveData(credential, {}, [
				'oauthTokenData',
				'csrfSecret',
				'codeVerifier',
			]);

			// Emit revocation event
			await this.externalHooks.run('oauth2.revoke', [
				{
					credentialId: credential.id,
					userId: req.user.id,
					revokedTokens,
				},
			]);

			this.logger.info('OAuth2 tokens revoked successfully', {
				userId: req.user.id,
				credentialId: credential.id,
				revokedTokens,
			});

			return {
				success: true,
				message: `OAuth2 tokens revoked successfully. ${revokedTokens.length > 0 ? 'Provider notified.' : 'Local tokens cleared.'}`,
				revokedTokens,
			};
		} catch (error) {
			this.logger.error('OAuth2 token revocation failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				success: false,
				message: error instanceof Error ? error.message : 'Token revocation failed',
				revokedTokens: [],
			};
		}
	}

	private async makeRevocationRequest(
		revokeUrl: string,
		token: string,
		oAuthOptions: ClientOAuth2Options,
	): Promise<void> {
		const { default: axios } = await import('axios');

		const headers: Record<string, string> = {
			'Content-Type': 'application/x-www-form-urlencoded',
		};

		const body = new URLSearchParams({
			token,
			token_type_hint: token.includes('refresh') ? 'refresh_token' : 'access_token',
		});

		// Add authentication
		if (oAuthOptions.authentication === 'body') {
			body.append('client_id', oAuthOptions.clientId);
			body.append('client_secret', oAuthOptions.clientSecret);
		} else {
			const auth = Buffer.from(`${oAuthOptions.clientId}:${oAuthOptions.clientSecret}`).toString(
				'base64',
			);
			headers.Authorization = `Basic ${auth}`;
		}

		await axios.post(revokeUrl, body.toString(), {
			headers,
			timeout: 10000,
		});
	}

	private convertCredentialToOptions(credential: OAuth2CredentialData): ClientOAuth2Options {
		const options: ClientOAuth2Options = {
			clientId: credential.clientId,
			clientSecret: credential.clientSecret ?? '',
			accessTokenUri: credential.accessTokenUrl ?? '',
			authorizationUri: credential.authUrl ?? '',
			authentication: credential.authentication ?? 'header',
			redirectUri: `${this.baseUrl}/callback`,
			scopes: split(credential.scope ?? 'openid', ','),
			scopesSeparator: credential.scope?.includes(',') ? ',' : ' ',
			ignoreSSLIssues: credential.ignoreSSLIssues ?? false,
		};

		if (
			credential.additionalBodyProperties &&
			typeof credential.additionalBodyProperties === 'string'
		) {
			const parsedBody = jsonParse<Record<string, string>>(credential.additionalBodyProperties);

			if (parsedBody) {
				options.body = parsedBody;
			}
		}

		return options;
	}
}
