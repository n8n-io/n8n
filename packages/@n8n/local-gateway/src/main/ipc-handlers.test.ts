type HandlerFn = (...args: unknown[]) => unknown;

const mockHandle = vi.fn();
const mockConfigure = vi.fn();
// Hoisted so the `electron` mock factory (hoisted above imports) can register handlers into it.
const { registeredHandlers } = vi.hoisted(() => ({
	registeredHandlers: new Map<string, HandlerFn>(),
}));

vi.mock('electron', () => ({
	ipcMain: {
		handle: (channel: string, handler: HandlerFn) => {
			registeredHandlers.set(channel, handler);
			mockHandle(channel, handler);
		},
	},
}));

vi.mock('@n8n/computer-use/logger', () => ({
	configure: (options: { level?: string }) => {
		mockConfigure(options);
	},
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
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
		vi.clearAllMocks();
		registeredHandlers.clear();
	});

	it('invokes disconnect gateway callback on IPC gateway:disconnect', async () => {
		const controller = {
			disconnect: vi.fn().mockResolvedValue(undefined),
			getSnapshot: vi.fn(),
		};
		const settingsStore = {
			get: vi.fn(),
			set: vi.fn(),
			toGatewayConfig: vi.fn(),
		};

		const disconnectGateway = vi.fn().mockResolvedValue(undefined);
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
			disconnect: vi.fn(),
			getSnapshot: vi.fn(),
		};
		const settingsStore = {
			get: vi.fn().mockReturnValue(appSettings),
			set: vi.fn(),
			toGatewayConfig: vi.fn(),
		};
		registerIpcHandlers(
			controller as never,
			settingsStore as never,
			vi.fn().mockResolvedValue(undefined),
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
			disconnect: vi.fn(),
			getSnapshot: vi.fn().mockReturnValue(snapshot),
		};
		registerIpcHandlers(
			controller as never,
			{
				get: vi.fn(),
				set: vi.fn(),
				toGatewayConfig: vi.fn(),
			} as never,
			vi.fn().mockResolvedValue(undefined),
		);

		const result = getRegisteredHandler('daemon:status')();
		expect(controller.getSnapshot).toHaveBeenCalled();
		expect(result).toEqual(snapshot);
	});

	it('settings:set returns ok false when set throws', async () => {
		const controller = {
			disconnect: vi.fn(),
			getSnapshot: vi.fn(),
		};
		const settingsStore = {
			get: vi.fn(),
			set: vi.fn().mockImplementation(() => {
				throw new Error('persist failed');
			}),
			toGatewayConfig: vi.fn(),
		};
		registerIpcHandlers(
			controller as never,
			settingsStore as never,
			vi.fn().mockResolvedValue(undefined),
		);

		const result = await getRegisteredHandler('settings:set')(undefined, {
			allowedOrigins: ['https://x.example'],
		});

		expect(result).toEqual({ ok: false, error: 'persist failed' });
		expect(logger.error).toHaveBeenCalled();
	});

	it('settings:set updates log level without invoking disconnect', async () => {
		const controller = {
			disconnect: vi.fn(),
			getSnapshot: vi.fn(),
		};
		const settingsStore = {
			get: vi.fn(),
			set: vi.fn(),
			toGatewayConfig: vi.fn(),
		};
		const disconnectGateway = vi.fn();

		registerIpcHandlers(controller as never, settingsStore as never, disconnectGateway);
		const settingsSetHandler = getRegisteredHandler('settings:set');

		const result = await settingsSetHandler(undefined, { logLevel: 'debug' });

		expect(mockConfigure).toHaveBeenCalledWith({ level: 'debug' });
		expect(disconnectGateway).not.toHaveBeenCalled();
		expect(result).toEqual({ ok: true });
	});

	it('settings:set persists capability toggles', async () => {
		const controller = {
			disconnect: vi.fn(),
			getSnapshot: vi.fn(),
		};
		const settingsStore = {
			get: vi.fn(),
			set: vi.fn(),
			toGatewayConfig: vi.fn(),
		};
		registerIpcHandlers(
			controller as never,
			settingsStore as never,
			vi.fn().mockResolvedValue(undefined),
		);

		const result = await getRegisteredHandler('settings:set')(undefined, {
			filesystemEnabled: false,
		});

		expect(settingsStore.set).toHaveBeenCalledWith({ filesystemEnabled: false });
		expect(result).toEqual({ ok: true });
	});
});
