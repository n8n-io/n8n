import { ScimConfigPatchDto } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, GlobalScope, Patch, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { ScimSettingsService } from './scim-settings.service';
import { ScimSsoService } from './scim-sso.service';
import { ScimTokenService } from './scim-token.service';
import { ScimSsoRequiredError, ScimTokenConflictError } from './scim.errors';

/**
 * REST Controller for SCIM configuration and token management.
 * These endpoints require authentication and the `scim:manage` scope.
 *
 * The instance has one SCIM token. Every user with `scim:manage` sees,
 * rotates and revokes that token, whoever created it.
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
		private readonly scimSsoService: ScimSsoService,
	) {}

	/**
	 * GET /rest/scim/config
	 * Current provisioning state for the settings screen.
	 */
	@Get('/config')
	@GlobalScope('scim:manage')
	async getConfig(_req: AuthenticatedRequest, res: Response) {
		try {
			const [enabled, tokenInfo] = await Promise.all([
				this.scimSettingsService.isEnabled(),
				this.scimTokenService.getTokenInfo(),
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
	 * provisioning is turned off. Enabling needs SAML or OIDC single sign-on,
	 * because SCIM users can sign in only through the identity provider.
	 * Disabling is always allowed.
	 */
	@Patch('/config')
	@GlobalScope('scim:manage')
	async updateConfig(_req: AuthenticatedRequest, res: Response, @Body body: ScimConfigPatchDto) {
		const { enabled } = body;

		try {
			if (enabled) this.assertSsoEnabled();

			const saved = await this.scimSettingsService.update({
				enabled,
				// Single sign-on can turn off after the check above, also on another
				// main. The SSO-off cascade takes the lock that this check runs
				// under, and this check reads the saved method. Thus this check
				// sees single sign-on off, or the cascade sees this enable.
				assertCanEnable: async (ctx) => {
					if (!(await this.scimSsoService.isSsoEnabledInTransaction(ctx))) {
						throw new ScimSsoRequiredError();
					}
				},
			});

			// `/rest/module-settings` serves a cached snapshot, so refresh it or
			// clients keep reading the previous value.
			await this.moduleRegistry.refreshModuleSettings('scim');

			return res.status(200).json({ data: { enabled: saved.enabled } });
		} catch (error) {
			if (error instanceof ScimSsoRequiredError) {
				return res.status(400).json({ message: error.message });
			}

			this.logger.error('Error updating SCIM config', { error });
			return res.status(500).json({ message: 'Internal server error' });
		}
	}

	/**
	 * POST /rest/scim/token
	 * Generate the instance SCIM token, or rotate it. This is the only place
	 * the full token value is ever returned. Returns 409 when another request
	 * changed the token at the same time.
	 */
	@Post('/token')
	@GlobalScope('scim:manage')
	async generateToken(req: AuthenticatedRequest, res: Response) {
		try {
			const token = await this.scimTokenService.rotateToken(req.user);
			const baseUrl = this.scimTokenService.getScimBaseUrl();
			await this.refreshModuleSettings();

			return res.status(201).json({ data: { token, baseUrl } });
		} catch (error) {
			if (error instanceof ScimTokenConflictError) {
				return res.status(409).json({ message: error.message });
			}

			this.logger.error('Error generating SCIM token', { error });
			return res.status(500).json({ message: 'Internal server error' });
		}
	}

	/**
	 * DELETE /rest/scim/token
	 * Revoke the instance SCIM token, whoever created it.
	 */
	@Delete('/token')
	@GlobalScope('scim:manage')
	async deleteToken(_req: AuthenticatedRequest, res: Response) {
		try {
			await this.scimTokenService.revokeToken();
			await this.refreshModuleSettings();

			return res.status(200).json({ data: { success: true } });
		} catch (error) {
			this.logger.error('Error deleting SCIM token', { error });
			return res.status(500).json({ message: 'Internal server error' });
		}
	}

	/** SCIM users can sign in only through the identity provider. */
	private assertSsoEnabled() {
		if (!this.scimSsoService.isSsoEnabled()) throw new ScimSsoRequiredError();
	}

	/**
	 * `/rest/module-settings` serves a cached snapshot, so refresh it after a
	 * token change. A failure only delays the new value. It must not fail the
	 * request: the token change is already saved, and the response of a
	 * rotation is the only copy of the new token.
	 */
	private async refreshModuleSettings() {
		try {
			await this.moduleRegistry.refreshModuleSettings('scim');
		} catch (error) {
			this.logger.warn('SCIM: Failed to refresh the module settings', { error });
		}
	}
}
