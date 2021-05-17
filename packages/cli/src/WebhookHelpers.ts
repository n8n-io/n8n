import * as express from 'express';
import { get } from 'lodash';

import {
	ActiveExecutions,
	ExternalHooks,
	GenericHelpers,
	IExecutionDb,
	IResponseCallbackData,
	IWorkflowDb,
	IWorkflowExecutionDataProcess,
	ResponseHelper,
	WorkflowCredentials,
	WorkflowExecuteAdditionalData,
	WorkflowHelpers,
	WorkflowRunner,
} from './';

import {
	BINARY_ENCODING,
	NodeExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	IExecuteData,
	INode,
	IRunExecutionData,
	IWebhookData,
	IWebhookResponseData,
	IWorkflowExecuteAdditionalData,
	LoggerProxy as Logger,
	NodeHelpers,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';


const activeExecutions = ActiveExecutions.getInstance();

/**
 * Returns all the webhooks which should be created for the give workflow
 *
 * @export
 * @param {string} workflowId
 * @param {Workflow} workflow
 * @returns {IWebhookData[]}
 */
export function getWorkflowWebhooks(workflow: Workflow, additionalData: IWorkflowExecuteAdditionalData, destinationNode?: string): IWebhookData[] {
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
		returnData.push.apply(returnData, NodeHelpers.getNodeWebhooks(workflow, node, additionalData));
	}

	return returnData;
}

/**
 * Returns all the webhooks which should be created for the give workflow
 *
 * @export
 * @param {string} workflowId
 * @param {Workflow} workflow
 * @returns {IWebhookData[]}
 */
