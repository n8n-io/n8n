import { Authorized, Post, RestController } from '@/decorators';
import { OrchestrationRequest } from '@/requests';
import { Service } from 'typedi';
import { SingleMainInstancePublisher } from '@/services/orchestration/main/SingleMainInstance.publisher';
import { License } from '../License';
import { RequireGlobalScope } from '@/decorators/Scopes';

@Authorized()
@RestController('/orchestration')
@Service()
export class OrchestrationController {
	constructor(
		private readonly orchestrationService: SingleMainInstancePublisher,
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
		return this.orchestrationService.getWorkerStatus(id);
	}

	@RequireGlobalScope('orchestration:read')
	@Post('/worker/status')
	async getWorkersStatusAll() {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		return this.orchestrationService.getWorkerStatus();
	}

	@RequireGlobalScope('orchestration:list')
	@Post('/worker/ids')
	async getWorkerIdsAll() {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		return this.orchestrationService.getWorkerIds();
	}
}
