import type { WorkflowNode } from '../../../types';
import { summarizeWorkflowStructure } from '../summarize-workflow';

const nodes: WorkflowNode[] = [
	{ name: 'A', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [0, 0], parameters: {} },
	{ name: 'B', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [220, 0], parameters: {} },
];

const edge = [[{ node: 'B', type: 'main', index: 0 }]];

/**
 * Adds `key` as an own enumerable property — the shape `JSON.parse` produces for
 * a stored `connections` column, which an object literal cannot express for keys
 * like `__proto__`.
 */
function withOwnKey(key: string, value: unknown): Record<string, unknown> {
	const connections: Record<string, unknown> = {};
	Object.defineProperty(connections, key, {
		value,
		enumerable: true,
		writable: true,
		configurable: true,
	});
	return connections;
}

describe('summarizeWorkflowStructure', () => {
	it('renders nodes and edges of a normal graph', async () => {
		const summary = await summarizeWorkflowStructure('wf', nodes, { A: { main: edge } });

		expect(summary).toContain('A');
		expect(summary).toContain('B');
	});

	describe('keys that resolve to object internals', () => {
		afterEach(() => {
			delete (Object.prototype as Record<string, unknown>).main;
			delete (Object as unknown as Record<string, unknown>).main;
		});

		it('skips a source key that would resolve to the shared prototype', async () => {
			const connections = withOwnKey('__proto__', { main: edge });

			await summarizeWorkflowStructure('wf', nodes, connections);

			expect('main' in {}).toBe(false);
			expect(Object.getOwnPropertyNames(Object.prototype)).not.toContain('main');
		});

		it('skips a source key that would resolve to the Object constructor', async () => {
			const connections = withOwnKey('constructor', { main: edge });

			await summarizeWorkflowStructure('wf', nodes, connections);

			expect((Object as unknown as Record<string, unknown>).main).toBeUndefined();
		});

		it('skips a connection-type key that would resolve to object internals', async () => {
			const connections = { A: withOwnKey('__proto__', edge) };

			const summary = await summarizeWorkflowStructure('wf', nodes, connections);

			expect(summary).not.toContain('__proto__');
		});

		it('keeps the rest of the graph when an unsafe source key is skipped', async () => {
			const connections = withOwnKey('__proto__', { main: edge });
			connections.A = { main: edge };

			const summary = await summarizeWorkflowStructure('wf', nodes, connections);

			expect(summary).toContain('A');
			expect(summary).toContain('B');
			expect(summary).not.toContain('__proto__');
		});
	});
});
