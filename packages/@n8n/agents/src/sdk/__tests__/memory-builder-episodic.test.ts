import type { AgentRuntime } from '../../runtime/agent-runtime';
import {
	DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL,
	DEFAULT_EPISODIC_MEMORY_MAX_ENTRIES_PER_RUN,
	DEFAULT_EPISODIC_MEMORY_TOP_K,
} from '../../runtime/episodic-memory-defaults';
import { InMemoryMemory } from '../../runtime/memory-store';
import type { BuiltMemory, EpisodicMemoryConfig } from '../../types';
import { Agent } from '../agent';
import {
	Memory,
	normalizeMemoryConfig,
	resolveEpisodicMemoryConfig,
	resolveMemoryConfigDefaults,
} from '../memory';

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

describe('Memory builder — episodic memory', () => {
	const minimalBackend = {
		getThread: jest.fn().mockResolvedValue(null),
		saveThread: jest.fn().mockResolvedValue({}),
		deleteThread: jest.fn().mockResolvedValue(undefined),
		getMessages: jest.fn().mockResolvedValue([]),
		saveMessages: jest.fn().mockResolvedValue(undefined),
		deleteMessages: jest.fn().mockResolvedValue(undefined),
		describe: () => ({
			name: 'minimal',
			constructorName: 'MinimalMemory',
			connectionParams: null,
		}),
	} as unknown as BuiltMemory;

	it('resolves episodic memory defaults from the agent model', async () => {
		const memory = new Memory().storage(new InMemoryMemory()).episodicMemory({
			embeddingProviderOptions: {
				apiKey: 'embedding-key',
				baseURL: 'https://custom.example/v1',
			},
		});
		const agent = new Agent('a')
			.model('openai/gpt-4o-mini')
			.instructions('You are a test assistant.')
			.memory(memory);

		const runtime = await (agent as unknown as { build(): Promise<AgentRuntime> }).build();
		const runtimeConfig = (
			runtime as unknown as {
				config: {
					episodicMemory?: EpisodicMemoryConfig;
				};
			}
		).config;
		const embedder = runtimeConfig.episodicMemory?.embedder as unknown as Record<string, unknown>;

		expect(runtimeConfig.episodicMemory).toMatchObject({
			topK: DEFAULT_EPISODIC_MEMORY_TOP_K,
			maxEntriesPerRun: DEFAULT_EPISODIC_MEMORY_MAX_ENTRIES_PER_RUN,
			embeddingModel: DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL,
		});
		expect(runtimeConfig.episodicMemory).not.toHaveProperty('halfLifeDays');
		expect(runtimeConfig.episodicMemory).not.toHaveProperty('maxEntryLength');
		expect(typeof runtimeConfig.episodicMemory?.extract).toBe('function');
		expect(typeof runtimeConfig.episodicMemory?.reflect).toBe('function');
		expect(embedder.provider).toBe('openai');
		expect(embedder.modelId).toBe('text-embedding-3-small');
		expect(embedder.apiKey).toBe('embedding-key');
		expect(embedder.baseURL).toBe('https://custom.example/v1');
	});

	it('preserves episodic memory overrides when resolving defaults', () => {
		const embedder = {
			provider: 'custom',
			modelId: 'embedding',
			specificationVersion: 'v2',
		} as unknown as NonNullable<EpisodicMemoryConfig['embedder']>;
		const extract: NonNullable<EpisodicMemoryConfig['extract']> = async () =>
			await Promise.resolve({ entries: [] });
		const reflect: NonNullable<EpisodicMemoryConfig['reflect']> = async () =>
			await Promise.resolve({
				drop: [],
				merge: [],
			});
		const prompts = {
			extraction: 'extract prompt',
			reflection: 'reflect prompt',
			recallToolInstruction: 'recall prompt',
		};

		const resolved = resolveEpisodicMemoryConfig(
			{
				topK: 7,
				maxEntriesPerRun: 2,
				halfLifeDays: 14,
				maxEntryLength: 400,
				embedder,
				embeddingModel: 'custom/model',
				extract,
				reflect,
				prompts,
			} as unknown as EpisodicMemoryConfig,
			{ defaultModel: 'openai/gpt-4o-mini' },
		);

		expect(resolved).toMatchObject({
			topK: 7,
			maxEntriesPerRun: 2,
			embeddingModel: 'custom/model',
			prompts,
		});
		expect(resolved).not.toHaveProperty('halfLifeDays');
		expect(resolved).not.toHaveProperty('maxEntryLength');
		expect(resolved.embedder).toBe(embedder);
		expect(resolved.extract).toBe(extract);
		expect(resolved.reflect).toBe(reflect);
	});

	it('constructs the default embedder without provider options', () => {
		const resolved = resolveEpisodicMemoryConfig({}, { defaultModel: 'openai/gpt-4o-mini' });
		const embedder = resolved.embedder as unknown as Record<string, unknown>;

		expect(embedder.provider).toBe('openai');
		expect(embedder.modelId).toBe('text-embedding-3-small');
		expect(embedder.apiKey).toBeUndefined();
		expect(embedder.baseURL).toBeUndefined();
	});

	it('rejects direct configs with episodic memory on unsupported backends', () => {
		expect(() =>
			normalizeMemoryConfig({
				memory: minimalBackend,
				lastMessages: 10,
				episodicMemory: {
					embedder: { specificationVersion: 'v2' } as never,
					extract: async () => await Promise.resolve({ entries: [] }),
				},
			}),
		).toThrow(/BuiltEpisodicMemoryStore/);
	});

	it('rejects default resolution with episodic memory on unsupported backends', () => {
		expect(() =>
			resolveMemoryConfigDefaults(
				{
					memory: minimalBackend,
					lastMessages: 10,
					episodicMemory: {},
				},
				{ defaultModel: 'openai/gpt-4o-mini' },
			),
		).toThrow(/BuiltEpisodicMemoryStore/);
	});
});
