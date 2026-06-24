import {
	decodeMessage,
	encodeMessage,
	SYNC_AWARENESS,
	SYNC_STEP1,
	SYNC_STEP2,
	SYNC_UPDATE,
} from '@n8n/crdt';
import {
	applyAwarenessUpdate,
	Awareness,
	encodeAwarenessUpdate,
	removeAwarenessStates,
} from 'y-protocols/awareness';
import * as Y from 'yjs';

/**
 * A single peer connected to a room. The transport (a WebSocket) is wrapped so
 * the room logic stays transport-agnostic and unit-testable.
 */
export interface CrdtConnection {
	/** Send a single framed binary message to this connection. */
	send(data: Uint8Array): void;
}

interface AwarenessChange {
	added: number[];
	updated: number[];
	removed: number[];
}

/** Origin tag for awareness states the room itself retracts (vs. peer updates). */
const ROOM_ORIGIN = Symbol('crdt-room');

/**
 * Authoritative in-memory CRDT document shared by every peer editing the same
 * workflow document. The room merges all edits into one {@link Y.Doc} and
 * relays them to the other peers, so a late joiner catches up to the current
 * state and ongoing edits converge across browsers and users.
 *
 * Both peers speak the document-sync sub-protocol from `@n8n/crdt`
 * ({@link SYNC_STEP1}/{@link SYNC_STEP2}/{@link SYNC_UPDATE}), with ephemeral
 * presence ({@link SYNC_AWARENESS}) multiplexed on the same channel. The room
 * is purely a relay — it never persists; saving stays the client's job via the
 * regular workflow update endpoint.
 */
export class CrdtRoom {
	private readonly doc = new Y.Doc();

	private readonly awareness = new Awareness(this.doc);

	private readonly connections = new Set<CrdtConnection>();

	/**
	 * Awareness client ids announced by each connection, so the room can retract
	 * exactly that connection's presence when it disconnects.
	 */
	private readonly awarenessClientsByConnection = new Map<CrdtConnection, Set<number>>();

	/** Set by the doc `update` listener; read right after each `applyUpdate`. */
	private lastUpdateChangedDoc = false;

	constructor(readonly docId: string) {
		// The room is a relay, not an editor — it has no presence of its own.
		this.awareness.setLocalState(null);
		this.doc.on('update', this.onDocUpdate);
		this.awareness.on('update', this.onAwarenessUpdate);
	}

	get isEmpty(): boolean {
		return this.connections.size === 0;
	}

	get connectionCount(): number {
		return this.connections.size;
	}

	addConnection(connection: CrdtConnection): void {
		this.connections.add(connection);
		this.awarenessClientsByConnection.set(connection, new Set());

		// Send current presence so the joiner immediately sees existing
		// collaborators. Document sync is initiated by the client's SYNC_STEP1.
		const clients = [...this.awareness.getStates().keys()];
		if (clients.length > 0) {
			connection.send(
				encodeMessage(SYNC_AWARENESS, encodeAwarenessUpdate(this.awareness, clients)),
			);
		}
	}

	handleMessage(connection: CrdtConnection, data: Uint8Array): void {
		const { messageType, payload } = decodeMessage(data);

		switch (messageType) {
			case SYNC_STEP1:
				// Reply with the updates this peer is missing, then announce our own
				// state vector so the peer sends us anything we lack.
				connection.send(encodeMessage(SYNC_STEP2, Y.encodeStateAsUpdate(this.doc, payload)));
				connection.send(encodeMessage(SYNC_STEP1, Y.encodeStateVector(this.doc)));
				break;
			case SYNC_STEP2:
			case SYNC_UPDATE:
				this.applyAndRelayUpdate(connection, payload);
				break;
			case SYNC_AWARENESS:
				applyAwarenessUpdate(this.awareness, payload, connection);
				this.relay(connection, encodeMessage(SYNC_AWARENESS, payload));
				break;
			default:
				break;
		}
	}

	removeConnection(connection: CrdtConnection): void {
		this.connections.delete(connection);
		const clients = this.awarenessClientsByConnection.get(connection);
		this.awarenessClientsByConnection.delete(connection);

		if (clients && clients.size > 0) {
			const ids = [...clients];
			// Retract this connection's presence and relay the removal so the
			// remaining peers drop the disconnected collaborator's cursor.
			removeAwarenessStates(this.awareness, ids, ROOM_ORIGIN);
			this.broadcast(encodeMessage(SYNC_AWARENESS, encodeAwarenessUpdate(this.awareness, ids)));
		}
	}

	destroy(): void {
		this.doc.off('update', this.onDocUpdate);
		this.awareness.off('update', this.onAwarenessUpdate);
		this.awareness.destroy();
		this.doc.destroy();
		this.connections.clear();
		this.awarenessClientsByConnection.clear();
	}

	private applyAndRelayUpdate(origin: CrdtConnection, update: Uint8Array): void {
		this.lastUpdateChangedDoc = false;
		Y.applyUpdate(this.doc, update, origin);

		// Relay only updates that integrated new content. The shared mesh sync
		// provider re-emits every update it receives, so each peer echoes a
		// relayed update straight back; absorbing those redundant echoes here
		// keeps fan-out at O(peers) per edit instead of O(peers²).
		if (this.lastUpdateChangedDoc) {
			this.relay(origin, encodeMessage(SYNC_UPDATE, update));
		}
	}

	private readonly onDocUpdate = (): void => {
		this.lastUpdateChangedDoc = true;
	};

	private readonly onAwarenessUpdate = (change: AwarenessChange, origin: unknown): void => {
		// Track only presence announced by a peer connection; ignore the room's
		// own retractions (origin ROOM_ORIGIN).
		const clients = this.awarenessClientsByConnection.get(origin as CrdtConnection);
		if (!clients) return;
		for (const id of change.added) clients.add(id);
		for (const id of change.updated) clients.add(id);
		for (const id of change.removed) clients.delete(id);
	};

	private relay(except: CrdtConnection, data: Uint8Array): void {
		for (const connection of this.connections) {
			if (connection !== except) this.safeSend(connection, data);
		}
	}

	private broadcast(data: Uint8Array): void {
		for (const connection of this.connections) {
			this.safeSend(connection, data);
		}
	}

	private safeSend(connection: CrdtConnection, data: Uint8Array): void {
		try {
			connection.send(data);
		} catch {
			// A peer's socket may close mid-relay; dropping its send must not stop
			// delivery to the others. The close handler removes it from the room.
		}
	}
}
