import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { EndpointsConfig } from '@n8n/config';
import type { IExecutionResponse } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExecutionSnapshot, ResumeTargetResponse } from '@n8n/engine';
import { timingSafeEqual } from 'crypto';
import type express from 'express';
import { InstanceSettings, WAITING_TOKEN_QUERY_PARAM, validateUrlSignature } from 'n8n-core';
import {
	FORM_NODE_TYPE,
	type INode,
	type INodes,
	type IWebhookData,
	type IWorkflowBase,
	NodeConnectionTypes,
	SEND_AND_WAIT_OPERATION,
	WAIT_NODE_TYPE,
	Workflow,
} from 'n8n-workflow';

import { sanitizeWebhookRequest } from './webhook-request-sanitizer';
import { WebhookService } from './webhook.service';
import type {
	IWebhookManager,
	IWebhookResponseCallbackData,
	WaitingWebhookRequest,
} from './webhook.types';

import { BadRequestError, ConflictError, NotFoundError, NotImplementedError } from '@n8n/errors';
import { EngineV2ExecutionReader } from '@/executions/engine-v2-execution-reader.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { getWorkflowActiveStatusFromWorkflowData } from '@/executions/execution.utils';
import { isExecutionIdV2, type ExecutionIdV2 } from '@/executions/execution-id';
import type { EngineV2ResumeRequest } from '@/interfaces';
import { NodeTypes } from '@/node-types';
import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { withExpressionIsolate } from '@/utils';
import { applyCors } from '@/utils/cors.util';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import { applyFormSandboxCSP } from '@/webhooks/webhook-response-headers';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { preserveInputOverride } from '@/workflow-helpers';

function toLocateRefusal(executionId: string, status: number, reason: string): Error {
	if (status === 404) return new NotFoundError(`The execution "${executionId}" does not exist.`);
	const refusal = `The execution "${executionId}" cannot be resumed: ${reason}.`;
	if (status === 409) return new ConflictError(refusal);
	// A data plane without a resume secret, so not a wait that is over.
	if (status === 501) return new NotImplementedError(refusal);
	return new BadRequestError(refusal);
}

const isLiveSnapshot = ({ status }: ExecutionSnapshot): boolean =>
	status === 'queued' || status === 'running' || status === 'waiting';

/**
 * Puts the waiting node where the v1 resume path expects it. The data plane
 * keeps no stack, so the execution gets one entry. `preserveInputOverride`
 * pops the node's last run, so one must exist.
 */
