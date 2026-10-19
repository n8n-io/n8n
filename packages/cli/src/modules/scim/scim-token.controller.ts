import { ScimConfigPatchDto } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Middleware,
	Patch,
	Post,
	RestController,
} from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { ScimOptInService } from './scim-opt-in.service';
import { ScimSettingsService } from './scim-settings.service';
import { ScimTokenService } from './scim-token.service';

/**
 * REST Controller for SCIM configuration and token management.
 * These endpoints require authentication and the `scim:manage` scope.
 *
 * The token value is returned exactly once, by the POST endpoint that
 * creates it. The config endpoint only ever exposes whether a token
 * exists and its last four characters.
 */
@RestController('/scim')
export class ScimTokenController {
	constructor(
		private readonly logger: Logger,
		private readonly scimTokenService: ScimTokenService,
		private readonly scimSettingsService: ScimSettingsService,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly scimOptInService: ScimOptInService,
	) {}

	/**
	 * Every route answers 404 while the SCIM opt-in is off. Controller
	 * middlewares run after authentication and the scope check, so a caller
	 * without `scim:manage` still gets 403.
	 */
	@Middleware()
	async requireOptIn(req: Request, res: Response, next: NextFunction) {
		await this.scimOptInService.gate(req, res, next);
	}

	/**
	 * GET /rest/scim/config
	 * Current provisioning state for the settings screen.
	 */
	@Get('/config')
	@GlobalScope('scim:manage')
	async getConfig(req: AuthenticatedRequest, res: Response) {
		try {
			const [enabled, tokenInfo] = await Promise.all([
				this.scimSettingsService.isEnabled(),
				this.scimTokenService.getTokenInfoForUser(req.user),
			]);

			return res.status(200).json({
				data: {
					enabled,
					hasToken: tokenInfo.hasToken,
					tokenHint: tokenInfo.lastFour,
					baseUrl: this.scimTokenService.getScimBaseUrl(),
				},
			});
		} catch (error) {
			this.logger.error('Error getting SCIM config', { error });
			return res.status(500).json({ message: 'Internal server error' });
		}
	}

	/**
	 * PATCH /rest/scim/config
	 * Enable or disable SCIM provisioning. The stored token is kept when
	 * provisioning is turned off.
	 */
	@Patch('/config')
	@GlobalScope('scim:manage')
	async updateConfig(_req: AuthenticatedRequest, res: Response, @Body body: ScimConfigPatchDto) {
		try {
			await this.scimSettingsService.setEnabled(body.enabled);
			// `/rest/module-settings` serves a cached snapshot, so refresh it or
			// clients keep reading the previous value.
			await this.moduleRegistry.refreshModuleSettings('scim');

			return res.status(200).json({ data: { enabled: body.enabled } });
		} catch (error) {
			this.logger.error('Error updating SCIM config', { error });
			return res.status(500).json({ message: 'Internal server error' });
		}
	}

	/**
	 * POST /rest/scim/token
	 * Generate or rotate the SCIM token. This is the only place the full
	 * token value is ever returned.
	 */
	@Post('/token')
	@GlobalScope('scim:manage')
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
	@GlobalScope('scim:manage')
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
