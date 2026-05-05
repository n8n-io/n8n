import type { Unsubscribe } from '../types';
import type { SyncTransport } from './types';

type ReceiveHandler = (data: Uint8Array) => void;

/**
 * MockTransport - In-memory transport for testing sync flows.
 *
 * Two MockTransports can be linked together to simulate a bidirectional
 * connection. Data sent on one transport is received by the other.
 *
 * **TESTING ONLY:** Data delivery is synchronous for deterministic tests.
 * Real transports (WebSocket, SharedWorker) will deliver asynchronously.
 * Code that relies on synchronous delivery may have race conditions in production.
 */
export class MockTransport implements SyncTransport {
	private peer: MockTransport | null = null;
	private receiveHandlers = new Set<ReceiveHandler>();
	private _connected = false;

	get connected(): boolean {
		return this._connected;
	}

	/**
	 * Link two transports together for bidirectional communication.
	 */
	static link(a: MockTransport, b: MockTransport): void {
		a.peer = b;
		b.peer = a;
	}

	send(data: Uint8Array): void {
		if (!this._connected) {
			throw new Error('Transport not connected');
		}
		if (!this.peer) {
			throw new Error('Transport has no peer');
		}
		// Simulate async delivery (but synchronous for deterministic tests)
		this.peer.deliver(data);
	}

	onReceive(handler: ReceiveHandler): Unsubscribe {
		this.receiveHandlers.add(handler);
		return () => {
			this.receiveHandlers.delete(handler);
		};
	}

	async connect(): Promise<void> {
		this._connected = true;
		return await Promise.resolve();
	}

	disconnect(): void {
		this._connected = false;
	}

	/** No-op for MockTransport - connection state doesn't change unexpectedly */
	onConnectionChange(_handler: (connected: boolean) => void): Unsubscribe {
		return () => {};
	}

	/** No-op for MockTransport - no transport-level errors occur */
	onError(_handler: (error: Error) => void): Unsubscribe {
		return () => {};
	}

	/**
	 * Deliver data to all receive handlers (called by peer).
	 */
	private deliver(data: Uint8Array): void {
		for (const handler of this.receiveHandlers) {
			handler(data);
		}
	}
}
