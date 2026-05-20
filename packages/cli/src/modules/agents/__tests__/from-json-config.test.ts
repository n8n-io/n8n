import type { AgentSnapshot, ToolDescriptor } from '@n8n/agents';
import type { BuiltProviderTool, BuiltTool } from '@n8n/agents';
import type { JSONSchema7 } from 'json-schema';

import {
	AgentJsonConfigSchema,
	RunnableAgentJsonConfigSchema,
	type AgentJsonConfig,
	type AgentJsonWebSearchConfig,
} from '@n8n/api-types';
import { buildFromJson } from '../json-config/from-json-config';
import type { ToolExecutor } from '../json-config/from-json-config';

type EmbeddingProviderOpts = {
	apiKey?: string;
	baseURL?: string;
};

jest.mock('@ai-sdk/openai', () => ({
	createOpenAI: (opts?: EmbeddingProviderOpts) =>
		Object.assign(
			(model: string) => ({
				provider: 'openai',
				modelId: model,
				apiKey: opts?.apiKey,
				baseURL: opts?.baseURL,
				specificationVersion: 'v3',
			}),
			{
				embeddingModel: (model: string) => ({
					provider: 'openai',
					modelId: model,
					apiKey: opts?.apiKey,
					baseURL: opts?.baseURL,
					specificationVersion: 'v2',
				}),
			},
		),
}));

// ---------------------------------------------------------------------------
// buildFromJson() tests
// ---------------------------------------------------------------------------

