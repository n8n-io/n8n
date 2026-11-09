import type { IConnection, IConnections, INode, NodeConnectionType } from 'n8n-workflow';
import { mapConnectionsByDestination } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/workflow';

import { sanitizeWorkflowForBuilder } from '../workflow-sanitization';

/**
 * A persisted workflow reaches the builder as parsed JSON, so a reserved key arrives as an
 * own property of the connections map. An object literal cannot express that (`__proto__`
 * in a literal sets the prototype instead), so build these fixtures with JSON.parse.
 */
function parseConnections(json: string): IConnections {
	return JSON.parse(json) as IConnections;
}

function createNode(name: string): INode {
	return {
		id: `id-${name}`,
		name,
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
}

function createWorkflow(nodes: INode[], connections: IConnections = {}): SimpleWorkflow {
	return { name: 'Test Workflow', nodes, connections };
}

describe('sanitizeWorkflowForBuilder', () => {
	const reservedKeys = ['main', 'ai_languageModel', 'shell'];

	afterEach(() => {
		for (const key of reservedKeys) {
			delete (Object.prototype as Record<string, unknown>)[key];
		}
	});

	it('should return the same workflow when every name and connection key is usable', () => {
		const workflow = createWorkflow([createNode('Manual'), createNode('Sink')], {
			Manual: { main: [[{ node: 'Sink', type: 'main', index: 0 }]] },
		});

		const result = sanitizeWorkflowForBuilder(workflow);

		// Unchanged input is returned as-is, so the common case allocates nothing.
		expect(result).toBe(workflow);
	});

	it('should drop a node whose name is not a usable object key', () => {
		const workflow = createWorkflow([createNode('__proto__'), createNode('Sink')]);

		const result = sanitizeWorkflowForBuilder(workflow);

		expect(result.nodes.map((n) => n.name)).toEqual(['Sink']);
	});

	it('should drop connections that start from a node with an unusable name', () => {
		const workflow = createWorkflow(
			[createNode('__proto__'), createNode('Sink')],
			parseConnections('{"__proto__":{"main":[[{"node":"Sink","type":"main","index":0}]]}}'),
		);

		const result = sanitizeWorkflowForBuilder(workflow);

		expect(Object.keys(result.connections)).toEqual([]);
	});

	it('should drop connections that point at a node with an unusable name', () => {
		const workflow = createWorkflow([createNode('Manual'), createNode('__proto__')], {
			Manual: {
				main: [
					[
						{ node: '__proto__', type: 'main', index: 0 },
						{ node: 'Sink', type: 'main', index: 0 },
					],
				],
			},
		});

		const result = sanitizeWorkflowForBuilder(workflow);

		expect(result.connections.Manual?.main?.[0]).toEqual([
			{ node: 'Sink', type: 'main', index: 0 },
		]);
	});

	it('should drop a connection type that is not a usable object key', () => {
		const workflow = createWorkflow(
			[createNode('Manual'), createNode('Sink')],
			parseConnections(
				'{"Manual":{"__proto__":[[{"node":"Sink","type":"main","index":0}]],"main":[[{"node":"Sink","type":"main","index":0}]]}}',
			),
		);

		const result = sanitizeWorkflowForBuilder(workflow);

		expect(Object.keys(result.connections.Manual!)).toEqual(['main']);
	});

	it('should leave the shared object prototype untouched for a reserved source key', () => {
		const workflow = createWorkflow(
			[createNode('Sink')],
			parseConnections('{"__proto__":{"shell":[[{"node":"Sink","type":"main","index":0}]]}}'),
		);

		sanitizeWorkflowForBuilder(workflow);

		expect(({} as Record<string, unknown>).shell).toBeUndefined();
	});

	it('should drop a connection whose target name has no node entry', () => {
		// A stored payload can name a target that is absent from `nodes`, so filtering by the
		// set of known unsafe node names is not enough on its own.
		const workflow = createWorkflow([createNode('Manual')], {
			Manual: {
				main: [
					[
						{ node: '__proto__', type: 'main', index: 0 },
						{ node: 'Sink', type: 'main', index: 0 },
					],
				],
			},
		});

		const result = sanitizeWorkflowForBuilder(workflow);

		expect(result.connections.Manual?.main?.[0]).toEqual([
			{ node: 'Sink', type: 'main', index: 0 },
		]);
	});

	it('should drop a connection whose type field is not a usable object key', () => {
		// Traversal helpers key the inverted graph by this field as well as by `node`.
		const workflow = createWorkflow([createNode('Manual'), createNode('Sink')], {
			Manual: {
				main: [
					[
						{ node: 'Sink', type: '__proto__' as NodeConnectionType, index: 0 },
						{ node: 'Sink', type: 'main', index: 0 },
					],
				],
			},
		});

		const result = sanitizeWorkflowForBuilder(workflow);

		expect(result.connections.Manual?.main?.[0]).toEqual([
			{ node: 'Sink', type: 'main', index: 0 },
		]);
	});

	// A request body is JSON, so these fields are only strings by convention. The key check
	// has to reject a non-string outright: bracket access would coerce it back to the very
	// name being guarded against ( obj[['__proto__']] writes to obj['__proto__'] ).
	const coercibleKeys: Array<[string, unknown]> = [
		['a string', '__proto__'],
		['an array', ['__proto__']],
		['a nested array', [['__proto__']]],
		['an object with toString', { toString: (): string => '__proto__' }],
	];

	it.each(coercibleKeys)('should drop a connection whose target is %s', (_label, node) => {
		const workflow = createWorkflow([createNode('Manual')], {
			Manual: {
				main: [[{ node, type: 'main', index: 0 } as unknown as IConnection]],
			},
		});

		const result = sanitizeWorkflowForBuilder(workflow);

		expect(result.connections.Manual?.main?.[0]).toEqual([]);
		expect(({} as Record<string, unknown>).main).toBeUndefined();
	});

	it.each(coercibleKeys)('should drop a node whose name is %s', (_label, name) => {
		const workflow = createWorkflow([
			{ ...createNode('placeholder'), name } as unknown as INode,
			createNode('Keep'),
		]);

		const result = sanitizeWorkflowForBuilder(workflow);

		expect(result.nodes.map((n) => n.name)).toEqual(['Keep']);
	});

	it('should leave the inverted graph intact for a non-string target', () => {
		// End to end on the choke-point property: whatever the sanitizer returns must be
		// safe to invert, which is where a surviving field would be used as a key.
		const workflow = JSON.parse(
			'{"name":"w","nodes":[],"connections":{"A":{"main":[[{"node":["__proto__"],"type":"main","index":0}]]}}}',
		) as SimpleWorkflow;

		const result = sanitizeWorkflowForBuilder(workflow);

		expect(result.connections.A?.main?.[0]).toEqual([]);
		expect(Object.getPrototypeOf(mapConnectionsByDestination(result.connections))).toBe(
			Object.prototype,
		);
	});

	it('should keep the workflow name and unrelated nodes', () => {
		const workflow = createWorkflow([createNode('__proto__'), createNode('Keep')], {
			Keep: { main: [[]] },
		});

		const result = sanitizeWorkflowForBuilder(workflow);

		expect(result.name).toBe('Test Workflow');
		expect(result.nodes.map((n) => n.name)).toEqual(['Keep']);
		expect(result.connections.Keep).toBeDefined();
	});
});
