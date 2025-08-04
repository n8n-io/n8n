import { generateNanoId } from '@n8n/db';
import type * as express from 'express';
import { mock } from 'jest-mock-extended';
import type {
	ITaskData,
	IWorkflowBase,
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	Workflow,
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
			registrations.getAllRegistrations.mockResolvedValue([{ workflowEntity, webhook }]);

			const workflow = testWebhooks.toWorkflow(workflowEntity);

			await testWebhooks.deactivateWebhooks(workflow);

			expect(mockedAdditionalData.getBase).toHaveBeenCalledWith(userId);
		});
	});

	describe('getWebhookMethods()', () => {
		test('should normalize trailing slash', async () => {
			const METHOD = 'POST';
			const PATH_WITH_SLASH = 'register/';
			const PATH_WITHOUT_SLASH = 'register';
			registrations.getAllKeys.mockResolvedValue([`${METHOD}|${PATH_WITHOUT_SLASH}`]);

			const resultWithSlash = await testWebhooks.getWebhookMethods(PATH_WITH_SLASH);
			const resultWithoutSlash = await testWebhooks.getWebhookMethods(PATH_WITHOUT_SLASH);

			expect(resultWithSlash).toEqual([METHOD]);
			expect(resultWithoutSlash).toEqual([METHOD]);
		});
	});
});
