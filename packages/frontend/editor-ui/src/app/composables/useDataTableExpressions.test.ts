import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { fetchDataTableExpressionRows } from './useDataTableExpressions';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';

type Store = ReturnType<typeof useDataTableStore>;
type Tables = Awaited<ReturnType<Store['fetchDataTablesForProject']>>;
type Content = Awaited<ReturnType<Store['fetchDataTableContent']>>;

const tables = [{ id: 'table-1', name: 'users' }] as unknown as Tables;
const content = (rows: Array<Record<string, unknown>>) =>
	({ count: rows.length, data: rows }) as unknown as Content;

describe('fetchDataTableExpressionRows', () => {
	const resolveKey = vi.fn(async (expression: string) => expression.replace('$json.', ''));

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.mocked(useDataTableStore().fetchDataTablesForProject).mockResolvedValue(tables);
	});

	test('does nothing without a reference or a project', async () => {
		expect(await fetchDataTableExpressionRows('={{ $json.id }}', 'project-1', resolveKey)).toBe(
			undefined,
		);
		expect(
			await fetchDataTableExpressionRows('={{ $datatable.users.first }}', undefined, resolveKey),
		).toBe(undefined);
		expect(useDataTableStore().fetchDataTablesForProject).not.toHaveBeenCalled();
	});

	test('stores rows the way the expression reads them', async () => {
		const fetchContent = vi.mocked(useDataTableStore().fetchDataTableContent);
		fetchContent.mockImplementation(async (_id, _project, _page, _size, sortBy, filter) => {
			if (!filter) return content([{ id: sortBy === 'id:asc' ? 1 : 9 }]);
			const { value } = JSON.parse(filter).filters[0];
			return content(value === 'a@b.c' ? [{ id: 4, email: value }] : []);
		});

		const rows = await fetchDataTableExpressionRows(
			{
				a: '={{ $datatable.users.first.id }} {{ $datatable.users.last.id }}',
				b: '={{ $datatable.users.by.email[$json.a@b.c].id }}',
				c: '={{ $datatable.users.row[$json.7].id }}',
			},
			'project-1',
			resolveKey,
		);

		expect(rows?.users.first?.id).toBe(1);
		expect(rows?.users.last?.id).toBe(9);
		expect(rows?.users.by.email['a@b.c'].id).toBe(4);
		expect(rows?.users.row['7']).toBeUndefined();
	});

	test('resolves to nothing when the tables or a row cannot load', async () => {
		vi.mocked(useDataTableStore().fetchDataTableContent).mockRejectedValue(new Error('403'));
		expect(
			await fetchDataTableExpressionRows('={{ $datatable.users.first }}', 'project-1', resolveKey),
		).toEqual({ users: { row: {}, by: {} } });

		vi.mocked(useDataTableStore().fetchDataTablesForProject).mockRejectedValue(new Error('403'));
		expect(
			await fetchDataTableExpressionRows('={{ $datatable.users.first }}', 'project-1', resolveKey),
		).toBeUndefined();
	});
});
