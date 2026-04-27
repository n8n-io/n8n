import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

import { McpClientsManager } from '../McpClientsManager';
import type { McpTool } from '../types';

const noopTools: McpTool[] = [];

function makeMockClient(closeSpy: jest.Mock): Client {
	let onCloseHandler: (() => void) | undefined;
	let onErrorHandler: ((err: Error) => void) | undefined;
	return {
		close: closeSpy,
		set onclose(handler: (() => void) | undefined) {
			onCloseHandler = handler;
		},
		get onclose() {
			return onCloseHandler as () => void;
		},
		set onerror(handler: ((err: Error) => void) | undefined) {
			onErrorHandler = handler;
		},
		get onerror() {
			return onErrorHandler as (err: Error) => void;
		},
	} as unknown as Client;
}

describe('McpClientsManager', () => {
	let manager: McpClientsManager;

	beforeEach(() => {
		manager = new McpClientsManager();
	});

	afterEach(() => {
		manager.shutdown();
	});

	describe('getOrConnect', () => {
		it('caches client and returns same instance on second call', async () => {
			const closeSpy = jest.fn().mockResolvedValue(undefined);
			const client = makeMockClient(closeSpy);
			const factory = jest.fn().mockResolvedValue({ client, mcpTools: noopTools });

			const first = await manager.getOrConnect('key1', factory);
			const second = await manager.getOrConnect('key1', factory);

			expect(factory).toHaveBeenCalledTimes(1);
			expect(first.client).toBe(second.client);
			expect(manager.size).toBe(1);
		});

		it('dedupes concurrent cache misses for same key', async () => {
			const closeSpy = jest.fn().mockResolvedValue(undefined);
			const client = makeMockClient(closeSpy);
			let resolveFactory: (value: { client: Client; mcpTools: McpTool[] }) => void;
			const factory = jest.fn().mockImplementation(
				async () =>
					await new Promise((resolve) => {
						resolveFactory = resolve;
					}),
			);

			const p1 = manager.getOrConnect('key1', factory);
			const p2 = manager.getOrConnect('key1', factory);

			resolveFactory!({ client, mcpTools: noopTools });
			const [r1, r2] = await Promise.all([p1, p2]);

			expect(factory).toHaveBeenCalledTimes(1);
			expect(r1.client).toBe(r2.client);
		});

		it('does not cache on factory rejection', async () => {
			const factory = jest.fn().mockRejectedValue(new Error('fail'));

			await expect(manager.getOrConnect('key1', factory)).rejects.toThrow('fail');
			expect(manager.size).toBe(0);
		});

		it('registers cancellation handler that closes the client', async () => {
			const closeSpy = jest.fn().mockResolvedValue(undefined);
			const client = makeMockClient(closeSpy);
			const factory = jest.fn().mockResolvedValue({ client, mcpTools: noopTools });
			let cancelHandler: (() => void) | undefined;
			const onExecutionCancellation = (handler: () => void) => {
				cancelHandler = handler;
			};

			await manager.getOrConnect('key1', factory, { onExecutionCancellation });
			expect(manager.size).toBe(1);

			cancelHandler!();
			expect(closeSpy).toHaveBeenCalledTimes(1);
			expect(manager.size).toBe(0);
		});
	});

	describe('evictStale', () => {
		it('evicts entries older than TTL by lastUsedAt', () => {
			const closeSpy = jest.fn().mockResolvedValue(undefined);
			const recent = makeMockClient(closeSpy);
			const old = makeMockClient(closeSpy);
			const now = Date.now();

			(manager as any).activeClients.set('old', {
				client: old,
				mcpTools: noopTools,
				createdAt: now - 600_000,
				lastUsedAt: now - 600_000,
			});
			(manager as any).activeClients.set('recent', {
				client: recent,
				mcpTools: noopTools,
				createdAt: now - 600_000,
				lastUsedAt: now - 1000,
			});

			manager.evictStale();

			expect(manager.size).toBe(1);
			expect(manager.getEntry('old')).toBeUndefined();
			expect(manager.getEntry('recent')).toBeDefined();
			expect(closeSpy).toHaveBeenCalledTimes(1);
		});

		it('enforces max cache size by evicting oldest entries', () => {
			const closeSpy = jest.fn().mockResolvedValue(undefined);
			const now = Date.now();

			for (let i = 0; i < 502; i++) {
				(manager as any).activeClients.set(`exec-${i}`, {
					client: makeMockClient(closeSpy),
					mcpTools: noopTools,
					createdAt: now - 1000 + i,
					lastUsedAt: now - 1000 + i,
				});
			}

			expect(manager.size).toBe(502);
			manager.evictStale();

			expect(manager.size).toBe(500);
			expect(manager.getEntry('exec-0')).toBeUndefined();
			expect(manager.getEntry('exec-1')).toBeUndefined();
			expect(manager.getEntry('exec-2')).toBeDefined();
		});
	});

	describe('transport lifecycle', () => {
		it('evicts cache entry when transport closes', async () => {
			const closeSpy = jest.fn().mockResolvedValue(undefined);
			const client = makeMockClient(closeSpy);
			const factory = jest.fn().mockResolvedValue({ client, mcpTools: noopTools });

			await manager.getOrConnect('key1', factory);
			expect(manager.size).toBe(1);

			(client as { onclose?: () => void }).onclose!();
			expect(manager.size).toBe(0);
		});

		it('evicts cache entry when transport errors', async () => {
			const closeSpy = jest.fn().mockResolvedValue(undefined);
			const client = makeMockClient(closeSpy);
			const factory = jest.fn().mockResolvedValue({ client, mcpTools: noopTools });

			await manager.getOrConnect('key1', factory);
			expect(manager.size).toBe(1);

			(client as { onerror?: (err: Error) => void }).onerror!(new Error('transport down'));
			expect(manager.size).toBe(0);
		});
	});

	describe('shutdown', () => {
		it('closes all cached clients', async () => {
			const closeSpy = jest.fn().mockResolvedValue(undefined);
			const client = makeMockClient(closeSpy);
			const factory = jest.fn().mockResolvedValue({ client, mcpTools: noopTools });

			await manager.getOrConnect('key1', factory);
			await manager.getOrConnect(
				'key2',
				factory.mockResolvedValue({
					client: makeMockClient(closeSpy),
					mcpTools: noopTools,
				}),
			);
			expect(manager.size).toBe(2);

			manager.shutdown();
			expect(manager.size).toBe(0);
			expect(closeSpy).toHaveBeenCalledTimes(2);
		});
	});
});
