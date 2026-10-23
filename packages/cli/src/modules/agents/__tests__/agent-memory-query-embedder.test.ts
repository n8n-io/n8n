import { createEmbeddingModel } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { embed } from 'ai';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { resolveEpisodicMemoryEmbeddingProviderOptions } from '@/modules/knowledge/vector-stores/embedding-credential';

import { AgentMemoryQueryEmbedder } from '../agent-memory-query-embedder';
import type { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import type { ProjectAgent } from '../entities/agent.entity';

const proxyFetch = vi.fn();

vi.mock('@n8n/agents', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents')>()),
	createEmbeddingModel: vi.fn().mockReturnValue({ modelId: 'text-embedding-3-small' }),
}));
vi.mock('ai', () => ({ embed: vi.fn() }));
vi.mock('@/utils/ai-proxy-fetch', () => ({ createAiProxyFetch: () => proxyFetch }));
vi.mock('@/modules/knowledge/vector-stores/embedding-credential', () => ({
	resolveEpisodicMemoryEmbeddingProviderOptions: vi.fn(),
}));

const user = mock<User>({ id: 'user-1' });

function makeAgent(episodicMemory?: object): ProjectAgent {
	return {
		id: 'agent-1',
		projectId: 'project-1',
		schema: episodicMemory ? { memory: { episodicMemory } } : null,
	} as ProjectAgent;
}

function makeEmbedder() {
	const logger = mock<Logger>();
	const embedder = new AgentMemoryQueryEmbedder(
		logger,
		mock<CredentialsService>(),
		mock<AgentRuntimeReconstructionService>(),
		mock<OutboundHttp>(),
	);
	return { embedder, logger };
}

describe('AgentMemoryQueryEmbedder', () => {
	const enabled = makeAgent({ enabled: true, credential: 'credential-1' });

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('does not embed when episodic memory is off', async () => {
		const { embedder } = makeEmbedder();

		await expect(
			embedder.embed(makeAgent({ enabled: false }), user, 'tea'),
		).resolves.toBeUndefined();
		expect(resolveEpisodicMemoryEmbeddingProviderOptions).not.toHaveBeenCalled();
	});

	it('embeds the query with the credential through the AI transport', async () => {
		const { embedder } = makeEmbedder();
		vi.mocked(resolveEpisodicMemoryEmbeddingProviderOptions).mockResolvedValue({ apiKey: 'key' });
		vi.mocked(embed).mockResolvedValue({ embedding: [0.1, 0.2] } as never);

		const result = await embedder.embed(enabled, user, 'tea');

		expect(result).toEqual({ embedding: [0.1, 0.2], model: 'openai/text-embedding-3-small' });
		expect(resolveEpisodicMemoryEmbeddingProviderOptions).toHaveBeenCalledWith(
			'credential-1',
			'openai/text-embedding-3-small',
			expect.anything(),
			expect.objectContaining({ fetch: proxyFetch }),
		);
		expect(createEmbeddingModel).toHaveBeenCalledWith('openai/text-embedding-3-small', {
			apiKey: 'key',
		});
	});

	it('falls back and logs when managed embeddings are not available', async () => {
		const { embedder, logger } = makeEmbedder();
		vi.mocked(resolveEpisodicMemoryEmbeddingProviderOptions).mockResolvedValue(null);

		await expect(embedder.embed(enabled, user, 'tea')).resolves.toBeUndefined();
		expect(embed).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith('Memory search could not embed the query', {
			agentId: 'agent-1',
			reason: 'Managed embeddings are not available',
		});
	});

	it('falls back and logs when the embedding request fails', async () => {
		const { embedder, logger } = makeEmbedder();
		vi.mocked(resolveEpisodicMemoryEmbeddingProviderOptions).mockResolvedValue({ apiKey: 'key' });
		vi.mocked(embed).mockRejectedValue(new Error('Not Found'));

		await expect(embedder.embed(enabled, user, 'tea')).resolves.toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith('Memory search could not embed the query', {
			agentId: 'agent-1',
			reason: 'Not Found',
		});
	});
});
