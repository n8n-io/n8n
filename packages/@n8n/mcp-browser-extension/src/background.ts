/**
 * Chrome extension service worker (background script).
 *
 * Manages the lifecycle of relay connections. Registers user-selected tabs
 * and tracks tab lifecycle for agent-created tabs only.
 */

import { createLogger } from './logger';
import { isAllowedPageOrigin, isAllowedRelayUrl } from './relayAllowlist';
import { RelayConnection, isEligibleTab } from './relayConnection';
import type {
	ExtensionMessage,
	ExternalConnectResponse,
	ExternalConnectResultResponse,
} from './types';
import { isExternalMessage } from './types';

const log = createLogger('bg');

interface ConnectionState {
	relay: RelayConnection;
	relayUrl: string;
}

let activeConnection: ConnectionState | null = null;

// ---------------------------------------------------------------------------
// Relay URL storage (for deduplicating connect.html tabs)
// ---------------------------------------------------------------------------

const CONNECT_PAGE = 'connect.html';
const RELAY_URL_KEY = 'pendingRelayUrl';

// ---------------------------------------------------------------------------
// Action drawer — clicking the extension icon opens drawer.html. While a
// connect confirmation page is open, the drawer is disabled so the icon click
// falls through to onClicked, which focuses the pending page instead of
// showing the same connect view twice.
// ---------------------------------------------------------------------------

const DRAWER_PAGE = 'drawer.html';

function setDrawerEnabled(enabled: boolean): void {
	void chrome.action.setPopup({ popup: enabled ? DRAWER_PAGE : '' });
}

// The disabled state persists across service-worker restarts while the pending
// flow does not — reset on startup so the drawer can't get stuck disabled.
setDrawerEnabled(true);

chrome.action.onClicked.addListener(() => {
	void focusPendingConnectPage();
});

async function focusPendingConnectPage(): Promise<void> {
	const tabId = pendingConnectFlow?.tabId;
	if (tabId === null || tabId === undefined) return;
	try {
		const tab = await chrome.tabs.get(tabId);
		await chrome.tabs.update(tabId, { active: true });
		if (tab.windowId !== undefined) {
			await chrome.windows.update(tab.windowId, { focused: true });
		}
	} catch {
		// Pending page already gone — the next settle re-enables the drawer
	}
}

// ---------------------------------------------------------------------------
// Message handling from connect.html UI
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
	(
		message: ExtensionMessage,
		_sender: chrome.runtime.MessageSender,
		sendResponse: (response: unknown) => void,
	) => {
		log.debug('message received:', message.type);
		void handleMessage(message).then((response) => {
			log.debug('message response:', message.type, response);
			sendResponse(response);
		});
		return true; // keep message channel open for async response
	},
);

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
	switch (message.type) {
		case 'getTabs':
			return await getEligibleTabs();

		case 'connect':
			return await connectToRelay(message.relayUrl, message.selectedTabIds);

		case 'disconnect':
			disconnect();
			return { success: true };

		case 'getStatus':
			return {
				connected: activeConnection !== null,
				tabIds: activeConnection?.relay.getControlledIds() ?? [],
				relayUrl: activeConnection?.relayUrl,
			};

		case 'getRelayUrl': {
			const stored = await chrome.storage.session.get(RELAY_URL_KEY);
			return (stored[RELAY_URL_KEY] as string) ?? null;
		}

		case 'clearRelayUrl':
			await chrome.storage.session.remove(RELAY_URL_KEY);
			return { success: true };

		default:
			return { error: 'Unknown message type' };
	}
}

// ---------------------------------------------------------------------------
// Tab enumeration
// ---------------------------------------------------------------------------

async function getEligibleTabs(): Promise<chrome.tabs.Tab[]> {
	const tabs = await chrome.tabs.query({});
	const eligible = tabs.filter(isEligibleTab);
	log.debug('getEligibleTabs:', eligible.length, 'of', tabs.length, 'total');
	return eligible;
}

