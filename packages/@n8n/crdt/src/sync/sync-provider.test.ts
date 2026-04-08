import { createNestedObject, createWorkflowData } from '../__tests__/helpers';
import { CRDTEngine, createCRDTProvider } from '../index';
import { MockTransport } from '../transports';
import type { CRDTArray, CRDTDoc, CRDTMap } from '../types';
import { createSyncProvider } from './base-sync-provider';
import type { SyncProvider } from './types';

/**
 * SyncProvider tests - verify sync via transport works for both engines.
 */
describe.each([CRDTEngine.yjs])('SyncProvider Conformance: %s', (engine) => {
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

		it('should not create infinite sync loop when applying updates', async () => {
			await sync1.start();
			await sync2.start();

			let updateCount1 = 0;
			let updateCount2 = 0;

			doc1.onUpdate(() => updateCount1++);
			doc2.onUpdate(() => updateCount2++);

			// Make a single change
			map1.set('key', 'value');

			// Should have limited update calls, not infinite loop
			// Each doc emits 1 update for the change, possibly 1 more for sync receipt
			expect(updateCount1).toBeLessThan(5);
			expect(updateCount2).toBeLessThan(5);
		});
	});

	describe('Three-doc chain sync', () => {
		// Topology: doc1 <-> doc2 <-> doc3 (hub-and-spoke via doc2)
		let doc3: CRDTDoc;
		let map3: CRDTMap<unknown>;
		let transport2to3: MockTransport;
		let transport3: MockTransport;
		let sync2to3: SyncProvider;
		let sync3: SyncProvider;

		beforeEach(() => {
			const provider = createCRDTProvider({ engine });
			doc3 = provider.createDoc('doc-3');
			map3 = doc3.getMap('data');

			transport2to3 = new MockTransport();
			transport3 = new MockTransport();
			MockTransport.link(transport2to3, transport3);

			// Doc2 acts as hub, syncing with both doc1 and doc3
			sync2to3 = createSyncProvider(doc2, transport2to3);
			sync3 = createSyncProvider(doc3, transport3);
		});

		afterEach(() => {
			sync2to3.stop();
			sync3.stop();
			doc3.destroy();
		});

		it('should propagate changes through hub (doc1 -> doc2 -> doc3)', async () => {
			// Start all sync connections
			await sync1.start();
			await sync2.start();
			await sync2to3.start();
			await sync3.start();

			// Change in doc1
			map1.set('origin', 'doc1');

			// Should propagate: doc1 -> doc2 -> doc3
			expect(map2.get('origin')).toBe('doc1');
			expect(map3.get('origin')).toBe('doc1');
		});

		it('should propagate changes from leaf (doc3 -> doc2 -> doc1)', async () => {
			await sync1.start();
			await sync2.start();
			await sync2to3.start();
			await sync3.start();

			// Change in doc3
			map3.set('origin', 'doc3');

			// Should propagate: doc3 -> doc2 -> doc1
			expect(map2.get('origin')).toBe('doc3');
			expect(map1.get('origin')).toBe('doc3');
		});

		it('should sync all docs to same state with concurrent changes', async () => {
			await sync1.start();
			await sync2.start();
			await sync2to3.start();
			await sync3.start();

			// Concurrent changes from all three docs
			map1.set('from1', 'value1');
			map2.set('from2', 'value2');
			map3.set('from3', 'value3');

			// All should converge
			const expected = { from1: 'value1', from2: 'value2', from3: 'value3' };
			expect(map1.toJSON()).toEqual(expected);
			expect(map2.toJSON()).toEqual(expected);
			expect(map3.toJSON()).toEqual(expected);
		});
	});

	describe('Concurrent edit conflicts', () => {
		it('should resolve conflict on same key (both converge)', async () => {
			await sync1.start();
			await sync2.start();

			// Both set the same key simultaneously
			map1.set('shared', 'from-doc1');
			map2.set('shared', 'from-doc2');

			// Both should converge to the same value (CRDT determines winner)
			const value1 = map1.get('shared');
			const value2 = map2.get('shared');
			expect(value1).toBe(value2);
			expect(['from-doc1', 'from-doc2']).toContain(value1);
		});

		it('should merge non-conflicting concurrent changes', async () => {
			await sync1.start();
			await sync2.start();

			// Different keys - no conflict
			map1.set('key1', 'value1');
			map2.set('key2', 'value2');

			// Both should have both keys
			expect(map1.toJSON()).toEqual({ key1: 'value1', key2: 'value2' });
			expect(map2.toJSON()).toEqual({ key1: 'value1', key2: 'value2' });
		});

		it('should handle rapid sequential updates to same key', async () => {
			await sync1.start();
			await sync2.start();

			// Rapid updates from doc1
			map1.set('counter', 1);
			map1.set('counter', 2);
			map1.set('counter', 3);

			// Doc2 should see final value
			expect(map2.get('counter')).toBe(3);
		});

		it('should handle interleaved updates from both docs', async () => {
			await sync1.start();
			await sync2.start();

			map1.set('a', 1);
			map2.set('b', 2);
			map1.set('c', 3);
			map2.set('d', 4);

			const expected = { a: 1, b: 2, c: 3, d: 4 };
			expect(map1.toJSON()).toEqual(expected);
			expect(map2.toJSON()).toEqual(expected);
		});

		it('should handle nested object conflicts', async () => {
			await sync1.start();
			await sync2.start();

			// Both create nested structure with different values
			map1.set('node', { x: 100 });
			map2.set('node', { x: 200 });

			// Both should converge
			const node1 = map1.toJSON().node as { x: number };
			const node2 = map2.toJSON().node as { x: number };
			expect(node1.x).toBe(node2.x);
			expect([100, 200]).toContain(node1.x);
		});

		it('should handle delete during concurrent update', async () => {
			// Setup initial state
			map1.set('key', 'initial');
			await sync2.start();
			await sync1.start();

			// Now both have 'key'
			expect(map2.get('key')).toBe('initial');

			// Concurrent: doc1 updates, doc2 deletes
			map1.set('key', 'updated');
			map2.delete('key');

			// Both should converge (either deleted or updated, but same)
			const has1 = map1.has('key');
			const has2 = map2.has('key');
			expect(has1).toBe(has2);

			expect(map1.get('key')).toBe(map2.get('key'));
		});
	});

	describe('Error handling', () => {
		it('should call onError handler when receiving malformed update', async () => {
			await sync1.start();
			await sync2.start();

			const errors: Error[] = [];
			sync2.onError((error) => errors.push(error));

			// Send garbage data directly through transport
			const garbageData = new Uint8Array([1, 2, 3, 4, 5]);
			transport1.send(garbageData);

			// Error handler should have been called
			expect(errors.length).toBe(1);
			expect(errors[0]).toBeInstanceOf(Error);
		});

		it('should continue syncing after receiving malformed update', async () => {
			await sync1.start();
			await sync2.start();

			// Register error handler to prevent unhandled errors
			sync2.onError(() => {});

			// Send garbage data
			transport1.send(new Uint8Array([1, 2, 3, 4, 5]));

			// Should still be syncing
			expect(sync2.syncing).toBe(true);

			// Valid updates should still work
			map1.set('after-error', 'still-works');
			expect(map2.get('after-error')).toBe('still-works');
		});

		it('should unsubscribe from onError handler', async () => {
			await sync1.start();
			await sync2.start();

			const errors: Error[] = [];
			const unsubscribe = sync2.onError((error) => errors.push(error));

			// Send garbage, should capture error
			transport1.send(new Uint8Array([1, 2, 3]));
			expect(errors.length).toBe(1);

			// Unsubscribe
			unsubscribe();

			// Send more garbage, should not capture
			transport1.send(new Uint8Array([4, 5, 6]));
			expect(errors.length).toBe(1);
		});
	});

	describe('Large deeply nested data', () => {
		it('should sync deeply nested object (depth=5, breadth=3)', async () => {
			await sync1.start();
			await sync2.start();

			const deepData = createNestedObject(5, 3); // 3^5 = 243 leaf nodes
			map1.set('deep', deepData);

			expect(map2.toJSON()).toEqual({ deep: deepData });
		});

		it('should sync workflow-like structure with 50 nodes', async () => {
			await sync1.start();
			await sync2.start();

			const workflow = createWorkflowData(50);
			map1.set('workflow', workflow);

			const result = map2.toJSON() as { workflow: Record<string, unknown> };
			expect(result.workflow.name).toBe('Test Workflow');
			expect(Object.keys(result.workflow.nodes as Record<string, unknown>).length).toBe(50);
		});

		it('should sync concurrent updates to different branches of nested data', async () => {
			await sync1.start();
			await sync2.start();

			// Set initial structure
			map1.set('tree', {
				left: { value: 'initial-left' },
				right: { value: 'initial-right' },
			});

			// Wait for sync - use toJSON() for comparison since get() returns nested map type
			const synced = map2.toJSON() as { tree: Record<string, unknown> };
			expect(synced.tree).toEqual({
				left: { value: 'initial-left' },
				right: { value: 'initial-right' },
			});

			// Concurrent updates to different branches
			map1.set('tree', {
				left: { value: 'updated-by-doc1' },
				right: { value: 'initial-right' },
			});
			map2.set('tree', {
				left: { value: 'initial-left' },
				right: { value: 'updated-by-doc2' },
			});

			// Both should converge (CRDT will pick a winner for the whole object)
			const result1 = map1.toJSON() as { tree: Record<string, unknown> };
			const result2 = map2.toJSON() as { tree: Record<string, unknown> };
			expect(result1.tree).toEqual(result2.tree);
		});

		it('should handle large array-like data in nested structure', async () => {
			await sync1.start();
			await sync2.start();

			const largeData = {
				items: Array.from({ length: 100 }, (_, index) => ({
					id: index,
					data: `item-${index}`,
					metadata: { created: Date.now(), tags: [`tag${index % 5}`] },
				})),
			};

			map1.set('collection', largeData);

			const result = map2.toJSON() as { collection: { items: unknown[] } };
			expect(result.collection.items.length).toBe(100);
		});

		it('should sync multiple large objects concurrently', async () => {
			await sync1.start();
			await sync2.start();

			// Doc1 sets workflow data
			const workflow1 = createWorkflowData(20);
			map1.set('workflow1', workflow1);

			// Doc2 sets different workflow data
			const workflow2 = createWorkflowData(25);
			map2.set('workflow2', workflow2);

			// Both should have both workflows
			const result1 = map1.toJSON() as Record<string, { nodes: Record<string, unknown> }>;
			const result2 = map2.toJSON() as Record<string, { nodes: Record<string, unknown> }>;

			expect(Object.keys(result1.workflow1.nodes).length).toBe(20);
			expect(Object.keys(result1.workflow2.nodes).length).toBe(25);
			expect(Object.keys(result2.workflow1.nodes).length).toBe(20);
			expect(Object.keys(result2.workflow2.nodes).length).toBe(25);
		});

		it('should sync edits to deep nested values by replacement', async () => {
			await sync1.start();
			await sync2.start();

			// Create initial structure on doc1
			const workflow = createWorkflowData(10);
			map1.set('workflow', workflow);

			// Verify doc2 received it
			const initialResult = map2.toJSON() as { workflow: { nodes: Record<string, unknown> } };
			expect(Object.keys(initialResult.workflow.nodes).length).toBe(10);

			// Edit deep nested value by replacing the whole workflow
			// NOTE: Create a fresh object structure (don't reuse objects from get())
			const updatedWorkflow = createWorkflowData(10);
			(updatedWorkflow.nodes as Record<string, { position: { x: number; y: number } }>)[
				'node-5'
			].position.x = 9999;
			map1.set('workflow', updatedWorkflow);

			// Verify edit synced to doc2
			const editedResult = map2.toJSON() as {
				workflow: { nodes: Record<string, { position: { x: number } }> };
			};
			expect(editedResult.workflow.nodes['node-5'].position.x).toBe(9999);
		});

		it('should sync concurrent replacements to different keys', async () => {
			await sync1.start();
			await sync2.start();

			// Create initial structure
			map1.set('node1', { name: 'Node 1', value: 100 });
			map1.set('node3', { name: 'Node 3', value: 300 });

			// Both docs edit different keys
			map1.set('node1', { name: 'Edited by doc1', value: 100 });
			map2.set('node3', { name: 'Edited by doc2', value: 300 });

			// Both should converge with both edits
			const result1 = map1.toJSON() as Record<string, { name: string }>;
			const result2 = map2.toJSON() as Record<string, { name: string }>;

			expect(result1.node1.name).toBe('Edited by doc1');
			expect(result1.node3.name).toBe('Edited by doc2');
			expect(result2.node1.name).toBe('Edited by doc1');
			expect(result2.node3.name).toBe('Edited by doc2');
		});

		it('should sync workflow replacement', async () => {
			await sync1.start();
			await sync2.start();

			const workflow = createWorkflowData(3);
			map1.set('workflow', workflow);

			// Replace workflow with a fresh modified version
			const modifiedWorkflow = createWorkflowData(3);
			modifiedWorkflow.name = 'Modified Workflow';
			map1.set('workflow', modifiedWorkflow);

			// Verify change synced to doc2
			const result = map2.toJSON() as { workflow: { name: string } };
			expect(result.workflow.name).toBe('Modified Workflow');
		});

		it('should sync rapid sequential replacements', async () => {
			await sync1.start();
			await sync2.start();

			// Rapid replacements on doc1
			for (let i = 0; i < 5; i++) {
				map1.set(`node-${i}`, { name: `Rapid Update ${i}`, value: i });
			}

			// All edits should sync to doc2
			const result = map2.toJSON() as Record<string, { name: string }>;

			for (let i = 0; i < 5; i++) {
				expect(result[`node-${i}`].name).toBe(`Rapid Update ${i}`);
			}
		});
	});

	describe('Array sync', () => {
		let arr1: CRDTArray<string>;
		let arr2: CRDTArray<string>;

		beforeEach(() => {
			arr1 = doc1.getArray<string>('items');
			arr2 = doc2.getArray<string>('items');
		});

		it('should sync initial array state on connect', async () => {
			arr1.push('a', 'b', 'c');

			await sync2.start();
			await sync1.start();

			expect(arr2.toArray()).toEqual(['a', 'b', 'c']);
		});

		it('should sync push operations', async () => {
			await sync1.start();
			await sync2.start();

			arr1.push('x', 'y', 'z');

			expect(arr2.toArray()).toEqual(['x', 'y', 'z']);
		});

		it('should sync insert operations', async () => {
			await sync1.start();
			await sync2.start();

			arr1.push('a', 'c');
			arr1.insert(1, 'b');

			expect(arr2.toArray()).toEqual(['a', 'b', 'c']);
		});

		it('should sync delete operations', async () => {
			await sync1.start();
			await sync2.start();

			arr1.push('a', 'b', 'c', 'd');
			arr1.delete(1, 2);

			expect(arr2.toArray()).toEqual(['a', 'd']);
		});

		it('should sync bidirectionally', async () => {
			await sync1.start();
			await sync2.start();

			arr1.push('from1');
			arr2.push('from2');

			expect(arr1.toArray()).toContain('from1');
			expect(arr1.toArray()).toContain('from2');
			expect(arr2.toArray()).toContain('from1');
			expect(arr2.toArray()).toContain('from2');
		});

		it('should sync nested objects in arrays', async () => {
			const objArr1 = doc1.getArray<{ name: string }>('objects');
			const objArr2 = doc2.getArray<{ name: string }>('objects');

			await sync1.start();
			await sync2.start();

			objArr1.push({ name: 'first' }, { name: 'second' });

			expect(objArr2.toArray()).toEqual([{ name: 'first' }, { name: 'second' }]);
		});

		it('should sync nested arrays', async () => {
			const nestedArr1 = doc1.getArray<string[]>('nested');
			const nestedArr2 = doc2.getArray<string[]>('nested');

			await sync1.start();
			await sync2.start();

			nestedArr1.push(['a', 'b'], ['c', 'd']);

			expect(nestedArr2.toArray()).toEqual([
				['a', 'b'],
				['c', 'd'],
			]);
		});

		it('should sync plain objects in array', async () => {
			const objArr1 = doc1.getArray<{ value: number }>('objects');
			const objArr2 = doc2.getArray<{ value: number }>('objects');

			await sync1.start();
			await sync2.start();

			objArr1.push({ value: 100 });

			// Plain objects are synced as-is
			const result = objArr2.get(0) as { value: number };
			expect(result.value).toBe(100);
		});

		it('should sync plain array stored in map', async () => {
			await sync1.start();
			await sync2.start();

			map1.set('list', ['item1', 'item2']);

			// Plain arrays are returned as-is
			const list2 = map2.get('list') as string[];
			expect(list2).toEqual(['item1', 'item2']);
		});

		it('should sync array replacement in map', async () => {
			await sync1.start();
			await sync2.start();

			map1.set('list', ['a']);

			// Replace whole array to modify
			map1.set('list', ['a', 'b', 'c']);

			const list2 = map2.get('list') as string[];
			expect(list2).toEqual(['a', 'b', 'c']);
		});

		it('should sync nested structure with arrays in map', async () => {
			await sync1.start();
			await sync2.start();

			map1.set('node', { connections: { main: ['conn-1'] } });

			// Replace the whole structure to add more connections
			const node = map1.get('node') as { connections: { main: string[] } };
			map1.set('node', {
				connections: {
					main: [...node.connections.main, 'conn-2'],
				},
			});

			const node2 = map2.get('node') as { connections: { main: string[] } };
			expect(node2.connections.main).toEqual(['conn-1', 'conn-2']);
		});

		it('should handle concurrent push operations (both converge)', async () => {
			await sync1.start();
			await sync2.start();

			arr1.push('from1');
			arr2.push('from2');

			// Both should converge to same state
			const state1 = arr1.toArray();
			const state2 = arr2.toArray();
			expect(state1).toEqual(state2);
			expect(state1).toContain('from1');
			expect(state1).toContain('from2');
		});

		it('should handle concurrent insert at same index', async () => {
			await sync1.start();
			await sync2.start();

			// Setup initial data on both
			arr1.push('a', 'c');

			// Now both have ['a', 'c'] - insert at index 1 from both
			arr1.insert(1, 'b1');
			arr2.insert(1, 'b2');

			// Both should converge (CRDT determines order)
			const state1 = arr1.toArray();
			const state2 = arr2.toArray();
			expect(state1).toEqual(state2);
			expect(state1).toContain('b1');
			expect(state1).toContain('b2');
			expect(state1.length).toBe(4);
		});

		it('should handle rapid sequential array operations', async () => {
			await sync1.start();
			await sync2.start();

			for (let i = 0; i < 10; i++) {
				arr1.push(`item-${i}`);
			}

			expect(arr2.length).toBe(10);
			for (let i = 0; i < 10; i++) {
				expect(arr2.toArray()).toContain(`item-${i}`);
			}
		});
	});
});
