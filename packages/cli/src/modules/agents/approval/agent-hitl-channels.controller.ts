import { AgentHitlOptionsQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, ProjectScope, Query, RestController } from '@n8n/decorators';
import { AgentChannelHitlService } from './agent-channel-hitl.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentHitlChannelsController {
	constructor(private readonly channels: AgentChannelHitlService) {}
	@Get('/:agentId/hitl/channels')
	@ProjectScope('agent:read')
	async list(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: unknown,
		@Param('agentId') agentId: string,
	) {
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
		return await this.channels.listOptions(req.user, req.params.projectId, agentId, query);
	}
}
