import { Response } from 'express';
import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import type { RequestOptions } from 'oauth-1.0a';
import clientOAuth1 from 'oauth-1.0a';
import { createHmac } from 'crypto';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { Get, RestController } from '@/decorators';
import { OAuthRequest } from '@/requests';
import { sendErrorResponse } from '@/ResponseHelper';
import { AbstractOAuthController } from './abstractOAuth.controller';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';

interface OAuth1CredentialData {
	signatureMethod: 'HMAC-SHA256' | 'HMAC-SHA512' | 'HMAC-SHA1';
	consumerKey: string;
	consumerSecret: string;
	authUrl: string;
	accessTokenUrl: string;
	requestTokenUrl: string;
}

const algorithmMap = {
	/* eslint-disable @typescript-eslint/naming-convention */
	'HMAC-SHA256': 'sha256',
	'HMAC-SHA512': 'sha512',
	'HMAC-SHA1': 'sha1',
	/* eslint-enable */
} as const;

@RestController('/oauth1-credential')
export class OAuth1CredentialController extends AbstractOAuthController {
	override oauthVersion = 1;

	/** Get Authorization url */
	@Get('/auth')
	async getAuthUri(req: OAuthRequest.OAuth1Credential.Auth): Promise<string> {
		const credential = await this.getCredential(req);
		const additionalData = await this.getAdditionalData(req.user);
		const decryptedDataOriginal = await this.getDecryptedData(credential, additionalData);
		const oauthCredentials = this.applyDefaultsAndOverwrites<OAuth1CredentialData>(
			credential,
			decryptedDataOriginal,
			additionalData,
		);

		const signatureMethod = oauthCredentials.signatureMethod;

		const oAuthOptions: clientOAuth1.Options = {
			consumer: {
				key: oauthCredentials.consumerKey,
				secret: oauthCredentials.consumerSecret,
			},
			signature_method: signatureMethod,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			hash_function(base, key) {
				const algorithm = algorithmMap[signatureMethod] ?? 'sha1';
				return createHmac(algorithm, key).update(base).digest('base64');
			},
		};

		const oauthRequestData = {
			oauth_callback: `${this.baseUrl}/callback?cid=${credential.id}`,
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

		await this.encryptAndSaveData(credential, decryptedDataOriginal);

		this.logger.verbose('OAuth1 authorization successful for new credential', {
			userId: req.user.id,
			credentialId: credential.id,
		});

		return returnUri;
	}

	/** Verify and store app code. Generate access tokens and store for respective credential */
	@Get('/callback', { usesTemplates: true })
	async handleCallback(req: OAuthRequest.OAuth1Credential.Callback, res: Response) {
		try {
			const { oauth_verifier, oauth_token, cid: credentialId } = req.query;

			if (!oauth_verifier || !oauth_token) {
				const errorResponse = new ServiceUnavailableError(
					`Insufficient parameters for OAuth1 callback. Received following query parameters: ${JSON.stringify(
						req.query,
					)}`,
				);
				this.logger.error('OAuth1 callback failed because of insufficient parameters received', {
					userId: req.user?.id,
					credentialId,
				});
				return sendErrorResponse(res, errorResponse);
			}

			const credential = await this.getCredentialWithoutUser(credentialId);

			if (!credential) {
				this.logger.error('OAuth1 callback failed because of insufficient user permissions', {
					userId: req.user?.id,
					credentialId,
				});
				const errorResponse = new NotFoundError(RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL);
				return sendErrorResponse(res, errorResponse);
			}

			const additionalData = await this.getAdditionalData(req.user);
			const decryptedDataOriginal = await this.getDecryptedData(credential, additionalData);
			const oauthCredentials = this.applyDefaultsAndOverwrites<OAuth1CredentialData>(
				credential,
				decryptedDataOriginal,
				additionalData,
			);

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
				this.logger.error('Unable to fetch tokens for OAuth1 callback', {
					userId: req.user?.id,
					credentialId,
				});
				const errorResponse = new NotFoundError('Unable to get access tokens!');
				return sendErrorResponse(res, errorResponse);
			}

			// Response comes as x-www-form-urlencoded string so convert it to JSON

			const paramParser = new URLSearchParams(oauthToken.data as string);

			const oauthTokenJson = Object.fromEntries(paramParser.entries());

			decryptedDataOriginal.oauthTokenData = oauthTokenJson;

			await this.encryptAndSaveData(credential, decryptedDataOriginal);

			this.logger.verbose('OAuth1 callback successful for new credential', {
				userId: req.user?.id,
				credentialId,
			});
			return res.render('oauth-callback');
		} catch (error) {
			this.logger.error('OAuth1 callback failed because of insufficient user permissions', {
				userId: req.user?.id,
				credentialId: req.query.cid,
			});
			// Error response
			return sendErrorResponse(res, error as Error);
		}
	}
}
