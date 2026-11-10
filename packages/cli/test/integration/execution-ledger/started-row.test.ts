import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { ExecutionLedger } from '@n8n/backend-services';
import type { CreateExecutionPayload, Project, WorkflowEntity } from '@n8n/db';
import { ExecutionRepository, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { claimAllLedgerRows } from '@n8n/backend-module-execution-ledger/testing';
import { ExecutionLedgerModule } from '@n8n/backend-module-execution-ledger/module';
import { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { packagedModules } from '@/modules/modules.manifest';

describe('execution ledger started rows', () => {
	let project: Project;
	let workflow: WorkflowEntity;
	let persistence: ExecutionPersistence;

	beforeAll(async () => {
		await testModules.loadModules(['execution-ledger'], packagedModules);
		await testDb.init();
		await new ExecutionLedgerModule().init();
		persistence = Container.get(ExecutionPersistence);
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'Project']);
		await claimAllLedgerRows();
		project = await createTeamProject('Ledger project');
		workflow = await createWorkflow({ name: 'Ledger workflow' }, project);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const payload = (overrides: Partial<CreateExecutionPayload> = {}): CreateExecutionPayload => ({
		workflowId: workflow.id,
		data: createEmptyRunExecutionData(),
		workflowData: workflow,
		mode: 'trigger',
		status: 'new',
		finished: false,
		...overrides,
	});

	const executionExists = async (id: string) =>
		(await Container.get(ExecutionRepository).findOneBy({ id })) !== null;

	it('writes one started row with the run facts', async () => {
		const executionId = await persistence.create(payload(), {}, { source: 'instance_ai' });

		const rows = await claimAllLedgerRows();
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			executionId,
			event: 'started',
			outcome: 'none',
			entityId: workflow.id,
			entityName: 'Ledger workflow',
			projectId: project.id,
			mode: 'trigger',
			source: 'instance_ai',
		});
	});

	it('rolls back the row with the poll cursor transaction', async () => {
		let executionId = '';

		await expect(
			Container.get(TransactionRunner).run({}, async (ctx) => {
				executionId = await persistence.create(payload(), ctx);
				throw new Error('cursor commit failed');
			}),
		).rejects.toThrow('cursor commit failed');

		expect(await executionExists(executionId)).toBe(false);
		expect(await claimAllLedgerRows()).toEqual([]);
	});

	it('rolls back the execution row when the ledger write fails', async () => {
		const ledger = Container.get(ExecutionLedger);
		const recordStarted = ledger.recordStarted.bind(ledger);
		let executionId = '';
		vi.spyOn(ledger, 'recordStarted').mockImplementation(async (facts, ctx) => {
			executionId = facts.executionId;
			await recordStarted(facts, ctx);
			throw new Error('insert failed');
		});

		await expect(persistence.create(payload())).rejects.toThrow('insert failed');

		expect(await executionExists(executionId)).toBe(false);
		expect(await claimAllLedgerRows()).toEqual([]);
	});

	it('writes no row and keeps the run when the workflow has no owner project', async () => {
		const unowned = await createWorkflow({ name: 'Unowned' });

		const executionId = await persistence.create(
			payload({ workflowId: unowned.id, workflowData: unowned, status: 'error' }),
		);

		expect(await executionExists(executionId)).toBe(true);
		expect(await claimAllLedgerRows()).toEqual([]);
	});

	it('writes a blocked ended row for a run created finished', async () => {
		const executionId = await persistence.create(
			payload({ status: 'error', stoppedAt: new Date() }),
		);

		const rows = await claimAllLedgerRows();
		expect(
			rows.map(({ executionId: id, event, outcome, blockedBy }) => ({
				id,
				event,
				outcome,
				blockedBy,
			})),
		).toEqual([
			{ id: executionId, event: 'started', outcome: 'none', blockedBy: 'none' },
			{ id: executionId, event: 'ended', outcome: 'blocked', blockedBy: 'startFailed' },
		]);
	});

	it('writes a blocked ended row for a reclaimed tombstone', async () => {
		const deduplicationKey = `${workflow.id}:node-1:1700000000000`;
		const tombstoneId = await persistence.create(payload({ deduplicationKey }));
		await claimAllLedgerRows();

		const replacementId = await persistence.create(payload({ deduplicationKey }));

		expect(await executionExists(tombstoneId)).toBe(false);
		const rows = await claimAllLedgerRows();
		expect(
			rows.map(({ executionId, event, outcome, blockedBy }) => ({
				executionId,
				event,
				outcome,
				blockedBy,
			})),
		).toEqual([
			{ executionId: tombstoneId, event: 'ended', outcome: 'blocked', blockedBy: 'startFailed' },
			{ executionId: replacementId, event: 'started', outcome: 'none', blockedBy: 'none' },
		]);
	});

	it('writes no row for an imported run', async () => {
		await persistence.create(payload({ status: 'error' }), {}, { skipLedger: true });

		expect(await claimAllLedgerRows()).toEqual([]);
	});

	// Wait resume, chat resume, poll claim and enqueued recovery all take over the row this way.
	it.each(['new', 'waiting'] as const)(
		'writes no second started row when a run takes over a %s row',
		async (expectedStatus) => {
			const executionId = await persistence.create(payload({ status: expectedStatus }));
			await claimAllLedgerRows();
			const runData: IWorkflowExecutionDataProcess = {
				executionMode: 'trigger',
				workflowData: workflow,
				executionData: createEmptyRunExecutionData(),
			};

			await Container.get(ActiveExecutions).add(runData, { executionId, expectedStatus });

			expect(await claimAllLedgerRows()).toEqual([]);
		},
	);
});
