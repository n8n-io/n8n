import { Service } from 'typedi';
import { Authorized, Get, Post, RequireGlobalScope, RestController } from '@/decorators';
import { LicenseRequest } from '@/requests';
import { LicenseService } from './license.service';

@Service()
@Authorized()
@RestController('/license')
export class LicenseController {
	constructor(private readonly licenseService: LicenseService) {}

	@Get('/')
	async getLicenseData() {
		return this.licenseService.getLicenseData();
	}

	@Post('/activate')
	@RequireGlobalScope('license:manage')
	async activateLicense(req: LicenseRequest.Activate) {
		const { activationKey } = req.body;
		await this.licenseService.activateLicense(activationKey);
		return this.getTokenAndData();
	}

	@Post('/renew')
	@RequireGlobalScope('license:manage')
	async renewLicense() {
		await this.licenseService.renewLicense();
		return this.getTokenAndData();
	}

	private async getTokenAndData() {
		const managementToken = this.licenseService.getManagementJwt();
		const data = await this.licenseService.getLicenseData();
		return { ...data, managementToken };
	}
}
