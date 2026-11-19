import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import { createDataSource, createStores } from '../../database';
import { generateId } from '../../database/generate-id';
import type { IStepExecutor } from '../../dependencies';
import type { ExecutionStatus, NewStepRecord, StartExecutionResult } from '../../execution';
import type { WorkflowGraph } from '../../graph';
import { createInMemoryWorkQueues } from '../../queue';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime } from '../../runtime';

const staleness = { queuedMs: 50, runningStepMs: 60_000 };
const secret = 'a'.repeat(32);

const triggerNode = { id: 'trigger', name: 'Webhook', type: 'trigger' } as const;
const nodeA = { id: 'node-a', name: 'A', type: 'v1-node' } as const;
const nodeB = { id: 'node-b', name: 'B', type: 'v1-node' } as const;

/** trigger -> A -> B */
const chain: WorkflowGraph = {
	nodes: [triggerNode, nodeA, nodeB],
	edges: [
		{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 },
		{ from: 'node-a', to: 'node-b', outputIndex: 0, inputIndex: 0 },
	],
};

/** trigger -> A, and trigger -> B */
const fanOut: WorkflowGraph = {
	nodes: [triggerNode, nodeA, nodeB],
	edges: [
		{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 },
		{ from: 'trigger', to: 'node-b', outputIndex: 0, inputIndex: 0 },
	],
};

const completedTrigger: NewStepRecord = {
	nodeId: 'trigger',
	iteration: 0,
	status: 'completed',
	outputs: [[{ json: {} }]],
};

