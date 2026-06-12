/* eslint-disable @typescript-eslint/unbound-method */
import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { IWebhookData, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { WorkflowExpression } from 'n8n-workflow';

import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type {
	NonWebhookTriggerRegistrar,
	PreparedNonWebhookTriggerRegistration,
} from '@/workflows/triggers/non-webhook-trigger-registrar';
import type { TriggerCountService } from '@/workflows/triggers/trigger-count.service';
import type { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import type { WebhookTriggerRegistrar } from '@/workflows/triggers/webhook-trigger-registrar';
import { WorkflowTriggerActivator } from '@/workflows/triggers/workflow-trigger-activator';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { createNodeTypes, logger, node } from './trigger-test-utils';

describe('WorkflowTriggerActivator', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	function enabledWorkflowsConfig() {
		return mock<WorkflowsConfig>({ useWorkflowPublicationService: true });
	}

	test('requires workflow publication service to be enabled', () => {
		expect(
			() =>
				new WorkflowTriggerActivator(
					logger,
					mock<ErrorReporter>(),
					createNodeTypes(),
					mock<WorkflowRepository>(),
					mock<WorkflowStaticDataService>(),
					mock<WorkflowsConfig>({ useWorkflowPublicationService: false }),
					mock<TriggerExecutionContextFactory>(),
					mock<WebhookTriggerRegistrar>(),
					mock<NonWebhookTriggerRegistrar>(),
					mock<TriggerCountService>(),
				),
		).toThrow('WorkflowTriggerActivator requires workflow publication service to be enabled');
	});

	test('returns enabled trigger, poll and webhook nodes, excluding regular and disabled nodes', () => {
		const activator = new WorkflowTriggerActivator(
			logger,
			mock<ErrorReporter>(),
			createNodeTypes(),
			mock<WorkflowRepository>(),
			mock<WorkflowStaticDataService>(),
			enabledWorkflowsConfig(),
			mock<TriggerExecutionContextFactory>(),
			mock<WebhookTriggerRegistrar>(),
			mock<NonWebhookTriggerRegistrar>(),
			mock<TriggerCountService>(),
		);

		const result = activator.getEnabledTriggerNodes({
			nodes: [
				node('t', 'trigger'),
				node('p', 'poll'),
				node('w', 'webhook'),
				node('regular', 'n8n-nodes-base.set'),
				node('disabled', 'trigger', { disabled: true }),
			],
			connections: {},
		});

		expect(result.map((n) => n.id).sort()).toEqual(['p', 't', 'w']);
		expect(activator.getEnabledTriggerNodes(null)).toEqual([]);
	});

	describe('getUnregisteredNonWebhookTriggerNodeIds', () => {
		function activatorWith(nonWebhookTriggerRegistrar: NonWebhookTriggerRegistrar) {
			return new WorkflowTriggerActivator(
				logger,
				mock<ErrorReporter>(),
				createNodeTypes(),
				mock<WorkflowRepository>(),
				mock<WorkflowStaticDataService>(),
				enabledWorkflowsConfig(),
				mock<TriggerExecutionContextFactory>(),
				mock<WebhookTriggerRegistrar>(),
				nonWebhookTriggerRegistrar,
				mock<TriggerCountService>(),
			);
		}

		test('returns desired non-webhook triggers not registered in memory', () => {
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getRegisteredTriggerNodeIds.mockReturnValue(new Set(['t']));
			const activator = activatorWith(nonWebhookTriggerRegistrar);

			const result = activator.getUnregisteredNonWebhookTriggerNodeIds('wf-1', [
				node('t', 'trigger'),
				node('p', 'poll'),
			]);

			expect(result).toEqual(new Set(['p']));
			expect(nonWebhookTriggerRegistrar.getRegisteredTriggerNodeIds).toHaveBeenCalledWith('wf-1');
		});

		test('excludes webhook nodes since they are not tracked in memory', () => {
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getRegisteredTriggerNodeIds.mockReturnValue(new Set());
			const activator = activatorWith(nonWebhookTriggerRegistrar);

			const result = activator.getUnregisteredNonWebhookTriggerNodeIds('wf-1', [
				node('t', 'trigger'),
				node('w', 'webhook'),
			]);

			expect(result).toEqual(new Set(['t']));
		});

		test('returns empty when all desired non-webhook triggers are registered', () => {
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getRegisteredTriggerNodeIds.mockReturnValue(new Set(['t', 'p']));
			const activator = activatorWith(nonWebhookTriggerRegistrar);

			const result = activator.getUnregisteredNonWebhookTriggerNodeIds('wf-1', [
				node('t', 'trigger'),
				node('p', 'poll'),
			]);

			expect(result).toEqual(new Set());
		});
	});

	test('activates webhooks, non-webhook triggers, count, and persistence in order', async () => {
		const callOrder: string[] = [];
		jest.spyOn(WorkflowExpression.prototype, 'acquireIsolate').mockImplementation(async () => {
			callOrder.push('acquire');
		});
		jest.spyOn(WorkflowExpression.prototype, 'releaseIsolate').mockImplementation(async () => {
			callOrder.push('release');
		});
		jest
			.spyOn(WorkflowExecuteAdditionalData, 'getBase')
			.mockResolvedValue(mock<IWorkflowExecuteAdditionalData>());

		const workflowRepository = mock<WorkflowRepository>();
		workflowRepository.updateWorkflowTriggerCount.mockImplementation(async () => {
			callOrder.push('persist-count');
			return await Promise.resolve(mock());
		});
		const workflowStaticDataService = mock<WorkflowStaticDataService>();
		workflowStaticDataService.saveStaticData.mockImplementation(async () => {
			callOrder.push('save-static');
		});
		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		const webhookData = mock<IWebhookData>({ node: 'Webhook' });
		webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([webhookData]);
		webhookTriggerRegistrar.register.mockImplementation(async () => {
			callOrder.push('webhooks');
		});
		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		const nonWebhookRegistration = mock<PreparedNonWebhookTriggerRegistration>();
		nonWebhookTriggerRegistrar.createRegistrationContext.mockReturnValue(nonWebhookRegistration);
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['t', 'p']);
		nonWebhookTriggerRegistrar.register.mockImplementation(
			async (_workflow, _registration, nodeId) => {
				callOrder.push(`non-webhook:${nodeId}`);
			},
		);
		const triggerCountService = mock<TriggerCountService>();
		triggerCountService.count.mockImplementation(() => {
			callOrder.push('count');
			return 2;
		});

		const activator = new WorkflowTriggerActivator(
			logger,
			mock<ErrorReporter>(),
			createNodeTypes(),
			workflowRepository,
			workflowStaticDataService,
			enabledWorkflowsConfig(),
			mock<TriggerExecutionContextFactory>(),
			webhookTriggerRegistrar,
			nonWebhookTriggerRegistrar,
			triggerCountService,
		);

		await activator.activate(
			mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
			{
				nodes: [
					node('t', 'trigger'),
					node('p', 'poll'),
					node('webhook-node', 'webhook', { name: 'Webhook' }),
				],
				connections: {},
			},
			new Set(['t', 'p', 'webhook-node']),
		);

		expect(callOrder).toEqual([
			'acquire',
			'webhooks',
			'non-webhook:t',
			'non-webhook:p',
			'count',
			'release',
			'persist-count',
			'save-static',
		]);
		expect(workflowRepository.updateWorkflowTriggerCount).toHaveBeenCalledWith('wf-1', 2);
	});

	test('deactivates webhook rows before non-webhook triggers', async () => {
		jest
			.spyOn(WorkflowExecuteAdditionalData, 'getBase')
			.mockResolvedValue(mock<IWorkflowExecuteAdditionalData>());

		const callOrder: string[] = [];
		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		const webhookData = mock<IWebhookData>({ node: 'Webhook' });
		webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([webhookData]);
		webhookTriggerRegistrar.deregister.mockImplementation(async () => {
			callOrder.push('deregister-webhooks');
			return 'Webhook';
		});
		webhookTriggerRegistrar.clearWorkflowWebhooksForNodes.mockImplementation(async () => {
			callOrder.push('clear-webhook-rows');
		});
		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['trigger-node']);
		nonWebhookTriggerRegistrar.deregister.mockImplementation(async (_workflowId, nodeId) => {
			callOrder.push(`deregister-non-webhook:${nodeId}`);
		});

		const activator = new WorkflowTriggerActivator(
			logger,
			mock<ErrorReporter>(),
			createNodeTypes(),
			mock<WorkflowRepository>(),
			mock<WorkflowStaticDataService>(),
			enabledWorkflowsConfig(),
			mock<TriggerExecutionContextFactory>(),
			webhookTriggerRegistrar,
			nonWebhookTriggerRegistrar,
			mock<TriggerCountService>(),
		);

		await activator.deactivate(
			mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
			{
				nodes: [
					node('webhook-node', 'webhook', { name: 'Webhook' }),
					node('trigger-node', 'trigger'),
				],
				connections: {},
			},
			new Set(['webhook-node', 'trigger-node']),
		);

		expect(callOrder).toEqual([
			'deregister-webhooks',
			'clear-webhook-rows',
			'deregister-non-webhook:trigger-node',
		]);
	});

	test('cleans already registered webhooks when a later webhook registration fails', async () => {
		jest
			.spyOn(WorkflowExecuteAdditionalData, 'getBase')
			.mockResolvedValue(mock<IWorkflowExecuteAdditionalData>());

		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		const webhookA = mock<IWebhookData>({ node: 'Webhook A' });
		const webhookB = mock<IWebhookData>({ node: 'Webhook B' });
		webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([webhookA, webhookB]);
		webhookTriggerRegistrar.register
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('registration failed'));
		webhookTriggerRegistrar.deregister.mockResolvedValueOnce('Webhook A');
		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();

		const activator = new WorkflowTriggerActivator(
			logger,
			mock<ErrorReporter>(),
			createNodeTypes(),
			mock<WorkflowRepository>(),
			mock<WorkflowStaticDataService>(),
			enabledWorkflowsConfig(),
			mock<TriggerExecutionContextFactory>(),
			webhookTriggerRegistrar,
			nonWebhookTriggerRegistrar,
			mock<TriggerCountService>(),
		);

		await expect(
			activator.activate(
				mock<WorkflowEntity>({
					id: 'wf-1',
					name: 'Test workflow',
					staticData: {},
					settings: {},
				}),
				{
					nodes: [
						node('webhook-a', 'webhook', { name: 'Webhook A' }),
						node('webhook-b', 'webhook', { name: 'Webhook B' }),
					],
					connections: {},
				},
				new Set(['webhook-a', 'webhook-b']),
			),
		).rejects.toThrow('registration failed');

		expect(webhookTriggerRegistrar.deregister).toHaveBeenCalledWith({
			workflow: expect.anything(),
			webhookData: webhookA,
		});
		expect(webhookTriggerRegistrar.clearWorkflowWebhooksForNodes).toHaveBeenCalledWith('wf-1', [
			'Webhook A',
		]);
		expect(nonWebhookTriggerRegistrar.register).not.toHaveBeenCalled();
	});
});
