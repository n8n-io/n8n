/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable id-denylist */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import type { Project } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise, type IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type express from 'express';
import merge from 'lodash/merge';
import {
	BinaryDataService,
	ErrorReporter,
	establishExecutionContext,
	ExecutionContextService,
	WAITING_TOKEN_QUERY_PARAM,
} from 'n8n-core';
import type {
	IBinaryData,
	IDataObject,
	IExecuteData,
	IExecuteResponsePromiseData,
	IN8nHttpFullResponse,
	INode,
	IPinData,
	IRunExecutionData,
	IWebhookData,
	IWebhookResponseData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	WebhookResponseMode,
	OAuth2FailureReason,
	OAuthResourceGrant,
	Workflow,
	WorkflowExecuteMode,
	IWorkflowExecutionDataProcess,
	IWorkflowBase,
	WebhookResponseData,
	IDestinationNode,
} from 'n8n-workflow';
import {
	CHAT_TRIGGER_NODE_TYPE,
	createRunExecutionData,
	ExecutionCancelledError,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	getExecutableNodeNames,
	MICROSOFT_AGENT365_TRIGGER_NODE_TYPE,
	NodeOperationError,
	OperationalError,
	tryToParseUrl,
	UnexpectedError,
	WAIT_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	WorkflowConfigurationError,
} from 'n8n-workflow';
import { Readable } from 'node:stream';
import { finished } from 'stream/promises';

import { ActiveExecutions } from '@/active-executions';
import { AuthService } from '@/auth/auth.service';
import { MCP_TRIGGER_NODE_TYPE } from '@/constants';
import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { parseBody } from '@/middlewares';
import { WebhookResponseRelay } from '@/scaling/webhook-response-relay';
import {
	type AuthFailureReason,
	OAuthTokenVerifierProxy,
} from '@/services/oauth-token-verifier-proxy.service';
import { OAuth2FlowProxy } from '@/services/oauth2-flow-proxy.service';
import { OwnershipService } from '@/services/ownership.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { WaitTracker } from '@/wait-tracker';
import { EXECUTION_ENDED_WITHOUT_RESPONSE } from '@/webhooks/constants';
import { WebhookExecutionContext } from '@/webhooks/webhook-execution-context';
import { createMultiFormDataParser } from '@/webhooks/webhook-form-data';
import { extractWebhookLastNodeResponse } from '@/webhooks/webhook-last-node-response-extractor';
import { extractWebhookOnReceivedResponse } from '@/webhooks/webhook-on-received-response-extractor';
import type { WebhookResponse } from '@/webhooks/webhook-response';
import { createStaticResponse, createStreamResponse } from '@/webhooks/webhook-response';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import * as WorkflowHelpers from '@/workflow-helpers';
import { WorkflowRunner } from '@/workflow-runner';

import { applySandboxCSP } from './webhook-response-headers';
import {
	WebhookResponseHeaders,
	type WebhookNodeResponseHeaders,
} from './webhook-response-headers';
import { WebhookService } from './webhook.service';
import type { IWebhookResponseCallbackData, WebhookRequest } from './webhook.types';

const deferCleanupUntilStreamEnds = (
	stream: Readable,
	res: express.Response,
	cleanup: () => Promise<void>,
) => {
	let cleanupPromise: Promise<void> | undefined;
	const cleanupOnce = async () => {
		cleanupPromise ??= cleanup();
		await cleanupPromise;
	};
	const cleanupOnClose = () => {
		stream.destroy();
		void cleanupOnce();
	};

	void finished(stream).then(cleanupOnce, cleanupOnce);
	res.once('close', cleanupOnClose);
	if (res.closed) {
		res.off('close', cleanupOnClose);
		cleanupOnClose();
	}
};

// Type guards for MCP queue mode data validation
interface McpToolCallPayload {
	toolName: string;
	arguments: Record<string, unknown>;
	sourceNodeName?: string;
}

function isMcpToolCall(value: unknown): value is McpToolCallPayload {
	return (
		typeof value === 'object' &&
		value !== null &&
		'toolName' in value &&
		typeof (value as Record<string, unknown>).toolName === 'string' &&
		'arguments' in value &&
		typeof (value as Record<string, unknown>).arguments === 'object'
	);
}

interface McpListToolsRelayPayload {
	sessionId: string;
	messageId: string;
	marker: { _listToolsRequest: boolean };
}

function isMcpListToolsRelay(value: unknown): value is McpListToolsRelayPayload {
	return (
		typeof value === 'object' &&
		value !== null &&
		'sessionId' in value &&
		typeof (value as Record<string, unknown>).sessionId === 'string' &&
		'messageId' in value &&
		typeof (value as Record<string, unknown>).messageId === 'string' &&
		'marker' in value
	);
}

export function handleHostedChatResponse(
	res: express.Response,
	responseMode: WebhookResponseMode,
	didSendResponse: boolean,
	executionId: string,
	resumeToken?: string,
): boolean {
	if (responseMode === 'hostedChat' && !didSendResponse) {
		res.send({ executionStarted: true, executionId, resumeToken });
		process.nextTick(() => res.end());
		return true;
	}

	return didSendResponse;
}

/**
 * Returns all the webhooks which should be created for the given workflow
 */
