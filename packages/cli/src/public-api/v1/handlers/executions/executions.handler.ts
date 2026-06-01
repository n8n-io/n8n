import { ExecutionRedactionQueryDtoSchema } from '@n8n/api-types';
import type { IExecutionBase } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { QueryFailedError } from '@n8n/typeorm';
import { type ExecutionStatus, replaceCircularReferences } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { AbortedExecutionRetryError } from '@/errors/aborted-execution-retry.error';
import { MissingExecutionStopError } from '@/errors/missing-execution-stop.error';
import { QueuedExecutionRetryError } from '@/errors/queued-execution-retry.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import type { RedactableExecution } from '@/executions/execution-redaction';
import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import { ExecutionService } from '@/executions/execution.service';

import { getExecutionTags, mapAnnotationTags, updateExecutionTags } from './executions.service';
import type { ExecutionRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiScope, validCursor } from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import { getSharedWorkflowIds } from '../workflows/workflows.service';

const handleError = (error: unknown) => {
	if (error instanceof QueuedExecutionRetryError || error instanceof AbortedExecutionRetryError) {
		throw new ConflictError(error.message);
	}
	if (error instanceof MissingExecutionStopError) {
		throw new NotFoundError(error.message);
	}

	throw error;
};

function isRedactableExecution(
	execution: IExecutionBase,
): execution is IExecutionBase & RedactableExecution {
	return 'data' in execution && 'workflowData' in execution;
}

type ExecutionHandlers = {
	deleteExecution: PublicAPIEndpoint<ExecutionRequest.Delete>;
	getExecution: PublicAPIEndpoint<ExecutionRequest.Get>;
	getExecutions: PublicAPIEndpoint<ExecutionRequest.GetAll>;
	retryExecution: PublicAPIEndpoint<ExecutionRequest.Retry>;
	getExecutionTags: PublicAPIEndpoint<ExecutionRequest.GetTags>;
	updateExecutionTags: PublicAPIEndpoint<ExecutionRequest.UpdateTags>;
	stopExecution: PublicAPIEndpoint<ExecutionRequest.Stop>;
	stopManyExecutions: PublicAPIEndpoint<ExecutionRequest.StopMany>;
};

