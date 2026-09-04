import { SsoRedirectToggleDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Post, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { SsoSettingsService } from './sso-settings.service';

@RestController('/sso')
export class SsoController {
	constructor(
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly licenseState: LicenseState,
		private readonly ssoSettingsService: SsoSettingsService,
	) {}

	/**
	 * Enable or disable auto-redirecting the login page to the SSO provider.
	 */
	@Post('/settings/login-redirect')
	@GlobalScope('saml:manage')
	async setLoginRedirect(
		_req: AuthenticatedRequest,
		res: Response,
		@Body { redirectLoginToSso }: SsoRedirectToggleDto,
	) {
		if (
			redirectLoginToSso &&
			!this.licenseState.isSamlLicensed() &&
			!this.licenseState.isOidcLicensed()
		) {
			throw new ForbiddenError('SSO is not available with the current license');
		}
		if (this.instanceSettingsLoaderConfig.ssoManagedByEnv) {
			throw new ForbiddenError(
				'SSO configuration is managed via environment variables and cannot be modified through the API',
			);
		}
		await this.ssoSettingsService.setRedirectLoginToSso(redirectLoginToSso);
		return res.sendStatus(200);
	}
}
