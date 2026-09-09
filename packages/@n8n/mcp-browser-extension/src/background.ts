/**
 * Chrome extension service worker (background script).
 *
 * Manages the lifecycle of relay connections. Registers user-selected tabs
 * and tracks tab lifecycle for agent-created tabs only.
 */

import type { BrowserRecordingAction, BrowserRecordingScreenshot } from '@n8n/api-types';

import { isHostApproved } from './approvedHosts';
import { createLogger } from './logger';
import { getRecordingSettings } from './recordingSettings';
import { getRelayHostKey, isAllowedPageOrigin, isAllowedRelayUrl } from './relayAllowlist';
import { RelayConnection, isEligibleTab, type CapturedNetworkRequest } from './relayConnection';
import type {
	BrowserRecording,
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
// Bumped per connect request. A handshake is slow enough that a newer one can finish while
// an older is still opening, so the older must not commit itself over the live session.
let connectGeneration = 0;

/** A query param rather than a header because `WebSocket` cannot set request headers. */
export function buildRelayWsUrl(relayUrl: string, version: string): string {
	const url = new URL(relayUrl);
	url.searchParams.set('extensionVersion', version);
	return url.toString();
}

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

// ---------------------------------------------------------------------------
// Recording indicator — while a recording is capturing, the toolbar icon
// turns red so the user can tell it's running without opening the popup.
// ---------------------------------------------------------------------------

const DEFAULT_TITLE = 'n8n Browser Use'; // must match manifest.json action.default_title
const RECORDING_TITLE = 'n8n Browser Use — Recording…';
const RECORDING_BADGE_TEXT = '•';
const RECORDING_BADGE_COLOR = '#D32F2F';

// Tab lifecycle events call updateBadge() with a fresh tab count throughout a
// recording (new tab attached, agent tab created, etc.) — this flag makes
// updateBadge() a no-op while recording so those calls can't stomp the red
// indicator with the tab-count badge.
let recordingIndicatorActive = false;

export function updateRecordingIndicator(active: boolean): void {
	recordingIndicatorActive = active;
	void chrome.action.setTitle({ title: active ? RECORDING_TITLE : DEFAULT_TITLE });
	if (active) {
		void chrome.action.setBadgeText({ text: RECORDING_BADGE_TEXT });
		void chrome.action.setBadgeBackgroundColor({ color: RECORDING_BADGE_COLOR });
	} else {
		updateBadge(activeConnection?.relay.getControlledIds().length ?? 0);
	}
}

// The disabled state persists across service-worker restarts while the pending
// flow does not — reset on startup so the drawer can't get stuck disabled.
setDrawerEnabled(true);
// Same story for the badge/title: they're native state, not tied to the
// service worker's lifetime — reset so a worker evicted mid-recording can't
// leave the red indicator stuck on forever.
updateRecordingIndicator(false);

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
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: unknown) => void,
	) => {
		log.debug('message received:', message.type);
		void handleMessage(message, sender).then((response) => {
			log.debug('message response:', message.type, response);
			sendResponse(response);
		});
		return true; // keep message channel open for async response
	},
);

