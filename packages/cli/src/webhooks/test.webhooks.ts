import { Service } from 'typedi';
import type { Application, Response } from 'express';
import type {
	IWebhookData,
	IHttpRequestMethods,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	INode,
} from 'n8n-workflow';
import { NodeHelpers, WebhookPathAlreadyTakenError, Workflow } from 'n8n-workflow';
import * as NodeExecuteFunctions from 'n8n-core';

import config from '@/config';
import type { IWorkflowDb } from '@/Interfaces';
import { Push } from '@/push';
import { NodeTypes } from '@/NodeTypes';
import { NotFoundError, send } from '@/ResponseHelper';
import { webhookNotFoundErrorMessage } from '@/utils';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';

import { AbstractWebhooks } from './abstract.webhooks';
import type { RegisteredTestWebhook, WebhookRequest, WebhookResponseCallbackData } from './types';
import { WebhookService } from '@/services/webhook.service';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';

const WEBHOOK_TEST_UNREGISTERED_HINT =
	"Click the 'Execute workflow' button on the canvas, then try again. (In test mode, the webhook only works for one call after you click this button)";

interface TestWebhookData {
	sessionId: string;
	timeout: NodeJS.Timeout;
	workflowData: IWorkflowDb;
	workflow: Workflow;
	destinationNode?: string;
}

@Service()
export class TestWebhooks extends AbstractWebhooks<RegisteredTestWebhook> {
	override executionMode: WorkflowExecuteMode = 'manual';

	private testWebhookData: Record<string, TestWebhookData> = {};

	private workflowWebhooks: Record<string, IWebhookData[]> = {};

	private webhookUrls: Record<string, IWebhookData[]> = {};

	constructor(
		nodeTypes: NodeTypes,
		private push: Push,
		private webhookService: WebhookService,
	) {
		super(nodeTypes);
	}

	override registerHandler(app: Application) {
		const prefix = config.getEnv('endpoints.webhookTest');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		app.all(`/${prefix}/:path(*)`, this.handleRequest.bind(this));

		// Removes a test webhook
		// TODO UM: check if this needs validation with user management.
		const restEndpoint = config.getEnv('endpoints.rest');
		app.delete(
			`/${restEndpoint}/test-webhook/:id`,
			send(async (req) => this.cancelTestWebhook(req.params.id)),
		);
	}

	/**
	 * Executes a test-webhook and returns the data.
	 * It also makes sure that the data gets additionally send to the UI.
	 * After the request got handled it automatically remove the test-webhook.
	 */
	override async executeWebhook(
		webhook: RegisteredTestWebhook,
		request: WebhookRequest,
		response: Response,
		pathOrId: string,
		method: IHttpRequestMethods,
	): Promise<WebhookResponseCallbackData> {
		const { sessionId, workflow, destinationNode, timeout } = webhook;

		const workflowData = this.workflows.get(workflow.id);
		if (!workflowData) {
			throw new NotFoundError(`Could not find workflow with id "${workflow.id}"`);
		}

		return new Promise(async (resolve, reject) => {
			try {
				const executionId = await this.startWebhookExecution(
					webhook,
					request,
					response,
					workflowData,
					(error: Error | null, data: WebhookResponseCallbackData) => {
						if (error !== null) reject(error);
						else resolve(data);
					},
					undefined,
					undefined,
					destinationNode,
				);

				// The workflow did not run as the request was probably setup related
				// or a ping so do not resolve the promise and wait for the real webhook
				// request instead.
				if (executionId === undefined) return;

				// Inform editor-ui that webhook got received
				this.push.send('testWebhookReceived', { workflowId: workflow.id, executionId }, sessionId);
			} catch {}

			// Delete webhook also if an error is thrown
			if (timeout) clearTimeout(timeout);

			this.unregisterWebhook(pathOrId, method);
		});
	}

