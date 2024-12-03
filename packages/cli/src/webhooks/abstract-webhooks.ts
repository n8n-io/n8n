import { GlobalConfig } from '@n8n/config';
import type { Response } from 'express';
import { get } from 'lodash';
import { BinaryDataService, HookContext, WebhookContext } from 'n8n-core';
import type {
	IBinaryData,
	IBinaryKeyData,
	IDataObject,
	IDeferredPromise,
	IExecuteData,
	IHttpRequestMethods,
	IN8nHttpFullResponse,
	INode,
	IPinData,
	IRunExecutionData,
	IWebhookData,
	IWebhookResponseData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	IWorkflowExecutionDataProcess,
	WebhookResponseMode,
	WebhookSetupMethodNames,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	ApplicationError,
	BINARY_ENCODING,
	createDeferredPromise,
	ErrorReporterProxy,
	ExecutionCancelledError,
	FORM_NODE_TYPE,
	Node,
	NodeHelpers,
	NodeOperationError,
} from 'n8n-workflow';
import { finished } from 'stream/promises';
import { Service } from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import type { Project } from '@/databases/entities/project';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import type { IWorkflowDb } from '@/interfaces';
import { Logger } from '@/logging/logger.service';
import { parseBody } from '@/middlewares';
import { NodeTypes } from '@/node-types';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { WaitTracker } from '@/wait-tracker';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import * as WorkflowHelpers from '@/workflow-helpers';
import { WorkflowRunner } from '@/workflow-runner';

import { createMultiFormDataParser } from './webhook-form-data';
import type {
	IWebhookResponseCallbackData,
	WebhookAccessControlOptions,
	WebhookRequest,
} from './webhook.types';

@Service()
export abstract class AbstractWebhookManager {
	/** Gets all request methods associated with a webhook path*/
	abstract getWebhookMethods(path: string): Promise<IHttpRequestMethods[]>;

	/** Find the CORS options matching a path and method */
	abstract findAccessControlOptions(
		path: string,
		httpMethod: IHttpRequestMethods,
	): Promise<WebhookAccessControlOptions | undefined>;

	abstract handleWebhookRequest(
		req: WebhookRequest,
		res: Response,
	): Promise<IWebhookResponseCallbackData>;

	private readonly parseFormData: ReturnType<typeof createMultiFormDataParser>;

	constructor(
		globalConfig: GlobalConfig,
		protected readonly logger: Logger,
		protected readonly nodeTypes: NodeTypes,
		private readonly activeExecutions: ActiveExecutions,
		private readonly binaryDataService: BinaryDataService,
		private readonly ownershipService: OwnershipService,
		private readonly waitTracker: WaitTracker,
		private readonly workflowRunner: WorkflowRunner,
		private readonly workflowStatisticsService: WorkflowStatisticsService,
	) {
		const { formDataFileSizeMax } = globalConfig.endpoints;
		this.parseFormData = createMultiFormDataParser(formDataFileSizeMax);
	}

	/** Returns all the webhooks which should be created for the given workflow */
	getWorkflowWebhooks(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		destinationNode?: string,
		ignoreRestartWebhooks = false,
	): IWebhookData[] {
		// Check all the nodes in the workflow if they have webhooks
		const webhooks: IWebhookData[] = [];

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

			const additionalWebhooks = this.getNodeWebhooks(
				workflow,
				node,
				additionalData,
				ignoreRestartWebhooks,
			);
			// eslint-disable-next-line prefer-spread
			webhooks.push.apply(webhooks, additionalWebhooks);
		}

