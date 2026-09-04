import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type {
	StepResume,
	StepSlots,
	StepStatus,
	WaitDeclaration,
} from '../../execution/execution.types';
import { StepNotFoundError, type NewStepRecord } from '../../execution/step-store';
import { createDataSource } from '../data-source';
import { WorkflowExecution } from '../entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../entities/workflow-step-execution.entity';
import { generateId } from '../generate-id';
import { TypeOrmExecutionViewStore } from '../typeorm-execution-view-store';
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

	/** The read path over the same table, for the step-view cases below. */
	function viewStore(): TypeOrmExecutionViewStore {
		return new TypeOrmExecutionViewStore(
			dataSource.getRepository(WorkflowExecution),
			dataSource.getRepository(WorkflowStepExecution),
		);
	}

	/** Steps FK to an execution, so create a parent row first. */
	async function createExecution(): Promise<string> {
		const repo = dataSource.getRepository(WorkflowExecution);
		const execution = repo.create({
			id: generateId(),
			workflowId: 'wf-1',
			status: 'running',
			mode: 'production',
			graph: { nodes: [], edges: [] },
			triggerOutputs: null,
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
		iteration?: number;
		status: StepStatus;
		outputs?: StepSlots;
		wait?: WaitDeclaration;
		waitTill?: Date | null;
		resume?: StepResume;
	}): Promise<{ id: string }> {
		const repo = dataSource.getRepository(WorkflowStepExecution);
		const row = await repo.save(repo.create(record));
		return { id: row.id };
	}

	it('persists and retrieves a step row', async () => {
		const executionId = await createExecution();
		const repo = dataSource.getRepository(WorkflowStepExecution);

		const created = repo.create({ executionId, nodeId: 'node-a', iteration: 0, status: 'queued' });
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

		const { id } = await createStep(store, executionId, {
			nodeId: 'x',
			iteration: 0,
			status: 'queued',
		});

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
			{ nodeId: 'trigger', iteration: 0, status: 'completed', outputs: [{}] },
			{ nodeId: 'a', iteration: 0, status: 'queued' },
			{ nodeId: 'b', iteration: 0, status: 'queued' },
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
			record: { nodeId: 'x', iteration: 0, status: 'failed' },
			message: 'transition method',
		},
		{
			violation: 'outputs on a non-completed step',
			record: { nodeId: 'x', iteration: 0, status: 'queued', outputs: [{}] },
			message: 'with outputs',
		},
		{
			violation: 'a completed step without outputs',
			record: { nodeId: 'x', iteration: 0, status: 'completed' },
			message: 'without a slot list',
		},
		{
			violation: 'a completed step with null outputs',
			record: { nodeId: 'x', iteration: 0, status: 'completed', outputs: null },
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
		await stepRepo.save(
			stepRepo.create({ executionId, nodeId: 'a', iteration: 0, status: 'queued' }),
		);

		await dataSource.getRepository(WorkflowExecution).delete({ id: executionId });

		expect(await stepRepo.count({ where: { executionId } })).toBe(0);
	});

	it('rejects a step referencing a non-existent execution (foreign key)', async () => {
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		await expect(
			createStep(store, '00000000-0000-7000-8000-000000000000', {
				nodeId: 'a',
				iteration: 0,
				status: 'queued',
			}),
		).rejects.toThrow();
	});

	it('TypeOrmStepStore.loadStep returns the step, or throws when absent', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await createStep(store, executionId, {
			nodeId: 'node-a',
			iteration: 0,
			status: 'queued',
		});

		const step = await store.loadStep(id);

		// `toMatchObject`: the adapter returns the entity, which carries columns the
		// `StepRecord` interface doesn't expose.
		expect(step).toMatchObject({
			id,
			executionId,
			nodeId: 'node-a',
			iteration: 0,
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
		const { id } = await createStep(store, executionId, {
			nodeId: 'a',
			iteration: 0,
			status: 'queued',
		});

		// the winning claim gets the step back, already `running`
		expect(await store.claimStep(id)).toMatchObject({
			id,
			executionId,
			nodeId: 'a',
			iteration: 0,
			status: 'running',
			outputs: null,
		});
		// second claim of the same step loses the race
		expect(await store.claimStep(id)).toBeNull();
		expect((await store.loadStep(id)).status).toBe('running');
	});

	it('TypeOrmStepStore.claimStep refuses once any step in the execution failed', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		// b is planned first, then a's failure lands before b's step:ready is claimed
		const { id } = await createStep(store, executionId, {
			nodeId: 'b',
			iteration: 0,
			status: 'queued',
		});
		await seedStep({ executionId, nodeId: 'a', iteration: 0, status: 'failed' });

		expect(await store.claimStep(id)).toBeNull();
		expect((await store.loadStep(id)).status).toBe('queued');

		// a failure in one execution doesn't block claims in another
		const otherExecutionId = await createExecution();
		const other = await createStep(store, otherExecutionId, {
			nodeId: 'a',
			iteration: 0,
			status: 'queued',
		});
		expect(await store.claimStep(other.id)).not.toBeNull();
	});

	it('TypeOrmStepStore.createSteps creates nothing once any step in the execution failed', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		await seedStep({ executionId, nodeId: 'a', iteration: 0, status: 'failed' });

		// rows planned after the cancellation sweep would be stuck queued forever
		const created = await store.createSteps(executionId, [
			{ nodeId: 'b', iteration: 0, status: 'queued' },
		]);

		expect(created).toEqual([]);
		const stepRepo = dataSource.getRepository(WorkflowStepExecution);
		expect(await stepRepo.count({ where: { executionId } })).toBe(1);
	});

	it('TypeOrmStepStore.createSteps waits out a concurrently committing failure and creates nothing', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const failing = await seedStep({ executionId, nodeId: 'a', iteration: 0, status: 'running' });

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
		const create = store.createSteps(executionId, [
			{ nodeId: 'b', iteration: 0, status: 'queued' },
		]);
		await new Promise((resolve) => setTimeout(resolve, 150));
		await failure.commitTransaction();
		await failure.release();

		expect(await create).toEqual([]);
	});

	it('TypeOrmStepStore.claimStep waits out a concurrently committing failure and refuses', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const failing = await seedStep({ executionId, nodeId: 'a', iteration: 0, status: 'running' });
		const { id } = await createStep(store, executionId, {
			nodeId: 'b',
			iteration: 0,
			status: 'queued',
		});

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
		const { id } = await seedStep({ executionId, nodeId: 'a', iteration: 0, status: 'running' });

		expect(await store.completeStep(id, [[{ json: { ok: true } }]])).toBe(true);

		const step = await store.loadStep(id);
		expect(step.status).toBe('completed');
		expect(step.outputs).toEqual([[{ json: { ok: true } }]]);
	});

	it('TypeOrmStepStore.completeStep and failStep only record a step that is running', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await createStep(store, executionId, {
			nodeId: 'a',
			iteration: 0,
			status: 'queued',
		});

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

	it('TypeOrmStepStore.suspendStep records the declaration and its deadline, marking the step waiting', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await seedStep({ executionId, nodeId: 'a', iteration: 0, status: 'running' });
		const wait = {
			resumeAt: '2099-01-01T00:00:00.000Z',
			outputsAtDeadline: [[{ json: { passed: 'through' } }]],
			acceptsResumeRequest: false,
		};

		expect(await store.suspendStep(id, wait)).toBe(true);

		const found = await dataSource
			.getRepository(WorkflowStepExecution)
			.findOneOrFail({ where: { id } });
		expect(found.status).toBe('waiting');
		expect(found.wait).toEqual(wait);
		// the deadline is lifted out of the declaration so the sweep can index it
		expect(found.waitTill).toEqual(new Date(wait.resumeAt));
		// a suspension is not an outcome
		expect(found.outputs).toBeNull();
		expect(found.error).toBeNull();
	});

	it('TypeOrmStepStore.suspendStep leaves the deadline null for a wait that has none', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await seedStep({ executionId, nodeId: 'a', iteration: 0, status: 'running' });

		expect(await store.suspendStep(id, { acceptsResumeRequest: true })).toBe(true);

		const found = await dataSource
			.getRepository(WorkflowStepExecution)
			.findOneOrFail({ where: { id } });
		expect(found.status).toBe('waiting');
		// nothing for the sweep to fire: only a resume request ends this wait
		expect(found.waitTill).toBeNull();
	});

	it('TypeOrmStepStore.suspendStep only suspends a step that is running', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await createStep(store, executionId, {
			nodeId: 'a',
			iteration: 0,
			status: 'queued',
		});

		expect(await store.suspendStep(id, { acceptsResumeRequest: true })).toBe(false);

		const found = await dataSource
			.getRepository(WorkflowStepExecution)
			.findOneOrFail({ where: { id } });
		expect(found.status).toBe('queued');
		expect(found.wait).toBeNull();
	});

	it('TypeOrmStepStore.countSettledSteps does not count a waiting step', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await seedStep({ executionId, nodeId: 'a', iteration: 0, status: 'running' });
		await store.suspendStep(id, { acceptsResumeRequest: true });

		// expected but pending: the execution stays open until the wait resolves
		expect(await store.countSettledSteps(executionId)).toBe(0);
	});

	it('TypeOrmStepStore.resumeStep queues a waiting step and records what resumed it', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const wait: WaitDeclaration = { acceptsResumeRequest: true };
		const { id } = await seedStep({ executionId, nodeId: 'a', status: 'waiting', wait });
		const resume: StepResume = { kind: 'request', payload: { body: { approved: true } } };

		expect(await store.resumeStep(id, resume)).toBe(true);

		const found = await dataSource
			.getRepository(WorkflowStepExecution)
			.findOneOrFail({ where: { id } });
		expect(found.status).toBe('queued');
		expect(found.resume).toEqual(resume);
		// the declaration stays: a deadline resume reads its captured outputs
		// after the claim, and the row is the only place it lives
		expect(found.wait).toEqual(wait);
	});

	it('TypeOrmStepStore.resumeStep only resumes a waiting step', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const resume: StepResume = { kind: 'deadline' };

		for (const status of ['queued', 'running', 'completed', 'cancelled'] as const) {
			const { id } = await seedStep({ executionId, nodeId: `n-${status}`, status });

			expect(await store.resumeStep(id, resume)).toBe(false);

			const found = await dataSource
				.getRepository(WorkflowStepExecution)
				.findOneOrFail({ where: { id } });
			expect(found.status).toBe(status);
			expect(found.resume).toBeNull();
		}
	});

	it('TypeOrmStepStore.claimStep hands back the declaration and the resume of a resumed step', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const wait: WaitDeclaration = {
			resumeAt: '2099-01-01T00:00:00.000Z',
			outputsAtDeadline: [[{ json: { passed: 'through' } }]],
			acceptsResumeRequest: false,
		};
		const { id } = await seedStep({ executionId, nodeId: 'a', status: 'waiting', wait });
		await store.resumeStep(id, { kind: 'deadline' });

		// the claim carries both, so dispatching a resumed step costs no extra read
		expect(await store.claimStep(id)).toMatchObject({
			id,
			status: 'running',
			wait,
			resume: { kind: 'deadline' },
		});
	});

	it('TypeOrmStepStore.claimStep reports no wait and no resume on a first dispatch', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const [step] = await store.createSteps(executionId, [
			{ nodeId: 'a', iteration: 0, status: 'queued' },
		]);

		expect(await store.claimStep(step.id)).toMatchObject({ wait: null, resume: null });
	});

	/** A suspended row with its deadline at `waitTill`. */
	async function seedWaitingStep(
		executionId: string,
		nodeId: string,
		waitTill: Date | null,
	): Promise<{ id: string }> {
		return await seedStep({
			executionId,
			nodeId,
			status: 'waiting',
			wait:
				waitTill === null
					? { acceptsResumeRequest: true }
					: {
							resumeAt: waitTill.toISOString(),
							outputsAtDeadline: [[{ json: { passed: 'through' } }]],
							acceptsResumeRequest: false,
						},
			waitTill,
		});
	}

	it('TypeOrmStepStore.resumeDueSteps queues the waits whose deadline has passed and returns them', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await seedWaitingStep(executionId, 'a', new Date('2020-01-01T00:00:00.000Z'));

		expect(await store.resumeDueSteps(new Date('2020-01-02T00:00:00.000Z'), 10)).toEqual([
			{ id, executionId },
		]);

		const found = await dataSource
			.getRepository(WorkflowStepExecution)
			.findOneOrFail({ where: { id } });
		expect(found.status).toBe('queued');
		expect(found.resume).toEqual({ kind: 'deadline' });
		// the declaration stays: the dispatch reads its captured outputs
		expect(found.wait).not.toBeNull();
	});

	it('TypeOrmStepStore.resumeDueSteps leaves a wait whose deadline has not passed', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await seedWaitingStep(executionId, 'a', new Date('2020-01-03T00:00:00.000Z'));

		expect(await store.resumeDueSteps(new Date('2020-01-02T00:00:00.000Z'), 10)).toEqual([]);

		const found = await dataSource
			.getRepository(WorkflowStepExecution)
			.findOneOrFail({ where: { id } });
		expect(found.status).toBe('waiting');
		expect(found.resume).toBeNull();
	});

	it('TypeOrmStepStore.resumeDueSteps ignores a wait that only a resume request ends', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await seedWaitingStep(executionId, 'a', null);

		// no deadline, so no instant makes it due. The sweep is instance-wide and
		// these cases share a database, so assert about this row rather than the
		// whole batch — a far-future instant also finds every other test's waits.
		const resumed = await store.resumeDueSteps(new Date('2099-01-01T00:00:00.000Z'), 10);
		expect(resumed.map((step) => step.id)).not.toContain(id);

		const found = await dataSource
			.getRepository(WorkflowStepExecution)
			.findOneOrFail({ where: { id } });
		expect(found.status).toBe('waiting');
	});

	it('TypeOrmStepStore.resumeDueSteps ignores a step that is not waiting', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		// a resumed step keeps its declaration and its past deadline, so only the
		// status keeps the sweep from resuming it twice
		const { id } = await seedWaitingStep(executionId, 'a', new Date('2020-01-01T00:00:00.000Z'));
		await store.resumeStep(id, { kind: 'deadline' });

		expect(await store.resumeDueSteps(new Date('2020-01-02T00:00:00.000Z'), 10)).toEqual([]);
	});

	it('TypeOrmStepStore.resumeDueSteps caps the batch at the limit, oldest deadline first', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id: oldest } = await seedWaitingStep(
			executionId,
			'oldest',
			new Date('2020-01-01T00:00:00.000Z'),
		);
		const { id: middle } = await seedWaitingStep(
			executionId,
			'middle',
			new Date('2020-01-02T00:00:00.000Z'),
		);
		await seedWaitingStep(executionId, 'newest', new Date('2020-01-03T00:00:00.000Z'));

		const resumed = await store.resumeDueSteps(new Date('2020-01-04T00:00:00.000Z'), 2);

		// a backlog drains in deadline order rather than starving its oldest waits.
		// Which rows are picked is ordered; the order they come back in is not —
		// `ORDER BY` sits in the subquery, and an UPDATE cannot order its RETURNING.
		expect(new Set(resumed.map(({ id }) => id))).toEqual(new Set([oldest, middle]));
	});

	/**
	 * These two pin the claim's concurrency contract, which is the reason
	 * `resumeDueSteps` is one statement rather than a scan and a transition per
	 * row. Deadlines sit in 2019, earlier than every other case's, so only the
	 * rows seeded here are ever due and leftovers cannot join the batch.
	 */
	const SWEEP_DUE = new Date('2019-06-01T00:00:00.000Z');

	async function seedBacklog(executionId: string, count: number): Promise<string[]> {
		const ids: string[] = [];
		for (let n = 1; n <= count; n++) {
			const { id } = await seedWaitingStep(
				executionId,
				`backlog-${n}`,
				new Date(`2019-01-0${n}T00:00:00.000Z`),
			);
			ids.push(id);
		}
		return ids;
	}

	it('TypeOrmStepStore.resumeDueSteps skips the rows another sweeper holds, taking the rest of the backlog', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const [first, second, third, fourth] = await seedBacklog(executionId, 4);

		// stand in for a concurrent sweeper mid-claim: hold the two oldest locked
		const other = dataSource.createQueryRunner();
		await other.connect();
		await other.startTransaction();
		const held = (await other.query(
			`SELECT id FROM workflow_step_execution
			 WHERE status = 'waiting' AND wait_till <= $1
			 ORDER BY wait_till
			 LIMIT 2
			 FOR UPDATE SKIP LOCKED`,
			[SWEEP_DUE],
		)) as Array<{ id: string }>;
		expect(held.map(({ id }) => id)).toEqual([first, second]);

		// SKIP LOCKED, so this sweep neither blocks on them nor takes them again:
		// it moves past the held head and drains the next two
		const resumed = await store.resumeDueSteps(SWEEP_DUE, 2);

		await other.commitTransaction();
		await other.release();

		expect(resumed.map(({ id }) => id).sort()).toEqual([third, fourth].sort());
	});

	it('TypeOrmStepStore.resumeDueSteps hands no step to two concurrent sweeps', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const backlog = await seedBacklog(executionId, 4);

		// both ask for more than the whole backlog at once
		const [left, right] = await Promise.all([
			store.resumeDueSteps(SWEEP_DUE, 10),
			store.resumeDueSteps(SWEEP_DUE, 10),
		]);
		const leftIds = left.map(({ id }) => id);
		const rightIds = right.map(({ id }) => id);

		// no step reached both sweeps, and between them they drained this backlog.
		// Restricted to the rows seeded here: the sweep is instance-wide, so an
		// earlier case's still-waiting rows are legitimately in the batch too.
		const seeded = (ids: string[]) => ids.filter((id) => backlog.includes(id));
		expect(leftIds.filter((id) => rightIds.includes(id))).toEqual([]);
		expect([...seeded(leftIds), ...seeded(rightIds)].sort()).toEqual([...backlog].sort());
	});

	it('TypeOrmStepStore.cancelQueuedSteps cancels queued steps and nothing else', async () => {
		const executionId = await createExecution();
		const otherExecutionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id: queuedId } = await createStep(store, executionId, {
			nodeId: 'a',
			iteration: 0,
			status: 'queued',
		});
		const { id: runningId } = await seedStep({
			executionId,
			nodeId: 'b',
			iteration: 0,
			status: 'running',
		});
		const { id: completedId } = await createStep(store, executionId, {
			nodeId: 'c',
			iteration: 0,
			status: 'completed',
			outputs: [{}],
		});
		// scoped to the execution: a sibling execution's queued work is untouched
		const { id: otherId } = await createStep(store, otherExecutionId, {
			nodeId: 'a',
			iteration: 0,
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
		const { id } = await seedStep({ executionId, nodeId: 'a', iteration: 0, status: 'running' });

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

		const { id } = await createStep(store, executionId, {
			nodeId: 'x',
			iteration: 0,
			status: 'skipped',
		});

		const step = await store.loadStep(id);
		expect(step.status).toBe('skipped');
		expect(step.outputs).toBeNull();
	});

	it('TypeOrmStepStore.loadStepsByKeys returns rows keyed by step key, omitting absent keys', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id: aId } = await seedStep({
			executionId,
			nodeId: 'a',
			iteration: 0,
			status: 'running',
		});
		// a multi-slot output with a dead slot round-trips as stored
		await store.completeStep(aId, [[{ json: { from: 'a' } }], null]);
		const { id: bId } = await createStep(store, executionId, {
			nodeId: 'b',
			iteration: 0,
			status: 'skipped',
		});
		await createStep(store, executionId, { nodeId: 'c', iteration: 0, status: 'queued' });
		// scoped to the execution: a sibling execution's row for 'a' must not leak in
		const otherExecutionId = await createExecution();
		await createStep(store, otherExecutionId, { nodeId: 'a', iteration: 0, status: 'queued' });

		const steps = await store.loadStepsByKeys(
			executionId,
			['a', 'b', 'c', 'd'].map((nodeId) => ({ nodeId, iteration: 0 })),
		);

		// 'd' has no row, so it has no key — absence means "not planned yet"
		expect(Object.keys(steps).sort()).toEqual(['a@0', 'b@0', 'c@0']);
		expect(steps['a@0']).toMatchObject({
			id: aId,
			iteration: 0,
			status: 'completed',
			outputs: [[{ json: { from: 'a' } }], null],
		});
		expect(steps['b@0']).toMatchObject({ id: bId, status: 'skipped', outputs: null });
		expect(steps['c@0']).toMatchObject({ status: 'queued', outputs: null });
	});

	it('TypeOrmStepStore.loadStepSummariesByKeys reports per-slot liveness without payloads', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id: aId } = await seedStep({
			executionId,
			nodeId: 'a',
			iteration: 0,
			status: 'running',
		});
		// slot 0 has data, slot 1 was never fired, slot 2 ran but produced zero
		// items — [] is live, only JSON null marks a dead slot
		await store.completeStep(aId, [[{ json: { big: 'payload' } }], null, []]);
		const { id: bId } = await createStep(store, executionId, {
			nodeId: 'b',
			iteration: 0,
			status: 'skipped',
		});
		await createStep(store, executionId, { nodeId: 'c', iteration: 0, status: 'queued' });
		// scoped to the execution: a sibling execution's row for 'a' must not leak in
		const otherExecutionId = await createExecution();
		await createStep(store, otherExecutionId, { nodeId: 'a', iteration: 0, status: 'queued' });

		const summaries = await store.loadStepSummariesByKeys(
			executionId,
			['a', 'b', 'c', 'd'].map((nodeId) => ({ nodeId, iteration: 0 })),
		);

		expect(Object.keys(summaries).sort()).toEqual(['a@0', 'b@0', 'c@0']);
		expect(summaries['a@0']).toEqual({
			id: aId,
			nodeId: 'a',
			iteration: 0,
			status: 'completed',
			filledOutputSlots: [true, false, true],
		});
		expect(summaries['b@0']).toEqual({
			id: bId,
			nodeId: 'b',
			iteration: 0,
			status: 'skipped',
			filledOutputSlots: [],
		});
		expect(summaries['c@0']).toMatchObject({ status: 'queued', filledOutputSlots: [] });
	});

	it('TypeOrmStepStore.loadStepSummariesByKeys is a no-op for no keys', async () => {
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		expect(await store.loadStepSummariesByKeys('00000000-0000-7000-8000-000000000000', [])).toEqual(
			{},
		);
	});

	it('TypeOrmStepStore.loadStepsByKeys is a no-op for no keys', async () => {
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		expect(await store.loadStepsByKeys('00000000-0000-7000-8000-000000000000', [])).toEqual({});
	});

	it('TypeOrmStepStore.countSettledSteps counts terminal rows only, per execution', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		await store.createSteps(executionId, [
			{ nodeId: 'trigger', iteration: 0, status: 'completed', outputs: [{}] },
			{ nodeId: 'a', iteration: 0, status: 'skipped' },
			{ nodeId: 'c', iteration: 0, status: 'queued' },
		]);
		await seedStep({ executionId, nodeId: 'b', iteration: 0, status: 'cancelled' });
		await seedStep({ executionId, nodeId: 'd', iteration: 0, status: 'running' });
		const { id: eId } = await seedStep({
			executionId,
			nodeId: 'e',
			iteration: 0,
			status: 'running',
		});
		await store.failStep(eId, { name: 'Error', message: 'node blew up' });
		// a sibling execution's settled rows must not count
		const otherExecutionId = await createExecution();
		await createStep(store, otherExecutionId, {
			nodeId: 'x',
			iteration: 0,
			status: 'completed',
			outputs: [{}],
		});

		// trigger, a, b, e — not c (queued) or d (running)
		expect(await store.countSettledSteps(executionId)).toBe(4);
	});

	it('rejects an invalid status (check constraint)', async () => {
		const executionId = await createExecution();
		const repo = dataSource.getRepository(WorkflowStepExecution);
		await expect(
			repo.save(
				repo.create({ executionId, nodeId: 'a', iteration: 0, status: 'bogus' as StepStatus }),
			),
		).rejects.toThrow();
	});

	// Planning leans on this: two workers that concurrently decide the same step is
	// ready both insert, and the loser is skipped rather than duplicating the node.
	it('TypeOrmStepStore.createSteps skips a node already planned, keeping the rest', async () => {
		const executionId = await createExecution();
		const repo = dataSource.getRepository(WorkflowStepExecution);
		const store = new TypeOrmStepStore(repo);
		await createStep(store, executionId, { nodeId: 'a', iteration: 0, status: 'queued' });

		// 'a' is taken; 'b' is not, and must still land — the whole point of skipping
		// the conflict rather than failing the statement
		const created = await store.createSteps(executionId, [
			{ nodeId: 'a', iteration: 0, status: 'queued' },
			{ nodeId: 'b', iteration: 0, status: 'queued' },
		]);

		expect(created).toEqual([{ id: expect.any(String) as string, nodeId: 'b', iteration: 0 }]);
		// `count({ where })`, not `countBy`, for the reason given in `loadStep`
		expect(await repo.count({ where: { executionId, nodeId: 'a' } })).toBe(1);
		expect(await repo.count({ where: { executionId, nodeId: 'b' } })).toBe(1);
	});

	it('scopes the one-step-per-node key to a single execution', async () => {
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const executionId = await createExecution();
		const otherExecutionId = await createExecution();
		await createStep(store, executionId, { nodeId: 'a', iteration: 0, status: 'queued' });

		const created = await store.createSteps(otherExecutionId, [
			{ nodeId: 'a', iteration: 0, status: 'queued' },
		]);

		expect(created).toEqual([{ id: expect.any(String) as string, nodeId: 'a', iteration: 0 }]);
	});

	// The run dimension (CAT-2875): a loop member runs once per pass, one row
	// per run, so uniqueness holds per (execution, node, iteration).
	it('TypeOrmStepStore.createSteps accepts the same node at a new iteration and dedups within one', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		await createStep(store, executionId, { nodeId: 'b', iteration: 0, status: 'queued' });

		const created = await store.createSteps(executionId, [
			// iteration 0 is taken; iteration 1 is a legitimately new row
			{ nodeId: 'b', iteration: 0, status: 'queued' },
			{ nodeId: 'b', iteration: 1, status: 'queued' },
		]);

		expect(created).toEqual([{ id: expect.any(String) as string, nodeId: 'b', iteration: 1 }]);
	});

	it('TypeOrmStepStore.createSteps rejects a negative or fractional iteration at runtime', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));

		for (const iteration of [-1, 0.5]) {
			await expect(
				store.createSteps(executionId, [{ nodeId: 'x', iteration, status: 'queued' }]),
			).rejects.toMatchObject({
				name: 'UnexpectedError',
				message: expect.stringContaining('non-negative integers') as string,
			});
		}
	});

	it('TypeOrmStepStore.loadStepsByKeys and loadStepSummariesByKeys distinguish iterations of one node', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		await store.createSteps(executionId, [
			{ nodeId: 'b', iteration: 0, status: 'completed', outputs: [null, [{ json: { n: 0 } }]] },
			{ nodeId: 'b', iteration: 1, status: 'queued' },
		]);

		const steps = await store.loadStepsByKeys(executionId, [
			{ nodeId: 'b', iteration: 0 },
			{ nodeId: 'b', iteration: 1 },
			{ nodeId: 'b', iteration: 2 },
		]);
		expect(Object.keys(steps).sort()).toEqual(['b@0', 'b@1']);
		expect(steps['b@0']).toMatchObject({ status: 'completed' });
		expect(steps['b@1']).toMatchObject({ status: 'queued' });

		const summaries = await store.loadStepSummariesByKeys(executionId, [
			{ nodeId: 'b', iteration: 0 },
			{ nodeId: 'b', iteration: 1 },
		]);
		expect(Object.keys(summaries).sort()).toEqual(['b@0', 'b@1']);
		expect(summaries['b@0']).toMatchObject({ iteration: 0, filledOutputSlots: [false, true] });
		expect(summaries['b@1']).toMatchObject({ iteration: 1, filledOutputSlots: [] });
	});

	it('TypeOrmStepStore.claimStep hands back the claimed iteration', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const [step] = await store.createSteps(executionId, [
			{ nodeId: 'b', iteration: 3, status: 'queued' },
		]);

		expect(await store.claimStep(step.id)).toMatchObject({
			id: step.id,
			nodeId: 'b',
			iteration: 3,
			status: 'running',
		});
	});

	it("TypeOrmStepStore.loadLatestStepSummaries returns each node's highest-iteration row", async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		await store.createSteps(executionId, [
			{ nodeId: 'b', iteration: 0, status: 'completed', outputs: [null, [{ json: {} }]] },
			{ nodeId: 'b', iteration: 1, status: 'completed', outputs: [[{ json: {} }], null] },
		]);
		// a sibling execution's higher iteration must not leak in
		const otherExecutionId = await createExecution();
		await store.createSteps(otherExecutionId, [{ nodeId: 'b', iteration: 5, status: 'queued' }]);

		await store.createSteps(executionId, [
			{ nodeId: 'c', iteration: 0, status: 'completed', outputs: [[{ json: {} }]] },
		]);

		const latest = await store.loadLatestStepSummaries(executionId, ['b', 'c', 'ghost']);

		expect(latest.b).toMatchObject({
			nodeId: 'b',
			iteration: 1,
			status: 'completed',
			filledOutputSlots: [true, false],
		});
		expect(latest.c).toMatchObject({ nodeId: 'c', iteration: 0 });
		expect(latest.ghost).toBeUndefined();

		expect(await store.loadLatestStepSummaries(executionId, [])).toEqual({});
	});

	it('carries the unique key and the partial indexes in the schema', async () => {
		const indexes: Array<{ indexname: string; indexdef: string }> = await dataSource.query(
			"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'workflow_step_execution'",
		);
		const byName = Object.fromEntries(indexes.map((row) => [row.indexname, row.indexdef]));

		expect(byName.uniq_workflow_step_execution_execution_id_node_id_iteration).toContain(
			'UNIQUE INDEX',
		);
		expect(byName.uniq_workflow_step_execution_execution_id_node_id_iteration).toContain(
			'(execution_id, node_id, iteration)',
		);
		expect(byName.idx_workflow_step_execution_failed).toContain("WHERE ((status)::text = 'failed'");
		// the sweep's index: due waits only, so it must not cover settled rows
		expect(byName.idx_workflow_step_execution_wait_till).toContain('(wait_till)');
		expect(byName.idx_workflow_step_execution_wait_till).toContain(
			"WHERE ((status)::text = 'waiting'",
		);

		const [column]: Array<{ is_nullable: string; column_default: string }> = await dataSource.query(
			`SELECT is_nullable, column_default FROM information_schema.columns
				 WHERE table_name = 'workflow_step_execution' AND column_name = 'iteration'`,
		);
		expect(column).toEqual({ is_nullable: 'NO', column_default: '0' });
	});

	it('TypeOrmExecutionViewStore.loadExecutionWithStepsView returns every row of the execution, none of another', async () => {
		const executionId = await createExecution();
		const otherExecutionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		await store.createSteps(executionId, [
			{ nodeId: 'a', iteration: 0, status: 'completed', outputs: [[{ json: { ok: true } }]] },
			{ nodeId: 'b', iteration: 0, status: 'queued' },
		]);
		await store.createSteps(otherExecutionId, [{ nodeId: 'c', iteration: 0, status: 'queued' }]);

		const { id, steps } = await viewStore().loadExecutionWithStepsView(executionId);

		expect(id).toBe(executionId);
		expect(steps.map((step) => step.nodeId).sort()).toEqual(['a', 'b']);
	});

	// The left join still has to report the execution itself.
	it('TypeOrmExecutionViewStore.loadExecutionWithStepsView returns [] for an execution with no steps', async () => {
		const executionId = await createExecution();

		const view = await viewStore().loadExecutionWithStepsView(executionId);

		expect(view.id).toBe(executionId);
		expect(view.steps).toEqual([]);
	});

	it('TypeOrmExecutionViewStore.loadExecutionWithStepsView carries outputs, error and timestamps', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		await store.createSteps(executionId, [
			{ nodeId: 'a', iteration: 0, status: 'completed', outputs: [[{ json: { ok: true } }]] },
		]);
		const [{ id: failedId }] = await store.createSteps(executionId, [
			{ nodeId: 'b', iteration: 0, status: 'queued' },
		]);
		await store.claimStep(failedId);
		await store.failStep(failedId, { name: 'Error', message: 'boom' });

		const { steps } = await viewStore().loadExecutionWithStepsView(executionId);

		const completed = steps.find((step) => step.nodeId === 'a');
		expect(completed).toMatchObject({
			status: 'completed',
			outputs: [[{ json: { ok: true } }]],
			error: null,
		});
		expect(completed?.createdAt).toBeInstanceOf(Date);
		expect(completed?.updatedAt).toBeInstanceOf(Date);
		const failed = steps.find((step) => step.nodeId === 'b');
		expect(failed).toMatchObject({
			status: 'failed',
			outputs: null,
			error: { name: 'Error', message: 'boom' },
		});
	});
});
