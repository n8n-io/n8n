import type express from 'express';
import { Container } from 'typedi';
import { replaceCircularReferences } from 'n8n-workflow';

import { ActiveExecutions } from '@/ActiveExecutions';
import { validCursor } from '../../shared/middlewares/global.middleware';
import type { ExecutionRequest } from '../../../types';
import { getSharedWorkflowIds } from '../workflows/workflows.service';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import { InternalHooks } from '@/InternalHooks';
import { ExecutionRepository } from '@db/repositories/execution.repository';

export = {
	deleteExecution: [
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

			await Container.get(ExecutionRepository).hardDelete({
				workflowId: execution.workflowId,
				executionId: execution.id,
			});

			execution.id = id;

			return res.json(replaceCircularReferences(execution));
		},
	],
	getExecution: [
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

			void Container.get(InternalHooks).onUserRetrievedExecution({
				user_id: req.user.id,
				public_api: true,
			});

			return res.json(replaceCircularReferences(execution));
		},
	],
	getExecutions: [
		validCursor,
		async (req: ExecutionRequest.GetAll, res: express.Response): Promise<express.Response> => {
			const {
				lastId = undefined,
				limit = 100,
				status = undefined,
				includeData = false,
				workflowId = undefined,
			} = req.query;

			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

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

			void Container.get(InternalHooks).onUserRetrievedAllExecutions({
				user_id: req.user.id,
				public_api: true,
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
