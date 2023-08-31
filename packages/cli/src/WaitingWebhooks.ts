import { NodeHelpers, Workflow, LoggerProxy as Logger } from 'n8n-workflow';
import { Service } from 'typedi';
import type express from 'express';

import * as ResponseHelper from '@/ResponseHelper';
import * as WebhookHelpers from '@/WebhookHelpers';
import { NodeTypes } from '@/NodeTypes';
import type {
	IResponseCallbackData,
	IWebhookManager,
	IWorkflowDb,
	WaitingWebhookRequest,
} from '@/Interfaces';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { ExecutionRepository } from '@db/repositories';
import { OwnershipService } from './services/ownership.service';

@Service()
export class WaitingWebhooks implements IWebhookManager {
	constructor(
		private nodeTypes: NodeTypes,
		private executionRepository: ExecutionRepository,
		private ownershipService: OwnershipService,
	) {}

	// TODO: implement `getWebhookMethods` for CORS support

	async executeWebhook(
		req: WaitingWebhookRequest,
		res: express.Response,
	): Promise<IResponseCallbackData> {
		const { path: executionId, suffix } = req.params;
		Logger.debug(`Received waiting-webhook "${req.method}" for execution "${executionId}"`);

		// Reset request parameters
		req.params = {} as WaitingWebhookRequest['params'];

		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!execution) {
			throw new ResponseHelper.NotFoundError(`The execution "${executionId} does not exist.`);
		}

		if (execution.finished || execution.data.resultData.error) {
			throw new ResponseHelper.ConflictError(`The execution "${executionId} has finished already.`);
		}

		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;

		// Set the node as disabled so that the data does not get executed again as it would result
		// in starting the wait all over again
		execution.data.executionData!.nodeExecutionStack[0].node.disabled = true;

		// Remove waitTill information else the execution would stop
		execution.data.waitTill = undefined;

		// Remove the data of the node execution again else it will display the node as executed twice
		execution.data.resultData.runData[lastNodeExecuted].pop();

		const { workflowData } = execution;

		const workflow = new Workflow({
			id: workflowData.id!,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

		let workflowOwner;
		try {
			workflowOwner = await this.ownershipService.getWorkflowOwnerCached(workflowData.id!);
		} catch (error) {
			throw new ResponseHelper.NotFoundError('Could not find workflow');
		}

		const workflowStartNode = workflow.getNode(lastNodeExecuted);
		if (workflowStartNode === null) {
			throw new ResponseHelper.NotFoundError('Could not find node to process webhook.');
		}

		const additionalData = await WorkflowExecuteAdditionalData.getBase(workflowOwner.id);
		const webhookData = NodeHelpers.getNodeWebhooks(
			workflow,
			workflowStartNode,
			additionalData,
		).find(
			(webhook) =>
				webhook.httpMethod === req.method &&
				webhook.path === (suffix ?? '') &&
				webhook.webhookDescription.restartWebhook === true,
		);

		if (webhookData === undefined) {
			// If no data got found it means that the execution can not be started via a webhook.
			// Return 404 because we do not want to give any data if the execution exists or not.
			const errorMessage = `The workflow for execution "${executionId}" does not contain a waiting webhook with a matching path/method.`;
			throw new ResponseHelper.NotFoundError(errorMessage);
		}

		const runExecutionData = execution.data;

		return new Promise((resolve, reject) => {
			const executionMode = 'webhook';
			void WebhookHelpers.executeWebhook(
				workflow,
				webhookData,
				workflowData as IWorkflowDb,
				workflowStartNode,
				executionMode,
				undefined,
				runExecutionData,
				execution.id,
				req,
				res,

				(error: Error | null, data: object) => {
					if (error !== null) {
						return reject(error);
					}
					resolve(data);
				},
			);
		});
	}
}
