/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-param-reassign */
import express from 'express';

import { ActiveWebhooks } from 'n8n-core';

import {
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	WebhookHttpMethod,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
// eslint-disable-next-line import/no-cycle
import { IResponseCallbackData, IWorkflowDb, Push, ResponseHelper, WebhookHelpers } from '.';

const WEBHOOK_TEST_UNREGISTERED_HINT = `Click the 'Execute workflow' button on the canvas, then try again. (In test mode, the webhook only works for one call after you click this button)`;

export class TestWebhooks {
	private testWebhookData: {
		[key: string]: {
			sessionId?: string;
			timeout: NodeJS.Timeout;
			workflowData: IWorkflowDb;
			workflow: Workflow;
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
	 */
	async callTestWebhook(
		httpMethod: WebhookHttpMethod,
		path: string,
		request: express.Request,
		response: express.Response,
	): Promise<IResponseCallbackData> {
		// Reset request parameters
		request.params = {};

		// Remove trailing slash
		if (path.endsWith('/')) {
			path = path.slice(0, -1);
		}

		let webhookData: IWebhookData | undefined = this.activeWebhooks!.get(httpMethod, path);

		// check if path is dynamic
		if (webhookData === undefined) {
			const pathElements = path.split('/');
			const webhookId = pathElements.shift();
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			webhookData = this.activeWebhooks!.get(httpMethod, pathElements.join('/'), webhookId);
			if (webhookData === undefined) {
				// The requested webhook is not registered
				throw new ResponseHelper.ResponseError(
					`The requested webhook "${httpMethod} ${path}" is not registered.`,
					404,
					404,
					WEBHOOK_TEST_UNREGISTERED_HINT,
				);
			}

			path = webhookData.path;
			// extracting params from path
			path.split('/').forEach((ele, index) => {
				if (ele.startsWith(':')) {
					// write params to req.params
					request.params[ele.slice(1)] = pathElements[index];
				}
			});
		}

		const webhookKey = `${this.activeWebhooks!.getWebhookKey(
			webhookData.httpMethod,
			webhookData.path,
			webhookData.webhookId,
		)}|${webhookData.workflowId}`;

		// TODO: Clean that duplication up one day and improve code generally
		if (this.testWebhookData[webhookKey] === undefined) {
			// The requested webhook is not registered
			throw new ResponseHelper.ResponseError(
				`The requested webhook "${httpMethod} ${path}" is not registered.`,
				404,
				404,
				WEBHOOK_TEST_UNREGISTERED_HINT,
			);
		}

		const { workflow } = this.testWebhookData[webhookKey];

		// Get the node which has the webhook defined to know where to start from and to
		// get additional data
		const workflowStartNode = workflow.getNode(webhookData.node);
		if (workflowStartNode === null) {
			throw new ResponseHelper.ResponseError('Could not find node to process webhook.', 404, 404);
		}

		// eslint-disable-next-line no-async-promise-executor
		return new Promise(async (resolve, reject) => {
			try {
				const executionMode = 'manual';
				const executionId = await WebhookHelpers.executeWebhook(
					workflow,
					webhookData!,
					this.testWebhookData[webhookKey].workflowData,
					workflowStartNode,
					executionMode,
					this.testWebhookData[webhookKey].sessionId,
					undefined,
					undefined,
					request,
					response,
					(error: Error | null, data: IResponseCallbackData) => {
						if (error !== null) {
							return reject(error);
						}
						resolve(data);
					},
				);

				if (executionId === undefined) {
					// The workflow did not run as the request was probably setup related
					// or a ping so do not resolve the promise and wait for the real webhook
					// request instead.
					return;
				}

				// Inform editor-ui that webhook got received
				if (this.testWebhookData[webhookKey].sessionId !== undefined) {
					const pushInstance = Push.getInstance();
					pushInstance.send(
						'testWebhookReceived',
						{ workflowId: webhookData!.workflowId, executionId },
						this.testWebhookData[webhookKey].sessionId,
					);
				}
			} catch (error) {
				// Delete webhook also if an error is thrown
			}

			// Remove the webhook
			if (this.testWebhookData[webhookKey]) {
				clearTimeout(this.testWebhookData[webhookKey].timeout);
				delete this.testWebhookData[webhookKey];
			}
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this.activeWebhooks!.removeWorkflow(workflow);
		});
	}

	/**
	 * Gets all request methods associated with a single test webhook
	 * @param path webhook path
	 */
	async getWebhookMethods(path: string): Promise<string[]> {
		const webhookMethods: string[] = this.activeWebhooks!.getWebhookMethods(path);

		if (webhookMethods === undefined) {
			// The requested webhook is not registered
			throw new ResponseHelper.ResponseError(
				`The requested webhook "${path}" is not registered.`,
				404,
				404,
				WEBHOOK_TEST_UNREGISTERED_HINT,
			);
		}

		return webhookMethods;
	}

	/**
	 * Checks if it has to wait for webhook data to execute the workflow. If yes it waits
	 * for it and resolves with the result of the workflow if not it simply resolves
	 * with undefined
	 *
	 */
	async needsWebhookData(
		workflowData: IWorkflowDb,
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		sessionId?: string,
		destinationNode?: string,
	): Promise<boolean> {
		const webhooks = WebhookHelpers.getWorkflowWebhooks(
			workflow,
			additionalData,
			destinationNode,
			true,
		);
		if (!webhooks.find((webhook) => webhook.webhookDescription.restartWebhook !== true)) {
			// No webhooks found to start a workflow
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
		const activatedKey: string[] = [];
		// eslint-disable-next-line no-restricted-syntax
		for (const webhookData of webhooks) {
			key = `${this.activeWebhooks!.getWebhookKey(
				webhookData.httpMethod,
				webhookData.path,
				webhookData.webhookId,
			)}|${workflowData.id}`;

			activatedKey.push(key);

			this.testWebhookData[key] = {
				sessionId,
				timeout,
				workflow,
				workflowData,
			};

			try {
				// eslint-disable-next-line no-await-in-loop
				await this.activeWebhooks!.add(workflow, webhookData, mode, activation);
			} catch (error) {
				activatedKey.forEach((deleteKey) => delete this.testWebhookData[deleteKey]);
				// eslint-disable-next-line no-await-in-loop
				await this.activeWebhooks!.removeWorkflow(workflow);
				throw error;
			}
		}

		return true;
	}

	/**
	 * Removes a test webhook of the workflow with the given id
	 *
	 */
	cancelTestWebhook(workflowId: string): boolean {
		let foundWebhook = false;
		// eslint-disable-next-line no-restricted-syntax
		for (const webhookKey of Object.keys(this.testWebhookData)) {
			const webhookData = this.testWebhookData[webhookKey];

			if (webhookData.workflowData.id.toString() !== workflowId) {
				// eslint-disable-next-line no-continue
				continue;
			}

			clearTimeout(this.testWebhookData[webhookKey].timeout);

			// Inform editor-ui that webhook got received
			if (this.testWebhookData[webhookKey].sessionId !== undefined) {
				try {
					const pushInstance = Push.getInstance();
					pushInstance.send(
						'testWebhookDeleted',
						{ workflowId },
						this.testWebhookData[webhookKey].sessionId,
					);
				} catch (error) {
					// Could not inform editor, probably is not connected anymore. So simply go on.
				}
			}

			const { workflow } = this.testWebhookData[webhookKey];

			// Remove the webhook
			delete this.testWebhookData[webhookKey];

			if (!foundWebhook) {
				// As it removes all webhooks of the workflow execute only once
				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				this.activeWebhooks!.removeWorkflow(workflow);
			}

			foundWebhook = true;
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

		let workflow: Workflow;
		const workflows: Workflow[] = [];
		// eslint-disable-next-line no-restricted-syntax
		for (const webhookKey of Object.keys(this.testWebhookData)) {
			workflow = this.testWebhookData[webhookKey].workflow;
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