// ---------------------------------------------------------------------------
// Connect-page deduplication — when Playwright opens a new connect.html tab,
// reuse an existing one if available instead of creating a duplicate.
// ---------------------------------------------------------------------------

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	if (!changeInfo.url) return;

	const extOrigin = chrome.runtime.getURL('');
	if (!changeInfo.url.startsWith(extOrigin)) return;

	const parsed = new URL(changeInfo.url);
	const relayUrl = parsed.searchParams.get('mcpRelayUrl');
	if (!relayUrl) return;

	log.debug('connect.html tab detected:', tabId, 'relayUrl:', relayUrl);

	void (async () => {
		const existing = await deliverRelayUrl(relayUrl, tabId);
		if (existing?.id !== undefined) {
			await chrome.tabs.remove(tabId);
		}
		// If no existing tab, let the new one load normally — App.vue reads relay URL from storage
	})();
});

/**
 * Stores a fresh relay URL and hands it to an already-open connect page if there
 * is one (focused + notified via `relayUrlReady`). Returns the reused tab, if any.
 */
async function deliverRelayUrl(
	relayUrl: string,
	excludeTabId?: number,
): Promise<chrome.tabs.Tab | undefined> {
	// A new relay URL means the server started a new session — disconnect any existing one
	if (activeConnection) {
		log.debug('new relay URL received while connected, disconnecting old session');
		disconnect();
	}

	// Store relay URL for the UI to pick up
	await chrome.storage.session.set({ [RELAY_URL_KEY]: relayUrl });

	// Check for an existing connect.html tab to reuse
	const connectUrl = chrome.runtime.getURL(CONNECT_PAGE);
	const allConnectTabs = await chrome.tabs.query({ url: `${connectUrl}*` });
	const existing = allConnectTabs.find((t) => t.id !== excludeTabId && t.id !== undefined);
	if (existing?.id === undefined) return undefined;

	log.debug('reusing existing connect.html tab:', existing.id);
	await chrome.tabs.update(existing.id, { active: true });
	if (existing.windowId !== undefined) {
		await chrome.windows.update(existing.windowId, { focused: true });
	}

	// The existing tab stays loaded, so its listener is alive to apply the new relay URL.
	try {
		await chrome.runtime.sendMessage({ type: 'relayUrlReady', relayUrl });
	} catch {
		// Defensive: the stored RELAY_URL_KEY covers a missed message on next mount.
	}
	return existing;
}

// ---------------------------------------------------------------------------
// External messages from n8n pages (externally_connectable) — the n8n UI
// requests a connection and the user confirms in an extension-owned popup.
// ---------------------------------------------------------------------------

const EXTERNAL_CONNECT_THROTTLE_MS = 1000;
const CONNECT_POPUP_WIDTH = 540;
const CONNECT_POPUP_HEIGHT = 700;

let lastExternalConnectAt = 0;

interface PendingConnectFlow {
	relayUrl: string;
	tabId: number | null;
	notify: ((response: ExternalConnectResultResponse) => void) | null;
}

let pendingConnectFlow: PendingConnectFlow | null = null;

function settleConnectFlow(connected: boolean): void {
	if (!pendingConnectFlow) return;
	log.debug('settling connect flow:', pendingConnectFlow.relayUrl, 'connected:', connected);
	try {
		pendingConnectFlow.notify?.({ connected });
	} finally {
		pendingConnectFlow = null;
		setDrawerEnabled(true);
	}
}

chrome.runtime.onMessageExternal.addListener(
	(
		message: unknown,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: unknown) => void,
	) => {
		if (!isExternalMessage(message)) return false;
		if (!isAllowedPageOrigin(sender.origin)) {
			log.warn('ignoring external message from disallowed origin:', sender.origin);
			return false;
		}
		log.debug('external message received:', message.type, 'from', sender.origin);

		if (message.type === 'connect') {
			void handleExternalConnect(message.relayUrl).then(sendResponse, (error: unknown) => {
				log.warn('external connect failed:', error);
				sendResponse({ accepted: false });
			});
			return true;
		}

		if (activeConnection?.relayUrl === message.relayUrl) {
			sendResponse({ connected: true });
			return false;
		}
		if (pendingConnectFlow?.relayUrl === message.relayUrl) {
			pendingConnectFlow.notify = sendResponse;
			return true;
		}
		sendResponse({ connected: false });
		return false;
	},
);

