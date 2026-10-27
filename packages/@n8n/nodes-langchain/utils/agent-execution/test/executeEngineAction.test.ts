import { DynamicStructuredTool } from '@langchain/classic/tools';
import { z } from 'zod';
import type { INode } from 'n8n-workflow';

import { executeEngineAction } from '../executeEngineAction';
import { INTERNAL_TOOL_ARG_STASH_KEY } from '../types';

describe('executeEngineAction', () => {
	const node = { type: 'test.node', typeVersion: 1, name: 'Test' } as INode;

	const execute = async (input: Record<string, unknown>) => {
		const invoke = vi.fn(async (_input: Record<string, unknown>) => 'result');
		const tool = new DynamicStructuredTool({
			name: 'mcp_tool',
			description: 'Test tool',
			schema: z.object({}).passthrough(),
			func: invoke,
		});
		const action = {
			actionType: 'ExecutionNodeAction',
			nodeName: 'MCP Client',
			input,
			type: 'ai_tool',
			id: 'call_1',
			metadata: { itemIndex: 0, toolName: 'mcp_tool' },
		} as Parameters<typeof executeEngineAction>[1];

		await executeEngineAction(node, action, [tool]);
		return invoke;
	};

	it('restores the user `tool` argument and removes internal metadata', async () => {
		const invoke = await execute({
			tool: 'mcp_tool',
			[INTERNAL_TOOL_ARG_STASH_KEY]: { tool: 'user-value' },
			query: 'hello',
		});

		expect(invoke.mock.calls[0][0]).toEqual({ tool: 'user-value', query: 'hello' });
		expect(invoke.mock.calls[0][0]).not.toHaveProperty(INTERNAL_TOOL_ARG_STASH_KEY);
	});

	it('restores a stashed `toolCallId` argument', async () => {
		const invoke = await execute({
			tool: 'mcp_tool',
			[INTERNAL_TOOL_ARG_STASH_KEY]: { toolCallId: 'user-id' },
			query: 'hello',
		});

		expect(invoke.mock.calls[0][0]).toEqual({ toolCallId: 'user-id', query: 'hello' });
		expect(invoke.mock.calls[0][0]).not.toHaveProperty(INTERNAL_TOOL_ARG_STASH_KEY);
	});

	it('removes the stash key when it has no value to restore', async () => {
		const invoke = await execute({
			tool: 'mcp_tool',
			[INTERNAL_TOOL_ARG_STASH_KEY]: undefined,
			query: 'hello',
		});

		expect(invoke.mock.calls[0][0]).toEqual({ query: 'hello' });
		expect(invoke.mock.calls[0][0]).not.toHaveProperty(INTERNAL_TOOL_ARG_STASH_KEY);
	});

	it('ignores a non-object stash value', async () => {
		const invoke = await execute({
			tool: 'mcp_tool',
			[INTERNAL_TOOL_ARG_STASH_KEY]: 'unexpected',
			query: 'hello',
		});

		expect(invoke.mock.calls[0][0]).toEqual({ query: 'hello' });
	});

	it('preserves arguments when no stash key is present', async () => {
		const invoke = await execute({ tool: 'mcp_tool', query: 'hello' });

		expect(invoke.mock.calls[0][0]).toEqual({ query: 'hello' });
	});
});
