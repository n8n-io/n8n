import { codeNodeValidator } from './code-node-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	parameters: Record<string, unknown>,
): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.code',
		name: 'Transform',
		version: '2',
		config: { parameters },
	} as NodeInstance<string, string, unknown>;
}

function createGraphNode(node: NodeInstance<string, string, unknown>): GraphNode {
	return { instance: node, connections: new Map() };
}

function createContext(): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

describe('codeNodeValidator', () => {
	it('has correct id', () => {
		expect(codeNodeValidator.id).toBe('core:code-node');
	});

	it('flags fetch() in jsCode', () => {
		const node = createMockNode({
			jsCode: 'const res = await fetch("https://api.example.com");\nreturn [];',
		});
		const issues = codeNodeValidator.validateNode(node, createGraphNode(node), createContext());
		expect(issues).toEqual([
			expect.objectContaining({ code: 'CODE_NODE_NETWORK_CALL', nodeName: 'Transform' }),
		]);
	});

	it('flags require("https")', () => {
		const node = createMockNode({
			jsCode: "const https = require('https');\nreturn [];",
		});
		expect(
			codeNodeValidator
				.validateNode(node, createGraphNode(node), createContext())
				.map((i) => i.code),
		).toEqual(['CODE_NODE_NETWORK_CALL']);
	});

	it('flags $input.all() in runOnceForEachItem mode', () => {
		const node = createMockNode({
			mode: 'runOnceForEachItem',
			jsCode: 'return $input.all().map(i => i.json);',
		});
		expect(
			codeNodeValidator
				.validateNode(node, createGraphNode(node), createContext())
				.map((i) => i.code),
		).toEqual(['CODE_MODE_API_MISUSE']);
	});

	it('allows $input.all() in default runOnceForAllItems mode', () => {
		const node = createMockNode({
			jsCode: 'return $input.all().map(i => ({ json: i.json }));',
		});
		expect(codeNodeValidator.validateNode(node, createGraphNode(node), createContext())).toEqual(
			[],
		);
	});

	it('allows per-item $json without network calls', () => {
		const node = createMockNode({
			mode: 'runOnceForEachItem',
			jsCode: 'return { doubled: $json.n * 2 };',
		});
		expect(codeNodeValidator.validateNode(node, createGraphNode(node), createContext())).toEqual(
			[],
		);
	});
});
