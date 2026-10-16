import { createMcpHandler, McpServer, type McpHttpHandler } from '@modelcontextprotocol/server';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { PubSubMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';
import { PubSubEventBus } from '@/scaling/pubsub/pubsub.eventbus';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';

import { McpToolChangeService } from '../mcp-tool-change.service';

describe('McpToolChangeService', () => {
	const config = mockDeep<GlobalConfig>();
	const publisher = mock<Publisher>();
	const logger = mock<Logger>();
	let service: McpToolChangeService;
	let unsubscribe: Array<() => void>;

	beforeEach(() => {
		vi.resetAllMocks();
		config.multiMainSetup.enabled = false;
		publisher.publishCommand.mockResolvedValue(undefined);
		logger.scoped.mockReturnValue(logger);
		service = new McpToolChangeService(config, publisher, logger);
		unsubscribe = [];
	});

	afterEach(async () => {
		for (const stop of unsubscribe) stop();
		await service.shutdown();
	});

	test('separates users, grants, and clients while normalizing scope order', () => {
		const auth = { grantedScopes: ['execution:read', 'workflow:read'] };
		const client = { name: 'client', version: '1' };
		const key = service.getChannel('user-1', auth, client);
		expect(
			service.getChannel(
				'user-1',
				{ grantedScopes: ['workflow:read', 'execution:read', 'workflow:read'] },
				client,
			),
		).toBe(key);
		expect(service.getChannel('user-2', auth, client)).not.toBe(key);
		expect(service.getChannel('user-1', { grantedScopes: ['workflow:read'] }, client)).not.toBe(
			key,
		);
		expect(service.getChannel('user-1', auth, { name: 'other', version: '1' })).not.toBe(key);
		expect(service.getChannel('user-1', { grantedScopes: undefined })).not.toBe(
			service.getChannel('user-1', { grantedScopes: [] }),
		);
	});

	test('refreshes each new subscription, including after reconnect', async () => {
		const bus = await service.getBus('channel');
		const first = vi.fn();
		const stop = bus.subscribe(first);
		unsubscribe.push(stop);
		expect(first).not.toHaveBeenCalled();
		await Promise.resolve();
		expect(first).toHaveBeenCalledExactlyOnceWith({ kind: 'tools_list_changed' });
		stop();
		const second = vi.fn();
		unsubscribe.push((await service.getBus('channel')).subscribe(second));
		await Promise.resolve();
		expect(second).toHaveBeenCalledExactlyOnceWith({ kind: 'tools_list_changed' });
		expect(first).toHaveBeenCalledTimes(1);
	});

	test('does not refresh a subscription that already disconnected', async () => {
		const listener = vi.fn();
		const stop = (await service.getBus('channel')).subscribe(listener);
		stop();
		stop();
		await Promise.resolve();
		expect(listener).not.toHaveBeenCalled();
	});

	test('delivers changes between separate requests without notifying other grants', async () => {
		service.observe('channel', 'v1');
		const listener = vi.fn();
		const other = vi.fn();
		unsubscribe.push((await service.getBus('channel')).subscribe(listener));
		unsubscribe.push((await service.getBus('other')).subscribe(other));
		await Promise.resolve();
		listener.mockClear();
		other.mockClear();
		service.observe('channel', 'v1');
		expect(listener).not.toHaveBeenCalled();
		service.observe('channel', 'v2');
		expect(listener).toHaveBeenCalledExactlyOnceWith({ kind: 'tools_list_changed' });
		expect(other).not.toHaveBeenCalled();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	test('publishes changes across main processes even without a local subscription', async () => {
		config.multiMainSetup.enabled = true;
		service.observe('channel', 'v1');
		service.observe('channel', 'v1');
		expect(publisher.publishCommand).toHaveBeenCalledExactlyOnceWith({
			command: 'mcp-tools-changed',
			payload: { channel: 'channel', revision: 'v1' },
		});
	});

	test('delivers a remote change once without publishing it again', async () => {
		config.multiMainSetup.enabled = true;
		const listener = vi.fn();
		unsubscribe.push((await service.getBus('channel')).subscribe(listener));
		await Promise.resolve();
		listener.mockClear();
		const event = { channel: 'channel', revision: 'v2' };
		Container.set(McpToolChangeService, service);
		const metadata = new PubSubMetadata();
		metadata.register({
			eventName: 'mcp-tools-changed',
			eventHandlerClass: McpToolChangeService,
			methodName: 'onToolsChanged',
			filter: { instanceType: 'main' },
		});
		const eventBus = new PubSubEventBus();
		new PubSubRegistry(
			logger,
			mock<InstanceSettings>({ instanceType: 'main' }),
			metadata,
			eventBus,
		).init();
		eventBus.emit('mcp-tools-changed', event);
		eventBus.emit('mcp-tools-changed', event);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	test('does not republish a stable local revision after a different peer revision', () => {
		config.multiMainSetup.enabled = true;
		service.observe('channel', 'v1');
		publisher.publishCommand.mockClear();
		service.onToolsChanged({ channel: 'channel', revision: 'v2' });
		service.observe('channel', 'v1');
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	test('keeps local notification delivery when Redis publication fails', async () => {
		config.multiMainSetup.enabled = true;
		publisher.publishCommand.mockRejectedValue(new Error('Redis unavailable'));
		const listener = vi.fn();
		unsubscribe.push((await service.getBus('channel')).subscribe(listener));
		await Promise.resolve();
		listener.mockClear();
		service.observe('channel', 'v2');
		await Promise.resolve();
		expect(listener).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalled();
	});

	test('enforces a process-wide subscription limit across request handlers', async () => {
		const bus = await service.getBus('channel');
		for (let i = 0; i < 1024; i++) unsubscribe.push(bus.subscribe(vi.fn()));
		expect(() => bus.subscribe(vi.fn())).toThrow('MCP subscription limit reached');
		unsubscribe[0]();
		unsubscribe.push((await service.getBus('other')).subscribe(vi.fn()));
	});

	test('closes active handlers during shutdown and releases completed handlers', async () => {
		const completed = mock<McpHttpHandler>();
		const active = mock<McpHttpHandler>();
		active.close.mockResolvedValue(undefined);
		service.track(completed)();
		service.track(active);
		await service.shutdown();
		expect(completed.close).not.toHaveBeenCalled();
		expect(active.close).toHaveBeenCalledTimes(1);
	});

	test('delivers changes and reconnect refreshes over separate HTTP handlers', async () => {
		let revision = 'v1';
		const request = async (method: string, signal?: AbortSignal) => {
			const handler = createMcpHandler(
				() => {
					const server = new McpServer({ name: 'test', version: revision });
					server.registerTool('read', {}, async () => ({ content: [] }));
					service.observe('channel', revision);
					return server;
				},
				{ bus: await service.getBus('channel'), legacy: 'stateless' },
			);
			service.track(handler);
			return await handler.fetch(
				new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						accept: 'application/json, text/event-stream',
						'mcp-method': method,
					},
					signal,
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method,
						params: {
							_meta: {
								'io.modelcontextprotocol/protocolVersion': '2026-07-28',
								'io.modelcontextprotocol/clientCapabilities': {},
								'io.modelcontextprotocol/clientInfo': { name: 'vitest', version: '1' },
							},
							...(method === 'subscriptions/listen'
								? { notifications: { toolsListChanged: true } }
								: {}),
						},
					}),
				}),
			);
		};
		const readFrame = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
			const chunk = await reader.read();
			expect(chunk.done).toBe(false);
			return new TextDecoder().decode(chunk.value);
		};
		const abort = new AbortController();
		const response = await request('subscriptions/listen', abort.signal);
		expect(response.status).toBe(200);
		const reader = response.body!.getReader();
		expect(await readFrame(reader)).toContain('notifications/subscriptions/acknowledged');
		expect(await readFrame(reader)).toContain('notifications/tools/list_changed');

		revision = 'v2';
		expect((await request('tools/list')).status).toBe(200);
		expect(await readFrame(reader)).toContain('notifications/tools/list_changed');
		abort.abort();
		expect((await reader.read()).done).toBe(true);

		const reconnected = (await request('subscriptions/listen')).body!.getReader();
		expect(await readFrame(reconnected)).toContain('notifications/subscriptions/acknowledged');
		expect(await readFrame(reconnected)).toContain('notifications/tools/list_changed');
		await service.shutdown();
		expect(await readFrame(reconnected)).toContain('"resultType":"complete"');
		expect((await reconnected.read()).done).toBe(true);
	});
});
