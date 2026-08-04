import type { Unsubscribe } from '../types';
import type { SyncTransport } from './types';

type ReceiveHandler = (data: Uint8Array) => void;

/**
 * Message types for MessagePort communication.
 * Using a discriminated union to allow future message types.
 */
interface SyncMessage {
	type: 'sync';
	data: Uint8Array;
}

type PortMessage = SyncMessage;

/**
 * Type guard to validate incoming MessagePort messages
 */
function isPortMessage(data: unknown): data is PortMessage {
	return (
		typeof data === 'object' &&
		data !== null &&
		'type' in data &&
		(data as { type: unknown }).type === 'sync'
	);
}

/**
 * MessagePortTransport - Transport using MessagePort for SharedWorker/Worker communication.
 *
 * This transport wraps a MessagePort (from SharedWorker, Worker, or MessageChannel)
 * to implement the SyncTransport interface. It's engine-agnostic - the sync protocol
 * is handled by SyncProvider.
 *
 * Usage with SharedWorker:
 * ```typescript
 * // In main thread
 * const worker = new SharedWorker('worker.js');
 * const transport = new MessagePortTransport(worker.port);
 *
 * // In SharedWorker
 * self.onconnect = (e) => {
 *   const port = e.ports[0];
 *   const transport = new MessagePortTransport(port);
 * };
 * ```
 *
 * Usage with MessageChannel (for testing or iframe communication):
 * ```typescript
 * const channel = new MessageChannel();
 * const transport1 = new MessagePortTransport(channel.port1);
 * const transport2 = new MessagePortTransport(channel.port2);
 * ```
 */
export class MessagePortTransport implements SyncTransport {
	private receiveHandlers = new Set<ReceiveHandler>();
	private _connected = false;
	private messageHandler: ((event: MessageEvent) => void) | null = null;

	constructor(private readonly port: MessagePort) {}

	get connected(): boolean {
		return this._connected;
	}

	send(data: Uint8Array): void {
		if (!this._connected) {
			throw new Error('Transport not connected');
		}

		// Copy the data to avoid transferring ownership of the original buffer.
		// This is necessary because the caller may send the same data to multiple
		// transports (e.g., hub-and-spoke topology in SharedWorker).
		const copy = new Uint8Array(data);
		const message: SyncMessage = { type: 'sync', data: copy };

		// Transfer the copy's ArrayBuffer for zero-copy delivery to the receiver
		this.port.postMessage(message, [copy.buffer]);
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

		this.messageHandler = (event: MessageEvent) => {
			if (!isPortMessage(event.data)) return;
			const message = event.data;

			if (message.type === 'sync') {
				// Ensure we have a Uint8Array (may be transferred as ArrayBuffer)
				const data =
					message.data instanceof Uint8Array ? message.data : new Uint8Array(message.data);

				for (const handler of this.receiveHandlers) {
					handler(data);
				}
			}
		};

		this.port.addEventListener('message', this.messageHandler);
		this.port.start(); // Required for MessagePort to begin receiving messages
		this._connected = true;
		return await Promise.resolve();
	}

	disconnect(): void {
		if (!this._connected) {
			return;
		}

		if (this.messageHandler) {
			this.port.removeEventListener('message', this.messageHandler);
			this.messageHandler = null;
		}

		this._connected = false;
		// Note: We don't close the port here as it may be reused
	}

	/** No-op for MessagePortTransport - connection state doesn't change unexpectedly */
	onConnectionChange(_handler: (connected: boolean) => void): Unsubscribe {
		return () => {};
	}

	/** No-op for MessagePortTransport - no transport-level errors occur */
	onError(_handler: (error: Error) => void): Unsubscribe {
		return () => {};
	}
}
