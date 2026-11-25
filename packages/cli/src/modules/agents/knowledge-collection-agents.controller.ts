import type { KnowledgeCollectionAgentDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { KnowledgeCollectionCatalogService } from '@/modules/knowledge/collections/knowledge-collection-catalog.service';

import { AgentRepository } from './repositories/agent.repository';

/**
 * The agents of a knowledge collection. The route is in this module because
 * the knowledge module does not read agents.
 *
 * Collections have no scopes of their own yet, so the agent scopes of the
 * project in the URL decide. To be changed when collections have their own scopes.
 */
@RestController('/projects/:projectId/knowledge/collections')
export class KnowledgeCollectionAgentsController {
	constructor(
		private readonly catalogService: KnowledgeCollectionCatalogService,
		private readonly agentRepository: AgentRepository,
	) {}

	@Get('/:collectionId/agents')
	@ProjectScope('agent:read')
	async listAgents(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('collectionId') collectionId: string,
	): Promise<KnowledgeCollectionAgentDto[]> {
		const agentIds = await this.catalogService.listAgentIds(req.user, { projectId, collectionId });
		const agents = await this.agentRepository.findSummariesByIds(agentIds);

		// Every agent of a collection is in its home project today. When collections
		// can be shared, filter out the agents of projects that the user cannot see.
		return agents
			.map(({ id, name, projectId }) => ({ id, name, projectId }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}
}
