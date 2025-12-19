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

	describe('Large deeply nested data', () => {
		// Helper to create a deeply nested object
		function createNestedObject(depth: number, breadth: number): Record<string, unknown> {
			if (depth === 0) {
				return { value: `leaf-${Math.random().toString(36).slice(2, 8)}` };
			}
			const result: Record<string, unknown> = {};
			for (let i = 0; i < breadth; i++) {
				result[`child${i}`] = createNestedObject(depth - 1, breadth);
			}
			return result;
		}

		// Helper to create a workflow-like structure using maps (nodes keyed by id)
		function createWorkflowData(nodeCount: number): Record<string, unknown> {
			const nodes: Record<string, unknown> = {};
			const connections: Record<string, unknown> = {};

			for (let i = 0; i < nodeCount; i++) {
				const nodeId = `node-${i}`;
				nodes[nodeId] = {
					id: nodeId,
					name: `Node ${i}`,
					type: i % 3 === 0 ? 'trigger' : i % 3 === 1 ? 'action' : 'transform',
					position: { x: i * 200, y: Math.floor(i / 5) * 150 },
					parameters: {
						setting1: `value-${i}`,
						setting2: i * 10,
						nested: {
							deep: {
								config: { enabled: i % 2 === 0, threshold: i * 0.1 },
							},
						},
					},
					credentials: i % 2 === 0 ? { apiKey: `key-${i}` } : null,
				};

				if (i > 0) {
					connections[`node-${i - 1}`] = {
						main: { target: nodeId, type: 'main', index: 0 },
					};
				}
			}

			return {
				name: 'Test Workflow',
				active: true,
				nodes,
				connections,
				settings: {
					executionOrder: 'v1',
					saveExecutionProgress: true,
					callerPolicy: 'workflowsFromSameOwner',
				},
			};
		}

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

		it('should sync edits to deep nested values', async () => {
			await sync1.start();
			await sync2.start();

			// Create initial structure on doc1
			const workflow = createWorkflowData(10);
			map1.set('workflow', workflow);

			// Verify doc2 received it
			const initialResult = map2.toJSON() as { workflow: { nodes: Record<string, unknown> } };
			expect(Object.keys(initialResult.workflow.nodes).length).toBe(10);

			// Edit deep nested value on doc1
			const workflowMap = map1.get('workflow') as CRDTMap<unknown>;
			const nodes = workflowMap.get('nodes') as CRDTMap<unknown>;
			const node5 = nodes.get('node-5') as CRDTMap<unknown>;
			const position = node5.get('position') as CRDTMap<unknown>;
			position.set('x', 9999);

			// Verify edit synced to doc2
			const editedResult = map2.toJSON() as {
				workflow: { nodes: Record<string, { position: { x: number } }> };
			};
			expect(editedResult.workflow.nodes['node-5'].position.x).toBe(9999);
		});

		it('should sync concurrent edits to different nested paths', async () => {
			await sync1.start();
			await sync2.start();

			// Create initial structure
			const workflow = createWorkflowData(5);
			map1.set('workflow', workflow);

			// Both docs edit different nodes
			const workflow1 = map1.get('workflow') as CRDTMap<unknown>;
			const nodes1 = workflow1.get('nodes') as CRDTMap<unknown>;
			const node1 = nodes1.get('node-1') as CRDTMap<unknown>;
			node1.set('name', 'Edited by doc1');

			const workflow2 = map2.get('workflow') as CRDTMap<unknown>;
			const nodes2 = workflow2.get('nodes') as CRDTMap<unknown>;
			const node3 = nodes2.get('node-3') as CRDTMap<unknown>;
			node3.set('name', 'Edited by doc2');

			// Both should converge with both edits
			const result1 = map1.toJSON() as {
				workflow: { nodes: Record<string, { name: string }> };
			};
			const result2 = map2.toJSON() as {
				workflow: { nodes: Record<string, { name: string }> };
			};

			expect(result1.workflow.nodes['node-1'].name).toBe('Edited by doc1');
			expect(result1.workflow.nodes['node-3'].name).toBe('Edited by doc2');
			expect(result2.workflow.nodes['node-1'].name).toBe('Edited by doc1');
			expect(result2.workflow.nodes['node-3'].name).toBe('Edited by doc2');
		});

		it('should sync deletion of deeply nested property', async () => {
			await sync1.start();
			await sync2.start();

			const workflow = createWorkflowData(3);
			map1.set('workflow', workflow);

			// Delete nested property on doc1
			const workflowMap = map1.get('workflow') as CRDTMap<unknown>;
			const nodes = workflowMap.get('nodes') as CRDTMap<unknown>;
			const node0 = nodes.get('node-0') as CRDTMap<unknown>;
			const params = node0.get('parameters') as CRDTMap<unknown>;
			params.delete('nested');

			// Verify deletion synced to doc2
			const result = map2.toJSON() as {
				workflow: { nodes: Record<string, { parameters: Record<string, unknown> }> };
			};
			expect(result.workflow.nodes['node-0'].parameters.nested).toBeUndefined();
		});

		it('should sync rapid sequential edits to nested data', async () => {
			await sync1.start();
			await sync2.start();

			const workflow = createWorkflowData(5);
			map1.set('workflow', workflow);

			// Rapid edits on doc1
			const workflowMap = map1.get('workflow') as CRDTMap<unknown>;
			const nodes = workflowMap.get('nodes') as CRDTMap<unknown>;

			for (let i = 0; i < 5; i++) {
				const node = nodes.get(`node-${i}`) as CRDTMap<unknown>;
				node.set('name', `Rapid Update ${i}`);
			}

			// All edits should sync to doc2
			const result = map2.toJSON() as {
				workflow: { nodes: Record<string, { name: string }> };
			};

			for (let i = 0; i < 5; i++) {
				expect(result.workflow.nodes[`node-${i}`].name).toBe(`Rapid Update ${i}`);
			}
		});
	});
});
