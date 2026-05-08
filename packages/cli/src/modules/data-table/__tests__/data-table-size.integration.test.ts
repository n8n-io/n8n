import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { Telemetry } from '@/telemetry';
import { createUser } from '@test-integration/db/users';

import { DataTableSizeValidator } from '../data-table-size-validator.service';
import { DataTableRepository } from '../data-table.repository';
import { DataTableService } from '../data-table.service';
import { DataTableValidationError } from '../errors/data-table-validation.error';

beforeAll(async () => {
	mockInstance(Telemetry);
	await testModules.loadModules(['data-table']);
	await testDb.init();
});

beforeEach(async () => {
	const dataTableService = Container.get(DataTableService);
	await dataTableService.deleteDataTableAll();
	await testDb.truncate(['DataTable', 'DataTableColumn']);

	const dataTableSizeValidator = Container.get(DataTableSizeValidator);
	dataTableSizeValidator.reset();
});

afterAll(async () => {
	await testDb.terminate();
});

// Sum of UTF-8 bytes of all values in a set of row objects.
const rowsPayloadBytes = (rows: Array<Record<string, unknown>>): number => {
	let total = 0;
	for (const row of rows) {
		for (const value of Object.values(row)) {
			total += Buffer.byteLength(String(value), 'utf8');
		}
	}
	return total;
};

// Deterministic filler with low compressibility so Postgres pglz cannot squash large payloads to near-zero in TOAST.
const makeFillerString = (seed: number, length: number): string => {
	let out = '';
	let x = (seed * 2654435761) >>> 0;
	while (out.length < length) {
		x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
		out += x.toString(36).padStart(7, '0');
	}
	return out.slice(0, length);
};