describe('buildFromJson()', () => {
	const makeConfig = (overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig => ({
		name: 'test-agent',
		model: 'anthropic/claude-sonnet-4-5',
		credential: 'my-anthropic-key',
		instructions: 'You are a test agent.',
		...overrides,
	});

	const makeMockToolExecutor = (): ToolExecutor => ({
		executeTool: jest.fn().mockResolvedValue({ result: 'tool result' }),
	});

	const makeMockCredentialProvider = () => ({
		resolve: jest.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
		list: jest.fn().mockResolvedValue([]),
	});

	const makeToolDescriptor = (overrides: Partial<ToolDescriptor> = {}): ToolDescriptor => ({
		name: 'search',
		description: 'Search the web',
		systemInstruction: null,
		inputSchema: { type: 'object', properties: { query: { type: 'string' } } } as JSONSchema7,
		outputSchema: null,
		hasSuspend: false,
		hasResume: false,
		hasToMessage: false,
		requireApproval: false,
		providerOptions: null,
		...overrides,
	});

	const getMemoryConfig = (agent: unknown) =>
		(
			agent as {
				memoryConfig?: {
					lastMessages: number;
					observationLog?: {
						renderTokenBudget?: number;
					};
					observationalMemory?: {
						observerThresholdTokens?: number;
						reflectorThresholdTokens?: number;
						observationLogTailLimit?: number;
						lockTtlMs?: number;
						observe?: unknown;
						reflect?: unknown;
					};
					episodicMemory?: {
						topK?: number;
						maxEntriesPerRun?: number;
						embedder?: unknown;
						embeddingModel?: string;
						embeddingProviderOptions?: {
							apiKey?: string;
							baseURL?: string;
						};
						extract?: unknown;
						reflect?: unknown;
					};
				};
			}
		).memoryConfig;

	const makeMockMemoryFactory = () => jest.fn();

	const getProviderTools = (agent: unknown): BuiltProviderTool[] =>
		(agent as { providerTools?: BuiltProviderTool[] }).providerTools ?? [];

	const makeMockMemoryBackend = () => ({
		getThread: jest.fn(),
		saveThread: jest.fn(),
		deleteThread: jest.fn(),
		getMessages: jest.fn().mockResolvedValue([]),
		saveMessages: jest.fn(),
		deleteMessages: jest.fn(),
		appendObservationLogEntries: jest.fn(),
		getActiveObservationLog: jest.fn(),
		getObservationLog: jest.fn(),
		dropObservationLogEntries: jest.fn(),
		supersedeObservationLogEntries: jest.fn(),
		applyObservationLogReflection: jest.fn(),
		getMessagesForObservationScope: jest.fn(),
		getCursor: jest.fn(),
		setCursor: jest.fn(),
		acquireObservationLogTaskLock: jest.fn(),
		releaseObservationLogTaskLock: jest.fn(),
		episodic: {
			saveEntryWithSources: jest.fn(),
			searchEntries: jest.fn(),
			getEntrySources: jest.fn(),
			applyReflection: jest.fn(),
			getCursor: jest.fn(),
			setCursor: jest.fn(),
		},
		describe: jest
			.fn()
			.mockReturnValue({ name: 'n8n', constructorName: 'N8nMemory', connectionParams: null }),
		close: jest.fn(),
	});

	it('sets name, model, and instructions', async () => {
		const agent = await buildFromJson(
			makeConfig(),
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);
		const snap: AgentSnapshot = agent.snapshot;

		expect(snap.name).toBe('test-agent');
		expect(snap.model.provider).toBe('anthropic');
		expect(snap.model.name).toBe('claude-sonnet-4-5');
		expect(snap.instructions).toBe('You are a test agent.');
	});

	it('handles multi-slash model string for aggregator providers', async () => {
		const agent = await buildFromJson(
			makeConfig({ model: 'openrouter/amazon/nova-micro-v1' }),
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);

		const snap: AgentSnapshot = agent.snapshot;
		// Provider is always everything before the FIRST slash.
		expect(snap.model.provider).toBe('openrouter');
		// Model name is everything after the first slash, including any further slashes.
		expect(snap.model.name).toBe('amazon/nova-micro-v1');
	});

	it('handles single-part model string (no slash)', async () => {
		const agent = await buildFromJson(
			makeConfig({ model: 'claude-sonnet-4-5' }),
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);

		const snap: AgentSnapshot = agent.snapshot;
		expect(snap.model.provider).toBeNull();
		expect(snap.model.name).toBe('claude-sonnet-4-5');
	});

	it('wires a custom tool', async () => {
		const descriptor = makeToolDescriptor({ name: 'my_search' });
		const config = makeConfig({ tools: [{ type: 'custom', id: 'search_tool' }] });

		const agent = await buildFromJson(
			config,
			{ search_tool: descriptor },
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);

		expect(agent.snapshot.tools.some((t) => t.name === 'my_search')).toBe(true);
	});

	it('wires attached skills through the shared runtime skill loader without inlining bodies', async () => {
		const config = makeConfig({
			skills: [{ type: 'skill', id: 'skill_0Ab9ZkLm3Pq7Xy2N' }],
		});

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
				skills: {
					skill_0Ab9ZkLm3Pq7Xy2N: {
						name: 'Summarize notes',
						description: 'Use for meeting notes and transcripts',
						instructions: 'Extract decisions and action items.',
					},
				},
			},
		);

		const instructions = agent.snapshot.instructions ?? '';
		expect(instructions).toBe('You are a test agent.');
		expect(instructions).not.toContain('Extract decisions and action items.');
		expect(agent.snapshot.tools.some((tool) => tool.name === 'list_skills')).toBe(true);
		expect(agent.snapshot.tools.some((tool) => tool.name === 'load_skill')).toBe(true);
	});

	it('wires load_skill for attached skills and returns the selected skill body on demand', async () => {
		const config = makeConfig({
			skills: [{ type: 'skill', id: 'summarize_notes' }],
		});

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
				skills: {
					summarize_notes: {
						name: 'Summarize notes',
						description: 'Use for meeting notes and transcripts',
						instructions: 'Extract decisions and action items.',
					},
					unused_skill: {
						name: 'Unused skill',
						description: 'This is not attached',
						instructions: 'This should not load.',
					},
				},
			},
		);

		const loadSkill = agent.declaredTools.find((t) => t.name === 'load_skill');
		expect(loadSkill).toBeDefined();
		expect(loadSkill?.description).not.toContain('Summarize notes');
		expect(loadSkill?.systemInstruction).toBeUndefined();

		await expect(loadSkill!.handler?.({ skillId: 'summarize_notes' }, {})).resolves.toMatchObject({
			ok: true,
			success: true,
			skillId: 'summarize_notes',
			name: 'Summarize notes',
			content: 'Extract decisions and action items.',
			instructions: 'Extract decisions and action items.',
		});

		await expect(loadSkill!.handler?.({ skillId: 'unused_skill' }, {})).resolves.toMatchObject({
			ok: false,
			success: false,
		});
	});

	it('throws when a configured skill ref is missing its stored body', async () => {
		const config = makeConfig({
			skills: [{ type: 'skill', id: 'missing_skill' }],
		});

		await expect(
			buildFromJson(
				config,
				{},
				{
					toolExecutor: makeMockToolExecutor(),
					credentialProvider: makeMockCredentialProvider(),
					memoryFactory: makeMockMemoryFactory(),
					skills: {},
				},
			),
		).rejects.toThrow('Skill "missing_skill" not found in stored skill bodies');
	});

	it('rejects custom tools that reuse runtime skill tool names', async () => {
		const descriptor = makeToolDescriptor({ name: 'load_skill' });
		const config = makeConfig({
			skills: [{ type: 'skill', id: 'summarize_notes' }],
			tools: [{ type: 'custom', id: 'reserved_tool' }],
		});

		await expect(
			buildFromJson(
				config,
				{ reserved_tool: descriptor },
				{
					toolExecutor: makeMockToolExecutor(),
					credentialProvider: makeMockCredentialProvider(),
					memoryFactory: makeMockMemoryFactory(),
					skills: {
						summarize_notes: {
							name: 'Summarize notes',
							description: 'Use for meeting notes and transcripts',
							instructions: 'Extract decisions and action items.',
						},
					},
				},
			),
		).rejects.toThrow('Tool name "load_skill" is reserved for runtime skills');
	});

	it('throws when custom tool id is not found in descriptors', async () => {
		const config = makeConfig({ tools: [{ type: 'custom', id: 'missing_tool' }] });

		await expect(
			buildFromJson(
				config,
				{},
				{
					toolExecutor: makeMockToolExecutor(),
					credentialProvider: makeMockCredentialProvider(),
					memoryFactory: makeMockMemoryFactory(),
				},
			),
		).rejects.toThrow('Custom tool "missing_tool" not found in tool descriptors');
	});

	it('resolves workflow tool via resolveTool callback', async () => {
		const config = makeConfig({
			tools: [{ type: 'workflow', workflow: 'My Workflow', name: 'run_workflow' }],
		});

		const resolvedTool = {
			name: 'run_workflow',
			description: 'Run My Workflow',
			handler: jest.fn().mockResolvedValue({ done: true }),
		};
		const resolveTool = jest.fn().mockResolvedValue(resolvedTool);

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
				resolveTool,
			},
		);

		expect(agent.snapshot.tools.some((t) => t.name === 'run_workflow')).toBe(true);
		expect(resolveTool).toHaveBeenCalledTimes(1);
	});

	it('wraps workflow tool with approval when requireApproval is true', async () => {
		const config = makeConfig({
			tools: [
				{ type: 'workflow', workflow: 'My Workflow', name: 'run_workflow', requireApproval: true },
			],
		});

		const resolvedTool = {
			name: 'run_workflow',
			description: 'Run My Workflow',
			handler: jest.fn().mockResolvedValue({ done: true }),
		};
		const resolveTool = jest.fn().mockResolvedValue(resolvedTool);

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
				resolveTool,
			},
		);

		const tool = agent.declaredTools.find((t) => t.name === 'run_workflow');
		expect(tool).toBeDefined();
		expect(tool!.withDefaultApproval).toBe(true);
	});

	it('wraps node tool with approval when requireApproval is true', async () => {
		const config = makeConfig({
			tools: [
				{
					type: 'node',
					name: 'my_node_tool',
					description: 'A node tool',
					node: { nodeType: 'n8n-nodes-base.httpRequest', nodeTypeVersion: 1, nodeParameters: {} },
					requireApproval: true,
				},
			],
		});

		const resolvedTool = {
			name: 'my_node_tool',
			description: 'A node tool',
			handler: jest.fn().mockResolvedValue({ done: true }),
		};
		const resolveTool = jest.fn().mockResolvedValue(resolvedTool);

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
				resolveTool,
			},
		);

		const tool = agent.declaredTools.find((t) => t.name === 'my_node_tool');
		expect(tool).toBeDefined();
		expect(tool!.withDefaultApproval).toBe(true);
	});

	it('does not wrap workflow tool with approval when requireApproval is not set', async () => {
		const config = makeConfig({
			tools: [{ type: 'workflow', workflow: 'My Workflow', name: 'run_workflow' }],
		});

		const resolvedTool = {
			name: 'run_workflow',
			description: 'Run My Workflow',
			handler: jest.fn().mockResolvedValue({ done: true }),
		};
		const resolveTool = jest.fn().mockResolvedValue(resolvedTool);

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
				resolveTool,
			},
		);

		const tool = agent.declaredTools.find((t) => t.name === 'run_workflow');
		expect(tool).toBeDefined();
		expect(tool!.withDefaultApproval).toBeUndefined();
	});

	it('falls back to marker tool when resolveTool is not provided for workflow tools', async () => {
		const config = makeConfig({ tools: [{ type: 'workflow', workflow: 'Test Workflow' }] });

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);

		expect(agent.snapshot.tools.some((t) => t.name === 'Test Workflow')).toBe(true);
	});

	it('sets thinking config', async () => {
		const config = makeConfig({
			config: { thinking: { provider: 'anthropic', budgetTokens: 5000 } },
		});

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);
		const snap: AgentSnapshot = agent.snapshot;

		expect(snap.thinking).not.toBeNull();
		expect(snap.thinking).toMatchObject({ budgetTokens: 5000 });
	});

	it('sets toolCallConcurrency', async () => {
		const config = makeConfig({ config: { toolCallConcurrency: 5 } });

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);

		expect(agent.snapshot.toolCallConcurrency).toBe(5);
	});

	it('configures memory when enabled', async () => {
		const mockMemory = makeMockMemoryBackend();
		const config = makeConfig({
			memory: {
				enabled: true,
				storage: 'n8n',
				lastMessages: 15,
				observationalMemory: {
					observerThresholdTokens: 4_000,
					reflectorThresholdTokens: 12_000,
					renderTokenBudget: 4_000,
					observationLogTailLimit: 10,
					lockTtlMs: 5_000,
				},
			},
		});

		const memoryFactory = jest.fn().mockReturnValue(mockMemory);

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory,
			},
		);

		expect(memoryFactory).toHaveBeenCalledWith(config.memory);
		expect(agent.snapshot.hasMemory).toBe(true);
		expect(getMemoryConfig(agent)?.lastMessages).toBe(15);
		expect(getMemoryConfig(agent)?.observationLog).toEqual({ renderTokenBudget: 4_000 });
		expect(getMemoryConfig(agent)?.observationalMemory).toMatchObject({
			observerThresholdTokens: 4_000,
			reflectorThresholdTokens: 12_000,
			observationLogTailLimit: 10,
			lockTtlMs: 5_000,
		});
		expect(getMemoryConfig(agent)?.observationalMemory?.observe).toBeUndefined();
		expect(getMemoryConfig(agent)?.observationalMemory?.reflect).toBeUndefined();
	});

	it('enables observational memory by default when memory is enabled', async () => {
		const config = makeConfig({
			memory: { enabled: true, storage: 'n8n' },
		});

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: jest.fn().mockReturnValue(makeMockMemoryBackend()),
			},
		);

		expect(agent.snapshot.hasObservationalMemory).toBe(true);
		expect(getMemoryConfig(agent)?.observationalMemory).toEqual({});
		expect(getMemoryConfig(agent)?.observationLog).toEqual({});
	});

	it('configures episodic memory with the OpenAI embedding credential', async () => {
		const credentialProvider = {
			resolve: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				url: 'https://custom.example/v1',
			}),
			list: jest.fn().mockResolvedValue([]),
		};
		const config = makeConfig({
			memory: {
				enabled: true,
				storage: 'n8n',
				episodicMemory: {
					enabled: true,
					credential: 'openai-key',
					topK: 7,
				},
			},
		});

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider,
				memoryFactory: jest.fn().mockReturnValue(makeMockMemoryBackend()),
			},
		);

		expect(credentialProvider.resolve).toHaveBeenCalledWith('openai-key');
		expect(agent.snapshot.hasEpisodicMemory).toBe(true);
		expect(getMemoryConfig(agent)?.episodicMemory).toMatchObject({
			topK: 7,
			embeddingProviderOptions: {
				apiKey: 'test-api-key',
				baseURL: 'https://custom.example/v1',
			},
		});
		expect(getMemoryConfig(agent)?.episodicMemory?.embedder).toBeUndefined();
		expect(getMemoryConfig(agent)?.episodicMemory?.extract).toBeUndefined();
		expect(getMemoryConfig(agent)?.episodicMemory?.reflect).toBeUndefined();
	});

	it('can disable observational memory while keeping message memory', async () => {
		const config = makeConfig({
			memory: { enabled: true, storage: 'n8n', observationalMemory: { enabled: false } },
		});

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: jest.fn().mockReturnValue(makeMockMemoryBackend()),
			},
		);

		expect(agent.snapshot.hasMemory).toBe(true);
		expect(agent.snapshot.hasObservationalMemory).toBe(false);
		expect(getMemoryConfig(agent)?.observationLog).toBeUndefined();
		expect(getMemoryConfig(agent)?.observationalMemory).toBeUndefined();
	});

	it('skips memory when memory.enabled is false', async () => {
		const config = makeConfig({ memory: { enabled: false, storage: 'n8n' } });

		const memoryFactory = jest.fn();

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory,
			},
		);

		expect(memoryFactory).not.toHaveBeenCalled();
		expect(agent.snapshot.hasMemory).toBe(false);
		expect(getMemoryConfig(agent)).toBeUndefined();
	});

	describe('webSearch', () => {
		const buildAgent = async (
			overrides: Partial<AgentJsonConfig>,
			options: Partial<Parameters<typeof buildFromJson>[2]> = {},
		) =>
			await buildFromJson(
				makeConfig(overrides),
				{},
				{
					toolExecutor: makeMockToolExecutor(),
					credentialProvider: makeMockCredentialProvider(),
					memoryFactory: makeMockMemoryFactory(),
					...options,
				},
			);

		const fallbackTools: BuiltTool[] = [
			{
				name: 'web_search',
				description: 'Search the web',
				handler: async () => ({}),
			},
			{
				name: 'web_open',
				description: 'Open a web page',
				handler: async () => ({}),
			},
		];

		it('attaches Anthropic native web search in auto mode with domain policy', async () => {
			const agent = await buildAgent({
				webSearch: {
					enabled: true,
					allowedDomains: ['docs.n8n.io'],
					blockedDomains: ['reddit.com'],
				},
			});

			expect(getProviderTools(agent)).toEqual([
				{
					name: 'anthropic.web_search_20250305',
					args: {
						allowedDomains: ['docs.n8n.io'],
						blockedDomains: ['reddit.com'],
					},
				},
			]);
			expect(agent.snapshot.tools).toEqual([]);
		});

		it('attaches OpenAI native web search when only allowed domains are configured', async () => {
			const agent = await buildAgent({
				model: 'openai/gpt-4o',
				webSearch: {
					enabled: true,
					allowedDomains: ['docs.n8n.io'],
				},
			});

			expect(getProviderTools(agent)).toEqual([
				{
					name: 'openai.web_search',
					args: {
						filters: {
							allowedDomains: ['docs.n8n.io'],
						},
					},
				},
			]);
		});

		it('attaches xAI native web search with provider domain argument names', async () => {
			const agent = await buildAgent({
				model: 'xai/grok-4',
				webSearch: {
					enabled: true,
					allowedDomains: ['docs.n8n.io'],
					blockedDomains: ['reddit.com'],
				},
			});

			expect(getProviderTools(agent)).toEqual([
				{
					name: 'xai.web_search',
					args: {
						allowedDomains: ['docs.n8n.io'],
						excludedDomains: ['reddit.com'],
					},
				},
			]);
		});

		it('uses n8n fallback in auto mode when OpenAI cannot enforce blocked domains', async () => {
			const createWebSearchTools = jest
				.fn<Promise<BuiltTool[]>, [AgentJsonWebSearchConfig]>()
				.mockResolvedValue(fallbackTools);

			const agent = await buildAgent(
				{
					model: 'openai/gpt-4o',
					webSearch: {
						enabled: true,
						blockedDomains: ['reddit.com'],
						credential: {
							id: 'search-cred',
							name: 'Brave',
							type: 'braveSearchApi',
						},
					},
				},
				{ createWebSearchTools },
			);

			expect(createWebSearchTools).toHaveBeenCalledWith({
				enabled: true,
				blockedDomains: ['reddit.com'],
				credential: {
					id: 'search-cred',
					name: 'Brave',
					type: 'braveSearchApi',
				},
			});
			expect(getProviderTools(agent)).toEqual([]);
			expect(agent.snapshot.tools.map((tool) => tool.name)).toEqual(['web_search', 'web_open']);
		});

		it('uses n8n fallback in auto mode for Google instead of provider tools', async () => {
			const createWebSearchTools = jest
				.fn<Promise<BuiltTool[]>, [AgentJsonWebSearchConfig]>()
				.mockResolvedValue(fallbackTools);

			const agent = await buildAgent(
				{
					model: 'google/gemini-2.5-pro',
					webSearch: {
						enabled: true,
						credential: {
							id: 'search-cred',
							name: 'SearXNG',
							type: 'searXngApi',
						},
					},
				},
				{ createWebSearchTools },
			);

			expect(getProviderTools(agent)).toEqual([]);
			expect(agent.snapshot.tools.map((tool) => tool.name)).toEqual(['web_search', 'web_open']);
		});

		it('fails provider mode when provider-native search cannot enforce the policy', async () => {
			await expect(
				buildAgent({
					model: 'openai/gpt-4o',
					webSearch: {
						enabled: true,
						mode: 'provider',
						blockedDomains: ['reddit.com'],
					},
				}),
			).rejects.toThrow('OpenAI web search does not support blockedDomains');
		});

		it('fails provider mode for unsupported providers', async () => {
			await expect(
				buildAgent({
					model: 'mistral/mistral-large-latest',
					webSearch: {
						enabled: true,
						mode: 'provider',
					},
				}),
			).rejects.toThrow('does not support provider-hosted web search');
		});

		it('requires a credential when fallback web search is selected', async () => {
			await expect(
				buildAgent({
					model: 'mistral/mistral-large-latest',
					webSearch: {
						enabled: true,
					},
				}),
			).rejects.toThrow('webSearch.credential is required');
		});

		it('rejects manual web-search providerTools when webSearch is enabled', async () => {
			await expect(
				buildAgent({
					webSearch: {
						enabled: true,
					},
					providerTools: {
						'anthropic.web_search': {},
					},
				}),
			).rejects.toThrow('Do not configure web-search providerTools manually');
		});

		it('keeps non-search providerTools valid when webSearch is enabled', async () => {
			const agent = await buildAgent({
				webSearch: {
					enabled: true,
				},
				providerTools: {
					'openai.image_generation': {},
				},
			});

			expect(getProviderTools(agent).map((tool) => tool.name)).toEqual([
				'anthropic.web_search_20250305',
				'openai.image_generation',
			]);
		});
	});
});

