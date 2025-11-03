import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Patch, RestController } from '@n8n/decorators';
import { ProvisioningService } from './provisioning.service.ee';
import { Response } from 'express';

@RestController('/sso/provisioning')
export class ProvisioningController {
	constructor(private readonly provisioningService: ProvisioningService) {}

	@Get('/config')
	@GlobalScope('provisioning:manage')
	async getConfig(_req: AuthenticatedRequest, _res: Response) {
		return await this.provisioningService.getConfig();
	}

	@Patch('/config')
	@GlobalScope('provisioning:manage')
	async patchConfig(req: AuthenticatedRequest, _res: Response) {
		return await this.provisioningService.patchConfig(req.body);
	}
}
