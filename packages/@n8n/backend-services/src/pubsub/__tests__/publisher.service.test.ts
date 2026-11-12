import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import type { Redis as SingleNodeClient } from 'ioredis';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { RedisClientService } from '../../services/redis-client.service';
import { Publisher } from '../publisher.service';
import { PUBLISHER_SHUTDOWN_TIMEOUT_MS } from '../pubsub.constants';
import type { PubSub } from '../pubsub.types';

describe('Publisher', () => {
	const client = mock<SingleNodeClient>();
	const logger = mockLogger();
	const hostId = 'main-bnxa1riryKUNHtln';
	const instanceSettings = mock<InstanceSettings>({ hostId });
	const redisClientService = mock<RedisClientService>({ createClient: () => client });
	const executionsConfig = mockInstance(ExecutionsConfig, { mode: 'queue' });
	const globalConfig = mockInstance(GlobalConfig, { redis: { prefix: 'n8n' } });

	describe('constructor', () => {
		it('should init Redis client in scaling mode', () => {
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);

			expect(publisher.getClient()).toEqual(client);
		});

		it('should not init Redis client in regular mode', () => {
			const regularModeConfig = mockInstance(ExecutionsConfig, { mode: 'regular' });
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				regularModeConfig,
				globalConfig,
			);

			expect(publisher.getClient()).toBeUndefined();
		});
	});

	describe('shutdown', () => {
		const createPublisher = () =>
			new Publisher(logger, redisClientService, instanceSettings, executionsConfig, globalConfig);

		beforeEach(() => {
			client.quit.mockReset();
			client.disconnect.mockReset();
		});

		it('should wait for pending commands before it disconnects', async () => {
			let finishQuit = () => {};
			client.quit.mockReturnValue(
				new Promise<'OK'>((resolve) => {
					finishQuit = () => resolve('OK');
				}),
			);

			const shuttingDown = createPublisher().shutdown();
			await Promise.resolve();

			expect(client.quit).toHaveBeenCalledOnce();
			expect(client.disconnect).not.toHaveBeenCalled();

			finishQuit();
			await shuttingDown;

			expect(client.disconnect).toHaveBeenCalledOnce();
		});

		it('should disconnect when pending commands do not finish in time', async () => {
			vi.useFakeTimers();
			try {
				client.quit.mockReturnValue(new Promise<'OK'>(() => {}));

				const shuttingDown = createPublisher().shutdown();
				await vi.advanceTimersByTimeAsync(PUBLISHER_SHUTDOWN_TIMEOUT_MS - 1);
				expect(client.disconnect).not.toHaveBeenCalled();

				await vi.advanceTimersByTimeAsync(1);
				await shuttingDown;

				expect(client.disconnect).toHaveBeenCalledOnce();
			} finally {
				vi.useRealTimers();
			}
		});

		it('should disconnect when quit fails', async () => {
			client.quit.mockRejectedValue(new Error('Connection is closed.'));

			await expect(createPublisher().shutdown()).resolves.toBeUndefined();

			expect(client.disconnect).toHaveBeenCalledOnce();
		});
	});

	describe('publishCommand', () => {
		it('should do nothing if not in scaling mode', async () => {
			const regularModeConfig = mockInstance(ExecutionsConfig, { mode: 'regular' });
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				regularModeConfig,
				globalConfig,
			);
			const msg = mock<PubSub.Command>({ command: 'reload-license' });

			await publisher.publishCommand(msg);

			expect(client.publish).not.toHaveBeenCalled();
		});

		it('should publish command into prefixed pubsub channel', async () => {
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);
			const msg = mock<PubSub.Command>({ command: 'reload-license' });

			await publisher.publishCommand(msg);

			expect(client.publish).toHaveBeenCalledWith(
				'n8n:n8n.commands',
				JSON.stringify({ ...msg, senderId: hostId, selfSend: false, debounce: true }),
			);
		});

		it('should not debounce `add-webhooks-triggers-and-pollers`', async () => {
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);
			const msg = mock<PubSub.Command>({ command: 'add-webhooks-triggers-and-pollers' });

			await publisher.publishCommand(msg);

			expect(client.publish).toHaveBeenCalledWith(
				'n8n:n8n.commands',
				JSON.stringify({
					...msg,
					_isMockObject: true,
					senderId: hostId,
					selfSend: true,
					debounce: false,
				}),
			);
		});

		it('should not debounce `agent-chat-integration-changed`', async () => {
			// Each message is a discrete connect/disconnect delta, so coalescing them
			// drops one: a channel replacement publishes both back to back, and peers
			// would act only on the trailing connect and keep the old runtime alive.
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);
			const msg = mock<PubSub.Command>({ command: 'agent-chat-integration-changed' });

			await publisher.publishCommand(msg);

			expect(client.publish).toHaveBeenCalledWith(
				'n8n:n8n.commands',
				JSON.stringify({
					...msg,
					_isMockObject: true,
					senderId: hostId,
					selfSend: false,
					debounce: false,
				}),
			);
		});

		it('should not debounce `remove-triggers-and-pollers`', async () => {
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);
			const msg = mock<PubSub.Command>({ command: 'remove-triggers-and-pollers' });

			await publisher.publishCommand(msg);

			expect(client.publish).toHaveBeenCalledWith(
				'n8n:n8n.commands',
				JSON.stringify({
					...msg,
					_isMockObject: true,
					senderId: hostId,
					selfSend: true,
					debounce: false,
				}),
			);
		});

		it.each([
			'relay-agent-execution-update',
			'cancel-agent-chat-execution',
			'relay-agent-background-tasks-update',
			'relay-agent-message-queue-update',
			'relay-agent-update',
			'display-workflow-activation',
			'display-workflow-deactivation',
			'display-workflow-activation-error',
			'display-workflow-publication-status',
			'reload-public-api-rate-limit-settings',
			'promotion-environment-changed',
		] as const)('should not debounce `%s`', async (command) => {
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);
			const msg = mock<PubSub.Command>({ command });

			await publisher.publishCommand(msg);

			expect(client.publish).toHaveBeenCalledWith(
				'n8n:n8n.commands',
				JSON.stringify({
					...msg,
					_isMockObject: true,
					senderId: hostId,
					selfSend: false,
					debounce: false,
				}),
			);
		});
	});

	describe('publishWorkerResponse', () => {
		it('should publish worker response into prefixed pubsub channel', async () => {
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);
			const msg = mock<PubSub.WorkerResponse>({
				response: 'response-to-get-worker-status',
			});

			await publisher.publishWorkerResponse(msg);

			expect(client.publish).toHaveBeenCalledWith('n8n:n8n.worker-response', JSON.stringify(msg));
		});
	});

	describe('publishMcpRelay', () => {
		it('should do nothing if not in scaling mode', async () => {
			// Clear previous mock calls from other tests
			client.publish.mockClear();

			const regularModeConfig = mockInstance(ExecutionsConfig, { mode: 'regular' });
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				regularModeConfig,
				globalConfig,
			);
			const msg = { sessionId: 'session-123', messageId: 'msg-456', response: { test: true } };

			await publisher.publishMcpRelay(msg);

			expect(client.publish).not.toHaveBeenCalled();
		});

		it('should publish MCP relay message to prefixed channel', async () => {
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);
			const msg = { sessionId: 'session-123', messageId: 'msg-456', response: { test: true } };

			await publisher.publishMcpRelay(msg);

			expect(client.publish).toHaveBeenCalledWith('n8n:n8n.mcp-relay', JSON.stringify(msg));
		});

		it('should apply configured prefix to MCP relay channel', async () => {
			const customConfig = mockInstance(GlobalConfig, { redis: { prefix: 'n8n-instance-1' } });
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				customConfig,
			);
			const msg = { sessionId: 'session-123', messageId: 'msg-456', response: { test: true } };

			await publisher.publishMcpRelay(msg);

			expect(client.publish).toHaveBeenCalledWith(
				'n8n-instance-1:n8n.mcp-relay',
				JSON.stringify(msg),
			);
		});
	});

	describe('prefix isolation', () => {
		it('should apply configured prefix to both command and worker response channels', async () => {
			const customConfig = mockInstance(GlobalConfig, { redis: { prefix: 'n8n-instance-1' } });
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				customConfig,
			);

			const commandMsg = mock<PubSub.Command>({ command: 'reload-license' });
			await publisher.publishCommand(commandMsg);
			expect(client.publish).toHaveBeenCalledWith(
				'n8n-instance-1:n8n.commands',
				expect.any(String),
			);

			const workerMsg = mock<PubSub.WorkerResponse>({
				response: 'response-to-get-worker-status',
			});
			await publisher.publishWorkerResponse(workerMsg);
			expect(client.publish).toHaveBeenCalledWith(
				'n8n-instance-1:n8n.worker-response',
				JSON.stringify(workerMsg),
			);
		});
	});
});
