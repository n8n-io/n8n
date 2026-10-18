import type { CDPRelayServer } from '../cdp-relay';
import { BrowserConnection } from '../connection';
import {
	BrowserNotAvailableError,
	ConnectionLostError,
	ExtensionConflictError,
	NotConnectedError,
	type ConnectionLostReason,
	type McpBrowserError,
} from '../errors';
import { configureLogger } from '../logger';
import type { Adapter, DisconnectDetails } from '../types';

configureLogger({ level: 'silent' });

const { PlaywrightAdapter, constructed, launch } = vi.hoisted(() => {
	const constructed = vi.fn();
	const launch = vi.fn().mockResolvedValue(undefined);
	class PlaywrightAdapter {
		launch = launch;

		listTabs = vi.fn().mockResolvedValue([]);

		close = vi.fn().mockResolvedValue(undefined);

		constructor(...args: unknown[]) {
			constructed(...args);
		}
	}
	return { PlaywrightAdapter, constructed, launch };
});

vi.mock('../adapters/playwright', () => ({ PlaywrightAdapter }));

// No installed browsers, so the result does not depend on the machine.
vi.mock('../browser-discovery', () => ({
	getDefaultDiscovery: () => ({ discover: () => ({}) }),
	getInstallInstructions: () => '',
}));

/**
 * Drive the connection through the handlers it installs on its adapter — that is
 * the surface a lost session uses.
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

describe('BrowserConnection modes', () => {
	beforeEach(() => vi.clearAllMocks());

	it('connects the Playwright adapter straight to the given endpoint in direct CDP mode', async () => {
		const connection = new BrowserConnection(
			{ mode: 'direct_cdp' },
			{ cdpEndpoint: 'wss://connect.example.com', cdpConnectHeaders: { 'X-Test': '1' } },
		);

		await connection.connect();

		expect(constructed).toHaveBeenCalledWith(expect.objectContaining({ mode: 'direct_cdp' }), {
			cdpEndpoint: 'wss://connect.example.com',
			cdpConnectHeaders: { 'X-Test': '1' },
		});
		expect(launch).toHaveBeenCalled();
		expect(connection.isConnected).toBe(true);
	});

	it('connects the Playwright adapter through the relay in remote mode', async () => {
		const relay = {} as CDPRelayServer;
		const connection = new BrowserConnection(
			{ mode: 'remote' },
			{ relay, cdpEndpoint: 'ws://127.0.0.1:5678/cdp', cdpConnectHeaders: { 'X-Test': '1' } },
		);

		await connection.connect();

		expect(constructed).toHaveBeenCalledWith(expect.objectContaining({ mode: 'remote' }), {
			relay,
			cdpEndpoint: 'ws://127.0.0.1:5678/cdp',
			cdpConnectHeaders: { 'X-Test': '1' },
		});
		expect(connection.isConnected).toBe(true);
	});

	it('requires an installed browser in local mode', async () => {
		const connection = new BrowserConnection({ mode: 'local' });

		await expect(connection.connect()).rejects.toThrow(BrowserNotAvailableError);
		expect(constructed).not.toHaveBeenCalled();
	});
});
