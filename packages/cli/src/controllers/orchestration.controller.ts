import { Param, Post, RestController, GlobalScope } from '@n8n/decorators';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';

import { License } from '@/license';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';

@RestController('/orchestration')
export class OrchestrationController {
	constructor(
		private readonly licenseService: License,
		private readonly workerStatusService: WorkerStatusService,
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

	@GlobalScope('workersView:manage')
	@Post('/worker/:workerId/drain')
	async drainWorker(
		_req: AuthenticatedRequest,
		res: Response,
		@Param('workerId') workerId: string,
	) {
		if (!this.licenseService.isWorkerViewLicensed()) return;

		await this.workerStatusService.drainWorker(workerId);

		return res.status(202).send();
	}
}