async function handleMessage(
	message: ExtensionMessage,
	sender: chrome.runtime.MessageSender,
): Promise<unknown> {
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

		case 'startRecording':
			return await startRecording();

		case 'stopRecording':
			await stopRecording();
			return { success: true };

		case 'getRecording':
			return getVisibleRecording();

		case 'submitRecording':
			return submitRecording();

		case 'discardRecording':
			await discardRecording();
			return { success: true };

		case 'removeRecordingAction':
			if (recording?.status === 'review') {
				recording.actions = recording.actions.filter((action) => action.id !== message.actionId);
				recording.screenshots = recording.screenshots?.filter(
					(screenshot) => screenshot.actionId !== message.actionId,
				);
				recording.networkRequests = recording.networkRequests?.filter(
					(request) => request.actionId !== message.actionId,
				);
				broadcastRecordingChange();
			}
			return { success: true };

		case 'maskRecordingAction':
			if (recording?.status === 'review') {
				const action = recording.actions.find((item) => item.id === message.actionId);
				if (!action) return { success: true };
				if (action.value !== undefined) action.value = '[REDACTED]';
				action.redacted = true;
				if (action.target) {
					action.target.label = undefined;
					action.target.name = undefined;
				}
				try {
					action.url = new URL(action.url).origin;
				} catch {
					action.url = '';
				}
				recording.screenshots = recording.screenshots?.filter(
					(screenshot) => screenshot.actionId !== message.actionId,
				);
				recording.networkRequests = recording.networkRequests?.filter(
					(request) => request.actionId !== message.actionId,
				);
				broadcastRecordingChange();
			}
			return { success: true };

		case 'removeRecordingScreenshot':
			if (recording?.status === 'review') {
				recording.screenshots = recording.screenshots?.filter(
					(screenshot) => screenshot.id !== message.screenshotId,
				);
				broadcastRecordingChange();
			}
			return { success: true };

		case 'removeRecordingNetworkRequest':
			if (recording?.status === 'review') {
				recording.networkRequests = recording.networkRequests?.filter(
					(request) => request.id !== message.requestId,
				);
				broadcastRecordingChange();
			}
			return { success: true };

		case 'recordingAction':
			appendRecordingAction(message.action, sender);
			return { success: true };

		default:
			return { error: 'Unknown message type' };
	}
}

// ---------------------------------------------------------------------------
// Semantic action recording
// ---------------------------------------------------------------------------

const MAX_RECORDING_ACTIONS = 250;
const MAX_RECORDING_NETWORK_REQUESTS = 500;
const MAX_RECORDING_SCREENSHOTS = 20;
const MAX_RECORDING_SCREENSHOT_BASE64_BYTES = 1024 * 1024;
const MAX_RECORDING_SCREENSHOTS_BASE64_BYTES = 12 * 1024 * 1024;
const RECORDING_SUBMIT_TIMEOUT_MS = 20_000;
const SENSITIVE_FIELD_PATTERN =
	/(?:password|passcode|secret|token|api[ _-]?key|access[ _-]?key|private[ _-]?key|authorization|credential|card[ _-]?number|security[ _-]?code|cvv|cvc|pin)/i;
const SECRET_VALUE_PATTERNS = [
	/-----BEGIN [A-Z ]*PRIVATE KEY-----/,
	/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
	/\b(?:sk|pk|rk|ghp|gho|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{16,}\b/i,
];

let recording: BrowserRecording | null = null;
let recordingSubmitTimer: ReturnType<typeof setTimeout> | undefined;
const pendingRecordingTabIds = new Set<number>();
const recordingTabIds = new Set<number>();
const activatingRecordingTabIds = new Set<number>();
const lastRecordingActionByTab = new Map<number, string>();
let screenshotCaptureQueue = Promise.resolve();
let queuedScreenshotCount = 0;
let screenshotCaptureRecordingId: string | undefined;

function isBlankTabUrl(url: string | undefined): boolean {
	return (
		url === 'about:blank' ||
		url?.startsWith('chrome://newtab') === true ||
		url?.startsWith('chrome://new-tab-page') === true
	);
}

function isRecordableUrl(url: string): boolean {
	return url.startsWith('https://') || url.startsWith('http://');
}

function sanitizeUrl(raw: string): string {
	try {
		const url = new URL(raw);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
		const path = url.pathname
			.split('/')
			.slice(0, 7)
			.map((segment) => {
				const decoded = decodeURIComponent(segment);
				return /@|\d|[A-Fa-f0-9]{16,}|[A-Za-z0-9_-]{24,}/.test(decoded) ? ':id' : segment;
			})
			.join('/');
		return `${url.origin}${path}`.slice(0, 500);
	} catch {
		return '';
	}
}

function sanitizeText(value: string | undefined, limit: number): string | undefined {
	const sanitized = value?.replace(/\s+/g, ' ').trim().slice(0, limit);
	return sanitized === '' ? undefined : sanitized;
}

function sanitizeValue(
	value: string | undefined,
	target: { label?: string; name?: string; inputType?: string } | undefined,
): { value?: string; redacted?: boolean } {
	if (value === undefined) return {};
	const fieldContext = `${target?.label ?? ''} ${target?.name ?? ''} ${target?.inputType ?? ''}`;
	if (
		target?.inputType === 'password' ||
		SENSITIVE_FIELD_PATTERN.test(fieldContext) ||
		SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))
	) {
		return { value: '[REDACTED]', redacted: true };
	}
	return { value: sanitizeText(value, 200) };
}

