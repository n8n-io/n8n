import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import { createDataSource, WorkflowExecution, WorkflowStepExecution } from '../../database';
import { generateId } from '../../database/generate-id';
import type { IStepExecutor, StepExecutionRequest } from '../../dependencies';
import type { WorkflowGraph } from '../../graph';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime } from '../../runtime';
import type { StartExecutionResult } from '../start-execution.service';

const secret = 'a'.repeat(32);
const authHeader = () => ({
	authorization: `Bearer ${mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' })}`,
});

/**
 * trigger ─► loop ─(loop slot)─► body ─┐
 *              ▲                        │
 *              └────────(back-edge)─────┘
 *            loop ─(done slot)─► after
 */
function loopGraph(maxConcurrency: number | undefined): WorkflowGraph {
	return {
		nodes: [
			{ id: 'trigger', name: 'Trigger', type: 'trigger' },
			{
				id: 'loop',
				name: 'Loop',
				type: 'batch',
				config: { batchSize: 1, ...(maxConcurrency === undefined ? {} : { maxConcurrency }) },
			},
			{ id: 'body', name: 'Body', type: 'v1-node' },
			{ id: 'after', name: 'After', type: 'v1-node' },
		],
		edges: [
			{ from: 'trigger', to: 'loop', outputIndex: 0, inputIndex: 0 },
			{ from: 'loop', to: 'body', outputIndex: 1, inputIndex: 0 },
			{ from: 'body', to: 'loop', outputIndex: 0, inputIndex: 0, isBackEdge: true },
			{ from: 'loop', to: 'after', outputIndex: 0, inputIndex: 0 },
		],
	};
}

const items = (count: number) => Array.from({ length: count }, (_, i) => ({ json: { i } }));

/** Runs the body slowly and records how many body steps overlap. */
function slowBodyExecutor(delayMs: number) {
	let inFlight = 0;
	let maxInFlight = 0;
	const requests: StepExecutionRequest[] = [];
	const executor: IStepExecutor = {
		execute: async (req) => {
			requests.push(req);
			if (req.node.id !== 'body') return { outputs: [req.inputs[0]] };
			inFlight += 1;
			maxInFlight = Math.max(maxInFlight, inFlight);
			await new Promise((resolve) => setTimeout(resolve, delayMs));
			inFlight -= 1;
			return { outputs: [req.inputs[0]] };
		},
	};
	return { executor, requests, maxInFlight: () => maxInFlight };
}

describe('concurrent loop (integration)', () => {
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

	async function runLoop(
		executor: IStepExecutor,
		graph: WorkflowGraph,
		itemCount: number,
		{ maxActiveStepsPerExecution }: { maxActiveStepsPerExecution?: number } = {},
	) {
		let done!: () => void;
		const finished = new Promise<void>((resolve) => (done = resolve));
		const runtime = createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(secret),
			responseSender: noopExecutionResponseSender,
			concurrency: { step: 8, orchestration: 4 },
			maxActiveStepsPerExecution,
			externalDependencies: ({ executionStore }) => {
				const finishExecution = executionStore.finishExecution.bind(executionStore);
				vi.spyOn(executionStore, 'finishExecution').mockImplementation(async (id, status) => {
					const recorded = await finishExecution(id, status);
					if (recorded) done();
					return recorded;
				});
				return { v1StepExecutor: executor };
			},
		});
		runtime.start();

		const response = await request(runtime.app)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({
				workflowId: 'wf-loop',
				graph,
				workflow: {},
				triggerOutputs: [items(itemCount)],
				executionId: generateId(),
				callerContext: { hostMode: 'trigger' },
			})
			.expect(201);
		const { executionId } = response.body as StartExecutionResult;
		await finished;
		await runtime.stop();

		const execution = await dataSource
			.getRepository(WorkflowExecution)
			.findOneOrFail({ where: { id: executionId } });
		const steps = await dataSource
			.getRepository(WorkflowStepExecution)
			.find({ where: { executionId }, order: { nodeId: 'ASC', iteration: 'ASC' } });
		return { execution, steps };
	}

	it('runs up to maxConcurrency passes of the body at once and collects the results in order', async () => {
		const body = slowBodyExecutor(40);
		const { execution, steps } = await runLoop(body.executor, loopGraph(3), 10);

		expect(execution.status).toBe('completed');
		expect(body.maxInFlight()).toBe(3);

		// 10 passes plus the terminal row, one body row per pass
		const loopRows = steps.filter((s) => s.nodeId === 'loop');
		expect(loopRows.map((s) => s.iteration)).toEqual(Array.from({ length: 11 }, (_, i) => i));
		expect(loopRows.every((s) => s.status === 'completed')).toBe(true);
		expect(steps.filter((s) => s.nodeId === 'body')).toHaveLength(10);

		// the done slot holds every item in pass order, however the passes finished
		const after = body.requests.find((r) => r.node.id === 'after');
		expect(after?.inputs[0]).toEqual(items(10));
	});

	it('stays sequential without maxConcurrency', async () => {
		const body = slowBodyExecutor(10);
		const { execution } = await runLoop(body.executor, loopGraph(undefined), 5);

		expect(execution.status).toBe('completed');
		expect(body.maxInFlight()).toBe(1);
		expect(body.requests.find((r) => r.node.id === 'after')?.inputs[0]).toEqual(items(5));
	});

	it('is held back by the execution-wide active step limit', async () => {
		const body = slowBodyExecutor(40);
		const { execution } = await runLoop(body.executor, loopGraph(10), 8, {
			maxActiveStepsPerExecution: 2,
		});

		expect(execution.status).toBe('completed');
		expect(body.maxInFlight()).toBeLessThanOrEqual(2);
		expect(body.requests.find((r) => r.node.id === 'after')?.inputs[0]).toEqual(items(8));
	});

	it('fails the execution on the first failed pass and cancels the rest', async () => {
		let calls = 0;
		const executor: IStepExecutor = {
			execute: async (req) => {
				if (req.node.id === 'body' && ++calls === 2) throw new Error('pass 2 broke');
				await new Promise((resolve) => setTimeout(resolve, 20));
				return { outputs: [req.inputs[0]] };
			},
		};
		const { execution, steps } = await runLoop(executor, loopGraph(4), 10);

		expect(execution.status).toBe('failed');
		expect(steps.filter((s) => s.status === 'failed')).toHaveLength(1);
		expect(steps.some((s) => s.status === 'queued' || s.status === 'running')).toBe(false);
	});
});
