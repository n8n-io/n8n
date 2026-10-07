import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import {
	type Project,
	type User,
	UserRepository,
	WorkflowRepository,
	postgresMigrations,
	wrapMigration,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { createUser } from '@test-integration/db/users';

import { WorkflowProvenanceRepository } from '../workflow-provenance.repository';

let provenance: WorkflowProvenanceRepository;
let project: Project;
let builder: User;

const setCreatedAt = async (workflowId: string, iso: string) =>
	await provenance.update({ workflowId }, { createdAt: new Date(iso) });

beforeAll(async () => {
	// The instance-ai entities reference Agents tables, so load the agents module too.
	await testModules.loadModules(['agents', 'instance-ai']);
	await testDb.init();
	provenance = Container.get(WorkflowProvenanceRepository);
});
beforeEach(async () => {
	builder = await createUser();
	project = await createTeamProject();
});
afterEach(async () => {
	await provenance.clear();
});
afterAll(async () => await testDb.terminate());

describe('recordIfAbsent', () => {
	it('stores the workflow, thread, user and a creation time', async () => {
		const workflow = await createWorkflow({}, project);
		const threadId = randomUUID();
		const before = Date.now();

		await provenance.recordIfAbsent(workflow.id, threadId, builder.id);

		const row = await provenance.findForWorkflow(workflow.id);
		expect(row).toMatchObject({ workflowId: workflow.id, threadId, createdByUserId: builder.id });
		expect(row?.createdAt).toBeInstanceOf(Date);
		// The database clock and the test clock can differ by a little.
		expect(row!.createdAt.getTime()).toBeGreaterThanOrEqual(before - 5_000);
	});

	it('keeps the first record when the same workflow is recorded again', async () => {
		const workflow = await createWorkflow({}, project);
		const firstThreadId = randomUUID();
		const otherUser = await createUser();

		await provenance.recordIfAbsent(workflow.id, firstThreadId, builder.id);
		await provenance.recordIfAbsent(workflow.id, randomUUID(), otherUser.id);

		expect(await provenance.count()).toBe(1);
		expect(await provenance.findForWorkflow(workflow.id)).toMatchObject({
			threadId: firstThreadId,
			createdByUserId: builder.id,
		});
	});

	it('stores one record when the same workflow is recorded in parallel', async () => {
		const workflow = await createWorkflow({}, project);

		const results = await Promise.allSettled(
			Array.from(
				{ length: 3 },
				async () => await provenance.recordIfAbsent(workflow.id, randomUUID(), builder.id),
			),
		);

		expect(results.every(({ status }) => status === 'fulfilled')).toBe(true);
		expect(await provenance.count()).toBe(1);
	});

	it('rejects a workflow id that does not exist', async () => {
		await expect(
			provenance.recordIfAbsent('missing-workflow', randomUUID(), builder.id),
		).rejects.toThrow(/foreign key/i);
		expect(await provenance.count()).toBe(0);
	});
});

describe('foreign keys', () => {
	it('deletes the record when its workflow is deleted', async () => {
		const workflow = await createWorkflow({}, project);
		const kept = await createWorkflow({}, project);
		await provenance.recordIfAbsent(workflow.id, randomUUID(), builder.id);
		await provenance.recordIfAbsent(kept.id, randomUUID(), builder.id);

		await Container.get(WorkflowRepository).delete(workflow.id);

		expect(await provenance.findForWorkflow(workflow.id)).toBeNull();
		expect(await provenance.findForWorkflow(kept.id)).not.toBeNull();
	});

	it('keeps the record without a user when the user is deleted', async () => {
		const workflow = await createWorkflow({}, project);
		const threadId = randomUUID();
		await provenance.recordIfAbsent(workflow.id, threadId, builder.id);

		await Container.get(UserRepository).delete(builder.id);

		expect(await provenance.findForWorkflow(workflow.id)).toMatchObject({
			workflowId: workflow.id,
			threadId,
			createdByUserId: null,
		});
		expect(await provenance.listWorkflowIdsCreatedBy(builder.id, 10)).toEqual([]);
	});
});

describe('listWorkflowIdsCreatedBy', () => {
	it('returns only the user’s workflows, newest first, up to the limit', async () => {
		const [oldest, middle, newest, foreign] = await Promise.all(
			Array.from({ length: 4 }, async () => await createWorkflow({}, project)),
		);
		const otherUser = await createUser();
		await provenance.recordIfAbsent(oldest.id, randomUUID(), builder.id);
		await provenance.recordIfAbsent(middle.id, randomUUID(), builder.id);
		await provenance.recordIfAbsent(newest.id, randomUUID(), builder.id);
		await provenance.recordIfAbsent(foreign.id, randomUUID(), otherUser.id);
		await setCreatedAt(oldest.id, '2026-01-01T00:00:00.000Z');
		await setCreatedAt(middle.id, '2026-01-02T00:00:00.000Z');
		await setCreatedAt(newest.id, '2026-01-03T00:00:00.000Z');

		expect(await provenance.listWorkflowIdsCreatedBy(builder.id, 10)).toEqual([
			newest.id,
			middle.id,
			oldest.id,
		]);
		expect(await provenance.listWorkflowIdsCreatedBy(builder.id, 2)).toEqual([
			newest.id,
			middle.id,
		]);
	});
});

describe('listForWorkflowIds', () => {
	it('returns name and active flag, newest first, up to the limit', async () => {
		const inactive = await createWorkflow({ name: 'Inactive one' }, project);
		const active = await createActiveWorkflow({ name: 'Active one' }, project);
		const notRequested = await createWorkflow({}, project);
		const threadIds = { inactive: randomUUID(), active: randomUUID() };
		await provenance.recordIfAbsent(inactive.id, threadIds.inactive, builder.id);
		await provenance.recordIfAbsent(active.id, threadIds.active, builder.id);
		await provenance.recordIfAbsent(notRequested.id, randomUUID(), builder.id);
		await setCreatedAt(inactive.id, '2026-02-01T00:00:00.000Z');
		await setCreatedAt(active.id, '2026-02-02T00:00:00.000Z');

		const rows = await provenance.listForWorkflowIds([inactive.id, active.id], 10);

		expect(rows).toEqual([
			{
				workflowId: active.id,
				threadId: threadIds.active,
				createdAt: new Date('2026-02-02T00:00:00.000Z'),
				name: 'Active one',
				active: true,
			},
			{
				workflowId: inactive.id,
				threadId: threadIds.inactive,
				createdAt: new Date('2026-02-01T00:00:00.000Z'),
				name: 'Inactive one',
				active: false,
			},
		]);
		expect(await provenance.listForWorkflowIds([inactive.id, active.id], 1)).toEqual([rows[0]]);
	});

	it('leaves out archived workflows', async () => {
		const archived = await createWorkflow({ isArchived: true }, project);
		const live = await createWorkflow({}, project);
		await provenance.recordIfAbsent(archived.id, randomUUID(), builder.id);
		await provenance.recordIfAbsent(live.id, randomUUID(), builder.id);

		const rows = await provenance.listForWorkflowIds([archived.id, live.id], 10);

		expect(rows.map(({ workflowId }) => workflowId)).toEqual([live.id]);
	});

	it('returns no rows for no ids or a zero limit', async () => {
		const workflow = await createWorkflow({}, project);
		await provenance.recordIfAbsent(workflow.id, randomUUID(), builder.id);

		expect(await provenance.listForWorkflowIds([], 10)).toEqual([]);
		expect(await provenance.listForWorkflowIds([workflow.id], 0)).toEqual([]);
	});
});

it('reverts and reapplies the provenance schema', async () => {
	const db = Container.get(DataSource);
	// Template databases skip migrate(), which normally installs the DSL wrappers.
	postgresMigrations.forEach(wrapMigration);
	const migration = db.migrations.find(
		({ constructor }) => constructor.name === 'CreateWorkflowProvenanceTable1791398770059',
	);
	if (!migration) throw new Error('The workflow provenance migration is not registered.');
	const runner = db.createQueryRunner();
	try {
		await migration.down(runner);
		try {
			expect(await runner.hasTable(provenance.metadata.tablePath)).toBe(false);
		} finally {
			await migration.up(runner);
		}
	} finally {
		await runner.release();
	}
	const workflow = await createWorkflow({}, project);
	await provenance.recordIfAbsent(workflow.id, randomUUID(), builder.id);
	expect(await provenance.count()).toBe(1);
});
