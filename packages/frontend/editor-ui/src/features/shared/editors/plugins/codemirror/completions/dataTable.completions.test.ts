import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { dataTableOptions } from './datatype.completions';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn(),
}));

const tables = [
	{
		id: 'table-1',
		name: 'users',
		columns: [
			{ name: 'email', type: 'string' },
			{ name: 'Sign Up Date', type: 'date' },
		],
	},
];

const labels = async (base: string) =>
	(await dataTableOptions(base, 'workflow-1@main')).map((option) => option.label);

describe('dataTableOptions', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.mocked(useWorkflowDocumentStore).mockReturnValue({
			homeProject: { id: 'project-1' },
		} as unknown as ReturnType<typeof useWorkflowDocumentStore>);
		useProjectsStore().personalProject = null;
		vi.mocked(useDataTableStore().fetchDataTablesForProject).mockResolvedValue(
			tables as unknown as Awaited<
				ReturnType<ReturnType<typeof useDataTableStore>['fetchDataTablesForProject']>
			>,
		);
	});

	test('offers the tables of the workflow project', async () => {
		expect(await labels('$datatable')).toEqual(['users']);
		expect(useDataTableStore().fetchDataTablesForProject).toHaveBeenCalledWith('project-1');
	});

	test('offers the accessors of a table', async () => {
		expect(await labels('$datatable.users')).toEqual(['first', 'last', 'row', 'find']);
	});

	test('offers the columns of a row', async () => {
		const columns = ['id', 'createdAt', 'updatedAt', 'email', 'Sign Up Date'];

		expect(await labels('$datatable.users.first')).toEqual(columns);
		expect(await labels('$datatable.users.last')).toEqual(columns);
		expect(await labels('$datatable.users.row[$json.id]')).toEqual(columns);
		expect(await labels('$datatable.users.find({ email: $json.email })')).toEqual(columns);
	});

	test('offers nothing for an unknown table or an unfinished path', async () => {
		expect(await labels('$datatable.orders')).toEqual([]);
		expect(await labels('$datatable.users.rows')).toEqual([]);
	});
});
