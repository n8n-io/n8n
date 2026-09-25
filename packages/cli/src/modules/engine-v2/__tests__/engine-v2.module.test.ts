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
import { InMemoryExecutionResponseReceiver } from '../response-channel/in-memory-execution-response-receiver';
import { RedisExecutionResponseReceiver } from '../response-channel/redis-execution-response-receiver';
import type { RedisResponseSubscriber } from '../response-channel/redis-execution-response-receiver';

describe('EngineV2Module', () => {
	let module: EngineV2Module;
	let executionsConfig: ExecutionsConfig;
	let engineConfig: EngineConfig;
	let runtime: EngineV2Runtime;
	let client: EngineDataPlaneClient;
	let controlPlaneServer: EngineControlPlaneServer;
	let webhookResponder: EngineV2WebhookResponder;
	let redisClientService: RedisClientService;
	let subscriber: ReturnType<typeof mock<RedisResponseSubscriber>>;

	beforeEach(() => {
		vi.clearAllMocks();

		executionsConfig = mockInstance(ExecutionsConfig, { mode: 'regular' });
		engineConfig = mockInstance(EngineConfig, { authSecret: '', mode: 'in-process' });
		runtime = mockInstance(EngineV2Runtime);
		client = mockInstance(EngineDataPlaneClient);
		controlPlaneServer = mockInstance(EngineControlPlaneServer);
		webhookResponder = mockInstance(EngineV2WebhookResponder);
		subscriber = mock<RedisResponseSubscriber>();
		mockInstance(GlobalConfig, { redis: mock<GlobalConfig['redis']>({ prefix: 'n8n' }) });
		redisClientService = mockInstance(RedisClientService, {
			toValidPrefix: (prefix: string) => prefix,
			createClient: vi.fn(() => subscriber) as unknown as RedisClientService['createClient'],
		});
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

		it('receives responses in memory and opens no Redis client', async () => {
			await module.init();

			expect(webhookResponder.useReceiver).toHaveBeenCalledWith(
				expect.any(InMemoryExecutionResponseReceiver),
			);
			expect(runtime.init).toHaveBeenCalledWith(expect.anything());
			expect(redisClientService.createClient).not.toHaveBeenCalled();
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
	});

	describe('remote mode', () => {
		beforeEach(() => {
			engineConfig.mode = 'remote';
			engineConfig.authSecret = 'a'.repeat(32);
			engineConfig.baseUrl = 'http://engine:3000';
		});

		it('starts the control plane server and not the data plane', async () => {
			await module.init();

			expect(controlPlaneServer.start).toHaveBeenCalled();
			expect(runtime.init).not.toHaveBeenCalled();
		});

		it('registers the client as the data plane provider', async () => {
			await module.init();

			const proxy = Container.get(EngineDataPlaneProxyService);
			await proxy.startExecution({
				workflowId: 'wf-1',
				graph: { nodes: [], edges: [] },
				workflow: {},
				executionId: '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa',
				callerContext: { hostMode: 'trigger' },
			});

			expect(client.startExecution).toHaveBeenCalled();
		});

		it('receives responses over Redis', async () => {
			await module.init();

			expect(redisClientService.createClient).toHaveBeenCalledTimes(1);
			expect(redisClientService.createClient).toHaveBeenCalledWith({ type: 'subscriber(n8n)' });
			expect(subscriber.on).toHaveBeenCalledWith('message', expect.any(Function));
			expect(webhookResponder.useReceiver).toHaveBeenCalledWith(
				expect.any(RedisExecutionResponseReceiver),
			);
		});

		it('releases the Redis client when the response receiver fails to start', async () => {
			subscriber.on.mockImplementation(() => {
				throw new Error('Subscriber failed');
			});

			await expect(module.init()).rejects.toThrow('Subscriber failed');

			expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
			expect(webhookResponder.useReceiver).not.toHaveBeenCalled();
		});

		it('refuses to start without a shared secret', async () => {
			engineConfig.authSecret = '';

			await expect(module.init()).rejects.toThrow('N8N_ENGINE_AUTH_SECRET');
			expect(controlPlaneServer.start).not.toHaveBeenCalled();
		});

		it('does not generate a secret, since the data plane cannot learn it', async () => {
			engineConfig.authSecret = '';

			await module.init().catch(() => {});

			expect(engineConfig.authSecret).toBe('');
		});

		it('refuses to start without the data plane address', async () => {
			engineConfig.baseUrl = '';

			await expect(module.init()).rejects.toThrow('N8N_ENGINE_BASE_URL');
			expect(controlPlaneServer.start).not.toHaveBeenCalled();
		});

		it('stops the response receiver and the control plane server, not the data plane', async () => {
			await module.init();

			await module.shutdown();

			expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
			expect(controlPlaneServer.stop).toHaveBeenCalled();
			expect(runtime.shutdown).not.toHaveBeenCalled();
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
