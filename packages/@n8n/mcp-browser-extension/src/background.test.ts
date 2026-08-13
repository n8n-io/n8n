// ---------------------------------------------------------------------------
// Chrome API mock
//
// `background.ts` registers its listeners at module load, so the mock must be
// installed on `globalThis` before the module is imported (see `beforeAll`).
// ---------------------------------------------------------------------------

type TabUpdatedHandler = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => void;

const EXT_ORIGIN = 'chrome-extension://testextensionid/';
const CONNECT_URL = `${EXT_ORIGIN}connect.html`;

const tabUpdatedListeners: TabUpdatedHandler[] = [];

const chromeMock = {
	runtime: {
		getURL: vi.fn((path: string) => `${EXT_ORIGIN}${path}`),
		sendMessage: vi.fn().mockResolvedValue(undefined),
		onMessage: { addListener: vi.fn() },
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
	windows: { update: vi.fn().mockResolvedValue(undefined) },
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
