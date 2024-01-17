import { ExecutionRequest } from './execution.request';
import { ExecutionService } from './execution.service';
import { Authorized, Get, Post, RestController } from '@/decorators';
import { EnterpriseExecutionsService } from './execution.service.ee';
import { isSharingEnabled } from '@/UserManagement/UserManagementHelper';
import { WorkflowSharingService } from '@/workflows/workflowSharing.service';
import type { User } from '@/databases/entities/User';

@Authorized()
@RestController('/executions')
export class ExecutionsController {
	constructor(
		private readonly executionService: ExecutionService,
		private readonly enterpriseExecutionService: EnterpriseExecutionsService,
		private readonly workflowSharingService: WorkflowSharingService,
	) {}

	private async getAccessibleWorkflowIds(user: User) {
		return isSharingEnabled()
			? this.workflowSharingService.getSharedWorkflowIds(user)
			: this.workflowSharingService.getSharedWorkflowIds(user, ['owner']);
	}

	@Get('/')
	async getExecutionsList(req: ExecutionRequest.GetAll) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		return this.executionService.getExecutionsList(req, workflowIds);
	}

	@Get('/:id')
	async getExecution(req: ExecutionRequest.Get) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		return isSharingEnabled()
			? this.enterpriseExecutionService.getExecution(req, workflowIds)
			: this.executionService.getExecution(req, workflowIds);
	}

	@Post('/:id/retry')
	async retryExecution(req: ExecutionRequest.Retry) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		return this.executionService.retryExecution(req, workflowIds);
	}

	@Post('/delete')
	async deleteExecutions(req: ExecutionRequest.Delete) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		return this.executionService.deleteExecutions(req, workflowIds);
	}
}
