import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { createHmac } from 'crypto';
import { Response } from 'express';
import { ensureError, jsonStringify } from 'n8n-workflow';
import type { RequestOptions } from 'oauth-1.0a';
import clientOAuth1 from 'oauth-1.0a';

import { Get, RestController } from '@/decorators';
import { OAuthRequest } from '@/requests';

import { AbstractOAuthController, skipAuthOnOAuthCallback } from './abstract-oauth.controller';

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
		const decryptedDataOriginal = await this.getDecryptedDataForAuthUri(credential, additionalData);
		const oauthCredentials = await this.applyDefaultsAndOverwrites<OAuth1CredentialData>(
			credential,
			decryptedDataOriginal,
			additionalData,
		);
		const [csrfSecret, state] = this.createCsrfState(
			credential.id,
			skipAuthOnOAuthCallback ? undefined : req.user.id,
		);

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

		await this.encryptAndSaveData(credential, { csrfSecret });

		this.logger.debug('OAuth1 authorization successful for new credential', {
			userId: req.user.id,
			credentialId: credential.id,
		});

		return returnUri;
	}

	/** Verify and store app code. Generate access tokens and store for respective credential */
	@Get('/callback', { usesTemplates: true, skipAuth: skipAuthOnOAuthCallback })
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

			const [credential, _, oauthCredentials] =
				await this.resolveCredential<OAuth1CredentialData>(req);

			// Form URL encoded body https://datatracker.ietf.org/doc/html/rfc5849#section-3.5.2
			const oauthToken = await axios.post<string>(
				oauthCredentials.accessTokenUrl,
				{ oauth_token, oauth_verifier },
				{ headers: { 'content-type': 'application/x-www-form-urlencoded' } },
			);

			// Response comes as x-www-form-urlencoded string so convert it to JSON

			const paramParser = new URLSearchParams(oauthToken.data);

			const oauthTokenData = Object.fromEntries(paramParser.entries());

			await this.encryptAndSaveData(credential, { oauthTokenData }, ['csrfSecret']);

			this.logger.debug('OAuth1 callback successful for new credential', {
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
}
