/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/no-cycle */
import express from 'express';
import { LoggerProxy as Logger } from 'n8n-workflow';
import { Db, ResponseHelper } from '..';
import { RESPONSE_ERROR_MESSAGES } from '../constants';
import type { WorkflowEntity } from '../databases/entities/WorkflowEntity';
import type { WorkflowRequest } from '../requests';

export const pinDataController = express.Router();

const { NO_NODE_NAME, NO_PIN_DATA, NO_WORKFLOW } = RESPONSE_ERROR_MESSAGES;

function findNodeIndex(workflow: WorkflowEntity, nodeName: string) {
	const nodeIndex = workflow.nodes.findIndex((n) => n.name === nodeName);

	if (nodeIndex === -1) {
		const message = `Failed to find node named "${nodeName}" in workflow ID ${workflow.id}`;
		throw new ResponseHelper.ResponseError(message, undefined, 404);
	}

	return nodeIndex;
}

/**
 * POST /workflows/:id/pin-data
 */
pinDataController.post(
	'/pin-data',
	ResponseHelper.send(async (req: WorkflowRequest.PinData): Promise<{ success: true }> => {
		const { nodeName, pinData } = req.body;

		if (!nodeName) {
			Logger.debug('Request to pin data rejected because of missing `nodeName` in body');
			throw new ResponseHelper.ResponseError(NO_NODE_NAME, undefined, 400);
		}

		if (!pinData) {
			Logger.debug('Request to pin data rejected because of missing `pinData` in body');
			throw new ResponseHelper.ResponseError(NO_PIN_DATA, undefined, 400);
		}

		const { id: workflowId } = req.params;

		const workflow = await Db.collections.Workflow.findOne(workflowId);

		if (!workflow) {
			Logger.debug('Request to pin data rejected because `workflowId` was not found');
			const message = [NO_WORKFLOW, workflowId].join(' ');
			throw new ResponseHelper.ResponseError(message, undefined, 404);
		}

		const nodeIndex = findNodeIndex(workflow, nodeName);

		workflow.nodes.splice(nodeIndex, 1, { ...workflow.nodes[nodeIndex], pinData });

		await Db.collections.Workflow.save(workflow);

		Logger.info('Pinned data successfully', { workflowId, nodeName });

		return { success: true };
	}),
);

/**
 * POST /workflows/:id/unpin-data
 */
pinDataController.post(
	'/unpin-data',
	ResponseHelper.send(async (req: WorkflowRequest.UnpinData): Promise<{ success: true }> => {
		const { nodeName } = req.body;

		if (!nodeName) {
			Logger.debug('Request to unpin data rejected because of missing `nodeName` in body');
			throw new ResponseHelper.ResponseError(NO_NODE_NAME, undefined, 400);
		}

		const { id: workflowId } = req.params;

		const workflow = await Db.collections.Workflow.findOne(workflowId);

		if (!workflow) {
			Logger.debug('Request to unpin data rejected because `workflowId` was not found');
			const message = [NO_WORKFLOW, workflowId].join(' ');
			throw new ResponseHelper.ResponseError(message, undefined, 404);
		}

		const nodeIndex = findNodeIndex(workflow, nodeName);

		const { pinData, ...rest } = workflow.nodes[nodeIndex];

		workflow.nodes.splice(nodeIndex, 1, rest);

		await Db.collections.Workflow.save(workflow);

		Logger.info('Unpinned data successfully', { workflowId, nodeName });

		return { success: true };
	}),
);
