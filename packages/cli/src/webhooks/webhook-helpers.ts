/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable id-denylist */
/* eslint-disable prefer-spread */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type express from 'express';
import get from 'lodash/get';
import { BinaryDataService, ErrorReporter, Logger } from 'n8n-core';
import type {
	IBinaryData,
	IBinaryKeyData,
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
} from 'n8n-workflow';
import {
	ApplicationError,
	BINARY_ENCODING,
	ExecutionCancelledError,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	NodeOperationError,
	WAIT_NODE_TYPE,
} from 'n8n-workflow';
import assert from 'node:assert';
import { finished } from 'stream/promises';

import { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import type { Project } from '@/databases/entities/project';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { parseBody } from '@/middlewares';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { WaitTracker } from '@/wait-tracker';
import { createMultiFormDataParser } from '@/webhooks/webhook-form-data';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import * as WorkflowHelpers from '@/workflow-helpers';
import { WorkflowRunner } from '@/workflow-runner';

import { WebhookService } from './webhook.service';
import type { IWebhookResponsePromiseData, WebhookRequest } from './webhook.types';

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
	response: IN8nHttpFullResponse,
	workflowStartNode: INode,
): IN8nHttpFullResponse => {
	if (workflowStartNode.type === WAIT_NODE_TYPE && workflowStartNode.parameters.resume !== 'form') {
		return response;
	}

	const { headers, statusCode } = response;
	if (
		[FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, WAIT_NODE_TYPE].includes(workflowStartNode.type) &&
		headers.location &&
		String(statusCode).startsWith('3')
	) {
		response.statusCode = 200;
		response.body = { redirectURL: headers.location };
		delete headers.location;
	}

	return response;
};

