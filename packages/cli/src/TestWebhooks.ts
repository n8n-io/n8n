import * as express from 'express';

import {
	IResponseCallbackData,
	IWorkflowDb,
	NodeTypes,
	Push,
	ResponseHelper,
	WebhookHelpers,
	WorkflowHelpers,
} from './';

import {
	ActiveWebhooks,
} from 'n8n-core';

import {
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	WebhookHttpMethod,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';



export class TestWebhooks {

	private testWebhookData: {
		[key: string]: {
			sessionId?: string;
			timeout: NodeJS.Timeout,
			workflowData: IWorkflowDb;
		};
	} = {};
	private activeWebhooks: ActiveWebhooks | null = null;


	constructor() {
		this.activeWebhooks = new ActiveWebhooks();
		this.activeWebhooks.testWebhooks = true;
	}


	/**
	 * Executes a test-webhook and returns the data. It also makes sure that the
	 * data gets additionally send to the UI. After the request got handled it
	 * automatically remove the test-webhook.
	 *
	 * @param {WebhookHttpMethod} httpMethod
	 * @param {string} path
	 * @param {express.Request} request
	 * @param {express.Response} response
	 * @returns {Promise<object>}
	 * @memberof TestWebhooks
	 */
	async callTestWebhook(httpMethod: WebhookHttpMethod, path: string, request: express.Request, response: express.Response): Promise<IResponseCallbackData> {
		const webhookData: IWebhookData | undefined = this.activeWebhooks!.get(httpMethod, path);

		if (webhookData === undefined) {
			// The requested webhook is not registered
			throw new ResponseHelper.ResponseError(`The requested webhook "${httpMethod} ${path}" is not registered.`, 404, 404);
		}

		const webhookKey = this.activeWebhooks!.getWebhookKey(webhookData.httpMethod, webhookData.path);

		const workflowData = this.testWebhookData[webhookKey].workflowData;

		const nodeTypes = NodeTypes();
		const workflow = new Workflow({ id: webhookData.workflowId, name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, nodeTypes, staticData: workflowData.staticData, settings: workflowData.settings});

		// Get the node which has the webhook defined to know where to start from and to
		// get additional data
		const workflowStartNode = workflow.getNode(webhookData.node);
		if (workflowStartNode === null) {
			throw new ResponseHelper.ResponseError('Could not find node to process webhook.', 404, 404);
		}

		return new Promise(async (resolve, reject) => {
			try {
				const executionMode = 'manual';
				const executionId = await WebhookHelpers.executeWebhook(workflow, webhookData, this.testWebhookData[webhookKey].workflowData, workflowStartNode, executionMode, this.testWebhookData[webhookKey].sessionId, request, response, (error: Error | null, data: IResponseCallbackData) => {
					if (error !== null) {
						return reject(error);
					}
					resolve(data);
				});

				if (executionId === undefined) {
					// The workflow did not run as the request was probably setup related
					// or a ping so do not resolve the promise and wait for the real webhook
					// request instead.
					return;
				}

				// Inform editor-ui that webhook got received
				if (this.testWebhookData[webhookKey].sessionId !== undefined) {
					const pushInstance = Push.getInstance();
					pushInstance.send('testWebhookReceived', { workflowId: webhookData.workflowId, executionId }, this.testWebhookData[webhookKey].sessionId!);
				}

			} catch (error) {
				// Delete webhook also if an error is thrown
			}

			// Remove the webhook
			clearTimeout(this.testWebhookData[webhookKey].timeout);
			delete this.testWebhookData[webhookKey];
			this.activeWebhooks!.removeWorkflow(workflow);
		});
	}

	/**
	 * Gets all request methods associated with a single test webhook
	 * @param path webhook path
	 */
	async getWebhookMethods(path : string) : Promise<string[]> {
		const webhookMethods: string[] = this.activeWebhooks!.getWebhookMethods(path);

		if (webhookMethods === undefined) {
			// The requested webhook is not registered
			throw new ResponseHelper.ResponseError(`The requested webhook "${path}" is not registered.`, 404, 404);
		}

		return webhookMethods;
	}


	/**
	 * Checks if it has to wait for webhook data to execute the workflow. If yes it waits
	 * for it and resolves with the result of the workflow if not it simply resolves
	 * with undefined
	 *
	 * @param {IWorkflowDb} workflowData
	 * @param {Workflow} workflow
	 * @returns {(Promise<IExecutionDb | undefined>)}
	 * @memberof TestWebhooks
	 */
	async needsWebhookData(workflowData: IWorkflowDb, workflow: Workflow, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode, sessionId?: string, destinationNode?: string): Promise<boolean> {
		const webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, destinationNode);

		if (webhooks.length === 0) {
			// No Webhooks found
			return false;
		}

		if (workflow.id === undefined) {
			throw new Error('Webhooks can only be added for saved workflows as an id is needed!');
		}

		// Remove test-webhooks automatically if they do not get called (after 120 seconds)
		const timeout = setTimeout(() => {
			this.cancelTestWebhook(workflowData.id.toString());
		}, 120000);

		let key: string;
		for (const webhookData of webhooks) {
			key = this.activeWebhooks!.getWebhookKey(webhookData.httpMethod, webhookData.path);

			await this.activeWebhooks!.add(workflow, webhookData, mode);

			this.testWebhookData[key] = {
				sessionId,
				timeout,
				workflowData,
			};

			// Save static data!
			this.testWebhookData[key].workflowData.staticData = workflow.staticData;
		}

		return true;
 	}


	/**
	 * Removes a test webhook of the workflow with the given id
	 *
	 * @param {string} workflowId
	 * @returns {boolean}
	 * @memberof TestWebhooks
	 */
	cancelTestWebhook(workflowId: string): boolean {
		const nodeTypes = NodeTypes();

		let foundWebhook = false;
		for (const webhookKey of Object.keys(this.testWebhookData)) {
			const webhookData = this.testWebhookData[webhookKey];

			if (webhookData.workflowData.id.toString() !== workflowId) {
				continue;
			}

			foundWebhook = true;

			clearTimeout(this.testWebhookData[webhookKey].timeout);

			// Inform editor-ui that webhook got received
			if (this.testWebhookData[webhookKey].sessionId !== undefined) {
				try {
					const pushInstance = Push.getInstance();
					pushInstance.send('testWebhookDeleted', { workflowId }, this.testWebhookData[webhookKey].sessionId!);
				} catch (error) {
					// Could not inform editor, probably is not connected anymore. So sipmly go on.
				}
			}

			const workflowData = webhookData.workflowData;
			const workflow = new Workflow({ id: workflowData.id.toString(), name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, nodeTypes, staticData: workflowData.staticData, settings: workflowData.settings });

			// Remove the webhook
			delete this.testWebhookData[webhookKey];
			this.activeWebhooks!.removeWorkflow(workflow);
		}

		return foundWebhook;
	}


	/**
	 * Removes all the currently active test webhooks
	 */
	async removeAll(): Promise<void> {
		if (this.activeWebhooks === null) {
			return;
		}

		const nodeTypes = NodeTypes();

		let workflowData: IWorkflowDb;
		let workflow: Workflow;
		const workflows: Workflow[] = [];
		for (const webhookKey of Object.keys(this.testWebhookData)) {
			workflowData = this.testWebhookData[webhookKey].workflowData;
			workflow = new Workflow({ id: workflowData.id.toString(), name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, nodeTypes, staticData: workflowData.staticData, settings: workflowData.settings });
			workflows.push(workflow);
		}

		return this.activeWebhooks.removeAll(workflows);
	}
}

let testWebhooksInstance: TestWebhooks | undefined;

export function getInstance(): TestWebhooks {
	if (testWebhooksInstance === undefined) {
		testWebhooksInstance = new TestWebhooks();
	}

	return testWebhooksInstance;
}
