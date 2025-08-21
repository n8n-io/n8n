/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable id-denylist */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';
import { BinaryDataService, ErrorReporter } from 'n8n-core';
import type {
	IBinaryData,
	IDataObject,
	IDeferredPromise,
	IExecuteData,
	IN8nHttpFullResponse,
	INode,
	IPinData,
	IRunExecutionData,
	IWebhookData,
	IWebhookResponseData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	WebhookResponseMode,
	Workflow,
	WorkflowExecuteMode,
	IWorkflowExecutionDataProcess,
	IWorkflowBase,
	WebhookResponseData,
} from 'n8n-workflow';
import {
	CHAT_TRIGGER_NODE_TYPE,
	createDeferredPromise,
	ExecutionCancelledError,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	NodeOperationError,
	OperationalError,
	UnexpectedError,
	WAIT_NODE_TYPE,
} from 'n8n-workflow';
import { finished } from 'stream/promises';

import { WebhookService } from './webhook.service';
import type {
	IWebhookResponseCallbackData,
	WebhookRequest,
	WebhookNodeResponseHeaders,
	WebhookResponseHeaders,
} from './webhook.types';

import { ActiveExecutions } from '@/active-executions';
import { MCP_TRIGGER_NODE_TYPE } from '@/constants';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { parseBody } from '@/middlewares';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { WaitTracker } from '@/wait-tracker';
import { WebhookExecutionContext } from '@/webhooks/webhook-execution-context';
import { createMultiFormDataParser } from '@/webhooks/webhook-form-data';
import { extractWebhookLastNodeResponse } from '@/webhooks/webhook-last-node-response-extractor';
import { extractWebhookOnReceivedResponse } from '@/webhooks/webhook-on-received-response-extractor';
import type { WebhookResponse } from '@/webhooks/webhook-response';
import { createStaticResponse, createStreamResponse } from '@/webhooks/webhook-response';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import * as WorkflowHelpers from '@/workflow-helpers';
import { WorkflowRunner } from '@/workflow-runner';

