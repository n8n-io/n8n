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
import { EventEmitter } from 'node:events';
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
import {
	ConnectionLostError,
	ExtensionNotConnectedError,
	type ConnectionLostReason,
	type ExtensionNotConnectedPhase,
} from './errors';
import { createLogger } from './logger';

const log = createLogger('relay');

// ---------------------------------------------------------------------------
// Restricted target filtering
// ---------------------------------------------------------------------------

/** Targets that should not be exposed to Playwright (extension pages, service workers, etc.). */
function isRestrictedTarget(targetInfo: { type?: string; url?: string }): boolean {
	const { type, url } = targetInfo;
	// Only allow page and iframe targets
	if (type && type !== 'page' && type !== 'iframe') return true;
	if (!url) return false;
	return ['chrome://', 'chrome-extension://', 'devtools://', 'edge://'].some((prefix) =>
		url.startsWith(prefix),
	);
}

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

	/** Called when the extension disconnects with a typed reason. */
	onExtensionDisconnect?: (reason: ConnectionLostReason) => void;

	private readonly connectionTimeoutMs: number;

	/** Grace period allowing the extension to reconnect before tearing down Playwright. */
	private readonly RECONNECT_WINDOW_MS = 15_000;
	private reconnectTimer: ReturnType<typeof setTimeout> | undefined;

	/** Internal event bus for CDP events (used to synchronize Runtime.enable). */
	private readonly cdpEvents = new EventEmitter();

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
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = undefined;
		}
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
				// Child session auto-attach: forward to extension so Chrome attaches to iframes
				if (sessionId) {
					return await this.forwardToExtension(method, params, sessionId);
				}

				// Root-level: forward to extension (applies to all attached tabs) AND list tabs for cache
				log.debug('Target.setAutoAttach: forwarding to extension and listing tabs');
				await this.forwardToExtension(method, params, sessionId);

				const { tabs } = (await this.extensionConn!.send('listRegisteredTabs', {})) as {
					tabs: Array<{ id: string; title: string; url: string }>;
				};
				log.debug('listRegisteredTabs result:', tabs.length, 'tabs');

				for (const tab of tabs) {
					this.tabCache.set(tab.id, { title: tab.title, url: tab.url });
					this.primaryTabId ??= tab.id;
				}
				return {};
			}

			case 'Runtime.enable': {
				if (!sessionId) {
					return await this.forwardToExtension(method, params, sessionId);
				}

				// Wait for Chrome to emit executionContextCreated (default context) before
				// returning, so Playwright's context cache is populated. Without this there's
				// a race where Playwright tries to use the context before it's announced.
				const contextCreatedPromise = new Promise<void>((resolve) => {
					const handler = (event: {
						method: string;
						params: unknown;
						sessionId: string;
					}) => {
						if (
							event.method === 'Runtime.executionContextCreated' &&
							event.sessionId === sessionId
						) {
							const ctxParams = event.params as {
								context?: { auxData?: { isDefault?: boolean } };
							};
							if (ctxParams?.context?.auxData?.isDefault === true) {
								clearTimeout(timer);
								this.cdpEvents.off('cdp:event', handler);
								resolve();
							}
						}
					};
					const timer = setTimeout(() => {
						this.cdpEvents.off('cdp:event', handler);
						log.debug(
							'Runtime.enable: timed out waiting for executionContextCreated, session:',
							sessionId,
						);
						resolve();
					}, 3_000);
					this.cdpEvents.on('cdp:event', handler);
				});

				const result = await this.forwardToExtension(method, params, sessionId);
				await contextCreatedPromise;
				return result;
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
		if (!this.extensionConn) throw new ConnectionLostError('extension_disconnected');

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
		if (!this.extensionConn) throw new ConnectionLostError('extension_disconnected');

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
		if (!this.extensionConn) throw new ConnectionLostError('extension_disconnected');

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
			try {
				this.playwrightWs.send(json);
			} catch {
				log.debug('sendToPlaywright: send failed (connection closing)');
			}
		} else {
			log.debug('sendToPlaywright: no Playwright connection');
		}
	}

	// =========================================================================
	// Extension side
	// =========================================================================

	private handleExtensionConnection(ws: WebSocket): void {
		// If reconnecting during the grace window, cancel the teardown timer
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = undefined;
			log.debug('extension reconnected within grace window');
		}

		if (this.extensionConn) {
			// Accept the new connection as a replacement (e.g. reconnect after transient drop).
			// Clear the handler first so the async close event from the old connection doesn't
			// null out extensionConn or start a spurious reconnect timer after we've already
			// installed the replacement.
			log.debug('replacing existing extension connection');
			this.extensionConn.onclose = undefined;
			this.extensionConn.close('Replaced by new connection');
		}

		log.debug('extension connected');
		this.extensionConn = new ExtensionConnection(ws);

		this.extensionConn.onclose = () => {
			const rawReason = this.extensionConn?.closeReason;
			log.debug('extension disconnected, reason:', rawReason ?? '(none)');
			this.onExtensionDisconnect?.(asConnectionLostReason(rawReason));

			// Clear extension ref but KEEP tabCache, activatedTabs, and Playwright connection.
			// Pending requests are already rejected by ExtensionConnection.handleClose.
			this.extensionConn = null;

			// Start a grace period: if the extension reconnects in time, we rebind
			// without tearing down Playwright. If not, we close everything.
			this.reconnectTimer = setTimeout(() => {
				this.reconnectTimer = undefined;
				log.debug('reconnection window expired, closing Playwright');
				this.resetState();
				this.closePlaywrightConnection('Extension did not reconnect');
			}, this.RECONNECT_WINDOW_MS);

			// Re-create the promise so waitForExtension() works for the next connection
			this.extensionConnectedPromise = new Promise((resolve, reject) => {
				this.extensionConnectedResolve = resolve;
				this.extensionConnectedReject = reject;
			});
			this.extensionConnectedPromise.catch(() => {});
		};

		this.setupExtensionEventHandlers();

		// Re-sync tab state from extension after reconnect (if Playwright is still alive)
		if (this.playwrightWs) {
			void this.resyncTabsFromExtension();
		}

		this.extensionConnectedResolve?.();
	}

	/** Wire up event handlers for the current extension connection. */
	private setupExtensionEventHandlers(): void {
		if (!this.extensionConn) return;

		this.extensionConn.onmessage = <M extends keyof ExtensionEvents>(
			method: M,
			params: ExtensionEvents[M]['params'],
		) => {
			log.debug('← EXT event:', method);
			if (method === 'forwardCDPEvent') {
				const eventParams = params as ExtensionEvents['forwardCDPEvent']['params'];

				// Use the CDP targetId as Playwright's sessionId
				const sessionId = eventParams.id ?? this.primaryTabId;

				// --- Restricted target filtering (second line of defense after extension) ---
				if (eventParams.method === 'Target.attachedToTarget') {
					const attachParams = eventParams.params as
						| {
								sessionId?: string;
								targetInfo?: { type?: string; url?: string };
								waitingForDebugger?: boolean;
						  }
						| undefined;
					if (attachParams?.targetInfo && isRestrictedTarget(attachParams.targetInfo)) {
						log.debug('filtering restricted target:', attachParams.targetInfo.url);
						// Resume if waiting for debugger to prevent hanging navigations
						if (attachParams.waitingForDebugger && attachParams.sessionId && this.extensionConn) {
							this.extensionConn
								.send('forwardCDPCommand', {
									id: sessionId,
									method: 'Runtime.runIfWaitingForDebugger',
									params: {},
								})
								.catch((e) => log.debug('failed to resume restricted target:', e));
						}
						return;
					}
				}

				// --- Target crash cleanup ---
				if (eventParams.method === 'Target.targetCrashed') {
					const crashParams = eventParams.params as { targetId?: string } | undefined;
					const targetId = crashParams?.targetId;
					if (targetId && this.tabCache.has(targetId)) {
						log.debug('Target.targetCrashed: removing crashed tab:', targetId);
						this.tabCache.delete(targetId);
						const wasActivated = this.activatedTabs.delete(targetId);
						if (targetId === this.primaryTabId) {
							const remaining = [...this.tabCache.keys()];
							this.primaryTabId = remaining.length > 0 ? remaining[0] : undefined;
						}
						if (wasActivated) {
							this.sendToPlaywright({
								method: 'Target.targetCrashed',
								params: { targetId },
								sessionId: targetId,
							});
						}
					}
					return;
				}

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

				// Emit internally so Runtime.enable can wait for executionContextCreated
				this.cdpEvents.emit('cdp:event', {
					method: eventParams.method,
					params: eventParams.params,
					sessionId,
				});
			} else if (method === 'tabOpened') {
				const p = params as ExtensionEvents['tabOpened']['params'];
				this.handleTabOpened(p.id, p.title, p.url);
			} else if (method === 'tabClosed') {
				const p = params as ExtensionEvents['tabClosed']['params'];
				this.handleTabClosed(p.id);
			}
		};
	}

	/** After reconnect, sync tab state from extension and clean up stale entries. */
	private async resyncTabsFromExtension(): Promise<void> {
		if (!this.extensionConn) return;
		try {
			const { tabs } = (await this.extensionConn.send('listRegisteredTabs', {})) as {
				tabs: Array<{ id: string; title: string; url: string }>;
			};
			const currentIds = new Set(tabs.map((t) => t.id));

			// Update cache for tabs that still exist
			for (const tab of tabs) {
				this.tabCache.set(tab.id, { title: tab.title, url: tab.url });
				this.primaryTabId ??= tab.id;
			}

			// Remove stale entries for tabs that no longer exist in extension
			for (const id of [...this.tabCache.keys()]) {
				if (!currentIds.has(id)) {
					this.tabCache.delete(id);
					if (this.activatedTabs.delete(id)) {
						this.sendToPlaywright({
							method: 'Target.detachedFromTarget',
							params: { sessionId: id },
						});
					}
				}
			}

			log.debug('resyncTabsFromExtension: synced', tabs.length, 'tabs');
		} catch (e) {
			log.error('resyncTabsFromExtension failed:', e);
		}
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

const HEARTBEAT_INTERVAL_MS = 5_000;
const HEARTBEAT_TIMEOUT_MS = 15_000;

class ExtensionConnection {
	private readonly ws: WebSocket;
	private readonly callbacks = new Map<
		number,
		{ resolve: (value: unknown) => void; reject: (reason: Error) => void }
	>();
	private lastId = 0;
	private lastPongAt = Date.now();
	private heartbeatInterval: ReturnType<typeof setInterval> | undefined;

	/** The reason string from the WebSocket close frame, if any. */
	closeReason: string | undefined;

	onmessage?: <M extends keyof ExtensionEvents>(
		method: M,
		params: ExtensionEvents[M]['params'],
	) => void;
	onclose?: () => void;

	constructor(ws: WebSocket) {
		this.ws = ws;
		this.ws.on('message', (data) => this.handleMessage(data));
		this.ws.on('close', (_code: number, reason: Buffer) => {
			const reasonStr = reason.toString();
			log.debug('ExtensionConnection WebSocket closed:', reasonStr || '(no reason)');
			// Only update closeReason if not already set (e.g. by heartbeat timeout)
			this.closeReason ??= reasonStr || undefined;
			this.handleClose();
		});
		this.ws.on('error', (error) => {
			log.debug('ExtensionConnection WebSocket error:', error);
			this.handleClose();
		});
		this.ws.on('pong', () => {
			this.lastPongAt = Date.now();
		});

		this.startHeartbeat();
	}

	async send<M extends keyof ExtensionCommands>(
		method: M,
		params: ExtensionCommands[M]['params'],
		timeoutMs = 30_000,
	): Promise<unknown> {
		if (this.ws.readyState !== WebSocket.OPEN) {
			throw new ConnectionLostError('network_error');
		}

		const id = ++this.lastId;
		const payload = JSON.stringify({ id, method, params });
		log.debug('→ EXT:', method, 'id=' + String(id));
		try {
			this.ws.send(payload);
		} catch {
			throw new ConnectionLostError('network_error');
		}

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
				reject(new ConnectionLostError('heartbeat_timeout'));
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
		this.stopHeartbeat();
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.close(1000, reason);
		}
	}

	private startHeartbeat(): void {
		this.heartbeatInterval = setInterval(() => {
			if (this.ws.readyState !== WebSocket.OPEN) {
				this.stopHeartbeat();
				return;
			}

			const elapsed = Date.now() - this.lastPongAt;
			if (elapsed > HEARTBEAT_TIMEOUT_MS) {
				log.debug('heartbeat timeout: no pong for', elapsed, 'ms');
				this.closeReason = 'heartbeat_timeout';
				this.stopHeartbeat();
				this.ws.terminate();
				return;
			}

			this.ws.ping();
		}, HEARTBEAT_INTERVAL_MS);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = undefined;
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
		this.stopHeartbeat();
		const pendingCount = this.callbacks.size;
		if (pendingCount > 0) {
			log.debug('ExtensionConnection closed with', pendingCount, 'pending callbacks');
		}
		const reason = asConnectionLostReason(this.closeReason);
		for (const pending of this.callbacks.values()) {
			pending.reject(new ConnectionLostError(reason));
		}
		this.callbacks.clear();
		this.onclose?.();
	}
}

// ---------------------------------------------------------------------------
// Close reason validation
// ---------------------------------------------------------------------------

const VALID_REASONS = new Set<ConnectionLostReason>([
	'browser_closed',
	'extension_disconnected',
	'debugger_detached',
	'network_error',
	'heartbeat_timeout',
]);

/** Validate a raw close reason string as a typed `ConnectionLostReason`. */
function asConnectionLostReason(raw: string | undefined): ConnectionLostReason {
	if (raw && VALID_REASONS.has(raw as ConnectionLostReason)) return raw as ConnectionLostReason;
	return 'network_error';
}
