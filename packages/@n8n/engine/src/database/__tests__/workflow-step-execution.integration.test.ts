import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { StepSlots, StepStatus } from '../../execution/execution.types';
import { StepNotFoundError, type NewStepRecord } from '../../execution/step-store';
import { createDataSource } from '../data-source';
import { WorkflowExecution } from '../entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../entities/workflow-step-execution.entity';
import { TypeOrmStepStore } from '../typeorm-step-store';

describe('workflow_step_execution table (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let dataSource: DataSource;

	beforeAll(async () => {
		container = await new PostgreSqlContainer(postgresVersions.primary).start();
		dataSource = createDataSource(container.getConnectionUri());
		await dataSource.initialize();
		await dataSource.runMigrations();
	}, 120_000);

	afterAll(async () => {
		if (dataSource?.isInitialized) await dataSource.destroy();
		if (container) await container.stop();
	});

	/** Steps FK to an execution, so create a parent row first. */
	async function createExecution(): Promise<string> {
		const repo = dataSource.getRepository(WorkflowExecution);
		const execution = repo.create({
			workflowId: 'wf-1',
			status: 'running',
			mode: 'production',
			graph: { nodes: [], edges: [] },
			triggerPayload: null,
			finishedAt: null,
		});
		await repo.save(execution);
		return execution.id;
	}

	/** Most cases need one step; the store's API is the batch `createSteps`. */
	async function createStep(
		store: TypeOrmStepStore,
		executionId: string,
		record: NewStepRecord,
	): Promise<{ id: string }> {
		const [step] = await store.createSteps(executionId, [record]);
		return step;
	}

	/** Fixture-only: seeds a row in a status the creation contract forbids. */
	async function seedStep(record: {
		executionId: string;
		nodeId: string;
		status: StepStatus;
		outputs?: StepSlots;
	}): Promise<{ id: string }> {
		const repo = dataSource.getRepository(WorkflowStepExecution);
		const row = await repo.save(repo.create(record));
		return { id: row.id };
	}

	it('persists and retrieves a step row', async () => {
		const executionId = await createExecution();
		const repo = dataSource.getRepository(WorkflowStepExecution);

		const created = repo.create({ executionId, nodeId: 'node-a', status: 'queued' });
		await repo.save(created);

		const found = await repo.findOneOrFail({ where: { id: created.id } });
		expect(found.executionId).toBe(executionId);
		expect(found.nodeId).toBe('node-a');
		expect(found.status).toBe('queued');
		expect(found.createdAt).toBeInstanceOf(Date);
	});

	it('TypeOrmStepStore.createSteps persists a queued step and returns its id', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));

		const { id } = await createStep(store, executionId, { nodeId: 'x', status: 'queued' });

		const found = await dataSource
			.getRepository(WorkflowStepExecution)
			.findOneOrFail({ where: { id } });
		expect(found.nodeId).toBe('x');
		expect(found.status).toBe('queued');
	});

	it('TypeOrmStepStore.createSteps persists a batch and returns ids in input order', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));

		const ids = await store.createSteps(executionId, [
			{ nodeId: 'trigger', status: 'completed', outputs: [{}] },
			{ nodeId: 'a', status: 'queued' },
			{ nodeId: 'b', status: 'queued' },
		]);

		expect(ids).toHaveLength(3);
		expect(new Set(ids.map(({ id }) => id)).size).toBe(3);
		// the returned ids line up positionally with the records passed in
		const repo = dataSource.getRepository(WorkflowStepExecution);
		const rows = await Promise.all(
			ids.map(async ({ id }) => await repo.findOneOrFail({ where: { id } })),
		);
		expect(rows.map((r) => [r.nodeId, r.status])).toEqual([
			['trigger', 'completed'],
			['a', 'queued'],
			['b', 'queued'],
		]);
	});

	it('TypeOrmStepStore.createSteps is a no-op for an empty batch', async () => {
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		expect(await store.createSteps('00000000-0000-7000-8000-000000000000', [])).toEqual([]);
	});

	it.each([
		{
			violation: 'a transition-only status',
			record: { nodeId: 'x', status: 'failed' },
			message: 'transition method',
		},
		{
			violation: 'outputs on a non-completed step',
			record: { nodeId: 'x', status: 'queued', outputs: [{}] },
			message: 'with outputs',
		},
		{
			violation: 'a completed step without outputs',
			record: { nodeId: 'x', status: 'completed' },
			message: 'without a slot list',
		},
		{
			violation: 'a completed step with null outputs',
			record: { nodeId: 'x', status: 'completed', outputs: null },
			message: 'without a slot list',
		},
	])('TypeOrmStepStore.createSteps rejects $violation at runtime', async ({ record, message }) => {
		// the casts simulate a caller outside the type system
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));

		await expect(
			store.createSteps(executionId, [record as unknown as NewStepRecord]),
		).rejects.toMatchObject({
			name: 'UnexpectedError',
			message: expect.stringContaining(message) as string,
		});
	});

	it('cascades step deletion when the parent execution is deleted', async () => {
		const executionId = await createExecution();
		const stepRepo = dataSource.getRepository(WorkflowStepExecution);
		await stepRepo.save(stepRepo.create({ executionId, nodeId: 'a', status: 'queued' }));

		await dataSource.getRepository(WorkflowExecution).delete({ id: executionId });

		expect(await stepRepo.count({ where: { executionId } })).toBe(0);
	});

	it('rejects a step referencing a non-existent execution (foreign key)', async () => {
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		await expect(
			createStep(store, '00000000-0000-7000-8000-000000000000', { nodeId: 'a', status: 'queued' }),
		).rejects.toThrow();
	});

	it('TypeOrmStepStore.loadStep returns the step, or throws when absent', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await createStep(store, executionId, { nodeId: 'node-a', status: 'queued' });

		const step = await store.loadStep(id);

		// `toMatchObject`: the adapter returns the entity, which carries columns the
		// `StepRecord` interface doesn't expose.
		expect(step).toMatchObject({
			id,
			executionId,
			nodeId: 'node-a',
			status: 'queued',
			outputs: null,
			error: null,
		});
		await expect(store.loadStep('00000000-0000-7000-8000-000000000000')).rejects.toThrow(
			StepNotFoundError,
		);
	});

	it('TypeOrmStepStore.claimStep only claims a queued step', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await createStep(store, executionId, { nodeId: 'a', status: 'queued' });

		// the winning claim gets the step back, already `running`
		expect(await store.claimStep(id)).toEqual({
			id,
			executionId,
			nodeId: 'a',
			status: 'running',
			outputs: null,
			error: null,
		});
		// second claim of the same step loses the race
		expect(await store.claimStep(id)).toBeNull();
		expect((await store.loadStep(id)).status).toBe('running');
	});

	it('TypeOrmStepStore.claimStep refuses once any step in the execution failed', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		// b is planned first, then a's failure lands before b's step:ready is claimed
		const { id } = await createStep(store, executionId, { nodeId: 'b', status: 'queued' });
		await seedStep({ executionId, nodeId: 'a', status: 'failed' });

		expect(await store.claimStep(id)).toBeNull();
		expect((await store.loadStep(id)).status).toBe('queued');

		// a failure in one execution doesn't block claims in another
		const otherExecutionId = await createExecution();
		const other = await createStep(store, otherExecutionId, { nodeId: 'a', status: 'queued' });
		expect(await store.claimStep(other.id)).not.toBeNull();
	});

	it('TypeOrmStepStore.createSteps creates nothing once any step in the execution failed', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		await seedStep({ executionId, nodeId: 'a', status: 'failed' });

		// rows planned after the cancellation sweep would be stuck queued forever
		const created = await store.createSteps(executionId, [{ nodeId: 'b', status: 'queued' }]);

		expect(created).toEqual([]);
		const stepRepo = dataSource.getRepository(WorkflowStepExecution);
		expect(await stepRepo.count({ where: { executionId } })).toBe(1);
	});

	it('TypeOrmStepStore.createSteps waits out a concurrently committing failure and creates nothing', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const failing = await seedStep({ executionId, nodeId: 'a', status: 'running' });

		const failure = dataSource.createQueryRunner();
		await failure.connect();
		await failure.startTransaction();
		await failure.query('SELECT id FROM workflow_execution WHERE id = $1 FOR NO KEY UPDATE', [
			executionId,
		]);
		await failure.query("UPDATE workflow_step_execution SET status = 'failed' WHERE id = $1", [
			failing.id,
		]);

		// the insert must park on the execution lock until the failure commits
		const create = store.createSteps(executionId, [{ nodeId: 'b', status: 'queued' }]);
		await new Promise((resolve) => setTimeout(resolve, 150));
		await failure.commitTransaction();
		await failure.release();

		expect(await create).toEqual([]);
	});

	it('TypeOrmStepStore.claimStep waits out a concurrently committing failure and refuses', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const failing = await seedStep({ executionId, nodeId: 'a', status: 'running' });
		const { id } = await createStep(store, executionId, { nodeId: 'b', status: 'queued' });

		// A failStep mid-transaction, with the lock held and the failed row
		// uncommitted. Without the lock, the claim would see no failure and succeed.
		const failure = dataSource.createQueryRunner();
		await failure.connect();
		await failure.startTransaction();
		await failure.query('SELECT id FROM workflow_execution WHERE id = $1 FOR NO KEY UPDATE', [
			executionId,
		]);
		await failure.query("UPDATE workflow_step_execution SET status = 'failed' WHERE id = $1", [
			failing.id,
		]);

		// the claim must park on the execution lock until the failure commits
		const claim = store.claimStep(id);
		await new Promise((resolve) => setTimeout(resolve, 150));
		await failure.commitTransaction();
		await failure.release();

		expect(await claim).toBeNull();
		expect((await store.loadStep(id)).status).toBe('queued');
	});

	it('TypeOrmStepStore.completeStep persists outputs and marks the step completed', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await seedStep({ executionId, nodeId: 'a', status: 'running' });

		expect(await store.completeStep(id, [[{ json: { ok: true } }]])).toBe(true);

		const step = await store.loadStep(id);
		expect(step.status).toBe('completed');
		expect(step.outputs).toEqual([[{ json: { ok: true } }]]);
	});

	it('TypeOrmStepStore.completeStep and failStep only record a step that is running', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await createStep(store, executionId, { nodeId: 'a', status: 'queued' });

		expect(await store.completeStep(id, [[{ json: { ok: true } }]])).toBe(false);
		expect(await store.failStep(id, { name: 'Error', message: 'node blew up' })).toBe(false);

		// neither the status nor the result columns moved
		const found = await dataSource
			.getRepository(WorkflowStepExecution)
			.findOneOrFail({ where: { id } });
		expect(found.status).toBe('queued');
		expect(found.outputs).toBeNull();
		expect(found.error).toBeNull();
	});

	it('TypeOrmStepStore.cancelQueuedSteps cancels queued steps and nothing else', async () => {
		const executionId = await createExecution();
		const otherExecutionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id: queuedId } = await createStep(store, executionId, {
			nodeId: 'a',
			status: 'queued',
		});
		const { id: runningId } = await seedStep({
			executionId,
			nodeId: 'b',
			status: 'running',
		});
		const { id: completedId } = await createStep(store, executionId, {
			nodeId: 'c',
			status: 'completed',
			outputs: [{}],
		});
		// scoped to the execution: a sibling execution's queued work is untouched
		const { id: otherId } = await createStep(store, otherExecutionId, {
			nodeId: 'a',
			status: 'queued',
		});

		await store.cancelQueuedSteps(executionId);

		expect((await store.loadStep(queuedId)).status).toBe('cancelled');
		expect((await store.loadStep(runningId)).status).toBe('running');
		expect((await store.loadStep(completedId)).status).toBe('completed');
		expect((await store.loadStep(otherId)).status).toBe('queued');
	});

	it('TypeOrmStepStore.failStep persists the error and marks the step failed', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await seedStep({ executionId, nodeId: 'a', status: 'running' });

		const error = {
			name: 'Error',
			message: 'node blew up',
			stack: 'Error: node blew up\n    at somewhere',
			details: { httpCode: '500' },
		};
		expect(await store.failStep(id, error)).toBe(true);

		const found = await dataSource
			.getRepository(WorkflowStepExecution)
			.findOneOrFail({ where: { id } });
		expect(found.status).toBe('failed');
		expect(found.error).toEqual(error);
	});

	it('TypeOrmStepStore.createSteps persists a skipped step (settled at birth)', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));

		const { id } = await createStep(store, executionId, { nodeId: 'x', status: 'skipped' });

		const step = await store.loadStep(id);
		expect(step.status).toBe('skipped');
		expect(step.outputs).toBeNull();
		expect(step.error).toBeNull();
	});

	it('TypeOrmStepStore.loadStepsByNodeIds returns rows keyed by node id, omitting absent nodes', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id: aId } = await seedStep({ executionId, nodeId: 'a', status: 'running' });
		// a multi-slot output with a dead slot round-trips as stored
		await store.completeStep(aId, [[{ json: { from: 'a' } }], null]);
		const { id: bId } = await createStep(store, executionId, { nodeId: 'b', status: 'skipped' });
		await createStep(store, executionId, { nodeId: 'c', status: 'queued' });
		// scoped to the execution: a sibling execution's row for 'a' must not leak in
		const otherExecutionId = await createExecution();
		await createStep(store, otherExecutionId, { nodeId: 'a', status: 'queued' });

		const steps = await store.loadStepsByNodeIds(executionId, ['a', 'b', 'c', 'd']);

		// 'd' has no row, so it has no key — absence means "not planned yet"
		expect(Object.keys(steps).sort()).toEqual(['a', 'b', 'c']);
		expect(steps.a).toMatchObject({
			id: aId,
			status: 'completed',
			outputs: [[{ json: { from: 'a' } }], null],
		});
		expect(steps.b).toMatchObject({ id: bId, status: 'skipped', outputs: null });
		expect(steps.c).toMatchObject({ status: 'queued', outputs: null });
	});

	it('TypeOrmStepStore.loadStepSummaries reports per-slot liveness without payloads', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id: aId } = await seedStep({ executionId, nodeId: 'a', status: 'running' });
		// slot 0 has data, slot 1 was never fired, slot 2 ran but produced zero
		// items — [] is live, only JSON null marks a dead slot
		await store.completeStep(aId, [[{ json: { big: 'payload' } }], null, []]);
		const { id: bId } = await createStep(store, executionId, { nodeId: 'b', status: 'skipped' });
		await createStep(store, executionId, { nodeId: 'c', status: 'queued' });
		// scoped to the execution: a sibling execution's row for 'a' must not leak in
		const otherExecutionId = await createExecution();
		await createStep(store, otherExecutionId, { nodeId: 'a', status: 'queued' });

		const summaries = await store.loadStepSummaries(executionId, ['a', 'b', 'c', 'd']);

		expect(Object.keys(summaries).sort()).toEqual(['a', 'b', 'c']);
		expect(summaries.a).toEqual({
			id: aId,
			nodeId: 'a',
			status: 'completed',
			filledOutputSlots: [true, false, true],
		});
		expect(summaries.b).toEqual({
			id: bId,
			nodeId: 'b',
			status: 'skipped',
			filledOutputSlots: [],
		});
		expect(summaries.c).toMatchObject({ status: 'queued', filledOutputSlots: [] });
	});

	it('TypeOrmStepStore.loadStepSummaries is a no-op for no node ids', async () => {
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		expect(await store.loadStepSummaries('00000000-0000-7000-8000-000000000000', [])).toEqual({});
	});

	it('TypeOrmStepStore.loadStepsByNodeIds is a no-op for no node ids', async () => {
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		expect(await store.loadStepsByNodeIds('00000000-0000-7000-8000-000000000000', [])).toEqual({});
	});

	it('TypeOrmStepStore.countSettledSteps counts terminal rows only, per execution', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		await store.createSteps(executionId, [
			{ nodeId: 'trigger', status: 'completed', outputs: [{}] },
			{ nodeId: 'a', status: 'skipped' },
			{ nodeId: 'c', status: 'queued' },
		]);
		await seedStep({ executionId, nodeId: 'b', status: 'cancelled' });
		await seedStep({ executionId, nodeId: 'd', status: 'running' });
		const { id: eId } = await seedStep({ executionId, nodeId: 'e', status: 'running' });
		await store.failStep(eId, { name: 'Error', message: 'node blew up' });
		// a sibling execution's settled rows must not count
		const otherExecutionId = await createExecution();
		await createStep(store, otherExecutionId, { nodeId: 'x', status: 'completed', outputs: [{}] });

		// trigger, a, b, e — not c (queued) or d (running)
		expect(await store.countSettledSteps(executionId)).toBe(4);
	});

	it('rejects an invalid status (check constraint)', async () => {
		const executionId = await createExecution();
		const repo = dataSource.getRepository(WorkflowStepExecution);
		await expect(
			repo.save(repo.create({ executionId, nodeId: 'a', status: 'bogus' as StepStatus })),
		).rejects.toThrow();
	});

	// Planning leans on this: two workers that concurrently decide the same step is
	// ready both insert, and the loser is skipped rather than duplicating the node.
	it('TypeOrmStepStore.createSteps skips a node already planned, keeping the rest', async () => {
		const executionId = await createExecution();
		const repo = dataSource.getRepository(WorkflowStepExecution);
		const store = new TypeOrmStepStore(repo);
		await createStep(store, executionId, { nodeId: 'a', status: 'queued' });

		// 'a' is taken; 'b' is not, and must still land — the whole point of skipping
		// the conflict rather than failing the statement
		const created = await store.createSteps(executionId, [
			{ nodeId: 'a', status: 'queued' },
			{ nodeId: 'b', status: 'queued' },
		]);

		expect(created).toEqual([{ id: expect.any(String) as string, nodeId: 'b' }]);
		// `count({ where })`, not `countBy`, for the reason given in `loadStep`
		expect(await repo.count({ where: { executionId, nodeId: 'a' } })).toBe(1);
		expect(await repo.count({ where: { executionId, nodeId: 'b' } })).toBe(1);
	});

	it('scopes the one-step-per-node key to a single execution', async () => {
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const executionId = await createExecution();
		const otherExecutionId = await createExecution();
		await createStep(store, executionId, { nodeId: 'a', status: 'queued' });

		const created = await store.createSteps(otherExecutionId, [{ nodeId: 'a', status: 'queued' }]);

		expect(created).toEqual([{ id: expect.any(String) as string, nodeId: 'a' }]);
	});
});