export function getWorkflowWebhooksBasic(workflow: Workflow): IWebhookData[] {
	// Check all the nodes in the workflow if they have webhooks

	const returnData: IWebhookData[] = [];

	for (const node of Object.values(workflow.nodes)) {
		returnData.push.apply(returnData, NodeHelpers.getNodeWebhooksBasic(workflow, node));
	}

	return returnData;
}


 /**
  * Executes a webhook
  *
  * @export
  * @param {IWebhookData} webhookData
  * @param {IWorkflowDb} workflowData
  * @param {INode} workflowStartNode
  * @param {WorkflowExecuteMode} executionMode
  * @param {(string | undefined)} sessionId
  * @param {express.Request} req
  * @param {express.Response} res
  * @param {((error: Error | null, data: IResponseCallbackData) => void)} responseCallback
  * @returns {(Promise<string | undefined>)}
  */
 export async function executeWebhook(workflow: Workflow, webhookData: IWebhookData, workflowData: IWorkflowDb, workflowStartNode: INode, executionMode: WorkflowExecuteMode, sessionId: string | undefined, req: express.Request, res: express.Response, responseCallback: (error: Error | null, data: IResponseCallbackData) => void): Promise<string | undefined> {
	// Get the nodeType to know which responseMode is set
	const nodeType = workflow.nodeTypes.getByName(workflowStartNode.type);
	if (nodeType === undefined) {
		const errorMessage = `The type of the webhook node "${workflowStartNode.name}" is not known.`;
		responseCallback(new Error(errorMessage), {});
		throw new ResponseHelper.ResponseError(errorMessage, 500, 500);
	}

	// Get the responseMode
	 const responseMode = workflow.expression.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['responseMode'], executionMode, 'onReceived');
	 const responseCode = workflow.expression.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['responseCode'], executionMode, 200) as number;

	if (!['onReceived', 'lastNode'].includes(responseMode as string)) {
		// If the mode is not known we error. Is probably best like that instead of using
		// the default that people know as early as possible (probably already testing phase)
		// that something does not resolve properly.
		const errorMessage = `The response mode ${responseMode} is not valid!`;
		responseCallback(new Error(errorMessage), {});
		throw new ResponseHelper.ResponseError(errorMessage, 500, 500);
	}

	// Prepare everything that is needed to run the workflow
	const additionalData = await WorkflowExecuteAdditionalData.getBase();

	// Add the Response and Request so that this data can be accessed in the node
	additionalData.httpRequest = req;
	additionalData.httpResponse = res;

	let didSendResponse = false;
	let runExecutionDataMerge = {};
	try {
		// Run the webhook function to see what should be returned and if
		// the workflow should be executed or not
		let webhookResultData: IWebhookResponseData;

		try {
			webhookResultData = await workflow.runWebhook(webhookData, workflowStartNode, additionalData, NodeExecuteFunctions, executionMode);
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
				workflowData: [[{json: {}}]],
			};
		}

		// Save static data if it changed
		await WorkflowHelpers.saveStaticData(workflow);

		if (webhookData.webhookDescription['responseHeaders'] !== undefined) {
			const responseHeaders = workflow.expression.getComplexParameterValue(workflowStartNode, webhookData.webhookDescription['responseHeaders'], executionMode, undefined) as {
				entries?: Array<{
					name: string;
					value: string;
				}> | undefined;
			};

			if (responseHeaders !== undefined && responseHeaders['entries'] !== undefined) {
				for (const item of responseHeaders['entries']) {
					res.setHeader(item['name'], item['value']);
				}
			}
		}

		if (webhookResultData.noWebhookResponse === true && didSendResponse === false) {
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
				if (didSendResponse === false) {
					responseCallback(null, {
						data: webhookResultData.webhookResponse,
						responseCode,
					});
					didSendResponse = true;
				}
			} else {
				// Send default response
				if (didSendResponse === false) {
					responseCallback(null, {
						data: {
							message: 'Webhook call got received.',
						},
						responseCode,
					});
					didSendResponse = true;
				}
			}
			return;
		}

		// Now that we know that the workflow should run we can return the default response
		// directly if responseMode it set to "onReceived" and a respone should be sent
		if (responseMode === 'onReceived' && didSendResponse === false) {
			// Return response directly and do not wait for the workflow to finish
			if (webhookResultData.webhookResponse !== undefined) {
				// Data to respond with is given
				responseCallback(null, {
					data: webhookResultData.webhookResponse,
					responseCode,
				});
			} else {
				responseCallback(null, {
					data: {
						message: 'Workflow got started.',
					},
					responseCode,
				});
			}

			didSendResponse = true;
		}

		// Initialize the data of the webhook node
		const nodeExecutionStack: IExecuteData[] = [];
		nodeExecutionStack.push(
			{
				node: workflowStartNode,
				data: {
					main: webhookResultData.workflowData,
				},
			}
		);

		const runExecutionData: IRunExecutionData = {
			startData: {
			},
			resultData: {
				runData: {},
			},
			executionData: {
				contextData: {},
				nodeExecutionStack,
				waitingExecution: {},
			},
		};

		if (Object.keys(runExecutionDataMerge).length !== 0) {
			// If data to merge got defined add it to the execution data
			Object.assign(runExecutionData, runExecutionDataMerge);
		}

		const runData: IWorkflowExecutionDataProcess = {
			executionMode,
			executionData: runExecutionData,
			sessionId,
			workflowData,
		};

		// Start now to run the workflow
		const workflowRunner = new WorkflowRunner();
		const executionId = await workflowRunner.run(runData, true, !didSendResponse);

		Logger.verbose(`Started execution of workflow "${workflow.name}" from webhook with execution ID ${executionId}`, { executionId });

		// Get a promise which resolves when the workflow did execute and send then response
		const executePromise = activeExecutions.getPostExecutePromise(executionId) as Promise<IExecutionDb | undefined>;
		executePromise.then((data) => {
			if (data === undefined) {
				if (didSendResponse === false) {
					responseCallback(null, {
						data: {
							message: 'Workflow did execute sucessfully but no data got returned.',
						},
						responseCode,
					});
					didSendResponse = true;
				}
				return undefined;
			}

			const returnData = WorkflowHelpers.getDataLastExecutedNodeData(data);
			if(data.data.resultData.error || returnData?.error !== undefined) {
				if (didSendResponse === false) {
					responseCallback(null, {
						data: {
							message: 'Workflow did error.',
						},
						responseCode: 500,
					});
				}
				didSendResponse = true;
				return data;
			}

			if (returnData === undefined) {
				if (didSendResponse === false) {
					responseCallback(null, {
						data: {
							message: 'Workflow did execute sucessfully but the last node did not return any data.',
						},
						responseCode,
					});
				}
				didSendResponse = true;
				return data;
			}

			const responseData = workflow.expression.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['responseData'], executionMode, 'firstEntryJson');

			if (didSendResponse === false) {
				let data: IDataObject | IDataObject[];

				if (responseData === 'firstEntryJson') {
					// Return the JSON data of the first entry

					if (returnData.data!.main[0]![0] === undefined) {
						responseCallback(new Error('No item to return got found.'), {});
						didSendResponse = true;
					}

					data = returnData.data!.main[0]![0].json;

					const responsePropertyName = workflow.expression.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['responsePropertyName'], executionMode, undefined);

					if (responsePropertyName !== undefined) {
						data = get(data, responsePropertyName as string) as IDataObject;
					}

					const responseContentType = workflow.expression.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['responseContentType'], executionMode, undefined);

					if (responseContentType !== undefined) {
						// Send the webhook response manually to be able to set the content-type
						res.setHeader('Content-Type', responseContentType as string);

						// Returning an object, boolean, number, ... causes problems so make sure to stringify if needed
						if (data !== null && data !== undefined && ['Buffer', 'String'].includes(data.constructor.name)) {
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
						responseCallback(new Error('No item to return got found.'), {});
						didSendResponse = true;
					}

					if (data.binary === undefined) {
						responseCallback(new Error('No binary data to return got found.'), {});
						didSendResponse = true;
					}

					const responseBinaryPropertyName = workflow.expression.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['responseBinaryPropertyName'], executionMode, 'data');

					if (responseBinaryPropertyName === undefined && didSendResponse === false) {
						responseCallback(new Error('No "responseBinaryPropertyName" is set.'), {});
						didSendResponse = true;
					}

					const binaryData = (data.binary as IBinaryKeyData)[responseBinaryPropertyName as string];
					if (binaryData === undefined && didSendResponse === false) {
						responseCallback(new Error(`The binary property "${responseBinaryPropertyName}" which should be returned does not exist.`), {});
						didSendResponse = true;
					}

					if (didSendResponse === false) {
						// Send the webhook response manually
						res.setHeader('Content-Type', binaryData.mimeType);
						res.end(Buffer.from(binaryData.data, BINARY_ENCODING));

						responseCallback(null, {
							noWebhookResponse: true,
						});
					}

				} else {
					// Return the JSON data of all the entries
					data = [];
					for (const entry of returnData.data!.main[0]!) {
						data.push(entry.json);
					}
				}

				if (didSendResponse === false) {
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
			if (didSendResponse === false) {
				responseCallback(new Error('There was a problem executing the workflow.'), {});
			}

			throw new ResponseHelper.ResponseError(e.message, 500, 500);
		});

		return executionId;

	} catch (e) {
		if (didSendResponse === false) {
			responseCallback(new Error('There was a problem executing the workflow.'), {});
		}

		throw new ResponseHelper.ResponseError(e.message, 500, 500);
	}
}


/**
 * Returns the base URL of the webhooks
 *
 * @export
 * @returns
 */
export function getWebhookBaseUrl() {
	let urlBaseWebhook = GenericHelpers.getBaseUrl();

	// We renamed WEBHOOK_TUNNEL_URL to WEBHOOK_URL. This is here to maintain
	// backward compatibility. Will be deprecated and removed in the future.
	if (process.env.WEBHOOK_TUNNEL_URL !== undefined || process.env.WEBHOOK_URL !== undefined) {
		// @ts-ignore
		urlBaseWebhook = process.env.WEBHOOK_TUNNEL_URL || process.env.WEBHOOK_URL;
	}

	return urlBaseWebhook;
}
