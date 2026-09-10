import type {
	DataTableMutationEventRepository,
	DataTableRowAutomationRepository,
	DataTableTriggerSubscriptionRepository,
} from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type { DataTableColumn } from '../data-table-column.entity';
import { DataTableMutationEventRecorder } from '../data-table-mutation-event.repository';

describe('DataTableMutationEventService', () => {
	const subscriptionRepository = mock<DataTableTriggerSubscriptionRepository>();
	const eventRepository = mock<DataTableMutationEventRepository>();
	const trx = mock<EntityManager>();
	const rowAutomationRepository = mock<DataTableRowAutomationRepository>();
	const service = new DataTableMutationEventRecorder(
		subscriptionRepository,
		eventRepository,
		rowAutomationRepository,
	);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('records only rows whose watched value changed', async () => {
		const subscription = {
			id: 'subscription-id',
			workflowId: 'workflow-id',
			nodeId: 'node-id',
			projectId: 'project-id',
			dataTableId: 'table-id',
			event: 'columnUpdated' as const,
			columnId: 'column-id',
			createdAt: new Date(),
			updatedAt: new Date(),
			setUpdateDate: vi.fn(),
		};
		const columns = [
			{
				id: 'column-id',
				dataTableId: 'table-id',
				name: 'priority',
				type: 'enum',
				index: 0,
			},
		] as DataTableColumn[];
		const timestamp = new Date();

		await service.recordUpdated(
			'table-id',
			[
				{ id: 1, createdAt: timestamp, updatedAt: timestamp, priority: 'Low' },
				{ id: 2, createdAt: timestamp, updatedAt: timestamp, priority: 'High' },
			],
			[
				{ id: 1, createdAt: timestamp, updatedAt: timestamp, priority: 'High' },
				{ id: 2, createdAt: timestamp, updatedAt: timestamp, priority: 'High' },
			],
			columns,
			[subscription],
			trx,
		);

		expect(eventRepository.createWithDeliveries).toHaveBeenCalledOnce();
		const [events] = eventRepository.createWithDeliveries.mock.calls[0];
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			payload: {
				event: 'columnUpdated',
				dataTableId: 'table-id',
				rowId: 1,
				changes: [
					{
						columnId: 'column-id',
						columnName: 'priority',
						before: 'Low',
						after: 'High',
					},
				],
			},
			recipients: [{ workflowId: 'workflow-id', nodeId: 'node-id' }],
		});
	});

	it('always queries matching subscriptions', async () => {
		subscriptionRepository.findMatching.mockResolvedValue([]);

		await expect(service.prepareCapture('table-id', 'rowInserted', [], trx)).resolves.toEqual({
			subscriptions: [],
			shouldCapture: false,
		});
		expect(subscriptionRepository.findMatching).toHaveBeenCalledWith(
			'table-id',
			'rowInserted',
			[],
			trx,
		);
	});

	it('notifies a manual listener without creating a durable delivery', async () => {
		const listener = vi.fn();
		const stopListening = service.listen('table-id', 'rowInserted', null, listener);
		const timestamp = new Date();

		await service.recordInserted(
			'table-id',
			[{ id: 1, createdAt: timestamp, updatedAt: timestamp, priority: 'High' }],
			[],
			trx,
		);
		await new Promise<void>((resolve) => setImmediate(resolve));

		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({
				event: 'rowInserted',
				dataTableId: 'table-id',
				rowId: 1,
			}),
		);
		expect(eventRepository.createWithDeliveries).not.toHaveBeenCalled();

		stopListening();
	});
});
