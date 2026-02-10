import type { Unsubscribe } from '../types';

/**
 * Transport interface for moving binary data between CRDT documents.
 * Transports are "dumb pipes" - they just move Uint8Array bytes without
 * understanding the content. The sync protocol logic lives in SyncProvider.
 */
export interface SyncTransport {
	/** Send binary data to the peer */
	send(data: Uint8Array): void;

	/** Subscribe to incoming data from the peer */
	onReceive(handler: (data: Uint8Array) => void): Unsubscribe;

	/** Establish connection to the peer */
	connect(): Promise<void>;

	/** Close the connection */
	disconnect(): void;

	/** Whether currently connected */
	readonly connected: boolean;

	/** Subscribe to connection state changes */
	onConnectionChange(handler: (connected: boolean) => void): Unsubscribe;

	/** Subscribe to transport-level errors (e.g., connection failures) */
	onError(handler: (error: Error) => void): Unsubscribe;
}
