import type { DataTableSummary, InstanceAiContext } from '../../../types';
import { createEmptyEvalDataTable } from '../ensure-eval-data-table.service';

const dataTableSummary = (id: string, name: string): DataTableSummary => ({
	id,
	name,
	columns: [],
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
});

const createContext = (
	dataTableService: Pick<InstanceAiContext['dataTableService'], 'create' | 'insertRows'>,
): InstanceAiContext =>
	({
		dataTableService,
	}) as unknown as InstanceAiContext;

describe('createEmptyEvalDataTable', () => {
	it('creates a string-typed table with the requested columns', async () => {
		const create = vi
			.fn<
				(
					...args: Parameters<InstanceAiContext['dataTableService']['create']>
				) => ReturnType<InstanceAiContext['dataTableService']['create']>
			>()
			.mockResolvedValue(dataTableSummary('dt-1', 'Wf — eval samples'));
		const insertRows =
			vi.fn<
				(
					...args: Parameters<InstanceAiContext['dataTableService']['insertRows']>
				) => ReturnType<InstanceAiContext['dataTableService']['insertRows']>
			>();
		const ctx = createContext({ create, insertRows });

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

	it('normalizes requested columns to valid DataTable names', async () => {
		const create = vi
			.fn<
				(
					...args: Parameters<InstanceAiContext['dataTableService']['create']>
				) => ReturnType<InstanceAiContext['dataTableService']['create']>
			>()
			.mockResolvedValue(dataTableSummary('dt-1', 'Wf — eval samples'));
		const ctx = createContext({
			create,
			insertRows:
				vi.fn<
					(
						...args: Parameters<InstanceAiContext['dataTableService']['insertRows']>
					) => ReturnType<InstanceAiContext['dataTableService']['insertRows']>
				>(),
		});

		await createEmptyEvalDataTable(ctx, {
			workflowName: 'Wf',
			columns: ['User Query', 'expected-response', '1st result', 'User Query'],
		});

		expect(create).toHaveBeenCalledWith(
			'Wf — eval samples',
			[
				{ name: 'user_query', type: 'string' },
				{ name: 'expected_response', type: 'string' },
				{ name: 'column_1st_result', type: 'string' },
			],
			undefined,
		);
	});

	it('retries with a nanoid suffix on name collision', async () => {
		const create = vi
			.fn<
				(
					...args: Parameters<InstanceAiContext['dataTableService']['create']>
				) => ReturnType<InstanceAiContext['dataTableService']['create']>
			>()
			.mockRejectedValueOnce(new Error('Data table already exists'))
			.mockResolvedValueOnce(dataTableSummary('dt-2', 'Wf — eval samples (abc12)'));
		const ctx = createContext({
			create,
			insertRows:
				vi.fn<
					(
						...args: Parameters<InstanceAiContext['dataTableService']['insertRows']>
					) => ReturnType<InstanceAiContext['dataTableService']['insertRows']>
				>(),
		});

		const result = await createEmptyEvalDataTable(ctx, {
			workflowName: 'Wf',
			columns: ['x'],
		});
		expect(create).toHaveBeenCalledTimes(2);
		expect(result.id).toBe('dt-2');
	});

	it('rethrows non-collision errors', async () => {
		const create = vi
			.fn<
				(
					...args: Parameters<InstanceAiContext['dataTableService']['create']>
				) => ReturnType<InstanceAiContext['dataTableService']['create']>
			>()
			.mockRejectedValueOnce(new Error('database down'));
		const ctx = createContext({
			create,
			insertRows:
				vi.fn<
					(
						...args: Parameters<InstanceAiContext['dataTableService']['insertRows']>
					) => ReturnType<InstanceAiContext['dataTableService']['insertRows']>
				>(),
		});
		await expect(
			createEmptyEvalDataTable(ctx, { workflowName: 'Wf', columns: ['x'] }),
		).rejects.toThrow('database down');
	});
});
