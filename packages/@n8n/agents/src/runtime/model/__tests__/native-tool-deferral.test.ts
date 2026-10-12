import type { ModelMessage, ToolSet } from 'ai';
import { z } from 'zod';

import { Tool } from '../../../sdk/tool';
import type { AgentRuntimeConfig } from '../../../types/runtime/agent-runtime';
import type { ModelConfig } from '../../../types/sdk/agent';
import type { AgentMessage, Message } from '../../../types/sdk/message';
import { RuntimeContextBuilder } from '../../loop/runtime-context';
import { InMemoryMemory } from '../../memory/memory-store';
import { AgentMessageList } from '../message-list';
import { fromAiMessages } from '../messages';
import { resolveNativeToolDeferral } from '../model-factory';
import { applyNativeToolDeferral } from '../native-tool-deferral';
import { anthropicToolDeferral } from '../native-tool-deferral/anthropic';
import { openAiToolDeferral } from '../native-tool-deferral/openai';
import { toAiSdkProviderTools, toAiSdkTools } from '../../tools/tool-adapter';

const providers = { openai: openAiToolDeferral, anthropic: anthropicToolDeferral };
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
	it.each<[ModelConfig, keyof typeof providers | undefined]>([
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
		expect(resolveNativeToolDeferral(model)).toBe(expected ? providers[expected] : undefined);
	});

	it.each(['openai', 'anthropic'] as const)('uses the effective %s endpoint', (provider) => {
		const model = provider === 'openai' ? 'gpt-5.4' : 'claude-sonnet-4-6';
		vi.stubEnv(`${provider.toUpperCase()}_BASE_URL`, 'https://proxy.example/v1');
		expect(resolveNativeToolDeferral(`${provider}/${model}`)).toBeUndefined();
		expect(
			resolveNativeToolDeferral({
				id: `${provider}/${model}`,
				baseURL: `https://api.${provider}.com/v1`,
			}),
		).toBe(providers[provider]);
	});

	it('keeps a pre-built model eager because its endpoint is unknown', () => {
		const model = {
			provider: 'openai.responses',
			modelId: 'gpt-5.4',
			doGenerate: vi.fn(),
		} as unknown as ModelConfig;
		expect(resolveNativeToolDeferral(model)).toBeUndefined();
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

	it.each<['history' | 'checkpoint', string, Partial<AgentRuntimeConfig>]>([
		['history', 'anthropic.tool_search', {}],
		[
			'checkpoint',
			'anthropic.tool_search_2',
			{ deferredTools: [makeTool('anthropic.tool_search')] },
		],
		[
			'history',
			'anthropic.tool_search_regex_20251119',
			{
				providerTools: [{ name: 'anthropic.tool_search_regex_20251119', args: {} }],
				nativeToolDeferral: { eagerToolNames: ['workspace_read_file', 'workflow_lookup'] },
			},
		],
	])(
		'prunes unavailable search references from %s with %s',
		async (source, searchToolName, config) => {
			const previous = new AgentMessageList();
			previous.addInput([
				{ role: 'user', content: [{ type: 'text', text: 'Find lookup tools.' }] },
			]);
			const removed = { type: 'tool_reference', toolName: 'mcp_lookup' };
			const retained = { type: 'tool_reference', toolName: 'workflow_lookup' };
			const providerOptions = { anthropic: { cacheControl: { type: 'ephemeral' } } };
			previous.addResponse(
				[[removed, retained], [removed]].map(
					(output, index): AgentMessage => ({
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolCallId: `search_${index}`,
								toolName: searchToolName,
								input: { query: 'lookup' },
								providerExecuted: true,
								state: 'resolved',
								output,
								resultProviderOptions: providerOptions,
							},
						],
					}),
				),
			);
			const stored = structuredClone(previous.serialize());
			let list: AgentMessageList;
			if (source === 'checkpoint') {
				list = AgentMessageList.deserialize(stored);
			} else {
				list = new AgentMessageList();
				list.addHistory(stored.messages);
			}
			const before = structuredClone(list.serialize());
			const { context, aiProviderTools } = makeContext({
				tools: [makeTool('workspace_read_file'), makeTool('workflow_lookup')],
				...config,
			});
			const tools = await context.buildToolLoopContext(aiProviderTools);
			const prompt = context.buildModelPrompt({
				list,
				tools,
				instructionProviderOptions: undefined,
				hostVolatileInstructions: undefined,
				activeSkills: undefined,
			});
			const results = prompt.messages.flatMap((message) =>
				message.role === 'assistant' && Array.isArray(message.content)
					? message.content.filter((part) => part.type === 'tool-result')
					: [],
			);
			expect(results).toMatchObject([
				{ toolCallId: 'search_0', output: { type: 'json', value: [retained] }, providerOptions },
				{ toolCallId: 'search_1', output: { type: 'json', value: [] }, providerOptions },
			]);
			expect(list.serialize()).toEqual(before);
			expect(tools.aiTools).not.toHaveProperty('mcp_lookup');
			expect(tools.toolMap.has('mcp_lookup')).toBe(false);
		},
	);

	it('omits failed tool searches from replay and preserves stored history', async () => {
		const failedSearches = ['unavailable', 'too_many_requests'].map(
			(errorCode, index): Message => ({
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: `failed_search_${index}`,
						toolName: 'anthropic.tool_search',
						input: { query: 'lookup' },
						providerExecuted: true,
						state: 'rejected',
						error: JSON.stringify({ type: 'tool_search_tool_result_error', errorCode }),
					},
				],
			}),
		);
		failedSearches[1].content.push(
			{ type: 'text', text: 'Search was unavailable.' },
			{
				type: 'tool-call',
				toolCallId: 'web_search_0',
				toolName: 'anthropic.web_search_20250305',
				input: { query: 'lookup' },
				providerExecuted: true,
				state: 'rejected',
				error: JSON.stringify({ type: 'web_search_tool_result_error', errorCode: 'unavailable' }),
			},
		);
		const list = new AgentMessageList();
		list.addHistory([
			{ role: 'user', content: [{ type: 'text', text: 'Find lookup tools.' }] },
			failedSearches[0],
			{ role: 'user', content: [{ type: 'text', text: 'Try again.' }] },
			failedSearches[1],
		]);
		list.addInput([{ role: 'user', content: [{ type: 'text', text: 'Continue.' }] }]);
		const before = structuredClone(list.serialize());
		const { context, aiProviderTools } = makeContext({
			tools: [makeTool('workspace_read_file'), makeTool('workflow_lookup')],
			providerTools: [{ name: 'anthropic.web_search_20250305', args: {} }],
		});
		const tools = await context.buildToolLoopContext(aiProviderTools);
		const prompt = context.buildModelPrompt({
			list,
			tools,
			instructionProviderOptions: undefined,
			hostVolatileInstructions: undefined,
			activeSkills: undefined,
		});
		expect(prompt.messages.filter((message) => message.role === 'assistant')).toMatchObject([
			{
				content: [
					{ type: 'text', text: 'Search was unavailable.' },
					{ type: 'tool-call', toolCallId: 'web_search_0' },
					{
						type: 'tool-result',
						toolCallId: 'web_search_0',
						output: { type: 'error-json' },
					},
				],
			},
		]);
		expect(list.serialize()).toEqual(before);
	});

	it.each(['cacheControl', 'cache_control'])(
		'keeps caller %s markers and explicit eager options',
		async (marker) => {
			const callerCache = {
				anthropic: { [marker]: { type: 'ephemeral', ttl: '5m' }, deferLoading: true },
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
			const { tools: native } = await applyNativeToolDeferral(tools, anthropicToolDeferral, policy);
			expect(native.cached.providerOptions?.anthropic).toEqual({
				...tools.cached.providerOptions?.anthropic,
				deferLoading: false,
			});
			expect(native.eager.providerOptions).toEqual(tools.eager.providerOptions);
			expect(native.lookup.providerOptions?.anthropic?.deferLoading).toBe(true);
			expect(tools.cached.providerOptions?.anthropic?.deferLoading).toBe(true);
		},
	);

	it.each(['openai', 'anthropic'] as const)(
		'adds no %s search for an empty or eager catalog',
		async (provider) => {
			expect(await applyNativeToolDeferral({}, providers[provider], policy)).toEqual({ tools: {} });
			const { tools: eager } = await applyNativeToolDeferral(
				toAiSdkTools([makeTool('workspace_read_file')]),
				providers[provider],
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
		const { tools: native } = await applyNativeToolDeferral(tools, providers[provider], policy);
		expect(Object.keys(native)).toEqual(Object.keys(tools));
		expect(native[id]).toMatchObject({ type: 'provider', id, args: {} });
		expect(native[id].outputSchema).toBeDefined();
	});

	it('keeps user tools when the generated search name is occupied', async () => {
		const tools = toAiSdkTools([makeTool('openai.tool_search')]);
		const { tools: native } = await applyNativeToolDeferral(tools, openAiToolDeferral, policy);
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
		const { tools: native } = await applyNativeToolDeferral(tools, openAiToolDeferral, policy);
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
