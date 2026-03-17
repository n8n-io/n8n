/**
 * WebSocket server that bridges Playwright MCP and the Chrome extension.
 *
 * Endpoints:
 *   /cdp/{uuid}       — Full CDP interface for Playwright (connectOverCDP)
 *   /extension/{uuid}  — Chrome extension connection for chrome.debugger forwarding
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

export class CDPRelayServer {
	private readonly httpServer: http.Server;
	private readonly wss: WebSocketServer;
	private readonly cdpPath: string;
	private readonly extensionPath: string;

	private playwrightWs: WebSocket | null = null;
	private extensionConn: ExtensionConnection | null = null;
	private connectedTabInfo: { targetInfo: unknown; sessionId: string } | undefined;
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
						'Then retry browser_open with mode: "local". ' +
						'Alternatively, use mode: "ephemeral" which requires no setup.',
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
				// Forward child session handling
				if (sessionId) break;

				// Simulate auto-attach behavior using the extension's attached tab
				const { targetInfo } = (await this.extensionConn!.send('attachToTab', {})) as {
					targetInfo: unknown;
				};
				this.connectedTabInfo = {
					targetInfo,
					sessionId: `pw-tab-${this.nextSessionId++}`,
				};

				// Send synthetic attachedToTarget event to Playwright
				this.sendToPlaywright({
					method: 'Target.attachedToTarget',
					params: {
						sessionId: this.connectedTabInfo.sessionId,
						targetInfo: {
							...(this.connectedTabInfo.targetInfo as Record<string, unknown>),
							attached: true,
						},
						waitingForDebugger: false,
					},
				});
				return {};
			}

			case 'Target.getTargetInfo':
				return this.connectedTabInfo?.targetInfo;
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

		// Top-level sessionId is only between relay and Playwright
		if (this.connectedTabInfo?.sessionId === sessionId) {
			sessionId = undefined;
		}

		return await this.extensionConn.send('forwardCDPCommand', {
			sessionId,
			method,
			params,
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
				const sessionId = eventParams.sessionId ?? this.connectedTabInfo?.sessionId;
				this.sendToPlaywright({
					sessionId,
					method: eventParams.method,
					params: eventParams.params,
				});
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
		this.connectedTabInfo = undefined;
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
