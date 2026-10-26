import type { AgentPendingApproval } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, Param, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AgentRepository } from '../repositories/agent.repository';
import { getAgentOrThrow } from '../utils/get-agent-or-throw';
import { AgentHitlRequestsService } from './agent-hitl-requests.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentHitlController {
	constructor(
		private readonly agents: AgentRepository,
		private readonly requests: AgentHitlRequestsService,
	) {}

	@Get('/:agentId/hitl/requests')
	@ProjectScope('agent:read')
	async list(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<AgentPendingApproval[]> {
		await getAgentOrThrow(this.agents, agentId, req.params.projectId);
		return await this.requests.list(agentId);
	}

	@Post('/:agentId/hitl/requests/:requestId/cancel')
	@ProjectScope('agent:execute')
	async cancel(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('requestId') requestId: string,
	) {
		await getAgentOrThrow(this.agents, agentId, req.params.projectId);
		await this.requests.cancel(agentId, requestId);
		return { success: true };
	}
}