export function handleHostedChatResponse(
	res: express.Response,
	responseMode: WebhookResponseMode,
	didSendResponse: boolean,
	executionId: string,
): boolean {
	if (responseMode === 'hostedChat' && !didSendResponse) {
		res.send({ executionStarted: true, executionId });
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
	destinationNode?: string,
	ignoreRestartWebhooks = false,
): IWebhookData[] {
	// Check all the nodes in the workflow if they have webhooks

	const returnData: IWebhookData[] = [];

	let parentNodes: string[] | undefined;
	if (destinationNode !== undefined) {
		parentNodes = workflow.getParentNodes(destinationNode);
		// Also add the destination node in case it itself is a webhook node
		parentNodes.push(destinationNode);
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
		data.responseCode = 200;
		data.data = {
			redirectURL: (data?.headers as IDataObject)?.location,
		};
		(data.headers as IDataObject).location = undefined;
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
			const binaryData = (response.body as IDataObject)?.binaryData as IBinaryData;
			if (binaryData?.id) {
				res.header(response.headers);
				const stream = await Container.get(BinaryDataService).getAsStream(binaryData.id);
				stream.pipe(res, { end: false });
				await finished(stream);
				responseCallback(null, { noWebhookResponse: true });
			} else if (Buffer.isBuffer(response.body)) {
				res.header(response.headers);
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

export function prepareExecutionData(
	executionMode: WorkflowExecuteMode,
	workflowStartNode: INode,
	webhookResultData: IWebhookResponseData,
	runExecutionData: IRunExecutionData | undefined,
	runExecutionDataMerge: object = {},
	destinationNode?: string,
	executionId?: string,
	workflowData?: IWorkflowBase,
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

	runExecutionData ??= {
		startData: {},
		resultData: {
			runData: {},
		},
		executionData: {
			contextData: {},
			nodeExecutionStack,
			waitingExecution: {},
		},
	} as IRunExecutionData;

	if (destinationNode && runExecutionData.startData) {
		runExecutionData.startData.destinationNode = destinationNode;
	}

	if (executionId !== undefined) {
		// Set the data the webhook node did return on the waiting node if executionId
		// already exists as it means that we are restarting an existing execution.
		runExecutionData.executionData!.nodeExecutionStack[0].data.main =
			webhookResultData.workflowData ?? [];
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
	destinationNode?: string,
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

	let project: Project | undefined = undefined;
	try {
		project = await Container.get(OwnershipService).getWorkflowProjectCached(workflowData.id);
	} catch (error) {
		throw new NotFoundError('Cannot find workflow');
	}

	// Prepare everything that is needed to run the workflow
	const additionalData = await WorkflowExecuteAdditionalData.getBase();

	if (executionId) {
		additionalData.executionId = executionId;
	}

	const { responseMode, responseCode, responseData } = evaluateResponseOptions(
		workflowStartNode,
		workflow,
		req,
		webhookData,
		executionMode,
		additionalKeys,
	);

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

	let didSendResponse = false;
	let runExecutionDataMerge = {};
	try {
		// Run the webhook function to see what should be returned and if
		// the workflow should be executed or not
		let webhookResultData: IWebhookResponseData;

		await parseRequestBody(req, workflowStartNode, workflow, executionMode, additionalKeys);

		// TODO: remove this hack, and make sure that execution data is properly created before the MCP trigger is executed
		if (workflowStartNode.type === MCP_TRIGGER_NODE_TYPE) {
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
				runExecutionData ||
				({
					startData: {},
					resultData: {
						runData: {},
					},
					executionData: {
						contextData: {},
						nodeExecutionStack,
						waitingExecution: {},
					},
				} as IRunExecutionData);
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
			let errorMessage = `Workflow ${webhookType} Error: Workflow could not be started!`;

			// if workflow started manually, show an actual error message
			if (err instanceof NodeOperationError && err.type === 'manual-form-test') {
				errorMessage = err.message;
			}

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

		const responseHeaders = evaluateResponseHeaders(context);

		if (!res.headersSent && responseHeaders) {
			// Only set given headers if they haven't been sent yet, e.g. for streaming
			for (const [name, value] of responseHeaders.entries()) {
				res.setHeader(name, value);
			}
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

		// Now that we know that the workflow should run we can return the default response
		// directly if responseMode it set to "onReceived" and a response should be sent
		if (responseMode === 'onReceived' && !didSendResponse) {
			const responseBody = extractWebhookOnReceivedResponse(responseData, webhookResultData);
			const webhookResponse = createStaticResponse(responseBody, responseCode, responseHeaders);
			responseCallback(null, webhookResponse);
			didSendResponse = true;
		}

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
		);
		runExecutionData = preparedRunExecutionData;

		const runData: IWorkflowExecutionDataProcess = {
			executionMode,
			executionData: runExecutionData,
			pushRef,
			workflowData,
			pinData,
			projectId: project?.id,
		};

		// When resuming from a wait node, copy over the pushRef from the execution-data
		if (!runData.pushRef) {
			runData.pushRef = runExecutionData.pushRef;
		}

		let responsePromise: IDeferredPromise<IN8nHttpFullResponse> | undefined;
		if (responseMode === 'responseNode') {
			responsePromise = createDeferredPromise<IN8nHttpFullResponse>();
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

		// Start now to run the workflow
		executionId = await Container.get(WorkflowRunner).run(
			runData,
			true,
			!didSendResponse,
			executionId,
			responsePromise,
		);

		if (responseMode === 'formPage' && !didSendResponse) {
			res.send({ formWaitingUrl: `${additionalData.formWaitingBaseUrl}/${executionId}` });
			process.nextTick(() => res.end());
			didSendResponse = true;
		}

		didSendResponse = handleHostedChatResponse(res, responseMode, didSendResponse, executionId);

		Container.get(Logger).debug(
			`Started execution of workflow "${workflow.name}" from webhook with execution ID ${executionId}`,
			{ executionId },
		);

		const activeExecutions = Container.get(ActiveExecutions);

		// Get a promise which resolves when the workflow did execute and send then response
		const executePromise = activeExecutions.getPostExecutePromise(executionId);

		const { parentExecution } = runExecutionData;
		if (parentExecution) {
			// on child execution completion, resume parent execution
			void executePromise.then(() => {
				const waitTracker = Container.get(WaitTracker);
				void waitTracker.startExecution(parentExecution.executionId);
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

					const lastNodeTaskData = WorkflowHelpers.getDataLastExecutedNodeData(runData);
					if (runData.data.resultData.error || lastNodeTaskData?.error !== undefined) {
						if (!didSendResponse) {
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
						context,
						responseData as WebhookResponseData,
						lastNodeTaskData,
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
		const error =
			e instanceof UnprocessableRequestError
				? e
				: new OperationalError('There was a problem executing the workflow', {
						cause: e,
					});
		if (didSendResponse) throw error;
		responseCallback(error, {});
		return;
	}
}

/**
 * Evaluates the response mode, code and data for a webhook node
 */
function evaluateResponseOptions(
	workflowStartNode: INode,
	workflow: Workflow,
	req: WebhookRequest,
	webhookData: IWebhookData,
	executionMode: WorkflowExecuteMode,
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
) {
	//check if response mode should be set automatically, e.g. multipage form
	const responseMode =
		autoDetectResponseMode(workflowStartNode, workflow, req.method) ??
		(workflow.expression.getSimpleParameterValue(
			workflowStartNode,
			webhookData.webhookDescription.responseMode,
			executionMode,
			additionalKeys,
			undefined,
			'onReceived',
		) as WebhookResponseMode);

	const responseCode = workflow.expression.getSimpleParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseCode as string,
		executionMode,
		additionalKeys,
		undefined,
		200,
	) as number;

	// This parameter is used for two different purposes:
	// 1. as arbitrary string input defined in the workflow in the "respond immediately" mode,
	// 2. as well as WebhookResponseData config in all the other modes
	const responseData = workflow.expression.getComplexParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseData,
		executionMode,
		additionalKeys,
		undefined,
		'firstEntryJson',
	) as WebhookResponseData | string | undefined;

	return { responseMode, responseCode, responseData };
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
		req.body = await parseFormData(req);
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
}

/**
 * Evaluates the `responseHeaders` parameter of a webhook node
 */
function evaluateResponseHeaders(context: WebhookExecutionContext): WebhookResponseHeaders {
	const headers = new Map<string, string>();

	if (context.webhookData.webhookDescription.responseHeaders === undefined) {
		return headers;
	}

	const evaluatedHeaders =
		context.evaluateComplexWebhookDescriptionExpression<WebhookNodeResponseHeaders>(
			'responseHeaders',
		);
	if (evaluatedHeaders?.entries === undefined) {
		return headers;
	}

	for (const entry of evaluatedHeaders.entries) {
		headers.set(entry.name.toLowerCase(), entry.value);
	}

	return headers;
}
