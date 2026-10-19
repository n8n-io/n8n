import {
	ScimConfigPatchDto,
	type ScimConfigPatchResponse,
	type ScimConfigResponse,
} from '@n8n/api-types';
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

import { deriveScimConnectionStatus, ScimConnectionService } from './scim-connection.service';
import { ScimDeprovisioningService } from './scim-deprovisioning.service';
import { ScimOptInService } from './scim-opt-in.service';
import { ScimSettingsService } from './scim-settings.service';
import { ScimSsoService } from './scim-sso.service';
import { ScimTokenService } from './scim-token.service';
import { ScimInvalidTransferTargetError, ScimTokenConflictError } from './scim.errors';
import { ScimService } from './scim.service';

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
		private readonly scimOptInService: ScimOptInService,
		private readonly scimConnectionService: ScimConnectionService,
		private readonly scimSsoService: ScimSsoService,
		private readonly scimService: ScimService,
		private readonly scimDeprovisioningService: ScimDeprovisioningService,
	) {}

	/**
	 * Every route answers 404 while the SCIM opt-in is off. The gate runs
	 * before authentication and the scope check, so a caller without a
	 * session or without `scim:manage` also gets 404.
	 */
	@Middleware({ beforeAuth: true })
	async requireOptIn(req: Request, res: Response, next: NextFunction) {
		await this.scimOptInService.gate(req, res, next);
	}

	/**
	 * GET /rest/scim/config
	 * Current provisioning state, connection status, the number of
	 * provisioned users and the deprovisioning policy for the settings screen.
	 */
	@Get('/config')
	@GlobalScope('scim:manage')
	async getConfig(_req: AuthenticatedRequest, res: Response) {
		try {
			const [enabled, tokenInfo, lastAuthFailure, counts, deprovisioning] = await Promise.all([
				this.scimSettingsService.isEnabled(),
				this.scimTokenService.getTokenInfo(),
				this.scimSettingsService.getLastAuthFailure(),
				this.scimService.getProvisioningCounts(),
				this.scimDeprovisioningService.describePolicy(),
			]);

			return res.status(200).json({
				data: {
					enabled,
					hasToken: tokenInfo.hasToken,
					tokenHint: tokenInfo.lastFour,
					baseUrl: this.scimTokenService.getScimBaseUrl(),
					token: tokenInfo.details,
					lastAuthFailure,
					status: deriveScimConnectionStatus(tokenInfo.details, lastAuthFailure),
					provisionedCount: counts.provisioned,
					deactivatedCount: counts.deactivated,
					...deprovisioning,
				} satisfies ScimConfigResponse,
			});
		} catch (error) {
			this.logger.error('Error getting SCIM config', { error });
			return res.status(500).json({ message: 'Internal server error' });
		}
	}

	/**
	 * PATCH /rest/scim/config
	 * Change one or more SCIM settings. A field that the body does not send
	 * keeps its stored value.
	 *
	 * The stored token is kept when provisioning is turned off. Enabling needs
	 * SAML or OIDC single sign-on, because SCIM users can sign in only through
	 * the identity provider. Disabling is always allowed.
	 *
	 * A transfer project must be a team project or the personal project of an
	 * active user. The checks run before anything is saved, so a rejected
	 * body changes nothing.
	 */
	@Patch('/config')
	@GlobalScope('scim:manage')
	async updateConfig(_req: AuthenticatedRequest, res: Response, @Body body: ScimConfigPatchDto) {
		const { enabled, onDelete, dataAction, transferProjectId } = body;

		if (enabled && !this.scimSsoService.isSsoEnabled()) {
			return res.status(400).json({
				message: 'Turn on SAML or OIDC single sign-on before you enable SCIM provisioning.',
			});
		}

		try {
			const policy = await this.scimDeprovisioningService.updatePolicy({
				onDelete,
				dataAction,
				transferProjectId,
			});
			if (enabled !== undefined) await this.setEnabled(enabled);

			return res.status(200).json({
				data: {
					enabled: enabled ?? (await this.scimSettingsService.isEnabled()),
					...policy,
				} satisfies ScimConfigPatchResponse,
			});
		} catch (error) {
			if (error instanceof ScimInvalidTransferTargetError) {
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
			const scimToken = await this.scimTokenService.rotateToken(req.user);
			const baseUrl = this.scimTokenService.getScimBaseUrl();
			await this.resetAuthFailure();
			await this.refreshModuleSettings();

			return res.status(201).json({ data: { token: scimToken.token, baseUrl } });
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

	private async setEnabled(enabled: boolean) {
		const wasEnabled = await this.scimSettingsService.isEnabled();
		await this.scimSettingsService.setEnabled(enabled);
		// A failure that is stored when SCIM turns on is from before SCIM
		// turned off, because a disabled SCIM records no failures.
		if (enabled && !wasEnabled) await this.resetAuthFailure();
		// `/rest/module-settings` serves a cached snapshot, so refresh it or
		// clients keep reading the previous value.
		await this.moduleRegistry.refreshModuleSettings('scim');
	}

	/**
	 * The connection status starts again for a new token or a new enable. A
	 * failure must not fail the request, because the change is already saved.
	 * The status rule ignores a failure from before the token was created.
	 */
	private async resetAuthFailure() {
		try {
			await this.scimConnectionService.resetAuthFailure();
		} catch (error) {
			this.logger.warn('SCIM: Failed to reset the authentication failure', { error });
		}
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