		return webhooks;
	}

	/** Returns all the webhooks which should be created for the give node */
	protected getNodeWebhooks(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		ignoreRestartWebhooks = false,
	): IWebhookData[] {
		if (node.disabled === true) {
			// Node is disabled so webhooks will also not be enabled
			return [];
		}

		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		if (nodeType.description.webhooks === undefined) {
			// Node does not have any webhooks so return
			return [];
		}

		const workflowId = workflow.id || '__UNSAVED__';
		const mode = 'internal';

		const returnData: IWebhookData[] = [];
		for (const webhookDescription of nodeType.description.webhooks) {
			if (ignoreRestartWebhooks && webhookDescription.restartWebhook === true) {
				continue;
			}

			let nodeWebhookPath = workflow.expression.getSimpleParameterValue(
				node,
				webhookDescription.path,
				mode,
				{},
			);
			if (nodeWebhookPath === undefined) {
				this.logger.error(
					`No webhook path could be found for node "${node.name}" in workflow "${workflowId}".`,
				);
				continue;
			}

			nodeWebhookPath = nodeWebhookPath.toString();

			if (nodeWebhookPath.startsWith('/')) {
				nodeWebhookPath = nodeWebhookPath.slice(1);
			}
			if (nodeWebhookPath.endsWith('/')) {
				nodeWebhookPath = nodeWebhookPath.slice(0, -1);
			}

			const isFullPath: boolean = workflow.expression.getSimpleParameterValue(
				node,
				webhookDescription.isFullPath,
				'internal',
				{},
				undefined,
				false,
			) as boolean;
			const restartWebhook: boolean = workflow.expression.getSimpleParameterValue(
				node,
				webhookDescription.restartWebhook,
				'internal',
				{},
				undefined,
				false,
			) as boolean;

			const path = NodeHelpers.getNodeWebhookPath(
				workflowId,
				node,
				nodeWebhookPath,
				isFullPath,
				restartWebhook,
			);

			const webhookMethods = workflow.expression.getSimpleParameterValue(
				node,
				webhookDescription.httpMethod,
				mode,
				{},
				undefined,
				'GET',
			);

			if (webhookMethods === undefined) {
				this.logger.error(
					`The webhook "${path}" for node "${node.name}" in workflow "${workflowId}" could not be added because the httpMethod is not defined.`,
				);
				continue;
			}

			let webhookId: string | undefined;
			if ((path.startsWith(':') || path.includes('/:')) && node.webhookId) {
				webhookId = node.webhookId;
			}

			String(webhookMethods)
				.split(',')
				.forEach((httpMethod) => {
					if (!httpMethod) return;
					returnData.push({
						httpMethod: httpMethod.trim() as IHttpRequestMethods,
						node: node.name,
						path,
						webhookDescription,
						workflowId,
						workflowExecuteAdditionalData: additionalData,
						webhookId,
					});
				});
		}

		return returnData;
	}

	// eslint-disable-next-line complexity
	protected async executeWebhook(
		workflow: Workflow,
		webhookData: IWebhookData,
		workflowData: IWorkflowDb,
		startNode: INode,
		executionMode: WorkflowExecuteMode,
		pushRef: string | undefined,
		runExecutionData: IRunExecutionData | undefined,
		executionId: string | undefined,
		req: WebhookRequest,
		res: Response,
		responseCallback: (error: Error | null, data: IWebhookResponseCallbackData) => void,
		destinationNode?: string,
	): Promise<string | undefined> {
		// Get the nodeType to know which responseMode is set
		const nodeType = this.nodeTypes.getByNameAndVersion(startNode.type, startNode.typeVersion);

		// TODO: delete this. `getByNameAndVersion` already throws
		if (nodeType === undefined) {
			const errorMessage = `The type of the webhook node "${startNode.name}" is not known`;
			responseCallback(new ApplicationError(errorMessage), {});
			throw new InternalServerError(errorMessage);
		}

		if (nodeType.webhook === undefined) {
			throw new ApplicationError('Node does not have any webhooks defined', {
				extra: { nodeName: startNode.name },
			});
		}

		const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
			$executionId: executionId,
		};

		let project: Project | undefined = undefined;
		try {
			project = await this.ownershipService.getWorkflowProjectCached(workflowData.id);
		} catch (error) {
			throw new NotFoundError('Cannot find workflow');
		}

		// Prepare everything that is needed to run the workflow
		const additionalData = await WorkflowExecuteAdditionalData.getBase();

		if (executionId) {
			additionalData.executionId = executionId;
		}

		// Get the responseMode
		let responseMode;

		// if this is n8n FormTrigger node, check if there is a Form node in child nodes,
		// if so, set 'responseMode' to 'formPage' to redirect to URL of that Form later
		if (nodeType.description.name === 'formTrigger') {
			const connectedNodes = workflow.getChildNodes(startNode.name);
			let hasNextPage = false;
			for (const nodeName of connectedNodes) {
				const node = workflow.nodes[nodeName];
				if (node.type === FORM_NODE_TYPE && !node.disabled) {
					hasNextPage = true;
					break;
				}
			}

			if (hasNextPage) {
				responseMode = 'formPage';
			}
		}

		if (!responseMode) {
			responseMode = workflow.expression.getSimpleParameterValue(
				startNode,
				webhookData.webhookDescription.responseMode,
				executionMode,
				additionalKeys,
				undefined,
				'onReceived',
			) as WebhookResponseMode;
		}

		const responseCode = workflow.expression.getSimpleParameterValue(
			startNode,
			webhookData.webhookDescription.responseCode as string,
			executionMode,
			additionalKeys,
			undefined,
			200,
		) as number;

		const responseData = workflow.expression.getComplexParameterValue(
			startNode,
			webhookData.webhookDescription.responseData,
			executionMode,
			additionalKeys,
			undefined,
			'firstEntryJson',
		);

		if (!['onReceived', 'lastNode', 'responseNode', 'formPage'].includes(responseMode)) {
			// If the mode is not known we error. Is probably best like that instead of using
			// the default that people know as early as possible (probably already testing phase)
			// that something does not resolve properly.
			const errorMessage = `The response mode '${responseMode}' is not valid!`;
			responseCallback(new ApplicationError(errorMessage), {});
			throw new InternalServerError(errorMessage);
		}

		// Add the Response and Request so that this data can be accessed in the node
		additionalData.httpRequest = req;
		additionalData.httpResponse = res;

		let parseAsBinaryData = false;

		const nodeVersion = startNode.typeVersion;
		if (nodeVersion > 0) {
			// binaryData option is removed in versions higher than 1
			parseAsBinaryData = workflow.expression.getSimpleParameterValue(
				startNode,
				'={{$parameter["options"]["binaryData"]}}',
				executionMode,
				additionalKeys,
				undefined,
				false,
			) as boolean;
		}

		let didSendResponse = false;
		let runExecutionDataMerge = {};
		try {
			// if `Webhook` or `Wait` node, and binaryData is enabled, skip pre-parse the request-body
			// always falsy for versions higher than 1
			if (!parseAsBinaryData) {
				const { contentType } = req;
				if (contentType === 'multipart/form-data') {
					req.body = await this.parseFormData(req);
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

			// Run the webhook function to see what should be returned and if the workflow should be executed or not
			let webhookResultData: IWebhookResponseData;
			try {
				const context = new WebhookContext(
					workflow,
					startNode,
					additionalData,
					executionMode,
					webhookData,
					[],
					runExecutionData ?? null,
				);

				webhookResultData =
					nodeType instanceof Node
						? await nodeType.webhook(context)
						: ((await nodeType.webhook.call(context)) as IWebhookResponseData);

				this.workflowStatisticsService.emit('nodeFetchedData', {
					workflowId: workflow.id,
					node: startNode,
				});
			} catch (error) {
				// Send error response to webhook caller
				const webhookType = ['formTrigger', 'form'].includes(nodeType.description.name)
					? 'Form'
					: 'Webhook';
				let errorMessage = `Workflow ${webhookType} Error: Workflow could not be started!`;

				// if workflow started manually, show an actual error message
				if (error instanceof NodeOperationError && error.type === 'manual-form-test') {
					errorMessage = error.message;
				}

				ErrorReporterProxy.error(error, {
					extra: {
						nodeName: startNode.name,
						nodeType: startNode.type,
						nodeVersion: startNode.typeVersion,
						workflowId: workflow.id,
					},
				});

				responseCallback(new ApplicationError(errorMessage), {});
				didSendResponse = true;

				// Add error to execution data that it can be logged and send to Editor-UI
				runExecutionDataMerge = {
					resultData: {
						runData: {},
						lastNodeExecuted: startNode.name,
						error: {
							...error,
							message: error.message,
							stack: error.stack,
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

			if (webhookData.webhookDescription.responseHeaders !== undefined) {
				const responseHeaders = workflow.expression.getComplexParameterValue(
					startNode,
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
							// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
				node: startNode,
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
				projectId: project?.id,
			};

			// When resuming from a wait node, copy over the pushRef from the execution-data
			if (!runData.pushRef) {
				runData.pushRef = runExecutionData.pushRef;
			}

			let responsePromise: IDeferredPromise<IN8nHttpFullResponse> | undefined;
			if (responseMode === 'responseNode') {
				responsePromise = createDeferredPromise<IN8nHttpFullResponse>();
				responsePromise.promise
					.then(async (response: IN8nHttpFullResponse) => {
						if (didSendResponse) {
							return;
						}

						const binaryData = (response.body as IDataObject)?.binaryData as IBinaryData;
						if (binaryData?.id) {
							res.header(response.headers);
							const stream = await this.binaryDataService.getAsStream(binaryData.id);
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
						ErrorReporterProxy.error(error);
						this.logger.error(
							`Error with Webhook-Response for execution "${executionId}": "${error.message}"`,
							{ executionId, workflowId: workflow.id },
						);
					});
			}

			// Start now to run the workflow
			executionId = await this.workflowRunner.run(
				runData,
				true,
				!didSendResponse,
				executionId,
				responsePromise,
			);

			if (responseMode === 'formPage' && !didSendResponse) {
				res.redirect(`${additionalData.formWaitingBaseUrl}/${executionId}`);
				process.nextTick(() => res.end());
				didSendResponse = true;
			}

			this.logger.debug(
				`Started execution of workflow "${workflow.name}" from webhook with execution ID ${executionId}`,
				{ executionId },
			);

			// Get a promise which resolves when the workflow did execute and send then response
			const executePromise = this.activeExecutions.getPostExecutePromise(executionId);

			const { parentExecution } = runExecutionData;
			if (parentExecution) {
				// on child execution completion, resume parent execution
				void executePromise.then(() => {
					void this.waitTracker.startExecution(parentExecution.executionId);
				});
			}

			if (!didSendResponse) {
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
							await Promise.allSettled([responsePromise.promise]);
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

						if (!didSendResponse) {
							let data: IDataObject | IDataObject[] | undefined;

							if (responseData === 'firstEntryJson') {
								// Return the JSON data of the first entry

								if (returnData.data!.main[0]![0] === undefined) {
									responseCallback(new ApplicationError('No item to return got found'), {});
									didSendResponse = true;
									return undefined;
								}

								data = returnData.data!.main[0]![0].json;

								const responsePropertyName = workflow.expression.getSimpleParameterValue(
									startNode,
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
									startNode,
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
									responseCallback(new ApplicationError('No item was found to return'), {});
									didSendResponse = true;
									return undefined;
								}

								if (data.binary === undefined) {
									responseCallback(new ApplicationError('No binary data was found to return'), {});
									didSendResponse = true;
									return undefined;
								}

								const responseBinaryPropertyName = workflow.expression.getSimpleParameterValue(
									startNode,
									webhookData.webhookDescription.responseBinaryPropertyName,
									executionMode,
									additionalKeys,
									undefined,
									'data',
								) as string;

								if (responseBinaryPropertyName === undefined && !didSendResponse) {
									responseCallback(
										new ApplicationError("No 'responseBinaryPropertyName' is set"),
										{},
									);
									didSendResponse = true;
								}

								const binaryData = (data.binary as IBinaryKeyData)[responseBinaryPropertyName];
								if (binaryData === undefined && !didSendResponse) {
									responseCallback(
										new ApplicationError(
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
										const stream = await this.binaryDataService.getAsStream(binaryData.id);
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
					: new ApplicationError('There was a problem executing the workflow', {
							level: 'warning',
							cause: e,
						});
			if (didSendResponse) throw error;
			responseCallback(error, {});
			return;
		}
	}

	async createWebhookIfNotExists(
		workflow: Workflow,
		webhookData: IWebhookData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<void> {
		const webhookExists = await this.runWebhookMethod(
			'checkExists',
			workflow,
			webhookData,
			mode,
			activation,
		);
		if (!webhookExists) {
			// If webhook does not exist yet create it
			await this.runWebhookMethod('create', workflow, webhookData, mode, activation);
		}
	}

	async deleteWebhook(
		workflow: Workflow,
		webhookData: IWebhookData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	) {
		await this.runWebhookMethod('delete', workflow, webhookData, mode, activation);
	}

	private async runWebhookMethod(
		method: WebhookSetupMethodNames,
		workflow: Workflow,
		webhookData: IWebhookData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<boolean | undefined> {
		const node = workflow.getNode(webhookData.node);

		if (!node) return;

		// TODO: pass `nodeType` in, since it has already been resolved
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		const webhookFn = nodeType.webhookMethods?.[webhookData.webhookDescription.name]?.[method];
		if (webhookFn === undefined) return;

		const context = new HookContext(
			workflow,
			node,
			webhookData.workflowExecuteAdditionalData,
			mode,
			activation,
			webhookData,
		);

		return (await webhookFn.call(context)) as boolean;
	}
}
