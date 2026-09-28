import type { LanguageModel } from 'ai';
import { z } from 'zod';

import type { AgentRuntimeConfig } from '../../../types/runtime/agent-runtime';
import type { BuiltTool } from '../../../types/sdk/tool';
import { RuntimeContextBuilder } from '../../loop/runtime-context';
import {
	DeferredToolManager,
	LOAD_TOOL_TOOL_NAME,
	SEARCH_TOOLS_TOOL_NAME,
} from '../deferred-tool-manager';
import {
	resolveNativeToolSearch,
	supportsNativeToolSearch,
	withDeferLoading,
} from '../native-tool-search';

function stubModel(provider: string, modelId: string): LanguageModel {
	return {
		specificationVersion: 'v3',
		provider,
		modelId,
		supportedUrls: {},
		doGenerate: vi.fn(),
		doStream: vi.fn(),
	} as unknown as LanguageModel;
}

function tool(name: string, systemInstruction?: string): BuiltTool {
	return {
		name,
		description: `The ${name} tool`,
		inputSchema: z.object({}),
		handler: async () => await Promise.resolve({}),
		...(systemInstruction ? { systemInstruction } : {}),
	};
}

function createBuilder(model: LanguageModel, tools: BuiltTool[], deferred: BuiltTool[]) {
	const config = {
		name: 'test-agent',
		model,
		instructions: 'Be helpful.',
		tools,
		deferredTools: deferred,
	} as AgentRuntimeConfig;
	const manager = new DeferredToolManager(deferred, { activeTools: tools });
	return { builder: new RuntimeContextBuilder(config, manager), manager };
}

describe('resolveNativeToolSearch', () => {
	it.each([
		['anthropic.messages', 'claude-sonnet-4-6'],
		['anthropic.messages', 'claude-opus-5'],
		['vertex.anthropic.messages', 'claude-opus-4-8'],
	])('uses Anthropic BM25 tool search for %s %s', (provider, modelId) => {
		const search = resolveNativeToolSearch(stubModel(provider, modelId));
		expect(search?.namespace).toBe('anthropic');
		expect(search?.searchTool.name).toBe('anthropic.tool_search_bm25_20251119');
	});

	it('skips Claude 3 models, which predate tool search', () => {
		expect(
			resolveNativeToolSearch(stubModel('anthropic.messages', 'claude-3-5-haiku-latest')),
		).toBeUndefined();
	});

	it.each(['gpt-5.4', 'gpt-5.5-2026-04-23', 'gpt-6'])(
		'uses OpenAI tool search on the Responses API for %s',
		(modelId) => {
			const search = resolveNativeToolSearch(stubModel('openai.responses', modelId));
			expect(search?.namespace).toBe('openai');
			expect(search?.searchTool.name).toBe('openai.tool_search');
		},
	);

	it.each(['gpt-5.2', 'gpt-4.1', 'o3'])('skips OpenAI models before GPT-5.4 (%s)', (modelId) => {
		expect(resolveNativeToolSearch(stubModel('openai.responses', modelId))).toBeUndefined();
	});

	it.each([
		['openai.chat', 'gpt-5.5'],
		['openrouter.chat', 'anthropic/claude-sonnet-4-6'],
		['google.generative-ai', 'gemini-3-pro'],
	])('falls back for %s, which has no tool search', (provider, modelId) => {
		expect(resolveNativeToolSearch(stubModel(provider, modelId))).toBeUndefined();
	});

	it('reports support for model configs', () => {
		expect(supportsNativeToolSearch(stubModel('anthropic.messages', 'claude-sonnet-5'))).toBe(true);
		expect(supportsNativeToolSearch(stubModel('openrouter.chat', 'openai/gpt-5.5'))).toBe(false);
		expect(supportsNativeToolSearch('not-a-valid-id')).toBe(false);
	});
});

describe('withDeferLoading', () => {
	it('adds the flag without dropping existing provider options', () => {
		const deferred = withDeferLoading(
			{ ...tool('a'), providerOptions: { anthropic: { eagerInputStreaming: true } } },
			'anthropic',
		);
		expect(deferred.providerOptions).toEqual({
			anthropic: { deferLoading: true, eagerInputStreaming: true },
		});
	});
});

