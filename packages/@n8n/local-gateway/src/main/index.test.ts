type Handler = (...args: unknown[]) => void;

const { appHandlers, snapshot, confirmConnect, connect } = vi.hoisted(() => {
	const snapshot = {
		status: 'connected' as string,
		connectedUrl: 'https://a.app.n8n.cloud' as string | null,
		lastError: null,
	};
	return {
		appHandlers: new Map<string, Handler>(),
		snapshot,
		confirmConnect: vi.fn(),
		connect: vi.fn(async (_config: unknown, url: string) => {
			snapshot.connectedUrl = url;
		}),
	};
});

vi.mock('electron', () => ({
	app: {
		requestSingleInstanceLock: () => true,
		whenReady: async () => {},
		on: (event: string, handler: Handler) => appHandlers.set(event, handler),
		setAsDefaultProtocolClient: vi.fn(),
		dock: { hide: vi.fn() },
		quit: vi.fn(),
	},
}));
vi.mock('@n8n/computer-use/logger', () => ({
	configure: vi.fn(),
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('./connect-confirmation', () => ({ confirmConnect }));
vi.mock('./daemon-controller', () => ({
	DaemonController: vi.fn(function () {
		return { getSnapshot: () => ({ ...snapshot }), connect, on: vi.fn() };
	}),
}));
vi.mock('./settings-store', () => ({
	SettingsStore: vi.fn(function () {
		return {
			get: () => ({ allowedOrigins: ['https://*.app.n8n.cloud'], logLevel: 'info' }),
			toGatewayConfig: () => ({}),
		};
	}),
}));
vi.mock('./ipc-handlers', () => ({ registerIpcHandlers: vi.fn() }));
vi.mock('./settings-window', () => ({
	openSettingsWindow: vi.fn(),
	notifySettingsWindow: vi.fn(),
}));
vi.mock('./tray', () => ({ createTray: vi.fn() }));

import './index';

function openUrl(host: string): void {
	appHandlers.get('open-url')?.(
		{ preventDefault: vi.fn() },
		`n8n-computer-use://connect?url=https://${host}&token=t`,
	);
}

describe('deep-link handling', () => {
	beforeAll(async () => {
		await vi.waitFor(() => expect(appHandlers.has('open-url')).toBe(true));
	});

	it('confirms a queued link against the connection made by the link before it', async () => {
		const answers: Array<(approved: boolean) => void> = [];
		confirmConnect.mockImplementation(
			async () => await new Promise<boolean>((resolve) => answers.push(resolve)),
		);

		openUrl('b.app.n8n.cloud');
		openUrl('c.app.n8n.cloud');
		await vi.waitFor(() => expect(answers).toHaveLength(1));
		answers[0](true);
		await vi.waitFor(() => expect(answers).toHaveLength(2));
		answers[1](true);
		await vi.waitFor(() => expect(connect).toHaveBeenCalledTimes(2));

		expect(confirmConnect).toHaveBeenNthCalledWith(
			2,
			'https://c.app.n8n.cloud',
			'https://b.app.n8n.cloud',
		);
	});
});
