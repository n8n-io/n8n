import { ListAgentsQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AgentsService } from './agents.service';

/**
 * Global (cross-project) agents list endpoint.
 * Returns all agents the requesting user has access to, across all their projects.
 * Used by the overview page where there is no project context.
 */
@RestController('/agents/v2')
export class AgentsListController {
	constructor(private readonly agentsService: AgentsService) {}

	@Get('/')
	async list(req: AuthenticatedRequest, res: Response, @Query query: ListAgentsQueryDto) {
		res.json(await this.agentsService.findByUserPaginated(req.user.id, query));
	}
}
