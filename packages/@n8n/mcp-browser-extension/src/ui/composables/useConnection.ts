import { ref, computed, reactive, onMounted, onUnmounted } from 'vue';

import { createLogger } from '../../logger';
import { isEligibleTab } from '../../relayConnection';
import type {
	ConnectionStatus,
	ControlledTabId,
	TabManagementSettings,
	BackgroundPushMessage,
} from '../../types';
import { isConnectResponse, isStatusResponse, isTabManagementSettings } from '../../types';

const log = createLogger('ui');

const DEFAULT_SETTINGS: TabManagementSettings = {
	allowTabCreation: true,
	allowTabClosing: false,
};

export function useConnection() {
	// ── Core connection state ─────────────────────────────────────────────────
	const status = ref<ConnectionStatus>('disconnected');
	const controlledTabIds = ref<ControlledTabId[]>([]);
	const errorMessage = ref('');
	const settings = ref<TabManagementSettings>({ ...DEFAULT_SETTINGS });
	const relayUrl = ref<string | null>(null);

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

	const allSelected = computed(
		() =>
			availableTabs.value.length > 0 &&
			availableTabs.value.every((t) => t.id !== undefined && selectedTabIds.has(t.id)),
	);

	const someSelected = computed(() => selectedTabIds.size > 0);

	// ── Private helpers ───────────────────────────────────────────────────────

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

	function toggleAll(): void {
		if (allSelected.value) {
			selectedTabIds.clear();
		} else {
			for (const t of availableTabs.value) {
				if (t.id !== undefined) selectedTabIds.add(t.id);
			}
		}
	}

	async function connect(): Promise<void> {
		if (!relayUrl.value) {
			errorMessage.value = 'No active session. Ask n8n AI to connect to your browser.';
			log.warn('connect: no relay URL available');
			return;
		}

		log.debug('connect: relay URL =', relayUrl.value, 'selectedTabs:', selectedTabIds.size);
		status.value = 'connecting';
		errorMessage.value = '';

		const raw: unknown = await chrome.runtime.sendMessage({
			type: 'connect',
			relayUrl: relayUrl.value,
			selectedTabIds: [...selectedTabIds],
		});
		log.debug('connect response:', raw);

		if (isConnectResponse(raw) && raw.success) {
			status.value = 'connected';
			await chrome.runtime.sendMessage({ type: 'clearRelayUrl' });
			// Fetch controlled IDs — controlledTabDetails computed auto-resolves from registry
			const statusResponse: unknown = await chrome.runtime.sendMessage({ type: 'getStatus' });
			if (isStatusResponse(statusResponse)) {
				controlledTabIds.value = statusResponse.tabIds ?? [];
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
		status.value = 'disconnected';
		controlledTabIds.value = []; // controlledTabDetails auto-computes to []
		relayUrl.value = null;
	}

	async function updateSettings(partial: Partial<TabManagementSettings>): Promise<void> {
		settings.value = { ...settings.value, ...partial };
		await chrome.runtime.sendMessage({
			type: 'updateSettings',
			settings: settings.value,
		});
	}

	// ── Background push message listener ─────────────────────────────────────

	async function onBackgroundMessage(message: BackgroundPushMessage): Promise<void> {
		if (message.type === 'relayUrlReady' && message.relayUrl) {
			log.debug('relayUrlReady received:', message.relayUrl);
			relayUrl.value = message.relayUrl;
			if (status.value === 'connected') {
				status.value = 'disconnected';
				controlledTabIds.value = []; // controlledTabDetails auto-computes to []
				await initTabRegistry();
			}
		}

		if (message.type === 'statusChanged') {
			log.debug('statusChanged received: connected=', message.connected);
			if (message.connected) {
				status.value = 'connected';
				const incoming = message.tabIds ?? [];
				const missing = incoming.filter((e) => !tabRegistry.has(e.chromeTabId));
				if (missing.length > 0) await initTabRegistry();
				controlledTabIds.value = incoming; // controlledTabDetails auto-computes
			} else {
				status.value = 'disconnected';
				controlledTabIds.value = []; // controlledTabDetails auto-computes to []
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
		const savedSettings: unknown = await chrome.runtime.sendMessage({ type: 'getSettings' });
		log.debug('saved settings:', savedSettings);
		if (isTabManagementSettings(savedSettings)) {
			const validated: TabManagementSettings = savedSettings;
			settings.value = validated;
		}

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
			status.value = 'connected';
			controlledTabIds.value = currentStatus.tabIds ?? [];
		}

		await initTabRegistry();

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
		settings,
		relayUrl,
		hasRelayUrl,
		isAutoConnect,
		controlledTabs: controlledTabDetails,
		allSelected,
		someSelected,
		toggleTab,
		toggleAll,
		connect,
		disconnect,
		updateSettings,
	};
}

/**
 * Returns true if the relay URL points to the local machine. Used to gate
 * the `?autoConnect=1` shortcut so a crafted chrome-extension URL with a
 * remote `mcpRelayUrl` cannot trigger an unattended connect.
 */
function isLocalhostRelay(url: string | null): boolean {
	if (!url) return false;
	try {
		const { hostname } = new URL(url);
		return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]';
	} catch {
		return false;
	}
}
