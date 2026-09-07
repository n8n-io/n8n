import { DeleteExecutionsDto, ExecutionRedactionQueryDtoSchema } from '@n8n/api-types';
import type { AuthenticatedRequest, User, ExecutionSummaries } from '@n8n/db';
import { Body, Get, Patch, Post, RestController } from '@n8n/decorators';
import type { Scope } from '@n8n/permissions';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NotImplementedError } from '@/errors/response-errors/not-implemented.error';
import { License } from '@/license';
import { isPositiveInteger } from '@/utils';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import { isExecutionIdV2 } from './execution-id';
import { ExecutionService } from './execution.service';
import { EnterpriseExecutionsService } from './execution.service.ee';
import { ExecutionRequest } from './execution.types';
import { parseRangeQuery } from './parse-range-query.middleware';
import { validateExecutionUpdatePayload } from './validation';

@RestController('/executions')
export class ExecutionsController {
	constructor(
		private readonly executionService: ExecutionService,
		private readonly enterpriseExecutionService: EnterpriseExecutionsService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly license: License,
	) {}

	private async getAccessibleWorkflowIds(user: User, scope: Scope) {
		return await this.workflowSharingService.getSharedWorkflowIds(user, { scopes: [scope] });
	}

	@Get('/', { middlewares: [parseRangeQuery] })
	async getMany(req: ExecutionRequest.GetMany) {
		const { rangeQuery: query } = req;

		query.user = req.user;
		query.sharingOptions = await this.executionService.buildSharingOptions('workflow:read');

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

	@Get('/versions/:workflowId')
	async getVersions(req: ExecutionRequest.GetVersions) {
		const accessibleWorkflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');

		if (!accessibleWorkflowIds.includes(req.params.workflowId)) {
			return [];
		}

		return await this.executionService.getExecutedVersions(req.params.workflowId);
	}

	@Get('/:id')
	async getOne(req: ExecutionRequest.GetOne) {
		this.assertKnownExecutionId(req.params.id);

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

	/**
	 * Stops executions based on the provided filter
	 *
	 * @returns { stopped: number } - The amount of actually stopped executions, potentially lower if some executions finished naturally.
	 */
	@Post('/stopMany')
	async stopMany(req: ExecutionRequest.StopMany) {
		const accessibleWorkflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');

		// Return early to avoid expensive db query
		if (accessibleWorkflowIds.length === 0) return { stopped: 0 };

		const stopped = await this.executionService.stopMany(req.body.filter, accessibleWorkflowIds);
		return { stopped };
	}

	@Post('/:id/retry')
	async retry(req: ExecutionRequest.Retry) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		const redactQuery = ExecutionRedactionQueryDtoSchema.safeParse(req.query);

		return await this.executionService.retry({
			executionId: req.params.id,
			options: {
				loadWorkflow: req.body.loadWorkflow,
				redactExecutionData: redactQuery.success ? redactQuery.data.redactExecutionData : undefined,
			},
			sharedWorkflowIds: workflowIds,
			user: req.user,
		});
	}

	@Post('/delete')
	async delete(req: AuthenticatedRequest, _res: Response, @Body payload: DeleteExecutionsDto) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		return await this.executionService.delete(req.user, payload, workflowIds);
	}

	@Patch('/:id')
	async update(req: ExecutionRequest.Update) {
		this.assertKnownExecutionId(req.params.id);

		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');

		// Fail fast if no workflows are accessible
		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		// The data plane stores no annotations.
		if (isExecutionIdV2(req.params.id)) {
			throw new NotImplementedError('Annotating engine 2.0 executions is not supported yet');
		}

		const { body: payload } = req;
		const validatedPayload = validateExecutionUpdatePayload(payload);

		await this.executionService.annotate(req.params.id, validatedPayload, workflowIds);

		return await this.executionService.findOne(req, workflowIds);
	}

	private assertKnownExecutionId(id: string) {
		if (!isPositiveInteger(id) && !isExecutionIdV2(id)) {
			throw new BadRequestError('Execution ID is not valid');
		}
	}
}
