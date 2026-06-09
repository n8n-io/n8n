import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ActiveWorkflowTriggers, ErrorReporter, StorageConfig } from 'n8n-core';
import type {
	INode,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { WORKFLOW_REACTIVATE_INITIAL_TIMEOUT } from '@/constants';
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
import { WorkflowTriggerActivationService } from '@/workflows/workflow-trigger-activation.service';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

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

	describe('per-node retry on runtime trigger failure', () => {
		const mode: WorkflowExecuteMode = 'trigger';
		const activation: WorkflowActivateMode = 'update';

		// emitError queues a real retry timer; clear it so no timer leaks past a test.
		afterEach(() => {
			service.removeAllQueuedTriggerNodeActivations();
		});

		type TriggerFnFactory = (
			workflowData: WorkflowEntity,
			additionalData: IWorkflowExecuteAdditionalData,
			mode: WorkflowExecuteMode,
			activation: WorkflowActivateMode,
			resolveWorkflowData: () => Promise<WorkflowEntity>,
		) => (workflow: Workflow, node: INode) => { emitError: (error: Error) => void };

		function triggerContextFor(workflowData: WorkflowEntity, node: INode) {
			const internal = service as unknown as { getExecuteTriggerFunctions: TriggerFnFactory };
			const getTriggerFunctions = internal.getExecuteTriggerFunctions(
				workflowData,
				mock<IWorkflowExecuteAdditionalData>(),
				mode,
				activation,
				async () => workflowData,
			);
			return getTriggerFunctions(mock<Workflow>({ name: workflowData.name }), node);
		}

		test('removes only the failing node, records the error and runs the error workflow', () => {
			const workflowData = {
				id: 'wf-1',
				name: 'My Workflow',
				nodes: [],
				connections: {},
			} as unknown as WorkflowEntity;
			const node = mock<INode>({ id: 'node-1', name: 'Trigger Node' });
			const executeErrorWorkflowSpy = jest
				.spyOn(
					service as unknown as { executeErrorWorkflow: (...args: unknown[]) => void },
					'executeErrorWorkflow',
				)
				.mockImplementation(() => {});

			triggerContextFor(workflowData, node).emitError(new Error('connection lost'));

			expect(activeWorkflowTriggers.removeTriggers).toHaveBeenCalledWith(
				'wf-1',
				new Set(['node-1']),
			);
			expect(activationErrorsService.register).toHaveBeenCalledWith('wf-1', 'connection lost');
			expect(executeErrorWorkflowSpy).toHaveBeenCalled();
		});

		test('retries activation of only the failing node', async () => {
			jest.useFakeTimers();
			try {
				const workflowData = {
					id: 'wf-1',
					name: 'My Workflow',
					nodes: [],
					connections: {},
				} as unknown as WorkflowEntity;
				const node = mock<INode>({ id: 'node-1', name: 'Trigger Node' });
				jest
					.spyOn(
						service as unknown as { executeErrorWorkflow: (...args: unknown[]) => void },
						'executeErrorWorkflow',
					)
					.mockImplementation(() => {});
				const addTriggerNodesSpy = jest
					.spyOn(service, 'addTriggerNodes')
					.mockResolvedValue(undefined);

				triggerContextFor(workflowData, node).emitError(new Error('connection lost'));

				await jest.advanceTimersByTimeAsync(WORKFLOW_REACTIVATE_INITIAL_TIMEOUT);

				expect(addTriggerNodesSpy).toHaveBeenCalledTimes(1);
				expect(addTriggerNodesSpy).toHaveBeenCalledWith(
					workflowData,
					{ nodes: [], connections: {} },
					new Set(['node-1']),
				);

				// A successful retry clears the queue: advancing further schedules nothing.
				await jest.advanceTimersByTimeAsync(WORKFLOW_REACTIVATE_INITIAL_TIMEOUT * 4);
				expect(addTriggerNodesSpy).toHaveBeenCalledTimes(1);
			} finally {
				jest.useRealTimers();
			}
		});

		test('removeAllQueuedTriggerNodeActivations clears pending retries', async () => {
			jest.useFakeTimers();
			try {
				const workflowData = {
					id: 'wf-1',
					name: 'My Workflow',
					nodes: [],
					connections: {},
				} as unknown as WorkflowEntity;
				const node = mock<INode>({ id: 'node-1', name: 'Trigger Node' });
				jest
					.spyOn(
						service as unknown as { executeErrorWorkflow: (...args: unknown[]) => void },
						'executeErrorWorkflow',
					)
					.mockImplementation(() => {});
				const addTriggerNodesSpy = jest
					.spyOn(service, 'addTriggerNodes')
					.mockResolvedValue(undefined);

				triggerContextFor(workflowData, node).emitError(new Error('connection lost'));

				service.removeAllQueuedTriggerNodeActivations();
				await jest.advanceTimersByTimeAsync(WORKFLOW_REACTIVATE_INITIAL_TIMEOUT * 4);

				expect(addTriggerNodesSpy).not.toHaveBeenCalled();
			} finally {
				jest.useRealTimers();
			}
		});
	});
});
