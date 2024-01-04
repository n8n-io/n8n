import { mock } from 'jest-mock-extended';
import { TestWebhooks } from '@/TestWebhooks';
import { WebhookNotFoundError } from '@/errors/response-errors/webhook-not-found.error';
import { v4 as uuid } from 'uuid';
import { generateNanoId } from '@/databases/utils/generators';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import * as WebhookHelpers from '@/WebhookHelpers';

import type { IWorkflowDb, WebhookRequest } from '@/Interfaces';
import type {
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import type {
	TestWebhookRegistrationsService,
	TestWebhookRegistration,
} from '@/services/test-webhook-registrations.service';

describe('TestWebhooks', () => {
	const registrations = mock<TestWebhookRegistrationsService>();
	const testWebhooks = new TestWebhooks(mock(), mock(), registrations);

	beforeAll(() => {
		jest.useFakeTimers();
	});

	const httpMethod = 'GET';
	const path = uuid();
	const workflowId = generateNanoId();

	const webhook = mock<IWebhookData>({
		httpMethod,
		path,
		workflowId,
	});

	describe('needsWebhook()', () => {
		type NeedsWebhookArgs = [
			IWorkflowDb,
			IWorkflowExecuteAdditionalData,
			WorkflowExecuteMode,
			WorkflowActivateMode,
		];

		const workflow = mock<Workflow>({ id: workflowId });

		const args: NeedsWebhookArgs = [
			mock<IWorkflowDb>({ id: workflowId, nodes: [] }),
			mock<IWorkflowExecuteAdditionalData>(),
			'manual',
			'manual',
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
				workflowEntity: mock<IWorkflowDb>({}),
			});

			await registrations.register(registration);

			const promise = testWebhooks.executeWebhook(
				mock<WebhookRequest>({ params: { path } }),
				mock(),
			);

			await expect(promise).rejects.toThrowError(NotFoundError);
		});
	});
});
