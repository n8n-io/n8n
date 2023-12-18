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

	const push = mockInstance(Push);
	const nodeTypes = mockInstance(NodeTypes);

	const testWebhooks = new TestWebhooks(push, nodeTypes);

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

		const workflow = {
			id: workflowId,
			createWebhookIfNotExists: () => {},
			deleteWebhook: () => {},
		} as unknown as Workflow;

		const args: NeedsWebhookArgs = [
			{ id: workflowId } as unknown as IWorkflowDb,
			workflow,
			{} as unknown as IWorkflowExecuteAdditionalData,
			'manual',
			'manual',
		];

		test('should register a webhook as active', async () => {
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
			jest.spyOn(testWebhooks, 'toWebhookKey').mockReturnValue(keyPart);
			const activateWebhookSpy = jest.spyOn(testWebhooks, 'activateWebhook');

			const needsWebhook = await testWebhooks.needsWebhook(...args);

			expect(needsWebhook).toBe(true);
			expect(activateWebhookSpy).toHaveBeenCalledWith(workflow, webhook, 'manual', 'manual');
		});

		test('should remove from active webhooks on failure to add', async () => {
			const msg = 'Failed to add webhook to active webhooks';

			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
			jest.spyOn(testWebhooks, 'toWebhookKey').mockReturnValue(keyPart);
			jest.spyOn(testWebhooks, 'activateWebhook').mockRejectedValue(new Error(msg));
			const deactivateSpy = jest.spyOn(testWebhooks, 'deactivateWebhooksFor');

			const needsWebhook = testWebhooks.needsWebhook(...args);

			await expect(needsWebhook).rejects.toThrowError(msg);
			expect(deactivateSpy).toHaveBeenCalledWith(workflow);
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
			jest.spyOn(testWebhooks, 'getActiveWebhook').mockReturnValue(webhook);
			jest.spyOn(testWebhooks, 'getWebhookMethods').mockResolvedValue([]);
			jest.spyOn(testWebhooks, 'toWebhookKey').mockReturnValue(keyPart);

			const request = { params: { path } } as WebhookRequest;
			const response = {} as express.Response;
			const promise = testWebhooks.executeWebhook(request, response);

			await expect(promise).rejects.toThrowError(WebhookNotFoundError);
		});

		test('should throw if webhook node is registered but missing from workflow', async () => {
			jest.spyOn(testWebhooks, 'getActiveWebhook').mockReturnValue(webhook);
			jest.spyOn(testWebhooks, 'getWebhookMethods').mockResolvedValue([]);
			jest.spyOn(testWebhooks, 'toWebhookKey').mockReturnValue(keyPart);

			// @ts-expect-error Private property
			testWebhooks.registeredWebhooks[`${keyPart}|${workflowId}`] = {
				sessionId: 'some-session-id',
				timeout: setTimeout(() => {}, 0),
				workflowEntity: {} as IWorkflowDb,
				workflow: {
					getNode: () => null,
				} as unknown as Workflow,
			};

			const request = { params: { path } } as WebhookRequest;
			const response = {} as express.Response;
			const promise = testWebhooks.executeWebhook(request, response);

			await expect(promise).rejects.toThrowError(NotFoundError);

			// @ts-expect-error Private property
			delete testWebhooks.registeredWebhooks[`${keyPart}|${workflowId}`];
		});
	});
});
