import { Logger } from '@n8n/backend-common';
import { Get, RestController } from '@n8n/decorators';
import { Response } from 'express';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { CredentialsOverwrites } from '@/credentials-overwrites';
import { EventService } from '@/events/event.service';
import { OauthService, type OAuth1CredentialData } from '@/oauth/oauth.service';
import { OAuthRequest } from '@/requests';

@RestController('/oauth1-credential')
export class OAuth1CredentialController {
	constructor(
		private readonly oauthService: OauthService,
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly credentialsOverwrites: CredentialsOverwrites,
	) {}

	/** Get Authorization url */
	@Get('/auth')
	async getAuthUri(req: OAuthRequest.OAuth1Credential.Auth, res: Response): Promise<string> {
		const credential = await this.oauthService.getCredentialForAuthFlow(req);
		const csrfData = await this.oauthService.buildCsrfStateData(credential, req);
		const uri = await this.oauthService.generateAOauth1AuthUri(credential, csrfData, req, res);

		this.logger.debug('OAuth1 authorization successful for new credential', {
			userId: req.user.id,
			credentialId: credential.id,
		});

		return uri;
	}

	/** Verify and store app code. Generate access tokens and store for respective credential */
	@Get('/callback', { usesTemplates: true, allowUnauthenticated: true })
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

			const [credential, decryptedDataOriginal, oauthCredentials, state, flowState] =
				await this.oauthService.resolveCredential<OAuth1CredentialData>(req);

			const oauthTokenData = await this.oauthService.getOAuth1AccessToken(oauthCredentials, {
				oauthToken: oauth_token,
				oauthVerifier: oauth_verifier,
				oauthTokenSecret: flowState.oauthTokenSecret ?? '',
			});

			if (!state.origin || state.origin === 'static-credential') {
				await this.oauthService.encryptAndSaveData(credential, { oauthTokenData });

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
					(state.authMetadata as Record<string, unknown>) ?? {},
				);

				if (typeof state.userId === 'string') {
					this.eventService.emit('private-credential-user-connected', {
						user: { id: state.userId },
						credentialType: credential.type,
						credentialId: credential.id,
						supportsManagedAuth: this.credentialsOverwrites.supportsManagedAuth(credential.type),
						usesManagedAuth: this.credentialsOverwrites.usesManagedAuth(
							credential.type,
							decryptedDataOriginal,
						),
					});
				}

				return res.render('oauth-callback');
			}
		} catch (e) {
			const error = ensureError(e);
			this.logger.error('OAuth1 callback failed', { error, cause: error.cause });
			return this.oauthService.renderCallbackError(
				res,
				error.message,
				this.oauthService.extractCallbackErrorReason(error),
			);
		}
	}
}
