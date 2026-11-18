import type { PolicedTool } from '@n8n/decorators';
import { READ_ONLY_ANNOTATIONS, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';

import { ToolEffectResolver } from '../tool-effect-resolver';

vi.mock('@/node-execution/resolve-tool-node-type', () => ({
	resolveToolNodeType: (nodeType: string) => nodeType,
}));

const description = (overrides: Partial<INodeTypeDescription>): INodeTypeDescription => ({
	displayName: 'Test',
	name: 'test',
	group: [],
	version: 1,
	description: '',
	defaults: {},
	inputs: [],
	outputs: [],
	properties: [],
	...overrides,
});

const mail = description({
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			default: 'get',
			options: [
				{ name: 'Get', value: 'get', annotations: READ_ONLY_ANNOTATIONS },
				{
					name: 'Send',
					value: 'send',
					annotations: { effect: 'write', destructive: false, idempotent: false },
				},
			],
		},
	],
});

const descriptions: Record<string, INodeTypeDescription> = {
	'n8n-nodes-base.mail': mail,
	'n8n-nodes-base.set': description({ annotations: READ_ONLY_ANNOTATIONS }),
	'n8n-nodes-base.unannotated': description({
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'get',
				options: [{ name: 'Get', value: 'get' }],
			},
		],
	}),
};

describe('ToolEffectResolver', () => {
	const nodeTypes = mock<NodeTypes>();
	nodeTypes.getByNameAndVersion.mockImplementation((nodeType) => {
		const found = descriptions[nodeType];
		if (!found) throw new Error(`Unknown node type ${nodeType}`);
		// A plain object: a deep mock would answer an absent `annotations` with a function.
		return { description: found } as INodeType;
	});
	const resolver = new ToolEffectResolver(nodeTypes);

	const nodeTool = (nodeType: string, nodeParameters?: unknown): PolicedTool => ({
		name: 'tool',
		metadata: { kind: 'node', nodeType, nodeTypeVersion: 1, nodeParameters },
	});

	describe('for a node tool', () => {
		it.each([
			['get', 'read'],
			['send', 'write'],
		])('takes the effect of the configured operation %s', (operation, effect) => {
			expect(resolver.effectOf(nodeTool('n8n-nodes-base.mail', { operation }))).toBe(effect);
		});

		it('takes the worst case when the model chooses the operation', () => {
			const tool = nodeTool('n8n-nodes-base.mail', { operation: "={{ $fromAI('operation') }}" });

			expect(resolver.effectOf(tool)).toBe('write');
		});

		it('takes the effect of a node type that is annotated as a whole', () => {
			expect(resolver.effectOf(nodeTool('n8n-nodes-base.set', {}))).toBe('read');
		});

		it.each([
			['a node type without annotations', nodeTool('n8n-nodes-base.unannotated', {})],
			['a node type that is not installed', nodeTool('n8n-nodes-base.gone', {})],
			['a tool without a node type', { name: 'load_skill' }],
			['a workflow tool', { name: 'refund', metadata: { kind: 'workflow', workflowId: 'wf-1' } }],
		])('does not know the effect of %s', (_name, tool) => {
			expect(resolver.effectOf(tool)).toBeUndefined();
		});
	});

	describe('for an MCP tool', () => {
		const mcpTool = (mcpToolName: string, mcpAnnotations?: PolicedTool['mcpAnnotations']) => ({
			name: `crm_${mcpToolName}`,
			mcpServerName: 'crm',
			mcpToolName,
			...(mcpAnnotations && { mcpAnnotations }),
		});

		it.each([
			['a read name', mcpTool('get_contact'), 'read'],
			['a write name', mcpTool('send_mail'), 'write'],
			['a name that says nothing', mcpTool('contact'), 'write'],
			['a read-only hint', mcpTool('contact', { readOnlyHint: true }), 'read'],
			['a destructive hint', mcpTool('get_contact', { destructiveHint: true }), 'write'],
		])('classifies a tool with %s', (_name, tool, effect) => {
			expect(resolver.effectOf(tool)).toBe(effect);
		});

		it('does not know the effect when the tool of the server is not known', () => {
			expect(resolver.effectOf({ name: 'crm_x', mcpServerName: 'crm' })).toBeUndefined();
		});
	});
});
