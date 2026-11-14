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
import type { StartExecutionResult, StepStore } from '../../execution';
import type { WorkflowGraph } from '../../graph';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime } from '../../runtime';

const staleness = { queuedMs: 50, runningStepMs: 60_000 };
const secret = 'a'.repeat(32);

describe('queued step with no event (integration)', () => {
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

	/** A runtime with short thresholds, and the step store that it uses. */
	function createRuntime(executor: IStepExecutor) {
		const stores: { stepStore?: StepStore } = {};
		const runtime = createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(secret),
			responseSender: noopExecutionResponseSender,
			staleness,
			reconciliationIntervalMs: 20,
			externalDependencies: ({ stepStore }) => {
				stores.stepStore = stepStore;
				return { v1StepExecutor: executor };
			},
		});
		return { runtime, stores };
	}

	async function waitForCompletion(executionId: string): Promise<void> {
		const { executionStore } = createStores(dataSource, staleness);
		await vi.waitFor(
			async () => expect(await executionStore.loadExecutionStatus(executionId)).toBe('completed'),
			{ timeout: 5_000, interval: 20 },
		);
	}

	it('runs a step whose event was never published', async () => {
		const { executionStore, stepStore } = createStores(dataSource, staleness);
		const executionId = generateId();
		// The rows exist and no `step:ready` event does, as after a crash between
		// the insert of the step and the publish.
		await executionStore.createExecution({
			id: executionId,
			workflowId: 'wf-1',
			status: 'running',
			mode: 'production',
			graph: {
				nodes: [
					{ id: 'trigger', name: 'Webhook', type: 'trigger' },
					{ id: 'node-a', name: 'A', type: 'v1-node' },
				],
				edges: [{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 }],
				seeded: [],
			},
			workflow: {},
			triggerOutputs: [{}],
			callerContext: { hostMode: 'trigger' },
			responseExpectation: { kind: 'none' },
			parent: null,
		});
		await stepStore.createSteps(executionId, [
			{ nodeId: 'trigger', iteration: 0, status: 'completed', outputs: [[{ json: {} }]] },
			{ nodeId: 'node-a', iteration: 0, status: 'queued' },
		]);
		const execute = vi.fn<IStepExecutor['execute']>().mockResolvedValue({ outputs: [[]] });
		const { runtime } = createRuntime({ execute });

		runtime.start();
		try {
			await waitForCompletion(executionId);
		} finally {
			await runtime.stop();
		}

		expect(execute).toHaveBeenCalledTimes(1);
	});

	it('runs a step once when its first event is slow and the repair publishes a second one', async () => {
		const graph: WorkflowGraph = {
			nodes: [
				{ id: 'trigger', name: 'Webhook', type: 'trigger' },
				{ id: 'node-a', name: 'A', type: 'v1-node' },
				{ id: 'node-b', name: 'B', type: 'v1-node' },
			],
			edges: [
				{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 },
				{ from: 'trigger', to: 'node-b', outputIndex: 0, inputIndex: 0 },
			],
		};
		// The step queue runs one handler at a time. The first step holds the
		// handler, so the `step:ready` event of the other step stays on the step
		// queue, and that step stays `queued` past its `stale_after` time.
		let release!: () => void;
		const held = new Promise<void>((resolve) => (release = resolve));
		const ran: string[] = [];
		const execute: IStepExecutor['execute'] = async ({ node }) => {
			ran.push(node.id);
			if (ran.length === 1) await held;
			return { outputs: [[]] };
		};
		const { runtime, stores } = createRuntime({ execute });
		const stepStore = stores.stepStore;
		if (!stepStore) throw new Error('expected the step store of the runtime');
		const renewQueuedStep = vi.spyOn(stepStore, 'renewQueuedStep');

		runtime.start();
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
			const { executionId } = response.body as StartExecutionResult;

			// The repair renewed the step that is still `queued`, so the second event
			// is on the step queue behind the first one.
			await vi.waitFor(
				async () => {
					const renewals = await Promise.all(renewQueuedStep.mock.results.map((r) => r.value));
					expect(renewals).toContain(true);
				},
				{ timeout: 5_000, interval: 20 },
			);
			release();
			await waitForCompletion(executionId);
		} finally {
			release();
			await runtime.stop();
		}

		expect(ran.toSorted()).toEqual(['node-a', 'node-b']);
	});
});
