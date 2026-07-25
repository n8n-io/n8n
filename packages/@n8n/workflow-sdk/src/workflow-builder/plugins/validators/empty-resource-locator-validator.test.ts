import { emptyResourceLocatorValidator } from './empty-resource-locator-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	parameters: Record<string, unknown>,
	name = 'Sheets',
): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.googleSheets',
		name,
		version: '4.7',
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

describe('emptyResourceLocatorValidator', () => {
	it('has correct id', () => {
		expect(emptyResourceLocatorValidator.id).toBe('core:empty-resource-locator');
	});

	it('flags empty __rl.value', () => {
		const node = createMockNode({
			documentId: {
				__rl: true,
				mode: 'list',
				value: '',
				cachedResultName: 'FAQ spreadsheet',
			},
		});
		const issues = emptyResourceLocatorValidator.validateNode(
			node,
			createGraphNode(node),
			createContext(),
		);
		expect(issues).toEqual([
			expect.objectContaining({
				code: 'EMPTY_RESOURCE_LOCATOR_VALUE',
				parameterPath: 'documentId',
				severity: 'warning',
			}),
		]);
	});

	it('flags nested empty resource locators', () => {
		const node = createMockNode({
			options: {
				sheetName: { __rl: true, mode: 'name', value: '' },
			},
		});
		const issues = emptyResourceLocatorValidator.validateNode(
			node,
			createGraphNode(node),
			createContext(),
		);
		expect(issues.map((i) => i.parameterPath)).toEqual(['options.sheetName']);
	});

	it('does not flag non-empty values', () => {
		const node = createMockNode({
			documentId: { __rl: true, mode: 'id', value: 'abc123' },
		});
		expect(
			emptyResourceLocatorValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});

	it('does not flag placeholder markers', () => {
		const node = createMockNode({
			documentId: {
				__rl: true,
				mode: 'list',
				value: '<__PLACEHOLDER_VALUE__Pick a spreadsheet__>',
			},
		});
		expect(
			emptyResourceLocatorValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});
});
