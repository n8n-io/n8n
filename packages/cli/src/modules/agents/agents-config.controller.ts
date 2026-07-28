import { type AgentConfigValidationResponse, UpdateAgentConfigDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, ProjectScope, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { AgentConfigService } from './agent-config.service';
import { AgentCustomToolsService } from './agent-custom-tools.service';
import { AgentValidationService } from './agent-validation.service';
import { AgentRepository } from './repositories/agent.repository';
import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

@RestController('/projects/:projectId/agents/v2')
export class AgentsConfigController {
	constructor(
		private readonly agentConfigService: AgentConfigService,
		private readonly agentCustomToolsService: AgentCustomToolsService,
		private readonly agentValidationService: AgentValidationService,
		private readonly credentialsService: CredentialsService,
		private readonly agentRepository: AgentRepository,
	) {}

	@Get('/:agentId/config')
	@ProjectScope('agent:read')
	async getConfig(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		return await this.agentConfigService.getConfig(agentId, projectId);
	}

	/**
	 * Static, authoritative readiness check for the current draft — powers the
	 * capability chip error states and the disabled Publish tooltip. Never
	 * performs live/network validation; the publish endpoint re-checks this
	 * independently so a stale or bypassed frontend can't publish an invalid
	 * agent.
	 */
	@Get('/:agentId/validation')
	@ProjectScope('agent:read')
	async getValidation(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
	): Promise<AgentConfigValidationResponse> {
		const { projectId, agentId } = req.params;
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError('Agent not found');
		}
		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			req.user,
		);
		return await this.agentValidationService.validateLoadedAgentConfiguration(
			agent,
			projectId,
			credentialProvider,
		);
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
