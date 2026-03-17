/**
 * Manages the WebSocket connection from the Chrome extension to the CDP relay server.
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

export class RelayConnection {
	private debuggee: chrome.debugger.Debuggee = {};
	private readonly ws: WebSocket;
	private readonly eventListener: (
		source: chrome.debugger.Debuggee,
		method: string,
		params?: object,
	) => void;
	private readonly detachListener: (source: chrome.debugger.Debuggee, reason: string) => void;
	private tabPromiseResolve!: () => void;
	private readonly tabPromise: Promise<void>;
	private closed = false;

	onclose?: () => void;

	constructor(ws: WebSocket) {
		this.tabPromise = new Promise((resolve) => {
			this.tabPromiseResolve = resolve;
		});

		this.ws = ws;
		this.ws.onmessage = (event) => this.onMessage(event);
		this.ws.onclose = () => this.handleClose();

		this.eventListener = this.onDebuggerEvent.bind(this);
		this.detachListener = this.onDebuggerDetach.bind(this);
		chrome.debugger.onEvent.addListener(this.eventListener);
		chrome.debugger.onDetach.addListener(this.detachListener);
	}

	setTabId(tabId: number): void {
		this.debuggee = { tabId };
		this.tabPromiseResolve();
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
		chrome.debugger.detach(this.debuggee).catch(() => {});
		this.onclose?.();
	}

	private onDebuggerEvent(source: chrome.debugger.Debuggee, method: string, params?: object): void {
		if (source.tabId !== this.debuggee.tabId) return;

		this.sendMessage({
			method: 'forwardCDPEvent',
			params: {
				method,
				params,
			},
		});
	}

	private onDebuggerDetach(source: chrome.debugger.Debuggee, reason: string): void {
		if (source.tabId !== this.debuggee.tabId) return;
		this.close(`Debugger detached: ${reason}`);
		this.debuggee = {};
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
		if (message.method === 'attachToTab') {
			await this.tabPromise;
			await chrome.debugger.attach(this.debuggee, '1.3');
			const result = (await chrome.debugger.sendCommand(this.debuggee, 'Target.getTargetInfo')) as {
				targetInfo?: unknown;
			};
			return { targetInfo: result?.targetInfo };
		}

		if (!this.debuggee.tabId) {
			throw new Error(
				'No tab is connected. Go to the n8n Browser Bridge extension and select a tab.',
			);
		}

		if (message.method === 'forwardCDPCommand') {
			const { method, params } = message.params ?? {};
			return await chrome.debugger.sendCommand(
				this.debuggee,
				method as string,
				params as object | undefined,
			);
		}

		return undefined;
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
