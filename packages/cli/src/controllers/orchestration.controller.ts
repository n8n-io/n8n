import type { WorkerPoolDefaults, WorkerPoolsResponse } from '@n8n/api-types';
import { UpdateWorkerPoolDefaultsDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Patch, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { License } from '@/license';
import { WorkerPoolDefaultsService } from '@/scaling/worker-pool-defaults.service';
import { WorkerPoolsService } from '@/scaling/worker-pools.service';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';

@RestController('/orchestration')
export class OrchestrationController {
	constructor(
		private readonly licenseService: License,
		private readonly workerStatusService: WorkerStatusService,
		private readonly workerPoolsService: WorkerPoolsService,
		private readonly workerPoolDefaultsService: WorkerPoolDefaultsService,
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

	@Licensed(LICENSE_FEATURES.WORKER_VIEW)
	@GlobalScope('orchestration:read')
	@Get('/worker/pools')
	async getWorkerPools(): Promise<WorkerPoolsResponse> {
		return await this.workerPoolsService.getPoolsState();
	}

	@Licensed(LICENSE_FEATURES.WORKER_VIEW)
	@GlobalScope('orchestration:manage')
	@Patch('/worker/pools/defaults')
	async updateWorkerPoolDefaults(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateWorkerPoolDefaultsDto,
	): Promise<WorkerPoolDefaults> {
		return await this.workerPoolDefaultsService.setDefaults(dto);
	}
}
