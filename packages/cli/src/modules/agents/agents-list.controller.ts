import { ListAgentsQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AgentsService } from './agents.service';

/**
 * Global (cross-project) agents list endpoint.
 *
 * It serves two audiences, and `availableInChat` picks between them:
 * - the overview page, which wants every agent in the user's projects and the
 *   full entity to render its cards;
 * - the n8n chat page, which wants the agents whose published config carries
 *   the n8n Chat channel, scoped to `agent:execute` and answered with the
 *   narrow `AgentChatListItem` so a chat-only member gets no config.
 *
 * They differ in scope and in response shape, so each has its own service
 * method and this route only dispatches. The route carries no project in its
 * URL, so it takes no `@ProjectScope` decorator; `AgentsService` enforces the
 * per-project scope instead, the same reasoning as `AgentMcpAccessController`.
 */
@RestController('/agents/v2')
export class AgentsListController {
	constructor(private readonly agentsService: AgentsService) {}

	@Get('/')
	async list(req: AuthenticatedRequest, res: Response, @Query query: ListAgentsQueryDto) {
		res.json(
			query.filter?.availableInChat === undefined
				? await this.agentsService.findByUserMembershipPaginated(req.user, query)
				: await this.agentsService.findChatReachableByUserPaginated(req.user, query),
		);
	}
}
