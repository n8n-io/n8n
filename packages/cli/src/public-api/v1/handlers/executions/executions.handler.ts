import { Container } from '@n8n/di';
import type express from 'express';
import { replaceCircularReferences } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { EventService } from '@/events/event.service';

import type { ExecutionRequest } from '../../../types';
import { apiKeyHasScope, validCursor } from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import { getSharedWorkflowIds } from '../workflows/workflows.service';

export = {
	deleteExecution: [
		apiKeyHasScope('execution:delete'),
		async (req: ExecutionRequest.Delete, res: express.Response): Promise<express.Response> => {
			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user, ['workflow:delete']);

			// user does not have workflows hence no executions
			// or the execution they are trying to access belongs to a workflow they do not own
			if (!sharedWorkflowsIds.length) {
				return res.status(404).json({ message: 'Not Found' });
			}

			const { id } = req.params;

			// look for the execution on the workflow the user owns
			const execution = await Container.get(
				ExecutionRepository,
			).getExecutionInWorkflowsForPublicApi(id, sharedWorkflowsIds, false);

			if (!execution) {
				return res.status(404).json({ message: 'Not Found' });
			}

			if (execution.status === 'running') {
				return res.status(400).json({
					message: 'Cannot delete a running execution',
				});
			}

			if (execution.status === 'new') {
				Container.get(ConcurrencyControlService).remove({
					executionId: execution.id,
					mode: execution.mode,
				});
			}

			await Container.get(ExecutionRepository).hardDelete({
				workflowId: execution.workflowId,
				executionId: execution.id,
			});

			execution.id = id;

			return res.json(replaceCircularReferences(execution));
		},
	],
	getExecution: [
		apiKeyHasScope('execution:read'),
		async (req: ExecutionRequest.Get, res: express.Response): Promise<express.Response> => {
			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

			// user does not have workflows hence no executions
			// or the execution they are trying to access belongs to a workflow they do not own
			if (!sharedWorkflowsIds.length) {
				return res.status(404).json({ message: 'Not Found' });
			}

			const { id } = req.params;
			const { includeData = false } = req.query;

			// look for the execution on the workflow the user owns
			const execution = await Container.get(
				ExecutionRepository,
			).getExecutionInWorkflowsForPublicApi(id, sharedWorkflowsIds, includeData);

			if (!execution) {
				return res.status(404).json({ message: 'Not Found' });
			}

			Container.get(EventService).emit('user-retrieved-execution', {
				userId: req.user.id,
				publicApi: true,
			});

			return res.json(replaceCircularReferences(execution));
		},
	],
	getExecutions: [
		apiKeyHasScope('execution:list'),
		validCursor,
		async (req: ExecutionRequest.GetAll, res: express.Response): Promise<express.Response> => {
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

			// get running workflows so we exclude them from the result
			const runningExecutionsIds = Container.get(ActiveExecutions)
				.getActiveExecutions()
				.map(({ id }) => id);

			const filters = {
				status,
				limit,
				lastId,
				includeData,
				workflowIds: workflowId ? [workflowId] : sharedWorkflowsIds,
				excludedExecutionsIds: runningExecutionsIds,
			};

			const executions =
				await Container.get(ExecutionRepository).getExecutionsForPublicApi(filters);

			const newLastId = !executions.length ? '0' : executions.slice(-1)[0].id;

			filters.lastId = newLastId;

			const count =
				await Container.get(ExecutionRepository).getExecutionsCountForPublicApi(filters);

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
};
