/**
 * Chrome extension service worker (background script).
 *
 * Manages the lifecycle of relay connections. Auto-connects to all eligible
 * browser tabs and tracks tab lifecycle (new tabs, closed tabs).
 */

import { RelayConnection, type TabManagementSettings } from './relayConnection';

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
// Message handling from connect.html UI
// ---------------------------------------------------------------------------

interface GetTabsMessage {
	type: 'getTabs';
}

interface ConnectMessage {
	type: 'connect';
	relayUrl: string;
}

interface DisconnectMessage {
	type: 'disconnect';
}

interface GetStatusMessage {
	type: 'getStatus';
}

interface UpdateSettingsMessage {
	type: 'updateSettings';
	settings: TabManagementSettings;
}

interface GetSettingsMessage {
	type: 'getSettings';
}

type ExtensionMessage =
	| GetTabsMessage
	| ConnectMessage
	| DisconnectMessage
	| GetStatusMessage
	| UpdateSettingsMessage
	| GetSettingsMessage;

chrome.runtime.onMessage.addListener(
	(
		message: ExtensionMessage,
		_sender: chrome.runtime.MessageSender,
		sendResponse: (response: unknown) => void,
	) => {
		void handleMessage(message).then(sendResponse);
		return true; // keep message channel open for async response
	},
);

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
	switch (message.type) {
		case 'getTabs':
			return await getControlledTabs();

		case 'connect':
			return await connectToRelay(message.relayUrl);

		case 'disconnect':
			disconnect();
			return { success: true };

		case 'getStatus':
			return {
				connected: activeConnection !== null,
				tabIds: activeConnection?.relay.getControlledTabIds() ?? [],
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

		default:
			return { error: 'Unknown message type' };
	}
}

// ---------------------------------------------------------------------------
// Tab enumeration
// ---------------------------------------------------------------------------

async function getControlledTabs(): Promise<chrome.tabs.Tab[]> {
	const tabs = await chrome.tabs.query({});
	return tabs.filter(
		(tab) =>
			tab.id !== undefined &&
			tab.url !== undefined &&
			!tab.url.startsWith('chrome://') &&
			!tab.url.startsWith('chrome-extension://') &&
			!tab.url.startsWith('about:'),
	);
}

// ---------------------------------------------------------------------------
// Tab lifecycle listeners — auto-attach/detach new/closed tabs
// ---------------------------------------------------------------------------

chrome.tabs.onCreated.addListener((tab) => {
	if (!activeConnection || !tab.id) return;

	// Wait for URL to be populated, then add if eligible
	const checkAndAdd = () => {
		if (!tab.url || tab.url === 'chrome://newtab/') {
			// URL not yet known — wait for update
			return;
		}
		if (
			!tab.url.startsWith('chrome://') &&
			!tab.url.startsWith('chrome-extension://') &&
			!tab.url.startsWith('about:')
		) {
			activeConnection?.relay.addTab(tab.id!, tab.title ?? '', tab.url ?? '');
		}
	};
	checkAndAdd();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	if (!activeConnection) return;

	// When a tab's URL is loaded for the first time (new tab navigation)
	if (changeInfo.url) {
		const url = changeInfo.url;
		if (
			!url.startsWith('chrome://') &&
			!url.startsWith('chrome-extension://') &&
			!url.startsWith('about:')
		) {
			// If not already tracked, add it
			if (!activeConnection.relay.getControlledTabIds().includes(tabId)) {
				activeConnection.relay.addTab(tabId, changeInfo.title ?? '', url);
			}
		}
	}
});

chrome.tabs.onRemoved.addListener((tabId) => {
	if (!activeConnection) return;
	activeConnection.relay.removeTab(tabId);
});

// ---------------------------------------------------------------------------
// Relay connection management
// ---------------------------------------------------------------------------

async function connectToRelay(relayUrl: string): Promise<{ success: boolean; error?: string }> {
	// Clean up existing connection
	disconnect();

	try {
		const ws = new WebSocket(relayUrl);

		await new Promise<void>((resolve, reject) => {
			ws.onopen = () => resolve();
			ws.onerror = () => reject(new Error('WebSocket connection failed'));
			setTimeout(() => reject(new Error('Connection timeout')), 10_000);
		});

		const relay = new RelayConnection(ws);

		// Auto-discover and attach to all eligible tabs
		await relay.discoverAndAttachTabs();

		// Load and apply settings
		const settings = await loadSettings();
		relay.setSettings(settings);

		activeConnection = { relay };

		relay.onclose = () => {
			activeConnection = null;
			updateBadge(0);
		};

		updateBadge(relay.getControlledTabIds().length);
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function disconnect(): void {
	if (activeConnection) {
		activeConnection.relay.close('User disconnected');
		activeConnection = null;
		updateBadge(0);
	}
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
// Extension icon click — open the connect popup as a tab
// ---------------------------------------------------------------------------

chrome.action.onClicked.addListener(() => {
	void chrome.tabs.create({ url: chrome.runtime.getURL('dist/connect.html') });
});
