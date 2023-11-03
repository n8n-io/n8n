import { Service } from 'typedi';
import type { ClientOAuth2Options } from '@n8n/client-oauth2';
import { ClientOAuth2 } from '@n8n/client-oauth2';
import Csrf from 'csrf';
import { Response } from 'express';
import pkceChallenge from 'pkce-challenge';
import * as qs from 'querystring';
import omit from 'lodash/omit';
import set from 'lodash/set';
import split from 'lodash/split';
import type { OAuth2GrantType } from 'n8n-workflow';
import { jsonParse, jsonStringify } from 'n8n-workflow';
import { Authorized, Get, RestController } from '@/decorators';
import { OAuthRequest } from '@/requests';
import { AbstractOAuthController } from './abstractOAuth.controller';

interface OAuth2CredentialData {
	clientId: string;
	clientSecret?: string;
	accessTokenUrl?: string;
	authUrl?: string;
	scope?: string;
	authQueryParameters?: string;
	authentication?: 'header' | 'body';
	grantType: OAuth2GrantType;
	ignoreSSLIssues?: boolean;
}

interface CsrfStateParam {
	cid: string;
	token: string;
}

@Service()
@Authorized()
@RestController('/oauth2-credential')
export class OAuth2CredentialController extends AbstractOAuthController {
	override oauthVersion = 2;

	/** Get Authorization url */
	@Get('/auth')
	async getAuthUri(req: OAuthRequest.OAuth2Credential.Auth): Promise<string> {
		const credential = await this.getCredential(req);
		const additionalData = await this.getAdditionalData(req.user);
		const decryptedDataOriginal = await this.getDecryptedData(credential, additionalData);

		// At some point in the past we saved hidden scopes to credentials (but shouldn't)
		// Delete scope before applying defaults to make sure new scopes are present on reconnect
		// Generic Oauth2 API is an exception because it needs to save the scope
		const genericOAuth2 = ['oAuth2Api', 'googleOAuth2Api', 'microsoftOAuth2Api'];
		if (
			decryptedDataOriginal?.scope &&
			credential.type.includes('OAuth2') &&
			!genericOAuth2.includes(credential.type)
		) {
			delete decryptedDataOriginal.scope;
		}

		const oauthCredentials = this.applyDefaultsAndOverwrites<OAuth2CredentialData>(
			credential,
			decryptedDataOriginal,
			additionalData,
		);

		// Generate a CSRF prevention token and send it as an OAuth2 state string
		const [csrfSecret, state] = this.createCsrfState(credential.id);

		const oAuthOptions = {
			...this.convertCredentialToOptions(oauthCredentials),
			state,
		};

		if (oauthCredentials.authQueryParameters) {
			oAuthOptions.query = qs.parse(oauthCredentials.authQueryParameters);
		}

		await this.externalHooks.run('oauth2.authenticate', [oAuthOptions]);

		decryptedDataOriginal.csrfSecret = csrfSecret;
		if (oauthCredentials.grantType === 'pkce') {
			const { code_verifier, code_challenge } = pkceChallenge();
			oAuthOptions.query = {
				...oAuthOptions.query,
				code_challenge,
				code_challenge_method: 'S256',
			};
			decryptedDataOriginal.codeVerifier = code_verifier;
		}

		await this.encryptAndSaveData(credential, decryptedDataOriginal);

		const oAuthObj = new ClientOAuth2(oAuthOptions);
		const returnUri = oAuthObj.code.getUri();

		this.logger.verbose('OAuth2 authorization url created for credential', {
			userId: req.user.id,
			credentialId: credential.id,
		});

		return returnUri.toString();
	}