async function handleExternalConnect(relayUrl: string): Promise<ExternalConnectResponse> {
	if (!isAllowedRelayUrl(relayUrl)) {
		log.warn('refusing external connect to disallowed relay:', relayUrl);
		return { accepted: false };
	}

	const now = Date.now();
	if (now - lastExternalConnectAt < EXTERNAL_CONNECT_THROTTLE_MS) {
		log.debug('throttled external connect request');
		return { accepted: false };
	}
	lastExternalConnectAt = now;

	settleConnectFlow(false);

	const existing = await deliverRelayUrl(relayUrl);
	const tabId = existing?.id ?? (await openConnectPopup(relayUrl));
	pendingConnectFlow = { relayUrl, tabId, notify: null };
	setDrawerEnabled(false);
	return { accepted: true };
}

async function openConnectPopup(relayUrl: string): Promise<number | null> {
	const url = `${chrome.runtime.getURL(CONNECT_PAGE)}?mcpRelayUrl=${encodeURIComponent(relayUrl)}`;
	let left: number | undefined;
	let top: number | undefined;
	try {
		const focused = await chrome.windows.getLastFocused();
		if (focused.left !== undefined && focused.width !== undefined) {
			left = Math.max(0, Math.round(focused.left + (focused.width - CONNECT_POPUP_WIDTH) / 2));
		}
		if (focused.top !== undefined && focused.height !== undefined) {
			top = Math.max(0, Math.round(focused.top + (focused.height - CONNECT_POPUP_HEIGHT) / 2));
		}
	} catch {
		// No focused window — let Chrome pick the position
	}
	const popup = await chrome.windows.create({
		url,
		type: 'popup',
		width: CONNECT_POPUP_WIDTH,
		height: CONNECT_POPUP_HEIGHT,
		left,
		top,
	});
	return popup?.tabs?.[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Tab lifecycle listeners — only auto-register agent-created tabs
// ---------------------------------------------------------------------------

chrome.tabs.onCreated.addListener((tab) => {
	log.debug('[onCreated] fired:', JSON.stringify(tab));
	if (!activeConnection || !tab.id) return;

	const relay = activeConnection.relay;
	const isAgentCreated = relay.isAgentCreatedTab(tab.id);

	if (!isAgentCreated) return;

	// For agent-created tabs (e.g. window.open popups), allow about:blank.
	// Only exclude chrome:// and chrome-extension:// internal pages.
	const url = tab.url ?? 'about:blank';
	const isExcluded = url.startsWith('chrome://') || url.startsWith('chrome-extension://');
	if (!isExcluded) {
		log.debug('[onCreated] adding agent-created tab:', tab.id, url);
		void relay.addTab(tab.id, tab.title ?? '', url).then(() => {
			if (relay === activeConnection?.relay) {
				broadcastStatusChange();
				updateBadge(relay.getControlledIds().length);
			}
		});
	}
});

// Detect tabs spawned by navigation from controlled tabs (e.g., target="_blank", window.open)
// This uses sourceTabId which correctly identifies the originating tab,
// unlike chrome.tabs.onCreated's openerTabId which just reflects the focused tab.
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
	if (!activeConnection) return;

	const relay = activeConnection.relay;
	const sourceIsControlled = relay.isControlledTab(details.sourceTabId);

	log.debug(
		'[onCreatedNavigationTarget] tabId:',
		details.tabId,
		'sourceTabId:',
		details.sourceTabId,
		'url:',
		details.url,
		'sourceIsControlled:',
		sourceIsControlled,
	);

	if (!sourceIsControlled) return;

	// Mark as agent-created so onUpdated listener also tracks URL changes
	relay.markAsAgentCreated(details.tabId);

	const url = details.url;
	if (url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://')) {
		log.debug('[onCreatedNavigationTarget] adding spawned tab:', details.tabId, url);
		void relay.addTab(details.tabId, '', url).then(() => {
			if (relay === activeConnection?.relay) {
				broadcastStatusChange();
				updateBadge(relay.getControlledIds().length);
			}
		});
	} else {
		log.debug(
			'[onCreatedNavigationTarget] URL not eligible yet, waiting for onUpdated:',
			details.tabId,
		);
	}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	if (!activeConnection) return;

	// Only auto-register tabs created by the AI agent (or marked as spawned)
	if (!activeConnection.relay.isAgentCreatedTab(tabId)) return;

	if (changeInfo.url) {
		const url = changeInfo.url;
		if (
			!url.startsWith('chrome://') &&
			!url.startsWith('chrome-extension://') &&
			!url.startsWith('about:')
		) {
			if (!activeConnection.relay.isControlledTab(tabId)) {
				log.debug('[onUpdated] adding tab via URL update:', tabId, url);
				void activeConnection.relay.addTab(tabId, changeInfo.title ?? '', url);
			}
		}
	}
});