function seedResumingNode(execution: IExecutionResponse, node: INode): void {
	const { data } = execution;
	data.resultData.lastNodeExecuted = node.name;
	data.resultData.runData[node.name] ??= [
		{ startTime: 0, executionTime: 0, executionIndex: 0, source: [] },
	];
	data.executionData = {
		contextData: {},
		// TODO(CET-538): carry the waiting node's input items and their sources, as v1 does.
		nodeExecutionStack: [{ node: structuredClone(node), data: { main: [[]] }, source: null }],
		metadata: {},
		waitingExecution: {},
		waitingExecutionSource: null,
	};
}

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
		private readonly executionPersistence: ExecutionPersistence,
		private readonly webhookService: WebhookService,
		protected readonly instanceSettings: InstanceSettings,
		private readonly eventService: EventService,
		private readonly endpointsConfig: EndpointsConfig,
		private readonly dataPlane: EngineDataPlaneProxyService,
		private readonly executionReader: EngineV2ExecutionReader,
	) {}

	async getWebhookMethods(executionId: string) {
		// A v2 execution has no control-plane row to read the waiting node from.
		// TODO(CET-539): read the waiting node's methods from the data plane.
		if (isExecutionIdV2(executionId)) return [];

		const execution = await this.getExecution(executionId);
		if (!execution) return [];

		const lastNodeExecuted = execution.data.resultData?.lastNodeExecuted;
		if (!lastNodeExecuted) return [];

		const workflow = this.createWorkflow(execution.workflowData);
		const workflowStartNode = workflow.getNode(lastNodeExecuted);
		if (!workflowStartNode) return [];

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflow.id,
		});
		return await withExpressionIsolate(workflow, async () =>
			this.webhookService
				.getNodeWebhooks(workflow, workflowStartNode, additionalData)
				.filter((webhook) => this.isOwnRestartWebhook(webhook))
				.map((webhook) => webhook.httpMethod),
		);
	}

	async findAccessControlOptions() {
		// waiting webhooks do not support cors configuration options
		// allow all origins because waiting webhook forms are always submitted in cors mode due to sandbox CSP
		return {
			allowedOrigins: '*',
		};
	}

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

	/** Form restart webhooks resume through `form-waiting`, all other restart webhooks through `webhook-waiting`. */
	private isOwnRestartWebhook(webhook: IWebhookData): boolean {
		return (
			webhook.webhookDescription.restartWebhook === true &&
			(webhook.webhookDescription.nodeType === 'form') === this.includeForms
		);
	}

	/**
	 * Whether a node continues execution on form submission, and is therefore
	 * served by the `form-waiting` endpoint rather than `webhook-waiting`.
	 */
	protected isFormResumeNode(node: Pick<INode, 'type' | 'parameters'>): boolean {
		return (
			node.type === FORM_NODE_TYPE ||
			(node.type === WAIT_NODE_TYPE && node.parameters.resume === 'form')
		);
	}

	/**
	 * A resume node that continues on form submission is served by the
	 * `form-waiting` endpoint, not `webhook-waiting`. Users frequently reach for
	 * `$execution.resumeUrl` (webhook-waiting) instead of `$execution.resumeFormUrl`,
	 * which resolves to the wrong endpoint for these nodes.
	 */
	private isFormResumeExecution(execution: IExecutionResponse): boolean {
		const lastNodeExecuted = execution.data.resultData?.lastNodeExecuted;
		if (!lastNodeExecuted) {
			return false;
		}

		const node = execution.workflowData?.nodes?.find((n) => n.name === lastNodeExecuted);
		if (!node) {
			return false;
		}

		return this.isFormResumeNode(node);
	}

	/**
	 * Redirects a form-resume request that landed on `webhook-waiting` to the
	 * equivalent `form-waiting` URL (preserving suffix and query params), so the
	 * form renders and submits against the endpoint that actually serves it.
	 * Uses 307 to preserve the request method for direct submissions.
	 *
	 * Returns `false` without redirecting when the rewritten URL is unchanged,
	 * which happens if the two endpoints are configured identically (e.g. a
	 * custom `N8N_ENDPOINT_WEBHOOK_WAIT` equal to the form-waiting endpoint).
	 * Redirecting in that case would loop back to this same handler forever.
	 */
	private redirectToFormWaiting(req: WaitingWebhookRequest, res: express.Response): boolean {
		const location = req.originalUrl.replace(
			`/${this.endpointsConfig.webhookWaiting}/`,
			`/${this.endpointsConfig.formWaiting}/`,
		);
		if (location === req.originalUrl) {
			return false;
		}
		res.redirect(307, location);
		return true;
	}

	// TODO: fix the type here - it should be execution workflowData
	protected createWorkflow(workflowData: IWorkflowBase) {
		return new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: getWorkflowActiveStatusFromWorkflowData(workflowData),
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});
	}

	protected async getExecution(executionId: string) {
		return await this.executionPersistence.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
	}

	/**
	 * Extracts the `signature` query param and an optional webhook path
	 * appended after it (backwards compat: `?signature=token/my-suffix`).
	 */
	private parseSignatureParam(req: express.Request): {
		token: string | undefined;
		webhookPath: string | undefined;
	} {
		const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
		let token = url.searchParams.get(WAITING_TOKEN_QUERY_PARAM) ?? undefined;
		let webhookPath: string | undefined;

		// Handle backwards compat: extract webhook path if appended after the token
		// e.g., ?signature=abc123/my-suffix -> token is "abc123", webhookPath is "my-suffix"
		if (token?.includes('/')) {
			const slashIndex = token.indexOf('/');
			webhookPath = token.slice(slashIndex + 1);
			token = token.slice(0, slashIndex);
		}

		return { token, webhookPath };
	}

	/**
	 * Validates the request by comparing the provided token against the stored
	 * `resumeToken` using timing-safe comparison.
	 *
	 * Used for form and webhook waiting URLs, where the token is an opaque
	 * random value (no query params to tamper-proof).
	 */
	protected validateToken(
		req: express.Request,
		execution: IExecutionResponse,
	): { valid: boolean; webhookPath?: string } {
		const { token, webhookPath } = this.parseSignatureParam(req);
		const storedToken = execution.data.resumeToken;

		if (!token || !storedToken || token.length !== storedToken.length) {
			return { valid: false };
		}

		const valid = timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
		return { valid, webhookPath };
	}

	/**
	 * Validates the HMAC signature in the request URL.
	 *
	 * Used exclusively for send-and-wait URLs, where query params like
	 * `approved=true` must be tamper-proof.
	 */
	protected validateSignature(req: express.Request): { valid: boolean; webhookPath?: string } {
		const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
		const { token: providedSignature, webhookPath } = this.parseSignatureParam(req);

		if (!providedSignature) {
			return { valid: false };
		}

		// Restore the cleaned signature on the URL (without any appended webhook path)
		// so that `validateUrlSignature` can re-derive the expected HMAC from the full
		// URL including the node-id suffix and action params (e.g. approved=true).
		url.searchParams.set(WAITING_TOKEN_QUERY_PARAM, providedSignature);

		const valid = validateUrlSignature(
			providedSignature,
			url,
			this.instanceSettings.hmacSignatureSecret,
		);
		return { valid, webhookPath };
	}

	/**
	 * Removes the waiting token from the request's query so it never reaches
	 * the resumed node's own output data.
	 */
	private stripTokenFromRequest(req: express.Request) {
		delete req.query[WAITING_TOKEN_QUERY_PARAM];

		const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
		url.searchParams.delete(WAITING_TOKEN_QUERY_PARAM);
		req.url = `${url.pathname}${url.search}`;
	}

	async executeWebhook(
		req: WaitingWebhookRequest,
		res: express.Response,
	): Promise<IWebhookResponseCallbackData> {
		const { path: executionId } = req.params;
		let { suffix } = req.params;

		this.logReceivedWebhook(req.method, executionId);

		if (isExecutionIdV2(executionId)) {
			return await this.resumeEngineV2Execution(req, res, executionId, suffix);
		}

		sanitizeWebhookRequest(req);

		// Reset request parameters
		req.params = {} as WaitingWebhookRequest['params'];

		const execution = await this.getExecution(executionId);

		// Only validate for executions that have a resumeToken.
		// Old executions created before token validation are skipped (backwards compat).
		if (execution?.data.resumeToken) {
			const { workflowData } = execution;
			const { nodes } = this.createWorkflow(workflowData);
			// Send-and-wait node ids carried in the signature query value require HMAC validation too.
			const effectiveSuffix = suffix ?? this.parseSignatureParam(req).webhookPath;
			const isSendAndWait = this.isSendAndWaitRequest(nodes, effectiveSuffix);

			// Send-and-wait uses HMAC to protect tamper-sensitive query params (e.g. approved=true).
			// All other waiting URLs use a simple random token comparison.
			const { valid, webhookPath } = isSendAndWait
				? this.validateSignature(req)
				: this.validateToken(req, execution);

			if (!valid) {
				if (isSendAndWait) {
					applyFormSandboxCSP(res);
					res.status(401).render('form-invalid-token');
				} else {
					res.status(401).json({ error: 'Invalid token' });
				}
				return { noWebhookResponse: true };
			}
			this.stripTokenFromRequest(req);
			// Use webhook path parsed from token if not in route (backwards compat for old URL format)
			if (!suffix && webhookPath) {
				suffix = webhookPath;
			}
		}

		if (!execution) {
			throw new NotFoundError(`The execution "${executionId}" does not exist.`);
		}

		if (
			!this.includeForms &&
			this.isFormResumeExecution(execution) &&
			this.redirectToFormWaiting(req, res)
		) {
			return { noWebhookResponse: true };
		}

		if (execution.status === 'running') {
			throw new ConflictError(`The execution "${executionId}" is running already.`);
		}

		// A run parked at a node boundary is not waiting for this webhook: resuming
		// it here would hand the webhook payload to a node that never asked for it.
		if (execution.data?.waitReason === 'suspended') {
			throw new ConflictError(`The execution "${executionId}" is about to resume.`);
		}

		if (execution.data?.resultData?.error) {
			const message = `The execution "${executionId}" has finished with error.`;
			this.logger.debug(message, { error: execution.data.resultData.error });
			throw new ConflictError(message);
		}

		// oxlint-disable-next-line typescript/no-deprecated
		if (execution.finished) {
			const { workflowData } = execution;
			const { nodes } = this.createWorkflow(workflowData);
			if (this.isSendAndWaitRequest(nodes, suffix)) {
				applyFormSandboxCSP(res);
				res.render('send-and-wait-no-action-required', { isTestWebhook: false });
				return { noWebhookResponse: true };
			} else {
				throw new ConflictError(`The execution "${executionId} has finished already.`);
			}
		}

		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;

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
	 * Resumes a wait that lives on the engine v2 data plane.
	 *
	 * The data plane verifies the token and names the waiting step before node
	 * code runs. Then the node's `webhook()` runs here, as in v1, because it needs
	 * the HTTP request and response. `EngineV2Dispatcher.resume` sends its items
	 * to the data plane. The data plane holds an early request for a short time,
	 * so this route does not retry.
	 */
	protected async resumeEngineV2Execution(
		req: WaitingWebhookRequest,
		res: express.Response,
		executionId: ExecutionIdV2,
		routeSuffix: string | undefined,
	): Promise<IWebhookResponseCallbackData> {
		req.params = {} as WaitingWebhookRequest['params'];

		const { token, webhookPath } = this.parseSignatureParam(req);
		if (!token) return this.respondInvalidToken(res);

		const located = await this.dataPlane.locateResumeTarget(executionId, { token });
		if (!located.ok) {
			if (located.status === 401) return this.respondInvalidToken(res);
			throw toLocateRefusal(executionId, located.status, located.error);
		}

		this.stripTokenFromRequest(req);
		const suffix = routeSuffix ?? webhookPath;
		const { execution: snapshot, target } = located.value;

		const statusResult = this.answerEngineV2Status({ snapshot, target, suffix, req, res });
		if (statusResult) return statusResult;

		if (target === null) return this.answerEngineV2WithoutTarget(executionId, snapshot, res);

		const execution = await this.executionReader.fromSnapshot(snapshot);
		if (!execution) throw new NotFoundError(`The execution "${executionId}" does not exist.`);

		const node = execution.workflowData.nodes.find((candidate) => candidate.id === target.nodeId);
		if (!node) throw new NotFoundError('Could not find node to process webhook.');

		this.sanitizeEngineV2Request(req, node);
		seedResumingNode(execution, node);

		// A form wait reached through the webhook route: send the browser to the
		// form route, as v1 does.
		if (
			!this.includeForms &&
			this.isFormResumeExecution(execution) &&
			this.redirectToFormWaiting(req, res)
		) {
			return { noWebhookResponse: true };
		}

		applyCors(req, res);

		return await this.getWebhookExecutionData({
			execution,
			req,
			res,
			lastNodeExecuted: node.name,
			executionId,
			suffix,
			engineResume: { stepId: target.stepId, token },
		});
	}

	protected respondInvalidToken(res: express.Response): IWebhookResponseCallbackData {
		res.status(401).json({ error: 'Invalid token' });
		return { noWebhookResponse: true };
	}

	/**
	 * A request that reads the execution's state instead of resuming it. The
	 * webhook route has none. The form route overrides this for the status poll
	 * of the form page.
	 */
	protected answerEngineV2Status(_located: {
		snapshot: ExecutionSnapshot;
		target: ResumeTargetResponse['target'];
		suffix: string | undefined;
		req: WaitingWebhookRequest;
		res: express.Response;
	}): IWebhookResponseCallbackData | undefined {
		return undefined;
	}

	/**
	 * No step accepts the request. A queued, running or waiting execution answers
	 * "is running already": it has not reached its wait yet, or its wait ends
	 * only at a deadline. A completed, failed or cancelled execution answers "has
	 * finished already".
	 */
	protected answerEngineV2WithoutTarget(
		executionId: string,
		snapshot: ExecutionSnapshot,
		_res: express.Response,
	): IWebhookResponseCallbackData {
		throw new ConflictError(
			isLiveSnapshot(snapshot)
				? `The execution "${executionId}" is running already.`
				: `The execution "${executionId}" has finished already.`,
		);
	}

	/**
	 * Strips the auth cookies before node code sees the request. The form route
	 * overrides this to keep them for a node that opts in, so it runs after the
	 * data plane named the node.
	 */
	protected sanitizeEngineV2Request(req: WaitingWebhookRequest, _resumeNode: INode): void {
		sanitizeWebhookRequest(req);
	}

	private emitExecutionResumedEvent(
		execution: IExecutionResponse,
		executionId: string,
		responseAt: Date,
	) {
		this.eventService.emit('execution-resumed', {
			executionId,
			workflowId: execution.workflowData.id,
			resumeSource: 'webhook', // today, we only emit the 'execution-resumed' event for webhook wait nodes
			responseAt,
		});
	}

	protected async getWebhookExecutionData({
		execution,
		req,
		res,
		lastNodeExecuted,
		executionId,
		suffix,
		engineResume,
	}: {
		execution: IExecutionResponse;
		req: WaitingWebhookRequest;
		res: express.Response;
		lastNodeExecuted: string;
		executionId: string;
		suffix?: string;
		/** For an engine v2 execution: the wait that the resume ends on the data plane. */
		engineResume?: EngineV2ResumeRequest;
	}): Promise<IWebhookResponseCallbackData> {
		// Set the node as disabled so that the data does not get executed again as it would result
		// in starting the wait all over again
		this.disableNode(execution, req.method);

		// Remove waitTill information else the execution would stop
		execution.data.waitTill = undefined;

		// For HITL nodes, preserve inputOverride and set rewireOutputLogTo before popping run data
		const nodeExecutionStack = execution.data.executionData?.nodeExecutionStack;
		const executionStackEntry = nodeExecutionStack?.[0];
		const isHitlNode = executionStackEntry?.node?.type?.endsWith('HitlTool') ?? false;

		if (isHitlNode && executionStackEntry) {
			// Set rewireOutputLogTo on the node so output is logged with ai_tool type
			executionStackEntry.node.rewireOutputLogTo = NodeConnectionTypes.AiTool;
		}

		const runDataArray = execution.data.resultData.runData[lastNodeExecuted];
		preserveInputOverride(runDataArray);

		const { workflowData } = execution;
		const workflow = this.createWorkflow(workflowData);

		const workflowStartNode = workflow.getNode(lastNodeExecuted);
		if (workflowStartNode === null) {
			throw new NotFoundError('Could not find node to process webhook.');
		}

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflow.id,
		});
		await workflow.expression.acquireIsolate();
		try {
			const webhookData = this.webhookService
				.getNodeWebhooks(workflow, workflowStartNode, additionalData)
				.find(
					(webhook) =>
						webhook.httpMethod === req.method &&
						webhook.path === (suffix ?? '') &&
						this.isOwnRestartWebhook(webhook),
				);

			if (webhookData === undefined) {
				// If no data got found it means that the execution can not be started via a webhook.
				// Return 404 because we do not want to give any data if the execution exists or not.
				const errorMessage = `The workflow for execution "${executionId}" does not contain a waiting webhook with a matching path/method.`;

				if (this.isSendAndWaitRequest(workflow.nodes, suffix)) {
					applyFormSandboxCSP(res);
					res.render('send-and-wait-no-action-required', { isTestWebhook: false });
					return { noWebhookResponse: true };
				}

				throw new NotFoundError(errorMessage);
			}

			const runExecutionData = execution.data;

			const isWaitingForWebhook =
				!this.includeForms && !this.isSendAndWaitRequest(workflow.nodes, suffix);
			const responseAt = new Date();
			const onResume = isWaitingForWebhook
				? () => this.emitExecutionResumedEvent(execution, executionId, responseAt)
				: undefined;

			return await new Promise((resolve, reject) => {
				WebhookHelpers.executeWebhook(
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
					undefined,
					{ storedAt: execution.storedAt, onResume, engineResume },
				).catch(reject); // ensure the Promise settles even if executeWebhook throws
			});
		} finally {
			await workflow.expression.releaseIsolate();
		}
	}
}
