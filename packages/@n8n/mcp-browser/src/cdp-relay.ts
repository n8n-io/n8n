/**
 * WebSocket server that bridges Playwright MCP and the Chrome extension.
 *
 * Endpoints:
 *   /cdp/{uuid}       — Full CDP interface for Playwright (connectOverCDP)
 *   /extension/{uuid}  — Chrome extension connection for chrome.debugger forwarding
 *
 * Controls all browser tabs by default. Each tab gets a unique CDP session ID
 * for Playwright to address individually. Tab lifecycle events (tabOpened/tabClosed)
 * from the extension enable dynamic tab tracking.
 *
 * Architecture modeled after Playwright MCP's CDPRelayServer.
 */

import { randomUUID } from 'node:crypto';
import http from 'node:http';
import type net from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';

import type {
	CDPCommand,
	CDPResponse,
	ExtensionCommands,
	ExtensionEvents,
	ExtensionResponse,
} from './cdp-relay-protocol';

// ---------------------------------------------------------------------------
// CDPRelayServer
// ---------------------------------------------------------------------------

export interface CDPRelayServerOptions {
	/** Timeout in ms waiting for extension to connect. Default 30_000 */
	connectionTimeoutMs?: number;
}

interface ConnectedTab {
	tabId: number;
	targetInfo: unknown;
	sessionId: string;
}

export class CDPRelayServer {
	private readonly httpServer: http.Server;
	private readonly wss: WebSocketServer;
	private readonly cdpPath: string;
	private readonly extensionPath: string;

	private playwrightWs: WebSocket | null = null;
	private extensionConn: ExtensionConnection | null = null;

	/** Maps sessionId → tab info. Primary tab is the first one attached. */
	private readonly connectedTabs = new Map<string, ConnectedTab>();
	/** Reverse lookup: tabId → sessionId */
	private readonly tabIdToSessionId = new Map<number, string>();
	/** The primary tab's sessionId (first attached, used as default). */
	private primarySessionId: string | undefined;
	private nextSessionId = 1;

	private extensionConnectedResolve?: () => void;
	private extensionConnectedReject?: (error: Error) => void;
	private extensionConnectedPromise: Promise<void>;

	private readonly connectionTimeoutMs: number;

	constructor(options?: CDPRelayServerOptions) {
		this.connectionTimeoutMs = options?.connectionTimeoutMs ?? 30_000;

		const uuid = randomUUID();
		this.cdpPath = `/cdp/${uuid}`;
		this.extensionPath = `/extension/${uuid}`;

		this.extensionConnectedPromise = new Promise((resolve, reject) => {
			this.extensionConnectedResolve = resolve;
			this.extensionConnectedReject = reject;
		});
		// Prevent unhandled rejection if we never await it
		this.extensionConnectedPromise.catch(() => {});

		this.httpServer = http.createServer((_req, res) => {
			res.writeHead(404);
			res.end();
		});

		this.wss = new WebSocketServer({ server: this.httpServer });
		this.wss.on('connection', (ws, req) => this.onConnection(ws, req));
	}

	/** Start listening on a random available port. Returns the bound port. */
	async listen(): Promise<number> {
		return await new Promise((resolve, reject) => {
			this.httpServer.listen(0, '127.0.0.1', () => {
				const addr = this.httpServer.address() as net.AddressInfo;
				resolve(addr.port);
			});
			this.httpServer.on('error', reject);
		});
	}

	/** The WebSocket URL Playwright should connectOverCDP to. */
	cdpEndpoint(port: number): string {
		return `ws://127.0.0.1:${port}${this.cdpPath}`;
	}

	/** The WebSocket URL the extension should connect to. */
	extensionEndpoint(port: number): string {
		return `ws://127.0.0.1:${port}${this.extensionPath}`;
	}

	/** Wait for the extension to connect. Rejects after timeout. */
	async waitForExtension(): Promise<void> {
		if (this.extensionConn) return;

		const timer = setTimeout(() => {
			this.extensionConnectedReject?.(
				new Error(
					`Extension connection timed out after ${this.connectionTimeoutMs}ms. ` +
						'The n8n Browser Bridge extension must be installed in Chrome. ' +
						'To set up: (1) Open chrome://extensions, (2) Enable Developer mode, ' +
						'(3) Click "Load unpacked" and select the mcp-browser-extension directory. ' +
						'Then retry browser_connect.',
				),
			);
		}, this.connectionTimeoutMs);

		try {
			await this.extensionConnectedPromise;
		} finally {
			clearTimeout(timer);
		}
	}

	/** Shut down the relay, closing all connections. */
	stop(): void {
		this.closePlaywrightConnection('Server stopped');
		this.closeExtensionConnection('Server stopped');
		this.wss.close();
		this.httpServer.close();
	}

