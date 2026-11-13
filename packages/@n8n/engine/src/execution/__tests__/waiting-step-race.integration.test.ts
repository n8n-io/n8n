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
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime, type EngineRuntime } from '../../runtime';
import type { StartExecutionResult } from '../start-execution.service';
import type { StepStore } from '../step-store';

const secret = 'a'.repeat(32);

const authHeader = () => ({
	authorization: `Bearer ${mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' })}`,
});

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => (resolve = r));
	return { promise, resolve };
}

const trigger = { id: 'trigger', name: 'Webhook', type: 'trigger' } as const;
const nodeA = { id: 'node-a', name: 'A', type: 'v1-node' } as const;
const nodeB = { id: 'node-b', name: 'B', type: 'v1-node' } as const;
const edgeFromTrigger = (to: string) => ({ from: 'trigger', to, outputIndex: 0, inputIndex: 0 });

// A request-only wait: nothing but a resume request can end it.
const wait = { resumeBinding: 'step' as const };

function resolveAfterSuspend(stepStore: StepStore, suspended: { resolve: () => void }) {
	const suspendStep = stepStore.suspendStep.bind(stepStore);
	vi.spyOn(stepStore, 'suspendStep').mockImplementation(async (id, declaration) => {
		const recorded = await suspendStep(id, declaration);
		suspended.resolve();
		return recorded;
	});
}

describe('a step that starts to wait after its execution ended (integration)', () => {
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

	function createRuntime({
		executor,
		stepConcurrency,
		spyOn,
	}: {
		executor: IStepExecutor;
		stepConcurrency?: number;
		spyOn: (stepStore: StepStore) => void;
	}): EngineRuntime {
		const runtime = createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(secret),
			responseSender: noopExecutionResponseSender,
			concurrency: { step: stepConcurrency },
			externalDependencies: ({ stepStore }) => {
				spyOn(stepStore);
				return { v1StepExecutor: executor };
			},
		});
		runtime.start();
		return runtime;
	}

	/** Runs `scenario` against a started runtime and stops the runtime afterwards. */
	async function runThenStop<T>(runtime: EngineRuntime, scenario: () => Promise<T>) {
		try {
			return await scenario();
		} finally {
			await runtime.stop();
		}
	}

	async function startExecution(runtime: EngineRuntime, graph: WorkflowGraph) {
		const response = await request(runtime.app)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({
				workflowId: 'wf-wait-after-end',
				graph,
				workflow: {},
				triggerOutputs: [{}],
				executionId: generateId(),
				callerContext: { hostMode: 'trigger' },
			})
			.expect(201);
		return (response.body as StartExecutionResult).executionId;
	}

	async function loadState(executionId: string) {
		const execution = await dataSource
			.getRepository(WorkflowExecution)
			.findOneOrFail({ where: { id: executionId } });
		const steps = await dataSource
			.getRepository(WorkflowStepExecution)
			.find({ where: { executionId } });
		const statusOf = (nodeId: string) => steps.find((step) => step.nodeId === nodeId)?.status;
		return { executionStatus: execution.status, statusOf };
	}

	it('cancels a step that starts to wait after the execution was cancelled', async () => {
		// The cancel request does not go through the step queue, so it ends the
		// execution while the step still runs.
		const started = deferred();
		const cancelled = deferred();
		const suspended = deferred();
		const executor: IStepExecutor = {
			execute: async () => {
				started.resolve();
				await cancelled.promise;
				return { wait };
			},
		};

		const runtime = createRuntime({
			executor,
			spyOn: (stepStore) => resolveAfterSuspend(stepStore, suspended),
		});
		const executionId = await runThenStop(runtime, async () => {
			const id = await startExecution(runtime, {
				nodes: [trigger, nodeA],
				edges: [edgeFromTrigger(nodeA.id)],
			});
			await started.promise;
			await request(runtime.app)
				.post(`/api/workflow-executions/${id}/cancel`)
				.set(authHeader())
				.expect(200);
			cancelled.resolve();
			await suspended.promise;
			return id;
		});

		const { executionStatus, statusOf } = await loadState(executionId);
		expect(executionStatus).toBe('cancelled');
		expect(statusOf(nodeA.id)).toBe('cancelled');
	});

	it('cancels a step that starts to wait after a sibling branch failed the execution', async () => {
		// A and B run at the same time. B throws while A still runs, which fails
		// the execution. A returns its wait only after the failure has cancelled
		// the pending steps.
		const aStarted = deferred();
		const pendingStepsCancelled = deferred();
		const aSuspended = deferred();
		const executor: IStepExecutor = {
			execute: async ({ node }) => {
				if (node.id === nodeA.id) {
					aStarted.resolve();
					await pendingStepsCancelled.promise;
					return { wait };
				}
				await aStarted.promise;
				throw new Error('node blew up');
			},
		};

		const runtime = createRuntime({
			executor,
			stepConcurrency: 4,
			spyOn: (stepStore) => {
				const cancelPendingSteps = stepStore.cancelPendingSteps.bind(stepStore);
				vi.spyOn(stepStore, 'cancelPendingSteps').mockImplementation(async (id) => {
					await cancelPendingSteps(id);
					pendingStepsCancelled.resolve();
				});
				resolveAfterSuspend(stepStore, aSuspended);
			},
		});
		const executionId = await runThenStop(runtime, async () => {
			const id = await startExecution(runtime, {
				nodes: [trigger, nodeA, nodeB],
				edges: [edgeFromTrigger(nodeA.id), edgeFromTrigger(nodeB.id)],
			});
			await aSuspended.promise;
			return id;
		});

		const { executionStatus, statusOf } = await loadState(executionId);
		expect(executionStatus).toBe('failed');
		expect(statusOf(nodeB.id)).toBe('failed');
		expect(statusOf(nodeA.id)).toBe('cancelled');
	});
});
