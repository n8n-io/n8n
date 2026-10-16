import type { DataSource } from '@n8n/typeorm';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import type { EngineStores } from '../../database';
import type { EngineLogger } from '../../logging';
import type { OrchestrationMessage, StepMessage, WorkQueue } from '../../queue';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime, type EngineRuntimeInstrumentation } from '../create-engine-runtime';

const secret = 'a'.repeat(32);
const token = mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' });
const logger: EngineLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
const options = () => ({
	dataSource: {
		driver: { options: { type: 'postgres' }, master: {} },
		getRepository: vi.fn(() => ({})),
	} as unknown as DataSource,
	admittance: new AllowAllAdmittance(),
	identityVerifier: new SharedSecretIdentityVerifier(secret),
	responseSender: noopExecutionResponseSender,
	logger,
});

describe('runtime instrumentation seam', () => {
	it('wraps each adapter once and gives both workers and the host the wrapped adapters', async () => {
		const createExecution = vi.fn().mockResolvedValue(undefined);
		const transitionStatus = vi.fn().mockResolvedValue(false);
		const claimStep = vi.fn().mockResolvedValue(null);
		const nextWaitDeadline = vi.fn().mockResolvedValue(null);
		let wrappedStores: EngineStores | undefined;
		let stepQueue: WorkQueue<StepMessage> | undefined;
		const publications: Array<{ queue: string; message: OrchestrationMessage | StepMessage }> = [];
		const starts = vi.fn();
		const stops = vi.fn();
		const wrapStores = vi.fn((raw: EngineStores): EngineStores => {
			wrappedStores = {
				executionStore: Object.assign(Object.create(raw.executionStore), {
					createExecution,
					transitionStatus,
				}),
				stepStore: Object.assign(Object.create(raw.stepStore), { claimStep, nextWaitDeadline }),
				executionViewStore: raw.executionViewStore,
			};
			return wrappedStores;
		});
		const wrapQueueCalls = vi.fn();
		const wrapQueue = <TMessage extends OrchestrationMessage | StepMessage>(
			name: 'orchestration' | 'step',
			raw: WorkQueue<TMessage>,
		): WorkQueue<TMessage> => {
			wrapQueueCalls(name, raw);
			const wrapped: WorkQueue<TMessage> = {
				publish: async (message) => {
					publications.push({ queue: name, message });
					await raw.publish(message);
				},
				start: (handler) => {
					starts(name);
					raw.start(handler);
				},
				stop: async () => {
					stops(name);
					await raw.stop();
				},
			};
			if (name === 'step') stepQueue = wrapped as WorkQueue<StepMessage>;
			return wrapped;
		};
		const instrumentation: EngineRuntimeInstrumentation = { wrapStores, wrapQueue };
		const externalDependencies = vi.fn(() => ({}));
		const runtime = createEngineRuntime({ ...options(), instrumentation, externalDependencies });
		expect(wrapStores).toHaveBeenCalledOnce();
		expect(wrapQueueCalls).toHaveBeenCalledTimes(2);
		expect(externalDependencies).toHaveBeenCalledExactlyOnceWith(wrappedStores);
		await stepQueue?.publish({ type: 'step:ready', executionId: 'exec-1', stepId: 'step-1' });
		runtime.start();
		try {
			await request(runtime.app)
				.post('/api/workflow-executions')
				.set('Authorization', `Bearer ${token}`)
				.send({
					executionId: '019f1184-7000-7000-8000-000000000001',
					workflowId: 'wf-1',
					workflow: {},
					graph: { nodes: [{ id: 'trigger', name: 'Trigger', type: 'trigger' }], edges: [] },
					callerContext: { hostMode: 'trigger' },
				})
				.expect(201);
			await vi.waitFor(() => expect(transitionStatus).toHaveBeenCalledOnce());
			expect(createExecution).toHaveBeenCalledOnce();
			expect(claimStep).toHaveBeenCalledExactlyOnceWith('step-1');
			expect(nextWaitDeadline).toHaveBeenCalledOnce();
			expect(publications.map(({ queue }) => queue)).toEqual(['step', 'orchestration']);
			expect(starts.mock.calls).toEqual([['orchestration'], ['step']]);
		} finally {
			await runtime.stop();
		}
		expect(stops.mock.calls).toEqual([['orchestration'], ['step']]);
	});

	it('forwards request middleware without running it for health probes', async () => {
		const middleware = vi.fn((_req, _res, next) => next());
		const runtime = createEngineRuntime({ ...options(), requestMiddleware: middleware });
		await request(runtime.app).get('/healthz').expect(200);
		expect(middleware).not.toHaveBeenCalled();
		await request(runtime.app).get('/api/workflow-executions/missing').expect(401);
		expect(middleware).toHaveBeenCalledOnce();
	});
});
