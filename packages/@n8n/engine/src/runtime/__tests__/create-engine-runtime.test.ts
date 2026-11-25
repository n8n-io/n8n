import type { DataSource } from '@n8n/typeorm';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import { TypeOrmExecutionStore, TypeOrmStepStore, type EngineStores } from '../../database';
import { generateId } from '../../database/generate-id';
import { BatchingLifecycleEventPublisher } from '../../lifecycle-events';
import {
	createInMemoryWorkQueues,
	type EngineWorkQueues,
	type OrchestrationMessage,
	type StepMessage,
} from '../../queue';
import { noopExecutionResponseSender } from '../../response-channel';
import {
	createEngineRuntime,
	ENGINE_ROLES,
	type EngineRole,
	type EngineRuntimeOptions,
} from '../create-engine-runtime';

const fakeQueue = <T>() => ({
	publish: vi.fn(async (_message: T) => {}),
	start: vi.fn(),
	stop: vi.fn(async () => {}),
});

/** Enough of a `DataSource` for the stores: they only hold on to a repository. */
const fakeDataSource = () => ({ getRepository: vi.fn(() => ({})) }) as unknown as DataSource;

const secret = 'a'.repeat(32);
const identityVerifier = new SharedSecretIdentityVerifier(secret);
const token = mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' });
const responseSender = noopExecutionResponseSender;

const runtime = (options: Partial<EngineRuntimeOptions> = {}) =>
	createEngineRuntime({
		dataSource: fakeDataSource(),
		admittance: new AllowAllAdmittance(),
		identityVerifier,
		responseSender,
		queues: createInMemoryWorkQueues(),
		...options,
	});