	/**
	 * Checks if it has to wait for webhook data to execute the workflow.
	 * If yes it waits for it and resolves with the result of the workflow if not it simply resolves with undefined
	 */
	async needsWebhookData(
		ownerId: string,
		workflowData: IWorkflowDb,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		sessionId: string,
		destinationNode?: string,
	): Promise<boolean> {
		const additionalData = await WorkflowExecuteAdditionalData.getBase(ownerId);
		const workflow = new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes: this.nodeTypes,
			staticData: undefined,
			settings: workflowData.settings,
		});

		const webhooks = this.getWorkflowWebhooks(workflow, additionalData, destinationNode, true);
		if (!webhooks.find((webhook) => webhook.webhookDescription.restartWebhook !== true)) {
			// No webhooks found to start a workflow
			return false;
		}

		// Remove test-webhooks automatically if they do not get called (after 120 seconds)
		const timeout = setTimeout(() => {
			this.cancelTestWebhook(workflowData.id);
		}, 120000);

		for (const webhookData of webhooks) {
			// Get the node which has the webhook defined to know where to start from and to get additional data
			const node = workflow.getNode(webhookData.node) as INode;
			node.name = webhookData.node;

			const path = webhookData.path;

			const webhook = this.webhookService.createWebhook({
				workflowId: webhookData.workflowId,
				webhookPath: path,
				node: node.name,
				method: webhookData.httpMethod,
			});

			if (webhook.webhookPath.startsWith('/')) {
				webhook.webhookPath = webhook.webhookPath.slice(1);
			}
			if (webhook.webhookPath.endsWith('/')) {
				webhook.webhookPath = webhook.webhookPath.slice(0, -1);
			}

			if ((path.startsWith(':') || path.includes('/:')) && node.webhookId) {
				webhook.webhookId = node.webhookId;
				webhook.pathLength = webhook.webhookPath.split('/').length;
			}

			const pathOrId = webhook.isDynamic ? webhook.webhookId! : webhook.webhookPath;

			// TODO: check that there is not a webhook already registered with that path/method
			try {
				// Make the webhook available directly because sometimes to create it successfully it gets called
				await workflow.createWebhookIfNotExists(
					webhookData,
					NodeExecuteFunctions,
					mode,
					activation,
					true,
				);
			} catch (error) {
				await this.removeWorkflow(workflow);
				throw error;
			}

			// Get the node which has the webhook defined to know where to start from and to get additional data
			this.registerWebhook(pathOrId, webhook.method, {
				isDynamic: webhook.isDynamic,
				webhookPath: webhook.webhookPath,
				node,
				workflow,
				description: webhookData.webhookDescription,
				sessionId,
				timeout,
			});
		}

		this.workflows.set(workflowData.id, workflowData);

		return true;
	}

	/** Removes a test webhook of the workflow with the given id */
	private cancelTestWebhook(workflowId: string): boolean {
		let foundWebhook = false;
		const { push, testWebhookData } = this;

		for (const webhookKey of Object.keys(testWebhookData)) {
			const { sessionId, timeout, workflow, workflowData } = testWebhookData[webhookKey];

			if (workflowData.id !== workflowId) {
				continue;
			}

			clearTimeout(timeout);

			// Inform editor-ui that webhook got received
			push.send('testWebhookDeleted', { workflowId }, sessionId);

			// Remove the webhook
			delete testWebhookData[webhookKey];

			if (!foundWebhook) {
				// As it removes all webhooks of the workflow execute only once
				void this.removeWorkflow(workflow);
			}

			foundWebhook = true;
		}

		return foundWebhook;
	}

	/** Removes all the currently active test webhooks */
	async removeAll(): Promise<void> {
		const removePromises = Object.values(this.testWebhookData).map(async ({ workflow }) =>
			this.removeWorkflow(workflow),
		);
		await Promise.all(removePromises);
	}

	/** Returns webhookData if a webhook with matches is currently registered */
	private get(
		httpMethod: IHttpRequestMethods,
		path: string,
		webhookId?: string,
	): IWebhookData | undefined {
		const webhookKey = this.getWebhookKey(httpMethod, path, webhookId);
		if (this.webhookUrls[webhookKey] === undefined) {
			return undefined;
		}

		let webhook: IWebhookData | undefined;
		let maxMatches = 0;
		const pathElementsSet = new Set(path.split('/'));
		// check if static elements match in path
		// if more results have been returned choose the one with the most static-route matches
		this.webhookUrls[webhookKey].forEach((dynamicWebhook) => {
			const staticElements = dynamicWebhook.path.split('/').filter((ele) => !ele.startsWith(':'));
			const allStaticExist = staticElements.every((staticEle) => pathElementsSet.has(staticEle));

			if (allStaticExist && staticElements.length > maxMatches) {
				maxMatches = staticElements.length;
				webhook = dynamicWebhook;
			}
			// handle routes with no static elements
			else if (staticElements.length === 0 && !webhook) {
				webhook = dynamicWebhook;
			}
		});

		return webhook;
	}

	/** Returns key to uniquely identify a webhook */
	private getWebhookKey(httpMethod: IHttpRequestMethods, path: string, webhookId?: string): string {
		if (webhookId) {
			if (path.startsWith(webhookId)) {
				const cutFromIndex = path.indexOf('/') + 1;

				path = path.slice(cutFromIndex);
			}
			return `${httpMethod}|${webhookId}|${path.split('/').length}`;
		}
		return `${httpMethod}|${path}`;
	}

	/** Removes all webhooks of a workflow */
	private async removeWorkflow(workflow: Workflow): Promise<boolean> {
		const workflowId = workflow.id;

		if (this.workflowWebhooks[workflowId] === undefined) {
			// If it did not exist then there is nothing to remove
			return false;
		}

		const webhooks = this.workflowWebhooks[workflowId];

		const mode = 'internal';

		// Go through all the registered webhooks of the workflow and remove them

		for (const webhookData of webhooks) {
			await workflow.deleteWebhook(webhookData, NodeExecuteFunctions, mode, 'update', true);

			delete this.webhookUrls[
				this.getWebhookKey(webhookData.httpMethod, webhookData.path, webhookData.webhookId)
			];
		}

		// Remove also the workflow-webhook entry
		delete this.workflowWebhooks[workflowId];

		return true;
	}
}
