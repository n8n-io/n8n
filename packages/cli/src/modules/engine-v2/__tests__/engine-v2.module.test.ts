import { mockInstance } from '@n8n/backend-test-utils';
import { EngineConfig, ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { EngineV2WebhookResponder } from '@/services/engine-v2-webhook-responder.service';
import { RedisClientService } from '@/services/redis-client.service';

import { EngineControlPlaneServer } from '../engine-control-plane-server';
import { EngineDataPlaneClient } from '../engine-data-plane-client';
import { EngineV2Module } from '../engine-v2.module';
import { EngineV2Runtime } from '../engine-v2.runtime';
import type { RedisResponseSubscriber } from '../response-channel/redis-execution-response-receiver';
import type { RedisResponsePublisher } from '../response-channel/redis-execution-response-sender';

describe('EngineV2Module', () => {
	let module: EngineV2Module;
	let executionsConfig: ExecutionsConfig;
	let engineConfig: EngineConfig;
	let runtime: EngineV2Runtime;
	let client: EngineDataPlaneClient;
	let controlPlaneServer: EngineControlPlaneServer;

	beforeEach(() => {
		vi.clearAllMocks();

		executionsConfig = mockInstance(ExecutionsConfig, { mode: 'regular' });
		engineConfig = mockInstance(EngineConfig, { authSecret: '' });
		runtime = mockInstance(EngineV2Runtime);
		client = mockInstance(EngineDataPlaneClient);
		controlPlaneServer = mockInstance(EngineControlPlaneServer);
		mockInstance(EngineV2WebhookResponder);
		Container.set(EngineDataPlaneProxyService, new EngineDataPlaneProxyService());

		module = new EngineV2Module();
	});

	describe('init', () => {
		it('refuses to start in queue mode', async () => {
			executionsConfig.mode = 'queue';

			await expect(module.init()).rejects.toThrow('does not support queue mode');
			expect(runtime.init).not.toHaveBeenCalled();
		});

		it('starts the runtime in regular mode', async () => {
			await module.init();

			expect(runtime.init).toHaveBeenCalled();
		});

		it('registers the client as the data plane provider', async () => {
			const proxy = Container.get(EngineDataPlaneProxyService);
			const request = {
				workflowId: 'wf-1',
				graph: { nodes: [], edges: [] },
				workflow: {},
				executionId: '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa',
				callerContext: { hostMode: 'trigger' },
			};
			await expect(proxy.startExecution(request)).rejects.toThrow('N8N_ENABLED_MODULES');

			await module.init();
			await proxy.startExecution(request);

			expect(client.startExecution).toHaveBeenCalledWith(request);
		});

		it('starts the control plane server before the engine, so a report always lands', async () => {
			await module.init();

			expect(controlPlaneServer.start).toHaveBeenCalled();
			expect(vi.mocked(controlPlaneServer.start).mock.invocationCallOrder[0]).toBeLessThan(
				vi.mocked(runtime.init).mock.invocationCallOrder[0],
			);
		});

		it('generates a secret when unset', async () => {
			await module.init();

			expect(engineConfig.authSecret).toMatch(/^[0-9a-f]{64}$/);
		});

		it('leaves a configured secret untouched', async () => {
			engineConfig.authSecret = 'a-configured-secret';

			await module.init();

			expect(engineConfig.authSecret).toBe('a-configured-secret');
		});

		it('releases both Redis clients when the response receiver fails to start', async () => {
			engineConfig.responseTransport = 'redis';
			const publisher = mock<RedisResponsePublisher>();
			const subscriber = mock<RedisResponseSubscriber>();
			subscriber.on.mockImplementation(() => {
				throw new Error('Subscriber failed');
			});
			mockInstance(GlobalConfig, { redis: mock<GlobalConfig['redis']>({ prefix: 'n8n' }) });
			mockInstance(RedisClientService, {
				toValidPrefix: (prefix: string) => prefix,
				createClient: vi.fn(({ type }: { type: string }) =>
					type === 'publisher(n8n)' ? publisher : subscriber,
				) as unknown as RedisClientService['createClient'],
			});

			await expect(module.init()).rejects.toThrow('Subscriber failed');

			expect(publisher.disconnect).toHaveBeenCalledTimes(1);
			expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
			expect(runtime.init).not.toHaveBeenCalled();
		});
	});

	describe('shutdown', () => {
		it('shuts the runtime down', async () => {
			await module.shutdown();

			expect(runtime.shutdown).toHaveBeenCalled();
		});

		it('stops the control plane server after the engine, so a final flush still lands', async () => {
			await module.shutdown();

			expect(controlPlaneServer.stop).toHaveBeenCalled();
			expect(vi.mocked(controlPlaneServer.stop).mock.invocationCallOrder[0]).toBeGreaterThan(
				vi.mocked(runtime.shutdown).mock.invocationCallOrder[0],
			);
		});
	});
});
