import type { WorkerPoolsResponse } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, RestController, GlobalScope } from '@n8n/decorators';

import { License } from '@/license';
import { WorkerPoolsService } from '@/scaling/worker-pools.service';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';

@RestController('/orchestration')
export class OrchestrationController {
	constructor(
		private readonly licenseService: License,
		private readonly workerStatusService: WorkerStatusService,
		private readonly workerPoolsService: WorkerPoolsService,
	) {}

	/**
	 * This endpoint does not return anything, it just triggers the message to
	 * the workers to respond on Redis with their status.
	 */
	@GlobalScope('orchestration:read')
	@Post('/worker/status')
	async getWorkersStatusAll(req: AuthenticatedRequest) {
		if (!this.licenseService.isWorkerViewLicensed()) return;

		return await this.workerStatusService.requestWorkerStatus(req.user.id);
	}

	@GlobalScope('orchestration:read')
	@Get('/worker/pools')
	getWorkerPools(): WorkerPoolsResponse {
		return { pools: this.workerPoolsService.getAvailablePools() };
	}
}
