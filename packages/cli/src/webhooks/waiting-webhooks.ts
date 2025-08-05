import { Logger } from '@n8n/backend-common';
import type { IExecutionResponse } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type express from 'express';
import {
	FORM_NODE_TYPE,
	type INodes,
	type IWorkflowBase,
	SEND_AND_WAIT_OPERATION,
	WAIT_NODE_TYPE,
	Workflow,
} from 'n8n-workflow';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeTypes } from '@/node-types';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import { sanitizeWebhookRequest } from './webhook-request-sanitizer';
import { WebhookService } from './webhook.service';
import type {
	IWebhookResponseCallbackData,
	IWebhookManager,
	WaitingWebhookRequest,
} from './webhook.types';

/**
 * Service for handling the execution of webhooks of Wait nodes that use the
 * [Resume On Webhook Call](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/#on-webhook-call)
 * feature.
 */
@Service()
export class WaitingWebhooks implements IWebhookManager {
	protected includeForms = false;

	constructor(
		protected readonly logger: Logger,
		protected readonly nodeTypes: NodeTypes,
		private readonly executionRepository: ExecutionRepository,
		private readonly webhookService: WebhookService,
	) {}

	// TODO: implement `getWebhookMethods` for CORS support

	protected logReceivedWebhook(method: string, executionId: string) {
		this.logger.debug(`Received waiting-webhook "${method}" for execution "${executionId}"`);
	}

	protected disableNode(execution: IExecutionResponse, _method?: string) {
		execution.data.executionData!.nodeExecutionStack[0].node.disabled = true;
	}

	private isSendAndWaitRequest(nodes: INodes, suffix: string | undefined) {
		return (
			suffix &&
			Object.keys(nodes).some(
				(node) =>
					nodes[node].id === suffix && nodes[node].parameters.operation === SEND_AND_WAIT_OPERATION,
			)
		);
	}

	private createWorkflow(workflowData: IWorkflowBase) {
		return new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});
	}

	protected async getExecution(executionId: string) {
		return await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
	}

	async executeWebhook(
		req: WaitingWebhookRequest,
		res: express.Response,
	): Promise<IWebhookResponseCallbackData> {
		const { path: executionId, suffix } = req.params;

		this.logReceivedWebhook(req.method, executionId);

		sanitizeWebhookRequest(req);

		// Reset request parameters
		req.params = {} as WaitingWebhookRequest['params'];

		const execution = await this.getExecution(executionId);

		if (!execution) {
			throw new NotFoundError(`The execution "${executionId}" does not exist.`);
		}

		if (execution.status === 'running') {
			throw new ConflictError(`The execution "${executionId}" is running already.`);
		}

		if (execution.data?.resultData?.error) {
			const message = `The execution "${executionId}" has finished with error.`;
			this.logger.debug(message, { error: execution.data.resultData.error });
			throw new ConflictError(message);
		}

		if (execution.finished) {
			const { workflowData } = execution;
			const { nodes } = this.createWorkflow(workflowData);
			if (this.isSendAndWaitRequest(nodes, suffix)) {
				res.render('send-and-wait-no-action-required', { isTestWebhook: false });
				return { noWebhookResponse: true };
			} else {
				throw new ConflictError(`The execution "${executionId} has finished already.`);
			}
		}

		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;

		return await this.getWebhookExecutionData({
			execution,
			req,
			res,
			lastNodeExecuted,
			executionId,
			suffix,
		});
	}

	protected async getWebhookExecutionData({
		execution,
		req,
		res,
		lastNodeExecuted,
		executionId,
		suffix,
	}: {
		execution: IExecutionResponse;
		req: WaitingWebhookRequest;
		res: express.Response;
		lastNodeExecuted: string;
		executionId: string;
		suffix?: string;
	}): Promise<IWebhookResponseCallbackData> {
		// Set the node as disabled so that the data does not get executed again as it would result
		// in starting the wait all over again
		this.disableNode(execution, req.method);

		// Remove waitTill information else the execution would stop
		execution.data.waitTill = undefined;

		// Remove the data of the node execution again else it will display the node as executed twice
		execution.data.resultData.runData[lastNodeExecuted].pop();

		const { workflowData } = execution;
		const workflow = this.createWorkflow(workflowData);

		const workflowStartNode = workflow.getNode(lastNodeExecuted);
		if (workflowStartNode === null) {
			throw new NotFoundError('Could not find node to process webhook.');
		}

		const additionalData = await WorkflowExecuteAdditionalData.getBase();
		const webhookData = this.webhookService
			.getNodeWebhooks(workflow, workflowStartNode, additionalData)
			.find(
				(webhook) =>
					webhook.httpMethod === req.method &&
					webhook.path === (suffix ?? '') &&
					webhook.webhookDescription.restartWebhook === true &&
					(webhook.webhookDescription.nodeType === 'form' || false) === this.includeForms,
			);

		if (webhookData === undefined) {
			// If no data got found it means that the execution can not be started via a webhook.
			// Return 404 because we do not want to give any data if the execution exists or not.
			const errorMessage = `The workflow for execution "${executionId}" does not contain a waiting webhook with a matching path/method.`;

			if (this.isSendAndWaitRequest(workflow.nodes, suffix)) {
				res.render('send-and-wait-no-action-required', { isTestWebhook: false });
				return { noWebhookResponse: true };
			}

			if (!execution.data.resultData.error && execution.status === 'waiting') {
				const childNodes = workflow.getChildNodes(
					execution.data.resultData.lastNodeExecuted as string,
				);

				const hasChildForms = childNodes.some(
					(node) =>
						workflow.nodes[node].type === FORM_NODE_TYPE ||
						workflow.nodes[node].type === WAIT_NODE_TYPE,
				);

				if (hasChildForms) {
					return { noWebhookResponse: true };
				}
			}

			throw new NotFoundError(errorMessage);
		}

		const runExecutionData = execution.data;

		return await new Promise((resolve, reject) => {
			void WebhookHelpers.executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				execution.mode,
				runExecutionData.pushRef,
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