chrome.tabs.onRemoved.addListener((tabId) => {
	if (pendingConnectFlow?.tabId === tabId && !activeConnection) {
		settleConnectFlow(false);
	}
	if (!activeConnection) return;
	log.debug('tab removed:', tabId);
	activeConnection.relay.removeTab(tabId);
});

// ---------------------------------------------------------------------------
// Relay connection management
// ---------------------------------------------------------------------------

async function connectToRelay(
	relayUrl: string,
	selectedTabIds: number[],
): Promise<{ success: boolean; error?: string }> {
	log.debug('connectToRelay:', relayUrl, 'selectedTabs:', selectedTabIds.length);

	if (!isAllowedRelayUrl(relayUrl)) {
		log.warn('refusing relay connection to disallowed host:', relayUrl);
		return { success: false, error: 'Refusing to connect: not a recognized n8n instance.' };
	}

	// Clean up existing connection
	disconnect();

	try {
		const ws = new WebSocket(relayUrl);

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				ws.close();
				reject(new Error('Connection timeout'));
			}, 10_000);
			ws.onopen = () => {
				clearTimeout(timeout);
				log.debug('WebSocket open');
				resolve();
			};
			ws.onerror = (event) => {
				clearTimeout(timeout);
				ws.close();
				log.error('WebSocket error:', event);
				reject(new Error('WebSocket connection failed'));
			};
		});

		const relay = new RelayConnection(ws);

		try {
			// Eagerly attach debugger to selected tabs and resolve CDP targetIds
			await relay.registerSelectedTabs(selectedTabIds);
		} catch (error) {
			relay.close('network_error');
			throw error;
		}

		activeConnection = { relay, relayUrl };

		relay.onclose = () => {
			log.debug('relay connection closed');
			activeConnection = null;
			updateBadge(0);
			broadcastStatusChange();
		};

		relay.ontabcreated = () => {
			broadcastStatusChange();
			updateBadge(relay.getControlledIds().length);
		};

		const tabCount = relay.getControlledIds().length;
		log.debug('connected, controlling', tabCount, 'tabs');
		updateBadge(tabCount);
		broadcastStatusChange();
		settleConnectFlow(pendingConnectFlow?.relayUrl === relayUrl);
		return { success: true };
	} catch (error) {
		log.error('connectToRelay failed:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function disconnect(): void {
	if (activeConnection) {
		log.debug('disconnecting');
		activeConnection.relay.close('extension_disconnected');
		activeConnection = null;
		updateBadge(0);
	}
}

/** Notify all extension contexts (popup, connect.html tab) about connection state changes. */
function broadcastStatusChange(): void {
	const connected = activeConnection !== null;
	const tabIds = activeConnection?.relay.getControlledIds() ?? [];
	const relayUrl = activeConnection?.relayUrl;
	chrome.runtime.sendMessage({ type: 'statusChanged', connected, tabIds, relayUrl }).catch(() => {
		// No receivers — this is fine if the popup/tab is not open
	});
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

function updateBadge(tabCount: number): void {
	const text = tabCount > 0 ? String(tabCount) : '';
	void chrome.action.setBadgeText({ text });
	void chrome.action.setBadgeBackgroundColor({ color: tabCount > 0 ? '#4CAF50' : '#999' });
}
