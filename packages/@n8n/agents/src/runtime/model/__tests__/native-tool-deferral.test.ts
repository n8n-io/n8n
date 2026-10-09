import type { ModelMessage, ToolSet } from 'ai';
import { z } from 'zod';

import { Tool } from '../../../sdk/tool';
import type { AgentRuntimeConfig } from '../../../types/runtime/agent-runtime';
import type { ModelConfig } from '../../../types/sdk/agent';
import { RuntimeContextBuilder } from '../../loop/runtime-context';
import { InMemoryMemory } from '../../memory/memory-store';
import { AgentMessageList } from '../message-list';
import { fromAiMessages } from '../messages';
import {
	applyNativeToolDeferral,
	resolveNativeToolDeferralProvider,
} from '../native-tool-deferral';
import { toAiSdkProviderTools, toAiSdkTools } from '../../tools/tool-adapter';

const policy = { eagerToolNames: ['workspace_read_file'] };
const input = z.object({ query: z.string() });

function makeTool(name: string) {
	return new Tool(name)
		.description(`Run ${name}.`)
		.input(input)
		.handler(async ({ query }) => ({ query }))
		.build();
}

function makeContext(config: Partial<AgentRuntimeConfig> = {}) {
	const context = new RuntimeContextBuilder(
		{
			name: 'native-test',
			model: 'anthropic/claude-sonnet-4-6',
			instructions: 'Use the available tools.',
			nativeToolDeferral: policy,
			...config,
		},
		undefined,
	);
	const { aiProviderTools } = context.buildStaticLoopContext();
	return { context, aiProviderTools };
}

beforeEach(() => {
	vi.stubEnv('OPENAI_BASE_URL', undefined);
	vi.stubEnv('ANTHROPIC_BASE_URL', undefined);
});

afterEach(() => vi.unstubAllEnvs());

describe('native tool deferral compatibility', () => {
	it.each<[ModelConfig, string | undefined]>([
		['openai/gpt-5.4', 'openai'],
		['openai/gpt-5.4-mini', 'openai'],
		['openai/gpt-5.4-nano', undefined],
		['openai/gpt-5.4-nano-2026-03-17', undefined],
		['openai/gpt-6.1-sol', 'openai'],
		['openai/gpt-5.10-mini', 'openai'],
		['openai/gpt-7', 'openai'],
		['openai/gpt-7-sol-2027-01-01', 'openai'],
		[{ id: 'openai/gpt-5.4-2026-03-05', apiStyle: 'responses' }, 'openai'],
		[{ id: 'openai/gpt-5.5', url: 'https://api.openai.com/v1/' }, 'openai'],
		[{ id: 'anthropic/claude-sonnet-4-6', baseURL: 'https://api.anthropic.com' }, 'anthropic'],
		['anthropic/claude-opus-4-5', 'anthropic'],
		['anthropic/claude-sonnet-4-5-20250929', 'anthropic'],
		['anthropic/claude-haiku-4-5-20251001', 'anthropic'],
		['anthropic/claude-sonnet-5-5', 'anthropic'],
		['anthropic/claude-fable-5-1', 'anthropic'],
		['anthropic/claude-sonnet-4-10', 'anthropic'],
		['anthropic/claude-sonnet-6', 'anthropic'],
		['anthropic/claude-sonnet-6-20270101', 'anthropic'],
		['openai/gpt-5', undefined],
		['openai/gpt-5.3-chat-latest', undefined],
		['openai/gpt-latest', undefined],
		['openai/gpt-5.4.1', undefined],
		['anthropic/claude-opus-4-1', undefined],
		['anthropic/claude-sonnet-4-20250514', undefined],
		['anthropic/claude-3-7-sonnet-20250219', undefined],
		['anthropic/claude-unknown', undefined],
		['anthropic/claude-sonnet-5.5', undefined],
		[{ id: 'openai/gpt-5.4', apiStyle: 'chat' }, undefined],
		[
			{ id: 'openai/gpt-5.4', baseURL: 'https://proxy.example/v1', apiStyle: 'responses' },
			undefined,
		],
		[{ id: 'openai/gpt-5.4', url: 'https://proxy.example/v1' }, undefined],
		[{ id: 'openai/gpt-5.4', baseURL: 'https://api.openai.com/custom' }, undefined],
		[{ id: 'openai/gpt-5.4', baseURL: 'http://api.openai.com/v1' }, undefined],
		[{ id: 'openai/gpt-5.4', baseURL: 'https://ai-assistant.n8n.io/v1/gateway/openai' }, undefined],
		[{ id: 'anthropic/claude-sonnet-4-6', baseURL: 'https://proxy.example' }, undefined],
		['google-vertex-anthropic/claude-sonnet-4-6', undefined],
		['aws-bedrock/anthropic.claude-sonnet-4-6', undefined],
		['openrouter/openai/gpt-5.4', undefined],
		['vercel/openai/gpt-5.4', undefined],
		['minimax/MiniMax-M2.7', undefined],
	])('selects support for %j', (model, expected) => {
		expect(resolveNativeToolDeferralProvider(model)).toBe(expected);
	});

	it.each(['openai', 'anthropic'] as const)('uses the effective %s endpoint', (provider) => {
		const model = provider === 'openai' ? 'gpt-5.4' : 'claude-sonnet-4-6';
		vi.stubEnv(`${provider.toUpperCase()}_BASE_URL`, 'https://proxy.example/v1');
		expect(resolveNativeToolDeferralProvider(`${provider}/${model}`)).toBeUndefined();
		expect(
			resolveNativeToolDeferralProvider({
				id: `${provider}/${model}`,
				baseURL: `https://api.${provider}.com/v1`,
			}),
		).toBe(provider);
	});

	it('keeps a pre-built model eager because its endpoint is unknown', () => {
		const model = {
			provider: 'openai.responses',
			modelId: 'gpt-5.4',
			doGenerate: vi.fn(),
		} as unknown as ModelConfig;
		expect(resolveNativeToolDeferralProvider(model)).toBeUndefined();
	});
});

