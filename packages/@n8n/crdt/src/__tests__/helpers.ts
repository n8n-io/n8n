/**
 * Test helpers for CRDT conformance tests.
 */

/**
 * Create a deeply nested object (maps only, no arrays).
 * Useful for testing deep traversal and modification.
 *
 * @param depth - How many levels deep to nest
 * @param breadth - How many children per level
 * @returns Nested object structure with `value` at leaves
 */
export function createNestedObject(depth: number, breadth: number): Record<string, unknown> {
	if (depth === 0) {
		return { value: `leaf-${Math.random().toString(36).slice(2, 8)}` };
	}
	const result: Record<string, unknown> = {};
	for (let i = 0; i < breadth; i++) {
		result[`child${i}`] = createNestedObject(depth - 1, breadth);
	}
	return result;
}

/**
 * Create a workflow-like structure using maps (nodes keyed by id).
 * Simulates real n8n workflow data for testing.
 *
 * @param nodeCount - Number of nodes to create
 * @returns Workflow structure with nodes, connections, and settings
 */
export function createWorkflowData(nodeCount: number): Record<string, unknown> {
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
