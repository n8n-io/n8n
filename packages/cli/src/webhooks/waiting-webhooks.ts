import axios from 'axios';
import type express from 'express';
import { FORM_NODE_TYPE, NodeHelpers, sleep, Workflow } from 'n8n-workflow';
import { Service } from 'typedi';

import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { IExecutionResponse, IWorkflowDb } from '@/interfaces';
import { Logger } from '@/logging/logger.service';
import { NodeTypes } from '@/node-types';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

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
		private readonly nodeTypes: NodeTypes,
		private readonly executionRepository: ExecutionRepository,
	) {}

	// TODO: implement `getWebhookMethods` for CORS support

	protected logReceivedWebhook(method: string, executionId: string) {
		this.logger.debug(`Received waiting-webhook "${method}" for execution "${executionId}"`);
	}

	protected disableNode(execution: IExecutionResponse, _method?: string) {
		execution.data.executionData!.nodeExecutionStack[0].node.disabled = true;
	}

	private async reloadForm(req: WaitingWebhookRequest, res: express.Response) {
		try {
			await sleep(1000);

			const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
			const page = await axios({ url });

			if (page) {
				res.send(`
				<script>
					setTimeout(function() {
						window.location.reload();
					}, 1);
				</script>
			`);
			}
		} catch (error) {}
	}

	async executeWebhook(
		req: WaitingWebhookRequest,
		res: express.Response,
	): Promise<IWebhookResponseCallbackData> {
		const { path: executionId, suffix } = req.params;

		this.logReceivedWebhook(req.method, executionId);

		// Reset request parameters
		req.params = {} as WaitingWebhookRequest['params'];

		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!execution) {
			throw new NotFoundError(`The execution "${executionId} does not exist.`);
		}

		if (execution.status === 'running') {
			if (this.includeForms && req.method === 'GET') {
				await this.reloadForm(req, res);
				return { noWebhookResponse: true };
			}

			throw new ConflictError(`The execution "${executionId} is running already.`);
		}

		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;

		if (execution.finished) {
			if (this.includeForms && req.method === 'GET') {
				const executionWorkflowData = execution.workflowData;

				const hasCompletionPage = executionWorkflowData.nodes.some((node) => {
					return (
						!node.disabled &&
						node.type === FORM_NODE_TYPE &&
						node.parameters.operation === 'completion'
					);
				});

				if (!hasCompletionPage) {
					res.render('form-trigger-completion', {
						title: 'Form Submitted',
						message: 'Your response has been recorded',
						formTitle: 'Form Submitted',
					});
					return {
						noWebhookResponse: true,
					};
				}

				// const workflow = this.getWorkflow(execution);

				// const parentNodes = workflow.getParentNodes(
				// 	execution.data.resultData.lastNodeExecuted as string,
				// );

				// const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
				// const lastNode = workflow.nodes[lastNodeExecuted];

				// if (
				// 	!lastNode.disabled &&
				// 	lastNode.type === FORM_NODE_TYPE &&
				// 	lastNode.parameters.operation === 'completion'
				// ) {
				// 	completionPage = lastNodeExecuted;
				// } else {
				// 	completionPage = Object.keys(workflow.nodes).find((nodeName) => {
				// 		const node = workflow.nodes[nodeName];
				// 		return (
				// 			parentNodes.includes(nodeName) &&
				// 			!node.disabled &&
				// 			node.type === FORM_NODE_TYPE &&
				// 			node.parameters.operation === 'completion'
				// 		);
				// 	});
				// }

				// if (!completionPage) {
				// 	res.render('form-trigger-completion', {
				// 		title: 'Form Submitted',
				// 		message: 'Your response has been recorded',
				// 		formTitle: 'Form Submitted',
				// 	});

				// 	return {
				// 		noWebhookResponse: true,
				// 	};
				// }
			} else {
				throw new ConflictError(`The execution "${executionId} has finished already.`);
			}
		}

		if (execution.data.resultData.error) {
			throw new ConflictError(`The execution "${executionId} has finished already.`);
		}

		// Set the node as disabled so that the data does not get executed again as it would result
		// in starting the wait all over again
		this.disableNode(execution, req.method);

		// Remove waitTill information else the execution would stop
		execution.data.waitTill = undefined;

		// Remove the data of the node execution again else it will display the node as executed twice
		execution.data.resultData.runData[lastNodeExecuted].pop();

		const { workflowData } = execution;

		const workflow = new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

		const workflowStartNode = workflow.getNode(lastNodeExecuted);
		if (workflowStartNode === null) {
			throw new NotFoundError('Could not find node to process webhook.');
		}

		const additionalData = await WorkflowExecuteAdditionalData.getBase();
		const webhookData = NodeHelpers.getNodeWebhooks(
			workflow,
			workflowStartNode,
			additionalData,
		).find(
			(webhook) =>
				webhook.httpMethod === req.method &&
				webhook.path === (suffix ?? '') &&
				webhook.webhookDescription.restartWebhook === true &&
				(webhook.webhookDescription.isForm || false) === this.includeForms,
		);

		if (webhookData === undefined) {
			// If no data got found it means that the execution can not be started via a webhook.
			// Return 404 because we do not want to give any data if the execution exists or not.
			const errorMessage = `The workflow for execution "${executionId}" does not contain a waiting webhook with a matching path/method.`;
			throw new NotFoundError(errorMessage);
		}

		const runExecutionData = execution.data;

		return await new Promise((resolve, reject) => {
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
