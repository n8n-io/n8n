import { branchOutputValidator } from './branch-output-validator';
import type { ConnectionTarget, GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	parameters: Record<string, unknown> = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '2',
		config: { parameters },
	} as NodeInstance<string, string, unknown>;
}

function conn(node: string): ConnectionTarget {
	return { node, type: 'main', index: 0 };
}

function createGraphNode(
	node: NodeInstance<string, string, unknown>,
	mainOutputs: Map<number, ConnectionTarget[]> = new Map(),
): GraphNode {
	const connections = new Map<string, Map<number, ConnectionTarget[]>>();
	if (mainOutputs.size > 0) {
		connections.set('main', mainOutputs);
	}
	return { instance: node, connections };
}

function createContext(): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

describe('branchOutputValidator', () => {
	it('has correct id', () => {
		expect(branchOutputValidator.id).toBe('core:branch-output');
	});

	it('flags IF with neither branch wired', () => {
		const node = createMockNode('n8n-nodes-base.if', 'Is Important');
		const issues = branchOutputValidator.validateNode(node, createGraphNode(node), createContext());
		expect(issues).toHaveLength(1);
		expect(issues[0].code).toBe('BRANCH_OUTPUT_NOT_WIRED');
		expect(issues[0].message).toContain('true');
		expect(issues[0].message).toContain('false');
	});

	it('flags IF with only true branch wired', () => {
		const node = createMockNode('n8n-nodes-base.if', 'Is Important');
		const issues = branchOutputValidator.validateNode(
			node,
			createGraphNode(node, new Map([[0, [conn('Handle')]]])),
			createContext(),
		);
		expect(issues.map((issue) => issue.code)).toEqual(['BRANCH_OUTPUT_NOT_WIRED']);
		expect(issues[0].message).toContain('false');
	});

	it('accepts IF with both branches wired', () => {
		const node = createMockNode('n8n-nodes-base.if', 'Is Important');
		expect(
			branchOutputValidator.validateNode(
				node,
				createGraphNode(
					node,
					new Map([
						[0, [conn('True')]],
						[1, [conn('False')]],
					]),
				),
				createContext(),
			),
		).toEqual([]);
	});

	it('flags Switch with missing onCase wiring', () => {
		const node = createMockNode('n8n-nodes-base.switch', 'Route', {
			rules: {
				values: [
					{ conditions: { conditions: [], combinator: 'and', options: {} } },
					{ conditions: { conditions: [], combinator: 'and', options: {} } },
				],
			},
		});
		const issues = branchOutputValidator.validateNode(
			node,
			createGraphNode(node, new Map([[0, [conn('A')]]])),
			createContext(),
		);
		expect(issues.map((issue) => issue.code)).toEqual(['BRANCH_OUTPUT_NOT_WIRED']);
		expect(issues[0].message).toContain('.onCase(1');
	});

	it('accepts Switch with every rule case wired', () => {
		const node = createMockNode('n8n-nodes-base.switch', 'Route', {
			rules: {
				values: [
					{ conditions: { conditions: [], combinator: 'and', options: {} } },
					{ conditions: { conditions: [], combinator: 'and', options: {} } },
				],
			},
		});
		expect(
			branchOutputValidator.validateNode(
				node,
				createGraphNode(
					node,
					new Map([
						[0, [conn('A')]],
						[1, [conn('B')]],
					]),
				),
				createContext(),
			),
		).toEqual([]);
	});
});
