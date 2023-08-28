import config from '@/config';
import { Authorized, Get, RestController } from '@/decorators';
import { OrchestrationRequest } from '@/requests';
import { Service } from 'typedi';
import { OrchestrationService } from '../services/orchestration.service';

@Authorized()
@RestController('/orchestration')
@Service()
export class OrchestrationController {
	private config = config;

	constructor(private readonly orchestrationService: OrchestrationService) {}

	@Get('/worker/status/:id')
	async getWorkersStatus(req: OrchestrationRequest.Get) {
		const id = req.params.id;
		return this.orchestrationService.getWorkerStatus(id);
	}

	@Get('/worker/status')
	async getWorkersStatusAll() {
		return this.orchestrationService.getWorkerStatus();
	}

	@Get('/worker/ids')
	async getWorkerIdsAll() {
		return this.orchestrationService.getWorkerIds();
	}
}
