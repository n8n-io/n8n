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

		expect(await store.claimStep(id)).toBe(true);
		// second claim of the same step loses the race
		expect(await store.claimStep(id)).toBe(false);
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

	it('rejects an invalid status (check constraint)', async () => {
		const executionId = await createExecution();
		const repo = dataSource.getRepository(WorkflowStepExecution);
		await expect(
			repo.save(repo.create({ executionId, nodeId: 'a', status: 'bogus' as StepStatus })),
		).rejects.toThrow();
	});
});
