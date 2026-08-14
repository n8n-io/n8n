// ---------------------------------------------------------------------------
// Chrome API mock
//
// `background.ts` registers its listeners at module load, so the mock must be
// installed on `globalThis` before the module is imported (see `beforeAll`).
// ---------------------------------------------------------------------------

type TabUpdatedHandler = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => void;
type ExternalMessageHandler = (
	message: unknown,
	sender: chrome.runtime.MessageSender,
	sendResponse: (response: unknown) => void,
) => unknown;

const EXT_ORIGIN = 'chrome-extension://testextensionid/';
const CONNECT_URL = `${EXT_ORIGIN}connect.html`;

const tabUpdatedListeners: TabUpdatedHandler[] = [];
const externalMessageListeners: ExternalMessageHandler[] = [];

const chromeMock = {
	runtime: {
		getURL: vi.fn((path: string) => `${EXT_ORIGIN}${path}`),
		sendMessage: vi.fn().mockResolvedValue(undefined),
		onMessage: { addListener: vi.fn() },
		onMessageExternal: {
			addListener: vi.fn((fn: ExternalMessageHandler) => externalMessageListeners.push(fn)),
		},
	},
	tabs: {
		query: vi.fn().mockResolvedValue([]),
		update: vi.fn().mockResolvedValue(undefined),
		remove: vi.fn().mockResolvedValue(undefined),
		reload: vi.fn().mockResolvedValue(undefined),
		onCreated: { addListener: vi.fn() },
		onRemoved: { addListener: vi.fn() },
		onUpdated: {
			addListener: vi.fn((fn: TabUpdatedHandler) => tabUpdatedListeners.push(fn)),
		},
	},
	windows: {
		update: vi.fn().mockResolvedValue(undefined),
		create: vi.fn().mockResolvedValue(undefined),
		getLastFocused: vi.fn().mockResolvedValue({ left: 0, top: 0, width: 1920, height: 1080 }),
	},
	storage: {
		session: {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue({}),
			remove: vi.fn().mockResolvedValue(undefined),
		},
		local: { get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue(undefined) },
	},
	webNavigation: { onCreatedNavigationTarget: { addListener: vi.fn() } },
	action: {
		onClicked: { addListener: vi.fn() },
		setBadgeText: vi.fn(),
		setBadgeBackgroundColor: vi.fn(),
	},
};

Object.assign(globalThis, { chrome: chromeMock });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function connectUrlWithRelay(relayUrl: string): string {
	return `${CONNECT_URL}?mcpRelayUrl=${encodeURIComponent(relayUrl)}`;
}

/** Invoke the registered tab-update listeners as Chrome would. */
function simulateTabUpdated(tabId: number, url: string): void {
	for (const fn of tabUpdatedListeners) fn(tabId, { url } as chrome.tabs.TabChangeInfo);
}

/** Invoke the registered external-message listeners and collect the response. */
async function simulateExternalMessage(message: unknown, origin: string): Promise<unknown> {
	let response: unknown;
	for (const fn of externalMessageListeners) {
		fn(message, { origin } as chrome.runtime.MessageSender, (r) => (response = r));
	}
	await flush();
	return response;
}

/** Flush pending microtasks/macrotasks so the listener's async IIFE settles. */
const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
	await import('./background');
});

beforeEach(() => {
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('connect.html tab deduplication', () => {
	const NEW_RELAY = 'ws://localhost:2222';
	const NEW_TAB_ID = 2;
	const EXISTING_TAB_ID = 1;
	const EXISTING_WINDOW_ID = 10;

	it('reuses an existing connect tab without reloading it when a new relay URL arrives', async () => {
		chromeMock.tabs.query.mockResolvedValue([
			{
				id: EXISTING_TAB_ID,
				windowId: EXISTING_WINDOW_ID,
				url: connectUrlWithRelay('ws://localhost:1111'),
			},
		]);

		simulateTabUpdated(NEW_TAB_ID, connectUrlWithRelay(NEW_RELAY));
		await flush();

		expect(chromeMock.tabs.update).toHaveBeenCalledWith(EXISTING_TAB_ID, { active: true });
		expect(chromeMock.windows.update).toHaveBeenCalledWith(EXISTING_WINDOW_ID, { focused: true });
		expect(chromeMock.tabs.remove).toHaveBeenCalledWith(NEW_TAB_ID);
		// Reloading would re-read the existing tab's stale ?mcpRelayUrl — regression guard.
		expect(chromeMock.tabs.reload).not.toHaveBeenCalled();
	});

	it('pushes the new relay URL to the existing tab and stores it as a fallback', async () => {
		chromeMock.tabs.query.mockResolvedValue([
			{
				id: EXISTING_TAB_ID,
				windowId: EXISTING_WINDOW_ID,
				url: connectUrlWithRelay('ws://localhost:1111'),
			},
		]);

		simulateTabUpdated(NEW_TAB_ID, connectUrlWithRelay(NEW_RELAY));
		await flush();

		expect(chromeMock.storage.session.set).toHaveBeenCalledWith({ pendingRelayUrl: NEW_RELAY });
		expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
			type: 'relayUrlReady',
			relayUrl: NEW_RELAY,
		});
	});

	it('does not touch other tabs when no existing connect tab is open', async () => {
		// Only the freshly-opened tab matches the query — nothing to reuse.
		chromeMock.tabs.query.mockResolvedValue([
			{ id: NEW_TAB_ID, url: connectUrlWithRelay(NEW_RELAY) },
		]);

		simulateTabUpdated(NEW_TAB_ID, connectUrlWithRelay(NEW_RELAY));
		await flush();

		expect(chromeMock.storage.session.set).toHaveBeenCalledWith({ pendingRelayUrl: NEW_RELAY });
		expect(chromeMock.tabs.update).not.toHaveBeenCalled();
		expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
		expect(chromeMock.tabs.reload).not.toHaveBeenCalled();
		expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalled();
	});

	it('ignores tab updates that carry no relay URL', async () => {
		simulateTabUpdated(NEW_TAB_ID, CONNECT_URL);
		await flush();

		expect(chromeMock.storage.session.set).not.toHaveBeenCalled();
		expect(chromeMock.tabs.query).not.toHaveBeenCalled();
	});
});

