const mockStart = vi.fn();
const mockDisconnect = vi.fn();
const mockStop = vi.fn();
const mockGetDefaults = vi.fn();
const mockSessionFlush = vi.fn();

type GatewayClientOptions = {
	url: string;
	apiKey: string;
	onPersistentFailure?: () => void;
	onDisconnected?: () => void;
};

// Hoisted so the `GatewayClient` mock factory (hoisted above imports) can write the
// constructor options the test later inspects.
const { gateway } = vi.hoisted(() => ({
	gateway: { lastOptions: undefined as GatewayClientOptions | undefined },
}));

vi.mock('@n8n/computer-use/settings-store', () => ({
	['SettingsStore']: {
		create: vi.fn(
			async () =>
				await Promise.resolve({
					getDefaults: mockGetDefaults,
				}),
		),
	},
}));

vi.mock('@n8n/computer-use/gateway-session', () => ({
	// `new GatewaySession()` in source: the implementation must be constructable, so use a
	// regular function rather than an arrow (Vitest does `new impl()`).
	['GatewaySession']: vi.fn(function () {
		return {
			flush: mockSessionFlush,
		};
	}),
}));

vi.mock('@n8n/computer-use/gateway-client', () => ({
	['GatewayClient']: vi.fn(function (options: GatewayClientOptions) {
		gateway.lastOptions = options;
		return {
			start: mockStart,
			disconnect: mockDisconnect,
			stop: mockStop,
		};
	}),
}));

vi.mock('@n8n/computer-use/logger', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

import type { GatewayConfig } from '@n8n/computer-use/config';

import { DaemonController } from './daemon-controller';

const BASE_CONFIG: GatewayConfig = {
	logLevel: 'info',
	allowedOrigins: ['https://*.app.n8n.cloud'],
	filesystem: { dir: '/' },
	computer: { shell: { timeout: 30_000 } },
	browser: { defaultBrowser: 'chrome' },
	permissions: {},
	permissionConfirmation: 'instance',
};

/** Fire-and-forget `void closeCurrentConnection()` chains multiple async steps; flush past microtasks */
async function settleNextTurn(): Promise<void> {
	await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('DaemonController', () => {
	it('starts disconnected with no session', () => {
		const controller = new DaemonController();
		expect(controller.getSnapshot()).toEqual({
			status: 'disconnected',
			connectedUrl: null,
			lastError: null,
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();
		gateway.lastOptions = undefined;
		mockGetDefaults.mockReturnValue({
			dir: '/',
			permissions: {
				filesystemRead: 'allow',
				filesystemWrite: 'ask',
				shell: 'deny',
				computer: 'deny',
				browser: 'ask',
			},
		});
		mockStart.mockResolvedValue(undefined);
		mockDisconnect.mockResolvedValue(undefined);
		mockStop.mockResolvedValue(undefined);
		mockSessionFlush.mockResolvedValue(undefined);
	});

	it('connects and updates snapshot state', async () => {
		const controller = new DaemonController();
		await controller.connect(BASE_CONFIG, 'https://example.n8n.cloud', 'gw_token');

		const snapshot = controller.getSnapshot();
		expect(snapshot.status).toBe('connected');
		expect(snapshot.connectedUrl).toBe('https://example.n8n.cloud');
		expect(snapshot.lastError).toBeNull();
	});

	it('normalizes trailing slash on URL', async () => {
		const controller = new DaemonController();
		await controller.connect(BASE_CONFIG, 'https://example.n8n.cloud/', 'gw_token');
		expect(controller.getSnapshot().connectedUrl).toBe('https://example.n8n.cloud');
	});

	it('sets error state when connect fails', async () => {
		const controller = new DaemonController();
		mockStart.mockRejectedValueOnce(new Error('connect failed'));

		await expect(
			controller.connect(BASE_CONFIG, 'https://example.n8n.cloud', 'gw_token'),
		).rejects.toThrow('connect failed');

		const snapshot = controller.getSnapshot();
		expect(snapshot.status).toBe('error');
		expect(snapshot.connectedUrl).toBeNull();
		expect(snapshot.lastError).toBe('connect failed');
	});

	it('formats non-Error rejection for lastError', async () => {
		const controller = new DaemonController();
		mockStart.mockRejectedValueOnce('string failure');

		await expect(
			controller.connect(BASE_CONFIG, 'https://example.n8n.cloud', 'gw_token'),
		).rejects.toThrow('string failure');
		expect(controller.getSnapshot().lastError).toBe('string failure');
	});

	it('disconnects and clears connected state', async () => {
		const controller = new DaemonController();
		await controller.connect(BASE_CONFIG, 'https://example.n8n.cloud', 'gw_token');
		await controller.disconnect();

		const snapshot = controller.getSnapshot();
		expect(snapshot.status).toBe('disconnected');
		expect(snapshot.connectedUrl).toBeNull();
		expect(mockDisconnect).toHaveBeenCalled();
		expect(mockSessionFlush).toHaveBeenCalled();
	});

	it('calls stop on previous client when connecting again', async () => {
		const controller = new DaemonController();
		await controller.connect(BASE_CONFIG, 'https://a.example', 't1');
		await controller.connect(BASE_CONFIG, 'https://b.example', 't2');
		expect(mockStop).toHaveBeenCalled();
		expect(mockStart).toHaveBeenCalledTimes(2);
	});

	it('sets error state when gateway signals persistent auth failure', async () => {
		const controller = new DaemonController();
		await controller.connect(BASE_CONFIG, 'https://example.n8n.cloud', 'gw_token');
		gateway.lastOptions?.onPersistentFailure?.();

		await settleNextTurn();

		const snapshot = controller.getSnapshot();
		expect(snapshot.status).toBe('error');
		expect(snapshot.lastError).toBe('Gateway authentication failed repeatedly');
		expect(mockStop).toHaveBeenCalled();
		expect(mockSessionFlush).toHaveBeenCalled();
	});

	it('sets disconnected state when gateway signals disconnect', async () => {
		const controller = new DaemonController();
		await controller.connect(BASE_CONFIG, 'https://example.n8n.cloud', 'gw_token');
		gateway.lastOptions?.onDisconnected?.();

		await settleNextTurn();

		expect(controller.getSnapshot().status).toBe('disconnected');
		expect(mockStop).toHaveBeenCalled();
		expect(mockSessionFlush).toHaveBeenCalled();
	});
});
