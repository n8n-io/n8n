import { AgentHitlOptionsQueryDto } from '@n8n/api-types';
import { AgentsConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, ProjectScope, Query, RestController } from '@n8n/decorators';
import { NotFoundError } from '@n8n/errors';
import { AgentChannelHitlService } from './agent-channel-hitl.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentHitlChannelsController {
	constructor(
		private readonly channels: AgentChannelHitlService,
		private readonly agentsConfig: AgentsConfig,
	) {}
	@Get('/:agentId/hitl/channels')
	@ProjectScope('agent:read')
	async list(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: unknown,
		@Param('agentId') agentId: string,
	) {
		this.assertEnabled();
		return await this.channels.listChannels(req.user, req.params.projectId, agentId);
	}
	@Get('/:agentId/hitl/channel-options')
	@ProjectScope('agent:read')
	async options(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: unknown,
		@Param('agentId') agentId: string,
		@Query query: AgentHitlOptionsQueryDto,
	) {
		this.assertEnabled();
		return await this.channels.listOptions(req.user, req.params.projectId, agentId, query);
	}

	/** Destination lookups use Agent credentials, so they need the human review module. */
	private assertEnabled() {
		if (!this.agentsConfig.humanReviewEnabled)
			throw new NotFoundError('Human review is not enabled');
	}
}
