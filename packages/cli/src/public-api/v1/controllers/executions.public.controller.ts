import {
	DeletedExecutionPublicDto,
	ExecutionListPublicDto,
	ExecutionPublicDto,
	ExecutionTagsPublicDto,
	GetExecutionQueryDto,
	ListExecutionsQueryDto,
	MAX_ITEMS_PER_PAGE,
	TagIdsPublicDto,
} from '@n8n/api-types';
import { ExecutionsConfig } from '@n8n/config';
import type { AuthenticatedRequest, IExecutionBase, IExecutionResponse } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	Param,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';
import { replaceCircularReferences } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { isRedactableExecution } from '@/executions/execution-redaction';
import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import { ExecutionService } from '@/executions/execution.service';
import { decodeCursor, encodeNextCursor } from '@/public-api/v1/shared/services/pagination.service';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

type PublicExecution = IExecutionBase & Partial<IExecutionResponse>;

/**
 * The legacy spec typed this parameter as `number`, so the request validator rejected a non-numeric
 * id with a 400. The generated spec declares a string, so without this the value reaches the query
 * and fails against the integer column.
 */
function assertNumericExecutionId(executionId: string): void {
	if (!/^\d+$/.test(executionId) || Number(executionId) < 1) {
		throw new BadRequestError('The execution ID must be a positive integer');
	}
}

function isCursorObject(
	value: unknown,
): value is { lastId?: unknown; offset?: unknown; limit?: unknown } {
	return typeof value === 'object' && value !== null;
}

function resolveCursorPaging(
	cursor: string | undefined,
	queryLimit: number,
): { lastId?: string; limit: number } {
	if (!cursor) return { limit: queryLimit };

	let decoded: unknown;
	try {
		decoded = decodeCursor(cursor);
	} catch {
		throw new BadRequestError('An invalid cursor was provided');
	}

	if (!isCursorObject(decoded)) throw new BadRequestError('An invalid cursor was provided');

	const lastId =
		typeof decoded.lastId === 'string' || typeof decoded.lastId === 'number'
			? String(decoded.lastId)
			: undefined;

	const limit =
		typeof decoded.limit === 'number' && Number.isInteger(decoded.limit)
			? // TypeORM omits the SQL LIMIT clause for `take: 0`, so the floor cannot be 0.
				Math.min(Math.max(decoded.limit, 1), MAX_ITEMS_PER_PAGE)
			: queryLimit;

	return { lastId, limit };
}

@PublicApiController('/executions')
export class ExecutionsPublicController {
	constructor(
		private readonly executionService: ExecutionService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly executionRedactionServiceProxy: ExecutionRedactionServiceProxy,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly eventService: EventService,
	) {}

	@Get('/')
	@ApiKeyScope('execution:list')
	@ApiSummary('Retrieve all executions')
	@ApiDescription('Retrieve all executions from your instance.')
	@ApiTags(['Execution'])
	@ApiResponse(200, ExecutionListPublicDto)
	@ApiErrorResponse(404)
	async getExecutions(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListExecutionsQueryDto,
	): Promise<ExecutionListPublicDto> {
		const { lastId, limit } = resolveCursorPaging(query.cursor, query.limit);

		const sharedWorkflowsIds = await this.workflowSharingService.getSharedWorkflowIdsForScopes(
			req.user,
			['workflow:read'],
			query.projectId,
		);

		if (
			!sharedWorkflowsIds.length ||
			(query.workflowId && !sharedWorkflowsIds.includes(query.workflowId))
		) {
			return { data: [], nextCursor: null };
		}

		const { executions, count } = await this.executionService.findManyAndCount(
			query.workflowId ? [query.workflowId] : sharedWorkflowsIds,
			{
				status: query.status,
				limit,
				lastId,
				includeData: query.includeData,
				startedAfter: query.startedAfter,
				startedBefore: query.startedBefore,
				// for backward compatibility `running` executions are always excluded
				// unless the user explicitly filters by `running` status
				excludeRunning: query.status !== 'running',
				maxDataSizeBytes: query.ignoreDataSizeLimit ? 0 : this.executionsConfig.maxDisplaySize,
			},
		);

		const newLastId = executions.length === 0 ? '0' : executions.at(-1)!.id;

		if (query.includeData) {
			const redactableExecutions = executions.filter(isRedactableExecution);
			await this.executionRedactionServiceProxy.processExecutions(redactableExecutions, {
				user: req.user,
				redactExecutionData: query.redactExecutionData,
				ipAddress: req.ip ?? '',
				userAgent: req.headers['user-agent'] ?? '',
			});
		}

		this.eventService.emit('user-retrieved-all-executions', {
			userId: req.user.id,
			publicApi: true,
		});

		return toExecutionListPublicDto(
			executions,
			encodeNextCursor({ lastId: newLastId, limit, numberOfNextRecords: count }),
		);
	}

