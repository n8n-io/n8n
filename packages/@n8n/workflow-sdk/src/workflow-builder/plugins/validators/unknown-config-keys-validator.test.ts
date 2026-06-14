import { unknownConfigKeysValidator } from './unknown-config-keys-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	config: Record<string, unknown> | undefined,
	name = 'Test Node',
): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.code',
		name,
		version: '2',
		config,
	} as unknown as NodeInstance<string, string, unknown>;
}

function createGraphNode(node: NodeInstance<string, string, unknown>): GraphNode {
	return {
		instance: node,
		connections: new Map(),
	};
}

function createMockPluginContext(): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

describe('unknownConfigKeysValidator', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(unknownConfigKeysValidator.id).toBe('core:unknown-config-keys');
		});

		it('applies to all node types', () => {
			expect(unknownConfigKeysValidator.nodeTypes).toBeUndefined();
		});
	});

	describe('validateNode', () => {
		it('returns UNKNOWN_CONFIG_KEY warning when node parameters are at the top level of config', () => {
			const node = createMockNode(
				{
					mode: 'runOnceForAllItems',
					language: 'javaScript',
					jsCode: 'return [{ json: { ok: true } }];',
				},
				'Code',
			);

			const issues = unknownConfigKeysValidator.validateNode(
				node,
				createGraphNode(node),
				createMockPluginContext(),
			);

			expect(issues).toHaveLength(1);
			expect(issues[0]).toEqual(
				expect.objectContaining({
					code: 'UNKNOWN_CONFIG_KEY',
					severity: 'warning',
					violationLevel: 'major',
					nodeName: 'Code',
				}),
			);
			expect(issues[0].message).toContain("'Code'");
			expect(issues[0].message).toContain('[n8n-nodes-base.code]');
			expect(issues[0].message).toContain('"mode"');
			expect(issues[0].message).toContain('"language"');
			expect(issues[0].message).toContain('"jsCode"');
			expect(issues[0].message).toContain('config.parameters');
		});

		it('returns no issues when config has only known top-level keys', () => {
			const node = createMockNode({
				parameters: { mode: 'runOnceForAllItems', jsCode: 'return $input.all();' },
				credentials: {},
				disabled: false,
				notes: 'A code node',
				notesInFlow: true,
				executeOnce: false,
				retryOnFail: false,
				alwaysOutputData: false,
				onError: 'stopWorkflow',
				output: [{ json: {} }],
				pinData: [{ json: {} }],
				position: [100, 200],
				webhookId: 'wh-1',
				subnodes: {},
				name: 'Code',
			});

			const issues = unknownConfigKeysValidator.validateNode(
				node,
				createGraphNode(node),
				createMockPluginContext(),
			);

			expect(issues).toHaveLength(0);
		});

		it('returns no issues for an empty config', () => {
			const node = createMockNode({});

			const issues = unknownConfigKeysValidator.validateNode(
				node,
				createGraphNode(node),
				createMockPluginContext(),
			);

			expect(issues).toHaveLength(0);
		});

		it('ignores internal markers prefixed with underscore', () => {
			const node = createMockNode({
				parameters: { mode: 'manual' },
				_originalName: 'Code 1',
			});

			const issues = unknownConfigKeysValidator.validateNode(
				node,
				createGraphNode(node),
				createMockPluginContext(),
			);

			expect(issues).toHaveLength(0);
		});

		it('reports a mix of known and unknown keys but only flags the unknown ones', () => {
			const node = createMockNode(
				{
					parameters: { url: 'https://example.com' },
					credentials: {},
					method: 'GET',
					url: 'https://example.com',
				},
				'HTTP Request',
			);

			const issues = unknownConfigKeysValidator.validateNode(
				node,
				createGraphNode(node),
				createMockPluginContext(),
			);

			expect(issues).toHaveLength(1);
			expect(issues[0].message).toContain('"method"');
			expect(issues[0].message).toContain('"url"');
			expect(issues[0].message).not.toContain('"parameters"');
			expect(issues[0].message).not.toContain('"credentials"');
		});

		it('returns no issues when config itself is missing', () => {
			const node = createMockNode(undefined, 'Code');

			const issues = unknownConfigKeysValidator.validateNode(
				node,
				createGraphNode(node),
				createMockPluginContext(),
			);

			expect(issues).toHaveLength(0);
		});
	});
});
