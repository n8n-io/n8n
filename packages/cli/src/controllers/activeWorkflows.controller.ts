import { Get, Req, RestController } from '@/decorators';
import { ActiveWorkflowRequest } from '@/requests';
import { ActiveWorkflowsService } from '@/services/activeWorkflows.service';

@RestController('/active-workflows')
export class ActiveWorkflowsController {
	constructor(private readonly activeWorkflowsService: ActiveWorkflowsService) {}

	@Get('/')
	async getActiveWorkflows(@Req req: ActiveWorkflowRequest.GetAllActive) {
		return await this.activeWorkflowsService.getAllActiveIdsFor(req.user);
	}

	@Get('/error/:id')
	async getActivationError(@Req req: ActiveWorkflowRequest.GetActivationError) {
		const {
			user,
			params: { id: workflowId },
		} = req;
		return await this.activeWorkflowsService.getActivationError(workflowId, user);
	}
}
