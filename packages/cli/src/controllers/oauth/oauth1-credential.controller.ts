import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { createHmac } from 'crypto';
import { Response } from 'express';
import type { RequestOptions } from 'oauth-1.0a';
import clientOAuth1 from 'oauth-1.0a';

import { Get, RestController } from '@/decorators';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { OAuthRequest } from '@/requests';
import { sendErrorResponse } from '@/response-helper';

import { AbstractOAuthController, type CsrfStateParam } from './abstract-oauth.controller';

interface OAuth1CredentialData {
	signatureMethod: 'HMAC-SHA256' | 'HMAC-SHA512' | 'HMAC-SHA1';
	consumerKey: string;
	consumerSecret: string;
	authUrl: string;
	accessTokenUrl: string;
	requestTokenUrl: string;
}

const algorithmMap = {
	'HMAC-SHA256': 'sha256',
	'HMAC-SHA512': 'sha512',
	'HMAC-SHA1': 'sha1',
} as const;

@RestController('/oauth1-credential')
export class OAuth1CredentialController extends AbstractOAuthController {
	override oauthVersion = 1;

	/** Get Authorization url */
	@Get('/auth')
	async getAuthUri(req: OAuthRequest.OAuth1Credential.Auth): Promise<string> {
		const credential = await this.getCredential(req);
		const additionalData = await this.getAdditionalData();
		const decryptedDataOriginal = await this.getDecryptedData(credential, additionalData);
		const oauthCredentials = this.applyDefaultsAndOverwrites<OAuth1CredentialData>(
			credential,
			decryptedDataOriginal,
			additionalData,
		);
		const [csrfSecret, state] = this.createCsrfState(credential.id);

		const signatureMethod = oauthCredentials.signatureMethod;

		const oAuthOptions: clientOAuth1.Options = {
			consumer: {
				key: oauthCredentials.consumerKey,
				secret: oauthCredentials.consumerSecret,
			},
			signature_method: signatureMethod,

			hash_function(base, key) {
				const algorithm = algorithmMap[signatureMethod] ?? 'sha1';
				return createHmac(algorithm, key).update(base).digest('base64');
			},
		};

		const oauthRequestData = {
			oauth_callback: `${this.baseUrl}/callback?state=${state}`,
		};

		await this.externalHooks.run('oauth1.authenticate', [oAuthOptions, oauthRequestData]);

		const oauth = new clientOAuth1(oAuthOptions);

		const options: RequestOptions = {
			method: 'POST',
			url: oauthCredentials.requestTokenUrl,
			data: oauthRequestData,
		};

		const data = oauth.toHeader(oauth.authorize(options));

		// @ts-ignore
		options.headers = data;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { data: response } = await axios.request(options as Partial<AxiosRequestConfig>);

		// Response comes as x-www-form-urlencoded string so convert it to JSON

		const paramsParser = new URLSearchParams(response as string);

		const responseJson = Object.fromEntries(paramsParser.entries());

		const returnUri = `${oauthCredentials.authUrl}?oauth_token=${responseJson.oauth_token}`;

		decryptedDataOriginal.csrfSecret = csrfSecret;
		await this.encryptAndSaveData(credential, decryptedDataOriginal);

		this.logger.debug('OAuth1 authorization successful for new credential', {
			userId: req.user.id,
			credentialId: credential.id,
		});

		return returnUri;
	}

	/** Verify and store app code. Generate access tokens and store for respective credential */
	@Get('/callback', { usesTemplates: true, skipAuth: true })
	async handleCallback(req: OAuthRequest.OAuth1Credential.Callback, res: Response) {
		try {
			const { oauth_verifier, oauth_token, state: encodedState } = req.query;

			if (!oauth_verifier || !oauth_token || !encodedState) {
				return this.renderCallbackError(
					res,
					'Insufficient parameters for OAuth1 callback.',
					`Received following query parameters: ${JSON.stringify(req.query)}`,
				);
			}

			let state: CsrfStateParam;
			try {
				state = this.decodeCsrfState(encodedState);
			} catch (error) {
				return this.renderCallbackError(res, (error as Error).message);
			}

			const credentialId = state.cid;
			const credential = await this.getCredentialWithoutUser(credentialId);
			if (!credential) {
				const errorMessage = 'OAuth1 callback failed because of insufficient permissions';
				this.logger.error(errorMessage, { credentialId });
				return this.renderCallbackError(res, errorMessage);
			}

			const additionalData = await this.getAdditionalData();
			const decryptedDataOriginal = await this.getDecryptedData(credential, additionalData);
			const oauthCredentials = this.applyDefaultsAndOverwrites<OAuth1CredentialData>(
				credential,
				decryptedDataOriginal,
				additionalData,
			);

			if (this.verifyCsrfState(decryptedDataOriginal, state)) {
				const errorMessage = 'The OAuth1 callback state is invalid!';
				this.logger.debug(errorMessage, { credentialId });
				return this.renderCallbackError(res, errorMessage);
			}

			const options: AxiosRequestConfig = {
				method: 'POST',
				url: oauthCredentials.accessTokenUrl,
				params: {
					oauth_token,
					oauth_verifier,
				},
			};

			let oauthToken;

			try {
				oauthToken = await axios.request(options);
			} catch (error) {
				this.logger.error('Unable to fetch tokens for OAuth1 callback', { credentialId });
				const errorResponse = new NotFoundError('Unable to get access tokens!');
				return sendErrorResponse(res, errorResponse);
			}

			// Response comes as x-www-form-urlencoded string so convert it to JSON

			const paramParser = new URLSearchParams(oauthToken.data as string);

			const oauthTokenJson = Object.fromEntries(paramParser.entries());

			decryptedDataOriginal.oauthTokenData = oauthTokenJson;

			await this.encryptAndSaveData(credential, decryptedDataOriginal);

			this.logger.debug('OAuth1 callback successful for new credential', {
				credentialId,
			});
			return res.render('oauth-callback');
		} catch (error) {
			this.logger.error('OAuth1 callback failed because of insufficient user permissions');
			return sendErrorResponse(res, error as Error);
		}
	}
}
