/* eslint-disable @typescript-eslint/unbound-method */
import type { WebhookEntity } from '@n8n/db';
import { mock, type MockProxy } from 'vitest-mock-extended';
import type { ErrorReporter, Span, Tracing } from 'n8n-core';
import type { IWebhookData, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { WebhookPathTakenError } from 'n8n-workflow';

import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import type { WebhookService } from '@/webhooks/webhook.service';
import { WebhookTriggerRegistrar } from '@/workflows/triggers/webhook-trigger-registrar';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { createWorkflow, logger, node } from './trigger-test-utils';

describe('WebhookTriggerRegistrar', () => {
	const tracing = mock<Tracing>();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
		tracing.startSpan.mockImplementation(async (_opts, spanCb) => await spanCb(mock<Span>()));
	});

	test('resolves workflow webhook definitions', () => {
		const registrar = new WebhookTriggerRegistrar(
			logger,
			mock<ErrorReporter>(),
			mock<WebhookService>(),
			mock<WorkflowStaticDataService>(),
			tracing,
		);
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		const webhookData = mock<IWebhookData>({ node: 'Webhook' });
		vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhookData]);
		const workflow = createWorkflow([node('webhook-node', 'webhook', { name: 'Webhook' })]);

		expect(registrar.getWebhookTriggers(workflow, additionalData)).toEqual([webhookData]);
		expect(WebhookHelpers.getWorkflowWebhooks).toHaveBeenCalledWith(
			workflow,
			additionalData,
			undefined,
			true,
		);
	});

	test('normalizes webhook paths and stores dynamic metadata', async () => {
		const webhookService = mock<WebhookService>();
		const workflowStaticDataService = mock<WorkflowStaticDataService>();
		const registrar = new WebhookTriggerRegistrar(
			logger,
			mock<ErrorReporter>(),
			webhookService,
			workflowStaticDataService,
			tracing,
		);
		const webhookEntity = { webhookPath: '/team/:id/', node: 'Webhook' } as WebhookEntity;
		webhookService.createWebhook.mockReturnValue(webhookEntity);
		const webhookData = mock<IWebhookData>({
			node: 'Webhook',
			workflowId: 'wf-1',
			httpMethod: 'GET',
			path: '/team/:id/',
		});
		const workflow = createWorkflow([
			node('webhook-node', 'webhook', { name: 'Webhook', webhookId: 'hook-id' }),
		]);

		await registrar.register({
			workflow,
			webhookData,
			mode: 'trigger',
			activation: 'update',
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
		expect(workflowStaticDataService.saveStaticData).not.toHaveBeenCalled();
	});

	test('registers and deregisters a single webhook', async () => {
		const webhookService = mock<WebhookService>();
		const workflowStaticDataService = mock<WorkflowStaticDataService>();
		const registrar = new WebhookTriggerRegistrar(
			logger,
			mock<ErrorReporter>(),
			webhookService,
			workflowStaticDataService,
			tracing,
		);
		webhookService.createWebhook.mockImplementation(
			(data) => ({ webhookPath: data.webhookPath, node: data.node }) as WebhookEntity,
		);
		const webhookB = mock<IWebhookData>({
			node: 'Webhook B',
			workflowId: 'wf-1',
			httpMethod: 'POST',
			path: 'b',
		});
		const workflow = createWorkflow([
			node('a', 'webhook', { name: 'Webhook A' }),
			node('b', 'webhook', { name: 'Webhook B' }),
		]);

		await registrar.register({
			workflow,
			webhookData: webhookB,
			mode: 'trigger',
			activation: 'update',
		});
		const removed = await registrar.deregister({ workflow, webhookData: webhookB });

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
		expect(removed).toBe('Webhook B');
	});

	test('cleans the stored external webhook and row when third-party registration fails', async () => {
		const webhookService = mock<WebhookService>();
		const workflowStaticDataService = mock<WorkflowStaticDataService>();
		const registrar = new WebhookTriggerRegistrar(
			logger,
			mock<ErrorReporter>(),
			webhookService,
			workflowStaticDataService,
			tracing,
		);
		webhookService.createWebhook.mockImplementation(
			(data) => ({ webhookPath: data.webhookPath, node: data.node }) as WebhookEntity,
		);
		webhookService.createWebhookIfNotExists.mockRejectedValueOnce(
			new Error('external registration failed'),
		);
		const webhookB = mock<IWebhookData>({
			node: 'Webhook B',
			workflowId: 'wf-1',
			httpMethod: 'POST',
			path: 'b',
		});
		const workflow = createWorkflow([node('b', 'webhook', { name: 'Webhook B' })]);

		await expect(
			registrar.register({
				workflow,
				webhookData: webhookB,
				mode: 'trigger',
				activation: 'update',
			}),
		).rejects.toThrow('external registration failed');

		expect(webhookService.deleteWebhook).toHaveBeenCalledTimes(1);
		expect(webhookService.deleteWebhook).toHaveBeenCalledWith(
			workflow,
			webhookB,
			'internal',
			'update',
		);
		expect(webhookService.deleteWorkflowWebhooksForNodes).toHaveBeenCalledWith('wf-1', [
			'Webhook B',
		]);
		expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
	});

	test('translates duplicate insert errors', async () => {
		const webhookService = mock<WebhookService>();
		const workflowStaticDataService = mock<WorkflowStaticDataService>();
		const registrar = new WebhookTriggerRegistrar(
			logger,
			mock<ErrorReporter>(),
			webhookService,
			workflowStaticDataService,
			tracing,
		);
		const webhookEntity = { webhookPath: 'taken', node: 'Webhook' } as WebhookEntity;
		webhookService.createWebhook.mockReturnValue(webhookEntity);
		const webhookData = mock<IWebhookData>({
			node: 'Webhook',
			workflowId: 'wf-1',
			httpMethod: 'GET',
			path: 'taken',
		});
		vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhookData]);
		const workflow = createWorkflow([node('webhook-node', 'webhook', { name: 'Webhook' })]);
		const dbError = new Error('duplicate');
		dbError.name = 'QueryFailedError';

		webhookService.storeWebhook.mockRejectedValueOnce(dbError);
		await expect(
			registrar.register({
				workflow,
				webhookData,
				mode: 'trigger',
				activation: 'update',
			}),
		).rejects.toBeInstanceOf(WebhookPathTakenError);
		expect(webhookService.deleteWebhook).not.toHaveBeenCalled();
		expect(webhookService.deleteWorkflowWebhooksForNodes).not.toHaveBeenCalled();

		webhookService.storeWebhook.mockRejectedValueOnce(dbError);
		await expect(
			registrar.register({
				workflow,
				webhookData,
				mode: 'trigger',
				activation: 'init',
			}),
		).rejects.toBeInstanceOf(WebhookPathTakenError);
		expect(webhookService.createWebhookIfNotExists).not.toHaveBeenCalled();
		expect(workflowStaticDataService.saveStaticData).not.toHaveBeenCalled();
	});

	describe('getNodesWithUnregisteredWebhooks', () => {
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		let webhookService: MockProxy<WebhookService>;
		let registrar: WebhookTriggerRegistrar;

		beforeEach(() => {
			webhookService = mock<WebhookService>();
			// `createWebhook` builds the entity the key is derived from; mirror the real
			// passthrough so path normalization runs against the data under test.
			webhookService.createWebhook.mockImplementation(
				(data) =>
					({
						webhookPath: data.webhookPath,
						node: data.node,
						method: data.method,
					}) as WebhookEntity,
			);
			registrar = new WebhookTriggerRegistrar(
				logger,
				mock<ErrorReporter>(),
				webhookService,
				mock<WorkflowStaticDataService>(),
				tracing,
			);
		});

		function desiredWebhook(overrides: Partial<IWebhookData>): IWebhookData {
			return { workflowId: 'wf-1', ...overrides } as IWebhookData;
		}

		test('returns empty when every desired webhook has a registered row', async () => {
			const workflow = createWorkflow([node('webhook-node', 'webhook', { name: 'Webhook' })]);
			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([
				desiredWebhook({ node: 'Webhook', httpMethod: 'GET', path: 'users' }),
			]);
			webhookService.getRegisteredWebhooks.mockResolvedValue([
				{ node: 'Webhook', method: 'GET', webhookPath: 'users' } as WebhookEntity,
			]);

			const result = await registrar.getNodesWithUnregisteredWebhooks(
				workflow,
				additionalData,
				new Set(['webhook-node']),
			);

			expect(result).toEqual(new Set());
			expect(webhookService.getRegisteredWebhooks).toHaveBeenCalledWith('wf-1');
		});

		test('returns a node that has no registered rows at all', async () => {
			const workflow = createWorkflow([node('webhook-node', 'webhook', { name: 'Webhook' })]);
			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([
				desiredWebhook({ node: 'Webhook', httpMethod: 'GET', path: 'users' }),
			]);
			webhookService.getRegisteredWebhooks.mockResolvedValue([]);

			const result = await registrar.getNodesWithUnregisteredWebhooks(
				workflow,
				additionalData,
				new Set(['webhook-node']),
			);

			expect(result).toEqual(new Set(['webhook-node']));
		});

		test('returns a node that is only partially registered', async () => {
			const workflow = createWorkflow([node('webhook-node', 'webhook', { name: 'Webhook' })]);
			// One node, two webhooks; only the first is present in storage.
			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([
				desiredWebhook({ node: 'Webhook', httpMethod: 'GET', path: 'users' }),
				desiredWebhook({ node: 'Webhook', httpMethod: 'POST', path: 'users/action' }),
			]);
			webhookService.getRegisteredWebhooks.mockResolvedValue([
				{ node: 'Webhook', method: 'GET', webhookPath: 'users' } as WebhookEntity,
			]);

			const result = await registrar.getNodesWithUnregisteredWebhooks(
				workflow,
				additionalData,
				new Set(['webhook-node']),
			);

			expect(result).toEqual(new Set(['webhook-node']));
		});

		test('matches dynamic paths after normalization without re-adding', async () => {
			const workflow = createWorkflow([
				node('webhook-node', 'webhook', { name: 'Webhook', webhookId: 'hook-id' }),
			]);
			// Desired path has surrounding slashes; the stored row is already normalized.
			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([
				desiredWebhook({ node: 'Webhook', httpMethod: 'GET', path: '/team/:id/' }),
			]);
			webhookService.getRegisteredWebhooks.mockResolvedValue([
				{ node: 'Webhook', method: 'GET', webhookPath: 'team/:id' } as WebhookEntity,
			]);

			const result = await registrar.getNodesWithUnregisteredWebhooks(
				workflow,
				additionalData,
				new Set(['webhook-node']),
			);

			expect(result).toEqual(new Set());
		});

		test('ignores webhooks of nodes outside the requested set', async () => {
			const workflow = createWorkflow([
				node('webhook-node', 'webhook', { name: 'Webhook' }),
				node('other-node', 'webhook', { name: 'Other' }),
			]);
			vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([
				desiredWebhook({ node: 'Other', httpMethod: 'GET', path: 'other' }),
			]);
			webhookService.getRegisteredWebhooks.mockResolvedValue([]);

			const result = await registrar.getNodesWithUnregisteredWebhooks(
				workflow,
				additionalData,
				new Set(['webhook-node']),
			);

			expect(result).toEqual(new Set());
		});
	});
});
