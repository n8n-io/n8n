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

/** Register handlers with sensible stubs; only the deps a test cares about need overriding. */
function register(overrides: {
	controller?: unknown;
	settingsStore?: unknown;
	disconnectGateway?: HandlerFn;
	instanceApi?: unknown;
	openExternal?: HandlerFn;
}): void {
	registerIpcHandlers({
		controller: (overrides.controller ?? { disconnect: vi.fn(), getSnapshot: vi.fn() }) as never,
		settingsStore: (overrides.settingsStore ?? {
			get: vi.fn(),
			set: vi.fn(),
			toGatewayConfig: vi.fn(),
		}) as never,
		disconnectGateway: (overrides.disconnectGateway ??
			vi.fn().mockResolvedValue(undefined)) as never,
		oauthFlow: { getStatus: vi.fn(), getValidAccessToken: vi.fn() } as never,
		instanceApi: (overrides.instanceApi ?? {
			getTasks: vi.fn(),
			runWorkflow: vi.fn(),
			workflowUrl: vi.fn(),
			getHistory: vi.fn(),
			executionUrl: vi.fn(),
		}) as never,
		openExternal: (overrides.openExternal ?? vi.fn().mockResolvedValue(undefined)) as never,
	});
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
		register({ controller, settingsStore, disconnectGateway });
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
		register({ controller, settingsStore });

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
		register({ controller });

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
		register({ controller, settingsStore });

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

		register({ controller, settingsStore, disconnectGateway });
		const settingsSetHandler = getRegisteredHandler('settings:set');

		const result = await settingsSetHandler(undefined, { logLevel: 'debug' });

		expect(mockConfigure).toHaveBeenCalledWith({ level: 'debug' });
		expect(disconnectGateway).not.toHaveBeenCalled();
		expect(result).toEqual({ ok: true });
	});

	it('history:list forwards cursor params to the instance api', async () => {
		const historyResponse = { results: [{ id: 'exec-1' }], count: 1, estimated: false };
		const instanceApi = {
			getTasks: vi.fn(),
			runWorkflow: vi.fn(),
			workflowUrl: vi.fn(),
			getHistory: vi.fn().mockResolvedValue(historyResponse),
			executionUrl: vi.fn(),
		};
		register({ instanceApi });

		const result = await getRegisteredHandler('history:list')(undefined, { lastId: 'exec-9' });

		expect(instanceApi.getHistory).toHaveBeenCalledWith({ lastId: 'exec-9' });
		expect(result).toEqual(historyResponse);
	});

	it('history:openExecution opens the resolved execution url externally', async () => {
		const instanceApi = {
			getTasks: vi.fn(),
			runWorkflow: vi.fn(),
			workflowUrl: vi.fn(),
			getHistory: vi.fn(),
			executionUrl: vi.fn().mockReturnValue('https://n.example/workflow/wf-1/executions/exec-1'),
		};
		const openExternal = vi.fn().mockResolvedValue(undefined);
		register({ instanceApi, openExternal });

		await getRegisteredHandler('history:openExecution')(undefined, 'wf-1', 'exec-1');

		expect(instanceApi.executionUrl).toHaveBeenCalledWith('wf-1', 'exec-1');
		expect(openExternal).toHaveBeenCalledWith('https://n.example/workflow/wf-1/executions/exec-1');
	});

	it('history:openExecution does not open anything when signed out', async () => {
		const instanceApi = {
			getTasks: vi.fn(),
			runWorkflow: vi.fn(),
			workflowUrl: vi.fn(),
			getHistory: vi.fn(),
			executionUrl: vi.fn().mockReturnValue(null),
		};
		const openExternal = vi.fn().mockResolvedValue(undefined);
		register({ instanceApi, openExternal });

		await getRegisteredHandler('history:openExecution')(undefined, 'wf-1', 'exec-1');

		expect(openExternal).not.toHaveBeenCalled();
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
		register({ controller, settingsStore });

		const result = await getRegisteredHandler('settings:set')(undefined, {
			filesystemEnabled: false,
		});

		expect(settingsStore.set).toHaveBeenCalledWith({ filesystemEnabled: false });
		expect(result).toEqual({ ok: true });
	});
});
