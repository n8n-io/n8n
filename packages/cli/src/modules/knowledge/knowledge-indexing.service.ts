import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { createHash } from 'node:crypto';
import { v4 as uuid } from 'uuid';

import type { KnowledgeDocumentDraft } from './connectors/connector.types';
import type { KnowledgeDocument, KnowledgeSource } from './database/entities';
import { KnowledgeDocumentRepository } from './database/repositories';
import { KnowledgeEmbeddingService } from './knowledge-embedding.service';
import type { KnowledgeVectorPoint } from './knowledge-vector-store.service';
import { KnowledgeVectorStoreService } from './knowledge-vector-store.service';
import { KnowledgeConfig } from './knowledge.config';
import { KNOWLEDGE_MODULE_NAME } from './knowledge.constants';
import { chunkText } from './utils/chunk-text';

/**
 * Placeholder written before the vectors are, so a crash mid-index leaves a
 * hash that can never match real content — the next sync re-indexes instead of
 * skipping a document whose vectors were only half-written.
 */
const PENDING_CONTENT_HASH = 'pending';

export type KnowledgeIndexOutcome = 'indexed' | 'skipped';

@Service()
export class KnowledgeIndexingService {
	constructor(
		private readonly documentRepository: KnowledgeDocumentRepository,
		private readonly embeddingService: KnowledgeEmbeddingService,
		private readonly vectorStoreService: KnowledgeVectorStoreService,
		private readonly knowledgeConfig: KnowledgeConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped(KNOWLEDGE_MODULE_NAME);
	}

	/**
	 * Chunks, embeds and stores one document, replacing whatever was indexed
	 * for the same `externalId` before. Returns `'skipped'` when the content is
	 * byte-identical to what is already indexed.
	 */
	async indexDocument(
		source: KnowledgeSource,
		draft: KnowledgeDocumentDraft,
	): Promise<KnowledgeIndexOutcome> {
		const contentHash = createHash('sha256').update(draft.text, 'utf8').digest('hex');
		const existing = await this.documentRepository.findBySourceAndExternalId(
			source.id,
			draft.externalId,
		);

		if (existing?.contentHash === contentHash) return 'skipped';

		const chunks = chunkText(draft.text, {
			chunkSize: this.knowledgeConfig.chunkSize,
			chunkOverlap: this.knowledgeConfig.chunkOverlap,
			maxChars: this.knowledgeConfig.maxDocumentChars,
		});

		// The document row is written first so its id can go into every chunk
		// payload, and with a placeholder hash so an interrupted run re-indexes.
		const document = await this.documentRepository.upsertDocument({
			sourceId: source.id,
			externalId: draft.externalId,
			title: draft.title,
			url: draft.url ?? null,
			contentHash: PENDING_CONTENT_HASH,
			chunkCount: 0,
			meta: draft.metadata,
			sourceUpdatedAt: draft.sourceUpdatedAt ?? null,
		});

		// Keyed on the row existing rather than on its `chunkCount`: an
		// interrupted run can leave vectors behind while the count still reads 0,
		// and those must be swept before the replacements are written.
		const isReplacing = existing !== null;

		if (chunks.length > 0 || isReplacing) {
			await this.vectorStoreService.ensureCollection(await this.embeddingService.getDimension());

			if (isReplacing) {
				await this.vectorStoreService.deleteByDocumentId(source.id, document.id);
			}

			if (chunks.length > 0) {
				const vectors = await this.embeddingService.embedMany(chunks);
				await this.vectorStoreService.upsertChunks(
					chunks.map((chunk, index) =>
						this.toPoint(source, document, draft, chunk, index, vectors[index]),
					),
				);
			}
		}

		await this.documentRepository.upsertDocument({
			sourceId: source.id,
			externalId: draft.externalId,
			title: draft.title,
			url: draft.url ?? null,
			contentHash,
			chunkCount: chunks.length,
			meta: draft.metadata,
			sourceUpdatedAt: draft.sourceUpdatedAt ?? null,
		});

		if (chunks.length === 0) {
			this.logger.debug('Indexed a document with no chunkable content', {
				sourceId: source.id,
				externalId: draft.externalId,
			});
		}

		return 'indexed';
	}

	/** Drops documents that no longer exist at the source, vectors first. Returns the number of rows removed. */
	async removeDocuments(source: KnowledgeSource, externalIds: string[]): Promise<number> {
		if (externalIds.length === 0) return 0;

		await this.vectorStoreService.deleteByExternalIds(source.id, externalIds);

		return await this.documentRepository.deleteBySourceAndExternalIds(source.id, externalIds);
	}

	/**
	 * Removes everything indexed for a source. Document rows are deleted
	 * explicitly: the FK cascade only fires when the source row itself is
	 * deleted, and callers may keep the source around to re-index it.
	 */
	async removeSource(sourceId: string): Promise<void> {
		await this.vectorStoreService.deleteBySourceId(sourceId);

		const externalIds = await this.documentRepository.listExternalIds(sourceId);
		await this.documentRepository.deleteBySourceAndExternalIds(sourceId, externalIds);
	}

	/**
	 * Connector metadata is spread first so the reserved fields the search layer
	 * relies on (and the source scoping filter) can never be overwritten by it.
	 */
	private toPoint(
		source: KnowledgeSource,
		document: KnowledgeDocument,
		draft: KnowledgeDocumentDraft,
		chunk: string,
		chunkIndex: number,
		vector: number[],
	): KnowledgeVectorPoint {
		return {
			id: uuid(),
			vector,
			payload: {
				...draft.metadata,
				sourceId: source.id,
				documentId: document.id,
				externalId: draft.externalId,
				chunkIndex,
				title: draft.title,
				url: draft.url ?? null,
				text: chunk,
			},
		};
	}
}
