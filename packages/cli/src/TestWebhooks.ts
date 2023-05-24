/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-param-reassign */
import type express from 'express';
import { Service } from 'typedi';

import type {
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	WebhookHttpMethod,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { ActiveWebhooks } from '@/ActiveWebhooks';
import type { IResponseCallbackData, IWorkflowDb } from '@/Interfaces';
import { Push } from '@/push';
import * as ResponseHelper from '@/ResponseHelper';
import * as WebhookHelpers from '@/WebhookHelpers';
import { webhookNotFoundErrorMessage } from './utils';

const WEBHOOK_TEST_UNREGISTERED_HINT =
	"Click the 'Execute workflow' button on the canvas, then try again. (In test mode, the webhook only works for one call after you click this button)";

@Service()
export class TestWebhooks {
	private testWebhookData: {
		[key: string]: {
			sessionId?: string;
			timeout: NodeJS.Timeout;
			workflowData: IWorkflowDb;
			workflow: Workflow;
			destinationNode?: string;
		};
	} = {};

	constructor(private activeWebhooks: ActiveWebhooks, private push: Push) {
		activeWebhooks.testWebhooks = true;
	}

	/**
	 * Executes a test-webhook and returns the data. It also makes sure that the
	 * data gets additionally send to the UI. After the request got handled it
	 * automatically remove the test-webhook.
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

		const { activeWebhooks, push, testWebhookData } = this;

		let webhookData: IWebhookData | undefined = activeWebhooks.get(httpMethod, path);

		// check if path is dynamic
		if (webhookData === undefined) {
			const pathElements = path.split('/');
			const webhookId = pathElements.shift();
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			webhookData = activeWebhooks.get(httpMethod, pathElements.join('/'), webhookId);
			if (webhookData === undefined) {
				// The requested webhook is not registered
				const methods = await this.getWebhookMethods(path);
				throw new ResponseHelper.NotFoundError(
					webhookNotFoundErrorMessage(path, httpMethod, methods),
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

		const { workflowId } = webhookData;
		const webhookKey = `${activeWebhooks.getWebhookKey(
			webhookData.httpMethod,
			webhookData.path,
			webhookData.webhookId,
		)}|${workflowId}`;

		// TODO: Clean that duplication up one day and improve code generally
		if (testWebhookData[webhookKey] === undefined) {
			// The requested webhook is not registered
			const methods = await this.getWebhookMethods(path);
			throw new ResponseHelper.NotFoundError(
				webhookNotFoundErrorMessage(path, httpMethod, methods),
				WEBHOOK_TEST_UNREGISTERED_HINT,
			);
		}

		const { destinationNode, sessionId, workflow, workflowData, timeout } =
			testWebhookData[webhookKey];

		// Get the node which has the webhook defined to know where to start from and to
		// get additional data
		const workflowStartNode = workflow.getNode(webhookData.node);
		if (workflowStartNode === null) {
			throw new ResponseHelper.NotFoundError('Could not find node to process webhook.');
		}

		// eslint-disable-next-line no-async-promise-executor
		return new Promise(async (resolve, reject) => {
			try {
				const executionMode = 'manual';
				const executionId = await WebhookHelpers.executeWebhook(
					workflow,
					webhookData!,
					workflowData,
					workflowStartNode,
					executionMode,
					sessionId,
					undefined,
					undefined,
					request,
					response,
					(error: Error | null, data: IResponseCallbackData) => {
						if (error !== null) reject(error);
						else resolve(data);
					},
					destinationNode,
				);

				// The workflow did not run as the request was probably setup related
				// or a ping so do not resolve the promise and wait for the real webhook
				// request instead.
				if (executionId === undefined) return;

				// Inform editor-ui that webhook got received
				if (sessionId !== undefined) {
					push.send('testWebhookReceived', { workflowId, executionId }, sessionId);
				}
			} catch {}

			// Delete webhook also if an error is thrown
			if (timeout) clearTimeout(timeout);
			delete testWebhookData[webhookKey];

			await activeWebhooks.removeWorkflow(workflow);
		});
	}

	/**
	 * Gets all request methods associated with a single test webhook
	 */
	async getWebhookMethods(path: string): Promise<string[]> {
		const webhookMethods = this.activeWebhooks.getWebhookMethods(path);
		if (!webhookMethods.length) {
			// The requested webhook is not registered
			throw new ResponseHelper.NotFoundError(
				webhookNotFoundErrorMessage(path),
				WEBHOOK_TEST_UNREGISTERED_HINT,
			);
		}

		return webhookMethods;
	}

	/**
	 * Checks if it has to wait for webhook data to execute the workflow.
	 * If yes it waits for it and resolves with the result of the workflow if not it simply resolves with undefined
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
			this.cancelTestWebhook(workflowData.id);
		}, 120000);

		const { activeWebhooks, testWebhookData } = this;

		let key: string;
		const activatedKey: string[] = [];
		// eslint-disable-next-line no-restricted-syntax
		for (const webhookData of webhooks) {
			key = `${activeWebhooks.getWebhookKey(
				webhookData.httpMethod,
				webhookData.path,
				webhookData.webhookId,
			)}|${workflowData.id}`;

			activatedKey.push(key);

			testWebhookData[key] = {
				sessionId,
				timeout,
				workflow,
				workflowData,
				destinationNode,
			};

			try {
				// eslint-disable-next-line no-await-in-loop
				await activeWebhooks.add(workflow, webhookData, mode, activation);
			} catch (error) {
				activatedKey.forEach((deleteKey) => delete testWebhookData[deleteKey]);
				// eslint-disable-next-line no-await-in-loop
				await activeWebhooks.removeWorkflow(workflow);
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
		const { activeWebhooks, push, testWebhookData } = this;
		// eslint-disable-next-line no-restricted-syntax
		for (const webhookKey of Object.keys(testWebhookData)) {
			const { sessionId, timeout, workflow, workflowData } = testWebhookData[webhookKey];

			if (workflowData.id !== workflowId) {
				// eslint-disable-next-line no-continue
				continue;
			}

			clearTimeout(timeout);

			// Inform editor-ui that webhook got received
			if (sessionId !== undefined) {
				try {
					push.send('testWebhookDeleted', { workflowId }, sessionId);
				} catch {
					// Could not inform editor, probably is not connected anymore. So simply go on.
				}
			}

			// Remove the webhook
			delete testWebhookData[webhookKey];

			if (!foundWebhook) {
				// As it removes all webhooks of the workflow execute only once
				void activeWebhooks.removeWorkflow(workflow);
			}

			foundWebhook = true;
		}

		return foundWebhook;
	}

	/**
	 * Removes all the currently active test webhooks
	 */
	async removeAll(): Promise<void> {
		const workflows = Object.values(this.testWebhookData).map(({ workflow }) => workflow);
		return this.activeWebhooks.removeAll(workflows);
	}
}