async function injectRecorder(tabId: number, frameId?: number): Promise<void> {
	try {
		await chrome.scripting.executeScript({
			target: frameId === undefined ? { tabId, allFrames: true } : { tabId, frameIds: [frameId] },
			files: ['recorder.js'],
			injectImmediately: true,
		});
	} catch {
		// Internal and restricted pages cannot run the recorder.
	}
}

async function startRecording(): Promise<{ success: boolean; error?: string }> {
	const relay = activeConnection?.relay;
	if (!relay) return { success: false, error: 'Connect the extension before recording.' };

	const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
	const pendingTabId =
		activeTab?.id !== undefined && isBlankTabUrl(activeTab.url) ? activeTab.id : undefined;
	if (activeTab?.id !== undefined && isEligibleTab(activeTab)) {
		await relay.addTab(activeTab.id, activeTab.title ?? '', activeTab.url ?? '');
	}

	const controlledTabs = relay.getControlledIds();
	if (controlledTabs.length === 0 && pendingTabId === undefined) {
		return { success: false, error: 'Open a web page before recording.' };
	}

	const captureSettings = await getRecordingSettings();
	if (activeConnection?.relay !== relay) {
		return { success: false, error: 'The browser connection changed. Try again.' };
	}
	recording = {
		id: crypto.randomUUID(),
		startedAt: new Date().toISOString(),
		status: 'recording',
		actions: [],
		captureSettings,
		networkRequests: [],
		screenshots: [],
	};
	pendingRecordingTabIds.clear();
	recordingTabIds.clear();
	activatingRecordingTabIds.clear();
	lastRecordingActionByTab.clear();
	screenshotCaptureQueue = Promise.resolve();
	queuedScreenshotCount = 0;
	screenshotCaptureRecordingId = recording.id;
	if (pendingTabId !== undefined) {
		pendingRecordingTabIds.add(pendingTabId);
		recordingTabIds.add(pendingTabId);
	}
	updateRecordingIndicator(true);
	await Promise.all(
		controlledTabs.map(async ({ chromeTabId }) => await injectRecorder(chromeTabId)),
	);
	await relay.startRecordingCapture(captureSettings.networkRequests);
	broadcastStatusChange();
	broadcastRecordingChange();
	return { success: true };
}

async function stopRecording(): Promise<void> {
	if (!recording || recording.status !== 'recording') return;
	const tabIds = new Set([
		...(activeConnection?.relay.getControlledIds().map(({ chromeTabId }) => chromeTabId) ?? []),
		...recordingTabIds,
	]);
	await Promise.all(
		[...tabIds].map(async (tabId) => {
			try {
				const frames = await chrome.webNavigation.getAllFrames({ tabId });
				await Promise.all(
					(frames ?? []).map(async ({ frameId }) => {
						await chrome.tabs.sendMessage(tabId, { type: 'stopBrowserRecording' }, { frameId });
					}),
				);
			} catch {
				// The tab may have navigated or closed.
			}
		}),
	);
	await screenshotCaptureQueue;
	screenshotCaptureRecordingId = undefined;
	activeConnection?.relay.stopRecordingCapture();
	pendingRecordingTabIds.clear();
	recordingTabIds.clear();
	activatingRecordingTabIds.clear();
	lastRecordingActionByTab.clear();
	if (!recording || recording.status !== 'recording') return;
	recording.status = 'review';
	updateRecordingIndicator(false);
	broadcastRecordingChange();
}

