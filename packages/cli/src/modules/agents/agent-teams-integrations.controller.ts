import type { TeamsAgentSetupState, TeamsDiscoveryState } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { TeamsDiscoveryService } from './integrations/platforms/teams/teams-discovery.service';
import { TeamsSetupService } from './integrations/platforms/teams/teams-setup.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentTeamsIntegrationsController {
	constructor(
		private readonly setupService: TeamsSetupService,
		private readonly discoveryService: TeamsDiscoveryService,
	) {}

	@Get('/:agentId/integrations/teams/setup')
	@ProjectScope('agent:read')
	async getSetupState(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<TeamsAgentSetupState> {
		return await this.setupService.getSetupState({ projectId: req.params.projectId, agentId });
	}

	/**
	 * Starts listening for the first activity from the user's bot. Opening the
	 * window is what makes the unauthenticated webhook route willing to record
	 * one, so it stays behind the agent's own permissions.
	 */
	@Post('/:agentId/integrations/teams/discovery')
	@ProjectScope('agent:update')
	async startDiscovery(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<TeamsDiscoveryState> {
		await this.discoveryService.open({ projectId: req.params.projectId, agentId });
		return { status: 'waiting' };
	}

	@Get('/:agentId/integrations/teams/discovery')
	@ProjectScope('agent:read')
	async getDiscovery(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<TeamsDiscoveryState> {
		return await this.discoveryService.getState({ projectId: req.params.projectId, agentId });
	}

	@Delete('/:agentId/integrations/teams/discovery')
	@ProjectScope('agent:update')
	async stopDiscovery(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<TeamsDiscoveryState> {
		await this.discoveryService.close({ projectId: req.params.projectId, agentId });
		return { status: 'idle' };
	}

	@Get('/:agentId/integrations/teams/package')
	@ProjectScope('agent:read')
	async downloadPackage(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		@Param('agentId') agentId: string,
	): Promise<void> {
		const archive = await this.setupService.buildPackage({
			projectId: req.params.projectId,
			agentId,
		});

		res.setHeader('Content-Type', 'application/zip');
		res.setHeader('Content-Disposition', 'attachment; filename="n8n-agent-teams-app.zip"');
		res.send(archive);
	}

	/**
	 * Fetched by the Azure portal on the user's behalf, so it carries no n8n
	 * session and authorises on the signed token in the query string instead.
	 */
	@Get('/:agentId/integrations/teams/arm-template', { skipAuth: true })
	async getArmTemplate(
		req: Request<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<Record<string, unknown>> {
		const token = req.query.token;
		return await this.setupService.buildArmTemplate({
			projectId: req.params.projectId,
			agentId,
			token: typeof token === 'string' ? token : '',
		});
	}
}
