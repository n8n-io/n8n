import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type express from 'express';
import { ExecutionContextService, InstanceSettings } from 'n8n-core';
import {
	CHAT_TRIGGER_NODE_TYPE,
	classifyTriggerIdentity,
	WebhookPathTakenError,
	Workflow,
} from 'n8n-workflow';
import type {
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	IHttpRequestMethods,
	IRunData,
	IWorkflowBase,
	IDestinationNode,
} from 'n8n-workflow';

import { TEST_WEBHOOK_TIMEOUT } from '@/constants';
import { isChatOAuth2Enabled } from '@/constants/oauth2-triggers';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WebhookNotFoundError } from '@/errors/response-errors/webhook-not-found.error';
import { SingleWebhookTriggerError } from '@/errors/single-webhook-trigger.error';
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
import { matchesExpectedNodeType } from './node-type-matcher';
import type { ExpectedWebhookNodeType } from './node-type-matcher';
import { sanitizeWebhookRequest } from './webhook-request-sanitizer';
import { WebhookResponse } from './webhook-response';
import { WebhookService } from './webhook.service';
import type {
	IWebhookResponseCallbackData,
	IWebhookManager,
	WebhookAccessControlOptions,
	WebhookRequest,
} from './webhook.types';

const SINGLE_WEBHOOK_TRIGGERS = [
	'n8n-nodes-base.telegramTrigger',
	'n8n-nodes-base.slackTrigger',
	'n8n-nodes-base.facebookLeadAdsTrigger',
];

/**
 * Service for handling the execution of webhooks of manual executions
 * that use the [Test URL](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/#webhook-urls).
 */
@Service()
export class TestWebhooks implements IWebhookManager {
	constructor(
		private readonly logger: Logger,
		private readonly push: Push,
		private readonly nodeTypes: NodeTypes,
		private readonly registrations: TestWebhookRegistrationsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly webhookService: WebhookService,
		private readonly executionContextService: ExecutionContextService,
	) {}

	private timeouts: { [webhookKey: string]: NodeJS.Timeout } = {};

