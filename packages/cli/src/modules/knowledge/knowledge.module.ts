import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';

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
		// Controllers, the indexing/sync services and the MCP tool are registered
		// here in a later wave; this wave ships the DB layer and connector contract only.
	}

	@OnShutdown()
	async shutdown() {}

	async entities() {
		const { KnowledgeSource } = await import('./database/entities/knowledge-source.entity.js');
		const { KnowledgeDocument } = await import('./database/entities/knowledge-document.entity.js');
		const { KnowledgeSyncRun } = await import('./database/entities/knowledge-sync-run.entity.js');

		return [KnowledgeSource, KnowledgeDocument, KnowledgeSyncRun];
	}

	async settings() {
		return { enabled: true };
	}
}
