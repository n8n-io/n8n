import { ExecutionDataJsonStore } from '@n8n/backend-services';
import { Service } from '@n8n/di';

import type { KnowledgeConsumerScope } from '../knowledge-consumer-scope';
import { KnowledgeFileCleanupRepository } from '../repositories/knowledge-file-cleanup.repository';
import { KnowledgeFileStore } from './knowledge-file-store';
import { registerKnowledgeByteStores } from './register-knowledge-byte-stores';

/** Deletes stored knowledge bytes without requiring AgentFile entity metadata. */
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
