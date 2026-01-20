import type { Unsubscribe } from '../types';
import type { SyncTransport } from './types';

type ReceiveHandler = (data: Uint8Array) => void;
type ConnectionHandler = (connected: boolean) => void;
type ErrorHandler = (error: Error) => void;

export interface WebSocketTransportConfig {
	/** WebSocket URL (ws:// or wss://) */
	url: string;

	/** Enable automatic reconnection (default: true) */
	reconnect?: boolean;

	/** Maximum reconnection attempts (default: Infinity) */
	maxReconnectAttempts?: number;

	/** Initial reconnection delay in ms (default: 1000) */
	reconnectDelay?: number;

	/** Maximum reconnection delay in ms (default: 30000) */
	maxReconnectDelay?: number;

	/** Reconnection backoff multiplier (default: 2) */
	reconnectBackoff?: number;

	/** Connection timeout in ms (default: 10000) */
	connectionTimeout?: number;
}

/**
 * WebSocketTransport - Transport using WebSocket for server communication.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection timeout handling
 * - Binary message support (Uint8Array)
 *
 * Usage:
 * ```typescript
 * const transport = new WebSocketTransport({
 *   url: 'wss://server/sync',
 *   reconnect: true,
 * });
 *
 * transport.onConnectionChange((connected) => {
 *   console.log('Connection state:', connected);
 * });
 *
 * await transport.connect();
 * ```
 */
export class WebSocketTransport implements SyncTransport {
	private ws: WebSocket | null = null;
	private receiveHandlers = new Set<ReceiveHandler>();
	private connectionHandlers = new Set<ConnectionHandler>();
	private errorHandlers = new Set<ErrorHandler>();
	private _connected = false;
	private reconnectAttempts = 0;
	private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	private shouldReconnect = false;
	private isConnecting = false;
	private connectionPromise: Promise<void> | null = null;

	private readonly config: Required<WebSocketTransportConfig>;

	constructor(config: WebSocketTransportConfig) {
		this.config = {
			url: config.url,
			reconnect: config.reconnect ?? true,
			maxReconnectAttempts: config.maxReconnectAttempts ?? Infinity,
			reconnectDelay: config.reconnectDelay ?? 1000,
			maxReconnectDelay: config.maxReconnectDelay ?? 30000,
			reconnectBackoff: config.reconnectBackoff ?? 2,
			connectionTimeout: config.connectionTimeout ?? 10000,
		};
	}

	get connected(): boolean {
		return this._connected;
	}

	send(data: Uint8Array): void {
		if (!this._connected || !this.ws) {
			throw new Error('Transport not connected');
		}

		this.ws.send(data);
	}

	onReceive(handler: ReceiveHandler): Unsubscribe {
		this.receiveHandlers.add(handler);
		return () => {
			this.receiveHandlers.delete(handler);
		};
	}

	/**
	 * Subscribe to connection state changes.
	 */
	onConnectionChange(handler: ConnectionHandler): Unsubscribe {
		this.connectionHandlers.add(handler);
		return () => {
			this.connectionHandlers.delete(handler);
		};
	}

	/**
	 * Subscribe to connection errors.
	 */
	onError(handler: ErrorHandler): Unsubscribe {
		this.errorHandlers.add(handler);
		return () => {
			this.errorHandlers.delete(handler);
		};
	}

	async connect(): Promise<void> {
		// Clear any pending reconnect to avoid parallel WebSocket connections
		this.clearReconnectTimeout();

		if (this._connected) {
			return await Promise.resolve();
		}

		if (this.isConnecting && this.connectionPromise) {
			return await this.connectionPromise;
		}

		this.shouldReconnect = this.config.reconnect;
		this.connectionPromise = this.doConnect();
		return await this.connectionPromise;
	}

	disconnect(): void {
		this.shouldReconnect = false;
		this.clearReconnectTimeout();

		if (this.ws) {
			this.ws.onclose = null;
			this.ws.onerror = null;
			this.ws.onmessage = null;
			this.ws.onopen = null;
			this.ws.close();
			this.ws = null;
		}

		if (this._connected) {
			this._connected = false;
			this.notifyConnectionChange(false);
		}

		this.isConnecting = false;
		this.connectionPromise = null;
	}

	private async doConnect(): Promise<void> {
		this.isConnecting = true;

		return await new Promise<void>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				if (this.ws) {
					this.ws.close();
				}
				reject(new Error('Connection timeout'));
			}, this.config.connectionTimeout);

			try {
				this.ws = new WebSocket(this.config.url);
				this.ws.binaryType = 'arraybuffer';

				this.ws.onopen = () => {
					clearTimeout(timeoutId);
					this._connected = true;
					this.isConnecting = false;
					this.reconnectAttempts = 0;
					this.notifyConnectionChange(true);
					resolve();
				};

				this.ws.onclose = () => {
					clearTimeout(timeoutId);
					const wasConnected = this._connected;
					this._connected = false;
					this.isConnecting = false;

					if (wasConnected) {
						this.notifyConnectionChange(false);
					}

					if (this.shouldReconnect) {
						this.scheduleReconnect();
					}
				};

				this.ws.onerror = () => {
					clearTimeout(timeoutId);
					const error = new Error('WebSocket error');
					this.notifyError(error);

					if (this.isConnecting) {
						this.isConnecting = false;
						reject(error);
					}
				};

				this.ws.onmessage = (event) => {
					if (event.data instanceof ArrayBuffer) {
						const data = new Uint8Array(event.data);
						for (const handler of this.receiveHandlers) {
							handler(data);
						}
					}
				};
			} catch (error) {
				clearTimeout(timeoutId);
				this.isConnecting = false;
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	private scheduleReconnect(): void {
		if (!this.shouldReconnect) {
			return;
		}

		if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
			this.notifyError(new Error('Max reconnection attempts reached'));
			return;
		}

		const delay = Math.min(
			this.config.reconnectDelay * Math.pow(this.config.reconnectBackoff, this.reconnectAttempts),
			this.config.maxReconnectDelay,
		);

		this.reconnectAttempts++;

		this.reconnectTimeout = setTimeout(() => {
			this.reconnectTimeout = null;
			this.doConnect().catch((error: Error) => {
				this.notifyError(error);
			});
		}, delay);
	}

	private clearReconnectTimeout(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
	}

	private notifyConnectionChange(connected: boolean): void {
		for (const handler of this.connectionHandlers) {
			handler(connected);
		}
	}

	private notifyError(error: Error): void {
		for (const handler of this.errorHandlers) {
			handler(error);
		}
	}
}
