import { Service } from '@n8n/di';

import { ExecutionDataJsonStore } from '@/executions/execution-data/execution-data-json-store';

import type { KnowledgeConsumerScope } from '../knowledge-consumer-scope';
import { KnowledgeFileCleanupRepository } from '../repositories/knowledge-file-cleanup.repository';
import { KnowledgeFileStore } from './knowledge-file-store';
import { registerKnowledgeByteStores } from './register-knowledge-byte-stores';

/** Deletes stored knowledge bytes without requiring KnowledgeFile entity metadata. */
@Service()
export class KnowledgeFileCleanupService {
	constructor(
		private readonly fileCleanupRepository: KnowledgeFileCleanupRepository,
		private readonly fileStore: KnowledgeFileStore,
		private readonly executionDataJsonStore: ExecutionDataJsonStore,
	) {}

	/** Deletes stored bytes without removing the file rows. */
	async deleteStoredBytes(scope: KnowledgeConsumerScope): Promise<void> {
		const files = await this.fileCleanupRepository.findStorageReferencesByAgentId(scope.agentId);
		if (files.length === 0) return;

		await registerKnowledgeByteStores({
			executionDataJsonStore: this.executionDataJsonStore,
			knowledgeFileStore: this.fileStore,
		});
		await this.fileStore.delete(files);
	}
}
