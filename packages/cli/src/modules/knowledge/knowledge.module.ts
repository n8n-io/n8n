import type { EntityClass, ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * Shared knowledge retrieval layer: uploaded files and their retrieval, and external
 * vector-store connections.
 * WIP: P0 moves the implementation here from the agents
 * module, behind the boundary interfaces at this directory's root. See AGENTS.md.
 */
@BackendModule({ name: 'knowledge' })
export class KnowledgeModule implements ModuleInterface {
	async init() {
		// The P0 move PRs register the module's services, byte stores and routes here.
	}

	async entities(): Promise<EntityClass[]> {
		// PR-1 adds `KnowledgeFile`, mapped to the unchanged `agent_files` table.
		return [];
	}
}
