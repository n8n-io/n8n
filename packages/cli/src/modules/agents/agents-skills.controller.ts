import { CreateAgentSkillDto, UpdateAgentSkillDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	ProjectScope,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { AgentSkillsService } from './agent-skills.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentsSkillsController {
	constructor(private readonly agentSkillsService: AgentSkillsService) {}

	@Get('/:agentId/skills')
	@ProjectScope('agent:read')
	async listSkills(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		return await this.agentSkillsService.listSkills(agentId, projectId);
	}

	@Get('/:agentId/skills/:skillId')
	@ProjectScope('agent:read')
	async getSkill(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; skillId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('skillId') skillId: string,
	) {
		const { projectId } = req.params;
		return await this.agentSkillsService.getSkill(agentId, projectId, skillId);
	}

	@Post('/:agentId/skills')
	@ProjectScope('agent:update')
	async createSkill(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: CreateAgentSkillDto,
	) {
		const { projectId } = req.params;
		return await this.agentSkillsService.createAndAttachSkill(agentId, projectId, payload);
	}

	@Patch('/:agentId/skills/:skillId')
	@ProjectScope('agent:update')
	async updateSkill(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; skillId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('skillId') skillId: string,
		@Body payload: UpdateAgentSkillDto,
	) {
		const { projectId } = req.params;
		return await this.agentSkillsService.updateSkill(agentId, projectId, skillId, payload);
	}

	@Delete('/:agentId/skills/:skillId')
	@ProjectScope('agent:update')
	async deleteSkill(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; skillId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('skillId') skillId: string,
	) {
		const { projectId } = req.params;
		await this.agentSkillsService.deleteSkill(agentId, projectId, skillId);
		return { ok: true };
	}
}
