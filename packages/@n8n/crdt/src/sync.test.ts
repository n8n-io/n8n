import { CRDTEngine, createCRDTProvider } from './index';
import type { CRDTDoc, CRDTMap } from './types';

/**
 * Sync conformance tests - verify that two docs can sync manually
 * by exchanging encoded states and updates.
 */
describe.each([CRDTEngine.yjs, CRDTEngine.automerge])('Sync Conformance: %s', (engine) => {
	let doc1: CRDTDoc;
	let doc2: CRDTDoc;
	let map1: CRDTMap<unknown>;
	let map2: CRDTMap<unknown>;

	beforeEach(() => {
		const provider = createCRDTProvider({ engine });
		doc1 = provider.createDoc('doc-1');
		doc2 = provider.createDoc('doc-2');
		map1 = doc1.getMap('data');
		map2 = doc2.getMap('data');
	});

	afterEach(() => {
		doc1.destroy();
		doc2.destroy();
	});

	describe('Manual Sync via encodeState/applyUpdate', () => {
		it('should sync doc1 changes to doc2', () => {
			map1.set('key', 'from-doc1');

			const update = doc1.encodeState();
			doc2.applyUpdate(update);

			expect(map2.get('key')).toBe('from-doc1');
		});

		it('should sync doc2 changes to doc1', () => {
			map2.set('key', 'from-doc2');

			const update = doc2.encodeState();
			doc1.applyUpdate(update);

			expect(map1.get('key')).toBe('from-doc2');
		});

		it('should merge concurrent changes after initial sync', () => {
			// Realistic collaborative pattern: one peer creates the doc,
			// others join via initial sync, then concurrent edits merge correctly
			map1.set('created', 'doc1');
			doc2.applyUpdate(doc1.encodeState());

			// Both peers make concurrent changes
			map1.set('key1', 'value1');
			map2.set('key2', 'value2');

			// Exchange updates
			doc2.applyUpdate(doc1.encodeState());
			doc1.applyUpdate(doc2.encodeState());

			// Both docs should have all keys
			expect(map1.get('created')).toBe('doc1');
			expect(map1.get('key1')).toBe('value1');
			expect(map1.get('key2')).toBe('value2');
			expect(map2.get('created')).toBe('doc1');
			expect(map2.get('key1')).toBe('value1');
			expect(map2.get('key2')).toBe('value2');
		});

		it('should handle conflict on same key (both converge to same value)', () => {
			// Both docs set the same key to different values
			map1.set('conflict', 'A');
			map2.set('conflict', 'B');

			// Exchange updates
			const update1 = doc1.encodeState();
			const update2 = doc2.encodeState();

			doc2.applyUpdate(update1);
			doc1.applyUpdate(update2);

			// Both should converge to the same value (winner determined by CRDT)
			const value1 = map1.get('conflict');
			const value2 = map2.get('conflict');
			expect(value1).toBe(value2);
			// The value should be one of the two
			expect(['A', 'B']).toContain(value1);
		});

		it('should sync nested object changes', () => {
			map1.set('node', { position: { x: 100, y: 200 } });

			const update = doc1.encodeState();
			doc2.applyUpdate(update);

			const node = map2.toJSON().node as { position: { x: number; y: number } };
			expect(node.position.x).toBe(100);
			expect(node.position.y).toBe(200);
		});

		it('should sync incremental nested changes', () => {
			// Initial setup
			map1.set('node', { position: { x: 100, y: 200 } });
			doc2.applyUpdate(doc1.encodeState());

			// Make nested change via CRDTMap API
			const node1 = map1.get('node') as CRDTMap<unknown>;
			const pos1 = node1.get('position') as CRDTMap<unknown>;
			pos1.set('x', 150);

			// Sync
			doc2.applyUpdate(doc1.encodeState());

			const node2 = map2.toJSON().node as { position: { x: number; y: number } };
			expect(node2.position.x).toBe(150);
			expect(node2.position.y).toBe(200);
		});
	});

	describe('Bidirectional Sync via onUpdate', () => {
		it('should sync changes in real-time using onUpdate', () => {
			// Set up bidirectional sync
			doc1.onUpdate((update) => doc2.applyUpdate(update));
			doc2.onUpdate((update) => doc1.applyUpdate(update));

			// Change in doc1
			map1.set('fromDoc1', 'hello');
			expect(map2.get('fromDoc1')).toBe('hello');

			// Change in doc2
			map2.set('fromDoc2', 'world');
			expect(map1.get('fromDoc2')).toBe('world');
		});

		it('should handle rapid sequential changes', () => {
			// Set up bidirectional sync
			doc1.onUpdate((update) => doc2.applyUpdate(update));
			doc2.onUpdate((update) => doc1.applyUpdate(update));

			// Multiple rapid changes
			map1.set('a', 1);
			map1.set('b', 2);
			map1.set('c', 3);
			map2.set('d', 4);
			map2.set('e', 5);

			expect(map1.toJSON()).toEqual({ a: 1, b: 2, c: 3, d: 4, e: 5 });
			expect(map2.toJSON()).toEqual({ a: 1, b: 2, c: 3, d: 4, e: 5 });
		});

		it('should handle transacted changes', () => {
			// Set up bidirectional sync
			doc1.onUpdate((update) => doc2.applyUpdate(update));
			doc2.onUpdate((update) => doc1.applyUpdate(update));

			// Batch changes in transaction
			doc1.transact(() => {
				map1.set('a', 1);
				map1.set('b', 2);
				map1.set('c', 3);
			});

			expect(map2.toJSON()).toEqual({ a: 1, b: 2, c: 3 });
		});
	});

	describe('Offline/Reconnect Simulation', () => {
		it('should sync after offline changes', () => {
			// Initial sync
			map1.set('initial', 'value');
			doc2.applyUpdate(doc1.encodeState());

			// Simulate offline - make changes without syncing
			map1.set('offline1', 'from-doc1');
			map2.set('offline2', 'from-doc2');

			// Simulate reconnect - exchange states
			const state1 = doc1.encodeState();
			const state2 = doc2.encodeState();
			doc2.applyUpdate(state1);
			doc1.applyUpdate(state2);

			// Both should have all data
			expect(map1.toJSON()).toEqual({
				initial: 'value',
				offline1: 'from-doc1',
				offline2: 'from-doc2',
			});
			expect(map2.toJSON()).toEqual({
				initial: 'value',
				offline1: 'from-doc1',
				offline2: 'from-doc2',
			});
		});

		it('should resolve conflicts after offline changes to same key', () => {
			// Initial sync
			map1.set('shared', 'initial');
			doc2.applyUpdate(doc1.encodeState());

			// Both modify same key while offline
			map1.set('shared', 'doc1-version');
			map2.set('shared', 'doc2-version');

			// Reconnect
			const state1 = doc1.encodeState();
			const state2 = doc2.encodeState();
			doc2.applyUpdate(state1);
			doc1.applyUpdate(state2);

			// Both converge to same value
			expect(map1.get('shared')).toBe(map2.get('shared'));
		});
	});
});
