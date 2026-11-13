import type { FrontendModuleSettings } from '@n8n/api-types';
import type { EntityClass, ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Shared knowledge retrieval layer: uploaded files and their retrieval, and external
 * vector-store connections. See AGENTS.md for the module boundary.
 */
@BackendModule({ name: 'knowledge' })
export class KnowledgeModule implements ModuleInterface {
	/**
	 * Settings exposed to the frontend under `/rest/module-settings`. The editor
	 * rejects an upload with these limits before the request, so a configured
	 * limit shows up as the friendly client message and not as a server error.
	 */
	async settings() {
		const { KnowledgeConfig } = await import('./knowledge.config.js');
		const config = Container.get(KnowledgeConfig);

		return {
			limits: {
				maxFileSizeBytes: config.maxFileSizeBytes,
				maxFilesPerUpload: config.maxFilesPerUpload,
				maxTotalSizeBytes: config.maxTotalSizeBytes,
			},
		} satisfies FrontendModuleSettings['knowledge'];
	}

	async init() {
		// Register blob backends for knowledge files. The fs backend is always
		// available; s3/az reuse the clients base-command already initialized
		// (initBinaryDataService runs before module init in all commands), which
		// exits the process when the configured execution data backend cannot be
		// reached — so a live process in s3/az mode always has that location
		// registered here.
		const { KnowledgeFileStore } = await import('./files/knowledge-file-store.js');
		const { ExecutionDataJsonStore } = await import(
			'@/executions/execution-data/execution-data-json-store.js'
		);
		const { registerKnowledgeByteStores } = await import(
			'./files/register-knowledge-byte-stores.js'
		);
		await registerKnowledgeByteStores({
			executionDataJsonStore: Container.get(ExecutionDataJsonStore),
			knowledgeFileStore: Container.get(KnowledgeFileStore),
		});
	}

	async entities(): Promise<EntityClass[]> {
		const { KnowledgeFile } = await import('./entities/knowledge-file.entity.js');

		return [KnowledgeFile];
	}
}
