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

vi.mock('./mac-permissions', () => ({
	getMacPermissionStatus: vi.fn(),
	openMacPermissionSettings: vi.fn(),
}));

import { logger } from '@n8n/computer-use/logger';

import { InstanceApiError } from './instance-api';
import { registerIpcHandlers } from './ipc-handlers';
import { getMacPermissionStatus, openMacPermissionSettings } from './mac-permissions';

const mockGetMacPermissionStatus = vi.mocked(getMacPermissionStatus);
const mockOpenMacPermissionSettings = vi.mocked(openMacPermissionSettings);

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
	threadService?: unknown;
	contextDetector?: unknown;
	permissionBroker?: unknown;
	promptNotifier?: unknown;
	reconnectGateway?: () => void;
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
			getTimeSaved: vi.fn(),
			triggerTask: vi.fn(),
		}) as never,
		contextDetector: (overrides.contextDetector ?? {
			getOptions: vi.fn().mockReturnValue([]),
			captureScreenshot: vi.fn(),
		}) as never,
		threadService: (overrides.threadService ?? {
			getMessages: vi.fn(),
			postMessage: vi.fn(),
			listen: vi.fn(),
			unlisten: vi.fn(),
			reset: vi.fn(),
		}) as never,
		permissionBroker: (overrides.permissionBroker ?? {
			list: vi.fn().mockReturnValue([]),
			respond: vi.fn().mockReturnValue(true),
		}) as never,
		promptNotifier: (overrides.promptNotifier ?? {
			notifyLocalPrompt: vi.fn(),
			notifyConfirmationRequest: vi.fn(),
			notifyTaskResult: vi.fn(),
		}) as never,
		reconnectGateway: overrides.reconnectGateway ?? vi.fn(),
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
		const reconnectGateway = vi.fn();

		register({ controller, settingsStore, disconnectGateway, reconnectGateway });
		const settingsSetHandler = getRegisteredHandler('settings:set');

		const result = await settingsSetHandler(undefined, { logLevel: 'debug' });

		expect(mockConfigure).toHaveBeenCalledWith({ level: 'debug' });
		expect(disconnectGateway).not.toHaveBeenCalled();
		// logLevel is applied in-process — no reconnect needed.
		expect(reconnectGateway).not.toHaveBeenCalled();
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

	it('insights:timeSaved returns the week/month figures from the instance api', async () => {
		const timeSaved = { weekMinutes: 73, monthMinutes: null };
		const instanceApi = {
			getTasks: vi.fn(),
			runWorkflow: vi.fn(),
			workflowUrl: vi.fn(),
			getHistory: vi.fn(),
			executionUrl: vi.fn(),
			getTimeSaved: vi.fn().mockResolvedValue(timeSaved),
		};
		register({ instanceApi });

		const result = await getRegisteredHandler('insights:timeSaved')();

		expect(instanceApi.getTimeSaved).toHaveBeenCalled();
		expect(result).toEqual(timeSaved);
	});

	it('thread:get returns the thread snapshot from the thread service', async () => {
		const snapshot = { threadId: 't1', messages: [], nextEventId: 7 };
		const threadService = {
			getMessages: vi.fn().mockResolvedValue(snapshot),
			listen: vi.fn(),
			unlisten: vi.fn(),
			reset: vi.fn(),
		};
		register({ threadService });

		const result = await getRegisteredHandler('thread:get')(undefined, 't1', { refresh: true });

		expect(threadService.getMessages).toHaveBeenCalledWith('t1', { refresh: true });
		expect(result).toEqual(snapshot);
	});

	it('thread:post delegates to the thread service and returns the run id', async () => {
		const threadService = {
			getMessages: vi.fn(),
			postMessage: vi.fn().mockResolvedValue({ runId: 'r1' }),
			listen: vi.fn(),
			unlisten: vi.fn(),
			reset: vi.fn(),
		};
		register({ threadService });

		const result = await getRegisteredHandler('thread:post')(undefined, 't1', 'hi');

		expect(threadService.postMessage).toHaveBeenCalledWith('t1', 'hi');
		expect(result).toEqual({ runId: 'r1' });
	});

	it('thread:listen and thread:unlisten delegate to the thread service', () => {
		const threadService = {
			getMessages: vi.fn(),
			postMessage: vi.fn(),
			listen: vi.fn(),
			unlisten: vi.fn(),
			reset: vi.fn(),
		};
		register({ threadService });

		getRegisteredHandler('thread:listen')(undefined, 't1', 7);
		getRegisteredHandler('thread:unlisten')(undefined, 't1');

		expect(threadService.listen).toHaveBeenCalledWith('t1', 7);
		expect(threadService.unlisten).toHaveBeenCalledWith('t1');
	});

	it('context:list returns the detector options', () => {
		const options = [
			{ id: '1', kind: 'browser' as const, app: 'Safari' },
			{ id: '2', kind: 'finder' as const, app: 'Finder', path: '/Users/me/Downloads' },
		];
		const contextDetector = {
			getOptions: vi.fn().mockReturnValue(options),
			captureScreenshot: vi.fn(),
		};
		register({ contextDetector });

		const result = getRegisteredHandler('context:list')();
		expect(contextDetector.getOptions).toHaveBeenCalled();
		expect(result).toEqual(options);
	});

	it('context:captureScreenshot returns the captured attachment', async () => {
		const attachment = { data: 'base64', mimeType: 'image/jpeg', fileName: 'screen.jpg' };
		const contextDetector = {
			getCurrent: vi.fn(),
			captureScreenshot: vi.fn().mockResolvedValue(attachment),
		};
		register({ contextDetector });

		const result = await getRegisteredHandler('context:captureScreenshot')();
		expect(contextDetector.captureScreenshot).toHaveBeenCalled();
		expect(result).toEqual(attachment);
	});

	it('assistant:createTask forwards the body to the instance api', async () => {
		const instanceApi = {
			getTasks: vi.fn(),
			runWorkflow: vi.fn(),
			workflowUrl: vi.fn(),
			getHistory: vi.fn(),
			executionUrl: vi.fn(),
			getTimeSaved: vi.fn(),
			triggerTask: vi.fn().mockResolvedValue({ threadId: 't-1', runId: 'r-1' }),
		};
		register({ instanceApi });

		const body = { prompt: 'clean up the folder', context: { kind: 'finder' as const } };
		const result = await getRegisteredHandler('assistant:createTask')(undefined, body);

		expect(instanceApi.triggerTask).toHaveBeenCalledWith(body);
		expect(result).toEqual({ ok: true, threadId: 't-1', runId: 'r-1' });
	});

	it('assistant:createChatThread returns the ensured thread id', async () => {
		const instanceApi = {
			getTasks: vi.fn(),
			runWorkflow: vi.fn(),
			workflowUrl: vi.fn(),
			getHistory: vi.fn(),
			executionUrl: vi.fn(),
			getTimeSaved: vi.fn(),
			createChatThread: vi.fn().mockResolvedValue({ threadId: 't-chat' }),
		};
		register({ instanceApi });

		const result = await getRegisteredHandler('assistant:createChatThread')();

		expect(instanceApi.createChatThread).toHaveBeenCalled();
		expect(result).toEqual({ ok: true, threadId: 't-chat' });
	});

	it('assistant:createChatThread surfaces a failure as { ok: false }', async () => {
		const instanceApi = {
			getTasks: vi.fn(),
			runWorkflow: vi.fn(),
			workflowUrl: vi.fn(),
			getHistory: vi.fn(),
			executionUrl: vi.fn(),
			getTimeSaved: vi.fn(),
			createChatThread: vi.fn().mockRejectedValue(new InstanceApiError('boom', 500)),
		};
		register({ instanceApi });

		const result = await getRegisteredHandler('assistant:createChatThread')();

		expect(result).toEqual({ ok: false, error: 'boom' });
	});

	it('permissions:get returns the mac permission status', async () => {
		const status = {
			supported: true,
			accessibility: 'granted',
			screenRecording: 'denied',
			automation: 'granted',
		};
		mockGetMacPermissionStatus.mockResolvedValue(status);
		register({});

		const result = await getRegisteredHandler('permissions:get')();
		expect(result).toEqual(status);
	});

	it('permissions:openSettings opens the requested pane', async () => {
		mockOpenMacPermissionSettings.mockResolvedValue(undefined);
		register({});

		await getRegisteredHandler('permissions:openSettings')(undefined, 'screenRecording');
		expect(mockOpenMacPermissionSettings).toHaveBeenCalledWith('screenRecording');
	});

	it('thread:confirm validates the body and delegates to the thread service', async () => {
		const threadService = {
			getMessages: vi.fn(),
			postMessage: vi.fn(),
			listen: vi.fn(),
			unlisten: vi.fn(),
			reset: vi.fn(),
			confirm: vi.fn().mockResolvedValue(undefined),
		};
		register({ threadService });

		const body = { kind: 'resourceDecision', resourceDecision: 'allowOnce' };
		const result = await getRegisteredHandler('thread:confirm')(undefined, 't1', 'req-1', body);

		expect(threadService.confirm).toHaveBeenCalledWith('t1', 'req-1', body);
		expect(result).toEqual({ ok: true });
	});

	it('thread:confirm rejects an invalid body without calling the service', async () => {
		const threadService = { confirm: vi.fn() };
		register({ threadService });

		const result = await getRegisteredHandler('thread:confirm')(undefined, 't1', 'req-1', {
			kind: 'resourceDecision',
			resourceDecision: 'alwaysAllow', // daemon-only decision, not accepted from the UI
		});

		expect(threadService.confirm).not.toHaveBeenCalled();
		expect(result).toEqual({ ok: false, error: 'Invalid confirmation body' });
	});

	it('thread:confirm maps an InstanceApiError to a structured failure with status', async () => {
		const threadService = {
			confirm: vi.fn().mockRejectedValue(new InstanceApiError('expired', 400)),
		};
		register({ threadService });

		const result = await getRegisteredHandler('thread:confirm')(undefined, 't1', 'req-1', {
			kind: 'approval',
			approved: true,
		});

		expect(result).toEqual({ ok: false, status: 400, error: 'expired' });
	});

	it('permissionPrompt:list returns the pending prompts from the broker', () => {
		const prompts = [{ id: 'p1' }];
		const permissionBroker = { list: vi.fn().mockReturnValue(prompts), respond: vi.fn() };
		register({ permissionBroker });

		expect(getRegisteredHandler('permissionPrompt:list')()).toEqual(prompts);
	});

	it('permissionPrompt:respond delegates valid decisions to the broker', () => {
		const permissionBroker = { list: vi.fn(), respond: vi.fn().mockReturnValue(true) };
		register({ permissionBroker });

		const result = getRegisteredHandler('permissionPrompt:respond')(undefined, 'p1', 'allowOnce');

		expect(permissionBroker.respond).toHaveBeenCalledWith('p1', 'allowOnce');
		expect(result).toEqual({ ok: true });
	});

	it('permissionPrompt:respond rejects unknown decisions without calling the broker', () => {
		const permissionBroker = { list: vi.fn(), respond: vi.fn() };
		register({ permissionBroker });

		const result = getRegisteredHandler('permissionPrompt:respond')(undefined, 'p1', 'nuke-it');

		expect(permissionBroker.respond).not.toHaveBeenCalled();
		expect(result).toEqual({ ok: false });
	});

	it('settings:set persists gateway-relevant settings and reconnects to apply them', async () => {
		const controller = {
			disconnect: vi.fn(),
			getSnapshot: vi.fn(),
		};
		const settingsStore = {
			get: vi.fn(),
			set: vi.fn(),
			toGatewayConfig: vi.fn(),
		};
		const reconnectGateway = vi.fn();
		register({ controller, settingsStore, reconnectGateway });

		const result = await getRegisteredHandler('settings:set')(undefined, {
			permissionConfirmation: 'client',
		});

		expect(settingsStore.set).toHaveBeenCalledWith({ permissionConfirmation: 'client' });
		expect(reconnectGateway).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ ok: true });
	});
});
