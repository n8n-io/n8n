import type { User, ExecutionSummaries } from '@n8n/db';
import { Get, Patch, Post, RestController } from '@n8n/decorators';
import { PROJECT_OWNER_ROLE_SLUG, type Scope } from '@n8n/permissions';

import { ExecutionService } from './execution.service';
import { EnterpriseExecutionsService } from './execution.service.ee';
import { ExecutionRequest } from './execution.types';
import { parseRangeQuery } from './parse-range-query.middleware';
import { validateExecutionUpdatePayload } from './validation';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { License } from '@/license';
import { isPositiveInteger } from '@/utils';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

@RestController('/executions')
export class ExecutionsController {
	constructor(
		private readonly executionService: ExecutionService,
		private readonly enterpriseExecutionService: EnterpriseExecutionsService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly license: License,
	) {}

	private async getAccessibleWorkflowIds(user: User, scope: Scope) {
		if (this.license.isSharingEnabled()) {
			return await this.workflowSharingService.getSharedWorkflowIds(user, { scopes: [scope] });
		} else {
			return await this.workflowSharingService.getSharedWorkflowIds(user, {
				workflowRoles: ['workflow:owner'],
				projectRoles: [PROJECT_OWNER_ROLE_SLUG],
			});
		}
	}

	@Get('/', { middlewares: [parseRangeQuery] })
	async getMany(req: ExecutionRequest.GetMany) {
		const accessibleWorkflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');

		if (accessibleWorkflowIds.length === 0) {
			return { count: 0, estimated: false, results: [] };
		}

		const { rangeQuery: query } = req;

		if (query.workflowId && !accessibleWorkflowIds.includes(query.workflowId)) {
			return { count: 0, estimated: false, results: [] };
		}

		query.accessibleWorkflowIds = accessibleWorkflowIds;

		if (!this.license.isAdvancedExecutionFiltersEnabled()) {
			delete query.metadata;
			delete query.annotationTags;
		}

		const noStatus = !query.status || query.status.length === 0;
		const noRange = !query.range.lastId || !query.range.firstId;

		if (noStatus && noRange) {
			const [executions, concurrentExecutionsCount] = await Promise.all([
				this.executionService.findLatestCurrentAndCompleted(query),
				this.executionService.getConcurrentExecutionsCount(),
			]);
			await this.executionService.addScopes(
				req.user,
				executions.results as ExecutionSummaries.ExecutionSummaryWithScopes[],
			);
			return {
				...executions,
				concurrentExecutionsCount,
			};
		}

		const [executions, concurrentExecutionsCount] = await Promise.all([
			this.executionService.findRangeWithCount(query),
			this.executionService.getConcurrentExecutionsCount(),
		]);
		await this.executionService.addScopes(
			req.user,
			executions.results as ExecutionSummaries.ExecutionSummaryWithScopes[],
		);
		return {
			...executions,
			concurrentExecutionsCount,
		};
	}

	@Get('/:id')
	async getOne(req: ExecutionRequest.GetOne) {
		if (!isPositiveInteger(req.params.id)) {
			throw new BadRequestError('Execution ID is not a number');
		}

		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		return this.license.isSharingEnabled()
			? await this.enterpriseExecutionService.findOne(req, workflowIds)
			: await this.executionService.findOne(req, workflowIds);
	}

	@Post('/:id/stop')
	async stop(req: ExecutionRequest.Stop) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		const executionId = req.params.id;

		return await this.executionService.stop(executionId, workflowIds);
	}

	@Post('/:id/retry')
	async retry(req: ExecutionRequest.Retry) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		return await this.executionService.retry(req, workflowIds);
	}

	@Post('/delete')
	async delete(req: ExecutionRequest.Delete) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		return await this.executionService.delete(req, workflowIds);
	}

	@Patch('/:id')
	async update(req: ExecutionRequest.Update) {
		if (!isPositiveInteger(req.params.id)) {
			throw new BadRequestError('Execution ID is not a number');
		}

		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');

		// Fail fast if no workflows are accessible
		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		const { body: payload } = req;
		const validatedPayload = validateExecutionUpdatePayload(payload);

		await this.executionService.annotate(req.params.id, validatedPayload, workflowIds);

		return await this.executionService.findOne(req, workflowIds);
	}
}
