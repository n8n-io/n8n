import type { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, Post, ProjectScope, RestController } from '@n8n/decorators';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentExecutionService } from './agent-execution.service';
import {
	type AgentSessionFilters,
	type AgentSessionOrigin,
	type AgentSessionStatus,
} from './agent-session.types';
import { AgentSessionLangSmithExportService } from './agent-session-langsmith-export.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentThreadsController {
	constructor(
		private readonly agentExecutionService: AgentExecutionService,
		private readonly langsmithExportService: AgentSessionLangSmithExportService,
	) {}

	@Get('/:agentId/threads')
	@ProjectScope('agent:read')
	async listThreads(
		req: AuthenticatedRequest<
			{ projectId: string; agentId: string },
			{},
			{},
			{
				cursor?: string;
				limit?: string;
				status?: string;
				origin?: string;
				updatedAfter?: string;
				updatedBefore?: string;
			}
		>,
	) {
		const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
		const filters: AgentSessionFilters = {};
		const status = parseStatus(req.query.status);
		const origin = parseOrigin(req.query.origin);
		const updatedAfter = parseDate(req.query.updatedAfter, 'updatedAfter');
		const updatedBefore = parseDate(req.query.updatedBefore, 'updatedBefore');
		if (status) filters.status = status;
		if (origin) filters.origin = origin;
		if (updatedAfter) filters.updatedAfter = updatedAfter;
		if (updatedBefore) filters.updatedBefore = updatedBefore;

		return await this.agentExecutionService.getThreads(
			req.params.projectId,
			req.params.agentId,
			limit,
			req.query.cursor,
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
		);
		if (!result) {
			throw new NotFoundError(`Thread "${req.params.threadId}" not found`);
		}
		return result;
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
		const deleted = await this.agentExecutionService.deleteThread(projectId, agentId, threadId);
		if (!deleted) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		return { success: true };
	}
}

function parseStatus(value?: string): AgentSessionStatus | undefined {
	if (!value) return;
	switch (value) {
		case 'running':
		case 'succeeded':
		case 'error':
		case 'cancelled':
		case 'interrupted':
			return value;
		default:
			throw new BadRequestError(`Invalid agent session status "${value}"`);
	}
}

function parseOrigin(value?: string): AgentSessionOrigin | undefined {
	if (!value) return;
	switch (value) {
		case 'preview':
		case 'instance-ai':
		case 'mcp':
		case 'sub-agent':
		case 'schedule':
		case 'workflow':
		case 'slack':
		case 'telegram':
		case 'linear':
		case 'discord':
			return value;
		default:
			throw new BadRequestError(`Invalid agent session origin "${value}"`);
	}
}

function parseDate(value: string | undefined, name: string): Date | undefined {
	if (!value) return;
	const date = new Date(value);
	if (!Number.isNaN(date.getTime())) return date;
	throw new BadRequestError(`Invalid ${name} date`);
}
