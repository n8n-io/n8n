import { Service } from 'typedi';
import { Authorized, Get, RestController } from '@/decorators';
import { WorkflowRequest } from '@/requests';
import { ActiveWorkflowsService } from '@/services/activeWorkflows.service';

@Service()
@Authorized()
@RestController('/active_workflows')
export class ActiveWorkflowsController {
	constructor(private readonly activeWorkflowsService: ActiveWorkflowsService) {}

	@Get('/')
	async getActiveWorkflows(req: WorkflowRequest.GetAllActive) {
		return this.activeWorkflowsService.getAllActiveIdsForUser(req.user);
	}

	@Get('/error/:id')
	async getActiveError(req: WorkflowRequest.GetActivationError) {
		const {
			user,
			params: { id: workflowId },
		} = req;
		return this.activeWorkflowsService.getActivationError(workflowId, user);
	}
}
