import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import { createDataSource, WorkflowExecution, WorkflowStepExecution } from '../../database';
import { generateId } from '../../database/generate-id';
import type { IStepExecutor } from '../../dependencies';
import type { WorkflowGraph } from '../../graph';
import type { LifecycleEvent } from '../../lifecycle-events';
import { createInMemoryWorkQueues } from '../../queue';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime, type EngineRuntime } from '../../runtime';

const secret = 'a'.repeat(32);
const authHeader = () => ({
	authorization: `Bearer ${mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' })}`,
});

const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Webhook', type: 'trigger' },
		{ id: 'node-a', name: 'A', type: 'v1-node' },
	],
	edges: [{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 }],
};

// Far in the future, so only the timeout can end the wait.
const longWait = { resumeAt: '2099-01-01T00:00:00.000Z', outputsAtDeadline: [[]] };

/** Every step waits until the timeout ends the execution. A step named `call` asks for a sub-execution first. */
const waitingExecutor = (subExecutionId: string): IStepExecutor => ({
	execute: async ({ node, resume }) => {
		await Promise.resolve();
		if (node.id === 'call' && !resume) {
			return {
				subExecution: {
					executionId: subExecutionId,
					workflowId: 'wf-sub',
					graph,
					workflow: {},
					triggerOutputs: [[{ json: {} }]],
					awaited: true,
				},
			};
		}
		return { wait: longWait };
	},
});

describe('execution timeout (integration)', () => {
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

	/** A runtime that resolves `cancelled` once `count` executions are cancelled. */
	function startRuntime(executor: IStepExecutor, count = 1) {
		let done!: () => void;
		const cancelled = new Promise<void>((resolve) => (done = resolve));
		const events: LifecycleEvent[] = [];
		const runtime: EngineRuntime = createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(secret),
			responseSender: noopExecutionResponseSender,
			queues: createInMemoryWorkQueues(),
			externalDependencies: ({ executionStore }) => {
				const cancelExecution = executionStore.cancelExecution.bind(executionStore);
				let seen = 0;
				vi.spyOn(executionStore, 'cancelExecution').mockImplementation(async (id) => {
					const recorded = await cancelExecution(id);
					if (recorded && ++seen === count) done();
					return recorded;
				});
				return {
					v1StepExecutor: executor,
					lifecycleEventCallback: async (batch) => {
						events.push(...batch);
						await Promise.resolve();
					},
				};
			},
		});
		runtime.start();
		return { runtime, cancelled, events };
	}

	async function start(
		runtime: EngineRuntime,
		{ deadline, workflowGraph = graph }: { deadline?: Date; workflowGraph?: WorkflowGraph },
	): Promise<string> {
		const executionId = generateId();
		await request(runtime.app)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({
				workflowId: 'wf-1',
				graph: workflowGraph,
				workflow: {},
				triggerOutputs: [[{ json: {} }]],
				executionId,
				callerContext: { hostMode: 'trigger' },
				lifecycleEventSubscription: { kind: 'all' },
				deadline: deadline?.toISOString(),
			})
			.expect(201);
		return executionId;
	}

	const loadExecution = async (id: string) =>
		await dataSource.getRepository(WorkflowExecution).findOneOrFail({ where: { id } });
	const loadSteps = async (executionId: string) =>
		await dataSource.getRepository(WorkflowStepExecution).find({ where: { executionId } });

	it('cancels a waiting execution at its deadline, and leaves one with a later deadline or none', async () => {
		const { runtime, cancelled, events } = startRuntime(waitingExecutor(generateId()));

		const deadline = new Date(Date.now() + 500);
		const timedOutId = await start(runtime, { deadline });
		const laterId = await start(runtime, { deadline: new Date(Date.now() + 3_600_000) });
		const noDeadlineId = await start(runtime, {});
		// The sweep interval is a minute, so only the nudge at start can fire it this soon.
		await cancelled;
		await runtime.stop();

		const timedOut = await loadExecution(timedOutId);
		expect(timedOut.status).toBe('cancelled');
		expect(timedOut.deadline).toEqual(deadline);
		// What the read relies on to report a timeout.
		expect(timedOut.finishedAt!.getTime()).toBeGreaterThanOrEqual(deadline.getTime());
		expect((await loadSteps(timedOutId)).find(({ nodeId }) => nodeId === 'node-a')?.status).toBe(
			'cancelled',
		);
		expect(events).toContainEqual(
			expect.objectContaining({ type: 'execution:cancelled', executionId: timedOutId }),
		);

		expect((await loadExecution(laterId)).status).not.toBe('cancelled');
		expect((await loadExecution(noDeadlineId)).status).not.toBe('cancelled');
	});

	it('caps a sub-execution at the deadline of its parent, and cancels both when it passes', async () => {
		const subExecutionId = generateId();
		const { runtime, cancelled } = startRuntime(waitingExecutor(subExecutionId), 2);
		const parentGraph: WorkflowGraph = {
			nodes: [
				{ id: 'trigger', name: 'Webhook', type: 'trigger' },
				{ id: 'call', name: 'Call', type: 'v1-node' },
			],
			edges: [{ from: 'trigger', to: 'call', outputIndex: 0, inputIndex: 0 }],
		};

		const deadline = new Date(Date.now() + 500);
		const parentId = await start(runtime, { deadline, workflowGraph: parentGraph });
		await cancelled;
		await runtime.stop();

		const parent = await loadExecution(parentId);
		const sub = await loadExecution(subExecutionId);
		expect(parent.status).toBe('cancelled');
		expect(sub.status).toBe('cancelled');
		// The sub-execution asked for no deadline of its own, so it has its parent's,
		// and the read reports its cancel as a timeout too.
		expect(sub.deadline).toEqual(deadline);
		expect(sub.finishedAt!.getTime()).toBeGreaterThanOrEqual(deadline.getTime());
	});
});
