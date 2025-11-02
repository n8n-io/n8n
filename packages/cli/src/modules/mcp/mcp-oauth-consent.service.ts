import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { McpOAuthAuthorizationCodeService } from './mcp-oauth-authorization-code.service';
import { McpOAuthHelpers } from './mcp-oauth.helpers';
import { OAuthClientRepository } from './oauth-client.repository';
import { OAuthSessionService, type OAuthSessionPayload } from './oauth-session.service';
import { UserConsentRepository } from './oauth-user-consent.repository';

@Service()
export class McpOAuthConsentService {
	constructor(
		private readonly logger: Logger,
		private readonly oauthSessionService: OAuthSessionService,
		private readonly oauthClientRepository: OAuthClientRepository,
		private readonly userConsentRepository: UserConsentRepository,
		private readonly authorizationCodeService: McpOAuthAuthorizationCodeService,
	) {}

	/**
	 * Get consent details from session cookie
	 * Verifies JWT session token and returns client information
	 */
	async getConsentDetails(sessionToken: string): Promise<{
		clientName: string;
		clientId: string;
	} | null> {
		try {
			// Verify and decode the JWT session token
			const sessionPayload = this.oauthSessionService.verifySession(sessionToken);

			// Look up the client
			const client = await this.oauthClientRepository.findOne({
				where: { id: sessionPayload.clientId },
			});

			if (!client) {
				return null;
			}

			return {
				clientName: client.name,
				clientId: client.id,
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
		// Verify the JWT session token
		let sessionPayload: OAuthSessionPayload;
		try {
			sessionPayload = this.oauthSessionService.verifySession(sessionToken);
		} catch (error) {
			throw new Error('Invalid or expired session');
		}

		if (!approved) {
			// User denied consent
			const redirectUrl = McpOAuthHelpers.buildErrorRedirectUrl(
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

		// User approved - save consent and generate authorization code
		await this.userConsentRepository.save({
			userId,
			clientId: sessionPayload.clientId,
			grantedAt: Date.now(),
		});

		const code = await this.authorizationCodeService.createAuthorizationCode(
			sessionPayload.clientId,
			userId,
			sessionPayload.redirectUri,
			sessionPayload.codeChallenge,
			sessionPayload.state,
		);

		const successRedirectUrl = McpOAuthHelpers.buildSuccessRedirectUrl(
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
