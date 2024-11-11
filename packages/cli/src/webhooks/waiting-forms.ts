import axios from 'axios';
import type express from 'express';
import type { IRunData } from 'n8n-workflow';
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

	findCompletionPage(workflow: Workflow, runData: IRunData, lastNodeExecuted: string) {
		const parentNodes = workflow.getParentNodes(lastNodeExecuted);
		const lastNode = workflow.nodes[lastNodeExecuted];

		if (
			!lastNode.disabled &&
			lastNode.type === FORM_NODE_TYPE &&
			lastNode.parameters.operation === 'completion'
		) {
			return lastNodeExecuted;
		} else {
			return parentNodes.reverse().find((nodeName) => {
				const node = workflow.nodes[nodeName];
				return (
					!node.disabled &&
					node.type === FORM_NODE_TYPE &&
					node.parameters.operation === 'completion' &&
					runData[nodeName]
				);
			});
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
			throw new NotFoundError(`The execution "${executionId}" does not exist.`);
		}

		if (execution.data.resultData.error) {
			const message = `The execution "${executionId}" has finished with error.`;
			this.logger.debug(message, { error: execution.data.resultData.error });
			throw new ConflictError(message);
		}

		if (execution.status === 'running') {
			if (this.includeForms && req.method === 'GET') {
				await this.reloadForm(req, res);
				return { noWebhookResponse: true };
			}

			throw new ConflictError(`The execution "${executionId}" is running already.`);
		}

		let lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;

		if (execution.finished) {
			// find the completion page to render
			// if there is no completion page, render the default page
			const workflow = this.getWorkflow(execution);

			const completionPage = this.findCompletionPage(
				workflow,
				execution.data.resultData.runData,
				lastNodeExecuted,
			);

			if (!completionPage) {
				res.render('form-trigger-completion', {
					title: 'Form Submitted',
					message: 'Your response has been recorded',
					formTitle: 'Form Submitted',
				});

				return {
					noWebhookResponse: true,
				};
			} else {
				lastNodeExecuted = completionPage;
			}
		}

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
