import { Container } from '@n8n/di';
import { type ExecutionStatus, replaceCircularReferences } from 'n8n-workflow';

import { AbortedExecutionRetryError } from '@/errors/aborted-execution-retry.error';
import { MissingExecutionStopError } from '@/errors/missing-execution-stop.error';
import { QueuedExecutionRetryError } from '@/errors/queued-execution-retry.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ExecutionService } from '@/executions/execution.service';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import type { ExecutionRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiScope } from '../../shared/middlewares/global.middleware';

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
	retryExecution: PublicAPIEndpoint<ExecutionRequest.Retry>;
	stopExecution: PublicAPIEndpoint<ExecutionRequest.Stop>;
	stopManyExecutions: PublicAPIEndpoint<ExecutionRequest.StopMany>;
};

const executionHandlers: ExecutionHandlers = {
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
