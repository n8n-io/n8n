import { DismissAgentAttentionFlagsDto, ListAgentAttentionFlagsQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, ProjectScope, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AgentAttentionFlagsService } from './agent-attention-flags.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentAttentionFlagsController {
	constructor(private readonly attentionFlags: AgentAttentionFlagsService) {}

	@Get('/:agentId/attention-flags')
	@ProjectScope('agent:update')
	async list(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		_res: Response,
		@Query query: ListAgentAttentionFlagsQueryDto,
	) {
		return await this.attentionFlags.list({ ...req.params, userId: req.user.id }, query.type);
	}

	@Post('/:agentId/attention-flags/dismiss')
	@ProjectScope('agent:update')
	async dismiss(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		_res: Response,
		@Body payload: DismissAgentAttentionFlagsDto,
	) {
		return await this.attentionFlags.dismiss({ ...req.params, userId: req.user.id }, payload);
	}
}
