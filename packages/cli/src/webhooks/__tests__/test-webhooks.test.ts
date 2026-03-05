import type { WorkflowEntity } from '@n8n/db';
import { generateNanoId } from '@n8n/db';
import type * as express from 'express';
import { mock } from 'jest-mock-extended';
import type {
	ITaskData,
	IWorkflowBase,
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

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

jest.mock('@/workflow-execute-additional-data');

const mockedAdditionalData = AdditionalData as jest.Mocked<typeof AdditionalData>;

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

describe('TestWebhooks', () => {
	const registrations = mock<TestWebhookRegistrationsService>();
	const webhookService = mock<WebhookService>();

	const testWebhooks = new TestWebhooks(
		mock(),
		mock(),
		registrations,
		mock(),
		mock(),
		webhookService,
	);

	beforeAll(() => {
		jest.useFakeTimers();
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('needsWebhook()', () => {
		const args: Parameters<typeof testWebhooks.needsWebhook>[0] = {
			userId,
			workflowEntity,
			additionalData: mock<IWorkflowExecuteAdditionalData>(),
		};

		test('if webhook is needed, should register then create webhook and return true', async () => {
			const workflow = mock<Workflow>();

			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);

			const needsWebhook = await testWebhooks.needsWebhook(args);

			const [registerOrder] = registrations.register.mock.invocationCallOrder;
			const [createOrder] = webhookService.createWebhookIfNotExists.mock.invocationCallOrder;

			expect(registerOrder).toBeLessThan(createOrder);
			expect(needsWebhook).toBe(true);
		});

		test('if webhook activation fails, should deactivate workflow webhooks', async () => {
			const msg = 'Failed to add webhook to active webhooks';

			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
			jest.spyOn(registrations, 'register').mockRejectedValueOnce(new Error(msg));
			registrations.getAllRegistrations.mockResolvedValue([]);

			const needsWebhook = testWebhooks.needsWebhook(args);

			await expect(needsWebhook).rejects.toThrowError(msg);
		});

		test('if no webhook is found to start workflow, should return false', async () => {
			webhook.webhookDescription.restartWebhook = true;
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);

			const result = await testWebhooks.needsWebhook(args);

			expect(result).toBe(false);
		});

		test('returns false if a triggerToStartFrom with triggerData is given', async () => {
			const workflow = mock<Workflow>();
			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);

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
			const workflow = mock<Workflow>();
			const webhook2 = mock<IWebhookData>({
				node: 'trigger',
				httpMethod,
				path,
				workflowId: workflowEntity.id,
				userId,
			});
			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook, webhook2]);

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
			});
			const chatSessionId = 'test-session-123';
			const chatWebhook = mock<IWebhookData>({
				node: 'chatTriggerNode',
				httpMethod,
				path: 'original-path',
				workflowId: workflowEntity.id,
				userId,
			});

			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([chatWebhook]);

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
			});
			const chatWebhook = mock<IWebhookData>({
				node: 'chatTriggerNode',
				httpMethod,
				path: 'original-path',
				workflowId: workflowEntity.id,
				userId,
			});

			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([chatWebhook]);

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
			});
			const chatSessionId = 'test-session-123';
			const regularWebhook = mock<IWebhookData>({
				node: 'webhookNode',
				httpMethod,
				path: 'webhook-path',
				workflowId: workflowEntity.id,
				userId,
			});

			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([regularWebhook]);

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
			const workflow = mock<Workflow>();
			const destinationNodeObj = { nodeName: 'DestinationNode', mode: 'inclusive' as const };
			webhook.webhookDescription = {
				restartWebhook: false,
				httpMethod,
				name: 'default',
				path,
			};

			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);

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
				const workflow = mock<Workflow>();
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

				jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
				jest
					.spyOn(WebhookHelpers, 'getWorkflowWebhooks')
					.mockReturnValue([regularWebhook, telegramWebhook]);
				jest.spyOn(workflow, 'getNode').mockImplementation((name: string) => {
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
			jest.spyOn(testWebhooks, 'getActiveWebhook').mockResolvedValue(webhook);
			jest.spyOn(testWebhooks, 'getWebhookMethods').mockResolvedValue([]);

			const promise = testWebhooks.executeWebhook(
				mock<WebhookRequest>({ params: { path } }),
				mock(),
			);

			await expect(promise).rejects.toThrowError(WebhookNotFoundError);
		});

		test('if webhook is registered but missing from workflow, should throw', async () => {
			jest.spyOn(testWebhooks, 'getActiveWebhook').mockResolvedValue(webhook);
			jest.spyOn(testWebhooks, 'getWebhookMethods').mockResolvedValue([]);

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
