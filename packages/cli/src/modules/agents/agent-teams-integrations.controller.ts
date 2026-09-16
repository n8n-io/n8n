import type { TeamsAgentSetupState, TeamsCredentialCheck } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Options, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { TeamsCredentialCheckService } from './integrations/platforms/teams/teams-credential-check.service';
import { TeamsSetupService } from './integrations/platforms/teams/teams-setup.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentTeamsIntegrationsController {
	constructor(
		private readonly setupService: TeamsSetupService,
		private readonly credentialCheckService: TeamsCredentialCheckService,
	) {}

	/**
	 * Proves the credential can reach Microsoft before the channel is connected.
	 * Connecting a credential that cannot mint a token leaves a channel that
	 * looks connected and fails on the first message.
	 */
	@Post('/:agentId/integrations/teams/check/:credentialId')
	@ProjectScope('agent:update')
	async checkCredential(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('credentialId') credentialId: string,
	): Promise<TeamsCredentialCheck> {
		return await this.credentialCheckService.check(req.params.projectId, credentialId);
	}

	@Get('/:agentId/integrations/teams/setup')
	@ProjectScope('agent:read')
	async getSetupState(
		req: AuthenticatedRequest<{ projectId: string }, {}, {}, { credentialId?: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<TeamsAgentSetupState> {
		const credentialId = req.query.credentialId;
		return await this.setupService.getSetupState(
			{ projectId: req.params.projectId, agentId },
			typeof credentialId === 'string' ? credentialId : undefined,
		);
	}

	@Get('/:agentId/integrations/teams/package')
	@ProjectScope('agent:read')
	async downloadPackage(
		req: AuthenticatedRequest<{ projectId: string }, {}, {}, { credentialId?: string }>,
		res: Response,
		@Param('agentId') agentId: string,
	): Promise<void> {
		const credentialId = req.query.credentialId;
		const archive = await this.setupService.buildPackage(
			{ projectId: req.params.projectId, agentId },
			typeof credentialId === 'string' ? credentialId : undefined,
		);

		res.setHeader('Content-Type', 'application/zip');
		res.setHeader('Content-Disposition', 'attachment; filename="n8n-agent-teams-app.zip"');
		res.send(archive);
	}

	/**
	 * The Azure portal fetches this from the user's browser, not from its own
	 * servers, so the route needs CORS headers as well as being reachable. Azure
	 * reports both failures with the same message, which names CORS second.
	 */
	private setCorsHeaders(res: Response) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type');
	}

	@Options('/:agentId/integrations/teams/arm-template', { skipAuth: true })
	armTemplatePreflight(_req: Request, res: Response): void {
		this.setCorsHeaders(res);
		res.status(204).send();
	}

	/**
	 * Carries no n8n session, so it authorises on the signed token in the query
	 * string instead.
	 *
	 * Written straight to the response rather than returned: the REST layer wraps
	 * a returned value in `{ data: ... }`, and the portal rejects that with
	 * "this is not a valid template" because the ARM schema has to be at the root.
	 */
	@Get('/:agentId/integrations/teams/arm-template', { skipAuth: true })
	async getArmTemplate(
		req: Request<{ projectId: string }>,
		res: Response,
		@Param('agentId') agentId: string,
	): Promise<void> {
		const { token, credentialId } = req.query;
		const template = await this.setupService.buildArmTemplate({
			projectId: req.params.projectId,
			agentId,
			token: typeof token === 'string' ? token : '',
			credentialId: typeof credentialId === 'string' ? credentialId : '',
		});

		this.setCorsHeaders(res);
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(template));
	}
}
