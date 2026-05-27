import type { WorkflowJSON } from '@n8n/workflow-sdk';
import {
	NodeConnectionTypes,
	type INodeOutputConfiguration,
	type NodeConnectionType,
} from 'n8n-workflow';

import {
	findInvalidAiToolSources,
	formatInvalidAiToolSourceMessage,
	type NodeOutputsResolver,
} from '../tools/workflow-builder/connection-structure-check';

const agentNode = (name: string) => ({
	id: name,
	name,
	type: '@n8n/n8n-nodes-langchain.agent',
	typeVersion: 3,
	position: [0, 0] as [number, number],
	parameters: {},
});

const agentToolNode = (name: string) => ({
	id: name,
	name,
	type: '@n8n/n8n-nodes-langchain.agentTool',
	typeVersion: 3,
	position: [0, 0] as [number, number],
	parameters: {},
});

const calculatorToolNode = (name: string) => ({
	id: name,
	name,
	type: '@n8n/n8n-nodes-langchain.toolCalculator',
	typeVersion: 1,
	position: [0, 0] as [number, number],
	parameters: {},
});

const buildWorkflow = (overrides: Partial<WorkflowJSON>): WorkflowJSON => ({
	name: 'Test',
	nodes: [],
	connections: {},
	...overrides,
});

/** A resolver that returns outputs from a static map and treats missing entries as unknown. */
const makeResolver = (
	outputsByType: Record<string, Array<NodeConnectionType | INodeOutputConfiguration> | undefined>,
): NodeOutputsResolver => {
	return (type) => outputsByType[type];
};

const defaultResolver: NodeOutputsResolver = makeResolver({
	'@n8n/n8n-nodes-langchain.agent': [NodeConnectionTypes.Main],
	'@n8n/n8n-nodes-langchain.agentTool': [NodeConnectionTypes.AiTool],
	'@n8n/n8n-nodes-langchain.toolCalculator': [NodeConnectionTypes.AiTool],
});