describe('RuntimeContextBuilder with native tool search', () => {
	const core = tool('core_tool');
	const rare = tool('rare_tool', 'Only call rare_tool on Tuesdays.');
	const other = tool('other_tool');

	it('sends deferred tools with deferLoading and adds the provider search tool', () => {
		const { builder } = createBuilder(
			stubModel('anthropic.messages', 'claude-sonnet-4-6'),
			[core],
			[rare, other],
		);
		const staticContext = builder.buildStaticLoopContext();
		const tools = builder.buildToolLoopContext(staticContext.aiProviderTools);

		expect(Object.keys(tools.aiTools)).toEqual([
			'core_tool',
			'rare_tool',
			'other_tool',
			'anthropic.tool_search_bm25_20251119',
		]);
		expect(tools.aiTools.rare_tool.providerOptions?.anthropic).toMatchObject({
			deferLoading: true,
		});
		expect(tools.aiTools.core_tool.providerOptions?.anthropic).not.toHaveProperty('deferLoading');
		expect(tools.aiTools).not.toHaveProperty(SEARCH_TOOLS_TOOL_NAME);
		expect(tools.aiTools).not.toHaveProperty(LOAD_TOOL_TOOL_NAME);
		// Every deferred tool stays executable when the model calls it after a search.
		expect([...tools.toolMap.keys()]).toEqual(['core_tool', 'rare_tool', 'other_tool']);
	});

	it('keeps the cache breakpoint on the last eagerly sent tool', () => {
		const { builder } = createBuilder(
			stubModel('anthropic.messages', 'claude-sonnet-4-6'),
			[core],
			[rare, other],
		);
		const staticContext = builder.buildStaticLoopContext();
		expect(builder.buildToolLoopContext(staticContext.aiProviderTools).staticToolCacheName).toBe(
			'core_tool',
		);
	});

	it('sends a loaded tool eagerly and includes its rules only then', () => {
		const { builder, manager } = createBuilder(
			stubModel('anthropic.messages', 'claude-sonnet-4-6'),
			[core],
			[rare, other],
		);
		const staticContext = builder.buildStaticLoopContext();
		const before = builder.buildToolLoopContext(staticContext.aiProviderTools);
		expect(before.effectiveInstructions).not.toContain('Tuesdays');

		manager.load('rare_tool');
		const after = builder.buildToolLoopContext(staticContext.aiProviderTools);
		expect(after.aiTools.rare_tool.providerOptions?.anthropic).not.toHaveProperty('deferLoading');
		expect(after.aiTools.other_tool.providerOptions?.anthropic).toMatchObject({
			deferLoading: true,
		});
		expect(after.staticToolCacheName).toBe('rare_tool');
		expect(after.volatileInstructions).toContain('Tuesdays');
	});

	it('keeps search_tools and load_tool for providers without tool search', () => {
		const { builder } = createBuilder(
			stubModel('openrouter.chat', 'anthropic/claude-sonnet-4-6'),
			[core],
			[rare, other],
		);
		const staticContext = builder.buildStaticLoopContext();
		const tools = builder.buildToolLoopContext(staticContext.aiProviderTools);

		expect(Object.keys(tools.aiTools)).toEqual([
			'core_tool',
			SEARCH_TOOLS_TOOL_NAME,
			LOAD_TOOL_TOOL_NAME,
		]);
		expect(tools.staticToolCacheName).toBeUndefined();
	});
});

describe('RuntimeContextBuilder with tool name aliases', () => {
	it('resolves an old tool name to the renamed tool for execution only', () => {
		const renamed = tool('build_workflow');
		const config = {
			name: 'test-agent',
			model: stubModel('anthropic.messages', 'claude-sonnet-4-6'),
			instructions: '',
			tools: [renamed],
			toolNameAliases: { 'build-workflow': 'build_workflow' },
		} as AgentRuntimeConfig;
		const builder = new RuntimeContextBuilder(config, undefined);
		const staticContext = builder.buildStaticLoopContext();
		const tools = builder.buildToolLoopContext(staticContext.aiProviderTools);

		expect(tools.toolMap.get('build-workflow')).toBe(renamed);
		expect(Object.keys(tools.aiTools)).toEqual(['build_workflow']);
	});
});

describe('RuntimeContextBuilder.findToolForResume', () => {
	it('finds a deferred tool that is not loaded in this runtime', () => {
		const deferred = tool('rare_tool');
		const { builder } = createBuilder(
			stubModel('anthropic.messages', 'claude-sonnet-4-6'),
			[tool('core_tool')],
			[deferred],
		);
		expect(builder.findToolForResume('rare_tool')).toBe(deferred);
	});

	it('finds a tool by the name it had before a rename', () => {
		const renamed = tool('ask_user');
		const config = {
			name: 'test-agent',
			model: stubModel('anthropic.messages', 'claude-sonnet-4-6'),
			instructions: '',
			tools: [renamed],
			toolNameAliases: { 'ask-user': 'ask_user' },
		} as AgentRuntimeConfig;
		const builder = new RuntimeContextBuilder(config, undefined);
		expect(builder.findToolForResume('ask-user')).toBe(renamed);
		expect(builder.findToolForResume('constructor')).toBeUndefined();
	});
});
