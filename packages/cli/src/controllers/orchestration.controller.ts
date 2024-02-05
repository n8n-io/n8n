import { Authorized, Post, RestController, Scoped } from '@/decorators';
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
	@Scoped('orchestration:read', { globalOnly: true })
	@Post('/worker/status/:id')
	async getWorkersStatus(req: OrchestrationRequest.Get) {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		const id = req.params.id;
		return await this.orchestrationService.getWorkerStatus(id);
	}

	@Scoped('orchestration:read', { globalOnly: true })
	@Post('/worker/status')
	async getWorkersStatusAll() {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		return await this.orchestrationService.getWorkerStatus();
	}

	@Scoped('orchestration:list', { globalOnly: true })
	@Post('/worker/ids')
	async getWorkerIdsAll() {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		return await this.orchestrationService.getWorkerIds();
	}
}
