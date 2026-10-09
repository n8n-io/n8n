import {
	AgentTeamsInstallDto,
	AgentTeamsPackageDto,
	AgentTeamsProvisionAppDto,
	AgentTeamsProvisionBotDto,
} from '@n8n/api-types';
import type {
	CreateTeamsManagerCredentialResponse,
	TeamsAgentSetupState,
	TeamsCredentialCheck,
	TeamsManagedSetupState,
	TeamsAzureSubscription,
	TeamsProvisionedAppSummary,
	TeamsProvisionedBotSummary,
} from '@n8n/api-types';
import { Time } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import type { CorsOptions } from '@n8n/decorators';
import { Body, Get, Options, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { BadRequestError } from '@n8n/errors';
import type { Request, Response } from 'express';

import { TeamsCredentialCheckService } from './integrations/platforms/teams/teams-credential-check.service';
import { TeamsBotProvisioningService } from './integrations/platforms/teams/teams-bot-provisioning.service';
import { TeamsCatalogService } from './integrations/platforms/teams/teams-catalog.service';
import { TeamsEntraProvisioningService } from './integrations/platforms/teams/teams-entra-provisioning.service';
import { TeamsSetupTelemetryService } from './integrations/platforms/teams/teams-setup-telemetry.service';
import { TeamsManagedSetupService } from './integrations/platforms/teams/teams-managed-setup.service';
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
		private readonly managedSetupService: TeamsManagedSetupService,
		private readonly entraProvisioningService: TeamsEntraProvisioningService,
		private readonly botProvisioningService: TeamsBotProvisioningService,
		private readonly catalogService: TeamsCatalogService,
		private readonly setupTelemetry: TeamsSetupTelemetryService,
	) {}

	/**
	 * Confirms an upload n8n did not perform. Adding the app for yourself happens
	 * in the Teams client, so the only way to know it worked is to ask Microsoft
	 * what the user has.
	 */
	@Post('/:agentId/integrations/teams/installed-check')
	@ProjectScope('agent:update')
	async checkInstalledApp(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentTeamsInstallDto,
	): Promise<{ installed: boolean }> {
		const projectId = req.params.projectId;
		const installed = await this.catalogService.findUserInstall({
			user: req.user,
			projectId,
			agentId,
			managerCredentialId: payload.managerCredentialId,
		});
		if (!installed) return { installed: false };

		this.setupTelemetry.succeeded({
			agentId,
			projectId,
			userId: req.user.id,
			step: 'install',
			installRoute: 'upload',
		});
		return { installed };
	}

	/**
	 * An empty list is the ordinary answer for a Microsoft 365 tenant, which
	 * comes with no Azure subscription. The setup then offers the next option
	 * rather than treating it as a failure.
	 */
	@Get('/:agentId/integrations/teams/azure-subscriptions')
	@ProjectScope('agent:update')
	async listAzureSubscriptions(
		req: AuthenticatedRequest<{ projectId: string }, {}, {}, { managerCredentialId?: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<TeamsAzureSubscription[]> {
		const managerCredentialId = req.query.managerCredentialId;
		// An empty answer here means "no Azure subscription", which sends the user
		// down the manual ladder. A missing credential is a caller bug, not that.
		if (typeof managerCredentialId !== 'string' || managerCredentialId.length === 0) {
			throw new BadRequestError('Sign in with Microsoft before looking for a subscription.');
		}
		const subscriptions = await this.botProvisioningService.listSubscriptions({
			user: req.user,
			managerCredentialId,
		});

		// The rung the whole ladder exists to measure. It is chosen here rather
		// than in the browser: an empty answer is the only moment n8n knows the
		// account cannot reach a subscription, and the browser reports no step.
		if (subscriptions.length === 0) {
			this.setupTelemetry.succeeded({
				agentId,
				projectId: req.params.projectId,
				userId: req.user.id,
				step: 'create_bot',
				botRoute: 'manual',
			});
		}
		return subscriptions;
	}

	@Post('/:agentId/integrations/teams/provision-bot')
	@ProjectScope('agent:update')
	async provisionBot(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentTeamsProvisionBotDto,
	): Promise<TeamsProvisionedBotSummary> {
		const projectId = req.params.projectId;
		const report = {
			agentId,
			projectId,
			userId: req.user.id,
			step: 'create_bot' as const,
			botRoute: 'provisioned' as const,
		};
		try {
			// Inside the try: a credential that has gone is a way this step fails,
			// and reading it outside would leave that failure unrecorded.
			const identity = await this.setupService.botIdentityFor(
				req.user,
				{ projectId, agentId },
				payload.credentialId,
			);
			const summary = await this.botProvisioningService.provisionBot({
				user: req.user,
				projectId,
				agentId,
				agentName: identity.agentName,
				managerCredentialId: payload.managerCredentialId,
				subscriptionId: payload.subscriptionId,
				msaAppId: identity.clientId,
				msaAppTenantId: identity.tenantId,
				messagingEndpoint: identity.messagingEndpoint,
			});
			this.setupTelemetry.succeeded(report);
			return summary;
		} catch (error) {
			this.setupTelemetry.failed(report, error);
			throw error;
		}
	}

	/**
	 * Registers the customer's Entra app and writes the channel credential from
	 * it, so the user never sees a client secret.
	 */
	@Post('/:agentId/integrations/teams/provision-app')
	@ProjectScope('agent:update')
	async provisionApp(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentTeamsProvisionAppDto,
	): Promise<TeamsProvisionedAppSummary> {
		const report = {
			agentId,
			projectId: req.params.projectId,
			userId: req.user.id,
			step: 'create_app' as const,
		};
		try {
			const summary = await this.entraProvisioningService.provision({
				user: req.user,
				projectId: req.params.projectId,
				agentId,
				agentName: await this.setupService.agentNameFor(req.params.projectId, agentId),
				managerCredentialId: payload.managerCredentialId,
			});
			this.setupTelemetry.succeeded(report);
			return summary;
		} catch (error) {
			this.setupTelemetry.failed(report, error);
			throw error;
		}
	}

	/**
	 * Whether the recommended setup can run here, and which Microsoft sign-ins
	 * the project already has. Returns `managedSetupAvailable: false` rather
	 * than failing, so the frontend can simply not offer the mode.
	 */
	@Get('/:agentId/integrations/teams/managed-setup')
	@ProjectScope('agent:update')
	async getManagedSetupState(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<TeamsManagedSetupState> {
		return await this.managedSetupService.getSetupState({
			projectId: req.params.projectId,
			agentId,
			user: req.user,
		});
	}

	@Post('/:agentId/integrations/teams/manager-credential')
	@ProjectScope('agent:update')
	async createManagerCredential(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<CreateTeamsManagerCredentialResponse> {
		return await this.managedSetupService.createManagerCredential({
			projectId: req.params.projectId,
			agentId,
			user: req.user,
		});
	}

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
