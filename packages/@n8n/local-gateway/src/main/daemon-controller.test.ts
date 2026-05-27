const mockStart = jest.fn();
const mockDisconnect = jest.fn();
const mockStop = jest.fn();
const mockGetDefaults = jest.fn();
const mockSessionFlush = jest.fn();

type GatewayClientOptions = {
	url: string;
	apiKey: string;
	onPersistentFailure?: () => void;
	onDisconnected?: () => void;
};

let lastGatewayOptions: GatewayClientOptions | undefined;

jest.mock('@n8n/computer-use/settings-store', () => ({
	['SettingsStore']: {
		create: jest.fn(
			async () =>
				await Promise.resolve({
					getDefaults: mockGetDefaults,
				}),
		),
	},
}));

jest.mock('@n8n/computer-use/gateway-session', () => ({
	['GatewaySession']: jest.fn().mockImplementation(() => ({
		flush: mockSessionFlush,
	})),
}));

jest.mock('@n8n/computer-use/gateway-client', () => ({
	['GatewayClient']: jest.fn().mockImplementation((options: GatewayClientOptions) => {
		lastGatewayOptions = options;
		return {
			start: mockStart,
			disconnect: mockDisconnect,
			stop: mockStop,
		};
	}),
}));

jest.mock('@n8n/computer-use/logger', () => ({
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
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
		jest.clearAllMocks();
		lastGatewayOptions = undefined;
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
		lastGatewayOptions?.onPersistentFailure?.();

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
		lastGatewayOptions?.onDisconnected?.();

		await settleNextTurn();

		expect(controller.getSnapshot().status).toBe('disconnected');
		expect(mockStop).toHaveBeenCalled();
		expect(mockSessionFlush).toHaveBeenCalled();
	});
});
