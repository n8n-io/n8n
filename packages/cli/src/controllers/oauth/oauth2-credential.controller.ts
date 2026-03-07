import type { ClientOAuth2Options, OAuth2CredentialData } from '@n8n/client-oauth2';
import { ClientOAuth2 } from '@n8n/client-oauth2';
import { Get, RestController } from '@n8n/decorators';
import { Response } from 'express';
import omit from 'lodash/omit';
import set from 'lodash/set';
import split from 'lodash/split';
import { ensureError, jsonParse, jsonStringify } from 'n8n-workflow';

import { OAuthRequest } from '@/requests';
import { OauthService, OauthVersion, skipAuthOnOAuthCallback } from '@/oauth/oauth.service';
import { Logger } from '@n8n/backend-common';
import { ExternalHooks } from '@/external-hooks';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { OAuthProviderQuirksService } from '@/oauth/oauth-provider-quirks.service';
import type { ClientOAuth2RequestObject } from '@n8n/client-oauth2';

@RestController('/oauth2-credential')
export class OAuth2CredentialController {
	constructor(
		private readonly oauthService: OauthService,
		private readonly logger: Logger,
		private readonly externalHooks: ExternalHooks,
		private readonly providerQuirksService: OAuthProviderQuirksService,
	) {}

	/** Get Authorization url */
	@Get('/auth')
	async getAuthUri(req: OAuthRequest.OAuth2Credential.Auth): Promise<string> {
		const credential = await this.oauthService.getCredential(req);

		const uri = await this.oauthService.generateAOauth2AuthUri(credential, {
			cid: credential.id,
			origin: 'static-credential',
			userId: req.user.id,
		});
		return uri;
	}

	/** Verify and store app code. Generate access tokens and store for respective credential */
	@Get('/callback', { usesTemplates: true, skipAuth: skipAuthOnOAuthCallback })
	async handleCallback(req: OAuthRequest.OAuth2Credential.Callback, res: Response) {
		let credential: Awaited<ReturnType<typeof this.oauthService.resolveCredential>>[0] | undefined;
		
		try {
			const { code, state: encodedState } = req.query;
			if (!code || !encodedState) {
				return this.oauthService.renderCallbackError(
					res,
					'Insufficient parameters for OAuth2 callback.',
					`Received following query parameters: ${JSON.stringify(req.query)}`,
				);
			}

			const resolvedCredential = await this.oauthService.resolveCredential<OAuth2CredentialData>(req);
			credential = resolvedCredential[0];
			const [, decryptedDataOriginal, oauthCredentials, state] = resolvedCredential;

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

			// Log token exchange attempt for debugging
			this.logger.debug('Attempting OAuth2 token exchange', {
				credentialId: credential.id,
				credentialType: credential.type,
				accessTokenUrl: oAuthOptions.accessTokenUri,
				redirectUri: oAuthOptions.redirectUri,
				authentication: oauthCredentials.authentication,
			});

			// Apply provider-specific quirks before token exchange
			const quirks = this.providerQuirksService.getQuirks(credential.type);
			
			// Ensure redirect_uri is included in body for providers that require it (like HighLevel)
			// This is critical for body authentication where redirect_uri must match exactly
			if (quirks?.alwaysIncludeRedirectUri && oAuthOptions.redirectUri) {
				options = {
					...options,
					body: {
						...(options.body ?? {}),
						redirect_uri: oAuthOptions.redirectUri,
					},
				};
			}

			const oauthToken = await oAuthObj.code.getToken(
				`${oAuthOptions.redirectUri as string}?${queryParameters}`,
				options,
			);

			if (Object.keys(req.query).length > 2) {
				set(oauthToken.data, 'callbackQueryString', omit(req.query, 'state', 'code'));
			}

			// Only overwrite supplied data as some providers do for example just return the
			// refresh_token on the very first request and not on subsequent ones.
			const { oauthTokenData: tokenData } = decryptedDataOriginal;
			const oauthTokenData: ICredentialDataDecryptedObject = {
				...(typeof tokenData === 'object' ? tokenData : {}),
				...oauthToken.data,
			} as ICredentialDataDecryptedObject;

			if (!state.origin || state.origin === 'static-credential') {
				await this.oauthService.encryptAndSaveData(credential, { oauthTokenData }, ['csrfSecret']);

				this.logger.debug('OAuth2 callback successful for credential', {
					credentialId: credential.id,
				});

				return res.render('oauth-callback');
			}

			if (state.origin === 'dynamic-credential') {
				if (!state.credentialResolverId || typeof state.credentialResolverId !== 'string') {
					return this.oauthService.renderCallbackError(res, 'Credential resolver ID is required');
				}

				if (
					!state.authorizationHeader ||
					typeof state.authorizationHeader !== 'string' ||
					!state.authorizationHeader.startsWith('Bearer ')
				) {
					return this.oauthService.renderCallbackError(res, 'Authorization header is required');
				}

				await this.oauthService.saveDynamicCredential(
					credential,
					{ oauthTokenData },
					state.authorizationHeader.split('Bearer ')[1],
					state.credentialResolverId,
					(state.authMetadata as Record<string, unknown>) ?? {},
				);
				return res.render('oauth-callback');
			}
		} catch (e) {
			const error = ensureError(e);
			const errorBody = 'body' in error ? error.body : undefined;
			const statusCode = 'status' in error ? error.status : undefined;

			// Classify error using provider-specific logic
			const credentialType = credential?.type ?? 'unknown';
			const classification = this.providerQuirksService.classifyError(
				credentialType,
				errorBody,
				statusCode,
			);

			// Log detailed error information for debugging
			this.logger.error('OAuth2 callback failed', {
				credentialId: credential?.id,
				credentialType: credentialType,
				errorType: classification.type,
				errorMessage: error.message,
				errorCode: 'code' in error ? error.code : undefined,
				errorBody: errorBody,
				errorStack: error.stack,
				statusCode,
			});

			// Use classified error message for user-facing error
			const userMessage = classification.userMessage || error.message;
			const technicalDetails = classification.technicalDetails || 
				(errorBody ? jsonStringify(errorBody) : undefined);

			return this.oauthService.renderCallbackError(res, userMessage, technicalDetails);
		}
	}

	private convertCredentialToOptions(credential: OAuth2CredentialData): ClientOAuth2Options {
		const options: ClientOAuth2Options = {
			clientId: credential.clientId,
			clientSecret: credential.clientSecret ?? '',
			accessTokenUri: credential.accessTokenUrl ?? '',
			authorizationUri: credential.authUrl ?? '',
			authentication: credential.authentication ?? 'header',
			redirectUri: `${this.oauthService.getBaseUrl(OauthVersion.V2)}/callback`,
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
