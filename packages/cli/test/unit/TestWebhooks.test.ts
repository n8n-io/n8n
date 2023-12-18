import { ActiveWebhooks } from '@/ActiveWebhooks';
import { mockInstance } from '../shared/mocking';
import { NodeTypes } from '@/NodeTypes';
import { Push } from '@/push';
import { TestWebhooks } from '@/TestWebhooks';
import { WebhookNotFoundError } from '@/errors/response-errors/webhook-not-found.error';
import { v4 as uuid } from 'uuid';
import { generateNanoId } from '@/databases/utils/generators';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import * as WebhookHelpers from '@/WebhookHelpers';

import type { IWorkflowDb, WebhookRequest } from '@/Interfaces';
import type express from 'express';
import type {
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';

describe('TestWebhooks', () => {
	jest.useFakeTimers();

	const activeWebhooks = mockInstance(ActiveWebhooks);
	const push = mockInstance(Push);
	const nodeTypes = mockInstance(NodeTypes);

	const testWebhooks = new TestWebhooks(activeWebhooks, push, nodeTypes);

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('needsWebhook()', () => {
		const httpMethod = 'GET';
		const path = uuid();
		const workflowId = generateNanoId();

		const webhook = {
			httpMethod,
			path,
			workflowId,
			webhookDescription: {},
		} as IWebhookData;

		const keyPart = [httpMethod, path].join('|');

		type NeedsWebhookArgs = [
			IWorkflowDb,
			Workflow,
			IWorkflowExecuteAdditionalData,
			WorkflowExecuteMode,
			WorkflowActivateMode,
		];

		const args: NeedsWebhookArgs = [
			{ id: workflowId } as unknown as IWorkflowDb,
			{ id: workflowId } as unknown as Workflow,
			{} as unknown as IWorkflowExecuteAdditionalData,
			'manual',
			'manual',
		];

		test('should register a webhook as active', async () => {
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
			activeWebhooks.getWebhookKey.mockReturnValue(keyPart);

			const needsWebhook = await testWebhooks.needsWebhook(...args);

			expect(needsWebhook).toBe(true);
			expect(activeWebhooks.add).toHaveBeenCalledWith(
				{ id: workflowId },
				webhook,
				'manual',
				'manual',
			);
		});

		test('should remove from active webhooks on failure to add', async () => {
			const msg = 'Failed to add webhook to active webhooks';

			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
			activeWebhooks.getWebhookKey.mockReturnValue(keyPart);
			activeWebhooks.add.mockRejectedValue(new Error(msg));

			const needsWebhook = testWebhooks.needsWebhook(...args);

			await expect(needsWebhook).rejects.toThrowError(msg);
			expect(activeWebhooks.removeWorkflow).toHaveBeenCalledWith({ id: workflowId });
		});

		test('should return false if no webhook to start workflow', async () => {
			webhook.webhookDescription.restartWebhook = true;
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);

			const result = await testWebhooks.needsWebhook(...args);

			expect(result).toBe(false);
		});
	});

	describe('executeWebhook()', () => {
		const httpMethod = 'GET';
		const path = uuid();
		const workflowId = generateNanoId();

		const webhook = {
			httpMethod,
			path,
			workflowId,
		} as IWebhookData;

		const keyPart = [httpMethod, path].join('|');

		test('should throw if webhook is not registered', async () => {
			activeWebhooks.get.mockReturnValue(webhook);
			activeWebhooks.getWebhookMethods.mockReturnValue([]);
			activeWebhooks.getWebhookKey.mockReturnValue(keyPart);

			const request = { params: { path } } as WebhookRequest;
			const response = {} as express.Response;
			const promise = testWebhooks.executeWebhook(request, response);

			await expect(promise).rejects.toThrowError(WebhookNotFoundError);
		});

		test('should throw if webhook node is registered but missing from workflow', async () => {
			activeWebhooks.get.mockReturnValue(webhook);
			activeWebhooks.getWebhookMethods.mockReturnValue([]);
			activeWebhooks.getWebhookKey.mockReturnValue(keyPart);

			// @ts-expect-error Private property
			testWebhooks.testWebhooks[`${keyPart}|${workflowId}`] = {
				sessionId: 'some-session-id',
				timeout: setTimeout(() => {}, 0),
				workflowEntity: {} as IWorkflowDb,
				workflow: { getNode: () => null } as unknown as Workflow,
			};

			const request = { params: { path } } as WebhookRequest;
			const response = {} as express.Response;
			const promise = testWebhooks.executeWebhook(request, response);

			await expect(promise).rejects.toThrowError(NotFoundError);

			// @ts-expect-error Private property
			delete testWebhooks.testWebhooks[`${keyPart}|${workflowId}`];
		});
	});
});
