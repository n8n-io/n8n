import {
	AgentTaskApprovalDto,
	ListAgentSessionsQueryDto,
	type AgentSessionPreviewAccess,
} from '@n8n/api-types';
import { isPerson, UserRepository, type AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Post, ProjectScope, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@n8n/errors';

import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentMemoryTraceService } from './agent-memory-trace.service';
import { AgentSessionLangSmithExportService } from './agent-session-langsmith-export.service';
import { AgentSessionStopService } from './agent-session-stop.service';
import { ChatPageInviteService } from './integrations/platforms/webhook/chat-page-invites.service';
import { SystemAgentRegistry } from './system-agents/system-agent-registry';
import { canContinueThreadInPreview } from './utils/agent-thread-access';
import { parseThreadListLimit } from './utils/parse-thread-list-limit';

@RestController('/projects/:projectId/agents/v2')
export class AgentThreadsController {
	constructor(
		private readonly agentExecutionService: AgentExecutionService,
		private readonly memoryTraceService: AgentMemoryTraceService,
		private readonly langsmithExportService: AgentSessionLangSmithExportService,
		private readonly agentExecutionOrchestratorService: AgentExecutionOrchestratorService,
		private readonly systemAgents: SystemAgentRegistry,
		private readonly sessionStopService: AgentSessionStopService,
		private readonly chatPageInvites: ChatPageInviteService,
		private readonly userRepository: UserRepository,
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

		const page = await this.agentExecutionService.getThreads(
			req.params.projectId,
			req.params.agentId,
			req.user.id,
			limit,
			cursor,
			filters,
		);
		return { ...page, threads: await this.withExternalVisitors(req.params.agentId, page.threads) };
	}

	/**
	 * SPIKE (agent-chat-embed): who an outside visitor's chat is with: the invitee's
	 * name or email, the n8n user, or "Anonymous visitor". The principal key itself
	 * is not sent to the browser.
	 */
	private async withExternalVisitors<T extends { externalPrincipal?: string | null }>(
		agentId: string,
		threads: T[],
	) {
		const keys = threads.map((thread) => thread.externalPrincipal).filter((key) => !!key);
		if (!keys.length) return threads;
		const invites = new Map(
			(await this.chatPageInvites.list(agentId, 'n8n-chat')).map((i) => [
				`invite-${i.id}`,
				i.label,
			]),
		);
		const userIds = keys.filter((key) => key!.startsWith('user-')).map((key) => key!.slice(5));
		const users = new Map(
			(userIds.length ? await this.userRepository.findManyByIds(userIds) : [])
				.filter(isPerson)
				.map((person) => [
					`user-${person.id}`,
					`${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || person.email,
				]),
		);
		return threads.map(({ externalPrincipal, ...thread }) => {
			if (!externalPrincipal) return thread;
			const externalVisitor = externalPrincipal.startsWith('anon-')
				? 'Anonymous visitor'
				: (invites.get(externalPrincipal) ?? users.get(externalPrincipal) ?? 'Removed invite');
			return { ...thread, externalVisitor };
		});
	}

	@Get('/:agentId/threads/:threadId')
	@ProjectScope('agent:read')
	async getThread(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	) {
		const { projectId, agentId, threadId } = req.params;
		const result = await this.agentExecutionService.getThreadDetail(
			threadId,
			projectId,
			agentId,
			req.user.id,
			{ includeExternal: true },
		);
		if (!result) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		const {
			ownerId: _ownerId,
			accessScope: _accessScope,
			owner: _owner,
			externalPrincipal: _externalPrincipal,
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
		const memory = await this.memoryTraceService.getThreadMemory({
			agentId,
			projectId,
			userId: req.user.id,
			threadId,
			executions: result.executions,
		});
		return { ...result, thread: { ...thread, ...access, source: source ?? null }, memory };
	}

	@Post('/:agentId/threads/:threadId/approval')
	@ProjectScope('agent:execute')
	async resumeTaskApproval(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
		// The route registry calls the handler as (req, res, body). This unused
		// response argument keeps the parsed body in the third position.
		_res: Response,
		@Body payload: AgentTaskApprovalDto,
	) {
		const { projectId, agentId, threadId } = req.params;
		await this.agentExecutionOrchestratorService.resumeTaskApproval({
			projectId,
			agentId,
			threadId,
			user: req.user,
			toolCallId: payload.toolCallId,
			resumeData: payload.resumeData,
		});
		return { success: true };
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
