'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
exports.handleFormRedirectionCase = void 0;
exports.handleHostedChatResponse = handleHostedChatResponse;
exports.getWorkflowWebhooks = getWorkflowWebhooks;
exports.autoDetectResponseMode = autoDetectResponseMode;
exports.setupResponseNodePromise = setupResponseNodePromise;
exports.prepareExecutionData = prepareExecutionData;
exports.executeWebhook = executeWebhook;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const promises_1 = require('stream/promises');
const active_executions_1 = require('@/active-executions');
const constants_1 = require('@/constants');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const unprocessable_error_1 = require('@/errors/response-errors/unprocessable.error');
const middlewares_1 = require('@/middlewares');
const ownership_service_1 = require('@/services/ownership.service');
const workflow_statistics_service_1 = require('@/services/workflow-statistics.service');
const wait_tracker_1 = require('@/wait-tracker');
const webhook_execution_context_1 = require('@/webhooks/webhook-execution-context');
const webhook_form_data_1 = require('@/webhooks/webhook-form-data');
const webhook_last_node_response_extractor_1 = require('@/webhooks/webhook-last-node-response-extractor');
const webhook_on_received_response_extractor_1 = require('@/webhooks/webhook-on-received-response-extractor');
const webhook_response_1 = require('@/webhooks/webhook-response');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const WorkflowHelpers = __importStar(require('@/workflow-helpers'));
const workflow_runner_1 = require('@/workflow-runner');
const webhook_service_1 = require('./webhook.service');
function handleHostedChatResponse(res, responseMode, didSendResponse, executionId) {
	if (responseMode === 'hostedChat' && !didSendResponse) {
		res.send({ executionStarted: true, executionId });
		process.nextTick(() => res.end());
		return true;
	}
	return didSendResponse;
}
function getWorkflowWebhooks(
	workflow,
	additionalData,
	destinationNode,
	ignoreRestartWebhooks = false,
) {
	const returnData = [];
	let parentNodes;
	if (destinationNode !== undefined) {
		parentNodes = workflow.getParentNodes(destinationNode);
		parentNodes.push(destinationNode);
	}
	for (const node of Object.values(workflow.nodes)) {
		if (parentNodes !== undefined && !parentNodes.includes(node.name)) {
			continue;
		}
		returnData.push.apply(
			returnData,
			di_1.Container.get(webhook_service_1.WebhookService).getNodeWebhooks(
				workflow,
				node,
				additionalData,
				ignoreRestartWebhooks,
			),
		);
	}
	return returnData;
}
const getChatResponseMode = (workflowStartNode, method) => {
	const parameters = workflowStartNode.parameters;
	if (workflowStartNode.type !== n8n_workflow_1.CHAT_TRIGGER_NODE_TYPE) return undefined;
	if (method === 'GET') return 'onReceived';
	if (method === 'POST' && parameters.options?.responseMode === 'responseNodes') {
		return 'hostedChat';
	}
	return undefined;
};
function autoDetectResponseMode(workflowStartNode, workflow, method) {
	if (workflowStartNode.type === n8n_workflow_1.FORM_TRIGGER_NODE_TYPE && method === 'POST') {
		const connectedNodes = workflow.getChildNodes(workflowStartNode.name);
		for (const nodeName of connectedNodes) {
			const node = workflow.nodes[nodeName];
			if (node.type === n8n_workflow_1.WAIT_NODE_TYPE && node.parameters.resume !== 'form') {
				continue;
			}
			if (
				[n8n_workflow_1.FORM_NODE_TYPE, n8n_workflow_1.WAIT_NODE_TYPE].includes(node.type) &&
				!node.disabled
			) {
				return 'formPage';
			}
		}
	}
	const chatResponseMode = getChatResponseMode(workflowStartNode, method);
	if (chatResponseMode) return chatResponseMode;
	if (workflowStartNode.type === n8n_workflow_1.FORM_NODE_TYPE && method === 'POST') {
		const connectedNodes = workflow.getChildNodes(workflowStartNode.name);
		for (const nodeName of connectedNodes) {
			const node = workflow.nodes[nodeName];
			if (node.type === n8n_workflow_1.FORM_NODE_TYPE && !node.disabled) {
				return 'formPage';
			}
		}
	}
	if (
		workflowStartNode.type === n8n_workflow_1.WAIT_NODE_TYPE &&
		workflowStartNode.parameters.resume !== 'form'
	) {
		return undefined;
	}
	if (
		workflowStartNode.type === n8n_workflow_1.FORM_NODE_TYPE &&
		workflowStartNode.parameters.operation === 'completion'
	) {
		return 'onReceived';
	}
	if (
		[n8n_workflow_1.FORM_NODE_TYPE, n8n_workflow_1.WAIT_NODE_TYPE].includes(
			workflowStartNode.type,
		) &&
		method === 'POST'
	) {
		const connectedNodes = workflow.getChildNodes(workflowStartNode.name);
		for (const nodeName of connectedNodes) {
			const node = workflow.nodes[nodeName];
			if (node.type === n8n_workflow_1.WAIT_NODE_TYPE && node.parameters.resume !== 'form') {
				continue;
			}
			if (
				[n8n_workflow_1.FORM_NODE_TYPE, n8n_workflow_1.WAIT_NODE_TYPE].includes(node.type) &&
				!node.disabled
			) {
				return 'responseNode';
			}
		}
	}
	return undefined;
}
const handleFormRedirectionCase = (data, workflowStartNode) => {
	if (
		workflowStartNode.type === n8n_workflow_1.WAIT_NODE_TYPE &&
		workflowStartNode.parameters.resume !== 'form'
	) {
		return data;
	}
	if (
		[
			n8n_workflow_1.FORM_NODE_TYPE,
			n8n_workflow_1.FORM_TRIGGER_NODE_TYPE,
			n8n_workflow_1.WAIT_NODE_TYPE,
		].includes(workflowStartNode.type) &&
		data?.headers?.location &&
		String(data?.responseCode).startsWith('3')
	) {
		data.responseCode = 200;
		data.data = {
			redirectURL: data?.headers?.location,
		};
		data.headers.location = undefined;
	}
	return data;
};
exports.handleFormRedirectionCase = handleFormRedirectionCase;
const { formDataFileSizeMax } = di_1.Container.get(config_1.GlobalConfig).endpoints;
const parseFormData = (0, webhook_form_data_1.createMultiFormDataParser)(formDataFileSizeMax);
function setupResponseNodePromise(
	responsePromise,
	res,
	responseCallback,
	workflowStartNode,
	executionId,
	workflow,
) {
	void responsePromise.promise
		.then(async (response) => {
			const binaryData = response.body?.binaryData;
			if (binaryData?.id) {
				res.header(response.headers);
				const stream = await di_1.Container.get(n8n_core_1.BinaryDataService).getAsStream(
					binaryData.id,
				);
				stream.pipe(res, { end: false });
				await (0, promises_1.finished)(stream);
				responseCallback(null, { noWebhookResponse: true });
			} else if (Buffer.isBuffer(response.body)) {
				res.header(response.headers);
				res.end(response.body);
				responseCallback(null, { noWebhookResponse: true });
			} else {
				let data = {
					data: response.body,
					headers: response.headers,
					responseCode: response.statusCode,
				};
				data = (0, exports.handleFormRedirectionCase)(data, workflowStartNode);
				responseCallback(null, data);
			}
			process.nextTick(() => res.end());
		})
		.catch(async (error) => {
			di_1.Container.get(n8n_core_1.ErrorReporter).error(error);
			di_1.Container.get(backend_common_1.Logger).error(
				`Error with Webhook-Response for execution "${executionId}": "${error.message}"`,
				{ executionId, workflowId: workflow.id },
			);
			responseCallback(error, {});
		});
}
function prepareExecutionData(
	executionMode,
	workflowStartNode,
	webhookResultData,
	runExecutionData,
	runExecutionDataMerge = {},
	destinationNode,
	executionId,
	workflowData,
) {
	const nodeExecutionStack = [
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
	};
	if (destinationNode && runExecutionData.startData) {
		runExecutionData.startData.destinationNode = destinationNode;
	}
	if (executionId !== undefined) {
		runExecutionData.executionData.nodeExecutionStack[0].data.main =
			webhookResultData.workflowData ?? [];
	}
	if (Object.keys(runExecutionDataMerge).length !== 0) {
		Object.assign(runExecutionData, runExecutionDataMerge);
	}
	let pinData;
	const usePinData = ['manual', 'evaluation'].includes(executionMode);
	if (usePinData) {
		pinData = workflowData?.pinData;
		runExecutionData.resultData.pinData = pinData;
	}
	return { runExecutionData, pinData };
}
async function executeWebhook(
	workflow,
	webhookData,
	workflowData,
	workflowStartNode,
	executionMode,
	pushRef,
	runExecutionData,
	executionId,
	req,
	res,
	responseCallback,
	destinationNode,
) {
	const nodeType = workflow.nodeTypes.getByNameAndVersion(
		workflowStartNode.type,
		workflowStartNode.typeVersion,
	);
	const additionalKeys = {
		$executionId: executionId,
	};
	const context = new webhook_execution_context_1.WebhookExecutionContext(
		workflow,
		workflowStartNode,
		webhookData,
		executionMode,
		additionalKeys,
	);
	let project = undefined;
	try {
		project = await di_1.Container.get(
			ownership_service_1.OwnershipService,
		).getWorkflowProjectCached(workflowData.id);
	} catch (error) {
		throw new not_found_error_1.NotFoundError('Cannot find workflow');
	}
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
		const errorMessage = `The response mode '${responseMode}' is not valid!`;
		responseCallback(new n8n_workflow_1.UnexpectedError(errorMessage), {});
		throw new internal_server_error_1.InternalServerError(errorMessage);
	}
	additionalData.httpRequest = req;
	additionalData.httpResponse = res;
	let didSendResponse = false;
	let runExecutionDataMerge = {};
	try {
		let webhookResultData;
		await parseRequestBody(req, workflowStartNode, workflow, executionMode, additionalKeys);
		if (workflowStartNode.type === constants_1.MCP_TRIGGER_NODE_TYPE) {
			const nodeExecutionStack = [];
			nodeExecutionStack.push({
				node: workflowStartNode,
				data: {
					main: [],
				},
				source: null,
			});
			runExecutionData = runExecutionData || {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack,
					waitingExecution: {},
				},
			};
		}
		try {
			webhookResultData = await di_1.Container.get(webhook_service_1.WebhookService).runWebhook(
				workflow,
				webhookData,
				workflowStartNode,
				additionalData,
				executionMode,
				runExecutionData ?? null,
			);
			di_1.Container.get(workflow_statistics_service_1.WorkflowStatisticsService).emit(
				'nodeFetchedData',
				{
					workflowId: workflow.id,
					node: workflowStartNode,
				},
			);
		} catch (err) {
			const webhookType = ['formTrigger', 'form'].includes(nodeType.description.name)
				? 'Form'
				: 'Webhook';
			let errorMessage = `Workflow ${webhookType} Error: Workflow could not be started!`;
			if (err instanceof n8n_workflow_1.NodeOperationError && err.type === 'manual-form-test') {
				errorMessage = err.message;
			}
			di_1.Container.get(n8n_core_1.ErrorReporter).error(err, {
				extra: {
					nodeName: workflowStartNode.name,
					nodeType: workflowStartNode.type,
					nodeVersion: workflowStartNode.typeVersion,
					workflowId: workflow.id,
				},
			});
			responseCallback(new n8n_workflow_1.UnexpectedError(errorMessage), {});
			didSendResponse = true;
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
				workflowData: [[{ json: {} }]],
			};
		}
		const responseHeaders = evaluateResponseHeaders(context);
		if (!res.headersSent && responseHeaders) {
			for (const [name, value] of responseHeaders.entries()) {
				res.setHeader(name, value);
			}
		}
		if (webhookResultData.noWebhookResponse === true && !didSendResponse) {
			responseCallback(null, {
				noWebhookResponse: true,
			});
			didSendResponse = true;
		}
		if (webhookResultData.workflowData === undefined) {
			if (webhookResultData.webhookResponse !== undefined) {
				if (!didSendResponse) {
					responseCallback(null, {
						data: webhookResultData.webhookResponse,
						responseCode,
					});
					didSendResponse = true;
				}
			} else {
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
		if (responseMode === 'onReceived' && !didSendResponse) {
			const responseBody = (0,
			webhook_on_received_response_extractor_1.extractWebhookOnReceivedResponse)(
				responseData,
				webhookResultData,
			);
			const webhookResponse = (0, webhook_response_1.createStaticResponse)(
				responseBody,
				responseCode,
				responseHeaders,
			);
			responseCallback(null, webhookResponse);
			didSendResponse = true;
		}
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
		const runData = {
			executionMode,
			executionData: runExecutionData,
			pushRef,
			workflowData,
			pinData,
			projectId: project?.id,
		};
		if (!runData.pushRef) {
			runData.pushRef = runExecutionData.pushRef;
		}
		let responsePromise;
		if (responseMode === 'responseNode') {
			responsePromise = (0, n8n_workflow_1.createDeferredPromise)();
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
			di_1.Container.get(backend_common_1.Logger).debug(
				`Execution of workflow "${workflow.name}" from with ID ${executionId} is set to streaming`,
				{ executionId },
			);
			runData.httpResponse = res;
			runData.streamingEnabled = true;
			didSendResponse = true;
		}
		executionId = await di_1.Container.get(workflow_runner_1.WorkflowRunner).run(
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
		di_1.Container.get(backend_common_1.Logger).debug(
			`Started execution of workflow "${workflow.name}" from webhook with execution ID ${executionId}`,
			{ executionId },
		);
		const activeExecutions = di_1.Container.get(active_executions_1.ActiveExecutions);
		const executePromise = activeExecutions.getPostExecutePromise(executionId);
		const { parentExecution } = runExecutionData;
		if (parentExecution) {
			void executePromise.then(() => {
				const waitTracker = di_1.Container.get(wait_tracker_1.WaitTracker);
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
					const result = await (0,
					webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
						context,
						responseData,
						lastNodeTaskData,
					);
					if (!result.ok) {
						responseCallback(result.error, {});
						didSendResponse = true;
						return runData;
					}
					const response = result.result;
					if (response.contentType) {
						responseHeaders.set('content-type', response.contentType);
					}
					responseCallback(
						null,
						response.type === 'static'
							? (0, webhook_response_1.createStaticResponse)(
									response.body,
									responseCode,
									responseHeaders,
								)
							: (0, webhook_response_1.createStreamResponse)(
									response.stream,
									responseCode,
									responseHeaders,
								),
					);
					didSendResponse = true;
					return runData;
				})
				.catch((e) => {
					if (!didSendResponse) {
						responseCallback(
							new n8n_workflow_1.OperationalError('There was a problem executing the workflow', {
								cause: e,
							}),
							{},
						);
					}
					const internalServerError = new internal_server_error_1.InternalServerError(e.message, e);
					if (e instanceof n8n_workflow_1.ExecutionCancelledError)
						internalServerError.level = 'warning';
					throw internalServerError;
				});
		}
		return executionId;
	} catch (e) {
		const error =
			e instanceof unprocessable_error_1.UnprocessableRequestError
				? e
				: new n8n_workflow_1.OperationalError('There was a problem executing the workflow', {
						cause: e,
					});
		if (didSendResponse) throw error;
		responseCallback(error, {});
		return;
	}
}
function evaluateResponseOptions(
	workflowStartNode,
	workflow,
	req,
	webhookData,
	executionMode,
	additionalKeys,
) {
	const responseMode =
		autoDetectResponseMode(workflowStartNode, workflow, req.method) ??
		workflow.expression.getSimpleParameterValue(
			workflowStartNode,
			webhookData.webhookDescription.responseMode,
			executionMode,
			additionalKeys,
			undefined,
			'onReceived',
		);
	const responseCode = workflow.expression.getSimpleParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseCode,
		executionMode,
		additionalKeys,
		undefined,
		200,
	);
	const responseData = workflow.expression.getComplexParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseData,
		executionMode,
		additionalKeys,
		undefined,
		'firstEntryJson',
	);
	return { responseMode, responseCode, responseData };
}
async function parseRequestBody(req, workflowStartNode, workflow, executionMode, additionalKeys) {
	let binaryData;
	const nodeVersion = workflowStartNode.typeVersion;
	if (nodeVersion === 1) {
		binaryData = workflow.expression.getSimpleParameterValue(
			workflowStartNode,
			'={{$parameter["options"]["binaryData"]}}',
			executionMode,
			additionalKeys,
			undefined,
			false,
		);
	}
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
				await (0, middlewares_1.parseBody)(req);
			}
		} else {
			await (0, middlewares_1.parseBody)(req);
		}
	}
}
function evaluateResponseHeaders(context) {
	const headers = new Map();
	if (context.webhookData.webhookDescription.responseHeaders === undefined) {
		return headers;
	}
	const evaluatedHeaders = context.evaluateComplexWebhookDescriptionExpression('responseHeaders');
	if (evaluatedHeaders?.entries === undefined) {
		return headers;
	}
	for (const entry of evaluatedHeaders.entries) {
		headers.set(entry.name.toLowerCase(), entry.value);
	}
	return headers;
}
//# sourceMappingURL=webhook-helpers.js.map
