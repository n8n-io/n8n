import { ExecutionRedactionQueryDtoSchema } from '@n8n/api-types';
import { ExecutionsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { type ExecutionStatus, replaceCircularReferences } from 'n8n-workflow';

import { AbortedExecutionRetryError } from '@/errors/aborted-execution-retry.error';
import { MissingExecutionStopError } from '@/errors/missing-execution-stop.error';
import { QueuedExecutionRetryError } from '@/errors/queued-execution-retry.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { isRedactableExecution } from '@/executions/execution-redaction';
import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import { ExecutionService } from '@/executions/execution.service';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import type { ExecutionRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiScope, validCursor } from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

const handleError = (error: unknown) => {
	if (error instanceof QueuedExecutionRetryError || error instanceof AbortedExecutionRetryError) {
		throw new ConflictError(error.message);
	}
	if (error instanceof MissingExecutionStopError) {
		throw new NotFoundError(error.message);
	}

	throw error;
};

type ExecutionHandlers = {
	getExecutions: PublicAPIEndpoint<ExecutionRequest.GetAll>;
	retryExecution: PublicAPIEndpoint<ExecutionRequest.Retry>;
	stopExecution: PublicAPIEndpoint<ExecutionRequest.Stop>;
	stopManyExecutions: PublicAPIEndpoint<ExecutionRequest.StopMany>;
};

const executionHandlers: ExecutionHandlers = {
	getExecutions: [
		publicApiScope('execution:list'),
		validCursor,
		async (req, res) => {
			const {
				lastId = undefined,
				limit = 100,
				status = undefined,
				includeData = false,
				ignoreDataSizeLimit = false,
				workflowId = undefined,
				projectId,
				startedAfter,
				startedBefore,
			} = req.query;

			const sharedWorkflowsIds = await Container.get(
				WorkflowSharingService,
			).getSharedWorkflowIdsForScopes(req.user, ['workflow:read'], projectId);

			if (!sharedWorkflowsIds.length || (workflowId && !sharedWorkflowsIds.includes(workflowId))) {
				return res.status(200).json({ data: [], nextCursor: null });
			}

			const { executions, count } = await Container.get(ExecutionService).findManyAndCount(
				workflowId ? [workflowId] : sharedWorkflowsIds,
				{
					status,
					limit,
					lastId,
					includeData,
					startedAfter,
					startedBefore,
					// for backward compatibility `running` executions are always excluded
					// unless the user explicitly filters by `running` status
					excludeRunning: status !== 'running',
					maxDataSizeBytes: ignoreDataSizeLimit
						? 0
						: Container.get(ExecutionsConfig).maxDisplaySize,
				},
			);

			const newLastId = executions.length === 0 ? '0' : executions.at(-1)!.id;

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
			const sharedWorkflowsIds = await Container.get(
				WorkflowSharingService,
			).getSharedWorkflowIdsForScopes(req.user, ['workflow:execute']);

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
	stopExecution: [
		publicApiScope('execution:stop'),
		async (req, res) => {
			const sharedWorkflowsIds = await Container.get(
				WorkflowSharingService,
			).getSharedWorkflowIdsForScopes(req.user, ['workflow:execute']);

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
			if (!status || status.length === 0) {
				return res.status(400).json({
					message:
						'Status filter is required. Please provide at least one status to stop executions.',
					example: {
						status: ['running', 'waiting', 'queued'],
					},
				});
			}

			const sharedWorkflowsIds = await Container.get(
				WorkflowSharingService,
			).getSharedWorkflowIdsForScopes(req.user, ['workflow:execute']);

			if (!sharedWorkflowsIds.length) {
				return res.json({ stopped: 0 });
			}

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
