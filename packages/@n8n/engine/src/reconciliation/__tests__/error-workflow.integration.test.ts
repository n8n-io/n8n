import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import { createDataSource, createStores } from '../../database';
import { WorkflowExecution } from '../../database/entities';
import { generateId } from '../../database/generate-id';
import type { ErrorWorkflowResolver, ErrorWorkflowStart, IStepExecutor } from '../../dependencies';
import type { StartExecutionResult } from '../../execution';
import type { WorkflowGraph } from '../../graph';
import { createInMemoryWorkQueues } from '../../queue';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime } from '../../runtime';
import { STALE_RUNNING_STEP_ERROR_NAME } from '../running-step-repair';

const secret = 'a'.repeat(32);
const authorization = `Bearer ${mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' })}`;

/** A trigger and one node that the test executor fails. */
const failingGraph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Webhook', type: 'trigger' },
		{ id: 'node-a', name: 'A', type: 'v1-node' },
	],
	edges: [{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 }],
};

/** The error workflow: only its Error Trigger, so it completes at once. */
const errorGraph: WorkflowGraph = {
	nodes: [{ id: 'error-trigger', name: 'Error Trigger', type: 'trigger' }],
	edges: [],
};

const failingExecutor: IStepExecutor = {
	execute: async () => {
		throw new TypeError('The service refused the request');
	},
};

function errorStart(): ErrorWorkflowStart {
	return {
		kind: 'start',
		executionId: generateId(),
		workflowId: 'wf-error',
		graph: errorGraph,
		workflow: { id: 'wf-error', name: 'Error handler' },
		triggerOutputs: [[{ json: { from: 'the control plane' } }]],
		callerContext: { hostMode: 'error', projectId: 'project-1' },
		resolveErrorWorkflowOnFailure: false,
	};
}

