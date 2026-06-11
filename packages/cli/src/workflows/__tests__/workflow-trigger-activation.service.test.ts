import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ActiveWorkflowTriggers, ErrorReporter, StorageConfig } from 'n8n-core';
import type { INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import type { ActivationErrorsService } from '@/activation-errors.service';
import type { ActiveExecutions } from '@/active-executions';
import type { EventService } from '@/events/event.service';
import type { ExecutionService } from '@/executions/execution.service';
import type { NodeTypes } from '@/node-types';
import type { WebhookActivationService } from '@/webhooks/webhook-activation.service';
import type { WebhookService } from '@/webhooks/webhook.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import type { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';
import { WorkflowTriggerActivationService } from '@/workflows/workflow-trigger-activation.service';

jest.mock('@/workflow-execute-additional-data');

describe('WorkflowTriggerActivationService', () => {
	const nodeTypes = mock<NodeTypes>();
	const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
	const webhookActivationService = mock<WebhookActivationService>();
	const webhookService = mock<WebhookService>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowStaticDataService = mock<WorkflowStaticDataService>();
	const workflowExecutionService = mock<WorkflowExecutionService>();
	const activeExecutions = mock<ActiveExecutions>();
	const executionService = mock<ExecutionService>();
	const eventService = mock<EventService>();
	const errorReporter = mock<ErrorReporter>();
	const activationErrorsService = mock<ActivationErrorsService>();
	const storageConfig = mock<StorageConfig>();
	const workflowPublishedDataService = mock<WorkflowPublishedDataService>();

	const additionalData = {} as IWorkflowExecuteAdditionalData;

	let service: WorkflowTriggerActivationService;

	function createService(useWorkflowPublicationService = true) {
		const workflowsConfig = mock<WorkflowsConfig>({ useWorkflowPublicationService });
		return new WorkflowTriggerActivationService(
			mockLogger(),
			errorReporter,
			activeWorkflowTriggers,
			activeExecutions,
			nodeTypes,
			webhookService,
			workflowRepository,
			activationErrorsService,
			executionService,
			workflowStaticDataService,
			workflowExecutionService,
			workflowsConfig,
			eventService,
			storageConfig,
			workflowPublishedDataService,
			webhookActivationService,
		);
	}

	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(additionalData);
		webhookActivationService.addWebhooks.mockResolvedValue(true);
		webhookActivationService.deregisterWebhooks.mockResolvedValue([]);
		activeWorkflowTriggers.addTriggers.mockResolvedValue(undefined);
		activeWorkflowTriggers.removeTriggers.mockResolvedValue(undefined);
		workflowRepository.updateWorkflowTriggerCount.mockResolvedValue({} as never);
		workflowStaticDataService.saveStaticData.mockResolvedValue(undefined);
		service = createService();
	});

	describe('getEnabledTriggerNodes', () => {
		function node(id: string, type: string, overrides: Partial<INode> = {}): INode {
			return {
				id,
				name: id,
				type,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				...overrides,
			};
		}

		beforeEach(() => {
			const description = { properties: [] };
			nodeTypes.getByNameAndVersion.mockImplementation((type: string) => {
				if (type === 'trigger') return { description, trigger: jest.fn() } as never;
				if (type === 'poll') return { description, poll: jest.fn() } as never;
				if (type === 'webhook') return { description, webhook: jest.fn() } as never;
				return { description } as never;
			});
		});

		test('returns enabled trigger, poll and webhook nodes, excluding regular and disabled nodes', () => {
			const result = service.getEnabledTriggerNodes({
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
		});

		test('returns an empty array when the version is null', () => {
			expect(service.getEnabledTriggerNodes(null)).toEqual([]);
		});
	});

	describe('addTriggerNodes', () => {
		const dbWorkflow = mock<WorkflowEntity>({ id: 'wf-1', name: 'My Workflow' });
		const version = { nodes: [], connections: {} };

		test('registers webhooks for the given nodes and updates the trigger count', async () => {
			const nodeIds = new Set(['node-1']);

			await service.addTriggerNodes(dbWorkflow, version, nodeIds);

			expect(webhookActivationService.addWebhooks).toHaveBeenCalledWith({
				workflow: expect.objectContaining({ id: 'wf-1' }),
				additionalData: expect.anything(),
				mode: 'trigger',
				activation: 'update',
				nodeIds,
			});
			expect(workflowRepository.updateWorkflowTriggerCount).toHaveBeenCalledWith('wf-1', 0);
			expect(workflowStaticDataService.saveStaticData).toHaveBeenCalled();
		});

		test('always registers regardless of leadership (no isLeader gate)', async () => {
			await service.addTriggerNodes(dbWorkflow, version, new Set(['node-1']));

			// No InstanceSettings dependency exists, so the call always runs to completion.
			expect(webhookActivationService.addWebhooks).toHaveBeenCalled();
		});
	});

	describe('removeTriggerNodes', () => {
		const dbWorkflow = mock<WorkflowEntity>({ id: 'wf-1', name: 'My Workflow' });
		const version = { nodes: [], connections: {} };

		test('does nothing when no nodes are given', async () => {
			await service.removeTriggerNodes(dbWorkflow, version, new Set());

			expect(webhookActivationService.deregisterWebhooks).not.toHaveBeenCalled();
			expect(activeWorkflowTriggers.removeTriggers).not.toHaveBeenCalled();
		});

		test('deregisters webhooks and removes the in-memory triggers for the given nodes', async () => {
			const nodeIds = new Set(['node-1']);
			webhookActivationService.deregisterWebhooks.mockResolvedValue(['Webhook Node']);

			await service.removeTriggerNodes(dbWorkflow, version, nodeIds);

			expect(webhookActivationService.deregisterWebhooks).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'wf-1' }),
				expect.anything(),
				nodeIds,
			);
			expect(webhookService.deleteWorkflowWebhooksForNodes).toHaveBeenCalledWith('wf-1', [
				'Webhook Node',
			]);
			expect(activeWorkflowTriggers.removeTriggers).toHaveBeenCalledWith('wf-1', nodeIds);
		});
	});
});
