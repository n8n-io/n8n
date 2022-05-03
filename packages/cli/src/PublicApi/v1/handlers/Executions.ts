import express = require('express');

import { BinaryDataManager } from 'n8n-core';
import { ExecutionRequest } from '../../publicApiRequest';
import { encodeNextCursor } from '../../helpers';
import { authorize, instanceOwnerSetup, validCursor } from '../../middlewares';
import {
	getExecutions,
	getExecutionInWorkflows,
	deleteExecution,
	getExecutionsCount,
} from '../../Services/execution';
import { getSharedWorkflowIds } from '../../Services/workflow';

export = {
	deleteExecution: [
		instanceOwnerSetup,
		authorize(['owner', 'member']),
		async (req: ExecutionRequest.Delete, res: express.Response): Promise<express.Response> => {
			const { executionId } = req.params;

			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user);

			// user does not have workflows hence no executions
			// or the execution he is trying to access belongs to a workflow he does not own
			if (!sharedWorkflowsIds.length) {
				return res.status(404).json();
			}

			// look for the execution on the workflow the user owns
			const execution = await getExecutionInWorkflows(executionId, sharedWorkflowsIds);

			// execution was not found
			if (!execution) {
				return res.status(404).json();
			}

			const binaryDataManager = BinaryDataManager.getInstance();

			await binaryDataManager.deleteBinaryDataByExecutionId(execution.id.toString());

			await deleteExecution(execution);

			return res.json(execution);
		},
	],
	getExecution: [
		instanceOwnerSetup,
		authorize(['owner', 'member']),
		async (req: ExecutionRequest.Get, res: express.Response): Promise<express.Response> => {
			const { executionId } = req.params;

			const sharedWorkflowsIds = await getSharedWorkflowIds(req.user);

			// user does not have workflows hence no executions
			// or the execution he is trying to access belongs to a workflow he does not own
			if (!sharedWorkflowsIds.length) {
				return res.status(404).json();
			}

			// look for the execution on the workflow the user owns
			const execution = await getExecutionInWorkflows(executionId, sharedWorkflowsIds);

			// execution was not found
			if (!execution) {
				return res.status(404).json();
			}

			return res.json(execution);
		},
	],
	getExecutions: [
		instanceOwnerSetup,
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
				return res.status(404).json();
			}

			const filters = {
				status,
				limit,
				lastId,
				...(workflowId && { workflowIds: [workflowId] }),
			};

			const executions = await getExecutions(filters);

			const count = await getExecutionsCount(filters);

			return res.json({
				data: executions,
				nextCursor: encodeNextCursor({
					lastId: executions.slice(-1)[0].id as number,
					limit,
					numberOfNextRecords: count,
				}),
			});
		},
	],
};
