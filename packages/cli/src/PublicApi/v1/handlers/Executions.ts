import express = require('express');

import { ExecutionRequest } from '../../publicApiRequest';
import { encodeNextCursor } from '../../helpers';
import { authorize, instanceOwnerSetup, validCursor } from '../../middlewares';
import {
	getExecutions,
	getExecution,
	deleteExecution,
	getExecutionsCount,
} from '../../Services/execution';
import { getSharedWorkflowIds, getWorkflowAccess } from '../../Services/workflow';

export = {
	deleteExecution: [
		instanceOwnerSetup,
		authorize(['owner', 'member']),
		async (req: ExecutionRequest.Delete, res: express.Response): Promise<express.Response> => {
			const { executionId } = req.params;

			const execution = await getExecution(executionId);
			if (execution === undefined) {
				return res.status(404).json({
					message: 'Execution not found.',
				});
			}

			if (req.user.globalRole.name === 'owner') {
				await deleteExecution(execution);
				return res.json(execution);
			}

			const userHasAccessToWorkflow = await getWorkflowAccess(req.user, execution.workflowId);

			if (userHasAccessToWorkflow) {
				await deleteExecution(execution);
				return res.json(execution);
			}

			return res.status(404).json({
				message: 'Execution not found.',
			});
		},
	],
	getExecution: [
		instanceOwnerSetup,
		authorize(['owner', 'member']),
		async (req: ExecutionRequest.Get, res: express.Response): Promise<express.Response> => {
			const { executionId } = req.params;

			const execution = await getExecution(executionId);
			if (execution === undefined) {
				return res.status(404).json({
					message: 'Execution not found.',
				});
			}

			if (req.user.globalRole.name === 'owner') {
				return res.json(execution);
			}

			const userHasAccessToWorkflow = await getWorkflowAccess(req.user, execution.workflowId);

			if (userHasAccessToWorkflow) {
				return res.json(execution);
			}
			return res.status(404).json({
				message: 'Execution not found.',
			});
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

			const filters = {
				status,
				limit,
				lastId,
				...(workflowId && { workflowIds: [workflowId] }),
			};

			if (req.user.globalRole.name === 'owner') {
				const executions = await getExecutions(filters);

				filters.lastId = executions.slice(-1)[0].id as number;

				const count = await getExecutionsCount(filters);

				return res.json({
					data: executions,
					nextCursor: encodeNextCursor({
						lastId: filters.lastId,
						limit,
						numberOfNextRecords: count,
					}),
				});
			}

			const sharedWorkflowsIds = [];

			if (!workflowId) {
				const sharedWorkflows = await getSharedWorkflowIds(req.user);
				sharedWorkflowsIds.push(...sharedWorkflows);
			}

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