describe('external messages (direct connect flow)', () => {
	const ALLOWED_ORIGIN = 'https://acme.app.n8n.cloud';
	const RELAY_URL = 'wss://acme.app.n8n.cloud/browser-use/extension/abc?token=bu_x';

	// The throttle keys off Date.now(); advance it past the window before each
	// test. Re-applied per test because the config restores mocks after each one.
	let nowMs = 0;
	beforeEach(() => {
		nowMs += 60_000;
		vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
		chromeMock.tabs.query.mockResolvedValue([]);
		chromeMock.windows.getLastFocused.mockResolvedValue({
			left: 0,
			top: 0,
			width: 1920,
			height: 1080,
		});
	});

	it('responds to ping from an allowed origin', async () => {
		const response = await simulateExternalMessage({ type: 'ping' }, ALLOWED_ORIGIN);
		expect(response).toEqual({ pong: true });
	});

	it('ignores messages from disallowed origins', async () => {
		const response = await simulateExternalMessage({ type: 'ping' }, 'https://evil.example.com');
		expect(response).toBeUndefined();
	});

	it('ignores malformed messages', async () => {
		const response = await simulateExternalMessage({ type: 'connect' }, ALLOWED_ORIGIN);
		expect(response).toBeUndefined();
		expect(chromeMock.windows.create).not.toHaveBeenCalled();
	});

	it('opens a centered popup window with the connect page when none is open', async () => {
		const response = await simulateExternalMessage(
			{ type: 'connect', relayUrl: RELAY_URL },
			ALLOWED_ORIGIN,
		);

		expect(response).toEqual({ accepted: true });
		expect(chromeMock.storage.session.set).toHaveBeenCalledWith({ pendingRelayUrl: RELAY_URL });
		expect(chromeMock.windows.create).toHaveBeenCalledWith({
			url: connectUrlWithRelay(RELAY_URL),
			type: 'popup',
			width: 420,
			height: 640,
			left: 750,
			top: 220,
		});
	});

	it('reuses an already-open connect page instead of opening a new popup', async () => {
		chromeMock.tabs.query.mockResolvedValue([
			{ id: 5, windowId: 50, url: connectUrlWithRelay('ws://localhost:1111') },
		]);

		const response = await simulateExternalMessage(
			{ type: 'connect', relayUrl: RELAY_URL },
			ALLOWED_ORIGIN,
		);

		expect(response).toEqual({ accepted: true });
		expect(chromeMock.windows.create).not.toHaveBeenCalled();
		expect(chromeMock.tabs.update).toHaveBeenCalledWith(5, { active: true });
		expect(chromeMock.windows.update).toHaveBeenCalledWith(50, { focused: true });
		expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
			type: 'relayUrlReady',
			relayUrl: RELAY_URL,
		});
	});

	it('rejects a relay URL that is not a recognized n8n instance', async () => {
		const response = await simulateExternalMessage(
			{ type: 'connect', relayUrl: 'wss://evil.example.com/relay' },
			ALLOWED_ORIGIN,
		);

		expect(response).toEqual({ accepted: false, error: 'Not a recognized n8n instance.' });
		expect(chromeMock.windows.create).not.toHaveBeenCalled();
		expect(chromeMock.storage.session.set).not.toHaveBeenCalled();
	});

	it('throttles rapid connect requests', async () => {
		const first = await simulateExternalMessage(
			{ type: 'connect', relayUrl: RELAY_URL },
			ALLOWED_ORIGIN,
		);
		nowMs += 1_000;
		const second = await simulateExternalMessage(
			{ type: 'connect', relayUrl: RELAY_URL },
			ALLOWED_ORIGIN,
		);

		expect(first).toEqual({ accepted: true });
		expect(second).toEqual({ accepted: false, error: 'Too many connect requests.' });
		expect(chromeMock.windows.create).toHaveBeenCalledTimes(1);
	});
});
