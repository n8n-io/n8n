import type { IExecutionResponse } from '@n8n/db';
import { Service } from '@n8n/di';
import type express from 'express';
import type { IRunData } from 'n8n-workflow';
import { getWebhookSandboxCSP } from 'n8n-core';
import {
	FORM_NODE_TYPE,
	WAIT_NODE_TYPE,
	WAITING_FORMS_EXECUTION_STATUS,
	Workflow,
} from 'n8n-workflow';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WaitingWebhooks } from '@/webhooks/waiting-webhooks';

import { sanitizeWebhookRequest } from './webhook-request-sanitizer';
import type { IWebhookResponseCallbackData, WaitingWebhookRequest } from './webhook.types';
import { applyCors } from '@/utils/cors.util';

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
		const { path: executionId, suffix: routeSuffix } = req.params;

		this.logReceivedWebhook(req.method, executionId);

		sanitizeWebhookRequest(req);

		// Reset request parameters
		req.params = {} as WaitingWebhookRequest['params'];

		const execution = await this.getExecution(executionId);

		// Validate token for forms (backwards compat: skip for old executions without resumeToken)
		let webhookPath: string | undefined;
		if (execution?.data.resumeToken) {
			const result = this.validateToken(req, execution);
			if (!result.valid) {
				res.status(401).render('form-invalid-token');
				return { noWebhookResponse: true };
			}
			webhookPath = result.webhookPath;
		}

		const suffix = routeSuffix ?? webhookPath;

		const statusResult = this.handleStatusRequest(execution, suffix, req, res);
		if (statusResult) return statusResult;

		if (!execution) {
			throw new NotFoundError(`The execution "${executionId}" does not exist.`);
		}

		if (execution.data.resultData.error) {
			const message = `The execution "${executionId}" has finished with error.`;
			this.logger.debug(message, { error: execution.data.resultData.error });
			throw new ConflictError(message);
		}

		if (execution.status === 'running') {
			return { noWebhookResponse: true };
		}

		let lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;

		if (execution.finished) {
			const workflow = this.createWorkflow(execution.workflowData);
			const completionPage = this.findCompletionPage(
				workflow,
				execution.data.resultData.runData,
				lastNodeExecuted,
			);

			if (!completionPage) {
				res.setHeader('Content-Security-Policy', getWebhookSandboxCSP());
				res.render('form-trigger-completion', {
					title: 'Form Submitted',
					message: 'Your response has been recorded',
					formTitle: 'Form Submitted',
				});
				return { noWebhookResponse: true };
			}

			lastNodeExecuted = completionPage;
		}

		applyCors(req, res);

		return await this.getWebhookExecutionData({
			execution,
			req,
			res,
			lastNodeExecuted,
			executionId,
			suffix,
		});
	}

	/**
	 * Checks if the request is a form execution status poll and, if so,
	 * responds with the current execution status (e.g. 'waiting', 'form-waiting')
	 * and signals that no further webhook response is needed.
	 * Returns `undefined` for non-status requests so normal webhook handling continues.
	 */
	private handleStatusRequest(
		execution: IExecutionResponse | undefined,
		suffix: string | undefined,
		req: WaitingWebhookRequest,
		res: express.Response,
	): IWebhookResponseCallbackData | undefined {
		if (suffix !== WAITING_FORMS_EXECUTION_STATUS) return undefined;

		let status: string = execution?.status ?? 'null';
		const { node } = execution?.data.executionData?.nodeExecutionStack[0] ?? {};

		if (node && status === 'waiting') {
			if (node.type === FORM_NODE_TYPE) {
				status = 'form-waiting';
			}
			if (node.type === WAIT_NODE_TYPE && node.parameters.resume === 'form') {
				status = 'form-waiting';
			}
		}

		applyCors(req, res);
		res.send(status);
		return { noWebhookResponse: true };
	}
}
