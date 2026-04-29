const mockStart = jest.fn();
const mockDisconnect = jest.fn();
const mockStop = jest.fn();
const mockGetCurrentGatewayKey = jest.fn();
const mockGetDefaults = jest.fn();
const mockSessionFlush = jest.fn();

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
	['GatewayClient']: jest.fn().mockImplementation(() => ({
		start: mockStart,
		disconnect: mockDisconnect,
		stop: mockStop,
		getCurrentGatewayKey: mockGetCurrentGatewayKey,
	})),
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

describe('DaemonController', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
		mockGetCurrentGatewayKey.mockReturnValue('sess_token');
		mockSessionFlush.mockResolvedValue(undefined);
	});

	it('connects and updates snapshot state', async () => {
		const controller = new DaemonController();
		const result = await controller.connect(BASE_CONFIG, 'https://example.n8n.cloud', 'gw_token');

		const snapshot = controller.getSnapshot();
		expect(snapshot.status).toBe('connected');
		expect(snapshot.connectedUrl).toBe('https://example.n8n.cloud');
		expect(snapshot.lastError).toBeNull();
		expect(result.apiKey).toBe('sess_token');
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

	it('disconnects and clears connected state', async () => {
		const controller = new DaemonController();
		await controller.connect(BASE_CONFIG, 'https://example.n8n.cloud', 'gw_token');
		await controller.disconnect();

		const snapshot = controller.getSnapshot();
		expect(snapshot.status).toBe('disconnected');
		expect(snapshot.connectedUrl).toBeNull();
		expect(snapshot.connectedAt).toBeNull();
		expect(mockDisconnect).toHaveBeenCalled();
		expect(mockSessionFlush).toHaveBeenCalled();
	});
});
