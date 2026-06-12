/* eslint-disable @typescript-eslint/unbound-method */
import type { WebhookEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { IWebhookData, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { WebhookPathTakenError } from 'n8n-workflow';

import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import type { WebhookService } from '@/webhooks/webhook.service';
import { WebhookTriggerRegistrar } from '@/workflows/triggers/webhook-trigger-registrar';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { createWorkflow, logger, node } from './trigger-test-utils';

describe('WebhookTriggerRegistrar', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	test('normalizes webhook paths, stores dynamic metadata, and saves static data', async () => {
		const webhookService = mock<WebhookService>();
		const workflowStaticDataService = mock<WorkflowStaticDataService>();
		const registrar = new WebhookTriggerRegistrar(
			logger,
			mock<ErrorReporter>(),
			webhookService,
			workflowStaticDataService,
		);
		const webhookEntity = { webhookPath: '/team/:id/', node: 'Webhook' } as WebhookEntity;
		webhookService.createWebhook.mockReturnValue(webhookEntity);
		const webhookData = mock<IWebhookData>({
			node: 'Webhook',
			workflowId: 'wf-1',
			httpMethod: 'GET',
			path: '/team/:id/',
		});
		jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhookData]);
		const workflow = createWorkflow([
			node('webhook-node', 'webhook', { name: 'Webhook', webhookId: 'hook-id' }),
		]);

		await registrar.register({
			workflow,
			additionalData: mock<IWorkflowExecuteAdditionalData>(),
			mode: 'trigger',
			activation: 'update',
			nodeIds: new Set(['webhook-node']),
		});

		expect(webhookService.storeWebhook).toHaveBeenCalledWith(
			expect.objectContaining({
				webhookPath: 'team/:id',
				webhookId: 'hook-id',
				pathLength: 2,
			}),
		);
		expect(webhookService.createWebhookIfNotExists).toHaveBeenCalledWith(
			workflow,
			webhookData,
			'trigger',
			'update',
		);
		expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
	});

	test('filters registration and deregistration by node id', async () => {
		const webhookService = mock<WebhookService>();
		const workflowStaticDataService = mock<WorkflowStaticDataService>();
		const registrar = new WebhookTriggerRegistrar(
			logger,
			mock<ErrorReporter>(),
			webhookService,
			workflowStaticDataService,
		);
		webhookService.createWebhook.mockImplementation(
			(data) => ({ webhookPath: data.webhookPath, node: data.node }) as WebhookEntity,
		);
		const webhookA = mock<IWebhookData>({
			node: 'Webhook A',
			workflowId: 'wf-1',
			httpMethod: 'GET',
			path: 'a',
		});
		const webhookB = mock<IWebhookData>({
			node: 'Webhook B',
			workflowId: 'wf-1',
			httpMethod: 'POST',
			path: 'b',
		});
		jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhookA, webhookB]);
		const workflow = createWorkflow([
			node('a', 'webhook', { name: 'Webhook A' }),
			node('b', 'webhook', { name: 'Webhook B' }),
		]);

		await registrar.register({
			workflow,
			additionalData: mock<IWorkflowExecuteAdditionalData>(),
			mode: 'trigger',
			activation: 'update',
			nodeIds: new Set(['b']),
		});
		const removed = await registrar.deregister(
			workflow,
			mock<IWorkflowExecuteAdditionalData>(),
			new Set(['b']),
		);

		expect(webhookService.storeWebhook).toHaveBeenCalledTimes(1);
		expect(webhookService.storeWebhook).toHaveBeenCalledWith(
			expect.objectContaining({ webhookPath: 'b', node: 'Webhook B' }),
		);
		expect(webhookService.deleteWebhook).toHaveBeenCalledTimes(1);
		expect(webhookService.deleteWebhook).toHaveBeenCalledWith(
			workflow,
			webhookB,
			'internal',
			'update',
		);
		expect(removed).toEqual(['Webhook B']);
	});

	test('cleans registered external webhooks and stored rows when later registration fails', async () => {
		const webhookService = mock<WebhookService>();
		const workflowStaticDataService = mock<WorkflowStaticDataService>();
		const registrar = new WebhookTriggerRegistrar(
			logger,
			mock<ErrorReporter>(),
			webhookService,
			workflowStaticDataService,
		);
		webhookService.createWebhook.mockImplementation(
			(data) => ({ webhookPath: data.webhookPath, node: data.node }) as WebhookEntity,
		);
		webhookService.createWebhookIfNotExists
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('external registration failed'));
		const webhookA = mock<IWebhookData>({
			node: 'Webhook A',
			workflowId: 'wf-1',
			httpMethod: 'GET',
			path: 'a',
		});
		const webhookB = mock<IWebhookData>({
			node: 'Webhook B',
			workflowId: 'wf-1',
			httpMethod: 'POST',
			path: 'b',
		});
		jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhookA, webhookB]);
		const workflow = createWorkflow([
			node('a', 'webhook', { name: 'Webhook A' }),
			node('b', 'webhook', { name: 'Webhook B' }),
		]);

		await expect(
			registrar.register({
				workflow,
				additionalData: mock<IWorkflowExecuteAdditionalData>(),
				mode: 'trigger',
				activation: 'update',
				nodeIds: new Set(['a', 'b']),
			}),
		).rejects.toThrow('external registration failed');

		expect(webhookService.deleteWebhook).toHaveBeenCalledTimes(2);
		expect(webhookService.deleteWebhook).toHaveBeenNthCalledWith(
			1,
			workflow,
			webhookA,
			'internal',
			'update',
		);
		expect(webhookService.deleteWebhook).toHaveBeenNthCalledWith(
			2,
			workflow,
			webhookB,
			'internal',
			'update',
		);
		expect(webhookService.deleteWorkflowWebhooksForNodes).toHaveBeenCalledWith('wf-1', [
			'Webhook A',
			'Webhook B',
		]);
		expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
	});

	test('translates update duplicate insert errors and tolerates init duplicates', async () => {
		const webhookService = mock<WebhookService>();
		const workflowStaticDataService = mock<WorkflowStaticDataService>();
		const registrar = new WebhookTriggerRegistrar(
			logger,
			mock<ErrorReporter>(),
			webhookService,
			workflowStaticDataService,
		);
		const webhookEntity = { webhookPath: 'taken', node: 'Webhook' } as WebhookEntity;
		webhookService.createWebhook.mockReturnValue(webhookEntity);
		const webhookData = mock<IWebhookData>({
			node: 'Webhook',
			workflowId: 'wf-1',
			httpMethod: 'GET',
			path: 'taken',
		});
		jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhookData]);
		const workflow = createWorkflow([node('webhook-node', 'webhook', { name: 'Webhook' })]);
		const dbError = new Error('duplicate');
		dbError.name = 'QueryFailedError';

		webhookService.storeWebhook.mockRejectedValueOnce(dbError);
		await expect(
			registrar.register({
				workflow,
				additionalData: mock<IWorkflowExecuteAdditionalData>(),
				mode: 'trigger',
				activation: 'update',
				nodeIds: new Set(['webhook-node']),
			}),
		).rejects.toBeInstanceOf(WebhookPathTakenError);
		expect(webhookService.deleteWebhook).not.toHaveBeenCalled();
		expect(webhookService.deleteWorkflowWebhooksForNodes).not.toHaveBeenCalled();

		webhookService.storeWebhook.mockRejectedValueOnce(dbError);
		await expect(
			registrar.register({
				workflow,
				additionalData: mock<IWorkflowExecuteAdditionalData>(),
				mode: 'trigger',
				activation: 'init',
				nodeIds: new Set(['webhook-node']),
			}),
		).resolves.toBe(true);
		expect(webhookService.createWebhookIfNotExists).not.toHaveBeenCalled();
		expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
	});
});
