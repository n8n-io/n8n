import type {
	DataTableRowAutomationRepository,
	DataTableTriggerSubscriptionRepository,
	TransactionRunner,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { DATA_TABLE_TRIGGER_NODE_TYPE, type INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { DataTable } from '@/modules/data-table/data-table.entity';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { OwnershipService } from '@/services/ownership.service';

import { DataTableTriggerSubscriptionReconciler } from '../data-table-trigger-subscription-reconciler';

describe('DataTableTriggerSubscriptionReconciler', () => {
	const ownershipService = mock<OwnershipService>();
	const dataTableService = mock<DataTableService>();
	const reconciler = new DataTableTriggerSubscriptionReconciler(
		ownershipService,
		dataTableService,
		mock<DataTableTriggerSubscriptionRepository>(),
		mock<WorkflowPublishedVersionRepository>(),
		mock<TransactionRunner>(),
		mock<DataTableRowAutomationRepository>(),
	);

	// A plain object, not `mock<INode>`: an auto-mocked `parameters` would make
	// the absent `event` a proxy rather than undefined, hiding what is under test.
	const triggerNode = (parameters: INode['parameters']): INode => ({
		id: 'node-1',
		name: 'Data Table Trigger',
		type: DATA_TABLE_TRIGGER_NODE_TYPE,
		typeVersion: 1,
		position: [0, 0],
		parameters,
	});

	const dataTableId = { __rl: true, value: 'table-1', mode: 'id' };

	beforeEach(() => {
		ownershipService.getWorkflowProjectCached.mockResolvedValue(mock({ id: 'project-1' }));
		dataTableService.getOne.mockResolvedValue(mock<DataTable>({ id: 'table-1', columns: [] }));
	});

	// A saved workflow omits `event` when it still matches the node's default.
	it('falls back to the default event when the parameter is absent', async () => {
		const subscriptions = await reconciler.prepare('workflow-1', [triggerNode({ dataTableId })]);

		expect(subscriptions).toEqual([
			expect.objectContaining({ event: 'rowInserted', dataTableId: 'table-1', columnId: null }),
		]);
	});

	it('keeps an explicit event', async () => {
		const subscriptions = await reconciler.prepare('workflow-1', [
			triggerNode({ dataTableId, event: 'rowDeleted' }),
		]);

		expect(subscriptions[0].event).toBe('rowDeleted');
	});

	it('rejects an event it does not support', async () => {
		await expect(
			reconciler.prepare('workflow-1', [triggerNode({ dataTableId, event: 'rowExploded' })]),
		).rejects.toThrow('has an invalid event');
	});
});