function submitRecording(): { success: boolean; error?: string } {
	if (!recording || recording.status !== 'review' || recording.actions.length === 0) {
		return { success: false, error: 'Record at least one action before sending.' };
	}
	if (!activeConnection) return { success: false, error: 'Reconnect before sending.' };
	recording.status = 'submitting';
	broadcastRecordingChange();
	const recordingData = {
		id: recording.id,
		startedAt: recording.startedAt,
		actions: recording.actions,
		captureSettings: recording.captureSettings,
		networkRequests: recording.networkRequests,
		screenshots: recording.screenshots,
	};
	if (!activeConnection.relay.sendRecording(recordingData)) {
		recording.status = 'review';
		broadcastRecordingChange('The recording could not be sent. Try again.');
		return { success: false, error: 'The recording could not be sent. Try again.' };
	}
	recordingSubmitTimer = setTimeout(() => {
		if (recording?.status !== 'submitting') return;
		recording.status = 'review';
		broadcastRecordingChange('n8n did not confirm the recording. Try again.');
	}, RECORDING_SUBMIT_TIMEOUT_MS);
	return { success: true };
}

/** Stop and submit in one step, for a recording n8n itself asked to start — skips the
 *  manual review screen, since Instance AI reviews the recording in chat instead. */
async function stopAndSubmitRecordingNow(): Promise<{ success: boolean; error?: string }> {
	await stopRecording();
	return submitRecording();
}

async function discardRecording(): Promise<{ success: boolean }> {
	if (recordingSubmitTimer) clearTimeout(recordingSubmitTimer);
	recordingSubmitTimer = undefined;
	screenshotCaptureRecordingId = undefined;
	await stopRecording();
	recording = null;
	broadcastRecordingChange();
	return { success: true };
}

/** Append one action to the active recording, and forward it live to the relay. */
function pushRecordingAction(action: BrowserRecordingAction, chromeTabId: number): void {
	if (!recording) return;
	recording.actions.push(action);
	lastRecordingActionByTab.set(chromeTabId, action.id);
	scheduleScreenshot(action.id, chromeTabId);
	activeConnection?.relay.sendRecordingAction(recording.id, action);
	broadcastRecordingChange();
}

function scheduleScreenshot(actionId: string, chromeTabId: number): void {
	if (!recording?.captureSettings?.screenshots) return;
	if (queuedScreenshotCount >= MAX_RECORDING_SCREENSHOTS) return;
	const recordingId = recording.id;
	const relay = activeConnection?.relay;
	if (!relay) return;
	queuedScreenshotCount++;
	screenshotCaptureQueue = screenshotCaptureQueue.then(async () => {
		if (screenshotCaptureRecordingId !== recordingId) return;
		await new Promise((resolve) => setTimeout(resolve, 250));
		if (
			screenshotCaptureRecordingId !== recordingId ||
			recording?.id !== recordingId ||
			recording.status !== 'recording'
		)
			return;
		const screenshots = recording.screenshots ?? [];
		if (screenshots.length >= MAX_RECORDING_SCREENSHOTS) return;
		const data = await relay.captureScreenshot(chromeTabId);
		if (!data || data.length > MAX_RECORDING_SCREENSHOT_BASE64_BYTES) return;
		const totalBytes = screenshots.reduce((total, screenshot) => total + screenshot.data.length, 0);
		if (totalBytes + data.length > MAX_RECORDING_SCREENSHOTS_BASE64_BYTES) return;
		const screenshot: BrowserRecordingScreenshot = {
			id: crypto.randomUUID(),
			actionId,
			data,
			mimeType: 'image/jpeg',
			timestamp: Date.now() - Date.parse(recording.startedAt),
		};
		screenshots.push(screenshot);
		recording.screenshots = screenshots;
		activeConnection?.relay.sendRecordingScreenshot(recordingId, screenshot);
	});
}

