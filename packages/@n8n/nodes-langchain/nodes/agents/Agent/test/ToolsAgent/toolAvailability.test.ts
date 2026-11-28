import { DynamicStructuredTool } from '@langchain/core/tools';
import { FakeStreamingChatModel } from '@langchain/core/utils/testing';
import get from 'lodash/get';
import { StructuredToolkit, type SupplyDataToolResponse } from 'n8n-core';
import {
	NodeConnectionTypes,
	NodeOperationError,
	Workflow,
	type IExecuteFunctions,
	type INode,
	type INodeTypes,
	type NodeParameterValueType,
	type NodeTypeAndVersion,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { N8nStructuredOutputParser } from '@utils/output_parsers/N8nOutputParser';

import { getTools, preparePrompt } from '../../agents/ToolsAgent/common';
import { createAgentSequence } from '../../agents/ToolsAgent/V3/helpers/createAgentSequence';

type Rule = { sourceNodeId: string; available: NodeParameterValueType };

function tool(name: string) {
	return new DynamicStructuredTool({
		name,
		description: name,
		schema: z.object({}),
		func: async () => '',
	});
}

function context(
	rules: Rule[] = [],
	connectedTools: SupplyDataToolResponse[] = [tool('first'), tool('second')],
	sources: NodeTypeAndVersion[] = [
		{ id: 'source-1', name: 'First Tool', type: 'tool', typeVersion: 1, disabled: false },
		{ id: 'source-2', name: 'Second Tool', type: 'tool', typeVersion: 1, disabled: false },
	],
) {
	const ctx = mock<IExecuteFunctions>();
	const node = mock<INode>({
		name: 'AI Agent',
		type: '@n8n/n8n-nodes-langchain.agent',
		typeVersion: 3.1,
		parameters: { toolAvailability: { rules } },
	});
	const items = [{ json: { allowTool: true } }, { json: { allowTool: false } }];
	const workflow = new Workflow({
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes: mock<INodeTypes>(),
	});
	ctx.getNode.mockReturnValue(node);
	ctx.getParentNodes.mockReturnValue(sources);
	ctx.getInputConnectionData.mockResolvedValue(connectedTools);
	ctx.getNodeParameter.mockImplementation((name, itemIndex, fallback, options) => {
		const value = get(node.parameters, name, fallback) as NodeParameterValueType;
		if (options?.rawExpressions) return value;
		return workflow.expression.getParameterValue(
			value,
			null,
			0,
			itemIndex,
			node.name,
			items,
			'manual',
			{},
		);
	});
	return ctx;
}

describe('tool availability', () => {
	it.each(['unset', 'empty collection', 'empty rules'])(
		'keeps the same assembled tools when availability is %s',
		async (configuration) => {
			const ctx = context();
			if (configuration === 'unset') delete ctx.getNode().parameters.toolAvailability;
			if (configuration === 'empty collection') ctx.getNode().parameters.toolAvailability = {};
			const original = await getTools(ctx);
			const result = await getTools(ctx, undefined, 0);
			expect(result).toEqual(original);
			expect(result[0]).toBe(original[0]);
			expect(result[1]).toBe(original[1]);
		},
	);

	it('keeps a direct tool when its rule is true', async () => {
		const result = await getTools(
			context([{ sourceNodeId: 'source-1', available: true }]),
			undefined,
			0,
		);
		expect(result.map(({ name }) => name)).toEqual(['first', 'second']);
	});

	it('removes only the direct tool whose rule is false', async () => {
		const result = await getTools(
			context([{ sourceNodeId: 'source-1', available: false }]),
			undefined,
			0,
		);
		expect(result.map(({ name }) => name)).toEqual(['second']);
		expect(result[0].metadata).toMatchObject({
			sourceNodeId: 'source-2',
			sourceNodeName: 'Second Tool',
		});
	});

	it('resolves expressions independently for each input item', async () => {
		const ctx = context([{ sourceNodeId: 'source-1', available: '={{ $json.allowTool }}' }]);
		const [first, second] = await Promise.all([
			getTools(ctx, undefined, 0),
			getTools(ctx, undefined, 1),
		]);
		expect(first.map(({ name }) => name)).toEqual(['first', 'second']);
		expect(second.map(({ name }) => name)).toEqual(['second']);
	});

	it('allows an empty connected tool list', async () => {
		const ctx = context([
			{ sourceNodeId: 'source-1', available: false },
			{ sourceNodeId: 'source-2', available: false },
		]);
		await expect(getTools(ctx, undefined, 0)).resolves.toEqual([]);
	});

	it.each(['={{ "false" }}', '={{ 0 }}', '={{ null }}', '={{ ({}) }}', '={{ [] }}'])(
		'rejects a non-Boolean result: %s',
		async (available) => {
			const result = getTools(context([{ sourceNodeId: 'source-1', available }]), undefined, 1);
			await expect(result).rejects.toBeInstanceOf(NodeOperationError);
			await expect(result).rejects.toMatchObject({
				message: 'Tool availability for "First Tool" must resolve to a Boolean',
				context: expect.objectContaining({ itemIndex: 1 }),
			});
		},
	);

	it('reports an invalid expression as a node error', async () => {
		const result = getTools(
			context([{ sourceNodeId: 'source-1', available: '={{ $json. }}' }]),
			undefined,
			0,
		);
		await expect(result).rejects.toBeInstanceOf(NodeOperationError);
		await expect(result).rejects.toThrow('Could not evaluate tool availability for "First Tool"');
	});

	it('rejects duplicate source rules', async () => {
		const result = getTools(
			context([
				{ sourceNodeId: 'source-1', available: true },
				{ sourceNodeId: 'source-1', available: false },
			]),
			undefined,
			0,
		);
		await expect(result).rejects.toBeInstanceOf(NodeOperationError);
		await expect(result).rejects.toThrow('Duplicate tool availability rules for source "source-1"');
	});

	it('rejects a source that is not directly connected', async () => {
		const ctx = context([{ sourceNodeId: 'disconnected-id', available: false }]);
		const result = getTools(ctx, undefined, 0);
		await expect(result).rejects.toBeInstanceOf(NodeOperationError);
		await expect(result).rejects.toThrow(
			'Tool availability source "disconnected-id" is not directly connected',
		);
		expect(ctx.getParentNodes).toHaveBeenCalledWith('AI Agent', {
			connectionType: NodeConnectionTypes.AiTool,
			depth: 1,
		});
	});

	it('accepts a disabled connected source without shifting the active source metadata', async () => {
		const ctx = context(
			[
				{ sourceNodeId: 'disabled-id', available: false },
				{ sourceNodeId: 'source-2', available: false },
			],
			[tool('first'), tool('second')],
			[
				{ id: 'source-1', name: 'First Tool', type: 'tool', typeVersion: 1, disabled: false },
				{ id: 'disabled-id', name: 'Disabled Tool', type: 'tool', typeVersion: 1, disabled: true },
				{ id: 'source-2', name: 'Second Tool', type: 'tool', typeVersion: 1, disabled: false },
			],
		);
		const result = await getTools(ctx, undefined, 0);
		expect(result.map(({ name }) => name)).toEqual(['first']);
		expect(result[0].metadata).toMatchObject({
			sourceNodeId: 'source-1',
			sourceNodeName: 'First Tool',
		});
	});

	it('uses the stable source ID after a source is renamed', async () => {
		const ctx = context([{ sourceNodeId: 'source-1', available: false }]);
		const renamed = {
			id: 'source-1',
			name: 'Renamed Tool',
			type: 'tool',
			typeVersion: 1,
			disabled: false,
		};
		ctx.getParentNodes.mockReturnValue([
			renamed,
			{ ...renamed, id: 'source-2', name: 'Second Tool' },
		]);
		expect((await getTools(ctx, undefined, 0)).map(({ name }) => name)).toEqual(['second']);
	});

	it('removes every tool from an unavailable MCP toolkit', async () => {
		const ctx = context(
			[{ sourceNodeId: 'source-1', available: false }],
			[new StructuredToolkit([tool('wrapped_first'), tool('wrapped_second')]), tool('second')],
		);
		expect((await getTools(ctx, undefined, 0)).map(({ name }) => name)).toEqual(['second']);
	});

	it('filters HITL toolkits from a different package instance', async () => {
		const ctx = context([{ sourceNodeId: 'source-1', available: false }]);
		const foreignToolkit = {
			tools: [tool('wrapped_first'), tool('wrapped_second')],
			getTools() {
				return this.tools;
			},
		};
		ctx.getInputConnectionData.mockResolvedValue([foreignToolkit, tool('second')]);
		expect((await getTools(ctx, undefined, 0)).map(({ name }) => name)).toEqual(['second']);
	});

	it('checks duplicate tool names after filtering unavailable sources', async () => {
		const ctx = context(
			[{ sourceNodeId: 'source-1', available: false }],
			[tool('same_name'), tool('same_name')],
		);
		expect(await getTools(ctx, undefined, 0)).toHaveLength(1);
	});

	it('keeps the existing duplicate-name error when both sources are available', async () => {
		const ctx = context(
			[{ sourceNodeId: 'source-1', available: true }],
			[tool('same_name'), tool('same_name')],
		);
		await expect(getTools(ctx, undefined, 0)).rejects.toThrow(
			"You have multiple tools with the same name: 'same_name'",
		);
	});

	it('keeps the internal structured-output tool when all sources are unavailable', async () => {
		const ctx = context([
			{ sourceNodeId: 'source-1', available: false },
			{ sourceNodeId: 'source-2', available: false },
		]);
		const parser = mock<N8nStructuredOutputParser>();
		parser.getSchema.mockReturnValue(z.object({ output: z.string() }));
		const tools = await getTools(ctx, parser, 0);
		expect(tools.map(({ name }) => name)).toEqual(['format_final_json_response']);
	});

	it('keeps model-native tools when all connected tools are unavailable', async () => {
		const ctx = context([
			{ sourceNodeId: 'source-1', available: false },
			{ sourceNodeId: 'source-2', available: false },
		]);
		const tools = await getTools(ctx, undefined, 0);
		const model = new FakeStreamingChatModel({});
		const nativeTool = tool('native_search');
		model.metadata = { tools: [nativeTool] };
		const bindTools = vi.fn().mockReturnValue(model);
		model.bindTools = bindTools;
		createAgentSequence(
			model,
			tools,
			preparePrompt([
				['human', '{input}'],
				['placeholder', '{agent_scratchpad}'],
			]),
			{},
		);
		expect(bindTools).toHaveBeenCalledWith([nativeTool]);
	});
});