export function getWorkflowWebhooks(
	workflow: Workflow,
	additionalData: IWorkflowExecuteAdditionalData,
	destinationNode?: IDestinationNode,
	ignoreRestartWebhooks = false,
): IWebhookData[] {
	// Check all the nodes in the workflow if they have webhooks

	const returnData: IWebhookData[] = [];

	let parentNodes: string[] | undefined;
	if (destinationNode !== undefined) {
		parentNodes = workflow.getParentNodes(destinationNode.nodeName);
		// Also add the destination node in case it itself is a webhook node
		if (destinationNode.mode === 'inclusive') {
			parentNodes.push(destinationNode.nodeName);
		}
	}

	for (const node of Object.values(workflow.nodes)) {
		if (parentNodes !== undefined && !parentNodes.includes(node.name)) {
			// If parentNodes are given check only them if they have webhooks
			// and no other ones

			continue;
		}
		returnData.push.apply(
			returnData,
			Container.get(WebhookService).getNodeWebhooks(
				workflow,
				node,
				additionalData,
				ignoreRestartWebhooks,
			),
		);
	}

	return returnData;
}

const getChatResponseMode = (workflowStartNode: INode, method: string) => {
	const parameters = workflowStartNode.parameters as {
		public: boolean;
		options?: { responseMode: string };
	};

	if (workflowStartNode.type !== CHAT_TRIGGER_NODE_TYPE) return undefined;

	if (method === 'GET') return 'onReceived';

	if (method === 'POST' && parameters.options?.responseMode === 'responseNodes') {
		return 'hostedChat';
	}

	return undefined;
};

// eslint-disable-next-line complexity
export function autoDetectResponseMode(
	workflowStartNode: INode,
	workflow: Workflow,
	method: string,
): WebhookResponseMode | undefined {
	if (workflowStartNode.type === FORM_TRIGGER_NODE_TYPE && method === 'POST') {
		const connectedNodes = workflow.getChildNodes(workflowStartNode.name);

		for (const nodeName of connectedNodes) {
			const node = workflow.nodes[nodeName];

			if (node.type === WAIT_NODE_TYPE && node.parameters.resume !== 'form') {
				continue;
			}

			if ([FORM_NODE_TYPE, WAIT_NODE_TYPE].includes(node.type) && !node.disabled) {
				return 'formPage';
			}
		}
	}

	const chatResponseMode = getChatResponseMode(workflowStartNode, method);
	if (chatResponseMode) return chatResponseMode;

	// If there are form nodes connected to a current form node we're dealing with a multipage form
	// and we need to return the formPage response mode when a second page of the form gets submitted
	// to be able to show potential form errors correctly.
	if (workflowStartNode.type === FORM_NODE_TYPE && method === 'POST') {
		const connectedNodes = workflow.getChildNodes(workflowStartNode.name);

		for (const nodeName of connectedNodes) {
			const node = workflow.nodes[nodeName];

			if (node.type === FORM_NODE_TYPE && !node.disabled) {
				return 'formPage';
			}
		}
	}

	if (workflowStartNode.type === WAIT_NODE_TYPE && workflowStartNode.parameters.resume !== 'form') {
		return undefined;
	}

	if (
		workflowStartNode.type === FORM_NODE_TYPE &&
		workflowStartNode.parameters.operation === 'completion'
	) {
		return 'onReceived';
	}
	if ([FORM_NODE_TYPE, WAIT_NODE_TYPE].includes(workflowStartNode.type) && method === 'POST') {
		const connectedNodes = workflow.getChildNodes(workflowStartNode.name);

		for (const nodeName of connectedNodes) {
			const node = workflow.nodes[nodeName];

			if (node.type === WAIT_NODE_TYPE && node.parameters.resume !== 'form') {
				continue;
			}

			if ([FORM_NODE_TYPE, WAIT_NODE_TYPE].includes(node.type) && !node.disabled) {
				return 'responseNode';
			}
		}
	}

	return undefined;
}

/**
 * for formTrigger and form nodes redirection has to be handled by sending redirectURL in response body
 */
export const handleFormRedirectionCase = (
	data: IWebhookResponseCallbackData,
	workflowStartNode: INode,
) => {
	if (workflowStartNode.type === WAIT_NODE_TYPE && workflowStartNode.parameters.resume !== 'form') {
		return data;
	}

	if (
		[FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, WAIT_NODE_TYPE].includes(workflowStartNode.type) &&
		(data?.headers as IDataObject)?.location &&
		String(data?.responseCode).startsWith('3')
	) {
		const locationUrl = String((data?.headers as IDataObject)?.location);
		let validatedUrl: string | undefined;
		try {
			validatedUrl = tryToParseUrl(locationUrl);
		} catch {
			// Invalid URL, don't redirect
		}

		data.responseCode = 200;
		if (validatedUrl) {
			data.data = {
				redirectURL: validatedUrl,
			};
		}
		delete (data.headers as IDataObject).location;
	}

	return data;
};

const { formDataFileSizeMax } = Container.get(GlobalConfig).endpoints;
const parseFormData = createMultiFormDataParser(formDataFileSizeMax);

