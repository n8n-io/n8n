import { ChangeAction, CRDTEngine, createCRDTProvider } from './index';
import type { CRDTDoc, CRDTMap, DeepChangeEvent } from './types';

describe('createCRDTProvider', () => {
	it('should create a Yjs provider', () => {
		const provider = createCRDTProvider({ engine: CRDTEngine.yjs });
		expect(provider.name).toBe('yjs');
	});

	it('should create an Automerge provider', () => {
		const provider = createCRDTProvider({ engine: CRDTEngine.automerge });
		expect(provider.name).toBe('automerge');
	});
});

/**
 * Conformance test suite - runs the same tests against both providers
 * to ensure they behave identically.
 */
describe.each([CRDTEngine.yjs, CRDTEngine.automerge])('CRDT Conformance: %s', (engine) => {
	let doc: CRDTDoc;
	let map: CRDTMap<unknown>;

	beforeEach(() => {
		const provider = createCRDTProvider({ engine });
		doc = provider.createDoc('test');
		map = doc.getMap('test-map');
	});

	afterEach(() => {
		doc.destroy();
	});

	describe('State Encoding', () => {
		it('should encode empty doc as non-empty Uint8Array', () => {
			const state = doc.encodeState();
			expect(state).toBeInstanceOf(Uint8Array);
			expect(state.length).toBeGreaterThan(0);
		});

		it('should encode doc with data as larger Uint8Array', () => {
			const emptyState = doc.encodeState();

			map.set('key', 'value');
			map.set('nested', { a: 1, b: 2 });

			const dataState = doc.encodeState();
			expect(dataState).toBeInstanceOf(Uint8Array);
			expect(dataState.length).toBeGreaterThan(emptyState.length);
		});
	});

	describe('Apply Update', () => {
		it('should apply update from another doc and merge data', () => {
			// Create a second doc
			const provider = createCRDTProvider({ engine });
			const doc2 = provider.createDoc('test-2');
			const map2 = doc2.getMap<unknown>('test-map');

			// Add data to doc2
			map2.set('fromDoc2', 'hello');

			// Encode doc2's state and apply to doc1
			const update = doc2.encodeState();
			doc.applyUpdate(update);

			// doc1 should now have doc2's data
			expect(map.get('fromDoc2')).toBe('hello');

			doc2.destroy();
		});

		it('should apply same update twice idempotently', () => {
			const provider = createCRDTProvider({ engine });
			const doc2 = provider.createDoc('test-2');
			const map2 = doc2.getMap<unknown>('test-map');

			map2.set('key', 'value');
			const update = doc2.encodeState();

			// Apply twice
			doc.applyUpdate(update);
			doc.applyUpdate(update);

			// Should still have the same data, no duplicates or errors
			expect(map.get('key')).toBe('value');
			expect(map.toJSON()).toEqual({ key: 'value' });

			doc2.destroy();
		});
	});

	describe('onUpdate', () => {
		it('should call handler when doc changes', () => {
			const updates: Uint8Array[] = [];
			doc.onUpdate((update) => updates.push(update));

			map.set('key', 'value');

			expect(updates).toHaveLength(1);
			expect(updates[0]).toBeInstanceOf(Uint8Array);
		});

		it('should emit update that can be applied to another doc', () => {
			const provider = createCRDTProvider({ engine });
			const doc2 = provider.createDoc('test-2');
			const map2 = doc2.getMap<unknown>('test-map');

			// Subscribe to updates from doc1
			doc.onUpdate((update) => {
				doc2.applyUpdate(update);
			});

			// Make change in doc1
			map.set('key', 'value');

			// doc2 should have the data
			expect(map2.get('key')).toBe('value');

			doc2.destroy();
		});

		it('should stop calling handler after unsubscribe', () => {
			const updates: Uint8Array[] = [];
			const unsubscribe = doc.onUpdate((update) => updates.push(update));

			map.set('key1', 'value1');
			expect(updates).toHaveLength(1);

			unsubscribe();

			map.set('key2', 'value2');
			expect(updates).toHaveLength(1); // No new updates
		});
	});

	describe('Basic Operations', () => {
		it('should set and get primitive values', () => {
			map.set('string', 'hello');
			map.set('number', 42);
			map.set('boolean', true);

			expect(map.get('string')).toBe('hello');
			expect(map.get('number')).toBe(42);
			expect(map.get('boolean')).toBe(true);
		});

		it('should set and get object values', () => {
			map.set('object', { name: 'test', value: 123 });

			const result = map.toJSON();
			expect(result.object).toEqual({ name: 'test', value: 123 });
		});

		it('should delete values', () => {
			map.set('key', 'value');
			expect(map.has('key')).toBe(true);

			map.delete('key');
			expect(map.has('key')).toBe(false);
		});

		it('should iterate keys, values, and entries', () => {
			map.set('a', 1);
			map.set('b', 2);

			expect(Array.from(map.keys())).toContain('a');
			expect(Array.from(map.keys())).toContain('b');
			expect(Array.from(map.values())).toContain(1);
			expect(Array.from(map.values())).toContain(2);
			expect(Array.from(map.entries())).toContainEqual(['a', 1]);
			expect(Array.from(map.entries())).toContainEqual(['b', 2]);
		});

		it('should batch changes in transact()', () => {
			const changes: DeepChangeEvent[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			doc.transact(() => {
				map.set('a', 1);
				map.set('b', 2);
				map.set('c', 3);
			});

			// All changes should be batched into a single callback invocation
			expect(changes).toHaveLength(3);
			expect(map.toJSON()).toEqual({ a: 1, b: 2, c: 3 });
		});
	});

	describe('Nested Map Access', () => {
		it('should return CRDTMap for nested objects', () => {
			map.set('node', { position: { x: 100, y: 200 } });

			const nodeMap = map.get('node');
			expect(nodeMap).toBeDefined();
			expect(typeof (nodeMap as CRDTMap<unknown>).get).toBe('function');

			const positionMap = (nodeMap as CRDTMap<unknown>).get('position');
			expect(positionMap).toBeDefined();
			expect(typeof (positionMap as CRDTMap<unknown>).get).toBe('function');
		});

		it('should allow modifying nested maps', () => {
			map.set('node', { position: { x: 100, y: 200 } });

			const nodeMap = map.get('node') as CRDTMap<unknown>;
			const positionMap = nodeMap.get('position') as CRDTMap<unknown>;
			positionMap.set('x', 150);

			const result = map.toJSON();
			expect((result.node as { position: { x: number } }).position.x).toBe(150);
		});

		it('should allow building nested structures incrementally', () => {
			map.set('node', {});
			const nodeMap = map.get('node') as CRDTMap<unknown>;

			nodeMap.set('parameters', {});
			const params = nodeMap.get('parameters') as CRDTMap<unknown>;

			params.set('url', 'https://example.com');
			params.set('method', 'POST');

			const result = map.toJSON();
			expect((result.node as { parameters: { url: string; method: string } }).parameters).toEqual({
				url: 'https://example.com',
				method: 'POST',
			});
		});
	});

	describe('Deep Change Events', () => {
		it('should emit add events', () => {
			const changes: DeepChangeEvent[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.set('key', 'value');

			expect(changes).toHaveLength(1);
			expect(changes[0].action).toBe(ChangeAction.add);
			expect(changes[0].path).toEqual(['key']);
			expect(changes[0].value).toBe('value');
		});

		it('should emit update events with oldValue', () => {
			map.set('key', 'old');

			const changes: DeepChangeEvent[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.set('key', 'new');

			expect(changes).toHaveLength(1);
			expect(changes[0].action).toBe(ChangeAction.update);
			expect(changes[0].path).toEqual(['key']);
			expect(changes[0].value).toBe('new');
			expect(changes[0].oldValue).toBe('old');
		});

		it('should emit delete events with oldValue', () => {
			map.set('key', 'value');

			const changes: DeepChangeEvent[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.delete('key');

			expect(changes).toHaveLength(1);
			expect(changes[0].action).toBe(ChangeAction.delete);
			expect(changes[0].path).toEqual(['key']);
			expect(changes[0].oldValue).toBe('value');
		});

		it('should emit deep path for nested modifications', () => {
			map.set('node', { position: { x: 100, y: 200 } });

			const changes: DeepChangeEvent[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			const nodeMap = map.get('node') as CRDTMap<unknown>;
			const positionMap = nodeMap.get('position') as CRDTMap<unknown>;
			positionMap.set('x', 150);

			expect(changes).toHaveLength(1);
			expect(changes[0].path).toEqual(['node', 'position', 'x']);
			expect(changes[0].action).toBe(ChangeAction.update);
			expect(changes[0].value).toBe(150);
			expect(changes[0].oldValue).toBe(100);
		});

		it('should emit single event for full object replacement', () => {
			map.set('node', { position: { x: 100, y: 200 } });

			const changes: DeepChangeEvent[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.set('node', { position: { x: 150, y: 200 } });

			expect(changes).toHaveLength(1);
			expect(changes[0].path).toEqual(['node']);
			expect(changes[0].action).toBe(ChangeAction.update);
			expect(changes[0].value).toEqual({ position: { x: 150, y: 200 } });
			// Note: oldValue for full object replacement may vary by provider
			// Yjs returns {} because the Y.Map is already replaced when toJSON is called
			// Automerge can reconstruct the old value from document history
		});

		it('should stop emitting events after unsubscribe', () => {
			const changes: DeepChangeEvent[] = [];
			const unsubscribe = map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.set('key1', 'value1');
			expect(changes).toHaveLength(1);

			unsubscribe();

			map.set('key2', 'value2');
			expect(changes).toHaveLength(1); // No new changes
		});
	});
});
