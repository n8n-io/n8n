/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable id-denylist */
/* eslint-disable prefer-spread */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import type express from 'express';
import { Container } from 'typedi';
import get from 'lodash/get';
import { finished } from 'stream/promises';
import formidable from 'formidable';

import { BinaryDataService, NodeExecuteFunctions } from 'n8n-core';

import type {
	IBinaryData,
	IBinaryKeyData,
	IDataObject,
	IDeferredPromise,
	IExecuteData,
	IExecuteResponsePromiseData,
	IHttpRequestMethods,
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
} from 'n8n-workflow';
import {
	ApplicationError,
	BINARY_ENCODING,
	createDeferredPromise,
	ErrorReporterProxy as ErrorReporter,
	NodeHelpers,
} from 'n8n-workflow';

import type {
	IExecutionDb,
	IResponseCallbackData,
	IWebhookManager,
	IWorkflowDb,
	IWorkflowExecutionDataProcess,
	WebhookCORSRequest,
	WebhookRequest,
} from '@/Interfaces';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import { WorkflowRunner } from '@/WorkflowRunner';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { ActiveExecutions } from '@/ActiveExecutions';
import type { User } from '@db/entities/User';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { EventsService } from '@/services/events.service';
import { OwnershipService } from './services/ownership.service';
import { parseBody } from './middlewares';
import { Logger } from './Logger';
import { NotFoundError } from './errors/response-errors/not-found.error';
import { InternalServerError } from './errors/response-errors/internal-server.error';
import { UnprocessableRequestError } from './errors/response-errors/unprocessable.error';

export const WEBHOOK_METHODS: IHttpRequestMethods[] = [
	'DELETE',
	'GET',
	'HEAD',
	'PATCH',
	'POST',
	'PUT',
];

export const webhookRequestHandler =
	(webhookManager: IWebhookManager) =>
	async (req: WebhookRequest | WebhookCORSRequest, res: express.Response) => {
		const { path } = req.params;
		const method = req.method;

		if (method !== 'OPTIONS' && !WEBHOOK_METHODS.includes(method)) {
			return ResponseHelper.sendErrorResponse(
				res,
				new Error(`The method ${method} is not supported.`),
			);
		}

		// Setup CORS headers only if the incoming request has an `origin` header
		if ('origin' in req.headers) {
			if (webhookManager.getWebhookMethods) {
				try {
					const allowedMethods = await webhookManager.getWebhookMethods(path);
					res.header('Access-Control-Allow-Methods', ['OPTIONS', ...allowedMethods].join(', '));
				} catch (error) {
					return ResponseHelper.sendErrorResponse(res, error as Error);
				}
			}

			const requestedMethod =
				method === 'OPTIONS'
					? (req.headers['access-control-request-method'] as IHttpRequestMethods)
					: method;
			if (webhookManager.findAccessControlOptions && requestedMethod) {
				const options = await webhookManager.findAccessControlOptions(path, requestedMethod);
				const { allowedOrigins } = options ?? {};

				if (allowedOrigins && allowedOrigins !== '*' && allowedOrigins !== req.headers.origin) {
					const originsList = allowedOrigins.split(',');
					const defaultOrigin = originsList[0];

					if (originsList.length === 1) {
						res.header('Access-Control-Allow-Origin', defaultOrigin);
					}

					if (originsList.includes(req.headers.origin as string)) {
						res.header('Access-Control-Allow-Origin', req.headers.origin);
					} else {
						res.header('Access-Control-Allow-Origin', defaultOrigin);
					}
				} else {
					res.header('Access-Control-Allow-Origin', req.headers.origin);
				}

				if (method === 'OPTIONS') {
					res.header('Access-Control-Max-Age', '300');
					const requestedHeaders = req.headers['access-control-request-headers'];
					if (requestedHeaders?.length) {
						res.header('Access-Control-Allow-Headers', requestedHeaders);
					}
				}
			}
		}

		if (method === 'OPTIONS') {
			return ResponseHelper.sendSuccessResponse(res, {}, true, 204);
		}

		let response;
		try {
			response = await webhookManager.executeWebhook(req, res);
		} catch (error) {
			return ResponseHelper.sendErrorResponse(res, error as Error);
		}

		// Don't respond, if already responded
		if (response.noWebhookResponse !== true) {
			ResponseHelper.sendSuccessResponse(
				res,
				response.data,
				true,
				response.responseCode,
				response.headers,
			);
		}
	};

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
			NodeHelpers.getNodeWebhooks(workflow, node, additionalData, ignoreRestartWebhooks),
		);
	}

	return returnData;
}

