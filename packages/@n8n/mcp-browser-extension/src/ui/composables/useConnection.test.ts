import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

import { useConnection } from './useConnection';
import type { BackgroundPushMessage, ControlledTabId } from '../../types';

// ---------------------------------------------------------------------------
// Chrome API mock
// ---------------------------------------------------------------------------

type MessageHandler = (message: BackgroundPushMessage) => void;
type TabCreatedHandler = (tab: chrome.tabs.Tab) => void;
type TabRemovedHandler = (tabId: number) => void;
type TabUpdatedHandler = (
	tabId: number,
	info: chrome.tabs.TabChangeInfo,
	tab: chrome.tabs.Tab,
) => void;

const messageListeners: MessageHandler[] = [];
const tabCreatedListeners: TabCreatedHandler[] = [];
const tabRemovedListeners: TabRemovedHandler[] = [];
const tabUpdatedListeners: TabUpdatedHandler[] = [];

const chromeMock = {
	runtime: {
		sendMessage: vi.fn(),
		onMessage: {
			addListener: vi.fn((fn: MessageHandler) => messageListeners.push(fn)),
			removeListener: vi.fn((fn: MessageHandler) => {
				const i = messageListeners.indexOf(fn);
				if (i >= 0) messageListeners.splice(i, 1);
			}),
		},
	},
	tabs: {
		get: vi.fn(),
		onCreated: {
			addListener: vi.fn((fn: TabCreatedHandler) => tabCreatedListeners.push(fn)),
			removeListener: vi.fn((fn: TabCreatedHandler) => {
				const i = tabCreatedListeners.indexOf(fn);
				if (i >= 0) tabCreatedListeners.splice(i, 1);
			}),
		},
		onRemoved: {
			addListener: vi.fn((fn: TabRemovedHandler) => tabRemovedListeners.push(fn)),
			removeListener: vi.fn((fn: TabRemovedHandler) => {
				const i = tabRemovedListeners.indexOf(fn);
				if (i >= 0) tabRemovedListeners.splice(i, 1);
			}),
		},
		onUpdated: {
			addListener: vi.fn((fn: TabUpdatedHandler) => tabUpdatedListeners.push(fn)),
			removeListener: vi.fn((fn: TabUpdatedHandler) => {
				const i = tabUpdatedListeners.indexOf(fn);
				if (i >= 0) tabUpdatedListeners.splice(i, 1);
			}),
		},
	},
};

Object.assign(globalThis, { chrome: chromeMock });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mount a minimal component that runs useConnection and exposes its return value. */
function mountComposable() {
	let result!: ReturnType<typeof useConnection>;
	const TestComponent = defineComponent({
		setup() {
			result = useConnection();
		},
		template: '<div />',
	});
	const wrapper = mount(TestComponent);
	return { wrapper, result: () => result };
}

/** Push a message to all registered background listeners. */
function pushMessage(message: BackgroundPushMessage): void {
	for (const fn of messageListeners) fn(message);
}

/** Simulate a Chrome tab created event. */
function simulateTabCreated(tab: chrome.tabs.Tab): void {
	for (const fn of tabCreatedListeners) fn(tab);
}

/** Simulate a Chrome tab removed event. */
function simulateTabRemoved(tabId: number): void {
	for (const fn of tabRemovedListeners) fn(tabId);
}

/** Simulate a Chrome tab updated event. */
function simulateTabUpdated(
	tabId: number,
	info: chrome.tabs.TabChangeInfo,
	tab: chrome.tabs.Tab,
): void {
	for (const fn of tabUpdatedListeners) fn(tabId, info, tab);
}

/** Flush all pending microtasks and macrotasks. */
const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));

function makeTab(id: number, overrides: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
	return { id, title: `Tab ${id}`, url: `https://tab${id}.com`, ...overrides } as chrome.tabs.Tab;
}

