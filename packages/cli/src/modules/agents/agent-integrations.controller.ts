import {
	AgentDisconnectIntegrationDto,
	AgentIntegrationSchema,
	type AgentIntegrationStatusResponse,
	CreateSlackAgentAppDto,
	type CreateSlackAgentAppResponse,
	type SlackAgentAppManifestResponse,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentIntegrationPersistenceService } from './agent-integration-persistence.service';
import { AgentPublishService } from './agent-publish.service';
import { AgentRunnableStateService } from './agent-runnable-state.service';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { channelIntegrationRecorder } from './integrations/recording/channel-integration-recorder';
import { SlackAppSetupService } from './integrations/slack-app-setup.service';
import { AgentRepository } from './repositories/agent.repository';

@RestController('/projects/:projectId/agents/v2')
export class AgentIntegrationsController {
	constructor(
		private readonly agentIntegrationPersistenceService: AgentIntegrationPersistenceService,
		private readonly agentPublishService: AgentPublishService,
		private readonly credentialsService: CredentialsService,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly agentRepository: AgentRepository,
		private readonly chatIntegrationRegistry: ChatIntegrationRegistry,
		private readonly slackAppSetupService: SlackAppSetupService,
		private readonly agentRunnableStateService: AgentRunnableStateService,
	) {}

	private async validateIntegration(dto: unknown) {
		const integrationParseResult = await AgentIntegrationSchema.safeParseAsync(dto);
		if (!integrationParseResult.success) {
			throw new BadRequestError(integrationParseResult.error.message);
		}
		const integration = integrationParseResult.data;
		if (integration.type === 'telegram' && !integration.settings) {
			throw new BadRequestError('Telegram integration settings are required');
		}
		return integration;
	}

	@Post('/:agentId/integrations/connect')
	@ProjectScope('agent:update')
	async connectIntegration(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const integration = await this.validateIntegration(req.body);
		const { credentialId } = integration;
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		const usableCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			req.user,
			{ projectId: agent.projectId },
		);
		const credential = usableCredentials.find((c) => c.id === credentialId);
		if (!credential) throw new NotFoundError(`Credential "${credentialId}" not found`);

		const integrationImpl = this.chatIntegrationRegistry.require(integration.type);
		if (!integrationImpl.credentialTypes.includes(credential.type)) {
			throw new BadRequestError(
				`${integrationImpl.displayLabel} integrations do not support ${credential.type} credentials`,
			);
		}

		await this.agentIntegrationPersistenceService.saveCredentialIntegration(agent, integration, {
			broadcast: false,
		});
		const publishedAgent = await this.agentPublishService.publishAgent(
			agentId,
			agent.projectId,
			req.user,
			undefined,
			{ syncIntegrations: false },
		);
		await this.chatIntegrationService.connect(agentId, integration, req.user.id, agent.projectId);
		await this.chatIntegrationService.broadcastIntegrationChange(agentId, integration, 'connect');

