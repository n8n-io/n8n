import { Service } from '@n8n/di';

import { CrdtRoom, type CrdtConnection } from './crdt-room';

/**
 * Owns the live {@link CrdtRoom} instances, keyed by document id. A room is
 * created on the first connection for a document and dropped once its last
 * connection leaves — rooms are in-memory relays, so nothing is lost when an
 * empty room is discarded (the next client repopulates it from its own state).
 */
@Service()
export class CrdtRoomManager {
	private readonly rooms = new Map<string, CrdtRoom>();

	getOrCreate(docId: string): CrdtRoom {
		let room = this.rooms.get(docId);
		if (!room) {
			room = new CrdtRoom(docId);
			this.rooms.set(docId, room);
		}
		return room;
	}

	/** Remove a connection from its room, dropping the room once it is empty. */
	removeConnection(docId: string, connection: CrdtConnection): void {
		const room = this.rooms.get(docId);
		if (!room) return;

		room.removeConnection(connection);
		if (room.isEmpty) {
			room.destroy();
			this.rooms.delete(docId);
		}
	}

	get roomCount(): number {
		return this.rooms.size;
	}

	destroyAll(): void {
		for (const room of this.rooms.values()) room.destroy();
		this.rooms.clear();
	}
}
