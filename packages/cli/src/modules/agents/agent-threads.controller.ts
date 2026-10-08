import { ListAgentSessionsQueryDto, type AgentSessionPreviewAccess } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, Post, ProjectScope, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@n8n/errors';

import { AgentExecutionService } from './agent-execution.service';
import { AgentSessionLangSmithExportService } from './agent-session-langsmith-export.service';
import { AgentsService } from './agents.service';
import { SystemAgentRegistry } from './system-agents/system-agent-registry';
import { canContinueThreadInPreview } from './utils/agent-thread-access';

@RestController('/projects/:projectId/agents/v2')
export class AgentThreadsController {
	constructor(
		private readonly agentExecutionService: AgentExecutionService,
		private readonly langsmithExportService: AgentSessionLangSmithExportService,
		private readonly systemAgents: SystemAgentRegistry,
		private readonly agentsService: AgentsService,
	) {}

	/**
	 * The agent must be a registered instance agent or an agent of the project, as on the chat
	 * routes. An instance agent whose module is off has no readable threads. The threads of an
	 * instance agent are only for users who can use it in the project.
	 */
	private async assertCanReadThreads(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
	): Promise<void> {
		const { agentId, projectId } = req.params;
		const known =
			this.systemAgents.has(agentId) ||
			(await this.agentsService.findById(agentId, projectId)) !== null;
		if (!known || !(await this.systemAgents.allows(agentId, req.user, projectId))) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}
	}

	@Get('/:agentId/threads')
	@ProjectScope('agent:read')
	async listThreads(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		_res: Response,
		@Query query: ListAgentSessionsQueryDto,
	) {
		await this.assertCanReadThreads(req);
		const { projectId, agentId } = req.params;
		const { cursor, limit: requestedLimit, ...filters } = query;
		const limit = Math.min(Math.max(Number(requestedLimit) || 20, 1), 100);
		// A user who cannot read other users' threads of the agent lists only their own.
		const readsOthers = await this.systemAgents.readsOthersThreads(agentId, req.user, projectId);

		return await this.agentExecutionService.getThreads(
			projectId,
			agentId,
			req.user.id,
			limit,
			cursor,
			readsOthers ? filters : { ...filters, scope: 'mine' },
		);
	}

	@Get('/:agentId/threads/:threadId')
	@ProjectScope('agent:read')
	async getThread(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	) {
		await this.assertCanReadThreads(req);
		const { projectId, agentId, threadId } = req.params;
		// Check the reader before the detail (inputs, timelines) is built.
		const found = await this.agentExecutionService.findThreadById(threadId);
		const readable = found !== null && (await this.systemAgents.canReadThread(req.user, found));
		const result = readable
			? await this.agentExecutionService.getThreadDetail(threadId, projectId, agentId, req.user.id)
			: null;
		if (!result) throw new NotFoundError(`Thread "${threadId}" not found`);
		const {
			ownerId: _ownerId,
			accessScope: _accessScope,
			owner: _owner,
			...thread
		} = result.thread;
		const source = result.executions.find((execution) => execution.source !== null)?.source;
		const access: AgentSessionPreviewAccess = {
			canContinueInPreview: canContinueThreadInPreview(result.thread, req.user.id, source),
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

	@Delete('/:agentId/threads/:threadId')
	@ProjectScope('agent:update')
	async deleteThread(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	) {
		const { projectId, agentId, threadId } = req.params;
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
