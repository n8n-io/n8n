import { Service } from '@n8n/di';

import type { KnowledgeConsumerScope } from '../knowledge-consumer-scope';
import type { KnowledgeRetriever } from '../knowledge-retriever';
import { KnowledgeSandboxProviderRegistry } from '../knowledge-sandbox-provider-registry';
import { KnowledgeFileRepository } from '../repositories/knowledge-file.repository';
import { KnowledgeMirrorService } from './mirror.service';
import type {
	GlobKnowledgeFilesRequest,
	GlobKnowledgeFilesResult,
	ReadKnowledgeRequest,
	ReadKnowledgeResult,
	SearchKnowledgeRequest,
	SearchKnowledgeResult,
} from './retrieval-schemas';

/**
 * The retrieval entry point of the module. Consumers inject this class and
 * call it with their scope. It also owns the explicit warm-up and teardown of
 * the sandbox that retrieval runs in. The caller owns the availability and
 * ownership checks.
 */
@Service()
export class KnowledgeRetrievalService implements KnowledgeRetriever {
	constructor(
		private readonly fileRepository: KnowledgeFileRepository,
		private readonly mirrorService: KnowledgeMirrorService,
		private readonly sandboxProvider: KnowledgeSandboxProviderRegistry,
	) {}

	async hasFiles(scope: KnowledgeConsumerScope): Promise<boolean> {
		return await this.fileRepository.hasFilesForAgent(scope.agentId, {});
	}

	/** Boots the sandbox of the scope ahead of use. A scope without files needs no sandbox. */
	async warmSandbox(scope: KnowledgeConsumerScope): Promise<void> {
		if (!(await this.hasFiles(scope))) {
			return;
		}

		await this.sandboxProvider.warm(scope);
	}

	/** Deletes the sandbox of the scope. Reads no file row, so it also runs while the module is off. Never throws. */
	async destroySandbox(scope: KnowledgeConsumerScope): Promise<void> {
		await this.sandboxProvider.destroy(scope);
	}

	async findFiles(
		scope: KnowledgeConsumerScope,
		request: GlobKnowledgeFilesRequest,
	): Promise<GlobKnowledgeFilesResult> {
		return await this.mirrorService.globKnowledgeFiles(scope, request);
	}

	async searchText(
		scope: KnowledgeConsumerScope,
		request: SearchKnowledgeRequest,
	): Promise<SearchKnowledgeResult> {
		return await this.mirrorService.searchKnowledge(scope, request);
	}

	async readFile(
		scope: KnowledgeConsumerScope,
		request: ReadKnowledgeRequest,
	): Promise<ReadKnowledgeResult> {
		return await this.mirrorService.readKnowledge(scope, request);
	}
}
