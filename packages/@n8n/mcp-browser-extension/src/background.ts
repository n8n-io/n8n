/**
 * Chrome extension service worker (background script).
 *
 * Manages the lifecycle of relay connections initiated from the connect UI.
 * Each connection bridges CDP commands between the relay server and a Chrome tab
 * via the chrome.debugger API.
 */

import { RelayConnection } from './relayConnection';

interface ConnectionState {
	relay: RelayConnection;
	tabId?: number;
}

let activeConnection: ConnectionState | null = null;

// ---------------------------------------------------------------------------
// Message handling from connect.html UI
// ---------------------------------------------------------------------------

interface GetTabsMessage {
	type: 'getTabs';
}

interface ConnectMessage {
	type: 'connect';
	relayUrl: string;
	tabId: number;
}

interface DisconnectMessage {
	type: 'disconnect';
}

interface GetStatusMessage {
	type: 'getStatus';
}

type ExtensionMessage = GetTabsMessage | ConnectMessage | DisconnectMessage | GetStatusMessage;

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
			return await getAvailableTabs();

		case 'connect':
			return await connectToRelay(message.relayUrl, message.tabId);

		case 'disconnect':
			disconnect();
			return { success: true };

		case 'getStatus':
			return {
				connected: activeConnection !== null,
				tabId: activeConnection?.tabId,
			};

		default:
			return { error: 'Unknown message type' };
	}
}

// ---------------------------------------------------------------------------
// Tab enumeration
// ---------------------------------------------------------------------------

async function getAvailableTabs(): Promise<chrome.tabs.Tab[]> {
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
// Relay connection management
// ---------------------------------------------------------------------------

async function connectToRelay(
	relayUrl: string,
	tabId: number,
): Promise<{ success: boolean; error?: string }> {
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
		relay.setTabId(tabId);

		activeConnection = { relay, tabId };

		relay.onclose = () => {
			activeConnection = null;
			updateBadge(false);
		};

		updateBadge(true);
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
		updateBadge(false);
	}
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

function updateBadge(connected: boolean): void {
	void chrome.action.setBadgeText({ text: connected ? 'ON' : '' });
	void chrome.action.setBadgeBackgroundColor({ color: connected ? '#4CAF50' : '#999' });
}

// ---------------------------------------------------------------------------
// Extension icon click — open the connect popup as a tab
// ---------------------------------------------------------------------------

chrome.action.onClicked.addListener(() => {
	void chrome.tabs.create({ url: chrome.runtime.getURL('dist/connect.html') });
});
