import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { StepStatus } from '../../execution/execution.types';
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

	it('persists and retrieves a step row', async () => {
		const executionId = await createExecution();
		const repo = dataSource.getRepository(WorkflowStepExecution);

		const created = repo.create({ executionId, nodeId: 'node-a', status: 'queued' });
		await repo.save(created);

		const found = await repo.findOneByOrFail({ id: created.id });
		expect(found.executionId).toBe(executionId);
		expect(found.nodeId).toBe('node-a');
		expect(found.status).toBe('queued');
		expect(found.createdAt).toBeInstanceOf(Date);
	});

	it('TypeOrmStepStore.createStep persists a queued step and returns its id', async () => {
		const executionId = await createExecution();
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));

		const { id } = await store.createStep({ executionId, nodeId: 'x', status: 'queued' });

		const found = await dataSource.getRepository(WorkflowStepExecution).findOneByOrFail({ id });
		expect(found.nodeId).toBe('x');
		expect(found.status).toBe('queued');
	});

	it('cascades step deletion when the parent execution is deleted', async () => {
		const executionId = await createExecution();
		const stepRepo = dataSource.getRepository(WorkflowStepExecution);
		await stepRepo.save(stepRepo.create({ executionId, nodeId: 'a', status: 'queued' }));

		await dataSource.getRepository(WorkflowExecution).delete({ id: executionId });

		expect(await stepRepo.countBy({ executionId })).toBe(0);
	});

	it('rejects a step referencing a non-existent execution (foreign key)', async () => {
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		await expect(
			store.createStep({
				executionId: '00000000-0000-7000-8000-000000000000',
				nodeId: 'a',
				status: 'queued',
			}),
		).rejects.toThrow();
	});

	it('rejects an invalid status (check constraint)', async () => {
		const executionId = await createExecution();
		const repo = dataSource.getRepository(WorkflowStepExecution);
		await expect(
			repo.save(repo.create({ executionId, nodeId: 'a', status: 'bogus' as StepStatus })),
		).rejects.toThrow();
	});
});
