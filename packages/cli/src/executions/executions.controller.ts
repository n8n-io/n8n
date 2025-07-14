import type { ExecutionSummaries, User } from '@n8n/db';
import { Get, Patch, Post, RestController } from '@n8n/decorators';
import type { Scope } from '@n8n/permissions';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { License } from '@/license';
import { isPositiveInteger } from '@/utils';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import { ExecutionService, MissingExecutionStopError } from './execution.service';
import { EnterpriseExecutionsService } from './execution.service.ee';
import { ExecutionRequest } from './execution.types';
import { parseRangeQuery } from './parse-range-query.middleware';
import { validateExecutionUpdatePayload } from './validation';

// Security constants for execution ID validation
const EXECUTION_ID_MIN = 1;
const EXECUTION_ID_MAX = 999999999; // Reasonable upper limit to prevent DoS

@RestController('/executions')
export class ExecutionsController {
	constructor(
		private readonly executionService: ExecutionService,
		private readonly enterpriseExecutionService: EnterpriseExecutionsService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly license: License,
	) {}

	/**
	 * Validates execution ID for security purposes
	 * Prevents enumeration attacks and DoS attempts
	 */
	private validateExecutionId(executionId: string): void {
		if (!isPositiveInteger(executionId)) {
			throw new BadRequestError('Execution ID must be a positive integer');
		}

		const id = parseInt(executionId, 10);
		if (id < EXECUTION_ID_MIN || id > EXECUTION_ID_MAX) {
			throw new BadRequestError('Execution ID is out of valid range');
		}
	}

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
		this.validateExecutionId(req.params.id);

		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		return this.license.isSharingEnabled()
			? await this.enterpriseExecutionService.findOne(req, workflowIds)
			: await this.executionService.findOne(req, workflowIds);
	}

	@Post('/:id/stop', { rateLimit: { limit: 10, windowMs: 60000 } })
	async stop(req: ExecutionRequest.Stop) {
		this.validateExecutionId(req.params.id);

		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');

		// Use consistent error message to prevent execution ID enumeration
		if (workflowIds.length === 0) {
			throw new NotFoundError('Execution not found');
		}

		const executionId = req.params.id;

		try {
			const result = await this.executionService.stop(executionId, workflowIds);

			// Log successful stop operation for security audit
			this.logger.info('Execution stop operation completed successfully', {
				userId: req.user.id,
				executionId,
				accessibleWorkflowCount: workflowIds.length,
			});

			return result;
		} catch (error) {
			// Log security-relevant events for monitoring
			if (error instanceof MissingExecutionStopError) {
				this.logger.warn('Attempt to stop non-existent execution', {
					userId: req.user.id,
					executionId,
					accessibleWorkflowCount: workflowIds.length,
				});
			}
			throw error;
		}
	}

	@Post('/:id/retry', { rateLimit: { limit: 10, windowMs: 60000 } })
	async retry(req: ExecutionRequest.Retry) {
		this.validateExecutionId(req.params.id);

		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');

		// Use consistent error message to prevent execution ID enumeration
		if (workflowIds.length === 0) {
			throw new NotFoundError('Execution not found');
		}

		try {
			return await this.executionService.retry(req, workflowIds);
		} catch (error) {
			// Log security-relevant events for monitoring
			if (error instanceof NotFoundError) {
				this.logger.warn('Attempt to retry non-existent execution', {
					userId: req.user.id,
					executionId: req.params.id,
					accessibleWorkflowCount: workflowIds.length,
				});
			}
			throw error;
		}
	}

	@Post('/delete', { rateLimit: { limit: 5, windowMs: 60000 } })
	async delete(req: ExecutionRequest.Delete) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');

		// Use consistent error message to prevent execution ID enumeration
		if (workflowIds.length === 0) {
			throw new NotFoundError('Execution not found');
		}

		try {
			return await this.executionService.delete(req, workflowIds);
		} catch (error) {
			// Log security-relevant events for monitoring
			this.logger.warn('Attempt to delete executions without proper access', {
				userId: req.user.id,
				accessibleWorkflowCount: workflowIds.length,
			});
			throw error;
		}
	}

	@Patch('/:id')
	async update(req: ExecutionRequest.Update) {
		this.validateExecutionId(req.params.id);

		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');

		// Fail fast if no workflows are accessible
		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		const { body: payload } = req;
		const validatedPayload = validateExecutionUpdatePayload(payload);

		await this.executionService.annotate(req.params.id, validatedPayload, workflowIds);

		return await this.executionService.findOne(req, workflowIds);
	}
}
