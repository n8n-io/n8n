import * as express from 'express';

import {
	GenericHelpers,
	IExecutionDb,
	IResponseCallbackData,
	IWorkflowDb,
	ResponseHelper,
	WorkflowExecuteAdditionalData,
} from './';

import {
	BINARY_ENCODING,
	ActiveExecutions,
	NodeExecuteFunctions,
	WorkflowExecute,
} from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	IExecuteData,
	INode,
	IRun,
	IRunExecutionData,
	ITaskData,
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	NodeHelpers,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

const activeExecutions = ActiveExecutions.getInstance();


/**
 * Returns the data of the last executed node
 *
 * @export
 * @param {IRun} inputData
 * @returns {(ITaskData | undefined)}
 */
export function getDataLastExecutedNodeData(inputData: IRun): ITaskData | undefined {
	const runData = inputData.data.resultData.runData;
	const lastNodeExecuted = inputData.data.resultData.lastNodeExecuted;

	if (lastNodeExecuted === undefined) {
		return undefined;
	}

	if (runData[lastNodeExecuted] === undefined) {
		return undefined;
	}

	return runData[lastNodeExecuted][runData[lastNodeExecuted].length - 1];
}


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
 export async function executeWebhook(webhookData: IWebhookData, workflowData: IWorkflowDb, workflowStartNode: INode, executionMode: WorkflowExecuteMode, sessionId: string | undefined, req: express.Request, res: express.Response, responseCallback: (error: Error | null, data: IResponseCallbackData) => void): Promise<string | undefined> {
	// Get the nodeType to know which responseMode is set
	const nodeType = webhookData.workflow.nodeTypes.getByName(workflowStartNode.type);
	if (nodeType === undefined) {
		const errorMessage = `The type of the webhook node "${workflowStartNode.name}" is not known.`;
		responseCallback(new Error(errorMessage), {});
		throw new ResponseHelper.ReponseError(errorMessage, 500, 500);
	}

	// Get the responseMode
	const reponseMode = webhookData.workflow.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['reponseMode'], 'onReceived');

	if (!['onReceived', 'lastNode'].includes(reponseMode as string)) {
		// If the mode is not known we error. Is probably best like that instead of using
		// the default that people know as early as possible (probably already testing phase)
		// that something does not resolve properly.
		const errorMessage = `The response mode ${reponseMode} is not valid!.`;
		responseCallback(new Error(errorMessage), {});
		throw new ResponseHelper.ReponseError(errorMessage, 500, 500);
	}

	// Prepare everything that is needed to run the workflow
	const additionalData = await WorkflowExecuteAdditionalData.get(executionMode, workflowData, webhookData.workflow, sessionId);
	const workflowExecute = new WorkflowExecute(additionalData, executionMode);

	// Add the Response and Request so that this data can be accessed in the node
	additionalData.httpRequest = req;
	additionalData.httpResponse = res;

	let didSendResponse = false;
	try {
		// Run the webhook function to see what should be returned and if
		// the workflow should be executed or not
		const webhookResultData = await webhookData.workflow.runWebhook(webhookData, workflowStartNode, additionalData, NodeExecuteFunctions, executionMode);

		if (webhookResultData.noWebhookResponse === true) {
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
				responseCallback(null, {
					data: webhookResultData.webhookResponse
				});
			} else {
				// Send default response
				responseCallback(null, {
					data: {
						message: 'Webhook call got received.',
					},
				});
			}
			return;
		}

		// Now that we know that the workflow should run we can return the default respons
		// directly if responseMode it set to "onReceived" and a respone should be sent
		if (reponseMode === 'onReceived' && didSendResponse === false) {
			// Return response directly and do not wait for the workflow to finish
			if (webhookResultData.webhookResponse !== undefined) {
				// Data to respond with is given
				responseCallback(null, {
					data: webhookResultData.webhookResponse,
				});
			} else {
				responseCallback(null, {
					data: {
						message: 'Workflow got started.',
					}
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
			},
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

		// Start now to run the workflow
		const executionId = await workflowExecute.runExecutionData(webhookData.workflow, runExecutionData);

		// Get a promise which resolves when the workflow did execute and send then response
		const executePromise = activeExecutions.getPostExecutePromise(executionId) as Promise<IExecutionDb | undefined>;
		executePromise.then((data) => {
			if (data === undefined) {
				if (didSendResponse === false) {
					responseCallback(null, {
						data: {
							message: 'Workflow did execute sucessfully but no data got returned.',
						}
					});
					didSendResponse = true;
				}
				return undefined;
			}

			const returnData = getDataLastExecutedNodeData(data);
			if (returnData === undefined) {
				if (didSendResponse === false) {
					responseCallback(null, {
						data: {
							message: 'Workflow did execute sucessfully but the last node did not return any data.',
						}
					});
				}
				didSendResponse = true;
				return data;
			} else if (returnData.error !== undefined) {
				if (didSendResponse === false) {
					responseCallback(null, {
						data: {
							message: 'Workflow did error.',
						}
					});
				}
				didSendResponse = true;
				return data;
			}

			const reponseData = webhookData.workflow.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['reponseData'], 'firstEntryJson');

			if (didSendResponse === false) {
				let data: IDataObject | IDataObject[];

				if (reponseData === 'firstEntryJson') {
					// Return the JSON data of the first entry
					data = returnData.data!.main[0]![0].json;
				} else if (reponseData === 'firstEntryBinary') {
					// Return the binary data of the first entry
					data = returnData.data!.main[0]![0];
					if (data.binary === undefined) {
						responseCallback(new Error('No binary data to return got found.'), {});
					}

					const responseBinaryPropertyName = webhookData.workflow.getSimpleParameterValue(workflowStartNode, webhookData.webhookDescription['responseBinaryPropertyName'], 'data');

					if (responseBinaryPropertyName === undefined) {
						responseCallback(new Error('No "responseBinaryPropertyName" is set.'), {});
					}

					const binaryData = (data.binary as IBinaryKeyData)[responseBinaryPropertyName as string];
					if (binaryData === undefined) {
						responseCallback(new Error(`The binary property "${responseBinaryPropertyName}" which should be returned does not exist.`), {});
					}

					// Send the webhook response manually
					res.setHeader('Content-Type', binaryData.mimeType);
					res.end(Buffer.from(binaryData.data, BINARY_ENCODING));

					responseCallback(null, {
						noWebhookResponse: true,
					});
				} else {
					// Return the JSON data of all the entries
					data = [];
					for (const entry of returnData.data!.main[0]!) {
						data.push(entry.json);
					}
				}

				responseCallback(null, {
					data,
				});
			}
			didSendResponse = true;

			return data;
		})
		.catch((e) => {
			if (didSendResponse === false) {
				responseCallback(new Error('There was a problem executing the workflow.'), {});
			}

			throw new ResponseHelper.ReponseError(e.message, 500, 500);
		});

		return executionId;

	} catch (e) {
		if (didSendResponse === false) {
			responseCallback(new Error('There was a problem executing the workflow.'), {});
		}

		throw new ResponseHelper.ReponseError(e.message, 500, 500);
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

	if (process.env.WEBHOOK_TUNNEL_URL !== undefined) {
		urlBaseWebhook = process.env.WEBHOOK_TUNNEL_URL;
	}

	return urlBaseWebhook;
}
