import { Post, RestController, GlobalScope } from '@/decorators';
import { License } from '@/license';
import { OrchestrationRequest } from '@/requests';
import { OrchestrationService } from '@/services/orchestration.service';

@RestController('/orchestration')
export class OrchestrationController {
	constructor(
		private readonly orchestrationService: OrchestrationService,
		private readonly licenseService: License,
	) {}

	/**
	 * These endpoints do not return anything, they just trigger the message to
	 * the workers to respond on Redis with their status.
	 */
	@GlobalScope('orchestration:read')
	@Post('/worker/status/:id')
	async getWorkersStatus(req: OrchestrationRequest.Get) {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		const id = req.params.id;
		return await this.orchestrationService.getWorkerStatus(id);
	}

	@GlobalScope('orchestration:read')
	@Post('/worker/status')
	async getWorkersStatusAll() {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		return await this.orchestrationService.getWorkerStatus();
	}

	@GlobalScope('orchestration:list')
	@Post('/worker/ids')
	async getWorkerIdsAll() {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		return await this.orchestrationService.getWorkerIds();
	}
}
