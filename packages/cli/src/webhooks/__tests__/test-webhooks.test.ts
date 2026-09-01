import type { Logger } from '@n8n/backend-common';
import type { WorkflowEntity } from '@n8n/db';
import { generateNanoId } from '@n8n/db';
import type * as express from 'express';
import type { ExecutionContextService } from 'n8n-core';
import { CHAT_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import type {
	INodeParameters,
	ITaskData,
	IWorkflowBase,
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	IHttpRequestMethods,
	WorkflowExpression,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import type { Mock, Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WebhookNotFoundError } from '@/errors/response-errors/webhook-not-found.error';
import type {
	TestWebhookRegistrationsService,
	TestWebhookRegistration,
} from '@/webhooks/test-webhook-registrations.service';
import { TestWebhooks } from '@/webhooks/test-webhooks';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import type { WebhookService } from '@/webhooks/webhook.service';
import type { WebhookRequest } from '@/webhooks/webhook.types';
import * as AdditionalData from '@/workflow-execute-additional-data';

vi.mock('@/workflow-execute-additional-data');

const mockedAdditionalData = AdditionalData as Mocked<typeof AdditionalData>;

const workflowEntity = mock<IWorkflowBase>({ id: generateNanoId(), nodes: [] });

const httpMethod = 'GET';
const path = uuid();
const userId = '04ab4baf-85df-478f-917b-d303934a97de';

const webhook = mock<IWebhookData>({
	httpMethod,
	path,
	workflowId: workflowEntity.id,
	userId,
});

const flushMicrotasks = async () => {
	const { setImmediate: realSetImmediate } =
		await vi.importActual<typeof import('timers')>('timers');
	await new Promise((resolve) => realSetImmediate(resolve));
};

describe('TestWebhooks', () => {
	const logger = mock<Logger>();
	const registrations = mock<TestWebhookRegistrationsService>();
	const webhookService = mock<WebhookService>();
	const executionContextService = mock<ExecutionContextService>();

	const testWebhooks = new TestWebhooks(
		logger,
		mock(),
		mock(),
		registrations,
		mock(),
		mock(),
		webhookService,
		executionContextService,
	);

	beforeAll(() => {
		vi.useFakeTimers();
	});

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	describe('needsWebhook()', () => {
		const args: Parameters<typeof testWebhooks.needsWebhook>[0] = {
			userId,
			workflowEntity,
			additionalData: mock<IWorkflowExecuteAdditionalData>(),
		};

		test('if webhook is needed, should register then create webhook and return true', async () => {
			const workflow = mock<Workflow>({ expression: mock<WorkflowExpression>() });

			vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);

			const needsWebhook = await testWebhooks.needsWebhook(args);

			const [registerOrder] = registrations.register.mock.invocationCallOrder;
			const [createOrder] = webhookService.createWebhookIfNotExists.mock.invocationCallOrder;

			expect(registerOrder).toBeLessThan(createOrder);
			expect(needsWebhook).toBe(true);
		});

		test('if webhook activation fails, should deactivate workflow webhooks', async () => {
			const msg = 'Failed to add webhook to active webhooks';

			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
			registrations.register.mockRejectedValueOnce(new Error(msg));
			registrations.getAllRegistrations.mockResolvedValue([]);

			const needsWebhook = testWebhooks.needsWebhook(args);

			await expect(needsWebhook).rejects.toThrowError(msg);
		});

		test('if no webhook is found to start workflow, should return false', async () => {
			webhook.webhookDescription.restartWebhook = true;
			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);

			const result = await testWebhooks.needsWebhook(args);

			expect(result).toBe(false);
		});

		test('returns false if a triggerToStartFrom with triggerData is given', async () => {
			const workflow = mock<Workflow>({ expression: mock<WorkflowExpression>() });
			vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);

			const needsWebhook = await testWebhooks.needsWebhook({
				...args,
				triggerToStartFrom: {
					name: 'trigger',
					data: mock<ITaskData>(),
				},
			});

			expect(needsWebhook).toBe(false);
		});

		test('returns true, registers and then creates webhook if triggerToStartFrom is given with no triggerData', async () => {
			// ARRANGE
			const workflow = mock<Workflow>({ expression: mock<WorkflowExpression>() });
			const webhook2 = mock<IWebhookData>({
				node: 'trigger',
				httpMethod,
				path,
				workflowId: workflowEntity.id,
				userId,
			});
			vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook, webhook2]);

			// ACT
			const needsWebhook = await testWebhooks.needsWebhook({
				...args,
				triggerToStartFrom: { name: 'trigger' },
			});

			// ASSERT
			const [registerOrder] = registrations.register.mock.invocationCallOrder;
			const [createOrder] = webhookService.createWebhookIfNotExists.mock.invocationCallOrder;

			expect(registerOrder).toBeLessThan(createOrder);
			expect(registrations.register.mock.calls[0][0].webhook.node).toBe(webhook2.node);
			expect(webhookService.createWebhookIfNotExists.mock.calls[0][1].node).toBe(webhook2.node);
			expect(needsWebhook).toBe(true);
		});

		test('should use sessionId-based path for ChatTrigger nodes when chatSessionId is provided', async () => {
			// ARRANGE
			const workflow = mock<Workflow>({
				id: workflowEntity.id,
				nodes: {
					chatTriggerNode: {
						type: '@n8n/n8n-nodes-langchain.chatTrigger',
						name: 'chatTriggerNode',
					},
				},
				expression: mock<WorkflowExpression>(),
			});
			const chatSessionId = 'test-session-123';
			const chatWebhook = mock<IWebhookData>({
				node: 'chatTriggerNode',
				httpMethod,
				path: 'original-path',
				workflowId: workflowEntity.id,
				userId,
			});

			vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([chatWebhook]);

			// ACT
			await testWebhooks.needsWebhook({
				...args,
				chatSessionId,
			});

			// ASSERT
			// The webhook path should be modified to use workflowId/sessionId format
			expect(registrations.register.mock.calls[0][0].webhook.path).toBe(
				`${workflowEntity.id}/${chatSessionId}`,
			);
			expect(webhookService.createWebhookIfNotExists.mock.calls[0][1].path).toBe(
				`${workflowEntity.id}/${chatSessionId}`,
			);
		});

		test('should not modify path for ChatTrigger nodes when chatSessionId is not provided', async () => {
			// ARRANGE
			const workflow = mock<Workflow>({
				id: workflowEntity.id,
				nodes: {
					chatTriggerNode: {
						type: '@n8n/n8n-nodes-langchain.chatTrigger',
						name: 'chatTriggerNode',
					},
				},
				expression: mock<WorkflowExpression>(),
			});
			const chatWebhook = mock<IWebhookData>({
				node: 'chatTriggerNode',
				httpMethod,
				path: 'original-path',
				workflowId: workflowEntity.id,
				userId,
			});

			vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([chatWebhook]);

			// ACT
			await testWebhooks.needsWebhook(args);

			// ASSERT
			// The webhook path should remain unchanged
			expect(registrations.register.mock.calls[0][0].webhook.path).toBe('original-path');
		});

		test('should not modify path for non-ChatTrigger nodes even with chatSessionId', async () => {
			// ARRANGE
			const workflow = mock<Workflow>({
				id: workflowEntity.id,
				nodes: {
					webhookNode: {
						type: 'n8n-nodes-base.webhook',
						name: 'webhookNode',
					},
				},
				expression: mock<WorkflowExpression>(),
			});
			const chatSessionId = 'test-session-123';
			const regularWebhook = mock<IWebhookData>({
				node: 'webhookNode',
				httpMethod,
				path: 'webhook-path',
				workflowId: workflowEntity.id,
				userId,
			});

			vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([regularWebhook]);

			// ACT
			await testWebhooks.needsWebhook({
				...args,
				chatSessionId,
			});

			// ASSERT
			// The webhook path should remain unchanged for non-ChatTrigger nodes
			expect(registrations.register.mock.calls[0][0].webhook.path).toBe('webhook-path');
		});

		test('should handle destinationNode parameter correctly', async () => {
			// ARRANGE
			const workflow = mock<Workflow>({ expression: mock<WorkflowExpression>() });
			const destinationNodeObj = { nodeName: 'DestinationNode', mode: 'inclusive' as const };
			webhook.webhookDescription = {
				restartWebhook: false,
				httpMethod,
				name: 'default',
				path,
			};

			vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);

			// ACT
			await testWebhooks.needsWebhook({
				...args,
				destinationNode: destinationNodeObj,
			});

			// ASSERT
			// The registration should store the full destinationNode object
			expect(registrations.register).toHaveBeenCalled();
			expect(registrations.register.mock.calls[0][0].destinationNode).toEqual(destinationNodeObj);
		});

		describe('runner identity for end-user credentials', () => {
			const n8nAuthCookie = 'n8n-auth-jwt';
			const carrier = 'encrypted-carrier';

			/**
			 * `availableInChat` is what makes a chat trigger identity-bearing today, per
			 * `classifyTriggerIdentity`. `authentication` alone does not.
			 */
			const IDENTITY_BEARING = { availableInChat: true };

			const chatWorkflow = (parameters: INodeParameters, type = CHAT_TRIGGER_NODE_TYPE) =>
				mock<Workflow>({
					id: workflowEntity.id,
					nodes: {
						chatTriggerNode: { type, name: 'chatTriggerNode', parameters },
					},
					expression: mock<WorkflowExpression>(),
				});

			const chatWebhook = () =>
				mock<IWebhookData>({
					node: 'chatTriggerNode',
					httpMethod,
					path: 'original-path',
					workflowId: workflowEntity.id,
					userId,
				});

			beforeEach(() => {
				executionContextService.buildManualExecutionCredentials.mockResolvedValue(carrier);
			});

			afterEach(() => {
				vi.unstubAllEnvs();
			});

			test('mints and stores the carrier for an identity-bearing chat trigger', async () => {
				// ARRANGE
				vi.stubEnv('N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2', 'true');
				vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(chatWorkflow(IDENTITY_BEARING));
				vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([chatWebhook()]);

				// ACT
				await testWebhooks.needsWebhook({ ...args, chatSessionId: 'session', n8nAuthCookie });

				// ASSERT
				expect(executionContextService.buildManualExecutionCredentials).toHaveBeenCalledWith(
					n8nAuthCookie,
				);
				expect(registrations.register.mock.calls[0][0].encryptedRunnerIdentity).toBe(carrier);
			});

			test('mints only once for a trigger that registers several webhooks', async () => {
				// ARRANGE
				vi.stubEnv('N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2', 'true');
				vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(chatWorkflow(IDENTITY_BEARING));
				vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([
					chatWebhook(),
					chatWebhook(),
				]);

				// ACT
				await testWebhooks.needsWebhook({ ...args, n8nAuthCookie });

				// ASSERT
				expect(executionContextService.buildManualExecutionCredentials).toHaveBeenCalledTimes(1);
			});

			test.each([
				{
					reason: 'the feature flag is off',
					flag: 'false',
					parameters: IDENTITY_BEARING,
					type: CHAT_TRIGGER_NODE_TYPE,
					cookie: n8nAuthCookie,
				},
				{
					// A `n8nOAuth2` webhook node is identity-bearing too, but establishes its own
					// stronger carrier while its webhook runs, so this gate stays out of its way.
					reason: 'the trigger is not a chat trigger',
					flag: 'true',
					parameters: { authentication: 'n8nOAuth2' },
					type: 'n8n-nodes-base.webhook',
					cookie: n8nAuthCookie,
				},
				{
					// Publish-time validation rejects this pairing with an end-user credential, so
					// granting it identity in test mode would diverge from production. Expected to
					// start minting once IAM-1263 makes it identity-bearing.
					reason: 'the chat trigger is n8nUserAuth but not available in chat',
					flag: 'true',
					parameters: { authentication: 'n8nUserAuth' },
					type: CHAT_TRIGGER_NODE_TYPE,
					cookie: n8nAuthCookie,
				},
				{
					reason: 'authentication is basicAuth',
					flag: 'true',
					parameters: { authentication: 'basicAuth' },
					type: CHAT_TRIGGER_NODE_TYPE,
					cookie: n8nAuthCookie,
				},
				{
					reason: 'the chat trigger carries no relevant parameters',
					flag: 'true',
					parameters: {},
					type: CHAT_TRIGGER_NODE_TYPE,
					cookie: n8nAuthCookie,
				},
				{
					reason: 'availableInChat is an unresolved expression',
					flag: 'true',
					parameters: { availableInChat: '={{ $json.inChat }}' },
					type: CHAT_TRIGGER_NODE_TYPE,
					cookie: n8nAuthCookie,
				},
				{
					reason: 'no cookie was supplied',
					flag: 'true',
					parameters: IDENTITY_BEARING,
					type: CHAT_TRIGGER_NODE_TYPE,
					cookie: undefined,
				},
			])('does not mint a carrier when $reason', async ({ flag, parameters, type, cookie }) => {
				// ARRANGE
				vi.stubEnv('N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2', flag);
				vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(chatWorkflow(parameters, type));
				vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([chatWebhook()]);

				// ACT
				await testWebhooks.needsWebhook({ ...args, n8nAuthCookie: cookie });

				// ASSERT
				expect(executionContextService.buildManualExecutionCredentials).not.toHaveBeenCalled();
				expect(registrations.register.mock.calls[0][0].encryptedRunnerIdentity).toBeUndefined();
			});

			test('stores the carrier only on the chat trigger registration', async () => {
				// ARRANGE
				vi.stubEnv('N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2', 'true');
				vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(
					mock<Workflow>({
						id: workflowEntity.id,
						nodes: {
							chatTriggerNode: {
								type: CHAT_TRIGGER_NODE_TYPE,
								name: 'chatTriggerNode',
								parameters: IDENTITY_BEARING,
							},
							webhookNode: { type: 'n8n-nodes-base.webhook', name: 'webhookNode' },
						},
						expression: mock<WorkflowExpression>(),
					}),
				);
				vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([
					chatWebhook(),
					mock<IWebhookData>({
						node: 'webhookNode',
						httpMethod,
						path: 'webhook-path',
						workflowId: workflowEntity.id,
						userId,
					}),
				]);

				// ACT
				await testWebhooks.needsWebhook({ ...args, n8nAuthCookie });

				// ASSERT
				expect(registrations.register.mock.calls[0][0].encryptedRunnerIdentity).toBe(carrier);
				const webhookNodeCall = registrations.register.mock.calls.find(
					([registration]) => registration.webhook.node === 'webhookNode',
				);
				expect(webhookNodeCall?.[0].encryptedRunnerIdentity).toBeUndefined();
			});
		});
		test.each([
			{ published: true, withSingleWebhookTrigger: true, shouldThrow: true },
			{ published: true, withSingleWebhookTrigger: false, shouldThrow: false },
			{ published: false, withSingleWebhookTrigger: true, shouldThrow: false },
			{ published: false, withSingleWebhookTrigger: false, shouldThrow: false },
		] satisfies Array<{
			published: boolean;
			withSingleWebhookTrigger: boolean;
			shouldThrow: boolean;
		}>)(
			'handles single webhook trigger when workflowIsActive=%s',
			async ({ published: workflowIsActive, withSingleWebhookTrigger, shouldThrow }) => {
				const workflow = mock<Workflow>({ expression: mock<WorkflowExpression>() });
				const regularWebhook = mock<IWebhookData>({
					node: 'Webhook',
					httpMethod,
					path: 'regular-path',
					workflowId: workflowEntity.id,
					userId,
				});
				const telegramWebhook = mock<IWebhookData>({
					node: 'Telegram Trigger',
					httpMethod,
					path: 'telegram-path',
					workflowId: workflowEntity.id,
					userId,
				});
				const webhookNode = mock<IWorkflowBase['nodes'][number]>({
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
				});
				const telegramNode = mock<IWorkflowBase['nodes'][number]>({
					name: 'Telegram Trigger',
					type: 'n8n-nodes-base.telegramTrigger',
				});

				vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
				vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([
					regularWebhook,
					telegramWebhook,
				]);
				workflow.getNode.mockImplementation((name: string) => {
					if (name === 'Webhook') return webhookNode;
					if (name === 'Telegram Trigger' && withSingleWebhookTrigger) return telegramNode;
					return null;
				});

				if (shouldThrow) {
					const promise = testWebhooks.needsWebhook({
						...args,
						workflowIsActive,
					});

					await expect(promise).rejects.toThrow(
						"Because of limitations in Telegram Trigger, n8n can't listen for test executions at the same time as listening for production ones. Unpublish the workflow to execute.",
					);
				} else {
					const needsWebhook = await testWebhooks.needsWebhook({
						...args,
						workflowIsActive,
					});

					expect(needsWebhook).toBe(true);
				}
			},
		);
	});

	describe('executeWebhook()', () => {
		test('if webhook is not registered, should throw', async () => {
			vi.spyOn(testWebhooks, 'getActiveWebhook').mockResolvedValue(webhook);
			vi.spyOn(testWebhooks, 'getWebhookMethods').mockResolvedValue([]);

			const promise = testWebhooks.executeWebhook(
				mock<WebhookRequest>({ params: { path } }),
				mock(),
			);

			await expect(promise).rejects.toThrowError(WebhookNotFoundError);
		});

		test('if webhook is registered but missing from workflow, should throw', async () => {
			vi.spyOn(testWebhooks, 'getActiveWebhook').mockResolvedValue(webhook);
			vi.spyOn(testWebhooks, 'getWebhookMethods').mockResolvedValue([]);

			const registration = mock<TestWebhookRegistration>({
				pushRef: 'some-session-id',
				workflowEntity,
			});

			await registrations.register(registration);

			const promise = testWebhooks.executeWebhook(
				mock<WebhookRequest>({ params: { path } }),
				mock<express.Response>(),
			);

			await expect(promise).rejects.toThrowError(NotFoundError);
		});

		test('returns a not-found error when a form trigger is requested on the webhook route family', async () => {
			const formWebhook = mock<IWebhookData>({
				httpMethod,
				path,
				workflowId: workflowEntity.id,
				webhookDescription: { nodeType: 'form' } as never,
			});

			vi.spyOn(testWebhooks, 'getActiveWebhook').mockResolvedValue(formWebhook);
			vi.spyOn(testWebhooks, 'getWebhookMethods').mockResolvedValue([]);

			const promise = testWebhooks.executeWebhook(
				mock<WebhookRequest>({ params: { path } }),
				mock<express.Response>(),
				'webhook',
			);

			await expect(promise).rejects.toThrowError(WebhookNotFoundError);
		});

		test('returns a not-found error when a regular webhook is requested on the form route family', async () => {
			const regularWebhook = mock<IWebhookData>({
				httpMethod,
				path,
				workflowId: workflowEntity.id,
				webhookDescription: { nodeType: undefined } as never,
			});

			vi.spyOn(testWebhooks, 'getActiveWebhook').mockResolvedValue(regularWebhook);
			vi.spyOn(testWebhooks, 'getWebhookMethods').mockResolvedValue([]);

			const promise = testWebhooks.executeWebhook(
				mock<WebhookRequest>({ params: { path } }),
				mock<express.Response>(),
				'form',
			);

			await expect(promise).rejects.toThrowError(WebhookNotFoundError);
		});

		test('releases isolate only after deactivateWebhooks completes on successful execution', async () => {
			const expression = mock<WorkflowExpression>();
			const workflowStartNode = mock<ReturnType<Workflow['getNode']>>({
				type: 'n8n-nodes-base.noOp',
			});
			const workflow = mock<Workflow>({
				id: workflowEntity.id,
				expression,
				getNode: vi.fn().mockReturnValue(workflowStartNode),
			});

			vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValue(workflow);
			vi.spyOn(testWebhooks, 'getActiveWebhook').mockResolvedValue(webhook);
			registrations.get.mockResolvedValueOnce({
				version: 1,
				workflowEntity,
				webhook,
			} as TestWebhookRegistration);
			const deactivateSpy = vi
				.spyOn(testWebhooks, 'deactivateWebhooks')
				.mockResolvedValue(undefined);

			vi.spyOn(WebhookHelpers, 'executeWebhook').mockImplementation(async (...args: unknown[]) => {
				const onDone = args[10] as (error: Error | null, data: unknown) => void;
				onDone(null, { noWebhookResponse: true });
				return 'execution-id';
			});

			await testWebhooks.executeWebhook(
				mock<WebhookRequest>({ params: { path }, method: httpMethod }),
				mock<express.Response>(),
			);
			await flushMicrotasks();

			expect(deactivateSpy).toHaveBeenCalledWith(workflow);
			expect(expression.acquireIsolate).toHaveBeenCalledTimes(1);
			expect(expression.releaseIsolate).toHaveBeenCalledTimes(1);
			const [acquireOrder] = (expression.acquireIsolate as Mock).mock.invocationCallOrder;
			const [deactivateOrder] = deactivateSpy.mock.invocationCallOrder;
			const [releaseOrder] = (expression.releaseIsolate as Mock).mock.invocationCallOrder;
			expect(acquireOrder).toBeLessThan(deactivateOrder);
			expect(deactivateOrder).toBeLessThan(releaseOrder);
		});

		test('logs when isolate release fails after teardown', async () => {
			const expression = mock<WorkflowExpression>();
			const workflowStartNode = mock<ReturnType<Workflow['getNode']>>({
				type: 'n8n-nodes-base.noOp',
			});
			const workflow = mock<Workflow>({
				id: workflowEntity.id,
				expression,
				getNode: vi.fn().mockReturnValue(workflowStartNode),
			});

			vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValue(workflow);
			vi.spyOn(testWebhooks, 'getActiveWebhook').mockResolvedValue(webhook);
			registrations.get.mockResolvedValueOnce({
				version: 1,
				workflowEntity,
				webhook,
			} as TestWebhookRegistration);
			vi.spyOn(testWebhooks, 'deactivateWebhooks').mockResolvedValue(undefined);

			vi.spyOn(WebhookHelpers, 'executeWebhook').mockImplementation(async (...args: unknown[]) => {
				const onDone = args[10] as (error: Error | null, data: unknown) => void;
				onDone(null, { noWebhookResponse: true });
				return 'execution-id';
			});

			const error = new Error('release failed');
			expression.releaseIsolate.mockRejectedValueOnce(error);

			await testWebhooks.executeWebhook(
				mock<WebhookRequest>({ params: { path }, method: httpMethod }),
				mock<express.Response>(),
			);
			await flushMicrotasks();

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to release expression isolate for test webhook',
				expect.objectContaining({ error, workflowId: workflowEntity.id }),
			);
		});
	});

	describe('deactivateWebhooks()', () => {
		test('should add additional data to workflow', async () => {
			registrations.getAllRegistrations.mockResolvedValue([
				{ version: 1, workflowEntity, webhook },
			]);

			const workflow = testWebhooks.toWorkflow(workflowEntity);

			await testWebhooks.deactivateWebhooks(workflow);

			expect(mockedAdditionalData.getBase).toHaveBeenCalledWith({
				userId,
				workflowId: workflowEntity.id,
			});
		});
	});

	describe('cancelWebhook()', () => {
		test('acquires and releases isolate around deactivateWebhooks', async () => {
			const expression = mock<WorkflowExpression>();
			const workflow = mock<Workflow>({ id: workflowEntity.id, expression });

			vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValue(workflow);
			registrations.getAllKeys.mockResolvedValue(['key1']);
			registrations.get.mockResolvedValue({
				version: 1,
				workflowEntity,
				webhook,
			} as TestWebhookRegistration);
			const deactivateSpy = vi
				.spyOn(testWebhooks, 'deactivateWebhooks')
				.mockResolvedValue(undefined);

			await testWebhooks.cancelWebhook(workflowEntity.id);
			await flushMicrotasks();

			expect(expression.acquireIsolate).toHaveBeenCalledTimes(1);
			expect(deactivateSpy).toHaveBeenCalledWith(workflow);
			expect(expression.releaseIsolate).toHaveBeenCalledTimes(1);
			const [acquireOrder] = (expression.acquireIsolate as Mock).mock.invocationCallOrder;
			const [deactivateOrder] = deactivateSpy.mock.invocationCallOrder;
			const [releaseOrder] = (expression.releaseIsolate as Mock).mock.invocationCallOrder;
			expect(acquireOrder).toBeLessThan(deactivateOrder);
			expect(deactivateOrder).toBeLessThan(releaseOrder);
		});

		test('releases isolate and logs when deactivateWebhooks throws', async () => {
			const expression = mock<WorkflowExpression>();
			const workflow = mock<Workflow>({ id: workflowEntity.id, expression });

			vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValue(workflow);
			registrations.getAllKeys.mockResolvedValue(['key1']);
			registrations.get.mockResolvedValue({
				version: 1,
				workflowEntity,
				webhook,
			} as TestWebhookRegistration);
			const error = new Error('boom');
			vi.spyOn(testWebhooks, 'deactivateWebhooks').mockRejectedValue(error);

			await testWebhooks.cancelWebhook(workflowEntity.id);
			await flushMicrotasks();

			expect(expression.acquireIsolate).toHaveBeenCalledTimes(1);
			expect(expression.releaseIsolate).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to deactivate test webhooks on cancel',
				expect.objectContaining({ error, workflowId: workflowEntity.id }),
			);
		});
	});

	describe('handleClearTestWebhooks()', () => {
		test('acquires and releases isolate around deactivateWebhooks', async () => {
			const expression = mock<WorkflowExpression>();
			const workflow = mock<Workflow>({ id: workflowEntity.id, expression });

			vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValue(workflow);
			((testWebhooks as any).push.hasPushRef as Mock).mockReturnValue(true);
			const deactivateSpy = vi
				.spyOn(testWebhooks, 'deactivateWebhooks')
				.mockResolvedValue(undefined);

			await testWebhooks.handleClearTestWebhooks({
				webhookKey: 'key1',
				workflowEntity,
				pushRef: 'push-ref',
			});

			expect(expression.acquireIsolate).toHaveBeenCalledTimes(1);
			expect(deactivateSpy).toHaveBeenCalledWith(workflow);
			expect(expression.releaseIsolate).toHaveBeenCalledTimes(1);
		});

		test('releases isolate when deactivateWebhooks throws', async () => {
			const expression = mock<WorkflowExpression>();
			const workflow = mock<Workflow>({ id: workflowEntity.id, expression });

			vi.spyOn(testWebhooks, 'toWorkflow').mockReturnValue(workflow);
			((testWebhooks as any).push.hasPushRef as Mock).mockReturnValue(true);
			vi.spyOn(testWebhooks, 'deactivateWebhooks').mockRejectedValue(new Error('boom'));

			await expect(
				testWebhooks.handleClearTestWebhooks({
					webhookKey: 'key1',
					workflowEntity,
					pushRef: 'push-ref',
				}),
			).rejects.toThrow('boom');

			expect(expression.acquireIsolate).toHaveBeenCalledTimes(1);
			expect(expression.releaseIsolate).toHaveBeenCalledTimes(1);
		});
	});

	describe('getWebhookMethods()', () => {
		beforeEach(() => {
			registrations.toKey.mockImplementation(
				(webhook: Pick<IWebhookData, 'webhookId' | 'httpMethod' | 'path'>) => {
					const { webhookId, httpMethod, path: webhookPath } = webhook;
					if (!webhookId) return [httpMethod, webhookPath].join('|');

					let path = webhookPath;
					if (path.startsWith(webhookId)) {
						const cutFromIndex = path.indexOf('/') + 1;

						path = path.slice(cutFromIndex);
					}
					return [httpMethod, webhookId, path.split('/').length].join('|');
				},
			);
		});

		test('should normalize trailing slash', async () => {
			const METHOD = 'POST';
			const PATH_WITH_SLASH = 'register/';
			const PATH_WITHOUT_SLASH = 'register';
			const webhookData = {
				httpMethod: METHOD as IHttpRequestMethods,
				path: PATH_WITHOUT_SLASH,
			} as IWebhookData;

			registrations.getRegistrationsHash.mockImplementation(async () => {
				return {
					[registrations.toKey(webhookData)]: {
						version: 1,
						workflowEntity: mock<WorkflowEntity>(),
						webhook: webhookData,
					},
				};
			});

			const resultWithSlash = await testWebhooks.getWebhookMethods(PATH_WITH_SLASH);
			const resultWithoutSlash = await testWebhooks.getWebhookMethods(PATH_WITHOUT_SLASH);

			expect(resultWithSlash).toEqual([METHOD]);
			expect(resultWithoutSlash).toEqual([METHOD]);
		});

		test('should return methods for webhooks with dynamic paths', async () => {
			const METHOD = 'POST';
			const PATH = '12345/register/:id';

			const webhookData = {
				webhookId: '12345',
				httpMethod: METHOD as IHttpRequestMethods,
				// Path for dynamic webhook does not contain webhookId
				path: 'register/:id',
			};

			registrations.getRegistrationsHash.mockImplementation(async () => {
				return {
					[registrations.toKey(webhookData)]: {
						version: 1,
						workflowEntity: mock<WorkflowEntity>(),
						webhook: webhookData as IWebhookData,
					},
				};
			});

			const result = await testWebhooks.getWebhookMethods(PATH);

			expect(result).toEqual([METHOD]);
		});
	});
});
