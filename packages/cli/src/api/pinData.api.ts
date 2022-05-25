/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/no-cycle */
import express from 'express';
import { Db, ResponseHelper } from '..';
import { RESPONSE_ERROR_MESSAGES } from '../constants';
import type { WorkflowEntity } from '../databases/entities/WorkflowEntity';
import type { WorkflowRequest } from '../requests';

export const pinDataController = express.Router();

const { NO_NODE_NAME, NO_PIN_DATA, NO_WORKFLOW } = RESPONSE_ERROR_MESSAGES;

function findNodeIndex(workflow: WorkflowEntity, nodeName: string) {
	const nodeIndex = workflow.nodes.findIndex((n) => n.name === nodeName);

	if (nodeIndex === -1) {
		throw new ResponseHelper.ResponseError(
			`Failed to find node named "${nodeName}" in workflow ID ${workflow.id}`,
		);
	}

	return nodeIndex;
}

/**
 * POST /workflows/:id/pin-data
 */
pinDataController.post(
	'/',
	ResponseHelper.send(
		async (req: WorkflowRequest.PinData, res: express.Response): Promise<{ success: true }> => {
			const { nodeName, pinData } = req.body;

			if (!nodeName) {
				throw new ResponseHelper.ResponseError(NO_NODE_NAME, undefined, 400);
			}

			if (!pinData) {
				throw new ResponseHelper.ResponseError(NO_PIN_DATA, undefined, 400);
			}

			const { id: workflowId } = req.params;

			const workflow = await Db.collections.Workflow.findOne(workflowId);

			if (!workflow) {
				const message = [NO_WORKFLOW, workflowId].join(' ');
				throw new ResponseHelper.ResponseError(message, undefined, 404);
			}

			const nodeIndex = findNodeIndex(workflow, nodeName);

			workflow.nodes.splice(nodeIndex, 1, { ...workflow.nodes[nodeIndex], pinData });

			await Db.collections.Workflow.save(workflow);

			return { success: true };
		},
	),
);

/**
 * DELETE /workflows/:id/pin-data
 */
pinDataController.delete(
	'/',
	ResponseHelper.send(
		async (req: WorkflowRequest.UnpinData, res: express.Response): Promise<{ success: true }> => {
			const { nodeName } = req.query;

			if (!nodeName) {
				throw new ResponseHelper.ResponseError(NO_NODE_NAME, undefined, 400);
			}

			const { id: workflowId } = req.params;

			const workflow = await Db.collections.Workflow.findOne(workflowId);

			if (!workflow) {
				const message = [NO_WORKFLOW, workflowId].join(' ');
				throw new ResponseHelper.ResponseError(message, undefined, 404);
			}

			const nodeIndex = findNodeIndex(workflow, nodeName);

			const { pinData, ...rest } = workflow.nodes[nodeIndex];

			workflow.nodes.splice(nodeIndex, 1, rest);

			await Db.collections.Workflow.save(workflow);

			return { success: true };
		},
	),
);
