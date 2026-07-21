import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableValidationError } from '@/modules/data-table/errors/data-table-validation.error';
import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';

import { EvalThreadRestoreService } from '../thread-restore.service';

// TRUST-311: an eval scenario can seed typed data-table rows through the restore
// path. A string id like `row_001` must land in an explicitly `string`-typed
// column (no DataTableValidationError), where a `number` column would reject it.
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

describe('EvalThreadRestoreService.restoreDataTables (seed rows)', () => {
	let service: EvalThreadRestoreService;
	let dataTableService: DataTableService;
	let project: Project;

	beforeAll(() => {
		dataTableService = Container.get(DataTableService);
		service = new EvalThreadRestoreService(
			Container.get(WorkflowRepository),
			Container.get(SharedWorkflowRepository),
			dataTableService,
		);
	});

	beforeEach(async () => {
		project = await createTeamProject();
	});

	afterEach(async () => {
		await dataTableService.deleteDataTableAll();
	});

	it('seeds a string-id row into a string column without a validation error', async () => {
		const idMap = await service.restoreDataTables(
			[
				{
					id: 'job-applications-1234',
					name: 'Job Applications',
					columns: [
						{ name: 'application_id', type: 'string' },
						{ name: 'is_active', type: 'boolean' },
					],
					rows: [
						{ application_id: 'row_001', is_active: true },
						{ application_id: 'row_002', is_active: false },
					],
				},
			],
			project.id,
		);

		const newId = idMap.get('job-applications-1234');
		expect(newId).toBeDefined();

		const { count, data } = await dataTableService.getManyRowsAndCount(newId!, project.id, {});
		expect(count).toBe(2);
		expect(data).toEqual([
			expect.objectContaining({ application_id: 'row_001', is_active: true }),
			expect.objectContaining({ application_id: 'row_002', is_active: false }),
		]);
	});

	it('rejects (and rolls back) a string id declared as a number column', async () => {
		await expect(
			service.restoreDataTables(
				[
					{
						id: 'job-applications-9999',
						name: 'Job Applications',
						columns: [{ name: 'application_id', type: 'number' }],
						rows: [{ application_id: 'row_001' }],
					},
				],
				project.id,
			),
		).rejects.toThrow(DataTableValidationError);

		// Rolled back: no table survives the failed seed.
		const tables = await dataTableService.getManyAndCount({ filter: { projectId: project.id } });
		expect(tables.count).toBe(0);
	});
});

// TRUST-311 follow-up: scenario tables are created empty before the build turn,
// then row-seeded per scenario. reseedDataTableRows must REPLACE (clear then
// insert) the existing rows, not append — so each scenario runs against exactly
// the state it declared, regardless of what a prior scenario or the build left.
describe('EvalThreadRestoreService.reseedDataTableRows', () => {
	let service: EvalThreadRestoreService;
	let dataTableService: DataTableService;
	let project: Project;
	let tableId: string;

	beforeAll(() => {
		dataTableService = Container.get(DataTableService);
		service = new EvalThreadRestoreService(
			Container.get(WorkflowRepository),
			Container.get(SharedWorkflowRepository),
			dataTableService,
		);
	});

	beforeEach(async () => {
		project = await createTeamProject();
		const created = await dataTableService.createDataTable(project.id, {
			name: 'Job Applications',
			columns: [{ name: 'application_id', type: 'string' }],
		});
		tableId = created.id;
	});

	afterEach(async () => {
		await dataTableService.deleteDataTableAll();
	});

	it('seeds rows into an empty pre-created table', async () => {
		await service.reseedDataTableRows(tableId, project.id, [{ application_id: 'row_001' }]);

		const { count, data } = await dataTableService.getManyRowsAndCount(tableId, project.id, {});
		expect(count).toBe(1);
		expect(data).toEqual([expect.objectContaining({ application_id: 'row_001' })]);
	});

	it('replaces the prior scenario rows rather than appending them', async () => {
		await service.reseedDataTableRows(tableId, project.id, [
			{ application_id: 'row_001' },
			{ application_id: 'row_002' },
		]);
		await service.reseedDataTableRows(tableId, project.id, [{ application_id: 'row_003' }]);

		const { count, data } = await dataTableService.getManyRowsAndCount(tableId, project.id, {});
		expect(count).toBe(1);
		expect(data).toEqual([expect.objectContaining({ application_id: 'row_003' })]);
	});

	it('clears the table when seeded with no rows', async () => {
		await service.reseedDataTableRows(tableId, project.id, [{ application_id: 'row_001' }]);
		await service.reseedDataTableRows(tableId, project.id, []);

		const { count } = await dataTableService.getManyRowsAndCount(tableId, project.id, {});
		expect(count).toBe(0);
	});
});
