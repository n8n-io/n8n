import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Patch, RestController } from '@n8n/decorators';
import { LicenseState } from '@n8n/backend-common';
import { ProvisioningService } from './provisioning.service.ee';
import { Response } from 'express';

@RestController('/sso/provisioning')
export class ProvisioningController {
	constructor(
		private readonly provisioningService: ProvisioningService,
		private readonly licenseState: LicenseState,
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

		return await this.provisioningService.patchConfig(req.body);
	}
}
