import type { ClientOAuth2Options, OAuth2CredentialData } from '@n8n/client-oauth2';
import { ClientOAuth2 } from '@n8n/client-oauth2';
import { Get, RestController } from '@n8n/decorators';
import { GlobalConfig } from '@n8n/config';
import { Response } from 'express';
import omit from 'lodash/omit';
import set from 'lodash/set';
import split from 'lodash/split';
import { ensureError, jsonParse, jsonStringify } from 'n8n-workflow';
import { randomUUID } from 'crypto';

import { SettingsRepository } from '@n8n/db';
import { OAuthRequest } from '@/requests';
import { OauthService, OauthVersion, skipAuthOnOAuthCallback } from '@/oauth/oauth.service';
import { Logger } from '@n8n/backend-common';
import { ExternalHooks } from '@/external-hooks';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { CredentialTypes } from '@/credential-types';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import {
	BrokerClientService,
	BrokerTokenNotReadyError,
	BrokerTokenExpiredError,
	type TokenSet,
} from '@/credentials/broker-client.service';
import { UrlService } from '@/services/url.service';

const BROKER_FLOW_KEY_PREFIX = 'brokerFlow.';

@RestController('/oauth2-credential')
export class OAuth2CredentialController {
	private readonly brokerLogger = this.logger.scoped('broker-auth');

	constructor(
		private readonly oauthService: OauthService,
		private readonly logger: Logger,
		private readonly externalHooks: ExternalHooks,
		private readonly credentialTypes: CredentialTypes,
		private readonly settingsRepository: SettingsRepository,
		private readonly brokerClient: BrokerClientService,
		private readonly globalConfig: GlobalConfig,
		private readonly urlService: UrlService,
	) {}

