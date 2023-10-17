/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable id-denylist */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Application, Response } from 'express';
import { Container } from 'typedi';
import get from 'lodash/get';
import formidable from 'formidable';
import { pipeline } from 'stream/promises';

import { BinaryDataService, NodeExecuteFunctions } from 'n8n-core';
import type {
	IBinaryData,
	IBinaryKeyData,
	IDataObject,
	IDeferredPromise,
	IExecuteData,
	IHttpRequestMethods,
	IN8nHttpFullResponse,
	INode,
	IRunExecutionData,
	IWebhookData,
	IWebhookDescription,
	IWebhookResponseData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	WebhookNodeType,
	WebhookResponseData,
	WebhookResponseMode,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	BINARY_ENCODING,
	createDeferredPromise,
	ErrorReporterProxy as ErrorReporter,
	LoggerProxy as Logger,
	NodeHelpers,
	INodeTypes,
	FORM_TRIGGER_PATH_IDENTIFIER,
} from 'n8n-workflow';

import type { IExecutionDb, IWorkflowDb, IWorkflowExecutionDataProcess } from '@/Interfaces';

import {
	InternalServerError,
	MethodNotAllowedError,
	NotFoundError,
	UnprocessableRequestError,
	sendErrorResponse,
	sendSuccessResponse,
} from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import { WorkflowRunner } from '@/WorkflowRunner';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { ActiveExecutions } from '@/ActiveExecutions';
import type { User } from '@db/entities/User';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { parseBody } from '@/middlewares';
import { EventsService } from '@/services/events.service';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowsService } from '@/workflows/workflows.services';

import type {
	RegisteredWebhook,
	WebhookCORSRequest,
	WebhookRequest,
	WebhookResponseCallbackData,
} from './types';

const UUID_REGEXP =
	/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;

const WEBHOOK_METHODS = new Set<IHttpRequestMethods>([
	'DELETE',
	'GET',
	'HEAD',
	'PATCH',
	'POST',
	'PUT',
]);

const normalizeFormData = <T>(values: Record<string, T | T[]>) => {
	for (const key in values) {
		const value = values[key];
		if (Array.isArray(value) && value.length === 1) {
			values[key] = value[0];
		}
	}
};

export abstract class AbstractWebhooks<T extends RegisteredWebhook> {
	protected supportsDynamicPath = true;

	protected executionMode: WorkflowExecuteMode = 'webhook';

	protected workflows: Map<string, IWorkflowDb> = new Map();

	private registered = new Map<string, Map<IHttpRequestMethods, T>>();

	constructor(protected readonly nodeTypes: INodeTypes) {}

	abstract registerHandler(app: Application): void;

	abstract executeWebhook(
		webhook: T,
		req: WebhookRequest,
		res: Response,
		pathOrId: string,
		method: IHttpRequestMethods,
	): Promise<WebhookResponseCallbackData>;

	protected registerWebhook(
		pathOrId: string,
		method: IHttpRequestMethods,
		data: Omit<T, 'nodeType'>,
	) {
		const { node } = data;
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		if (nodeType === undefined) {
			throw new InternalServerError(`The type of the webhook node "${node.name}" is not known`);
		} else if (nodeType.webhook === undefined) {
			throw new InternalServerError(`The node "${node.name}" does not have any webhooks defined.`);
		}

		const webhookGroup = this.registered.get(pathOrId) ?? new Map<IHttpRequestMethods, T>();
		const webhook = { ...data, nodeType } as T;
		webhookGroup.set(method, webhook);
		this.registered.set(pathOrId, webhookGroup);
		// TODO: update these on redis, and publish a message for others to pull the cache
	}

	protected unregisterWebhook(pathOrId: string, method: IHttpRequestMethods) {
		const webhookGroup = this.registered.get(pathOrId);
		webhookGroup?.delete(method);
	}

	/** Returns all the webhooks which should be created for the given workflow */
	getWorkflowWebhooks(
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
			returnData.push(
				...NodeHelpers.getNodeWebhooks(workflow, node, additionalData, ignoreRestartWebhooks),
			);
		}

