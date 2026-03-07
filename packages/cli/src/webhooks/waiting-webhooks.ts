import { Logger } from '@n8n/backend-common';
import type { IExecutionResponse } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import crypto from 'crypto';
import type express from 'express';
import {
	InstanceSettings,
	WAITING_TOKEN_QUERY_PARAM,
	prepareUrlForSigning,
	generateUrlSignature,
} from 'n8n-core';
import {
	FORM_NODE_TYPE,
	type INodes,
	type IHttpRequestMethods,
	type IWorkflowBase,
	NodeConnectionTypes,
	SEND_AND_WAIT_OPERATION,
	WAIT_NODE_TYPE,
	Workflow,
} from 'n8n-workflow';

import { sanitizeWebhookRequest } from './webhook-request-sanitizer';
import { WebhookService } from './webhook.service';
import type {
	IWebhookResponseCallbackData,
	IWebhookManager,
	WaitingWebhookRequest,
	WebhookAccessControlOptions,
} from './webhook.types';
import type { IWebhookMethodResolver } from './webhook-method-resolver.types';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { getWorkflowActiveStatusFromWorkflowData } from '@/executions/execution.utils';
import { NodeTypes } from '@/node-types';
import { applyCors } from '@/utils/cors.util';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { preserveInputOverride } from '@/workflow-helpers';

/**
 * Service for handling the execution of webhooks of Wait nodes that use the
 * [Resume On Webhook Call](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/#on-webhook-call)
 * feature.
 *
 * Implements IWebhookMethodResolver to provide explicit method resolution for CORS preflight.
 */
@Service()
export class WaitingWebhooks implements IWebhookManager, IWebhookMethodResolver {
	protected includeForms = false;

	constructor(
		protected readonly logger: Logger,
		protected readonly nodeTypes: NodeTypes,
		private readonly executionRepository: ExecutionRepository,
		private readonly webhookService: WebhookService,
		private readonly instanceSettings: InstanceSettings,
	) {}

	/**
	 * Resolves HTTP methods supported by a waiting webhook (implements IWebhookMethodResolver).
	 *
	 * Path format: `{executionId}` or `{executionId}/{suffix}`
	 * - `executionId`: The execution ID waiting for webhook resume
	 * - `suffix`: Optional webhook suffix (used when multiple wait nodes exist)
	 *
	 * **Security Contract:**
	 * - Returns empty array for invalid/missing executions (prevents information disclosure)
	 * - Returns empty array for finished/cancelled executions (no webhook can resume them)
	 * - Returns empty array for executions in invalid states (running, error, crashed)
	 * - Only returns methods for webhooks that can actually resume the execution
	 *
	 * **Why empty array instead of throwing:**
	 * - CORS preflight requests should not reveal execution existence/state
	 * - Empty methods list results in proper CORS rejection without information leak
	 * - Actual webhook execution will throw appropriate errors with proper context
	 *
	 * @param path - Webhook path (executionId or executionId/suffix)
	 * @returns Promise resolving to array of supported HTTP methods
	 */
	async resolveMethods(path: string): Promise<IHttpRequestMethods[]> {
		return this.getWebhookMethods(path);
	}

