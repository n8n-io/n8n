import { createCRDTProvider, CRDTEngine } from '../index';
import { MockTransport } from '../transports';
import type { CRDTDoc, CRDTMap } from '../types';
import { createHandshakeSyncProvider } from './handshake-sync-provider';
import type { SyncProvider } from './types';

describe('HandshakeSyncProvider', () => {
	let doc1: CRDTDoc;
	let doc2: CRDTDoc;
	let map1: CRDTMap<unknown>;
	let map2: CRDTMap<unknown>;
	let transport1: MockTransport;
	let transport2: MockTransport;
	let sync1: SyncProvider;
	let sync2: SyncProvider;

	beforeEach(() => {
		const provider = createCRDTProvider({ engine: CRDTEngine.yjs });
		doc1 = provider.createDoc('doc-1');
		doc2 = provider.createDoc('doc-2');
		map1 = doc1.getMap('data');
		map2 = doc2.getMap('data');

		transport1 = new MockTransport();
		transport2 = new MockTransport();
		MockTransport.link(transport1, transport2);

		sync1 = createHandshakeSyncProvider(doc1, transport1);
		sync2 = createHandshakeSyncProvider(doc2, transport2);
	});

	afterEach(() => {
		sync1.stop();
		sync2.stop();
		doc1.destroy();
		doc2.destroy();
	});

	it('catches up a peer that joins AFTER edits were made (late join)', async () => {
		// Peer 1 is already connected and makes edits before peer 2 exists.
		await sync1.start();
		map1.set('before-join', 'edit-1');
		map1.set('node', { x: 10 });

		// Peer 2 joins late — it must catch up to peer 1's current state.
		await sync2.start();

		expect(map2.get('before-join')).toBe('edit-1');
		expect(map2.toJSON().node).toEqual({ x: 10 });
	});

	it('syncs when the receiver connects before the sender (reciprocal handshake)', async () => {
		// Receiver (no data) connects first; sender (with data) connects second.
		map1.set('initial', 'from-doc1');

		await sync2.start();
		await sync1.start();

		expect(map2.get('initial')).toBe('from-doc1');
	});

	it('syncs changes made after both peers are connected', async () => {
		await sync1.start();
		await sync2.start();

		map1.set('key', 'value');
		expect(map2.get('key')).toBe('value');
	});

	it('syncs bidirectionally', async () => {
		await sync1.start();
		await sync2.start();

		map1.set('from1', 'hello');
		map2.set('from2', 'world');

		expect(map1.get('from2')).toBe('world');
		expect(map2.get('from1')).toBe('hello');
	});

	it('converges when both peers hold prior edits before connecting', async () => {
		await sync1.start();
		map1.set('onlyOn1', 'a');
		await sync2.start();
		// doc2 made an edit before its handshake reply lands back on doc1.
		map2.set('onlyOn2', 'b');

		expect(map1.toJSON()).toEqual({ onlyOn1: 'a', onlyOn2: 'b' });
		expect(map2.toJSON()).toEqual({ onlyOn1: 'a', onlyOn2: 'b' });
	});

	it('does not create an infinite sync loop', async () => {
		await sync1.start();
		await sync2.start();

		let updates1 = 0;
		let updates2 = 0;
		doc1.onUpdate(() => updates1++);
		doc2.onUpdate(() => updates2++);

		map1.set('key', 'value');

		expect(updates1).toBeLessThan(5);
		expect(updates2).toBeLessThan(5);
	});

	it('stops syncing after stop()', async () => {
		await sync1.start();
		await sync2.start();

		map1.set('before', 'stop');
		expect(map2.get('before')).toBe('stop');

		sync1.stop();
		expect(sync1.syncing).toBe(false);

		map1.set('after', 'stop');
		expect(map2.get('after')).toBeUndefined();
	});

	it('reports sync state changes', async () => {
		const states: boolean[] = [];
		sync1.onSyncStateChange((syncing) => states.push(syncing));

		await sync1.start();
		sync1.stop();

		expect(states).toEqual([true, false]);
	});

	it('reports errors on malformed messages and keeps syncing', async () => {
		await sync1.start();
		await sync2.start();

		const errors: Error[] = [];
		sync2.onError((error) => errors.push(error));

		// A SYNC_UPDATE (type byte 2) carrying garbage update bytes.
		transport1.send(new Uint8Array([2, 9, 9, 9, 9]));

		expect(errors.length).toBe(1);
		expect(sync2.syncing).toBe(true);

		map1.set('after-error', 'ok');
		expect(map2.get('after-error')).toBe('ok');
	});
});

describe('CRDTDoc.encodeStateFrom', () => {
	it('encodes only the updates a peer with the given state vector is missing', () => {
		const provider = createCRDTProvider({ engine: CRDTEngine.yjs });
		const source = provider.createDoc('source');
		const target = provider.createDoc('target');

		source.getMap('data').set('a', 1);
		target.applyUpdate(source.encodeState());
		// target now matches source; capture its vector, then source diverges.
		const targetVector = target.encodeStateVector();
		source.getMap('data').set('b', 2);

		const diff = source.encodeStateFrom(targetVector);
		target.applyUpdate(diff);

		expect(target.getMap('data').toJSON()).toEqual({ a: 1, b: 2 });
	});
});