const { formDataFileSizeMax } = Container.get(GlobalConfig).endpoints;
const parseFormData = createMultiFormDataParser(formDataFileSizeMax);

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
	responsePromise: IDeferredPromise<IWebhookResponsePromiseData>,
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

	if (!['onReceived', 'lastNode', 'responseNode', 'formPage'].includes(responseMode)) {
		// If the mode is not known we error. Is probably best like that instead of using
		// the default that people know as early as possible (probably already testing phase)
		// that something does not resolve properly.
		const errorMessage = `The response mode '${responseMode}' is not valid!`;
		responsePromise.reject(new ApplicationError(errorMessage));
		return;
	}

	const responseCodeParam = workflow.expression.getSimpleParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseCode as string,
		executionMode,
		additionalKeys,
		undefined,
		200,
	) as number;

	const responseDataParam = workflow.expression.getComplexParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseData,
		executionMode,
		additionalKeys,
		undefined,
		'firstEntryJson',
	);

	const nodeVersion = workflowStartNode.typeVersion;
	// binaryData option is removed in versions higher than 1
	const binaryDataParam =
		nodeVersion === 1
			? (workflow.expression.getSimpleParameterValue(
					workflowStartNode,
					'={{$parameter["options"]["binaryData"]}}',
					executionMode,
					additionalKeys,
					undefined,
					false,
				) as boolean)
			: undefined;

	// Add the Response and Request so that this data can be accessed in the node
	additionalData.httpRequest = req;
	additionalData.httpResponse = res;

	let runExecutionDataMerge = {};
	try {
		// Run the webhook function to see what should be returned and if
		// the workflow should be executed or not
		let webhookResultData: IWebhookResponseData;

		// if `Webhook` or `Wait` node, and binaryData is enabled, skip pre-parse the request-body
		// always falsy for versions higher than 1
		if (!binaryDataParam) {
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

			responsePromise.reject(new ApplicationError(errorMessage));
			return;
		}

		const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
			$executionId: executionId,
		};

		const responseHeadersParam = webhookData.webhookDescription.responseHeaders;
		if (webhookData.webhookDescription.responseHeaders !== undefined) {
			const responseHeaders = workflow.expression.getComplexParameterValue(
				workflowStartNode,
				responseHeadersParam,
				executionMode,
				additionalKeys,
				undefined,
				undefined,
			) as {
				entries?:
					| Array<{
							name: string;
							value: string;
					  }>
					| undefined;
			};

			if (responseHeaders?.entries?.length) {
				for (const item of responseHeaders.entries) {
					res.setHeader(item.name, item.value);
				}
			}
		}

		if (webhookResultData.noWebhookResponse === true) {
			// The response got already send
			responsePromise.resolve({ noWebhookResponse: true });
			return;
		}

		if (webhookResultData.workflowData === undefined) {
			// Workflow should not run
			if (webhookResultData.webhookResponse !== undefined) {
				// Data to respond with is given
				responsePromise.resolve({
					response: {
						statusCode: responseCodeParam,
						body: webhookResultData.webhookResponse,
						headers: {},
					},
				});
				return;
			} else {
				// Send default response
				responsePromise.resolve({
					response: {
						statusCode: responseCodeParam,
						body: { message: 'Webhook call received' },
						headers: {},
					},
				});
				return;
			}
			return;
		}

		// Now that we know that the workflow should run we can return the default response
		// directly if responseMode it set to "onReceived" and a response should be sent
		if (responseMode === 'onReceived') {
			void responsePromise.promise.then(async (resolveData) => {
				if (resolveData.noWebhookResponse) {
					// TODO: send 204
					res.end();
					return;
				}
				const { statusCode, headers, body } = resolveData.response;
				for (const [key, value] of Object.entries(headers)) {
					res.setHeader(key, value);
				}
				// TODO handle binary responses
				res.status(statusCode).json(body);
			});

			responsePromise.resolve({
				response: {
					statusCode: responseCodeParam,
					headers: {},
					body: responseDataParam ??
						webhookResultData.webhookResponse ?? { message: 'Workflow was started' },
				},
			});
			return;
		}

		// Initialize the data of the webhook node
		const nodeExecutionStack: IExecuteData[] = [
			{
				node: workflowStartNode,
				data: {
					main: webhookResultData.workflowData,
				},
				source: null,
			},
		];

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

		if (destinationNode && runExecutionData.startData) {
			runExecutionData.startData.destinationNode = destinationNode;
		}

		if (executionId !== undefined) {
			// Set the data the webhook node did return on the waiting node if executionId
			// already exists as it means that we are restarting an existing execution.
			runExecutionData.executionData!.nodeExecutionStack[0].data.main =
				webhookResultData.workflowData;
		}

		if (Object.keys(runExecutionDataMerge).length !== 0) {
			// If data to merge got defined add it to the execution data
			Object.assign(runExecutionData, runExecutionDataMerge);
		}

		let pinData: IPinData | undefined;
		const usePinData = ['manual', 'evaluation'].includes(executionMode);
		if (usePinData) {
			pinData = workflowData.pinData;
			runExecutionData.resultData.pinData = pinData;
		}

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

		if (responseMode === 'responseNode') {
			responsePromise.promise
				.then(async (resolveData) => {
					if (resolveData.noWebhookResponse) {
						return;
					}

					const { response } = resolveData;
					const binaryData = (response.body as IDataObject)?.binaryData as IBinaryData;
					if (binaryData?.id) {
						res.header(response.headers);
						const stream = await Container.get(BinaryDataService).getAsStream(binaryData.id);
						stream.pipe(res, { end: false });
						await finished(stream);
						responsePromise.resolve({ noWebhookResponse: true });
					} else if (Buffer.isBuffer(response.body)) {
						res.header(response.headers);
						res.write(response.body);
						responsePromise.resolve({ noWebhookResponse: true });
					} else {
						// TODO: This probably needs some more changes depending on the options on the
						//       Webhook Response node
						const data: IWebhookResponsePromiseData = { response };
						data.response = handleFormRedirectionCase(data.response, workflowStartNode);
						responsePromise.resolve(data);
					}

					process.nextTick(() => res.end());
				})
				.catch(async (error) => {
					Container.get(ErrorReporter).error(error);
					Container.get(Logger).error(
						`Error with Webhook-Response for execution "${executionId}": "${error.message}"`,
						{ executionId, workflowId: workflow.id },
					);
					responsePromise.reject(error);
				});
		}

		if (
			config.getEnv('executions.mode') === 'queue' &&
			process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true' &&
			runData.executionMode === 'manual'
		) {
			assert(runData.executionData);
			runData.executionData.isTestWebhook = true;
		}

		// Start now to run the workflow
		executionId = await Container.get(WorkflowRunner).run(
			runData,
			true,
			true,
			executionId,
			responsePromise,
		);

		if (responseMode === 'formPage') {
			responsePromise.resolve({
				response: {
					body: { formWaitingUrl: `${additionalData.formWaitingBaseUrl}/${executionId}` },
					statusCode: responseCodeParam,
					headers: {},
				},
			});
			return;
		}

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

		executePromise
			// eslint-disable-next-line complexity
			.then(async (data) => {
				if (data === undefined) {
					responsePromise.resolve({
						response: {
							body: {
								message: 'Workflow executed successfully but no data was returned',
							},
							statusCode: responseCodeParam,
							headers: {},
						},
					});
					return;
				}

				if (usePinData) {
					data.data.resultData.pinData = pinData;
				}

				const returnData = WorkflowHelpers.getDataLastExecutedNodeData(data);
				if (data.data.resultData.error || returnData?.error !== undefined) {
					responsePromise.resolve({
						response: {
							body: {
								message: 'Error in workflow',
							},
							statusCode: 500,
							headers: {},
						},
					});
					return data;
				}

				// in `responseNode` mode `responseCallback` is called by `responsePromise`
				if (responseMode === 'responseNode' && responsePromise) {
					await Promise.allSettled([responsePromise.promise]);
					return undefined;
				}

				if (returnData === undefined) {
					responsePromise.resolve({
						response: {
							body: {
								message: 'Workflow executed successfully but the last node did not return any data',
							},
							statusCode: responseCodeParam,
							headers: {},
						},
					});
					return data;
				}

				const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
					$executionId: executionId,
				};

				let responseData: IDataObject | IDataObject[] | undefined;

				if (responseDataParam === 'firstEntryJson') {
					// Return the JSON data of the first entry

					if (returnData.data!.main[0]![0] === undefined) {
						responsePromise.reject(new ApplicationError('No item to return got found'));
						return;
					}

					responseData = returnData.data!.main[0]![0].json;

					const responsePropertyName = workflow.expression.getSimpleParameterValue(
						workflowStartNode,
						webhookData.webhookDescription.responsePropertyName,
						executionMode,
						additionalKeys,
						undefined,
						undefined,
					);

					if (responsePropertyName !== undefined) {
						responseData = get(responseData, responsePropertyName as string) as IDataObject;
					}

					const responseContentType = workflow.expression.getSimpleParameterValue(
						workflowStartNode,
						webhookData.webhookDescription.responseContentType,
						executionMode,
						additionalKeys,
						undefined,
						undefined,
					);

					if (responseContentType !== undefined) {
						// Send the webhook response manually to be able to set the content-type
						res.setHeader('Content-Type', responseContentType as string);

						// Returning an object, boolean, number, ... causes problems so make sure to stringify if needed
						if (
							responseData !== null &&
							responseData !== undefined &&
							['Buffer', 'String'].includes(responseData.constructor.name)
						) {
							res.end(responseData);
						} else {
							res.end(JSON.stringify(responseData));
						}

						responsePromise.resolve({ noWebhookResponse: true });
						return;
					}
				} else if (responseDataParam === 'firstEntryBinary') {
					// Return the binary data of the first entry
					responseData = returnData.data!.main[0]![0];

					if (responseData === undefined) {
						responsePromise.reject(new ApplicationError('No item was found to return'));
						return;
					}

					if (responseData.binary === undefined) {
						responsePromise.reject(new ApplicationError('No binary data was found to return'));
						return;
					}

					const responseBinaryPropertyName = workflow.expression.getSimpleParameterValue(
						workflowStartNode,
						webhookData.webhookDescription.responseBinaryPropertyName,
						executionMode,
						additionalKeys,
						undefined,
						'data',
					);

					if (responseBinaryPropertyName === undefined) {
						responsePromise.reject(new ApplicationError("No 'responseBinaryPropertyName' is set"));
						return;
					}

					const binaryData = (responseData.binary as IBinaryKeyData)[
						responseBinaryPropertyName as string
					];
					if (binaryData === undefined) {
						responsePromise.reject(
							new ApplicationError(
								`The binary property '${responseBinaryPropertyName}' which should be returned does not exist`,
							),
						);
						return;
					}

					// Send the webhook response manually
					res.setHeader('Content-Type', binaryData.mimeType);
					if (binaryData.id) {
						const stream = await Container.get(BinaryDataService).getAsStream(binaryData.id);
						stream.pipe(res, { end: false });
						await finished(stream);
					} else {
						res.write(Buffer.from(binaryData.data, BINARY_ENCODING));
					}

					responsePromise.resolve({ noWebhookResponse: true });
					process.nextTick(() => res.end());
				} else if (responseDataParam === 'noData') {
					// Return without data
					responseData = undefined;
				} else {
					// Return the JSON data of all the entries
					responseData = [];
					for (const entry of returnData.data!.main[0]!) {
						responseData.push(entry.json);
					}
				}

				responsePromise.resolve({
					response: {
						body: responseData,
						statusCode: responseCodeParam,
						headers: {},
					},
				});

				return data;
			})
			.catch((e) => {
				responsePromise.reject(
					new ApplicationError('There was a problem executing the workflow', {
						level: 'warning',
						cause: e,
					}),
				);

				const internalServerError = new InternalServerError(e.message, e);
				if (e instanceof ExecutionCancelledError) internalServerError.level = 'warning';
				throw internalServerError;
			});
		return executionId;
	} catch (e) {
		const error =
			e instanceof UnprocessableRequestError
				? e
				: new ApplicationError('There was a problem executing the workflow', {
						level: 'warning',
						cause: e,
					});
		responsePromise.reject(error);
		return;
	}
}