describe('findInvalidAiToolSources', () => {
	test('returns empty array when no ai_tool connections exist', () => {
		const workflow = buildWorkflow({
			nodes: [agentNode('Agent')],
			connections: {},
		});

		expect(findInvalidAiToolSources(workflow, defaultResolver)).toEqual([]);
	});

	test('flags agent connected as ai_tool to another agent', () => {
		const workflow = buildWorkflow({
			nodes: [agentNode('Manager'), agentNode('Worker')],
			connections: {
				Manager: {
					ai_tool: [[{ node: 'Worker', type: 'ai_tool', index: 0 }]],
				},
			},
		});

		expect(findInvalidAiToolSources(workflow, defaultResolver)).toEqual([
			{
				sourceNode: 'Manager',
				sourceType: '@n8n/n8n-nodes-langchain.agent',
				targets: ['Worker'],
			},
		]);
	});

	test('allows agentTool node as ai_tool source', () => {
		const workflow = buildWorkflow({
			nodes: [agentToolNode('Worker'), agentNode('Manager')],
			connections: {
				Worker: {
					ai_tool: [[{ node: 'Manager', type: 'ai_tool', index: 0 }]],
				},
			},
		});

		expect(findInvalidAiToolSources(workflow, defaultResolver)).toEqual([]);
	});

	test('allows regular tool node as ai_tool source', () => {
		const workflow = buildWorkflow({
			nodes: [calculatorToolNode('Calculator'), agentNode('Manager')],
			connections: {
				Calculator: {
					ai_tool: [[{ node: 'Manager', type: 'ai_tool', index: 0 }]],
				},
			},
		});

		expect(findInvalidAiToolSources(workflow, defaultResolver)).toEqual([]);
	});

	test('accepts INodeOutputConfiguration-shaped output entries', () => {
		const workflow = buildWorkflow({
			nodes: [
				{
					id: 'custom',
					name: 'Custom Tool',
					type: 'custom.someToolish',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				agentNode('Manager'),
			],
			connections: {
				'Custom Tool': { ai_tool: [[{ node: 'Manager', type: 'ai_tool', index: 0 }]] },
			},
		});
		const resolver = makeResolver({
			'custom.someToolish': [{ type: NodeConnectionTypes.AiTool }],
		});

		expect(findInvalidAiToolSources(workflow, resolver)).toEqual([]);
	});

	test('accepts tool-suffixed types even when outputs cannot be statically resolved', () => {
		const workflow = buildWorkflow({
			nodes: [
				{
					id: 'gmail',
					name: 'Gmail Tool',
					type: 'n8n-nodes-base.gmailTool',
					typeVersion: 2,
					position: [0, 0],
					parameters: {},
				},
				agentNode('Manager'),
			],
			connections: {
				'Gmail Tool': { ai_tool: [[{ node: 'Manager', type: 'ai_tool', index: 0 }]] },
			},
		});
		const resolver = makeResolver({});

		expect(findInvalidAiToolSources(workflow, resolver)).toEqual([]);
	});

	test('skips unknown types — cannot prove invalid', () => {
		const workflow = buildWorkflow({
			nodes: [
				{
					id: 'mystery',
					name: 'Mystery',
					type: 'community.something',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				agentNode('Manager'),
			],
			connections: {
				Mystery: { ai_tool: [[{ node: 'Manager', type: 'ai_tool', index: 0 }]] },
			},
		});

		expect(findInvalidAiToolSources(workflow, makeResolver({}))).toEqual([]);
	});

	test('ignores main connections between agents', () => {
		const workflow = buildWorkflow({
			nodes: [agentNode('First'), agentNode('Second')],
			connections: {
				First: {
					main: [[{ node: 'Second', type: 'main', index: 0 }]],
				},
			},
		});

		expect(findInvalidAiToolSources(workflow, defaultResolver)).toEqual([]);
	});

	test('collects all targets when an agent is wired as a tool to multiple parents', () => {
		const workflow = buildWorkflow({
			nodes: [agentNode('SubAgent'), agentNode('ParentA'), agentNode('ParentB')],
			connections: {
				SubAgent: {
					ai_tool: [
						[
							{ node: 'ParentA', type: 'ai_tool', index: 0 },
							{ node: 'ParentB', type: 'ai_tool', index: 0 },
						],
					],
				},
			},
		});

		expect(findInvalidAiToolSources(workflow, defaultResolver)).toEqual([
			{
				sourceNode: 'SubAgent',
				sourceType: '@n8n/n8n-nodes-langchain.agent',
				targets: ['ParentA', 'ParentB'],
			},
		]);
	});

	test('reports one entry per offending source node', () => {
		const workflow = buildWorkflow({
			nodes: [agentNode('A'), agentNode('B'), agentNode('Parent')],
			connections: {
				A: { ai_tool: [[{ node: 'Parent', type: 'ai_tool', index: 0 }]] },
				B: { ai_tool: [[{ node: 'Parent', type: 'ai_tool', index: 0 }]] },
			},
		});

		const result = findInvalidAiToolSources(workflow, defaultResolver);
		expect(result.map((r) => r.sourceNode).sort()).toEqual(['A', 'B']);
	});

	test('ignores null output slots', () => {
		const workflow = buildWorkflow({
			nodes: [agentNode('Manager')],
			connections: {
				Manager: {
					ai_tool: [null] as unknown as Array<Array<{ node: string; type: string; index: number }>>,
				},
			},
		});

		expect(findInvalidAiToolSources(workflow, defaultResolver)).toEqual([]);
	});

	test('handles workflow with no connections field gracefully', () => {
		const workflow = {
			name: 'Test',
			nodes: [agentNode('Manager')],
		} as unknown as WorkflowJSON;

		expect(findInvalidAiToolSources(workflow, defaultResolver)).toEqual([]);
	});
});

describe('formatInvalidAiToolSourceMessage', () => {
	test('mentions the source node, its type, target, and points at agentTool', () => {
		const message = formatInvalidAiToolSourceMessage([
			{
				sourceNode: 'Manager',
				sourceType: '@n8n/n8n-nodes-langchain.agent',
				targets: ['Worker'],
			},
		]);

		expect(message).toContain("'Manager'");
		expect(message).toContain('@n8n/n8n-nodes-langchain.agent');
		expect(message).toContain("'Worker'");
		expect(message).toContain('@n8n/n8n-nodes-langchain.agentTool');
	});
});
