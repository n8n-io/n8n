import type { ActiveExecutionsQueryFilter } from './execution.request';
import { ExecutionRequest } from './execution.request';
import { ExecutionService } from './execution.service';
import { Authorized, Get, Post, RestController } from '@/decorators';
import { EnterpriseExecutionsService } from './execution.service.ee';
import { isSharingEnabled } from '@/UserManagement/UserManagementHelper';
import { WorkflowSharingService } from '@/workflows/workflowSharing.service';
import type { User } from '@/databases/entities/User';
import config from '@/config';
import { jsonParse } from 'n8n-workflow';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ActiveExecutionService } from './active-execution.service';

@Authorized()
@RestController('/executions')
export class ExecutionsController {
	private readonly isQueueMode = config.getEnv('executions.mode') === 'queue';

	constructor(
		private readonly executionService: ExecutionService,
		private readonly enterpriseExecutionService: EnterpriseExecutionsService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly activeExecutionService: ActiveExecutionService,
	) {}

	private async getAccessibleWorkflowIds(user: User) {
		return isSharingEnabled()
			? await this.workflowSharingService.getSharedWorkflowIds(user)
			: await this.workflowSharingService.getSharedWorkflowIds(user, ['owner']);
	}

	@Get('/')
	async getExecutionsList(req: ExecutionRequest.GetAll) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		return await this.executionService.getExecutionsList(req, workflowIds);
	}

	@Get('/:id')
	async getExecution(req: ExecutionRequest.Get) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		return isSharingEnabled()
			? await this.enterpriseExecutionService.getExecution(req, workflowIds)
			: await this.executionService.getExecution(req, workflowIds);
	}

	@Post('/:id/retry')
	async retryExecution(req: ExecutionRequest.Retry) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		return await this.executionService.retryExecution(req, workflowIds);
	}

	@Post('/delete')
	async deleteExecutions(req: ExecutionRequest.Delete) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		return await this.executionService.deleteExecutions(req, workflowIds);
	}

	@Get('/current')
	async getCurrentExecutions(req: ExecutionRequest.GetAllCurrent) {
		const { filter: filterString } = req.query;
		const filter = filterString?.length ? jsonParse<ActiveExecutionsQueryFilter>(filterString) : {};
		if (this.isQueueMode) {
			return await this.activeExecutionService.getQueueModeExecutions(req.user, filter);
		} else {
			return await this.activeExecutionService.getRegularModeExecutions(req.user, filter);
		}
	}

	@Post('/current/:id/stop')
	async stopExecution(req: ExecutionRequest.Stop) {
		const { id: executionId } = req.params;

		const execution = await this.activeExecutionService.findExecution(req.user, executionId);
		if (!execution) {
			throw new NotFoundError('Execution not found');
		}

		if (config.getEnv('executions.mode') === 'queue') {
			return await this.activeExecutionService.stopQueueModeExecution(execution);
		} else {
			return await this.activeExecutionService.stopRegularModeExecution(execution);
		}
	}
}
