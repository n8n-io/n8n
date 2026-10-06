import { ListAgentsQueryDto, ListN8nChatThreadsQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, Query, RestController } from '@n8n/decorators';
import { NotFoundError } from '@n8n/errors';
import type { Response } from 'express';

import { AgentsService } from './agents.service';
import { parseThreadListLimit } from './utils/parse-thread-list-limit';

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

	/**
	 * One agent as the n8n Chat page needs it: a chat-only member holds
	 * `agent:execute` but not `agent:read`, so they cannot call the regular
	 * agent-by-id route to get its name and avatar for a direct link or a
	 * reload. 404s when the agent doesn't exist, isn't reachable by this user,
	 * or isn't published to n8n Chat — same response for all three, so the
	 * chat-only member learns nothing about agents they cannot reach.
	 */
	@Get('/n8n-chat/agents/:agentId')
	async getChatAgent(req: AuthenticatedRequest, _res: Response, @Param('agentId') agentId: string) {
		const agent = await this.agentsService.findChatReachableAgentForUser(agentId, req.user);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		return agent;
	}

	/** The user's own n8n Chat threads across every agent they can reach, for
	 *  the chat page's cross-agent "recent chats" list. */
	@Get('/n8n-chat/threads')
	async listN8nChatThreads(
		req: AuthenticatedRequest,
		res: Response,
		@Query query: ListN8nChatThreadsQueryDto,
	) {
		const limit = parseThreadListLimit(query.limit);
		res.json(
			await this.agentsService.findN8nChatThreadsForUser(req.user, {
				limit,
				cursor: query.cursor,
				agentId: query.agentId,
			}),
		);
	}

	/**
	 * One of the user's own n8n Chat threads, for the chat page to read a
	 * thread's title when it falls outside the recent-threads page (e.g. after
	 * a reload on an older thread). 404s when the thread doesn't exist, isn't
	 * owned by this user, or its agent isn't reachable over n8n Chat anymore —
	 * same response for all three, same scoping as the list route.
	 */
	@Get('/n8n-chat/threads/:threadId')
	async getN8nChatThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	) {
		const thread = await this.agentsService.findN8nChatThreadForUser(req.user, threadId);
		if (!thread) throw new NotFoundError(`Thread "${threadId}" not found`);
		return thread;
	}
}
