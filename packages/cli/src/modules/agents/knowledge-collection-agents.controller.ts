import type { KnowledgeCollectionAgentDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { KnowledgeCollectionService } from '@/modules/knowledge/collections/knowledge-collection.service';

import { AgentRepository } from './repositories/agent.repository';

/**
 * The agents of a knowledge collection. The route is in this module because
 * the knowledge module does not read agents.
 */
@RestController('/projects/:projectId/knowledge/collections')
export class KnowledgeCollectionAgentsController {
	constructor(
		private readonly collectionService: KnowledgeCollectionService,
		private readonly agentRepository: AgentRepository,
	) {}

	@Get('/:collectionId/agents')
	@ProjectScope('agent:read')
	async listAgents(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('collectionId') collectionId: string,
	): Promise<KnowledgeCollectionAgentDto[]> {
		const agentIds = await this.collectionService.listAgentIds({ projectId, collectionId });
		const agents = await this.agentRepository.findSummariesByIds(agentIds);

		return agents
			.map(({ id, name, projectId }) => ({ id, name, projectId }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}
}
