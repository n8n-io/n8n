import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { VectorStoreDataRepository, SharedWorkflowRepository } from '@n8n/db';
import type { IVectorStoreDataService, VectorDocument, VectorSearchResult } from 'n8n-workflow';

type MemorySnapshot = {
	rssmb: number;
	heapUsedMb: number;
	heapTotalMb: number;
	externalMb: number;
};

function memorySnapshot(): MemorySnapshot {
	const m = process.memoryUsage();
	return {
		rssmb: Math.round(m.rss / 1024 / 1024),
		heapUsedMb: Math.round(m.heapUsed / 1024 / 1024),
		heapTotalMb: Math.round(m.heapTotal / 1024 / 1024),
		externalMb: Math.round(m.external / 1024 / 1024),
	};
}

function memoryDelta(before: MemorySnapshot, after: MemorySnapshot): MemorySnapshot {
	return {
		rssmb: after.rssmb - before.rssmb,
		heapUsedMb: after.heapUsedMb - before.heapUsedMb,
		heapTotalMb: after.heapTotalMb - before.heapTotalMb,
		externalMb: after.externalMb - before.externalMb,
	};
}

@Service()
export class VectorStoreDataService implements IVectorStoreDataService {
	constructor(
		private readonly repository: VectorStoreDataRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * Resolve projectId from workflowId
	 */
	private async resolveProjectId(workflowId: string): Promise<string> {
		const sharedWorkflow = await this.sharedWorkflowRepository.findOne({
			select: ['projectId'],
			where: { workflowId },
		});

		if (!sharedWorkflow?.projectId) {
			throw new Error(
				`Could not find projectId for workflowId ${workflowId}. This execution may not be associated with a project.`,
			);
		}

		return sharedWorkflow.projectId;
	}

	/**
	 * Add vectors to a memory store
	 */
	async addVectors(
		memoryKey: string,
		workflowId: string,
		documents: VectorDocument[],
		embeddings: number[][],
		clearStore: boolean = false,
	): Promise<void> {
		const embeddingDim = embeddings[0]?.length ?? 0;
		const estimatedEmbeddingMb = Math.round((documents.length * embeddingDim * 4) / 1024 / 1024);
		const before = memorySnapshot();

		this.logger.debug('[VectorStore] addVectors start', {
			memoryKey,
			workflowId,
			documentCount: documents.length,
			embeddingDimension: embeddingDim,
			clearStore,
			estimatedEmbeddingDataMb: estimatedEmbeddingMb,
			memory: before,
		});

		const startMs = Date.now();
		const projectId = await this.resolveProjectId(workflowId);

		const afterResolve = memorySnapshot();
		this.logger.debug('[VectorStore] addVectors projectId resolved', {
			memoryKey,
			projectId,
			memory: afterResolve,
		});

		await this.repository.addVectors(memoryKey, projectId, documents, embeddings, clearStore);

		const after = memorySnapshot();
		this.logger.debug('[VectorStore] addVectors complete', {
			memoryKey,
			projectId,
			documentCount: documents.length,
			durationMs: Date.now() - startMs,
			memoryBefore: before,
			memoryAfter: after,
			memoryDelta: memoryDelta(before, after),
		});
	}

	/**
	 * Perform similarity search on vectors
	 */
	async similaritySearch(
		memoryKey: string,
		workflowId: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<VectorSearchResult[]> {
		const before = memorySnapshot();

		this.logger.debug('[VectorStore] similaritySearch start', {
			memoryKey,
			workflowId,
			queryEmbeddingDimension: queryEmbedding.length,
			k,
			filterKeys: filter ? Object.keys(filter) : [],
			memory: before,
		});

		const startMs = Date.now();
		const projectId = await this.resolveProjectId(workflowId);

		const afterResolve = memorySnapshot();
		this.logger.debug('[VectorStore] similaritySearch projectId resolved', {
			memoryKey,
			projectId,
			memory: afterResolve,
		});

		const results = await this.repository.similaritySearch(
			memoryKey,
			projectId,
			queryEmbedding,
			k,
			filter,
		);

		const after = memorySnapshot();
		this.logger.debug('[VectorStore] similaritySearch complete', {
			memoryKey,
			projectId,
			resultCount: results.length,
			durationMs: Date.now() - startMs,
			memoryBefore: before,
			memoryAfter: after,
			memoryDelta: memoryDelta(before, after),
		});

		return results;
	}

	/**
	 * Get count of vectors for a memory key
	 */
	async getVectorCount(memoryKey: string, workflowId: string): Promise<number> {
		const before = memorySnapshot();

		this.logger.debug('[VectorStore] getVectorCount start', {
			memoryKey,
			workflowId,
			memory: before,
		});

		const startMs = Date.now();
		const projectId = await this.resolveProjectId(workflowId);
		const count = await this.repository.getVectorCount(memoryKey, projectId);

		const after = memorySnapshot();
		this.logger.debug('[VectorStore] getVectorCount complete', {
			memoryKey,
			projectId,
			count,
			durationMs: Date.now() - startMs,
			memoryBefore: before,
			memoryAfter: after,
			memoryDelta: memoryDelta(before, after),
		});

		return count;
	}

	/**
	 * Clear all vectors for a memory key
	 */
	async clearStore(memoryKey: string, workflowId: string): Promise<void> {
		const before = memorySnapshot();

		this.logger.debug('[VectorStore] clearStore start', {
			memoryKey,
			workflowId,
			memory: before,
		});

		const startMs = Date.now();
		const projectId = await this.resolveProjectId(workflowId);
		await this.repository.clearStore(memoryKey, projectId);

		const after = memorySnapshot();
		this.logger.debug('[VectorStore] clearStore complete', {
			memoryKey,
			projectId,
			durationMs: Date.now() - startMs,
			memoryBefore: before,
			memoryAfter: after,
			memoryDelta: memoryDelta(before, after),
		});
	}

	/**
	 * Delete entire store (alias for clearStore)
	 */
	async deleteStore(memoryKey: string, workflowId: string): Promise<void> {
		const before = memorySnapshot();

		this.logger.debug('[VectorStore] deleteStore start', {
			memoryKey,
			workflowId,
			memory: before,
		});

		const startMs = Date.now();
		const projectId = await this.resolveProjectId(workflowId);
		await this.repository.deleteStore(memoryKey, projectId);

		const after = memorySnapshot();
		this.logger.debug('[VectorStore] deleteStore complete', {
			memoryKey,
			projectId,
			durationMs: Date.now() - startMs,
			memoryBefore: before,
			memoryAfter: after,
			memoryDelta: memoryDelta(before, after),
		});
	}

	/**
	 * List all unique memory keys for a project
	 */
	async listStores(workflowId: string, filter?: string): Promise<string[]> {
		const before = memorySnapshot();

		this.logger.debug('[VectorStore] listStores start', {
			workflowId,
			filter,
			memory: before,
		});

		const startMs = Date.now();
		const projectId = await this.resolveProjectId(workflowId);
		const stores = await this.repository.listStores(projectId, filter);

		const after = memorySnapshot();
		this.logger.debug('[VectorStore] listStores complete', {
			projectId,
			storeCount: stores.length,
			durationMs: Date.now() - startMs,
			memoryBefore: before,
			memoryAfter: after,
			memoryDelta: memoryDelta(before, after),
		});

		return stores;
	}
}