describe('settled step with no message (integration)', () => {
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

	function createRuntime(execute: IStepExecutor['execute']) {
		return createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(secret),
			responseSender: noopExecutionResponseSender,
			staleness,
			reconciliationIntervalMs: 20,
			queues: createInMemoryWorkQueues(),
			externalDependencies: () => ({ v1StepExecutor: { execute } }),
		});
	}

	/**
	 * Creates a `running` execution and its step rows, and publishes no message,
	 * as after a stop of the process that had the messages in memory.
	 */
	async function createExecutionWithSteps(graph: WorkflowGraph, records: NewStepRecord[]) {
		const { executionStore, stepStore } = createStores(dataSource, staleness);
		const executionId = generateId();
		await executionStore.createExecution({
			id: executionId,
			workflowId: 'wf-1',
			status: 'running',
			mode: 'production',
			graph: { ...graph, seeded: [] },
			workflow: {},
			triggerOutputs: [{}],
			callerContext: { hostMode: 'trigger' },
			responseExpectation: { kind: 'none' },
			parent: null,
		});
		const created = await stepStore.createSteps(executionId, records);
		const stepIds = Object.fromEntries(created.map(({ id, nodeId }) => [nodeId, id]));
		return { executionId, stepIds, stepStore };
	}

	async function waitForStatus(executionId: string, status: ExecutionStatus): Promise<void> {
		const { executionStore } = createStores(dataSource, staleness);
		await vi.waitFor(
			async () => expect(await executionStore.loadExecutionStatus(executionId)).toBe(status),
			{ timeout: 5_000, interval: 20 },
		);
	}

	/** Waits until the detector can return no step of the execution. */
	async function waitForAcknowledgement(executionId: string): Promise<void> {
		const { stepStore } = createStores(dataSource, staleness);
		const farFuture = new Date(Date.now() + 3_600_000);
		await vi.waitFor(
			async () => {
				const stale = await stepStore.findStaleSettledSteps(farFuture, 500);
				expect(stale.filter((step) => step.executionId === executionId)).toEqual([]);
			},
			{ timeout: 5_000, interval: 20 },
		);
	}

	async function statusOf(executionId: string, nodeId: string) {
		const { stepStore } = createStores(dataSource, staleness);
		const [step] = await stepStore.loadStepsByNodeIds(executionId, [nodeId]);
		return step?.status;
	}

	it('ends an execution whose last `step:settled` message was lost', async () => {
		const { executionId, stepIds, stepStore } = await createExecutionWithSteps(chain, [
			completedTrigger,
			{ nodeId: 'node-a', iteration: 0, status: 'completed', outputs: [[{ json: {} }]] },
			{ nodeId: 'node-b', iteration: 0, status: 'completed', outputs: [[{ json: {} }]] },
		]);
		// Only the message of the last step is lost.
		await stepStore.acknowledgeSettledStep(stepIds.trigger);
		await stepStore.acknowledgeSettledStep(stepIds['node-a']);
		const execute = vi.fn<IStepExecutor['execute']>();
		const runtime = createRuntime(execute);

		runtime.start();
		try {
			await waitForStatus(executionId, 'completed');
			await waitForAcknowledgement(executionId);
		} finally {
			await runtime.stop();
		}

		expect(execute).not.toHaveBeenCalled();
	});

	it('continues an execution whose lost message was of a step in the middle', async () => {
		const { executionId, stepIds, stepStore } = await createExecutionWithSteps(chain, [
			completedTrigger,
			{ nodeId: 'node-a', iteration: 0, status: 'completed', outputs: [[{ json: {} }]] },
		]);
		await stepStore.acknowledgeSettledStep(stepIds.trigger);
		const execute = vi.fn<IStepExecutor['execute']>().mockResolvedValue({ outputs: [[]] });
		const runtime = createRuntime(execute);

		runtime.start();
		try {
			await waitForStatus(executionId, 'completed');
			await waitForAcknowledgement(executionId);
		} finally {
			await runtime.stop();
		}

		expect(execute).toHaveBeenCalledTimes(1);
		expect(execute.mock.calls[0][0].node.id).toBe('node-b');
	});

	it('fails an execution whose lost message was of a failed step, and cancels its queued steps', async () => {
		const { executionId, stepIds, stepStore } = await createExecutionWithSteps(fanOut, [
			completedTrigger,
			{ nodeId: 'node-a', iteration: 0, status: 'queued' },
			{ nodeId: 'node-b', iteration: 0, status: 'queued' },
		]);
		await stepStore.acknowledgeSettledStep(stepIds.trigger);
		await stepStore.claimStep(stepIds['node-a']);
		await stepStore.failStep(stepIds['node-a'], 1, { name: 'Error', message: 'boom' });
		// From here `claimStep` refuses the step of node B, so that step stays
		// `queued` until the execution fails.
		const execute = vi.fn<IStepExecutor['execute']>();
		const runtime = createRuntime(execute);

		runtime.start();
		try {
			await waitForStatus(executionId, 'failed');
			await waitForAcknowledgement(executionId);
		} finally {
			await runtime.stop();
		}

		expect(await statusOf(executionId, 'node-b')).toBe('cancelled');
		expect(execute).not.toHaveBeenCalled();
	});

	it('changes nothing with a message for a step whose successor row exists', async () => {
		// No row is acknowledged, so the repair also publishes `step:settled` for
		// the trigger step. The successor of that step has its row already.
		const { executionId } = await createExecutionWithSteps(chain, [
			completedTrigger,
			{ nodeId: 'node-a', iteration: 0, status: 'completed', outputs: [[{ json: {} }]] },
		]);
		const execute = vi.fn<IStepExecutor['execute']>().mockResolvedValue({ outputs: [[]] });
		const runtime = createRuntime(execute);

		runtime.start();
		try {
			await waitForStatus(executionId, 'completed');
			await waitForAcknowledgement(executionId);
		} finally {
			await runtime.stop();
		}

		expect(execute).toHaveBeenCalledTimes(1);
		expect(execute.mock.calls[0][0].node.id).toBe('node-b');
	});

	it('acknowledges every settled step of an execution that lost no message', async () => {
		const execute = vi.fn<IStepExecutor['execute']>().mockResolvedValue({ outputs: [[]] });
		const runtime = createRuntime(execute);

		runtime.start();
		try {
			const response = await request(runtime.app)
				.post('/api/workflow-executions')
				.set({
					authorization: `Bearer ${mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' })}`,
				})
				.send({
					workflowId: 'wf-1',
					graph: chain,
					workflow: {},
					triggerOutputs: [{}],
					executionId: generateId(),
					callerContext: { hostMode: 'trigger' },
				})
				.expect(201);
			const { executionId } = response.body as StartExecutionResult;

			await waitForStatus(executionId, 'completed');
			await waitForAcknowledgement(executionId);
		} finally {
			await runtime.stop();
		}

		expect(execute).toHaveBeenCalledTimes(2);
	});
});
