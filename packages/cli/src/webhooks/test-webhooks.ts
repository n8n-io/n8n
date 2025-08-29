import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type express from 'express';
import { InstanceSettings } from 'n8n-core';
import { WebhookPathTakenError, Workflow } from 'n8n-workflow';
import type {
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	IHttpRequestMethods,
	IRunData,
	IWorkflowBase,
} from 'n8n-workflow';

import { TEST_WEBHOOK_TIMEOUT } from '@/constants';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WebhookNotFoundError } from '@/errors/response-errors/webhook-not-found.error';
import { WorkflowMissingIdError } from '@/errors/workflow-missing-id.error';
import { NodeTypes } from '@/node-types';
import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { removeTrailingSlash } from '@/utils';
import type { TestWebhookRegistration } from '@/webhooks/test-webhook-registrations.service';
import { TestWebhookRegistrationsService } from '@/webhooks/test-webhook-registrations.service';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { WorkflowRequest } from '@/workflows/workflow.request';

import { authAllowlistedNodes } from './constants';
import { sanitizeWebhookRequest } from './webhook-request-sanitizer';
import { WebhookService } from './webhook.service';
import type {
	IWebhookResponseCallbackData,
	IWebhookManager,
	WebhookAccessControlOptions,
	WebhookRequest,
} from './webhook.types';

/**
 * Service for handling the execution of webhooks of manual executions
 * that use the [Test URL](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/#webhook-urls).
 */
@Service()
export class TestWebhooks implements IWebhookManager {
	constructor(
		private readonly push: Push,
		private readonly nodeTypes: NodeTypes,
		private readonly registrations: TestWebhookRegistrationsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly webhookService: WebhookService,
	) {}

	private timeouts: { [webhookKey: string]: NodeJS.Timeout } = {};

