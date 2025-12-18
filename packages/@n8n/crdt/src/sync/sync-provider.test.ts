import { CRDTEngine, createCRDTProvider } from '../index';
import { MockTransport } from '../transports';
import type { CRDTDoc, CRDTMap } from '../types';
import { createSyncProvider } from './base-sync-provider';
import type { SyncProvider } from './types';

/**
 * SyncProvider tests - verify sync via transport works for both engines.
 */
describe.each([CRDTEngine.yjs, CRDTEngine.automerge])('SyncProvider Conformance: %s', (engine) => {
	let doc1: CRDTDoc;
	let doc2: CRDTDoc;
	let map1: CRDTMap<unknown>;
	let map2: CRDTMap<unknown>;
	let transport1: MockTransport;
	let transport2: MockTransport;
	let sync1: SyncProvider;
	let sync2: SyncProvider;

	beforeEach(() => {
		const provider = createCRDTProvider({ engine });
		doc1 = provider.createDoc('doc-1');
		doc2 = provider.createDoc('doc-2');
		map1 = doc1.getMap('data');
		map2 = doc2.getMap('data');

		transport1 = new MockTransport();
		transport2 = new MockTransport();
		MockTransport.link(transport1, transport2);

		sync1 = createSyncProvider(doc1, transport1);
		sync2 = createSyncProvider(doc2, transport2);
	});

	afterEach(() => {
		sync1.stop();
		sync2.stop();
		doc1.destroy();
		doc2.destroy();
	});

	describe('Two-doc sync via transport', () => {
		it('should start in non-syncing state', () => {
			expect(sync1.syncing).toBe(false);
			expect(sync2.syncing).toBe(false);
		});

		it('should report syncing after start', async () => {
			await sync1.start();
			expect(sync1.syncing).toBe(true);
		});

		it('should report not syncing after stop', async () => {
			await sync1.start();
			sync1.stop();
			expect(sync1.syncing).toBe(false);
		});

		it('should sync initial state on connect', async () => {
			// Doc1 has data before sync starts
			map1.set('initial', 'from-doc1');

			// Start sync2 first (receiver), then sync1 (sender with data)
			// This simulates: new peer connects, then existing peer sends state
			await sync2.start();
			await sync1.start();

			// Doc2 should receive doc1's initial state
			expect(map2.get('initial')).toBe('from-doc1');
		});

		it('should sync changes after connect', async () => {
			await sync1.start();
			await sync2.start();

			// Change in doc1 should appear in doc2
			map1.set('key', 'value');
			expect(map2.get('key')).toBe('value');
		});

		it('should sync bidirectionally', async () => {
			await sync1.start();
			await sync2.start();

			map1.set('from1', 'hello');
			map2.set('from2', 'world');

			expect(map1.get('from2')).toBe('world');
			expect(map2.get('from1')).toBe('hello');
		});

		it('should sync nested objects', async () => {
			await sync1.start();
			await sync2.start();

			map1.set('node', { position: { x: 100, y: 200 } });

			const result = map2.toJSON();
			expect((result.node as { position: { x: number; y: number } }).position.x).toBe(100);
		});

		it('should stop syncing after stop()', async () => {
			await sync1.start();
			await sync2.start();

			map1.set('before', 'stop');
			expect(map2.get('before')).toBe('stop');

			sync1.stop();

			map1.set('after', 'stop');
			// Doc2 should NOT receive this since sync1 stopped
			expect(map2.get('after')).toBeUndefined();
		});

		it('should call onSyncStateChange handlers', async () => {
			const states: boolean[] = [];
			sync1.onSyncStateChange((syncing) => states.push(syncing));

			await sync1.start();
			sync1.stop();

			expect(states).toEqual([true, false]);
		});

		it('should unsubscribe from onSyncStateChange', async () => {
			const states: boolean[] = [];
			const unsubscribe = sync1.onSyncStateChange((syncing) => states.push(syncing));

			await sync1.start();
			unsubscribe();
			sync1.stop();

			expect(states).toEqual([true]); // Only got the start, not the stop
		});
	});
});
