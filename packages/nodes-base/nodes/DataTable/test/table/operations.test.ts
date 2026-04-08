import { mock } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	IDataTableProjectAggregateService,
	IDataTableProjectService,
	INode,
} from 'n8n-workflow';

import * as createOperation from '../../actions/table/create.operation';
import * as deleteOperation from '../../actions/table/delete.operation';
import * as listOperation from '../../actions/table/list.operation';
import * as updateOperation from '../../actions/table/update.operation';

const mockNode: INode = {
	id: 'test-node',
	name: 'Test Node',
	type: 'n8n-nodes-base.dataTable',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('Table Operations', () => {
	describe('Create Operation', () => {
		it('should create a new data table with columns', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockAggregateProxy = mock<IDataTableProjectAggregateService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'tableName') return 'My Test Table';
				if (paramName === 'columns.column') {
					return [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
						{ name: 'isActive', type: 'boolean' },
					];
				}
				if (paramName === 'options') return {};
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableAggregateProxy: jest.fn().mockResolvedValue(mockAggregateProxy),
			} as any;

			const mockResult = {
				id: 'table-123',
				name: 'My Test Table',
				columns: [
					{ name: 'name', type: 'string', index: 0 },
					{ name: 'age', type: 'number', index: 1 },
					{ name: 'isActive', type: 'boolean', index: 2 },
				],
			};

			mockAggregateProxy.createDataTable.mockResolvedValue(mockResult as any);

			const result = await createOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockAggregateProxy.createDataTable).toHaveBeenCalledWith({
				name: 'My Test Table',
				columns: [
					{ name: 'name', type: 'string', index: 0 },
					{ name: 'age', type: 'number', index: 1 },
					{ name: 'isActive', type: 'boolean', index: 2 },
				],
			});

			expect(result).toEqual([{ json: mockResult }]);
		});

		it('should create a table with empty columns array', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockAggregateProxy = mock<IDataTableProjectAggregateService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'tableName') return 'Empty Table';
				if (paramName === 'columns.column') return [];
				if (paramName === 'options') return {};
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableAggregateProxy: jest.fn().mockResolvedValue(mockAggregateProxy),
			} as any;

			const mockResult = {
				id: 'table-456',
				name: 'Empty Table',
				columns: [],
			};

			mockAggregateProxy.createDataTable.mockResolvedValue(mockResult as any);

			const result = await createOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockAggregateProxy.createDataTable).toHaveBeenCalledWith({
				name: 'Empty Table',
				columns: [],
			});

			expect(result).toEqual([{ json: mockResult }]);
		});

		it('should return existing table when createIfNotExists is enabled and table exists', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockAggregateProxy = mock<IDataTableProjectAggregateService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'tableName') return 'Existing Table';
				if (paramName === 'columns.column') {
					return [{ name: 'col1', type: 'string' }];
				}
				if (paramName === 'options') return { createIfNotExists: true };
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableAggregateProxy: jest.fn().mockResolvedValue(mockAggregateProxy),
			} as any;

			const existingTable = {
				id: 'existing-123',
				name: 'Existing Table',
				columns: [{ name: 'oldCol', type: 'string' }],
			};

			mockAggregateProxy.getManyAndCount.mockResolvedValue({
				data: [existingTable],
				count: 1,
			} as any);

			const result = await createOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockAggregateProxy.getManyAndCount).toHaveBeenCalledWith({
				filter: { name: 'Existing Table' },
				take: 1,
			});

			expect(mockAggregateProxy.createDataTable).not.toHaveBeenCalled();
			expect(result).toEqual([{ json: existingTable }]);
		});

		it('should create new table when createIfNotExists is enabled but table does not exist', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockAggregateProxy = mock<IDataTableProjectAggregateService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'tableName') return 'New Table';
				if (paramName === 'columns.column') {
					return [{ name: 'col1', type: 'string' }];
				}
				if (paramName === 'options') return { createIfNotExists: true };
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableAggregateProxy: jest.fn().mockResolvedValue(mockAggregateProxy),
			} as any;

			mockAggregateProxy.getManyAndCount.mockResolvedValue({
				data: [],
				count: 0,
			} as any);

			const newTable = {
				id: 'new-123',
				name: 'New Table',
				columns: [{ name: 'col1', type: 'string', index: 0 }],
			};

			mockAggregateProxy.createDataTable.mockResolvedValue(newTable as any);

			const result = await createOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockAggregateProxy.getManyAndCount).toHaveBeenCalledWith({
				filter: { name: 'New Table' },
				take: 1,
			});

			expect(mockAggregateProxy.createDataTable).toHaveBeenCalledWith({
				name: 'New Table',
				columns: [{ name: 'col1', type: 'string', index: 0 }],
			});

			expect(result).toEqual([{ json: newTable }]);
		});

		it('should support all column types', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockAggregateProxy = mock<IDataTableProjectAggregateService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'tableName') return 'Multi Type Table';
				if (paramName === 'columns.column') {
					return [
						{ name: 'stringCol', type: 'string' },
						{ name: 'numberCol', type: 'number' },
						{ name: 'booleanCol', type: 'boolean' },
						{ name: 'dateCol', type: 'date' },
					];
				}
				if (paramName === 'options') return {};
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableAggregateProxy: jest.fn().mockResolvedValue(mockAggregateProxy),
			} as any;

			const mockResult = {
				id: 'table-789',
				name: 'Multi Type Table',
				columns: [
					{ name: 'stringCol', type: 'string', index: 0 },
					{ name: 'numberCol', type: 'number', index: 1 },
					{ name: 'booleanCol', type: 'boolean', index: 2 },
					{ name: 'dateCol', type: 'date', index: 3 },
				],
			};

			mockAggregateProxy.createDataTable.mockResolvedValue(mockResult as any);

			const result = await createOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockAggregateProxy.createDataTable).toHaveBeenCalledWith({
				name: 'Multi Type Table',
				columns: [
					{ name: 'stringCol', type: 'string', index: 0 },
					{ name: 'numberCol', type: 'number', index: 1 },
					{ name: 'booleanCol', type: 'boolean', index: 2 },
					{ name: 'dateCol', type: 'date', index: 3 },
				],
			});

			expect(result).toEqual([{ json: mockResult }]);
		});
	});

	describe('Delete Operation', () => {
		it('should delete a data table successfully', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockDataTableProxy = mock<IDataTableProjectService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'dataTableId') return 'table-123';
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableProxy: jest.fn().mockResolvedValue(mockDataTableProxy),
			} as any;

			mockDataTableProxy.deleteDataTable.mockResolvedValue(true);

			const result = await deleteOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockDataTableProxy.deleteDataTable).toHaveBeenCalled();
			expect(result).toEqual([{ json: { success: true, deletedTableId: 'table-123' } }]);
		});

		it('should return success false when deletion fails', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockDataTableProxy = mock<IDataTableProjectService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'dataTableId') return 'table-456';
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableProxy: jest.fn().mockResolvedValue(mockDataTableProxy),
			} as any;

			mockDataTableProxy.deleteDataTable.mockResolvedValue(false);

			const result = await deleteOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockDataTableProxy.deleteDataTable).toHaveBeenCalled();
			expect(result).toEqual([{ json: { success: false, deletedTableId: 'table-456' } }]);
		});
	});

	describe('List Operation', () => {
		it('should list all data tables without filters', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockAggregateProxy = mock<IDataTableProjectAggregateService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'returnAll') return true;
				if (paramName === 'limit') return 50;
				if (paramName === 'options') return {};
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableAggregateProxy: jest.fn().mockResolvedValue(mockAggregateProxy),
			} as any;

			const mockTables = [
				{ id: 'table-1', name: 'Table 1', columns: [] },
				{ id: 'table-2', name: 'Table 2', columns: [] },
			];

			mockAggregateProxy.getManyAndCount.mockResolvedValue({
				data: mockTables,
				count: 2,
			} as any);

			const result = await listOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockAggregateProxy.getManyAndCount).toHaveBeenCalledWith({
				skip: 0,
				take: 100,
			});

			expect(result).toEqual([{ json: mockTables[0] }, { json: mockTables[1] }]);
		});

		it('should list data tables with limit', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockAggregateProxy = mock<IDataTableProjectAggregateService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'returnAll') return false;
				if (paramName === 'limit') return 2;
				if (paramName === 'options') return {};
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableAggregateProxy: jest.fn().mockResolvedValue(mockAggregateProxy),
			} as any;

			const mockTables = [
				{ id: 'table-1', name: 'Table 1', columns: [] },
				{ id: 'table-2', name: 'Table 2', columns: [] },
			];

			mockAggregateProxy.getManyAndCount.mockResolvedValue({
				data: mockTables,
				count: 10,
			} as any);

			const result = await listOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockAggregateProxy.getManyAndCount).toHaveBeenCalledWith({
				skip: 0,
				take: 2,
			});

			expect(result).toEqual([{ json: mockTables[0] }, { json: mockTables[1] }]);
		});

		it('should filter data tables by name', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockAggregateProxy = mock<IDataTableProjectAggregateService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'returnAll') return false;
				if (paramName === 'limit') return 50;
				if (paramName === 'options') return { filterName: 'Test' };
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableAggregateProxy: jest.fn().mockResolvedValue(mockAggregateProxy),
			} as any;

			const mockTables = [{ id: 'table-1', name: 'Test Table', columns: [] }];

			mockAggregateProxy.getManyAndCount.mockResolvedValue({
				data: mockTables,
				count: 1,
			} as any);

			const result = await listOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockAggregateProxy.getManyAndCount).toHaveBeenCalledWith({
				filter: { name: 'test' },
				skip: 0,
				take: 50,
			});

			expect(result).toEqual([{ json: mockTables[0] }]);
		});

		it('should sort data tables by name ascending', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockAggregateProxy = mock<IDataTableProjectAggregateService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'returnAll') return false;
				if (paramName === 'limit') return 50;
				if (paramName === 'options') return { sortField: 'name', sortDirection: 'asc' };
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableAggregateProxy: jest.fn().mockResolvedValue(mockAggregateProxy),
			} as any;

			const mockTables = [
				{ id: 'table-1', name: 'A Table', columns: [] },
				{ id: 'table-2', name: 'B Table', columns: [] },
			];

			mockAggregateProxy.getManyAndCount.mockResolvedValue({
				data: mockTables,
				count: 2,
			} as any);

			const result = await listOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockAggregateProxy.getManyAndCount).toHaveBeenCalledWith({
				sortBy: 'name:asc',
				skip: 0,
				take: 50,
			});

			expect(result).toEqual([{ json: mockTables[0] }, { json: mockTables[1] }]);
		});

		it('should handle pagination for returnAll option', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockAggregateProxy = mock<IDataTableProjectAggregateService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'returnAll') return true;
				if (paramName === 'limit') return 50;
				if (paramName === 'options') return {};
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableAggregateProxy: jest.fn().mockResolvedValue(mockAggregateProxy),
			} as any;

			// First page
			const firstPageTables = Array.from({ length: 100 }, (_, i) => ({
				id: `table-${i}`,
				name: `Table ${i}`,
				columns: [],
			}));

			// Second page (partial)
			const secondPageTables = Array.from({ length: 50 }, (_, i) => ({
				id: `table-${i + 100}`,
				name: `Table ${i + 100}`,
				columns: [],
			}));

			mockAggregateProxy.getManyAndCount
				.mockResolvedValueOnce({
					data: firstPageTables,
					count: 150,
				} as any)
				.mockResolvedValueOnce({
					data: secondPageTables,
					count: 150,
				} as any);

			const result = await listOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockAggregateProxy.getManyAndCount).toHaveBeenCalledTimes(2);
			expect(mockAggregateProxy.getManyAndCount).toHaveBeenNthCalledWith(1, {
				skip: 0,
				take: 100,
			});
			expect(mockAggregateProxy.getManyAndCount).toHaveBeenNthCalledWith(2, {
				skip: 100,
				take: 100,
			});

			expect(result.length).toBe(150);
		});

		it('should return empty array when no tables exist', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockAggregateProxy = mock<IDataTableProjectAggregateService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'returnAll') return true;
				if (paramName === 'limit') return 50;
				if (paramName === 'options') return {};
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableAggregateProxy: jest.fn().mockResolvedValue(mockAggregateProxy),
			} as any;

			mockAggregateProxy.getManyAndCount.mockResolvedValue({
				data: [],
				count: 0,
			} as any);

			const result = await listOperation.execute.call(mockExecuteFunctions, 0);

			expect(result).toEqual([]);
		});
	});

	describe('Update Operation', () => {
		it('should update a data table name successfully', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockDataTableProxy = mock<IDataTableProjectService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'dataTableId') return 'table-123';
				if (paramName === 'newName') return 'Updated Table Name';
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableProxy: jest.fn().mockResolvedValue(mockDataTableProxy),
			} as any;

			mockDataTableProxy.updateDataTable.mockResolvedValue(true);

			const result = await updateOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockDataTableProxy.updateDataTable).toHaveBeenCalledWith({
				name: 'Updated Table Name',
			});
			expect(result).toEqual([{ json: { success: true, name: 'Updated Table Name' } }]);
		});

		it('should return success false when update fails', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();
			const mockDataTableProxy = mock<IDataTableProjectService>();

			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'dataTableId') return 'table-456';
				if (paramName === 'newName') return 'Failed Update';
				return undefined;
			});

			mockExecuteFunctions.helpers = {
				getDataTableProxy: jest.fn().mockResolvedValue(mockDataTableProxy),
			} as any;

			mockDataTableProxy.updateDataTable.mockResolvedValue(false);

			const result = await updateOperation.execute.call(mockExecuteFunctions, 0);

			expect(mockDataTableProxy.updateDataTable).toHaveBeenCalledWith({ name: 'Failed Update' });
			expect(result).toEqual([{ json: { success: false, name: 'Failed Update' } }]);
		});
	});
});
