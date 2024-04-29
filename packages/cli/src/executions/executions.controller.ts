import { ExecutionRequest } from './execution.types';
import { ExecutionService } from './execution.service';
import { Get, Post, RestController } from '@/decorators';
import { EnterpriseExecutionsService } from './execution.service.ee';
import { License } from '@/License';
import { WorkflowSharingService } from '@/workflows/workflowSharing.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { parseRangeQuery } from './parse-range-query.middleware';
import type { User } from '@/databases/entities/User';

@RestController('/executions')
export class ExecutionsController {
	constructor(
		private readonly executionService: ExecutionService,
		private readonly enterpriseExecutionService: EnterpriseExecutionsService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly license: License,
	) {}

	private async getAccessibleWorkflowIds(user: User) {
		return this.license.isSharingEnabled()
			? await this.workflowSharingService.getSharedWorkflowIds(user)
			: await this.workflowSharingService.getSharedWorkflowIds(user, ['workflow:owner']);
	}

	@Get('/', { middlewares: [parseRangeQuery] })
	async getMany(req: ExecutionRequest.GetMany) {
		const accessibleWorkflowIds = await this.getAccessibleWorkflowIds(req.user);

		if (accessibleWorkflowIds.length === 0) {
			return { count: 0, estimated: false, results: [] };
		}

		const { rangeQuery: query } = req;

		if (query.workflowId && !accessibleWorkflowIds.includes(query.workflowId)) {
			return { count: 0, estimated: false, results: [] };
		}

		query.accessibleWorkflowIds = accessibleWorkflowIds;

		if (!this.license.isAdvancedExecutionFiltersEnabled()) delete query.metadata;

		const noStatus = !query.status || query.status.length === 0;
		const noRange = !query.range.lastId || !query.range.firstId;

		if (noStatus && noRange) {
			return await this.executionService.findAllRunningAndLatest(query);
		}

		return await this.executionService.findRangeWithCount(query);
	}

	@Get('/:id')
	async getOne(req: ExecutionRequest.GetOne) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		return this.license.isSharingEnabled()
			? await this.enterpriseExecutionService.findOne(req, workflowIds)
			: await this.executionService.findOne(req, workflowIds);
	}

	@Post('/:id/stop')
	async stop(req: ExecutionRequest.Stop) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		return await this.executionService.stop(req.params.id);
	}

	@Post('/:id/retry')
	async retry(req: ExecutionRequest.Retry) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		return await this.executionService.retry(req, workflowIds);
	}

	@Post('/delete')
	async delete(req: ExecutionRequest.Delete) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		return await this.executionService.delete(req, workflowIds);
	}
}
