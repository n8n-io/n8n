import type {
	DataTableTriggerOutput,
	IDataTableProjectService,
	ITriggerFunctions,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { DataTableTrigger } from './DataTableTrigger.node';

describe('DataTableTrigger', () => {
	it('waits for a matching Data Table change during a manual execution', async () => {
		const dataTable = mock<IDataTableProjectService>();
		let listener: ((payload: DataTableTriggerOutput) => void) | undefined;
		const stopListening = vi.fn();
		dataTable.listenForChanges.mockImplementation((_event, _columnId, callback) => {
			listener = callback;
			return stopListening;
		});

		const context = mock<ITriggerFunctions>();
		context.helpers.getDataTableProxy = vi.fn().mockResolvedValue(dataTable);
		context.getNodeParameter.mockImplementation((name) => {
			if (name === 'dataTableId') return 'table-id';
			if (name === 'event') return 'rowInserted';
			return undefined;
		});

		const response = await new DataTableTrigger().trigger.call(context);
		const manualExecution = response.manualTriggerFunction?.();
		const timestamp = new Date();
		const payload: DataTableTriggerOutput = {
			eventId: 'event-id',
			event: 'rowInserted',
			dataTableId: 'table-id',
			rowId: 1,
			occurredAt: timestamp.toISOString(),
			row: { id: 1, createdAt: timestamp, updatedAt: timestamp, status: 'Todo' },
		};

		listener?.(payload);
		await manualExecution;

		expect(dataTable.listenForChanges).toHaveBeenCalledWith(
			'rowInserted',
			null,
			expect.any(Function),
		);
		expect(context.emit).toHaveBeenCalledWith([[{ json: payload }]]);
		expect(stopListening).toHaveBeenCalledOnce();
	});
});
