import type { Logger } from '@n8n/backend-common';
import type { WorkflowEntity } from '@n8n/db';
import { generateNanoId } from '@n8n/db';
import type * as express from 'express';
import { mock } from 'jest-mock-extended';
import type {
	Expression,
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

const flushMicrotasks = async () => await new Promise(jest.requireActual('timers').setImmediate);

describe('TestWebhooks', () => {
	const logger = mock<Logger>();
	const registrations = mock<TestWebhookRegistrationsService>();
	const webhookService = mock<WebhookService>();

	const testWebhooks = new TestWebhooks(
		logger,
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
			const workflow = mock<Workflow>({ expression: mock<Expression>() });

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
			const workflow = mock<Workflow>({ expression: mock<Expression>() });
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
			const workflow = mock<Workflow>({ expression: mock<Expression>() });
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

		test('releases isolate only after deactivateWebhooks completes on successful execution', async () => {
			const expression = mock<Expression>();
			const workflowStartNode = mock<ReturnType<Workflow['getNode']>>({
				type: 'n8n-nodes-base.noOp',
			});
			const workflow = mock<Workflow>({
				id: workflowEntity.id,
				expression,
				getNode: jest.fn().mockReturnValue(workflowStartNode),
			});

			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValue(workflow);
			jest.spyOn(testWebhooks, 'getActiveWebhook').mockResolvedValue(webhook);
			registrations.get.mockResolvedValueOnce({
				version: 1,
				workflowEntity,
				webhook,
			} as TestWebhookRegistration);
			const deactivateSpy = jest
				.spyOn(testWebhooks, 'deactivateWebhooks')
				.mockResolvedValue(undefined);

			jest
				.spyOn(WebhookHelpers, 'executeWebhook')
				.mockImplementation(async (...args: unknown[]) => {
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
			const [acquireOrder] = (expression.acquireIsolate as jest.Mock).mock.invocationCallOrder;
			const [deactivateOrder] = deactivateSpy.mock.invocationCallOrder;
			const [releaseOrder] = (expression.releaseIsolate as jest.Mock).mock.invocationCallOrder;
			expect(acquireOrder).toBeLessThan(deactivateOrder);
			expect(deactivateOrder).toBeLessThan(releaseOrder);
		});

		test('logs when isolate release fails after teardown', async () => {
			const expression = mock<Expression>();
			const workflowStartNode = mock<ReturnType<Workflow['getNode']>>({
				type: 'n8n-nodes-base.noOp',
			});
			const workflow = mock<Workflow>({
				id: workflowEntity.id,
				expression,
				getNode: jest.fn().mockReturnValue(workflowStartNode),
			});

			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValue(workflow);
			jest.spyOn(testWebhooks, 'getActiveWebhook').mockResolvedValue(webhook);
			registrations.get.mockResolvedValueOnce({
				version: 1,
				workflowEntity,
				webhook,
			} as TestWebhookRegistration);
			jest.spyOn(testWebhooks, 'deactivateWebhooks').mockResolvedValue(undefined);

			jest
				.spyOn(WebhookHelpers, 'executeWebhook')
				.mockImplementation(async (...args: unknown[]) => {
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
			registrations.getAllRegistrations.mockResolvedValue([{ workflowEntity, webhook }]);

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
			const expression = mock<Expression>();
			const workflow = mock<Workflow>({ id: workflowEntity.id, expression });

			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValue(workflow);
			registrations.getAllKeys.mockResolvedValue(['key1']);
			registrations.get.mockResolvedValue({
				version: 1,
				workflowEntity,
				webhook,
			} as TestWebhookRegistration);
			const deactivateSpy = jest
				.spyOn(testWebhooks, 'deactivateWebhooks')
				.mockResolvedValue(undefined);

			await testWebhooks.cancelWebhook(workflowEntity.id);
			await flushMicrotasks();

			expect(expression.acquireIsolate).toHaveBeenCalledTimes(1);
			expect(deactivateSpy).toHaveBeenCalledWith(workflow);
			expect(expression.releaseIsolate).toHaveBeenCalledTimes(1);
			const [acquireOrder] = (expression.acquireIsolate as jest.Mock).mock.invocationCallOrder;
			const [deactivateOrder] = deactivateSpy.mock.invocationCallOrder;
			const [releaseOrder] = (expression.releaseIsolate as jest.Mock).mock.invocationCallOrder;
			expect(acquireOrder).toBeLessThan(deactivateOrder);
			expect(deactivateOrder).toBeLessThan(releaseOrder);
		});

		test('releases isolate and logs when deactivateWebhooks throws', async () => {
			const expression = mock<Expression>();
			const workflow = mock<Workflow>({ id: workflowEntity.id, expression });

			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValue(workflow);
			registrations.getAllKeys.mockResolvedValue(['key1']);
			registrations.get.mockResolvedValue({
				version: 1,
				workflowEntity,
				webhook,
			} as TestWebhookRegistration);
			const error = new Error('boom');
			jest.spyOn(testWebhooks, 'deactivateWebhooks').mockRejectedValue(error);

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
			const expression = mock<Expression>();
			const workflow = mock<Workflow>({ id: workflowEntity.id, expression });

			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValue(workflow);
			((testWebhooks as any).push.hasPushRef as jest.Mock).mockReturnValue(true);
			const deactivateSpy = jest
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
			const expression = mock<Expression>();
			const workflow = mock<Workflow>({ id: workflowEntity.id, expression });

			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValue(workflow);
			((testWebhooks as any).push.hasPushRef as jest.Mock).mockReturnValue(true);
			jest.spyOn(testWebhooks, 'deactivateWebhooks').mockRejectedValue(new Error('boom'));

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
