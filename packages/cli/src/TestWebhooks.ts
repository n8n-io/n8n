import * as express from 'express';
import {
	In as findIn,
	FindManyOptions,
} from 'typeorm';

import {
	Db,
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
			// The requested webhook is not registred
			throw new ResponseHelper.ResponseError('The requested webhook is not registred.', 404, 404);
		}

		const workflowData = await Db.collections.Workflow!.findOne(webhookData.workflowId);
		if (workflowData === undefined) {
			throw new ResponseHelper.ResponseError(`Could not find workflow with id "${webhookData.workflowId}"`, 404, 404);
		}

		const nodeTypes = NodeTypes();
		const workflow = new Workflow(webhookData.workflowId, workflowData.nodes, workflowData.connections, workflowData.active, nodeTypes, workflowData.staticData, workflowData.settings);

		// Get the node which has the webhook defined to know where to start from and to
		// get additional data
		const workflowStartNode = workflow.getNode(webhookData.node);
		if (workflowStartNode === null) {
			throw new ResponseHelper.ResponseError('Could not find node to process webhook.', 404, 404);
		}

		const webhookKey = this.activeWebhooks!.getWebhookKey(webhookData.httpMethod, webhookData.path);

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

		// Remove test-webhooks automatically if they do not get called (after 120 seconds)
		const timeout = setTimeout(() => {
			this.cancelTestWebhook(workflowData.id.toString(), workflow);
		}, 120000);

		let key: string;
		for (const webhookData of webhooks) {
			key = this.activeWebhooks!.getWebhookKey(webhookData.httpMethod, webhookData.path);
			this.testWebhookData[key] = {
				sessionId,
				timeout,
				workflowData,
			};
			await this.activeWebhooks!.add(workflow, webhookData, mode);
		}

		// Save static data!
		await WorkflowHelpers.saveStaticData(workflow);

		return true;
 	}


	/**
	 * Removes a test webhook of the workflow with the given id
	 *
	 * @param {string} workflowId
	 * @returns {boolean}
	 * @memberof TestWebhooks
	 */
	cancelTestWebhook(workflowId: string, workflow: Workflow): boolean {
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

		/*
		 * Here I check first if WorkflowIds is empty. This is done because when entering an empty array for TypeORM's In option, a syntax error is generated in MySQL.
		 * Because the SQL is: ... FROM `workflow_entity`` WorkflowEntity` WHERE `WorkflowEntity`.`id` IN ()
		 *
		 * The empty IN function is not accepted in MySQL.
		 */
		const WorkflowIds = this.activeWebhooks.getWorkflowIds();
		if (WorkflowIds.length > 0) {
			const findQuery = {
				where: {
					id: findIn(WorkflowIds)
				},
			} as FindManyOptions;

			const workflowsDb = await Db.collections.Workflow!.find(findQuery);
			const workflows: Workflow[] = [];
			for (const workflowData of workflowsDb) {
				const workflow = new Workflow(workflowData.id.toString(), workflowData.nodes, workflowData.connections, workflowData.active, nodeTypes, workflowData.staticData, workflowData.settings);
				workflows.push(workflow);
			}

			return this.activeWebhooks.removeAll(workflows);
		}
	}
}

let testWebhooksInstance: TestWebhooks | undefined;

export function getInstance(): TestWebhooks {
	if (testWebhooksInstance === undefined) {
		testWebhooksInstance = new TestWebhooks();
	}

	return testWebhooksInstance;
}
