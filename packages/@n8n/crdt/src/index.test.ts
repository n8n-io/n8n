import { ChangeAction, CRDTEngine, createCRDTProvider, isMapChange } from './index';
import type { CRDTDoc, CRDTMap, DeepChange, DeepChangeEvent } from './types';

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

		it('should emit deep path for nested modifications', () => {
			map.set('node', { position: { x: 100, y: 200 } });

			const changes: DeepChange[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			const nodeMap = map.get('node') as CRDTMap<unknown>;
			const positionMap = nodeMap.get('position') as CRDTMap<unknown>;
			positionMap.set('x', 150);

			expect(changes).toHaveLength(1);
			const change = changes[0] as DeepChangeEvent;
			expect(change.path).toEqual(['node', 'position', 'x']);
			expect(change.action).toBe(ChangeAction.update);
			expect(change.value).toBe(150);
			expect(change.oldValue).toBe(100);
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
			// Automerge can reconstruct the old value from document history
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
		// Helper to create a deeply nested object (maps only, no arrays)
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

		it('should edit deep nested leaf value', () => {
			const deepData = createNestedObject(4, 2);
			map.set('deep', deepData);

			// Navigate to a deep leaf and modify it
			const deep = map.get('deep') as CRDTMap<unknown>;
			const child0 = deep.get('child0') as CRDTMap<unknown>;
			const child0_0 = child0.get('child0') as CRDTMap<unknown>;
			const child0_0_0 = child0_0.get('child0') as CRDTMap<unknown>;
			const leaf = child0_0_0.get('child0') as CRDTMap<unknown>;

			leaf.set('value', 'MODIFIED');

			const result = map.toJSON() as {
				deep: {
					child0: { child0: { child0: { child0: { value: string } } } };
				};
			};
			expect(result.deep.child0.child0.child0.child0.value).toBe('MODIFIED');
		});

		it('should edit node position in workflow structure', () => {
			const workflow = createWorkflowData(10);
			map.set('workflow', workflow);

			// Navigate to a specific node and modify its position
			const workflowMap = map.get('workflow') as CRDTMap<unknown>;
			const nodes = workflowMap.get('nodes') as CRDTMap<unknown>;
			const node5 = nodes.get('node-5') as CRDTMap<unknown>;
			const position = node5.get('position') as CRDTMap<unknown>;

			position.set('x', 9999);
			position.set('y', 8888);

			const result = map.toJSON() as {
				workflow: { nodes: Record<string, { position: { x: number; y: number } }> };
			};
			expect(result.workflow.nodes['node-5'].position.x).toBe(9999);
			expect(result.workflow.nodes['node-5'].position.y).toBe(8888);
		});

		it('should add new nested parameter to existing node', () => {
			const workflow = createWorkflowData(5);
			map.set('workflow', workflow);

			const workflowMap = map.get('workflow') as CRDTMap<unknown>;
			const nodes = workflowMap.get('nodes') as CRDTMap<unknown>;
			const node2 = nodes.get('node-2') as CRDTMap<unknown>;
			const parameters = node2.get('parameters') as CRDTMap<unknown>;

			parameters.set('newParam', { deeply: { nested: { value: 'added' } } });

			const result = map.toJSON() as {
				workflow: {
					nodes: Record<
						string,
						{ parameters: { newParam: { deeply: { nested: { value: string } } } } }
					>;
				};
			};
			expect(result.workflow.nodes['node-2'].parameters.newParam.deeply.nested.value).toBe('added');
		});

		it('should delete deeply nested property', () => {
			const workflow = createWorkflowData(5);
			map.set('workflow', workflow);

			const workflowMap = map.get('workflow') as CRDTMap<unknown>;
			const nodes = workflowMap.get('nodes') as CRDTMap<unknown>;
			const node0 = nodes.get('node-0') as CRDTMap<unknown>;
			const parameters = node0.get('parameters') as CRDTMap<unknown>;
			const nested = parameters.get('nested') as CRDTMap<unknown>;

			nested.delete('deep');

			const result = map.toJSON() as {
				workflow: { nodes: Record<string, { parameters: { nested: Record<string, unknown> } }> };
			};
			expect(result.workflow.nodes['node-0'].parameters.nested.deep).toBeUndefined();
		});

		it('should emit change events for deep edits', () => {
			const workflow = createWorkflowData(3);
			map.set('workflow', workflow);

			const changes: DeepChange[] = [];
			map.onDeepChange((events) => changes.push(...events));

			const workflowMap = map.get('workflow') as CRDTMap<unknown>;
			const nodes = workflowMap.get('nodes') as CRDTMap<unknown>;
			const node1 = nodes.get('node-1') as CRDTMap<unknown>;
			node1.set('name', 'Renamed Node');

			expect(changes.length).toBeGreaterThan(0);
			const nameChange = changes
				.filter(isMapChange)
				.find((c) => c.path.includes('name') && c.value === 'Renamed Node');
			expect(nameChange).toBeDefined();
		});

		it('should handle multiple rapid edits to different nested paths', () => {
			const workflow = createWorkflowData(10);
			map.set('workflow', workflow);

			const workflowMap = map.get('workflow') as CRDTMap<unknown>;
			const nodes = workflowMap.get('nodes') as CRDTMap<unknown>;

			// Rapid edits to different nodes
			for (let i = 0; i < 10; i++) {
				const node = nodes.get(`node-${i}`) as CRDTMap<unknown>;
				node.set('name', `Updated Node ${i}`);
				const position = node.get('position') as CRDTMap<unknown>;
				position.set('x', i * 100);
			}

			const result = map.toJSON() as {
				workflow: { nodes: Record<string, { name: string; position: { x: number } }> };
			};

			for (let i = 0; i < 10; i++) {
				expect(result.workflow.nodes[`node-${i}`].name).toBe(`Updated Node ${i}`);
				expect(result.workflow.nodes[`node-${i}`].position.x).toBe(i * 100);
			}
		});

		it('should replace entire nested subtree', () => {
			const workflow = createWorkflowData(5);
			map.set('workflow', workflow);

			const workflowMap = map.get('workflow') as CRDTMap<unknown>;
			const nodes = workflowMap.get('nodes') as CRDTMap<unknown>;
			const node3 = nodes.get('node-3') as CRDTMap<unknown>;

			// Replace entire parameters object
			node3.set('parameters', {
				completelyNew: true,
				differentStructure: {
					foo: 'bar',
					count: 42,
				},
			});

			const result = map.toJSON() as {
				workflow: {
					nodes: Record<
						string,
						{
							parameters: {
								completelyNew: boolean;
								differentStructure: { foo: string; count: number };
							};
						}
					>;
				};
			};
			expect(result.workflow.nodes['node-3'].parameters.completelyNew).toBe(true);
			expect(result.workflow.nodes['node-3'].parameters.differentStructure.foo).toBe('bar');
		});
	});
});