describe('native tool catalog', () => {
	it('keeps all handlers and the catalog stable after discovery', async () => {
		const tools = [
			makeTool('workspace_read_file'),
			makeTool('custom_lookup'),
			makeTool('workflow_lookup'),
			makeTool('node_lookup'),
			makeTool('slack_action'),
			makeTool('search_text'),
		];
		const deferredTool = {
			...makeTool('mcp_lookup'),
			systemInstruction: 'Use the lookup result as the source of truth.',
		};
		const { context, aiProviderTools } = makeContext({ tools, deferredTools: [deferredTool] });
		const before = await context.buildToolLoopContext(aiProviderTools);
		const history: ModelMessage[] = [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'search_1',
						toolName: 'anthropic.tool_search',
						input: { query: 'lookup' },
						providerExecuted: true,
					},
					{
						type: 'tool-result',
						toolCallId: 'search_1',
						toolName: 'anthropic.tool_search',
						output: { type: 'json', value: [{ type: 'tool_reference', toolName: 'mcp_lookup' }] },
					},
				],
			},
		];
		const list = new AgentMessageList();
		list.addResponse(fromAiMessages(history));
		const after = await context.buildToolLoopContext(aiProviderTools, undefined, undefined, list);

		expect(after.aiTools).toEqual(before.aiTools);
		expect(Object.keys(after.aiTools)).toEqual(Object.keys(before.aiTools));
		expect(after.effectiveInstructions).toBe(before.effectiveInstructions);
		expect(after.volatileInstructions).toBe(before.volatileInstructions);
		expect(after.staticToolCacheName).toBe('workspace_read_file');
		expect([...after.toolMap.values()]).toEqual([...tools, deferredTool]);
		expect(after.aiTools.workspace_read_file.providerOptions?.anthropic?.deferLoading).toBe(false);
		expect(after.aiTools.mcp_lookup.providerOptions?.anthropic?.deferLoading).toBe(true);
		expect(after.aiTools).not.toHaveProperty('search_tools');
		expect(after.aiTools).not.toHaveProperty('load_tool');
	});

	it('keeps caller cache markers and explicit eager options', async () => {
		const callerCache = {
			anthropic: { cacheControl: { type: 'ephemeral', ttl: '5m' }, deferLoading: true },
		};
		const tools = toAiSdkTools([
			new Tool('cached')
				.description('Read cached data.')
				.input(input)
				.providerOptions(callerCache)
				.handler(async ({ query }) => ({ query }))
				.build(),
			new Tool('eager')
				.description('Read data eagerly.')
				.input(input)
				.providerOptions({ anthropic: { deferLoading: false }, openai: { strict: false } })
				.handler(async ({ query }) => ({ query }))
				.build(),
			makeTool('lookup'),
		]);
		const native = await applyNativeToolDeferral(tools, 'anthropic', policy);
		expect(native.cached.providerOptions?.anthropic).toEqual({
			...tools.cached.providerOptions?.anthropic,
			deferLoading: false,
		});
		expect(native.eager.providerOptions).toEqual(tools.eager.providerOptions);
		expect(native.lookup.providerOptions?.anthropic?.deferLoading).toBe(true);
		expect(tools.cached.providerOptions?.anthropic?.deferLoading).toBe(true);
	});

	it.each(['openai', 'anthropic'] as const)(
		'adds no %s search for an empty or eager catalog',
		async (provider) => {
			expect(await applyNativeToolDeferral({}, provider, policy)).toEqual({});
			const eager = await applyNativeToolDeferral(
				toAiSdkTools([makeTool('workspace_read_file')]),
				provider,
				policy,
			);
			expect(Object.keys(eager)).toEqual(['workspace_read_file']);
		},
	);

	it.each([
		['openai', 'openai.tool_search'],
		['anthropic', 'anthropic.tool_search_bm25_20251119'],
		['anthropic', 'anthropic.tool_search_regex_20251119'],
	] as const)('reuses configured %s search %s', async (provider, id) => {
		const tools = {
			...toAiSdkTools([makeTool('lookup')]),
			...toAiSdkProviderTools([{ name: id, args: {} }]),
		};
		const native = await applyNativeToolDeferral(tools, provider, policy);
		expect(Object.keys(native)).toEqual(Object.keys(tools));
		expect(native[id]).toMatchObject({ type: 'provider', id, args: {} });
		expect(native[id].outputSchema).toBeDefined();
	});

	it('keeps user tools when the generated search name is occupied', async () => {
		const tools = toAiSdkTools([makeTool('openai.tool_search')]);
		const native = await applyNativeToolDeferral(tools, 'openai', policy);
		expect(native['openai.tool_search'].type).not.toBe('provider');
		expect(native['openai.tool_search_2']).toMatchObject({
			type: 'provider',
			id: 'openai.tool_search',
		});
	});

	it('uses the complete eager catalog with an incompatible configured search', async () => {
		const tools: ToolSet = {
			...toAiSdkTools([
				new Tool('lookup')
					.description('Look up data.')
					.input(input)
					.providerOptions({ openai: { deferLoading: true } })
					.handler(async ({ query }) => ({ query }))
					.build(),
			]),
			...toAiSdkProviderTools([{ name: 'openai.tool_search', args: { execution: 'client' } }]),
		};
		const native = await applyNativeToolDeferral(tools, 'openai', policy);
		expect(native.lookup.providerOptions?.openai?.deferLoading).toBe(false);
		expect(native['openai.tool_search']).toEqual(tools['openai.tool_search']);
		expect(Object.keys(native)).toEqual(Object.keys(tools));
	});

	it('includes runtime memory tools in the policy', async () => {
		const memory = new InMemoryMemory();
		const { context, aiProviderTools } = makeContext({
			memory,
			episodicMemory: { embedder: { specificationVersion: 'v2' } as never },
			tools: [makeTool('workspace_read_file')],
		});
		const list = new AgentMessageList();
		const tools = await context.buildToolLoopContext(
			aiProviderTools,
			{ threadId: 'thread', resourceId: 'user' },
			undefined,
			list,
		);
		for (const name of ['recall_memory', 'flag_memory']) {
			expect(tools.aiTools[name].providerOptions?.anthropic?.deferLoading).toBe(true);
			expect(tools.toolMap.get(name)?.handler).toBeDefined();
		}
		expect(tools.staticToolCacheName).toBe('workspace_read_file');
	});
});
