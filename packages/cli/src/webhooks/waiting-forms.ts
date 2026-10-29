import type { IExecutionResponse } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExecutionSnapshot, ResumeTargetResponse } from '@n8n/engine';
import type express from 'express';
import type { INode, IRunData } from 'n8n-workflow';
import { FORM_NODE_TYPE, WAITING_FORMS_EXECUTION_STATUS, Workflow } from 'n8n-workflow';

import { ConflictError, NotFoundError } from '@n8n/errors';
import { asWorkflowSnapshot } from '@/executions/engine-v2-execution-reader.service';
import { toV1Status } from '@/executions/engine-v2-mapping';
import { isExecutionIdV2 } from '@/executions/execution-id';
import { applyCors } from '@/utils/cors.util';
import { WaitingWebhooks } from '@/webhooks/waiting-webhooks';
import { applyFormSandboxCSP } from '@/webhooks/webhook-response-headers';

import { authAllowlistedNodes } from './constants';
import { sanitizeWebhookRequest } from './webhook-request-sanitizer';
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

	protected override respondInvalidToken(res: express.Response): IWebhookResponseCallbackData {
		applyFormSandboxCSP(res);
		res.status(401).render('form-invalid-token');
		return { noWebhookResponse: true };
	}

	/**
	 * The status poll of the form page, from the data plane's snapshot. The page
	 * acts on the v1 status words, so the v2 status is mapped to them; `waiting`
	 * on a form node is `form-waiting`, the word that tells the page to render.
	 */
	protected override answerEngineV2Status({
		snapshot,
		target,
		suffix,
		req,
		res,
	}: {
		snapshot: ExecutionSnapshot;
		target: ResumeTargetResponse['target'];
		suffix: string | undefined;
		req: WaitingWebhookRequest;
		res: express.Response;
	}): IWebhookResponseCallbackData | undefined {
		if (suffix !== WAITING_FORMS_EXECUTION_STATUS) return undefined;

		const status = toV1Status(snapshot.status);
		const node = target && this.findWorkflowNode(snapshot, target.nodeId);
		const waitsForForm = node && status === 'waiting' && this.isFormResumeNode(node);

		applyCors(req, res);
		res.send(waitsForForm ? 'form-waiting' : status);
		return { noWebhookResponse: true };
	}

	/**
	 * A queued or running execution gets no body, because the page polls, as in
	 * v1. A completed execution gets the generic completion page, not a Form
	 * node's own.
	 */
	protected override answerEngineV2WithoutTarget(
		executionId: string,
		snapshot: ExecutionSnapshot,
		res: express.Response,
	): IWebhookResponseCallbackData {
		if (snapshot.status === 'completed') {
			applyFormSandboxCSP(res);
			res.render('form-trigger-completion', {
				title: 'Form Submitted',
				message: 'Your response has been recorded',
				formTitle: 'Form Submitted',
			});
			return { noWebhookResponse: true };
		}

		if (snapshot.status === 'queued' || snapshot.status === 'running') {
			return { noWebhookResponse: true };
		}

		return super.answerEngineV2WithoutTarget(executionId, snapshot, res);
	}

	protected override sanitizeEngineV2Request(req: WaitingWebhookRequest, resumeNode: INode): void {
		if (!authAllowlistedNodes.has(resumeNode.type)) sanitizeWebhookRequest(req);
	}

	private findWorkflowNode(snapshot: ExecutionSnapshot, nodeId: string): INode | undefined {
		return asWorkflowSnapshot(snapshot.workflow)?.nodes.find((node) => node.id === nodeId);
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

		// On a v2 execution, a GET renders the form and resumes nothing. A POST
		// resumes.
		if (isExecutionIdV2(executionId)) {
			return await this.resumeEngineV2Execution(req, res, executionId, routeSuffix);
		}

		// Reset request parameters
		req.params = {} as WaitingWebhookRequest['params'];

		const execution = await this.getExecution(executionId);

		// Sanitize unless the resume node opts in to receiving auth cookies
		// (FORM_NODE_TYPE is in `authAllowlistedNodes` for n8nUserAuth support).
		// Note: this runs AFTER `getExecution` (previously ran unconditionally
		// before it). `getExecution` must remain a pure DB lookup that does not
		// consume cookies.
		const resumeNodeName = execution?.data?.resultData?.lastNodeExecuted;
		const resumeNodeType = resumeNodeName
			? execution?.workflowData?.nodes?.find((n) => n.name === resumeNodeName)?.type
			: undefined;
		if (!resumeNodeType || !authAllowlistedNodes.has(resumeNodeType)) {
			sanitizeWebhookRequest(req);
		}

		// Validate token for forms (backwards compat: skip for old executions without resumeToken)
		let webhookPath: string | undefined;
		if (execution?.data.resumeToken) {
			const result = this.validateToken(req, execution);
			if (!result.valid) {
				applyFormSandboxCSP(res);
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

		// A run parked at a node boundary is not waiting for a form page. Treated
		// like a running run, so the page keeps polling until the run resumes.
		if (execution.status === 'running' || execution.data.waitReason === 'suspended') {
			return { noWebhookResponse: true };
		}

		let lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;

		// oxlint-disable-next-line typescript/no-deprecated
		if (execution.finished) {
			const workflow = this.createWorkflow(execution.workflowData);
			const completionPage = this.findCompletionPage(
				workflow,
				execution.data.resultData.runData,
				lastNodeExecuted,
			);

			if (!completionPage) {
				applyFormSandboxCSP(res);
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

		// A run parked at a node boundary has its next, unexecuted node at the stack
		// head. Even when that is a form node, no form is being served yet.
		const isParked = execution?.data.waitReason === 'suspended';
		if (node && status === 'waiting' && !isParked && this.isFormResumeNode(node)) {
			status = 'form-waiting';
		}

		applyCors(req, res);
		res.send(status);
		return { noWebhookResponse: true };
	}
}