describe('Data Table Size Tests', () => {
	let dataTableService: DataTableService;
	let dataTableRepository: DataTableRepository;

	beforeAll(() => {
		dataTableService = Container.get(DataTableService);
		dataTableRepository = Container.get(DataTableRepository);
	});

	let project1: Project;

	beforeEach(async () => {
		project1 = await createTeamProject();
	});

	describe('size validation', () => {
		it('should prevent insertRows when size limit exceeded', async () => {
			// ARRANGE
			const dataTableSizeValidator = Container.get(DataTableSizeValidator);
			dataTableSizeValidator.reset();

			const maxSize = Container.get(GlobalConfig).dataTable.maxSize;

			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'data', type: 'string' }],
			});

			const mockFindDataTablesSize = jest
				.spyOn(dataTableRepository, 'findDataTablesSize')
				.mockResolvedValue({ totalBytes: maxSize + 1, dataTables: {} });

			// ACT & ASSERT
			await expect(
				dataTableService.insertRows(dataTableId, project1.id, [{ data: 'test' }]),
			).rejects.toThrow(DataTableValidationError);

			expect(mockFindDataTablesSize).toHaveBeenCalled();
			mockFindDataTablesSize.mockRestore();
		});

		it('should prevent updateRows when size limit exceeded', async () => {
			// ARRANGE
			const dataTableSizeValidator = Container.get(DataTableSizeValidator);
			dataTableSizeValidator.reset();

			const maxSize = Container.get(GlobalConfig).dataTable.maxSize;

			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'data', type: 'string' }],
			});

			// Now mock the size check to be over limit
			const mockFindDataTablesSize = jest
				.spyOn(dataTableRepository, 'findDataTablesSize')
				.mockResolvedValue({ totalBytes: maxSize + 1, dataTables: {} });

			// ACT & ASSERT
			await expect(
				dataTableService.updateRows(dataTableId, project1.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'id', condition: 'eq', value: 1 }],
					},
					data: { data: 'updated' },
				}),
			).rejects.toThrow(DataTableValidationError);

			expect(mockFindDataTablesSize).toHaveBeenCalled();
			mockFindDataTablesSize.mockRestore();
		});

		it('should prevent upsertRow when size limit exceeded (insert case)', async () => {
			// ARRANGE

			const maxSize = Container.get(GlobalConfig).dataTable.maxSize;

			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'dataTable',
				columns: [{ name: 'data', type: 'string' }],
			});

			const mockFindDataTablesSize = jest
				.spyOn(dataTableRepository, 'findDataTablesSize')
				.mockResolvedValue({ totalBytes: maxSize + 1, dataTables: {} });

			// ACT & ASSERT
			await expect(
				dataTableService.upsertRow(dataTableId, project1.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'data', condition: 'eq', value: 'nonexistent' }],
					},
					data: { data: 'new' },
				}),
			).rejects.toThrow(DataTableValidationError);

			expect(mockFindDataTablesSize).toHaveBeenCalled();
			mockFindDataTablesSize.mockRestore();
		});
	});

	describe('getDataTablesSize', () => {
		let owner: User;
		let regularUser: User;
		let project2: Project;

		beforeEach(async () => {
			project2 = await createTeamProject();

			owner = await createUser({ role: GLOBAL_OWNER_ROLE });
			await linkUserToProject(owner, project1, 'project:admin');
			await linkUserToProject(owner, project2, 'project:admin');

			regularUser = await createUser({
				role: GLOBAL_MEMBER_ROLE,
			});
		});

		it('should return all data tables for admin user', async () => {
			// ARRANGE
			const dataTable1 = await dataTableService.createDataTable(project1.id, {
				name: 'project1-dataTable',
				columns: [{ name: 'data', type: 'string' }],
			});

			const dataTable2 = await dataTableService.createDataTable(project2.id, {
				name: 'project2-dataTable',
				columns: [{ name: 'data', type: 'string' }],
			});

			const dt1Rows = new Array(1000).fill(0).map((_, i) => ({ data: `test_data_${i}` }));
			const dt2Rows = [{ data: 'test' }];
			const dt1PayloadBytes = rowsPayloadBytes(dt1Rows);

			await dataTableService.insertRows(dataTable1.id, project1.id, dt1Rows);

			await dataTableService.insertRows(dataTable2.id, project2.id, dt2Rows);

			// ACT
			const result = await dataTableService.getDataTablesSize(owner);

			// ASSERT
			expect(result).toBeDefined();
			expect(result.totalBytes).toBeGreaterThan(0);
			expect(result.quotaStatus).toBe('ok');
			expect(result.dataTables).toBeDefined();

			expect(Object.keys(result.dataTables)).toHaveLength(2);
			expect(result.dataTables[dataTable1.id]).toBeDefined();
			expect(result.dataTables[dataTable2.id]).toBeDefined();

			// Check info
			expect(result.dataTables[dataTable1.id].name).toBe('project1-dataTable');
			expect(result.dataTables[dataTable1.id].projectId).toBe(project1.id);
			expect(result.dataTables[dataTable2.id].name).toBe('project2-dataTable');
			expect(result.dataTables[dataTable2.id].projectId).toBe(project2.id);

			// Reported size must include at least the raw payload bytes...
			expect(result.dataTables[dataTable1.id].sizeBytes).toBeGreaterThanOrEqual(dt1PayloadBytes);
			// ...and not be wildly larger than payload + reasonable per-row overhead and indexes.
			expect(result.dataTables[dataTable1.id].sizeBytes).toBeLessThanOrEqual(dt1PayloadBytes * 50);
			// dt2 is too small for a payload-relative bound (page overhead dominates), so use absolutes.
			expect(result.dataTables[dataTable2.id].sizeBytes).toBeGreaterThan(0);
			expect(result.dataTables[dataTable2.id].sizeBytes).toBeLessThanOrEqual(1024 * 1024);
			expect(result.dataTables[dataTable1.id].sizeBytes).toBeGreaterThan(
				result.dataTables[dataTable2.id].sizeBytes,
			);

			// Total should be sum of individual tables
			const expectedTotal =
				result.dataTables[dataTable1.id].sizeBytes + result.dataTables[dataTable2.id].sizeBytes;
			expect(result.totalBytes).toBe(expectedTotal);
		});

		it('should return only accessible project data tables for regular user', async () => {
			// ARRANGE
			await linkUserToProject(regularUser, project1, 'project:viewer');

			const dataTable1 = await dataTableService.createDataTable(project1.id, {
				name: 'accessible-dataTable',
				columns: [{ name: 'data', type: 'string' }],
			});

			const dataTable2 = await dataTableService.createDataTable(project2.id, {
				name: 'inaccessible-dataTable',
				columns: [{ name: 'data', type: 'string' }],
			});

			await dataTableService.insertRows(dataTable1.id, project1.id, [{ data: 'accessible' }]);
			await dataTableService.insertRows(dataTable2.id, project2.id, [{ data: 'inaccessible' }]);

			// ACT
			const result = await dataTableService.getDataTablesSize(regularUser);

			// ASSERT
			expect(result).toBeDefined();
			expect(result.totalBytes).toBeGreaterThan(0);
			expect(result.quotaStatus).toBe('ok');
			expect(result.dataTables).toBeDefined();

			expect(Object.keys(result.dataTables)).toHaveLength(1);
			expect(result.dataTables[dataTable1.id]).toBeDefined();
			expect(result.dataTables[dataTable2.id]).toBeUndefined(); // No access

			expect(result.dataTables[dataTable1.id].name).toBe('accessible-dataTable');
			expect(result.dataTables[dataTable1.id].projectId).toBe(project1.id);
		});

		it('should return empty dataTables but full totalBytes when user has no project access', async () => {
			// ARRANGE
			const dataTable1 = await dataTableService.createDataTable(project1.id, {
				name: 'inaccessible-dataTable1',
				columns: [{ name: 'data', type: 'string' }],
			});

			const dataTable2 = await dataTableService.createDataTable(project2.id, {
				name: 'inaccessible-dataTable2',
				columns: [{ name: 'data', type: 'string' }],
			});

			// Add data to both
			await dataTableService.insertRows(dataTable1.id, project1.id, [{ data: 'test1' }]);
			await dataTableService.insertRows(dataTable2.id, project2.id, [{ data: 'test2' }]);

			// ACT
			const result = await dataTableService.getDataTablesSize(regularUser);

			// ASSERT
			expect(result).toBeDefined();
			expect(result.totalBytes).toBeGreaterThan(0); // Instance-wide size
			expect(result.quotaStatus).toBe('ok');
			expect(result.dataTables).toBeDefined();
			expect(Object.keys(result.dataTables)).toHaveLength(0); // No accessible tables
		});

		it('should return empty result when no data tables exist', async () => {
			// ACT
			const result = await dataTableService.getDataTablesSize(owner);

			// ASSERT
			expect(result).toBeDefined();
			expect(result.totalBytes).toBe(0);
			expect(result.dataTables).toBeDefined();
			expect(Object.keys(result.dataTables)).toHaveLength(0);
		});

		it('should report size growth proportional to inserted payload', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataTableService.createDataTable(project1.id, {
				name: 'differential-dataTable',
				columns: [{ name: 'data', type: 'string' }],
			});

			// Each value is large enough to trigger Postgres TOAST out-of-line storage (>2KB);
			// reported size must include the TOAST relation to reflect actual disk usage.
			const ROW_COUNT = 50;
			const PAYLOAD_PER_ROW = 4 * 1024;
			const rows = Array.from({ length: ROW_COUNT }, (_, i) => ({
				data: makeFillerString(i, PAYLOAD_PER_ROW),
			}));
			const payloadBytes = rowsPayloadBytes(rows);

			// ACT
			const before = await dataTableService.getDataTablesSize(owner);
			const beforeSize = before.dataTables[dataTableId]?.sizeBytes ?? 0;

			// insertRows resets the size cache, so the next read re-queries the DB.
			await dataTableService.insertRows(dataTableId, project1.id, rows);

			const after = await dataTableService.getDataTablesSize(owner);
			const afterSize = after.dataTables[dataTableId].sizeBytes;
			const delta = afterSize - beforeSize;

			// ASSERT
			// Even after TOAST compression, the growth must reflect a meaningful fraction of
			// the payload — a delta near zero would indicate out-of-line storage is uncounted.
			expect(delta).toBeGreaterThanOrEqual(payloadBytes * 0.1);
			expect(delta).toBeLessThanOrEqual(payloadBytes * 20);
		});

		it('should handle data tables with no rows', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'emptyDataTable',
				columns: [{ name: 'data', type: 'string' }],
			});

			// ACT
			const result = await dataTableService.getDataTablesSize(owner);

			// ASSERT
			expect(result).toBeDefined();
			expect(result.totalBytes).toBeGreaterThanOrEqual(0);
			expect(result.dataTables).toBeDefined();
			expect(result.dataTables[dataTable.id]).toBeDefined();
			expect(result.dataTables[dataTable.id].sizeBytes).toBeGreaterThanOrEqual(0);
			expect(result.dataTables[dataTable.id].name).toBe('emptyDataTable');
		});
	});

	describe('caching behavior', () => {
		let owner: User;
		let regularUser: User;

		beforeEach(async () => {
			owner = await createUser({ role: GLOBAL_OWNER_ROLE });
			await linkUserToProject(owner, project1, 'project:admin');

			// user with no access to project1
			regularUser = await createUser({ role: GLOBAL_MEMBER_ROLE });
		});

		it('should cache data globally and filter based on user permissions', async () => {
			// ARRANGE
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'test-dataTable',
				columns: [{ name: 'data', type: 'string' }],
			});

			await dataTableService.insertRows(dataTable.id, project1.id, [{ data: 'test' }]);

			const mockFindDataTablesSize = jest.spyOn(dataTableRepository, 'findDataTablesSize');

			// ACT & ASSERT
			// First call - regular user sees no data tables (filtered from global cache)
			const userResult = await dataTableService.getDataTablesSize(regularUser);
			expect(Object.keys(userResult.dataTables)).toHaveLength(0);
			expect(userResult.totalBytes).toBeGreaterThan(0);

			// Second call - owner sees the data table (same global cache, different filtering)
			const ownerResult = await dataTableService.getDataTablesSize(owner);
			expect(Object.keys(ownerResult.dataTables)).toHaveLength(1);
			expect(ownerResult.dataTables[dataTable.id]).toBeDefined();

			// Should have called the repository only once (global cache shared)
			expect(mockFindDataTablesSize).toHaveBeenCalledTimes(1);

			// Cleanup
			mockFindDataTablesSize.mockRestore();
		});

		it('should use global cache for both data fetching and size validation', async () => {
			// ARRANGE
			const dataTableSizeValidator = Container.get(DataTableSizeValidator);
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'test-dataTable',
				columns: [{ name: 'data', type: 'string' }],
			});

			await dataTableService.insertRows(dataTable.id, project1.id, [{ data: 'test' }]);

			const mockGetCachedSizeData = jest.spyOn(dataTableSizeValidator, 'getCachedSizeData');
			const mockFindDataTablesSize = jest.spyOn(dataTableRepository, 'findDataTablesSize');

			// ACT
			// Fetch data (uses global cache)
			await dataTableService.getDataTablesSize(owner);

			// Insert more data (triggers size validation which should use same cache)
			await dataTableService.insertRows(dataTable.id, project1.id, [{ data: 'test2' }]);

			// ASSERT
			// Should have called getCachedSizeData twice:
			// 1. Once for getDataTablesSize
			// 2. Once for size validation during insertRows
			expect(mockGetCachedSizeData).toHaveBeenCalledTimes(2);

			// Repository should be called only once - both operations use the same global cache
			expect(mockFindDataTablesSize).toHaveBeenCalledTimes(1);

			// Cleanup
			mockGetCachedSizeData.mockRestore();
			mockFindDataTablesSize.mockRestore();
		});

		it('should invalidate cache on data modifications', async () => {
			// ARRANGE
			const dataTableSizeValidator = Container.get(DataTableSizeValidator);
			const dataTable = await dataTableService.createDataTable(project1.id, {
				name: 'test-dataTable',
				columns: [{ name: 'data', type: 'string' }],
			});

			const mockReset = jest.spyOn(dataTableSizeValidator, 'reset');
			const mockFindDataTablesSize = jest.spyOn(dataTableRepository, 'findDataTablesSize');

			// ACT & ASSERT
			const result1 = await dataTableService.getDataTablesSize(owner);
			expect(result1.totalBytes).toBeGreaterThanOrEqual(0);
			expect(mockFindDataTablesSize).toHaveBeenCalledTimes(1);

			// Inserting new data should reset cache
			await dataTableService.insertRows(dataTable.id, project1.id, [{ data: 'test' }]);
			expect(mockReset).toHaveBeenCalledTimes(1);

			// Fetch data again (should call repository again due to cache reset)
			await dataTableService.getDataTablesSize(owner);
			expect(mockFindDataTablesSize).toHaveBeenCalledTimes(2);

			// Update data (should reset cache again)
			await dataTableService.updateRows(dataTable.id, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'data', condition: 'eq', value: 'test' }],
				},
				data: { data: 'updated' },
			});
			expect(mockReset).toHaveBeenCalledTimes(2);

			// Upsert data (should reset cache again)
			await dataTableService.upsertRow(dataTable.id, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'data', condition: 'eq', value: 'nonexistent' }],
				},
				data: { data: 'inserted' },
			});
			expect(mockReset).toHaveBeenCalledTimes(3);

			// Delete data (should reset cache again)
			await dataTableService.deleteRows(dataTable.id, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'data', condition: 'eq', value: 'updated' }],
				},
			});
			expect(mockReset).toHaveBeenCalledTimes(4);

			// Cleanup
			mockReset.mockRestore();
			mockFindDataTablesSize.mockRestore();
		});
	});
});
