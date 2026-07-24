import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import {
	createDataSource,
	TypeOrmExecutionStore,
	TypeOrmStepStore,
	WorkflowExecution,
	WorkflowStepExecution,
} from '../../database';
import type { WorkflowGraph } from '../../graph';
import { InMemoryWorkQueue, type OrchestrationMessage, type StepMessage } from '../../queue';
import { ExecutionStartHandler } from '../execution-start-handler';
import { OrchestrationWorker } from '../orchestration-worker';
import { StartExecutionService } from '../start-execution.service';

const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Manual Trigger', type: 'trigger' },
		{ id: 'step-a', name: 'A', type: 'v1-node' },
	],
	edges: [{ from: 'trigger', to: 'step-a' }],
};

describe('execution start (integration)', () => {
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

	function wire() {
		const executionStore = new TypeOrmExecutionStore(dataSource.getRepository(WorkflowExecution));
		const stepStore = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		const orchestrationQueue = new InMemoryWorkQueue<OrchestrationMessage>();
		const stepQueue = new InMemoryWorkQueue<StepMessage>();
		const worker = new OrchestrationWorker(
			orchestrationQueue,
			new ExecutionStartHandler(executionStore, stepStore, stepQueue),
		);
		worker.start();
		const startExecution = new StartExecutionService(
			new AllowAllAdmittance(),
			executionStore,
			orchestrationQueue,
		);
		return { orchestrationQueue, stepQueue, worker, startExecution };
	}

	it('runs the execution, records the trigger completed + first step queued, enqueues step:ready', async () => {
		const { orchestrationQueue, stepQueue, worker, startExecution } = wire();

		const { executionId } = await startExecution.start({
			workflowId: 'wf-1',
			graph,
			triggerPayload: null,
		});
		await orchestrationQueue.drain();

		const row = await dataSource
			.getRepository(WorkflowExecution)
			.findOneByOrFail({ id: executionId });
		expect(row.status).toBe('running');

		const steps = await dataSource
			.getRepository(WorkflowStepExecution)
			.find({ where: { executionId } });
		const triggerStep = steps.find((s) => s.nodeId === 'trigger');
		const firstStep = steps.find((s) => s.nodeId === 'step-a');
		expect(triggerStep?.status).toBe('completed');
		expect(firstStep?.status).toBe('queued');

		// step:ready references the durable step-record id, not the node id.
		expect(stepQueue.messages).toEqual([
			{ type: 'step:ready', executionId, stepId: firstStep?.id },
		]);

		await worker.stop();
	});

	it('is idempotent across duplicate execution:enqueued deliveries', async () => {
		const { orchestrationQueue, stepQueue, worker, startExecution } = wire();

		const { executionId } = await startExecution.start({
			workflowId: 'wf-2',
			graph,
			triggerPayload: null,
		});
		await orchestrationQueue.publish({ type: 'execution:enqueued', executionId });
		await orchestrationQueue.drain();

		const row = await dataSource
			.getRepository(WorkflowExecution)
			.findOneByOrFail({ id: executionId });
		expect(row.status).toBe('running');

		// Only the delivery that claimed the execution planned steps — no duplicates.
		const steps = await dataSource
			.getRepository(WorkflowStepExecution)
			.find({ where: { executionId } });
		expect(steps).toHaveLength(2); // trigger (completed) + step-a (queued)
		expect(stepQueue.messages).toHaveLength(1);

		await worker.stop();
	});
});
