import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import {
	createDataSource,
	createStores,
	WorkflowExecution,
	WorkflowStepExecution,
} from '../../database';
import { generateId } from '../../database/generate-id';
import type { IStepExecutor, StepExecutionRequest } from '../../dependencies';
import type { WorkflowGraph } from '../../graph';
import { noopLifecycleEventPublisher } from '../../lifecycle-events';
import type { LifecycleEventCallback, LifecycleEvent } from '../../lifecycle-events';
import { InMemoryWorkQueue, type OrchestrationMessage } from '../../queue';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime } from '../../runtime';
import type { SeededSteps, TriggerOutputs } from '../execution.types';
import type { StartExecutionResult } from '../start-execution.service';
import { StepReadyHandler } from '../step-ready-handler';

const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Webhook', type: 'trigger' },
		{ id: 'node-a', name: 'A', type: 'v1-node' },
	],
	edges: [{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 }],
};

const secret = 'a'.repeat(32);

const authHeader = () => ({
	authorization: `Bearer ${mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' })}`,
});

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

	/**
	 * Runs a workflow through a real engine runtime. Resolves once the
	 * execution's outcome is recorded, which is after every step's own outcome is
	 * durable.
	 */
	async function runWorkflow(
		executor: IStepExecutor,
		triggerOutputs: TriggerOutputs,
		{
			workflowId = 'wf-1',
			graph: workflowGraph = graph,
			seededSteps,
			lifecycleEventCallback,
			waitSweepIntervalMs,
			resolveOn = 'finish',
			finishCount = 1,
		}: {
			workflowId?: string;
			graph?: WorkflowGraph;
			seededSteps?: SeededSteps;
			lifecycleEventCallback?: LifecycleEventCallback;
			waitSweepIntervalMs?: number;
			/**
			 * Which write means the engine has gone quiet. An execution that
			 * suspends and stays suspended never finishes, so those cases wait on
			 * the suspension instead — but a wait the sweep goes on to fire has to
			 * wait for the finish, or the runtime stops before the sweep runs.
			 */
			resolveOn?: 'finish' | 'suspend';
			/** How many executions must finish first: a child finishes before its parent. */
			finishCount?: number;
		} = {},
	) {
		let done!: () => void;
		const finished = new Promise<void>((resolve) => (done = resolve));
		// stop() flushes, so every event is delivered by the time this returns.
		const events: LifecycleEvent[] = [];

		const runtime = createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(secret),
			responseSender: noopExecutionResponseSender,
			waitSweepIntervalMs,
			// also how the test reaches the stores the runtime owns
			externalDependencies: ({ executionStore, stepStore }) => {
				const finishExecution = executionStore.finishExecution.bind(executionStore);
				let finished = 0;
				vi.spyOn(executionStore, 'finishExecution').mockImplementation(async (id, status) => {
					const recorded = await finishExecution(id, status);
					if (resolveOn === 'finish' && recorded && ++finished === finishCount) done();
					return recorded;
				});
				const suspendStep = stepStore.suspendStep.bind(stepStore);
				vi.spyOn(stepStore, 'suspendStep').mockImplementation(async (id, wait) => {
					const recorded = await suspendStep(id, wait);
					if (resolveOn === 'suspend') done();
					return recorded;
				});
				return {
					v1StepExecutor: executor,
					lifecycleEventCallback: async (batch, signal) => {
						events.push(...batch);
						await lifecycleEventCallback?.(batch, signal);
					},
				};
			},
		});
		runtime.start();

		const response = await request(runtime.app)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({
				workflowId,
				graph: workflowGraph,
				workflow: {},
				triggerOutputs,
				seededSteps,
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
			.find({ where: { executionId } });
		return { executionId, execution, steps, events };
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

		const { executionId, execution, steps, events } = await runWorkflow(executor, [
			{ body: { name: 'ada' } },
		]);
		const step = steps.find(({ nodeId }) => nodeId === 'node-a');

		// Covers both emit points, their order, and delivery.
		expect(events.map(({ type }) => type)).toEqual([
			'execution:started',
			'step:started',
			'step:completed',
			'execution:completed',
		]);
		expect(events[0]).toEqual({
			type: 'execution:started',
			executionId,
			workflowId: 'wf-1',
			mode: 'production',
			hostMode: 'trigger',
			at: expect.any(String) as string,
		});
		// The ids are the ones a consumer would re-query the data plane with.
		expect(events[2]).toEqual({
			type: 'step:completed',
			executionId,
			stepId: step?.id,
			nodeId: 'node-a',
			nodeName: 'A',
			iteration: 0,
			outputs: [[{ json: { greeting: 'hi' } }]],
			at: expect.any(String) as string,
		});

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
			iteration: 0,
			callerContext: { hostMode: 'trigger' },
			responseExpectation: { kind: 'none' },
		});
	});

	it('records the error when a step throws', async () => {
		const executor: IStepExecutor = {
			execute: async () => {
				await Promise.resolve();
				throw new TypeError('credentials missing');
			},
		};

		const { execution, steps, events } = await runWorkflow(executor, [{}]);
		const step = steps.find(({ nodeId }) => nodeId === 'node-a');

		expect(events.map(({ type }) => type)).toEqual([
			'execution:started',
			'step:started',
			'step:failed',
			'execution:failed',
		]);

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

	it('suspends a step that declares a wait, and reports the execution as waiting', async () => {
		const waitGraph: WorkflowGraph = {
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
		// far future, so no sweep in a later case can fire this leftover row
		const wait = {
			resumeAt: '2099-01-01T00:00:00.000Z',
			outputsAtDeadline: [[{ json: { passed: 'through' } }]],
			acceptsResumeRequest: false,
		};
		const executor: IStepExecutor = {
			execute: async () => {
				await Promise.resolve();
				return { wait };
			},
		};

		const { execution, steps } = await runWorkflow(executor, [{}], {
			workflowId: 'wf-wait',
			graph: waitGraph,
			resolveOn: 'suspend',
		});

		// nothing settled the step, so the execution has no outcome to record
		expect(execution.status).toBe('waiting');
		expect(execution.finishedAt).toBeNull();

		const waiting = steps.find(({ nodeId }) => nodeId === 'node-a');
		expect(waiting?.status).toBe('waiting');
		expect(waiting?.waitDeclaration).toEqual(wait);
		expect(waiting?.waitTill).toEqual(new Date(wait.resumeAt));
		expect(waiting?.outputs).toBeNull();
	});

	it('fires a due wait, resumes the step and runs the execution to the end', async () => {
		const waitGraph: WorkflowGraph = {
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
		// already past, so the first sweep finds it due
		const wait = {
			resumeAt: '2020-01-01T00:00:00.000Z',
			outputsAtDeadline: [[{ json: { passed: 'through' } }]],
			acceptsResumeRequest: false,
		};
		const requests: StepExecutionRequest[] = [];
		const executor: IStepExecutor = {
			execute: async (request) => {
				requests.push(request);
				await Promise.resolve();
				return request.node.id === 'node-a'
					? { wait }
					: { outputs: [[{ json: { ran: request.node.id } }]] };
			},
		};

		const { execution, steps } = await runWorkflow(executor, [{}], {
			workflowId: 'wf-wait-fires',
			graph: waitGraph,
			waitSweepIntervalMs: 20,
		});

		expect(execution.status).toBe('completed');
		expect(execution.finishedAt).toBeInstanceOf(Date);

		const nodeA = steps.find(({ nodeId }) => nodeId === 'node-a');
		expect(nodeA?.status).toBe('completed');
		expect(nodeA?.resumeCause).toEqual({ kind: 'deadline' });
		// the declaration's captured outputs are what the step emitted
		expect(nodeA?.outputs).toEqual(wait.outputsAtDeadline);

		// node-a ran once, to declare the wait — the deadline resume did not run it
		// again, and its captured outputs became node-b's input
		expect(requests.map(({ node }) => node.id)).toEqual(['node-a', 'node-b']);
		expect(requests[1].inputs).toEqual([[{ json: { passed: 'through' } }]]);
		expect(steps.find(({ nodeId }) => nodeId === 'node-b')?.status).toBe('completed');
	});

	it('cancels a waiting step when a sibling branch fails', async () => {
		// The trigger fans out. A suspends, then B throws, which fails the whole
		// execution. A must not survive as a live row: nothing would ever resume a
		// request-only wait, and the sweep would run a deadline wait inside a
		// failed execution.
		const forkGraph: WorkflowGraph = {
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
		// far future, so no sweep in another case can fire this row if the
		// cancellation regresses
		const wait = {
			resumeAt: '2099-01-01T00:00:00.000Z',
			outputsAtDeadline: [[{ json: { passed: 'through' } }]],
			acceptsResumeRequest: false,
		};
		const executor: IStepExecutor = {
			execute: async (request) => {
				await Promise.resolve();
				if (request.node.id === 'node-a') return { wait };
				throw new Error('node blew up');
			},
		};

		const { execution, steps } = await runWorkflow(executor, [{}], {
			workflowId: 'wf-wait-cancelled',
			graph: forkGraph,
		});

		expect(execution.status).toBe('failed');
		expect(steps.find(({ nodeId }) => nodeId === 'node-b')?.status).toBe('failed');

		const waiting = steps.find(({ nodeId }) => nodeId === 'node-a');
		expect(waiting?.status).toBe('cancelled');
		// the declaration stays on the row as a record of what it was waiting for
		expect(waiting?.waitDeclaration).toEqual(wait);
	});

	it('runs the execution to completion even when every status batch is refused', async () => {
		// A host that cannot be reached costs freshness, never correctness.
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const executor: IStepExecutor = {
			execute: async () => {
				await Promise.resolve();
				return { outputs: [[{ json: { greeting: 'hi' } }]] };
			},
		};

		const { execution, steps } = await runWorkflow(executor, [{}], {
			workflowId: 'wf-refused',
			lifecycleEventCallback: async () => {
				await Promise.reject(new Error('control plane down'));
			},
		});

		expect(execution.status).toBe('completed');
		expect(execution.finishedAt).toBeInstanceOf(Date);
		expect(steps.find(({ nodeId }) => nodeId === 'node-a')?.outputs).toEqual([
			[{ json: { greeting: 'hi' } }],
		]);
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

		const { execution } = await runWorkflow(executor, [{ body: { name: 'ada' } }], {
			workflowId: 'wf-chain',
			graph: chainGraph,
		});

		// both nodes ran, in order, each on what came before it: node-a on the
		// trigger's payload slot, node-b on node-a's output slot 0
		expect(requests.map(({ node }) => node.id)).toEqual(['node-a', 'node-b']);
		expect(requests[0].inputs).toEqual([{ body: { name: 'ada' } }]);
		expect(requests[1].inputs).toEqual([[{ json: { ran: 'node-a' } }]]);

		expect(execution.status).toBe('completed');
		expect(execution.finishedAt).toBeInstanceOf(Date);
	});

	it('records a seeded node with its outputs when the run reaches it, and runs what follows on them', async () => {
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

		const { execution, steps } = await runWorkflow(executor, [[{ json: {} }]], {
			workflowId: 'wf-seeded',
			graph: chainGraph,
			seededSteps: { 'node-a': [[[{ json: { reused: true } }]]] },
		});

		// Only B ran, on A's seeded outputs.
		expect(requests.map(({ node }) => node.id)).toEqual(['node-b']);
		expect(requests[0].inputs).toEqual([[{ json: { reused: true } }]]);
		expect(execution.status).toBe('completed');
		const a = steps.find((step) => step.nodeId === 'node-a');
		expect(a).toMatchObject({ status: 'completed', outputs: [[{ json: { reused: true } }]] });
	});

	it('reaches a seeded node only once everything before it has settled', async () => {
		// trigger -> A -> B (seeded) -> C: C must not run before A, even though
		// B's outputs are known from the start.
		const chainGraph: WorkflowGraph = {
			nodes: [
				{ id: 'trigger', name: 'Webhook', type: 'trigger' },
				{ id: 'node-a', name: 'A', type: 'v1-node' },
				{ id: 'node-b', name: 'B', type: 'v1-node' },
				{ id: 'node-c', name: 'C', type: 'v1-node' },
			],
			edges: [
				{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 },
				{ from: 'node-a', to: 'node-b', outputIndex: 0, inputIndex: 0 },
				{ from: 'node-b', to: 'node-c', outputIndex: 0, inputIndex: 0 },
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

		const { execution, steps } = await runWorkflow(executor, [[{ json: {} }]], {
			workflowId: 'wf-seeded-order',
			graph: chainGraph,
			seededSteps: { 'node-b': [[[{ json: { seeded: true } }]]] },
		});

		expect(requests.map(({ node }) => node.id)).toEqual(['node-a', 'node-c']);
		expect(requests[1].inputs).toEqual([[{ json: { seeded: true } }]]);
		expect(execution.status).toBe('completed');
		// B's row was written when the run reached it, after A settled.
		const a = steps.find((step) => step.nodeId === 'node-a');
		const b = steps.find((step) => step.nodeId === 'node-b');
		expect(b?.status).toBe('completed');
		expect(b!.createdAt.getTime()).toBeGreaterThanOrEqual(a!.updatedAt.getTime());
	});

	it('runs a fan-in once, with each input slot fed by its branch', async () => {
		const diamondGraph: WorkflowGraph = {
			nodes: [
				{ id: 'trigger', name: 'Webhook', type: 'trigger' },
				{ id: 'node-a', name: 'A', type: 'v1-node' },
				{ id: 'node-b', name: 'B', type: 'v1-node' },
				{ id: 'node-m', name: 'M', type: 'v1-node' },
			],
			edges: [
				{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 },
				{ from: 'trigger', to: 'node-b', outputIndex: 0, inputIndex: 0 },
				{ from: 'node-a', to: 'node-m', outputIndex: 0, inputIndex: 0 },
				{ from: 'node-b', to: 'node-m', outputIndex: 0, inputIndex: 1 },
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

		const { execution } = await runWorkflow(executor, [{ body: { name: 'ada' } }], {
			workflowId: 'wf-diamond',
			graph: diamondGraph,
		});

		// the merge ran exactly once, after both branches, one slot per branch
		const merge = requests.filter(({ node }) => node.id === 'node-m');
		expect(merge).toHaveLength(1);
		expect(merge[0].inputs).toEqual([[{ json: { ran: 'node-a' } }], [{ json: { ran: 'node-b' } }]]);

		expect(execution.status).toBe('completed');
		expect(execution.finishedAt).toBeInstanceOf(Date);
	});

	it('settles a conditional diamond: dead chain skipped, merge runs on the live side', async () => {
		// trigger -> if -> {a (out 0), b (out 1) -> c} -> m: the not-taken branch is
		// two nodes long, so its skips must cascade through the event loop
		// before the merge can settle and the execution can finish.
		const branchingGraph: WorkflowGraph = {
			nodes: [
				{ id: 'trigger', name: 'Webhook', type: 'trigger' },
				{ id: 'node-if', name: 'If', type: 'v1-node' },
				{ id: 'node-a', name: 'A', type: 'v1-node' },
				{ id: 'node-b', name: 'B', type: 'v1-node' },
				{ id: 'node-c', name: 'C', type: 'v1-node' },
				{ id: 'node-m', name: 'M', type: 'v1-node' },
			],
			edges: [
				{ from: 'trigger', to: 'node-if', outputIndex: 0, inputIndex: 0 },
				{ from: 'node-if', to: 'node-a', outputIndex: 0, inputIndex: 0 },
				{ from: 'node-if', to: 'node-b', outputIndex: 1, inputIndex: 0 },
				{ from: 'node-b', to: 'node-c', outputIndex: 0, inputIndex: 0 },
				{ from: 'node-a', to: 'node-m', outputIndex: 0, inputIndex: 0 },
				{ from: 'node-c', to: 'node-m', outputIndex: 0, inputIndex: 1 },
			],
		};
		const requests: StepExecutionRequest[] = [];
		const executor: IStepExecutor = {
			execute: async (request) => {
				requests.push(request);
				await Promise.resolve();
				if (request.node.id === 'node-if') {
					// everything went down the taken branch; output slot 1 is dead
					return { outputs: [[{ json: { taken: true } }], null] };
				}
				return { outputs: [[{ json: { ran: request.node.id } }]] };
			},
		};

		const { execution, steps } = await runWorkflow(executor, [{}], {
			workflowId: 'wf-branch',
			graph: branchingGraph,
		});

		// the dead branch never ran a node
		expect(requests.map(({ node }) => node.id).sort()).toEqual(['node-a', 'node-if', 'node-m']);

		// the merge ran once, on the live slot, with the dead slot explicitly null
		const merge = requests.filter(({ node }) => node.id === 'node-m');
		expect(merge).toHaveLength(1);
		expect(merge[0].inputs).toEqual([[{ json: { ran: 'node-a' } }], null]);

		// every reachable node settled, with exactly one row each
		expect(steps.map(({ nodeId, status }) => [nodeId, status]).sort()).toEqual([
			['node-a', 'completed'],
			['node-b', 'skipped'],
			['node-c', 'skipped'],
			['node-if', 'completed'],
			['node-m', 'completed'],
			['trigger', 'completed'],
		]);
		expect(steps.find(({ nodeId }) => nodeId === 'node-b')?.outputs).toBeNull();

		expect(execution.status).toBe('completed');
		expect(execution.finishedAt).toBeInstanceOf(Date);
	});

	it('starts an awaited child from a step result and resumes the step with the child result', async () => {
		const parentGraph: WorkflowGraph = {
			nodes: [
				{ id: 'trigger', name: 'Webhook', type: 'trigger' },
				{ id: 'call', name: 'Call', type: 'v1-node' },
				{ id: 'after', name: 'After', type: 'v1-node' },
			],
			edges: [
				{ from: 'trigger', to: 'call', outputIndex: 0, inputIndex: 0 },
				{ from: 'call', to: 'after', outputIndex: 0, inputIndex: 0 },
			],
		};
		const childGraph: WorkflowGraph = {
			nodes: [
				{ id: 'child-trigger', name: 'When Executed by Another Workflow', type: 'trigger' },
				{ id: 'x', name: 'X', type: 'v1-node' },
			],
			edges: [{ from: 'child-trigger', to: 'x', outputIndex: 0, inputIndex: 0 }],
		};
		const childId = generateId();
		const childResult = [{ nodeId: 'x', iteration: 0, outputs: [[{ json: { ran: 'x' } }]] }];
		const requests: StepExecutionRequest[] = [];
		const executor: IStepExecutor = {
			execute: async (request) => {
				requests.push(request);
				await Promise.resolve();
				if (request.node.id === 'call' && !request.resume) {
					return {
						child: {
							executionId: childId,
							workflowId: 'wf-child',
							graph: childGraph,
							workflow: { id: 'wf-child' },
							triggerOutputs: [[{ json: { in: 1 } }]],
						},
					};
				}
				if (request.node.id === 'call') {
					const result = request.resume?.status === 'completed' ? request.resume.result : null;
					return { outputs: [[{ json: { childResult: result } }]] };
				}
				return { outputs: [[{ json: { ran: request.node.id } }]] };
			},
		};

		const { executionId, execution, steps } = await runWorkflow(executor, [{}], {
			workflowId: 'wf-parent',
			graph: parentGraph,
			finishCount: 2,
		});

		expect(execution.status).toBe('completed');
		const call = steps.find(({ nodeId }) => nodeId === 'call');
		expect(call?.status).toBe('completed');
		expect(call?.waitDeclaration).toEqual({
			childExecutionId: childId,
			acceptsResumeRequest: false,
		});
		expect(call?.resumeCause).toEqual({
			kind: 'child',
			executionId: childId,
			status: 'completed',
			result: childResult,
		});
		expect(call?.outputs).toEqual([[{ json: { childResult } }]]);
		expect(steps.find(({ nodeId }) => nodeId === 'after')?.status).toBe('completed');

		// The child ran as its own execution, linked to the step that waited for it.
		const child = await dataSource
			.getRepository(WorkflowExecution)
			.findOneOrFail({ where: { id: childId } });
		expect(child.status).toBe('completed');
		expect(child.parentExecutionId).toBe(executionId);
		expect(child.parentStepId).toBe(call?.id);
		expect(child.parentAwaited).toBe(true);
		expect(child.mode).toBe('production');
		expect(child.callerContext).toEqual({ hostMode: 'trigger' });
		expect(child.triggerOutputs).toEqual([[{ json: { in: 1 } }]]);

		// `call` ran twice: once to ask for the child, once with its result.
		const callRuns = requests.filter(({ node }) => node.id === 'call');
		expect(callRuns).toHaveLength(2);
		expect(callRuns[0].resume).toBeUndefined();
		expect(callRuns[1].resume?.kind).toBe('child');
		expect(callRuns[1].inputs).toEqual([{}]);
		// What `call` emitted on the resume is what `after` read.
		const afterRun = requests.find(({ node }) => node.id === 'after');
		expect(afterRun?.inputs).toEqual([[{ json: { childResult } }]]);
	});

	it('is idempotent across duplicate step:ready deliveries', async () => {
		const { executionStore, stepStore } = createStores(dataSource);
		const execute = vi.fn().mockResolvedValue({ outputs: [[{ json: { n: 1 } }]] });
		const orchestrationQueue = new InMemoryWorkQueue<OrchestrationMessage>();
		const handler = new StepReadyHandler(
			executionStore,
			stepStore,
			orchestrationQueue,
			{ v1StepExecutor: { execute } },
			noopLifecycleEventPublisher,
			noopExecutionResponseSender,
			{ start: vi.fn() },
		);

		const executionId = generateId();
		await executionStore.createExecution({
			id: executionId,
			workflowId: 'wf-2',
			status: 'running',
			mode: 'production',
			graph: { ...graph, seeded: [] },
			workflow: {},
			triggerOutputs: null,
			callerContext: { hostMode: 'trigger' },
			responseExpectation: { kind: 'none' },
			parent: null,
		});
		const created = await stepStore.createSteps(executionId, [
			// completed steps always carry outputs, as the start handler writes them
			{ nodeId: 'trigger', iteration: 0, status: 'completed', outputs: [{}] },
			{ nodeId: 'node-a', iteration: 0, status: 'queued' },
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
