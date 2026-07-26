import { codeNodePythonValidator } from './code-node-python-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	parameters: Record<string, unknown>,
): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.code',
		name: 'Py Transform',
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

describe('codeNodePythonValidator', () => {
	it('flags requests in pythonCode', () => {
		const node = createMockNode({
			language: 'pythonNative',
			pythonCode: 'import requests\nrequests.get("https://example.com")',
		});
		const issues = codeNodePythonValidator.validateNode(
			node,
			createGraphNode(node),
			createContext(),
		);
		expect(issues).toEqual([
			expect.objectContaining({ code: 'CODE_NODE_NETWORK_CALL', nodeName: 'Py Transform' }),
		]);
	});

	it('ignores JavaScript code nodes', () => {
		const node = createMockNode({
			language: 'javaScript',
			jsCode: 'await fetch("https://example.com");',
		});
		expect(
			codeNodePythonValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});
});