export function setupResponseNodePromise(
	responsePromise: IDeferredPromise<IN8nHttpFullResponse>,
	res: express.Response,
	responseCallback: (error: Error | null, data: IWebhookResponseCallbackData) => void,
	workflowStartNode: INode,
	executionId: string | undefined,
	workflow: Workflow,
): void {
	void responsePromise.promise
		.then(async (response: IN8nHttpFullResponse) => {
			if (response === EXECUTION_ENDED_WITHOUT_RESPONSE) {
				// The execution ended without the Respond to Webhook node running. The
				// post-execute handler answers instead, because only it knows whether the
				// execution failed.
				return;
			}

			const binaryData = (response.body as IDataObject)?.binaryData as IBinaryData;
			if (binaryData?.id) {
				if (response.statusCode) {
					res.status(response.statusCode);
				}
				WebhookResponseHeaders.fromObject(response.headers).applyToResponse(res);
				applySandboxCSP(res);
				try {
					const stream = await Container.get(BinaryDataService).getAsStream(binaryData.id);
					res.once('close', () => stream.destroy());
					stream.pipe(res, { end: false });
					await finished(stream);
				} finally {
					void Container.get(WebhookResponseRelay).deleteOffloadedBody(response, {
						workflowId: workflow.id,
						executionId,
					});
				}
				responseCallback(null, { noWebhookResponse: true });
			} else if (Buffer.isBuffer(response.body)) {
				if (response.statusCode) {
					res.status(response.statusCode);
				}
				WebhookResponseHeaders.fromObject(response.headers).applyToResponse(res);
				applySandboxCSP(res);
				res.end(response.body);
				responseCallback(null, { noWebhookResponse: true });
			} else {
				// TODO: This probably needs some more changes depending on the options on the
				//       Webhook Response node

				let data: IWebhookResponseCallbackData = {
					data: response.body as IDataObject,
					headers: response.headers,
					responseCode: response.statusCode,
				};

				data = handleFormRedirectionCase(data, workflowStartNode);

				responseCallback(null, data);
			}

			process.nextTick(() => res.end());
		})
		.catch(async (error) => {
			Container.get(ErrorReporter).error(error);
			Container.get(Logger).error(
				`Error with Webhook-Response for execution "${executionId}": "${error.message}"`,
				{ executionId, workflowId: workflow.id },
			);
			responseCallback(error, {});
		});
}

/**
 * Predicate (not an action): checks whether the start node will establish a
 * triggering-user identity from within its `webhook()` method (via
 * `context.establishTriggerIdentity`). Such nodes need their `runExecutionData`
 * created before the webhook runs, and the webhook output merged into the seeded
 * execution stack afterwards.
 *
 * The Webhook node does this only when its opt-in "n8n User Auth (OAuth2)" mode
 * (`n8nOAuth2`) is selected; the MCP / chat / Agent365 triggers always do.
 */
function shouldEstablishTriggerIdentity(workflowStartNode: INode): boolean {
	return (
		workflowStartNode.type === WEBHOOK_NODE_TYPE &&
		workflowStartNode.parameters?.authentication === 'n8nOAuth2'
	);
}

/**
 * Reconciles a pre-seeded execution stack (identity/context trigger flows) with the
 * webhook node's real output. No-op unless the start node seeded execution data.
 *
 * - MCP / chat / Agent365 (single-output triggers): index-merge the webhook output
 *   into the seeded item so seeded input data is preserved.
 * - n8n Identity webhook: the identity was already established from the seeded
 *   placeholder during the node's `webhook()` call (credentials now live on
 *   `executionData.runtimeData`, a sibling that survives the reassignment). Replace
 *   the seeded stack with the real output instead of index-merging — a naive merge
 *   keeps the empty placeholder in output slot 0 and would spuriously fire that
 *   branch on multi-method webhooks.
 */
function reconcileSeededExecutionStack(
	workflowStartNode: INode,
	runExecutionData: IRunExecutionData | undefined,
	nodeExecutionStack: IExecuteData[],
): void {
	const executionData = runExecutionData?.executionData;
	if (!executionData?.nodeExecutionStack) return;

	if (
		[MCP_TRIGGER_NODE_TYPE, MICROSOFT_AGENT365_TRIGGER_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE].includes(
			workflowStartNode.type,
		)
	) {
		merge(executionData.nodeExecutionStack, nodeExecutionStack);
	} else if (shouldEstablishTriggerIdentity(workflowStartNode)) {
		executionData.nodeExecutionStack = nodeExecutionStack;
	}
}

export function prepareExecutionData(
	executionMode: WorkflowExecuteMode,
	workflowStartNode: INode,
	webhookResultData: IWebhookResponseData,
	runExecutionData: IRunExecutionData | undefined,
	runExecutionDataMerge: object = {},
	destinationNode?: IDestinationNode,
	executionId?: string,
	workflowData?: IWorkflowBase,
	userId?: string,
): { runExecutionData: IRunExecutionData; pinData: IPinData | undefined } {
	// Initialize the data of the webhook node
	const nodeExecutionStack: IExecuteData[] = [
		{
			node: workflowStartNode,
			data: {
				main: webhookResultData.workflowData ?? [],
			},
			source: null,
		},
	];

	reconcileSeededExecutionStack(workflowStartNode, runExecutionData, nodeExecutionStack);

	runExecutionData ??= createRunExecutionData({
		executionData: {
			nodeExecutionStack,
		},
		...(executionMode === 'manual' && userId ? { manualData: { userId } } : {}),
	});

	if (destinationNode && runExecutionData.startData) {
		runExecutionData.startData.destinationNode = destinationNode;
	}

	if (executionId !== undefined) {
		// Set the data the webhook node did return on the waiting node if executionId
		// already exists as it means that we are restarting an existing execution.
		// The resuming node is flagged as disabled to stop the wait from starting over,
		// so mark it to forward every output branch (not just the first). Otherwise items
		// routed to outputs other than 0 are silently dropped.
		// See https://github.com/n8n-io/n8n/issues/12823
		const resumingNodeExecutionData = runExecutionData.executionData!.nodeExecutionStack[0];
		resumingNodeExecutionData.data.main = webhookResultData.workflowData ?? [];
		resumingNodeExecutionData.metadata = {
			...resumingNodeExecutionData.metadata,
			forwardAllOutputs: true,
		};
	}

	if (Object.keys(runExecutionDataMerge).length !== 0) {
		// If data to merge got defined add it to the execution data
		Object.assign(runExecutionData, runExecutionDataMerge);
	}

	let pinData: IPinData | undefined;
	const usePinData = ['manual', 'evaluation'].includes(executionMode);
	if (usePinData) {
		pinData = workflowData?.pinData;
		runExecutionData.resultData.pinData = pinData;
	}

	return { runExecutionData, pinData };
}

