import { Authorized, Post, RestController } from '@/decorators';
import { OrchestrationRequest } from '@/requests';
import { Service } from 'typedi';
import { SingleMainInstancePublisher } from '@/services/orchestration/main/SingleMainInstance.publisher';

@Authorized(['global', 'owner'])
@RestController('/orchestration')
@Service()
export class OrchestrationController {
	constructor(private readonly orchestrationService: SingleMainInstancePublisher) {}

	/**
	 * These endpoint currently do not return anything, they just trigger the messsage to
	 * the workers to respond on Redis with their status.
	 * TODO: these responses need to be forwarded to and handled by the frontend
	 */
	@Post('/worker/status/:id')
	async getWorkersStatus(req: OrchestrationRequest.Get) {
		const id = req.params.id;
		return this.orchestrationService.getWorkerStatus(id);
	}

	@Post('/worker/status')
	async getWorkersStatusAll() {
		return this.orchestrationService.getWorkerStatus();
	}

	@Post('/worker/ids')
	async getWorkerIdsAll() {
		return this.orchestrationService.getWorkerIds();
	}
}
