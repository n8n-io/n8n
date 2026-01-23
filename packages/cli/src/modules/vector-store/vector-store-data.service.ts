import { Service } from '@n8n/di';
import { VectorStoreDataRepository, SharedWorkflowRepository } from '@n8n/db';
import { VectorStoreConfig } from '@n8n/config';
import type { IVectorStoreDataService, VectorDocument, VectorSearchResult } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';

@Service()
export class VectorStoreDataService implements IVectorStoreDataService {
	constructor(
		private readonly repository: VectorStoreDataRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly config: VectorStoreConfig,
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
	 * Calculate the size in bytes of vectors and documents to be added
	 */
	private calculateVectorSize(documents: VectorDocument[], embeddings: number[][]): number {
		let totalSize = 0;

		for (let i = 0; i < documents.length; i++) {
			// Content size (UTF-8 string)
			totalSize += Buffer.byteLength(documents[i].content, 'utf8');

			// Metadata size (JSON stringified)
			totalSize += Buffer.byteLength(JSON.stringify(documents[i].metadata), 'utf8');

			// Vector size (Float32Array: 4 bytes per number)
			totalSize += embeddings[i].length * 4;
		}

		return totalSize;
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
		const projectId = await this.resolveProjectId(workflowId);

		// Calculate size of new vectors
		const newVectorSize = this.calculateVectorSize(documents, embeddings);

		// Get current total size (unless we're clearing the store)
		const currentSize = clearStore ? 0 : await this.repository.getTotalSize();

		// Check if adding new vectors would exceed the limit
		const totalSizeAfterAdd = currentSize + newVectorSize;
		if (totalSizeAfterAdd > this.config.maxSize) {
			const currentSizeMB = (currentSize / 1024 / 1024).toFixed(2);
			const newSizeMB = (newVectorSize / 1024 / 1024).toFixed(2);
			const maxSizeMB = (this.config.maxSize / 1024 / 1024).toFixed(2);

			throw new OperationalError(
				`Vector store size limit exceeded. Current size: ${currentSizeMB} MiB, attempting to add: ${newSizeMB} MiB, maximum allowed: ${maxSizeMB} MiB`,
			);
		}

		await this.repository.addVectors(memoryKey, projectId, documents, embeddings, clearStore);
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
		const projectId = await this.resolveProjectId(workflowId);
		return await this.repository.similaritySearch(memoryKey, projectId, queryEmbedding, k, filter);
	}

	/**
	 * Get count of vectors for a memory key
	 */
	async getVectorCount(memoryKey: string, workflowId: string): Promise<number> {
		const projectId = await this.resolveProjectId(workflowId);
		return await this.repository.getVectorCount(memoryKey, projectId);
	}

	/**
	 * Clear all vectors for a memory key
	 */
	async clearStore(memoryKey: string, workflowId: string): Promise<void> {
		const projectId = await this.resolveProjectId(workflowId);
		await this.repository.clearStore(memoryKey, projectId);
	}

	/**
	 * Delete entire store (alias for clearStore)
	 */
	async deleteStore(memoryKey: string, workflowId: string): Promise<void> {
		const projectId = await this.resolveProjectId(workflowId);
		await this.repository.deleteStore(memoryKey, projectId);
	}

	/**
	 * List all unique memory keys for a project
	 */
	async listStores(workflowId: string, filter?: string): Promise<string[]> {
		const projectId = await this.resolveProjectId(workflowId);
		return await this.repository.listStores(projectId, filter);
	}
}
