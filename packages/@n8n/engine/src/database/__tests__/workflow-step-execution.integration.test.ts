import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDataSource } from '../data-source';
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

	it('persists and retrieves a workflow_step_execution row', async () => {
		const repo = dataSource.getRepository(WorkflowStepExecution);

		const created = repo.create({ executionId: 'exec-1', nodeId: 'node-a', status: 'queued' });
		await repo.save(created);

		const found = await repo.findOneByOrFail({ id: created.id });
		expect(found.id).toBeTruthy();
		expect(found.executionId).toBe('exec-1');
		expect(found.nodeId).toBe('node-a');
		expect(found.status).toBe('queued');
		expect(found.createdAt).toBeInstanceOf(Date);
		expect(found.updatedAt).toBeInstanceOf(Date);
	});

	it('counts steps by execution and status (readiness-check support)', async () => {
		const repo = dataSource.getRepository(WorkflowStepExecution);

		await repo.save(repo.create({ executionId: 'exec-2', nodeId: 'a', status: 'queued' }));
		await repo.save(repo.create({ executionId: 'exec-2', nodeId: 'b', status: 'completed' }));

		const completedForExec2 = await repo.count({
			where: { executionId: 'exec-2', status: 'completed' },
		});
		expect(completedForExec2).toBe(1);
	});

	it('TypeOrmStepStore.createStep persists a queued step and returns its id', async () => {
		const store = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));

		const { id } = await store.createStep({ executionId: 'exec-3', nodeId: 'x', status: 'queued' });

		const found = await dataSource.getRepository(WorkflowStepExecution).findOneByOrFail({ id });
		expect(found.nodeId).toBe('x');
		expect(found.status).toBe('queued');
	});
});
