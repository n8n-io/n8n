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
			blockedTools: undefined,
			expected: ['host_tool', 'lookup'],
		},
		{
			name: 'blocks host-supplied tool names when configured',
			tools: [makeTool('host_tool'), makeTool('lookup')],
			blockedTools: ['host_tool'],
			expected: ['lookup'],
		},
	])('$name', ({ tools, blockedTools, expected }) => {
		expect(filterInlineSubAgentTools(tools, blockedTools).map((tool) => tool.name)).toEqual(
			expected,
		);
	});

	it('inherits all provider tools when not blocked', () => {
		expect(
			filterInlineSubAgentTools([openaiWebSearchProviderTool, anthropicWebSearchProviderTool]).map(
				(tool) => tool.name,
			),
		).toEqual(['openai.web_search_preview', 'anthropic.web_search_20250305']);
	});

	it('passes all provider tools to inline child runtimes by default', async () => {
		const runner = createInlineRunner({
			providerTools: [openaiWebSearchProviderTool, anthropicWebSearchProviderTool],
		});

		await runner({
			subAgentId: INLINE_SUB_AGENT_ID,
			taskName: 'research',
			goal: 'Find the answer',
			taskPath: '/root/research',
			childCount: 0,
		});

		expect(runtimeConfigs).toHaveLength(1);
		expect(
			(runtimeConfigs[0]?.providerTools as BuiltProviderTool[] | undefined)?.map(
				(tool) => tool.name,
			),
		).toEqual(['openai.web_search_preview', 'anthropic.web_search_20250305']);
		expect((runtimeConfigs[0]?.tools as BuiltTool[] | undefined)?.map((tool) => tool.name)).toEqual(
			['lookup'],
		);
	});
});
