/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { AddDataTableColumnDto, CreateDataTableColumnDto } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DataTableRow } from 'n8n-workflow';

import { DataTableRowsRepository } from '../data-table-rows.repository';
import { DataTableRepository } from '../data-table.repository';
import { DataTableService } from '../data-table.service';
import { mockDataTableSizeValidator } from './test-helpers';
import { DataTableColumnNameConflictError } from '../errors/data-table-column-name-conflict.error';
import { DataTableColumnNotFoundError } from '../errors/data-table-column-not-found.error';
import { DataTableNameConflictError } from '../errors/data-table-name-conflict.error';
import { DataTableNotFoundError } from '../errors/data-table-not-found.error';
import { DataTableValidationError } from '../errors/data-table-validation.error';
import { toTableName } from '../utils/sql-utils';

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

describe('dataTable', () => {
	let dataTableService: DataTableService;
	let dataTableRepository: DataTableRepository;
	let dataTableRowsRepository: DataTableRowsRepository;

	beforeAll(() => {
		dataTableService = Container.get(DataTableService);
		dataTableRepository = Container.get(DataTableRepository);
		dataTableRowsRepository = Container.get(DataTableRowsRepository);
	});

	let project1: Project;
	let project2: Project;

	beforeEach(async () => {
		project1 = await createTeamProject();
		project2 = await createTeamProject();
	});

	afterEach(async () => {
		await dataTableService.deleteDataTableAll();
	});

	describe('createDataTable', () => {
		it('should create a columns table and a user table if columns are provided', async () => {
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTableWithColumns',
				columns: [{ name: 'foo', type: 'string' }],
			});

			await expect(dataTableService.getColumns(dataTableId, project1.id)).resolves.toEqual([
				{
					name: 'foo',
					type: 'string',
					index: 0,
					dataTableId,
					id: expect.any(String),
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);

			// Select the column from user table to check for its existence
			const userTableName = toTableName(dataTableId);
			const rows = await dataTableRepository.manager
				.createQueryBuilder()
				.select('foo')
				.from(userTableName, userTableName)
				.limit(1)
				.getRawMany();

			expect(rows).toEqual([]);
		});

		it('should create a user table and a columns table even if columns are not provided', async () => {
			const name = 'dataTable';

			// ACT
			const result = await dataTableService.createDataTable(project1.id, {
				name,
				columns: [],
			});
			const { id: dataTableId } = result;

			await expect(dataTableService.getColumns(dataTableId, project1.id)).resolves.toEqual([]);

			const userTableName = toTableName(dataTableId);
			const queryRunner = dataTableRepository.manager.connection.createQueryRunner();
			try {
				const table = await queryRunner.getTable(userTableName);
				const columnNames = table?.columns.map((col) => col.name);

				expect(columnNames).toEqual(expect.arrayContaining(['id', 'createdAt', 'updatedAt']));
			} finally {
				await queryRunner.release();
			}
		});

		it('should succeed even if the name exists in a different project', async () => {
			const name = 'dataTable';

			await dataTableService.createDataTable(project2.id, {
				name,
				columns: [],
			});

			// ACT
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name,
				columns: [],
			});

			const created = await dataTableRepository.findOneBy({ name, projectId: project1.id });
			expect(created?.id).toBe(dataTableId);
		});

		it('should populate the project relation when creating a data table', async () => {
			const name = 'dataTable';

			// ACT
			const { project } = await dataTableService.createDataTable(project1.id, {
				name,
				columns: [],
			});

			// ASSERT
			expect(project.id).toBe(project1.id);
			expect(project.name).toBe(project1.name);
		});

		it('should return an error if name/project combination already exists', async () => {
			const name = 'dataTable';

			// ARRANGE
			await dataTableService.createDataTable(project1.id, {
				name,
				columns: [],
			});

			// ACT
			const result = dataTableService.createDataTable(project1.id, {
				name,
				columns: [],
			});

			// ASSERT
			await expect(result).rejects.toThrow(DataTableNameConflictError);
		});
	});

	describe('updateDataTable', () => {
		it('should succeed when renaming to an available name', async () => {
			// ARRANGE
			const { id: dataTableId, updatedAt } = await dataTableService.createDataTable(project1.id, {
				name: 'myDataTable1',
				columns: [],
			});

			// ACT
			// Wait to get second difference
			await new Promise((resolve) => setTimeout(resolve, 1001));

			const result = await dataTableService.updateDataTable(dataTableId, project1.id, {
				name: 'aNewName',
			});

			// ASSERT
			expect(result).toEqual(true);

			const updated = await dataTableRepository.findOneBy({ id: dataTableId });
			expect(updated?.name).toBe('aNewName');
			expect(updated?.updatedAt.getTime()).toBeGreaterThan(updatedAt.getTime());
		});

		it('should fail when renaming a non-existent data table', async () => {
			// ACT
			const result = dataTableService.updateDataTable('this is not an id', project1.id, {
				name: 'aNewName',
			});

			// ASSERT
			await expect(result).rejects.toThrow(DataTableNotFoundError);
		});

		it('should fail when renaming to a taken name', async () => {
			// ARRANGE
			const name = 'myDataTableOld';
			await dataTableService.createDataTable(project1.id, {
				name,
				columns: [],
			});

			const { id: dataTableNewId } = await dataTableService.createDataTable(project1.id, {
				name: 'myDataTableNew',
				columns: [],
			});

			// ACT
			const result = dataTableService.updateDataTable(dataTableNewId, project1.id, { name });

			// ASSERT
			await expect(result).rejects.toThrow(DataTableNameConflictError);
		});
	});

	describe('deleteDataTable', () => {
		it('should succeed with deleting a data table', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'myDataTable1',
				columns: [],
			});

			// ACT
			const result = await dataTableService.deleteDataTable(dataTableId, project1.id);
			const userTableName = toTableName(dataTableId);

			// ASSERT
			expect(result).toEqual(true);

			const deletedDataTable = await dataTableRepository.findOneBy({ id: dataTableId });
			expect(deletedDataTable).toBeNull();

			const queryUserTable = dataTableRepository.manager
				.createQueryBuilder()
				.select()
				.from(userTableName, userTableName)
				.getMany();
			await expect(queryUserTable).rejects.toBeDefined();
		});

		it('should fail when deleting a non-existent id', async () => {
			// ACT
			const result = dataTableService.deleteDataTable('this is not an id', project1.id);

			// ASSERT
			await expect(result).rejects.toThrow(DataTableNotFoundError);
		});
	});

	describe('addColumn', () => {
		it('should succeed with adding columns to a non-empty table as well as to a user table', async () => {
			const existingColumns: CreateDataTableColumnDto[] = [{ name: 'myColumn0', type: 'string' }];

			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTableWithColumns',
				columns: existingColumns,
			});

			const columns: AddDataTableColumnDto[] = [
				{ name: 'myColumn1', type: 'string' },
				{ name: 'myColumn2', type: 'number' },
				{ name: 'myColumn3', type: 'number' },
				{ name: 'myColumn4', type: 'date' },
			];
			for (const column of columns) {
				// ACT
				const result = await dataTableService.addColumn(dataTableId, project1.id, column);
				// ASSERT
				expect(result).toMatchObject(column);
			}
			const columnResult = await dataTableService.getColumns(dataTableId, project1.id);
			expect(columnResult).toEqual([
				expect.objectContaining({
					index: 0,
					dataTableId,
					name: 'myColumn0',
					type: 'string',
				}),
				expect.objectContaining({
					index: 1,
					dataTableId,
					name: 'myColumn1',
					type: 'string',
				}),
				expect.objectContaining({
					index: 2,
					dataTableId,
					name: 'myColumn2',
					type: 'number',
				}),
				expect.objectContaining({
					index: 3,
					dataTableId,
					name: 'myColumn3',
					type: 'number',
				}),
				expect.objectContaining({
					index: 4,
					dataTableId,
					name: 'myColumn4',
					type: 'date',
				}),
			]);

			const userTableName = toTableName(dataTableId);
			const queryRunner = dataTableRepository.manager.connection.createQueryRunner();
			try {
				const table = await queryRunner.getTable(userTableName);
				const columnNames = table?.columns.map((col) => col.name);

				expect(columnNames).toEqual(
					expect.arrayContaining([
						'id',
						'createdAt',
						'updatedAt',
						'myColumn0',
						'myColumn1',
						'myColumn2',
						'myColumn3',
						'myColumn4',
					]),
				);
			} finally {
				await queryRunner.release();
			}
		});

		it('should succeed with adding columns to an empty table', async () => {
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [],
			});

			const columns: AddDataTableColumnDto[] = [
				{ name: 'myColumn0', type: 'string' },
				{ name: 'myColumn1', type: 'number' },
			];
			for (const column of columns) {
				// ACT
				const result = await dataTableService.addColumn(dataTableId, project1.id, column);
				// ASSERT
				expect(result).toMatchObject(column);
			}
			const columnResult = await dataTableService.getColumns(dataTableId, project1.id);
			expect(columnResult.length).toBe(2);

			expect(columnResult).toEqual([
				expect.objectContaining({
					index: 0,
					dataTableId,
					name: 'myColumn0',
					type: 'string',
				}),
				expect.objectContaining({
					index: 1,
					dataTableId,
					name: 'myColumn1',
					type: 'number',
				}),
			]);

			const userTableName = toTableName(dataTableId);
			const queryRunner = dataTableRepository.manager.connection.createQueryRunner();
			try {
				const table = await queryRunner.getTable(userTableName);
				const columnNames = table?.columns.map((col) => col.name);

				expect(columnNames).toEqual(
					expect.arrayContaining(['id', 'createdAt', 'updatedAt', 'myColumn0', 'myColumn1']),
				);
			} finally {
				await queryRunner.release();
			}
		});

		it('should fail with adding two columns of the same name', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'myDataTable',
				columns: [
					{
						name: 'myColumn1',
						type: 'string',
					},
				],
			});

			// ACT
			const result = dataTableService.addColumn(dataTableId, project1.id, {
				name: 'myColumn1',
				type: 'number',
			});

			// ASSERT
			await expect(result).rejects.toThrow(DataTableColumnNameConflictError);
		});

		it('should fail with adding column of non-existent table', async () => {
			// ACT
			const result = dataTableService.addColumn('this is not an id', project1.id, {
				name: 'myColumn1',
				type: 'number',
			});

			// ASSERT
			await expect(result).rejects.toThrow(DataTableNotFoundError);
		});

		it('should succeed with adding column to table that already has rows and set null values for existing rows', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			const results = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ name: 'Alice', age: 30 },
					{ name: 'Bob', age: 25 },
					{ name: 'Charlie', age: 35 },
				],
				'id',
			);

			expect(results).toEqual([
				{
					id: 1,
				},
				{
					id: 2,
				},
				{
					id: 3,
				},
			]);

			// ACT
			const newColumn = await dataTableService.addColumn(dataTableId, project1.id, {
				name: 'email',
				type: 'string',
			});

			// ASSERT
			expect(newColumn).toMatchObject({ name: 'email', type: 'string' });

			// Verify the column was added to the metadata
			const columns = await dataTableService.getColumns(dataTableId, project1.id);
			expect(columns).toHaveLength(3);
			expect(columns.map((c) => c.name)).toEqual(['name', 'age', 'email']);

			// Verify existing rows now have null values for the new column
			const updatedData = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(updatedData.count).toBe(3);
			expect(updatedData.data).toEqual([
				expect.objectContaining({
					id: 1,
					name: 'Alice',
					age: 30,
					email: null,
				}),
				expect.objectContaining({
					id: 2,
					name: 'Bob',
					age: 25,
					email: null,
				}),
				expect.objectContaining({
					id: 3,
					name: 'Charlie',
					age: 35,
					email: null,
				}),
			]);

			// Verify we can insert new rows with the new column
			const newRow = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ name: 'David', age: 28, email: 'david@example.com' }],
				'id',
			);
			expect(newRow).toEqual([
				{
					id: 4,
				},
			]);

			const finalData = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(finalData.count).toBe(4);
			expect(finalData.data).toEqual([
				expect.objectContaining({
					id: 1,
					name: 'Alice',
					age: 30,
					email: null,
				}),
				expect.objectContaining({
					id: 2,
					name: 'Bob',
					age: 25,
					email: null,
				}),
				expect.objectContaining({
					id: 3,
					name: 'Charlie',
					age: 35,
					email: null,
				}),
				expect.objectContaining({
					id: 4,
					name: 'David',
					age: 28,
					email: 'david@example.com',
				}),
			]);
		});
	});

	describe('deleteColumn', () => {
		it('should succeed with deleting a column', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [],
			});

			const c1 = await dataTableService.addColumn(dataTableId, project1.id, {
				name: 'myColumn1',
				type: 'string',
			});
			const c2 = await dataTableService.addColumn(dataTableId, project1.id, {
				name: 'myColumn2',
				type: 'number',
			});

			// ACT
			const result = await dataTableService.deleteColumn(dataTableId, project1.id, c1.id);

			// ASSERT
			expect(result).toEqual(true);

			const columns = await dataTableService.getColumns(dataTableId, project1.id);
			expect(columns).toEqual([
				{
					index: 0,
					dataTableId,
					id: c2.id,
					name: 'myColumn2',
					type: 'number',
					createdAt: c2.createdAt,
					updatedAt: expect.any(Date),
				},
			]);
		});

		it('should fail when deleting unknown column', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{
						name: 'myColumn1',
						type: 'string',
					},
				],
			});

			// ACT
			const result = dataTableService.deleteColumn(dataTableId, project1.id, 'thisIsNotAnId');

			// ASSERT
			await expect(result).rejects.toThrow(DataTableColumnNotFoundError);
		});

		it('should fail when deleting column from unknown table', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [],
			});
			const c1 = await dataTableService.addColumn(dataTableId, project1.id, {
				name: 'myColumn1',
				type: 'string',
			});

			// ACT
			const result = dataTableService.deleteColumn('this is not an id', project1.id, c1.id);

			// ASSERT
			await expect(result).rejects.toThrow(DataTableNotFoundError);
		});
	});

	describe('moveColumn', () => {
		it('should succeed with moving a column', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [],
			});

			const c1 = await dataTableService.addColumn(dataTableId, project1.id, {
				name: 'myColumn1',
				type: 'string',
			});
			const c2 = await dataTableService.addColumn(dataTableId, project1.id, {
				name: 'myColumn2',
				type: 'number',
			});

			// ACT
			const result = await dataTableService.moveColumn(dataTableId, project1.id, c2.id, {
				targetIndex: 0,
			});

			// ASSERT
			expect(result).toEqual(true);

			const columns = await dataTableService.getColumns(dataTableId, project1.id);
			expect(columns).toMatchObject([
				{
					index: 0,
					dataTableId,
					id: c2.id,
					name: 'myColumn2',
					type: 'number',
				},
				{
					index: 1,
					dataTableId,
					id: c1.id,
					name: 'myColumn1',
					type: 'string',
				},
			]);
		});
	});

	describe('getManyAndCount', () => {
		it('correctly joins columns', async () => {
			// ARRANGE
			const columns: CreateDataTableColumnDto[] = [
				{ name: 'myColumn1', type: 'string' },
				{ name: 'myColumn2', type: 'number' },
				{ name: 'myColumn3', type: 'number' },
				{ name: 'myColumn4', type: 'date' },
			];
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'myDataTable',
				columns,
			});

			// ACT
			const result = await dataTableService.getManyAndCount({
				filter: { projectId: project1.id, id: dataTableId },
			});

			// ASSERT
			expect(result.count).toEqual(1);

			const resultColumns = result.data[0].columns;

			expect(resultColumns).toEqual(
				expect.arrayContaining([
					{
						id: expect.any(String),
						name: 'myColumn1',
						type: 'string',
						createdAt: expect.any(Date),
						updatedAt: expect.any(Date),
						index: 0,
					},
					{
						id: expect.any(String),
						name: 'myColumn2',
						type: 'number',
						createdAt: expect.any(Date),
						updatedAt: expect.any(Date),
						index: 1,
					},
					{
						id: expect.any(String),
						name: 'myColumn3',
						type: 'number',
						createdAt: expect.any(Date),
						updatedAt: expect.any(Date),
						index: 2,
					},
					{
						id: expect.any(String),
						name: 'myColumn4',
						type: 'date',
						createdAt: expect.any(Date),
						updatedAt: expect.any(Date),
						index: 3,
					},
				]),
			);

			for (let i = 1; i < resultColumns.length; i++) {
				expect(new Date(resultColumns[i].updatedAt).getTime()).toBeGreaterThanOrEqual(
					new Date(resultColumns[i - 1].updatedAt).getTime(),
				);
			}
		});

		describe('sorts as expected', () => {
			it('sorts by name', async () => {
				// ARRANGE
				await dataTableService.createDataTable(project1.id, {
					name: 'dt2',
					columns: [],
				});

				await dataTableService.createDataTable(project1.id, {
					name: 'dt1',
					columns: [],
				});

				await dataTableService.createDataTable(project1.id, {
					name: 'dt3',
					columns: [],
				});

				// ACT
				const nameAsc = await dataTableService.getManyAndCount({
					filter: { projectId: project1.id },
					sortBy: 'name:asc',
				});
				const nameDesc = await dataTableService.getManyAndCount({
					filter: { projectId: project1.id },
					sortBy: 'name:desc',
				});

				// ASSERT
				expect(nameAsc.data.map((x) => x.name)).toEqual(['dt1', 'dt2', 'dt3']);
				expect(nameDesc.data.map((x) => x.name)).toEqual(['dt3', 'dt2', 'dt1']);
			});

			it('sorts by createdAt', async () => {
				// ARRANGE
				await dataTableService.createDataTable(project1.id, {
					name: 'dt0',
					columns: [],
				});

				// Wait to get seconds difference
				await new Promise((resolve) => setTimeout(resolve, 1001));
				await dataTableService.createDataTable(project1.id, {
					name: 'dt1',
					columns: [],
				});

				// Wait to get seconds difference
				await new Promise((resolve) => setTimeout(resolve, 1001));
				await dataTableService.createDataTable(project1.id, {
					name: 'dt2',
					columns: [],
				});

				// ACT
				const createdAsc = await dataTableService.getManyAndCount({
					filter: { projectId: project1.id },
					sortBy: 'createdAt:asc',
				});
				const createdDesc = await dataTableService.getManyAndCount({
					filter: { projectId: project1.id },
					sortBy: 'createdAt:desc',
				});

				// ASSERT
				expect(createdAsc.data.map((x) => x.name)).toEqual(['dt0', 'dt1', 'dt2']);
				expect(createdDesc.data.map((x) => x.name)).toEqual(['dt2', 'dt1', 'dt0']);
			});

			it('sorts by updatedAt', async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
					name: 'dt1',
					columns: [],
				});

				// Wait to get seconds difference
				await new Promise((resolve) => setTimeout(resolve, 1001));
				await dataTableService.createDataTable(project1.id, {
					name: 'dt2',
					columns: [],
				});

				// Wait to get seconds difference
				await new Promise((resolve) => setTimeout(resolve, 1001));
				await dataTableService.updateDataTable(dataTableId, project1.id, { name: 'dt1Updated' });

				// ACT
				const updatedAsc = await dataTableService.getManyAndCount({
					filter: { projectId: project1.id },
					sortBy: 'updatedAt:asc',
				});

				const updatedDesc = await dataTableService.getManyAndCount({
					filter: { projectId: project1.id },
					sortBy: 'updatedAt:desc',
				});

				// ASSERT
				expect(updatedAsc.data.map((x) => x.name)).toEqual(['dt2', 'dt1Updated']);
				expect(updatedDesc.data.map((x) => x.name)).toEqual(['dt1Updated', 'dt2']);
			});
		});

		describe('filters as expected', () => {
			it('filters by name', async () => {
				// ARRANGE
				await dataTableService.createDataTable(project1.id, {
					name: 'dataTable1',
					columns: [],
				});

				await dataTableService.createDataTable(project1.id, {
					name: 'dataTable2',
					columns: [],
				});

				await dataTableService.createDataTable(project1.id, {
					name: 'dataTable3',
					columns: [],
				});

				// ACT
				const filtered = await dataTableService.getManyAndCount({
					filter: { projectId: project1.id, name: 'dataTable2' },
				});

				// ASSERT
				expect(filtered.count).toBe(1);
				expect(filtered.data[0].name).toBe('dataTable2');
			});

			it('filters by multiple names (AND)', async () => {
				// ARRANGE
				await dataTableService.createDataTable(project1.id, {
					name: 'dataTable1',
					columns: [],
				});

				await dataTableService.createDataTable(project1.id, {
					name: 'dataTable2',
					columns: [],
				});

				await dataTableService.createDataTable(project1.id, {
					name: 'dataTable3',
					columns: [],
				});

				// ACT
				const filtered = await dataTableService.getManyAndCount({
					filter: { projectId: project1.id, name: ['Table3', 'data'] },
				});

				// ASSERT
				expect(filtered.count).toBe(1);
				expect(filtered.data.map((x) => x.name).sort()).toEqual(['dataTable3']);
			});

			it('filters by id', async () => {
				// ARRANGE
				const { id: ds1Id } = await dataTableService.createDataTable(project1.id, {
					name: 'dataTable1',
					columns: [],
				});

				await dataTableService.createDataTable(project1.id, {
					name: 'dataTable2',
					columns: [],
				});

				// ACT
				const filtered = await dataTableService.getManyAndCount({
					filter: { projectId: project1.id, id: ds1Id },
				});

				// ASSERT
				expect(filtered.count).toBe(1);
				expect(filtered.data[0].id).toBe(ds1Id);
			});

			it('filters by multiple ids (OR)', async () => {
				// ARRANGE
				const { id: ds1Id } = await dataTableService.createDataTable(project1.id, {
					name: 'dataTable1',
					columns: [],
				});
				const { id: ds2Id } = await dataTableService.createDataTable(project1.id, {
					name: 'dataTable2',
					columns: [],
				});
				await dataTableService.createDataTable(project1.id, {
					name: 'dataTable3',
					columns: [],
				});

				// ACT
				const filtered = await dataTableService.getManyAndCount({
					filter: { projectId: project1.id, id: [ds1Id, ds2Id] },
				});

				// ASSERT
				expect(filtered.count).toBe(2);
				expect(filtered.data.map((x) => x.id).sort()).toEqual([ds1Id, ds2Id].sort());
			});

			it('filters by projectId', async () => {
				// ARRANGE
				await dataTableService.createDataTable(project1.id, {
					name: 'dataTable1',
					columns: [],
				});

				await dataTableService.createDataTable(project2.id, {
					name: 'dataTable2',
					columns: [],
				});

				// ACT
				const filtered1 = await dataTableService.getManyAndCount({
					filter: { projectId: project1.id },
				});
				const filtered2 = await dataTableService.getManyAndCount({
					filter: { projectId: project2.id },
				});

				// ASSERT
				expect(filtered1.count).toBe(1);
				expect(filtered1.data[0].name).toBe('dataTable1');
				expect(filtered2.count).toBe(1);
				expect(filtered2.data[0].name).toBe('dataTable2');
			});
		});
	});

	describe('insertRows', () => {
		it('inserts rows into an existing table', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'boolean' },
					{ name: 'c3', type: 'date' },
					{ name: 'c4', type: 'string' },
				],
			});

			// ACT
			const rows = [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ c1: 4, c2: false, c3: new Date(), c4: 'hello!' },
				{ c1: 5, c2: true, c3: new Date(), c4: 'hello.' },
				{
					c1: 1,
					c2: true,
					c3: '2025-08-15T09:48:14.259Z',
					c4: 'iso 8601 date strings are okay too',
				},
			];
			const result = await dataTableService.insertRows(dataTableId, project1.id, rows, 'id');

			// ASSERT
			expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);

			const { count, data } = await dataTableService.getManyRowsAndCount(
				dataTableId,
				project1.id,
				{},
			);
			expect(count).toEqual(4);

			const expected = rows.map(
				(row, i) =>
					expect.objectContaining<DataTableRow>({
						...row,
						id: i + 1,
						c3: typeof row.c3 === 'string' ? new Date(row.c3) : row.c3,
					}) as jest.AsymmetricMatcher,
			);

			expect(data).toEqual(expected);
		});

		it('inserts a row even if it matches with the existing one', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'myDataTable',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'string' },
				],
			});

			// Insert initial row
			const initial = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ c1: 1, c2: 'foo' }],
				'id',
			);
			expect(initial).toEqual([{ id: 1 }]);

			// Attempt to insert a row with the same primary key
			const result = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ c1: 1, c2: 'foo' }],
				'id',
			);

			// ASSERT
			expect(result).toEqual([{ id: 2 }]);

			const { count, data } = await dataTableRowsRepository.getManyAndCount(dataTableId, {});

			expect(count).toEqual(2);
			expect(data).toEqual([
				expect.objectContaining({
					c1: 1,
					c2: 'foo',
					id: 1,
				}),
				expect.objectContaining({
					c1: 1,
					c2: 'foo',
					id: 2,
				}),
			]);
		});

		it('return correct IDs even after deletions', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'myDataTable',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'string' },
				],
			});

			// Insert initial row
			const ids = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ c1: 1, c2: 'foo' },
					{ c1: 2, c2: 'bar' },
				],
				'id',
			);
			expect(ids).toEqual([{ id: 1 }, { id: 2 }]);

			await dataTableService.deleteRows(dataTableId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'id', condition: 'eq', value: ids[0].id }],
				},
			});

			// Insert a new row
			const result = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ c1: 1, c2: 'baz' },
					{ c1: 2, c2: 'faz' },
				],
				'id',
			);

			// ASSERT
			expect(result).toEqual([{ id: 3 }, { id: 4 }]);

			const { count, data } = await dataTableRowsRepository.getManyAndCount(dataTableId, {});

			expect(count).toEqual(3);
			expect(data).toEqual([
				expect.objectContaining({
					c1: 2,
					c2: 'bar',
					id: 2,
				}),
				expect.objectContaining({
					c1: 1,
					c2: 'baz',
					id: 3,
				}),
				expect.objectContaining({
					c1: 2,
					c2: 'faz',
					id: 4,
				}),
			]);
		});

		it('return full inserted data if returnData is set', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'myDataTable',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'string' },
					{ name: 'c3', type: 'boolean' },
					{ name: 'c4', type: 'date' },
				],
			});

			const now = new Date();

			// Insert initial row
			const ids = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ c1: 1, c2: 'foo', c3: true, c4: now },
					{ c1: 2, c2: 'bar', c3: false, c4: now },
					{ c1: null, c2: null, c3: null, c4: null },
				],
				'all',
			);
			expect(ids).toEqual([
				{
					id: 1,
					c1: 1,
					c2: 'foo',
					c3: true,
					c4: now,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					id: 2,
					c1: 2,
					c2: 'bar',
					c3: false,
					c4: now,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					id: 3,
					c1: null,
					c2: null,
					c3: null,
					c4: null,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});

		it('inserts in correct order even with different column order', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'myDataTable',
				columns: [
					{ name: 'c4', type: 'date' },
					{ name: 'c3', type: 'boolean' },
					{ name: 'c2', type: 'string' },
					{ name: 'c1', type: 'number' },
				],
			});

			const now = new Date();

			// Insert initial row
			const ids = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ c1: 1, c2: 'foo', c3: true, c4: now },
					{ c2: 'bar', c1: 2, c3: false, c4: now },
					{ c1: null, c2: null, c3: null, c4: null },
				],
				'all',
			);
			expect(ids).toEqual([
				{
					id: 1,
					c1: 1,
					c2: 'foo',
					c3: true,
					c4: now,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					id: 2,
					c1: 2,
					c2: 'bar',
					c3: false,
					c4: now,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					id: 3,
					c1: null,
					c2: null,
					c3: null,
					c4: null,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});

		it('rejects a mismatched row with unknown column', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'boolean' },
					{ name: 'c3', type: 'date' },
					{ name: 'c4', type: 'string' },
				],
			});

			// ACT
			const result = dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
					{ cWrong: 3, c1: 4, c2: true, c3: new Date(), c4: 'hello?' },
				],
				'id',
			);

			// ASSERT
			await expect(result).rejects.toThrow(
				new DataTableValidationError("unknown column name 'cWrong'"),
			);
		});

		it('inserts rows with partial data (some columns missing)', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'email', type: 'string' },
					{ name: 'active', type: 'boolean' },
				],
			});

			// ACT
			await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ name: 'Mary', age: 20, email: 'mary@example.com', active: true }, // full row
					{ name: 'Alice', age: 30 }, // missing email and active
					{ name: 'Bob' }, // missing age, email and active
					{}, // missing all columns
				],
				'id',
			);

			const { count, data } = await dataTableService.getManyRowsAndCount(
				dataTableId,
				project1.id,
				{},
			);
			expect(count).toEqual(4);
			expect(data).toEqual([
				expect.objectContaining({
					name: 'Mary',
					age: 20,
					email: 'mary@example.com',
					active: true,
				}),
				expect.objectContaining({
					name: 'Alice',
					age: 30,
					email: null,
					active: null,
				}),
				expect.objectContaining({
					name: 'Bob',
					age: null,
					email: null,
					active: null,
				}),
				expect.objectContaining({
					name: null,
					age: null,
					email: null,
					active: null,
				}),
			]);
		});

		it('rejects a mismatched row with replaced column', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'boolean' },
					{ name: 'c3', type: 'date' },
					{ name: 'c4', type: 'string' },
				],
			});

			// ACT
			const result = dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
					{ cWrong: 3, c2: true, c3: new Date(), c4: 'hello?' },
				],
				'id',
			);

			// ASSERT
			await expect(result).rejects.toThrow(
				new DataTableValidationError("unknown column name 'cWrong'"),
			);
		});

		it('rejects an invalid date string to date column', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'c1', type: 'date' }],
			});

			// ACT
			const result = dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ c1: '2025-99-15T09:48:14.259Z' }],
				'id',
			);

			// ASSERT
			await expect(result).rejects.toThrow(DataTableValidationError);
			await expect(result).rejects.toThrow(
				"value '2025-99-15T09:48:14.259Z' does not match column type 'date'",
			);
		});

		it('converts dates with timezone offsets to UTC when inserting', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'registeredAt', type: 'date' }],
			});

			const dateWithOffset = new Date('2024-01-15T10:30:00.000+03:00');
			const expectedUtcTime = new Date('2024-01-15T07:30:00.000Z');

			// ACT
			const inserted = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ registeredAt: dateWithOffset }],
				'all',
			);

			// ASSERT
			expect((inserted[0].registeredAt as Date).getTime()).toBe(expectedUtcTime.getTime());
		});

		it('converts ISO date strings with timezone offsets to UTC when inserting', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'registeredAt', type: 'date' }],
			});

			const isoWithOffsetPlus = '2024-01-15T10:30:00.000+05:00';
			const isoWithOffsetMinus = '2024-01-15T02:30:00.000-03:00';
			const expectedUtcTime = new Date('2024-01-15T05:30:00.000Z');

			// ACT
			const inserted = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ registeredAt: isoWithOffsetPlus }, { registeredAt: isoWithOffsetMinus }],
				'all',
			);

			// ASSERT
			expect((inserted[0].registeredAt as Date).getTime()).toBe(expectedUtcTime.getTime());
			expect((inserted[1].registeredAt as Date).getTime()).toBe(expectedUtcTime.getTime());
		});

		it('rejects unknown data table id', async () => {
			// ARRANGE
			await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'boolean' },
					{ name: 'c3', type: 'date' },
					{ name: 'c4', type: 'string' },
				],
			});

			// ACT
			const result = dataTableService.insertRows(
				'this is not an id',
				project1.id,
				[
					{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
					{ cWrong: 3, c2: true, c3: new Date(), c4: 'hello?' },
				],
				'id',
			);

			// ASSERT
			await expect(result).rejects.toThrow(DataTableNotFoundError);
		});

		it('fails on type mismatch', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'c1', type: 'number' }],
			});

			// ACT
			const wrongValue = new Date().toISOString();
			const result = dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ c1: 3 }, { c1: wrongValue }],
				'id',
			);

			// ASSERT
			await expect(result).rejects.toThrow(DataTableValidationError);
			await expect(result).rejects.toThrow(
				`value '${wrongValue}' does not match column type 'number'`,
			);
		});

		it('inserts rows into an existing table with no columns', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [],
			});

			// ACT
			const rows = [{}, {}, {}];
			const result = await dataTableService.insertRows(dataTableId, project1.id, rows, 'id');

			// ASSERT
			expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);

			const { count, data } = await dataTableService.getManyRowsAndCount(
				dataTableId,
				project1.id,
				{},
			);
			expect(count).toEqual(3);
			expect(data).toEqual([
				{
					id: 1,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					id: 2,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					id: 3,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});
		describe('bulk', () => {
			it('handles single empty row correctly in bulk mode', async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
					name: 'dataTable',
					columns: [],
				});

				// ACT
				const rows = [{}];
				const result = await dataTableService.insertRows(dataTableId, project1.id, rows);

				// ASSERT
				expect(result).toEqual({ success: true, insertedRows: 1 });

				const { count, data } = await dataTableService.getManyRowsAndCount(
					dataTableId,
					project1.id,
					{},
				);
				expect(count).toEqual(1);

				expect(data).toEqual([{ id: 1, createdAt: expect.any(Date), updatedAt: expect.any(Date) }]);
			});

			it('bulk insert should work with multiple empty rows', async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
					name: 'dataTable',
					columns: [],
				});

				// ACT
				const result = await dataTableService.insertRows(dataTableId, project1.id, [{}, {}]);

				// ASSERT
				expect(result).toEqual({ success: true, insertedRows: 2 });

				const { count, data } = await dataTableService.getManyRowsAndCount(
					dataTableId,
					project1.id,
					{},
				);

				expect(count).toEqual(2);
				expect(data).toEqual([
					{ id: expect.any(Number), createdAt: expect.any(Date), updatedAt: expect.any(Date) },
					{ id: expect.any(Number), createdAt: expect.any(Date), updatedAt: expect.any(Date) },
				]);
			});

			it('handles multi-batch bulk correctly in bulk mode', async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
					name: 'dataTable',
					columns: [
						{ name: 'c1', type: 'number' },
						{ name: 'c2', type: 'boolean' },
						{ name: 'c3', type: 'string' },
					],
				});

				// ACT
				const rows = Array.from({ length: 3000 }, (_, index) => ({
					c1: index,
					c2: index % 2 === 0,
					c3: `index ${index}`,
				}));
				const result = await dataTableService.insertRows(dataTableId, project1.id, rows);

				// ASSERT
				expect(result).toEqual({ success: true, insertedRows: rows.length });

				const { count, data } = await dataTableService.getManyRowsAndCount(
					dataTableId,
					project1.id,
					{},
				);
				expect(count).toEqual(rows.length);

				const expected = rows.map(
					(row, i) =>
						expect.objectContaining<DataTableRow>({
							...row,
							id: i + 1,
						}) as jest.AsymmetricMatcher,
				);
				expect(data).toEqual(expected);
			});
		});
	});

	describe('upsertRow', () => {
		it('should update a row if filter matches', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'pid', type: 'string' },
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			const ids = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ pid: '1995-111a', name: 'Alice', age: 30 },
					{ pid: '1994-222a', name: 'John', age: 31 },
					{ pid: '1993-333a', name: 'Paul', age: 32 },
				],
				'id',
			);

			expect(ids).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);

			// ACT
			const result = await dataTableService.upsertRow(dataTableId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'pid', value: '1995-111a', condition: 'eq' }],
				},
				data: { name: 'Alicia', age: 31 },
			});

			// ASSERT
			expect(result).toBe(true);

			const { count, data } = await dataTableService.getManyRowsAndCount(
				dataTableId,
				project1.id,
				{},
			);

			expect(count).toEqual(3);
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						pid: '1995-111a',
						name: 'Alicia',
						age: 31, // updated
					}),
					expect.objectContaining({
						pid: '1994-222a',
						name: 'John',
						age: 31,
					}),
					expect.objectContaining({
						pid: '1993-333a',
						name: 'Paul',
						age: 32,
					}),
				]),
			);
		});

		it('should insert a row if filter does not match', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'pid', type: 'string' },
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			// Insert initial row
			const ids = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ pid: '1995-111a', name: 'Alice', age: 30 }],
				'id',
			);
			expect(ids).toEqual([{ id: 1 }]);

			// ACT
			const result = await dataTableService.upsertRow(dataTableId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'pid', value: '1995-222b', condition: 'eq' }],
				},
				data: { pid: '1995-222b', name: 'Alice', age: 30 },
			});

			// ASSERT
			expect(result).toBe(true);

			const { count, data } = await dataTableService.getManyRowsAndCount(
				dataTableId,
				project1.id,
				{},
			);

			expect(count).toEqual(2);
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: 'Alice',
						age: 30,
						pid: '1995-111a',
					}),
					expect.objectContaining({
						name: 'Alice',
						age: 30,
						pid: '1995-222b',
					}),
				]),
			);
		});

		it('should return full inserted row if returnData is set', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'fullName', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'birthday', type: 'date' },
				],
			});

			// Insert initial row
			const ids = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ fullName: 'Alice Cooper', age: 30, birthday: new Date('1995-01-01') }],
				'id',
			);
			expect(ids).toEqual([{ id: 1 }]);

			// ACT
			const result = await dataTableService.upsertRow(
				dataTableId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'fullName', value: 'Bob Vance', condition: 'eq' }],
					},
					data: { fullName: 'Bob Vance', age: 30, birthday: new Date('1992-01-02') },
				},
				true,
			);

			// ASSERT
			expect(result).toEqual([
				{
					id: expect.any(Number),
					fullName: 'Bob Vance',
					age: 30,
					birthday: new Date('1992-01-02'),
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});

		it('should return full updated row if returnData is set', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'fullName', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'birthday', type: 'date' },
				],
			});

			// Insert initial row
			const ids = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ fullName: 'Alice Cooper', age: 30, birthday: new Date('1995-01-01') }],
				'id',
			);
			expect(ids).toEqual([{ id: 1 }]);

			// ACT
			const result = await dataTableService.upsertRow(
				dataTableId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'age', value: 30, condition: 'eq' }],
					},
					data: { age: 35, birthday: new Date('1990-01-01') },
				},
				true,
			);

			// ASSERT
			expect(result).toEqual([
				{
					id: expect.any(Number),
					fullName: 'Alice Cooper',
					age: 35,
					birthday: new Date('1990-01-01'),
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});

		it('should simulate update without persisting when dryRun is true', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ name: 'Alice', age: 30 }],
				'id',
			);

			// ACT
			const result = await dataTableService.upsertRow(
				dataTableId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: 'Alice', condition: 'eq' }],
					},
					data: { age: 35 },
				},
				true,
				true,
			);

			// ASSERT
			expect(result).toEqual([
				expect.objectContaining({
					name: 'Alice',
					age: 30,
					dryRunState: 'before',
				}),
				expect.objectContaining({
					name: 'Alice',
					age: 35,
					dryRunState: 'after',
				}),
			]);

			// Verify data was NOT persisted
			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});

			expect(data).toEqual([
				expect.objectContaining({
					name: 'Alice',
					age: 30, // unchanged
				}),
			]);
		});

		it('should simulate insert without persisting when dryRun is true and no match', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ name: 'Alice', age: 30 }],
				'id',
			);

			// ACT
			const result = await dataTableService.upsertRow(
				dataTableId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: 'Bob', condition: 'eq' }],
					},
					data: { name: 'Bob', age: 25 },
				},
				true,
				true,
			);

			// ASSERT
			expect(result).toEqual([
				expect.objectContaining({
					id: null,
					name: null,
					age: null,
					dryRunState: 'before',
				}),
				expect.objectContaining({
					id: 0, // placeholder for dry run
					name: 'Bob',
					age: 25,
					dryRunState: 'after',
				}),
			]);

			// Verify data was NOT persisted
			const { count, data } = await dataTableService.getManyRowsAndCount(
				dataTableId,
				project1.id,
				{},
			);

			expect(count).toEqual(1);
			expect(data).toEqual([
				expect.objectContaining({
					name: 'Alice',
					age: 30,
				}),
			]);
		});
	});

	describe('deleteRows', () => {
		it('should delete rows by filter condition', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
				],
			});
			const { id: dataTableId } = dataTable;

			// Insert test rows
			await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ name: 'Alice', age: 30, active: true },
					{ name: 'Bob', age: 25, active: false },
					{ name: 'Charlie', age: 35, active: true },
				],
				'id',
			);

			// ACT
			const result = await dataTableService.deleteRows(dataTableId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'active', condition: 'eq', value: true }],
				},
			});

			// ASSERT
			expect(result).toBe(true);

			const rows = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(rows.count).toBe(1);
			expect(rows.data).toEqual([
				expect.objectContaining({
					name: 'Bob',
					age: 25,
					active: false,
				}),
			]);
		});

		it('should delete rows by ids', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});
			const { id: dataTableId } = dataTable;

			// Insert test rows
			const insertedIds = await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ name: 'Alice', age: 30 },
					{ name: 'Bob', age: 25 },
					{ name: 'Charlie', age: 35 },
				],
				'id',
			);

			const filters = insertedIds
				.slice(1)
				.map(({ id }) => ({ columnName: 'id', condition: 'eq' as const, value: id }));

			// ACT
			const result = await dataTableService.deleteRows(dataTableId, project1.id, {
				filter: {
					type: 'or',
					filters,
				},
			});

			// ASSERT
			expect(result).toBe(true);

			const rows = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(rows.count).toBe(1);
			expect(rows.data).toEqual([
				expect.objectContaining({
					id: insertedIds[0].id,
				}),
			]);
		});

		it('should delete only one row with OR filter', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});
			const { id: dataTableId } = dataTable;

			await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ name: 'Alice', age: 30 },
					{ name: 'Bob', age: 25 },
				],
				'id',
			);

			// ACT
			const result = await dataTableService.deleteRows(dataTableId, project1.id, {
				filter: {
					type: 'or',
					filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }],
				},
			});

			// ASSERT
			expect(result).toBe(true);

			const rows = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(rows.count).toBe(1);
			expect(rows.data).toEqual([
				expect.objectContaining({
					name: 'Bob',
					age: 25,
				}),
			]);
		});

		it('return full deleted data if returnData is set', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});
			const { id: dataTableId } = dataTable;

			await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ name: 'Alice', age: 30 }],
				'id',
			);

			// ACT
			const result = await dataTableService.deleteRows(
				dataTableId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }],
					},
				},
				true,
			);

			// ASSERT
			expect(result).toEqual([
				{
					id: expect.any(Number),
					name: 'Alice',
					age: 30,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});

		it('should simulate deletion with dryRun=true without actually deleting rows', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});
			const { id: dataTableId } = dataTable;

			await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ name: 'Alice', age: 30 },
					{ name: 'Bob', age: 25 },
				],
				'id',
			);

			// ACT
			const result = await dataTableService.deleteRows(
				dataTableId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'age', condition: 'eq', value: 30 }],
					},
				},
				true,
				true,
			);

			// ASSERT
			expect(result).toEqual([
				{
					id: expect.any(Number),
					name: 'Alice',
					age: 30,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
					dryRunState: 'before',
				},
				{
					id: null,
					name: null,
					age: null,
					createdAt: null,
					updatedAt: null,
					dryRunState: 'after',
				},
			]);

			// Should not actually delete the rows
			const rows = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(rows.count).toBe(2);
			expect(rows.data).toEqual([
				expect.objectContaining({ name: 'Alice', age: 30 }),
				expect.objectContaining({ name: 'Bob', age: 25 }),
			]);
		});

		it('should return data with dryRun=true even if returnData=false', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});
			const { id: dataTableId } = dataTable;

			await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[
					{ name: 'Alice', age: 30 },
					{ name: 'Bob', age: 25 },
				],
				'id',
			);

			// ACT
			const result = await dataTableService.deleteRows(
				dataTableId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'age', condition: 'eq', value: 25 }],
					},
				},
				false,
				true,
			);

			// ASSERT
			expect(result).toEqual([
				{
					id: expect.any(Number),
					name: 'Bob',
					age: 25,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
					dryRunState: 'before',
				},
				{
					id: null,
					name: null,
					age: null,
					createdAt: null,
					updatedAt: null,
					dryRunState: 'after',
				},
			]);

			// Should not actually delete the rows
			const rows = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(rows.count).toBe(2);
			expect(rows.data).toEqual([
				expect.objectContaining({ name: 'Alice', age: 30 }),
				expect.objectContaining({ name: 'Bob', age: 25 }),
			]);
		});

		it('should return empty array with dryRun=true when no rows match filter', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});
			const { id: dataTableId } = dataTable;

			await dataTableService.insertRows(
				dataTableId,
				project1.id,
				[{ name: 'Alice', age: 30 }],
				'id',
			);

			// ACT
			const result = await dataTableService.deleteRows(
				dataTableId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'age', condition: 'eq', value: 99 }],
					},
				},
				true,
				true,
			);

			// ASSERT
			expect(result).toEqual([]);

			const rows = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(rows.count).toBe(1);
		});

		it('fails when trying to delete from non-existent data table', async () => {
			// ACT & ASSERT
			const result = dataTableService.deleteRows('non-existent-id', project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'id', condition: 'eq', value: 1 }],
				},
			});

			await expect(result).rejects.toThrow(DataTableNotFoundError);
		});

		it('should return true and do nothing when no rows match the filter', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'name', type: 'string' }],
			});
			const { id: dataTableId } = dataTable;

			await dataTableService.insertRows(dataTableId, project1.id, [{ name: 'Alice' }]);

			// ACT
			const result = await dataTableService.deleteRows(dataTableId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'name', condition: 'eq', value: 'Charlie' }],
				},
			});

			// ASSERT
			expect(result).toBe(true);

			const { count } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(count).toBe(1);
		});

		it('should not delete all rows when no filter is provided', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'name', type: 'string' }],
			});
			const { id: dataTableId } = dataTable;

			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice' },
				{ name: 'Bob' },
				{ name: 'Charlie' },
			]);

			// ACT
			const result = dataTableService.deleteRows(dataTableId, project1.id, {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				filter: undefined as any,
			});

			await expect(result).rejects.toThrow(
				new DataTableValidationError(
					'Filter is required for delete operations to prevent accidental deletion of all data',
				),
			);
		});

		it('should not delete all rows when no filter is empty', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'name', type: 'string' }],
			});
			const { id: dataTableId } = dataTable;

			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice' },
				{ name: 'Bob' },
				{ name: 'Charlie' },
			]);

			// ACT
			const result = dataTableService.deleteRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [] },
			});

			await expect(result).rejects.toThrow(
				new DataTableValidationError(
					'Filter is required for delete operations to prevent accidental deletion of all data',
				),
			);
		});

		it('should delete empty rows containing only system columns', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [],
			});

			// Insert empty rows
			await dataTableService.insertRows(dataTableId, project1.id, [{}, {}]);

			// Verify rows exist with only system columns
			const { count: initialCount, data: initialData } = await dataTableService.getManyRowsAndCount(
				dataTableId,
				project1.id,
				{},
			);
			expect(initialCount).toEqual(2);
			expect(initialData).toEqual([
				{ id: 1, createdAt: expect.any(Date), updatedAt: expect.any(Date) },
				{ id: 2, createdAt: expect.any(Date), updatedAt: expect.any(Date) },
			]);

			// ACT
			const result = await dataTableService.deleteRows(dataTableId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'id', condition: 'eq', value: 1 }],
				},
			});

			// ASSERT
			expect(result).toEqual(true);

			// Verify only one row remains
			const { count: finalCount, data: finalData } = await dataTableService.getManyRowsAndCount(
				dataTableId,
				project1.id,
				{},
			);
			expect(finalCount).toEqual(1);
			expect(finalData).toEqual([
				{ id: 2, createdAt: expect.any(Date), updatedAt: expect.any(Date) },
			]);
		});
	});

	describe('updateRows', () => {
		it('should update an existing row with matching filter', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'birthday', type: 'date' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice', age: 30, active: true, birthday: new Date('1990-01-01') },
				{ name: 'Bob', age: 25, active: false, birthday: new Date('1995-01-01') },
			]);

			// ACT
			const result = await dataTableService.updateRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { name: 'Alicia', age: 31, active: false, birthday: new Date('1990-01-02') },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alicia',
						age: 31,
						active: false,
						birthday: new Date('1990-01-02'),
					}),
					expect.objectContaining({
						id: 2,
						name: 'Bob',
						age: 25,
						active: false,
						birthday: new Date('1995-01-01'),
					}),
				]),
			);
		});

		it('should be able to update by id', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [
				{
					name: 'Alice',
					age: 30,
					active: true,
				},
				{
					name: 'Bob',
					age: 25,
					active: false,
				},
			]);

			// ACT
			const result = await dataTableService.updateRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 1 }] },
				data: { name: 'Alicia', age: 31, active: false },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alicia',
						age: 31,
						active: false,
					}),
					expect.objectContaining({
						id: 2,
						name: 'Bob',
						age: 25,
						active: false,
					}),
				]),
			);
		});

		it('should update the updatedAt', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice', age: 30, active: true },
			]);

			const { data: initialRows } = await dataTableService.getManyRowsAndCount(
				dataTableId,
				project1.id,
				{},
			);

			// Wait to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 10));

			// ACT
			const result = await dataTableService.updateRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { age: 31, active: false },
			});

			// ASSERT
			expect(result).toBe(true);

			const { data: updatedRows } = await dataTableService.getManyRowsAndCount(
				dataTableId,
				project1.id,
				{},
			);

			expect(updatedRows[0].createdAt).not.toBeNull();
			expect(updatedRows[0].updatedAt).not.toBeNull();
			expect(initialRows[0].updatedAt).not.toBeNull();
			expect(new Date(updatedRows[0].updatedAt).getTime()).toBeGreaterThan(
				new Date(initialRows[0].updatedAt).getTime(),
			);
			expect(new Date(updatedRows[0].updatedAt).getTime()).toBeGreaterThan(
				new Date(updatedRows[0].createdAt).getTime(),
			);
		});

		it('should be able to update by string column', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'birthday', type: 'date' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice', age: 30, active: true, birthday: new Date('1990-01-01') },
				{ name: 'Bob', age: 25, active: false, birthday: new Date('1995-01-01') },
			]);

			// ACT
			const result = await dataTableService.updateRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { name: 'Alicia' },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alicia',
						age: 30,
						active: true,
						birthday: new Date('1990-01-01'),
					}),
					expect.objectContaining({
						id: 2,
						name: 'Bob',
						age: 25,
						active: false,
						birthday: new Date('1995-01-01'),
					}),
				]),
			);
		});

		it('should be able to update by number column', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'birthday', type: 'date' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice', age: 30, active: true, birthday: new Date('1990-01-01') },
				{ name: 'Bob', age: 25, active: false, birthday: new Date('1995-01-01') },
			]);

			// ACT
			const result = await dataTableService.updateRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'age', condition: 'eq', value: 30 }] },
				data: { age: 31 },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alice',
						age: 31,
						active: true,
						birthday: new Date('1990-01-01'),
					}),
					expect.objectContaining({
						id: 2,
						name: 'Bob',
						age: 25,
						active: false,
						birthday: new Date('1995-01-01'),
					}),
				]),
			);
		});

		it('should be able to update by numeric string', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'age', type: 'number' }],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [{ age: 30 }]);

			// ACT
			const result = await dataTableService.updateRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'age', condition: 'eq', value: '30' }] },
				data: { age: '31' },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(data).toEqual([expect.objectContaining({ age: 31 })]);
		});

		it('should throw on invalid numeric string', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'age', type: 'number' }],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [{ age: 30 }]);

			// ACT
			const result = dataTableService.updateRows(dataTableId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'age', condition: 'eq', value: '30dfddf' }],
				},
				data: { age: '31' },
			});

			// ASSERT
			await expect(result).rejects.toThrow(DataTableValidationError);
			await expect(result).rejects.toThrow("value '30dfddf' does not match column type 'number'");
		});

		it('should be able to update by boolean column', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'birthday', type: 'date' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice', age: 30, active: true, birthday: new Date('1990-01-01') },
				{ name: 'Bob', age: 25, active: false, birthday: new Date('1995-01-01') },
			]);

			// ACT
			const result = await dataTableService.updateRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'active', condition: 'eq', value: true }] },
				data: { active: false },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alice',
						age: 30,
						active: false,
						birthday: new Date('1990-01-01'),
					}),
					expect.objectContaining({
						id: 2,
						name: 'Bob',
						age: 25,
						active: false,
						birthday: new Date('1995-01-01'),
					}),
				]),
			);
		});

		it('should be able to update by date column', async () => {
			// ARRANGE
			const aliceBirthday = new Date('1990-01-02');
			const bobBirthday = new Date('1995-01-01');

			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'birthday', type: 'date' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice', age: 30, active: true, birthday: aliceBirthday },
				{ name: 'Bob', age: 25, active: false, birthday: bobBirthday },
			]);

			// ACT
			const newBirthday = new Date('1990-01-03');
			const result = await dataTableService.updateRows(dataTableId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'birthday', condition: 'eq', value: aliceBirthday }],
				},
				data: { birthday: newBirthday },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alice',
						age: 30,
						active: true,
						birthday: newBirthday,
					}),
					expect.objectContaining({
						id: 2,
						name: 'Bob',
						age: 25,
						active: false,
						birthday: bobBirthday,
					}),
				]),
			);
		});

		it('should update row with multiple filter conditions', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'department', type: 'string' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice', age: 30, department: 'Engineering' },
				{ name: 'Alice', age: 25, department: 'Marketing' },
				{ name: 'Bob', age: 30, department: 'Engineering' },
			]);

			// ACT
			const result = await dataTableService.updateRows(dataTableId, project1.id, {
				filter: {
					type: 'and',
					filters: [
						{ columnName: 'name', condition: 'eq', value: 'Alice' },
						{ columnName: 'age', condition: 'eq', value: 30 },
					],
				},
				data: { department: 'Management' },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alice',
						age: 30,
						department: 'Management',
					}),
					expect.objectContaining({
						id: 2,
						name: 'Alice',
						age: 25,
						department: 'Marketing',
					}),
					expect.objectContaining({
						id: 3,
						name: 'Bob',
						age: 30,
						department: 'Engineering',
					}),
				]),
			);
		});

		it('should return true when no rows match the filter', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [{ name: 'Alice', age: 30 }]);

			// ACT
			const result = await dataTableService.updateRows(dataTableId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'name', condition: 'eq', value: 'Charlie' }],
				},
				data: { age: 25 },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(data).toEqual([
				expect.objectContaining({
					name: 'Alice',
					age: 30,
				}),
			]);
		});

		it('should throw validation error when filters are empty', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [{ name: 'Alice', age: 30 }]);

			// ACT
			const result = dataTableService.updateRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [] },
				data: { name: 'Alice', age: 31 },
			});

			// ASSERT
			await expect(result).rejects.toThrow(
				new DataTableValidationError('Filter must not be empty'),
			);

			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(data).toEqual([
				expect.objectContaining({
					name: 'Alice',
					age: 30,
				}),
			]);
		});

		it('should throw validation error when data is empty', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [{ name: 'Alice', age: 30 }]);

			// ACT
			const result = dataTableService.updateRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: {},
			});

			// ASSERT
			await expect(result).rejects.toThrow(
				new DataTableValidationError('Data columns must not be empty'),
			);

			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(data).toEqual([
				expect.objectContaining({
					name: 'Alice',
					age: 30,
				}),
			]);
		});

		it('should fail when data table does not exist', async () => {
			// ACT & ASSERT
			const result = dataTableService.updateRows('non-existent-id', project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { age: 25 },
			});

			await expect(result).rejects.toThrow(DataTableNotFoundError);
		});

		it('should fail when data contains invalid column names', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'name', type: 'string' }],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [{ name: 'Alice' }]);

			// ACT & ASSERT
			const result = dataTableService.updateRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { invalidColumn: 'value' },
			});

			await expect(result).rejects.toThrow(DataTableValidationError);
		});

		it('should fail when filter contains invalid column names', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'name', type: 'string' }],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [{ name: 'Alice' }]);

			// ACT & ASSERT
			const result = dataTableService.updateRows(dataTableId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'invalidColumn', condition: 'eq', value: 'Alice' }],
				},
				data: { name: 'Bob' },
			});

			await expect(result).rejects.toThrow(DataTableValidationError);
		});

		it('should fail when data contains invalid type values', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [{ name: 'Alice', age: 30 }]);

			// ACT & ASSERT
			const result = dataTableService.updateRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { age: 'not-a-number' },
			});

			await expect(result).rejects.toThrow(DataTableValidationError);
		});

		it('should allow partial data updates', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice', age: 30, active: true },
			]);

			// ACT - only update age, leaving name and active unchanged
			const result = await dataTableService.updateRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { age: 31 },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(data).toEqual([
				expect.objectContaining({
					name: 'Alice',
					age: 31,
					active: true,
				}),
			]);
		});

		it('should handle date column updates correctly', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'birthDate', type: 'date' },
				],
			});

			const initialDate = new Date('1990-01-01');
			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice', birthDate: initialDate },
			]);

			// ACT
			const newDate = new Date('1991-02-02');
			const result = await dataTableService.updateRows(dataTableId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { birthDate: newDate.toISOString() },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});

			expect(data).toEqual([expect.objectContaining({ id: 1, name: 'Alice', birthDate: newDate })]);
		});

		it('should return full updated rows if returnData is set', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'timestamp', type: 'date' },
				],
			});

			const now = new Date();
			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice', age: 30, active: true, timestamp: now },
				{ name: 'Bob', age: 25, active: false, timestamp: now },
			]);

			const soon = new Date();
			soon.setDate(now.getDate() + 1);

			// ACT
			const result = await dataTableService.updateRows(
				dataTableId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }],
					},
					data: { age: 31, active: false, timestamp: soon },
				},
				true,
			);

			// ASSERT
			expect(result).toEqual([
				expect.objectContaining({ id: 1, name: 'Alice', age: 31, active: false, timestamp: soon }),
			]);
		});

		it('should simulate update with dryRun=true and return before/after pairs', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			]);

			// ACT
			const result = await dataTableService.updateRows(
				dataTableId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }],
					},
					data: { age: 31 },
				},
				false,
				true,
			);

			// ASSERT
			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(2);

			// Check the before state (first item)
			expect((result as any)[0]).toEqual(
				expect.objectContaining({
					id: expect.any(Number),
					name: 'Alice',
					age: 30,
					dryRunState: 'before',
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				}),
			);

			// Check the after state (second item)
			expect((result as any)[1]).toEqual(
				expect.objectContaining({
					id: expect.any(Number),
					name: 'Alice',
					age: 31, // Changed value
					dryRunState: 'after',
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				}),
			);

			// Should not actually update the rows
			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			const aliceRow = data.find((row) => row.name === 'Alice');
			expect(aliceRow?.age).toBe(30); // Should still be original value
		});

		it('should return empty array with dryRun=true when no rows match filter', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [{ name: 'Alice', age: 30 }]);

			// ACT
			const result = await dataTableService.updateRows(
				dataTableId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', condition: 'eq', value: 'NonExistent' }],
					},
					data: { age: 31 },
				},
				false,
				true,
			);

			// ASSERT
			expect(result).toEqual([]);

			// Should not update any rows
			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			expect(data[0].age).toBe(30);
		});

		it('should handle multiple rows with dryRun=true returning multiple before/after pairs', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'active', type: 'boolean' },
				],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [
				{ name: 'Alice', active: false },
				{ name: 'Bob', active: false },
				{ name: 'Charlie', active: true },
			]);

			// ACT
			const result = await dataTableService.updateRows(
				dataTableId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'active', condition: 'eq', value: false }],
					},
					data: { active: true },
				},
				false,
				true,
			);

			// ASSERT
			expect(result).toHaveLength(4);

			// Check first row pair
			expect(result[0]).toEqual(
				expect.objectContaining({ name: 'Alice', active: false, dryRunState: 'before' }),
			);
			expect(result[1]).toEqual(
				expect.objectContaining({ name: 'Alice', active: true, dryRunState: 'after' }),
			);

			// Check second row pair
			expect(result[2]).toEqual(
				expect.objectContaining({ name: 'Bob', active: false, dryRunState: 'before' }),
			);
			expect(result[3]).toEqual(
				expect.objectContaining({ name: 'Bob', active: true, dryRunState: 'after' }),
			);

			// Should not actually update the rows
			const { data } = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});
			const activeFalseRows = data.filter((row) => row.active === false);
			expect(activeFalseRows).toHaveLength(2);
		});
	});

	describe('getManyRowsAndCount', () => {
		it('retrieves rows correctly', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'boolean' },
					{ name: 'c3', type: 'date' },
					{ name: 'c4', type: 'string' },
				],
			});

			const rows = [
				{
					c1: 3,
					c2: true,
					c3: new Date(0),
					c4: 'hello?',
				},
				{
					c1: 4,
					c2: false,
					c3: new Date(1),
					c4: 'hello!',
				},
				{
					c1: 5,
					c2: true,
					c3: new Date(2),
					c4: 'hello.',
				},
			];

			const ids = await dataTableService.insertRows(dataTableId, project1.id, rows, 'id');
			expect(ids).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);

			// ACT
			const result = await dataTableService.getManyRowsAndCount(dataTableId, project1.id, {});

			// ASSERT
			expect(result.count).toEqual(3);
			// Assuming IDs are auto-incremented starting from 1
			expect(result.data).toEqual([
				{
					c1: rows[0].c1,
					c2: rows[0].c2,
					c3: new Date(0),
					c4: rows[0].c4,
					id: 1,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					c1: rows[1].c1,
					c2: rows[1].c2,
					c3: new Date(1),
					c4: rows[1].c4,
					id: 2,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					c1: rows[2].c1,
					c2: rows[2].c2,
					c3: new Date(2),
					c4: rows[2].c4,
					id: 3,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});

		it('should fail when filter contains invalid column names', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'name', type: 'string' }],
			});

			await dataTableService.insertRows(dataTableId, project1.id, [{ name: 'Alice' }]);

			// ACT
			const result = dataTableService.updateRows(dataTableId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'invalidColumn', condition: 'eq', value: 'Alice' }],
				},
				data: { name: 'Bob' },
			});

			// ASSERT
			await expect(result).rejects.toThrow(DataTableValidationError);
		});
	});

	describe('transferDataTablesByProjectId', () => {
		it('should transfer all data tables from one project to another', async () => {
			// ARRANGE
			const { id: dataTableId1, name: dataTableName1 } = await dataTableService.createDataTable(
				project1.id,
				{
					name: 'dataTable1',
					columns: [{ name: 'col1', type: 'string' }],
				},
			);
			const { id: dataTableId2, name: dataTableName2 } = await dataTableService.createDataTable(
				project1.id,
				{
					name: 'dataTable2',
					columns: [{ name: 'col1', type: 'string' }],
				},
			);

			// ACT
			await dataTableService.transferDataTablesByProjectId(project1.id, project2.id);

			// ASSERT
			const dataTable1 = await dataTableRepository.findOneByOrFail({
				id: dataTableId1,
			});
			expect(dataTable1).toBeDefined();
			expect(dataTable1.projectId).toBe(project2.id);
			expect(dataTable1.name).toBe(dataTableName1);

			const dataTable2 = await dataTableRepository.findOneByOrFail({
				id: dataTableId2,
			});
			expect(dataTable2).toBeDefined();
			expect(dataTable2.projectId).toBe(project2.id);
			expect(dataTable2.name).toBe(dataTableName2);
		});

		it('should not affect data tables in other projects', async () => {
			// ARRANGE
			const { id: dataTableId1 } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable1',
				columns: [{ name: 'col1', type: 'string' }],
			});
			const { id: dataTableId2 } = await dataTableService.createDataTable(project2.id, {
				name: 'dataTable2',
				columns: [{ name: 'col1', type: 'string' }],
			});

			// ACT
			await dataTableService.transferDataTablesByProjectId(project1.id, project2.id);

			// ASSERT
			const dataTable1 = await dataTableRepository.findOneByOrFail({
				id: dataTableId1,
			});
			expect(dataTable1).toBeDefined();
			expect(dataTable1.projectId).toBe(project2.id);

			const dataTable2 = await dataTableRepository.findOneByOrFail({
				id: dataTableId2,
				project: {
					id: project2.id,
				},
			});
			expect(dataTable2).toBeDefined();
			expect(dataTable2.projectId).toBe(project2.id);
		});

		it('should rename data tables if name conflict occurs in target project', async () => {
			// ARRANGE
			const { id: dataTableId1 } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'col1', type: 'string' }],
			});
			await dataTableService.createDataTable(project2.id, {
				name: 'dataTable',
				columns: [{ name: 'col1', type: 'string' }],
			});

			// ACT
			await dataTableService.transferDataTablesByProjectId(project1.id, project2.id);

			// ASSERT
			const dataTable1 = await dataTableRepository.findOneByOrFail({
				id: dataTableId1,
			});
			expect(dataTable1).toBeDefined();
			expect(dataTable1.projectId).toBe(project2.id);
			expect(dataTable1.name).toBe(`dataTable (${project1.name})`);
		});
	});

	describe('deleteDataTableByProjectId', () => {
		it('should delete all data tables for a given project ID', async () => {
			// ARRANGE
			const { id: dataTableId1 } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable1',
				columns: [{ name: 'col1', type: 'string' }],
			});
			const { id: dataTableId2 } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable2',
				columns: [{ name: 'col1', type: 'string' }],
			});

			// ACT
			await dataTableService.deleteDataTableByProjectId(project1.id);

			// ASSERT
			await expect(
				dataTableRepository.findOneByOrFail({
					id: dataTableId1,
					project: {
						id: project1.id,
					},
				}),
			).rejects.toThrow();

			await expect(
				dataTableRepository.findOneByOrFail({
					id: dataTableId2,
					project: {
						id: project1.id,
					},
				}),
			).rejects.toThrow();
		});

		it('should not delete data tables for other projects', async () => {
			// ARRANGE
			const { id: dataTableId1 } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTableA',
				columns: [{ name: 'col1', type: 'string' }],
			});
			const { id: dataTableId2 } = await dataTableService.createDataTable(project2.id, {
				name: 'dataTableB',
				columns: [{ name: 'col1', type: 'string' }],
			});

			// ACT
			await dataTableService.deleteDataTableByProjectId(project1.id);

			// ASSERT
			await expect(
				dataTableRepository.findOneByOrFail({
					id: dataTableId1,
					project: {
						id: project1.id,
					},
				}),
			).rejects.toThrow();

			const dataTable2 = await dataTableRepository.findOneByOrFail({
				id: dataTableId2,
				project: {
					id: project2.id,
				},
			});
			expect(dataTable2).toBeDefined();
			expect(dataTable2.id).toBe(dataTableId2);
		});
	});
});
