import type { INodeTypeDescription } from 'n8n-workflow';

import type { BinaryCheckContext } from '../../types';
import { allNodesConnected } from '../all-nodes-connected';
import { expressionsReferenceExistingNodes } from '../expressions-reference-existing-nodes';
import { hasStartNode } from '../has-start-node';
import { noCodeImports } from '../no-code-imports';
import { noEmptySetNodes } from '../no-empty-set-nodes';
import { noUnnecessaryCodeNodes } from '../no-unnecessary-code-nodes';
import { noUnreachableNodes } from '../no-unreachable-nodes';
import {
	hasNodes,
	hasTrigger,
	noHardcodedCredentials,
	noInvalidFromAi,
	toolsHaveParameters,
	validOptionsValues,
	validRequiredParameters,
} from '../validation-checks';

// Minimal trigger node type for tests
const triggerNodeType: INodeTypeDescription = {
	displayName: 'Manual Trigger',
	name: 'n8n-nodes-base.manualTrigger',
	group: ['trigger'],
	version: 1,
	defaults: { name: 'When clicking' },
	inputs: [],
	outputs: ['main'],
	description: 'Manual trigger',
	properties: [],
};

const regularNodeType: INodeTypeDescription = {
	displayName: 'Set',
	name: 'n8n-nodes-base.set',
	group: ['transform'],
	version: [3, 3.2, 3.4],
	defaults: { name: 'Edit Fields' },
	inputs: ['main'],
	outputs: ['main'],
	description: 'Set fields',
	properties: [],
};

const codeNodeType: INodeTypeDescription = {
	displayName: 'Code',
	name: 'n8n-nodes-base.code',
	group: ['transform'],
	version: 1,
	defaults: { name: 'Code' },
	inputs: ['main'],
	outputs: ['main'],
	description: 'Custom code',
	properties: [],
};

const nodeTypes: INodeTypeDescription[] = [triggerNodeType, regularNodeType, codeNodeType];

