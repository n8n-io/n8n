import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import {
	createDataSource,
	TypeOrmExecutionStore,
	TypeOrmStepStore,
	WorkflowExecution,
	WorkflowStepExecution,
} from '../../database';
import { generateId } from '../../database/generate-id';
import type { WorkflowGraph } from '../../graph';
import { noopLifecycleEventPublisher } from '../../lifecycle-events';
import {
	InMemoryWorkQueue,
	type OrchestrationMessage,
	type StepMessage,
	type WorkQueue,
} from '../../queue';
import { ExecutionStartHandler } from '../execution-start-handler';
import { OrchestrationWorker } from '../orchestration-worker';
import { StartExecutionService } from '../start-execution.service';
import { StepSettledHandler } from '../step-settled-handler';

const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Manual Trigger', type: 'trigger' },
		{ id: 'step-a', name: 'A', type: 'v1-node' },
	],
	edges: [{ from: 'trigger', to: 'step-a', outputIndex: 0, inputIndex: 0 }],
};

describe('execution start (integration)', () => {
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

	function stores() {
		return {
			executionStore: new TypeOrmExecutionStore(dataSource.getRepository(WorkflowExecution)),
			stepStore: new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution)),
		};
	}

	it('runs the execution, records the trigger completed + first step queued, enqueues step:ready', async () => {
		const { executionStore, stepStore } = stores();
		const orchestrationQueue = new InMemoryWorkQueue<OrchestrationMessage>();
		const stepQueue = new InMemoryWorkQueue<StepMessage>();
		const worker = new OrchestrationWorker(
			orchestrationQueue,
			new ExecutionStartHandler(
				executionStore,
				stepStore,
				orchestrationQueue,
				noopLifecycleEventPublisher,
			),
			new StepSettledHandler(
				executionStore,
				stepStore,
				stepQueue,
				orchestrationQueue,
				noopLifecycleEventPublisher,
			),
		);
		worker.start();
		const startExecution = new StartExecutionService(
			new AllowAllAdmittance(),
			executionStore,
			orchestrationQueue,
		);

		// Stand in for the step worker: consuming the step queue is both the
		// assertion target and the signal that orchestration finished.
		const readySteps: StepMessage[] = [];
		let firstReady!: () => void;
		const ready = new Promise<void>((resolve) => (firstReady = resolve));
		stepQueue.start(async (message) => {
			readySteps.push(message);
			firstReady();
			await Promise.resolve();
		});

		const { executionId } = await startExecution.start({
			workflowId: 'wf-1',
			graph,
			triggerOutputs: [[{ json: { hello: 'world' } }]],
			executionId: generateId(),
		});
		await ready;

		// `findOne({ where })`, not `findOneByOrFail`: the latter's overload exceeds
		// TypeScript's instantiation depth on the recursive `triggerOutputs` column type.
		const row = await dataSource
			.getRepository(WorkflowExecution)
			.findOneOrFail({ where: { id: executionId } });
		expect(row.status).toBe('running');

		const steps = await dataSource
			.getRepository(WorkflowStepExecution)
			.find({ where: { executionId } });
		const triggerStep = steps.find((s) => s.nodeId === 'trigger');
		const firstStep = steps.find((s) => s.nodeId === 'step-a');
		expect(triggerStep?.status).toBe('completed');
		expect(triggerStep?.outputs).toEqual([[{ json: { hello: 'world' } }]]);
		expect(firstStep?.status).toBe('queued');

		// step:ready references the durable step-record id, not the node id.
		expect(readySteps).toEqual([{ type: 'step:ready', executionId, stepId: firstStep?.id }]);

		await worker.stop();
		await stepQueue.stop();
	});

	it('is idempotent across duplicate execution:enqueued deliveries', async () => {
		const { executionStore, stepStore } = stores();
		const publish = vi.fn();
		const queue: WorkQueue<OrchestrationMessage> = { publish, start: vi.fn(), stop: vi.fn() };
		const handler = new ExecutionStartHandler(
			executionStore,
			stepStore,
			queue,
			noopLifecycleEventPublisher,
		);

		const executionId = generateId();
		await executionStore.createExecution({
			id: executionId,
			workflowId: 'wf-2',
			status: 'queued',
			mode: 'production',
			graph,
			triggerOutputs: null,
		});

		// Delivered twice, both awaited — the CAS is what makes the second a no-op.
		const event = { type: 'execution:enqueued', executionId } as const;
		await handler.handle(event);
		await handler.handle(event);

		// `findOne({ where })`, not `findOneByOrFail`: the latter's overload exceeds
		// TypeScript's instantiation depth on the recursive `triggerOutputs` column type.
		const row = await dataSource
			.getRepository(WorkflowExecution)
			.findOneOrFail({ where: { id: executionId } });
		expect(row.status).toBe('running');

		const steps = await dataSource
			.getRepository(WorkflowStepExecution)
			.find({ where: { executionId } });
		expect(steps).toHaveLength(1); // the trigger's completed row; planning happens downstream
		expect(publish).toHaveBeenCalledTimes(1);
	});
});
