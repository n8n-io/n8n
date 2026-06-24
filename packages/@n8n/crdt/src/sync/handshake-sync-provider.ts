import { decodeMessage, encodeMessage, SYNC_STEP1, SYNC_STEP2, SYNC_UPDATE } from '../protocol';
import type { SyncTransport } from '../transports';
import type { CRDTDoc, Unsubscribe } from '../types';
import type { SyncProvider } from './types';

type SyncStateHandler = (syncing: boolean) => void;
type ErrorHandler = (error: Error) => void;

/**
 * HandshakeSyncProvider - sync provider with a state-vector handshake.
 *
 * Unlike {@link BaseSyncProvider} (which only blindly sends its full state on
 * connect), this performs a SyncStep1/SyncStep2 exchange: on connect each peer
 * announces its state vector, and peers reply with exactly the updates the
 * requester lacks. This lets a peer that joins *after* edits were made catch up
 * to the current state — the late-join case BaseSyncProvider misses.
 *
 * Designed for broadcast/mesh transports (e.g. BroadcastChannel across tabs)
 * where every peer receives every message; incremental updates are relayed to
 * all peers and de-duplicated by the CRDT (applying a known update is a no-op).
 */
export class HandshakeSyncProvider implements SyncProvider {
	private _syncing = false;
	private stateHandlers = new Set<SyncStateHandler>();
	private errorHandlers = new Set<ErrorHandler>();
	private unsubscribeDoc: Unsubscribe | null = null;
	private unsubscribeTransport: Unsubscribe | null = null;
	private unsubscribeConnection: Unsubscribe | null = null;
	// Whether we've already reciprocated a peer's handshake with our own STEP1.
	// Bounds the exchange to at most two STEP1s per peer (connect + one reply),
	// so it terminates instead of ping-ponging.
	private reciprocated = false;

	constructor(
		readonly doc: CRDTDoc,
		readonly transport: SyncTransport,
	) {}

	get syncing(): boolean {
		return this._syncing;
	}

	async start(): Promise<void> {
		if (this._syncing) return;

		await this.transport.connect();

		this.unsubscribeTransport = this.transport.onReceive((data) => this.handleMessage(data));

		// Relay local document updates to peers.
		this.unsubscribeDoc = this.doc.onUpdate((update) => {
			if (this.transport.connected) {
				this.transport.send(encodeMessage(SYNC_UPDATE, update));
			}
		});

		// Re-run the handshake whenever the transport (re)connects. A transport
		// that auto-reconnects (e.g. WebSocketTransport) does so without calling
		// start()/stop(), so without this a reconnecting peer would only emit
		// future deltas and never re-seed from — nor catch up to — the peer it
		// reconnected to (which, for a server relay, may be a freshly recreated
		// empty room). The initial connection already fired before this
		// subscription, so it only triggers on subsequent reconnects.
		this.unsubscribeConnection = this.transport.onConnectionChange((connected) => {
			if (connected) this.sendStep1();
		});

		// Kick off the handshake: tell peers what we already have so they can
		// send us anything we're missing.
		this.sendStep1();

		this._syncing = true;
		this.notifyStateChange();
	}

	/**
	 * Announce our state vector so the peer sends what we're missing, and reset
	 * the reciprocation guard so a reconnect runs a fresh, terminating exchange.
	 */
	private sendStep1(): void {
		if (!this.transport.connected) return;
		this.reciprocated = false;
		this.transport.send(encodeMessage(SYNC_STEP1, this.doc.encodeStateVector()));
	}

	stop(): void {
		if (!this._syncing) return;

		this.unsubscribeDoc?.();
		this.unsubscribeDoc = null;
		this.unsubscribeTransport?.();
		this.unsubscribeTransport = null;
		this.unsubscribeConnection?.();
		this.unsubscribeConnection = null;
		this.reciprocated = false;

		this.transport.disconnect();

		this._syncing = false;
		this.notifyStateChange();
	}

	onSyncStateChange(handler: SyncStateHandler): Unsubscribe {
		this.stateHandlers.add(handler);
		return () => this.stateHandlers.delete(handler);
	}

	onError(handler: ErrorHandler): Unsubscribe {
		this.errorHandlers.add(handler);
		return () => this.errorHandlers.delete(handler);
	}

	private handleMessage(data: Uint8Array): void {
		try {
			const { messageType, payload } = decodeMessage(data);
			switch (messageType) {
				case SYNC_STEP1: {
					if (!this.transport.connected) break;
					// A peer announced its state vector — reply with the diff it lacks.
					this.transport.send(encodeMessage(SYNC_STEP2, this.doc.encodeStateFrom(payload)));
					// Reciprocate once so the peer sends us anything WE'RE missing. A
					// peer's connect-time STEP1 is lost to peers that join later, so
					// this is how an already-present peer requests a late joiner's
					// pre-connect state. Guarded to terminate the exchange.
					if (!this.reciprocated) {
						this.reciprocated = true;
						this.transport.send(encodeMessage(SYNC_STEP1, this.doc.encodeStateVector()));
					}
					break;
				}
				case SYNC_STEP2: {
					this.doc.applyUpdate(payload);
					// We have now caught up to a peer's state.
					this.doc.setSynced(true);
					break;
				}
				case SYNC_UPDATE: {
					this.doc.applyUpdate(payload);
					break;
				}
				default:
					break;
			}
		} catch (error) {
			this.notifyError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	private notifyStateChange(): void {
		for (const handler of this.stateHandlers) {
			handler(this._syncing);
		}
	}

	private notifyError(error: Error): void {
		for (const handler of this.errorHandlers) {
			handler(error);
		}
	}
}

/**
 * Create a {@link HandshakeSyncProvider} for any CRDTDoc.
 */
export function createHandshakeSyncProvider(doc: CRDTDoc, transport: SyncTransport): SyncProvider {
	return new HandshakeSyncProvider(doc, transport);
}
