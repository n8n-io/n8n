import { createEmptyEvalDataTable } from '../ensure-eval-data-table.service';

describe('createEmptyEvalDataTable', () => {
	it('creates a string-typed table with the requested columns', async () => {
		const create = jest.fn().mockResolvedValue({ id: 'dt-1', name: 'Wf — eval samples' });
		const insertRows = jest.fn();
		const ctx = { dataTableService: { create, insertRows } } as any;

		const result = await createEmptyEvalDataTable(ctx, {
			workflowName: 'Wf',
			projectId: 'p1',
			columns: ['user_query', 'expected_response'],
		});

		expect(create).toHaveBeenCalledWith(
			'Wf — eval samples',
			[
				{ name: 'user_query', type: 'string' },
				{ name: 'expected_response', type: 'string' },
			],
			{ projectId: 'p1' },
		);
		expect(insertRows).not.toHaveBeenCalled();
		expect(result).toEqual({ id: 'dt-1', name: 'Wf — eval samples' });
	});

	it('retries with a nanoid suffix on name collision', async () => {
		const create = jest
			.fn()
			.mockRejectedValueOnce(new Error('Data table already exists'))
			.mockResolvedValueOnce({ id: 'dt-2', name: 'Wf — eval samples (abc12)' });
		const ctx = { dataTableService: { create, insertRows: jest.fn() } } as any;

		const result = await createEmptyEvalDataTable(ctx, {
			workflowName: 'Wf',
			columns: ['x'],
		});
		expect(create).toHaveBeenCalledTimes(2);
		expect(result.id).toBe('dt-2');
	});

	it('rethrows non-collision errors', async () => {
		const create = jest.fn().mockRejectedValueOnce(new Error('database down'));
		const ctx = { dataTableService: { create, insertRows: jest.fn() } } as any;
		await expect(
			createEmptyEvalDataTable(ctx, { workflowName: 'Wf', columns: ['x'] }),
		).rejects.toThrow('database down');
	});
});
