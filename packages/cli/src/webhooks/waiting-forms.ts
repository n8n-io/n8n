import axios from 'axios';
import type express from 'express';
import { FORM_NODE_TYPE, sleep, Workflow } from 'n8n-workflow';
import { Service } from 'typedi';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { IExecutionResponse } from '@/interfaces';
import { WaitingWebhooks } from '@/webhooks/waiting-webhooks';

import type { IWebhookResponseCallbackData, WaitingWebhookRequest } from './webhook.types';

@Service()
export class WaitingForms extends WaitingWebhooks {
	protected override includeForms = true;

	protected override logReceivedWebhook(method: string, executionId: string) {
		this.logger.debug(`Received waiting-form "${method}" for execution "${executionId}"`);
	}

	protected disableNode(execution: IExecutionResponse, method?: string) {
		if (method === 'POST') {
			execution.data.executionData!.nodeExecutionStack[0].node.disabled = true;
		}
	}

	private getWorkflow(execution: IExecutionResponse) {
		const { workflowData } = execution;
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

	async executeWebhook(
		req: WaitingWebhookRequest,
		res: express.Response,
	): Promise<IWebhookResponseCallbackData> {
		const { path: executionId, suffix } = req.params;

		this.logReceivedWebhook(req.method, executionId);

		// Reset request parameters
		req.params = {} as WaitingWebhookRequest['params'];

		const execution = await this.getExecution(executionId);

		if (!execution) {
			throw new NotFoundError(`The execution "${executionId}" does not exist.`);
		}

		if (execution.data.resultData.error) {
			throw new ConflictError(`The execution "${executionId}" has finished with error.`);
		}

		if (execution.status === 'running') {
			if (this.includeForms && req.method === 'GET') {
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

				return {
					noWebhookResponse: true,
				};
			}
			throw new ConflictError(`The execution "${executionId}" is running already.`);
		}

		let completionPage;
		if (execution.finished) {
			const workflow = this.getWorkflow(execution);

			const parentNodes = workflow.getParentNodes(
				execution.data.resultData.lastNodeExecuted as string,
			);

			const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
			const lastNode = workflow.nodes[lastNodeExecuted];

			if (
				!lastNode.disabled &&
				lastNode.type === FORM_NODE_TYPE &&
				lastNode.parameters.operation === 'completion'
			) {
				completionPage = lastNodeExecuted;
			} else {
				completionPage = Object.keys(workflow.nodes).find((nodeName) => {
					const node = workflow.nodes[nodeName];
					return (
						parentNodes.includes(nodeName) &&
						!node.disabled &&
						node.type === FORM_NODE_TYPE &&
						node.parameters.operation === 'completion'
					);
				});
			}

			if (!completionPage) {
				res.render('form-trigger-completion', {
					title: 'Form Submitted',
					message: 'Your response has been recorded',
					formTitle: 'Form Submitted',
				});

				return {
					noWebhookResponse: true,
				};
			}
		}

		const targetNode = completionPage || (execution.data.resultData.lastNodeExecuted as string);

		return await this.getWebhookExecutionData({
			execution,
			req,
			res,
			lastNodeExecuted: targetNode,
			executionId,
			suffix,
		});
	}
}
