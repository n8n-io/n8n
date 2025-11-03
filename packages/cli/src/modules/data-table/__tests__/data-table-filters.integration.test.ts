/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { DataTableFilterConditionType } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Project } from '@n8n/db';
import { Container } from '@n8n/di';

import { mockDataTableSizeValidator } from './test-helpers';
import { DataTableService } from '../data-table.service';
import { DataTableValidationError } from '../errors/data-table-validation.error';

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

describe('dataTable filters', () => {
	let dataTableService: DataTableService;

	beforeAll(() => {
		dataTableService = Container.get(DataTableService);
	});

	let project: Project;

	beforeEach(async () => {
		project = await createTeamProject();
	});

	afterEach(async () => {
		// Clean up any created user data tables
		await dataTableService.deleteDataTableAll();
	});

	describe('getManyAndCount', () => {
		it('should retrieve by name', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'dataTable',
				columns: [],
			});

			// ACT
			const result = await dataTableService.getManyAndCount({
				filter: { projectId: project.id, name: dataTable.name },
			});

			// ASSERT
			expect(result.data).toHaveLength(1);
			expect(result.data[0]).toEqual({
				...dataTable,
				project: expect.any(Project),
			});
			expect(result.data[0].project).toEqual({
				icon: null,
				id: project.id,
				name: project.name,
				type: project.type,
			});
			expect(result.count).toEqual(1);
		});

		it('should retrieve by ids', async () => {
			// ARRANGE
			const dataTable1 = await dataTableService.createDataTable(project.id, {
				name: 'myDataTable1',
				columns: [],
			});

			const dataTable2 = await dataTableService.createDataTable(project.id, {
				name: 'myDataTable2',
				columns: [],
			});

			// ACT
			const result = await dataTableService.getManyAndCount({
				filter: { projectId: project.id, id: [dataTable1.id, dataTable2.id] },
			});

			// ASSERT
			expect(result.data).toHaveLength(2);
			expect(result.data).toContainEqual({
				...dataTable2,
				project: expect.any(Project),
			});
			expect(result.data).toContainEqual({
				...dataTable1,
				project: expect.any(Project),
			});
			expect(result.count).toEqual(2);
		});

		it('should retrieve by projectId', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'myDataTable',
				columns: [],
			});
			const names = [dataTable.name];
			for (let i = 0; i < 10; ++i) {
				const ds = await dataTableService.createDataTable(project.id, {
					name: `anotherDataTable${i}`,
					columns: [],
				});
				names.push(ds.name);
			}

			// ACT
			const result = await dataTableService.getManyAndCount({
				filter: { projectId: project.id },
			});

			// ASSERT
			expect(result.data.map((x) => x.name).sort()).toEqual(names.sort());
			expect(result.count).toEqual(11);
		});

		it('should retrieve by id with pagination', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'myDataTable',
				columns: [],
			});
			const names = [dataTable.name];

			for (let i = 0; i < 10; ++i) {
				const ds = await dataTableService.createDataTable(project.id, {
					name: `anotherDataTable${i}`,
					columns: [],
				});
				names.push(ds.name);
			}

			// ACT
			const p0 = await dataTableService.getManyAndCount({
				filter: { projectId: project.id },
				skip: 0,
				take: 3,
			});
			const p1 = await dataTableService.getManyAndCount({
				filter: { projectId: project.id },
				skip: 3,
				take: 3,
			});
			const rest = await dataTableService.getManyAndCount({
				filter: { projectId: project.id },
				skip: 6,
				take: 10,
			});

			// ASSERT
			expect(p0.count).toBe(11);
			expect(p0.data).toHaveLength(3);

			expect(p1.count).toBe(11);
			expect(p1.data).toHaveLength(3);

			expect(rest.count).toBe(11);
			expect(rest.data).toHaveLength(5);

			expect(
				p0.data
					.concat(p1.data)
					.concat(rest.data)
					.map((x) => x.name)
					.sort(),
			).toEqual(names.sort());
		});
	});

	describe('getManyRowsAndCount', () => {
		describe('equals and not equals filters', () => {
			it("retrieves rows with 'equals' filter correctly", async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
						{ name: 'birthday', type: 'date' },
						{ name: 'isActive', type: 'boolean' },
					],
				});

				const maryBirthday = new Date('1998-08-25');

				const rows = [
					{ name: 'John', age: 30, birthday: new Date('1994-05-15T00:00:00.000Z'), isActive: true },
					{ name: 'Mary', age: 25, birthday: maryBirthday, isActive: false },
					{ name: 'Jack', age: 35, birthday: new Date('1988-12-05T00:00:00.000Z'), isActive: true },
				];

				await dataTableService.insertRows(dataTableId, project.id, rows);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [
							{ columnName: 'name', value: 'Mary', condition: 'eq' },
							{ columnName: 'age', value: 25, condition: 'eq' },
							{ columnName: 'birthday', value: maryBirthday, condition: 'eq' },
							{ columnName: 'isActive', value: false, condition: 'eq' },
						],
					},
				});

				// ASSERT
				expect(result.count).toEqual(1);
				expect(result.data).toEqual([
					expect.objectContaining({
						name: 'Mary',
						age: 25,
						birthday: maryBirthday,
						isActive: false,
					}),
				]);
			});

			it("retrieves rows with 'not equals' filter correctly", async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
					],
				});

				const rows = [
					{ name: 'John', age: 30 },
					{ name: 'Mary', age: 25 },
					{ name: 'Jack', age: 35 },
				];

				await dataTableService.insertRows(dataTableId, project.id, rows);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: 'Mary', condition: 'neq' }],
					},
				});

				// ASSERT
				expect(result.count).toEqual(2);
				expect(result.data).toEqual([
					expect.objectContaining({ name: 'John', age: 30 }),
					expect.objectContaining({ name: 'Jack', age: 35 }),
				]);
			});

			it('supports filter by null', async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'c1', type: 'string' },
						{ name: 'c2', type: 'boolean' },
					],
				});

				const rows = [
					{ c1: null, c2: true },
					{ c1: 'Marco', c2: true },
					{ c1: null, c2: false },
					{ c1: 'Polo', c2: false },
				];

				await dataTableService.insertRows(dataTableId, project.id, rows);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'c1', condition: 'eq', value: null }],
					},
				});

				// ASSERT
				expect(result.count).toEqual(2);
				expect(result.data).toMatchObject([
					expect.objectContaining({ c1: null, c2: true }),
					expect.objectContaining({ c1: null, c2: false }),
				]);
			});

			it('supports filter by not null', async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'c1', type: 'string' },
						{ name: 'c2', type: 'boolean' },
					],
				});

				const rows = [
					{ c1: null, c2: true },
					{ c1: 'Marco', c2: true },
					{ c1: null, c2: false },
					{ c1: 'Polo', c2: false },
				];

				await dataTableService.insertRows(dataTableId, project.id, rows);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'c1', condition: 'neq', value: null }],
					},
				});

				// ASSERT
				expect(result.count).toEqual(2);
				expect(result.data).toMatchObject([
					expect.objectContaining({ c1: 'Marco', c2: true }),
					expect.objectContaining({ c1: 'Polo', c2: false }),
				]);
			});

			it('includes null values when using neq with specific value', async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'category', type: 'string' },
					],
				});

				const rows = [
					{ name: 'John', category: 'A' },
					{ name: 'Mary', category: 'B' },
					{ name: 'Jack', category: null },
					{ name: 'Alice', category: 'A' },
					{ name: 'Bob', category: null },
				];

				await dataTableService.insertRows(dataTableId, project.id, rows);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'category', condition: 'neq', value: 'A' }],
					},
				});

				// ASSERT
				expect(result.count).toEqual(3);
				expect(result.data).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ name: 'Mary', category: 'B' }),
						expect.objectContaining({ name: 'Jack', category: null }),
						expect.objectContaining({ name: 'Bob', category: null }),
					]),
				);
			});

			it('should accept a valid numeric string', async () => {
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [{ name: 'age', type: 'number' }],
				});

				await dataTableService.insertRows(dataTableId, project.id, [{ age: null }, { age: 30 }]);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'age', condition: 'eq', value: '30' }],
					},
				});

				// ASSERT
				expect(result.count).toEqual(1);
				expect(result.data).toEqual([expect.objectContaining({ age: 30 })]);
			});

			it('should throw on invalid numeric string', async () => {
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [{ name: 'age', type: 'number' }],
				});

				await dataTableService.insertRows(dataTableId, project.id, [{ age: null }, { age: 30 }]);

				// ACT
				const result = dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'age', condition: 'eq', value: '30dfddf' }],
					},
				});

				// ASSERT
				await expect(result).rejects.toThrow(DataTableValidationError);
				await expect(result).rejects.toThrow("value '30dfddf' does not match column type 'number'");
			});
		});

		describe('LIKE filters', () => {
			it("retrieves rows with 'contains sensitive' filter correctly", async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
					],
				});

				const rows = [
					{ name: 'Arnold', age: 30 },
					{ name: 'Mary', age: 25 },
					{ name: 'Charlie', age: 35 },
				];

				await dataTableService.insertRows(dataTableId, project.id, rows);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: '%ar%', condition: 'like' }],
					},
				});

				// ASSERT
				expect(result.count).toEqual(2);
				expect(result.data).toEqual([
					expect.objectContaining({ name: 'Mary', age: 25 }),
					expect.objectContaining({ name: 'Charlie', age: 35 }),
				]);
			});

			it("retrieves rows with 'contains insensitive' filter correctly", async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
					],
				});

				const rows = [
					{ name: 'John', age: 30 },
					{ name: 'Mary', age: 20 },
					{ name: 'Benjamin', age: 25 },
					{ name: 'Taj', age: 35 },
				];

				await dataTableService.insertRows(dataTableId, project.id, rows);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: '%J%', condition: 'ilike' }],
					},
				});

				// ASSERT
				expect(result.count).toEqual(3);
				expect(result.data).toEqual([
					expect.objectContaining({ name: 'John', age: 30 }),
					expect.objectContaining({ name: 'Benjamin', age: 25 }),
					expect.objectContaining({ name: 'Taj', age: 35 }),
				]);
			});

			it("retrieves rows with 'starts with' filter correctly", async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
					],
				});

				const rows = [
					{ name: 'Arnold', age: 30 },
					{ name: 'Mary', age: 25 },
					{ name: 'Charlie', age: 35 },
				];

				await dataTableService.insertRows(dataTableId, project.id, rows);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: 'Ar%', condition: 'ilike' }],
					},
				});

				// ASSERT
				expect(result.count).toEqual(1);
				expect(result.data).toEqual([expect.objectContaining({ name: 'Arnold', age: 30 })]);
			});

			it("retrieves rows with 'ends with' filter correctly", async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
					],
				});

				const rows = [
					{ name: 'Arnold', age: 30 },
					{ name: 'Mary', age: 25 },
					{ name: 'Charlie', age: 35 },
					{ name: 'Harold', age: 40 },
				];

				await dataTableService.insertRows(dataTableId, project.id, rows);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: '%old', condition: 'ilike' }],
					},
				});

				// ASSERT
				expect(result.count).toEqual(2);
				expect(result.data).toEqual([
					expect.objectContaining({ name: 'Arnold', age: 30 }),
					expect.objectContaining({ name: 'Harold', age: 40 }),
				]);
			});

			describe.each(['like', 'ilike'] as DataTableFilterConditionType[])(
				'%s filter validation',
				(condition) => {
					it(`throws error when '${condition}' filter value is null`, async () => {
						// ARRANGE
						const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
							name: 'dataTable',
							columns: [
								{ name: 'name', type: 'string' },
								{ name: 'age', type: 'number' },
							],
						});

						const rows = [
							{ name: 'John', age: 30 },
							{ name: 'Mary', age: 25 },
						];

						await dataTableService.insertRows(dataTableId, project.id, rows);

						// ACT
						const result = dataTableService.getManyRowsAndCount(dataTableId, project.id, {
							filter: {
								type: 'and',
								filters: [{ columnName: 'name', value: null, condition }],
							},
						});

						// ASSERT
						await expect(result).rejects.toThrow(
							new DataTableValidationError(
								`${condition.toUpperCase()} filter value cannot be null or undefined`,
							),
						);
					});

					it(`throws error when '${condition}' filter value is not a string`, async () => {
						// ARRANGE
						const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
							name: 'dataTable',
							columns: [
								{ name: 'name', type: 'string' },
								{ name: 'age', type: 'number' },
							],
						});

						const rows = [
							{ name: 'John', age: 30 },
							{ name: 'Mary', age: 25 },
						];

						await dataTableService.insertRows(dataTableId, project.id, rows);

						// ACT
						const result = dataTableService.getManyRowsAndCount(dataTableId, project.id, {
							filter: {
								type: 'and',
								filters: [{ columnName: 'age', value: 123, condition }],
							},
						});

						// ASSERT
						await expect(result).rejects.toThrow(
							new DataTableValidationError(
								`${condition.toUpperCase()} filter value must be a string`,
							),
						);
					});
				},
			);

			describe('like filter with special characters', () => {
				let dataTableId: string;

				beforeEach(async () => {
					const { id } = await dataTableService.createDataTable(project.id, {
						name: 'dataTable',
						columns: [{ name: 'text', type: 'string' }],
					});
					dataTableId = id;
				});

				it('should treat square brackets literally in like patterns', async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ text: 'test[abc]data' },
						{ text: 'Test[abc]Data' },
						{ text: 'testAdata' },
						{ text: 'testBdata' },
					]);

					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'text', value: 'test%[abc]%', condition: 'like' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(1);
					expect(result.data).toEqual([expect.objectContaining({ text: 'test[abc]data' })]);
				});

				it('should treat asterisk literally in like patterns', async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ text: 'test*data' },
						{ text: 'Test*Data' },
						{ text: 'testAdata' },
						{ text: 'testABCdata' },
					]);

					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'text', value: 'test%*%', condition: 'like' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(1);
					expect(result.data).toEqual([expect.objectContaining({ text: 'test*data' })]);
				});

				it('should treat question mark literally in like patterns', async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ text: 'test?data' },
						{ text: 'Test?Data' },
						{ text: 'testAdata' },
						{ text: 'testXdata' },
					]);

					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'text', value: 'test%?%', condition: 'like' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(1);
					expect(result.data).toEqual([expect.objectContaining({ text: 'test?data' })]);
				});

				it('should convert LIKE % wildcard to match zero or more characters', async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ text: 'data%more' },
						{ text: 'Data%More' },
						{ text: 'datamore' },
						{ text: 'dataABCmore' },
						{ text: 'different' },
					]);

					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'text', value: 'data%more', condition: 'like' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(3);
					expect(result.data).toEqual(
						expect.arrayContaining([
							expect.objectContaining({ text: 'data%more' }),
							expect.objectContaining({ text: 'datamore' }),
							expect.objectContaining({ text: 'dataABCmore' }),
						]),
					);
				});

				it('should treat underscore literally in like patterns', async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ text: 'prefix_suffix' },
						{ text: 'Prefix_Suffix' },
						{ text: 'prefix\\_suffix' },
						{ text: 'prefixAsuffix' },
						{ text: 'prefixsuffix' },
					]);

					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'text', value: 'prefix_suffix', condition: 'like' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(1);
					expect(result.data).toEqual([expect.objectContaining({ text: 'prefix_suffix' })]);
				});

				it('should handle multiple special characters', async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ text: 'test[*?]data' },
						{ text: 'Test[*?]Data' },
						{ text: 'testOtherData' },
						{ text: 'test123data' },
					]);

					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'text', value: 'test%[*?]%', condition: 'like' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(1);
					expect(result.data).toEqual([expect.objectContaining({ text: 'test[*?]data' })]);
				});
			});

			describe('ilike filter with special characters (case-insensitive)', () => {
				let dataTableId: string;

				beforeEach(async () => {
					const { id } = await dataTableService.createDataTable(project.id, {
						name: 'dataTable',
						columns: [{ name: 'text', type: 'string' }],
					});
					dataTableId = id;
				});

				it('should treat square brackets literally', async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ text: 'test[abc]data' },
						{ text: 'Test[ABC]Data' },
						{ text: 'testAdata' },
						{ text: 'testBdata' },
					]);

					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'text', value: '%[abc]%', condition: 'ilike' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(2);
					expect(result.data).toEqual(
						expect.arrayContaining([
							expect.objectContaining({ text: 'test[abc]data' }),
							expect.objectContaining({ text: 'Test[ABC]Data' }),
						]),
					);
				});

				it('should treat asterisk literally', async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ text: 'test*data' },
						{ text: 'Test*Data' },
						{ text: 'testOtherData' },
						{ text: 'testABCdata' },
					]);

					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'text', value: '%*%', condition: 'ilike' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(2);
					expect(result.data).toEqual(
						expect.arrayContaining([
							expect.objectContaining({ text: 'test*data' }),
							expect.objectContaining({ text: 'Test*Data' }),
						]),
					);
				});

				it('should treat question mark literally', async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ text: 'test?data' },
						{ text: 'Test?Data' },
						{ text: 'testSingleChar' },
						{ text: 'testMultiChar' },
					]);

					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'text', value: '%?%', condition: 'ilike' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(2);
					expect(result.data).toEqual(
						expect.arrayContaining([
							expect.objectContaining({ text: 'test?data' }),
							expect.objectContaining({ text: 'Test?Data' }),
						]),
					);
				});

				it('should convert % wildcard to match zero or more characters', async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ text: 'data%more' },
						{ text: 'Data%More' },
						{ text: 'datamore' },
						{ text: 'DataMore' },
						{ text: 'dataABCmore' },
						{ text: 'DataABCMore' },
						{ text: 'different' },
					]);

					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'text', value: 'data%more', condition: 'ilike' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(6);
					expect(result.data).toEqual(
						expect.arrayContaining([
							expect.objectContaining({ text: 'data%more' }),
							expect.objectContaining({ text: 'Data%More' }),
							expect.objectContaining({ text: 'datamore' }),
							expect.objectContaining({ text: 'DataMore' }),
							expect.objectContaining({ text: 'dataABCmore' }),
							expect.objectContaining({ text: 'DataABCMore' }),
						]),
					);
				});

				it('should treat underscore literally', async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ text: 'prefix_suffix' },
						{ text: 'Prefix_Suffix' },
						{ text: 'Prefix\\_Suffix' },
						{ text: 'prefixASuffix' },
						{ text: 'prefixsuffix' },
					]);

					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'text', value: 'prefix_suffix', condition: 'ilike' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(2);
					expect(result.data).toEqual(
						expect.arrayContaining([
							expect.objectContaining({ text: 'prefix_suffix' }),
							expect.objectContaining({ text: 'Prefix_Suffix' }),
						]),
					);
				});

				it('should handle multiple special characters', async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ text: 'test[*?]data' },
						{ text: 'Test[*?]Data' },
						{ text: 'testOtherData' },
						{ text: 'test123data' },
					]);

					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'text', value: '%[*?]%', condition: 'ilike' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(2);
					expect(result.data).toEqual(
						expect.arrayContaining([
							expect.objectContaining({ text: 'test[*?]data' }),
							expect.objectContaining({ text: 'Test[*?]Data' }),
						]),
					);
				});
			});
		});

		describe('greater than and less than filters', () => {
			describe('number comparisons', () => {
				let dataTableId: string;

				beforeEach(async () => {
					const { id } = await dataTableService.createDataTable(project.id, {
						name: 'dataTable',
						columns: [
							{ name: 'name', type: 'string' },
							{ name: 'age', type: 'number' },
						],
					});
					dataTableId = id;

					const rows = [
						{ name: 'John', age: 25 },
						{ name: 'Mary', age: 30 },
						{ name: 'Jack', age: 35 },
						{ name: 'Alice', age: 40 },
					];

					await dataTableService.insertRows(dataTableId, project.id, rows);
				});

				it("retrieves rows with 'greater than' filter correctly", async () => {
					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'age', value: 30, condition: 'gt' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(2);
					expect(result.data).toEqual([
						expect.objectContaining({ name: 'Jack', age: 35 }),
						expect.objectContaining({ name: 'Alice', age: 40 }),
					]);
				});

				it("retrieves rows with 'greater than or equal' filter correctly", async () => {
					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'age', value: 30, condition: 'gte' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(3);
					expect(result.data).toEqual([
						expect.objectContaining({ name: 'Mary', age: 30 }),
						expect.objectContaining({ name: 'Jack', age: 35 }),
						expect.objectContaining({ name: 'Alice', age: 40 }),
					]);
				});

				it("retrieves rows with 'less than' filter correctly", async () => {
					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'age', value: 35, condition: 'lt' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(2);
					expect(result.data).toEqual([
						expect.objectContaining({ name: 'John', age: 25 }),
						expect.objectContaining({ name: 'Mary', age: 30 }),
					]);
				});

				it("retrieves rows with 'less than or equal' filter correctly", async () => {
					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'age', value: 35, condition: 'lte' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(3);
					expect(result.data).toEqual([
						expect.objectContaining({ name: 'John', age: 25 }),
						expect.objectContaining({ name: 'Mary', age: 30 }),
						expect.objectContaining({ name: 'Jack', age: 35 }),
					]);
				});
			});

			describe('string comparisons', () => {
				let dataTableId: string;

				beforeEach(async () => {
					const { id } = await dataTableService.createDataTable(project.id, {
						name: 'dataTable',
						columns: [
							{ name: 'name', type: 'string' },
							{ name: 'category', type: 'string' },
						],
					});
					dataTableId = id;

					const rows = [
						{ name: 'Alice', category: 'Alpha' },
						{ name: 'Bob', category: 'Beta' },
						{ name: 'Charlie', category: 'Gamma' },
						{ name: 'David', category: 'Delta' },
					];

					await dataTableService.insertRows(dataTableId, project.id, rows);
				});

				it("retrieves rows with 'greater than' string filter correctly", async () => {
					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'category', value: 'Beta', condition: 'gt' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(2);
					expect(result.data).toEqual([
						expect.objectContaining({ name: 'Charlie', category: 'Gamma' }),
						expect.objectContaining({ name: 'David', category: 'Delta' }),
					]);
				});

				it("retrieves rows with 'less than' string filter correctly", async () => {
					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'category', value: 'Delta', condition: 'lt' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(2);
					expect(result.data).toEqual([
						expect.objectContaining({ name: 'Alice', category: 'Alpha' }),
						expect.objectContaining({ name: 'Bob', category: 'Beta' }),
					]);
				});
			});

			describe('date comparisons', () => {
				let dataTableId: string;

				beforeEach(async () => {
					const { id } = await dataTableService.createDataTable(project.id, {
						name: 'dataTable',
						columns: [
							{ name: 'name', type: 'string' },
							{ name: 'registeredAt', type: 'date' },
						],
					});
					dataTableId = id;

					const rows = [
						{ name: 'Task1', registeredAt: new Date('2023-12-31T23:59:59.999Z') },
						{ name: 'Task2', registeredAt: new Date('2024-01-01T10:00:00.000Z') },
						{ name: 'Task3', registeredAt: new Date('2024-01-02T00:00:00.000Z') },
						{ name: 'Task4', registeredAt: new Date('2024-01-02T09:59:00.000Z') },
					];

					await dataTableService.insertRows(dataTableId, project.id, rows);
				});

				it("retrieves rows with 'greater than' date filter correctly", async () => {
					// ACT
					const baseDate = new Date('2024-01-01T12:00:00.000Z');
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'registeredAt', value: baseDate, condition: 'gt' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(2);
					expect(result.data).toEqual([
						expect.objectContaining({ name: 'Task3' }),
						expect.objectContaining({ name: 'Task4' }),
					]);
				});

				it("retrieves rows with 'less than or equal' date filter correctly", async () => {
					// ACT
					const baseDate = new Date('2024-01-02');
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'registeredAt', value: baseDate, condition: 'lte' }],
						},
					});

					// ASSERT
					expect(result.count).toEqual(3);
					expect(result.data).toEqual([
						expect.objectContaining({ name: 'Task1' }),
						expect.objectContaining({ name: 'Task2' }),
						expect.objectContaining({ name: 'Task3' }),
					]);
				});

				it('filters by system createdAt column correctly', async () => {
					// ARRANGE
					const inserted = await dataTableService.insertRows(
						dataTableId,
						project.id,
						[{ name: 'TestRow' }],
						'all',
					);

					const createdAtTimestamp = inserted[0].createdAt;

					const midnight = new Date(createdAtTimestamp);
					midnight.setUTCHours(0, 0, 0, 0);

					// ACT - Check the row is not returned if filtered before midnight
					const beforeMidnightResult = await dataTableService.getManyRowsAndCount(
						dataTableId,
						project.id,
						{
							filter: {
								type: 'and',
								filters: [{ columnName: 'createdAt', value: midnight, condition: 'lt' }],
							},
						},
					);

					// ASSERT
					expect(beforeMidnightResult.data.some((row) => row.name === 'TestRow')).toBe(false);

					// ACT - Check the row is returned when using lte on the exact timestamp
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'createdAt', value: createdAtTimestamp, condition: 'lte' }],
						},
					});

					// ASSERT
					expect(result.count).toBeGreaterThanOrEqual(1);
					expect(result.data.some((row) => row.name === 'TestRow')).toBe(true);

					// ACT - Check the row is returned when using lt on the exact timestamp
					const resultLt = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'createdAt', value: createdAtTimestamp, condition: 'lt' }],
						},
					});

					// ASSERT
					expect(resultLt.data.some((row) => row.name === 'TestRow')).toBe(false);
				});

				it('filters by date with timezone offset using eq condition', async () => {
					// ARRANGE
					const dateWithOffset = new Date('2024-01-15T10:30:00.000+03:00');
					const equivalentUtcTime = new Date('2024-01-15T07:30:00.000Z');

					await dataTableService.insertRows(
						dataTableId,
						project.id,
						[{ name: 'TimezoneTest', registeredAt: dateWithOffset }],
						'all',
					);

					// ACT
					const resultWithOffset = await dataTableService.getManyRowsAndCount(
						dataTableId,
						project.id,
						{
							filter: {
								type: 'and',
								filters: [{ columnName: 'registeredAt', value: dateWithOffset, condition: 'eq' }],
							},
						},
					);

					const resultWithUtc = await dataTableService.getManyRowsAndCount(
						dataTableId,
						project.id,
						{
							filter: {
								type: 'and',
								filters: [
									{ columnName: 'registeredAt', value: equivalentUtcTime, condition: 'eq' },
								],
							},
						},
					);

					// ASSERT
					expect(resultWithOffset.count).toBe(1);
					expect(resultWithOffset.data[0].name).toBe('TimezoneTest');
					expect(resultWithUtc.count).toBe(1);
					expect(resultWithUtc.data[0].name).toBe('TimezoneTest');
				});

				it('filters by date finding multiple rows with same UTC time but different offsets', async () => {
					// ARRANGE
					const isoWithOffsetPlus = '2024-01-15T10:30:00.000+05:00';
					const isoWithOffsetMinus = '2024-01-15T02:30:00.000-03:00';
					const equivalentUtcTime = new Date('2024-01-15T05:30:00.000Z');

					await dataTableService.insertRows(dataTableId, project.id, [
						{ name: 'OffsetPlus', registeredAt: isoWithOffsetPlus },
						{ name: 'OffsetMinus', registeredAt: isoWithOffsetMinus },
					]);

					// ACT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'registeredAt', value: equivalentUtcTime, condition: 'eq' }],
						},
					});

					// ASSERT
					expect(result.count).toBe(2);
					expect(result.data.map((r) => r.name).sort()).toEqual(['OffsetMinus', 'OffsetPlus']);
				});

				it('correctly compares dates across timezones with gt/lt filters', async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ name: 'TzEarly', registeredAt: new Date('2025-01-15T08:00:00.000+02:00') },
						{ name: 'TzMiddle', registeredAt: new Date('2025-01-15T12:00:00.000Z') },
						{ name: 'TzLate', registeredAt: new Date('2025-01-15T20:00:00.000+02:00') },
					]);

					// ACT
					const filterDate = new Date('2025-01-15T13:00:00.000+03:00');
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [
								{ columnName: 'registeredAt', value: filterDate, condition: 'gt' },
								{ columnName: 'name', value: 'Tz%', condition: 'like' },
							],
						},
					});

					// ASSERT
					expect(result.count).toBe(2);
					expect(result.data.map((r) => r.name).sort()).toEqual(['TzLate', 'TzMiddle']);

					// ACT
					const resultLt = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [
								{ columnName: 'registeredAt', value: filterDate, condition: 'lt' },
								{ columnName: 'name', value: 'Tz%', condition: 'like' },
							],
						},
					});

					// ASSERT
					expect(resultLt.count).toBe(1);
					expect(resultLt.data[0].name).toBe('TzEarly');
				});
			});

			describe('null value validation', () => {
				let dataTableId: string;

				beforeEach(async () => {
					const { id } = await dataTableService.createDataTable(project.id, {
						name: 'dataTable',
						columns: [
							{ name: 'name', type: 'string' },
							{ name: 'age', type: 'number' },
						],
					});
					dataTableId = id;

					const rows = [
						{ name: 'John', age: 31 },
						{ name: 'Jack', age: 29 },
						{ name: 'Mary', age: null },
					];

					await dataTableService.insertRows(dataTableId, project.id, rows);
				});

				describe.each(['gt', 'gte', 'lt', 'lte'] as const)(
					'%s filter with null values',
					(condition) => {
						it(`throws error when '${condition}' filter value is null`, async () => {
							// ACT
							const result = dataTableService.getManyRowsAndCount(dataTableId, project.id, {
								filter: {
									type: 'and',
									filters: [{ columnName: 'age', value: null, condition }],
								},
							});

							// ASSERT
							await expect(result).rejects.toThrow(
								new DataTableValidationError(
									`${condition.toUpperCase()} filter value cannot be null or undefined`,
								),
							);
						});

						it(`handles null values in data correctly with '${condition}' filter`, async () => {
							// ACT
							const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
								filter: {
									type: 'and',
									filters: [{ columnName: 'age', value: 30, condition }],
								},
							});

							// ASSERT
							// Null values should be excluded from comparison results
							expect(result.count).toBeGreaterThanOrEqual(1);
							expect(result.data.every((row) => row.age !== null)).toBe(true);
						});
					},
				);
			});
		});

		describe('AND filters', () => {
			it('retrieves rows matching all conditions in AND filter', async () => {
				// ARRANGE
				const { id } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
						{ name: 'isActive', type: 'boolean' },
					],
				});

				await dataTableService.insertRows(id, project.id, [
					{ name: 'John', age: 25, isActive: true },
					{ name: 'Mary', age: 30, isActive: true },
					{ name: 'Jack', age: 35, isActive: true },
					{ name: 'Arnold', age: 40, isActive: false },
					{ name: 'Bob', age: 25, isActive: false },
				]);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(id, project.id, {
					filter: {
						type: 'and',
						filters: [
							{ columnName: 'name', value: '%ar%', condition: 'ilike' },
							{ columnName: 'isActive', value: true, condition: 'neq' },
						],
					},
				});

				// ASSERT
				expect(result.count).toEqual(1);
				expect(result.data).toEqual([
					expect.objectContaining({ name: 'Arnold', age: 40, isActive: false }),
				]);
			});

			it('returns empty result when no conditions match', async () => {
				// ARRANGE
				const { id } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
						{ name: 'isActive', type: 'boolean' },
					],
				});

				await dataTableService.insertRows(id, project.id, [
					{ name: 'John', age: 25, isActive: true },
					{ name: 'Mary', age: 30, isActive: false },
					{ name: 'Jack', age: 35, isActive: true },
					{ name: 'Arnold', age: 40, isActive: false },
					{ name: 'Bob', age: 25, isActive: false },
				]);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(id, project.id, {
					filter: {
						type: 'and',
						filters: [
							{ columnName: 'name', value: '%ar%', condition: 'ilike' },
							{ columnName: 'age', value: 50, condition: 'gt' },
						],
					},
				});

				// ASSERT
				expect(result.count).toEqual(0);
				expect(result.data).toEqual([]);
			});
		});

		describe('OR filters', () => {
			it('retrieves rows matching any condition in OR filter', async () => {
				// ARRANGE
				const { id } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
						{ name: 'isActive', type: 'boolean' },
					],
				});

				await dataTableService.insertRows(id, project.id, [
					{ name: 'John', age: 25, isActive: true },
					{ name: 'Mary', age: 30, isActive: false },
					{ name: 'Jack', age: 35, isActive: true },
					{ name: 'Arnold', age: 40, isActive: false },
					{ name: 'Bob', age: 25, isActive: false },
				]);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(id, project.id, {
					filter: {
						type: 'or',
						filters: [
							{ columnName: 'name', value: '%ar%', condition: 'ilike' },
							{ columnName: 'isActive', value: true, condition: 'eq' },
						],
					},
				});

				// ASSERT
				expect(result.count).toEqual(4);
				expect(result.data).toEqual([
					expect.objectContaining({ name: 'John', age: 25, isActive: true }),
					expect.objectContaining({ name: 'Mary', age: 30, isActive: false }),
					expect.objectContaining({ name: 'Jack', age: 35, isActive: true }),
					expect.objectContaining({ name: 'Arnold', age: 40, isActive: false }),
				]);
			});

			it('retrieves rows when multiple conditions match the same row', async () => {
				// ARRANGE
				const { id } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
						{ name: 'isActive', type: 'boolean' },
					],
				});

				await dataTableService.insertRows(id, project.id, [
					{ name: 'John', age: 25, isActive: false },
					{ name: 'Mary', age: 30, isActive: true },
					{ name: 'Arnold', age: 35, isActive: false },
					{ name: 'Alice', age: 40, isActive: false },
					{ name: 'Bob', age: 25, isActive: false },
				]);

				// ACT
				const result = await dataTableService.getManyRowsAndCount(id, project.id, {
					filter: {
						type: 'or',
						filters: [
							{ columnName: 'name', value: 'Mar%', condition: 'like' },
							{ columnName: 'isActive', value: true, condition: 'eq' },
						],
					},
				});

				// ASSERT
				expect(result.count).toEqual(1);
				expect(result.data).toEqual([
					expect.objectContaining({ name: 'Mary', age: 30, isActive: true }),
				]);
			});

			it('returns empty result when no conditions match', async () => {
				// ARRANGE
				const { id } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
						{ name: 'isActive', type: 'boolean' },
					],
				});

				// ACT
				const result = await dataTableService.getManyRowsAndCount(id, project.id, {
					filter: {
						type: 'or',
						filters: [
							{ columnName: 'name', value: 'NonExistent', condition: 'eq' },
							{ columnName: 'age', value: 999, condition: 'eq' },
						],
					},
				});

				// ASSERT
				expect(result.count).toEqual(0);
				expect(result.data).toEqual([]);
			});
		});
	});

	describe('updateRows', () => {
		describe('equals and not equals filters', () => {
			it("updates rows with 'equals' filter correctly", async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
						{ name: 'birthday', type: 'date' },
						{ name: 'isActive', type: 'boolean' },
					],
				});

				const maryBirthday = new Date('1998-08-25T14:30:00.000Z');

				await dataTableService.insertRows(dataTableId, project.id, [
					{ name: 'John', age: 30, birthday: new Date('1994-05-15T12:00:00.000Z'), isActive: true },
					{ name: 'Mary', age: 25, birthday: maryBirthday, isActive: false },
					{ name: 'Jack', age: 35, birthday: new Date('1988-12-05T10:00:00.000Z'), isActive: true },
				]);

				// ACT
				await dataTableService.updateRows(
					dataTableId,
					project.id,
					{
						filter: {
							type: 'and',
							filters: [
								{ columnName: 'name', value: 'Mary', condition: 'eq' },
								{ columnName: 'age', value: 25, condition: 'eq' },
								{ columnName: 'birthday', value: maryBirthday, condition: 'eq' },
								{ columnName: 'isActive', value: false, condition: 'eq' },
							],
						},
						data: { age: 26 },
					},
					true,
				);

				// ASSERT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: 'Mary', condition: 'eq' }],
					},
				});
				expect(result.count).toEqual(1);
				expect(result.data).toEqual([
					expect.objectContaining({
						name: 'Mary',
						age: 26,
						birthday: maryBirthday,
						isActive: false,
					}),
				]);
			});

			it("updates rows with 'not equals' filter correctly", async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
					],
				});

				await dataTableService.insertRows(dataTableId, project.id, [
					{ name: 'John', age: 30 },
					{ name: 'Mary', age: 25 },
					{ name: 'Jack', age: 35 },
				]);

				// ACT
				await dataTableService.updateRows(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: 'Mary', condition: 'neq' }],
					},
					data: { age: 100 },
				});

				// ASSERT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {});
				expect(result.count).toEqual(3);
				expect(result.data).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ name: 'Mary', age: 25 }),
						expect.objectContaining({ name: 'John', age: 100 }),
						expect.objectContaining({ name: 'Jack', age: 100 }),
					]),
				);
			});

			it('updates rows with filter by null', async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'active', type: 'boolean' },
					],
				});

				await dataTableService.insertRows(dataTableId, project.id, [
					{ name: null, active: true },
					{ name: 'Marco', active: true },
					{ name: null, active: false },
					{ name: 'Polo', active: false },
				]);

				// ACT
				await dataTableService.updateRows(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', condition: 'eq', value: null }],
					},
					data: { name: 'unknown' },
				});

				// ASSERT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {});
				expect(result.count).toEqual(4);
				expect(result.data).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ name: 'unknown', active: true }),
						expect.objectContaining({ name: 'Marco', active: true }),
						expect.objectContaining({ name: 'unknown', active: false }),
						expect.objectContaining({ name: 'Polo', active: false }),
					]),
				);
			});

			it('updates rows with filter by not null', async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'active', type: 'boolean' },
					],
				});

				await dataTableService.insertRows(dataTableId, project.id, [
					{ name: null, active: true },
					{ name: 'Marco', active: true },
					{ name: null, active: false },
					{ name: 'Polo', active: false },
				]);

				// ACT
				await dataTableService.updateRows(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', condition: 'neq', value: null }],
					},
					data: { name: 'unknown' },
				});

				// ASSERT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {});
				expect(result.count).toEqual(4);
				expect(result.data).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ name: null, active: true }),
						expect.objectContaining({ name: 'unknown', active: true }),
						expect.objectContaining({ name: null, active: false }),
						expect.objectContaining({ name: 'unknown', active: false }),
					]),
				);
			});
		});

		describe('LIKE filters', () => {
			it("updates rows with 'contains sensitive' filter correctly", async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
					],
				});

				await dataTableService.insertRows(dataTableId, project.id, [
					{ name: 'Arnold', age: 30 },
					{ name: 'Mary', age: 25 },
					{ name: 'Charlie', age: 35 },
				]);

				// ACT
				await dataTableService.updateRows(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: '%ar%', condition: 'like' }],
					},
					data: { age: 50 },
				});

				// ASSERT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'age', value: 50, condition: 'eq' }],
					},
				});
				expect(result.count).toEqual(2);
				expect(result.data).toEqual([
					expect.objectContaining({ name: 'Mary', age: 50 }),
					expect.objectContaining({ name: 'Charlie', age: 50 }),
				]);
			});

			it("updates rows with 'contains insensitive' filter correctly", async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
					],
				});

				const rows = [
					{ name: 'Arnold', age: 30 },
					{ name: 'Mary', age: 25 },
					{ name: 'Charlie', age: 35 },
				];

				await dataTableService.insertRows(dataTableId, project.id, rows);

				// ACT
				await dataTableService.updateRows(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: '%ar%', condition: 'ilike' }],
					},
					data: { age: 55 },
				});

				// ASSERT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {});
				expect(result.count).toEqual(3);
				expect(result.data).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ name: 'Arnold', age: 55 }),
						expect.objectContaining({ name: 'Mary', age: 55 }),
						expect.objectContaining({ name: 'Charlie', age: 55 }),
					]),
				);
			});

			it("updates rows with 'starts with' filter correctly", async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
					],
				});

				const rows = [
					{ name: 'Arnold', age: 30 },
					{ name: 'Mary', age: 25 },
					{ name: 'Charlie', age: 35 },
				];

				await dataTableService.insertRows(dataTableId, project.id, rows);

				// ACT
				await dataTableService.updateRows(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: 'Ar%', condition: 'ilike' }],
					},
					data: { age: 60 },
				});

				// ASSERT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'age', value: 60, condition: 'eq' }],
					},
				});
				expect(result.count).toEqual(1);
				expect(result.data).toEqual([expect.objectContaining({ name: 'Arnold', age: 60 })]);
			});

			it("updates rows with 'ends with' filter correctly", async () => {
				// ARRANGE
				const { id: dataTableId } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
					],
				});

				await dataTableService.insertRows(dataTableId, project.id, [
					{ name: 'Arnold', age: 30 },
					{ name: 'Mary', age: 25 },
					{ name: 'Charlie', age: 35 },
					{ name: 'Harold', age: 40 },
				]);

				// ACT
				await dataTableService.updateRows(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: '%old', condition: 'ilike' }],
					},
					data: { age: 65 },
				});

				// ASSERT
				const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'age', value: 65, condition: 'eq' }],
					},
				});
				expect(result.count).toEqual(2);
				expect(result.data).toEqual([
					expect.objectContaining({ name: 'Arnold', age: 65 }),
					expect.objectContaining({ name: 'Harold', age: 65 }),
				]);
			});
		});

		describe('greater than and less than filters', () => {
			describe('number comparisons', () => {
				let dataTableId: string;

				beforeEach(async () => {
					const { id } = await dataTableService.createDataTable(project.id, {
						name: 'dataTable',
						columns: [
							{ name: 'name', type: 'string' },
							{ name: 'age', type: 'number' },
							{ name: 'position', type: 'string' },
						],
					});
					dataTableId = id;
				});

				it("updates rows with 'greater than' filter correctly", async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ name: 'John', age: 25 },
						{ name: 'Mary', age: 30 },
						{ name: 'Jack', age: 35 },
						{ name: 'Alice', age: 40 },
					]);

					// ACT
					await dataTableService.updateRows(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'age', value: 30, condition: 'gt' }],
						},
						data: { position: 'senior' },
					});

					// ASSERT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'position', value: 'senior', condition: 'eq' }],
						},
					});
					expect(result.count).toEqual(2);
					expect(result.data).toEqual([
						expect.objectContaining({ name: 'Jack', position: 'senior', age: 35 }),
						expect.objectContaining({ name: 'Alice', position: 'senior', age: 40 }),
					]);
				});

				it("updates rows with 'greater than or equal' filter correctly", async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ name: 'John', age: 25 },
						{ name: 'Mary', age: 30 },
						{ name: 'Jack', age: 35 },
						{ name: 'Alice', age: 40 },
					]);

					// ACT
					await dataTableService.updateRows(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'age', value: 30, condition: 'gte' }],
						},
						data: { position: 'experienced' },
					});

					// ASSERT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'position', value: 'experienced', condition: 'eq' }],
						},
					});
					expect(result.count).toEqual(3);
					expect(result.data).toEqual(
						expect.arrayContaining([
							expect.objectContaining({ name: 'Mary', position: 'experienced', age: 30 }),
							expect.objectContaining({ name: 'Jack', position: 'experienced', age: 35 }),
							expect.objectContaining({ name: 'Alice', position: 'experienced', age: 40 }),
						]),
					);
				});

				it("updates rows with 'less than' filter correctly", async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ name: 'John', age: 25 },
						{ name: 'Mary', age: 30 },
						{ name: 'Jack', age: 35 },
						{ name: 'Alice', age: 40 },
					]);

					// ACT
					await dataTableService.updateRows(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'age', value: 35, condition: 'lt' }],
						},
						data: { position: 'junior' },
					});

					// ASSERT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'position', value: 'junior', condition: 'eq' }],
						},
					});
					expect(result.count).toEqual(2);
					expect(result.data).toEqual(
						expect.arrayContaining([
							expect.objectContaining({ name: 'John', position: 'junior', age: 25 }),
							expect.objectContaining({ name: 'Mary', position: 'junior', age: 30 }),
						]),
					);
				});

				it("updates rows with 'less than or equal' filter correctly", async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ name: 'John', age: 25 },
						{ name: 'Mary', age: 30 },
						{ name: 'Jack', age: 35 },
						{ name: 'Alice', age: 40 },
					]);

					// ACT
					await dataTableService.updateRows(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'age', value: 35, condition: 'lte' }],
						},
						data: { position: 'junior' },
					});

					// ASSERT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'position', value: 'junior', condition: 'eq' }],
						},
					});
					expect(result.count).toEqual(3);
					expect(result.data).toEqual(
						expect.arrayContaining([
							expect.objectContaining({ name: 'John', position: 'junior', age: 25 }),
							expect.objectContaining({ name: 'Jack', position: 'junior', age: 35 }),
							expect.objectContaining({ name: 'Mary', position: 'junior', age: 30 }),
						]),
					);
				});
			});

			describe('string comparisons', () => {
				let dataTableId: string;

				beforeEach(async () => {
					const { id } = await dataTableService.createDataTable(project.id, {
						name: 'dataTable',
						columns: [
							{ name: 'name', type: 'string' },
							{ name: 'category', type: 'string' },
							{ name: 'startDate', type: 'date' },
						],
					});
					dataTableId = id;
				});

				it("updates rows with 'greater than' string filter correctly", async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ name: 'Alice', category: 'A', startDate: new Date('2023-01-01T12:00:00Z') },
						{ name: 'Bob', category: 'B', startDate: new Date('2023-01-02T12:00:00Z') },
						{ name: 'Charlie', category: 'C', startDate: new Date('2023-01-03T12:00:00Z') },
						{ name: 'David', category: 'D', startDate: new Date('2023-01-04T12:00:00Z') },
					]);

					// ACT
					const newStartDate = new Date('2024-01-01T12:00:00Z');
					await dataTableService.updateRows(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'category', value: 'C', condition: 'gt' }],
						},
						data: { startDate: newStartDate },
					});

					// ASSERT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'startDate', value: newStartDate, condition: 'eq' }],
						},
					});
					expect(result.count).toEqual(1);
					expect(result.data).toEqual([
						expect.objectContaining({ name: 'David', category: 'D', startDate: newStartDate }),
					]);
				});

				it("updates rows with 'less than' string filter correctly", async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ name: 'Alice', category: 'A', startDate: new Date('2023-01-01T12:00:00Z') },
						{ name: 'Bob', category: 'B', startDate: new Date('2023-01-02T12:00:00Z') },
						{ name: 'Charlie', category: 'C', startDate: new Date('2023-01-03T12:00:00Z') },
						{ name: 'David', category: 'D', startDate: new Date('2023-01-04T12:00:00Z') },
					]);

					// ACT
					const newStartDate = new Date('2024-01-01T12:00:00Z');
					await dataTableService.updateRows(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'category', value: 'C', condition: 'lt' }],
						},
						data: { startDate: newStartDate },
					});

					// ASSERT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'startDate', value: newStartDate, condition: 'eq' }],
						},
					});
					expect(result.count).toEqual(2);
					expect(result.data).toEqual(
						expect.arrayContaining([
							expect.objectContaining({ name: 'Alice', category: 'A', startDate: newStartDate }),
							expect.objectContaining({ name: 'Bob', category: 'B', startDate: newStartDate }),
						]),
					);
				});
			});

			describe('date comparisons', () => {
				let dataTableId: string;

				beforeEach(async () => {
					const { id } = await dataTableService.createDataTable(project.id, {
						name: 'dataTable',
						columns: [
							{ name: 'name', type: 'string' },
							{ name: 'registeredAt', type: 'date' },
						],
					});
					dataTableId = id;
				});

				it("updates rows with 'greater than' date filter correctly", async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ name: 'Task1', registeredAt: new Date('2023-12-31') },
						{ name: 'Task2', registeredAt: new Date('2024-01-01') },
						{ name: 'Task3', registeredAt: new Date('2024-01-02') },
						{ name: 'Task4', registeredAt: new Date('2024-01-03') },
					]);

					// ACT
					const baseDate = new Date('2024-01-01');
					await dataTableService.updateRows(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'registeredAt', value: baseDate, condition: 'gt' }],
						},
						data: { name: 'RECENT' },
					});

					// ASSERT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'name', value: 'RECENT', condition: 'eq' }],
						},
					});
					expect(result.count).toEqual(2);
					expect(result.data).toEqual([
						expect.objectContaining({ name: 'RECENT' }),
						expect.objectContaining({ name: 'RECENT' }),
					]);
				});

				it("updates rows with 'less than or equal' date filter correctly", async () => {
					// ARRANGE
					await dataTableService.insertRows(dataTableId, project.id, [
						{ name: 'Task1', registeredAt: new Date('2023-12-31') },
						{ name: 'Task2', registeredAt: new Date('2024-01-01') },
						{ name: 'Task3', registeredAt: new Date('2024-01-02') },
						{ name: 'Task4', registeredAt: new Date('2024-01-03') },
					]);

					// ACT
					const baseDate = new Date('2024-01-02');
					await dataTableService.updateRows(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'registeredAt', value: baseDate, condition: 'lte' }],
						},
						data: { name: 'OLD' },
					});

					// ASSERT
					const result = await dataTableService.getManyRowsAndCount(dataTableId, project.id, {
						filter: {
							type: 'and',
							filters: [{ columnName: 'name', value: 'OLD', condition: 'eq' }],
						},
					});
					expect(result.count).toEqual(3);
					expect(result.data).toEqual([
						expect.objectContaining({ name: 'OLD' }),
						expect.objectContaining({ name: 'OLD' }),
						expect.objectContaining({ name: 'OLD' }),
					]);
				});
			});
		});

		describe('AND filters', () => {
			it('updates rows matching all conditions in AND filter', async () => {
				// ARRANGE
				const { id } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
						{ name: 'isActive', type: 'boolean' },
					],
				});

				await dataTableService.insertRows(id, project.id, [
					{ name: 'John', age: 25, isActive: true },
					{ name: 'Mary', age: 30, isActive: true },
					{ name: 'Jack', age: 35, isActive: true },
					{ name: 'Arnold', age: 40, isActive: false },
					{ name: 'Bob', age: 25, isActive: false },
				]);

				// ACT
				await dataTableService.updateRows(id, project.id, {
					filter: {
						type: 'and',
						filters: [
							{ columnName: 'name', value: '%ar%', condition: 'ilike' },
							{ columnName: 'isActive', value: true, condition: 'neq' },
						],
					},
					data: { age: 100 },
				});

				// ASSERT
				const result = await dataTableService.getManyRowsAndCount(id, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'age', value: 100, condition: 'eq' }],
					},
				});
				expect(result.count).toEqual(1);
				expect(result.data).toEqual([
					expect.objectContaining({ name: 'Arnold', age: 100, isActive: false }),
				]);
			});
		});

		describe('OR filters', () => {
			it('updates rows matching any condition in OR filter', async () => {
				// ARRANGE
				const { id } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
						{ name: 'isActive', type: 'boolean' },
					],
				});

				await dataTableService.insertRows(id, project.id, [
					{ name: 'John', age: 25, isActive: true },
					{ name: 'Mary', age: 30, isActive: false },
					{ name: 'Jack', age: 35, isActive: true },
					{ name: 'Arnold', age: 40, isActive: false },
					{ name: 'Bob', age: 25, isActive: false },
				]);

				// ACT
				await dataTableService.updateRows(id, project.id, {
					filter: {
						type: 'or',
						filters: [
							{ columnName: 'name', value: '%ar%', condition: 'ilike' },
							{ columnName: 'isActive', value: true, condition: 'eq' },
						],
					},
					data: { age: 99 },
				});

				// ASSERT
				const result = await dataTableService.getManyRowsAndCount(id, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'age', value: 99, condition: 'eq' }],
					},
				});
				expect(result.count).toEqual(4);
				expect(result.data).toEqual([
					expect.objectContaining({ name: 'John', age: 99, isActive: true }),
					expect.objectContaining({ name: 'Mary', age: 99, isActive: false }),
					expect.objectContaining({ name: 'Jack', age: 99, isActive: true }),
					expect.objectContaining({ name: 'Arnold', age: 99, isActive: false }),
				]);
			});

			it('updates rows when multiple conditions match the same row', async () => {
				// ARRANGE
				const { id } = await dataTableService.createDataTable(project.id, {
					name: 'dataTable',
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
						{ name: 'isActive', type: 'boolean' },
					],
				});

				await dataTableService.insertRows(id, project.id, [
					{ name: 'John', age: 25, isActive: false },
					{ name: 'Mary', age: 30, isActive: true },
					{ name: 'Arnold', age: 35, isActive: false },
					{ name: 'Alice', age: 40, isActive: false },
					{ name: 'Bob', age: 25, isActive: false },
				]);

				// ACT
				await dataTableService.updateRows(id, project.id, {
					filter: {
						type: 'or',
						filters: [
							{ columnName: 'name', value: 'Mar%', condition: 'like' },
							{ columnName: 'isActive', value: true, condition: 'eq' },
						],
					},
					data: { age: 88 },
				});

				// ASSERT
				const result = await dataTableService.getManyRowsAndCount(id, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'age', value: 88, condition: 'eq' }],
					},
				});
				expect(result.count).toEqual(1);
				expect(result.data).toEqual([
					expect.objectContaining({ name: 'Mary', age: 88, isActive: true }),
				]);
			});
		});
	});
});