/**
 * Executes a webhook
 */
// eslint-disable-next-line complexity
export async function executeWebhook(
	workflow: Workflow,
	webhookData: IWebhookData,
	workflowData: IWorkflowBase,
	workflowStartNode: INode,
	executionMode: WorkflowExecuteMode,
	pushRef: string | undefined,
	runExecutionData: IRunExecutionData | undefined,
	executionId: string | undefined,
	req: WebhookRequest,
	res: express.Response,
	responseCallback: (
		error: Error | null,
		data: IWebhookResponseCallbackData | WebhookResponse,
	) => void,
	destinationNode?: IDestinationNode,
	options?: {
		/**
		 * Identity of the builder who registered this test webhook, for a manual run that
		 * had to wait for a webhook and so never reached the point where a manual
		 * execution normally picks its identity up from the auth cookie. Only a fallback:
		 * a node that establishes its own carrier below still wins.
		 */
		encryptedRunnerIdentity?: string;
	},
): Promise<string | undefined> {
	// Get the nodeType to know which responseMode is set
	const nodeType = workflow.nodeTypes.getByNameAndVersion(
		workflowStartNode.type,
		workflowStartNode.typeVersion,
	);

	const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
		$executionId: executionId,
	};

	const context = new WebhookExecutionContext(
		workflow,
		workflowStartNode,
		webhookData,
		executionMode,
		additionalKeys,
	);

	let project: Project;
	try {
		project = await Container.get(OwnershipService).getWorkflowProjectCached(workflowData.id);
	} catch (error) {
		throw new NotFoundError('Cannot find workflow');
	}

	// Prepare everything that is needed to run the workflow
	const additionalData = await WorkflowExecuteAdditionalData.getBase({
		projectId: project?.id,
	});

	// Guarded: an absent carrier must not clobber one set elsewhere.
	if (options?.encryptedRunnerIdentity) {
		additionalData.encryptedRunnerIdentity = options.encryptedRunnerIdentity;
	}

	if (executionId) {
		additionalData.executionId = executionId;
	}

	const {
		responseMode,
		responseCode,
		responseData,
		checkAllMainOutputs,
		responsePropertyName,
		responseContentType,
		responseBinaryPropertyName,
	} = evaluateResponseOptions(context, req);

	if (
		!['onReceived', 'lastNode', 'responseNode', 'formPage', 'streaming', 'hostedChat'].includes(
			responseMode,
		)
	) {
		// If the mode is not known we error. Is probably best like that instead of using
		// the default that people know as early as possible (probably already testing phase)
		// that something does not resolve properly.
		const errorMessage = `The response mode '${responseMode}' is not valid!`;
		responseCallback(new UnexpectedError(errorMessage), {});
		throw new InternalServerError(errorMessage);
	}

	// Add the Response and Request so that this data can be accessed in the node
	additionalData.httpRequest = req;
	additionalData.httpResponse = res;

	const authService = Container.get(AuthService);
	additionalData.validateCookieAuth = async (token: string) => {
		const user = await authService.validateCookieToken(token);
		return {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
		};
	};

	additionalData.getUserById = async (id: string) => {
		const user = await Container.get(UserRepository).findByIdWithRole(id);
		if (!user) return undefined;
		return {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
		};
	};

	const translateAuthFailureReason = (reason?: AuthFailureReason): OAuth2FailureReason => {
		switch (reason) {
			case 'verifier_not_registered':
			case 'unknown_error':
				return 'verifier_unavailable';
			case 'insufficient_scope':
				return 'insufficient_scope';
			default:
				return 'invalid_token';
		}
	};

	additionalData.beginN8nOAuth2Flow = async (
		resourceUrl: string,
		metadata?: Record<string, string>,
	) => await Container.get(OAuth2FlowProxy).begin(resourceUrl, metadata);

	additionalData.completeN8nOAuth2Flow = async (code: string, state: string) =>
		await Container.get(OAuth2FlowProxy).complete(code, state);

	additionalData.refreshN8nOAuth2Flow = async (refreshToken: string, resourceUrl: string) =>
		await Container.get(OAuth2FlowProxy).refreshVirtualClientToken(refreshToken, resourceUrl);

	// Captured here so `establishTriggerIdentity` seals the gate that admitted this
	// request, instead of resolving the resource a second time.
	let admittedBy: { resource: string; grant?: OAuthResourceGrant } | undefined;

	additionalData.validateN8nOAuth2Token = async (token: string, resourceUrl: string) => {
		const oauthTokenVerifierProxy = Container.get(OAuthTokenVerifierProxy);
		const result = await oauthTokenVerifierProxy.verifyOAuthAccessToken(token, resourceUrl);
		if (result.user) {
			admittedBy = { resource: resourceUrl, grant: result.grant };
			return {
				valid: true,
				user: {
					id: result.user.id,
					email: result.user.email,
					firstName: result.user.firstName,
					lastName: result.user.lastName,
				},
			};
		}

		return {
			valid: false,
			reason: translateAuthFailureReason(result.context?.reason),
		};
	};

	additionalData.establishTriggerIdentity = async (
		token: string,
		resource: string,
		subject?: string,
	) => {
		// The run re-verifies this token after the trigger stops listening, so it carries
		// the gate with it. Fall back to a lookup for callers that establish an identity
		// without going through `validateN8nOAuth2Token`.
		const grant =
			admittedBy?.resource === resource
				? admittedBy.grant
				: (await Container.get(ProtectedResourceRegistry).getByResourceUrl(resource))?.getGrant?.();

		if (!grant) {
			// Not fatal now, but this is the state a queued or parked run later fails in.
			Container.get(Logger).warn(
				'Established a trigger identity without a resource grant; this run will depend on the protected resource still resolving',
				{ workflowId: workflow.id, resource },
			);
		}

		additionalData.encryptedRunnerIdentity = await Container.get(
			ExecutionContextService,
		).buildTriggerIdentityCredentials(token, resource, grant, subject);
		if (runExecutionData) {
			await establishExecutionContext(workflow, runExecutionData, additionalData, executionMode);
		}
	};

	// Eager pre-execution credential-status gate. Uses the execution context that
	// `establishTriggerIdentity` already established (the triggering user's identity),
	// so the check runs on the request-handling main, before any enqueue. Returns
	// `undefined` when the dynamic-credentials module is disabled or no identity was
	// established, in which case the caller proceeds to execute normally.
	additionalData.checkTriggerCredentialStatus = async () => {
		const credentialCheckProxy = additionalData['dynamic-credentials']?.credentialCheckProxy;

		if (!credentialCheckProxy || !workflow.id) {
			return undefined;
		}
		const executionContext =
			runExecutionData?.executionData?.runtimeData ??
			(additionalData.encryptedRunnerIdentity
				? {
						credentials: additionalData.encryptedRunnerIdentity,
					}
				: undefined);

		if (!executionContext) {
			return undefined;
		}

		if (!executionContext.credentials) {
			return undefined;
		}

		// Check only the nodes the firing trigger can actually reach, taken from THIS
		// executing workflow so the check is pinned to the running version (not a
		// diverging draft re-read from the DB). A disjoint branch or a second trigger's
		// chain isn't reachable, so it never demands accounts this run won't use.
		const rootNodes = [
			...getExecutableNodeNames(
				workflow.connectionsBySourceNode,
				workflow.connectionsByDestinationNode,
				workflowStartNode.name,
			),
		]
			.map((nodeName) => workflow.nodes[nodeName])
			.filter((node): node is INode => node !== undefined);

		return await credentialCheckProxy.checkCredentialStatus(workflow.id, executionContext, {
			rootNodes,
		});
	};

	let didSendResponse = false;
	let runExecutionDataMerge = {};
	let cleanupMultipartFiles: (() => Promise<void>) | undefined;
	try {
		// Run the webhook function to see what should be returned and if
		// the workflow should be executed or not
		let webhookResultData: IWebhookResponseData;

		cleanupMultipartFiles = await parseRequestBody(
			req,
			workflowStartNode,
			workflow,
			executionMode,
			additionalKeys,
		);

		// TODO: remove this hack, and make sure that execution data is properly created before the MCP trigger is executed
		if (
			[
				MCP_TRIGGER_NODE_TYPE,
				MICROSOFT_AGENT365_TRIGGER_NODE_TYPE,
				CHAT_TRIGGER_NODE_TYPE,
			].includes(workflowStartNode.type) ||
			shouldEstablishTriggerIdentity(workflowStartNode)
		) {
			// Initialize the data of the webhook node
			const nodeExecutionStack: IExecuteData[] = [];
			nodeExecutionStack.push({
				node: workflowStartNode,
				data: {
					main: [],
				},
				source: null,
			});
			runExecutionData =
				runExecutionData ??
				createRunExecutionData({
					executionData: {
						nodeExecutionStack,
					},
					...(executionMode === 'manual' && webhookData.userId
						? { manualData: { userId: webhookData.userId } }
						: {}),
				});
		}

		try {
			webhookResultData = await Container.get(WebhookService).runWebhook(
				workflow,
				webhookData,
				workflowStartNode,
				additionalData,
				executionMode,
				runExecutionData ?? null,
			);
			Container.get(WorkflowStatisticsService).emit('nodeFetchedData', {
				workflowId: workflow.id,
				node: workflowStartNode,
			});
		} catch (err) {
			// Send error response to webhook caller
			const webhookType = ['formTrigger', 'form'].includes(nodeType.description.name)
				? 'Form'
				: 'Webhook';
			const errorMessage = _privateGetWebhookErrorMessage(err, webhookType);

			Container.get(ErrorReporter).error(err, {
				extra: {
					nodeName: workflowStartNode.name,
					nodeType: workflowStartNode.type,
					nodeVersion: workflowStartNode.typeVersion,
					workflowId: workflow.id,
				},
			});

			responseCallback(new UnexpectedError(errorMessage), {});
			didSendResponse = true;

			// Add error to execution data that it can be logged and send to Editor-UI
			runExecutionDataMerge = {
				resultData: {
					runData: {},
					lastNodeExecuted: workflowStartNode.name,
					error: {
						...err,
						message: err.message,
						stack: err.stack,
					},
				},
			};

			webhookResultData = {
				noWebhookResponse: true,
				// Add empty data that it at least tries to "execute" the webhook
				// which then so gets the chance to throw the error.
				workflowData: [[{ json: {} }]],
			};
		}

		if (cleanupMultipartFiles && webhookResultData.webhookResponse instanceof Readable) {
			deferCleanupUntilStreamEnds(webhookResultData.webhookResponse, res, cleanupMultipartFiles);
		} else {
			await cleanupMultipartFiles?.();
		}
		cleanupMultipartFiles = undefined;

		const responseHeaders = evaluateResponseHeaders(context);

		if (!res.headersSent && responseHeaders) {
			// Only set given headers if they haven't been sent yet, e.g. for streaming
			responseHeaders.applyToResponse(res);
		}

		if (webhookResultData.noWebhookResponse === true && !didSendResponse) {
			// The response got already send
			responseCallback(null, {
				noWebhookResponse: true,
			});
			didSendResponse = true;
		}

		if (webhookResultData.workflowData === undefined) {
			// Workflow should not run
			if (webhookResultData.webhookResponse !== undefined) {
				// Data to respond with is given
				if (!didSendResponse) {
					responseCallback(null, {
						data: webhookResultData.webhookResponse,
						responseCode,
					});
					didSendResponse = true;
				}
			} else {
				// Send default response

				if (!didSendResponse) {
					responseCallback(null, {
						data: {
							message: 'Webhook call received',
						},
						responseCode,
					});
					didSendResponse = true;
				}
			}
			return;
		}

		// Reactive credential-status gate. Runs only once we know the workflow will
		// execute (workflowData is defined), so a falsy "Only Run If" short-circuits
		// above without surfacing a misleading 428. Once the webhook node has established
		// the triggering user's identity (n8nOAuth2 mode), block the run if any of that
		// user's resolvable (private) credentials are still unconnected, responding
		// 428 Precondition Required with the missing-credential list and a signed
		// connect link for each.
		if (!didSendResponse && !res.headersSent && shouldEstablishTriggerIdentity(workflowStartNode)) {
			const credentialGate = await additionalData.checkTriggerCredentialStatus?.();
			if (credentialGate && !credentialGate.readyToExecute) {
				responseCallback(null, {
					data: credentialGate,
					responseCode: 428,
				});
				didSendResponse = true;
				return;
			}
		}

		// For "onReceived" mode, we need to defer response sending until after the execution
		// is created, so that `$execution.id` is available in response data expressions.
		const shouldDeferOnReceivedResponse = responseMode === 'onReceived' && !didSendResponse;

		// Prepare execution data
		const { runExecutionData: preparedRunExecutionData, pinData } = prepareExecutionData(
			executionMode,
			workflowStartNode,
			webhookResultData,
			runExecutionData,
			runExecutionDataMerge,
			destinationNode,
			executionId,
			workflowData,
			webhookData.userId,
		);
		runExecutionData = preparedRunExecutionData;

		const runData: IWorkflowExecutionDataProcess = {
			executionMode,
			executionData: runExecutionData,
			pushRef,
			workflowData,
			pinData,
			projectId: project?.id,
			projectName: project?.name,
			userId: webhookData.userId,
			encryptedRunnerIdentity: additionalData.encryptedRunnerIdentity,
		};

		// When resuming from a wait node, copy over the pushRef from the execution-data
		if (!runData.pushRef) {
			runData.pushRef = runExecutionData.pushRef;
		}

		const executionsConfig = Container.get(ExecutionsConfig);
		if (workflowStartNode.type === MCP_TRIGGER_NODE_TYPE && executionsConfig.mode === 'queue') {
			const querySessionId = req.query?.sessionId;
			const headerSessionId = req.headers['mcp-session-id'];
			const mcpSessionId =
				typeof querySessionId === 'string'
					? querySessionId
					: typeof headerSessionId === 'string'
						? headerSessionId
						: '';

			const firstItem = webhookResultData.workflowData?.[0]?.[0];
			const mcpMessageId =
				(firstItem && 'json' in firstItem && typeof firstItem.json?.mcpMessageId === 'string'
					? firstItem.json.mcpMessageId
					: null) ?? `mcp-trigger-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

			runData.isMcpExecution = true;
			runData.mcpType = 'trigger';
			runData.mcpSessionId = mcpSessionId;
			runData.mcpMessageId = mcpMessageId;

			const mcpToolCallValue =
				firstItem && 'json' in firstItem ? firstItem.json?.mcpToolCall : null;
			if (isMcpToolCall(mcpToolCallValue)) {
				runData.mcpToolCall = mcpToolCallValue;
			}

			// The worker has no access to the request, so carry the node input the trigger built
			runData.mcpToolInput = webhookResultData.toolInput;

			// Handle MCP list tools relay - forward to main with SSE transport via pub/sub
			const mcpListToolsRelayValue =
				firstItem && 'json' in firstItem ? firstItem.json?.mcpListToolsRelay : null;
			if (isMcpListToolsRelay(mcpListToolsRelayValue)) {
				const { Publisher } = await import('@/scaling/pubsub/publisher.service.js');
				const publisher = Container.get(Publisher);
				await publisher.publishMcpRelay({
					sessionId: mcpListToolsRelayValue.sessionId,
					messageId: mcpListToolsRelayValue.messageId,
					response: mcpListToolsRelayValue.marker,
				});
				// Don't run workflow - the relay will be handled by the main with the transport
				// Return undefined since no execution is started
				return undefined;
			}
		}

		let responsePromise: IDeferredPromise<IN8nHttpFullResponse> | undefined;
		if (responseMode === 'responseNode') {
			responsePromise = createDeferredPromise<IN8nHttpFullResponse>();
			// Mark the request as answered as soon as the node produces a response, before
			// `setupResponseNodePromise` starts writing it. Streaming offloaded binary data
			// takes time, and a node failing during that wait must not answer a second time.
			void responsePromise.promise.then(
				(response) => {
					if (response !== EXECUTION_ENDED_WITHOUT_RESPONSE) didSendResponse = true;
				},
				() => {
					didSendResponse = true;
				},
			);
			setupResponseNodePromise(
				responsePromise,
				res,
				responseCallback,
				workflowStartNode,
				executionId,
				workflow,
			);
		}

		if (responseMode === 'streaming') {
			Container.get(Logger).debug(
				`Execution of workflow "${workflow.name}" from with ID ${executionId} is set to streaming`,
				{ executionId },
			);
			// TODO: Add check for streaming nodes here
			runData.httpResponse = res;
			runData.streamingEnabled = true;
			didSendResponse = true;
		}

		// Extract W3C trace context from webhook headers for OTEL propagation.
		const traceparent = req.headers.traceparent;
		if (
			typeof traceparent === 'string' &&
			/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/.test(traceparent)
		) {
			const tracestate = req.headers.tracestate;
			runData.tracingContext = {
				traceparent,
				tracestate:
					typeof tracestate === 'string' && tracestate.length <= 512 ? tracestate : undefined,
			};
		}

		// Start now to run the workflow
		executionId = await Container.get(WorkflowRunner).run(
			runData,
			true,
			!didSendResponse && !shouldDeferOnReceivedResponse,
			// An execution id here means we are resuming one that is waiting on this webhook
			executionId ? { executionId, expectedStatus: 'waiting' } : undefined,
			responsePromise as IDeferredPromise<IExecuteResponsePromiseData> | undefined,
		);

		/**
		 * We track the webhook response mode so that `WorkflowRunner` can decide whether it
		 * needs to fetch full execution data from the DB when a job finishes in scaling mdoe.
		 */
		Container.get(ActiveExecutions).setResponseMode(executionId, responseMode);

		if (shouldDeferOnReceivedResponse) {
			additionalKeys.$executionId = executionId;
			additionalKeys.$execution = {
				id: executionId,
				mode: executionMode === 'manual' ? 'test' : 'production',
				resumeUrl: `${additionalData.webhookWaitingBaseUrl}/${executionId}`,
				resumeFormUrl: `${additionalData.formWaitingBaseUrl}/${executionId}`,
			};
			const evaluatedResponseData = context.evaluateComplexWebhookDescriptionExpression<string>(
				'responseData',
				undefined,
				'firstEntryJson',
			);

			const responseBody = extractWebhookOnReceivedResponse(
				evaluatedResponseData,
				webhookResultData,
			);
			const webhookResponse = createStaticResponse(responseBody, responseCode, responseHeaders);
			responseCallback(null, webhookResponse);
			didSendResponse = true;
		}

		Container.get(EventService).emit('workflow-executed', {
			workflowId: workflowData.id,
			workflowName: workflowData.name,
			executionId,
			projectId: project.id,
			projectName: project.name,
			source: 'webhook',
		});

		if (responseMode === 'formPage' && !didSendResponse) {
			const formUrl = new URL(`${additionalData.formWaitingBaseUrl}/${executionId}`);
			if (runExecutionData.resumeToken) {
				formUrl.searchParams.set(WAITING_TOKEN_QUERY_PARAM, runExecutionData.resumeToken);
			}
			res.send({ formWaitingUrl: formUrl.toString() });
			process.nextTick(() => res.end());
			didSendResponse = true;
		}

		didSendResponse = handleHostedChatResponse(
			res,
			responseMode,
			didSendResponse,
			executionId,
			runExecutionData?.resumeToken,
		);

		Container.get(Logger).debug(
			`Started execution of workflow "${workflow.name}" from webhook with execution ID ${executionId}`,
			{ executionId },
		);

		const activeExecutions = Container.get(ActiveExecutions);

		// Get a promise which resolves when the workflow did execute and send then response
		const executePromise = activeExecutions.getPostExecutePromise(executionId);

		const { parentExecution } = runExecutionData;
		if (WorkflowHelpers.shouldRestartParentExecution(parentExecution)) {
			// on child execution completion, resume parent execution
			void Container.get(WaitTracker).resumeParentExecution(parentExecution, executePromise, {
				executionId,
				workflowId: workflowData.id,
			});
		}

		if (!didSendResponse) {
			executePromise
				.then(async (runData) => {
					if (runData === undefined) {
						if (!didSendResponse) {
							responseCallback(null, {
								data: {
									message: 'Workflow executed successfully but no data was returned',
								},
								responseCode,
							});
							didSendResponse = true;
						}
						return undefined;
					}

					if (pinData) {
						runData.data.resultData.pinData = pinData;
					}

					const lastNodeTaskData = WorkflowHelpers.getLastExecutedNodeData(runData);
					if (runData.data.resultData.error || lastNodeTaskData?.error !== undefined) {
						if (!didSendResponse) {
							// The node that failed is not named in the response, so log it here:
							// this is the only channel where naming it is safe.
							Container.get(Logger).warn('Webhook execution failed before a response was sent', {
								executionId,
								workflowId: workflowData.id,
								responseMode,
								lastNodeExecuted: runData.data.resultData.lastNodeExecuted,
							});
							responseCallback(null, {
								data: {
									message: 'Error in workflow',
								},
								responseCode: 500,
							});
						}
						didSendResponse = true;
						return runData;
					}

					// in `responseNode` mode `responseCallback` is called by `responsePromise`
					if (responseMode === 'responseNode' && responsePromise) {
						await Promise.allSettled([responsePromise.promise]);
						if (!didSendResponse) {
							// The execution succeeded but never reached the Respond to Webhook node,
							// so answer here rather than leaving the caller waiting.
							responseCallback(null, { data: undefined, responseCode });
							didSendResponse = true;
						}
						return undefined;
					}

					if (lastNodeTaskData === undefined) {
						if (!didSendResponse) {
							responseCallback(null, {
								data: {
									message:
										'Workflow executed successfully but the last node did not return any data',
								},
								responseCode,
							});
						}
						didSendResponse = true;
						return runData;
					}

					if (didSendResponse) {
						return runData;
					}

					const result = await extractWebhookLastNodeResponse(
						responseData as WebhookResponseData,
						lastNodeTaskData,
						checkAllMainOutputs,
						{ responsePropertyName, responseContentType, responseBinaryPropertyName },
					);

					if (!result.ok) {
						responseCallback(result.error, {});
						didSendResponse = true;
						return runData;
					}

					const response = result.result;
					// Apply potential content-type override
					if (response.contentType) {
						responseHeaders.set('content-type', response.contentType);
					}

					responseCallback(
						null,
						response.type === 'static'
							? createStaticResponse(response.body, responseCode, responseHeaders)
							: createStreamResponse(response.stream, responseCode, responseHeaders),
					);
					didSendResponse = true;
					return runData;
				})
				.catch((e) => {
					Container.get(ErrorReporter).error(e, { executionId });

					if (!didSendResponse) {
						responseCallback(
							new OperationalError('There was a problem executing the workflow', {
								cause: e,
							}),
							{},
						);
					}

					const internalServerError = new InternalServerError(e.message, e);
					if (e instanceof ExecutionCancelledError) internalServerError.level = 'warning';
					throw internalServerError;
				});
		}
		return executionId;
	} catch (e) {
		let error: Error;
		if (e instanceof ResponseError && e.httpStatusCode < 500) {
			error = e;
		} else {
			Container.get(ErrorReporter).error(e, { executionId });
			error = new OperationalError('There was a problem executing the workflow', { cause: e });
		}
		if (didSendResponse) throw error;
		responseCallback(error, {});
		return;
	} finally {
		await cleanupMultipartFiles?.();
	}
}

/**
 * Evaluates the response mode, code and data for a webhook node
 */
function evaluateResponseOptions(context: WebhookExecutionContext, req: WebhookRequest) {
	const { workflow, workflowStartNode } = context;

	//check if response mode should be set automatically, e.g. multipage form
	const responseMode =
		autoDetectResponseMode(workflowStartNode, workflow, req.method) ??
		context.evaluateSimpleWebhookDescriptionExpression<WebhookResponseMode>(
			'responseMode',
			undefined,
			'onReceived',
		)!;

	const responseCode = context.evaluateSimpleWebhookDescriptionExpression<number>(
		'responseCode',
		undefined,
		200,
	)!;

	// This parameter is used for two different purposes:
	// 1. as arbitrary string input defined in the workflow in the "respond immediately" mode,
	// 2. as well as WebhookResponseData config in all the other modes
	const responseData = context.evaluateComplexWebhookDescriptionExpression<
		WebhookResponseData | string
	>('responseData', undefined, 'firstEntryJson');

	// This is needed for backward compatibility, where only the first main output was checked for data.
	// We want to keep existing behavior for webhooks, but change for chat triggers, where checking all main outputs makes more sense.
	// We can unify the behavior in the next major release and get rid of this flag
	const checkAllMainOutputs = workflowStartNode.type === CHAT_TRIGGER_NODE_TYPE;

	const responsePropertyName =
		context.evaluateSimpleWebhookDescriptionExpression<string>('responsePropertyName');

	const responseContentType =
		context.evaluateSimpleWebhookDescriptionExpression<string>('responseContentType');

	const responseBinaryPropertyName = context.evaluateSimpleWebhookDescriptionExpression<string>(
		'responseBinaryPropertyName',
		undefined,
		'data',
	);

	return {
		responseMode,
		responseCode,
		responseData,
		checkAllMainOutputs,
		responsePropertyName,
		responseContentType,
		responseBinaryPropertyName,
	};
}

/**
 * Parses the request body (form, xml, json, form-urlencoded, etc.) if needed
 * into the `req.body` property.
 */
async function parseRequestBody(
	req: WebhookRequest,
	workflowStartNode: INode,
	workflow: Workflow,
	executionMode: WorkflowExecuteMode,
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
) {
	let binaryData: string | number | boolean | unknown[] | undefined;

	const nodeVersion = workflowStartNode.typeVersion;
	if (nodeVersion === 1) {
		// binaryData option is removed in versions higher than 1
		binaryData = workflow.expression.getSimpleParameterValue(
			workflowStartNode,
			'={{$parameter["options"]["binaryData"]}}',
			executionMode,
			additionalKeys,
			undefined,
			false,
		);
	}

	// if `Webhook` or `Wait` node, and binaryData is enabled, skip pre-parse the request-body
	// always falsy for versions higher than 1
	if (binaryData) {
		return;
	}

	const { contentType } = req;
	if (contentType === 'multipart/form-data') {
		const { body, cleanup } = await parseFormData(req);
		req.body = body;
		return cleanup;
	} else {
		if (nodeVersion > 1) {
			if (
				contentType?.startsWith('application/json') ||
				contentType?.startsWith('text/plain') ||
				contentType?.startsWith('application/x-www-form-urlencoded') ||
				contentType?.endsWith('/xml') ||
				contentType?.endsWith('+xml')
			) {
				await parseBody(req);
			}
		} else {
			await parseBody(req);
		}
	}

	return undefined;
}

/**
 * Evaluates the `responseHeaders` parameter of a webhook node
 */
function evaluateResponseHeaders(context: WebhookExecutionContext): WebhookResponseHeaders {
	const headers = new WebhookResponseHeaders();

	if (context.webhookData.webhookDescription.responseHeaders === undefined) {
		return headers;
	}

	const evaluatedHeaders =
		context.evaluateComplexWebhookDescriptionExpression<WebhookNodeResponseHeaders>(
			'responseHeaders',
		);
	if (evaluatedHeaders) {
		headers.addFromNodeHeaders(evaluatedHeaders);
	}

	return headers;
}

/**
 * Either return the original message, or a generic one if we don't want to surface the underlying cause.
 *
 * ONLY EXPORTED FOR TESTING.
 *
 * @param err the error being handled
 */
export function _privateGetWebhookErrorMessage(
	err: unknown,
	webhookType: 'Form' | 'Webhook',
): string {
	// if workflow started manually, show an actual error message
	if (err instanceof NodeOperationError && err.type === 'manual-form-test') {
		return err.message;
	}
	// if the error relates to a configuration error on the workflow, surface it
	if (err instanceof WorkflowConfigurationError) {
		return err.message;
	}
	return `Workflow ${webhookType} Error: Workflow could not be started!`;
}
