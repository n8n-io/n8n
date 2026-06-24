import type { CrdtConnection } from '../crdt-room';
import { CrdtRoomManager } from '../crdt-room-manager';

const noopConnection = (): CrdtConnection => ({ send: () => {} });

describe('CrdtRoomManager', () => {
	let manager: CrdtRoomManager;

	beforeEach(() => {
		manager = new CrdtRoomManager();
	});

	it('returns the same room for a given document id', () => {
		const room = manager.getOrCreate('doc-1');
		expect(manager.getOrCreate('doc-1')).toBe(room);
		expect(manager.getOrCreate('doc-2')).not.toBe(room);
		expect(manager.roomCount).toBe(2);
	});

	it('drops a room once its last connection leaves', () => {
		const room = manager.getOrCreate('doc-1');
		const connectionA = noopConnection();
		const connectionB = noopConnection();
		room.addConnection(connectionA);
		room.addConnection(connectionB);

		manager.removeConnection('doc-1', connectionA);
		expect(manager.roomCount).toBe(1);

		manager.removeConnection('doc-1', connectionB);
		expect(manager.roomCount).toBe(0);

		// A fresh room is created on the next connection.
		expect(manager.getOrCreate('doc-1')).not.toBe(room);
	});

	it('tolerates removing a connection from an unknown room', () => {
		expect(() => manager.removeConnection('missing', noopConnection())).not.toThrow();
	});
});
