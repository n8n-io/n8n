import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';
import { UserError } from 'n8n-workflow';

import { ApproveConsentRequestDto } from './dto/approve-consent-request.dto';
import { OAuthConsentService } from './oauth-consent.service';
import { OAuthSessionService } from './oauth-session.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

@RestController('/consent')
export class OAuthConsentController {
	constructor(
		private readonly logger: Logger,
		private readonly consentService: OAuthConsentService,
		private readonly oauthSessionService: OAuthSessionService,
	) {}

	@Get('/details', { usesTemplates: true })
	async getConsentDetails(req: AuthenticatedRequest, res: Response) {
		try {
			const sessionToken = this.getAndValidateSessionToken(req, res);
			if (!sessionToken) return;

			const consentDetails = await this.consentService.getConsentDetails(sessionToken, req.user);

			if (!consentDetails) {
				this.sendInvalidSessionError(res, true);
				return;
			}

			if (!consentDetails.ok) {
				this.oauthSessionService.clearSession(res);
				if (consentDetails.reason === 'forbidden') {
					this.sendErrorResponse(
						res,
						403,
						'You do not have sufficient permissions to authorize this request',
					);
				} else {
					this.sendErrorResponse(res, 422, 'Authorization target is no longer available');
				}
				return;
			}

			res.json({
				data: {
					clientName: consentDetails.clientName,
					clientId: consentDetails.clientId,
					redirectUri: consentDetails.redirectUri,
					resourceName: consentDetails.resourceName,
					scopes: consentDetails.scopes,
					previousScopes: consentDetails.previousScopes,
					scopeTools: consentDetails.scopeTools,
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
				req.user,
				payload.approved,
				payload.scopes,
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
			if (error instanceof ForbiddenError) {
				this.sendErrorResponse(
					res,
					403,
					'You do not have sufficient permissions to authorize this request',
				);
				return;
			}
			const message = error instanceof Error ? error.message : 'Failed to process authorization';
			// UserError = invalid input (e.g. bad scope selection), not a server fault
			this.sendErrorResponse(res, error instanceof UserError ? 400 : 500, message);
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
