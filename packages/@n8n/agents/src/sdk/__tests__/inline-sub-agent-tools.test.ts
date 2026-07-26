import { z } from 'zod';

import type * as AgentRuntimeModule from '../../runtime/loop/agent-runtime';
import { RECALL_MEMORY_TOOL_NAME } from '../../runtime/memory/episodic-memory';
import type {
	DelegateSubAgentRequest,
	InlineSubAgentProviderToolsResolver,
} from '../../runtime/tools/delegate-sub-agent-tool';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	INLINE_SUB_AGENT_ID,
	createDelegateSubAgentTool,
} from '../../runtime/tools/delegate-sub-agent-tool';
import { WRITE_TODOS_TOOL_NAME } from '../../runtime/tools/write-todos-tool';
import type { BuiltProviderTool, BuiltTool } from '../../types';
import type { BuiltTelemetry } from '../../types/telemetry';
import { Agent, filterInlineSubAgentTools } from '../agent';

const runtimeConfigs: Array<Record<string, unknown>> = [];
const runtimeGenerateResults: Array<Record<string, unknown>> = [];
const runtimeGenerateOptions: Array<Record<string, unknown>> = [];

function makeGenerateSuccess(): Record<string, unknown> {
	return {
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
	};
}

vi.mock('../../runtime/loop/agent-runtime', async (importOriginal) => {
	const actual = await importOriginal<typeof AgentRuntimeModule>();
	return {
		...actual,
		AgentRuntime: class MockAgentRuntime {
			constructor(config: Record<string, unknown>) {
				runtimeConfigs.push(config);
			}

			async generate(_prompt: string, options?: Record<string, unknown>) {
				runtimeGenerateOptions.push(options ?? {});
				return await Promise.resolve(runtimeGenerateResults.shift() ?? makeGenerateSuccess());
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
		telemetry?: BuiltTelemetry;
		inlineSubAgentBlockedTools?: string[];
		inlineSubAgentModelsByDifficulty?: Partial<Record<'low' | 'medium' | 'high', string>>;
		resolveInlineSubAgentProviderTools?: InlineSubAgentProviderToolsResolver;
	}) => (request: DelegateSubAgentRequest) => Promise<unknown>;
};

function createInlineRunner(options: {
	tools?: BuiltTool[];
	telemetry?: BuiltTelemetry;
	inlineSubAgentBlockedTools?: string[];
	inlineSubAgentModelsByDifficulty?: Partial<Record<'low' | 'medium' | 'high', string>>;
	resolveInlineSubAgentProviderTools?: InlineSubAgentProviderToolsResolver;
}) {
	const agent = new Agent('parent');
	return (agent as unknown as AgentWithInlineRunner).createInlineSubAgentRunner({
		deferredTools: [],
		modelConfig: 'openai/gpt-4o-mini',
		tools: options.tools ?? [makeTool('lookup')],
		telemetry: options.telemetry,
		inlineSubAgentBlockedTools: options.inlineSubAgentBlockedTools,
		inlineSubAgentModelsByDifficulty: options.inlineSubAgentModelsByDifficulty,
		resolveInlineSubAgentProviderTools: options.resolveInlineSubAgentProviderTools,
	});
}

function builtTelemetry(overrides: Partial<BuiltTelemetry> = {}): BuiltTelemetry {
	return {
		enabled: true,
		recordInputs: true,
		recordOutputs: true,
		integrations: [],
		...overrides,
	};
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
		runtimeGenerateResults.length = 0;
		runtimeGenerateOptions.length = 0;
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
		{
			name: 'blocks a renamed delegate tool by metadata, not by tool name',
			tools: [createDelegateSubAgentTool({ name: 'agent' }), makeTool('lookup')],
			blockedTools: undefined,
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
			resolveInlineSubAgentProviderTools: () => [openaiWebSearchProviderTool],
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
			.mockImplementation((modelConfig) => {
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
			resolveInlineSubAgentProviderTools: () => [anthropicWebSearchProviderTool],
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

	it('does not inherit parent thinking when difficulty selects a different provider', async () => {
		const agent = new Agent('parent').model('openai', 'gpt-4o-mini').thinking('openai', {
			reasoningEffort: 'high',
		});
		const runner = (agent as unknown as AgentWithInlineRunner).createInlineSubAgentRunner({
			deferredTools: [],
			modelConfig: 'openai/gpt-4o-mini',
			tools: [makeTool('lookup')],
			inlineSubAgentModelsByDifficulty: { high: 'anthropic/claude-sonnet-4-5' },
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
		expect(runtimeConfigs[0]?.model).toBe('anthropic/claude-sonnet-4-5');
		expect(runtimeConfigs[0]?.thinking).toBeUndefined();
	});

	it('keeps parent thinking when difficulty keeps the same provider', async () => {
		const thinking = { reasoningEffort: 'high' as const };
		const agent = new Agent('parent').model('openai', 'gpt-4o-mini').thinking('openai', thinking);
		const runner = (agent as unknown as AgentWithInlineRunner).createInlineSubAgentRunner({
			deferredTools: [],
			modelConfig: 'openai/gpt-4o-mini',
			tools: [makeTool('lookup')],
			inlineSubAgentModelsByDifficulty: { high: 'openai/o3-mini' },
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
		expect(runtimeConfigs[0]?.model).toBe('openai/o3-mini');
		expect(runtimeConfigs[0]?.thinking).toEqual(thinking);
	});

	it('includes selected child model in failed inline child output when runtime result omits it', async () => {
		runtimeGenerateResults.push({
			runId: 'child-run',
			finishReason: 'error',
			error: 'model failed',
			messages: [],
			usage: {},
		});
		const runner = createInlineRunner({
			inlineSubAgentModelsByDifficulty: { high: 'anthropic/claude-sonnet-4-5' },
		});

		const output = await runner({
			subAgentId: INLINE_SUB_AGENT_ID,
			taskName: 'research',
			goal: 'Find the answer',
			taskPath: '/root/research',
			childCount: 0,
			difficulty: 'high',
		});

		expect(output).toMatchObject({
			status: 'failed',
			model: 'anthropic/claude-sonnet-4-5',
			error: 'model failed',
		});
	});

	it('wires provider-tool resolver through the public Agent delegate tool path', async () => {
		const resolveInlineSubAgentProviderTools = vi
			.fn<InlineSubAgentProviderToolsResolver>()
			.mockResolvedValue([anthropicWebSearchProviderTool]);
		const agent = new Agent('parent')
			.model('openai', 'gpt-4o-mini')
			.instructions('Help')
			.tool(
				createDelegateSubAgentTool({
					inlineSubAgentModelsByDifficulty: { high: 'anthropic/claude-sonnet-4-5' },
					resolveInlineSubAgentProviderTools,
				}),
			);

		await agent.generate('delegate something');
		const parentRuntimeConfig = runtimeConfigs[0];
		const delegateTool = (parentRuntimeConfig?.tools as BuiltTool[] | undefined)?.find(
			(tool) => tool.name === DELEGATE_SUB_AGENT_TOOL_NAME,
		);
		expect(delegateTool).toBeDefined();

		await delegateTool?.handler?.(
			{
				subAgentId: INLINE_SUB_AGENT_ID,
				taskName: 'research',
				goal: 'Find the answer',
				difficulty: 'high',
			},
			{ runId: 'parent-run' },
		);

		expect(runtimeConfigs).toHaveLength(2);
		expect(resolveInlineSubAgentProviderTools).toHaveBeenCalledWith('anthropic/claude-sonnet-4-5');
		expect(providerToolNames(runtimeConfigs[1])).toEqual(['anthropic.web_search_20250305']);
	});

	it('derives the child telemetry from the live per-request parentTelemetry, not build-time telemetry', async () => {
		const parentTelemetry = builtTelemetry({
			functionId: 'parent-agent',
			metadata: { thread_id: 't1' },
		});
		const runner = createInlineRunner({});

		await runner({
			subAgentId: INLINE_SUB_AGENT_ID,
			taskName: 'research',
			goal: 'Find the answer',
			taskPath: '/root/research',
			childCount: 0,
			parentTelemetry,
		});

		const expectedTelemetry = {
			...parentTelemetry,
			functionId: undefined,
			metadata: { thread_id: 't1', source: 'sub-agent' },
			rootAnchored: false,
		};
		expect(runtimeConfigs).toHaveLength(1);
		expect(runtimeConfigs[0]?.telemetry).toEqual(expectedTelemetry);
		expect(runtimeGenerateOptions).toHaveLength(1);
		expect(runtimeGenerateOptions[0]?.telemetry).toEqual(expectedTelemetry);
	});

	it('falls back to build-time telemetry when the request has no parentTelemetry', async () => {
		const buildTimeTelemetry = builtTelemetry({ functionId: 'build-time' });
		const runner = createInlineRunner({ telemetry: buildTimeTelemetry });

		await runner({
			subAgentId: INLINE_SUB_AGENT_ID,
			taskName: 'research',
			goal: 'Find the answer',
			taskPath: '/root/research',
			childCount: 0,
		});

		expect(runtimeConfigs[0]?.telemetry).toBe(buildTimeTelemetry);
		expect(runtimeGenerateOptions[0]?.telemetry).toBe(buildTimeTelemetry);
	});

	it('omits telemetry entirely when neither parentTelemetry nor build-time telemetry is set', async () => {
		const runner = createInlineRunner({});

		await runner({
			subAgentId: INLINE_SUB_AGENT_ID,
			taskName: 'research',
			goal: 'Find the answer',
			taskPath: '/root/research',
			childCount: 0,
		});

		expect(runtimeConfigs[0]).not.toHaveProperty('telemetry');
		expect(runtimeGenerateOptions[0]).not.toHaveProperty('telemetry');
	});
});

describe('inline sub-agent transport inheritance', () => {
	beforeEach(() => {
		runtimeConfigs.length = 0;
		runtimeGenerateResults.length = 0;
	});

	it('passes the parent modelFetch to inline child runtimes', async () => {
		const parentFetch = vi.fn();
		const agent = new Agent('parent');
		agent.modelFetch(parentFetch as never);
		const runInline = (agent as unknown as AgentWithInlineRunner).createInlineSubAgentRunner({
			deferredTools: [],
			modelConfig: 'openai/gpt-4o-mini',
			tools: [makeTool('lookup')],
		});

		await runInline({
			subAgentId: INLINE_SUB_AGENT_ID,
			taskName: 'research',
			goal: 'Find the answer',
			taskPath: ['research'],
		} as unknown as DelegateSubAgentRequest);

		expect(runtimeConfigs).toHaveLength(1);
		expect(runtimeConfigs[0].modelFetch).toBe(parentFetch);
	});

	it('leaves modelFetch unset on child runtimes when the parent has none', async () => {
		const runInline = createInlineRunner({});

		await runInline({
			subAgentId: INLINE_SUB_AGENT_ID,
			taskName: 'research',
			goal: 'Find the answer',
			taskPath: ['research'],
		} as unknown as DelegateSubAgentRequest);

		expect(runtimeConfigs).toHaveLength(1);
		expect('modelFetch' in runtimeConfigs[0]).toBe(false);
	});
});
