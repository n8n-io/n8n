import type { Unsubscribe } from '../types';
import type { SyncTransport } from './types';

type ReceiveHandler = (data: Uint8Array) => void;

/**
 * Message types for BroadcastChannel communication.
 */
interface SyncMessage {
	type: 'sync';
	data: number[]; // BroadcastChannel can't transfer Uint8Array directly, so we use number[]
	senderId: string;
}

type ChannelMessage = SyncMessage;

/**
 * BroadcastChannelTransport - Transport using BroadcastChannel for cross-tab sync.
 *
 * This transport uses the BroadcastChannel API to synchronize CRDT documents
 * across browser tabs. It's useful as a fallback when SharedWorker is not
 * available (e.g., Safari).
 *
 * **Note:** BroadcastChannel broadcasts to ALL tabs listening on the same channel,
 * including the sender. This transport filters out self-sent messages using a
 * unique sender ID.
 *
 * **Limitations:**
 * - Same-origin only (tabs must be on the same domain)
 * - No persistence - if all tabs close, data is lost
 * - Less efficient than SharedWorker for many tabs (each tab processes all messages)
 *
 * Usage:
 * ```typescript
 * // In each tab
 * const transport = new BroadcastChannelTransport('workflow-123');
 * const sync = createSyncProvider(doc, transport);
 * await sync.start();
 * ```
 */
export class BroadcastChannelTransport implements SyncTransport {
	private channel: BroadcastChannel | null = null;
	private receiveHandlers = new Set<ReceiveHandler>();
	private connectionChangeHandlers = new Set<(connected: boolean) => void>();
	private errorHandlers = new Set<(error: Error) => void>();
	private _connected = false;
	private readonly senderId: string;

	constructor(private readonly channelName: string) {
		// Generate unique ID for this instance to filter self-sent messages.
		// crypto.randomUUID() is available in all modern browsers and Node.js 14.17+
		this.senderId =
			typeof crypto !== 'undefined' && crypto.randomUUID
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	}

	get connected(): boolean {
		return this._connected;
	}

	send(data: Uint8Array): void {
		if (!this._connected || !this.channel) {
			throw new Error('Transport not connected');
		}

		const message: SyncMessage = {
			type: 'sync',
			data: Array.from(data), // Convert Uint8Array to number[] for BroadcastChannel
			senderId: this.senderId,
		};

		this.channel.postMessage(message);
	}

	onReceive(handler: ReceiveHandler): Unsubscribe {
		this.receiveHandlers.add(handler);
		return () => {
			this.receiveHandlers.delete(handler);
		};
	}

	onConnectionChange(handler: (connected: boolean) => void): Unsubscribe {
		this.connectionChangeHandlers.add(handler);
		return () => {
			this.connectionChangeHandlers.delete(handler);
		};
	}

	onError(handler: (error: Error) => void): Unsubscribe {
		this.errorHandlers.add(handler);
		return () => {
			this.errorHandlers.delete(handler);
		};
	}

	async connect(): Promise<void> {
		if (this._connected) {
			return await Promise.resolve();
		}

		this.channel = new BroadcastChannel(this.channelName);

		this.channel.onmessage = (event: MessageEvent) => {
			const message = event.data as ChannelMessage;

			// Ignore messages from self
			if (message.senderId === this.senderId) {
				return;
			}

			if (message.type === 'sync') {
				const data = new Uint8Array(message.data);
				for (const handler of this.receiveHandlers) {
					handler(data);
				}
			}
		};

		this.channel.onmessageerror = (event: MessageEvent) => {
			const error = new Error(`BroadcastChannel message error: ${String(event.data)}`);
			for (const handler of this.errorHandlers) {
				handler(error);
			}
		};

		this._connected = true;
		for (const handler of this.connectionChangeHandlers) {
			handler(true);
		}
		return await Promise.resolve();
	}

	disconnect(): void {
		if (!this._connected) {
			return;
		}

		if (this.channel) {
			this.channel.close();
			this.channel = null;
		}

		this._connected = false;
		for (const handler of this.connectionChangeHandlers) {
			handler(false);
		}
	}
}
