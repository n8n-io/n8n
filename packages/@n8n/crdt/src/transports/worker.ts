import type { Unsubscribe } from '../types';
import type { SyncTransport } from './types';
import {
	MESSAGE_SUBSCRIBE,
	MESSAGE_UNSUBSCRIBE,
	MESSAGE_CONNECTED,
	MESSAGE_DISCONNECTED,
	MESSAGE_INITIAL_SYNC,
	encodeWithDocId,
	decodeWithDocId,
	encodeString,
} from '../protocol';

type ReceiveHandler = (data: Uint8Array) => void;

export interface WorkerTransportConfig {
	/** The MessagePort or Worker to communicate through */
	port: MessagePort | Worker;
	/** Document ID for routing */
	docId: string;
	/** Server URL for WebSocket connection (empty string for local-only) */
	serverUrl: string;
}

/**
 * WorkerTransport - Transport using SharedWorker/Worker for CRDT sync.
 *
 * This transport wraps communication with a SharedWorker or Worker,
 * adding docId to messages for multiplexing multiple documents over
 * a single worker connection.
 *
 * Message format sent to worker:
 * [messageType: u8, docIdLen: u16, docId: utf8, payload]
 *
 * The worker strips docId when forwarding to server, and adds it back
 * when forwarding server responses to the correct tab.
 *
 * All messages (including control messages like INITIAL_SYNC) are forwarded
 * to onReceive handlers. The consumer is responsible for interpreting them.
 *
 * Usage:
 * ```typescript
 * const worker = new SharedWorker('crdt.shared-worker.js');
 * const transport = new WorkerTransport({
 *   port: worker.port,
 *   docId: 'workflow-123',
 *   serverUrl: 'wss://server/crdt',
 * });
 *
 * transport.onReceive((data) => {
 *   // Handle all messages (sync, awareness, initial-sync, etc.)
 * });
 *
 * await transport.connect();
 * ```
 */
export class WorkerTransport implements SyncTransport {
	private receiveHandlers = new Set<ReceiveHandler>();
	private _connected = false;
	private messageHandler: ((event: MessageEvent) => void) | null = null;
	private connectPromise: Promise<void> | null = null;
	private connectResolve: (() => void) | null = null;

	private readonly port: MessagePort | Worker;
	private readonly docId: string;
	private readonly serverUrl: string;

	constructor(config: WorkerTransportConfig) {
		this.port = config.port;
		this.docId = config.docId;
		this.serverUrl = config.serverUrl;
	}

	get connected(): boolean {
		return this._connected;
	}

	send(data: Uint8Array): void {
		if (!this._connected) {
			throw new Error('Transport not connected');
		}

		// Add docId prefix for worker routing
		// Data is already in server format [type, payload], we need to inject docId
		const messageType = data[0];
		const payload = data.subarray(1);
		const message = encodeWithDocId(messageType, this.docId, payload);

		this.port.postMessage(message);
	}

	onReceive(handler: ReceiveHandler): Unsubscribe {
		this.receiveHandlers.add(handler);
		return () => {
			this.receiveHandlers.delete(handler);
		};
	}

	async connect(): Promise<void> {
		if (this._connected) {
			return await Promise.resolve();
		}

		if (this.connectPromise) {
			return await this.connectPromise;
		}

		this.connectPromise = new Promise<void>((resolve) => {
			this.connectResolve = resolve;

			// Set up message handler
			this.messageHandler = (event: MessageEvent<Uint8Array | ArrayBuffer>) => {
				const data: Uint8Array | ArrayBuffer = event.data;

				// Handle binary messages with docId
				if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
					const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
					this.handleBinaryMessage(bytes);
				}
			};

			this.port.addEventListener('message', this.messageHandler as EventListener);

			// Start the port if it's a MessagePort
			if ('start' in this.port) {
				this.port.start();
			}

			// Send subscribe message
			const subscribeMessage = encodeWithDocId(
				MESSAGE_SUBSCRIBE,
				this.docId,
				encodeString(this.serverUrl),
			);
			this.port.postMessage(subscribeMessage);
		});

		return await this.connectPromise;
	}

	disconnect(): void {
		if (!this._connected && !this.connectPromise) {
			return;
		}

		// Send unsubscribe message
		const unsubscribeMessage = encodeWithDocId(MESSAGE_UNSUBSCRIBE, this.docId);
		this.port.postMessage(unsubscribeMessage);

		// Clean up
		if (this.messageHandler) {
			this.port.removeEventListener('message', this.messageHandler as EventListener);
			this.messageHandler = null;
		}

		this._connected = false;
		this.connectPromise = null;
		this.connectResolve = null;
	}

	/** No-op for WorkerTransport - connection state changes are handled via protocol messages */
	onConnectionChange(_handler: (connected: boolean) => void): Unsubscribe {
		return () => {};
	}

	/** No-op for WorkerTransport - no transport-level errors occur */
	onError(_handler: (error: Error) => void): Unsubscribe {
		return () => {};
	}

	private handleBinaryMessage(data: Uint8Array): void {
		try {
			const { messageType, docId, payload } = decodeWithDocId(data);

			// Only process messages for our document
			if (docId !== this.docId) {
				return;
			}

			// Handle connection state internally
			if (messageType === MESSAGE_CONNECTED) {
				this._connected = true;
			} else if (messageType === MESSAGE_DISCONNECTED) {
				this._connected = false;
			}

			// Resolve connect promise on initial sync (transport is ready)
			if (messageType === MESSAGE_INITIAL_SYNC && this.connectResolve) {
				this._connected = true;
				this.connectResolve();
				this.connectResolve = null;
			}

			// Forward ALL messages to handlers (including control messages)
			// Reconstruct server format [type, payload] for handlers
			const serverFormat = new Uint8Array(1 + payload.length);
			serverFormat[0] = messageType;
			serverFormat.set(payload, 1);

			for (const handler of this.receiveHandlers) {
				handler(serverFormat);
			}
		} catch {
			// Ignore malformed messages
		}
	}
}
