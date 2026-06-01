type HandlerFn = (...args: unknown[]) => unknown;

const mockHandle = jest.fn();
const mockConfigure = jest.fn();
const registeredHandlers = new Map<string, HandlerFn>();

jest.mock('electron', () => ({
	ipcMain: {
		handle: (channel: string, handler: HandlerFn) => {
			registeredHandlers.set(channel, handler);
			mockHandle(channel, handler);
		},
	},
}));

jest.mock('@n8n/computer-use/logger', () => ({
	configure: (options: { level?: string }) => {
		mockConfigure(options);
	},
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

import { logger } from '@n8n/computer-use/logger';

import { registerIpcHandlers } from './ipc-handlers';

function getRegisteredHandler(channel: string): HandlerFn {
	const handler = registeredHandlers.get(channel);
	if (!handler) {
		throw new Error(`No handler found for channel: ${channel}`);
	}
	return handler;
}

describe('registerIpcHandlers', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		registeredHandlers.clear();
	});

	it('invokes disconnect gateway callback on IPC gateway:disconnect', async () => {
		const controller = {
			disconnect: jest.fn().mockResolvedValue(undefined),
			getSnapshot: jest.fn(),
		};
		const settingsStore = {
			get: jest.fn(),
			set: jest.fn(),
			toGatewayConfig: jest.fn(),
		};

		const disconnectGateway = jest.fn().mockResolvedValue(undefined);
		registerIpcHandlers(controller as never, settingsStore as never, disconnectGateway);
		const disconnectHandler = getRegisteredHandler('gateway:disconnect');

		const result = await disconnectHandler();

		expect(disconnectGateway).toHaveBeenCalled();
		expect(result).toEqual({ ok: true });
	});

	it('returns settings from settings:get', () => {
		const appSettings = {
			allowedOrigins: ['https://*.app.n8n.cloud'],
			filesystemDir: '/tmp',
			filesystemEnabled: true,
			shellEnabled: false,
			screenshotEnabled: true,
			mouseKeyboardEnabled: true,
			browserEnabled: true,
			logLevel: 'info' as const,
		};
		const controller = {
			disconnect: jest.fn(),
			getSnapshot: jest.fn(),
		};
		const settingsStore = {
			get: jest.fn().mockReturnValue(appSettings),
			set: jest.fn(),
			toGatewayConfig: jest.fn(),
		};
		registerIpcHandlers(
			controller as never,
			settingsStore as never,
			jest.fn().mockResolvedValue(undefined),
		);

		const result = getRegisteredHandler('settings:get')();
		expect(settingsStore.get).toHaveBeenCalled();
		expect(result).toEqual(appSettings);
	});

	it('returns daemon snapshot from daemon:status', () => {
		const snapshot = {
			status: 'connected' as const,
			connectedUrl: 'https://n.example',
			lastError: null,
		};
		const controller = {
			disconnect: jest.fn(),
			getSnapshot: jest.fn().mockReturnValue(snapshot),
		};
		registerIpcHandlers(
			controller as never,
			{
				get: jest.fn(),
				set: jest.fn(),
				toGatewayConfig: jest.fn(),
			} as never,
			jest.fn().mockResolvedValue(undefined),
		);

		const result = getRegisteredHandler('daemon:status')();
		expect(controller.getSnapshot).toHaveBeenCalled();
		expect(result).toEqual(snapshot);
	});

	it('settings:set returns ok false when set throws', async () => {
		const controller = {
			disconnect: jest.fn(),
			getSnapshot: jest.fn(),
		};
		const settingsStore = {
			get: jest.fn(),
			set: jest.fn().mockImplementation(() => {
				throw new Error('persist failed');
			}),
			toGatewayConfig: jest.fn(),
		};
		registerIpcHandlers(
			controller as never,
			settingsStore as never,
			jest.fn().mockResolvedValue(undefined),
		);

		const result = await getRegisteredHandler('settings:set')(undefined, {
			allowedOrigins: ['https://x.example'],
		});

		expect(result).toEqual({ ok: false, error: 'persist failed' });
		expect(logger.error).toHaveBeenCalled();
	});

	it('settings:set updates log level without invoking disconnect', async () => {
		const controller = {
			disconnect: jest.fn(),
			getSnapshot: jest.fn(),
		};
		const settingsStore = {
			get: jest.fn(),
			set: jest.fn(),
			toGatewayConfig: jest.fn(),
		};
		const disconnectGateway = jest.fn();

		registerIpcHandlers(controller as never, settingsStore as never, disconnectGateway);
		const settingsSetHandler = getRegisteredHandler('settings:set');

		const result = await settingsSetHandler(undefined, { logLevel: 'debug' });

		expect(mockConfigure).toHaveBeenCalledWith({ level: 'debug' });
		expect(disconnectGateway).not.toHaveBeenCalled();
		expect(result).toEqual({ ok: true });
	});

	it('settings:set persists capability toggles', async () => {
		const controller = {
			disconnect: jest.fn(),
			getSnapshot: jest.fn(),
		};
		const settingsStore = {
			get: jest.fn(),
			set: jest.fn(),
			toGatewayConfig: jest.fn(),
		};
		registerIpcHandlers(
			controller as never,
			settingsStore as never,
			jest.fn().mockResolvedValue(undefined),
		);

		const result = await getRegisteredHandler('settings:set')(undefined, {
			filesystemEnabled: false,
		});

		expect(settingsStore.set).toHaveBeenCalledWith({ filesystemEnabled: false });
		expect(result).toEqual({ ok: true });
	});
});
