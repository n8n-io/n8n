import { z } from 'zod';

import type * as AgentRuntimeModule from '../../runtime/agent-runtime';
import type {
	DelegateSubAgentRequest,
	InlineSubAgentProviderToolsResolver,
} from '../../runtime/delegate-sub-agent-tool';
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
		tools: BuiltTool[];
		inlineSubAgentBlockedTools?: string[];
		inlineSubAgentModelsByDifficulty?: Partial<Record<'low' | 'medium' | 'high', string>>;
		resolveInlineSubAgentProviderTools?: InlineSubAgentProviderToolsResolver;
	}) => (request: DelegateSubAgentRequest) => Promise<unknown>;
};

function createInlineRunner(options: {
	tools?: BuiltTool[];
	inlineSubAgentBlockedTools?: string[];
	inlineSubAgentModelsByDifficulty?: Partial<Record<'low' | 'medium' | 'high', string>>;
	resolveInlineSubAgentProviderTools?: InlineSubAgentProviderToolsResolver;
}) {
	const agent = new Agent('parent');
	return (agent as unknown as AgentWithInlineRunner).createInlineSubAgentRunner({
		deferredTools: [],
		modelConfig: 'openai/gpt-4o-mini',
		tools: options.tools ?? [makeTool('lookup')],
		inlineSubAgentBlockedTools: options.inlineSubAgentBlockedTools,
		inlineSubAgentModelsByDifficulty: options.inlineSubAgentModelsByDifficulty,
		resolveInlineSubAgentProviderTools: options.resolveInlineSubAgentProviderTools,
	});
}

function providerToolNames(runtimeConfig: Record<string, unknown> | undefined): string[] {
	return (
		(runtimeConfig?.providerTools as BuiltProviderTool[] | undefined)?.map((tool) => tool.name) ??
		[]
	);
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

	it('does not pass parent provider tools to inline child runtimes without a resolver', async () => {
		const agent = new Agent('parent')
			.model('openai', 'gpt-4o-mini')
			.providerTool(openaiWebSearchProviderTool)
			.tool(makeTool('lookup'));

		const runner = (agent as unknown as AgentWithInlineRunner).createInlineSubAgentRunner({
			deferredTools: [],
			modelConfig: 'openai/gpt-4o-mini',
			tools: [makeTool('lookup')],
		});

		await runner({
			subAgentId: INLINE_SUB_AGENT_ID,
			taskName: 'research',
			goal: 'Find the answer',
			taskPath: '/root/research',
			childCount: 0,
		});

		expect(runtimeConfigs).toHaveLength(1);
		expect(runtimeConfigs[0]?.providerTools).toBeUndefined();
	});

	it('loads provider tools from the inline provider-tool resolver', async () => {
		const runner = createInlineRunner({
			resolveInlineSubAgentProviderTools: async () => [openaiWebSearchProviderTool],
		});

		await runner({
			subAgentId: INLINE_SUB_AGENT_ID,
			taskName: 'research',
			goal: 'Find the answer',
			taskPath: '/root/research',
			childCount: 0,
		});

		expect(runtimeConfigs).toHaveLength(1);
		expect(providerToolNames(runtimeConfigs[0])).toEqual(['openai.web_search_preview']);
		expect((runtimeConfigs[0]?.tools as BuiltTool[] | undefined)?.map((tool) => tool.name)).toEqual(
			['lookup'],
		);
	});

	it('loads provider tools after difficulty changes the inline child model', async () => {
		const resolveInlineSubAgentProviderTools = vi
			.fn<InlineSubAgentProviderToolsResolver>()
			.mockImplementation(async (modelConfig) => {
				if (typeof modelConfig === 'string' && modelConfig.startsWith('anthropic/')) {
					return [anthropicWebSearchProviderTool];
				}
				return [openaiWebSearchProviderTool];
			});

		const runner = createInlineRunner({
			inlineSubAgentModelsByDifficulty: { medium: 'anthropic/claude-sonnet-4-6' },
			resolveInlineSubAgentProviderTools,
		});

		await runner({
			subAgentId: INLINE_SUB_AGENT_ID,
			taskName: 'research',
			goal: 'Find the answer',
			taskPath: '/root/research',
			childCount: 0,
			difficulty: 'medium',
		});

		expect(runtimeConfigs).toHaveLength(1);
		expect(runtimeConfigs[0]?.model).toBe('anthropic/claude-sonnet-4-6');
		expect(providerToolNames(runtimeConfigs[0])).toEqual(['anthropic.web_search_20250305']);
		expect(resolveInlineSubAgentProviderTools).toHaveBeenCalledWith('anthropic/claude-sonnet-4-6');
	});

	it('omits resolver provider tools when the matching provider tool is blocked', async () => {
		const runner = createInlineRunner({
			inlineSubAgentBlockedTools: ['anthropic.web_search_20250305'],
			inlineSubAgentModelsByDifficulty: { high: 'anthropic/claude-sonnet-4-5' },
			resolveInlineSubAgentProviderTools: async () => [anthropicWebSearchProviderTool],
		});

		await runner({
			subAgentId: INLINE_SUB_AGENT_ID,
			taskName: 'research',
			goal: 'Find the answer',
			taskPath: '/root/research',
			childCount: 0,
			difficulty: 'high',
		});

		expect(runtimeConfigs).toHaveLength(1);
		expect(runtimeConfigs[0]?.providerTools).toBeUndefined();
	});
});
