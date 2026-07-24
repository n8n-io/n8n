import { ListAgentsQueryDto, UpdateAgentsMcpAvailabilityDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Patch, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AgentMcpAccessService } from './agent-mcp-access.service';

/**
 * Per-agent MCP availability endpoints, mirroring the per-workflow ones on
 * `McpSettingsController` (`/mcp/workflows`). They live in the agents module
 * so they only exist when the module is active.
 *
 * No `@ProjectScope` decorators: these routes carry no project in their URL,
 * so `AgentMcpAccessService` enforces the `agent:update` scope per project
 * instead — same reasoning as the workflow toggle endpoint.
 */
@RestController('/mcp/agents')
export class AgentMcpAccessController {
	constructor(private readonly agentMcpAccessService: AgentMcpAccessService) {}

	@Get('/')
	async getMcpEligibleAgents(
		req: AuthenticatedRequest,
		res: Response,
		@Query query: ListAgentsQueryDto,
	) {
		res.json(await this.agentMcpAccessService.getEligibleAgents(req.user, query));
	}

	@Patch('/toggle-access')
	async toggleAgentsMCPAccess(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateAgentsMcpAvailabilityDto,
	) {
		return await this.agentMcpAccessService.bulkSetAvailableInMCP(req.user, dto);
	}
}