function makeControlledTabId(chromeTabId: number): ControlledTabId {
	return { targetId: `target-${chromeTabId}`, chromeTabId };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	vi.clearAllMocks();
	messageListeners.length = 0;
	tabCreatedListeners.length = 0;
	tabRemovedListeners.length = 0;
	tabUpdatedListeners.length = 0;

	// Default background responses
	chromeMock.runtime.sendMessage.mockImplementation(async (msg: { type: string }) => {
		if (msg.type === 'getSettings') return { allowTabCreation: true, allowTabClosing: false };
		if (msg.type === 'getRelayUrl') return null;
		if (msg.type === 'getStatus') return { connected: false, tabIds: [] };
		if (msg.type === 'getTabs') return [makeTab(1)];
		if (msg.type === 'clearRelayUrl') return { success: true };
		if (msg.type === 'connect') return { success: true };
		if (msg.type === 'disconnect') return { success: true };
		return await Promise.resolve({});
	});

	chromeMock.tabs.get.mockImplementation(async (id: number) => await Promise.resolve(makeTab(id)));
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useConnection', () => {
	describe('initial state', () => {
		it('starts disconnected with no controlled tabs', async () => {
			const { wrapper, result } = mountComposable();
			await flush();

			expect(result().status.value).toBe('disconnected');
			expect(result().controlledTabIds.value).toEqual([]);
			expect(result().controlledTabs.value).toEqual([]);

			wrapper.unmount();
		});

		it('loads available tabs from background on mount', async () => {
			chromeMock.runtime.sendMessage.mockImplementation(async (msg: { type: string }) => {
				if (msg.type === 'getTabs') return [makeTab(10), makeTab(11)];
				if (msg.type === 'getSettings') return { allowTabCreation: true, allowTabClosing: false };
				if (msg.type === 'getRelayUrl') return null;
				if (msg.type === 'getStatus') return { connected: false, tabIds: [] };
				return await Promise.resolve({});
			});

			const { wrapper, result } = mountComposable();
			await flush();

			expect(result().tabs.value.map((t) => t.id)).toEqual([10, 11]);

			wrapper.unmount();
		});

		it('restores connected state on mount if background reports connected', async () => {
			const controlled = [makeControlledTabId(5), makeControlledTabId(6)];
			chromeMock.runtime.sendMessage.mockImplementation(async (msg: { type: string }) => {
				if (msg.type === 'getStatus') return { connected: true, tabIds: controlled };
				if (msg.type === 'getSettings') return { allowTabCreation: true, allowTabClosing: false };
				if (msg.type === 'getRelayUrl') return null;
				if (msg.type === 'getTabs') return [makeTab(1)];
				return await Promise.resolve({});
			});

			const { wrapper, result } = mountComposable();
			await flush();

			expect(result().status.value).toBe('connected');
			expect(result().controlledTabIds.value).toEqual(controlled);

			wrapper.unmount();
		});
	});

	describe('statusChanged broadcast', () => {
		it('shows controlled tabs immediately when statusChanged arrives with new tab', async () => {
			// Tab 42 must be in the registry (returned by getTabs) for controlledTabDetails to resolve it
			chromeMock.runtime.sendMessage.mockImplementation(async (msg: { type: string }) => {
				if (msg.type === 'getTabs') return [makeTab(1), makeTab(42)];
				if (msg.type === 'getSettings') return { allowTabCreation: true, allowTabClosing: false };
				if (msg.type === 'getRelayUrl') return null;
				if (msg.type === 'getStatus') return { connected: false, tabIds: [] };
				return await Promise.resolve({});
			});

			const { wrapper, result } = mountComposable();
			await flush();

			pushMessage({ type: 'statusChanged', connected: true, tabIds: [makeControlledTabId(42)] });
			await flush();

			expect(result().status.value).toBe('connected');
			expect(result().controlledTabs.value).toHaveLength(1);
			expect(result().controlledTabs.value[0].id).toBe(42);

			wrapper.unmount();
		});

		it('shows agent-created tab in controlled list after chrome.tabs.onCreated fires', async () => {
			const { wrapper, result } = mountComposable();
			await flush();

			// Agent opens tab 42 — background fires onCreated, then sends statusChanged
			simulateTabCreated(makeTab(42));
			pushMessage({
				type: 'statusChanged',
				connected: true,
				tabIds: [makeControlledTabId(1), makeControlledTabId(42)],
			});
			await flush();

			expect(result().controlledTabs.value).toHaveLength(2);
			expect(result().controlledTabs.value.map((t) => t.id)).toEqual([1, 42]);

			wrapper.unmount();
		});

		it('updates controlled tabs when a second tab is added', async () => {
			chromeMock.runtime.sendMessage.mockImplementation(async (msg: { type: string }) => {
				if (msg.type === 'getTabs') return [makeTab(1), makeTab(2)];
				if (msg.type === 'getSettings') return { allowTabCreation: true, allowTabClosing: false };
				if (msg.type === 'getRelayUrl') return null;
				if (msg.type === 'getStatus') return { connected: false, tabIds: [] };
				return await Promise.resolve({});
			});

			const { wrapper, result } = mountComposable();
			await flush();

			pushMessage({ type: 'statusChanged', connected: true, tabIds: [makeControlledTabId(1)] });
			await flush();

			pushMessage({
				type: 'statusChanged',
				connected: true,
				tabIds: [makeControlledTabId(1), makeControlledTabId(2)],
			});
			await flush();

			expect(result().controlledTabs.value).toHaveLength(2);
			expect(result().controlledTabs.value.map((t) => t.id)).toEqual([1, 2]);

			wrapper.unmount();
		});

		it('clears controlled tabs and status when disconnected', async () => {
			const { wrapper, result } = mountComposable();
			await flush();

			pushMessage({ type: 'statusChanged', connected: true, tabIds: [makeControlledTabId(1)] });
			await flush();

			pushMessage({ type: 'statusChanged', connected: false });
			await flush();

			expect(result().status.value).toBe('disconnected');
			expect(result().controlledTabs.value).toEqual([]);
			expect(result().controlledTabIds.value).toEqual([]);

			wrapper.unmount();
		});

		it('silently omits controlled tab IDs not present in the tab registry', async () => {
			// Tab 99 is not in getTabs — registry won't have it, so it's filtered out
			const { wrapper, result } = mountComposable();
			await flush();

			pushMessage({
				type: 'statusChanged',
				connected: true,
				tabIds: [makeControlledTabId(1), makeControlledTabId(99)],
			});
			await flush();

			expect(result().controlledTabs.value).toHaveLength(1);
			expect(result().controlledTabs.value[0].id).toBe(1);

			wrapper.unmount();
		});
	});

	describe('tab registry reactivity', () => {
		it('adds new tab to available list when chrome.tabs.onCreated fires', async () => {
			const { wrapper, result } = mountComposable();
			await flush();

			expect(result().tabs.value.map((t) => t.id)).toEqual([1]);

			simulateTabCreated(makeTab(99));

			expect(result().tabs.value.map((t) => t.id)).toContain(99);

			wrapper.unmount();
		});

		it('removes tab from available list and selection when chrome.tabs.onRemoved fires', async () => {
			const { wrapper, result } = mountComposable();
			await flush();

			result().toggleTab(1);
			expect(result().selectedTabIds.has(1)).toBe(true);

			simulateTabRemoved(1);

			expect(result().tabs.value.map((t) => t.id)).not.toContain(1);
			expect(result().selectedTabIds.has(1)).toBe(false);

			wrapper.unmount();
		});

		it('updates tab details in available list when chrome.tabs.onUpdated fires', async () => {
			const { wrapper, result } = mountComposable();
			await flush();

			expect(result().tabs.value[0].url).toBe('https://tab1.com');

			simulateTabUpdated(
				1,
				{ url: 'https://new-url.com' },
				makeTab(1, { url: 'https://new-url.com' }),
			);

			expect(result().tabs.value[0].url).toBe('https://new-url.com');

			wrapper.unmount();
		});

		it('updates controlled tab details when chrome.tabs.onUpdated fires', async () => {
			const { wrapper, result } = mountComposable();
			await flush();

			pushMessage({ type: 'statusChanged', connected: true, tabIds: [makeControlledTabId(1)] });
			await flush();

			expect(result().controlledTabs.value[0].url).toBe('https://tab1.com');

			simulateTabUpdated(
				1,
				{ url: 'https://navigated.com' },
				makeTab(1, { url: 'https://navigated.com' }),
			);

			expect(result().controlledTabs.value[0].url).toBe('https://navigated.com');

			wrapper.unmount();
		});
	});

	describe('connect', () => {
		it('transitions to connected and populates controlled tabs', async () => {
			const controlled = [makeControlledTabId(7)];
			chromeMock.runtime.sendMessage.mockImplementation(async (msg: { type: string }) => {
				if (msg.type === 'getSettings') return { allowTabCreation: true, allowTabClosing: false };
				if (msg.type === 'getRelayUrl') return 'ws://localhost:1234';
				if (msg.type === 'getStatus') return { connected: true, tabIds: controlled };
				if (msg.type === 'getTabs') return [makeTab(1), makeTab(7)];
				if (msg.type === 'connect') return { success: true };
				if (msg.type === 'clearRelayUrl') return { success: true };
				return await Promise.resolve({});
			});

			const { wrapper, result } = mountComposable();
			await flush();

			await result().connect();
			await flush();

			expect(result().status.value).toBe('connected');
			expect(result().controlledTabs.value.map((t) => t.id)).toEqual([7]);

			wrapper.unmount();
		});

		it('stays disconnected and shows error on connect failure', async () => {
			chromeMock.runtime.sendMessage.mockImplementation(async (msg: { type: string }) => {
				if (msg.type === 'getSettings') return { allowTabCreation: true, allowTabClosing: false };
				if (msg.type === 'getRelayUrl') return 'ws://localhost:1234';
				if (msg.type === 'getStatus') return { connected: false, tabIds: [] };
				if (msg.type === 'getTabs') return [makeTab(1)];
				if (msg.type === 'connect') return { success: false, error: 'Connection refused' };
				return await Promise.resolve({});
			});

			const { wrapper, result } = mountComposable();
			await flush();

			await result().connect();

			expect(result().status.value).toBe('disconnected');
			expect(result().errorMessage.value).toBe('Connection refused');

			wrapper.unmount();
		});

		it('does nothing when no relay URL is available', async () => {
			chromeMock.runtime.sendMessage.mockImplementation(async (msg: { type: string }) => {
				if (msg.type === 'getSettings') return { allowTabCreation: true, allowTabClosing: false };
				if (msg.type === 'getRelayUrl') return null;
				if (msg.type === 'getStatus') return { connected: false, tabIds: [] };
				if (msg.type === 'getTabs') return [makeTab(1)];
				return await Promise.resolve({});
			});

			const { wrapper, result } = mountComposable();
			await flush();

			await result().connect();

			expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalledWith(
				expect.objectContaining({ type: 'connect' }),
			);
			expect(result().errorMessage.value).toBeTruthy();

			wrapper.unmount();
		});
	});

	describe('disconnect', () => {
		it('clears status and controlled tabs', async () => {
			const { wrapper, result } = mountComposable();
			await flush();

			pushMessage({ type: 'statusChanged', connected: true, tabIds: [makeControlledTabId(3)] });
			await flush();

			await result().disconnect();
			await flush();

			expect(result().status.value).toBe('disconnected');
			expect(result().controlledTabs.value).toEqual([]);

			wrapper.unmount();
		});
	});

	describe('tab selection (pre-connect)', () => {
		it('toggles individual tab selection', async () => {
			const { wrapper, result } = mountComposable();
			await flush();

			result().toggleTab(1);
			expect(result().selectedTabIds.has(1)).toBe(true);
			expect(result().someSelected.value).toBe(true);

			result().toggleTab(1);
			expect(result().selectedTabIds.has(1)).toBe(false);
			expect(result().someSelected.value).toBe(false);

			wrapper.unmount();
		});

		it('toggleAll selects all available tabs', async () => {
			chromeMock.runtime.sendMessage.mockImplementation(async (msg: { type: string }) => {
				if (msg.type === 'getTabs') return [makeTab(1), makeTab(2), makeTab(3)];
				if (msg.type === 'getSettings') return { allowTabCreation: true, allowTabClosing: false };
				if (msg.type === 'getRelayUrl') return null;
				if (msg.type === 'getStatus') return { connected: false, tabIds: [] };
				return await Promise.resolve({});
			});

			const { wrapper, result } = mountComposable();
			await flush();

			result().toggleAll();
			expect(result().allSelected.value).toBe(true);
			expect(result().selectedTabIds.size).toBe(3);

			result().toggleAll();
			expect(result().allSelected.value).toBe(false);
			expect(result().selectedTabIds.size).toBe(0);

			wrapper.unmount();
		});
	});

	describe('relayUrlReady message', () => {
		it('stores relay URL so connect can proceed', async () => {
			const { wrapper, result } = mountComposable();
			await flush();

			expect(result().hasRelayUrl.value).toBe(false);

			pushMessage({ type: 'relayUrlReady', relayUrl: 'ws://localhost:9999' });
			await flush();

			expect(result().hasRelayUrl.value).toBe(true);
			expect(result().relayUrl.value).toBe('ws://localhost:9999');

			wrapper.unmount();
		});

		it('resets connected state when new relay URL arrives while connected', async () => {
			const { wrapper, result } = mountComposable();
			await flush();

			pushMessage({ type: 'statusChanged', connected: true, tabIds: [makeControlledTabId(1)] });
			await flush();
			expect(result().status.value).toBe('connected');

			pushMessage({ type: 'relayUrlReady', relayUrl: 'ws://localhost:9999' });
			await flush();

			expect(result().status.value).toBe('disconnected');
			expect(result().controlledTabs.value).toEqual([]);

			wrapper.unmount();
		});
	});

	describe('cleanup', () => {
		it('removes background message listener on unmount', async () => {
			const { wrapper } = mountComposable();
			await flush();

			expect(messageListeners).toHaveLength(1);
			wrapper.unmount();
			expect(messageListeners).toHaveLength(0);
		});

		it('removes chrome tab listeners on unmount', async () => {
			const { wrapper } = mountComposable();
			await flush();

			expect(tabCreatedListeners).toHaveLength(1);
			expect(tabRemovedListeners).toHaveLength(1);
			expect(tabUpdatedListeners).toHaveLength(1);

			wrapper.unmount();

			expect(tabCreatedListeners).toHaveLength(0);
			expect(tabRemovedListeners).toHaveLength(0);
			expect(tabUpdatedListeners).toHaveLength(0);
		});
	});
});
