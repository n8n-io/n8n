import { Service } from '@n8n/di';

import { KnowledgeSourceRepository } from './database/repositories';
import { KnowledgeNotConfiguredError } from './errors';
import { KnowledgeEmbeddingService } from './knowledge-embedding.service';
import { KnowledgeSettingsService } from './knowledge-settings.service';
import { KnowledgeVectorStoreService } from './knowledge-vector-store.service';
import { KnowledgeConfig } from './knowledge.config';

/**
 * Payload fields the result shape already exposes as first-class properties;
 * everything else in the payload is connector metadata.
 */
const RESERVED_PAYLOAD_KEYS = ['sourceId', 'documentId', 'text', 'title', 'url', 'chunkIndex'];

export interface KnowledgeSearchResult {
	text: string;
	score: number;
	title: string;
	url: string | null;
	sourceId: string;
	sourceName: string;
	externalId: string;
	metadata: Record<string, unknown>;
}

export interface KnowledgeSearchOptions {
	/** Restrict the search to these sources; unknown ids are dropped. */
	sourceIds?: string[];
	topK?: number;
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function stripReserved(payload: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(payload).filter(([key]) => !RESERVED_PAYLOAD_KEYS.includes(key)),
	);
}

/** Semantic search across indexed knowledge sources. */
@Service()
export class KnowledgeSearchService {
	constructor(
		private readonly settingsService: KnowledgeSettingsService,
		private readonly sourceRepository: KnowledgeSourceRepository,
		private readonly embeddingService: KnowledgeEmbeddingService,
		private readonly vectorStoreService: KnowledgeVectorStoreService,
		private readonly knowledgeConfig: KnowledgeConfig,
	) {}

	async search(query: string, opts?: KnowledgeSearchOptions): Promise<KnowledgeSearchResult[]> {
		if (!(await this.settingsService.isConfigured())) throw new KnowledgeNotConfiguredError();

		if (query.trim() === '') return [];

		// Existing sources are the allow-list: a pinned id that no longer exists
		// (or never did) is dropped rather than widening the search.
		const sources = await this.sourceRepository.findAllSources();
		const sourceNames = new Map(sources.map((source) => [source.id, source.name]));
		const allowedSourceIds = opts?.sourceIds
			? opts.sourceIds.filter((id) => sourceNames.has(id))
			: [...sourceNames.keys()];

		if (allowedSourceIds.length === 0) return [];

		const vector = await this.embeddingService.embedQuery(query);
		const hits = await this.vectorStoreService.search(vector, {
			sourceIds: allowedSourceIds,
			topK: opts?.topK ?? this.knowledgeConfig.defaultTopK,
		});

		const results: KnowledgeSearchResult[] = [];

		for (const hit of hits) {
			const sourceId = readString(hit.payload.sourceId);
			const sourceName = sourceId === undefined ? undefined : sourceNames.get(sourceId);

			// Defensive: a chunk whose source has been deleted but whose vectors
			// were not pruned must not leak into results.
			if (sourceId === undefined || sourceName === undefined) continue;

			results.push({
				text: readString(hit.payload.text) ?? '',
				score: hit.score,
				title: readString(hit.payload.title) ?? '',
				url: readString(hit.payload.url) ?? null,
				sourceId,
				sourceName,
				externalId: readString(hit.payload.externalId) ?? '',
				metadata: stripReserved(hit.payload),
			});
		}

		return results;
	}
}
