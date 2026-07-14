import type { DataTable } from '@/modules/data-table/data-table.entity';

import { DataTableSerializer } from '../data-table.serializer';

function makeDataTable(overrides: Partial<DataTable> = {}): DataTable {
	return {
		id: 'dt-1',
		name: 'Customers',
		projectId: 'proj-1',
		project: undefined,
		columns: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as unknown as DataTable;
}

describe('DataTableSerializer', () => {
	const serializer = new DataTableSerializer();

	it('returns exactly id, name, columns — no non-schema fields leaked', () => {
		const dataTable = makeDataTable({
			columns: [
				{
					id: 'col-1',
					name: 'email',
					type: 'string',
					index: 0,
					dataTableId: 'dt-1',
					createdAt: new Date('2024-01-01T00:00:00.000Z'),
					updatedAt: new Date('2024-01-01T00:00:00.000Z'),
				},
			] as DataTable['columns'],
		});

		const serialized = serializer.serialize(dataTable);

		expect(serialized).toEqual({
			id: 'dt-1',
			name: 'Customers',
			columns: [{ name: 'email', type: 'string', index: 0 }],
		});
	});

	it('sorts columns by index regardless of input order', () => {
		const dataTable = makeDataTable({
			columns: [
				{ id: 'col-2', name: 'age', type: 'number', index: 1 },
				{ id: 'col-1', name: 'email', type: 'string', index: 0 },
			] as DataTable['columns'],
		});

		const serialized = serializer.serialize(dataTable);

		expect(serialized.columns.map((c) => c.name)).toEqual(['email', 'age']);
	});
});
