/**
 * Manages the WebSocket connection from the Chrome extension to the CDP relay server.
 * Auto-attaches debugger to all eligible browser tabs and tracks tab lifecycle.
 * Forwards CDP commands via chrome.debugger and relays CDP events back.
 */

interface ProtocolCommand {
	id: number;
	method: string;
	params?: Record<string, unknown>;
}

interface ProtocolResponse {
	id?: number;
	method?: string;
	params?: Record<string, unknown>;
	result?: unknown;
	error?: string;
}

export interface TabManagementSettings {
	allowTabCreation: boolean;
	allowTabClosing: boolean;
}

const DEFAULT_SETTINGS: TabManagementSettings = {
	allowTabCreation: true,
	allowTabClosing: false,
};

/** URL prefixes to exclude from auto-attach */
const EXCLUDED_PREFIXES = ['chrome://', 'chrome-extension://', 'about:'];

function isEligibleTab(tab: chrome.tabs.Tab): boolean {
	return (
		tab.id !== undefined &&
		tab.url !== undefined &&
		!EXCLUDED_PREFIXES.some((prefix) => tab.url!.startsWith(prefix))
	);
}

export class RelayConnection {
	/** Map of tabId → debuggee for all controlled tabs */
	private readonly debuggees = new Map<number, chrome.debugger.Debuggee>();
	/** The first tab ID, used as default target for commands without explicit tabId */
	private primaryTabId: number | undefined;
	private readonly ws: WebSocket;
	private readonly eventListener: (
		source: chrome.debugger.Debuggee,
		method: string,
		params?: object,
	) => void;
	private readonly detachListener: (source: chrome.debugger.Debuggee, reason: string) => void;
	private closed = false;
	private settings: TabManagementSettings = DEFAULT_SETTINGS;

	onclose?: () => void;

	constructor(ws: WebSocket) {
		this.ws = ws;
		this.ws.onmessage = (event) => this.onMessage(event);
		this.ws.onclose = () => this.handleClose();

		this.eventListener = this.onDebuggerEvent.bind(this);
		this.detachListener = this.onDebuggerDetach.bind(this);
		chrome.debugger.onEvent.addListener(this.eventListener);
		chrome.debugger.onDetach.addListener(this.detachListener);
	}

	/** Auto-discover and register all eligible tabs. */
	async discoverAndAttachTabs(): Promise<void> {
		const tabs = await chrome.tabs.query({});
		const eligible = tabs.filter(isEligibleTab);
		for (const tab of eligible) {
			this.debuggees.set(tab.id!, { tabId: tab.id! });
		}
		if (eligible.length > 0) {
			this.primaryTabId = eligible[0].id!;
		}
	}

	/** Add a newly opened tab and notify the relay. */
	addTab(tabId: number, title: string, url: string): void {
		if (this.debuggees.has(tabId)) return;
		this.debuggees.set(tabId, { tabId });
		if (!this.primaryTabId) {
			this.primaryTabId = tabId;
		}
		// Notify relay about the new tab
		this.sendMessage({
			method: 'tabOpened',
			params: { tabId, title, url },
		});
	}

	/** Remove a closed tab and notify the relay. */
	removeTab(tabId: number): void {
		if (!this.debuggees.has(tabId)) return;

		// Detach debugger if attached
		chrome.debugger.detach({ tabId }).catch(() => {});
		this.debuggees.delete(tabId);

		// Update primary tab
		if (tabId === this.primaryTabId) {
			const remaining = [...this.debuggees.keys()];
			this.primaryTabId = remaining.length > 0 ? remaining[0] : undefined;
		}

		// Notify relay
		this.sendMessage({
			method: 'tabClosed',
			params: { tabId },
		});

		// If no tabs left, close the connection
		if (this.debuggees.size === 0) {
			this.close('All tabs closed');
		}
	}

	setSettings(settings: TabManagementSettings): void {
		this.settings = settings;
	}

	getControlledTabIds(): number[] {
		return [...this.debuggees.keys()];
	}

	close(message: string): void {
		this.ws.close(1000, message);
		this.handleClose();
	}

	private handleClose(): void {
		if (this.closed) return;
		this.closed = true;

		chrome.debugger.onEvent.removeListener(this.eventListener);
		chrome.debugger.onDetach.removeListener(this.detachListener);
		for (const debuggee of this.debuggees.values()) {
			chrome.debugger.detach(debuggee).catch(() => {});
		}
		this.debuggees.clear();
		this.onclose?.();
	}

	private onDebuggerEvent(source: chrome.debugger.Debuggee, method: string, params?: object): void {
		if (!source.tabId || !this.debuggees.has(source.tabId)) return;

		this.sendMessage({
			method: 'forwardCDPEvent',
			params: {
				method,
				params,
				tabId: source.tabId,
			},
		});
	}

	private onDebuggerDetach(source: chrome.debugger.Debuggee, reason: string): void {
		if (!source.tabId || !this.debuggees.has(source.tabId)) return;

		this.debuggees.delete(source.tabId);

		// Update primary tab if the detached tab was primary
		if (source.tabId === this.primaryTabId) {
			const remaining = [...this.debuggees.keys()];
			this.primaryTabId = remaining.length > 0 ? remaining[0] : undefined;
		}

		// If no tabs left, close the connection
		if (this.debuggees.size === 0) {
			this.close(`Debugger detached: ${reason}`);
		}
	}

