import { createNestedObject, createWorkflowData } from './__tests__/helpers';
import { ChangeAction, CRDTEngine, createCRDTProvider, isArrayChange, isMapChange } from './index';
import type {
	ArrayChangeEvent,
	CRDTArray,
	CRDTDoc,
	CRDTMap,
	DeepChange,
	DeepChangeEvent,
} from './types';

describe('createCRDTProvider', () => {
	it('should create a Yjs provider', () => {
		const provider = createCRDTProvider({ engine: CRDTEngine.yjs });
		expect(provider.name).toBe('yjs');
	});
});

/**
 * Conformance test suite - runs the same tests against both providers
 * to ensure they behave identically.
 */
describe.each([CRDTEngine.yjs])('CRDT Conformance: %s', (engine) => {
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
			const changes: DeepChange[] = [];
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

		it('should handle nested transactions correctly', () => {
			const batches: DeepChange[][] = [];
			map.onDeepChange((changeEvents) => batches.push([...changeEvents]));

			doc.transact(() => {
				map.set('a', 1);
				doc.transact(() => {
					map.set('b', 2);
				});
				map.set('c', 3);
			});

			// All changes should arrive in a single batch
			expect(batches).toHaveLength(1);
			expect(batches[0]).toHaveLength(3);
			expect(map.toJSON()).toEqual({ a: 1, b: 2, c: 3 });
		});
	});

	describe('Nested Data Access', () => {
		it('should return plain objects as-is (no CRDT wrapping)', () => {
			map.set('node', { position: { x: 100, y: 200 } });

			const node = map.get('node');
			expect(node).toBeDefined();
			// Plain objects are returned as-is, not wrapped in CRDTMap
			expect(node).toEqual({ position: { x: 100, y: 200 } });
			expect(typeof (node as Record<string, unknown>).position).toBe('object');
		});

		it('should return plain arrays as-is (no CRDT wrapping)', () => {
			map.set('items', [1, 2, 3]);

			const items = map.get('items');
			expect(items).toBeDefined();
			// Plain arrays are returned as-is, not wrapped in CRDTArray
			expect(items).toEqual([1, 2, 3]);
			expect(Array.isArray(items)).toBe(true);
		});

		it('should replace entire nested object to modify it', () => {
			map.set('node', { position: { x: 100, y: 200 } });

			// To modify nested data, replace the whole object
			const node = map.get('node') as { position: { x: number; y: number } };
			map.set('node', { position: { x: 150, y: node.position.y } });

			const result = map.toJSON();
			expect((result.node as { position: { x: number } }).position.x).toBe(150);
		});
	});

	describe('Deep Change Events', () => {
		it('should emit add events', () => {
			const changes: DeepChange[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.set('key', 'value');

			expect(changes).toHaveLength(1);
			expect(isMapChange(changes[0])).toBe(true);
			const change = changes[0] as DeepChangeEvent;
			expect(change.action).toBe(ChangeAction.add);
			expect(change.path).toEqual(['key']);
			expect(change.value).toBe('value');
		});

		it('should emit update events with oldValue', () => {
			map.set('key', 'old');

			const changes: DeepChange[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.set('key', 'new');

			expect(changes).toHaveLength(1);
			const change = changes[0] as DeepChangeEvent;
			expect(change.action).toBe(ChangeAction.update);
			expect(change.path).toEqual(['key']);
			expect(change.value).toBe('new');
			expect(change.oldValue).toBe('old');
		});

		it('should emit delete events with oldValue', () => {
			map.set('key', 'value');

			const changes: DeepChange[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.delete('key');

			expect(changes).toHaveLength(1);
			const change = changes[0] as DeepChangeEvent;
			expect(change.action).toBe(ChangeAction.delete);
			expect(change.path).toEqual(['key']);
			expect(change.oldValue).toBe('value');
		});

		it('should emit event when replacing nested object', () => {
			map.set('node', { position: { x: 100, y: 200 } });

			const changes: DeepChange[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			// With no-magic API, you replace the whole object to modify nested data
			map.set('node', { position: { x: 150, y: 200 } });

			expect(changes).toHaveLength(1);
			const change = changes[0] as DeepChangeEvent;
			expect(change.path).toEqual(['node']);
			expect(change.action).toBe(ChangeAction.update);
			expect(change.value).toEqual({ position: { x: 150, y: 200 } });
		});

		it('should emit single event for full object replacement', () => {
			map.set('node', { position: { x: 100, y: 200 } });

			const changes: DeepChange[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.set('node', { position: { x: 150, y: 200 } });

			expect(changes).toHaveLength(1);
			const change = changes[0] as DeepChangeEvent;
			expect(change.path).toEqual(['node']);
			expect(change.action).toBe(ChangeAction.update);
			expect(change.value).toEqual({ position: { x: 150, y: 200 } });
			// Note: oldValue for full object replacement may vary by provider
			// Yjs returns {} because the Y.Map is already replaced when toJSON is called
		});

		it('should stop emitting events after unsubscribe', () => {
			const changes: DeepChange[] = [];
			const unsubscribe = map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.set('key1', 'value1');
			expect(changes).toHaveLength(1);

			unsubscribe();

			map.set('key2', 'value2');
			expect(changes).toHaveLength(1); // No new changes
		});
	});

	describe('Large Deeply Nested Data', () => {
		it('should store and retrieve deeply nested object (depth=5, breadth=3)', () => {
			const deepData = createNestedObject(5, 3); // 3^5 = 243 leaf nodes
			map.set('deep', deepData);

			expect(map.toJSON()).toEqual({ deep: deepData });
		});

		it('should store and retrieve workflow-like structure with 50 nodes', () => {
			const workflow = createWorkflowData(50);
			map.set('workflow', workflow);

			const result = map.toJSON() as { workflow: Record<string, unknown> };
			expect(result.workflow.name).toBe('Test Workflow');
			expect(Object.keys(result.workflow.nodes as Record<string, unknown>).length).toBe(50);
		});

		it('should retrieve deep nested data as plain objects', () => {
			const deepData = createNestedObject(4, 2);
			map.set('deep', deepData);

			// Plain objects are returned as-is
			const deep = map.get('deep') as Record<string, unknown>;
			expect(deep).toEqual(deepData);
			expect((deep.child0 as Record<string, unknown>).child0).toBeDefined();
		});

		it('should modify workflow by replacing node data', () => {
			const workflow = createWorkflowData(10);
			map.set('workflow', workflow);

			// Create a fresh modified version
			const updatedWorkflow = createWorkflowData(10);
			(updatedWorkflow.nodes as Record<string, { position: { x: number; y: number } }>)[
				'node-5'
			].position = {
				x: 9999,
				y: 8888,
			};

			map.set('workflow', updatedWorkflow);

			const result = map.toJSON() as {
				workflow: { nodes: Record<string, { position: { x: number; y: number } }> };
			};
			expect(result.workflow.nodes['node-5'].position.x).toBe(9999);
			expect(result.workflow.nodes['node-5'].position.y).toBe(8888);
		});

		it('should emit change event when replacing workflow data', () => {
			const workflow = createWorkflowData(3);
			map.set('workflow', workflow);

			const changes: DeepChange[] = [];
			map.onDeepChange((events) => changes.push(...events));

			// Modify by replacing with fresh workflow
			const newWorkflow = createWorkflowData(3);
			newWorkflow.name = 'Renamed Workflow';
			map.set('workflow', newWorkflow);

			expect(changes.length).toBeGreaterThan(0);
			const workflowChange = changes.filter(isMapChange).find((c) => c.path[0] === 'workflow');
			expect(workflowChange).toBeDefined();
		});
	});

	describe('CRDTArray Basic Operations', () => {
		let arr: CRDTArray<string>;

		beforeEach(() => {
			arr = doc.getArray<string>('test-array');
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

		it('should delete elements', () => {
			arr.push('a', 'b', 'c', 'd');
			arr.delete(1, 2);

			expect(arr.toArray()).toEqual(['a', 'd']);
		});

		it('should convert to array and JSON', () => {
			arr.push('a', 'b', 'c');

			expect(arr.toArray()).toEqual(['a', 'b', 'c']);
			expect(arr.toJSON()).toEqual(['a', 'b', 'c']);
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

	describe('CRDTArray Change Events', () => {
		let arr: CRDTArray<string>;

		beforeEach(() => {
			arr = doc.getArray<string>('test-array');
		});

		it('should emit insert delta when pushing items', () => {
			const changes: DeepChange[] = [];
			arr.onDeepChange((changeEvents) => changes.push(...changeEvents));

			arr.push('a', 'b');

			expect(changes).toHaveLength(1);
			expect(isArrayChange(changes[0])).toBe(true);
			const change = changes[0] as ArrayChangeEvent;
			expect(change.path).toEqual([]);
			expect(change.delta).toEqual([{ insert: ['a', 'b'] }]);
		});

		it('should emit insert delta when inserting at index', () => {
			arr.push('a', 'c');

			const changes: DeepChange[] = [];
			arr.onDeepChange((changeEvents) => changes.push(...changeEvents));

			arr.insert(1, 'b');

			expect(changes).toHaveLength(1);
			const change = changes[0] as ArrayChangeEvent;
			expect(change.path).toEqual([]);
			expect(change.delta).toEqual([{ retain: 1 }, { insert: ['b'] }]);
		});

		it('should emit delete delta when deleting items', () => {
			arr.push('a', 'b', 'c');

			const changes: DeepChange[] = [];
			arr.onDeepChange((changeEvents) => changes.push(...changeEvents));

			arr.delete(1, 1);

			expect(changes).toHaveLength(1);
			const change = changes[0] as ArrayChangeEvent;
			expect(change.path).toEqual([]);
			expect(change.delta).toEqual([{ retain: 1 }, { delete: 1 }]);
		});

		it('should stop emitting events after unsubscribe', () => {
			const changes: DeepChange[] = [];
			const unsubscribe = arr.onDeepChange((changeEvents) => changes.push(...changeEvents));

			arr.push('a');
			expect(changes).toHaveLength(1);

			unsubscribe();

			arr.push('b');
			expect(changes).toHaveLength(1);
		});
	});

	describe('Plain Arrays in Maps', () => {
		it('should return plain array when getting array value from map', () => {
			map.set('items', ['a', 'b', 'c']);

			// Plain arrays are returned as-is, not wrapped in CRDTArray
			const items = map.get('items') as string[];
			expect(items.length).toBe(3);
			expect(items[0]).toBe('a');
			expect(items).toEqual(['a', 'b', 'c']);
		});

		it('should emit event when replacing array in map', () => {
			map.set('items', ['a', 'b']);

			const changes: DeepChange[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			// To modify, replace the whole array
			map.set('items', ['a', 'b', 'c']);

			// Should have at least 1 change (number varies by engine)
			expect(changes.length).toBeGreaterThanOrEqual(1);

			// Find the map change for 'items'
			const itemsChange = changes.filter(isMapChange).find((c) => c.path[0] === 'items');
			expect(itemsChange).toBeDefined();

			// Result should reflect the new array
			expect(map.get('items')).toEqual(['a', 'b', 'c']);
		});

		it('should return plain nested object with array', () => {
			map.set('node-1', { connections: ['conn-a'] });

			// Plain objects are returned as-is
			const node = map.get('node-1') as { connections: string[] };
			expect(node.connections).toEqual(['conn-a']);
			expect(Array.isArray(node.connections)).toBe(true);
		});
	});

	describe('CRDTDoc sync state', () => {
		it('should start with synced = false', () => {
			expect(doc.synced).toBe(false);
		});

		it('should update synced state via setSynced()', () => {
			expect(doc.synced).toBe(false);

			doc.setSynced(true);
			expect(doc.synced).toBe(true);

			doc.setSynced(false);
			expect(doc.synced).toBe(false);
		});

		it('should notify handlers when sync state changes', () => {
			const states: boolean[] = [];
			doc.onSync((isSynced) => states.push(isSynced));

			doc.setSynced(true);
			doc.setSynced(false);
			doc.setSynced(true);

			expect(states).toEqual([true, false, true]);
		});

		it('should not notify handlers when sync state is set to same value', () => {
			const states: boolean[] = [];
			doc.onSync((isSynced) => states.push(isSynced));

			doc.setSynced(true);
			doc.setSynced(true); // Same value, should not trigger
			doc.setSynced(true); // Same value, should not trigger

			expect(states).toEqual([true]);
		});

		it('should stop notifying after unsubscribe', () => {
			const states: boolean[] = [];
			const unsubscribe = doc.onSync((isSynced) => states.push(isSynced));

			doc.setSynced(true);
			expect(states).toEqual([true]);

			unsubscribe();

			doc.setSynced(false);
			expect(states).toEqual([true]); // No new notifications
		});

		it('should support multiple handlers', () => {
			const states1: boolean[] = [];
			const states2: boolean[] = [];

			doc.onSync((isSynced) => states1.push(isSynced));
			doc.onSync((isSynced) => states2.push(isSynced));

			doc.setSynced(true);

			expect(states1).toEqual([true]);
			expect(states2).toEqual([true]);
		});

		it('should reset synced to false on destroy', () => {
			doc.setSynced(true);
			expect(doc.synced).toBe(true);

			doc.destroy();

			// After destroy, synced should be false
			expect(doc.synced).toBe(false);

			// Create new doc for cleanup (afterEach expects doc to exist)
			const provider = createCRDTProvider({ engine });
			doc = provider.createDoc('test-replacement');
		});
	});
});