	/**
	 * Return a promise that resolves when the test webhook is called.
	 * Also inform the FE of the result and remove the test webhook.
	 */
	async executeWebhook(
		request: WebhookRequest,
		response: express.Response,
	): Promise<IWebhookResponseCallbackData> {
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

		const { destinationNode, pushRef, workflowEntity, webhook: testWebhook } = registration;

		const workflow = this.toWorkflow(workflowEntity);

		if (testWebhook.staticData) workflow.setTestStaticData(testWebhook.staticData);

		const workflowStartNode = workflow.getNode(webhook.node);

		if (workflowStartNode === null) {
			throw new NotFoundError('Could not find node to process webhook.');
		}

		if (!authAllowlistedNodes.has(workflowStartNode.type)) {
			sanitizeWebhookRequest(request);
		}

		return await new Promise(async (resolve, reject) => {
			try {
				const executionMode = 'manual';
				const executionId = await WebhookHelpers.executeWebhook(
					workflow,
					webhook,
					workflowEntity,
					workflowStartNode,
					executionMode,
					pushRef,
					undefined, // IRunExecutionData
					undefined, // executionId
					request,
					response,
					(error: Error | null, data: IWebhookResponseCallbackData) => {
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
				if (pushRef !== undefined) {
					this.push.send(
						{ type: 'testWebhookReceived', data: { workflowId: webhook?.workflowId, executionId } },
						pushRef,
					);
				}
			} catch {}

			/**
			 * Multi-main setup: In a manual webhook execution, the main process that
			 * handles a webhook might not be the same as the main process that created
			 * the webhook. If so, after the test webhook has been successfully executed,
			 * the handler process commands the creator process to clear its test webhooks.
			 */
			if (this.instanceSettings.isMultiMain && pushRef && !this.push.hasPushRef(pushRef)) {
				void this.publisher.publishCommand({
					command: 'clear-test-webhooks',
					payload: { webhookKey: key, workflowEntity, pushRef },
				});
				return;
			}

			this.clearTimeout(key);

			await this.deactivateWebhooks(workflow);
		});
	}

	@OnPubSubEvent('clear-test-webhooks', { instanceType: 'main' })
	async handleClearTestWebhooks({
		webhookKey,
		workflowEntity,
		pushRef,
	}: {
		webhookKey: string;
		workflowEntity: IWorkflowBase;
		pushRef: string;
	}) {
		if (!this.push.hasPushRef(pushRef)) return;

		this.clearTimeout(webhookKey);

		const workflow = this.toWorkflow(workflowEntity);

		await this.deactivateWebhooks(workflow);
	}

	clearTimeout(key: string) {
		const timeout = this.timeouts[key];

		if (timeout) clearTimeout(timeout);
	}

	async getWebhooksFromPath(rawPath: string) {
		const path = removeTrailingSlash(rawPath);
		const webhooks: IWebhookData[] = [];
		const registrations = await this.registrations.getRegistrationsHash();

		for (const httpMethod of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as IHttpRequestMethods[]) {
			const key = this.registrations.toKey({ httpMethod, path });
			let webhook = registrations?.[key]?.webhook;
			if (!webhook) {
				// check for dynamic webhooks
				const [webhookId, ...segments] = path.split('/');
				const key = this.registrations.toKey({ httpMethod, path, webhookId });
				if (registrations?.[key]) {
					webhook = this.getActiveWebhookFromRegistration(segments.join('/'), registrations?.[key]);
				}
			}
			if (webhook) {
				webhooks.push(webhook);
			}
		}
		return webhooks;
	}

	async getWebhookMethods(rawPath: string) {
		const path = removeTrailingSlash(rawPath);
		const webhooks = await this.getWebhooksFromPath(path);

		const webhookMethods = webhooks.map((webhook) => webhook.httpMethod);

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
	async needsWebhook(options: {
		userId: string;
		workflowEntity: IWorkflowBase;
		additionalData: IWorkflowExecuteAdditionalData;
		runData?: IRunData;
		pushRef?: string;
		destinationNode?: string;
		triggerToStartFrom?: WorkflowRequest.ManualRunPayload['triggerToStartFrom'];
	}) {
		const {
			userId,
			workflowEntity,
			additionalData,
			runData,
			pushRef,
			destinationNode,
			triggerToStartFrom,
		} = options;

		if (!workflowEntity.id) throw new WorkflowMissingIdError(workflowEntity);

		const workflow = this.toWorkflow(workflowEntity);

		let webhooks = WebhookHelpers.getWorkflowWebhooks(
			workflow,
			additionalData,
			destinationNode,
			true,
		);

		// If we have a preferred trigger with data, we don't have to listen for a
		// webhook.
		if (triggerToStartFrom?.data) {
			return false;
		}

		// If we have a preferred trigger without data we only want to listen for
		// that trigger, not the other ones.
		if (triggerToStartFrom) {
			webhooks = webhooks.filter((w) => w.node === triggerToStartFrom.name);
		}

		if (!webhooks.some((w) => w.webhookDescription.restartWebhook !== true)) {
			return false; // no webhooks found to start a workflow
		}

		const timeout = setTimeout(
			async () => await this.cancelWebhook(workflow.id),
			TEST_WEBHOOK_TIMEOUT,
		);

		for (const webhook of webhooks) {
			const key = this.registrations.toKey(webhook);
			const registrationByKey = await this.registrations.get(key);

			if (runData && webhook.node in runData) {
				return false;
			}

			// if registration already exists and is not a test webhook created by this user in this workflow throw an error
			if (
				registrationByKey &&
				!webhook.webhookId &&
				!registrationByKey.webhook.isTest &&
				registrationByKey.webhook.userId !== userId &&
				registrationByKey.webhook.workflowId !== workflow.id
			) {
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

			const registration: TestWebhookRegistration = {
				pushRef,
				workflowEntity,
				destinationNode,
				webhook: cacheableWebhook as IWebhookData,
			};

			try {
				/**
				 * Register the test webhook _before_ creation at third-party service
				 * in case service sends a confirmation request immediately on creation.
				 */
				await this.registrations.register(registration);

				await this.webhookService.createWebhookIfNotExists(workflow, webhook, 'manual', 'manual');

				cacheableWebhook.staticData = workflow.staticData;

				await this.registrations.register(registration);

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

			const { pushRef, workflowEntity } = registration;

			const workflow = this.toWorkflow(workflowEntity);

			if (workflowEntity.id !== workflowId) continue;

			this.clearTimeout(key);

			if (pushRef !== undefined) {
				try {
					this.push.send({ type: 'testWebhookDeleted', data: { workflowId } }, pushRef);
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

	getActiveWebhookFromRegistration(
		path: string,
		registration: TestWebhookRegistration,
	): IWebhookData | undefined {
		const pathElementsSet = new Set(path.split('/'));

		const { webhook: dynamicWebhook } = registration;

		const staticElements = dynamicWebhook.path.split('/').filter((ele) => !ele.startsWith(':'));
		const allStaticExist = staticElements.every((staticEle) => pathElementsSet.has(staticEle));

		// webhook matches if all static elements exist or if there are no static elements
		if ((allStaticExist && staticElements.length > 0) || staticElements.length === 0) {
			return dynamicWebhook;
		}
		return undefined;
	}

	async getActiveWebhook(httpMethod: IHttpRequestMethods, path: string, webhookId?: string) {
		const key = this.registrations.toKey({ httpMethod, path, webhookId });
		const registration = await this.registrations.get(key);

		if (!registration) return;

		return this.getActiveWebhookFromRegistration(path, registration);
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

			await this.webhookService.deleteWebhook(workflow, webhook, 'internal', 'update');
		}

		await this.registrations.deregisterAll();
	}

	/**
	 * Convert a `IWorkflowBase` interface (e.g. `WorkflowEntity`) to a temporary
	 * `Workflow` from `n8n-workflow`.
	 */
	toWorkflow(workflowEntity: IWorkflowBase) {
		return new Workflow({
			id: workflowEntity.id,
			name: workflowEntity.name,
			nodes: workflowEntity.nodes,
			connections: workflowEntity.connections,
			active: false,
			nodeTypes: this.nodeTypes,
			staticData: {},
			settings: workflowEntity.settings,
		});
	}
}
