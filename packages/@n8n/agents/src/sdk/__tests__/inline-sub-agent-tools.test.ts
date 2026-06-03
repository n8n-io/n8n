import { z } from 'zod';

import type * as AgentRuntimeModule from '../../runtime/agent-runtime';
import type { DelegateSubAgentRequest } from '../../runtime/delegate-sub-agent-tool';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	INLINE_SUB_AGENT_ID,
} from '../../runtime/delegate-sub-agent-tool';
import { RECALL_MEMORY_TOOL_NAME } from '../../runtime/episodic-memory';
import { WRITE_TODOS_TOOL_NAME } from '../../runtime/write-todos-tool';
import type { BuiltProviderTool, BuiltTool } from '../../types';
import { Agent, filterInlineSubAgentTools } from '../agent';

const runtimeConfigs: Array<Record<string, unknown>> = [];

vi.mock('../../runtime/agent-runtime', async (importOriginal) => {
	const actual = await importOriginal<typeof AgentRuntimeModule>();
	return {
		...actual,
		AgentRuntime: class MockAgentRuntime {
			constructor(config: Record<string, unknown>) {
				runtimeConfigs.push(config);
			}

			async generate() {
				return await Promise.resolve({
					runId: 'child-run',
					finishReason: 'stop',
					messages: [
						{
							role: 'assistant',
							type: 'llm',
							content: [{ type: 'text', text: 'done' }],
						},
					],
					usage: {},
				});
			}

			async dispose() {
				return await Promise.resolve();
			}
		},
	};
});

function makeTool(name: string): BuiltTool {
	return {
		name,
		description: `${name} tool`,
		inputSchema: z.object({}),
		handler: async () => await Promise.resolve({ ok: true }),
	};
}

const openaiWebSearchProviderTool: BuiltProviderTool = {
	name: 'openai.web_search_preview',
	args: {},
};

const anthropicWebSearchProviderTool: BuiltProviderTool = {
	name: 'anthropic.web_search_20250305',
	args: {},
};

type AgentWithInlineRunner = {
	createInlineSubAgentRunner: (options: {
		deferredTools: BuiltTool[];
		modelConfig: string;
		providerTools: BuiltProviderTool[];
		tools: BuiltTool[];
		inlineSubAgentBlockedTools?: string[];
	}) => (request: DelegateSubAgentRequest) => Promise<unknown>;
};

function createInlineRunner(options: {
	providerTools: BuiltProviderTool[];
	tools?: BuiltTool[];
	inlineSubAgentBlockedTools?: string[];
}) {
	const agent = new Agent('parent');
	return (agent as unknown as AgentWithInlineRunner).createInlineSubAgentRunner({
		deferredTools: [],
		modelConfig: 'openai/gpt-4o-mini',
		tools: options.tools ?? [makeTool('lookup')],
		providerTools: options.providerTools,
		inlineSubAgentBlockedTools: options.inlineSubAgentBlockedTools,
	});
}

describe('inline sub-agent tool filtering', () => {
	beforeEach(() => {
		runtimeConfigs.length = 0;
	});

	it.each([
		{
			name: 'blocks SDK-owned tools by default but not other tool names',
			tools: [
				makeTool(DELEGATE_SUB_AGENT_TOOL_NAME),
				makeTool(RECALL_MEMORY_TOOL_NAME),
				makeTool(WRITE_TODOS_TOOL_NAME),
				makeTool('host_tool'),
				makeTool('lookup'),
			],
			allowedTools: undefined,
			blockedTools: undefined,
			expected: ['host_tool', 'lookup'],
		},
		{
			name: 'blocks host-supplied tool names when configured',
			tools: [makeTool('host_tool'), makeTool('lookup')],
			allowedTools: undefined,
			blockedTools: ['host_tool'],
			expected: ['lookup'],
		},
		{
			name: 'does not re-add blocked tools through allowedTools',
			tools: [makeTool(WRITE_TODOS_TOOL_NAME), makeTool('host_tool'), makeTool('lookup')],
			allowedTools: [WRITE_TODOS_TOOL_NAME, 'host_tool', 'lookup'],
			blockedTools: ['host_tool'],
			expected: ['lookup'],
		},
	])('$name', ({ tools, allowedTools, blockedTools, expected }) => {
		expect(
			filterInlineSubAgentTools(tools, allowedTools, blockedTools).map((tool) => tool.name),
		).toEqual(expected);
	});

	it('filters provider tools by allowedTools name', () => {
		expect(
			filterInlineSubAgentTools(
				[openaiWebSearchProviderTool, anthropicWebSearchProviderTool],
				['openai.web_search_preview'],
			).map((tool) => tool.name),
		).toEqual(['openai.web_search_preview']);
	});

	it.each([
		{
			name: 'passes provider tools to inline child runtimes by default',
			providerTools: [openaiWebSearchProviderTool],
			allowedTools: undefined,
			expectedProviderTools: ['openai.web_search_preview'],
		},
		{
			name: 'narrows provider tools when allowedTools is set on the delegation request',
			providerTools: [openaiWebSearchProviderTool, anthropicWebSearchProviderTool],
			allowedTools: ['lookup', 'openai.web_search_preview'],
			expectedProviderTools: ['openai.web_search_preview'],
		},
	])('$name', async ({ providerTools, allowedTools, expectedProviderTools }) => {
		const runner = createInlineRunner({ providerTools });

		await runner({
			subAgentId: INLINE_SUB_AGENT_ID,
			taskName: 'research',
			goal: 'Find the answer',
			taskPath: '/root/research',
			childCount: 0,
			...(allowedTools ? { allowedTools } : {}),
		});

		expect(runtimeConfigs).toHaveLength(1);
		expect(
			(runtimeConfigs[0]?.providerTools as BuiltProviderTool[] | undefined)?.map(
				(tool) => tool.name,
			),
		).toEqual(expectedProviderTools);
		expect((runtimeConfigs[0]?.tools as BuiltTool[] | undefined)?.map((tool) => tool.name)).toEqual(
			['lookup'],
		);
	});
});
