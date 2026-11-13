import type { DataSource } from '@n8n/typeorm';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import { TypeOrmExecutionStore, TypeOrmStepStore, type EngineStores } from '../../database';
import { generateId } from '../../database/generate-id';
import { BatchingLifecycleEventPublisher } from '../../lifecycle-events';
import { InMemoryWorkQueue, type OrchestrationMessage, type StepMessage } from '../../queue';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime } from '../create-engine-runtime';

const fakeQueue = <T>() => ({
	publish: vi.fn(async (_message: T) => {}),
	start: vi.fn(),
	stop: vi.fn(async () => {}),
});

vi.mock('../../queue', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../queue')>();
	return { ...actual, InMemoryWorkQueue: vi.fn(actual.InMemoryWorkQueue) };
});

/** Enough of a `DataSource` for the stores: they only hold on to a repository. */
const fakeDataSource = () => ({ getRepository: vi.fn(() => ({})) }) as unknown as DataSource;

const secret = 'a'.repeat(32);
const identityVerifier = new SharedSecretIdentityVerifier(secret);
const token = mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' });
const responseSender = noopExecutionResponseSender;

const runtime = () =>
	createEngineRuntime({
		dataSource: fakeDataSource(),
		admittance: new AllowAllAdmittance(),
		identityVerifier,
		responseSender,
	});

describe('createEngineRuntime', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('mounts the execution API behind authentication', async () => {
		const unauthenticated = await request(runtime().app).post('/api/workflow-executions').send({});
		expect(unauthenticated.status).toBe(401);

		// a rejected body proves the route is mounted without reaching the store
		const response = await request(runtime().app)
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

	it('serves the healthcheck', async () => {
		const response = await request(runtime().app).get('/healthz');

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});

	it('hands the engine stores to the external dependencies', () => {
		let stores: EngineStores | undefined;

		createEngineRuntime({
			dataSource: fakeDataSource(),
			admittance: new AllowAllAdmittance(),
			identityVerifier,
			responseSender,
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
			concurrency: { step: 3 },
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

	it('passes each queue its configured concurrency', () => {
		vi.mocked(InMemoryWorkQueue).mockClear();

		createEngineRuntime({
			dataSource: fakeDataSource(),
			admittance: new AllowAllAdmittance(),
			identityVerifier,
			responseSender,
			concurrency: { orchestration: 2, step: 3 },
		});

		expect(InMemoryWorkQueue).toHaveBeenCalledTimes(2);
		expect(InMemoryWorkQueue).toHaveBeenNthCalledWith(1, expect.anything(), { concurrency: 2 });
		expect(InMemoryWorkQueue).toHaveBeenNthCalledWith(2, expect.anything(), { concurrency: 3 });
	});

	it('runs on the queues the host gives it and builds none of its own', async () => {
		vi.mocked(InMemoryWorkQueue).mockClear();
		const executionId = generateId();
		vi.spyOn(TypeOrmExecutionStore.prototype, 'createExecution').mockResolvedValue();
		// The wait sweeper publishes to the step queue without a database.
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
		expect(InMemoryWorkQueue).not.toHaveBeenCalled();
	});

	it('starts and stops both workers', async () => {
		const engine = runtime();
		engine.start();

		await expect(engine.stop()).resolves.toBeUndefined();
	});
});
