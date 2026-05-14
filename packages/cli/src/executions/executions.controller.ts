import { EXECUTION_CALLER_METADATA_KEYS } from '@n8n/api-types';
import type { AuthenticatedRequest, User, ExecutionSummaries } from '@n8n/db';
import { Body, Get, GlobalScope, Patch, Post, RestController } from '@n8n/decorators';
import { PROJECT_OWNER_ROLE_SLUG, type Scope } from '@n8n/permissions';
import { Response } from 'express';
import type { INodeParameters } from 'n8n-workflow';

import { ExecuteNodeRequestDto } from './dto/execute-node-request.dto';
import { ExecuteNodeService } from './execute-node.service';
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

/**
 * Metadata keys produced by the n8n Hub (single-node executions originated via
 * MCP / SDK / CLI). These are first-class Hub UX filters — surfaced as session
 * chips, action labels, and caller badges — and must remain filterable on every
 * tier. The advanced-execution-filters license only gates user-defined keys.
 */
const HUB_METADATA_KEYS = new Set<string>(Object.values(EXECUTION_CALLER_METADATA_KEYS));

@RestController('/executions')
export class ExecutionsController {
	constructor(
		private readonly executionService: ExecutionService,
		private readonly enterpriseExecutionService: EnterpriseExecutionsService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly license: License,
		private readonly executeNodeService: ExecuteNodeService,
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
		const { rangeQuery: query } = req;

		query.user = req.user;
		query.sharingOptions = await this.executionService.buildSharingOptions('workflow:read');

		if (!this.license.isAdvancedExecutionFiltersEnabled()) {
			// Keep Hub-related metadata filters (caller.*, actionId, etc.) so the
			// single-node execution UI works on every tier. Drop only user-defined
			// metadata keys, which are the actual gated "advanced filters".
			if (query.metadata) {
				const hubOnly = query.metadata.filter((entry) => HUB_METADATA_KEYS.has(entry.key));
				if (hubOnly.length > 0) {
					query.metadata = hubOnly;
				} else {
					delete query.metadata;
				}
			}
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

	/**
	 * Execute a single node directly, without authoring a full workflow.
	 *
	 * Used by n8n Hub callers (MCP server, SDK, CLI) to validate or run a
	 * single node and stream the result back. Always runs synchronously and
	 * persists as a normal execution (so the run shows up in the executions
	 * list and can be inspected via the UI).
	 */
	@Post('/node')
	@GlobalScope('node:execute')
	async executeNode(req: AuthenticatedRequest, _res: Response, @Body body: ExecuteNodeRequestDto) {
		const result = await this.executeNodeService.execute({
			user: req.user,
			nodeType: body.nodeType,
			nodeVersion: body.nodeVersion,
			parameters: body.parameters as INodeParameters,
			credentialId: body.credentialId,
			dryRun: body.dryRun,
			caller: body.caller,
		});

		// Build an absolute URL so MCP/SDK callers can deep-link straight back
		// into the n8n UI for this run. Dry-runs do not have an execution row,
		// so we deliberately omit the URL there.
		const host = req.get('host');
		const executionUrl =
			result.executionId && host
				? `${req.protocol}://${host}/executions/${result.executionId}`
				: undefined;

		return {
			...result,
			...(executionUrl !== undefined ? { executionUrl } : {}),
		};
	}
}
