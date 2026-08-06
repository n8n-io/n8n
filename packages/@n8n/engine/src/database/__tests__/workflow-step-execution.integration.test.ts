import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { StepStatus } from '../../execution/execution.types';
import { StepNotFoundError, type NewStepRecord } from '../../execution/step-store';
import { createDataSource } from '../data-source';
import { WorkflowExecution } from '../entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../entities/workflow-step-execution.entity';
import { TypeOrmStepStore } from '../typeorm-step-store';

describe('workflow_step_execution table (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let dataSource: DataSource;

	beforeAll(async () => {
		container = await new PostgreSqlContainer('postgres:18-alpine').start();
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
		record: NewStepRecord,
	): Promise<{ id: string }> {
		const [step] = await store.createSteps([record]);
		return step;
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

		const { id } = await createStep(store, { executionId, nodeId: 'x', status: 'queued' });

		const found = await dataSource
			.getRepository(WorkflowStepExecution)
			.findOneOrFail({ where: { id } });
		expect(found.nodeId).toBe('x');
		expect(found.status).toBe('queued');
	});

	it('TypeOrmStepStore.createSteps persists a batch and returns ids in input order', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));

		const ids = await store.createSteps([
			{ executionId, nodeId: 'trigger', status: 'completed' },
			{ executionId, nodeId: 'a', status: 'queued' },
			{ executionId, nodeId: 'b', status: 'queued' },
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
		expect(await store.createSteps([])).toEqual([]);
	});

	it('TypeOrmStepStore.createSteps rejects a step created with outputs but not completed', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));

		await expect(
			store.createSteps([{ executionId, nodeId: 'x', status: 'queued', outputs: [{}] }]),
		).rejects.toMatchObject({
			name: 'UnexpectedError',
			message: expect.stringContaining('completed') as string,
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
			createStep(store, {
				executionId: '00000000-0000-7000-8000-000000000000',
				nodeId: 'a',
				status: 'queued',
			}),
		).rejects.toThrow();
	});

	it('TypeOrmStepStore.loadStep returns the step, or throws when absent', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await createStep(store, { executionId, nodeId: 'node-a', status: 'queued' });

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
		const { id } = await createStep(store, { executionId, nodeId: 'a', status: 'queued' });

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

	it('TypeOrmStepStore.completeStep persists outputs and marks the step completed', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await createStep(store, { executionId, nodeId: 'a', status: 'running' });

		expect(await store.completeStep(id, [[{ json: { ok: true } }]])).toBe(true);

		const step = await store.loadStep(id);
		expect(step.status).toBe('completed');
		expect(step.outputs).toEqual([[{ json: { ok: true } }]]);
	});

	it('TypeOrmStepStore.completeStep and failStep only record a step that is running', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id } = await createStep(store, { executionId, nodeId: 'a', status: 'queued' });

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
		const { id: queuedId } = await createStep(store, {
			executionId,
			nodeId: 'a',
			status: 'queued',
		});
		const { id: runningId } = await createStep(store, {
			executionId,
			nodeId: 'b',
			status: 'running',
		});
		const { id: completedId } = await createStep(store, {
			executionId,
			nodeId: 'c',
			status: 'completed',
		});
		// scoped to the execution: a sibling execution's queued work is untouched
		const { id: otherId } = await createStep(store, {
			executionId: otherExecutionId,
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
		const { id } = await createStep(store, { executionId, nodeId: 'a', status: 'running' });

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

	it('TypeOrmStepStore.loadStepOutputs returns only completed outputs, keyed by node id', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id: aId } = await createStep(store, { executionId, nodeId: 'a', status: 'running' });
		await store.completeStep(aId, [[{ json: { from: 'a' } }]]);
		await createStep(store, { executionId, nodeId: 'b', status: 'queued' });
		const { id: cId } = await createStep(store, { executionId, nodeId: 'c', status: 'running' });
		await store.failStep(cId, { name: 'Error', message: 'node blew up' });

		const outputs = await store.loadStepOutputs(executionId, ['a', 'b', 'c', 'd']);

		expect(outputs).toEqual({
			a: [[{ json: { from: 'a' } }]],
			b: null, // queued
			c: null, // failed
			d: null, // no step row
		});
	});

	it('TypeOrmStepStore.loadCompletedNodeIds returns only the completed ones', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const { id: aId } = await createStep(store, { executionId, nodeId: 'a', status: 'running' });
		// completed without firing its slot — readiness must not depend on what
		// the outputs contain, which is why it has its own method
		await store.completeStep(aId, [null]);
		await createStep(store, { executionId, nodeId: 'b', status: 'queued' });
		const { id: cId } = await createStep(store, { executionId, nodeId: 'c', status: 'running' });
		await store.failStep(cId, { name: 'Error', message: 'node blew up' });

		const completed = await store.loadCompletedNodeIds(executionId, ['a', 'b', 'c', 'd']);

		// b queued, c failed, d has no row at all
		expect(completed).toEqual(new Set(['a']));
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
		await createStep(store, { executionId, nodeId: 'a', status: 'queued' });

		// 'a' is taken; 'b' is not, and must still land — the whole point of skipping
		// the conflict rather than failing the statement
		const created = await store.createSteps([
			{ executionId, nodeId: 'a', status: 'queued' },
			{ executionId, nodeId: 'b', status: 'queued' },
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
		await createStep(store, { executionId, nodeId: 'a', status: 'queued' });

		const created = await store.createSteps([
			{ executionId: otherExecutionId, nodeId: 'a', status: 'queued' },
		]);

		expect(created).toEqual([{ id: expect.any(String) as string, nodeId: 'a' }]);
	});
});
