import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { ApproveConsentRequestDto } from './dto/approve-consent-request.dto';
import { McpOAuthConsentService } from './mcp-oauth-consent.service';
import { OAuthSessionService } from './oauth-session.service';

@RestController('/consent')
export class McpConsentController {
	constructor(
		private readonly logger: Logger,
		private readonly consentService: McpOAuthConsentService,
		private readonly oauthSessionService: OAuthSessionService,
	) {}

	@Get('/details', { usesTemplates: true })
	async getConsentDetails(req: AuthenticatedRequest, res: Response) {
		try {
			const sessionToken = this.getAndValidateSessionToken(req, res);
			if (!sessionToken) return;

			const consentDetails = await this.consentService.getConsentDetails(sessionToken);

			if (!consentDetails) {
				this.sendInvalidSessionError(res, true);
				return;
			}

			res.json({
				data: {
					clientName: consentDetails.clientName,
					clientId: consentDetails.clientId,
				},
			});
		} catch (error) {
			this.logger.error('Failed to get consent details', { error });
			this.oauthSessionService.clearSession(res);
			this.sendErrorResponse(res, 500, 'Failed to load authorization details');
		}
	}

	@Post('/approve', { usesTemplates: true })
	async approveConsent(
		req: AuthenticatedRequest,
		res: Response,
		@Body payload: ApproveConsentRequestDto,
	) {
		try {
			const sessionToken = this.getAndValidateSessionToken(req, res);
			if (!sessionToken) return;

			const result = await this.consentService.handleConsentDecision(
				sessionToken,
				req.user.id,
				payload.approved,
			);

			this.oauthSessionService.clearSession(res);

			res.json({
				data: {
					status: 'success',
					redirectUrl: result.redirectUrl,
				},
			});
		} catch (error) {
			this.logger.error('Failed to process consent', { error });
			this.oauthSessionService.clearSession(res);
			const message = error instanceof Error ? error.message : 'Failed to process authorization';
			this.sendErrorResponse(res, 500, message);
		}
	}

	private sendErrorResponse(res: Response, statusCode: number, message: string): void {
		res.status(statusCode).json({
			status: 'error',
			message,
		});
	}

	private sendInvalidSessionError(res: Response, clearCookie = false): void {
		if (clearCookie) {
			this.oauthSessionService.clearSession(res);
		}
		this.sendErrorResponse(res, 400, 'Invalid or expired authorization session');
	}

	private getAndValidateSessionToken(req: AuthenticatedRequest, res: Response): string | null {
		const sessionToken = this.oauthSessionService.getSessionToken(req.cookies);
		if (!sessionToken) {
			this.sendInvalidSessionError(res);
			return null;
		}

		try {
			this.oauthSessionService.verifySession(sessionToken);
			return sessionToken;
		} catch (error) {
			this.logger.debug('Invalid session token', { error });
			this.sendInvalidSessionError(res, true);
			return null;
		}
	}
}
