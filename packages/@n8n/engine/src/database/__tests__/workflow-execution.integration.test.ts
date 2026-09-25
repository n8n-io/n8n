import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ExecutionNotFoundError } from '../../execution/execution-store';
import type { ExecutionStatus, StepStatus } from '../../execution/execution.types';
import { createDataSource } from '../data-source';
import { WorkflowExecution } from '../entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../entities/workflow-step-execution.entity';
import { generateId } from '../generate-id';
import { TypeOrmExecutionStore } from '../typeorm-execution-store';
import { TypeOrmExecutionViewStore } from '../typeorm-execution-view-store';

/** Opaque to the engine: stored and reported, never read into. */
const sampleWorkflow = { id: 'wf-3', name: 'Sample', nodes: [{ name: 'A' }], connections: {} };

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
			workflow: {},
			triggerOutputs: [{ foo: 'bar' }],
			callerContext: { hostMode: 'trigger' },
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
		expect(found.callerContext).toEqual({ hostMode: 'trigger' });
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
			workflow: sampleWorkflow,
			triggerOutputs: [{ foo: 'bar' }],
			callerContext: { hostMode: 'manual' },
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
			hostMode: 'manual',
			graph: { nodes: [], edges: [] },
			workflow: sampleWorkflow,
			createdAt: expect.any(Date) as Date,
			updatedAt: expect.any(Date) as Date,
			finishedAt,
		});
	});

	it('TypeOrmExecutionStore.loadExecution leaves the workflow document behind', async () => {
		const repo = dataSource.getRepository(WorkflowExecution);
		const created = repo.create({
			id: generateId(),
			workflowId: 'wf-4',
			status: 'running',
			mode: 'production',
			graph: { nodes: [], edges: [] },
			workflow: sampleWorkflow,
			triggerOutputs: [{ foo: 'bar' }],
			callerContext: { hostMode: 'trigger' },
			finishedAt: null,
		});
		await repo.save(created);

		const record = await new TypeOrmExecutionStore(repo).loadExecution(created.id);

		// The execution path never reads the document, so the query never ships it.
		expect(record).toEqual({
			id: created.id,
			workflowId: 'wf-4',
			status: 'running',
			mode: 'production',
			graph: { nodes: [], edges: [] },
			triggerOutputs: [{ foo: 'bar' }],
			callerContext: { hostMode: 'trigger' },
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
				workflow: {},
				triggerOutputs: null,
				callerContext: { hostMode: 'trigger' },
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
				workflow: {},
				triggerOutputs: null,
				callerContext: { hostMode: 'trigger' },
				finishedAt: new Date(),
			}),
		);

		const runningForWf2 = await repo.count({
			where: { workflowId: 'wf-2', status: 'running' },
		});

		expect(runningForWf2).toBe(1);
	});

	it('TypeOrmExecutionStore.finishExecution ends a waiting execution', async () => {
		// a resumed step can fail while the execution still reports the wait it
		// resumed from, and that failure ends the execution
		const repo = dataSource.getRepository(WorkflowExecution);
		const created = await repo.save(
			repo.create({
				id: generateId(),
				workflowId: 'wf-5',
				status: 'waiting',
				mode: 'production',
				callerContext: { hostMode: 'trigger' },
				graph: { nodes: [], edges: [] },
				workflow: {},
				triggerOutputs: null,
				finishedAt: null,
			}),
		);

		const finished = await new TypeOrmExecutionStore(repo).finishExecution(created.id, 'failed');

		expect(finished).toBe(true);
		const row = await repo.findOneOrFail({ where: { id: created.id } });
		expect(row.status).toBe('failed');
		expect(row.finishedAt).toBeInstanceOf(Date);
	});

	describe('TypeOrmExecutionStore.refreshLiveStatus', () => {
		/** One execution with one step for each status given. */
		async function seed(status: ExecutionStatus, stepStatuses: StepStatus[]): Promise<string> {
			const repo = dataSource.getRepository(WorkflowExecution);
			const execution = await repo.save(
				repo.create({
					id: generateId(),
					workflowId: 'wf-live',
					status,
					mode: 'production',
					callerContext: { hostMode: 'trigger' },
					graph: { nodes: [], edges: [] },
					workflow: {},
					triggerOutputs: null,
					finishedAt: null,
				}),
			);
			const stepRepo = dataSource.getRepository(WorkflowStepExecution);
			await stepRepo.save(
				// one iteration for each, so they are distinct rows of the same node
				stepStatuses.map((stepStatus, iteration) =>
					stepRepo.create({
						id: generateId(),
						executionId: execution.id,
						nodeId: 'a',
						iteration,
						status: stepStatus,
						outputs: null,
						error: null,
						waitDeclaration: null,
						waitTill: null,
						resumeCause: null,
					}),
				),
			);
			return execution.id;
		}

		it.each<[string, ExecutionStatus, StepStatus[], ExecutionStatus]>([
			[
				'reports waiting when every step it still owes is suspended',
				'running',
				['completed', 'waiting'],
				'waiting',
			],
			['reports running again once a step can run', 'waiting', ['waiting', 'queued'], 'running'],
			['reports running while a step runs', 'waiting', ['waiting', 'running'], 'running'],
			[
				'leaves an execution whose steps have all settled to finishExecution',
				'running',
				['completed'],
				'running',
			],
			['leaves an execution with no steps alone', 'running', [], 'running'],
			['leaves an execution that already ended alone', 'completed', ['waiting'], 'completed'],
		])('%s', async (_case, from, stepStatuses, expected) => {
			const repo = dataSource.getRepository(WorkflowExecution);
			const id = await seed(from, stepStatuses);

			await new TypeOrmExecutionStore(repo).refreshLiveStatus(id);

			const row = await repo.findOneOrFail({ where: { id } });
			expect(row.status).toBe(expected);
		});

		it('does not write when the status already holds', async () => {
			const repo = dataSource.getRepository(WorkflowExecution);
			const id = await seed('running', ['running']);
			const before = await repo.findOneOrFail({ where: { id } });

			await new TypeOrmExecutionStore(repo).refreshLiveStatus(id);

			// The timestamp is the only trace of the write. A settling step must not
			// take the execution row's lock to store the status it already has.
			const after = await repo.findOneOrFail({ where: { id } });
			expect(after.updatedAt).toEqual(before.updatedAt);
		});
	});
});
