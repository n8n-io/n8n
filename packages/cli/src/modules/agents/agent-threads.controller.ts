import { ListAgentSessionsQueryDto, type AgentSessionPreviewAccess } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, Post, ProjectScope, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@n8n/errors';

import { AgentExecutionService } from './agent-execution.service';
import { AgentSessionLangSmithExportService } from './agent-session-langsmith-export.service';
import { AgentSessionStopService } from './agent-session-stop.service';
import { SystemAgentRegistry } from './system-agents/system-agent-registry';
import { canContinueThreadInPreview } from './utils/agent-thread-access';
import { parseThreadListLimit } from './utils/parse-thread-list-limit';

@RestController('/projects/:projectId/agents/v2')
export class AgentThreadsController {
	constructor(
		private readonly agentExecutionService: AgentExecutionService,
		private readonly langsmithExportService: AgentSessionLangSmithExportService,
		private readonly systemAgents: SystemAgentRegistry,
		private readonly sessionStopService: AgentSessionStopService,
	) {}

	@Get('/:agentId/threads')
	@ProjectScope('agent:read')
	async listThreads(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		_res: Response,
		@Query query: ListAgentSessionsQueryDto,
	) {
		const { cursor, limit: requestedLimit, ...filters } = query;
		const limit = parseThreadListLimit(requestedLimit);

		return await this.agentExecutionService.getThreads(
			req.params.projectId,
			req.params.agentId,
			req.user.id,
			limit,
			cursor,
			filters,
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
			req.user.id,
		);
		if (!result) {
			throw new NotFoundError(`Thread "${req.params.threadId}" not found`);
		}
		const {
			ownerId: _ownerId,
			accessScope: _accessScope,
			owner: _owner,
			...thread
		} = result.thread;
		const source = result.executions.find((execution) => execution.source !== null)?.source;
		const access: AgentSessionPreviewAccess = {
			canContinueInPreview: canContinueThreadInPreview(
				result.thread,
				req.user.id,
				source,
				this.systemAgents.has(result.thread.agentId),
			),
		};
		return { ...result, thread: { ...thread, ...access, source: source ?? null } };
	}

	@Post('/:agentId/threads/:threadId/langsmith-export')
	@ProjectScope('agent:read')
	async exportThreadToLangSmith(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	) {
		const { projectId, agentId, threadId } = req.params;
		return await this.langsmithExportService.exportSession({
			projectId,
			agentId,
			threadId,
			user: req.user,
		});
	}

	@Post('/:agentId/threads/:threadId/stop')
	@ProjectScope('agent:execute')
	async stopSession(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	) {
		const { projectId, agentId, threadId } = req.params;
		return await this.sessionStopService.stopSession(projectId, agentId, threadId, req.user.id);
	}

	@Delete('/:agentId/threads/:threadId')
	@ProjectScope('agent:update')
	async deleteThread(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	) {
		const { projectId, agentId, threadId } = req.params;
		// A system-agent thread is deleted through its own route, which also deletes its workspace.
		if (this.systemAgents.has(agentId)) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		const deleted = await this.agentExecutionService.deleteThread(
			projectId,
			agentId,
			threadId,
			req.user.id,
		);
		if (!deleted) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		return { success: true };
	}
}
