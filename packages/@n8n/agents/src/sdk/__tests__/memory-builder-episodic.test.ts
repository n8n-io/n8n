import type { AgentRuntime } from '../../runtime/agent-runtime';
import {
	DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL,
	DEFAULT_EPISODIC_MEMORY_HALF_LIFE_DAYS,
	DEFAULT_EPISODIC_MEMORY_MAX_ENTRIES_PER_RUN,
	DEFAULT_EPISODIC_MEMORY_MAX_ENTRY_LENGTH,
	DEFAULT_EPISODIC_MEMORY_TOP_K,
} from '../../runtime/episodic-memory-defaults';
import { InMemoryMemory } from '../../runtime/memory-store';
import type { EpisodicMemoryConfig } from '../../types';
import { Agent } from '../agent';
import { Memory, resolveEpisodicMemoryConfig } from '../memory';

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
			halfLifeDays: DEFAULT_EPISODIC_MEMORY_HALF_LIFE_DAYS,
			maxEntriesPerRun: DEFAULT_EPISODIC_MEMORY_MAX_ENTRIES_PER_RUN,
			maxEntryLength: DEFAULT_EPISODIC_MEMORY_MAX_ENTRY_LENGTH,
			embeddingModel: DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL,
		});
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
				halfLifeDays: 14,
				maxEntriesPerRun: 2,
				maxEntryLength: 400,
				embedder,
				embeddingModel: 'custom/model',
				extract,
				reflect,
				prompts,
			},
			{ defaultModel: 'openai/gpt-4o-mini' },
		);

		expect(resolved).toMatchObject({
			topK: 7,
			halfLifeDays: 14,
			maxEntriesPerRun: 2,
			maxEntryLength: 400,
			embeddingModel: 'custom/model',
			prompts,
		});
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
});
