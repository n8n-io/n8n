import { UpdateAgentConfigDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, ProjectScope, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AgentConfigService } from './agent-config.service';
import { AgentCustomToolsService } from './agent-custom-tools.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentsConfigController {
	constructor(
		private readonly agentConfigService: AgentConfigService,
		private readonly agentCustomToolsService: AgentCustomToolsService,
	) {}

	@Get('/:agentId/config')
	@ProjectScope('agent:read')
	async getConfig(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		return await this.agentConfigService.getConfig(agentId, projectId);
	}

	@Put('/:agentId/config')
	@ProjectScope('agent:update')
	async putConfig(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: UpdateAgentConfigDto,
	) {
		const { projectId } = req.params;
		const { config } = payload;
		return await this.agentConfigService.updateConfig(agentId, projectId, config);
	}

	@Delete('/:agentId/tools/:toolId')
	@ProjectScope('agent:update')
	async deleteTool(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; toolId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('toolId') toolId: string,
	) {
		const { projectId } = req.params;
		await this.agentCustomToolsService.deleteCustomTool(agentId, projectId, toolId);
		return { ok: true };
	}
}
