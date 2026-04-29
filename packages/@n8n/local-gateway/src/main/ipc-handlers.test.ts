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
			isRunning: jest.fn(),
			reconnect: jest.fn(),
		};
		const settingsStore = {
			get: jest.fn(),
			set: jest.fn(),
			setLastConnectedUrl: jest.fn(),
			setReconnectKey: jest.fn(),
			toGatewayConfig: jest.fn(),
		};
		const connect = jest.fn();

		const disconnectGateway = jest.fn().mockResolvedValue(undefined);
		registerIpcHandlers(controller as never, settingsStore as never, connect, disconnectGateway);
		const disconnectHandler = getRegisteredHandler('gateway:disconnect');

		const result = await disconnectHandler();

		expect(disconnectGateway).toHaveBeenCalled();
		expect(result).toEqual({ ok: true });
	});

	it('reconnects after non-log settings change when running', async () => {
		const gatewayConfig = { logLevel: 'info' };
		const controller = {
			disconnect: jest.fn(),
			getSnapshot: jest.fn(),
			isRunning: jest.fn().mockReturnValue(true),
			reconnect: jest.fn().mockResolvedValue(undefined),
		};
		const settingsStore = {
			get: jest.fn(),
			set: jest.fn(),
			setLastConnectedUrl: jest.fn(),
			setReconnectKey: jest.fn(),
			toGatewayConfig: jest.fn().mockReturnValue(gatewayConfig),
		};
		const connect = jest.fn();

		registerIpcHandlers(
			controller as never,
			settingsStore as never,
			connect,
			jest.fn().mockResolvedValue(undefined),
		);
		const settingsSetHandler = getRegisteredHandler('settings:set');

		const result = await settingsSetHandler(undefined, { filesystemEnabled: false });

		expect(settingsStore.set).toHaveBeenCalledWith({ filesystemEnabled: false });
		expect(settingsStore.toGatewayConfig).toHaveBeenCalled();
		expect(controller.reconnect).toHaveBeenCalledWith(gatewayConfig);
		expect(result).toEqual({ ok: true });
	});

	it('does not reconnect on log-level-only update', async () => {
		const controller = {
			disconnect: jest.fn(),
			getSnapshot: jest.fn(),
			isRunning: jest.fn().mockReturnValue(true),
			reconnect: jest.fn(),
		};
		const settingsStore = {
			get: jest.fn(),
			set: jest.fn(),
			setLastConnectedUrl: jest.fn(),
			setReconnectKey: jest.fn(),
			toGatewayConfig: jest.fn(),
		};
		const connect = jest.fn();

		registerIpcHandlers(
			controller as never,
			settingsStore as never,
			connect,
			jest.fn().mockResolvedValue(undefined),
		);
		const settingsSetHandler = getRegisteredHandler('settings:set');

		const result = await settingsSetHandler(undefined, { logLevel: 'debug' });

		expect(mockConfigure).toHaveBeenCalledWith({ level: 'debug' });
		expect(controller.reconnect).not.toHaveBeenCalled();
		expect(result).toEqual({ ok: true });
	});
});
