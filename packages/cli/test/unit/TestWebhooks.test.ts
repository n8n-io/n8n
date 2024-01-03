import { mock } from 'jest-mock-extended';
import { TestWebhooks } from '@/TestWebhooks';
import { WebhookNotFoundError } from '@/errors/response-errors/webhook-not-found.error';
import { v4 as uuid } from 'uuid';
import { generateNanoId } from '@/databases/utils/generators';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import * as WebhookHelpers from '@/WebhookHelpers';

import type { IWorkflowDb, WebhookRegistration, WebhookRequest } from '@/Interfaces';
import type {
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';

describe('TestWebhooks', () => {
	const testWebhooks = new TestWebhooks(mock(), mock());

	beforeAll(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		testWebhooks.clearRegistrations();
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
			Workflow,
			IWorkflowExecuteAdditionalData,
			WorkflowExecuteMode,
			WorkflowActivateMode,
		];

		const workflow = mock<Workflow>({ id: workflowId });

		const args: NeedsWebhookArgs = [
			mock<IWorkflowDb>({ id: workflowId }),
			workflow,
			mock<IWorkflowExecuteAdditionalData>(),
			'manual',
			'manual',
		];

		test('should return true and activate webhook if needed', async () => {
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
			const activateWebhookSpy = jest.spyOn(testWebhooks, 'activateWebhook');

			const needsWebhook = await testWebhooks.needsWebhook(...args);

			expect(needsWebhook).toBe(true);
			expect(activateWebhookSpy).toHaveBeenCalledWith(workflow, webhook, 'manual', 'manual');
		});

		test('should deactivate webhooks on failure to activate', async () => {
			const msg = 'Failed to add webhook to active webhooks';

			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
			jest.spyOn(testWebhooks, 'activateWebhook').mockRejectedValue(new Error(msg));
			const deactivateWebhooksSpy = jest.spyOn(testWebhooks, 'deactivateWebhooks');

			const needsWebhook = testWebhooks.needsWebhook(...args);

			await expect(needsWebhook).rejects.toThrowError(msg);
			expect(deactivateWebhooksSpy).toHaveBeenCalledWith(workflow);
		});

		test('should return false if no webhook to start workflow', async () => {
			webhook.webhookDescription.restartWebhook = true;
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);

			const result = await testWebhooks.needsWebhook(...args);

			expect(result).toBe(false);
		});
	});

	describe('executeWebhook()', () => {
		test('should throw if webhook is not registered', async () => {
			jest.spyOn(testWebhooks, 'getActiveWebhook').mockReturnValue(webhook);
			jest.spyOn(testWebhooks, 'getWebhookMethods').mockResolvedValue([]);

			const promise = testWebhooks.executeWebhook(
				mock<WebhookRequest>({ params: { path } }),
				mock(),
			);

			await expect(promise).rejects.toThrowError(WebhookNotFoundError);
		});

		test('should throw if webhook node is registered but missing from workflow', async () => {
			jest.spyOn(testWebhooks, 'getActiveWebhook').mockReturnValue(webhook);
			jest.spyOn(testWebhooks, 'getWebhookMethods').mockResolvedValue([]);

			const registration = mock<WebhookRegistration>({
				sessionId: 'some-session-id',
				timeout: mock<NodeJS.Timeout>(),
				workflowEntity: mock<IWorkflowDb>({}),
				workflow: mock<Workflow>(),
			});

			testWebhooks.setRegistration(registration);

			const promise = testWebhooks.executeWebhook(
				mock<WebhookRequest>({ params: { path } }),
				mock(),
			);

			await expect(promise).rejects.toThrowError(NotFoundError);
		});
	});
});
