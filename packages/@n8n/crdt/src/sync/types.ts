import type { CRDTDoc, Unsubscribe } from '../types';
import type { SyncTransport } from '../transports';

/**
 * SyncProvider - Wires a CRDTDoc to a SyncTransport for synchronization.
 *
 * Responsibilities:
 * - On connect: send initial state to peer
 * - On local change: send update via transport
 * - On remote data: apply update to doc
 * - Handle connect/disconnect lifecycle
 */
export interface SyncProvider {
	/** The document being synchronized */
	readonly doc: CRDTDoc;

	/** The transport used for communication */
	readonly transport: SyncTransport;

	/** Whether sync is currently active */
	readonly syncing: boolean;

	/** Start synchronization - connects transport and begins sync */
	start(): Promise<void>;

	/** Stop synchronization - disconnects and cleans up */
	stop(): void;

	/** Subscribe to sync state changes */
	onSyncStateChange(handler: (syncing: boolean) => void): Unsubscribe;
}

/**
 * Factory function type for creating SyncProviders.
 */
export type CreateSyncProvider = (doc: CRDTDoc, transport: SyncTransport) => SyncProvider;
