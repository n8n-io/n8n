import { Post, RestController, GlobalScope } from '@n8n/decorators';

import { WorkerStatusService } from '@/scaling/worker-status.service.ee';

@RestController('/orchestration')
export class OrchestrationController {
	constructor(private readonly workerStatusService: WorkerStatusService) {}

	/**
	 * This endpoint does not return anything, it just triggers the message to
	 * the workers to respond on Redis with their status.
	 */
	@GlobalScope('orchestration:read')
	@Post('/worker/status')
	async getWorkersStatusAll() {
		return await this.workerStatusService.requestWorkerStatus();
	}
}
