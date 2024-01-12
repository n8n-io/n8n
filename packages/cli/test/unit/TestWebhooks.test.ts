import { mock } from 'jest-mock-extended';
import { TestWebhooks } from '@/TestWebhooks';
import { WebhookNotFoundError } from '@/errors/response-errors/webhook-not-found.error';
import { v4 as uuid } from 'uuid';
import { generateNanoId } from '@/databases/utils/generators';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import * as WebhookHelpers from '@/WebhookHelpers';
import type * as express from 'express';

import type { IWorkflowDb, WebhookRequest } from '@/Interfaces';
import type { IWebhookData, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import type {
	TestWebhookRegistrationsService,
	TestWebhookRegistration,
} from '@/services/test-webhook-registrations.service';

import * as AdditionalData from '@/WorkflowExecuteAdditionalData';

jest.mock('@/WorkflowExecuteAdditionalData');

const mockedAdditionalData = AdditionalData as jest.Mocked<typeof AdditionalData>;

const workflowEntity = mock<IWorkflowDb>({ id: generateNanoId(), nodes: [] });

const httpMethod = 'GET';
const path = uuid();
const userId = '04ab4baf-85df-478f-917b-d303934a97de';

const webhook = mock<IWebhookData>({
	httpMethod,
	path,
	workflowId: workflowEntity.id,
	userId,
});

const registrations = mock<TestWebhookRegistrationsService>();

let testWebhooks: TestWebhooks;

describe('TestWebhooks', () => {
	beforeAll(() => {
		testWebhooks = new TestWebhooks(mock(), mock(), registrations);
		jest.useFakeTimers();
	});

	describe('needsWebhook()', () => {
		const args: Parameters<typeof testWebhooks.needsWebhook> = [
			userId,
			workflowEntity,
			mock<IWorkflowExecuteAdditionalData>(),
		];

		test('if webhook is needed, should return true and activate webhook', async () => {
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);

			const needsWebhook = await testWebhooks.needsWebhook(...args);

			expect(needsWebhook).toBe(true);
		});

		test('if webhook activation fails, should deactivate workflow webhooks', async () => {
			const msg = 'Failed to add webhook to active webhooks';

			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
			jest.spyOn(registrations, 'register').mockRejectedValueOnce(new Error(msg));
			registrations.getAllRegistrations.mockResolvedValue([]);

			const needsWebhook = testWebhooks.needsWebhook(...args);

			await expect(needsWebhook).rejects.toThrowError(msg);
		});

		test('if no webhook is found to start workflow, should return false', async () => {
			webhook.webhookDescription.restartWebhook = true;
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);

			const result = await testWebhooks.needsWebhook(...args);

			expect(result).toBe(false);
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
				sessionId: 'some-session-id',
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
});