function appendNetworkRequest(request: CapturedNetworkRequest): void {
	if (!recording || recording.status !== 'recording' || !recording.captureSettings?.networkRequests)
		return;
	const actionId = lastRecordingActionByTab.get(request.chromeTabId);
	if (!actionId) return;
	const url = sanitizeUrl(request.url);
	if (!url) return;
	const requests = recording.networkRequests ?? [];
	if (requests.length >= MAX_RECORDING_NETWORK_REQUESTS) return;
	requests.push({
		id: crypto.randomUUID(),
		actionId,
		url,
		method: sanitizeText(request.method.toUpperCase(), 20) ?? 'GET',
		status: Math.max(0, Math.min(999, Math.trunc(request.status))),
		contentType: sanitizeText(request.contentType, 100),
		timestamp: Math.max(0, request.timestamp - Date.parse(recording.startedAt)),
	});
	recording.networkRequests = requests;
}

function appendRecordingAction(
	action: Extract<ExtensionMessage, { type: 'recordingAction' }>['action'],
	sender: chrome.runtime.MessageSender,
): void {
	if (
		!recording ||
		recording.status !== 'recording' ||
		recording.actions.length >= MAX_RECORDING_ACTIONS
	)
		return;
	const tabId = sender.tab?.id;
	if (
		sender.id !== chrome.runtime.id ||
		tabId === undefined ||
		(!activeConnection?.relay.isControlledTab(tabId) && !recordingTabIds.has(tabId))
	) {
		return;
	}
	const target = action.target
		? {
				tag: sanitizeText(action.target.tag, 30) ?? 'element',
				role: sanitizeText(action.target.role, 40),
				label: sanitizeContextText(action.target.label, 160),
				name: sanitizeContextText(action.target.name, 80),
				inputType: sanitizeText(action.target.inputType, 40),
			}
		: undefined;
	const sanitizedLink =
		(action.type === 'copy' || action.type === 'context_menu') && action.value
			? sanitizeUrl(action.value)
			: '';
	const value = sanitizedLink
		? { value: sanitizedLink }
		: action.type === 'context_menu'
			? {}
			: sanitizeValue(action.value, target);
	pushRecordingAction(
		{
			id: crypto.randomUUID(),
			type: action.type,
			timestamp: Math.max(0, action.timestamp - Date.parse(recording.startedAt)),
			url: sanitizeUrl(action.url),
			target,
			...value,
		},
		tabId,
	);
}

function appendNavigation(tabId: number, url: string): void {
	if (
		!recording ||
		recording.status !== 'recording' ||
		recording.actions.length >= MAX_RECORDING_ACTIONS
	)
		return;
	const sanitizedUrl = sanitizeUrl(url);
	if (!sanitizedUrl) return;
	const previous = recording.actions.at(-1);
	if (previous?.type === 'navigation' && previous.url === sanitizedUrl) return;
	pushRecordingAction(
		{
			id: crypto.randomUUID(),
			type: 'navigation',
			timestamp: Date.now() - Date.parse(recording.startedAt),
			url: sanitizedUrl,
		},
		tabId,
	);
}

function appendTabSwitch(tabId: number, url: string, title: string): void {
	if (
		!recording ||
		recording.status !== 'recording' ||
		recording.actions.length >= MAX_RECORDING_ACTIONS
	)
		return;
	const sanitizedUrl = sanitizeUrl(url);
	if (!sanitizedUrl) return;
	const previous = recording.actions.at(-1);
	if (previous?.type === 'tab_switch' && previous.url === sanitizedUrl) return;
	pushRecordingAction(
		{
			id: crypto.randomUUID(),
			type: 'tab_switch',
			timestamp: Date.now() - Date.parse(recording.startedAt),
			url: sanitizedUrl,
			target: {
				tag: 'tab',
				label: sanitizeContextText(title, 160),
			},
		},
		tabId,
	);
}

