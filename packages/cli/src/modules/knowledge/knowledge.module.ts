import type { EntityClass, ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * Shared knowledge retrieval layer: uploaded files and their retrieval, and external
 * vector-store connections. See AGENTS.md for the module boundary.
 */
@BackendModule({ name: 'knowledge' })
export class KnowledgeModule implements ModuleInterface {
	async init() {
		// Nothing to initialize yet.
	}

	async entities(): Promise<EntityClass[]> {
		// No entities yet.
		return [];
	}
}
