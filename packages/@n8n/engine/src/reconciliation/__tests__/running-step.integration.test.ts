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
import type { StartExecutionResult } from '../../execution';
import type { WorkflowGraph } from '../../graph';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime } from '../../runtime';
import { STALE_RUNNING_STEP_ERROR_NAME } from '../running-step-repair';

const staleness = { queuedMs: 60_000, runningStepMs: 50 };
const secret = 'a'.repeat(32);

const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Webhook', type: 'trigger' },
		{ id: 'node-a', name: 'A', type: 'v1-node' },
	],
	edges: [{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 }],
};

describe('running step with no worker (integration)', () => {
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

	function createRuntime(executor: IStepExecutor) {
		return createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(secret),
			responseSender: noopExecutionResponseSender,
			staleness,
			reconciliationIntervalMs: 20,
			externalDependencies: () => ({ v1StepExecutor: executor }),
		});
	}

	async function waitForFailure(executionId: string): Promise<void> {
		const { executionStore } = createStores(dataSource, staleness);
		await vi.waitFor(
			async () => expect(await executionStore.loadExecutionStatus(executionId)).toBe('failed'),
			{ timeout: 5_000, interval: 20 },
		);
	}

	async function loadStepOfNodeA(executionId: string) {
		const { stepStore } = createStores(dataSource, staleness);
		const [step] = await stepStore.loadStepsByNodeIds(executionId, ['node-a']);
		return step;
	}

	it('fails a running step that no worker runs, and its execution', async () => {
		const { executionStore, stepStore } = createStores(dataSource, staleness);
		const executionId = generateId();
		// The step is `running` and no worker runs it, as after a crash of the
		// worker that claimed it.
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
		const created = await stepStore.createSteps(executionId, [
			{ nodeId: 'trigger', iteration: 0, status: 'completed', outputs: [[{ json: {} }]] },
			{ nodeId: 'node-a', iteration: 0, status: 'queued' },
		]);
		const stepId = created.find(({ nodeId }) => nodeId === 'node-a')?.id ?? '';
		await stepStore.claimStep(stepId);
		const execute = vi.fn<IStepExecutor['execute']>();
		const runtime = createRuntime({ execute });

		runtime.start();
		try {
			await waitForFailure(executionId);
		} finally {
			await runtime.stop();
		}

		expect(execute).not.toHaveBeenCalled();
		expect(await loadStepOfNodeA(executionId)).toMatchObject({
			status: 'failed',
			error: {
				name: STALE_RUNNING_STEP_ERROR_NAME,
				message: expect.stringContaining('"A"') as string,
			},
		});
	});

	it('keeps the step failed when a slow node returns after the stale time', async () => {
		let release!: () => void;
		const held = new Promise<void>((resolve) => (release = resolve));
		const execute = vi.fn<IStepExecutor['execute']>().mockImplementation(async () => {
			await held;
			return { outputs: [[{ json: { late: true } }]] };
		});
		const runtime = createRuntime({ execute });

		runtime.start();
		let executionId = '';
		try {
			const response = await request(runtime.app)
				.post('/api/workflow-executions')
				.set({
					authorization: `Bearer ${mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' })}`,
				})
				.send({
					workflowId: 'wf-1',
					graph,
					workflow: {},
					triggerOutputs: [{}],
					executionId: generateId(),
					callerContext: { hostMode: 'trigger' },
				})
				.expect(201);
			({ executionId } = response.body as StartExecutionResult);

			await waitForFailure(executionId);
			release();
		} finally {
			release();
			// `stop` waits for the handler, so the late outcome write is done after it.
			await runtime.stop();
		}

		expect(execute).toHaveBeenCalledTimes(1);
		const { executionStore } = createStores(dataSource, staleness);
		expect(await executionStore.loadExecutionStatus(executionId)).toBe('failed');
		expect(await loadStepOfNodeA(executionId)).toMatchObject({
			status: 'failed',
			outputs: null,
			error: { name: STALE_RUNNING_STEP_ERROR_NAME },
		});
	});
});
