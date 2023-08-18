/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable id-denylist */
/* eslint-disable prefer-spread */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import type express from 'express';
import { Container } from 'typedi';
import get from 'lodash/get';
import stream from 'stream';
import { promisify } from 'util';
import formidable from 'formidable';

import { BinaryDataManager, NodeExecuteFunctions } from 'n8n-core';

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
	IRunExecutionData,
	IWebhookData,
	IWebhookResponseData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	BINARY_ENCODING,
	createDeferredPromise,
	ErrorReporterProxy as ErrorReporter,
	LoggerProxy as Logger,
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
import * as GenericHelpers from '@/GenericHelpers';
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

const pipeline = promisify(stream.pipeline);

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
			res.header('Access-Control-Allow-Origin', req.headers.origin);
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

export function decodeWebhookResponse(
	response: IExecuteResponsePromiseData,
): IExecuteResponsePromiseData {
	if (
		typeof response === 'object' &&
		typeof response.body === 'object' &&
		(response.body as IDataObject)['__@N8nEncodedBuffer@__']
	) {
		response.body = Buffer.from(
			(response.body as IDataObject)['__@N8nEncodedBuffer@__'] as string,
			BINARY_ENCODING,
		);
	}

	return response;
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

/**
 * Executes a webhook
 */
export async function executeWebhook(
	workflow: Workflow,
	webhookData: IWebhookData,
	workflowData: IWorkflowDb,
	workflowStartNode: INode,
	executionMode: WorkflowExecuteMode,
	sessionId: string | undefined,
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
		throw new ResponseHelper.InternalServerError(errorMessage);
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
			throw new ResponseHelper.NotFoundError('Cannot find workflow');
		}
	}

	// Prepare everything that is needed to run the workflow
	const additionalData = await WorkflowExecuteAdditionalData.getBase(user.id);

	// Get the responseMode
	const responseMode = workflow.expression.getSimpleParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseMode,
		executionMode,
		additionalData.timezone,
		additionalKeys,
		undefined,
		'onReceived',
	);
	const responseCode = workflow.expression.getSimpleParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseCode,
		executionMode,
		additionalData.timezone,
		additionalKeys,
		undefined,
		200,
	) as number;

	const responseData = workflow.expression.getSimpleParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseData,
		executionMode,
		additionalData.timezone,
		additionalKeys,
		undefined,
		'firstEntryJson',
	);

	if (!['onReceived', 'lastNode', 'responseNode'].includes(responseMode as string)) {
		// If the mode is not known we error. Is probably best like that instead of using
		// the default that people know as early as possible (probably already testing phase)
		// that something does not resolve properly.
		const errorMessage = `The response mode '${responseMode}' is not valid!`;
		responseCallback(new Error(errorMessage), {});
		throw new ResponseHelper.InternalServerError(errorMessage);
	}

	// Add the Response and Request so that this data can be accessed in the node
	additionalData.httpRequest = req;
	additionalData.httpResponse = res;

	const binaryData = workflow.expression.getSimpleParameterValue(
		workflowStartNode,
		'={{$parameter["options"]["binaryData"]}}',
		executionMode,
		additionalData.timezone,
		additionalKeys,
		undefined,
		false,
	);

	let didSendResponse = false;
	let runExecutionDataMerge = {};
	try {
		// Run the webhook function to see what should be returned and if
		// the workflow should be executed or not
		let webhookResultData: IWebhookResponseData;

		// if `Webhook` or `Wait` node, and binaryData is enabled, skip pre-parse the request-body
		if (!binaryData) {
			const { contentType, encoding } = req;
			if (contentType === 'multipart/form-data') {
				const form = formidable({
					multiples: true,
					encoding: encoding as formidable.BufferEncoding,
					// TODO: pass a custom `fileWriteStreamHandler` to create binary data files directly
				});
				req.body = await new Promise((resolve) => {
					form.parse(req, async (err, data, files) => {
						for (const key in data) {
							if (Array.isArray(data[key]) && data[key].length === 1) {
								data[key] = data[key][0];
							}
						}
						resolve({ data, files });
					});
				});
			} else {
				await parseBody(req);
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

		// Save static data if it changed
		await WorkflowHelpers.saveStaticData(workflow);

		const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
			$executionId: executionId,
		};

		if (webhookData.webhookDescription.responseHeaders !== undefined) {
			const responseHeaders = workflow.expression.getComplexParameterValue(
				workflowStartNode,
				webhookData.webhookDescription.responseHeaders,
				executionMode,
				additionalData.timezone,
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

		const runData: IWorkflowExecutionDataProcess = {
			executionMode,
			executionData: runExecutionData,
			sessionId,
			workflowData,
			userId: user.id,
		};

		let responsePromise: IDeferredPromise<IN8nHttpFullResponse> | undefined;
		if (responseMode === 'responseNode') {
			responsePromise = await createDeferredPromise<IN8nHttpFullResponse>();
			responsePromise
				.promise()
				.then((response: IN8nHttpFullResponse) => {
					if (didSendResponse) {
						return;
					}

					const binaryData = (response.body as IDataObject)?.binaryData as IBinaryData;
					if (binaryData?.id) {
						res.header(response.headers);
						const stream = BinaryDataManager.getInstance().getBinaryStream(binaryData.id);
						void pipeline(stream, res).then(() =>
							responseCallback(null, { noWebhookResponse: true }),
						);
					} else if (Buffer.isBuffer(response.body)) {
						res.header(response.headers);
						res.end(response.body);
						responseCallback(null, { noWebhookResponse: true });
					} else {
						// TODO: This probably needs some more changes depending on the options on the
						//       Webhook Response node
						responseCallback(null, {
							data: response.body as IDataObject,
							headers: response.headers,
							responseCode: response.statusCode,
						});
					}

					didSendResponse = true;
				})
				.catch(async (error) => {
					ErrorReporter.error(error);
					Logger.error(
						`Error with Webhook-Response for execution "${executionId}": "${error.message}"`,
						{ executionId, workflowId: workflow.id },
					);
				});
		}

		// Start now to run the workflow
		const workflowRunner = new WorkflowRunner();
		executionId = await workflowRunner.run(
			runData,
			true,
			!didSendResponse,
			executionId,
			responsePromise,
		);

		Logger.verbose(
			`Started execution of workflow "${workflow.name}" from webhook with execution ID ${executionId}`,
			{ executionId },
		);

		// Get a promise which resolves when the workflow did execute and send then response
		const executePromise = Container.get(ActiveExecutions).getPostExecutePromise(
			executionId,
		) as Promise<IExecutionDb | undefined>;
		executePromise
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

				if (workflowData.pinData) {
					data.data.resultData.pinData = workflowData.pinData;
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

				if (responseMode === 'responseNode') {
					if (!didSendResponse) {
						// Return an error if no Webhook-Response node did send any data
						responseCallback(null, {
							data: {
								message: 'Workflow executed successfully',
							},
							responseCode,
						});
						didSendResponse = true;
					}
					return undefined;
				}

				if (returnData === undefined) {
					if (!didSendResponse) {
						responseCallback(null, {
							data: {
								message: 'Workflow executed successfully but the last node did not return any data',
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
							additionalData.timezone,
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
							additionalData.timezone,
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
							additionalData.timezone,
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
								const stream = BinaryDataManager.getInstance().getBinaryStream(binaryData.id);
								await pipeline(stream, res);
							} else {
								res.end(Buffer.from(binaryData.data, BINARY_ENCODING));
							}

							responseCallback(null, {
								noWebhookResponse: true,
							});
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
					responseCallback(new Error('There was a problem executing the workflow'), {});
				}

				throw new ResponseHelper.InternalServerError(e.message);
			});

		return executionId;
	} catch (e) {
		const error =
			e instanceof ResponseHelper.UnprocessableRequestError
				? e
				: new Error('There was a problem executing the workflow', { cause: e });
		if (didSendResponse) throw error;
		responseCallback(error, {});
		return;
	}
}

/**
 * Returns the base URL of the webhooks
 */
export function getWebhookBaseUrl() {
	let urlBaseWebhook = process.env.WEBHOOK_URL ?? GenericHelpers.getBaseUrl();
	if (!urlBaseWebhook.endsWith('/')) {
		urlBaseWebhook += '/';
	}
	return urlBaseWebhook;
}