	/**
	 * Gets all HTTP methods supported by a waiting webhook for the given path.
	 *
	 * This method implements the core logic for method resolution, which is then
	 * exposed via the IWebhookMethodResolver interface.
	 *
	 * **Edge Cases Handled:**
	 * - Execution doesn't exist → [] (prevents information disclosure)
	 * - Execution finished → [] (webhook can't resume finished execution)
	 * - Execution cancelled → [] (webhook can't resume cancelled execution)
	 * - Execution running → [] (webhook can't resume running execution)
	 * - Execution errored/crashed → [] (webhook can't resume failed execution)
	 * - Invalid executionId format → [] (graceful degradation)
	 * - Node not found → [] (workflow structure changed)
	 */
	async getWebhookMethods(path: string): Promise<IHttpRequestMethods[]> {
		// Type guard: Ensure path is a non-empty string
		if (typeof path !== 'string' || path.length === 0) {
			return [];
		}

		// Parse path: format is {executionId} or {executionId}/{suffix}
		const pathParts = path.split('/');
		const executionId = pathParts[0];
		const suffix = pathParts.slice(1).join('/') || undefined;

		// Edge case: Empty or invalid executionId
		if (!executionId || executionId.trim().length === 0) {
			// Return empty array to avoid information disclosure
			return [];
		}

		try {
			const execution = await this.getExecution(executionId);

			// Edge case: Execution doesn't exist
			if (!execution) {
				// Return empty array to prevent information disclosure about execution existence
				return [];
			}

			// Edge case: Execution finished (success, error, cancelled, crashed)
			// A finished execution cannot be resumed via webhook
			if (execution.finished) {
				return [];
			}

			// Edge case: Execution is running (shouldn't happen for waiting webhooks, but handle gracefully)
			if (execution.status === 'running') {
				return [];
			}

			// Edge case: Execution has errors (crashed, error status)
			// These executions cannot be resumed via webhook
			if (execution.status === 'error' || execution.status === 'crashed' || execution.status === 'canceled') {
				return [];
			}

			// Type guard: Ensure execution has required data structure
			if (!execution.data?.resultData?.lastNodeExecuted) {
				return [];
			}

			// Type assertion: We've verified lastNodeExecuted exists above
			const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
			if (typeof lastNodeExecuted !== 'string' || lastNodeExecuted.length === 0) {
				return [];
			}
			const { workflowData } = execution;
			const workflow = this.createWorkflow(workflowData);

			// Edge case: Node that was waiting no longer exists in workflow
			// (workflow was modified after execution started)
			const workflowStartNode = workflow.getNode(lastNodeExecuted);
			if (workflowStartNode === null) {
				return [];
			}

			const additionalData = await WorkflowExecuteAdditionalData.getBase({
				workflowId: workflow.id,
			});

			const webhooks = this.webhookService.getNodeWebhooks(
				workflow,
				workflowStartNode,
				additionalData,
			);

			// Filter to only webhooks that match the path and can resume this execution
			const matchingWebhooks = webhooks.filter(
				(webhook) =>
					webhook.path === (suffix ?? '') &&
					webhook.webhookDescription.restartWebhook === true &&
					(webhook.webhookDescription.nodeType === 'form' || false) === this.includeForms,
			);

			return matchingWebhooks.map((webhook) => webhook.httpMethod);
		} catch (error) {
			// Edge case: Database errors, invalid data, etc.
			// Log for debugging but return empty array to avoid information disclosure
			this.logger.debug(`Failed to get webhook methods for path "${path}": ${error}`);
			return [];
		}
	}

	/**
	 * Finds CORS access control options for a waiting webhook.
	 *
	 * **Contract:** Always returns `{ allowedOrigins: '*' }` for waiting webhooks.
	 *
	 * **Why wildcard origins are allowed:**
	 * 1. Waiting webhook URLs are cryptographically signed and time-limited
	 * 2. Forms rendered by waiting webhooks use Content Security Policy (CSP) sandboxing
	 * 3. Forms must be submittable from any origin due to CSP restrictions
	 * 4. The security model relies on URL secrecy and signatures, not origin restrictions
	 *
	 * **Browser Preflight Behavior:**
	 * - Browsers send OPTIONS requests before POST/PUT/PATCH with custom headers
	 * - Browsers from `file://` URLs send `Origin: null` (string "null")
	 * - Browsers may omit Origin header in some edge cases
	 * - This method ensures all preflight requests succeed regardless of origin
	 *
	 * **Security Note:**
	 * - Waiting webhook URLs should be treated as secrets
	 * - URLs include HMAC signatures that prevent tampering
	 * - Origin-based restrictions would break legitimate form submissions
	 *
	 * @param _path - Execution ID path (unused, kept for interface compatibility)
	 * @param _httpMethod - HTTP method (unused, kept for interface compatibility)
	 * @returns Always returns `{ allowedOrigins: '*' }`
	 */
	async findAccessControlOptions(
		_path: string,
		_httpMethod: IHttpRequestMethods,
	): Promise<WebhookAccessControlOptions | undefined> {
		// Waiting webhooks intentionally allow all origins (*) because:
		// 1. Security is enforced via URL signatures, not origin restrictions
		// 2. Forms must work from any origin due to CSP sandbox requirements
		// 3. Browser preflight requests need to succeed regardless of origin
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

	validateSignatureInRequest(req: express.Request) {
		try {
			const actualToken = req.query[WAITING_TOKEN_QUERY_PARAM];

			if (typeof actualToken !== 'string') return false;

			// req.host is set correctly even when n8n is behind a reverse proxy
			// as long as N8N_PROXY_HOPS is set correctly
			const parsedUrl = new URL(req.url, `http://${req.host}`);
			parsedUrl.searchParams.delete(WAITING_TOKEN_QUERY_PARAM);

			const urlForSigning = prepareUrlForSigning(parsedUrl);

			const expectedToken = generateUrlSignature(
				urlForSigning,
				this.instanceSettings.hmacSignatureSecret,
			);

			const valid = crypto.timingSafeEqual(Buffer.from(actualToken), Buffer.from(expectedToken));
			return valid;
		} catch (error) {
			return false;
		}
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

		if (execution?.data.validateSignature) {
			const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
			const lastNode = execution.workflowData.nodes.find((node) => node.name === lastNodeExecuted);
			const shouldValidate = lastNode?.parameters.operation === SEND_AND_WAIT_OPERATION;

			if (shouldValidate && !this.validateSignatureInRequest(req)) {
				res.status(401).json({ error: 'Invalid token' });
				return { noWebhookResponse: true };
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
