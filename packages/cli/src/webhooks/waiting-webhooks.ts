import { Logger } from '@n8n/backend-common';
import type { IExecutionResponse } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type express from 'express';
import { InstanceSettings, WAITING_TOKEN_QUERY_PARAM, validateUrlSignature } from 'n8n-core';
import {
	type INodes,
	type IWorkflowBase,
	NodeConnectionTypes,
	SEND_AND_WAIT_OPERATION,
	Workflow,
} from 'n8n-workflow';

import { sanitizeWebhookRequest } from './webhook-request-sanitizer';
import { WebhookService } from './webhook.service';
import type {
	IWebhookManager,
	IWebhookResponseCallbackData,
	WaitingWebhookRequest,
} from './webhook.types';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { getWorkflowActiveStatusFromWorkflowData } from '@/executions/execution.utils';
import { NodeTypes } from '@/node-types';
import { applyCors } from '@/utils/cors.util';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

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
		protected readonly instanceSettings: InstanceSettings,
	) {}

	// TODO: implement `getWebhookMethods` for CORS support

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
		return await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
	}

	/**
	 * Validates the HMAC signature in the request URL.
	 * Uses timing-safe comparison to prevent timing attacks.
	 *
	 * Backwards compatibility note:
	 * Before signatures were added, $execution.resumeUrl was just the base URL without query params.
	 * Workflows could append a webhook suffix like: `$execution.resumeUrl + '/my-suffix'`
	 *
	 * Now that $execution.resumeUrl includes `?signature=token`, appending a suffix produces:
	 *   `http://host/wait/123?signature=token/my-suffix` (malformed)
	 * instead of the correct:
	 *   `http://host/wait/123/my-suffix?signature=token`
	 *
	 * To maintain backwards compatibility, we detect when the signature contains a '/' and
	 * extract the webhook path from it, allowing both URL formats to work.
	 *
	 * Additionally, when a suffix is provided in the URL path (e.g., /n8n-execution-status),
	 * we strip it before validation since signatures are generated for the base URL only.
	 *
	 * @param req - The Express request object
	 * @param suffix - Optional URL path suffix to strip before validation (e.g., 'n8n-execution-status')
	 * @returns Object with validation result, optionally the webhook path, and the signature value
	 */
	protected validateSignature(
		req: express.Request,
		suffix?: string,
	): { valid: boolean; webhookPath?: string } {
		const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
		let providedSignature = url.searchParams.get(WAITING_TOKEN_QUERY_PARAM);
		let webhookPath: string | undefined;

		if (!providedSignature) {
			return { valid: false };
		}

		// Handle backwards compat: extract webhook path if it was appended after the signature
		// e.g., ?signature=abc123/my-suffix -> signature is "abc123", webhookPath is "my-suffix"
		if (providedSignature.includes('/')) {
			const slashIndex = providedSignature.indexOf('/');
			webhookPath = providedSignature.slice(slashIndex + 1);
			providedSignature = providedSignature.slice(0, slashIndex);
			// Update URL for validation (remove the path suffix from signature param)
			url.searchParams.set(WAITING_TOKEN_QUERY_PARAM, providedSignature);
		}

		// Strip suffix from pathname if provided, since signatures are generated for the base URL only
		// e.g., /form-waiting/123/n8n-execution-status -> /form-waiting/123
		if (suffix && url.pathname.endsWith(`/${suffix}`)) {
			url.pathname = url.pathname.slice(0, -(suffix.length + 1));
		}

		const valid = validateUrlSignature(
			providedSignature,
			url,
			this.instanceSettings.hmacSignatureSecret,
		);
		return { valid, webhookPath };
	}

	async executeWebhook(
		req: WaitingWebhookRequest,
		res: express.Response,
	): Promise<IWebhookResponseCallbackData> {
		const { path: executionId } = req.params;
		let { suffix } = req.params;

		this.logReceivedWebhook(req.method, executionId);

		sanitizeWebhookRequest(req);

		// Reset request parameters
		req.params = {} as WaitingWebhookRequest['params'];

		const execution = await this.getExecution(executionId);

		// Only validate signature for executions that have validateSignature flag set
		// This provides backwards compatibility for old executions created before signature validation
		if (execution?.data.validateSignature) {
			const { valid, webhookPath } = this.validateSignature(req);
			if (!valid) {
				const { workflowData } = execution;
				const { nodes } = this.createWorkflow(workflowData);
				if (this.isSendAndWaitRequest(nodes, suffix)) {
					res.status(401).render('form-invalid-token');
				} else {
					res.status(401).json({ error: 'Invalid signature' });
				}
				return { noWebhookResponse: true };
			}
			// Use webhook path parsed from signature if not in route (backwards compat for old URL format)
			if (!suffix && webhookPath) {
				suffix = webhookPath;
			}
		}

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

		// For HITL nodes, preserve inputOverride and set rewireOutputLogTo before popping run data
		const nodeExecutionStack = execution.data.executionData?.nodeExecutionStack;
		const executionStackEntry = nodeExecutionStack?.[0];
		const isHitlNode = executionStackEntry?.node?.type?.endsWith('HitlTool') ?? false;

		if (isHitlNode && executionStackEntry) {
			// Set rewireOutputLogTo on the node so output is logged with ai_tool type
			executionStackEntry.node.rewireOutputLogTo = NodeConnectionTypes.AiTool;
		}

		// Preserve inputOverride before popping (needed for tool nodes like HITL to show input in logs)
		const runDataArray = execution.data.resultData.runData[lastNodeExecuted];
		const entryToPop = runDataArray[runDataArray.length - 1];
		const preservedInputOverride = entryToPop?.inputOverride;

		// Remove the data of the node execution again else it will display the node as executed twice
		runDataArray.pop();

		// If we preserved inputOverride, create a placeholder entry so it can be retrieved
		// when the node resumes and the taskData is created
		if (preservedInputOverride) {
			runDataArray.push({
				startTime: 0,
				executionTime: 0,
				executionIndex: 0,
				source: entryToPop?.source ?? [],
				inputOverride: preservedInputOverride,
			});
		}

		const { workflowData } = execution;
		const workflow = this.createWorkflow(workflowData);

		const workflowStartNode = workflow.getNode(lastNodeExecuted);
		if (workflowStartNode === null) {
			throw new NotFoundError('Could not find node to process webhook.');
		}

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflow.id,
		});
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
