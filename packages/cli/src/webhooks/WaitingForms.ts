import { WaitingWebhooks } from '@/webhooks/WaitingWebhooks';

import { sleep, Workflow } from 'n8n-workflow';
import { Service } from 'typedi';
import type express from 'express';

import type { IWebhookResponseCallbackData, WaitingWebhookRequest } from './webhook.types';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { IExecutionResponse } from '@/Interfaces';

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
			throw new NotFoundError(`The execution "${executionId} does not exist.`);
		}

		if (execution.data.resultData.error) {
			throw new ConflictError(`The execution "${executionId} has finished with error.`);
		}

		if (execution.status === 'running') {
			if (this.includeForms) {
				await sleep(1000);

				res.send(`
					<script>
						setTimeout(function() {
							window.location.reload();
						}, 1);
					</script>
				`);

				return {
					noWebhookResponse: true,
				};
			}
			throw new ConflictError(`The execution "${executionId} is running already.`);
		}

		let completionPage;
		if (execution.finished) {
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

			const connectedNodes = workflow.getParentNodes(
				execution.data.resultData.lastNodeExecuted as string,
			);

			const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
			const lastNode = workflow.nodes[execution.data.resultData.lastNodeExecuted as string];

			if (
				lastNode.type === 'n8n-nodes-base.form' &&
				lastNode.parameters.operation === 'completion'
			) {
				completionPage = lastNodeExecuted;
			} else {
				completionPage = Object.keys(workflow.nodes).find((nodeName) => {
					const node = workflow.nodes[nodeName];
					return (
						connectedNodes.includes(nodeName) &&
						node.type === 'n8n-nodes-base.form' &&
						node.parameters.operation === 'completion'
					);
				});
			}

			if (!completionPage) {
				throw new ConflictError(`The execution "${executionId} has finished already.`);
			}
		}

		const lastNodeExecuted =
			completionPage || (execution.data.resultData.lastNodeExecuted as string);

		return await this.getWebhookExecutionData({
			execution,
			req,
			res,
			lastNodeExecuted,
			executionId,
			suffix,
		});
	}
}
