import type {
	ClientOAuth2Options,
	OAuth2AuthenticationMethod,
	OAuth2CredentialData,
	OAuth2GrantType,
	OAuthAuthorizationServerMetadata,
} from '@n8n/client-oauth2';
import { ClientOAuth2 } from '@n8n/client-oauth2';
import { Get, RestController } from '@n8n/decorators';
import axios from 'axios';
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
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
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

		const toUpdate: ICredentialDataDecryptedObject = {};

		if (oauthCredentials.useDynamicClientRegistration && oauthCredentials.serverUrl) {
			const serverUrl = new URL(oauthCredentials.serverUrl);
			const { data } = await axios.get<OAuthAuthorizationServerMetadata>(
				`${serverUrl.origin}/.well-known/oauth-authorization-server`,
			);
			const { authorization_endpoint, token_endpoint, registration_endpoint } = data;
			if (!authorization_endpoint || !token_endpoint || !registration_endpoint) {
				throw new BadRequestError(
					'The OAuth2 server does not support dynamic client registration. Missing endpoints in metadata.',
				);
			}

			oauthCredentials.authUrl = authorization_endpoint;
			oauthCredentials.accessTokenUrl = token_endpoint;
			toUpdate.authUrl = authorization_endpoint;
			toUpdate.accessTokenUrl = token_endpoint;

			const { grantType, authentication } = this.selectGrantTypeAndAuthenticationMethod(
				data.grant_types_supported,
				data.token_endpoint_auth_methods_supported,
				data.code_challenge_methods_supported,
			);
			oauthCredentials.grantType = grantType;
			toUpdate.grantType = grantType;
			if (authentication) {
				oauthCredentials.authentication = authentication;
				toUpdate.authentication = authentication;
			}

			const { grant_types, token_endpoint_auth_method } = this.mapGrantTypeAndAuthenticationMethod(
				grantType,
				authentication,
			);
			const registerPayload = {
				redirect_uris: [`${this.baseUrl}/callback`],
				token_endpoint_auth_method,
				grant_types,
				response_types: ['code'],
				client_name: 'n8n',
				client_uri: 'https://n8n.io/',
			};

			await this.externalHooks.run('oauth2.dynamicClientRegistration', [registerPayload]);

			const { data: registerResult } = await axios.post<{
				client_id: string;
				client_secret?: string;
			}>(registration_endpoint, registerPayload);

			const { client_id, client_secret } = registerResult;
			oauthCredentials.clientId = client_id;
			toUpdate.clientId = client_id;
			if (client_secret) {
				oauthCredentials.clientSecret = client_secret;
				toUpdate.clientSecret = client_secret;
			}
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

	private selectGrantTypeAndAuthenticationMethod(
		grantTypes: string[],
		tokenEndpointAuthMethods: string[],
		codeChallengeMethods: string[],
	): { grantType: OAuth2GrantType; authentication?: OAuth2AuthenticationMethod } {
		if (grantTypes.includes('authorization_code') && grantTypes.includes('refresh_token')) {
			if (codeChallengeMethods.includes('S256') && tokenEndpointAuthMethods.includes('none')) {
				return { grantType: 'pkce' };
			}

			if (tokenEndpointAuthMethods.includes('client_secret_basic')) {
				return { grantType: 'authorizationCode', authentication: 'header' };
			}

			if (tokenEndpointAuthMethods.includes('client_secret_post')) {
				return { grantType: 'authorizationCode', authentication: 'body' };
			}
		}

		if (grantTypes.includes('client_credentials')) {
			if (tokenEndpointAuthMethods.includes('client_secret_basic')) {
				return { grantType: 'clientCredentials', authentication: 'header' };
			}

			if (tokenEndpointAuthMethods.includes('client_secret_post')) {
				return { grantType: 'clientCredentials', authentication: 'body' };
			}
		}

		throw new BadRequestError('No supported grant type and authentication method found');
	}

	private mapGrantTypeAndAuthenticationMethod(
		grantType: OAuth2GrantType,
		authentication?: OAuth2AuthenticationMethod,
	) {
		if (grantType === 'pkce') {
			return {
				grant_types: ['authorization_code', 'refresh_token'],
				token_endpoint_auth_method: 'none',
			};
		}

		const tokenEndpointAuthMethod =
			authentication === 'header' ? 'client_secret_basic' : 'client_secret_post';
		if (grantType === 'authorizationCode') {
			return {
				grant_types: ['authorization_code', 'refresh_token'],
				token_endpoint_auth_method: tokenEndpointAuthMethod,
			};
		}

		return {
			grant_types: ['client_credentials'],
			token_endpoint_auth_method: tokenEndpointAuthMethod,
		};
	}
}
