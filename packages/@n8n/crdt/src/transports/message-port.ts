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

		const message: SyncMessage = { type: 'sync', data };

		// Transfer the ArrayBuffer for zero-copy performance
		// Note: This transfers ownership, so `data` becomes unusable after this call
		this.port.postMessage(message, [data.buffer]);
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
			const message = event.data as PortMessage;

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
}
