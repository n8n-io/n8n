import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { detectUnknownDataTableColumns } from '../detect-data-table-columns';

function makeContext(getSchema: ReturnType<typeof vi.fn>): InstanceAiContext {
	return { dataTableService: { getSchema } } as unknown as InstanceAiContext;
}

function dataTableWorkflow(parameters: Record<string, unknown>): WorkflowJSON {
	return {
		name: 'Test',
		nodes: [
			{
				id: '1',
				name: 'Log Row',
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					dataTableId: { __rl: true, mode: 'id', value: 'table-1' },
					...parameters,
				},
			},
		],
		connections: {},
	};
}

const SCHEMA = [
	{ id: 'c1', name: 'day_name', type: 'string', index: 0 },
	{ id: 'c2', name: 'total', type: 'number', index: 1 },
];

describe('detectUnknownDataTableColumns', () => {
	it('warns with a snake_case suggestion for camelCase column names', async () => {
		const getSchema = vi.fn().mockResolvedValue(SCHEMA);
		const warnings = await detectUnknownDataTableColumns(
			dataTableWorkflow({
				operation: 'insert',
				columns: { mappingMode: 'defineBelow', value: { dayName: 'Monday', total: 3 } },
			}),
			makeContext(getSchema),
		);

		expect(getSchema).toHaveBeenCalledWith('table-1', {});
		expect(warnings).toHaveLength(1);
		expect(warnings[0].code).toBe('DATA_TABLE_UNKNOWN_COLUMN');
		expect(warnings[0].severity).toBe('informational');
		expect(warnings[0].nodeName).toBe('Log Row');
		expect(warnings[0].message).toContain('"dayName" -> "day_name"');
	});

	it('checks filter condition keys', async () => {
		const warnings = await detectUnknownDataTableColumns(
			dataTableWorkflow({
				operation: 'get',
				filters: { conditions: [{ keyName: 'weekTotal', condition: 'eq', keyValue: 1 }] },
			}),
			makeContext(vi.fn().mockResolvedValue(SCHEMA)),
		);

		expect(warnings).toHaveLength(1);
		expect(warnings[0].message).toContain('"weekTotal"');
	});

	it('accepts existing and system columns', async () => {
		const warnings = await detectUnknownDataTableColumns(
			dataTableWorkflow({
				operation: 'update',
				columns: { mappingMode: 'defineBelow', value: { day_name: 'Monday' } },
				filters: { conditions: [{ keyName: 'id', condition: 'eq', keyValue: 1 }] },
			}),
			makeContext(vi.fn().mockResolvedValue(SCHEMA)),
		);

		expect(warnings).toEqual([]);
	});

	it('skips nodes without a concrete table reference and expression keys', async () => {
		const getSchema = vi.fn();
		const warnings = await detectUnknownDataTableColumns(
			{
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Log Row',
						type: 'n8n-nodes-base.dataTable',
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							dataTableId: { __rl: true, mode: 'list', value: '' },
							columns: { mappingMode: 'defineBelow', value: { dayName: 'Monday' } },
						},
					},
				],
				connections: {},
			},
			makeContext(getSchema),
		);

		expect(warnings).toEqual([]);
		expect(getSchema).not.toHaveBeenCalled();
	});

	it('stays silent when the schema lookup fails', async () => {
		const warnings = await detectUnknownDataTableColumns(
			dataTableWorkflow({
				columns: { mappingMode: 'defineBelow', value: { dayName: 'Monday' } },
			}),
			makeContext(vi.fn().mockRejectedValue(new Error('not found'))),
		);

		expect(warnings).toEqual([]);
	});
});
