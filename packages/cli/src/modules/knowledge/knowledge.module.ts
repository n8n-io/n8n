import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Knowledge connectors: index external and internal data sources into a vector
 * store and query them over REST and MCP.
 *
 * Opt-in via `N8N_ENABLED_MODULES=knowledge` — the module is experimental and
 * deliberately not in the default set.
 */
@BackendModule({ name: 'knowledge', instanceTypes: ['main'] })
export class KnowledgeModule implements ModuleInterface {
	async init() {
		await import('./knowledge.controller.js');

		const { KnowledgeSyncService } = await import('./knowledge-sync.service.js');
		Container.get(KnowledgeSyncService).start();
	}

	@OnShutdown()
	async shutdown() {
		// The sync service registers its own shutdown hook, which stops the timer
		// and aborts in-flight runs.
	}

	async entities() {
		const { KnowledgeSource } = await import('./database/entities/knowledge-source.entity.js');
		const { KnowledgeDocument } = await import('./database/entities/knowledge-document.entity.js');
		const { KnowledgeSyncRun } = await import('./database/entities/knowledge-sync-run.entity.js');

		return [KnowledgeSource, KnowledgeDocument, KnowledgeSyncRun];
	}

	async settings() {
		const { KnowledgeSettingsService } = await import('./knowledge-settings.service.js');

		return {
			enabled: true,
			configured: await Container.get(KnowledgeSettingsService).isConfigured(),
		};
	}
}
