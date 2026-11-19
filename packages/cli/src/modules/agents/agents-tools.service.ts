import type { CodeBuilderSearchResult } from '@n8n/ai-utilities/node-catalog';
import { isAgentToolNodeType } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { isTriggerNodeType } from 'n8n-workflow';

import { NodeCatalogService } from '@/node-catalog';

/**
 * Nodes the agent runtime can execute directly. Triggers are workflow entry
 * points, so they are never valid as standalone agent tools.
 */
export const isExecutableNodeType = (nodeId: string): boolean => !isTriggerNodeType(nodeId);

export { isAgentToolNodeType };

@Service()
export class AgentsToolsService {
	constructor(private readonly nodeCatalogService: NodeCatalogService) {}

	async searchAgentToolNodes(queries: string[]): Promise<CodeBuilderSearchResult> {
		await this.nodeCatalogService.initialize();
		return await this.nodeCatalogService.searchNodes(queries, {
			nodeFilter: isAgentToolNodeType,
		});
	}
}
