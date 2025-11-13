import { Logger } from '@n8n/backend-common';
import { Delete, Get, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import type { AuthenticatedRequest } from '@n8n/db';

import { ScimTokenService } from './scim-token.service';

/**
 * REST Controller for SCIM token management
 * These endpoints require authentication
 */
@RestController('/scim')
export class ScimTokenController {
	constructor(
		private readonly logger: Logger,
		private readonly scimTokenService: ScimTokenService,
	) {}

	/**
	 * GET /rest/scim/token
	 * Get or create SCIM token for the authenticated user
	 */
	@Get('/token')
	async getToken(req: AuthenticatedRequest, res: Response) {
		try {
			const apiKey = await this.scimTokenService.getOrCreateApiKey(req.user);
			const baseUrl = this.scimTokenService.getScimBaseUrl();

			return res.status(200).json({ data: { token: apiKey.apiKey, baseUrl } });
		} catch (error) {
			this.logger.error('Error getting SCIM token', { error });
			return res.status(500).json({ message: 'Internal server error' });
		}
	}

	/**
	 * POST /rest/scim/token
	 * Generate/rotate SCIM token for the authenticated user
	 */
	@Post('/token')
	async generateToken(req: AuthenticatedRequest, res: Response) {
		try {
			const apiKey = await this.scimTokenService.rotateScimApiKey(req.user);
			const baseUrl = this.scimTokenService.getScimBaseUrl();

			return res.status(201).json({ data: { token: apiKey.apiKey, baseUrl } });
		} catch (error) {
			this.logger.error('Error generating SCIM token', { error });
			return res.status(500).json({ message: 'Internal server error' });
		}
	}

	/**
	 * DELETE /rest/scim/token
	 * Delete SCIM token for the authenticated user
	 */
	@Delete('/token')
	async deleteToken(req: AuthenticatedRequest, res: Response) {
		try {
			await this.scimTokenService.deleteAllScimApiKeysForUser(req.user);

			return res.status(200).json({ data: { success: true } });
		} catch (error) {
			this.logger.error('Error deleting SCIM token', { error });
			return res.status(500).json({ message: 'Internal server error' });
		}
	}
}
