import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDataPlaneDataSource } from '../data-source';
import { WorkflowExecution } from '../entities/workflow-execution.entity';

describe('workflow_execution table (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let dataSource: DataSource;

	beforeAll(async () => {
		container = await new PostgreSqlContainer('postgres:18-alpine').start();
		dataSource = createDataPlaneDataSource({ url: container.getConnectionUri() });
		await dataSource.initialize();
		await dataSource.runMigrations();
	}, 120_000);

	afterAll(async () => {
		if (dataSource?.isInitialized) await dataSource.destroy();
		if (container) await container.stop();
	});

	it('persists and retrieves a workflow_execution row', async () => {
		const repo = dataSource.getRepository(WorkflowExecution);

		const created = repo.create({
			workflowId: 'wf-1',
			status: 'running',
			mode: 'production',
			graph: { nodes: [], edges: [] },
			triggerPayload: { foo: 'bar' },
			finishedAt: null,
		});
		await repo.save(created);

		const found = await repo.findOneByOrFail({ id: created.id });

		expect(found.id).toBeTruthy();
		expect(found.workflowId).toBe('wf-1');
		expect(found.status).toBe('running');
		expect(found.mode).toBe('production');
		expect(found.triggerPayload).toEqual({ foo: 'bar' });
		expect(found.finishedAt).toBeNull();
		expect(found.createdAt).toBeInstanceOf(Date);
		expect(found.updatedAt).toBeInstanceOf(Date);
	});

	it('counts rows by workflowId and status (admittance support)', async () => {
		const repo = dataSource.getRepository(WorkflowExecution);

		await repo.save(
			repo.create({
				workflowId: 'wf-2',
				status: 'running',
				mode: 'production',
				graph: { nodes: [], edges: [] },
				triggerPayload: null,
				finishedAt: null,
			}),
		);
		await repo.save(
			repo.create({
				workflowId: 'wf-2',
				status: 'completed',
				mode: 'production',
				graph: { nodes: [], edges: [] },
				triggerPayload: null,
				finishedAt: new Date(),
			}),
		);

		const runningForWf2 = await repo.count({
			where: { workflowId: 'wf-2', status: 'running' },
		});

		expect(runningForWf2).toBe(1);
	});
});
