import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Patch, RestController } from '@n8n/decorators';
import { LicenseState } from '@n8n/backend-common';

import { OidcInstanceSettingsLoader } from '@/instance-settings-loader/loaders/oidc.instance-settings-loader';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { ProvisioningService } from './provisioning.service.ee';
import { Response } from 'express';

@RestController('/sso/provisioning')
export class ProvisioningController {
	constructor(
		private readonly provisioningService: ProvisioningService,
		private readonly licenseState: LicenseState,
		private readonly oidcSettingsLoader: OidcInstanceSettingsLoader,
	) {}

	@Get('/config')
	@GlobalScope('provisioning:manage')
	async getConfig(_req: AuthenticatedRequest, res: Response) {
		if (!this.licenseState.isProvisioningLicensed()) {
			return res.status(403).json({ message: 'Provisioning is not licensed' });
		}

		return await this.provisioningService.getConfig();
	}

	@Patch('/config')
	@GlobalScope('provisioning:manage')
	async patchConfig(req: AuthenticatedRequest, res: Response) {
		if (!this.licenseState.isProvisioningLicensed()) {
			return res.status(403).json({ message: 'Provisioning is not licensed' });
		}

		if (this.oidcSettingsLoader.isConfiguredByEnv()) {
			throw new BadRequestError(
				'Provisioning configuration is managed via environment variables and cannot be modified through the UI',
			);
		}

		return await this.provisioningService.patchConfig(req.body);
	}
}