export function encodeWebhookResponse(
	response: IExecuteResponsePromiseData,
): IExecuteResponsePromiseData {
	if (typeof response === 'object' && Buffer.isBuffer(response.body)) {
		response.body = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'__@N8nEncodedBuffer@__': response.body.toString(BINARY_ENCODING),
		};
	}

	return response;
}

const normalizeFormData = <T>(values: Record<string, T | T[]>) => {
	for (const key in values) {
		const value = values[key];
		if (Array.isArray(value) && value.length === 1) {
			values[key] = value[0];
		}
	}
};

/**
 * Executes a webhook
 */
// eslint-disable-next-line complexity
export async function executeWebhook(
	workflow: Workflow,
	webhookData: IWebhookData,
	workflowData: IWorkflowDb,
	workflowStartNode: INode,
	executionMode: WorkflowExecuteMode,
	pushRef: string | undefined,
	runExecutionData: IRunExecutionData | undefined,
	executionId: string | undefined,
	req: WebhookRequest,
	res: express.Response,
	responseCallback: (error: Error | null, data: IResponseCallbackData) => void,
	destinationNode?: string,
): Promise<string | undefined> {
	// Get the nodeType to know which responseMode is set
	const nodeType = workflow.nodeTypes.getByNameAndVersion(
		workflowStartNode.type,
		workflowStartNode.typeVersion,
	);
	if (nodeType === undefined) {
		const errorMessage = `The type of the webhook node "${workflowStartNode.name}" is not known`;
		responseCallback(new Error(errorMessage), {});
		throw new InternalServerError(errorMessage);
	}

	const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
		$executionId: executionId,
	};

	let user: User;
	if (
		(workflowData as WorkflowEntity).shared?.length &&
		(workflowData as WorkflowEntity).shared[0].user
	) {
		user = (workflowData as WorkflowEntity).shared[0].user;
	} else {
		try {
			user = await Container.get(OwnershipService).getWorkflowOwnerCached(workflowData.id);
		} catch (error) {
			throw new NotFoundError('Cannot find workflow');
		}
	}

	// Prepare everything that is needed to run the workflow
	const additionalData = await WorkflowExecuteAdditionalData.getBase(user.id);

	// Get the responseMode
	const responseMode = workflow.expression.getSimpleParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseMode,
		executionMode,
		additionalKeys,
		undefined,
		'onReceived',
	) as WebhookResponseMode;
	const responseCode = workflow.expression.getSimpleParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseCode as string,
		executionMode,
		additionalKeys,
		undefined,
		200,
	) as number;

	const responseData = workflow.expression.getComplexParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseData,
		executionMode,
		additionalKeys,
		undefined,
		'firstEntryJson',
	);

	if (!['onReceived', 'lastNode', 'responseNode'].includes(responseMode)) {
		// If the mode is not known we error. Is probably best like that instead of using
		// the default that people know as early as possible (probably already testing phase)
		// that something does not resolve properly.
		const errorMessage = `The response mode '${responseMode}' is not valid!`;
		responseCallback(new Error(errorMessage), {});
		throw new InternalServerError(errorMessage);
	}

	// Add the Response and Request so that this data can be accessed in the node
	additionalData.httpRequest = req;
	additionalData.httpResponse = res;

	let binaryData;

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

	let didSendResponse = false;
	let runExecutionDataMerge = {};
	try {
		// Run the webhook function to see what should be returned and if
		// the workflow should be executed or not
		let webhookResultData: IWebhookResponseData;

		// if `Webhook` or `Wait` node, and binaryData is enabled, skip pre-parse the request-body
		// always falsy for versions higher than 1
		if (!binaryData) {
			const { contentType, encoding } = req;
			if (contentType === 'multipart/form-data') {
				const form = formidable({
					multiples: true,
					encoding: encoding as formidable.BufferEncoding,
					// TODO: pass a custom `fileWriteStreamHandler` to create binary data files directly
				});
				req.body = await new Promise((resolve) => {
					form.parse(req, async (_err, data, files) => {
						normalizeFormData(data);
						normalizeFormData(files);
						resolve({ data, files });
					});
				});
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
			webhookResultData = await workflow.runWebhook(
				webhookData,
				workflowStartNode,
				additionalData,
				NodeExecuteFunctions,
				executionMode,
			);
			Container.get(EventsService).emit('nodeFetchedData', workflow.id, workflowStartNode);
		} catch (err) {
			// Send error response to webhook caller
			const errorMessage = 'Workflow Webhook Error: Workflow could not be started!';
			responseCallback(new Error(errorMessage), {});
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

		const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
			$executionId: executionId,
		};

		if (webhookData.webhookDescription.responseHeaders !== undefined) {
			const responseHeaders = workflow.expression.getComplexParameterValue(
				workflowStartNode,
				webhookData.webhookDescription.responseHeaders,
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

			if (responseHeaders !== undefined && responseHeaders.entries !== undefined) {
				for (const item of responseHeaders.entries) {
					res.setHeader(item.name, item.value);
				}
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
			// Return response directly and do not wait for the workflow to finish
			if (responseData === 'noData') {
				// Return without data
				responseCallback(null, {
					responseCode,
				});
			} else if (responseData) {
				// Return the data specified in the response data option
				responseCallback(null, {
					data: responseData as IDataObject,
					responseCode,
				});
			} else if (webhookResultData.webhookResponse !== undefined) {
				// Data to respond with is given
				responseCallback(null, {
					data: webhookResultData.webhookResponse,
					responseCode,
				});
			} else {
				responseCallback(null, {
					data: {
						message: 'Workflow was started',
					},
					responseCode,
				});
			}

			didSendResponse = true;
		}

		// Initialize the data of the webhook node
		const nodeExecutionStack: IExecuteData[] = [];
		nodeExecutionStack.push({
			node: workflowStartNode,
			data: {
				main: webhookResultData.workflowData,
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
		const usePinData = executionMode === 'manual';
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
			userId: user.id,
		};

		let responsePromise: IDeferredPromise<IN8nHttpFullResponse> | undefined;
		if (responseMode === 'responseNode') {
			responsePromise = await createDeferredPromise<IN8nHttpFullResponse>();
			responsePromise
				.promise()
				.then(async (response: IN8nHttpFullResponse) => {
					if (didSendResponse) {
						return;
					}

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
						const headers = response.headers;
						let responseCode = response.statusCode;
						let data = response.body as IDataObject;

						// for formTrigger node redirection has to be handled by sending redirectURL in response body
						if (
							nodeType.description.name === 'formTrigger' &&
							headers.location &&
							String(responseCode).startsWith('3')
						) {
							responseCode = 200;
							data = {
								redirectURL: headers.location,
							};
							headers.location = undefined;
						}

						responseCallback(null, {
							data,
							headers,
							responseCode,
						});
					}

					process.nextTick(() => res.end());
					didSendResponse = true;
				})
				.catch(async (error) => {
					ErrorReporter.error(error);
					Container.get(Logger).error(
						`Error with Webhook-Response for execution "${executionId}": "${error.message}"`,
						{ executionId, workflowId: workflow.id },
					);
				});
		}

		// Start now to run the workflow
		executionId = await Container.get(WorkflowRunner).run(
			runData,
			true,
			!didSendResponse,
			executionId,
			responsePromise,
		);

		Container.get(Logger).verbose(
			`Started execution of workflow "${workflow.name}" from webhook with execution ID ${executionId}`,
			{ executionId },
		);

		if (!didSendResponse) {
			// Get a promise which resolves when the workflow did execute and send then response
			const executePromise = Container.get(ActiveExecutions).getPostExecutePromise(
				executionId,
			) as Promise<IExecutionDb | undefined>;
			executePromise
				// eslint-disable-next-line complexity
				.then(async (data) => {
					if (data === undefined) {
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

					if (usePinData) {
						data.data.resultData.pinData = pinData;
					}

					const returnData = WorkflowHelpers.getDataLastExecutedNodeData(data);
					if (data.data.resultData.error || returnData?.error !== undefined) {
						if (!didSendResponse) {
							responseCallback(null, {
								data: {
									message: 'Error in workflow',
								},
								responseCode: 500,
							});
						}
						didSendResponse = true;
						return data;
					}

					// in `responseNode` mode `responseCallback` is called by `responsePromise`
					if (responseMode === 'responseNode' && responsePromise) {
						await Promise.allSettled([responsePromise.promise()]);
						return undefined;
					}

					if (returnData === undefined) {
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
						return data;
					}

					const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
						$executionId: executionId,
					};

					if (!didSendResponse) {
						let data: IDataObject | IDataObject[] | undefined;

						if (responseData === 'firstEntryJson') {
							// Return the JSON data of the first entry

							if (returnData.data!.main[0]![0] === undefined) {
								responseCallback(new Error('No item to return got found'), {});
								didSendResponse = true;
								return undefined;
							}

							data = returnData.data!.main[0]![0].json;

							const responsePropertyName = workflow.expression.getSimpleParameterValue(
								workflowStartNode,
								webhookData.webhookDescription.responsePropertyName,
								executionMode,
								additionalKeys,
								undefined,
								undefined,
							);

							if (responsePropertyName !== undefined) {
								data = get(data, responsePropertyName as string) as IDataObject;
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
									data !== null &&
									data !== undefined &&
									['Buffer', 'String'].includes(data.constructor.name)
								) {
									res.end(data);
								} else {
									res.end(JSON.stringify(data));
								}

								responseCallback(null, {
									noWebhookResponse: true,
								});
								didSendResponse = true;
							}
						} else if (responseData === 'firstEntryBinary') {
							// Return the binary data of the first entry
							data = returnData.data!.main[0]![0];

							if (data === undefined) {
								responseCallback(new Error('No item was found to return'), {});
								didSendResponse = true;
								return undefined;
							}

							if (data.binary === undefined) {
								responseCallback(new Error('No binary data was found to return'), {});
								didSendResponse = true;
								return undefined;
							}

							const responseBinaryPropertyName = workflow.expression.getSimpleParameterValue(
								workflowStartNode,
								webhookData.webhookDescription.responseBinaryPropertyName,
								executionMode,
								additionalKeys,
								undefined,
								'data',
							);

							if (responseBinaryPropertyName === undefined && !didSendResponse) {
								responseCallback(new Error("No 'responseBinaryPropertyName' is set"), {});
								didSendResponse = true;
							}

							const binaryData = (data.binary as IBinaryKeyData)[
								responseBinaryPropertyName as string
							];
							if (binaryData === undefined && !didSendResponse) {
								responseCallback(
									new Error(
										`The binary property '${responseBinaryPropertyName}' which should be returned does not exist`,
									),
									{},
								);
								didSendResponse = true;
							}

							if (!didSendResponse) {
								// Send the webhook response manually
								res.setHeader('Content-Type', binaryData.mimeType);
								if (binaryData.id) {
									const stream = await Container.get(BinaryDataService).getAsStream(binaryData.id);
									stream.pipe(res, { end: false });
									await finished(stream);
								} else {
									res.write(Buffer.from(binaryData.data, BINARY_ENCODING));
								}

								responseCallback(null, {
									noWebhookResponse: true,
								});
								process.nextTick(() => res.end());
							}
						} else if (responseData === 'noData') {
							// Return without data
							data = undefined;
						} else {
							// Return the JSON data of all the entries
							data = [];
							for (const entry of returnData.data!.main[0]!) {
								data.push(entry.json);
							}
						}

						if (!didSendResponse) {
							responseCallback(null, {
								data,
								responseCode,
							});
						}
					}
					didSendResponse = true;

					return data;
				})
				.catch((e) => {
					if (!didSendResponse) {
						responseCallback(
							new ApplicationError('There was a problem executing the workflow', {
								level: 'warning',
								cause: e,
							}),
							{},
						);
					}

					throw new InternalServerError(e.message);
				});
		}
		return executionId;
	} catch (e) {
		const error =
			e instanceof UnprocessableRequestError
				? e
				: new ApplicationError('There was a problem executing the workflow', {
						level: 'warning',
						cause: e,
					});
		if (didSendResponse) throw error;
		responseCallback(error, {});
		return;
	}
}