// ---------------------------------------------------------------------------
// AgentJsonConfig Zod schema validation
// ---------------------------------------------------------------------------

describe('AgentJsonConfigSchema', () => {
	it('parses a minimal valid config', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).not.toThrow();
	});

	it('accepts a blank model for draft configs', () => {
		const config = {
			name: 'test',
			model: '',
			instructions: '',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).not.toThrow();
	});

	it('requires model and credential for runnable configs', () => {
		const config = {
			name: 'test',
			model: '',
			instructions: 'Be helpful.',
		};
		expect(() => RunnableAgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects invalid model format (no slash)', () => {
		const config = {
			name: 'test',
			model: 'invalid-no-slash',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('accepts multi-slash model format for aggregator providers', () => {
		const config = {
			name: 'test',
			model: 'openrouter/amazon/nova-micro-v1',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).not.toThrow();
	});

	it('accepts deeply-nested model format', () => {
		const config = {
			name: 'test',
			model: 'openrouter/openai/gpt-4o',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		const parsed = AgentJsonConfigSchema.parse(config);
		expect(parsed.model).toBe('openrouter/openai/gpt-4o');
	});

	it('rejects model with consecutive slashes', () => {
		const config = {
			name: 'test',
			model: 'openrouter//nova-micro-v1',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects model with trailing slash', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5/',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects model with leading slash in model segment', () => {
		const config = {
			name: 'test',
			model: 'anthropic//claude-sonnet-4-5',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects empty name', () => {
		const config = {
			name: '',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects name longer than 128 chars', () => {
		const config = {
			name: 'a'.repeat(129),
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('parses custom tool ref with valid id', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			tools: [{ type: 'custom', id: 'my_tool_1' }],
		};
		const parsed = AgentJsonConfigSchema.parse(config);
		expect(parsed.tools?.[0]).toMatchObject({ type: 'custom', id: 'my_tool_1' });
	});

	it('rejects inputSchema on node tool configs', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			tools: [
				{
					type: 'node',
					name: 'http_request',
					description: 'Make an HTTP request',
					node: {
						nodeType: 'n8n-nodes-base.httpRequestTool',
						nodeTypeVersion: 4,
						nodeParameters: {
							url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('url', 'The URL to request', 'string') }}",
						},
					},
					inputSchema: {
						type: 'object',
						properties: { url: { type: 'string' } },
						required: ['url'],
					},
				},
			],
		};

		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects id on node tool configs', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			tools: [
				{
					type: 'node',
					id: 'tool-ref-1',
					name: 'http_request',
					description: 'Make an HTTP request',
					node: {
						nodeType: 'n8n-nodes-base.httpRequestTool',
						nodeTypeVersion: 4,
						nodeParameters: {
							url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('url', 'The URL to request', 'string') }}",
						},
					},
				},
			],
		};

		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects id on workflow tool configs', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'You are helpful',
			tools: [{ type: 'workflow', id: 'tool-ref-1', workflow: 'Send Welcome Email' }],
		};

		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects custom tool ref with invalid id characters', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			tools: [{ type: 'custom', id: 'tool id' }],
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('parses an integrations array containing schedule + chat triggers', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			integrations: [
				{
					type: 'schedule',
					active: false,
					cronExpression: '0 0 * * *',
					wakeUpPrompt: 'tick',
				},
				{ type: 'slack', credentialId: 'cred-1' },
			],
		};
		const parsed = AgentJsonConfigSchema.parse(config);
		expect(parsed.integrations).toHaveLength(2);
		expect(parsed.integrations?.[0]).toMatchObject({ type: 'schedule', active: false });
		expect(parsed.integrations?.[1]).toMatchObject({
			type: 'slack',
			credentialId: 'cred-1',
		});
	});

	it('validates Telegram private integration settings', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			integrations: [
				{
					type: 'telegram',
					credentialId: 'cred-1',
					settings: {
						accessMode: 'private',
						allowedUsers: ['123', '123', '456', 'john_doe123'],
					},
				},
			],
		};

		const parsed = AgentJsonConfigSchema.parse(config);

		expect(parsed.integrations?.[0]).toMatchObject({
			type: 'telegram',
			settings: {
				accessMode: 'private',
				allowedUsers: ['123', '456', 'john_doe123'],
			},
		});
	});

	it('rejects Telegram private integration settings without valid user IDs', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			integrations: [
				{
					type: 'telegram',
					credentialId: 'cred-1',
					settings: { accessMode: 'private', allowedUsers: [] },
				},
			],
		};

		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects Telegram integration settings with entries containing invalid characters', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			integrations: [
				{
					type: 'telegram',
					credentialId: 'cred-1',
					settings: { accessMode: 'private', allowedUsers: ['user name'] },
				},
			],
		};

		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('parses an integrations array containing schedule + chat triggers', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			integrations: [
				{
					type: 'schedule',
					active: false,
					cronExpression: '0 0 * * *',
					wakeUpPrompt: 'tick',
				},
				{ type: 'slack', credentialId: 'cred-1' },
			],
		};
		const parsed = AgentJsonConfigSchema.parse(config);
		expect(parsed.integrations).toHaveLength(2);
		expect(parsed.integrations?.[0]).toMatchObject({ type: 'schedule', active: false });
		expect(parsed.integrations?.[1]).toMatchObject({
			type: 'slack',
			credentialId: 'cred-1',
		});
	});

	it('parses webSearch config with an explicit fallback credential reference', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			webSearch: {
				enabled: true,
				mode: 'n8n',
				allowedDomains: ['docs.n8n.io'],
				blockedDomains: ['reddit.com'],
				credential: {
					id: 'cred-search',
					name: 'Brave Search',
					type: 'braveSearchApi',
				},
			},
		};

		const parsed = AgentJsonConfigSchema.parse(config);
		expect(parsed.webSearch).toEqual(config.webSearch);
	});

	it('rejects webSearch with malformed domains', () => {
		for (const domain of ['https://docs.n8n.io/path', 'foo-.example.com']) {
			const config = {
				name: 'test',
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'my-key',
				instructions: '',
				webSearch: {
					enabled: true,
					allowedDomains: [domain],
				},
			};

			expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
		}
	});

	it('rejects unsupported webSearch credential types', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			webSearch: {
				enabled: true,
				mode: 'n8n',
				credential: {
					id: 'cred-search',
					name: 'Other',
					type: 'httpHeaderAuth',
				},
			},
		};

		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});
});