const executionHandlers: ExecutionHandlers = {
	deleteExecution: [
		publicApiScope('execution:delete'),
		async (req, res) => {
			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user, ['workflow:delete']);

			// user does not have workflows hence no executions
			// or the execution they are trying to access belongs to a workflow they do not own
			if (!sharedWorkflowsIds.length) {
				throw new NotFoundError('Not Found');
			}

			const { id } = req.params;

			// look for the execution on the workflow the user owns
			const execution = await Container.get(
				ExecutionRepository,
			).getExecutionInWorkflowsForPublicApi(id, sharedWorkflowsIds, false);

			if (!execution) {
				throw new NotFoundError('Not Found');
			}

			if (execution.status === 'running') {
				throw new BadRequestError('Cannot delete a running execution');
			}

			if (execution.status === 'new') {
				Container.get(ConcurrencyControlService).remove({
					executionId: execution.id,
					mode: execution.mode,
				});
			}

			await Container.get(ExecutionPersistence).hardDelete({
				workflowId: execution.workflowId,
				executionId: execution.id,
				storedAt: execution.storedAt,
			});

			execution.id = id;

			return res.json(replaceCircularReferences(execution));
		},
	],
	getExecution: [
		publicApiScope('execution:read'),
		async (req, res) => {
			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

			// user does not have workflows hence no executions
			// or the execution they are trying to access belongs to a workflow they do not own
			if (!sharedWorkflowsIds.length) {
				throw new NotFoundError('Not Found');
			}

			const { id } = req.params;
			const { includeData = false } = req.query;

			// look for the execution on the workflow the user owns
			const execution = await Container.get(
				ExecutionRepository,
			).getExecutionInWorkflowsForPublicApi(id, sharedWorkflowsIds, includeData);

			if (!execution) {
				throw new NotFoundError('Not Found');
			}

			if (includeData && isRedactableExecution(execution)) {
				const redactQuery = ExecutionRedactionQueryDtoSchema.safeParse(req.query);
				const redactExecutionData = redactQuery.success
					? redactQuery.data.redactExecutionData
					: undefined;

				await Container.get(ExecutionRedactionServiceProxy).processExecution(execution, {
					user: req.user,
					redactExecutionData,
					ipAddress: req.ip ?? '',
					userAgent: req.headers['user-agent'] ?? '',
				});
			}

			Container.get(EventService).emit('user-retrieved-execution', {
				userId: req.user.id,
				publicApi: true,
			});

			return res.json(replaceCircularReferences(execution));
		},
	],
	getExecutions: [
		publicApiScope('execution:list'),
		validCursor,
		async (req, res) => {
			const {
				lastId = undefined,
				limit = 100,
				status = undefined,
				includeData = false,
				workflowId = undefined,
				projectId,
			} = req.query;

			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user, ['workflow:read'], projectId);

			// user does not have workflows hence no executions
			// or the execution they are trying to access belongs to a workflow they do not own
			if (!sharedWorkflowsIds.length || (workflowId && !sharedWorkflowsIds.includes(workflowId))) {
				return res.status(200).json({ data: [], nextCursor: null });
			}

			// get running executions so we exclude them from the result
			const runningExecutionsIds = Container.get(ActiveExecutions)
				.getActiveExecutions()
				.map(({ id }) => id);

			const filters: Parameters<typeof ExecutionRepository.prototype.getExecutionsForPublicApi>[0] =
				{
					status,
					limit,
					lastId,
					includeData,
					workflowIds: workflowId ? [workflowId] : sharedWorkflowsIds,

					// for backward compatibility `running` executions are always excluded
					// unless the user explicitly filters by `running` status
					excludedExecutionsIds: status !== 'running' ? runningExecutionsIds : undefined,
				};

			const executions =
				await Container.get(ExecutionRepository).getExecutionsForPublicApi(filters);

			const newLastId = !executions.length ? '0' : executions.slice(-1)[0].id;

			filters.lastId = newLastId;

			const count =
				await Container.get(ExecutionRepository).getExecutionsCountForPublicApi(filters);

			if (includeData) {
				const redactQuery = ExecutionRedactionQueryDtoSchema.safeParse(req.query);
				const redactExecutionData = redactQuery.success
					? redactQuery.data.redactExecutionData
					: undefined;

				const redactableExecutions = executions.filter(isRedactableExecution);
				await Container.get(ExecutionRedactionServiceProxy).processExecutions(
					redactableExecutions,
					{
						user: req.user,
						redactExecutionData,
						ipAddress: req.ip ?? '',
						userAgent: req.headers['user-agent'] ?? '',
					},
				);
			}

			Container.get(EventService).emit('user-retrieved-all-executions', {
				userId: req.user.id,
				publicApi: true,
			});

			return res.json({
				data: replaceCircularReferences(executions),
				nextCursor: encodeNextCursor({
					lastId: newLastId,
					limit,
					numberOfNextRecords: count,
				}),
			});
		},
	],
	retryExecution: [
		publicApiScope('execution:retry'),
		async (req, res) => {
			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

			// user does not have workflows hence no executions
			// or the execution they are trying to access belongs to a workflow they do not own
			if (!sharedWorkflowsIds.length) {
				throw new NotFoundError('Not Found');
			}

			try {
				const retriedExecution = await Container.get(ExecutionService).retry(
					req,
					sharedWorkflowsIds,
				);

				Container.get(EventService).emit('user-retried-execution', {
					userId: req.user.id,
					publicApi: true,
				});

				return res.json(replaceCircularReferences(retriedExecution));
			} catch (error) {
				return handleError(error);
			}
		},
	],
	getExecutionTags: [
		publicApiScope('executionTags:list'),
		async (req, res) => {
			const { id } = req.params;
			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

			if (!sharedWorkflowsIds.length) {
				throw new NotFoundError('Not Found');
			}

			const execution = await Container.get(
				ExecutionRepository,
			).getExecutionInWorkflowsForPublicApi(id, sharedWorkflowsIds, false);

			if (!execution) {
				throw new NotFoundError('Not Found');
			}

			const tags = await getExecutionTags(id);

			return res.json(tags);
		},
	],
	updateExecutionTags: [
		publicApiScope('executionTags:update'),
		async (req, res) => {
			const { id } = req.params;
			const newTagIds = req.body.map((tag) => tag.id);
			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user, ['workflow:update']);

			if (!sharedWorkflowsIds.length) {
				throw new NotFoundError('Not Found');
			}

			const execution = await Container.get(
				ExecutionRepository,
			).getExecutionInWorkflowsForPublicApi(id, sharedWorkflowsIds, false);

			if (!execution) {
				throw new NotFoundError('Not Found');
			}

			try {
				const updatedTags = await updateExecutionTags(id, newTagIds);
				const tags = mapAnnotationTags(updatedTags);
				return res.json(tags);
			} catch (error) {
				if (error instanceof QueryFailedError) {
					throw new NotFoundError('Some tags not found');
				}
				return handleError(error);
			}
		},
	],
	stopExecution: [
		publicApiScope('execution:stop'),
		async (req, res) => {
			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user, ['workflow:execute']);

			// user does not have workflows hence no executions
			// or the execution they are trying to access belongs to a workflow they do not own
			if (!sharedWorkflowsIds.length) {
				throw new NotFoundError('Not Found');
			}

			const { id } = req.params;

			try {
				const stopResult = await Container.get(ExecutionService).stop(id, sharedWorkflowsIds);

				return res.json(replaceCircularReferences(stopResult));
			} catch (error) {
				return handleError(error);
			}
		},
	],
	stopManyExecutions: [
		publicApiScope('execution:stop'),
		async (req, res) => {
			const { status: rawStatus, workflowId, startedAfter, startedBefore } = req.body;
			const status: ExecutionStatus[] = rawStatus.map((x) => (x === 'queued' ? 'new' : x));
			// Validate that status is provided and not empty
			if (!status || status.length === 0) {
				return res.status(400).json({
					message:
						'Status filter is required. Please provide at least one status to stop executions.',
					example: {
						status: ['running', 'waiting', 'queued'],
					},
				});
			}

			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user, ['workflow:execute']);

			// Return early to avoid expensive db query
			if (!sharedWorkflowsIds.length) {
				return res.json({ stopped: 0 });
			}

			// If workflowId is provided, validate user has access to it
			if (workflowId && workflowId !== 'all' && !sharedWorkflowsIds.includes(workflowId)) {
				throw new NotFoundError('Workflow not found or not accessible');
			}

			const filter = {
				workflowId: workflowId ?? 'all',
				status,
				startedAfter,
				startedBefore,
			};

			const stopped = await Container.get(ExecutionService).stopMany(filter, sharedWorkflowsIds);

			return res.json({ stopped });
		},
	],
};

export = executionHandlers;