	/** Get Authorization url */
	@Get('/auth')
	async getAuthUri(req: OAuthRequest.OAuth2Credential.Auth): Promise<string> {
		const credential = await this.oauthService.getCredential(req);

		// Broker-managed OAuth flow
		const credType = this.credentialTypes.getByName(credential.type);
		if (credType.managedAuth) {
			if (!this.globalConfig.brokerAuth.url || !this.globalConfig.brokerAuth.enabled) {
				throw new BadRequestError(
					'N8N_OAUTH_BROKER_URL is not configured or broker auth is disabled.',
				);
			}
			const instanceBaseUrl = this.urlService.getInstanceBaseUrl();

			const flowId = randomUUID();

			this.brokerLogger.debug('Initiating OAuth flow', {
				credentialId: credential.id,
				provider: credType.managedAuth.provider,
			});

			// Store flowId → credentialId mapping for callback lookup
			await this.settingsRepository.upsert(
				{ key: BROKER_FLOW_KEY_PREFIX + flowId, value: credential.id, loadOnStartup: false },
				['key'],
			);

			// Store session state in the credential's encrypted data column (like csrfSecret)
			await this.oauthService.encryptAndSaveData(credential, {
				pendingBrokerFlowId: flowId,
				pendingBrokerFlowExpiresAt: Date.now() + 10 * 60 * 1000,
			});

			this.brokerLogger.debug('Flow session stored', { credentialId: credential.id, flowId });

			const scopeProp = credType.properties.find((p) => p.name === 'scope');
			const scopeStr = typeof scopeProp?.default === 'string' ? scopeProp.default : undefined;
			const scopes = scopeStr ? scopeStr.split(/[\s,]+/).filter(Boolean) : undefined;

			const authQueryProp = credType.properties.find((p) => p.name === 'authQueryParameters');
			const authQueryStr =
				typeof authQueryProp?.default === 'string' ? authQueryProp.default : undefined;
			const authQueryParameters = authQueryStr
				? Object.fromEntries(new URLSearchParams(authQueryStr))
				: undefined;

			const authUrl = await this.brokerClient.startFlow({
				provider: credType.managedAuth.provider,
				flowId,
				instanceBaseUrl,
				scopes,
				authQueryParameters,
			});

			this.brokerLogger.debug('Auth URL received', { credentialId: credential.id });

			return authUrl;
		}

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
		try {
			// Broker callback: both success (retrievalCode) and user denial (error) carry flowId
			const {
				retrievalCode,
				flowId,
				error: brokerError,
			} = req.query as {
				retrievalCode?: string;
				flowId?: string;
				error?: string;
			};
			if (
				typeof flowId === 'string' &&
				(typeof retrievalCode === 'string' || typeof brokerError === 'string')
			) {
				if (typeof brokerError === 'string') {
					this.brokerLogger.debug('Callback received user denial', { flowId, error: brokerError });
					return this.oauthService.renderCallbackError(
						res,
						`OAuth authorisation denied: ${brokerError}`,
					);
				}
				return await this.handleBrokerCallback(req, res, retrievalCode!, flowId);
			}

			const { code, state: encodedState } = req.query;
			if (!code || !encodedState) {
				return this.oauthService.renderCallbackError(
					res,
					'Insufficient parameters for OAuth2 callback.',
					`Received following query parameters: ${JSON.stringify(req.query)}`,
				);
			}

			const [credential, decryptedDataOriginal, oauthCredentials, state] =
				await this.oauthService.resolveCredential<OAuth2CredentialData>(req);

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

			const standardParams = ['state', 'code', 'flowId', 'retrievalCode', 'error'] as const;
			const extraParams = omit(req.query, ...standardParams);
			if (Object.keys(extraParams).length > 0) {
				set(oauthToken.data, 'callbackQueryString', extraParams);
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
			return this.oauthService.renderCallbackError(
				res,
				error.message,
				'body' in error ? jsonStringify(error.body) : undefined,
			);
		}
	}

	private async handleBrokerCallback(
		_req: OAuthRequest.OAuth2Credential.Callback,
		res: Response,
		retrievalCode: string,
		flowId: string,
	) {
		this.brokerLogger.debug('Callback received', { flowId });

		const flowMapping = await this.settingsRepository.findByKey(BROKER_FLOW_KEY_PREFIX + flowId);
		const credentialId = flowMapping?.value;
		if (!credentialId) {
			return this.oauthService.renderCallbackError(res, 'Broker flow session not found or expired');
		}
		await this.settingsRepository.delete({ key: BROKER_FLOW_KEY_PREFIX + flowId });

		const credential = await this.oauthService.getCredentialForBrokerCallback(credentialId);
		if (!credential) {
			return this.oauthService.renderCallbackError(res, 'Credential not found for broker callback');
		}

		const decrypted = this.oauthService.getRawDecryptedData(credential);

		// Verify session validity
		if (
			decrypted.pendingBrokerFlowId !== flowId ||
			!decrypted.pendingBrokerFlowExpiresAt ||
			Date.now() > (decrypted.pendingBrokerFlowExpiresAt as number)
		) {
			return this.oauthService.renderCallbackError(
				res,
				'Broker flow session has expired or is invalid. Please reconnect.',
			);
		}

		this.brokerLogger.debug('Flow session verified', { credentialId });

		// Poll broker for tokens (up to 10 attempts, 500ms apart).
		// Use a flag so the finally block can clean up pending session fields
		// on any non-success path (throw, timeout, expired).
		let saved = false;
		try {
			let tokenSet: TokenSet | undefined;
			for (let attempt = 0; attempt < 10; attempt++) {
				this.brokerLogger.debug('Polling for tokens', { credentialId, attempt: attempt + 1 });
				try {
					tokenSet = await this.brokerClient.retrieveTokens(retrievalCode);
					break;
				} catch (e) {
					if (e instanceof BrokerTokenNotReadyError) {
						await new Promise((r) => setTimeout(r, 500));
						continue;
					}
					if (e instanceof BrokerTokenExpiredError) {
						return this.oauthService.renderCallbackError(
							res,
							'OAuth session expired. Please reconnect.',
						);
					}
					throw e;
				}
			}

			if (!tokenSet) {
				return this.oauthService.renderCallbackError(
					res,
					'Timed out waiting for tokens from broker. Please try reconnecting.',
				);
			}

			this.brokerLogger.debug('Tokens received from broker', { credentialId });

			const credType = this.credentialTypes.getByName(credential.type);

			// Preserve any prior oauthTokenData fields (providers sometimes omit refresh_token on renewal)
			const oauthTokenData = {
				...(typeof decrypted.oauthTokenData === 'object' ? decrypted.oauthTokenData : {}),
				...tokenSet,
			} as ICredentialDataDecryptedObject;

			await this.oauthService.encryptAndSaveData(
				credential,
				{
					oauthTokenData,
					_brokerManaged: { provider: credType.managedAuth!.provider },
				},
				['pendingBrokerFlowId', 'pendingBrokerFlowExpiresAt'],
			);
			saved = true;

			this.logger.debug('Broker OAuth2 callback successful for credential', {
				credentialId: credential.id,
				provider: credType.managedAuth!.provider,
			});

			return res.render('oauth-callback');
		} finally {
			if (!saved) {
				// Clean up pending session fields from the credential on any failure path
				await Promise.resolve(
					this.oauthService.encryptAndSaveData(credential, {}, [
						'pendingBrokerFlowId',
						'pendingBrokerFlowExpiresAt',
					]),
				).catch(() => {});
			}
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