	@Get('/:executionId')
	@ApiKeyScope('execution:read')
	@ApiSummary('Retrieve an execution')
	@ApiDescription('Retrieve an execution from your instance.')
	@ApiTags(['Execution'])
	@ApiResponse(200, ExecutionPublicDto)
	@ApiErrorResponse(404)
	async getExecution(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('executionId') executionId: string,
		@Query query: GetExecutionQueryDto,
	): Promise<ExecutionPublicDto> {
		assertNumericExecutionId(executionId);

		const sharedWorkflowsIds = await this.workflowSharingService.getSharedWorkflowIdsForScopes(
			req.user,
			['workflow:read'],
		);

		if (!sharedWorkflowsIds.length) {
			throw new NotFoundError('Not Found');
		}

		const maxDataSizeBytes = query.ignoreDataSizeLimit ? 0 : this.executionsConfig.maxDisplaySize;

		const execution = await this.executionService.findOneInWorkflows(
			executionId,
			sharedWorkflowsIds,
			{
				includeData: query.includeData,
				includeAnnotation: false,
				maxDataSizeBytes,
			},
		);

		if (!execution) {
			throw new NotFoundError('Not Found');
		}

		if (query.includeData && isRedactableExecution(execution)) {
			await this.executionRedactionServiceProxy.processExecution(execution, {
				user: req.user,
				redactExecutionData: query.redactExecutionData,
				ipAddress: req.ip ?? '',
				userAgent: req.headers['user-agent'] ?? '',
			});
		}

		this.eventService.emit('user-retrieved-execution', {
			userId: req.user.id,
			publicApi: true,
		});

		return toExecutionPublicDto(execution);
	}

