/* eslint-disable @typescript-eslint/unbound-method */
import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { WorkflowExpression } from 'n8n-workflow';

import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { NonWebhookTriggerRegistrar } from '@/workflows/triggers/non-webhook-trigger-registrar';
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

	test('returns enabled trigger, poll and webhook nodes, excluding regular and disabled nodes', () => {
		const activator = new WorkflowTriggerActivator(
			logger,
			mock<ErrorReporter>(),
			createNodeTypes(),
			mock<WorkflowRepository>(),
			mock<WorkflowStaticDataService>(),
			mock<WorkflowsConfig>(),
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
		webhookTriggerRegistrar.register.mockImplementation(async () => {
			callOrder.push('webhooks');
			return true;
		});
		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.register.mockImplementation(async () => {
			callOrder.push('non-webhook');
			return true;
		});
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
			mock<WorkflowsConfig>({ useWorkflowPublicationService: true }),
			mock<TriggerExecutionContextFactory>(),
			webhookTriggerRegistrar,
			nonWebhookTriggerRegistrar,
			triggerCountService,
		);

		await activator.activate(
			mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
			{ nodes: [node('t', 'trigger')], connections: {} },
			new Set(['t']),
		);

		expect(callOrder).toEqual([
			'acquire',
			'webhooks',
			'non-webhook',
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
		webhookTriggerRegistrar.deregister.mockImplementation(async () => {
			callOrder.push('deregister-webhooks');
			return ['Webhook'];
		});
		webhookTriggerRegistrar.clearWorkflowWebhooksForNodes.mockImplementation(async () => {
			callOrder.push('clear-webhook-rows');
		});
		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.deregister.mockImplementation(async () => {
			callOrder.push('deregister-non-webhook');
		});

		const activator = new WorkflowTriggerActivator(
			logger,
			mock<ErrorReporter>(),
			createNodeTypes(),
			mock<WorkflowRepository>(),
			mock<WorkflowStaticDataService>(),
			mock<WorkflowsConfig>(),
			mock<TriggerExecutionContextFactory>(),
			webhookTriggerRegistrar,
			nonWebhookTriggerRegistrar,
			mock<TriggerCountService>(),
		);

		await activator.deactivate(
			mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
			{ nodes: [node('webhook-node', 'webhook', { name: 'Webhook' })], connections: {} },
			new Set(['webhook-node']),
		);

		expect(callOrder).toEqual([
			'deregister-webhooks',
			'clear-webhook-rows',
			'deregister-non-webhook',
		]);
	});
});