async function activatePendingRecordingTab(
	tabId: number,
	url: string,
	title = '',
	action: 'navigation' | 'tab_switch' = 'navigation',
): Promise<void> {
	const relay = activeConnection?.relay;
	if (!relay || recording?.status !== 'recording' || !pendingRecordingTabIds.has(tabId)) return;

	pendingRecordingTabIds.delete(tabId);
	activatingRecordingTabIds.add(tabId);
	try {
		await injectRecorder(tabId);
		await relay.addTab(tabId, title, url);
		if (relay !== activeConnection?.relay || recording?.status !== 'recording') return;
		if (action === 'tab_switch') appendTabSwitch(tabId, url, title);
		else appendNavigation(tabId, url);
		broadcastStatusChange();
		updateBadge(relay.getControlledIds().length);
	} catch (error) {
		if (relay === activeConnection?.relay && recording?.status === 'recording') {
			pendingRecordingTabIds.add(tabId);
		}
		log.warn('Failed to activate pending recording tab', error);
	} finally {
		activatingRecordingTabIds.delete(tabId);
	}
}

function broadcastRecordingChange(error?: string): void {
	chrome.runtime
		.sendMessage({ type: 'recordingChanged', recording: getVisibleRecording(), error })
		.catch(() => {});
}

function getVisibleRecording(): BrowserRecording | null {
	if (recording?.status !== 'recording') return recording;
	return { ...recording, screenshots: [] };
}

/** Whether `tabUrl` already points at the same thread as `destination` (same origin +
 *  path, ignoring query/hash) — used to skip a needless reload when the tab about to
 *  receive the recording result is already showing that exact thread. */
function isSameThreadUrl(tabUrl: string | undefined, destination: URL): boolean {
	if (!tabUrl) return false;
	try {
		const current = new URL(tabUrl);
		return current.origin === destination.origin && current.pathname === destination.pathname;
	} catch {
		return false;
	}
}

async function openRecordingThread(threadUrl: string): Promise<void> {
	try {
		const destination = new URL(threadUrl);
		if (
			!isAllowedPageOrigin(destination.origin) ||
			getRelayHostKey(destination.origin) !== getRelayHostKey(activeConnection?.relayUrl)
		) {
			return;
		}
		const tabs = await chrome.tabs.query({});
		const sameHostTabs = tabs.filter((tab) => getRelayHostKey(tab.url) === destination.host);
		const target =
			sameHostTabs.find((tab) => tab.url?.includes('/assistant')) ?? sameHostTabs.at(0);
		if (target?.id === undefined) {
			await chrome.tabs.create({ url: destination.href, active: true });
			return;
		}
		// Already on that exact thread (e.g. the user stopped the recording from the
		// conversation they're still looking at) — just focus it, don't reload it.
		if (isSameThreadUrl(target.url, destination)) {
			await chrome.tabs.update(target.id, { active: true });
		} else {
			await chrome.tabs.update(target.id, { url: destination.href, active: true });
		}
		if (target.windowId !== undefined) {
			await chrome.windows.update(target.windowId, { focused: true });
		}
	} catch (error) {
		log.warn('Failed to open browser recording thread', error);
	}
}

function sanitizeContextText(value: string | undefined, limit: number): string | undefined {
	const sanitized = sanitizeText(value, limit);
	if (!sanitized) return undefined;
	if (
		SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(sanitized)) ||
		/\b[A-Za-z0-9_-]{32,}\b/.test(sanitized)
	) {
		return '[REDACTED]';
	}
	return sanitized;
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
			void handleExternalConnect(message.relayUrl, sender.origin).then(
				sendResponse,
				(error: unknown) => {
					log.warn('external connect failed:', error);
					sendResponse({ accepted: false });
				},
			);
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