	// =========================================================================
	// WebSocket routing
	// =========================================================================

	private onConnection(ws: WebSocket, req: http.IncomingMessage): void {
		const url = new URL(`http://localhost${req.url ?? '/'}`);

		if (url.pathname === this.cdpPath) {
			this.handlePlaywrightConnection(ws);
		} else if (url.pathname === this.extensionPath) {
			this.handleExtensionConnection(ws);
		} else {
			ws.close(4004, 'Invalid path');
		}
	}

	// =========================================================================
	// Playwright (CDP client) side
	// =========================================================================

	private handlePlaywrightConnection(ws: WebSocket): void {
		if (this.playwrightWs) {
			ws.close(1000, 'Another CDP client already connected');
			return;
		}

		this.playwrightWs = ws;

		ws.on('message', (data) => {
			try {
				const raw = Buffer.isBuffer(data)
					? data.toString('utf8')
					: Buffer.from(data as ArrayBuffer).toString('utf8');
				const message = JSON.parse(raw) as CDPCommand;
				void this.handlePlaywrightMessage(message);
			} catch {
				// Malformed JSON — ignore
			}
		});

		ws.on('close', () => {
			if (this.playwrightWs !== ws) return;
			this.playwrightWs = null;
			this.closeExtensionConnection('Playwright client disconnected');
		});
	}

	private async handlePlaywrightMessage(message: CDPCommand): Promise<void> {
		const { id, sessionId, method, params } = message;
		try {
			const result = await this.handleCDPCommand(method, params, sessionId);
			this.sendToPlaywright({ id, sessionId, result });
		} catch (e) {
			this.sendToPlaywright({
				id,
				sessionId,
				error: { message: e instanceof Error ? e.message : String(e) },
			});
		}
	}

	private async handleCDPCommand(
		method: string,
		params: unknown,
		sessionId: string | undefined,
	): Promise<unknown> {
		switch (method) {
			case 'Browser.getVersion':
				return {
					protocolVersion: '1.3',
					product: 'Chrome/Extension-Bridge',
					userAgent: 'n8n-CDP-Bridge/1.0.0',
				};

			case 'Browser.setDownloadBehavior':
				return {};

			case 'Target.setAutoAttach': {
				// Child session auto-attach: ack without forwarding
				// (chrome.debugger doesn't support Target.setAutoAttach)
				if (sessionId) return {};

				// Attach all eligible tabs via the extension
				const { targetInfo } = (await this.extensionConn!.send('attachToAllTabs', {})) as {
					targetInfo: unknown;
				};

				// Register the primary tab (first one returned by extension)
				const primarySession = `pw-tab-${this.nextSessionId++}`;
				this.primarySessionId = primarySession;

				// We don't know individual tab IDs at this point — the extension
				// attached all tabs and returned the primary's targetInfo.
				// For now, register this as the primary tab entry.
				const primaryTab: ConnectedTab = {
					tabId: 0, // unknown until extension sends tabId in events
					targetInfo,
					sessionId: primarySession,
				};
				this.connectedTabs.set(primarySession, primaryTab);

				// Send synthetic attachedToTarget event to Playwright
				this.sendToPlaywright({
					method: 'Target.attachedToTarget',
					params: {
						sessionId: primarySession,
						targetInfo: {
							...(targetInfo as Record<string, unknown>),
							attached: true,
						},
						waitingForDebugger: false,
					},
				});
				return {};
			}

			case 'Target.createTarget': {
				// Playwright calls this for context.newPage(). Route to the extension's
				// createTab command since chrome.debugger can't create targets directly.
				const createParams = (params ?? {}) as Record<string, unknown>;
				const url = (createParams.url as string) ?? undefined;
				const tab = await this.createTab(url);
				return { targetId: tab.sessionId };
			}

			case 'Target.closeTarget': {
				// Playwright calls this for page.close(). Route to extension's closeTab.
				const closeParams = (params ?? {}) as Record<string, unknown>;
				const targetId = closeParams.targetId as string;
				if (targetId && this.connectedTabs.has(targetId)) {
					const tab = this.connectedTabs.get(targetId)!;
					if (tab.tabId) {
						await this.closeTab(tab.tabId);
					}
				}
				return { success: true };
			}

			case 'Target.getTargetInfo': {
				if (sessionId && this.connectedTabs.has(sessionId)) {
					return this.connectedTabs.get(sessionId)!.targetInfo;
				}
				// Fall back to primary tab
				if (this.primarySessionId && this.connectedTabs.has(this.primarySessionId)) {
					return this.connectedTabs.get(this.primarySessionId)!.targetInfo;
				}
				return undefined;
			}
		}

		// Default: forward to extension
		return await this.forwardToExtension(method, params, sessionId);
	}