		return returnData;
	}

	protected async handleRequest(req: WebhookRequest | WebhookCORSRequest, res: Response) {
		const method = req.method;
		if (method !== 'OPTIONS' && !WEBHOOK_METHODS.has(method)) {
			return sendErrorResponse(
				res,
				new MethodNotAllowedError(`The method ${method} is not supported.`),
			);
		}

		let { path } = req.params;
		// Remove trailing slash
		if (path.endsWith('/')) {
			path = path.slice(0, -1);
		}

		let pathOrId = path;
		let webhookGroup = this.registered.get(path);
		if (!webhookGroup) {
			const possibleId = path.split('/')[0];
			if (UUID_REGEXP.test(possibleId)) {
				pathOrId = possibleId;
				webhookGroup = this.registered.get(possibleId);
			}
		}

		// Setup CORS headers only if the incoming request has an `origin` header
		if ('origin' in req.headers) {
			const allowedMethods = webhookGroup && Array.from(webhookGroup.keys());
			if (!allowedMethods?.length) {
				return sendErrorResponse(
					res,
					new NotFoundError(`No webhook registered for the path: ${path}`),
				);
			}

			res.header('Access-Control-Allow-Methods', ['OPTIONS', ...allowedMethods].join(', '));
			// TODO: get allowed origins from the webhook node
			res.header('Access-Control-Allow-Origin', req.headers.origin);
		}

		if (method === 'OPTIONS') {
			return sendSuccessResponse(res, {}, true, 204);
		}

		const webhook = webhookGroup?.get(method);
		if (!webhook) {
			return sendErrorResponse(
				res,
				new NotFoundError(`No webhook registered for the path: ${path}`),
			);
		}

		// Reset request parameters
		req.params = {} as WebhookRequest['params'];

		// Repopulate request parameters for dynamic webhooks
		if (this.supportsDynamicPath && webhook.isDynamic) {
			const pathElements = path.split('/').slice(1);
			// extracting params from path
			webhook.webhookPath.split('/').forEach((ele, index) => {
				if (ele.startsWith(':')) {
					// write params to req.params
					// @ts-ignore
					req.params[ele.slice(1)] = pathElements[index];
				}
			});
		}

		let response: WebhookResponseCallbackData;
		try {
			response = await this.executeWebhook(webhook, req, res, pathOrId, method);
		} catch (error) {
			if (
				error.errorCode === 404 &&
				(error.message as string).includes(FORM_TRIGGER_PATH_IDENTIFIER)
			) {
				const isTestWebhook = req.originalUrl.includes('webhook-test');
				res.status(404);
				return res.render('form-trigger-404', { isTestWebhook });
			} else {
				return sendErrorResponse(res, error as Error);
			}
		}

		// Don't respond, if already responded
		if (response.noWebhookResponse !== true) {
			sendSuccessResponse(res, response.data, true, response.responseCode, response.headers);
		}
	}

	protected async startWebhookExecution(
		webhook: T,
		req: WebhookRequest,
		res: Response,
		workflowData: IWorkflowDb,
		responseCallback: (error: Error | null, data: WebhookResponseCallbackData) => void,
		runExecutionData?: IRunExecutionData,
		executionId?: string,
		destinationNode?: string,
	): Promise<string | undefined> {
		const { node, workflow, description: webhookDescription, nodeType } = webhook;

		const { executionMode } = this;

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
		const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
			$executionId: executionId,
		};

		// Get the responseMode
		const responseMode = workflow.expression.getSimpleParameterValue(
			node,
			webhookDescription.responseMode,
			executionMode,
			additionalData.timezone,
			additionalKeys,
			undefined,
			'onReceived',
		) as WebhookResponseMode;

		const responseCode = workflow.expression.getSimpleParameterValue(
			node,
			webhookDescription.responseCode,
			executionMode,
			additionalData.timezone,
			additionalKeys,
			undefined,
			200,
		) as number;

		const responseData = workflow.expression.getSimpleParameterValue(
			node,
			webhookDescription.responseData,
			executionMode,
			additionalData.timezone,
			additionalKeys,
			undefined,
			'firstEntryJson',
		) as WebhookResponseData;

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

		const binaryData = workflow.expression.getSimpleParameterValue(
			node,
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
							normalizeFormData(data);
							normalizeFormData(files);
							resolve({ data, files });
						});
					});
				} else {
					await parseBody(req);
				}
			}

			try {
				webhookResultData = await workflow.runWebhook(
					webhookDescription.name,
					node,
					nodeType as WebhookNodeType,
					additionalData,
					NodeExecuteFunctions,
					executionMode,
				);
				Container.get(EventsService).emit('nodeFetchedData', workflow.id, node);
			} catch (err) {
				// Send error response to webhook caller
				const errorMessage = 'Workflow Webhook Error: Workflow could not be started!';
				responseCallback(new Error(errorMessage), {});
				didSendResponse = true;

				// Add error to execution data that it can be logged and send to Editor-UI
				runExecutionDataMerge = {
					resultData: {
						runData: {},
						lastNodeExecuted: node.name,
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
			await WorkflowsService.saveStaticData(workflow);

			const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
				$executionId: executionId,
			};

			if (webhookDescription.responseHeaders !== undefined) {
				const responseHeaders = workflow.expression.getComplexParameterValue(
					node,
					webhookDescription.responseHeaders,
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

				if (responseHeaders?.entries !== undefined) {
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
				node,
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
				workflowData,
				userId: user.id,
			};
			if ('sessionId' in webhook) {
				runData.sessionId = webhook.sessionId as string;
			}

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
							await pipeline(stream, res);
							responseCallback(null, { noWebhookResponse: true });
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

			if (!didSendResponse) {
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
									node,
									webhookDescription.responsePropertyName,
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
									node,
									webhookDescription.responseContentType,
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
									node,
									webhookDescription.responseBinaryPropertyName,
									executionMode,
									additionalData.timezone,
									additionalKeys,
									undefined,
									'data',
								) as string;

								if (responseBinaryPropertyName === undefined && !didSendResponse) {
									responseCallback(new Error("No 'responseBinaryPropertyName' is set"), {});
									didSendResponse = true;
								}

								const binaryData = (data.binary as IBinaryKeyData)[responseBinaryPropertyName];
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
										const stream = await Container.get(BinaryDataService).getAsStream(
											binaryData.id,
										);
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

						throw new InternalServerError(e.message);
					});
			}
			return executionId;
		} catch (e) {
			const error =
				e instanceof UnprocessableRequestError
					? e
					: new Error('There was a problem executing the workflow', { cause: e });
			if (didSendResponse) throw error;
			responseCallback(error, {});
			return;
		}
	}
}
