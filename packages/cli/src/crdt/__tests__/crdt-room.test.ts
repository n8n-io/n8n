import {
	decodeMessage,
	encodeMessage,
	SYNC_AWARENESS,
	SYNC_STEP1,
	SYNC_STEP2,
	SYNC_UPDATE,
} from '@n8n/crdt';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import * as Y from 'yjs';

import { CrdtRoom, type CrdtConnection } from '../crdt-room';

class FakeConnection implements CrdtConnection {
	readonly sent: Uint8Array[] = [];

	send(data: Uint8Array): void {
		// Copy: the room may reuse buffers, and tests decode lazily.
		this.sent.push(Uint8Array.from(data));
	}

	framesOfType(type: number) {
		return this.sent.map(decodeMessage).filter((frame) => frame.messageType === type);
	}
}

/** Build a SYNC_UPDATE frame carrying a client doc's full state. */
function updateFrame(doc: Y.Doc): Uint8Array {
	return encodeMessage(SYNC_UPDATE, Y.encodeStateAsUpdate(doc));
}

describe('CrdtRoom', () => {
	let room: CrdtRoom;

	beforeEach(() => {
		room = new CrdtRoom('doc-1');
	});

	afterEach(() => {
		room.destroy();
	});

	describe('document sync', () => {
		it('relays a document update to other peers but not back to the sender', () => {
			const connA = new FakeConnection();
			const connB = new FakeConnection();
			room.addConnection(connA);
			room.addConnection(connB);

			const clientA = new Y.Doc();
			clientA.getMap('nodes').set('node-1', { name: 'Set' });
			room.handleMessage(connA, updateFrame(clientA));

			expect(connA.framesOfType(SYNC_UPDATE)).toHaveLength(0);
			const relayed = connB.framesOfType(SYNC_UPDATE);
			expect(relayed).toHaveLength(1);

			// The relayed update converges a fresh peer to the same state.
			const clientB = new Y.Doc();
			Y.applyUpdate(clientB, relayed[0].payload);
			expect(clientB.getMap('nodes').get('node-1')).toEqual({ name: 'Set' });
		});

		it('absorbs redundant update echoes instead of re-relaying them', () => {
			const connA = new FakeConnection();
			const connB = new FakeConnection();
			room.addConnection(connA);
			room.addConnection(connB);

			const clientA = new Y.Doc();
			clientA.getMap('nodes').set('node-1', { name: 'Set' });
			const frame = updateFrame(clientA);

			room.handleMessage(connA, frame);
			room.handleMessage(connA, frame); // identical echo

			// Only the first (content-bearing) update is relayed.
			expect(connB.framesOfType(SYNC_UPDATE)).toHaveLength(1);
		});

		it('catches a late joiner up to the current state via the handshake', () => {
			const connA = new FakeConnection();
			room.addConnection(connA);

			const clientA = new Y.Doc();
			clientA.getMap('nodes').set('node-1', { name: 'Set' });
			room.handleMessage(connA, updateFrame(clientA));

			// A new peer announces an empty state vector and gets the diff back.
			const connB = new FakeConnection();
			room.addConnection(connB);
			const clientB = new Y.Doc();
			room.handleMessage(connB, encodeMessage(SYNC_STEP1, Y.encodeStateVector(clientB)));

			const step2 = connB.framesOfType(SYNC_STEP2);
			expect(step2).toHaveLength(1);
			expect(connB.framesOfType(SYNC_STEP1)).toHaveLength(1);

			Y.applyUpdate(clientB, step2[0].payload);
			expect(clientB.getMap('nodes').get('node-1')).toEqual({ name: 'Set' });
		});

		it('ignores unknown message types', () => {
			const connA = new FakeConnection();
			room.addConnection(connA);
			expect(() =>
				room.handleMessage(connA, encodeMessage(99, new Uint8Array([1, 2]))),
			).not.toThrow();
			expect(connA.sent).toHaveLength(0);
		});
	});

	describe('awareness', () => {
		it('sends current presence to a joiner and relays presence to peers', () => {
			const connA = new FakeConnection();
			room.addConnection(connA);

			const awarenessA = new Awareness(new Y.Doc());
			awarenessA.setLocalState({ user: { id: 'u1', name: 'Alice' } });
			room.handleMessage(
				connA,
				encodeMessage(SYNC_AWARENESS, encodeAwarenessUpdate(awarenessA, [awarenessA.clientID])),
			);

			// A later joiner immediately receives the existing presence.
			const connB = new FakeConnection();
			room.addConnection(connB);
			const initialPresence = connB.framesOfType(SYNC_AWARENESS);
			expect(initialPresence).toHaveLength(1);

			const awarenessB = new Awareness(new Y.Doc());
			applyAwarenessUpdate(awarenessB, initialPresence[0].payload, 'test');
			expect(awarenessB.getStates().get(awarenessA.clientID)).toEqual({
				user: { id: 'u1', name: 'Alice' },
			});
		});

		it('retracts a disconnected peer’s presence', () => {
			const connA = new FakeConnection();
			const connB = new FakeConnection();
			room.addConnection(connA);
			room.addConnection(connB);

			const awarenessA = new Awareness(new Y.Doc());
			awarenessA.setLocalState({ user: { id: 'u1', name: 'Alice' } });
			room.handleMessage(
				connA,
				encodeMessage(SYNC_AWARENESS, encodeAwarenessUpdate(awarenessA, [awarenessA.clientID])),
			);

			// Mirror A's presence onto a peer awareness instance.
			const awarenessB = new Awareness(new Y.Doc());
			for (const frame of connB.framesOfType(SYNC_AWARENESS)) {
				applyAwarenessUpdate(awarenessB, frame.payload, 'test');
			}
			expect(awarenessB.getStates().has(awarenessA.clientID)).toBe(true);

			room.removeConnection(connA);

			const removal = connB.framesOfType(SYNC_AWARENESS).at(-1);
			expect(removal).toBeDefined();
			applyAwarenessUpdate(awarenessB, removal!.payload, 'test');
			expect(awarenessB.getStates().has(awarenessA.clientID)).toBe(false);
		});
	});
});
