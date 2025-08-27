/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { ListDataStoreContentFilterConditionType } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Project } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataStoreService } from '../data-store.service';
import { DataStoreValidationError } from '../errors/data-store-validation.error';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['DataTable', 'DataTableColumn']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('dataStore filters', () => {
	let dataStoreService: DataStoreService;

	beforeAll(() => {
		dataStoreService = Container.get(DataStoreService);
	});

	let project: Project;

	beforeEach(async () => {
		project = await createTeamProject();
	});

	afterEach(async () => {
		// Clean up any created user data stores
		await dataStoreService.deleteDataStoreAll();
	});

	describe('getManyAndCount', () => {
		it('should retrieve by name', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project.id, {
				name: 'dataStore',
				columns: [],
			});

			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project.id, name: dataStore.name },
			});

			// ASSERT
			expect(result.data).toHaveLength(1);
			expect(result.data[0]).toEqual({
				...dataStore,
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
			const dataStore1 = await dataStoreService.createDataStore(project.id, {
				name: 'myDataStore1',
				columns: [],
			});

			const dataStore2 = await dataStoreService.createDataStore(project.id, {
				name: 'myDataStore2',
				columns: [],
			});

			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project.id, id: [dataStore1.id, dataStore2.id] },
			});

			// ASSERT
			expect(result.data).toHaveLength(2);
			expect(result.data).toContainEqual({
				...dataStore2,
				project: expect.any(Project),
			});
			expect(result.data).toContainEqual({
				...dataStore1,
				project: expect.any(Project),
			});
			expect(result.count).toEqual(2);
		});

		it('should retrieve by projectId', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project.id, {
				name: 'myDataStore',
				columns: [],
			});
			const names = [dataStore.name];
			for (let i = 0; i < 10; ++i) {
				const ds = await dataStoreService.createDataStore(project.id, {
					name: `anotherDataStore${i}`,
					columns: [],
				});
				names.push(ds.name);
			}

			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project.id },
			});

			// ASSERT
			expect(result.data.map((x) => x.name).sort()).toEqual(names.sort());
			expect(result.count).toEqual(11);
		});

		it('should retrieve by id with pagination', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project.id, {
				name: 'myDataStore',
				columns: [],
			});
			const names = [dataStore.name];

			for (let i = 0; i < 10; ++i) {
				const ds = await dataStoreService.createDataStore(project.id, {
					name: `anotherDataStore${i}`,
					columns: [],
				});
				names.push(ds.name);
			}

			// ACT
			const p0 = await dataStoreService.getManyAndCount({
				filter: { projectId: project.id },
				skip: 0,
				take: 3,
			});
			const p1 = await dataStoreService.getManyAndCount({
				filter: { projectId: project.id },
				skip: 3,
				take: 3,
			});
			const rest = await dataStoreService.getManyAndCount({
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
				const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
					name: 'dataStore',
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

				await dataStoreService.insertRows(dataStoreId, project.id, rows);

				// ACT
				const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', value: 'Mary', condition: 'eq' }],
					},
				});

				// ASSERT
				expect(result.count).toEqual(1);
				expect(result.data).toEqual([expect.objectContaining({ name: 'Mary', age: 25 })]);
			});

			it("retrieves rows with 'not equals' filter correctly", async () => {
				// ARRANGE
				const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
					name: 'dataStore',
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

				await dataStoreService.insertRows(dataStoreId, project.id, rows);

				// ACT
				const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
				const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
					name: 'dataStore',
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

				await dataStoreService.insertRows(dataStoreId, project.id, rows);

				// ACT
				const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
				const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
					name: 'dataStore',
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

				await dataStoreService.insertRows(dataStoreId, project.id, rows);

				// ACT
				const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
		});

		describe('LIKE filters', () => {
			it("retrieves rows with 'contains sensitive' filter correctly", async () => {
				// ARRANGE
				const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
					name: 'dataStore',
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

				await dataStoreService.insertRows(dataStoreId, project.id, rows);

				// ACT
				const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
				const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
					name: 'dataStore',
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

				await dataStoreService.insertRows(dataStoreId, project.id, rows);

				// ACT
				const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
				const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
					name: 'dataStore',
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

				await dataStoreService.insertRows(dataStoreId, project.id, rows);

				// ACT
				const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
				const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
					name: 'dataStore',
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

				await dataStoreService.insertRows(dataStoreId, project.id, rows);

				// ACT
				const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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

			describe.each(['like', 'ilike'] as ListDataStoreContentFilterConditionType[])(
				'%s filter validation',
				(condition) => {
					it(`throws error when '${condition}' filter value is null`, async () => {
						// ARRANGE
						const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
							name: 'dataStore',
							columns: [
								{ name: 'name', type: 'string' },
								{ name: 'age', type: 'number' },
							],
						});

						const rows = [
							{ name: 'John', age: 30 },
							{ name: 'Mary', age: 25 },
						];

						await dataStoreService.insertRows(dataStoreId, project.id, rows);

						// ACT
						const result = dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
							filter: {
								type: 'and',
								filters: [{ columnName: 'name', value: null, condition }],
							},
						});

						// ASSERT
						await expect(result).rejects.toThrow(
							new DataStoreValidationError(
								`${condition.toUpperCase()} filter value cannot be null or undefined`,
							),
						);
					});

					it(`throws error when '${condition}' filter value is not a string`, async () => {
						// ARRANGE
						const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
							name: 'dataStore',
							columns: [
								{ name: 'name', type: 'string' },
								{ name: 'age', type: 'number' },
							],
						});

						const rows = [
							{ name: 'John', age: 30 },
							{ name: 'Mary', age: 25 },
						];

						await dataStoreService.insertRows(dataStoreId, project.id, rows);

						// ACT
						const result = dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
							filter: {
								type: 'and',
								filters: [{ columnName: 'age', value: 123, condition }],
							},
						});

						// ASSERT
						await expect(result).rejects.toThrow(
							new DataStoreValidationError(
								`${condition.toUpperCase()} filter value must be a string`,
							),
						);
					});
				},
			);

			describe('like filter with special characters', () => {
				let dataStoreId: string;

				beforeEach(async () => {
					const { id } = await dataStoreService.createDataStore(project.id, {
						name: 'dataStore',
						columns: [{ name: 'text', type: 'string' }],
					});
					dataStoreId = id;
				});

				it('should treat square brackets literally in like patterns', async () => {
					// ARRANGE
					await dataStoreService.insertRows(dataStoreId, project.id, [
						{ text: 'test[abc]data' },
						{ text: 'Test[abc]Data' },
						{ text: 'testAdata' },
						{ text: 'testBdata' },
					]);

					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					await dataStoreService.insertRows(dataStoreId, project.id, [
						{ text: 'test*data' },
						{ text: 'Test*Data' },
						{ text: 'testAdata' },
						{ text: 'testABCdata' },
					]);

					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					await dataStoreService.insertRows(dataStoreId, project.id, [
						{ text: 'test?data' },
						{ text: 'Test?Data' },
						{ text: 'testAdata' },
						{ text: 'testXdata' },
					]);

					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					await dataStoreService.insertRows(dataStoreId, project.id, [
						{ text: 'data%more' },
						{ text: 'Data%More' },
						{ text: 'datamore' },
						{ text: 'dataABCmore' },
						{ text: 'different' },
					]);

					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					await dataStoreService.insertRows(dataStoreId, project.id, [
						{ text: 'prefix_suffix' },
						{ text: 'Prefix_Suffix' },
						{ text: 'prefix\\_suffix' },
						{ text: 'prefixAsuffix' },
						{ text: 'prefixsuffix' },
					]);

					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					await dataStoreService.insertRows(dataStoreId, project.id, [
						{ text: 'test[*?]data' },
						{ text: 'Test[*?]Data' },
						{ text: 'testOtherData' },
						{ text: 'test123data' },
					]);

					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
				let dataStoreId: string;

				beforeEach(async () => {
					const { id } = await dataStoreService.createDataStore(project.id, {
						name: 'dataStore',
						columns: [{ name: 'text', type: 'string' }],
					});
					dataStoreId = id;
				});

				it('should treat square brackets literally', async () => {
					// ARRANGE
					await dataStoreService.insertRows(dataStoreId, project.id, [
						{ text: 'test[abc]data' },
						{ text: 'Test[ABC]Data' },
						{ text: 'testAdata' },
						{ text: 'testBdata' },
					]);

					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					await dataStoreService.insertRows(dataStoreId, project.id, [
						{ text: 'test*data' },
						{ text: 'Test*Data' },
						{ text: 'testOtherData' },
						{ text: 'testABCdata' },
					]);

					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					await dataStoreService.insertRows(dataStoreId, project.id, [
						{ text: 'test?data' },
						{ text: 'Test?Data' },
						{ text: 'testSingleChar' },
						{ text: 'testMultiChar' },
					]);

					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					await dataStoreService.insertRows(dataStoreId, project.id, [
						{ text: 'data%more' },
						{ text: 'Data%More' },
						{ text: 'datamore' },
						{ text: 'DataMore' },
						{ text: 'dataABCmore' },
						{ text: 'DataABCMore' },
						{ text: 'different' },
					]);

					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					await dataStoreService.insertRows(dataStoreId, project.id, [
						{ text: 'prefix_suffix' },
						{ text: 'Prefix_Suffix' },
						{ text: 'Prefix\\_Suffix' },
						{ text: 'prefixASuffix' },
						{ text: 'prefixsuffix' },
					]);

					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					await dataStoreService.insertRows(dataStoreId, project.id, [
						{ text: 'test[*?]data' },
						{ text: 'Test[*?]Data' },
						{ text: 'testOtherData' },
						{ text: 'test123data' },
					]);

					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
				let dataStoreId: string;

				beforeEach(async () => {
					const { id } = await dataStoreService.createDataStore(project.id, {
						name: 'dataStore',
						columns: [
							{ name: 'name', type: 'string' },
							{ name: 'age', type: 'number' },
						],
					});
					dataStoreId = id;

					const rows = [
						{ name: 'John', age: 25 },
						{ name: 'Mary', age: 30 },
						{ name: 'Jack', age: 35 },
						{ name: 'Alice', age: 40 },
					];

					await dataStoreService.insertRows(dataStoreId, project.id, rows);
				});

				it("retrieves rows with 'greater than' filter correctly", async () => {
					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
				let dataStoreId: string;

				beforeEach(async () => {
					const { id } = await dataStoreService.createDataStore(project.id, {
						name: 'dataStore',
						columns: [
							{ name: 'name', type: 'string' },
							{ name: 'category', type: 'string' },
						],
					});
					dataStoreId = id;

					const rows = [
						{ name: 'Alice', category: 'Alpha' },
						{ name: 'Bob', category: 'Beta' },
						{ name: 'Charlie', category: 'Gamma' },
						{ name: 'David', category: 'Delta' },
					];

					await dataStoreService.insertRows(dataStoreId, project.id, rows);
				});

				it("retrieves rows with 'greater than' string filter correctly", async () => {
					// ACT
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
				let dataStoreId: string;

				beforeEach(async () => {
					const { id } = await dataStoreService.createDataStore(project.id, {
						name: 'dataStore',
						columns: [
							{ name: 'name', type: 'string' },
							{ name: 'registeredAt', type: 'date' },
						],
					});
					dataStoreId = id;

					const rows = [
						{ name: 'Task1', registeredAt: new Date('2023-12-31') },
						{ name: 'Task2', registeredAt: new Date('2024-01-01') },
						{ name: 'Task3', registeredAt: new Date('2024-01-02') },
						{ name: 'Task4', registeredAt: new Date('2024-01-03') },
					];

					await dataStoreService.insertRows(dataStoreId, project.id, rows);
				});

				it("retrieves rows with 'greater than' date filter correctly", async () => {
					// ACT
					const baseDate = new Date('2024-01-01');
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
						filter: {
							type: 'and',
							filters: [
								{ columnName: 'registeredAt', value: baseDate.toISOString(), condition: 'gt' },
							],
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
					const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
						filter: {
							type: 'and',
							filters: [
								{ columnName: 'registeredAt', value: baseDate.toISOString(), condition: 'lte' },
							],
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
			});

			describe('null value validation', () => {
				let dataStoreId: string;

				beforeEach(async () => {
					const { id } = await dataStoreService.createDataStore(project.id, {
						name: 'dataStore',
						columns: [
							{ name: 'name', type: 'string' },
							{ name: 'age', type: 'number' },
						],
					});
					dataStoreId = id;

					const rows = [
						{ name: 'John', age: 31 },
						{ name: 'Jack', age: 29 },
						{ name: 'Mary', age: null },
					];

					await dataStoreService.insertRows(dataStoreId, project.id, rows);
				});

				describe.each(['gt', 'gte', 'lt', 'lte'] as const)(
					'%s filter with null values',
					(condition) => {
						it(`throws error when '${condition}' filter value is null`, async () => {
							// ACT
							const result = dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
								filter: {
									type: 'and',
									filters: [{ columnName: 'age', value: null, condition }],
								},
							});

							// ASSERT
							await expect(result).rejects.toThrow(
								new DataStoreValidationError(
									`${condition.toUpperCase()} filter value cannot be null or undefined`,
								),
							);
						});

						it(`handles null values in data correctly with '${condition}' filter`, async () => {
							// ACT
							const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project.id, {
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
	});
});
