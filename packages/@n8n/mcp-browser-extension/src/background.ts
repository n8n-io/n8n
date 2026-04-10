/**
 * Chrome extension service worker (background script).
 *
 * Manages the lifecycle of relay connections. Registers user-selected tabs
 * and tracks tab lifecycle for agent-created tabs only.
 */

import { createLogger } from './logger';
import { RelayConnection, isEligibleTab } from './relayConnection';
import type { ExtensionMessage, TabManagementSettings } from './types';

const log = createLogger('bg');

interface ConnectionState {
	relay: RelayConnection;
}

let activeConnection: ConnectionState | null = null;

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const SETTINGS_KEY = 'tabManagementSettings';

const DEFAULT_SETTINGS: TabManagementSettings = {
	allowTabCreation: true,
	allowTabClosing: false,
};

async function loadSettings(): Promise<TabManagementSettings> {
	const result = await chrome.storage.local.get(SETTINGS_KEY);
	return (result[SETTINGS_KEY] as TabManagementSettings) ?? DEFAULT_SETTINGS;
}

// ---------------------------------------------------------------------------
// Relay URL storage (for deduplicating connect.html tabs)
// ---------------------------------------------------------------------------

const CONNECT_PAGE = '/dist/connect.html';
const RELAY_URL_KEY = 'pendingRelayUrl';

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
			};

		case 'updateSettings': {
			await chrome.storage.local.set({ [SETTINGS_KEY]: message.settings });
			if (activeConnection) {
				activeConnection.relay.setSettings(message.settings);
			}
			return { success: true };
		}

		case 'getSettings':
			return await loadSettings();

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
	if (!changeInfo.url.startsWith(extOrigin) || !changeInfo.url.includes(CONNECT_PAGE)) return;

	const parsed = new URL(changeInfo.url);
	const relayUrl = parsed.searchParams.get('mcpRelayUrl');
	if (!relayUrl) return;

	log.debug('connect.html tab detected:', tabId, 'relayUrl:', relayUrl);

	void (async () => {
		// A new relay URL means the server started a new session — disconnect any existing one
		if (activeConnection) {
			log.debug('new relay URL received while connected, disconnecting old session');
			disconnect();
		}

		// Store relay URL for the UI to pick up
		await chrome.storage.session.set({ [RELAY_URL_KEY]: relayUrl });

		// Check for an existing connect.html tab to reuse
		const connectUrl = chrome.runtime.getURL('dist/connect.html');
		const allConnectTabs = await chrome.tabs.query({ url: `${connectUrl}*` });
		const existing = allConnectTabs.find((t) => t.id !== tabId && t.id !== undefined);

		if (existing?.id !== undefined) {
			// Reuse existing tab: focus it and close the duplicate
			log.debug('reusing existing connect.html tab:', existing.id);
			await chrome.tabs.update(existing.id, { active: true });
			await chrome.tabs.reload(existing.id);
			if (existing.windowId !== undefined) {
				await chrome.windows.update(existing.windowId, { focused: true });
			}
			await chrome.tabs.remove(tabId);

			// Notify existing tab about the new relay URL
			try {
				await chrome.runtime.sendMessage({ type: 'relayUrlReady', relayUrl });
			} catch {
				// Tab may not have a listener ready yet — it will read from storage on next mount
			}
		}
		// If no existing tab, let the new one load normally — App.vue reads relay URL from storage
	})();
});

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
	const tabCreationAllowed = relay.isTabCreationAllowed();

	log.debug(
		'[onCreatedNavigationTarget] tabId:',
		details.tabId,
		'sourceTabId:',
		details.sourceTabId,
		'url:',
		details.url,
		'sourceIsControlled:',
		sourceIsControlled,
		'tabCreationAllowed:',
		tabCreationAllowed,
	);

	if (!sourceIsControlled || !tabCreationAllowed) return;

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

			// Load and apply settings
			const settings = await loadSettings();
			relay.setSettings(settings);
		} catch (error) {
			relay.close('network_error');
			throw error;
		}

		activeConnection = { relay };

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
	chrome.runtime.sendMessage({ type: 'statusChanged', connected, tabIds }).catch(() => {
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

// ---------------------------------------------------------------------------
// Extension icon click — open or focus the connect tab
// ---------------------------------------------------------------------------

chrome.action.onClicked.addListener(() => {
	void openOrFocusConnectTab();
});

async function openOrFocusConnectTab(): Promise<void> {
	const connectUrl = chrome.runtime.getURL('dist/connect.html');
	const existing = await chrome.tabs.query({ url: `${connectUrl}*` });

	if (existing.length > 0 && existing[0].id !== undefined) {
		await chrome.tabs.update(existing[0].id, { active: true });
		if (existing[0].windowId !== undefined) {
			await chrome.windows.update(existing[0].windowId, { focused: true });
		}
	} else {
		await chrome.tabs.create({ url: connectUrl });
	}
}
