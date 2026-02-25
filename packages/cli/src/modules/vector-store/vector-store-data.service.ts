import { Service } from '@n8n/di';
import { VectorStoreDataRepository, SharedWorkflowRepository } from '@n8n/db';
import type { IVectorStoreDataService, VectorDocument, VectorSearchResult } from 'n8n-workflow';

@Service()
export class VectorStoreDataService implements IVectorStoreDataService {
	constructor(
		private readonly repository: VectorStoreDataRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
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
		const projectId = await this.resolveProjectId(workflowId);
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
