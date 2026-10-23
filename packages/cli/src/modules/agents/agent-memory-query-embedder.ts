import { createEmbeddingModel, DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { raceAbort } from '@n8n/utils/race-abort';

import { CredentialsService } from '@/credentials/credentials.service';
import { resolveEpisodicMemoryEmbeddingProviderOptions } from '@/modules/knowledge/vector-stores/embedding-credential';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { AgentRuntimeReconstructionService } from './agent-runtime-reconstruction.service';
import type { ProjectAgent } from './entities/agent.entity';

const EMBED_TIMEOUT_MS = 5_000;

export interface MemoryQueryEmbedding {
	embedding: number[];
	/** Only entries embedded with this model are comparable. */
	model: string;
}

/** Embeds a memory list search with the agent's episodic memory embedder. */
@Service()
export class AgentMemoryQueryEmbedder {
	constructor(
		private readonly logger: Logger,
		private readonly credentialsService: CredentialsService,
		private readonly runtimeReconstruction: AgentRuntimeReconstructionService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	/** Returns undefined when the agent has no working embedder. The search then finds nothing. */
	async embed(
		agent: ProjectAgent,
		user: User,
		text: string,
	): Promise<MemoryQueryEmbedding | undefined> {
		const config = agent.schema?.memory?.episodicMemory;
		if (!config?.enabled) return undefined;
		// One limit covers credential resolution, proxy token minting and the embed call.
		const abortSignal = AbortSignal.timeout(EMBED_TIMEOUT_MS);
		try {
			const result = await raceAbort(
				this.embedText(agent, user, config.credential, text, abortSignal),
				abortSignal,
				() => new Error(`Embedding took longer than ${EMBED_TIMEOUT_MS} ms`),
			);
			if (!result) this.logFallback(agent, 'Managed embeddings are not available');
			return result;
		} catch (error) {
			this.logFallback(agent, getErrorMessage(error));
			return undefined;
		}
	}

	private async embedText(
		agent: ProjectAgent,
		user: User,
		credential: string,
		text: string,
		abortSignal: AbortSignal,
	): Promise<MemoryQueryEmbedding | undefined> {
		const model = DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL;
		const options = await resolveEpisodicMemoryEmbeddingProviderOptions(
			credential,
			model,
			new AgentsCredentialProvider(this.credentialsService, agent.projectId, user, agent.id),
			{
				resolveManaged: async () =>
					await this.runtimeReconstruction.resolveManagedEmbeddingProviderOptions(agent.projectId),
				fetch: createAiProxyFetch(this.outboundHttp),
			},
		);
		if (!options) return undefined;
		const { embed } = await import('ai');
		const { embedding } = await embed({
			model: createEmbeddingModel(model, options),
			value: text,
			abortSignal,
		});
		return { embedding, model };
	}

	private logFallback(agent: ProjectAgent, reason: string): void {
		this.logger.warn('Memory search could not embed the query', { agentId: agent.id, reason });
	}
}
