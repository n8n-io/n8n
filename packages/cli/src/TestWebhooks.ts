import type express from 'express';
import { Service } from 'typedi';

import {
	type IWebhookData,
	type IWorkflowExecuteAdditionalData,
	type IHttpRequestMethods,
	type Workflow,
	type WorkflowActivateMode,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { ActiveWebhooks } from '@/ActiveWebhooks';
import type {
	IResponseCallbackData,
	IWebhookManager,
	IWorkflowDb,
	WebhookAccessControlOptions,
	WebhookRequest,
} from '@/Interfaces';
import { Push } from '@/push';
import { NodeTypes } from '@/NodeTypes';
import * as WebhookHelpers from '@/WebhookHelpers';
import { NotFoundError } from './errors/response-errors/not-found.error';
import { TIME } from './constants';
import { IdLessWorkflowError } from './errors/id-less-workflow.error';
import { WebhookNotFoundError } from './errors/response-errors/webhook-not-found.error';

@Service()
export class TestWebhooks implements IWebhookManager {
	constructor(
		private readonly activeWebhooks: ActiveWebhooks,
		private readonly push: Push,
		private readonly nodeTypes: NodeTypes,
	) {
		activeWebhooks.testWebhooks = true;
	}

	private testWebhooks: {
		[key: string]: {
			sessionId?: string;
			timeout: NodeJS.Timeout;
			workflowEntity: IWorkflowDb;
			workflow: Workflow;
			destinationNode?: string;
		};
	} = {};

	private isRegistered(key: string) {
		return key in this.testWebhooks;
	}

	private toTestWebhookKey(webhook: IWebhookData, workflowId: string) {
		return [
			this.activeWebhooks.getWebhookKey(webhook.httpMethod, webhook.path, webhook.webhookId),
			workflowId,
		].join('|');
	}

	/**
	 * Executes a test-webhook and returns the data. It also makes sure that the
	 * data gets additionally send to the UI. After the request got handled it
	 * automatically remove the test-webhook.
	 */
	async executeWebhook(
		request: WebhookRequest,
		response: express.Response,
	): Promise<IResponseCallbackData> {
		const httpMethod = request.method;

		let path = request.params.path.endsWith('/')
			? request.params.path.slice(0, -1)
			: request.params.path;

		request.params = {} as WebhookRequest['params'];

		let webhook = this.activeWebhooks.get(httpMethod, path);

		if (!webhook) {
			// no static webhook, so check if dynamic
			// e.g. `/webhook-test/<uuid>/user/:id/create`

			const [webhookId, ...segments] = path.split('/');

			webhook = this.activeWebhooks.get(httpMethod, segments.join('/'), webhookId);

			if (!webhook)
				throw new WebhookNotFoundError({
					path,
					httpMethod,
					webhookMethods: await this.getWebhookMethods(path),
				});

			path = webhook.path;

			path.split('/').forEach((segment, index) => {
				if (segment.startsWith(':')) {
					request.params[segment.slice(1)] = segments[index];
				}
			});
		}

		const key = this.toTestWebhookKey(webhook, webhook.workflowId);

		if (!this.isRegistered(key))
			throw new WebhookNotFoundError({
				path,
				httpMethod,
				webhookMethods: await this.getWebhookMethods(path),
			});

		const { destinationNode, sessionId, workflow, workflowEntity, timeout } =
			this.testWebhooks[key];

		// Get the node which has the webhook defined to know where to start from and to
		// get additional data
		const workflowStartNode = workflow.getNode(webhook.node);
		if (workflowStartNode === null) {
			throw new NotFoundError('Could not find node to process webhook.');
		}

		return new Promise(async (resolve, reject) => {
			try {
				const executionMode = 'manual';
				const executionId = await WebhookHelpers.executeWebhook(
					workflow,
					webhook!,
					workflowEntity,
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
					this.push.send(
						'testWebhookReceived',
						{ workflowId: webhook?.workflowId, executionId },
						sessionId,
					);
				}
			} catch {}

			// Delete webhook also if an error is thrown
			if (timeout) clearTimeout(timeout);
			delete this.testWebhooks[key];

			await this.activeWebhooks.removeWorkflow(workflow);
		});
	}

	async getWebhookMethods(path: string): Promise<IHttpRequestMethods[]> {
		const webhookMethods = this.activeWebhooks.getWebhookMethods(path);

		if (!webhookMethods.length) throw new WebhookNotFoundError({ path });

		return webhookMethods;
	}

	async findAccessControlOptions(path: string, httpMethod: IHttpRequestMethods) {
		const webhookKey = Object.keys(this.testWebhooks).find(
			(key) => key.includes(path) && key.startsWith(httpMethod),
		);

		if (!webhookKey) return;

		const { workflow } = this.testWebhooks[webhookKey];
		const webhookNode = Object.values(workflow.nodes).find(
			({ type, parameters, typeVersion }) =>
				parameters?.path === path &&
				(parameters?.httpMethod ?? 'GET') === httpMethod &&
				'webhook' in this.nodeTypes.getByNameAndVersion(type, typeVersion),
		);

		return webhookNode?.parameters?.options as WebhookAccessControlOptions;
	}

	async needsWebhook(
		workflowEntity: IWorkflowDb,
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		sessionId?: string,
		destinationNode?: string,
	) {
		if (!workflow.id) throw new IdLessWorkflowError(workflow);

		const webhooks = WebhookHelpers.getWorkflowWebhooks(
			workflow,
			additionalData,
			destinationNode,
			true,
		);

		if (!webhooks.find((w) => w.webhookDescription.restartWebhook !== true)) {
			return false; // no webhooks found to start a workflow
		}

		const timeout = setTimeout(() => {
			this.cancelTestWebhook(workflowEntity.id);
		}, 2 * TIME.MINUTE);

		const activatedKeys: string[] = [];

		for (const webhook of webhooks) {
			const key = this.toTestWebhookKey(webhook, workflowEntity.id);

			activatedKeys.push(key);

			this.testWebhooks[key] = {
				sessionId,
				timeout,
				workflow,
				workflowEntity,
				destinationNode,
			};

			try {
				await this.activeWebhooks.add(workflow, webhook, mode, activation);
			} catch (error) {
				activatedKeys.forEach((ak) => delete this.testWebhooks[ak]);

				await this.activeWebhooks.removeWorkflow(workflow);

				throw error;
			}
		}

		return true;
	}

	cancelTestWebhook(workflowId: string) {
		let foundWebhook = false;

		for (const key of Object.keys(this.testWebhooks)) {
			const { sessionId, timeout, workflow, workflowEntity } = this.testWebhooks[key];

			if (workflowEntity.id !== workflowId) continue;

			clearTimeout(timeout);

			if (sessionId !== undefined) {
				try {
					this.push.send('testWebhookDeleted', { workflowId }, sessionId);
				} catch {
					// Could not inform editor, probably is not connected anymore. So simply go on.
				}
			}

			delete this.testWebhooks[key];

			if (!foundWebhook) {
				// As it removes all webhooks of the workflow execute only once
				void this.activeWebhooks.removeWorkflow(workflow);
			}

			foundWebhook = true;
		}

		return foundWebhook;
	}
}
