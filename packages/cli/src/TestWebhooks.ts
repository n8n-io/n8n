import type express from 'express';
import { Service } from 'typedi';

import {
	type IWebhookData,
	type IWorkflowExecuteAdditionalData,
	type IHttpRequestMethods,
	type Workflow,
	type WorkflowActivateMode,
	type WorkflowExecuteMode,
	WebhookPathTakenError,
} from 'n8n-workflow';

import type {
	IResponseCallbackData,
	IWebhookManager,
	IWorkflowDb,
	WebhookRegistration,
	WebhookAccessControlOptions,
	WebhookRequest,
} from '@/Interfaces';
import { Push } from '@/push';
import { NodeTypes } from '@/NodeTypes';
import * as WebhookHelpers from '@/WebhookHelpers';
import { NotFoundError } from './errors/response-errors/not-found.error';
import { TIME } from './constants';
import { WorkflowMissingIdError } from './errors/workflow-missing-id.error';
import { WebhookNotFoundError } from './errors/response-errors/webhook-not-found.error';
import * as NodeExecuteFunctions from 'n8n-core';
import { removeTrailingSlash } from './utils';

@Service()
export class TestWebhooks implements IWebhookManager {
	constructor(
		private readonly push: Push,
		private readonly nodeTypes: NodeTypes,
	) {}

	private registrations: { [webhookKey: string]: WebhookRegistration } = {};

	private get webhooksByWorkflow() {
		const result: { [workflowId: string]: IWebhookData[] } = {};

		for (const registration of Object.values(this.registrations)) {
			result[registration.webhook.workflowId] ||= [];
			result[registration.webhook.workflowId].push(registration.webhook);
		}

		return result;
	}

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

		let webhook = this.getActiveWebhook(httpMethod, path);

		if (!webhook) {
			// no static webhook, so check if dynamic
			// e.g. `/webhook-test/<uuid>/user/:id/create`

			const [webhookId, ...segments] = path.split('/');

			webhook = this.getActiveWebhook(httpMethod, segments.join('/'), webhookId);

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

		const key = this.toWebhookKey(webhook);

		if (!this.registrations[key])
			throw new WebhookNotFoundError({
				path,
				httpMethod,
				webhookMethods: await this.getWebhookMethods(path),
			});

		const { destinationNode, sessionId, workflow, workflowEntity, timeout } =
			this.registrations[key];

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
			delete this.registrations[key];

			await this.deactivateWebhooks(workflow);
		});
	}

	async getWebhookMethods(path: string) {
		const webhookMethods = Object.keys(this.registrations)
			.filter((key) => key.includes(path))
			.map((key) => key.split('|')[0] as IHttpRequestMethods);

		if (!webhookMethods.length) throw new WebhookNotFoundError({ path });

		return webhookMethods;
	}

	async findAccessControlOptions(path: string, httpMethod: IHttpRequestMethods) {
		const webhookKey = Object.keys(this.registrations).find(
			(key) => key.includes(path) && key.startsWith(httpMethod),
		);

		if (!webhookKey) return;

		const { workflow } = this.registrations[webhookKey];
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
		workflowEntity: IWorkflowDb,
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		executionMode: WorkflowExecuteMode,
		activationMode: WorkflowActivateMode,
		sessionId?: string,
		destinationNode?: string,
	) {
		if (!workflow.id) throw new WorkflowMissingIdError(workflow);

		const webhooks = WebhookHelpers.getWorkflowWebhooks(
			workflow,
			additionalData,
			destinationNode,
			true,
		);

		if (!webhooks.some((w) => w.webhookDescription.restartWebhook !== true)) {
			return false; // no webhooks found to start a workflow
		}

		// 1+ webhook(s) required, so activate webhook(s)

		const timeout = setTimeout(() => this.cancelWebhook(workflow.id), 2 * TIME.MINUTE);

		const activatedKeys: string[] = [];

		for (const webhook of webhooks) {
			const key = this.toWebhookKey(webhook);

			if (this.registrations[key] && !webhook.webhookId) {
				throw new WebhookPathTakenError(webhook.node);
			}

			activatedKeys.push(key);

			this.setRegistration({
				sessionId,
				timeout,
				workflow,
				workflowEntity,
				destinationNode,
				webhook,
			});

			try {
				await this.activateWebhook(workflow, webhook, executionMode, activationMode);
			} catch (error) {
				activatedKeys.forEach((k) => delete this.registrations[k]);

				await this.deactivateWebhooks(workflow);

				throw error;
			}
		}

		return true;
	}

	cancelWebhook(workflowId: string) {
		let foundWebhook = false;

		for (const key of Object.keys(this.registrations)) {
			const { sessionId, timeout, workflow, workflowEntity } = this.registrations[key];

			if (workflowEntity.id !== workflowId) continue;

			clearTimeout(timeout);

			if (sessionId !== undefined) {
				try {
					this.push.send('testWebhookDeleted', { workflowId }, sessionId);
				} catch {
					// Could not inform editor, probably is not connected anymore. So simply go on.
				}
			}

			delete this.registrations[key];

			if (!foundWebhook) {
				// As it removes all webhooks of the workflow execute only once
				void this.deactivateWebhooks(workflow);
			}

			foundWebhook = true;
		}

		return foundWebhook;
	}

	async activateWebhook(
		workflow: Workflow,
		webhook: IWebhookData,
		executionMode: WorkflowExecuteMode,
		activationMode: WorkflowActivateMode,
	) {
		webhook.path = removeTrailingSlash(webhook.path);

		const key = this.toWebhookKey(webhook);

		webhook.isTest = true;
		this.registrations[key].webhook = webhook;

		try {
			await workflow.createWebhookIfNotExists(
				webhook,
				NodeExecuteFunctions,
				executionMode,
				activationMode,
			);
		} catch (error) {
			if (this.registrations[key]) delete this.registrations[key];

			throw error;
		}
	}

	getActiveWebhook(httpMethod: IHttpRequestMethods, path: string, webhookId?: string) {
		const key = this.toWebhookKey({ httpMethod, path, webhookId });
		if (this.registrations[key] === undefined) {
			return undefined;
		}

		let webhook: IWebhookData | undefined;
		let maxMatches = 0;
		const pathElementsSet = new Set(path.split('/'));
		// check if static elements match in path
		// if more results have been returned choose the one with the most static-route matches
		const dynamicWebhook = this.registrations[key].webhook;

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

	private toWebhookKey(webhook: Pick<IWebhookData, 'webhookId' | 'httpMethod' | 'path'>) {
		const { webhookId, httpMethod, path: webhookPath } = webhook;

		if (!webhookId) return `${httpMethod}|${webhookPath}`;

		let path = webhookPath;

		if (path.startsWith(webhookId)) {
			const cutFromIndex = path.indexOf('/') + 1;

			path = path.slice(cutFromIndex);
		}

		return `${httpMethod}|${webhookId}|${path.split('/').length}`;
	}

	/**
	 * Deactivate all registered webhooks of a workflow.
	 */
	async deactivateWebhooks(workflow: Workflow) {
		const webhooks = this.webhooksByWorkflow[workflow.id];

		if (!webhooks) return false; // nothing to deactivate

		for (const webhook of webhooks) {
			await workflow.deleteWebhook(webhook, NodeExecuteFunctions, 'internal', 'update');

			const key = this.toWebhookKey(webhook);

			delete this.registrations[key];
		}

		return true;
	}

	clearRegistrations() {
		this.registrations = {};
	}

	setRegistration(registration: WebhookRegistration) {
		const key = this.toWebhookKey(registration.webhook);

		this.registrations[key] = registration;
	}
}
