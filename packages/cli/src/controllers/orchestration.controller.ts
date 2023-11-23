import { Authorized, Post, RestController, RequireGlobalScope } from '@/decorators';
import { OrchestrationRequest } from '@/requests';
import { Service } from 'typedi';
import { SingleMainSetup } from '@/services/orchestration/main/SingleMainSetup';
import { License } from '../License';

@Authorized()
@RestController('/orchestration')
@Service()
export class OrchestrationController {
	constructor(
		private readonly singleMainSetup: SingleMainSetup,
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
		return this.singleMainSetup.getWorkerStatus(id);
	}

	@RequireGlobalScope('orchestration:read')
	@Post('/worker/status')
	async getWorkersStatusAll() {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		return this.singleMainSetup.getWorkerStatus();
	}

	@RequireGlobalScope('orchestration:list')
	@Post('/worker/ids')
	async getWorkerIdsAll() {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		return this.singleMainSetup.getWorkerIds();
	}
}
