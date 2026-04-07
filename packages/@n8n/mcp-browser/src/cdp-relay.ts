/**
 * WebSocket server that bridges Playwright MCP and the Chrome extension.
 *
 * Near-stateless pass-through: the extension owns all tab state.
 * The relay only caches tab metadata (title/url) for Target.attachedToTarget
 * messages and tracks which tabs have been activated.
 *
 * All tab IDs are CDP Target.targetId strings resolved by the extension.
 */

import { randomUUID } from 'node:crypto';
import http from 'node:http';
import type net from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';

import { getExtensionInstallInstructions } from './browser-discovery';
import type {
	CDPCommand,
	CDPResponse,
	ExtensionCommands,
	ExtensionEvents,
	ExtensionResponse,
} from './cdp-relay-protocol';
import { ExtensionNotConnectedError, type ExtensionNotConnectedPhase } from './errors';
import { createLogger } from './logger';

const log = createLogger('relay');

// ---------------------------------------------------------------------------
// CDPRelayServer
// ---------------------------------------------------------------------------

export interface CDPRelayServerOptions {
	/** Timeout in ms waiting for extension to connect. Default 15_000 */
	connectionTimeoutMs?: number;
}

export interface WaitForExtensionOptions {
	/** Whether the browser process was successfully launched via execFile. */
	browserWasLaunched?: boolean;
}

export class CDPRelayServer {
	private readonly httpServer: http.Server;
	private readonly wss: WebSocketServer;
	private readonly cdpPath: string;
	private readonly extensionPath: string;

	private playwrightWs: WebSocket | null = null;
	private extensionConn: ExtensionConnection | null = null;

	// ---- Lightweight cache (populated from extension responses) ----
	/** Cached tab metadata: CDP targetId → { title, url }. Source of truth is extension. */
	private readonly tabCache = new Map<string, { title: string; url: string }>();
	/** Tabs that have had Target.attachedToTarget sent to Playwright. */
	private readonly activatedTabs = new Set<string>();
	/** The primary tab ID (first seen). */
	private primaryTabId: string | undefined;
	/** The most recently created tab ID (for adapter.newPage() to pick up). */
	private lastCreatedTabId: string | undefined;
	/** Browser context ID returned to Playwright (required in targetInfo). */
	private browserContextId = 'n8n-default-context';

	private extensionConnectedResolve?: () => void;
	private extensionConnectedReject?: (error: Error) => void;
	private extensionConnectedPromise: Promise<void>;

	private readonly connectionTimeoutMs: number;