	/** Verify and store app code. Generate access tokens and store for respective credential */
	@Get('/callback', { usesTemplates: true })
	async handleCallback(req: OAuthRequest.OAuth2Credential.Callback, res: Response) {
		try {
			// realmId it's currently just use for the quickbook OAuth2 flow
			const { code, state: encodedState } = req.query;
			if (!code || !encodedState) {
				return this.renderCallbackError(
					res,
					'Insufficient parameters for OAuth2 callback.',
					`Received following query parameters: ${JSON.stringify(req.query)}`,
				);
			}

			let state: CsrfStateParam;
			try {
				state = this.decodeCsrfState(encodedState);
			} catch (error) {
				return this.renderCallbackError(res, (error as Error).message);
			}

			const credential = await this.getCredentialWithoutUser(state.cid);
			if (!credential) {
				const errorMessage = 'OAuth2 callback failed because of insufficient permissions';
				this.logger.error(errorMessage, {
					userId: req.user?.id,
					credentialId: state.cid,
				});
				return this.renderCallbackError(res, errorMessage);
			}

			const additionalData = await this.getAdditionalData(req.user);
			const decryptedDataOriginal = await this.getDecryptedData(credential, additionalData);
			const oauthCredentials = this.applyDefaultsAndOverwrites<OAuth2CredentialData>(
				credential,
				decryptedDataOriginal,
				additionalData,
			);

			const token = new Csrf();
			if (
				decryptedDataOriginal.csrfSecret === undefined ||
				!token.verify(decryptedDataOriginal.csrfSecret as string, state.token)
			) {
				const errorMessage = 'The OAuth2 callback state is invalid!';
				this.logger.debug(errorMessage, {
					userId: req.user?.id,
					credentialId: credential.id,
				});
				return this.renderCallbackError(res, errorMessage);
			}

			let options: Partial<ClientOAuth2Options> = {};

			const oAuthOptions = this.convertCredentialToOptions(oauthCredentials);

			if (oauthCredentials.grantType === 'pkce') {
				options = {
					body: { code_verifier: decryptedDataOriginal.codeVerifier },
				};
			} else if (oauthCredentials.authentication === 'body') {
				options = {
					body: {
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

			if (oauthToken === undefined) {
				const errorMessage = 'Unable to get OAuth2 access tokens!';
				this.logger.error(errorMessage, {
					userId: req.user?.id,
					credentialId: credential.id,
				});
				return this.renderCallbackError(res, errorMessage);
			}

			if (decryptedDataOriginal.oauthTokenData) {
				// Only overwrite supplied data as some providers do for example just return the
				// refresh_token on the very first request and not on subsequent ones.
				Object.assign(decryptedDataOriginal.oauthTokenData, oauthToken.data);
			} else {
				// No data exists so simply set
				decryptedDataOriginal.oauthTokenData = oauthToken.data;
			}

			delete decryptedDataOriginal.csrfSecret;
			await this.encryptAndSaveData(credential, decryptedDataOriginal);

			this.logger.verbose('OAuth2 callback successful for credential', {
				userId: req.user?.id,
				credentialId: credential.id,
			});

			return res.render('oauth-callback');
		} catch (error) {
			return this.renderCallbackError(
				res,
				(error as Error).message,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				'body' in error ? jsonStringify(error.body) : undefined,
			);
		}
	}

	private convertCredentialToOptions(credential: OAuth2CredentialData): ClientOAuth2Options {
		return {
			clientId: credential.clientId,
			clientSecret: credential.clientSecret ?? '',
			accessTokenUri: credential.accessTokenUrl ?? '',
			authorizationUri: credential.authUrl ?? '',
			redirectUri: `${this.baseUrl}/callback`,
			scopes: split(credential.scope ?? 'openid', ','),
			scopesSeparator: credential.scope?.includes(',') ? ',' : ' ',
			ignoreSSLIssues: credential.ignoreSSLIssues ?? false,
		};
	}

	private renderCallbackError(res: Response, message: string, reason?: string) {
		res.render('oauth-error-callback', { error: { message, reason } });
	}

	private createCsrfState(credentialsId: string): [string, string] {
		const token = new Csrf();
		const csrfSecret = token.secretSync();
		const state: CsrfStateParam = {
			token: token.create(csrfSecret),
			cid: credentialsId,
		};
		return [csrfSecret, Buffer.from(JSON.stringify(state)).toString('base64')];
	}

	private decodeCsrfState(encodedState: string): CsrfStateParam {
		const errorMessage = 'Invalid state format';
		const decoded = jsonParse<CsrfStateParam>(Buffer.from(encodedState, 'base64').toString(), {
			errorMessage,
		});
		if (typeof decoded.cid !== 'string' || typeof decoded.token !== 'string') {
			throw new Error(errorMessage);
		}
		return decoded;
	}
}
