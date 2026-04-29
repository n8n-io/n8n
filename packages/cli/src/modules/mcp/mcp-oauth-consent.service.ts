import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { OAuthClientRepository } from './database/repositories/oauth-client.repository';
import { UserConsentRepository } from './database/repositories/oauth-user-consent.repository';
import { McpOAuthAuthorizationCodeService } from './mcp-oauth-authorization-code.service';
import { McpOAuthHelpers } from './mcp-oauth.helpers';
import { McpClientLimitReachedError } from './mcp.errors';
import { OAuthSessionService, type OAuthSessionPayload } from './oauth-session.service';

/**
 * Manages OAuth consent flow for MCP server
 * Handles user authorization decisions and generates authorization codes
 */
@Service()
export class McpOAuthConsentService {
	constructor(
		private readonly logger: Logger,
		private readonly oauthSessionService: OAuthSessionService,
		private readonly oauthClientRepository: OAuthClientRepository,
		private readonly userConsentRepository: UserConsentRepository,
		private readonly authorizationCodeService: McpOAuthAuthorizationCodeService,
		private readonly globalConfig: GlobalConfig,
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
			const sessionPayload = this.oauthSessionService.verifySession(sessionToken);

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
		let sessionPayload: OAuthSessionPayload;
		try {
			sessionPayload = this.oauthSessionService.verifySession(sessionToken);
		} catch (error) {
			throw new UserError('Invalid or expired session');
		}

		if (!approved) {
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

		const existingConsent = await this.userConsentRepository.findOneBy({
			userId,
			clientId: sessionPayload.clientId,
		});

		await this.userConsentRepository.upsert(
			{
				userId,
				clientId: sessionPayload.clientId,
				grantedAt: Date.now(),
			},
			['userId', 'clientId'],
		);

		// Insert-then-rollback to keep the per-user cap race-tolerant: counting
		// before the upsert allows two concurrent first-time consents at limit-1
		// to both pass. Counting after means each one observes the post-write
		// state and at least one will roll back its own row.
		if (!existingConsent) {
			const consentCount = await this.userConsentRepository.countByUserId(userId);
			const limit = this.globalConfig.endpoints.mcpMaxClientsPerUser;
			if (consentCount > limit) {
				await this.userConsentRepository.delete({
					userId,
					clientId: sessionPayload.clientId,
				});
				throw new McpClientLimitReachedError(limit);
			}
		}

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