	constructor(options?: CDPRelayServerOptions) {
		this.connectionTimeoutMs = options?.connectionTimeoutMs ?? 15_000;

		const uuid = randomUUID();
		this.cdpPath = `/cdp/${uuid}`;
		this.extensionPath = `/extension/${uuid}`;

		this.extensionConnectedPromise = new Promise((resolve, reject) => {
			this.extensionConnectedResolve = resolve;
			this.extensionConnectedReject = reject;
		});
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
				log.debug('listening on port', addr.port);
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

	/** Wait for the extension to connect. Rejects after timeout with phase-specific guidance. */
	async waitForExtension(options?: WaitForExtensionOptions): Promise<void> {
		if (this.extensionConn) return;

		log.debug('waiting for extension to connect (timeout:', this.connectionTimeoutMs, 'ms)');

		const phase: ExtensionNotConnectedPhase =
			options?.browserWasLaunched === false ? 'browser_not_launched' : 'extension_missing';

		const timer = setTimeout(() => {
			log.error('extension connection timed out, phase:', phase);
			this.extensionConnectedReject?.(
				new ExtensionNotConnectedError(
					this.connectionTimeoutMs,
					phase,
					getExtensionInstallInstructions(),
				),
			);
		}, this.connectionTimeoutMs);

		try {
			await this.extensionConnectedPromise;
			log.debug('extension connected');
		} finally {
			clearTimeout(timer);
		}
	}

	/** Shut down the relay, closing all connections. */
	stop(): void {
		log.debug('stopping relay server');
		this.closePlaywrightConnection('Server stopped');
		this.closeExtensionConnection('Server stopped');
		this.wss.close();
		this.httpServer.close();
	}

	// =========================================================================
	// Public helpers for the adapter
	// =========================================================================

	/** Get the ID of the most recently created tab (for adapter.newPage). */
	getLastCreatedTabId(): string | undefined {
		return this.lastCreatedTabId;
	}

	/** Check if a tab ID is known to the relay. */
	hasTab(id: string): boolean {
		return this.tabCache.has(id);
	}

	/** List all known tabs, fetching fresh metadata from the extension. */
	async listTabs(): Promise<Array<{ id: string; title: string; url: string }>> {
		if (this.extensionConn) {
			const result = (await this.extensionConn.send('listTabs', {})) as {
				tabs: Array<{ id: string; title: string; url: string }>;
			};
			// Refresh cache with fresh data from extension
			for (const tab of result.tabs) {
				const cached = this.tabCache.get(tab.id);
				if (cached) {
					cached.title = tab.title;
					cached.url = tab.url;
				}
			}
			return result.tabs;
		}
		// Fallback to cache if extension not connected
		return [...this.tabCache.entries()].map(([id, meta]) => ({
			id,
			title: meta.title,
			url: meta.url,
		}));
	}

	/**
	 * Activate a tab: tell the extension to ensure the debugger is attached and
	 * notify Playwright via Target.attachedToTarget. Idempotent.
	 */
	async activateTab(id: string): Promise<void> {
		if (this.activatedTabs.has(id)) {
			log.debug('activateTab: already activated:', id);
			return;
		}
		if (!this.extensionConn) {
			log.debug('activateTab: no extension connection');
			return;
		}

		const cached = this.tabCache.get(id);
		log.debug('activateTab:', id, 'title:', cached?.title, 'url:', cached?.url);
		this.activatedTabs.add(id);

		// Tell extension to ensure debugger is attached (should be a no-op with eager attach)
		log.debug('activateTab: sending attachTab to extension for', id);
		await this.extensionConn.send('attachTab', { id });
		log.debug('activateTab: extension confirmed attach for', id);

		// Tell Playwright about the new target
		log.debug('activateTab: sending Target.attachedToTarget to Playwright for', id);
		this.sendToPlaywright({
			method: 'Target.attachedToTarget',
			params: {
				sessionId: id,
				targetInfo: {
					targetId: id,
					type: 'page',
					title: cached?.title ?? '',
					url: cached?.url ?? '',
					attached: true,
					browserContextId: this.browserContextId,
				},
				waitingForDebugger: false,
			},
		});
	}

	/**
	 * Remove a tab from the activated set so it can be re-activated later.
	 * Called by the adapter when Playwright loses a page (close event).
	 */
	deactivateTab(id: string): void {
		const removed = this.activatedTabs.delete(id);
		if (removed) {
			log.debug('deactivateTab: cleared activation for', id);
		}
	}

	// =========================================================================
	// WebSocket routing
	// =========================================================================

	private onConnection(ws: WebSocket, req: http.IncomingMessage): void {
		const url = new URL(`http://localhost${req.url ?? '/'}`);
		log.debug('new WebSocket connection:', url.pathname);

		if (url.pathname === this.cdpPath) {
			this.handlePlaywrightConnection(ws);
		} else if (url.pathname === this.extensionPath) {
			this.handleExtensionConnection(ws);
		} else {
			log.debug('rejected connection to unknown path:', url.pathname);
			ws.close(4004, 'Invalid path');
		}
	}

	// =========================================================================
	// Playwright (CDP client) side
	// =========================================================================

	private handlePlaywrightConnection(ws: WebSocket): void {
		if (this.playwrightWs) {
			log.debug('rejected duplicate Playwright connection');
			ws.close(1000, 'Another CDP client already connected');
			return;
		}

		log.debug('Playwright connected');
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
			log.debug('Playwright disconnected');
			this.playwrightWs = null;
			this.closeExtensionConnection('Playwright client disconnected');
		});
	}

	private async handlePlaywrightMessage(message: CDPCommand): Promise<void> {
		const { id, sessionId, method, params } = message;
		log.debug('← PW:', method, 'id=' + String(id), sessionId ? 'session=' + sessionId : '');
		try {
			const result = await this.handleCDPCommand(method, params, sessionId);
			this.sendToPlaywright({ id, sessionId, result });
		} catch (e) {
			log.debug('CDP command error:', method, e instanceof Error ? e.message : e);
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

			case 'Target.createBrowserContext': {
				this.browserContextId = 'context_' + Math.random().toString(36).slice(2, 8);
				log.debug('Target.createBrowserContext:', this.browserContextId);
				return { browserContextId: this.browserContextId };
			}

			case 'Target.disposeBrowserContext':
				return {};

			case 'Target.setAutoAttach': {
				// Child session auto-attach: ack without forwarding
				if (sessionId) return {};

				log.debug('Target.setAutoAttach: listing tabs from extension');
				const { tabs } = (await this.extensionConn!.send('listRegisteredTabs', {})) as {
					tabs: Array<{ id: string; title: string; url: string }>;
				};
				log.debug('listRegisteredTabs result:', tabs.length, 'tabs');

				// Cache metadata — don't activate (lazy)
				for (const tab of tabs) {
					this.tabCache.set(tab.id, { title: tab.title, url: tab.url });
					this.primaryTabId ??= tab.id;
				}
				return {};
			}

			case 'Target.createTarget': {
				const createParams = (params ?? {}) as Record<string, unknown>;
				const url = (createParams.url as string) ?? undefined;
				log.debug('Target.createTarget: url =', url);
				const tab = await this.createTab(url);
				return { targetId: tab.id };
			}

			case 'Target.closeTarget': {
				const closeParams = (params ?? {}) as Record<string, unknown>;
				const id = closeParams.targetId as string;
				log.debug('Target.closeTarget: id =', id);
				if (id && this.tabCache.has(id)) {
					await this.closeTab(id);
				}
				return { success: true };
			}

			case 'Target.getTargetInfo': {
				const id = sessionId ?? this.primaryTabId;
				if (id) {
					const cached = this.tabCache.get(id);
					if (cached) {
						return {
							targetId: id,
							type: 'page',
							title: cached.title,
							url: cached.url,
							attached: true,
							browserContextId: this.browserContextId,
						};
					}
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

		// sessionId IS the CDP targetId — pass it directly
		log.debug('→ EXT: forwardCDPCommand', method, sessionId ? 'id=' + sessionId : '(primary)');
		const result = await this.extensionConn.send('forwardCDPCommand', {
			id: sessionId,
			method,
			params,
		});
		log.debug(
			'← EXT: forwardCDPCommand result for',
			method,
			sessionId ? 'id=' + sessionId : '(primary)',
		);
		return result;
	}

	// =========================================================================
	// Tab management — forwarded to extension
	// =========================================================================

	/** Create a new tab via the extension. */
	private async createTab(url?: string): Promise<{ id: string; title: string; url: string }> {
		if (!this.extensionConn) throw new Error('Extension not connected');

		log.debug('createTab: requesting from extension, url =', url);
		const result = (await this.extensionConn.send('createTab', { url })) as {
			id: string;
			title: string;
			url: string;
		};
		log.debug('createTab: result targetId =', result.id, 'url =', result.url);

		// Cache metadata
		this.tabCache.set(result.id, { title: result.title, url: result.url });
		this.lastCreatedTabId = result.id;

		// Agent-created tabs are eagerly activated
		this.activatedTabs.add(result.id);
		this.sendToPlaywright({
			method: 'Target.attachedToTarget',
			params: {
				sessionId: result.id,
				targetInfo: {
					targetId: result.id,
					type: 'page',
					title: result.title,
					url: result.url,
					attached: true,
					browserContextId: this.browserContextId,
				},
				waitingForDebugger: false,
			},
		});

		return result;
	}

	/** Close a tab via the extension. */
	async closeTab(id: string): Promise<void> {
		if (!this.extensionConn) throw new Error('Extension not connected');

		await this.extensionConn.send('closeTab', { id });

		this.tabCache.delete(id);
		const wasActivated = this.activatedTabs.delete(id);

		if (id === this.primaryTabId) {
			const remaining = [...this.tabCache.keys()];
			this.primaryTabId = remaining.length > 0 ? remaining[0] : undefined;
		}

		if (wasActivated) {
			this.sendToPlaywright({
				method: 'Target.detachedFromTarget',
				params: { sessionId: id },
			});
		}
	}

	/** Handle tabOpened event from extension. */
	private handleTabOpened(id: string, title: string, url: string): void {
		if (this.tabCache.has(id)) return;

		log.debug('tabOpened:', id, url);
		this.tabCache.set(id, { title, url });
		this.primaryTabId ??= id;
		// Don't activate — lazy
	}

	/** Handle tabClosed event from extension. */
	private handleTabClosed(id: string): void {
		log.debug('tabClosed:', id);

		this.tabCache.delete(id);
		const wasActivated = this.activatedTabs.delete(id);

		if (id === this.primaryTabId) {
			const remaining = [...this.tabCache.keys()];
			this.primaryTabId = remaining.length > 0 ? remaining[0] : undefined;
		}

		if (wasActivated) {
			this.sendToPlaywright({
				method: 'Target.detachedFromTarget',
				params: { sessionId: id },
			});
		}
	}

	private sendToPlaywright(message: CDPResponse): void {
		if (this.playwrightWs?.readyState === WebSocket.OPEN) {
			const json = JSON.stringify(message);
			log.debug('→ PW:', json.length > 200 ? json.slice(0, 200) + '…' : json);
			this.playwrightWs.send(json);
		} else {
			log.debug('sendToPlaywright: no Playwright connection');
		}
	}

	// =========================================================================
	// Extension side
	// =========================================================================

	private handleExtensionConnection(ws: WebSocket): void {
		if (this.extensionConn) {
			log.debug('rejected duplicate extension connection');
			ws.close(1000, 'Another extension already connected');
			return;
		}

		log.debug('extension connected');
		this.extensionConn = new ExtensionConnection(ws);

		this.extensionConn.onclose = () => {
			log.debug('extension disconnected');
			this.resetState();
			this.closePlaywrightConnection('Extension disconnected');
		};

		this.extensionConn.onmessage = <M extends keyof ExtensionEvents>(
			method: M,
			params: ExtensionEvents[M]['params'],
		) => {
			log.debug('← EXT event:', method);
			if (method === 'forwardCDPEvent') {
				const eventParams = params as ExtensionEvents['forwardCDPEvent']['params'];

				// Use the CDP targetId as Playwright's sessionId
				const sessionId = eventParams.id ?? this.primaryTabId;

				// Keep cached metadata fresh on navigation
				if (eventParams.method === 'Page.frameNavigated' && sessionId) {
					const frame = (eventParams.params as Record<string, unknown> | undefined)?.frame as
						| Record<string, unknown>
						| undefined;
					if (frame?.url && !frame.parentId) {
						const cached = this.tabCache.get(sessionId);
						if (cached) {
							cached.url = frame.url as string;
							if (frame.title) cached.title = frame.title as string;
						}
					}
				}

				this.sendToPlaywright({
					sessionId,
					method: eventParams.method,
					params: eventParams.params,
				});
			} else if (method === 'tabOpened') {
				const p = params as ExtensionEvents['tabOpened']['params'];
				this.handleTabOpened(p.id, p.title, p.url);
			} else if (method === 'tabClosed') {
				const p = params as ExtensionEvents['tabClosed']['params'];
				this.handleTabClosed(p.id);
			}
		};

		this.extensionConnectedResolve?.();
	}

	private closeExtensionConnection(reason: string): void {
		log.debug('closing extension connection:', reason);
		this.extensionConn?.close(reason);
		this.extensionConnectedReject?.(new Error(reason));
		this.resetState();
	}

	private resetState(): void {
		this.tabCache.clear();
		this.activatedTabs.clear();
		this.primaryTabId = undefined;
		this.lastCreatedTabId = undefined;
		this.browserContextId = 'n8n-default-context';
		this.extensionConn = null;
		this.extensionConnectedPromise = new Promise((resolve, reject) => {
			this.extensionConnectedResolve = resolve;
			this.extensionConnectedReject = reject;
		});
		this.extensionConnectedPromise.catch(() => {});
	}

	private closePlaywrightConnection(reason: string): void {
		if (this.playwrightWs?.readyState === WebSocket.OPEN) {
			log.debug('closing Playwright connection:', reason);
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
		this.ws.on('close', () => {
			log.debug('ExtensionConnection WebSocket closed');
			this.handleClose();
		});
		this.ws.on('error', (error) => {
			log.debug('ExtensionConnection WebSocket error:', error);
			this.handleClose();
		});
	}

	async send<M extends keyof ExtensionCommands>(
		method: M,
		params: ExtensionCommands[M]['params'],
		timeoutMs = 30_000,
	): Promise<unknown> {
		if (this.ws.readyState !== WebSocket.OPEN) {
			throw new Error(`WebSocket not open (state=${this.ws.readyState})`);
		}

		const id = ++this.lastId;
		const payload = JSON.stringify({ id, method, params });
		log.debug('→ EXT:', method, 'id=' + String(id));
		this.ws.send(payload);

		return await new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.callbacks.delete(id);
				log.error(
					'→ EXT TIMEOUT:',
					method,
					'id=' + String(id),
					'after',
					timeoutMs,
					'ms',
					'pending:',
					this.callbacks.size,
				);
				reject(
					new Error(
						`Extension command '${String(method)}' (id=${id}) timed out after ${timeoutMs}ms`,
					),
				);
			}, timeoutMs);

			this.callbacks.set(id, {
				resolve: (value) => {
					clearTimeout(timer);
					resolve(value);
				},
				reject: (reason) => {
					clearTimeout(timer);
					reject(reason);
				},
			});
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
			log.debug('failed to parse extension message:', String(data).slice(0, 200));
			return;
		}

		if (parsed.id && this.callbacks.has(parsed.id)) {
			const pending = this.callbacks.get(parsed.id)!;
			this.callbacks.delete(parsed.id);
			if (parsed.error) {
				log.debug('← EXT error for id=' + String(parsed.id) + ':', parsed.error);
				pending.reject(new Error(parsed.error));
			} else {
				log.debug('← EXT response for id=' + String(parsed.id));
				pending.resolve(parsed.result);
			}
		} else if (parsed.method) {
			this.onmessage?.(
				parsed.method as keyof ExtensionEvents,
				parsed.params as ExtensionEvents[keyof ExtensionEvents]['params'],
			);
		} else {
			log.debug('← EXT unhandled message:', JSON.stringify(parsed).slice(0, 200));
		}
	}

	private handleClose(): void {
		const pendingCount = this.callbacks.size;
		if (pendingCount > 0) {
			log.debug('ExtensionConnection closed with', pendingCount, 'pending callbacks');
		}
		for (const pending of this.callbacks.values()) {
			pending.reject(new Error('WebSocket closed'));
		}
		this.callbacks.clear();
		this.onclose?.();
	}
}
