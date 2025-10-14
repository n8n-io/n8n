import type { ClientOAuth2Options, OAuth2CredentialData } from '@n8n/client-oauth2';
import { ClientOAuth2 } from '@n8n/client-oauth2';
import { Get, RestController } from '@n8n/decorators';
import { Response } from 'express';
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
import { Container } from '@n8n/di';
import { UrlService } from '@/services/url.service';
import { GlobalConfig } from '@n8n/config';
import { auth } from '@n8n/client-oauth2/src/utils';

/**
 * OAuth 2.0 Authorization Server Metadata - Based on actual response
 */

interface OAuthAuthorizationServerMetadata {
	/** The authorization server's identifier */
	issuer: string;

	/** URL of the authorization server's authorization endpoint */
	authorization_endpoint: string;

	/** URL of the authorization server's token endpoint */
	token_endpoint: string;

	/** URL of the authorization server's dynamic client registration endpoint */
	registration_endpoint: string;

	/** Array of OAuth 2.0 response_type values supported */
	response_types_supported: string[];

	/** Array of OAuth 2.0 response_mode values supported */
	response_modes_supported: string[];

	/** Array of OAuth 2.0 grant type values supported */
	grant_types_supported: string[];

	/** Array of client authentication methods supported by the token endpoint */
	token_endpoint_auth_methods_supported: string[];

	/** URL of the authorization server's OAuth 2.0 revocation endpoint */
	revocation_endpoint: string;

	/** Array of PKCE code challenge methods supported */
	code_challenge_methods_supported: string[];
}

/**
 * Response types from the actual server
 */
export type OAuth2ResponseType = 'code';

/**
 * Response modes from the actual server
 */
export type OAuth2ResponseMode = 'query';

/**
 * Grant types from the actual server
 */
export type OAuth2GrantType = 'authorization_code' | 'refresh_token';

/**
 * Client authentication methods from the actual server
 */
export type OAuth2ClientAuthMethod = 'client_secret_basic' | 'client_secret_post' | 'none';

/**
 * PKCE code challenge methods from the actual server
 */
export type PKCECodeChallengeMethod = 'plain' | 'S256';

/**
 * Example usage:
 *
 * const metadata: OAuthAuthorizationServerMetadata = await fetch('/.well-known/oauth-authorization-server')
 *   .then(res => res.json());
 *
 * // This server supports PKCE with both plain and S256
 * console.log(metadata.code_challenge_methods_supported); // ["plain", "S256"]
 */

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

		const toUpdate: ICredentialDataDecryptedObject = {};

		if (oauthCredentials.useDynamicClientRegistration && oauthCredentials.serverUrl) {
			const serverUrl = new URL(oauthCredentials.serverUrl);
			const response = await fetch(`${serverUrl.origin}/.well-known/oauth-authorization-server`);
			const data = (await response.json()) as unknown as OAuthAuthorizationServerMetadata;

			const { authorization_endpoint, token_endpoint, registration_endpoint } = data;

			if (!authorization_endpoint || !token_endpoint || !registration_endpoint) {
				throw new Error(
					'The OAuth2 server does not support dynamic client registration. Missing endpoints in metadata.',
				);
			}

			oauthCredentials.authUrl = authorization_endpoint;
			oauthCredentials.accessTokenUrl = token_endpoint;
			toUpdate.authUrl = authorization_endpoint;
			toUpdate.accessTokenUrl = token_endpoint;

			const instanceBaseUrl = Container.get(UrlService).getInstanceBaseUrl();
			const restEndpoint = Container.get(GlobalConfig).endpoints.rest;

			const whatever = await fetch(registration_endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					redirect_uris: [`${instanceBaseUrl}/${restEndpoint}/oauth2-credential/callback`],
					token_endpoint_auth_method: 'none',
					grant_types: ['authorization_code', 'refresh_token'],
					response_types: ['code'],
					client_name: 'n8n',
					client_uri: 'https://n8n.io/',
				}),
			});

			const aja = (await whatever.json()) as unknown as {
				client_id: string;
				client_secret?: string;
			};

			console.log(aja);

			const { client_id } = aja;

			oauthCredentials.clientId = client_id;
			oauthCredentials.grantType = 'pkce';
			oauthCredentials.authentication = 'body';

			toUpdate.clientId = client_id;
			toUpdate.grantType = 'pkce';
			toUpdate.authentication = 'body';
		}

		// Generate a CSRF prevention token and send it as an OAuth2 state string
		const [csrfSecret, state] = this.createCsrfState(
			credential.id,
			skipAuthOnOAuthCallback ? undefined : req.user.id,
		);

		const oAuthOptions = {
			...this.convertCredentialToOptions(oauthCredentials),
			state,
		};

		console.log(oAuthOptions);

		if (oauthCredentials.authQueryParameters) {
			oAuthOptions.query = qs.parse(oauthCredentials.authQueryParameters);
		}

		await this.externalHooks.run('oauth2.authenticate', [oAuthOptions]);

		toUpdate.csrfSecret = csrfSecret;

		if (oauthCredentials.grantType === 'pkce') {
			const { code_verifier, code_challenge } = await pkceChallenge();
			oAuthOptions.query = {
				...oAuthOptions.query,
				code_challenge,
				code_challenge_method: 'S256',
			};
			toUpdate.codeVerifier = code_verifier;
		}
		console.log(1);

		console.log(credential);

		console.log(toUpdate);

		await this.encryptAndSaveData(credential, toUpdate);

		console.log(1);

		const oAuthObj = new ClientOAuth2(oAuthOptions);

		console.log(oAuthOptions);

		console.log(1);

		const returnUri = oAuthObj.code.getUri();

		console.log(1);

		this.logger.debug('OAuth2 authorization url created for credential', {
			userId: req.user.id,
			credentialId: credential.id,
		});

		console.log(1);

		return returnUri.toString();
	}

	/** Verify and store app code. Generate access tokens and store for respective credential */
	@Get('/callback', { usesTemplates: true, skipAuth: skipAuthOnOAuthCallback })
	async handleCallback(req: OAuthRequest.OAuth2Credential.Callback, res: Response) {
		console.log('callback');

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

			if (decryptedDataOriginal.useDynamicClientRegistration) {
				Object.assign(oauthCredentials, {
					clientId: decryptedDataOriginal.clientId,
					authUrl: decryptedDataOriginal.authUrl,
					accessTokenUrl: decryptedDataOriginal.accessTokenUrl,
					grantType: decryptedDataOriginal.grantType || 'pkce',
					authentication: decryptedDataOriginal.authentication || 'body',
				});
			}

			console.log('Decrypted data original:', decryptedDataOriginal);
			console.log('OAuth credentials before conversion:', oauthCredentials);

			let options: Partial<ClientOAuth2Options> = {};

			const oAuthOptions = this.convertCredentialToOptions(oauthCredentials);

			console.log('en el callback endpoint');
			console.log(oAuthOptions);

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

			console.log('OAuth token data to be saved:', oauthTokenData);

			await this.encryptAndSaveData(credential, { oauthTokenData }, ['csrfSecret']);

			this.logger.debug('OAuth2 callback successful for credential', {
				credentialId: credential.id,
			});

			return res.render('oauth-callback');
		} catch (e) {
			console.log(e);
			const error = ensureError(e);
			return this.renderCallbackError(
				res,
				error.message,
				'body' in error ? jsonStringify(error.body) : undefined,
			);
		}
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
