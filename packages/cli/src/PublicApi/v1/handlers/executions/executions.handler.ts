import express from 'express';

import { BinaryDataManager } from 'n8n-core';

import {
	getExecutions,
	getExecutionInWorkflows,
	deleteExecution,
	getExecutionsCount,
} from './executions.service';
import * as ActiveExecutions from '@/ActiveExecutions';
import { authorize, validCursor } from '../../shared/middlewares/global.middleware';
import { ExecutionRequest } from '../../../types';
import { getSharedWorkflowIds } from '../workflows/workflows.service';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import { InternalHooksManager } from '@/InternalHooksManager';

export = {
	deleteExecution: [
		authorize(['owner', 'member']),
		async (req: ExecutionRequest.Delete, res: express.Response): Promise<express.Response> => {
			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user);

			// user does not have workflows hence no executions
			// or the execution he is trying to access belongs to a workflow he does not own
			if (!sharedWorkflowsIds.length) {
				return res.status(404).json({ message: 'Not Found' });
			}

			const { id } = req.params;

			// look for the execution on the workflow the user owns
			const execution = await getExecutionInWorkflows(id, sharedWorkflowsIds, false);

			if (!execution) {
				return res.status(404).json({ message: 'Not Found' });
			}

			await BinaryDataManager.getInstance().deleteBinaryDataByExecutionId(execution.id);

			await deleteExecution(execution);

			execution.id = id;

			return res.json(execution);
		},
	],
	getExecution: [
		authorize(['owner', 'member']),
		async (req: ExecutionRequest.Get, res: express.Response): Promise<express.Response> => {
			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user);

			// user does not have workflows hence no executions
			// or the execution he is trying to access belongs to a workflow he does not own
			if (!sharedWorkflowsIds.length) {
				return res.status(404).json({ message: 'Not Found' });
			}

			const { id } = req.params;
			const { includeData = false } = req.query;

			// look for the execution on the workflow the user owns
			const execution = await getExecutionInWorkflows(id, sharedWorkflowsIds, includeData);

			if (!execution) {
				return res.status(404).json({ message: 'Not Found' });
			}

			void InternalHooksManager.getInstance().onUserRetrievedExecution({
				user_id: req.user.id,
				public_api: true,
			});

			return res.json(execution);
		},
	],
	getExecutions: [
		authorize(['owner', 'member']),
		validCursor,
		async (req: ExecutionRequest.GetAll, res: express.Response): Promise<express.Response> => {
			const {
				lastId = undefined,
				limit = 100,
				status = undefined,
				includeData = false,
				workflowId = undefined,
			} = req.query;

			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user);

			// user does not have workflows hence no executions
			// or the execution he is trying to access belongs to a workflow he does not own
			if (!sharedWorkflowsIds.length) {
				return res.status(200).json({ data: [], nextCursor: null });
			}

			// get running workflows so we exclude them from the result
			const runningExecutionsIds = ActiveExecutions.getInstance()
				.getActiveExecutions()
				.map(({ id }) => id);

			const filters = {
				status,
				limit,
				lastId,
				includeData,
				...(workflowId && { workflowIds: [workflowId] }),
				excludedExecutionsIds: runningExecutionsIds,
			};

			const executions = await getExecutions(filters);

			const newLastId = !executions.length ? '0' : executions.slice(-1)[0].id;

			filters.lastId = newLastId;

			const count = await getExecutionsCount(filters);

			void InternalHooksManager.getInstance().onUserRetrievedAllExecutions({
				user_id: req.user.id,
				public_api: true,
			});

			return res.json({
				data: executions,
				nextCursor: encodeNextCursor({
					lastId: newLastId,
					limit,
					numberOfNextRecords: count,
				}),
			});
		},
	],
};