	private onMessage(event: MessageEvent): void {
		void this.onMessageAsync(event).catch((e) =>
			console.error('[n8n Extension] Error handling message:', e),
		);
	}

	private async onMessageAsync(event: MessageEvent): Promise<void> {
		let message: ProtocolCommand;
		try {
			message = JSON.parse(event.data as string) as ProtocolCommand;
		} catch {
			this.sendError(-32700, 'Error parsing message');
			return;
		}

		const response: ProtocolResponse = { id: message.id };
		try {
			response.result = await this.handleCommand(message);
		} catch (error) {
			response.error = error instanceof Error ? error.message : String(error);
		}
		this.sendMessage(response);
	}

	private async handleCommand(message: ProtocolCommand): Promise<unknown> {
		switch (message.method) {
			case 'attachToAllTabs':
				return await this.handleAttachToAllTabs();
			case 'forwardCDPCommand':
				return await this.handleForwardCDPCommand(message.params ?? {});
			case 'createTab':
				return await this.handleCreateTab(message.params ?? {});
			case 'closeTab':
				return await this.handleCloseTab(message.params ?? {});
			case 'listTabs':
				return await this.handleListTabs();
			default:
				return undefined;
		}
	}

	private async handleAttachToAllTabs(): Promise<unknown> {
		// Attach debugger to all controlled tabs
		for (const debuggee of this.debuggees.values()) {
			try {
				await chrome.debugger.attach(debuggee, '1.3');
			} catch {
				// Tab may have been closed or debugger already attached
			}
		}

		// Return first tab's target info for relay compat
		if (this.primaryTabId) {
			const primaryDebuggee = this.debuggees.get(this.primaryTabId)!;
			try {
				const result = (await chrome.debugger.sendCommand(
					primaryDebuggee,
					'Target.getTargetInfo',
				)) as {
					targetInfo?: unknown;
				};
				return { targetInfo: result?.targetInfo };
			} catch {
				return { targetInfo: undefined };
			}
		}

		return { targetInfo: undefined };
	}

	private async handleForwardCDPCommand(params: Record<string, unknown>): Promise<unknown> {
		const { method, params: cmdParams, tabId } = params;
		const targetTabId = (tabId as number) ?? this.primaryTabId;

		if (!targetTabId || !this.debuggees.has(targetTabId)) {
			throw new Error('No tab is connected.');
		}

		const debuggee = this.debuggees.get(targetTabId)!;
		return await chrome.debugger.sendCommand(
			debuggee,
			method as string,
			cmdParams as object | undefined,
		);
	}

	private async handleCreateTab(params: Record<string, unknown>): Promise<unknown> {
		if (!this.settings.allowTabCreation) {
			throw new Error(
				'Tab creation is disabled. Enable it in the n8n Browser Bridge extension settings.',
			);
		}

		const url = (params.url as string) ?? undefined;
		const tab = await chrome.tabs.create({ url, active: false });

		if (!tab.id) throw new Error('Failed to create tab');

		// Attach debugger to the new tab
		const debuggee: chrome.debugger.Debuggee = { tabId: tab.id };
		this.debuggees.set(tab.id, debuggee);
		await chrome.debugger.attach(debuggee, '1.3');

		const result = (await chrome.debugger.sendCommand(debuggee, 'Target.getTargetInfo')) as {
			targetInfo?: unknown;
		};

		return {
			tabId: tab.id,
			title: tab.title ?? '',
			url: tab.url ?? url ?? '',
			targetInfo: result?.targetInfo,
		};
	}

	private async handleCloseTab(params: Record<string, unknown>): Promise<unknown> {
		if (!this.settings.allowTabClosing) {
			throw new Error(
				'Tab closing is disabled. Enable it in the n8n Browser Bridge extension settings.',
			);
		}

		const tabId = params.tabId as number;
		if (!tabId) throw new Error('tabId is required');

		// Detach debugger if attached
		if (this.debuggees.has(tabId)) {
			await chrome.debugger.detach({ tabId }).catch(() => {});
			this.debuggees.delete(tabId);
		}

		// Close the tab
		await chrome.tabs.remove(tabId);

		// Update primary tab
		if (tabId === this.primaryTabId) {
			const remaining = [...this.debuggees.keys()];
			this.primaryTabId = remaining.length > 0 ? remaining[0] : undefined;
		}

		return { closed: true, tabId };
	}

	private async handleListTabs(): Promise<unknown> {
		const tabIds = [...this.debuggees.keys()];
		const tabs = await Promise.all(
			tabIds.map(async (tabId) => {
				try {
					const tab = await chrome.tabs.get(tabId);
					return { tabId, title: tab.title ?? '', url: tab.url ?? '' };
				} catch {
					return { tabId, title: '', url: '' };
				}
			}),
		);
		return { tabs };
	}

	private sendError(code: number, message: string): void {
		this.sendMessage({ error: JSON.stringify({ code, message }) });
	}

	private sendMessage(message: ProtocolResponse): void {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		}
	}
}
