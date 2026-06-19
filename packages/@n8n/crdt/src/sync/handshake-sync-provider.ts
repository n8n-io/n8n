import { decodeMessage, encodeMessage } from '../protocol';
import type { SyncTransport } from '../transports';
import type { CRDTDoc, Unsubscribe } from '../types';
import type { SyncProvider } from './types';

type SyncStateHandler = (syncing: boolean) => void;
type ErrorHandler = (error: Error) => void;

/**
 * Sync sub-message types, framed as `[type, ...payload]` over the transport.
 * Modeled on the y-protocols sync flow.
 */
/** Announce our state vector so the peer can send what we're missing. */
const SYNC_STEP1 = 0;
/** Reply with the updates a peer is missing (diff for its state vector). */
const SYNC_STEP2 = 1;
/** An incremental document update. */
const SYNC_UPDATE = 2;
/**
 * Like SYNC_STEP1 but sent in reply to a peer's SYNC_STEP1, so the peer sends us
 * anything WE'RE missing. A distinct type so a reply is never itself replied to —
 * that's what terminates the exchange (request → reply → diff, no STEP1 ping-pong).
 */
const SYNC_STEP1_REPLY = 3;

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

		// Kick off the handshake: tell peers what we already have so they can
		// send us anything we're missing.
		this.transport.send(encodeMessage(SYNC_STEP1, this.doc.encodeStateVector()));

		this._syncing = true;
		this.notifyStateChange();
	}

	stop(): void {
		if (!this._syncing) return;

		this.unsubscribeDoc?.();
		this.unsubscribeDoc = null;
		this.unsubscribeTransport?.();
		this.unsubscribeTransport = null;

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
					// A peer announced its state vector on connect — reply with the diff
					// it lacks, then reciprocate so it sends us anything WE'RE missing.
					// (Its connect-time STEP1 never reached peers already present, so
					// reciprocating is how we pull in a late joiner's pre-connect state.)
					// Replying per incoming request — not once globally — is what makes
					// this correct for sessions with more than two peers.
					this.transport.send(encodeMessage(SYNC_STEP2, this.doc.encodeStateFrom(payload)));
					this.transport.send(encodeMessage(SYNC_STEP1_REPLY, this.doc.encodeStateVector()));
					break;
				}
				case SYNC_STEP1_REPLY: {
					if (!this.transport.connected) break;
					// Reciprocation from a peer — answer with the diff it lacks. A reply
					// is never itself reciprocated, which terminates the handshake
					// (request → reply → diff) instead of ping-ponging STEP1s forever.
					this.transport.send(encodeMessage(SYNC_STEP2, this.doc.encodeStateFrom(payload)));
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
