import { Authorized, Get, RestController } from '@/decorators';
import { OrchestrationRequest } from '@/requests';
import { Service } from 'typedi';
import { SingleMainSetup } from '@/services/orchestration/main/SingleMainSetup';

@Authorized(['global', 'owner'])
@RestController('/orchestration')
@Service()
export class OrchestrationController {
	constructor(private readonly singleMainSetup: SingleMainSetup) {}

	/**
	 * These endpoint currently do not return anything, they just trigger the messsage to
	 * the workers to respond on Redis with their status.
	 * TODO: these responses need to be forwarded to and handled by the frontend
	 */
	@Get('/worker/status/:id')
	async getWorkersStatus(req: OrchestrationRequest.Get) {
		const id = req.params.id;
		return this.singleMainSetup.getWorkerStatus(id);
	}

	@Get('/worker/status')
	async getWorkersStatusAll() {
		return this.singleMainSetup.getWorkerStatus();
	}

	@Get('/worker/ids')
	async getWorkerIdsAll() {
		return this.singleMainSetup.getWorkerIds();
	}
}
