import { ExecutionRequest } from './execution.request';
import { ExecutionService } from './execution.service';
import { Authorized, Get, Post, RestController } from '@/decorators';
import { EnterpriseExecutionsService } from './execution.service.ee';
import { isSharingEnabled } from '@/UserManagement/UserManagementHelper';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';

@Authorized()
@RestController('/executions')
export class ExecutionsController {
	constructor(
		private readonly executionService: ExecutionService,
		private readonly enterpriseExecutionService: EnterpriseExecutionsService,
	) {}

	@Get('/')
	async getExecutionsList(req: ExecutionRequest.GetAll) {
		const sharedWorkflowIds = isSharingEnabled()
			? await getSharedWorkflowIds(req.user)
			: await getSharedWorkflowIds(req.user, ['owner']);

		return this.executionService.getExecutionsList(req, sharedWorkflowIds);
	}

	@Get('/:id')
	async getExecution(req: ExecutionRequest.Get) {
		const sharedWorkflowIds = isSharingEnabled()
			? await getSharedWorkflowIds(req.user)
			: await getSharedWorkflowIds(req.user, ['owner']);

		return isSharingEnabled()
			? this.enterpriseExecutionService.getExecution(req, sharedWorkflowIds)
			: this.executionService.getExecution(req, sharedWorkflowIds);
	}

	@Post('/:id/retry')
	async retryExecution(req: ExecutionRequest.Retry) {
		const sharedWorkflowIds = isSharingEnabled()
			? await getSharedWorkflowIds(req.user)
			: await getSharedWorkflowIds(req.user, ['owner']);

		return this.executionService.retryExecution(req, sharedWorkflowIds);
	}

	@Post('/delete')
	async deleteExecutions(req: ExecutionRequest.Delete) {
		const sharedWorkflowIds = isSharingEnabled()
			? await getSharedWorkflowIds(req.user)
			: await getSharedWorkflowIds(req.user, ['owner']);

		return this.executionService.deleteExecutions(req, sharedWorkflowIds);
	}
}
