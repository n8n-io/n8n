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

	it('allows empty list mode with cachedResultName (setup From-list picker)', () => {
		const node = createMockNode({
			documentId: {
				__rl: true,
				mode: 'list',
				value: '',
				cachedResultName: 'FAQ spreadsheet',
			},
		});
		expect(
			emptyResourceLocatorValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});

	it('allows empty list mode without cachedResultName (node default)', () => {
		const node = createMockNode({
			documentId: { __rl: true, mode: 'list', value: '' },
		});
		expect(
			emptyResourceLocatorValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});

	it('flags empty id-mode resource locators', () => {
		const node = createMockNode({
			documentId: { __rl: true, mode: 'id', value: '' },
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
		expect(issues[0]?.message).toContain("mode: 'list'");
	});

	it('flags nested empty id-mode resource locators', () => {
		const node = createMockNode({
			options: {
				sheetName: { __rl: true, mode: 'id', value: '' },
			},
		});
		const issues = emptyResourceLocatorValidator.validateNode(
			node,
			createGraphNode(node),
			createContext(),
		);
		expect(issues.map((i) => i.parameterPath)).toEqual(['options.sheetName']);
	});

	it('does not flag empty name mode', () => {
		const node = createMockNode({
			sheetName: { __rl: true, mode: 'name', value: '' },
		});
		expect(
			emptyResourceLocatorValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});

	it('does not flag non-empty values', () => {
		const node = createMockNode({
			documentId: { __rl: true, mode: 'id', value: 'abc123' },
		});
		expect(
			emptyResourceLocatorValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});

	it('does not flag placeholder markers in id mode', () => {
		const node = createMockNode({
			documentId: {
				__rl: true,
				mode: 'id',
				value: '<__PLACEHOLDER_VALUE__Enter spreadsheet ID__>',
			},
		});
		expect(
			emptyResourceLocatorValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});
});
