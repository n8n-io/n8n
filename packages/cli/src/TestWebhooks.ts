import type express from 'express';
import { Service } from 'typedi';
import {
	type IWebhookData,
	type IWorkflowExecuteAdditionalData,
	type IHttpRequestMethods,
	WebhookPathTakenError,
	Workflow,
} from 'n8n-workflow';
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
import { TIME } from '@/constants';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowMissingIdError } from '@/errors/workflow-missing-id.error';
import { WebhookNotFoundError } from '@/errors/response-errors/webhook-not-found.error';
import * as NodeExecuteFunctions from 'n8n-core';
import { removeTrailingSlash } from './utils';
import { TestWebhookRegistrationsService } from '@/services/test-webhook-registrations.service';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';

@Service()
export class TestWebhooks implements IWebhookManager {
	constructor(
		private readonly push: Push,
		private readonly nodeTypes: NodeTypes,
		private readonly registrations: TestWebhookRegistrationsService,
	) {}

	private timeouts: { [webhookKey: string]: NodeJS.Timeout } = {};

	/**
	 * Return a promise that resolves when the test webhook is called.
	 * Also inform the FE of the result and remove the test webhook.
	 */
	async executeWebhook(
		request: WebhookRequest,
		response: express.Response,
	): Promise<IResponseCallbackData> {
		const httpMethod = request.method;

		let path = removeTrailingSlash(request.params.path);

		request.params = {} as WebhookRequest['params'];

		let webhook = await this.getActiveWebhook(httpMethod, path);

		if (!webhook) {
			// no static webhook, so check if dynamic
			// e.g. `/webhook-test/<uuid>/user/:id/create`

			const [webhookId, ...segments] = path.split('/');

			webhook = await this.getActiveWebhook(httpMethod, segments.join('/'), webhookId);

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

		const key = this.registrations.toKey(webhook);

		const registration = await this.registrations.get(key);

		if (!registration) {
			throw new WebhookNotFoundError({
				path,
				httpMethod,
				webhookMethods: await this.getWebhookMethods(path),
			});
		}

		const { destinationNode, sessionId, workflowEntity } = registration;
		const timeout = this.timeouts[key];

		const workflow = this.toWorkflow(workflowEntity);

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
					undefined, // IRunExecutionData
					undefined, // executionId
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

			await this.registrations.deregisterAll();

			await this.deactivateWebhooks(workflow);
		});
	}

	async getWebhookMethods(path: string) {
		const allKeys = await this.registrations.getAllKeys();

		const webhookMethods = allKeys
			.filter((key) => key.includes(path))
			.map((key) => key.split('|')[0] as IHttpRequestMethods);

		if (!webhookMethods.length) throw new WebhookNotFoundError({ path });

		return webhookMethods;
	}

	async findAccessControlOptions(path: string, httpMethod: IHttpRequestMethods) {
		const allKeys = await this.registrations.getAllKeys();

		const webhookKey = allKeys.find((key) => key.includes(path) && key.startsWith(httpMethod));

		if (!webhookKey) return;

		const registration = await this.registrations.get(webhookKey);

		if (!registration) return;

		const { workflowEntity } = registration;

		const workflow = this.toWorkflow(workflowEntity);

		const webhookNode = Object.values(workflow.nodes).find(
			({ type, parameters, typeVersion }) =>
				parameters?.path === path &&
				(parameters?.httpMethod ?? 'GET') === httpMethod &&
				'webhook' in this.nodeTypes.getByNameAndVersion(type, typeVersion),
		);

		return webhookNode?.parameters?.options as WebhookAccessControlOptions;
	}

	/**
	 * Return whether activating a workflow requires listening for webhook calls.
	 * For every webhook call to listen for, also activate the webhook.
	 */
	async needsWebhook(
		userId: string,
		workflowEntity: IWorkflowDb,
		additionalData: IWorkflowExecuteAdditionalData,
		sessionId?: string,
		destinationNode?: string,
	) {
		if (!workflowEntity.id) throw new WorkflowMissingIdError(workflowEntity);

		const workflow = this.toWorkflow(workflowEntity);

		const webhooks = WebhookHelpers.getWorkflowWebhooks(
			workflow,
			additionalData,
			destinationNode,
			true,
		);

		if (!webhooks.some((w) => w.webhookDescription.restartWebhook !== true)) {
			return false; // no webhooks found to start a workflow
		}

		const timeout = setTimeout(async () => this.cancelWebhook(workflow.id), 2 * TIME.MINUTE);

		for (const webhook of webhooks) {
			const key = this.registrations.toKey(webhook);
			const registration = await this.registrations.get(key);

			if (registration && !webhook.webhookId) {
				throw new WebhookPathTakenError(webhook.node);
			}

			webhook.path = removeTrailingSlash(webhook.path);
			webhook.isTest = true;

			/**
			 * Additional data cannot be cached because of circular refs.
			 * Hence store the `userId` and recreate additional data when needed.
			 */
			const { workflowExecuteAdditionalData: _, ...cacheableWebhook } = webhook;

			cacheableWebhook.userId = userId;

			try {
				await workflow.createWebhookIfNotExists(webhook, NodeExecuteFunctions, 'manual', 'manual');

				cacheableWebhook.staticData = workflow.staticData;

				await this.registrations.register({
					sessionId,
					workflowEntity,
					destinationNode,
					webhook: cacheableWebhook as IWebhookData,
				});

				this.timeouts[key] = timeout;
			} catch (error) {
				await this.deactivateWebhooks(workflow);

				delete this.timeouts[key];

				throw error;
			}
		}

		return true;
	}

	async cancelWebhook(workflowId: string) {
		let foundWebhook = false;

		const allWebhookKeys = await this.registrations.getAllKeys();

		for (const key of allWebhookKeys) {
			const registration = await this.registrations.get(key);

			if (!registration) continue;

			const { sessionId, workflowEntity } = registration;

			const timeout = this.timeouts[key];

			const workflow = this.toWorkflow(workflowEntity);

			if (workflowEntity.id !== workflowId) continue;

			clearTimeout(timeout);

			if (sessionId !== undefined) {
				try {
					this.push.send('testWebhookDeleted', { workflowId }, sessionId);
				} catch {
					// Could not inform editor, probably is not connected anymore. So simply go on.
				}
			}

			if (!foundWebhook) {
				// As it removes all webhooks of the workflow execute only once
				void this.deactivateWebhooks(workflow);
			}

			foundWebhook = true;
		}

		return foundWebhook;
	}

	async getActiveWebhook(httpMethod: IHttpRequestMethods, path: string, webhookId?: string) {
		const key = this.registrations.toKey({ httpMethod, path, webhookId });

		let webhook: IWebhookData | undefined;
		let maxMatches = 0;
		const pathElementsSet = new Set(path.split('/'));
		// check if static elements match in path
		// if more results have been returned choose the one with the most static-route matches
		const registration = await this.registrations.get(key);

		if (!registration) return;

		const { webhook: dynamicWebhook } = registration;

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

		return webhook;
	}

	/**
	 * Deactivate all registered test webhooks of a workflow.
	 */
	async deactivateWebhooks(workflow: Workflow) {
		const allRegistrations = await this.registrations.getAllRegistrations();

		if (!allRegistrations.length) return; // nothing to deactivate

		type WebhooksByWorkflow = { [workflowId: string]: IWebhookData[] };

		const webhooksByWorkflow = allRegistrations.reduce<WebhooksByWorkflow>((acc, cur) => {
			const { workflowId } = cur.webhook;

			acc[workflowId] ||= [];
			acc[workflowId].push(cur.webhook);

			return acc;
		}, {});

		const webhooks = webhooksByWorkflow[workflow.id];

		if (!webhooks) return; // nothing to deactivate

		for (const webhook of webhooks) {
			const { userId, staticData } = webhook;

			if (userId) {
				webhook.workflowExecuteAdditionalData = await WorkflowExecuteAdditionalData.getBase(userId);
			}

			if (staticData) workflow.staticData = staticData;

			await workflow.deleteWebhook(webhook, NodeExecuteFunctions, 'internal', 'update');

			await this.registrations.deregister(webhook);
		}
	}

	/**
	 * Convert a `WorkflowEntity` from `typeorm` to a `Workflow` from `n8n-workflow`.
	 */
	toWorkflow(workflowEntity: IWorkflowDb) {
		return new Workflow({
			id: workflowEntity.id,
			name: workflowEntity.name,
			nodes: workflowEntity.nodes,
			connections: workflowEntity.connections,
			active: false,
			nodeTypes: this.nodeTypes,

			/**
			 * `staticData` in the original workflow entity has production webhook IDs.
			 * Since we are creating here a temporary workflow only for a test webhook,
			 * `staticData` from the original workflow entity should not be transferred.
			 */
			staticData: undefined,

			settings: workflowEntity.settings,
		});
	}
}