function makeCtx(overrides?: Partial<BinaryCheckContext>): BinaryCheckContext {
	return { prompt: 'test', nodeTypes, ...overrides };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper, partial INode is fine
function makeWorkflow(partial: Record<string, any>) {
	return { name: 'test', nodes: [], connections: {}, ...partial };
}

describe('has_nodes', () => {
	it('passes when workflow has nodes', async () => {
		const result = await hasNodes.run(
			makeWorkflow({
				nodes: [{ name: 'A', type: 'n8n-nodes-base.set', typeVersion: 3, position: [0, 0] }],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when workflow has no nodes', async () => {
		const result = await hasNodes.run(makeWorkflow({ nodes: [] }), makeCtx());
		expect(result.pass).toBe(false);
		expect(result.comment).toBe('Workflow has no nodes');
	});
});

describe('has_trigger', () => {
	it('passes when trigger node exists', async () => {
		const result = await hasTrigger.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when no trigger node', async () => {
		const result = await hasTrigger.run(
			makeWorkflow({
				nodes: [{ name: 'A', type: 'n8n-nodes-base.set', typeVersion: 3, position: [0, 0] }],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
	});
});

describe('all_nodes_connected', () => {
	it('passes when empty workflow', async () => {
		const result = await allNodesConnected.run(makeWorkflow({}), makeCtx());
		expect(result.pass).toBe(true);
	});

	it('fails for single disconnected node', async () => {
		const result = await allNodesConnected.run(
			makeWorkflow({
				nodes: [{ name: 'Orphan', type: 'n8n-nodes-base.set', typeVersion: 3, position: [0, 0] }],
				connections: {},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Orphan');
	});

	it('passes when all nodes are connected', async () => {
		const result = await allNodesConnected.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0] },
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('ignores sticky notes when checking connectivity', async () => {
		const result = await allNodesConnected.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0] },
					{
						name: 'Note',
						type: 'n8n-nodes-base.stickyNote',
						typeVersion: 1,
						position: [400, 200],
					},
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when one node is disconnected', async () => {
		const result = await allNodesConnected.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0] },
					{ name: 'Orphan', type: 'n8n-nodes-base.set', typeVersion: 3, position: [400, 0] },
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Orphan');
	});
});

describe('no_unreachable_nodes', () => {
	it('passes when empty workflow', async () => {
		const result = await noUnreachableNodes.run(makeWorkflow({}), makeCtx());
		expect(result.pass).toBe(true);
	});

	it('fails when no trigger exists (all nodes unreachable)', async () => {
		const result = await noUnreachableNodes.run(
			makeWorkflow({
				nodes: [{ name: 'A', type: 'n8n-nodes-base.set', typeVersion: 3, position: [0, 0] }],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('No trigger found');
	});

	it('passes when all nodes reachable from trigger', async () => {
		const result = await noUnreachableNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0] },
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when node is not reachable from trigger', async () => {
		const result = await noUnreachableNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0] },
					{ name: 'Orphan', type: 'n8n-nodes-base.set', typeVersion: 3, position: [400, 0] },
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Orphan');
	});

	it('ignores sticky notes when checking reachability', async () => {
		const result = await noUnreachableNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0] },
					{
						name: 'Note',
						type: 'n8n-nodes-base.stickyNote',
						typeVersion: 1,
						position: [400, 200],
					},
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('handles nested sub-nodes (Tool → AgentTool → Agent)', async () => {
		// Simulates: Trigger → Agent ← AgentTool ← LLM Model + Tool
		const result = await noUnreachableNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						name: 'Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 3.1,
						position: [200, 0],
					},
					{
						name: 'LLM',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1,
						position: [200, 200],
					},
					{
						name: 'SubAgent',
						type: '@n8n/n8n-nodes-langchain.agentTool',
						typeVersion: 3,
						position: [400, 200],
					},
					{
						name: 'SubLLM',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1,
						position: [400, 400],
					},
					{
						name: 'SearchTool',
						type: '@n8n/n8n-nodes-langchain.toolSerpApi',
						typeVersion: 1,
						position: [500, 400],
					},
				],
				connections: {
					Trigger: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
					LLM: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
					SubAgent: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
					SubLLM: {
						ai_languageModel: [[{ node: 'SubAgent', type: 'ai_languageModel', index: 0 }]],
					},
					SearchTool: { ai_tool: [[{ node: 'SubAgent', type: 'ai_tool', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});
});

describe('no_empty_set_nodes', () => {
	it('passes when no Set nodes', async () => {
		const result = await noEmptySetNodes.run(
			makeWorkflow({
				nodes: [
					{ name: 'A', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0] },
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('passes with v3 assignments format', async () => {
		const result = await noEmptySetNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [0, 0],
						parameters: {
							assignments: {
								assignments: [{ name: 'field', value: 'val', type: 'string' }],
							},
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('passes with v2 fields.values format', async () => {
		const result = await noEmptySetNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.2,
						position: [0, 0],
						parameters: {
							fields: {
								values: [{ name: 'text', stringValue: '={{ $json.text }}' }],
							},
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when Set node has no assignments in either format', async () => {
		const result = await noEmptySetNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Empty Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: {},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Empty Set');
	});

	it('fails when assignments array is empty', async () => {
		const result = await noEmptySetNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'EmptyAssign',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [0, 0],
						parameters: {
							assignments: { assignments: [] },
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
	});
});

describe('no_hardcoded_credentials', () => {
	it('passes when no hardcoded credentials', async () => {
		const result = await noHardcodedCredentials.run(
			makeWorkflow({
				nodes: [{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [0, 0] }],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});
});

describe('no_unnecessary_code_nodes', () => {
	it('passes when no code nodes', async () => {
		const result = await noUnnecessaryCodeNodes.run(
			makeWorkflow({
				nodes: [{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [0, 0] }],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when code node exists without annotation', async () => {
		const result = await noUnnecessaryCodeNodes.run(
			makeWorkflow({
				nodes: [{ name: 'Code', type: 'n8n-nodes-base.code', typeVersion: 1, position: [0, 0] }],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Code');
	});

	it('passes when code node exists with code_necessary annotation', async () => {
		const result = await noUnnecessaryCodeNodes.run(
			makeWorkflow({
				nodes: [{ name: 'Code', type: 'n8n-nodes-base.code', typeVersion: 1, position: [0, 0] }],
			}),
			makeCtx({ annotations: { code_necessary: true } }),
		);
		expect(result.pass).toBe(true);
	});
});

describe('has_start_node', () => {
	it('fails when workflow has no nodes', async () => {
		const result = await hasStartNode.run(makeWorkflow({}), makeCtx());
		expect(result.pass).toBe(false);
	});

	it('passes when trigger has downstream node', async () => {
		const result = await hasStartNode.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0] },
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when trigger has no downstream node', async () => {
		const result = await hasStartNode.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
	});
});

describe('expressions_reference_existing_nodes', () => {
	it('passes when expressions reference existing nodes', async () => {
		const result = await expressionsReferenceExistingNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [200, 0],
						parameters: {
							assignments: {
								assignments: [
									{ name: 'val', value: "={{ $('Trigger').first().json.data }}", type: 'string' },
								],
							},
						},
					},
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when expression references non-existent node', async () => {
		const result = await expressionsReferenceExistingNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: {
							assignments: {
								assignments: [
									{
										name: 'val',
										value: "={{ $('NonExistent').first().json.data }}",
										type: 'string',
									},
								],
							},
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('NonExistent');
		expect(result.comment).toContain('Set');
	});

	it('passes when no expressions are present', async () => {
		const result = await expressionsReferenceExistingNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: { mode: 'manual' },
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('passes for $json references (no node name)', async () => {
		const result = await expressionsReferenceExistingNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: {
							assignments: {
								assignments: [{ name: 'val', value: '={{ $json.field }}', type: 'string' }],
							},
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('detects legacy $node["Name"] syntax', async () => {
		const result = await expressionsReferenceExistingNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: {
							assignments: {
								assignments: [
									{
										name: 'val',
										value: '={{ $node["Missing"].json.field }}',
										type: 'string',
									},
								],
							},
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Missing');
	});

	it('detects $items("Node", index) form with second argument', async () => {
		const result = await expressionsReferenceExistingNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: {
							assignments: {
								assignments: [
									{
										name: 'val',
										value: '={{ $items("Gone", 0)[0].json.field }}',
										type: 'string',
									},
								],
							},
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Gone');
	});

	it('detects legacy $node.Name dot-notation syntax', async () => {
		const result = await expressionsReferenceExistingNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: {
							assignments: {
								assignments: [
									{
										name: 'val',
										value: '={{ $node.MissingNode.json.field }}',
										type: 'string',
									},
								],
							},
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('MissingNode');
	});

	it('handles escaped quotes in node names', async () => {
		const result = await expressionsReferenceExistingNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: "Node's Data",
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
					},
					{
						name: 'Consumer',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [200, 0],
						parameters: {
							assignments: {
								assignments: [
									{
										name: 'val',
										value: "={{ $('Node\\'s Data').first().json.field }}",
										type: 'string',
									},
								],
							},
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('passes for empty workflow', async () => {
		const result = await expressionsReferenceExistingNodes.run(
			makeWorkflow({ nodes: [] }),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});
});

describe('valid_required_parameters', () => {
	const nodeTypeWithRequired: INodeTypeDescription = {
		displayName: 'HTTP Request',
		name: 'n8n-nodes-base.httpRequest',
		group: ['transform'],
		version: 1,
		defaults: { name: 'HTTP Request' },
		inputs: ['main'],
		outputs: ['main'],
		description: 'HTTP',
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
			},
		],
	};

	it('passes when required parameters are present', async () => {
		const result = await validRequiredParameters.run(
			makeWorkflow({
				nodes: [
					{
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: { url: 'https://example.com' },
					},
				],
			}),
			makeCtx({ nodeTypes: [...nodeTypes, nodeTypeWithRequired] }),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when required parameter is missing', async () => {
		const result = await validRequiredParameters.run(
			makeWorkflow({
				nodes: [
					{
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
			}),
			makeCtx({ nodeTypes: [...nodeTypes, nodeTypeWithRequired] }),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('URL');
	});
});

describe('valid_options_values', () => {
	const nodeTypeWithOptions: INodeTypeDescription = {
		displayName: 'HTTP Request',
		name: 'n8n-nodes-base.httpRequest',
		group: ['transform'],
		version: 1,
		defaults: { name: 'HTTP Request' },
		inputs: ['main'],
		outputs: ['main'],
		description: 'HTTP',
		properties: [
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				default: 'GET',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
				],
			},
		],
	};

	it('passes when option value is valid', async () => {
		const result = await validOptionsValues.run(
			makeWorkflow({
				nodes: [
					{
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: { method: 'POST' },
					},
				],
			}),
			makeCtx({ nodeTypes: [...nodeTypes, nodeTypeWithOptions] }),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when option value is invalid', async () => {
		const result = await validOptionsValues.run(
			makeWorkflow({
				nodes: [
					{
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: { method: 'INVALID' },
					},
				],
			}),
			makeCtx({ nodeTypes: [...nodeTypes, nodeTypeWithOptions] }),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('INVALID');
	});
});

describe('no_invalid_from_ai', () => {
	const toolNodeType: INodeTypeDescription = {
		displayName: 'HTTP Tool',
		name: 'n8n-nodes-base.httpRequestTool',
		group: ['transform'],
		version: 1,
		defaults: { name: 'HTTP Tool' },
		inputs: ['main'],
		outputs: ['main'],
		description: 'HTTP tool',
		properties: [],
		codex: { subcategories: { AI: ['Tools'] } },
	};

	it('passes when $fromAI is used in tool nodes', async () => {
		const result = await noInvalidFromAi.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Tool',
						type: 'n8n-nodes-base.httpRequestTool',
						typeVersion: 1,
						position: [0, 0],
						parameters: { url: '={{ $fromAI("url", "The URL to fetch") }}' },
					},
				],
			}),
			makeCtx({ nodeTypes: [...nodeTypes, toolNodeType] }),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when $fromAI is used in non-tool nodes', async () => {
		const result = await noInvalidFromAi.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: { value: '={{ $fromAI("name", "User name") }}' },
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Set');
		expect(result.comment).toContain('$fromAI');
	});

	it('passes when no $fromAI usage', async () => {
		const result = await noInvalidFromAi.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: { value: '={{ $json.name }}' },
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});
});

describe('tools_have_parameters', () => {
	const toolNodeType: INodeTypeDescription = {
		displayName: 'HTTP Tool',
		name: 'n8n-nodes-base.httpRequestTool',
		group: ['transform'],
		version: 1,
		defaults: { name: 'HTTP Tool' },
		inputs: ['main'],
		outputs: ['main'],
		description: 'HTTP tool',
		properties: [],
		codex: { subcategories: { AI: ['Tools'] } },
	};

	const excludedToolType: INodeTypeDescription = {
		displayName: 'Calculator',
		name: '@n8n/n8n-nodes-langchain.toolCalculator',
		group: ['transform'],
		version: 1,
		defaults: { name: 'Calculator' },
		inputs: ['main'],
		outputs: ['main'],
		description: 'Calculator tool',
		properties: [],
		codex: { subcategories: { AI: ['Tools'] } },
	};

	it('passes when tool has parameters', async () => {
		const result = await toolsHaveParameters.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Tool',
						type: 'n8n-nodes-base.httpRequestTool',
						typeVersion: 1,
						position: [0, 0],
						parameters: { url: 'https://example.com' },
					},
				],
			}),
			makeCtx({ nodeTypes: [...nodeTypes, toolNodeType] }),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when tool has no parameters', async () => {
		const result = await toolsHaveParameters.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Tool',
						type: 'n8n-nodes-base.httpRequestTool',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
			}),
			makeCtx({ nodeTypes: [...nodeTypes, toolNodeType] }),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Tool');
	});

	it('passes for excluded tool types without parameters', async () => {
		const result = await toolsHaveParameters.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Calc',
						type: '@n8n/n8n-nodes-langchain.toolCalculator',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
			}),
			makeCtx({ nodeTypes: [...nodeTypes, excludedToolType] }),
		);
		expect(result.pass).toBe(true);
	});
});

describe('no_code_imports', () => {
	it('passes when no code nodes', async () => {
		const result = await noCodeImports.run(
			makeWorkflow({
				nodes: [{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [0, 0] }],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('passes when code node has no imports', async () => {
		const result = await noCodeImports.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Code',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [0, 0],
						parameters: {
							language: 'javaScript',
							jsCode: 'return items.map(item => ({ json: { value: item.json.value * 2 } }));',
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when JS code uses require()', async () => {
		const result = await noCodeImports.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Code',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [0, 0],
						parameters: {
							language: 'javaScript',
							jsCode: "const lodash = require('lodash');\nreturn items;",
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Code');
	});

	it('fails when JS code uses import from', async () => {
		const result = await noCodeImports.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Code',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [0, 0],
						parameters: {
							language: 'javaScript',
							jsCode: "import axios from 'axios';\nreturn items;",
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Code');
	});

	it('fails when JS code uses dynamic import()', async () => {
		const result = await noCodeImports.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Code',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [0, 0],
						parameters: {
							language: 'javaScript',
							jsCode: "const mod = await import('some-module');\nreturn items;",
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Code');
	});

	it('fails when Python code uses import statement', async () => {
		const result = await noCodeImports.run(
			makeWorkflow({
				nodes: [
					{
						name: 'PyCode',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [0, 0],
						parameters: {
							language: 'pythonNative',
							pythonCode: 'import requests\nreturn items',
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('PyCode');
	});

	it('fails when Python code uses from...import', async () => {
		const result = await noCodeImports.run(
			makeWorkflow({
				nodes: [
					{
						name: 'PyCode',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [0, 0],
						parameters: {
							language: 'pythonNative',
							pythonCode: 'from os import path\nreturn items',
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('PyCode');
	});

	it('fails when Python code uses __import__()', async () => {
		const result = await noCodeImports.run(
			makeWorkflow({
				nodes: [
					{
						name: 'PyCode',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [0, 0],
						parameters: {
							language: 'pythonNative',
							pythonCode: "os = __import__('os')\nreturn items",
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('PyCode');
	});

	it('passes when Python code has no imports', async () => {
		const result = await noCodeImports.run(
			makeWorkflow({
				nodes: [
					{
						name: 'PyCode',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [0, 0],
						parameters: {
							language: 'pythonNative',
							pythonCode: 'return [{"json": {"value": 42}}]',
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('defaults to javaScript when language is not set', async () => {
		const result = await noCodeImports.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Code',
						type: 'n8n-nodes-base.code',
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							jsCode: "const fs = require('fs');\nreturn items;",
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Code');
	});

	it('reports all code nodes with imports', async () => {
		const result = await noCodeImports.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Code1',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [0, 0],
						parameters: {
							language: 'javaScript',
							jsCode: "const _ = require('lodash');\nreturn items;",
						},
					},
					{
						name: 'Code2',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [200, 0],
						parameters: {
							language: 'pythonNative',
							pythonCode: 'import json\nreturn items',
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Code1');
		expect(result.comment).toContain('Code2');
	});

	it('passes for empty workflow', async () => {
		const result = await noCodeImports.run(makeWorkflow({ nodes: [] }), makeCtx());
		expect(result.pass).toBe(true);
	});
});
