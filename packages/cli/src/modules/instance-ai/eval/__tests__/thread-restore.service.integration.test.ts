import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import type { PolicyViolation } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableValidationError } from '@/modules/data-table/errors/data-table-validation.error';
import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';

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
			Container.get(PolicyEnforcementService),
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
			Container.get(PolicyEnforcementService),
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

describe('EvalThreadRestoreService.restoreWorkflows (policy seal)', () => {
	const DENIAL: PolicyViolation = {
		kind: 'test-denial',
		checkId: 'integration-test-thread-restore',
		message: 'Denied by the test policy check',
		subject: 'n8n-nodes-base.manualTrigger',
		subjectType: 'nodeType',
	};
	/** Only the seed with this name is refused; `null` allows everything. */
	let denyWorkflowNamed: string | null = null;

	let service: EvalThreadRestoreService;
	let workflowRepository: WorkflowRepository;
	let project: Project;

	const seed = (id: string, name: string) => ({
		id,
		name,
		nodes: [
			{
				id: `${id}-trigger`,
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [240, 300],
				parameters: {},
			},
		],
		connections: {},
	});

	beforeAll(() => {
		workflowRepository = Container.get(WorkflowRepository);
		// Registration is single-shot per process, so one fake backend serves every case.
		Container.get(PolicyEnforcementService).setImplementation({
			enforce: async (_point, context) => ({
				violations:
					'workflow' in context && context.workflow.name === denyWorkflowNamed ? [DENIAL] : [],
			}),
			evaluate: async () => ({ violations: [] }),
			hasChecksFor: () => true,
		});
		service = new EvalThreadRestoreService(
			workflowRepository,
			Container.get(SharedWorkflowRepository),
			Container.get(DataTableService),
			Container.get(PolicyEnforcementService),
		);
	});

	beforeEach(async () => {
		denyWorkflowNamed = null;
		await testDb.truncate(['SharedWorkflow', 'WorkflowEntity']);
		project = await createTeamProject();
	});

	it('persists the seed workflow at its id and makes the project its owner', async () => {
		const created = await service.restoreWorkflows([seed('wf-seeded-1', 'Allowed')], project.id);

		expect(created).toEqual(['wf-seeded-1']);
		const stored = await workflowRepository.findById('wf-seeded-1');
		expect(stored?.nodes).toHaveLength(1);
		expect(stored?.shared.map((s) => s.projectId)).toEqual([project.id]);
	});

	it('a refused seed fails the restore, names the workflow and leaves nothing behind', async () => {
		denyWorkflowNamed = 'Blocked';

		const restore = service.restoreWorkflows(
			[seed('wf-seeded-ok', 'Allowed'), seed('wf-seeded-blocked', 'Blocked')],
			project.id,
		);

		await expect(restore).rejects.toThrow(PolicyViolationError);
		await expect(restore).rejects.toThrow('Seed workflow wf-seeded-blocked ("Blocked")');
		await expect(restore).rejects.toMatchObject({ violations: [DENIAL] });
		expect(await workflowRepository.findByIds(['wf-seeded-ok', 'wf-seeded-blocked'])).toEqual([]);
	});
});