async function handleExternalConnect(
	relayUrl: string,
	senderOrigin: string | undefined,
): Promise<ExternalConnectResponse> {
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

	// Approved host asked for by its own instance — connect straight through. Pending is set
	// before the handshake so a `connectResult` arriving mid-flight can attach its callback,
	// and the drawer stays enabled because there is no confirmation page to focus.
	const askedByRelayHost = getRelayHostKey(senderOrigin) === getRelayHostKey(relayUrl);
	if (askedByRelayHost && (await isHostApproved(relayUrl))) {
		log.debug('relay host previously approved, connecting without confirmation:', relayUrl);
		const flow: PendingConnectFlow = { relayUrl, tabId: null, notify: null };
		pendingConnectFlow = flow;
		void connectToRelay(relayUrl, []).then((result) => {
			// A newer request may already own the pending flow; only settle our own.
			if (!result.success && pendingConnectFlow === flow) settleConnectFlow(false);
		});
		return { accepted: true, confirmationRequired: false };
	}

	const existing = await deliverRelayUrl(relayUrl);
	const tabId = existing?.id ?? (await openConnectPopup(relayUrl));
	pendingConnectFlow = { relayUrl, tabId, notify: null };
	setDrawerEnabled(false);
	return { accepted: true, confirmationRequired: true };
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
	if (recording?.status === 'recording') {
		recordingTabIds.add(tab.id);
		pendingRecordingTabIds.add(tab.id);
		const url = tab.pendingUrl ?? tab.url;
		if (url && isRecordableUrl(url)) {
			void activatePendingRecordingTab(tab.id, url, tab.title ?? '');
		}
		return;
	}

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
				if (recording?.status === 'recording') void injectRecorder(tab.id!);
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
	if (recording?.status === 'recording' && recordingTabIds.has(details.tabId)) {
		relay.markAsAgentCreated(details.tabId);
		if (isRecordableUrl(details.url)) {
			void activatePendingRecordingTab(details.tabId, details.url);
		}
		return;
	}
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
				if (recording?.status === 'recording') void injectRecorder(details.tabId);
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

chrome.webNavigation.onCommitted.addListener((details) => {
	if (
		details.frameId === 0 &&
		pendingRecordingTabIds.has(details.tabId) &&
		isRecordableUrl(details.url)
	) {
		void activatePendingRecordingTab(details.tabId, details.url);
		return;
	}
	if (recording?.status === 'recording' && activeConnection?.relay.isControlledTab(details.tabId)) {
		if (details.frameId === 0) appendNavigation(details.tabId, details.url);
		void injectRecorder(details.tabId, details.frameId);
	}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	if (!activeConnection) return;
	if (changeInfo.url && pendingRecordingTabIds.has(tabId) && isRecordableUrl(changeInfo.url)) {
		void activatePendingRecordingTab(tabId, changeInfo.url, changeInfo.title ?? '');
		return;
	}
	if (recording?.status === 'recording' && activeConnection.relay.isControlledTab(tabId)) {
		if (changeInfo.url) appendNavigation(tabId, changeInfo.url);
		if (changeInfo.status === 'complete') void injectRecorder(tabId);
	}

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

chrome.tabs.onActivated.addListener(({ tabId }) => {
	if (recording?.status !== 'recording' || !activeConnection) return;
	const relay = activeConnection.relay;
	void chrome.tabs
		.get(tabId)
		.then((tab) => {
			if (recording?.status !== 'recording' || relay !== activeConnection?.relay) return;
			const url = tab.url ?? tab.pendingUrl;
			if (!url) return;
			if (
				recordingTabIds.has(tabId) &&
				(pendingRecordingTabIds.has(tabId) || activatingRecordingTabIds.has(tabId))
			) {
				return;
			}
			if (relay.isControlledTab(tabId)) {
				appendTabSwitch(tabId, url, tab.title ?? '');
				return;
			}
			if (isBlankTabUrl(url)) {
				recordingTabIds.add(tabId);
				pendingRecordingTabIds.add(tabId);
				return;
			}
			if (!isRecordableUrl(url)) return;
			recordingTabIds.add(tabId);
			pendingRecordingTabIds.add(tabId);
			void activatePendingRecordingTab(tabId, url, tab.title ?? '', 'tab_switch');
		})
		.catch(() => {});
});

chrome.tabs.onRemoved.addListener((tabId) => {
	pendingRecordingTabIds.delete(tabId);
	recordingTabIds.delete(tabId);
	activatingRecordingTabIds.delete(tabId);
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

	// Clean up existing connection, then claim a generation — `disconnect` advances it, so
	// taking ours first would make this attempt invalidate itself.
	disconnect();
	const generation = ++connectGeneration;

	try {
		const ws = new WebSocket(buildRelayWsUrl(relayUrl, chrome.runtime.getManifest().version));

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

		if (generation !== connectGeneration) {
			log.debug('discarding superseded relay connection:', relayUrl);
			relay.close('superseded');
			return { success: false, error: 'Superseded by a newer connection request.' };
		}

		activeConnection = { relay, relayUrl };

		relay.onclose = () => {
			log.debug('relay connection closed');
			// A superseded relay closing must not clear the session that replaced it.
			if (activeConnection?.relay !== relay) return;
			activeConnection = null;
			updateBadge(0);
			broadcastStatusChange();
		};

		relay.ontabcreated = () => {
			if (activeConnection?.relay !== relay) return;
			broadcastStatusChange();
			updateBadge(relay.getControlledIds().length);
		};

		relay.onstartrecording = async () => {
			if (activeConnection?.relay !== relay)
				return { success: false, error: 'Connection was replaced.' };
			return await startRecording();
		};

		relay.onstopandsubmitrecording = async () => {
			if (activeConnection?.relay !== relay)
				return { success: false, error: 'Connection was replaced.' };
			return await stopAndSubmitRecordingNow();
		};

		relay.ondiscardrecording = async () => {
			if (activeConnection?.relay !== relay)
				return { success: false, error: 'Connection was replaced.' };
			return await discardRecording();
		};

		relay.onnetworkrequest = (request) => {
			if (activeConnection?.relay !== relay) return;
			appendNetworkRequest(request);
		};

		relay.onrecordingresult = (recordingId, accepted, threadUrl) => {
			if (recording?.id !== recordingId || recording.status !== 'submitting') return;
			if (recordingSubmitTimer) clearTimeout(recordingSubmitTimer);
			recordingSubmitTimer = undefined;
			recording.status = accepted ? 'submitted' : 'review';
			if (accepted && threadUrl) void openRecordingThread(threadUrl);
			broadcastRecordingChange(
				accepted ? undefined : 'The recording could not be processed. Try again.',
			);
		};

		const tabCount = relay.getControlledIds().length;
		log.debug('connected, controlling', tabCount, 'tabs');
		updateBadge(tabCount);
		broadcastStatusChange();
		// Only our own flow: a newer request may already own the pending one, and settling it
		// here would fail a page whose confirmation is still on screen.
		if (pendingConnectFlow?.relayUrl === relayUrl) settleConnectFlow(true);
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
	// Outside the guard below: a handshake that has not committed yet leaves
	// `activeConnection` null, and it must still be invalidated by a teardown.
	connectGeneration++;
	if (activeConnection) {
		log.debug('disconnecting');
		activeConnection.relay.close('extension_disconnected');
		activeConnection = null;
		updateBadge(0);
	}
	void discardRecording();
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

export function updateBadge(tabCount: number): void {
	// The recording indicator takes precedence — don't let a tab-count refresh overwrite it.
	if (recordingIndicatorActive) return;
	// A prompt-free connect shows no UI at all, so mark the icon even before any tab attaches.
	const text = tabCount > 0 ? String(tabCount) : activeConnection ? '•' : '';
	void chrome.action.setBadgeText({ text });
	void chrome.action.setBadgeBackgroundColor({ color: tabCount > 0 ? '#4CAF50' : '#999' });
}
