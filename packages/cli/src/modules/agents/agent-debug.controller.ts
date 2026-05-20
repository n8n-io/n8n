import { UpsertAgentReviewCaseDto } from '@n8n/api-types';
import { Body, Delete, Get, ProjectScope, Put, RestController } from '@n8n/decorators';
import type { AuthenticatedRequest } from '@n8n/db';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentDebugService } from './agent-debug.service';

@RestController('/projects/:projectId/agents/v2/:agentId/debug')
export class AgentDebugController {
	constructor(private readonly agentDebugService: AgentDebugService) {}

	@Get('/runs')
	@ProjectScope('agent:read')
	async listRuns(
		req: AuthenticatedRequest<
			{ projectId: string; agentId: string },
			{},
			{},
			{ cursor?: string; limit?: string; agentVersionId?: string }
		>,
	) {
		const limit = Number(req.query.limit) || undefined;
		return await this.agentDebugService.listRuns(
			req.params.projectId,
			req.params.agentId,
			limit,
			req.query.cursor,
			req.query.agentVersionId,
		);
	}

	@Get('/runs/:executionId')
	@ProjectScope('agent:read')
	async getRun(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; executionId: string }>,
	) {
		const run = await this.agentDebugService.getRunDetail(
			req.params.projectId,
			req.params.agentId,
			req.params.executionId,
		);
		if (!run) {
			throw new NotFoundError(`Agent execution "${req.params.executionId}" not found`);
		}
		return run;
	}

	@Get('/insights')
	@ProjectScope('agent:read')
	async getInsights(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		return await this.agentDebugService.getInsights(req.params.projectId, req.params.agentId);
	}

	@Get('/reviews')
	@ProjectScope('agent:read')
	async listReviewCases(
		req: AuthenticatedRequest<
			{ projectId: string; agentId: string },
			{},
			{},
			{ cursor?: string; limit?: string }
		>,
	) {
		const limit = Number(req.query.limit) || undefined;
		return await this.agentDebugService.listReviewCases(
			req.params.projectId,
			req.params.agentId,
			limit,
			req.query.cursor,
		);
	}

	@Put('/runs/:executionId/review')
	@ProjectScope('agent:update')
	async upsertRunReview(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; executionId: string }>,
		_res: unknown,
		@Body payload: UpsertAgentReviewCaseDto,
	) {
		const review = await this.agentDebugService.upsertRunReview(
			req.params.projectId,
			req.params.agentId,
			req.params.executionId,
			payload,
			req.user.id,
		);
		if (!review) {
			throw new NotFoundError(`Agent execution "${req.params.executionId}" not found`);
		}
		return review;
	}

	@Delete('/runs/:executionId/review')
	@ProjectScope('agent:update')
	async deleteRunReview(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; executionId: string }>,
	) {
		const deleted = await this.agentDebugService.deleteRunReview(
			req.params.projectId,
			req.params.agentId,
			req.params.executionId,
		);
		if (!deleted) {
			throw new NotFoundError(`Agent execution "${req.params.executionId}" not found`);
		}
		return { ok: true };
	}
}