		return {
			status: 'connected',
			agent: await this.agentRunnableStateService.addRunnableState(
				publishedAgent,
				agent.projectId,
				req.user,
			),
		};
	}

	@Post('/:agentId/integrations/slack/app')
	@ProjectScope('agent:update')
	async createSlackApp(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: CreateSlackAgentAppDto,
	): Promise<CreateSlackAgentAppResponse> {
		return await this.slackAppSetupService.createApp({
			projectId: req.params.projectId,
			agentId,
			appConfigurationToken: payload.appConfigurationToken,
			user: req.user,
		});
	}

	@Get('/:agentId/integrations/slack/manifest')
	@ProjectScope('agent:read')
	async getSlackAppManifest(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<SlackAgentAppManifestResponse> {
		return await this.slackAppSetupService.getManualManifest({
			projectId: req.params.projectId,
			agentId,
		});
	}

	// Slack OAuth callback: do not add @ProjectScope. Authentication happens via
	// the one-time setup state generated by the authenticated createSlackApp route.
	@Get('/:agentId/integrations/slack/oauth/callback', { skipAuth: true, usesTemplates: true })
	async handleSlackAppOAuthCallback(
		req: Request<
			{ projectId: string; agentId: string },
			unknown,
			unknown,
			{ code?: string; state?: string; error?: string; error_description?: string }
		>,
		res: Response,
		@Param('agentId') agentId: string,
	) {
		const { code, state, error, error_description: errorDescription } = req.query;
		if (error) {
			return res.render('oauth-error-callback', {
				error: {
					message: error,
					...(errorDescription ? { reason: errorDescription } : {}),
				},
			});
		}
		if (!code || !state) {
			return res.render('oauth-error-callback', {
				error: { message: 'Insufficient parameters for Slack app setup callback.' },
			});
		}

		try {
			await this.slackAppSetupService.completeInstall({
				projectId: req.params.projectId,
				agentId,
				code,
				state,
			});
			return res.render('oauth-callback');
		} catch (callbackError) {
			const message =
				callbackError instanceof Error ? callbackError.message : 'Slack app setup failed';
			return res.render('oauth-error-callback', {
				error: { message },
			});
		}
	}

	@Post('/:agentId/integrations/disconnect')
	@ProjectScope('agent:update')
	async disconnectIntegration(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentDisconnectIntegrationDto,
	) {
		const { type, credentialId } = payload;
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		await this.chatIntegrationService.disconnect(agentId, { type, credentialId });

		await this.agentIntegrationPersistenceService.removeCredentialIntegration(
			agent,
			type,
			credentialId,
		);

		return { status: 'disconnected' };
	}

	@Get('/:agentId/integrations/status')
	@ProjectScope('agent:read')
	async integrationStatus(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<AgentIntegrationStatusResponse> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		const chatIntegrations = (agent.integrations ?? []).map((i) => ({
			type: i.type,
			credentialId: i.credentialId,
			...('settings' in i ? { settings: i.settings } : {}),
		}));
		return {
			status: chatIntegrations.length > 0 ? 'connected' : 'disconnected',
			integrations: chatIntegrations,
		};
	}

	// Third-party webhook callback: do not add @ProjectScope. Auth happens
	// via per-platform signature verification inside webhookHandler.
	@Post('/:agentId/webhooks/:platform', { skipAuth: true, allowBots: true })
	async handleWebhook(
		req: Request<{ projectId: string; agentId: string; platform: string }>,
		res: Response,
	) {
		const { agentId, platform } = req.params;
		const webhookHandler = this.chatIntegrationService.getWebhookHandler(agentId, platform);

		if (!webhookHandler) {
			// Allow platforms to respond to setup-time webhooks (e.g. Slack's
			// `url_verification` challenge) before credentials are configured,
			// so the user doesn't have to come back and re-verify URLs after
			// connecting the credential.
			const integration = this.chatIntegrationRegistry.get(platform);
			const earlyResponse = integration?.handleUnauthenticatedWebhook?.(req.body);
			if (earlyResponse) {
				res.status(earlyResponse.status).json(earlyResponse.body);
				return;
			}
			res.status(404).json({ error: `No active ${platform} integration for agent "${agentId}"` });
			return;
		}

		// Chat SDK webhook handlers accept a Web API Request and return a Web API Response.
		// Convert Express req -> Web Request. We must preserve the raw body exactly as
		// received because the Slack adapter verifies the request signature against it.
		// Using JSON.stringify(req.body) would break signature verification (-> 401).
		const forwardedProto = req.headers['x-forwarded-proto'];
		const protocol =
			(Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) ?? req.protocol;
		const forwardedHost = req.headers['x-forwarded-host'];
		const host =
			(Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ??
			req.headers.host ??
			'localhost';
		const url = `${protocol}://${host}${req.originalUrl}`;

		// Get the raw body - Express may have parsed it already.
		// If rawBody is available (from rawBodyReader middleware), use it.
		// Otherwise re-encode based on content-type.
		let requestBody: string | undefined;
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			// Express augments Request with rawBody via middleware
			interface RequestWithRawBody {
				rawBody?: Buffer;
			}

			const rawBody = (req as RequestWithRawBody).rawBody;
			if (rawBody) {
				requestBody = rawBody.toString('utf-8');
			} else if (req.headers['content-type']?.includes('application/json')) {
				requestBody = JSON.stringify(req.body);
			} else if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
				requestBody = new URLSearchParams(req.body as Record<string, string>).toString();
			} else {
				requestBody = JSON.stringify(req.body);
			}
		}

		const sanitizedHeaders: Record<string, string> = {};
		for (const [key, value] of Object.entries(req.headers)) {
			if (typeof value === 'string') {
				sanitizedHeaders[key] = value;
			} else if (Array.isArray(value)) {
				sanitizedHeaders[key] = value.join(', ');
			}
		}

		const webRequest = new globalThis.Request(url, {
			method: req.method,
			headers: sanitizedHeaders,
			body: requestBody,
		});
		await channelIntegrationRecorder.recordWebhook(platform, webRequest.clone());

		// In Express, background tasks just need to not be garbage collected.
		// We hold references to keep them alive for the lifetime of the process.
		const backgroundTasks: Array<Promise<unknown>> = [];
		const waitUntil = (task: Promise<unknown>) => {
			backgroundTasks.push(
				task.catch((error: unknown) => {
					console.warn(
						'[AgentIntegrationsController] Background task failed:',
						error instanceof Error ? error.message : String(error),
					);
				}),
			);
		};

		const webResponse = await webhookHandler(webRequest, { waitUntil });

		res.status(webResponse.status);
		webResponse.headers.forEach((value, key) => {
			res.setHeader(key, value);
		});
		const body = await webResponse.text();
		res.send(body);
	}
}
