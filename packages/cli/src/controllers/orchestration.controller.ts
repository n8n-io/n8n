import { Authorized, Post, RestController, RequireGlobalScope } from '@/decorators';
import { OrchestrationRequest } from '@/requests';
import { OrchestrationService } from '@/services/orchestration.service';
import { License } from '@/License';

@Authorized()
@RestController('/orchestration')
export class OrchestrationController {
	constructor(
		private readonly orchestrationService: OrchestrationService,
		private readonly licenseService: License,
	) {}

	/**
	 * These endpoints do not return anything, they just trigger the messsage to
	 * the workers to respond on Redis with their status.
	 */
	@RequireGlobalScope('orchestration:read')
	@Post('/worker/status/:id')
	async getWorkersStatus(req: OrchestrationRequest.Get) {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		const id = req.params.id;
		return await this.orchestrationService.getWorkerStatus(id);
	}

	@RequireGlobalScope('orchestration:read')
	@Post('/worker/status')
	async getWorkersStatusAll() {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		return await this.orchestrationService.getWorkerStatus();
	}

	@RequireGlobalScope('orchestration:list')
	@Post('/worker/ids')
	async getWorkerIdsAll() {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		return await this.orchestrationService.getWorkerIds();
	}
}
