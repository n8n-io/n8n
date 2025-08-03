import { Logger } from '@n8n/backend-common';
import type { User, ExecutionSummaries } from '@n8n/db';
import { Get, Patch, Post, RestController } from '@n8n/decorators';
import type { Scope } from '@n8n/permissions';

import { ActiveExecutions } from '@/active-executions';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { isPositiveInteger } from '@/utils';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import { ExecutionService } from './execution.service';
import { EnterpriseExecutionsService } from './execution.service.ee';
import { ExecutionRequest } from './execution.types';
import { validateExecutionUpdatePayload } from './validation';

@RestController('/executions')
export class ExecutionsController {
	constructor(
		private readonly logger: Logger,
		private readonly executionService: ExecutionService,
		private readonly enterpriseExecutionService: EnterpriseExecutionsService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly license: License,
		private readonly activeExecutions: ActiveExecutions,
		private readonly eventService: EventService,
	) {}

	private async getAccessibleWorkflowIds(user: User, scope: Scope) {
		if (this.license.isSharingEnabled()) {
			return await this.workflowSharingService.getSharedWorkflowIds(user, { scopes: [scope] });
		} else {
			return await this.workflowSharingService.getSharedWorkflowIds(user, {
				workflowRoles: ['workflow:owner'],
				projectRoles: ['project:personalOwner'],
			});
		}
	}

	@Get('/')
	async getMany(req: any) {
		const typedReq = req as ExecutionRequest.GetMany;
		const accessibleWorkflowIds = await this.getAccessibleWorkflowIds(
			typedReq.user,
			'workflow:read',
		);

		if (accessibleWorkflowIds.length === 0) {
			return { count: 0, estimated: false, results: [] };
		}

		const { rangeQuery: query } = typedReq;

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
			const executions = await this.executionService.findLatestCurrentAndCompleted(query);
			await this.executionService.addScopes(
				req.user,
				executions.results as ExecutionSummaries.ExecutionSummaryWithScopes[],
			);
			return executions;
		}

		const executions = await this.executionService.findRangeWithCount(query);
		await this.executionService.addScopes(
			req.user,
			executions.results as ExecutionSummaries.ExecutionSummaryWithScopes[],
		);
		return executions;
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

	// Advanced Execution Control Endpoints

	@Post('/:id/cancel')
	async cancel(req: ExecutionRequest.Cancel) {
		if (!isPositiveInteger(req.params.id)) {
			throw new BadRequestError('Execution ID is not a number');
		}

		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		this.logger.debug('Advanced execution cancellation requested', {
			executionId: req.params.id,
			userId: req.user.id,
			force: req.body.force,
		});

		const result = await this.executionService.cancel(req.params.id, workflowIds, req.body);

		this.eventService.emit('workflow-deleted', {
			user: req.user,
			workflowId: req.params.id,
			publicApi: false,
		});

		return result;
	}

	@Post('/:id/retry-advanced')
	async retryAdvanced(req: ExecutionRequest.RetryAdvanced) {
		if (!isPositiveInteger(req.params.id)) {
			throw new BadRequestError('Execution ID is not a number');
		}

		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		this.logger.debug('Advanced execution retry requested', {
			executionId: req.params.id,
			userId: req.user.id,
			fromNodeName: req.body.fromNodeName,
			modifiedParameters: Object.keys(req.body.modifiedParameters ?? {}).length,
		});

		const result = await this.executionService.retryAdvanced(req.params.id, workflowIds, req.body);

		this.eventService.emit('workflow-created', {
			user: req.user,
			workflow: {
				id: req.params.id,
				name: 'Retry execution',
				active: false,
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				versionId: '',
				nodes: [],
				connections: {},
			},
			publicApi: false,
			projectId: '',
			projectType: 'Personal',
		});

		return result;
	}

	@Get('/:id/full-context')
	async getFullContext(req: ExecutionRequest.GetFullContext) {
		if (!isPositiveInteger(req.params.id)) {
			throw new BadRequestError('Execution ID is not a number');
		}

		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');
		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		this.logger.debug('Full execution context requested', {
			executionId: req.params.id,
			userId: req.user.id,
			includePerformanceMetrics: req.query.includePerformanceMetrics,
		});

		return await this.executionService.getFullContext(req.params.id, workflowIds, req.query);
	}

	@Get('/:id/progress')
	async getProgress(req: ExecutionRequest.GetProgress) {
		if (!isPositiveInteger(req.params.id)) {
			throw new BadRequestError('Execution ID is not a number');
		}

		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');
		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		const executionId = req.params.id;

		// Check if execution is currently active
		if (!this.activeExecutions.has(executionId)) {
			// Return completed execution status
			const execution = await this.executionService.findOne(req, workflowIds);
			if (!execution) {
				throw new NotFoundError('Execution not found');
			}
			return {
				executionId,
				status: execution.status,
				finished: execution.finished,
				progress: {
					percent: execution.finished ? 100 : 0,
					completedNodes: execution.finished ? execution.workflowData?.nodes?.length || 0 : 0,
					totalNodes: execution.workflowData?.nodes?.length || 0,
				},
				startedAt: execution.startedAt,
				stoppedAt: execution.stoppedAt,
			};
		}

		return await this.executionService.getExecutionProgress(executionId, workflowIds);
	}

	@Post('/bulk-cancel')
	async bulkCancel(req: ExecutionRequest.BulkCancel) {
		if (!req.body.executionIds || req.body.executionIds.length === 0) {
			throw new BadRequestError('At least one execution ID is required');
		}

		if (req.body.executionIds.length > 50) {
			throw new BadRequestError('Maximum 50 executions can be cancelled at once');
		}

		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0) throw new NotFoundError('No accessible workflows found');

		this.logger.debug('Bulk execution cancellation requested', {
			executionCount: req.body.executionIds.length,
			userId: req.user.id,
			force: req.body.force,
		});

		const result = await this.executionService.bulkCancel(
			req.body.executionIds,
			workflowIds,
			req.body,
		);

		this.eventService.emit('workflow-deleted', {
			user: req.user,
			workflowId: req.body.executionIds[0] || '',
			publicApi: false,
		});

		return result;
	}
}
