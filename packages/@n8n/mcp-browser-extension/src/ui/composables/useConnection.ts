import { ref, computed, reactive, onMounted, onUnmounted } from 'vue';

import { forgetApprovedHost, listApprovedHosts, rememberHost } from '../../approvedHosts';
import { createLogger } from '../../logger';
import { getRelayHostKey, isAllowedRelayUrl, isLocalhostRelay } from '../../relayAllowlist';
import { isEligibleTab } from '../../relayConnection';
import type {
	ConnectionStatus,
	ControlledTabId,
	BackgroundPushMessage,
	StatusResponse,
} from '../../types';
import { isConnectResponse, isStatusResponse } from '../../types';

const log = createLogger('ui');

export function useConnection() {
	// ── Core connection state ─────────────────────────────────────────────────
	const status = ref<ConnectionStatus>('disconnected');
	const controlledTabIds = ref<ControlledTabId[]>([]);
	const errorMessage = ref('');
	const relayUrl = ref<string | null>(null);
	// Reported by the background, which owns the live session. Lets a view that never
	// saw the connect request — the drawer — still name the instance it is bound to.
	const connectedRelayUrl = ref<string | null>(null);

	// Set when the page is opened with `?autoConnect=1` AND the relay URL
	// points to localhost. Skips the manual click: every available tab is
	// selected and `connect()` fires once relayUrl + tab registry are ready.
	//
	// The localhost gate keeps this safe for the only legitimate use case
	// (an eval daemon running on the user's machine spawning a local relay),
	// while blocking the remote-phishing path where an attacker tricks a
	// user into opening a crafted chrome-extension URL pointing at an
	// attacker-controlled WSS endpoint.
	const isAutoConnect = ref<boolean>(false);

	// ── Remembered-instance consent ──────────────────────────────────────────
	// Opt-in: a remembered instance reconnects with no prompt at all, so nobody should end
	// up in that state without ticking the box themselves.
	const rememberInstance = ref(false);
	// Every stored host, so the drawer can revoke them without being connected.
	const approvedHosts = ref<string[]>([]);

	// ── Single source of truth: reactive tab registry ─────────────────────────
	// Maps chromeTabId → tab object. Kept in sync by Chrome tab event listeners.
	const tabRegistry = reactive(new Map<number, chrome.tabs.Tab>());

	// ── User's pre-connect tab selection ─────────────────────────────────────
	const selectedTabIds = reactive(new Set<number>());

	// ── Derived views over the registry ──────────────────────────────────────

	// All eligible tabs for the pre-connect selection UI
	const availableTabs = computed(() => [...tabRegistry.values()].filter(isEligibleTab));

	// Tab details for currently controlled tabs (post-connect)
	const controlledTabDetails = computed(() =>
		controlledTabIds.value
			.map((e) => tabRegistry.get(e.chromeTabId))
			.filter((t): t is chrome.tabs.Tab => t !== undefined),
	);

	// ── Computeds ─────────────────────────────────────────────────────────────
	const hasRelayUrl = computed(() => !!relayUrl.value);
	const isRelayAllowed = computed(() => isAllowedRelayUrl(relayUrl.value));
	// The one identity the user ever sees, and the one that gets stored, so what they agree
	// to always matches what the revoke list shows back.
	const relayHostKey = computed(() => getRelayHostKey(connectedRelayUrl.value ?? relayUrl.value));

	// ── Private helpers ───────────────────────────────────────────────────────

	function applyStatus(update: StatusResponse): void {
		const connected = update.connected === true;
		status.value = connected ? 'connected' : 'disconnected';
		controlledTabIds.value = connected ? (update.tabIds ?? []) : [];
		connectedRelayUrl.value = connected ? (update.relayUrl ?? null) : null;
	}

	async function initTabRegistry(): Promise<void> {
		const result: unknown = await chrome.runtime.sendMessage({ type: 'getTabs' });
		const tabs = Array.isArray(result) ? (result as chrome.tabs.Tab[]) : [];
		tabRegistry.clear();
		for (const tab of tabs) {
			if (tab.id !== undefined) tabRegistry.set(tab.id, tab);
		}
		log.debug('initTabRegistry:', tabRegistry.size, 'tabs');
	}

	// ── Chrome tab event listeners — keep registry in sync ────────────────────

	function onTabCreated(tab: chrome.tabs.Tab): void {
		if (tab.id !== undefined) tabRegistry.set(tab.id, tab);
	}

	function onTabRemoved(tabId: number): void {
		tabRegistry.delete(tabId);
		selectedTabIds.delete(tabId);
	}

	function onTabUpdated(
		_tabId: number,
		_info: chrome.tabs.TabChangeInfo,
		tab: chrome.tabs.Tab,
	): void {
		if (tab.id !== undefined && tabRegistry.has(tab.id)) tabRegistry.set(tab.id, tab);
	}

	// ── Public methods ────────────────────────────────────────────────────────

	function toggleTab(tabId: number): void {
		if (selectedTabIds.has(tabId)) {
			selectedTabIds.delete(tabId);
		} else {
			selectedTabIds.add(tabId);
		}
	}

	async function connect(): Promise<void> {
		if (!relayUrl.value) {
			errorMessage.value = 'No active session. Ask n8n AI to connect to your browser.';
			log.warn('connect: no relay URL available');
			return;
		}

		if (!isAllowedRelayUrl(relayUrl.value)) {
			errorMessage.value = `Can't connect to ${relayHostKey.value ?? 'this address'} — not a recognized n8n instance.`;
			log.warn('connect: relay URL not allowed', relayUrl.value);
			return;
		}

		// Pinned before any await: a new request can replace `relayUrl` mid-handshake, and the
		// approval must record the host the user was actually shown.
		const approvedUrl = relayUrl.value;
		log.debug('connect: relay URL =', approvedUrl, 'selectedTabs:', selectedTabIds.size);
		status.value = 'connecting';
		errorMessage.value = '';

		const raw: unknown = await chrome.runtime.sendMessage({
			type: 'connect',
			relayUrl: approvedUrl,
			selectedTabIds: [...selectedTabIds],
		});
		log.debug('connect response:', raw);

		if (isConnectResponse(raw) && raw.success) {
			status.value = 'connected';
			// The eval harness connects unattended — it must not write user-facing trust state.
			if (rememberInstance.value && !isAutoConnect.value) {
				approvedHosts.value = await rememberHost(approvedUrl);
			}
			await chrome.runtime.sendMessage({ type: 'clearRelayUrl' });
			// Fetch controlled IDs — controlledTabDetails computed auto-resolves from registry
			const statusResponse: unknown = await chrome.runtime.sendMessage({ type: 'getStatus' });
			if (isStatusResponse(statusResponse)) {
				applyStatus(statusResponse);
			}
			const currentWindow = await chrome.windows.getCurrent();
			if (currentWindow.type === 'popup') {
				window.close();
			}
		} else {
			status.value = 'disconnected';
			errorMessage.value = isConnectResponse(raw)
				? (raw.error ?? 'Unknown error')
				: 'Unknown error';
			log.error('connect failed:', errorMessage.value);
		}
	}

	async function disconnect(): Promise<void> {
		log.debug('disconnect');
		await chrome.runtime.sendMessage({ type: 'disconnect' });
		applyStatus({ connected: false });
		relayUrl.value = null;
	}

	/** Drops a stored approval. Never touches the live session. */
	async function forgetHost(host: string): Promise<void> {
		log.debug('forgetHost', host);
		approvedHosts.value = await forgetApprovedHost(host);
	}

	async function decline(): Promise<void> {
		log.debug('decline');
		await chrome.runtime.sendMessage({ type: 'clearRelayUrl' });
		relayUrl.value = null;
		// In the action popover the page is not a tab — getCurrent returns undefined
		const currentTab = await chrome.tabs.getCurrent();
		if (currentTab?.id !== undefined) {
			await chrome.tabs.remove(currentTab.id);
		} else {
			window.close();
		}
	}

	// ── Background push message listener ─────────────────────────────────────

	// Must be a sync listener: an async listener returns a Promise, which Chrome
	// treats as "will respond" — with several extension views open (drawer +
	// connect page) it then races the background's real sendMessage response
	// with `undefined` and the caller sees a bogus error.
	function onBackgroundMessage(message: BackgroundPushMessage): void {
		void handleBackgroundMessage(message);
	}

	async function handleBackgroundMessage(message: BackgroundPushMessage): Promise<void> {
		if (message.type === 'relayUrlReady' && message.relayUrl) {
			log.debug('relayUrlReady received:', message.relayUrl);
			relayUrl.value = message.relayUrl;
			// A different instance is asking now, so its approval has to be given afresh.
			rememberInstance.value = false;
			// Drop the now-stale connection params from the page URL. The live value lives in
			// relayUrl + session storage, so a manual reload reads the fresh URL, not the old token.
			window.history.replaceState(null, '', window.location.pathname);
			if (status.value === 'connected') {
				applyStatus({ connected: false });
				await initTabRegistry();
			}
		}

		if (message.type === 'statusChanged') {
			log.debug('statusChanged received: connected=', message.connected);
			applyStatus(message);
			if (message.connected) {
				const missing = (message.tabIds ?? []).filter((e) => !tabRegistry.has(e.chromeTabId));
				if (missing.length > 0) await initTabRegistry();
			} else {
				relayUrl.value = null;
			}
		}
	}

	chrome.runtime.onMessage.addListener(onBackgroundMessage);

	let mounted = true;

	onUnmounted(() => {
		mounted = false;
		chrome.runtime.onMessage.removeListener(onBackgroundMessage);
		chrome.tabs.onCreated.removeListener(onTabCreated);
		chrome.tabs.onRemoved.removeListener(onTabRemoved);
		chrome.tabs.onUpdated.removeListener(onTabUpdated);
	});

	// ── Initialization ────────────────────────────────────────────────────────

	onMounted(async () => {
		// Read relay URL directly from the page's own query string first.
		// This is more reliable than session storage, which can race with the UI mount
		// (the background script writes it asynchronously when the tab is created).
		const params = new URLSearchParams(window.location.search);
		const urlParam = params.get('mcpRelayUrl');
		if (urlParam) {
			log.debug('relay URL from query param:', urlParam);
			relayUrl.value = urlParam;
		} else {
			const storedUrl: unknown = await chrome.runtime.sendMessage({ type: 'getRelayUrl' });
			log.debug('stored relay URL:', storedUrl);
			if (typeof storedUrl === 'string') {
				relayUrl.value = storedUrl;
			}
		}

		// Auto-connect is only honored when the relay URL points to localhost.
		// See the comment on `isAutoConnect` above for the threat model.
		const wantsAutoConnect = params.get('autoConnect') === '1';
		isAutoConnect.value = wantsAutoConnect && isLocalhostRelay(relayUrl.value);
		if (wantsAutoConnect && !isAutoConnect.value) {
			log.warn('autoConnect ignored: relay URL is not localhost', relayUrl.value);
		}

		// Set status + controlledTabIds before loading registry to prevent
		// pre-connect UI from rendering briefly while status is still being read.
		const currentStatus: unknown = await chrome.runtime.sendMessage({ type: 'getStatus' });
		log.debug('initial status:', currentStatus);
		if (isStatusResponse(currentStatus) && currentStatus.connected) {
			applyStatus(currentStatus);
		}

		const [storedHosts] = await Promise.all([listApprovedHosts(), initTabRegistry()]);
		approvedHosts.value = storedHosts;

		if (!mounted) return;

		// Register tab event listeners after initial population
		chrome.tabs.onCreated.addListener(onTabCreated);
		chrome.tabs.onRemoved.addListener(onTabRemoved);
		chrome.tabs.onUpdated.addListener(onTabUpdated);

		// Auto-connect for eval harness — select all eligible tabs and connect.
		// The eval daemon sets `?autoConnect=1` so subsequent `browser_connect`
		// calls don't require a manual click between scenarios. Already
		// gated on a localhost relay URL above.
		if (isAutoConnect.value && relayUrl.value && status.value === 'disconnected') {
			for (const tab of availableTabs.value) {
				if (tab.id !== undefined) selectedTabIds.add(tab.id);
			}
			void connect();
		}
	});

	return {
		status,
		controlledTabIds,
		tabs: availableTabs,
		selectedTabIds,
		errorMessage,
		relayUrl,
		hasRelayUrl,
		isRelayAllowed,
		isAutoConnect,
		relayHostKey,
		rememberInstance,
		approvedHosts,
		controlledTabs: controlledTabDetails,
		toggleTab,
		connect,
		decline,
		disconnect,
		forgetHost,
	};
}