	private async forwardToExtension(
		method: string,
		params: unknown,
		sessionId: string | undefined,
	): Promise<unknown> {
		if (!this.extensionConn) throw new Error('Extension not connected');

		// Resolve sessionId to tabId for multi-tab routing
		let tabId: number | undefined;
		if (sessionId && this.connectedTabs.has(sessionId)) {
			const tab = this.connectedTabs.get(sessionId)!;
			tabId = tab.tabId !== 0 ? tab.tabId : undefined;
		}

		// Top-level sessionId is only between relay and Playwright — strip it
		if (sessionId && this.connectedTabs.has(sessionId)) {
			sessionId = undefined;
		}

		return await this.extensionConn.send('forwardCDPCommand', {
			sessionId,
			method,
			params,
			tabId,
		});
	}

	// =========================================================================
	// Tab management — forwarded to extension
	// =========================================================================

	/** Create a new tab via the extension and register it with Playwright. */
	async createTab(url?: string): Promise<ConnectedTab> {
		if (!this.extensionConn) throw new Error('Extension not connected');

		const result = (await this.extensionConn.send('createTab', { url })) as {
			tabId: number;
			title: string;
			url: string;
			targetInfo: unknown;
		};

		const sessionId = `pw-tab-${this.nextSessionId++}`;
		const tab: ConnectedTab = {
			tabId: result.tabId,
			targetInfo: result.targetInfo,
			sessionId,
		};

		this.connectedTabs.set(sessionId, tab);
		this.tabIdToSessionId.set(result.tabId, sessionId);

		// Notify Playwright about the new target
		this.sendToPlaywright({
			method: 'Target.attachedToTarget',
			params: {
				sessionId,
				targetInfo: {
					...(result.targetInfo as Record<string, unknown>),
					attached: true,
				},
				waitingForDebugger: false,
			},
		});

		return tab;
	}

	/** Close a tab via the extension and deregister it from Playwright. */
	async closeTab(tabId: number): Promise<void> {
		if (!this.extensionConn) throw new Error('Extension not connected');

		await this.extensionConn.send('closeTab', { tabId });

		const sessionId = this.tabIdToSessionId.get(tabId);
		if (sessionId) {
			this.connectedTabs.delete(sessionId);
			this.tabIdToSessionId.delete(tabId);

			// Update primary if needed
			if (sessionId === this.primarySessionId) {
				const remaining = [...this.connectedTabs.keys()];
				this.primarySessionId = remaining.length > 0 ? remaining[0] : undefined;
			}

			// Notify Playwright about the detached target
			this.sendToPlaywright({
				method: 'Target.detachedFromTarget',
				params: { sessionId },
			});
		}
	}

	/** List controlled tabs via the extension. */
	async listTabs(): Promise<Array<{ tabId: number; title: string; url: string }>> {
		if (!this.extensionConn) throw new Error('Extension not connected');

		const result = (await this.extensionConn.send('listTabs', {})) as {
			tabs: Array<{ tabId: number; title: string; url: string }>;
		};
		return result.tabs;
	}

	/** Handle a tab that was opened in the browser and auto-attached by the extension. */
	private handleTabOpened(tabId: number, title: string, url: string): void {
		// Skip if we already track this tab
		if (this.tabIdToSessionId.has(tabId)) return;

		const sessionId = `pw-tab-${this.nextSessionId++}`;
		const targetInfo = {
			targetId: sessionId,
			type: 'page',
			title,
			url,
			attached: true,
		};

		const tab: ConnectedTab = { tabId, targetInfo, sessionId };
		this.connectedTabs.set(sessionId, tab);
		this.tabIdToSessionId.set(tabId, sessionId);

		this.primarySessionId ??= sessionId;

		// Notify Playwright about the new target
		this.sendToPlaywright({
			method: 'Target.attachedToTarget',
			params: { sessionId, targetInfo, waitingForDebugger: false },
		});
	}

	/** Handle a tab that was closed in the browser. */
	private handleTabClosed(tabId: number): void {
		const sessionId = this.tabIdToSessionId.get(tabId);
		if (!sessionId) return;

		this.connectedTabs.delete(sessionId);
		this.tabIdToSessionId.delete(tabId);

		if (sessionId === this.primarySessionId) {
			const remaining = [...this.connectedTabs.keys()];
			this.primarySessionId = remaining.length > 0 ? remaining[0] : undefined;
		}

		this.sendToPlaywright({
			method: 'Target.detachedFromTarget',
			params: { sessionId },
		});
	}

	private sendToPlaywright(message: CDPResponse): void {
		if (this.playwrightWs?.readyState === WebSocket.OPEN) {
			this.playwrightWs.send(JSON.stringify(message));
		}
	}

