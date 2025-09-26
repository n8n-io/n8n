import { tableSearch } from '../../common/methods';
import type { IDataStoreProjectService } from 'n8n-workflow';

describe('DataTable URL Generation', () => {
	// Mock proxy service
	const createMockProxy = (projectId: string | null): IDataStoreProjectService =>
		({
			getProjectId: () => projectId,
			search: async () => ({
				data: [
					{ id: 'table1', name: 'Test Table 1' },
					{ id: 'table2', name: 'Test Table 2' },
				],
				totalCount: 2,
			}),
		}) as any;

	describe('tableSearch URL generation', () => {
		it('should generate correct URLs when project ID exists', async () => {
			const proxy = createMockProxy('project123');
			const results = await tableSearch.call({} as any, '', proxy);

			expect(results).toHaveLength(2);
			expect(results[0]).toEqual({
				name: 'Test Table 1',
				value: 'table1',
				url: '/projects/project123/datatables/table1',
			});
			expect(results[1]).toEqual({
				name: 'Test Table 2',
				value: 'table2',
				url: '/projects/project123/datatables/table2',
			});
		});

		it('should generate correct URLs when project ID is empty (intranet setup)', async () => {
			const proxy = createMockProxy('');
			const results = await tableSearch.call({} as any, '', proxy);

			expect(results).toHaveLength(2);
			expect(results[0]).toEqual({
				name: 'Test Table 1',
				value: 'table1',
				url: '/datatables/table1',
			});
			expect(results[1]).toEqual({
				name: 'Test Table 2',
				value: 'table2',
				url: '/datatables/table2',
			});
		});

		it('should generate correct URLs when project ID is null', async () => {
			const proxy = createMockProxy(null);
			const results = await tableSearch.call({} as any, '', proxy);

			expect(results).toHaveLength(2);
			expect(results[0]).toEqual({
				name: 'Test Table 1',
				value: 'table1',
				url: '/datatables/table1',
			});
			expect(results[1]).toEqual({
				name: 'Test Table 2',
				value: 'table2',
				url: '/datatables/table2',
			});
		});
	});

	describe('Resource locator URL generation', () => {
		it('should generate correct allowNewResource URL with project ID', () => {
			const projectId = 'project123';
			const url = projectId ? `/projects/${projectId}/datatables/new` : '/datatables/new';
			expect(url).toBe('/projects/project123/datatables/new');
		});

		it('should generate correct allowNewResource URL without project ID', () => {
			const projectId = '';
			const url = projectId ? `/projects/${projectId}/datatables/new` : '/datatables/new';
			expect(url).toBe('/datatables/new');
		});

		it('should generate correct allowNewResource URL with null project ID', () => {
			const projectId = null;
			const url = projectId ? `/projects/${projectId}/datatables/new` : '/datatables/new';
			expect(url).toBe('/datatables/new');
		});
	});
});
