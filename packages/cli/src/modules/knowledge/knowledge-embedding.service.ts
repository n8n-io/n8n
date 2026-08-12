import { createEmbeddingModel } from '@n8n/agents';
import { CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { EmbeddingModel } from 'ai';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';

import { KnowledgeNotConfiguredError } from './errors';
import { KnowledgeSettingsService } from './knowledge-settings.service';
import { KnowledgeConfig } from './knowledge.config';

/** Short, stable string used to discover a model's vector size. */
const DIMENSION_PROBE = 'n8n knowledge dimension probe';

interface CachedEmbedding {
	/** `credentialId:model` — a settings change produces a different key. */
	key: string;
	model: EmbeddingModel;
	dimension?: number;
}

/**
 * Turns text into vectors using the instance-level embedding credential.
 *
 * Mirrors how `@n8n/agents`' `VectorStore` embeds internally (`createEmbeddingModel`
 * plus the AI SDK's `embed`/`embedMany`), but reads its provider and credential
 * from the admin-configured knowledge settings instead of a per-project config.
 */
@Service()
export class KnowledgeEmbeddingService {
	private cached: CachedEmbedding | null = null;

	constructor(
		private readonly settingsService: KnowledgeSettingsService,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsService: CredentialsService,
		private readonly knowledgeConfig: KnowledgeConfig,
	) {}

	async embedQuery(text: string): Promise<number[]> {
		const model = await this.getModel();
		const { embed } = await import('ai');
		const { embedding } = await embed({ model, value: text });

		return embedding;
	}

	/** Embeds in batches of `embeddingBatchSize`; the result keeps the input order. */
	async embedMany(texts: string[]): Promise<number[][]> {
		if (texts.length === 0) return [];

		const model = await this.getModel();
		const { embedMany } = await import('ai');
		const batchSize = Math.max(1, Math.floor(this.knowledgeConfig.embeddingBatchSize));
		const vectors: number[][] = [];

		for (let start = 0; start < texts.length; start += batchSize) {
			const { embeddings } = await embedMany({
				model,
				values: texts.slice(start, start + batchSize),
			});
			vectors.push(...embeddings);
		}

		return vectors;
	}

	/**
	 * Vector size of the configured model, needed to create the collection.
	 * Discovered by embedding a probe string once per model, then cached
	 * alongside the model itself.
	 */
	async getDimension(): Promise<number> {
		const cached = await this.resolveCached();

		if (cached.dimension === undefined) {
			const { embed } = await import('ai');
			const { embedding } = await embed({ model: cached.model, value: DIMENSION_PROBE });
			cached.dimension = embedding.length;
		}

		return cached.dimension;
	}

	private async getModel(): Promise<EmbeddingModel> {
		return (await this.resolveCached()).model;
	}

	/**
	 * Settings are re-read on every call so an admin's change takes effect
	 * immediately; the model itself is only rebuilt when the credential or
	 * model name actually changed.
	 */
	private async resolveCached(): Promise<CachedEmbedding> {
		const { embedding } = await this.settingsService.getSettings();

		if (!embedding) throw new KnowledgeNotConfiguredError();

		const key = `${embedding.credentialId}:${embedding.model}`;
		const cached = this.cached;

		if (cached?.key === key) return cached;

		const credential = await this.credentialsRepository.findOneBy({ id: embedding.credentialId });

		if (!credential) {
			throw new UserError(
				`The embedding credential "${embedding.credentialId}" configured for knowledge no longer exists.`,
			);
		}

		const data = await this.credentialsService.decrypt(credential, true);
		const apiKey = typeof data.apiKey === 'string' ? data.apiKey : '';

		if (apiKey === '') {
			throw new UserError('The embedding credential configured for knowledge has no API key.');
		}

		// n8n's OpenAI credential spells the custom endpoint `url`; the AI SDK
		// providers take it as `baseURL`. Absent means "use the provider default".
		const baseURL = typeof data.url === 'string' && data.url !== '' ? data.url : undefined;
		// Settings store the bare model name, but tolerate an already-prefixed one.
		const modelId = embedding.model.includes('/')
			? embedding.model
			: `${embedding.provider}/${embedding.model}`;

		const model = createEmbeddingModel(modelId, {
			apiKey,
			...(baseURL ? { baseURL } : {}),
		});

		const entry: CachedEmbedding = { key, model };
		this.cached = entry;

		return entry;
	}
}