describe('error workflows (integration)', () => {
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

	function createRuntime(
		resolveErrorWorkflow: ErrorWorkflowResolver,
		{
			executor = failingExecutor,
			staleness = { queuedMs: 60_000, runningStepMs: 60_000, errorWorkflowPendingMs: 60_000 },
		}: {
			executor?: IStepExecutor;
			staleness?: { queuedMs: number; runningStepMs: number; errorWorkflowPendingMs: number };
		} = {},
	) {
		return createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(secret),
			responseSender: noopExecutionResponseSender,
			staleness,
			reconciliationIntervalMs: 20,
			queues: createInMemoryWorkQueues(),
			externalDependencies: () => ({ v1StepExecutor: executor, resolveErrorWorkflow }),
		});
	}

	async function startFailingExecution(
		runtime: ReturnType<typeof createRuntime>,
		resolveErrorWorkflowOnFailure: boolean,
	): Promise<string> {
		const response = await request(runtime.app)
			.post('/api/workflow-executions')
			.set({ authorization })
			.send({
				workflowId: 'wf-failing',
				graph: failingGraph,
				workflow: { id: 'wf-failing', settings: { errorWorkflow: 'wf-error' } },
				triggerOutputs: [{}],
				executionId: generateId(),
				callerContext: { hostMode: 'trigger', projectId: 'project-1' },
				resolveErrorWorkflowOnFailure,
			})
			.expect(201);
		return (response.body as StartExecutionResult).executionId;
	}

	/** The error executions of `sourceId`. */
	async function errorExecutionsOf(sourceId: string) {
		return await dataSource.getRepository(WorkflowExecution).find({
			where: { errorSourceExecutionId: sourceId },
		});
	}

	async function markerOf(executionId: string): Promise<Date | null> {
		const { executionStore } = createStores(dataSource);
		return (await executionStore.loadErrorWorkflowState(executionId)).dueAt;
	}

	async function waitForErrorExecution(sourceId: string) {
		await vi.waitFor(
			async () => {
				const [errorExecution] = await errorExecutionsOf(sourceId);
				expect(errorExecution?.status).toBe('completed');
			},
			{ timeout: 5_000, interval: 20 },
		);
		return await errorExecutionsOf(sourceId);
	}

	it('starts the error execution after a failure, with the link, and clears the marker', async () => {
		const resolve = vi.fn<ErrorWorkflowResolver>().mockImplementation(async () => errorStart());
		const runtime = createRuntime(resolve);

		runtime.start();
		let failedId = '';
		let errorExecutions: WorkflowExecution[] = [];
		try {
			failedId = await startFailingExecution(runtime, true);
			errorExecutions = await waitForErrorExecution(failedId);
		} finally {
			await runtime.stop();
		}

		expect(resolve).toHaveBeenCalledExactlyOnceWith({
			executionId: failedId,
			workflowId: 'wf-failing',
			workflow: { id: 'wf-failing', settings: { errorWorkflow: 'wf-error' } },
			hostMode: 'trigger',
			hasParent: false,
			failedStep: {
				nodeName: 'A',
				error: expect.objectContaining({ name: 'TypeError' }) as unknown,
			},
		});
		expect(errorExecutions).toHaveLength(1);
		expect(errorExecutions[0]).toMatchObject({
			workflowId: 'wf-error',
			mode: 'production',
			callerContext: { hostMode: 'error', projectId: 'project-1' },
			errorSourceWorkflowId: 'wf-failing',
			parentExecutionId: null,
			resolveErrorWorkflowOnFailure: false,
		});
		expect(await markerOf(failedId)).toBeNull();
	});

	it('asks nothing and sets no marker when the host expects no error workflow', async () => {
		const resolve = vi.fn<ErrorWorkflowResolver>();
		const runtime = createRuntime(resolve);
		const { executionStore } = createStores(dataSource);

		runtime.start();
		let failedId = '';
		try {
			failedId = await startFailingExecution(runtime, false);
			await vi.waitFor(
				async () => expect(await executionStore.loadExecutionStatus(failedId)).toBe('failed'),
				{ timeout: 5_000, interval: 20 },
			);
		} finally {
			await runtime.stop();
		}

		expect(resolve).not.toHaveBeenCalled();
		expect(await markerOf(failedId)).toBeNull();
		expect(await errorExecutionsOf(failedId)).toEqual([]);
	});

	it('clears the marker when the host answers none, and starts nothing', async () => {
		const resolve = vi
			.fn<ErrorWorkflowResolver>()
			.mockResolvedValue({ kind: 'none', reason: 'no error workflow' });
		const runtime = createRuntime(resolve);

		runtime.start();
		let failedId = '';
		try {
			failedId = await startFailingExecution(runtime, true);
			await vi.waitFor(() => expect(resolve).toHaveBeenCalled(), { timeout: 5_000, interval: 20 });
			await vi.waitFor(async () => expect(await markerOf(failedId)).toBeNull(), {
				timeout: 5_000,
				interval: 20,
			});
		} finally {
			await runtime.stop();
		}

		expect(await errorExecutionsOf(failedId)).toEqual([]);
	});

	it('starts the error execution from the repair when the first try fails', async () => {
		const resolve = vi
			.fn<ErrorWorkflowResolver>()
			.mockRejectedValueOnce(new Error('control plane down'))
			.mockImplementation(async () => errorStart());
		const runtime = createRuntime(resolve, {
			staleness: { queuedMs: 60_000, runningStepMs: 60_000, errorWorkflowPendingMs: 50 },
		});

		runtime.start();
		let failedId = '';
		try {
			failedId = await startFailingExecution(runtime, true);
			await waitForErrorExecution(failedId);
		} finally {
			await runtime.stop();
		}

		expect(resolve).toHaveBeenCalledTimes(2);
		expect(await errorExecutionsOf(failedId)).toHaveLength(1);
		expect(await markerOf(failedId)).toBeNull();
	});

	it('asks nothing and sets no marker when an execution is cancelled, unlike v1', async () => {
		const resolve = vi.fn<ErrorWorkflowResolver>().mockImplementation(async () => errorStart());
		let release!: () => void;
		const held = new Promise<void>((resolveHeld) => (release = resolveHeld));
		const runtime = createRuntime(resolve, {
			executor: {
				execute: async () => {
					await held;
					return { outputs: [[{ json: {} }]] };
				},
			},
		});

		runtime.start();
		let cancelledId = '';
		try {
			cancelledId = await startFailingExecution(runtime, true);
			await vi.waitFor(
				async () => {
					const { stepStore } = createStores(dataSource);
					const [step] = await stepStore.loadStepsByNodeIds(cancelledId, ['node-a']);
					expect(step?.status).toBe('running');
				},
				{ timeout: 5_000, interval: 20 },
			);
			await request(runtime.app)
				.post(`/api/workflow-executions/${cancelledId}/cancel`)
				.set({ authorization })
				.expect(200);
		} finally {
			release();
			await runtime.stop();
		}

		expect(resolve).not.toHaveBeenCalled();
		expect(await markerOf(cancelledId)).toBeNull();
		expect(await errorExecutionsOf(cancelledId)).toEqual([]);
	});

	it('starts the error execution after the running-step repair fails a stale step', async () => {
		const resolve = vi.fn<ErrorWorkflowResolver>().mockImplementation(async () => errorStart());
		const { executionStore, stepStore } = createStores(dataSource);
		// A step that a crashed worker claimed: no executor ever runs it.
		const failedId = generateId();
		await executionStore.createExecution({
			id: failedId,
			workflowId: 'wf-failing',
			status: 'running',
			mode: 'production',
			graph: { ...failingGraph, seeded: [] },
			workflow: { id: 'wf-failing' },
			triggerOutputs: [{}],
			callerContext: { hostMode: 'trigger' },
			responseExpectation: { kind: 'none' },
			parent: null,
			errorSource: null,
			resolveErrorWorkflowOnFailure: true,
		});
		const created = await stepStore.createSteps(failedId, [
			{ nodeId: 'trigger', iteration: 0, status: 'completed', outputs: [[{ json: {} }]] },
			{ nodeId: 'node-a', iteration: 0, status: 'queued' },
		]);
		await createStores(dataSource, {
			queuedMs: 60_000,
			runningStepMs: 1,
		}).stepStore.claimStep(created.find(({ nodeId }) => nodeId === 'node-a')?.id ?? '');
		const runtime = createRuntime(resolve, {
			staleness: { queuedMs: 60_000, runningStepMs: 50, errorWorkflowPendingMs: 60_000 },
		});

		runtime.start();
		try {
			await waitForErrorExecution(failedId);
		} finally {
			await runtime.stop();
		}

		expect(resolve).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				failedStep: {
					nodeName: 'A',
					error: expect.objectContaining({ name: STALE_RUNNING_STEP_ERROR_NAME }) as unknown,
				},
			}),
		);
	});

	it('lets only one claim of a pending error workflow win', async () => {
		const { executionStore } = createStores(dataSource, {
			queuedMs: 60_000,
			runningStepMs: 60_000,
			errorWorkflowPendingMs: 1,
		});
		const sourceId = generateId();
		await executionStore.createExecution({
			id: sourceId,
			workflowId: 'wf-failing',
			status: 'running',
			mode: 'production',
			graph: { ...failingGraph, seeded: [] },
			workflow: {},
			triggerOutputs: null,
			callerContext: { hostMode: 'trigger' },
			responseExpectation: { kind: 'none' },
			parent: null,
			errorSource: null,
			resolveErrorWorkflowOnFailure: true,
		});
		await executionStore.finishExecution(sourceId, 'failed');
		await new Promise((resolve) => setTimeout(resolve, 5));

		const due = await executionStore.findDueErrorWorkflows(new Date(), 500);
		const dueAt = due.find(({ id }) => id === sourceId)?.dueAt;
		expect(dueAt).toBeInstanceOf(Date);

		const claims = await Promise.all([
			executionStore.deferErrorWorkflow(sourceId, dueAt as Date),
			executionStore.deferErrorWorkflow(sourceId, dueAt as Date),
		]);
		expect(claims.sort()).toEqual([false, true]);
	});
});
