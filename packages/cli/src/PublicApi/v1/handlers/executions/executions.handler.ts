import express = require('express');

import { BinaryDataManager } from 'n8n-core';
import {
	getExecutions,
	getExecutionInWorkflows,
	deleteExecution,
	getExecutionsCount,
} from './executions.service';

import { ActiveExecutions } from '../../../..';
import { authorize, validCursor } from '../../shared/middlewares/global.middleware';

import { ExecutionRequest } from '../../../types';
import { getSharedWorkflowIds } from '../workflows/workflows.service';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import { InternalHooksManager } from '../../../../InternalHooksManager';

export = {
	deleteExecution: [
		authorize(['owner', 'member']),
		async (req: ExecutionRequest.Delete, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user);

			// user does not have workflows hence no executions
			// or the execution he is trying to access belongs to a workflow he does not own
			if (!sharedWorkflowsIds.length) {
				return res.status(404).json();
			}

			// look for the execution on the workflow the user owns
			const execution = await getExecutionInWorkflows(id, sharedWorkflowsIds);

			// execution was not found
			if (!execution) {
				return res.status(404).json();
			}

			const binaryDataManager = BinaryDataManager.getInstance();

			await binaryDataManager.deleteBinaryDataByExecutionId(execution.id.toString());

			await deleteExecution(execution);

			execution.id = id;

			return res.json(execution);
		},
	],
	getExecution: [
		authorize(['owner', 'member']),
		async (req: ExecutionRequest.Get, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user);

			// user does not have workflows hence no executions
			// or the execution he is trying to access belongs to a workflow he does not own
			if (!sharedWorkflowsIds.length) {
				return res.status(404).json();
			}

			// look for the execution on the workflow the user owns
			const execution = await getExecutionInWorkflows(id, sharedWorkflowsIds);

			// execution was not found
			if (!execution) {
				return res.status(404).json();
			}

			const telemetryData = {
				user_id: req.user.id,
				public_api: true,
			};

			void InternalHooksManager.getInstance().onUserRetrievedExecution(telemetryData);

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
				workflowId = undefined,
			} = req.query;

			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user);

			// user does not have workflows hence no executions
			// or the execution he is trying to access belongs to a workflow he does not own
			if (!sharedWorkflowsIds.length) {
				return res.json({
					data: [],
					nextCursor: null,
				});
			}

			// get running workflows so we exclude them from the result
			const runningWorkflowsIds = ActiveExecutions.getInstance()
				.getActiveExecutions()
				.map(({ id }) => Number(id));

			const filters = {
				status,
				limit,
				lastId,
				...(workflowId && { workflowIds: [workflowId] }),
				excludedWorkflowIds: runningWorkflowsIds,
			};

			const executions = await getExecutions(filters);

			const newLastId = !executions.length ? 0 : (executions.slice(-1)[0].id as number);

			filters.lastId = newLastId;

			const count = await getExecutionsCount(filters);

			const telemetryData = {
				user_id: req.user.id,
				public_api: true,
			};

			void InternalHooksManager.getInstance().onUserRetrievedAllExecutions(telemetryData);

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
