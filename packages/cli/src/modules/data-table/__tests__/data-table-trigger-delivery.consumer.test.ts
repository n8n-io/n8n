import type { Logger } from '@n8n/backend-common';
import { DataTableConfig } from '@n8n/config';
import type {
	DataTableMutationEvent,
	DataTableMutationEventRepository,
	DataTableRowAutomationRepository,
	DataTableTriggerDelivery,
	DataTableTriggerDeliveryRepository,
	ExecutionRepository,
} from '@n8n/db';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { DataTableTriggerDeliveryConsumer } from '../data-table-trigger-delivery.consumer';
import type { DataTableTriggerSubscriptionReconciler } from '@/workflows/publication/data-table-trigger-subscription-reconciler';
import type { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import type { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import type { EventService } from '@/events/event.service';

vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: vi.fn().mockResolvedValue({ userId: 'user-id' }),
}));

describe('DataTableTriggerDeliveryConsumer', () => {
	it('hands a claimed event to the latest published trigger and stores its execution ID', async () => {
		const config = new DataTableConfig();
		config.triggerConcurrency = 1;
		config.triggerPollIntervalMs = 60_000;

		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const instanceSettings = mock<InstanceSettings>({
			instanceType: 'main',
			instanceId: 'main-a',
			isLeader: false,
		});
		const deliveryRepository = mock<DataTableTriggerDeliveryRepository>();
		const eventRepository = mock<DataTableMutationEventRepository>();
		const triggerExecutionContextFactory = mock<TriggerExecutionContextFactory>();
		const workflowExecutionService = mock<WorkflowExecutionService>();
		const reconciler = mock<DataTableTriggerSubscriptionReconciler>();
		const delivery = mock<DataTableTriggerDelivery>({
			id: 'delivery-id',
			eventId: 'event-id',
			workflowId: 'workflow-id',
			nodeId: 'trigger-node-id',
			status: 'in_progress',
			attempts: 1,
			claimedBy: 'main-a',
			leaseEpoch: 1,
		});
		const payload = {
			eventId: 'event-id',
			event: 'rowInserted' as const,
			dataTableId: 'table-id',
			rowId: 1,
			occurredAt: new Date().toISOString(),
			row: { id: 1, createdAt: new Date(), updatedAt: new Date(), value: 'created' },
		};
		const event = mock<DataTableMutationEvent>({ id: 'event-id', payload });
		const workflowData = {
			id: 'workflow-id',
			name: 'Workflow',
			nodes: [
				{
					id: 'trigger-node-id',
					name: 'Data Table Trigger',
					type: 'n8n-nodes-base.dataTableTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			settings: {},
		} as IWorkflowBase;

		deliveryRepository.claimNext.mockResolvedValueOnce(delivery).mockResolvedValueOnce(null);
		eventRepository.findOneBy.mockResolvedValue(event);
		triggerExecutionContextFactory.findPublishedWorkflowData.mockResolvedValue(workflowData);
		workflowExecutionService.runWorkflow.mockResolvedValue('execution-id');

		const consumer = new DataTableTriggerDeliveryConsumer(
			logger,
			config,
			instanceSettings,
			mock<ErrorReporter>(),
			deliveryRepository,
			eventRepository,
			mock<ExecutionRepository>(),
			triggerExecutionContextFactory,
			workflowExecutionService,
			reconciler,
			mock<DataTableRowAutomationRepository>(),
			mock<EventService>(),
		);
		await consumer.start();
		await consumer.shutdown();

		expect(workflowExecutionService.runWorkflow).toHaveBeenCalledWith(
			workflowData,
			workflowData.nodes[0],
			[[{ json: payload }]],
			expect.any(Object),
			'trigger',
			undefined,
			'data-table-event:event-id:workflow-id:trigger-node-id',
		);
		expect(deliveryRepository.markCompleted).toHaveBeenCalledWith(
			{ id: 'delivery-id', claimedBy: 'main-a', leaseEpoch: 1 },
			'execution-id',
		);
	});
});
