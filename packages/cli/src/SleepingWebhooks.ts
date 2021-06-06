import {
	Db,
	IActivationError,
	IExecutionResponse,
	IResponseCallbackData,
	IWebhookDb,
	IWorkflowDb,
	IWorkflowExecutionDataProcess,
	NodeTypes,
	ResponseHelper,
	WebhookHelpers,
	WorkflowCredentials,
	WorkflowExecuteAdditionalData,
	WorkflowHelpers,
	WorkflowRunner,
} from '.';

import {
	ActiveWorkflows,
	NodeExecuteFunctions,
} from 'n8n-core';

import {
	IExecuteData,
	IGetExecutePollFunctions,
	IGetExecuteTriggerFunctions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	IWebhookData,
	IWebhookDescription,
	IWorkflowExecuteAdditionalData as IWorkflowExecuteAdditionalDataWorkflow,
	NodeHelpers,
	WebhookHttpMethod,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import * as express from 'express';
import {
	LoggerProxy as Logger,
} from 'n8n-workflow';


import {
	FindManyOptions,
	LessThanOrEqual,
} from 'typeorm';


export class SleepingWebhooks {

	async executeWebhook(httpMethod: WebhookHttpMethod, fullPath: string, req: express.Request, res: express.Response): Promise<IResponseCallbackData> {
		Logger.debug(`Received sleeping-webhoook "${httpMethod}" for path "${fullPath}"`);

		// Reset request parameters
		req.params = {};

		// Remove trailing slash
		if (fullPath.endsWith('/')) {
			fullPath = fullPath.slice(0, -1);
		}

		const pathParts = fullPath.split('/');;

		const executionId = pathParts.shift();
		const path = pathParts.join('/');

		console.log('executionId', executionId);
		console.log('path', path);

		let execution = await Db.collections.Execution?.findOne(executionId);

		if (execution === undefined) {
			throw new ResponseHelper.ResponseError(`The execution "${executionId} does not exist.`, 404, 404);
		}

		const fullExecutionData = ResponseHelper.unflattenExecutionData(execution);

		// TODO: also have to check if it did error, because then it would also be done
		if (fullExecutionData.finished === true) {
			throw new ResponseHelper.ResponseError(`The execution "${executionId} did already complete.`, 409, 409);
		}

		return this.startExecution(httpMethod, path, fullExecutionData, req, res);
	}


	async startExecution(httpMethod: WebhookHttpMethod, path: string, fullExecutionData: IExecutionResponse, req: express.Request, res: express.Response): Promise<IResponseCallbackData> {
		const executionId = fullExecutionData.id;

		if (fullExecutionData.finished === true) {
			throw new Error('The execution did succeed and can so not be started again.');
		}

		const lastNodeExecuted = fullExecutionData!.data.resultData.lastNodeExecuted as string;

		// Set the node as disabled so that the data does not get executed again as it would result
		// in starting the sleep all over again
		fullExecutionData!.data.executionData!.nodeExecutionStack[0].node.disabled = true;

		// Remove sleepTill information else the execution would stop
		fullExecutionData!.data.sleepTill = undefined;

		// Remove the data of the node execution again else it will display the node as executed twice
		fullExecutionData!.data.resultData.runData[lastNodeExecuted].pop();

		const credentials = await WorkflowCredentials(fullExecutionData.workflowData.nodes);

		const workflowData = fullExecutionData.workflowData;

		const nodeTypes = NodeTypes();
		const workflow = new Workflow({ id: workflowData.id!.toString(), name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, nodeTypes, staticData: workflowData.staticData, settings: workflowData.settings });

		const additionalData = await WorkflowExecuteAdditionalData.getBase(credentials);

		const webhookData = NodeHelpers.getNodeWebhooks(workflow, workflow.getNode(lastNodeExecuted) as INode, additionalData).filter((webhook) => {
			return (webhook.httpMethod === httpMethod && webhook.webhookDescription.restartWebhook === true);
		})[0];

		const workflowStartNode = workflow.getNode(lastNodeExecuted);

		if (workflowStartNode === null) {
			throw new ResponseHelper.ResponseError('Could not find node to process webhook.', 404, 404);
		}

		const runExecutionData = fullExecutionData.data as IRunExecutionData;

		return new Promise((resolve, reject) => {
			const executionMode = 'webhook';
			WebhookHelpers.executeWebhook(workflow, webhookData, workflowData as IWorkflowDb, workflowStartNode, executionMode, undefined, runExecutionData, fullExecutionData.id, req, res, (error: Error | null, data: object) => {
				if (error !== null) {
					return reject(error);
				}
				resolve(data);
			});
		});

	}

}
