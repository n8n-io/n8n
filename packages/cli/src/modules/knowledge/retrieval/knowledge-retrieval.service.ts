import { Service } from '@n8n/di';

import type { KnowledgeConsumerScope } from '../knowledge-consumer-scope';
import type { KnowledgeRetrievalObserver, KnowledgeRetriever } from '../knowledge-retriever';
import { KnowledgeSandboxProviderProxy } from '../knowledge-sandbox-provider-proxy';
import { KnowledgeFileRepository } from '../repositories/knowledge-file.repository';
import { KnowledgeMirrorService } from './mirror.service';
import type {
	FindKnowledgeFilesRequest,
	FindKnowledgeFilesResult,
	ReadKnowledgeFileRequest,
	ReadKnowledgeFileResult,
	SearchKnowledgeTextRequest,
	SearchKnowledgeTextResult,
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
		private readonly sandboxProviderProxy: KnowledgeSandboxProviderProxy,
	) {}

	async hasFiles(scope: KnowledgeConsumerScope): Promise<boolean> {
		return await this.fileRepository.hasFilesForAgent(scope.agentId, {});
	}

	/** Boots the sandbox of the scope ahead of use. A scope without files needs no sandbox. */
	async warmSandbox(scope: KnowledgeConsumerScope): Promise<void> {
		if (!(await this.hasFiles(scope))) {
			return;
		}

		await this.sandboxProviderProxy.warm(scope);
	}

	/** Deletes the sandbox of the scope. Reads no file row, so it also runs while the module is off. Never throws. */
	async destroySandbox(scope: KnowledgeConsumerScope): Promise<void> {
		await this.sandboxProviderProxy.destroy(scope);
	}

	async findFiles(
		scope: KnowledgeConsumerScope,
		request: FindKnowledgeFilesRequest,
	): Promise<FindKnowledgeFilesResult> {
		return await this.mirrorService.findFiles(scope, request);
	}

	async searchText(
		scope: KnowledgeConsumerScope,
		request: SearchKnowledgeTextRequest,
		observer?: KnowledgeRetrievalObserver,
	): Promise<SearchKnowledgeTextResult> {
		return await this.mirrorService.searchText(scope, request, observer);
	}

	async readFile(
		scope: KnowledgeConsumerScope,
		request: ReadKnowledgeFileRequest,
		observer?: KnowledgeRetrievalObserver,
	): Promise<ReadKnowledgeFileResult> {
		return await this.mirrorService.readFile(scope, request, observer);
	}
}
