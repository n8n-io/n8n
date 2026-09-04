import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ExecutionNotFoundError } from '../../execution/execution-store';
import { createDataSource } from '../data-source';
import { WorkflowExecution } from '../entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../entities/workflow-step-execution.entity';
import { generateId } from '../generate-id';
import { TypeOrmExecutionViewStore } from '../typeorm-execution-view-store';

describe('workflow_execution table (integration)', () => {
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

	it('persists and retrieves a workflow_execution row', async () => {
		const repo = dataSource.getRepository(WorkflowExecution);

		const created = repo.create({
			id: generateId(),
			workflowId: 'wf-1',
			status: 'running',
			mode: 'production',
			graph: { nodes: [], edges: [] },
			triggerOutputs: [{ foo: 'bar' }],
			finishedAt: null,
		});
		await repo.save(created);

		// NOTE: `findOne({ where })`, not `findOneByOrFail`: the latter's overload
		// exceeds TypeScript's instantiation depth on the recursive `triggerOutputs`
		// column type.
		const found = await repo.findOneOrFail({ where: { id: created.id } });

		expect(found.id).toBeTruthy();
		expect(found.workflowId).toBe('wf-1');
		expect(found.status).toBe('running');
		expect(found.mode).toBe('production');
		expect(found.triggerOutputs).toEqual([{ foo: 'bar' }]);
		expect(found.finishedAt).toBeNull();
		expect(found.createdAt).toBeInstanceOf(Date);
		expect(found.updatedAt).toBeInstanceOf(Date);
	});

	it('TypeOrmExecutionViewStore.loadExecutionView reports the timing and leaves the trigger payload behind', async () => {
		const repo = dataSource.getRepository(WorkflowExecution);
		const finishedAt = new Date();
		const created = repo.create({
			id: generateId(),
			workflowId: 'wf-3',
			status: 'completed',
			mode: 'manual',
			graph: { nodes: [], edges: [] },
			triggerOutputs: [{ foo: 'bar' }],
			finishedAt,
		});
		await repo.save(created);
		const viewStore = new TypeOrmExecutionViewStore(
			repo,
			dataSource.getRepository(WorkflowStepExecution),
		);

		const view = await viewStore.loadExecutionView(created.id);

		expect(view).toEqual({
			id: created.id,
			workflowId: 'wf-3',
			status: 'completed',
			mode: 'manual',
			graph: { nodes: [], edges: [] },
			createdAt: expect.any(Date) as Date,
			updatedAt: expect.any(Date) as Date,
			finishedAt,
		});
	});

	it.each(['loadExecutionView', 'loadExecutionWithStepsView'] as const)(
		'TypeOrmExecutionViewStore.%s throws for an unknown id',
		async (method) => {
			const viewStore = new TypeOrmExecutionViewStore(
				dataSource.getRepository(WorkflowExecution),
				dataSource.getRepository(WorkflowStepExecution),
			);

			await expect(
				viewStore[method]('00000000-0000-0000-0000-000000000000'),
			).rejects.toBeInstanceOf(ExecutionNotFoundError);
		},
	);

	it('counts rows by workflowId and status (admittance support)', async () => {
		const repo = dataSource.getRepository(WorkflowExecution);

		await repo.save(
			repo.create({
				id: generateId(),
				workflowId: 'wf-2',
				status: 'running',
				mode: 'production',
				graph: { nodes: [], edges: [] },
				triggerOutputs: null,
				finishedAt: null,
			}),
		);
		await repo.save(
			repo.create({
				id: generateId(),
				workflowId: 'wf-2',
				status: 'completed',
				mode: 'production',
				graph: { nodes: [], edges: [] },
				triggerOutputs: null,
				finishedAt: new Date(),
			}),
		);

		const runningForWf2 = await repo.count({
			where: { workflowId: 'wf-2', status: 'running' },
		});

		expect(runningForWf2).toBe(1);
	});
});
