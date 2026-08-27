import {
	DeletedExecutionPublicDto,
	ExecutionPublicDto,
	GetExecutionQueryDto,
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

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import type { RedactableExecution } from '@/executions/execution-redaction';
import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import { ExecutionService } from '@/executions/execution.service';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

/** `deletedAt` is on the entity but missing from `IExecutionBase`, and the response carries it. */
type PublicExecution = IExecutionBase & Partial<IExecutionResponse> & { deletedAt?: Date | null };

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
			// Absent unless `includeData` is set. An undefined value is dropped by `res.json`, so the
			// key stays out of the response.
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

	/**
	 * `replaceCircularReferences` makes the object safe to serialise and calls `toJSON` on every
	 * `Date`, turning it into the ISO string the DTO declares. The cast covers that change, which
	 * the type system cannot see.
	 */
	private serialize<T>(response: object): T {
		return replaceCircularReferences(response) as unknown as T;
	}
}
