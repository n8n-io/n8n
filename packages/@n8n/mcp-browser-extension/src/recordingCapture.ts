import { createLogger } from './logger';
import type { CapturedNetworkRequest } from './relayConnection';

const log = createLogger('recording-capture');
const SCREENSHOT_TIMEOUT_MS = 5_000;
const MAX_PENDING_NETWORK_REQUESTS = 1_000;

interface PendingNetworkRequest {
	url: string;
	method: string;
	timestamp: number;
}

interface RequestWillBeSentEvent {
	requestId?: string;
	request?: { url?: string; method?: string };
}

interface ResponseReceivedEvent {
	requestId?: string;
	response?: { url?: string; status?: number; mimeType?: string };
}

export class StandaloneRecordingCapture {
	private readonly tabIds = new Set<number>();

	private readonly attachedTabIds = new Set<number>();

	private readonly pendingNetworkRequests = new Map<string, PendingNetworkRequest>();

	private readonly eventListener: (
		source: chrome.debugger.Debuggee,
		method: string,
		params?: object,
	) => void;

	constructor(
		private readonly captureNetworkRequests: boolean,
		private readonly onNetworkRequest: (request: CapturedNetworkRequest) => void,
	) {
		this.eventListener = this.onDebuggerEvent.bind(this);
		chrome.debugger.onEvent.addListener(this.eventListener);
	}

	async addTab(tabId: number): Promise<void> {
		this.tabIds.add(tabId);
		if (this.captureNetworkRequests) await this.enableNetworkCapture(tabId);
	}

	removeTab(tabId: number): void {
		this.tabIds.delete(tabId);
		if (this.attachedTabIds.delete(tabId)) {
			void chrome.debugger.detach({ tabId }).catch(() => {});
		}
	}

	async captureScreenshot(tabId: number): Promise<string | undefined> {
		if (!this.tabIds.has(tabId)) return undefined;
		try {
			await this.attach(tabId);
			const result: unknown = await Promise.race([
				chrome.debugger.sendCommand({ tabId }, 'Page.captureScreenshot', {
					format: 'jpeg',
					quality: 60,
					captureBeyondViewport: false,
					optimizeForSpeed: true,
				}),
				new Promise<never>((_resolve, reject) => {
					setTimeout(() => reject(new Error('Screenshot timed out')), SCREENSHOT_TIMEOUT_MS);
				}),
			]);
			if (!result || typeof result !== 'object' || !('data' in result)) return undefined;
			return typeof result.data === 'string' ? result.data : undefined;
		} catch (error) {
			log.warn(`Failed to capture screenshot for tab ${tabId}`, error);
			return undefined;
		}
	}

	async stop(): Promise<void> {
		chrome.debugger.onEvent.removeListener(this.eventListener);
		this.pendingNetworkRequests.clear();
		await Promise.all(
			[...this.attachedTabIds].map(async (tabId) => {
				await chrome.debugger.detach({ tabId }).catch(() => {});
			}),
		);
		this.attachedTabIds.clear();
		this.tabIds.clear();
	}

	private async attach(tabId: number): Promise<void> {
		if (this.attachedTabIds.has(tabId)) return;
		await chrome.debugger.attach({ tabId }, '1.3');
		this.attachedTabIds.add(tabId);
	}

	private async enableNetworkCapture(tabId: number): Promise<void> {
		try {
			await this.attach(tabId);
			await chrome.debugger.sendCommand({ tabId }, 'Network.enable');
		} catch (error) {
			log.warn(`Failed to enable network capture for tab ${tabId}`, error);
		}
	}

	private onDebuggerEvent(source: chrome.debugger.Debuggee, method: string, params?: object): void {
		const tabId = source.tabId;
		if (!tabId || !this.tabIds.has(tabId) || !this.captureNetworkRequests) return;

		if (method === 'Network.requestWillBeSent') {
			const event: RequestWillBeSentEvent | undefined = params;
			if (
				typeof event?.requestId !== 'string' ||
				typeof event.request?.url !== 'string' ||
				typeof event.request.method !== 'string'
			) {
				return;
			}
			this.pendingNetworkRequests.set(`${tabId}:${event.requestId}`, {
				url: event.request.url,
				method: event.request.method,
				timestamp: Date.now(),
			});
			if (this.pendingNetworkRequests.size > MAX_PENDING_NETWORK_REQUESTS) {
				const oldestKey = this.pendingNetworkRequests.keys().next().value;
				if (typeof oldestKey === 'string') this.pendingNetworkRequests.delete(oldestKey);
			}
			return;
		}

		if (method !== 'Network.responseReceived') return;
		const event: ResponseReceivedEvent | undefined = params;
		if (typeof event?.requestId !== 'string' || typeof event.response?.status !== 'number') return;
		const key = `${tabId}:${event.requestId}`;
		const request = this.pendingNetworkRequests.get(key);
		this.pendingNetworkRequests.delete(key);
		if (!request) return;
		this.onNetworkRequest({
			chromeTabId: tabId,
			url: typeof event.response.url === 'string' ? event.response.url : request.url,
			method: request.method,
			status: event.response.status,
			contentType:
				typeof event.response.mimeType === 'string' ? event.response.mimeType : undefined,
			timestamp: request.timestamp,
		});
	}
}
