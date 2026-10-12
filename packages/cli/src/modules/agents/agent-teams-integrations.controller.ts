import { AgentTeamsPackageDto } from '@n8n/api-types';
import type { TeamsAgentSetupState, TeamsCredentialCheck } from '@n8n/api-types';
import { Time } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import type { CorsOptions } from '@n8n/decorators';
import { Body, Get, Options, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { TeamsCredentialCheckService } from './integrations/platforms/teams/teams-credential-check.service';
import { TeamsSetupService } from './integrations/platforms/teams/teams-setup.service';

/**
 * The portal is reached through several hosts (national clouds, and its own
 * preview host), and an allow-list that misses one fails as "template
 * unreachable" with nothing naming the origin. The signed token is what
 * authorises this route; the origin is not relied on for it.
 */
const TEMPLATE_CORS: Partial<CorsOptions> = {
	allowedOrigins: ['*'],
	allowedMethods: ['get', 'options'],
	allowedHeaders: ['Content-Type'],
};

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
		return await this.credentialCheckService.check(req.user, req.params.projectId, credentialId);
	}

	@Get('/:agentId/integrations/teams/setup')
	@ProjectScope('agent:update')
	async getSetupState(
		req: AuthenticatedRequest<{ projectId: string }, {}, {}, { credentialId?: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<TeamsAgentSetupState> {
		const credentialId = req.query.credentialId;
		return await this.setupService.getSetupState(
			req.user,
			{ projectId: req.params.projectId, agentId },
			typeof credentialId === 'string' ? credentialId : undefined,
		);
	}

	/**
	 * A POST because the manifest is built from the settings in the open form,
	 * which are not stored until the channel is connected.
	 */
	@Post('/:agentId/integrations/teams/package')
	@ProjectScope('agent:update')
	async downloadPackage(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentTeamsPackageDto,
	): Promise<void> {
		const archive = await this.setupService.buildPackage(
			req.user,
			{ projectId: req.params.projectId, agentId },
			payload.credentialId,
			payload.settings,
		);

		res.setHeader('Content-Type', 'application/zip');
		res.setHeader('Content-Disposition', 'attachment; filename="n8n-agent-teams-app.zip"');
		res.send(archive);
	}

	@Options('/:agentId/integrations/teams/arm-template', { skipAuth: true, cors: TEMPLATE_CORS })
	armTemplatePreflight(_req: Request, res: Response): void {
		res.status(204).send();
	}

	/**
	 * Carries no n8n session, so it authorises on the signed token in the query
	 * string instead. Rate limited because it is reachable by anyone and does a
	 * database read once a token verifies.
	 *
	 * Written straight to the response rather than returned: the REST layer wraps
	 * a returned value in `{ data: ... }`, and the portal rejects that with
	 * "this is not a valid template" because the ARM schema has to be at the root.
	 */
	@Get('/:agentId/integrations/teams/arm-template', {
		skipAuth: true,
		cors: TEMPLATE_CORS,
		ipRateLimit: { limit: 60, windowMs: Time.minutes.toMilliseconds },
	})
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

		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(template));
	}
}