	@Delete('/:executionId')
	@ApiKeyScope('execution:delete')
	@ApiSummary('Delete an execution')
	@ApiDescription('Deletes an execution from your instance.')
	@ApiTags(['Execution'])
	@ApiResponse(200, DeletedExecutionPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	async deleteExecution(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('executionId') executionId: string,
	): Promise<DeletedExecutionPublicDto> {
		assertNumericExecutionId(executionId);

		const sharedWorkflowsIds = await this.workflowSharingService.getSharedWorkflowIdsForScopes(
			req.user,
			['workflow:delete'],
		);

		if (!sharedWorkflowsIds.length) {
			throw new NotFoundError('Not Found');
		}

		const execution = await this.executionService.deleteOne(executionId, sharedWorkflowsIds);

		return toDeletedExecutionPublicDto(execution, executionId);
	}

	@Get('/:executionId/tags')
	@ApiKeyScope('executionTags:list')
	@ApiSummary('Get execution tags')
	@ApiDescription('Get annotation tags for an execution.')
	@ApiTags(['Execution'])
	@ApiResponse(200, ExecutionTagsPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	async getExecutionTags(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('executionId') executionId: string,
	): Promise<ExecutionTagsPublicDto> {
		assertNumericExecutionId(executionId);

		const sharedWorkflowsIds = await this.workflowSharingService.getSharedWorkflowIdsForScopes(
			req.user,
			['workflow:read'],
		);

		if (!sharedWorkflowsIds.length) {
			throw new NotFoundError('Not Found');
		}

		const tags = await this.executionService.getExecutionTags(executionId, sharedWorkflowsIds);

		return tags.map(toPublicTag);
	}

	@Put('/:executionId/tags')
	@ApiKeyScope('executionTags:update')
	@ApiSummary('Update tags of an execution')
	@ApiDescription('Update annotation tags of an execution.')
	@ApiTags(['Execution'])
	@ApiResponse(200, ExecutionTagsPublicDto)
	@ApiErrorResponse(404)
	async updateExecutionTags(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('executionId') executionId: string,
		@Body body: TagIdsPublicDto,
	): Promise<ExecutionTagsPublicDto> {
		assertNumericExecutionId(executionId);

		const sharedWorkflowsIds = await this.workflowSharingService.getSharedWorkflowIdsForScopes(
			req.user,
			['workflow:update'],
		);

		if (!sharedWorkflowsIds.length) {
			throw new NotFoundError('Not Found');
		}

		const tags = await this.executionService.updateExecutionTags(
			executionId,
			body.map((tag) => tag.id),
			sharedWorkflowsIds,
		);

		return tags.map(toPublicTag);
	}
}

function toBaseFields(execution: PublicExecution) {
	return {
		finished: execution.finished,
		mode: execution.mode,
		retryOf: execution.retryOf ?? null,
		retrySuccessId: execution.retrySuccessId ?? null,
		status: execution.status,
		createdAt: execution.createdAt.toISOString(),
		startedAt: execution.startedAt ? execution.startedAt.toISOString() : null,
		stoppedAt: execution.stoppedAt ? execution.stoppedAt.toISOString() : null,
		deletedAt: execution.deletedAt ? execution.deletedAt.toISOString() : null,
		workflowId: execution.workflowId,
		waitTill: execution.waitTill ? execution.waitTill.toISOString() : null,
		storedAt: execution.storedAt,
		tracingContext: execution.tracingContext ?? null,
		deduplicationKey: execution.deduplicationKey ?? null,
		jsonSizeBytes: execution.jsonSizeBytes ?? 0,
		binaryDataSizeBytes: execution.binaryDataSizeBytes ?? 0,
		workflowVersionId: execution.workflowVersionId ?? null,
		usedPrivateCredentials: execution.usedPrivateCredentials ?? false,
	};
}

function toExecutionListItem(execution: PublicExecution) {
	return {
		id: execution.id,
		finished: execution.finished,
		mode: execution.mode,
		retryOf: execution.retryOf ?? null,
		retrySuccessId: execution.retrySuccessId ?? null,
		status: execution.status,
		startedAt: execution.startedAt ? execution.startedAt.toISOString() : null,
		stoppedAt: execution.stoppedAt ? execution.stoppedAt.toISOString() : null,
		workflowId: execution.workflowId,
		waitTill: execution.waitTill ? execution.waitTill.toISOString() : null,
		...('storedAt' in execution && { storedAt: execution.storedAt }),
		...('jsonSizeBytes' in execution && { jsonSizeBytes: execution.jsonSizeBytes }),
		...('workflowVersionId' in execution && { workflowVersionId: execution.workflowVersionId }),
		...('data' in execution && { data: execution.data }),
		...('workflowData' in execution && { workflowData: execution.workflowData }),
		...('customData' in execution && { customData: execution.customData }),
		...('dataTooLargeToDisplay' in execution && {
			dataTooLargeToDisplay: execution.dataTooLargeToDisplay,
		}),
	};
}

function toExecutionListPublicDto(
	executions: PublicExecution[],
	nextCursor: string | null,
): ExecutionListPublicDto {
	return replaceCircularReferences({
		data: executions.map(toExecutionListItem),
		nextCursor,
	}) as unknown as ExecutionListPublicDto;
}

function toExecutionPublicDto(execution: PublicExecution): ExecutionPublicDto {
	/**
	 * Run data is stored with `flatted`, whose `parse` rebuilds circular references, so `data` and
	 * `workflowData` can carry cycles that `res.json` would throw on.
	 */
	return replaceCircularReferences({
		id: execution.id,
		...toBaseFields(execution),
		// Absent unless `includeData` is set. An undefined value is dropped by `res.json`, so the
		// key stays out of the response.
		data: execution.data,
		customData: execution.customData,
		workflowData: execution.workflowData,
		dataTooLargeToDisplay: execution.dataTooLargeToDisplay,
	}) as unknown as ExecutionPublicDto;
}

function toDeletedExecutionPublicDto(
	execution: PublicExecution,
	executionId: string,
): DeletedExecutionPublicDto {
	return {
		id: Number(executionId),
		...toBaseFields(execution),
	};
}

function toPublicTag(tag: { id: string; name: string; createdAt: Date; updatedAt: Date }) {
	return {
		id: tag.id,
		name: tag.name,
		createdAt: tag.createdAt.toISOString(),
		updatedAt: tag.updatedAt.toISOString(),
	};
}
