import type { TeamsAgentSetupState } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, ProjectScope, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { TeamsSetupService } from './integrations/platforms/teams/teams-setup.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentTeamsIntegrationsController {
	constructor(private readonly setupService: TeamsSetupService) {}

	@Get('/:agentId/integrations/teams/setup')
	@ProjectScope('agent:read')
	async getSetupState(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<TeamsAgentSetupState> {
		return await this.setupService.getSetupState({ projectId: req.params.projectId, agentId });
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
