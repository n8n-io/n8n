import { Get, RestController } from '@n8n/decorators';
import axios from 'axios';
import { Response } from 'express';
import { ensureError, jsonStringify } from 'n8n-workflow';

import { OAuthRequest } from '@/requests';

import {
	OauthService,
	skipAuthOnOAuthCallback,
	type OAuth1CredentialData,
} from '@/oauth/oauth.service';
import { Logger } from '@n8n/backend-common';

@RestController('/oauth1-credential')
export class OAuth1CredentialController {
	constructor(
		private readonly oauthService: OauthService,
		private readonly logger: Logger,
	) {}

	/** Get Authorization url */
	@Get('/auth')
	async getAuthUri(req: OAuthRequest.OAuth1Credential.Auth): Promise<string> {
		const credential = await this.oauthService.getCredential(req);

		const uri = await this.oauthService.generateAOauth1AuthUri(credential, {
			cid: credential.id,
			origin: 'static-credential',
			userId: skipAuthOnOAuthCallback ? undefined : req.user.id,
		});

		this.logger.debug('OAuth1 authorization successful for new credential', {
			userId: req.user.id,
			credentialId: credential.id,
		});

		return uri;
	}

	/** Verify and store app code. Generate access tokens and store for respective credential */
	@Get('/callback', { usesTemplates: true, skipAuth: skipAuthOnOAuthCallback })
	async handleCallback(req: OAuthRequest.OAuth1Credential.Callback, res: Response) {
		try {
			const { oauth_verifier, oauth_token, state: encodedState } = req.query;

			if (!oauth_verifier || !oauth_token || !encodedState) {
				return this.oauthService.renderCallbackError(
					res,
					'Insufficient parameters for OAuth1 callback.',
					`Received following query parameters: ${JSON.stringify(req.query)}`,
				);
			}

			const [credential, _, oauthCredentials, state] =
				await this.oauthService.resolveCredential<OAuth1CredentialData>(req);

			// Form URL encoded body https://datatracker.ietf.org/doc/html/rfc5849#section-3.5.2
			const oauthToken = await axios.post<string>(
				oauthCredentials.accessTokenUrl,
				{ oauth_token, oauth_verifier },
				{ headers: { 'content-type': 'application/x-www-form-urlencoded' } },
			);

			// Response comes as x-www-form-urlencoded string so convert it to JSON

			const paramParser = new URLSearchParams(oauthToken.data);

			const oauthTokenData = Object.fromEntries(paramParser.entries());

			if (!state.origin || state.origin === 'static-credential') {
				await this.oauthService.encryptAndSaveData(credential, { oauthTokenData }, ['csrfSecret']);

				this.logger.debug('OAuth1 callback successful for new credential', {
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
					oauthTokenData,
					state.authorizationHeader.split('Bearer ')[1],
					state.credentialResolverId,
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
}
