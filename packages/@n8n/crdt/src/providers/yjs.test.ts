import type {
	ChangeOrigin,
	CRDTArray,
	CRDTDoc,
	CRDTMap,
	DeepChange,
	DeepChangeEvent,
} from '../types';
import { ChangeAction, ChangeOrigin as ChangeOriginConst } from '../types';
import { YjsProvider } from './yjs';

// Note: CRDTDoc sync state tests are in index.test.ts (multi-engine conformance tests)

describe('YjsProvider', () => {
	describe('CRDTMap basic operations', () => {
		let doc: CRDTDoc;
		let map: CRDTMap<string>;

		beforeEach(() => {
			const provider = new YjsProvider();
			doc = provider.createDoc('test');
			map = doc.getMap<string>('test-map');
		});

		afterEach(() => {
			doc.destroy();
		});

		it('should set and get values', () => {
			map.set('key1', 'value1');

			expect(map.get('key1')).toBe('value1');
			expect(map.get('nonexistent')).toBeUndefined();
		});

		it('should delete values', () => {
			map.set('key1', 'value1');
			expect(map.has('key1')).toBe(true);

			map.delete('key1');
			expect(map.has('key1')).toBe(false);
			expect(map.get('key1')).toBeUndefined();
		});

		it('should check key existence with has()', () => {
			expect(map.has('key1')).toBe(false);
			map.set('key1', 'value1');
			expect(map.has('key1')).toBe(true);
		});

		it('should iterate keys', () => {
			map.set('a', '1');
			map.set('b', '2');
			map.set('c', '3');

			const keys = Array.from(map.keys());
			expect(keys).toContain('a');
			expect(keys).toContain('b');
			expect(keys).toContain('c');
			expect(keys).toHaveLength(3);
		});

		it('should iterate values', () => {
			map.set('a', '1');
			map.set('b', '2');

			const values = Array.from(map.values());
			expect(values).toContain('1');
			expect(values).toContain('2');
			expect(values).toHaveLength(2);
		});

		it('should iterate entries', () => {
			map.set('a', '1');
			map.set('b', '2');

			const entries = Array.from(map.entries());
			expect(entries).toContainEqual(['a', '1']);
			expect(entries).toContainEqual(['b', '2']);
			expect(entries).toHaveLength(2);
		});

		it('should convert to JSON', () => {
			map.set('a', '1');
			map.set('b', '2');

			expect(map.toJSON()).toEqual({ a: '1', b: '2' });
		});

		it('should share underlying data for the same name', () => {
			const map1 = doc.getMap('test-map');
			const map2 = doc.getMap('test-map');

			map1.set('key', 'value');
			expect(map2.get('key')).toBe('value');
		});

		it('should return the same wrapper instance for the same map', () => {
			const map1 = doc.getMap('test-map');
			const map2 = doc.getMap('test-map');

			expect(map1).toBe(map2);
		});

		it('should return the same wrapper for nested maps on multiple get() calls', () => {
			const nodesMap = doc.getMap('nodes');
			const nodeMap = doc.createMap();
			nodeMap.set('name', 'test');
			nodesMap.set('node1', nodeMap);

			const retrieved1 = nodesMap.get('node1');
			const retrieved2 = nodesMap.get('node1');

			expect(retrieved1).toBe(retrieved2);
		});

		it('should batch changes in transact()', () => {
			doc.transact(() => {
				map.set('a', '1');
				map.set('b', '2');
				map.set('c', '3');
			});

			expect(map.toJSON()).toEqual({ a: '1', b: '2', c: '3' });
		});

		it('should remain usable after exception in transaction', () => {
			expect(() => {
				doc.transact(() => {
					map.set('before-error', 'value');
					throw new Error('Intentional error');
				});
			}).toThrow('Intentional error');

			// Document should still be usable after the error
			map.set('after-error', 'works');
			expect(map.get('after-error')).toBe('works');
		});
	});

	describe('CRDTMap onDeepChange', () => {
		let doc: CRDTDoc;
		let map: CRDTMap<unknown>;

		beforeEach(() => {
			const provider = new YjsProvider();
			doc = provider.createDoc('test');
			map = doc.getMap('test-map');
		});

		afterEach(() => {
			doc.destroy();
		});

		it('should emit add event when adding a key', () => {
			const changes: DeepChange[] = [];
			let lastOrigin: ChangeOrigin | undefined;
			map.onDeepChange((c, origin) => {
				changes.push(...c);
				lastOrigin = origin;
			});

			map.set('key1', 'value1');

			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				path: ['key1'],
				action: ChangeAction.add,
				value: 'value1',
			});
			expect(lastOrigin).toBe(ChangeOriginConst.local);
		});

		it('should emit update event when updating a key', () => {
			map.set('key1', 'value1');

			const changes: DeepChange[] = [];
			map.onDeepChange((c) => changes.push(...c));

			map.set('key1', 'value2');

			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				path: ['key1'],
				action: ChangeAction.update,
				value: 'value2',
				oldValue: 'value1',
			});
		});

		it('should emit delete event when deleting a key', () => {
			map.set('key1', 'value1');

			const changes: DeepChange[] = [];
			map.onDeepChange((c) => changes.push(...c));

			map.delete('key1');

			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				path: ['key1'],
				action: ChangeAction.delete,
				oldValue: 'value1',
			});
		});

		it('should emit multiple changes in a single batch for transact', () => {
			const changes: DeepChange[] = [];
			map.onDeepChange((c) => changes.push(...c));

			doc.transact(() => {
				map.set('a', '1');
				map.set('b', '2');
			});

			expect(changes).toHaveLength(2);
			expect(changes).toContainEqual({
				path: ['a'],
				action: ChangeAction.add,
				value: '1',
			});
			expect(changes).toContainEqual({
				path: ['b'],
				action: ChangeAction.add,
				value: '2',
			});
		});

		it('should stop emitting events after unsubscribe', () => {
			const changes: DeepChange[] = [];
			const unsubscribe = map.onDeepChange((c) => changes.push(...c));

			map.set('key1', 'value1');
			expect(changes).toHaveLength(1);

			unsubscribe();

			map.set('key2', 'value2');
			expect(changes).toHaveLength(1); // No new changes
		});

		it('should emit correct path for nested object changes (full replace)', () => {
			map.set('node-1', { position: { x: 100, y: 200 } });

			const changes: DeepChange[] = [];
			map.onDeepChange((c) => changes.push(...c));

			// Update the entire node (top-level change)
			map.set('node-1', { position: { x: 150, y: 200 } });

			expect(changes).toHaveLength(1);
			const change = changes[0] as DeepChangeEvent;
			expect(change.path).toEqual(['node-1']);
			expect(change.action).toBe(ChangeAction.update);
			expect(change.value).toEqual({ position: { x: 150, y: 200 } });
		});

		it('should return plain objects (no CRDT wrapping)', () => {
			map.set('node-1', { position: { x: 100, y: 200 } });

			// Plain objects are returned as-is, not wrapped
			const node = map.get('node-1');
			expect(node).toEqual({ position: { x: 100, y: 200 } });
		});

		it('should return plain arrays (no CRDT wrapping)', () => {
			map.set('items', ['a', 'b', 'c']);

			// Plain arrays are returned as-is, not wrapped
			const items = map.get('items') as string[];
			expect(items.length).toBe(3);
			expect(items[0]).toBe('a');
			expect(items).toEqual(['a', 'b', 'c']);
		});

		it('should emit event when replacing nested object', () => {
			map.set('node-1', { position: { x: 100, y: 200 } });

			const changes: DeepChange[] = [];
			map.onDeepChange((c) => changes.push(...c));

			// Replace the whole object to modify nested data
			map.set('node-1', { position: { x: 150, y: 200 } });

			expect(changes).toHaveLength(1);
			const change = changes[0] as DeepChangeEvent;
			expect(change.path).toEqual(['node-1']);
			expect(change.action).toBe(ChangeAction.update);
			expect(change.value).toEqual({ position: { x: 150, y: 200 } });
		});
	});

	describe('CRDTArray basic operations', () => {
		let doc: CRDTDoc;
		let arr: CRDTArray<string>;

		beforeEach(() => {
			const provider = new YjsProvider();
			doc = provider.createDoc('test');
			arr = doc.getArray<string>('test-array');
		});

		afterEach(() => {
			doc.destroy();
		});

		it('should push and get values', () => {
			arr.push('a', 'b', 'c');

			expect(arr.get(0)).toBe('a');
			expect(arr.get(1)).toBe('b');
			expect(arr.get(2)).toBe('c');
			expect(arr.get(3)).toBeUndefined();
		});

		it('should report correct length', () => {
			expect(arr.length).toBe(0);

			arr.push('a');
			expect(arr.length).toBe(1);

			arr.push('b', 'c');
			expect(arr.length).toBe(3);
		});

		it('should insert at index', () => {
			arr.push('a', 'c');
			arr.insert(1, 'b');

			expect(arr.toArray()).toEqual(['a', 'b', 'c']);
		});

		it('should insert multiple items at index', () => {
			arr.push('a', 'd');
			arr.insert(1, 'b', 'c');

			expect(arr.toArray()).toEqual(['a', 'b', 'c', 'd']);
		});

		it('should delete single element', () => {
			arr.push('a', 'b', 'c');
			arr.delete(1);

			expect(arr.toArray()).toEqual(['a', 'c']);
		});

		it('should delete multiple elements', () => {
			arr.push('a', 'b', 'c', 'd');
			arr.delete(1, 2);

			expect(arr.toArray()).toEqual(['a', 'd']);
		});

		it('should convert to array', () => {
			arr.push('a', 'b', 'c');

			expect(arr.toArray()).toEqual(['a', 'b', 'c']);
		});

		it('should convert to JSON (same as toArray)', () => {
			arr.push('a', 'b', 'c');

			expect(arr.toJSON()).toEqual(['a', 'b', 'c']);
		});

		it('should share underlying data for the same name', () => {
			const arr1 = doc.getArray<string>('test-array');
			const arr2 = doc.getArray<string>('test-array');

			arr1.push('value');
			expect(arr2.get(0)).toBe('value');
		});

		it('should handle nested objects as plain values', () => {
			const objArr = doc.getArray<{ name: string }>('obj-array');
			objArr.push({ name: 'first' }, { name: 'second' });

			expect(objArr.toArray()).toEqual([{ name: 'first' }, { name: 'second' }]);

			// Plain objects are returned as-is, not wrapped
			const first = objArr.get(0) as { name: string };
			expect(first.name).toBe('first');
		});

		it('should handle nested arrays as plain values', () => {
			const nestedArr = doc.getArray<string[]>('nested-array');
			nestedArr.push(['a', 'b'], ['c', 'd']);

			expect(nestedArr.toArray()).toEqual([
				['a', 'b'],
				['c', 'd'],
			]);

			// Plain arrays are returned as-is, not wrapped
			const inner = nestedArr.get(0) as string[];
			expect(inner[0]).toBe('a');
			expect(inner.length).toBe(2);
		});
	});

	describe('createMap and createArray', () => {
		let doc: CRDTDoc;

		beforeEach(() => {
			const provider = new YjsProvider();
			doc = provider.createDoc('test');
		});

		afterEach(() => {
			doc.destroy();
		});

		it('should create a map that can be populated before attaching', () => {
			const nodesMap = doc.getMap('nodes');
			const nodeMap = doc.createMap<string>();

			// Populate before attaching (Yjs buffers writes internally)
			nodeMap.set('name', 'test-node');
			nodeMap.set('type', 'action');

			// Attach to document
			nodesMap.set('node_1', nodeMap);

			// Data is preserved after attachment
			expect(nodesMap.toJSON()).toEqual({
				node_1: { name: 'test-node', type: 'action' },
			});
		});

		it('should create an array that can be populated before attaching', () => {
			const dataMap = doc.getMap('data');
			const items = doc.createArray<string>();

			// Populate before attaching (Yjs buffers writes internally)
			items.push('a', 'b');
			items.insert(1, 'x');

			// Attach to document
			dataMap.set('items', items);

			// Data is preserved after attachment
			expect(dataMap.toJSON()).toEqual({ items: ['a', 'x', 'b'] });
		});

		it('should store standalone map in document map', () => {
			const nodesMap = doc.getMap('nodes');
			const nodeMap = doc.createMap<unknown>();

			// Populate the standalone map
			nodeMap.set('name', 'test-node');
			nodeMap.set('position', { x: 100, y: 200 });

			// Attach to document
			nodesMap.set('node_1', nodeMap);

			expect(nodesMap.toJSON()).toEqual({
				node_1: {
					name: 'test-node',
					position: { x: 100, y: 200 },
				},
			});
		});

		it('should store standalone array in document map', () => {
			const dataMap = doc.getMap('data');
			const items = doc.createArray<string>();

			// Populate the standalone array
			items.push('a', 'b', 'c');

			// Attach to document
			dataMap.set('items', items);

			expect(dataMap.toJSON()).toEqual({ items: ['a', 'b', 'c'] });
		});

		it('should store nested standalone structures', () => {
			const nodesMap = doc.getMap('nodes');

			const nodeMap = doc.createMap<unknown>();
			const connections = doc.createArray<string>();

			// Populate the nested array
			connections.push('conn_1', 'conn_2');

			// Attach the nested array to the standalone map
			nodeMap.set('name', 'test');
			nodeMap.set('connections', connections);

			// Attach the map to the document
			nodesMap.set('node_1', nodeMap);

			expect(nodesMap.toJSON()).toEqual({
				node_1: {
					name: 'test',
					connections: ['conn_1', 'conn_2'],
				},
			});
		});

		it('should push standalone maps to document array', () => {
			const nodesArray = doc.getArray('nodes');

			const node1 = doc.createMap<string>();
			const node2 = doc.createMap<string>();

			// Populate before attaching
			node1.set('name', 'first');
			node2.set('name', 'second');

			// Attach to document
			nodesArray.push(node1, node2);

			expect(nodesArray.toJSON()).toEqual([{ name: 'first' }, { name: 'second' }]);
		});
	});

	describe('CRDTArray onDeepChange', () => {
		let doc: CRDTDoc;
		let arr: CRDTArray<string>;

		beforeEach(() => {
			const provider = new YjsProvider();
			doc = provider.createDoc('test');
			arr = doc.getArray<string>('test-array');
		});

		afterEach(() => {
			doc.destroy();
		});

		it('should emit insert delta when pushing items', () => {
			const changes: DeepChange[] = [];
			arr.onDeepChange((c) => changes.push(...c));

			arr.push('a', 'b');

			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				path: [],
				delta: [{ insert: ['a', 'b'] }],
			});
		});

		it('should emit insert delta when inserting at index', () => {
			arr.push('a', 'c');

			const changes: DeepChange[] = [];
			arr.onDeepChange((c) => changes.push(...c));

			arr.insert(1, 'b');

			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				path: [],
				delta: [{ retain: 1 }, { insert: ['b'] }],
			});
		});

		it('should emit delete delta when deleting items', () => {
			arr.push('a', 'b', 'c');

			const changes: DeepChange[] = [];
			arr.onDeepChange((c) => changes.push(...c));

			arr.delete(1, 1);

			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				path: [],
				delta: [{ retain: 1 }, { delete: 1 }],
			});
		});

		it('should emit multiple deltas in a transaction', () => {
			const changes: DeepChange[] = [];
			arr.onDeepChange((c) => changes.push(...c));

			doc.transact(() => {
				arr.push('a', 'b', 'c');
			});

			// Should be batched into single change
			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				path: [],
				delta: [{ insert: ['a', 'b', 'c'] }],
			});
		});

		it('should stop emitting events after unsubscribe', () => {
			const changes: DeepChange[] = [];
			const unsubscribe = arr.onDeepChange((c) => changes.push(...c));

			arr.push('a');
			expect(changes).toHaveLength(1);

			unsubscribe();

			arr.push('b');
			expect(changes).toHaveLength(1); // No new changes
		});
	});
});