describe('createEngineRuntime', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each<{ name: string; roles?: EngineRole[] }>([
		{ name: 'all roles (default)', roles: undefined },
		{ name: 'api only', roles: ['api'] },
	])('mounts the execution API behind authentication ($name)', async ({ roles }) => {
		const unauthenticated = await request(runtime({ roles }).app)
			.post('/api/workflow-executions')
			.send({});
		expect(unauthenticated.status).toBe(401);

		// a rejected body proves the route is mounted without reaching the store
		const response = await request(runtime({ roles }).app)
			.post('/api/workflow-executions')
			.set('Authorization', `Bearer ${token}`)
			.send({});

		expect(response.status).toBe(400);
	});

	it('does not parse an unauthenticated request body', async () => {
		const response = await request(runtime().app)
			.post('/api/workflow-executions')
			.set('Content-Type', 'application/json')
			.send('{');

		expect(response.status).toBe(401);
		expect(response.body).toEqual({ error: 'unauthenticated' });
	});

	it.each<{ name: string; roles?: EngineRole[] }>([
		{ name: 'all roles (default)', roles: undefined },
		...ENGINE_ROLES.map((role) => ({ name: `${role} only`, roles: [role] })),
	])('serves the healthcheck ($name)', async ({ roles }) => {
		const response = await request(runtime({ roles }).app).get('/healthz');

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});

	it.each<{ name: string; roles: EngineRole[] }>([
		{ name: 'orchestrator only', roles: ['orchestrator'] },
		{ name: 'step-worker only', roles: ['step-worker'] },
		{ name: 'orchestrator and step-worker', roles: ['orchestrator', 'step-worker'] },
	])(
		'needs no identity verifier and serves no execution API without the api role ($name)',
		async ({ roles }) => {
			// 404 and not 401: no authentication middleware is mounted either.
			const response = await request(runtime({ roles, identityVerifier: undefined }).app).post(
				'/api/workflow-executions',
			);

			expect(response.status).toBe(404);
		},
	);

	it.each<{ name: string; roles?: EngineRole[] }>([
		{ name: 'all roles (default)', roles: undefined },
		{ name: 'api only', roles: ['api'] },
	])('refuses the api role without an identity verifier ($name)', ({ roles }) => {
		expect(() => runtime({ roles, identityVerifier: undefined })).toThrow(
			'The api role needs an identity verifier',
		);
	});

	it.each([
		{ name: 'an empty role list', roles: [], error: 'The engine needs at least one role' },
		{
			name: 'an unknown role',
			roles: ['worker'],
			error: 'Unknown engine roles: worker. The valid roles are api, orchestrator, step-worker',
		},
		{
			name: 'an unknown role next to a valid one',
			roles: ['api', 'worker'],
			error: 'Unknown engine roles: worker. The valid roles are api, orchestrator, step-worker',
		},
	])('refuses $name', ({ roles, error }) => {
		// A host that parses a string can pass any value.
		expect(() => runtime({ roles: roles as EngineRole[] })).toThrow(error);
	});

	it.each<{ name: string; roles?: EngineRole[]; consumed: Array<keyof EngineWorkQueues> }>([
		{ name: 'all roles (default)', roles: undefined, consumed: ['orchestration', 'step'] },
		{ name: 'api only', roles: ['api'], consumed: [] },
		{ name: 'orchestrator only', roles: ['orchestrator'], consumed: ['orchestration'] },
		{ name: 'step-worker only', roles: ['step-worker'], consumed: ['step'] },
		{ name: 'a role listed twice', roles: ['step-worker', 'step-worker'], consumed: ['step'] },
	])('starts and stops only the queues its roles consume ($name)', async ({ roles, consumed }) => {
		vi.spyOn(TypeOrmStepStore.prototype, 'nextWaitDeadline').mockResolvedValue(null);
		const queues = {
			orchestration: fakeQueue<OrchestrationMessage>(),
			step: fakeQueue<StepMessage>(),
		};
		const engine = runtime({ roles, queues });

		engine.start();
		await engine.stop();

		for (const name of ['orchestration', 'step'] as const) {
			const times = consumed.includes(name) ? 1 : 0;
			expect(queues[name].start, name).toHaveBeenCalledTimes(times);
			expect(queues[name].stop, name).toHaveBeenCalledTimes(times);
		}
	});

	it.each<{ name: string; roles: EngineRole[]; sweeps: Array<'waits' | 'reconciliation'> }>([
		{ name: 'step-worker only', roles: ['step-worker'], sweeps: ['waits'] },
		{ name: 'orchestrator only', roles: ['orchestrator'], sweeps: ['reconciliation'] },
		{ name: 'api only', roles: ['api'], sweeps: [] },
	])('runs only the sweepers of its roles ($name)', async ({ roles, sweeps }) => {
		const sweepers = {
			waits: vi.spyOn(TypeOrmStepStore.prototype, 'nextWaitDeadline').mockResolvedValue(null),
			reconciliation: vi
				.spyOn(TypeOrmExecutionStore.prototype, 'findStaleQueuedExecutions')
				.mockResolvedValue([]),
		};
		vi.spyOn(TypeOrmStepStore.prototype, 'resumeDueSteps').mockResolvedValue([]);
		vi.spyOn(TypeOrmStepStore.prototype, 'findStaleQueuedSteps').mockResolvedValue([]);
		vi.spyOn(TypeOrmStepStore.prototype, 'findStaleRunningSteps').mockResolvedValue([]);
		const engine = runtime({
			roles,
			queues: {
				orchestration: fakeQueue<OrchestrationMessage>(),
				step: fakeQueue<StepMessage>(),
			},
			waitSweepIntervalMs: 1,
			reconciliationIntervalMs: 1,
		});
		engine.start();

		try {
			// Longer than the 1 ms interval, so a started sweeper has run at least one pass.
			await new Promise((resolve) => setTimeout(resolve, 50));
			for (const name of ['waits', 'reconciliation'] as const) {
				if (sweeps.includes(name)) {
					expect(sweepers[name], name).toHaveBeenCalled();
				} else {
					expect(sweepers[name], name).not.toHaveBeenCalled();
				}
			}
		} finally {
			await engine.stop();
		}
	});

	it('hands the engine stores to the external dependencies', () => {
		let stores: EngineStores | undefined;

		createEngineRuntime({
			dataSource: fakeDataSource(),
			admittance: new AllowAllAdmittance(),
			identityVerifier,
			responseSender,
			queues: createInMemoryWorkQueues(),
			externalDependencies: (given) => {
				stores = given;
				return {};
			},
		});

		expect(stores?.executionStore).toBeDefined();
		expect(stores?.stepStore).toBeDefined();
	});

	it('builds the external dependencies exactly once', () => {
		// Three handlers share the result, so building twice would split them.
		const build = vi.fn().mockReturnValue({});

		createEngineRuntime({
			dataSource: fakeDataSource(),
			admittance: new AllowAllAdmittance(),
			identityVerifier,
			responseSender,
			queues: createInMemoryWorkQueues(),
			externalDependencies: build,
		});

		expect(build).toHaveBeenCalledOnce();
	});

	it('stops the batching publisher it builds for a host lifecycle event callback', async () => {
		// Only the wiring is this test's business: a host callback gets a batching
		// publisher, and stopping the engine stops it.
		const flushOnStop = vi.spyOn(BatchingLifecycleEventPublisher.prototype, 'stop');
		const engine = createEngineRuntime({
			dataSource: fakeDataSource(),
			admittance: new AllowAllAdmittance(),
			identityVerifier,
			responseSender,
			queues: createInMemoryWorkQueues(),
			externalDependencies: () => ({
				lifecycleEventCallback: vi.fn().mockResolvedValue(undefined),
			}),
		});
		engine.start();

		await expect(engine.stop()).resolves.toBeUndefined();
		expect(flushOnStop).toHaveBeenCalledOnce();
	});

	it('runs up to the configured number of steps at once', async () => {
		// The wait sweeper is the one way into the step queue that needs no
		// database: it announces the steps that the store says are due.
		vi.spyOn(TypeOrmStepStore.prototype, 'nextWaitDeadline').mockResolvedValue(null);
		vi.spyOn(TypeOrmStepStore.prototype, 'resumeDueSteps')
			.mockResolvedValueOnce(
				Array.from({ length: 6 }, (_, index) => ({ id: `step-${index}`, executionId: 'exec-1' })),
			)
			.mockResolvedValue([]);
		let inFlight = 0;
		let maxInFlight = 0;
		let openGate = () => {};
		const gate = new Promise<void>((resolve) => {
			openGate = resolve;
		});
		vi.spyOn(TypeOrmStepStore.prototype, 'claimStep').mockImplementation(async () => {
			inFlight += 1;
			maxInFlight = Math.max(maxInFlight, inFlight);
			await gate;
			inFlight -= 1;
			// Nothing to claim, so the handler ends here.
			return null;
		});
		const engine = createEngineRuntime({
			dataSource: fakeDataSource(),
			admittance: new AllowAllAdmittance(),
			identityVerifier,
			responseSender,
			waitSweepIntervalMs: 1,
			queues: createInMemoryWorkQueues({ concurrency: { step: 3 } }),
		});
		engine.start();

		try {
			await vi.waitFor(() => expect(inFlight).toBe(3));
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(maxInFlight).toBe(3);

			openGate();
			await vi.waitFor(() => {
				expect(TypeOrmStepStore.prototype.claimStep).toHaveBeenCalledTimes(6);
				expect(inFlight).toBe(0);
			});
			expect(maxInFlight).toBe(3);
		} finally {
			openGate();
			await engine.stop();
		}
	});

	it('runs on the queues the host gives it', async () => {
		const executionId = generateId();
		vi.spyOn(TypeOrmExecutionStore.prototype, 'createExecution').mockResolvedValue();
		// Lets the wait sweeper publish to the step queue without a database.
		vi.spyOn(TypeOrmStepStore.prototype, 'nextWaitDeadline').mockResolvedValue(null);
		vi.spyOn(TypeOrmStepStore.prototype, 'resumeDueSteps')
			.mockResolvedValueOnce([{ id: 'step-1', executionId }])
			.mockResolvedValue([]);
		const orchestration = fakeQueue<OrchestrationMessage>();
		const step = fakeQueue<StepMessage>();
		const engine = createEngineRuntime({
			dataSource: fakeDataSource(),
			admittance: new AllowAllAdmittance(),
			identityVerifier,
			responseSender,
			waitSweepIntervalMs: 1,
			queues: { orchestration, step },
		});
		engine.start();

		try {
			await request(engine.app)
				.post('/api/workflow-executions')
				.set('Authorization', `Bearer ${token}`)
				.send({
					workflowId: 'wf-1',
					graph: { nodes: [{ id: 'trigger', name: 'Trigger', type: 'trigger' }], edges: [] },
					workflow: {},
					executionId,
					callerContext: { hostMode: 'trigger' },
				})
				.expect(201);
			await vi.waitFor(() =>
				expect(step.publish).toHaveBeenCalledWith({
					type: 'step:ready',
					executionId,
					stepId: 'step-1',
				}),
			);
			expect(orchestration.publish).toHaveBeenCalledExactlyOnceWith({
				type: 'execution:enqueued',
				executionId,
			});
			expect(orchestration.start).toHaveBeenCalledOnce();
			expect(step.start).toHaveBeenCalledOnce();
		} finally {
			await engine.stop();
		}

		expect(orchestration.stop).toHaveBeenCalledOnce();
		expect(step.stop).toHaveBeenCalledOnce();
	});

	it('re-announces a stale queued execution on the orchestration queue the host gives it', async () => {
		vi.spyOn(TypeOrmExecutionStore.prototype, 'findStaleQueuedExecutions')
			.mockResolvedValueOnce([{ id: 'exec-1', staleAfter: new Date() }])
			.mockResolvedValue([]);
		vi.spyOn(TypeOrmExecutionStore.prototype, 'renewQueuedExecution').mockResolvedValue(true);
		const orchestration = fakeQueue<OrchestrationMessage>();
		const engine = createEngineRuntime({
			dataSource: fakeDataSource(),
			admittance: new AllowAllAdmittance(),
			identityVerifier,
			responseSender,
			reconciliationIntervalMs: 1,
			queues: { orchestration, step: fakeQueue<StepMessage>() },
		});
		engine.start();

		try {
			await vi.waitFor(() =>
				expect(orchestration.publish).toHaveBeenCalledExactlyOnceWith({
					type: 'execution:enqueued',
					executionId: 'exec-1',
				}),
			);
		} finally {
			await engine.stop();
		}
	});

	it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 1.5])(
		'refuses a staleness threshold of %s',
		(queuedMs) => {
			expect(() =>
				createEngineRuntime({
					dataSource: fakeDataSource(),
					admittance: new AllowAllAdmittance(),
					identityVerifier,
					responseSender,
					queues: createInMemoryWorkQueues(),
					staleness: { queuedMs, runningStepMs: 60_000 },
				}),
			).toThrow('The staleness threshold "queuedMs" must be a positive whole number');
		},
	);

	it('accepts positive whole staleness thresholds', () => {
		expect(() =>
			createEngineRuntime({
				dataSource: fakeDataSource(),
				admittance: new AllowAllAdmittance(),
				identityVerifier,
				responseSender,
				queues: createInMemoryWorkQueues(),
				staleness: { queuedMs: 1, runningStepMs: 60_000 },
			}),
		).not.toThrow();
	});
});
