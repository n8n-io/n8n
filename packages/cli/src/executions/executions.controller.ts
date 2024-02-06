import { ExecutionRequest } from './execution.types';
import { ExecutionService } from './execution.service';
import { Authorized, Get, Post, RequireGlobalScope, RestController } from '@/decorators';
import { EnterpriseExecutionsService } from './execution.service.ee';
import { License } from '@/License';
import { WorkflowSharingService } from '@/workflows/workflowSharing.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { parseRangeQuery } from './parse-range-query.middleware';
import type { User } from '@/databases/entities/User';
import type { ExecutionSummaries } from './execution.types';
import type { ExecutionStatus } from 'n8n-workflow';

@Authorized()
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
	@RequireGlobalScope('workflow:list')
	async getMany(req: ExecutionRequest.GetMany) {
		const accessibleWorkflowIds = await this.getAccessibleWorkflowIds(req.user);

		if (accessibleWorkflowIds.length === 0) {
			return { count: 0, estimated: false, results: [] };
		}

		const { rangeQuery: query } = req;

		if (query.workflowId && !accessibleWorkflowIds.includes(query.workflowId)) {
			return { count: 0, estimated: false, results: [] };
		}

		const noStatus = !query.status || query.status.length === 0;
		const noRange = !query.range.lastId || !query.range.firstId;

		query.accessibleWorkflowIds = accessibleWorkflowIds;

		if (!this.license.isAdvancedExecutionFiltersEnabled()) delete query.metadata;

		if (noStatus || noRange) return await this.allActiveAndLatestTwentyFinished(query);

		return await this.executionService.findRangeWithCount(query);
	}

	private async allActiveAndLatestTwentyFinished(query: ExecutionSummaries.RangeQuery) {
		const active: ExecutionStatus[] = ['new', 'running', 'waiting'];
		const finished: ExecutionStatus[] = ['success', 'error', 'failed'];

		const [activeResult, finishedResult] = await Promise.all([
			this.executionService.findRangeWithCount({ ...query, status: active }),
			this.executionService.findRangeWithCount({
				...query,
				status: finished,
				range: { limit: 20 },
				stoppedAt: 'DESC',
			}),
		]);

		return {
			results: activeResult.results.concat(finishedResult.results),
			count: activeResult.count + finishedResult.count,
			estimated: activeResult.estimated && finishedResult.estimated,
		};
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
