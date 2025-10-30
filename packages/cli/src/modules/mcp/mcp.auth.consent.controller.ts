import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { McpOAuthService } from './mcp-oauth-service';

@RestController('/consent')
export class McpConsentController {
	constructor(
		private readonly logger: Logger,
		private readonly mcpOAuthService: McpOAuthService,
	) {}

	/**
	 * Get consent details for the current OAuth session
	 * Called by the consent page to display client information
	 */
	@Get('/details', { skipAuth: false })
	async getConsentDetails(req: AuthenticatedRequest, res: Response) {
		try {
			// Get the OAuth session ID from cookie
			const sessionId = req.cookies['n8n-oauth-session'];

			if (!sessionId) {
				return res.status(400).json({
					status: 'error',
					message: 'Invalid or expired authorization session',
				});
			}

			// Get consent details using the service
			// This will verify the JWT, create an authorization record, and return details
			const consentDetails = await this.mcpOAuthService.getConsentDetails(sessionId, req.user.id);

			if (!consentDetails) {
				return res.status(400).json({
					status: 'error',
					message: 'Invalid or expired authorization session',
				});
			}

			// Update the cookie with the authorization code ID for use in approval
			res.cookie('n8n-oauth-session', consentDetails.sessionId, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 10 * 60 * 1000, // 10 minutes
			});

			return {
				clientName: consentDetails.clientName,
				clientId: consentDetails.clientId,
				scopes: consentDetails.scopes,
			};
		} catch (error) {
			this.logger.error('Failed to get consent details', { error });
			return res.status(500).json({
				status: 'error',
				message: 'Failed to load authorization details',
			});
		}
	}

	/**
	 * Handle consent approval or denial
	 * Called when user clicks "Allow" or "Deny" on the consent page
	 */
	@Post('/approve', { skipAuth: false })
	async approveConsent(req: AuthenticatedRequest, res: Response) {
		try {
			const { approved } = req.body as { approved: boolean };

			if (typeof approved !== 'boolean') {
				return res.status(400).json({
					status: 'error',
					message: 'Missing or invalid "approved" field',
				});
			}

			// Get the OAuth session ID from cookie
			const sessionId = req.cookies['n8n-oauth-session'];

			if (!sessionId) {
				return res.status(400).json({
					status: 'error',
					message: 'Invalid or expired authorization session',
				});
			}

			// Process the consent decision using the service
			const result = await this.mcpOAuthService.handleConsentDecision(
				sessionId,
				req.user.id,
				approved,
			);

			// Clear the session cookie
			res.clearCookie('n8n-oauth-session');

			// Return the redirect URL (includes authorization code or error)
			return {
				status: 'success',
				redirectUrl: result.redirectUrl,
			};
		} catch (error) {
			this.logger.error('Failed to process consent', { error });

			// Clear the session cookie even on error
			res.clearCookie('n8n-oauth-session');

			return res.status(500).json({
				status: 'error',
				message: error instanceof Error ? error.message : 'Failed to process authorization',
			});
		}
	}
}
