import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import type { JsonObject } from '../../common';
import {
	createDataSource,
	TypeOrmExecutionStore,
	TypeOrmStepStore,
	WorkflowExecution,
	WorkflowStepExecution,
} from '../../database';
import type { IStepExecutor, StepExecutionRequest } from '../../dependencies';
import type { WorkflowGraph } from '../../graph';
import { InMemoryWorkQueue, type OrchestrationMessage, type StepMessage } from '../../queue';
import { ExecutionStartHandler } from '../execution-start-handler';
import { OrchestrationWorker } from '../orchestration-worker';
import { StartExecutionService } from '../start-execution.service';
import { StepCompletedHandler } from '../step-completed-handler';
import { StepReadyHandler } from '../step-ready-handler';
import { StepWorker } from '../step-worker';

const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Webhook', type: 'trigger' },
		{ id: 'node-a', name: 'A', type: 'v1-node' },
	],
	edges: [{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 }],
};

describe('step execution (integration)', () => {
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

	/**
	 * Wires both workers over shared queues and runs a workflow through them.
	 * Resolves once the execution's outcome is recorded, which is after every
	 * step's own outcome is durable.
	 */
	async function runWorkflow(
		executor: IStepExecutor,
		triggerPayload: JsonObject,
		{ workflowId = 'wf-1', graph: workflowGraph = graph } = {},
	) {
		const { executionStore, stepStore } = stores();
		const orchestrationQueue = new InMemoryWorkQueue<OrchestrationMessage>();
		const stepQueue = new InMemoryWorkQueue<StepMessage>();

		let done!: () => void;
		const finished = new Promise<void>((resolve) => (done = resolve));
		const finishExecution = executionStore.finishExecution.bind(executionStore);
		vi.spyOn(executionStore, 'finishExecution').mockImplementation(async (id, status) => {
			const recorded = await finishExecution(id, status);
			done();
			return recorded;
		});

		const orchestrationWorker = new OrchestrationWorker(
			orchestrationQueue,
			new ExecutionStartHandler(executionStore, stepStore, orchestrationQueue),
			new StepCompletedHandler(executionStore, stepStore, stepQueue),
		);
		const stepWorker = new StepWorker(
			stepQueue,
			new StepReadyHandler(executionStore, stepStore, orchestrationQueue, {
				v1StepExecutor: executor,
			}),
		);
		orchestrationWorker.start();
		stepWorker.start();

		const { executionId } = await new StartExecutionService(
			new AllowAllAdmittance(),
			executionStore,
			orchestrationQueue,
		).start({ workflowId, graph: workflowGraph, triggerPayload });
		await finished;

		await stepWorker.stop();
		await orchestrationWorker.stop();

		const execution = await dataSource
			.getRepository(WorkflowExecution)
			.findOneOrFail({ where: { id: executionId } });
		const steps = await dataSource
			.getRepository(WorkflowStepExecution)
			.find({ where: { executionId } });
		return { executionId, execution, steps };
	}

	it('runs a queued step and persists its outputs', async () => {
		const requests: StepExecutionRequest[] = [];
		const executor: IStepExecutor = {
			execute: async (request) => {
				requests.push(request);
				await Promise.resolve();
				return { outputs: [[{ json: { greeting: 'hi' } }]] };
			},
		};

		const { executionId, execution, steps } = await runWorkflow(executor, {
			body: { name: 'ada' },
		});
		const step = steps.find(({ nodeId }) => nodeId === 'node-a');

		expect(execution.status).toBe('completed');
		expect(execution.finishedAt).toBeInstanceOf(Date);
		expect(step?.status).toBe('completed');
		expect(step?.outputs).toEqual([[{ json: { greeting: 'hi' } }]]);
		expect(step?.error).toBeNull();

		// the trigger payload reaches the executor as the step's input slot 0
		expect(requests).toHaveLength(1);
		expect(requests[0].inputs).toEqual([{ body: { name: 'ada' } }]);
		expect(requests[0].node.id).toBe('node-a');
		expect(requests[0].context).toEqual({
			executionId,
			stepId: step?.id,
			workflowId: 'wf-1',
			mode: 'production',
		});
	});

	it('records the error when a step throws', async () => {
		const executor: IStepExecutor = {
			execute: async () => {
				await Promise.resolve();
				throw new TypeError('credentials missing');
			},
		};

		const { execution, steps } = await runWorkflow(executor, {});
		const step = steps.find(({ nodeId }) => nodeId === 'node-a');

		// the failure is terminal for the execution too
		expect(execution.status).toBe('failed');
		expect(execution.finishedAt).toBeInstanceOf(Date);
		expect(step?.status).toBe('failed');
		expect(step?.error).toEqual({
			name: 'TypeError',
			message: 'credentials missing',
			// the stack survives the round trip through jsonb
			stack: expect.stringContaining('TypeError: credentials missing') as string,
		});
		expect(step?.outputs).toBeNull();
	});

	it('runs a chain of steps, feeding each output forward, and finishes the execution', async () => {
		const chainGraph: WorkflowGraph = {
			nodes: [
				{ id: 'trigger', name: 'Webhook', type: 'trigger' },
				{ id: 'node-a', name: 'A', type: 'v1-node' },
				{ id: 'node-b', name: 'B', type: 'v1-node' },
			],
			edges: [
				{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 },
				{ from: 'node-a', to: 'node-b', outputIndex: 0, inputIndex: 0 },
			],
		};
		const requests: StepExecutionRequest[] = [];
		const executor: IStepExecutor = {
			execute: async (request) => {
				requests.push(request);
				await Promise.resolve();
				return { outputs: [[{ json: { ran: request.node.id } }]] };
			},
		};

		const { execution } = await runWorkflow(
			executor,
			{ body: { name: 'ada' } },
			{ workflowId: 'wf-chain', graph: chainGraph },
		);

		// both nodes ran, in order, each on what came before it: node-a on the
		// trigger's payload slot, node-b on node-a's output slot 0
		expect(requests.map(({ node }) => node.id)).toEqual(['node-a', 'node-b']);
		expect(requests[0].inputs).toEqual([{ body: { name: 'ada' } }]);
		expect(requests[1].inputs).toEqual([[{ json: { ran: 'node-a' } }]]);

		expect(execution.status).toBe('completed');
		expect(execution.finishedAt).toBeInstanceOf(Date);
	});

	it('is idempotent across duplicate step:ready deliveries', async () => {
		const { executionStore, stepStore } = stores();
		const execute = vi.fn().mockResolvedValue({ outputs: [[{ json: { n: 1 } }]] });
		const orchestrationQueue = new InMemoryWorkQueue<OrchestrationMessage>();
		const handler = new StepReadyHandler(executionStore, stepStore, orchestrationQueue, {
			v1StepExecutor: { execute },
		});

		const { id: executionId } = await executionStore.createExecution({
			workflowId: 'wf-2',
			status: 'running',
			mode: 'production',
			graph,
			triggerPayload: null,
		});
		const created = await stepStore.createSteps([
			// completed steps always carry outputs, as the start handler writes them
			{ executionId, nodeId: 'trigger', status: 'completed', outputs: [{}] },
			{ executionId, nodeId: 'node-a', status: 'queued' },
		]);
		const stepId = created.find(({ nodeId }) => nodeId === 'node-a')!.id;

		// Delivered twice, both awaited — the CAS is what makes the second a no-op.
		const event = { type: 'step:ready', executionId, stepId } as const;
		await handler.handle(event);
		await handler.handle(event);

		expect(execute).toHaveBeenCalledTimes(1);
		const step = await dataSource
			.getRepository(WorkflowStepExecution)
			.findOneOrFail({ where: { id: stepId } });
		expect(step.status).toBe('completed');
	});
});
