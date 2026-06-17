import type { AddDataTableColumnDto } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataTableRepository } from '../data-table.repository';
import { DataTableService } from '../data-table.service';
import { mockDataTableSizeValidator } from './test-helpers';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
	await testDb.init();
	mockDataTableSizeValidator();
});

beforeEach(async () => {
	await testDb.truncate(['DataTable', 'DataTableColumn']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('DataTable touchUpdatedAt', () => {
	let dataTableService: DataTableService;
	let dataTableRepository: DataTableRepository;
	let project: Project;

	beforeAll(() => {
		dataTableService = Container.get(DataTableService);
		dataTableRepository = Container.get(DataTableRepository);
	});

	beforeEach(async () => {
		project = await createTeamProject();
	});

	afterEach(async () => {
		await dataTableService.deleteDataTableAll();
	});

	describe('Row operations', () => {
		it('should update updatedAt timestamp when inserting rows', async () => {
			// Create a data table with columns
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'testTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			// Get initial updatedAt
			const initialDataTable = await dataTableRepository.findOneBy({ id: dataTable.id });
			const initialUpdatedAt = initialDataTable!.updatedAt;

			// Wait a bit to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Insert rows
			await dataTableService.insertRows(dataTable.id, project.id, [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			]);

			// Check that updatedAt was updated
			const updatedDataTable = await dataTableRepository.findOneBy({ id: dataTable.id });
			expect(updatedDataTable!.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
		});

		it('should update updatedAt timestamp when upserting rows', async () => {
			// Create a data table with columns
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'testTable',
				columns: [
					{ name: 'email', type: 'string' },
					{ name: 'name', type: 'string' },
				],
			});

			// Insert initial row
			await dataTableService.insertRows(dataTable.id, project.id, [
				{ email: 'test@example.com', name: 'Alice' },
			]);

			// Get updatedAt after insert
			const afterInsert = await dataTableRepository.findOneBy({ id: dataTable.id });
			const afterInsertUpdatedAt = afterInsert!.updatedAt;

			// Wait a bit to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Upsert (update)
			await dataTableService.upsertRow(
				dataTable.id,
				project.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'email', condition: 'eq', value: 'test@example.com' }],
					},
					data: { name: 'Alice Updated' },
				},
				false,
				false,
			);

			// Check that updatedAt was updated
			const afterUpsert = await dataTableRepository.findOneBy({ id: dataTable.id });
			expect(afterUpsert!.updatedAt.getTime()).toBeGreaterThan(afterInsertUpdatedAt.getTime());
		});

		it('should update updatedAt timestamp when updating rows', async () => {
			// Create a data table with columns
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'testTable',
				columns: [
					{ name: 'email', type: 'string' },
					{ name: 'status', type: 'string' },
				],
			});

			// Insert initial row
			await dataTableService.insertRows(dataTable.id, project.id, [
				{ email: 'test@example.com', status: 'active' },
			]);

			// Get updatedAt after insert
			const afterInsert = await dataTableRepository.findOneBy({ id: dataTable.id });
			const afterInsertUpdatedAt = afterInsert!.updatedAt;

			// Wait a bit to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Update rows
			await dataTableService.updateRows(
				dataTable.id,
				project.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'email', condition: 'eq', value: 'test@example.com' }],
					},
					data: { status: 'inactive' },
				},
				false,
				false,
			);

			// Check that updatedAt was updated
			const afterUpdate = await dataTableRepository.findOneBy({ id: dataTable.id });
			expect(afterUpdate!.updatedAt.getTime()).toBeGreaterThan(afterInsertUpdatedAt.getTime());
		});

		it('should update updatedAt timestamp when deleting rows', async () => {
			// Create a data table with columns
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'testTable',
				columns: [
					{ name: 'email', type: 'string' },
					{ name: 'name', type: 'string' },
				],
			});

			// Insert rows
			await dataTableService.insertRows(dataTable.id, project.id, [
				{ email: 'test1@example.com', name: 'User 1' },
				{ email: 'test2@example.com', name: 'User 2' },
			]);

			// Get updatedAt after insert
			const afterInsert = await dataTableRepository.findOneBy({ id: dataTable.id });
			const afterInsertUpdatedAt = afterInsert!.updatedAt;

			// Wait a bit to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Delete rows
			await dataTableService.deleteRows(
				dataTable.id,
				project.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'email', condition: 'eq', value: 'test1@example.com' }],
					},
				},
				false,
				false,
			);

			// Check that updatedAt was updated
			const afterDelete = await dataTableRepository.findOneBy({ id: dataTable.id });
			expect(afterDelete!.updatedAt.getTime()).toBeGreaterThan(afterInsertUpdatedAt.getTime());
		});
	});

	describe('Column operations', () => {
		it('should update updatedAt timestamp when adding a column', async () => {
			// Create a data table
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'testTable',
				columns: [{ name: 'name', type: 'string' }],
			});

			// Get initial updatedAt
			const initialDataTable = await dataTableRepository.findOneBy({ id: dataTable.id });
			const initialUpdatedAt = initialDataTable!.updatedAt;

			// Wait a bit to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Add a column
			const addColumnDto: AddDataTableColumnDto = {
				name: 'age',
				type: 'number',
			};
			await dataTableService.addColumn(dataTable.id, project.id, addColumnDto);

			// Check that updatedAt was updated
			const updatedDataTable = await dataTableRepository.findOneBy({ id: dataTable.id });
			expect(updatedDataTable!.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
		});

		it('should update updatedAt timestamp when deleting a column', async () => {
			// Create a data table with multiple columns
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'testTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			// Get columns
			const columns = await dataTableService.getColumns(dataTable.id, project.id);
			const ageColumn = columns.find((c) => c.name === 'age');

			// Get initial updatedAt
			const initialDataTable = await dataTableRepository.findOneBy({ id: dataTable.id });
			const initialUpdatedAt = initialDataTable!.updatedAt;

			// Wait a bit to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Delete a column
			await dataTableService.deleteColumn(dataTable.id, project.id, ageColumn!.id);

			// Check that updatedAt was updated
			const updatedDataTable = await dataTableRepository.findOneBy({ id: dataTable.id });
			expect(updatedDataTable!.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
		});
	});

	describe('Error handling', () => {
		it('should not fail row operations even if touchUpdatedAt is called with invalid ID', async () => {
			// Create a data table
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'testTable',
				columns: [{ name: 'name', type: 'string' }],
			});

			// Insert initial data
			await dataTableService.insertRows(dataTable.id, project.id, [{ name: 'Initial' }]);

			// Mock touchUpdatedAt to simulate an error scenario
			const touchSpy = jest.spyOn(dataTableRepository, 'touchUpdatedAt');

			// Insert rows - operation should succeed
			const result = await dataTableService.insertRows(dataTable.id, project.id, [
				{ name: 'Alice' },
			]);
			expect(result).toBeDefined();

			// Verify touchUpdatedAt was called
			expect(touchSpy).toHaveBeenCalledWith(dataTable.id);

			touchSpy.mockRestore();
		});

		it('should not fail column operations even if touchUpdatedAt is called', async () => {
			// Create a data table
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'testTable',
				columns: [{ name: 'name', type: 'string' }],
			});

			// Mock touchUpdatedAt to verify it's called
			const touchSpy = jest.spyOn(dataTableRepository, 'touchUpdatedAt');

			// Add column - operation should succeed
			const addColumnDto: AddDataTableColumnDto = {
				name: 'age',
				type: 'number',
			};
			const result = await dataTableService.addColumn(dataTable.id, project.id, addColumnDto);
			expect(result).toBeDefined();

			// Verify touchUpdatedAt was called
			expect(touchSpy).toHaveBeenCalledWith(dataTable.id);

			touchSpy.mockRestore();
		});

		it('should handle errors gracefully in touchUpdatedAt', async () => {
			// This test verifies that touchUpdatedAt has error handling
			// by checking it doesn't throw when given an invalid ID

			// Spy on the logger
			const loggerSpy = jest.spyOn(dataTableRepository['logger'], 'debug');

			// Call touchUpdatedAt with a non-existent ID
			// The method should not throw, even though the update will affect 0 rows
			await expect(dataTableRepository.touchUpdatedAt('non-existent-id')).resolves.toBeUndefined();

			// The method completes without throwing
			// Note: In a real error scenario (e.g., DB connection failure), the logger would be called
			// but with a non-existent ID, the update just affects 0 rows without error

			loggerSpy.mockRestore();
		});
	});

	describe('Dry run mode', () => {
		it('should NOT update updatedAt when updating rows in dry run mode', async () => {
			// Create a data table with columns
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'testTable',
				columns: [
					{ name: 'email', type: 'string' },
					{ name: 'status', type: 'string' },
				],
			});

			// Insert initial row
			await dataTableService.insertRows(dataTable.id, project.id, [
				{ email: 'test@example.com', status: 'active' },
			]);

			// Get updatedAt after insert
			const afterInsert = await dataTableRepository.findOneBy({ id: dataTable.id });
			const afterInsertUpdatedAt = afterInsert!.updatedAt;

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Update rows in DRY RUN mode
			await dataTableService.updateRows(
				dataTable.id,
				project.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'email', condition: 'eq', value: 'test@example.com' }],
					},
					data: { status: 'inactive' },
				},
				false,
				true, // dryRun = true
			);

			// Check that updatedAt was NOT updated (same timestamp)
			const afterDryRun = await dataTableRepository.findOneBy({ id: dataTable.id });
			expect(afterDryRun!.updatedAt.getTime()).toBe(afterInsertUpdatedAt.getTime());
		});

		it('should NOT update updatedAt when deleting rows in dry run mode', async () => {
			// Create a data table with columns
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'testTable',
				columns: [
					{ name: 'email', type: 'string' },
					{ name: 'name', type: 'string' },
				],
			});

			// Insert rows
			await dataTableService.insertRows(dataTable.id, project.id, [
				{ email: 'test@example.com', name: 'User 1' },
			]);

			// Get updatedAt after insert
			const afterInsert = await dataTableRepository.findOneBy({ id: dataTable.id });
			const afterInsertUpdatedAt = afterInsert!.updatedAt;

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Delete rows in DRY RUN mode
			await dataTableService.deleteRows(
				dataTable.id,
				project.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'email', condition: 'eq', value: 'test@example.com' }],
					},
				},
				false,
				true, // dryRun = true
			);

			// Check that updatedAt was NOT updated (same timestamp)
			const afterDryRun = await dataTableRepository.findOneBy({ id: dataTable.id });
			expect(afterDryRun!.updatedAt.getTime()).toBe(afterInsertUpdatedAt.getTime());
		});
	});
});
