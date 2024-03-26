import { Get, Post, RestController, GlobalScope } from '@/decorators';
import { LicenseRequest } from '@/requests';
import { LicenseService } from './license.service';

@RestController('/license')
export class LicenseController {
	constructor(private readonly licenseService: LicenseService) {}

	@Get('/')
	async getLicenseData() {
		return await this.licenseService.getLicenseData();
	}

	@Post('/activate')
	@GlobalScope('license:manage')
	async activateLicense(req: LicenseRequest.Activate) {
		const { activationKey } = req.body;
		await this.licenseService.activateLicense(activationKey);
		return await this.getTokenAndData();
	}

	@Post('/renew')
	@GlobalScope('license:manage')
	async renewLicense() {
		await this.licenseService.renewLicense();
		return await this.getTokenAndData();
	}

	private async getTokenAndData() {
		const managementToken = this.licenseService.getManagementJwt();
		const data = await this.licenseService.getLicenseData();
		return { ...data, managementToken };
	}
}