	// =========================================================================
	// Extension side
	// =========================================================================

	private handleExtensionConnection(ws: WebSocket): void {
		if (this.extensionConn) {
			ws.close(1000, 'Another extension already connected');
			return;
		}

		this.extensionConn = new ExtensionConnection(ws);

		this.extensionConn.onclose = () => {
			this.resetExtensionConnection();
			this.closePlaywrightConnection('Extension disconnected');
		};

		this.extensionConn.onmessage = <M extends keyof ExtensionEvents>(
			method: M,
			params: ExtensionEvents[M]['params'],
		) => {
			if (method === 'forwardCDPEvent') {
				const eventParams = params as ExtensionEvents['forwardCDPEvent']['params'];

				// Route by tabId if available, otherwise use primary session
				let sessionId: string | undefined;
				if (eventParams.tabId && this.tabIdToSessionId.has(eventParams.tabId)) {
					sessionId = this.tabIdToSessionId.get(eventParams.tabId);
				} else {
					sessionId = eventParams.sessionId ?? this.primarySessionId;
				}

				this.sendToPlaywright({
					sessionId,
					method: eventParams.method,
					params: eventParams.params,
				});
			} else if (method === 'tabOpened') {
				const { tabId, title, url } = params as ExtensionEvents['tabOpened']['params'];
				this.handleTabOpened(tabId, title, url);
			} else if (method === 'tabClosed') {
				const { tabId } = params as ExtensionEvents['tabClosed']['params'];
				this.handleTabClosed(tabId);
			}
		};

		this.extensionConnectedResolve?.();
	}

	private closeExtensionConnection(reason: string): void {
		this.extensionConn?.close(reason);
		this.extensionConnectedReject?.(new Error(reason));
		this.resetExtensionConnection();
	}

	private resetExtensionConnection(): void {
		this.connectedTabs.clear();
		this.tabIdToSessionId.clear();
		this.primarySessionId = undefined;
		this.extensionConn = null;
		this.extensionConnectedPromise = new Promise((resolve, reject) => {
			this.extensionConnectedResolve = resolve;
			this.extensionConnectedReject = reject;
		});
		this.extensionConnectedPromise.catch(() => {});
	}

	private closePlaywrightConnection(reason: string): void {
		if (this.playwrightWs?.readyState === WebSocket.OPEN) {
			this.playwrightWs.close(1000, reason);
		}
		this.playwrightWs = null;
	}
}

// ---------------------------------------------------------------------------
// ExtensionConnection — wraps the WebSocket to the extension
// ---------------------------------------------------------------------------

class ExtensionConnection {
	private readonly ws: WebSocket;
	private readonly callbacks = new Map<
		number,
		{ resolve: (value: unknown) => void; reject: (reason: Error) => void }
	>();
	private lastId = 0;

	onmessage?: <M extends keyof ExtensionEvents>(
		method: M,
		params: ExtensionEvents[M]['params'],
	) => void;
	onclose?: () => void;

	constructor(ws: WebSocket) {
		this.ws = ws;
		this.ws.on('message', (data) => this.handleMessage(data));
		this.ws.on('close', () => this.handleClose());
		this.ws.on('error', () => this.handleClose());
	}

	async send<M extends keyof ExtensionCommands>(
		method: M,
		params: ExtensionCommands[M]['params'],
	): Promise<unknown> {
		if (this.ws.readyState !== WebSocket.OPEN) {
			throw new Error(`WebSocket not open (state=${this.ws.readyState})`);
		}

		const id = ++this.lastId;
		this.ws.send(JSON.stringify({ id, method, params }));

		return await new Promise((resolve, reject) => {
			this.callbacks.set(id, { resolve, reject });
		});
	}

	close(reason: string): void {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.close(1000, reason);
		}
	}

	private handleMessage(data: unknown): void {
		let parsed: ExtensionResponse;
		try {
			parsed = JSON.parse(String(data)) as ExtensionResponse;
		} catch {
			return;
		}

		if (parsed.id && this.callbacks.has(parsed.id)) {
			const pending = this.callbacks.get(parsed.id)!;
			this.callbacks.delete(parsed.id);
			if (parsed.error) {
				pending.reject(new Error(parsed.error));
			} else {
				pending.resolve(parsed.result);
			}
		} else if (parsed.method) {
			this.onmessage?.(
				parsed.method as keyof ExtensionEvents,
				parsed.params as ExtensionEvents[keyof ExtensionEvents]['params'],
			);
		}
	}

	private handleClose(): void {
		for (const pending of this.callbacks.values()) {
			pending.reject(new Error('WebSocket closed'));
		}
		this.callbacks.clear();
		this.onclose?.();
	}
}
