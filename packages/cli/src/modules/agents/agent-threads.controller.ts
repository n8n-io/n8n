import type { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, ProjectScope, RestController } from '@n8n/decorators';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentExecutionService } from './agent-execution.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentThreadsController {
	constructor(private readonly agentExecutionService: AgentExecutionService) {}

	@Get('/:agentId/threads')
	@ProjectScope('agent:read')
	async listThreads(
		req: AuthenticatedRequest<
			{ projectId: string; agentId: string },
			{},
			{},
			{ cursor?: string; limit?: string }
		>,
	) {
		const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
		return await this.agentExecutionService.getThreads(
			req.params.projectId,
			req.params.agentId,
			limit,
			req.query.cursor,
		);
	}

	@Get('/:agentId/threads/:threadId')
	@ProjectScope('agent:read')
	async getThread(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	) {
		const result = await this.agentExecutionService.getThreadDetail(
			req.params.threadId,
			req.params.projectId,
			req.params.agentId,
		);
		if (!result) {
			throw new NotFoundError(`Thread "${req.params.threadId}" not found`);
		}
		return result;
	}

	@Delete('/:agentId/threads/:threadId')
	@ProjectScope('agent:update')
	async deleteThread(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	) {
		const { projectId, agentId, threadId } = req.params;
		const deleted = await this.agentExecutionService.deleteThread(projectId, agentId, threadId);
		if (!deleted) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		return { success: true };
	}
}
