import {
	DeletedExecutionPublicDto,
	ExecutionListPublicDto,
	ExecutionPublicDto,
	GetExecutionQueryDto,
	ListExecutionsQueryDto,
	MAX_ITEMS_PER_PAGE,
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
	Delete,
	Get,
	Param,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';
import { replaceCircularReferences } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import type { RedactableExecution } from '@/executions/execution-redaction';
import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import { ExecutionService } from '@/executions/execution.service';
import { decodeCursor, encodeNextCursor } from '@/public-api/v1/shared/services/pagination.service';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

/** `deletedAt` is on the entity but missing from `IExecutionBase`, and the response carries it. */
type PublicExecution = IExecutionBase & Partial<IExecutionResponse> & { deletedAt?: Date | null };

function isCursorObject(
	value: unknown,
): value is { lastId?: unknown; offset?: unknown; limit?: unknown } {
	return typeof value === 'object' && value !== null;
}

/**
 * The accept/reject boundary deliberately matches the legacy handler, so tightening it would
 * break calls that work today. Bounding the limit is the one intended departure.
 */
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

function isRedactableExecution(
	execution: IExecutionBase,
): execution is IExecutionBase & RedactableExecution {
	return 'data' in execution && 'workflowData' in execution;
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

		return replaceCircularReferences({
			data: executions.map((execution) => this.toExecutionListItem(execution)),
			nextCursor: encodeNextCursor({ lastId: newLastId, limit, numberOfNextRecords: count }),
		}) as unknown as ExecutionListPublicDto;
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

		return this.toExecutionPublicDto(execution);
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
		const sharedWorkflowsIds = await this.workflowSharingService.getSharedWorkflowIdsForScopes(
			req.user,
			['workflow:delete'],
		);

		if (!sharedWorkflowsIds.length) {
			throw new NotFoundError('Not Found');
		}

		const execution = await this.executionService.deleteOne(executionId, sharedWorkflowsIds);

		return this.toDeletedExecutionPublicDto(execution, executionId);
	}

	private toExecutionListItem(execution: PublicExecution) {
		return {
			id: execution.id,
			finished: execution.finished,
			mode: execution.mode,
			retryOf: execution.retryOf ?? null,
			retrySuccessId: execution.retrySuccessId ?? null,
			status: execution.status,
			startedAt: execution.startedAt ?? null,
			stoppedAt: execution.stoppedAt ?? null,
			workflowId: execution.workflowId,
			waitTill: execution.waitTill ?? null,
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

	private toBaseFields(execution: PublicExecution) {
		return {
			finished: execution.finished,
			mode: execution.mode,
			retryOf: execution.retryOf ?? null,
			retrySuccessId: execution.retrySuccessId ?? null,
			status: execution.status,
			createdAt: execution.createdAt,
			startedAt: execution.startedAt ?? null,
			stoppedAt: execution.stoppedAt ?? null,
			deletedAt: execution.deletedAt ?? null,
			workflowId: execution.workflowId,
			waitTill: execution.waitTill ?? null,
			storedAt: execution.storedAt,
			tracingContext: execution.tracingContext ?? null,
			deduplicationKey: execution.deduplicationKey ?? null,
			jsonSizeBytes: execution.jsonSizeBytes ?? 0,
			binaryDataSizeBytes: execution.binaryDataSizeBytes ?? 0,
			workflowVersionId: execution.workflowVersionId ?? null,
			usedPrivateCredentials: execution.usedPrivateCredentials ?? false,
		};
	}

	private toExecutionPublicDto(execution: PublicExecution): ExecutionPublicDto {
		return this.serialize({
			id: execution.id,
			...this.toBaseFields(execution),
			data: execution.data,
			customData: execution.customData,
			workflowData: execution.workflowData,
			dataTooLargeToDisplay: execution.dataTooLargeToDisplay,
		});
	}

	private toDeletedExecutionPublicDto(
		execution: PublicExecution,
		executionId: string,
	): DeletedExecutionPublicDto {
		return this.serialize({
			id: Number(executionId),
			...this.toBaseFields(execution),
		});
	}

	/** Dates become the ISO strings the DTO declares, which the type system cannot see. */
	private serialize<T>(response: object): T {
		return replaceCircularReferences(response) as unknown as T;
	}
}
