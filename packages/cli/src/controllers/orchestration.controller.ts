import { Post, RestController, GlobalScope } from '@/decorators';
import { License } from '@/license';
import { Publisher } from '@/scaling/pubsub/publisher.service';

@RestController('/orchestration')
export class OrchestrationController {
	constructor(
		private readonly licenseService: License,
		private readonly publisher: Publisher,
	) {}

	/**
	 * This endpoint does not return anything, it just triggers the message to
	 * the workers to respond on Redis with their status.
	 */
	@GlobalScope('orchestration:read')
	@Post('/worker/status')
	async getWorkersStatusAll() {
		if (!this.licenseService.isWorkerViewLicensed()) return;

		return await this.publisher.publishCommand({ command: 'get-worker-status' });
	}
}
