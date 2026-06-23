import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { OAuthClientRepository } from './database/repositories/oauth-client.repository';
import { UserConsentRepository } from './database/repositories/oauth-user-consent.repository';
import { OAuthAuthorizationCodeService } from './oauth-authorization-code.service';
import { OAuthSessionService, type OAuthSessionPayload } from './oauth-session.service';
import { OAuthHelpers } from './oauth.helpers';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';

type ConsentDetailsResult =
	| { ok: true; clientName: string; clientId: string; resourceName?: string; redirectUri?: string }
	| { ok: false; reason: 'resource_unavailable' };

/**
 * Manages the consent flow for the shared OAuth server.
 * Handles user authorization decisions and generates authorization codes
 */
@Service()
export class OAuthConsentService {
	constructor(
		private readonly logger: Logger,
		private readonly oauthSessionService: OAuthSessionService,
		private readonly oauthClientRepository: OAuthClientRepository,
		private readonly userConsentRepository: UserConsentRepository,
		private readonly authorizationCodeService: OAuthAuthorizationCodeService,
		private readonly protectedResourceRegistry: ProtectedResourceRegistry,
	) {}

	/**
	 * Get consent details from session cookie
	 * Verifies JWT session token and returns client information
	 */
	async getConsentDetails(sessionToken: string): Promise<ConsentDetailsResult | null> {
		try {
			const sessionPayload = this.oauthSessionService.verifySession(sessionToken);

			const client = await this.oauthClientRepository.findOne({
				where: { id: sessionPayload.clientId },
			});

			if (!client) {
				return null;
			}

			if (sessionPayload.resource) {
				const resource = await this.protectedResourceRegistry.getByResourceUrl(
					sessionPayload.resource,
				);

				if (!resource) {
					return { ok: false, reason: 'resource_unavailable' };
				}

				return {
					ok: true,
					clientName: client.name,
					clientId: client.id,
					resourceName: resource.displayName,
					redirectUri: sessionPayload.redirectUri,
				};
			}

			return {
				ok: true,
				clientName: client.name,
				clientId: client.id,
				redirectUri: sessionPayload.redirectUri,
			};
		} catch (error) {
			this.logger.error('Error getting consent details', { error });
			return null;
		}
	}

	/**
	 * Handle consent approval/denial
	 * Uses JWT session token instead of database lookup
	 */
	async handleConsentDecision(
		sessionToken: string,
		userId: string,
		approved: boolean,
	): Promise<{ redirectUrl: string }> {
		let sessionPayload: OAuthSessionPayload;
		try {
			sessionPayload = this.oauthSessionService.verifySession(sessionToken);
		} catch (error) {
			throw new UserError('Invalid or expired session');
		}

		if (!approved) {
			const redirectUrl = OAuthHelpers.buildErrorRedirectUrl(
				sessionPayload.redirectUri,
				'access_denied',
				'User denied the authorization request',
				sessionPayload.state,
			);

			this.logger.info('Consent denied', {
				clientId: sessionPayload.clientId,
				userId,
			});

			return { redirectUrl };
		}

		await this.userConsentRepository.upsert(
			{
				userId,
				clientId: sessionPayload.clientId,
				grantedAt: Date.now(),
			},
			['userId', 'clientId'],
		);

		const code = await this.authorizationCodeService.createAuthorizationCode(
			sessionPayload.clientId,
			userId,
			sessionPayload.redirectUri,
			sessionPayload.codeChallenge,
			sessionPayload.state,
			sessionPayload.resource,
		);

		const successRedirectUrl = OAuthHelpers.buildSuccessRedirectUrl(
			sessionPayload.redirectUri,
			code,
			sessionPayload.state,
		);

		this.logger.info('Consent approved', {
			clientId: sessionPayload.clientId,
			userId,
		});

		return { redirectUrl: successRedirectUrl };
	}
}
