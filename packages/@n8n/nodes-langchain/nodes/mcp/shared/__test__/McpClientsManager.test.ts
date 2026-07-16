import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

import { McpClientsManager } from '../McpClientsManager';

type FakeClient = Client & {
	close: ReturnType<typeof vi.fn>;
	onclose?: (() => void) | null;
	onerror?: ((error: Error) => void) | null;
};

function fakeClient(): FakeClient {
	return {
		close: vi.fn().mockResolvedValue(undefined),
		onclose: null,
		onerror: null,
	} as unknown as FakeClient;
}

function makeManager(
	overrides: Partial<{ cacheTtl: number; cacheMaxSize: number }> = {},
): McpClientsManager {
	const config = { cacheTtl: 300_000, cacheMaxSize: 500, ...overrides };
	return new McpClientsManager(config as never);
}

describe('McpClientsManager', () => {
	let manager: McpClientsManager;

	afterEach(() => {
		manager?.shutdown();
	});

	it('runs the factory once and caches the client', async () => {
		manager = makeManager();
		const client = fakeClient();
		const factory = vi.fn().mockResolvedValue({ client, mcpTools: [] });

		const a = await manager.getOrConnect('k', factory);
		const b = await manager.getOrConnect('k', factory);

		expect(factory).toHaveBeenCalledTimes(1);
		expect(a.client).toBe(client);
		expect(b.client).toBe(client);
		expect(manager.size).toBe(1);
	});

	it('dedups concurrent cache misses', async () => {
		manager = makeManager();
		const client = fakeClient();
		let resolveFactory: (value: { client: FakeClient; mcpTools: [] }) => void = () => {};
		const factory = vi.fn().mockReturnValue(
			new Promise((resolve) => {
				resolveFactory = resolve;
			}),
		);

		const p1 = manager.getOrConnect('k', factory);
		const p2 = manager.getOrConnect('k', factory);
		resolveFactory({ client, mcpTools: [] });
		await Promise.all([p1, p2]);

		expect(factory).toHaveBeenCalledTimes(1);
		expect(manager.size).toBe(1);
	});

	it('registers a cancellation handler that closes and evicts the client', async () => {
		manager = makeManager();
		const client = fakeClient();
		let handler: () => void = () => {};

		await manager.getOrConnect('k', async () => ({ client, mcpTools: [] }), {
			onExecutionCancellation: (h) => {
				handler = h;
			},
		});

		handler();
		expect(client.close).toHaveBeenCalledTimes(1);
		expect(manager.size).toBe(0);
	});

	it('cancellation handler does not close a client that replaced it under the same key', async () => {
		manager = makeManager();
		const client1 = fakeClient();
		const client2 = fakeClient();
		let handler1: () => void = () => {};
		let handler2: () => void = () => {};

		await manager.getOrConnect('k', async () => ({ client: client1, mcpTools: [] }), {
			onExecutionCancellation: (h) => {
				handler1 = h;
			},
		});

		// Transport drop evicts client1's entry, then a reconnect stores client2.
		client1.onclose?.();
		expect(manager.size).toBe(0);

		await manager.getOrConnect('k', async () => ({ client: client2, mcpTools: [] }), {
			onExecutionCancellation: (h) => {
				handler2 = h;
			},
		});
		expect(manager.size).toBe(1);

		// The stale handler must not touch the replacement client.
		handler1();
		expect(client2.close).not.toHaveBeenCalled();
		expect(manager.size).toBe(1);

		// The current handler still closes the current client.
		handler2();
		expect(client2.close).toHaveBeenCalledTimes(1);
		expect(manager.size).toBe(0);
	});

	it('remove() closes the client and is idempotent', async () => {
		manager = makeManager();
		const client = fakeClient();
		await manager.getOrConnect('k', async () => ({ client, mcpTools: [] }));

		manager.remove('k');
		manager.remove('k');

		expect(client.close).toHaveBeenCalledTimes(1);
		expect(manager.size).toBe(0);
	});

	it('evicts idle entries past the TTL', async () => {
		manager = makeManager({ cacheTtl: 50 });
		const client = fakeClient();
		await manager.getOrConnect('k', async () => ({ client, mcpTools: [] }));

		// Backdate last use so the entry is considered idle.
		manager.getEntry('k')!.lastUsedAt = Date.now() - 10_000;
		manager.evictStale();

		expect(manager.size).toBe(0);
		expect(client.close).toHaveBeenCalled();
	});

	it('keeps recently-used entries during eviction', async () => {
		manager = makeManager({ cacheTtl: 10_000 });
		const client = fakeClient();
		await manager.getOrConnect('k', async () => ({ client, mcpTools: [] }));

		manager.evictStale();

		expect(manager.size).toBe(1);
		expect(client.close).not.toHaveBeenCalled();
	});

	it('enforces the max cache size on insert, evicting the oldest entries', async () => {
		manager = makeManager({ cacheTtl: 10_000_000, cacheMaxSize: 2 });
		const clients = [fakeClient(), fakeClient(), fakeClient()];
		await manager.getOrConnect('a', async () => ({ client: clients[0], mcpTools: [] }));
		await manager.getOrConnect('b', async () => ({ client: clients[1], mcpTools: [] }));
		// Cap enforced on insert — no periodic sweep needed.
		await manager.getOrConnect('c', async () => ({ client: clients[2], mcpTools: [] }));

		expect(manager.size).toBe(2);
		expect(clients[0].close).toHaveBeenCalled(); // oldest evicted
		expect(manager.getEntry('a')).toBeUndefined();
		expect(manager.getEntry('c')).toBeDefined();
	});

	it('evicts the entry when the transport closes', async () => {
		manager = makeManager();
		const client = fakeClient();
		await manager.getOrConnect('k', async () => ({ client, mcpTools: [] }));
		expect(manager.size).toBe(1);

		client.onclose?.();

		expect(manager.size).toBe(0);
	});

	it('transport close handler does not evict a client that replaced it under the same key', async () => {
		manager = makeManager();
		const client1 = fakeClient();
		const client2 = fakeClient();

		await manager.getOrConnect('k', async () => ({ client: client1, mcpTools: [] }));
		client1.onclose?.();
		expect(manager.size).toBe(0);

		await manager.getOrConnect('k', async () => ({ client: client2, mcpTools: [] }));
		expect(manager.size).toBe(1);

		// A late/duplicate close from the replaced client must not drop client2.
		client1.onclose?.();
		expect(manager.size).toBe(1);
		expect(manager.getEntry('k')?.client).toBe(client2);

		// The current client's own close still evicts.
		client2.onclose?.();
		expect(manager.size).toBe(0);
	});

	it('evicts and closes the client when the transport errors', async () => {
		manager = makeManager();
		const client = fakeClient();
		await manager.getOrConnect('k', async () => ({ client, mcpTools: [] }));
		expect(manager.size).toBe(1);

		client.onerror?.(new Error('boom'));

		expect(manager.size).toBe(0);
		// The SDK does not close the transport on error, so the cache must.
		expect(client.close).toHaveBeenCalledTimes(1);
	});

	it('transport error closes only the errored client, not a replacement under the same key', async () => {
		manager = makeManager();
		const client1 = fakeClient();
		const client2 = fakeClient();

		await manager.getOrConnect('k', async () => ({ client: client1, mcpTools: [] }));
		client1.onclose?.();
		expect(manager.size).toBe(0);

		await manager.getOrConnect('k', async () => ({ client: client2, mcpTools: [] }));
		expect(manager.size).toBe(1);

		// A late error from the replaced client closes the orphan but leaves client2 live.
		client1.onerror?.(new Error('boom'));
		expect(client1.close).toHaveBeenCalledTimes(1);
		expect(client2.close).not.toHaveBeenCalled();
		expect(manager.size).toBe(1);
		expect(manager.getEntry('k')?.client).toBe(client2);
	});

	it('refresh() updates lastUsedAt', async () => {
		manager = makeManager();
		const client = fakeClient();
		await manager.getOrConnect('k', async () => ({ client, mcpTools: [] }));
		const before = manager.getEntry('k')!.lastUsedAt;

		await new Promise((resolve) => setTimeout(resolve, 5));
		manager.refresh('k');

		expect(manager.getEntry('k')!.lastUsedAt).toBeGreaterThan(before);
	});
});