	/**
	 * Return a promise that resolves when the test webhook is called.
	 * Also inform the FE of the result and remove the test webhook.
	 */
	async executeWebhook(
		request: WebhookRequest,
		response: express.Response,
		expectedNodeType?: ExpectedWebhookNodeType,
	): Promise<IWebhookResponseCallbackData | WebhookResponse> {
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

		if (
			expectedNodeType &&
			!matchesExpectedNodeType(expectedNodeType, webhook.webhookDescription.nodeType)
		) {
			throw new WebhookNotFoundError({
				path,
				httpMethod,
				webhookMethods: await this.getWebhookMethods(path),
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

		const {
			pushRef,
			workflowEntity,
			webhook: testWebhook,
			destinationNode,
			encryptedRunnerIdentity,
		} = registration;

		const workflow = this.toWorkflow(workflowEntity);

		if (testWebhook.staticData) workflow.setTestStaticData(testWebhook.staticData);

		const workflowStartNode = workflow.getNode(webhook.node);

		if (workflowStartNode === null) {
			throw new NotFoundError('Could not find node to process webhook.');
		}

		if (!authAllowlistedNodes.has(workflowStartNode.type)) {
			sanitizeWebhookRequest(request);
		}

		await workflow.expression.acquireIsolate();
		// Release only after teardown below runs, not when resolve() settles the
		// promise early — teardown still needs the isolate held.
		return await new Promise(async (resolve, reject) => {
			try {
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
						(error: Error | null, data: IWebhookResponseCallbackData | WebhookResponse) => {
							if (error !== null) reject(error);
							else resolve(data);
						},
						destinationNode,
						{ encryptedRunnerIdentity },
					);

					// The workflow did not run as the request was probably setup related
					// or a ping so do not resolve the promise and wait for the real webhook
					// request instead.
					if (executionId === undefined) {
						return;
					}

					// Inform editor-ui that webhook got received
					if (pushRef !== undefined) {
						this.push.send(
							{
								type: 'testWebhookReceived',
								data: { workflowId: webhook?.workflowId, executionId },
							},
							pushRef,
						);
					}
				} catch (error) {
					// Settle the Promise to prevent hanging the request.
					// No return to ensure test-webhook cleanup.
					reject(error as Error);
				}

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
					// Response (if any) was already sent via WebhookHelpers.executeWebhook's
					// callback; resolve to settle promise to be safe and avoid hanging.
					resolve({ noWebhookResponse: true });
					return;
				}

				this.clearTimeout(key);

				await this.deactivateWebhooks(workflow);
			} finally {
				// Response (if any) was already sent, so a release failure here can only be logged.
				try {
					await workflow.expression.releaseIsolate();
				} catch (error) {
					this.logger.error('Failed to release expression isolate for test webhook', {
						error,
						workflowId: workflow.id,
					});
				}
			}
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

		await workflow.expression.acquireIsolate();
		try {
			await this.deactivateWebhooks(workflow);
		} finally {
			await workflow.expression.releaseIsolate();
		}
	}

	clearTimeout(key: string) {
		const timeout = this.timeouts[key];

		if (timeout) clearTimeout(timeout);
	}

	/**
	 * Find every test-webhook registration at the given path, across all HTTP
	 * methods. Used by {@link getWebhooksFromPath} and by the OAuth
	 * protected-resource resolver for test webhook triggers, which (unlike
	 * {@link getActiveWebhook}) needs the full registration — not just the
	 * `IWebhookData` — to read the trigger's node parameters straight off
	 * `workflowEntity` without touching the DB.
	 */
	async getRegistrationsFromPath(rawPath: string): Promise<TestWebhookRegistration[]> {
		const path = removeTrailingSlash(rawPath);
		const found: TestWebhookRegistration[] = [];
		const registrations = await this.registrations.getRegistrationsHash();

		for (const httpMethod of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as IHttpRequestMethods[]) {
			const key = this.registrations.toKey({ httpMethod, path });
			let registration = registrations?.[key];
			if (!registration) {
				// check for dynamic webhooks
				const [webhookId, ...segments] = path.split('/');
				const key = this.registrations.toKey({ httpMethod, path, webhookId });
				const candidate = registrations?.[key];
				if (candidate && this.getActiveWebhookFromRegistration(segments.join('/'), candidate)) {
					registration = candidate;
				}
			}
			if (registration) {
				found.push(registration);
			}
		}
		return found;
	}

	async getWebhooksFromPath(rawPath: string) {
		const registrations = await this.getRegistrationsFromPath(rawPath);
		return registrations.map((registration) => registration.webhook);
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
	 * Whether a run started by this node's webhook carries the identity of a specific
	 * person. Defers to `classifyTriggerIdentity` — the same predicate publish-time
	 * validation and the editor's compatibility warning use — so test mode can only ever
	 * grant identity to a configuration production would also accept, and widens on its
	 * own as that predicate learns new ones.
	 *
	 * Scoped to the chat trigger: every other identity-bearing trigger establishes its
	 * own, stronger carrier while its webhook runs.
	 */
	private establishesRunnerIdentity(workflow: Workflow, nodeName: string) {
		const node = workflow.nodes[nodeName];

		if (node?.type !== CHAT_TRIGGER_NODE_TYPE) return false;

		return classifyTriggerIdentity(node.type, node.parameters, {
			isChatOAuth2Enabled: isChatOAuth2Enabled(),
		}).providesN8nIdentity;
	}

	/**
	 * The builder's identity, for a test run whose trigger can use end-user credentials —
	 * they resolve against a specific person, and a run that waits for a webhook never
	 * reaches the point where a manual execution picks its identity up from the cookie.
	 *
	 * Minted here, at the authenticated registration request, rather than read off the
	 * webhook call later: a `manual-execution` carrier skips the browser-id and endpoint
	 * checks, so minting one from a cookie presented on an arbitrary cross-site request
	 * would be CSRF-shaped. Minted once, because the carrier depends only on the cookie
	 * and a chat trigger registers several webhooks.
	 */
	private async mintRunnerIdentity(
		workflow: Workflow,
		webhooks: IWebhookData[],
		n8nAuthCookie?: string,
	) {
		if (!n8nAuthCookie || !isChatOAuth2Enabled()) return undefined;

		const anyEstablishesIdentity = webhooks.some((webhook) =>
			this.establishesRunnerIdentity(workflow, webhook.node),
		);
		if (!anyEstablishesIdentity) return undefined;

		return await this.executionContextService.buildManualExecutionCredentials(n8nAuthCookie);
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
		destinationNode?: IDestinationNode;
		triggerToStartFrom?: WorkflowRequest.FullManualExecutionFromKnownTriggerPayload['triggerToStartFrom'];
		chatSessionId?: string;
		workflowIsActive?: boolean;
		n8nAuthCookie?: string;
	}) {
		const {
			userId,
			workflowEntity,
			additionalData,
			runData,
			pushRef,
			destinationNode,
			triggerToStartFrom,
			chatSessionId,
			workflowIsActive,
			n8nAuthCookie,
		} = options;

		if (!workflowEntity.id) throw new WorkflowMissingIdError(workflowEntity);

		const workflow = this.toWorkflow(workflowEntity);

		await workflow.expression.acquireIsolate();
		let webhooks: IWebhookData[];
		try {
			webhooks = WebhookHelpers.getWorkflowWebhooks(
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

			const timeoutDuration = TEST_WEBHOOK_TIMEOUT;

			// Check if any webhook is a single webhook trigger and workflow is active
			if (workflowIsActive) {
				const singleWebhookTrigger = webhooks.find((w) =>
					SINGLE_WEBHOOK_TRIGGERS.includes(workflow.getNode(w.node)?.type ?? ''),
				);
				if (singleWebhookTrigger) {
					throw new SingleWebhookTriggerError(
						workflow.getNode(singleWebhookTrigger.node)?.name ?? '',
					);
				}
			}

			const timeout = setTimeout(
				async () => await this.cancelWebhook(workflow.id),
				timeoutDuration,
			);

			const encryptedRunnerIdentity = await this.mintRunnerIdentity(
				workflow,
				webhooks,
				n8nAuthCookie,
			);

			for (const webhook of webhooks) {
				webhook.path = removeTrailingSlash(webhook.path);

				// Use sessionId-based path for ChatTrigger nodes when sessionId is provided
				// IMPORTANT: This must happen BEFORE key generation
				if (
					chatSessionId &&
					webhook.node &&
					workflow.nodes[webhook.node]?.type === CHAT_TRIGGER_NODE_TYPE
				) {
					// Generate predictable path using workflowId and sessionId (without leading slash to match lookup format)
					webhook.path = `${workflow.id}/${chatSessionId}`;
					// Only this session-scoped canvas route may skip the Chat Trigger's configured auth
					webhook.isChatSessionTest = true;
				}

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

				webhook.isTest = true;

				/**
				 * Additional data cannot be cached because of circular refs.
				 * Hence store the `userId` and recreate additional data when needed.
				 */
				const { workflowExecuteAdditionalData: _, ...cacheableWebhook } = webhook;

				cacheableWebhook.userId = userId;

				const registration: TestWebhookRegistration = {
					version: 1,
					pushRef,
					workflowEntity,
					destinationNode,
					webhook: cacheableWebhook as IWebhookData,
					encryptedRunnerIdentity: this.establishesRunnerIdentity(workflow, webhook.node)
						? encryptedRunnerIdentity
						: undefined,
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
		} finally {
			await workflow.expression.releaseIsolate();
		}
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
				void (async () => {
					await workflow.expression.acquireIsolate();
					try {
						await this.deactivateWebhooks(workflow);
					} finally {
						await workflow.expression.releaseIsolate();
					}
				})().catch((error) => {
					this.logger.error('Failed to deactivate test webhooks on cancel', {
						error,
						workflowId,
					});
				});
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
				webhook.workflowExecuteAdditionalData = await WorkflowExecuteAdditionalData.getBase({
					userId,
					workflowId: workflow.id,
				});
			}

			if (staticData) workflow.staticData = staticData;

			await this.webhookService.deleteWebhook(workflow, webhook, 'internal', 'update');

			// Deregister only this webhook, not all webhooks from other running workflows
			await this.registrations.deregister(webhook);
		}
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
