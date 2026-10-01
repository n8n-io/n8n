import { BrowserConnection } from '../connection';
import {
	ConnectionLostError,
	ExtensionConflictError,
	NotConnectedError,
	type ConnectionLostReason,
	type McpBrowserError,
} from '../errors';
import { configureLogger } from '../logger';
import type { Adapter, DisconnectDetails } from '../types';

configureLogger({ level: 'silent' });

const { connectOverCDP } = vi.hoisted(() => ({ connectOverCDP: vi.fn() }));

vi.mock('playwright-core', () => ({
	chromium: { connectOverCDP },
}));

/**
 * `connect()` needs a real browser, so drive the connection through the handlers
 * it installs on its adapter instead — that is the surface a lost session uses.
 */
function connectionWithHandlers() {
	const connection = new BrowserConnection();
	const adapter = {} as Adapter;

	// Install the real handlers connect() would, so this exercises production wiring.
	const internals = connection as unknown as {
		state: unknown;
		installAdapterHandlers: (adapter: Adapter) => void;
	};
	internals.installAdapterHandlers(adapter);
	internals.state = { adapter, pages: new Map(), activePageId: 'page1' };

	return {
		connection,
		disconnect: (reason: ConnectionLostReason, details?: DisconnectDetails) =>
			adapter.onDisconnect?.(reason, details),
		block: (details: DisconnectDetails) => adapter.onBlocked?.(details),
	};
}

/** The thrown error itself, for assertions on `hint` — `toThrow` only sees the message. */
function thrownBy(fn: () => unknown): McpBrowserError {
	try {
		fn();
	} catch (e) {
		return e as McpBrowserError;
	}
	throw new Error('expected the call to throw');
}

describe('BrowserConnection.getConnection', () => {
	it('reports not connected before anything has happened', () => {
		expect(() => new BrowserConnection().getConnection()).toThrow(NotConnectedError);
	});

	it('reports an ordinary loss as a connection loss', () => {
		const { connection, disconnect } = connectionWithHandlers();
		disconnect('browser_closed');

		expect(() => connection.getConnection()).toThrow(ConnectionLostError);
	});

	it('names the extension when a block took the session down', () => {
		const { connection, disconnect } = connectionWithHandlers();
		disconnect('blocked_by_extension', { blockingExtensionIds: ['offendingext'] });

		expect(() => connection.getConnection()).toThrow(ExtensionConflictError);
		expect(() => connection.getConnection()).toThrow(/offendingext/);
	});

	it('tells a dead session to reconnect before opening a fresh tab', () => {
		const { connection, disconnect } = connectionWithHandlers();
		disconnect('blocked_by_extension', { blockingExtensionIds: ['offendingext'] });

		expect(thrownBy(() => connection.getConnection()).hint).toContain('call browser_connect first');
	});
});

describe('BrowserConnection.explainFailure', () => {
	it('passes an ordinary failure straight through', () => {
		const { connection } = connectionWithHandlers();
		const failure = new Error('No node with given id');

		expect(connection.explainFailure(failure)).toBe(failure);
	});

	it('names the extension instead of the timeout the action died on', () => {
		const { connection, block } = connectionWithHandlers();
		block({ blockingExtensionIds: ['offendingext'] });

		const explained = connection.explainFailure(new Error('Timeout 30000ms exceeded.'));

		expect(explained).toBeInstanceOf(ExtensionConflictError);
		expect((explained as ExtensionConflictError).message).toContain('offendingext');
	});

	it('tells a still-live session to use a fresh tab rather than reconnect', () => {
		const { connection, block } = connectionWithHandlers();
		block({ blockingExtensionIds: ['offendingext'] });

		const explained = connection.explainFailure(new Error('boom')) as ExtensionConflictError;

		expect(explained.hint).toContain('do not call browser_connect');
	});

	it('tells a call whose session died to reconnect, not to open a tab', () => {
		// A single blocked tab takes the session with it, so the block and the
		// disconnect land inside the same call.
		const { connection, block, disconnect } = connectionWithHandlers();
		block({ blockingExtensionIds: ['offendingext'] });
		disconnect('blocked_by_extension', { blockingExtensionIds: ['offendingext'] });

		const explained = connection.explainFailure(new Error('Timeout')) as ExtensionConflictError;

		expect(explained.hint).toContain('call browser_connect first');
		expect(explained.hint).not.toContain('do not call browser_connect');
	});

	it('reports a dead browser as a lost connection', () => {
		const { connection } = connectionWithHandlers();
		const closed = new Error('Target page, context or browser has been closed');
		closed.name = 'TargetClosedError';

		expect(connection.explainFailure(closed)).toBeInstanceOf(ConnectionLostError);
	});

	it('blames a block on one failure only', () => {
		const { connection, block } = connectionWithHandlers();
		block({ blockingExtensionIds: ['offendingext'] });

		connection.explainFailure(new Error('first'));
		const second = new Error('second');

		// Otherwise it lands on the fresh tab the agent was told to recover in.
		expect(connection.explainFailure(second)).toBe(second);
	});
});

describe('BrowserConnection extension block', () => {
	it('drops a block that predates the call asking about it', () => {
		const { connection, block } = connectionWithHandlers();
		block({ blockingExtensionIds: ['offendingext'] });

		connection.beginToolCall();
		const failure = new Error('unrelated');

		expect(connection.explainFailure(failure)).toBe(failure);
	});

	it('still reports a block that arrives after the call started', () => {
		const { connection, block } = connectionWithHandlers();

		connection.beginToolCall();
		block({ blockingExtensionIds: ['offendingext'] });

		expect(connection.explainFailure(new Error('unrelated'))).toBeInstanceOf(
			ExtensionConflictError,
		);
	});
});

describe('BrowserConnection direct-cdp mode', () => {
	const endpoint = 'wss://connect.example.com/session?token=abc';

	it('fails to connect without a cdpEndpoint', async () => {
		const connection = new BrowserConnection({ mode: 'direct-cdp' });

		await expect(connection.connect()).rejects.toThrow('Direct CDP mode requires a cdpEndpoint');
		expect(connectOverCDP).not.toHaveBeenCalled();
	});

	it('connects without a locally installed browser and starts on the open page', async () => {
		const page = { url: () => 'https://example.com/', title: async () => 'Example', on: vi.fn() };
		connectOverCDP.mockResolvedValue({
			contexts: () => [{ on: vi.fn(), pages: () => [page] }],
			on: vi.fn(),
		});
		const connection = new BrowserConnection(
			{ mode: 'direct-cdp', browsers: {} },
			{ cdpEndpoint: endpoint },
		);
		vi.spyOn(connection, 'getAvailableBrowsers').mockReturnValue([]);

		const result = await connection.connect();

		expect(connectOverCDP).toHaveBeenCalledWith(endpoint, expect.anything());
		expect(result.pages).toEqual([
			expect.objectContaining({ title: 'Example', url: 'https://example.com/' }),
		]);
	});
});
