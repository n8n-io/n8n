import { DynamicStructuredTool } from '@langchain/classic/tools';
import { FakeStreamingChatModel } from '@langchain/core/utils/testing';
import { StructuredToolkit } from 'n8n-core';
import type {
	IExecuteFunctions,
	INode,
	NodeParameterValueType,
	NodeTypeAndVersion,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { N8nStructuredOutputParser } from '@utils/output_parsers/N8nOutputParser';

import { getTools, preparePrompt } from '../../agents/ToolsAgent/common';
import { createAgentSequence } from '../../agents/ToolsAgent/V3/helpers/createAgentSequence';

type Rule = { sourceNodeId: string; available: NodeParameterValueType };

function tool(name: string) {
	return new DynamicStructuredTool({
		name,
		description: `Use ${name}`,
		schema: z.object({}),
		func: async () => 'Done',
	});
}

function source(id: string, name = id, disabled = false): NodeTypeAndVersion {
	return { id, name, type: 'test.tool', typeVersion: 1, disabled };
}

function context(
	tools: Array<DynamicStructuredTool | StructuredToolkit>,
	sources: NodeTypeAndVersion[],
	rules: Rule[] = [],
	resolveAvailable: (rule: Rule, itemIndex: number) => NodeParameterValueType = (rule) =>
		rule.available,
) {
	const ctx = mock<IExecuteFunctions>();
	ctx.getNode.mockReturnValue(mock<INode>({ name: 'AI Agent', typeVersion: 3.1 }));
	ctx.getParentNodes.mockReturnValue(sources);
	ctx.getInputConnectionData.calledWith(NodeConnectionTypes.AiTool, 0).mockResolvedValue(tools);
	ctx.getNodeParameter.mockImplementation((name, itemIndex, fallback) => {
		if (name === 'toolAvailability.rules') return rules;
		const match = /^toolAvailability.rules\[(\d+)\].available$/.exec(name);
		return match ? resolveAvailable(rules[Number(match[1])], itemIndex) : fallback;
	});
	return ctx;
}

describe('Tool Availability', () => {
	it('keeps the pre-change tool list when there are no rules', async () => {
		const tools = [tool('direct'), tool('toolkit')];
		const ctx = context([tools[0], new StructuredToolkit([tools[1]])], [source('a'), source('b')]);

		const previousTools = await getTools(ctx);
		const currentTools = await getTools(ctx, undefined, 0);

		expect(currentTools).toEqual(previousTools);
		expect(currentTools[0]).toBe(tools[0]);
		expect(currentTools[1]).toBe(tools[1]);
	});

	it.each([true, false])('applies an Available value of %s to a direct tool', async (available) => {
		const connectedTool = tool('weather');
		const ctx = context(
			[connectedTool],
			[source('weather-id')],
			[{ sourceNodeId: 'weather-id', available }],
		);

		expect(await getTools(ctx, undefined, 0)).toEqual(available ? [connectedTool] : []);
	});

	it('keeps sources without a rule', async () => {
		const weather = tool('weather');
		const email = tool('email');
		const ctx = context(
			[weather, email],
			[source('weather-id'), source('email-id')],
			[{ sourceNodeId: 'weather-id', available: false }],
		);

		expect(await getTools(ctx, undefined, 0)).toEqual([email]);
	});

	it('resolves availability independently for each input item', async () => {
		const weather = tool('weather');
		const ctx = context(
			[weather],
			[source('weather-id')],
			[{ sourceNodeId: 'weather-id', available: '={{ $itemIndex === 0 }}' }],
			(_rule, itemIndex) => itemIndex === 0,
		);

		const [first, second] = await Promise.all([
			getTools(ctx, undefined, 0),
			getTools(ctx, undefined, 1),
		]);

		expect(first).toEqual([weather]);
		expect(second).toEqual([]);
	});

	it('completes an Agent invocation when all connected tools are unavailable', async () => {
		const ctx = context(
			[tool('weather')],
			[source('weather-id')],
			[{ sourceNodeId: 'weather-id', available: false }],
		);
		const tools = await getTools(ctx, undefined, 0);
		const model = new FakeStreamingChatModel({});
		model.bindTools = vi.fn().mockReturnValue(model);
		const prompt = preparePrompt([
			['human', '{input}'],
			['placeholder', '{agent_scratchpad}'],
		]);

		const agent = createAgentSequence(model, tools, prompt, {});
		await expect(agent.invoke({ input: 'Hello', steps: [] })).resolves.toMatchObject({
			returnValues: { output: 'Hello' },
		});
		expect(model.bindTools).toHaveBeenCalledWith([]);
	});

	it.each(['false', 0, 1, null, { value: false }, [false]])(
		'rejects a non-Boolean Available result: %j',
		async (available) => {
			const ctx = context(
				[tool('weather')],
				[source('weather-id')],
				[{ sourceNodeId: 'weather-id', available }],
			);

			await expect(getTools(ctx, undefined, 0)).rejects.toMatchObject({
				constructor: NodeOperationError,
				message: 'Tool Availability for source node "weather-id" must resolve to a Boolean',
				context: { itemIndex: 0 },
			});
		},
	);

	it('reports an invalid Available expression with its source node ID and item index', async () => {
		const ctx = context(
			[tool('weather')],
			[source('weather-id')],
			[{ sourceNodeId: 'weather-id', available: '={{ invalid( }}' }],
			() => {
				throw new Error('Invalid expression');
			},
		);

		await expect(getTools(ctx, undefined, 1)).rejects.toMatchObject({
			constructor: NodeOperationError,
			message: 'Could not evaluate Tool Availability for source node "weather-id"',
			context: { itemIndex: 1 },
		});
	});

	it('rejects duplicate rules for the same source node', async () => {
		const ctx = context(
			[tool('weather')],
			[source('weather-id')],
			[
				{ sourceNodeId: 'weather-id', available: true },
				{ sourceNodeId: 'weather-id', available: false },
			],
		);

		await expect(getTools(ctx, undefined, 0)).rejects.toMatchObject({
			constructor: NodeOperationError,
			message: 'Tool Availability has multiple rules for source node "weather-id"',
		});
	});

	it('rejects a source that is not directly connected, even when no tools are supplied', async () => {
		const ctx = context([], [], [{ sourceNodeId: 'stale-id', available: false }]);

		await expect(getTools(ctx, undefined, 0)).rejects.toMatchObject({
			constructor: NodeOperationError,
			message: 'Tool Availability source node "stale-id" is not directly connected to this Agent',
		});
		expect(ctx.getParentNodes).toHaveBeenCalledWith('AI Agent', {
			connectionType: NodeConnectionTypes.AiTool,
			depth: 1,
		});
	});

	it.each([true, false])(
		'accepts a rule for a disabled source with Available set to %s',
		async (available) => {
			const email = tool('email');
			const ctx = context(
				[email],
				[source('disabled-id', 'Disabled', true), source('email-id')],
				[{ sourceNodeId: 'disabled-id', available }],
			);

			expect(await getTools(ctx, undefined, 0)).toEqual([email]);
			expect(email.metadata?.sourceNodeId).toBe('email-id');
		},
	);

	it('uses the stable source node ID after a rename, rather than the tool or source name', async () => {
		const ctx = context(
			[tool('weather')],
			[source('stable-id', 'Renamed Weather')],
			[{ sourceNodeId: 'stable-id', available: false }],
		);

		expect(await getTools(ctx, undefined, 0)).toEqual([]);
	});

	it('removes all tools supplied by an unavailable MCP Client source', async () => {
		const toolkit = new StructuredToolkit([tool('search'), tool('fetch')]);
		const ctx = context(
			[toolkit],
			[source('toolkit-id', 'MCP Client')],
			[{ sourceNodeId: 'toolkit-id', available: false }],
		);

		expect(await getTools(ctx, undefined, 0)).toEqual([]);
		expect(toolkit.tools.every((entry) => entry.metadata?.sourceNodeId === 'toolkit-id')).toBe(
			true,
		);
	});

	it('filters HITL-wrapped tools by the wrapper source ID', async () => {
		const wrappedTool = tool('send_email');
		wrappedTool.metadata = {
			sourceNodeId: 'underlying-email-id',
			sourceNodeName: 'Approval',
			gatedToolNodeName: 'Email',
			originalSchema: wrappedTool.schema,
		};
		const ctx = context(
			[new StructuredToolkit([wrappedTool])],
			[source('approval-id', 'Approval')],
			[{ sourceNodeId: 'approval-id', available: false }],
		);

		expect(await getTools(ctx, undefined, 0)).toEqual([]);
		expect(wrappedTool.metadata).toMatchObject({
			sourceNodeId: 'approval-id',
			gatedToolNodeName: 'Email',
		});
	});

	it('keeps the duplicate-name error when both sources are available', async () => {
		const ctx = context(
			[tool('search'), tool('search')],
			[source('a'), source('b')],
			[
				{ sourceNodeId: 'a', available: true },
				{ sourceNodeId: 'b', available: true },
			],
		);

		await expect(getTools(ctx, undefined, 0)).rejects.toMatchObject({
			constructor: NodeOperationError,
			message:
				"You have multiple tools with the same name: 'search', please rename them to avoid conflicts",
		});
	});

	it('checks duplicate names after filtering unavailable sources', async () => {
		const availableTool = tool('search');
		const ctx = context(
			[availableTool, tool('search')],
			[source('a'), source('b')],
			[{ sourceNodeId: 'b', available: false }],
		);

		expect(await getTools(ctx, undefined, 0)).toEqual([availableTool]);
	});

	it('keeps the internal structured-output tool when all sources are unavailable', async () => {
		const ctx = context(
			[tool('weather')],
			[source('weather-id')],
			[{ sourceNodeId: 'weather-id', available: false }],
		);
		const parser = mock<N8nStructuredOutputParser>();
		parser.getSchema.mockReturnValue(z.object({ answer: z.string() }));

		const tools = await getTools(ctx, parser, 0);

		expect(tools.map(({ name }) => name)).toEqual(['format_final_json_response']);
	});

	it('keeps model-native tools in the model request when connected tools are unavailable', async () => {
		const ctx = context(
			[tool('weather')],
			[source('weather-id')],
			[{ sourceNodeId: 'weather-id', available: false }],
		);
		const tools = await getTools(ctx, undefined, 0);
		const nativeTool = { type: 'web_search_preview' };
		const model = new FakeStreamingChatModel({});
		model.metadata = { tools: [nativeTool] };
		model.bindTools = vi.fn().mockReturnValue(model);
		const prompt = preparePrompt([
			['human', '{input}'],
			['placeholder', '{agent_scratchpad}'],
		]);

		createAgentSequence(model, tools, prompt, {});

		expect(model.bindTools).toHaveBeenCalledWith([nativeTool]);
	});
});
