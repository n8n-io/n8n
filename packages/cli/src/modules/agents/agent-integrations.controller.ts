import {
	AgentConnectIntegrationDto,
	AgentDisconnectIntegrationDto,
	isDraftIntegration,
	type AgentIntegrationStatusResponse,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentIntegrationManagementService } from './agent-integration-management.service';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { channelIntegrationRecorder } from './integrations/recording/channel-integration-recorder';
import { AgentRepository } from './repositories/agent.repository';

@RestController('/projects/:projectId/agents/v2')
export class AgentIntegrationsController {
	constructor(
		private readonly integrationManagementService: AgentIntegrationManagementService,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly agentRepository: AgentRepository,
		private readonly chatIntegrationRegistry: ChatIntegrationRegistry,
	) {}

	@Post('/:agentId/integrations/connect')
	@ProjectScope('agent:update')
	async connectIntegration(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentConnectIntegrationDto,
	) {
		await this.integrationManagementService.validateConfig(req.body);
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const { savedAgent } = await this.integrationManagementService.connect({
			agent,
			user: req.user,
			integration: req.body,
			...(payload.replaces
				? { replaces: { type: payload.type, credentialId: payload.replaces.credentialId } }
				: {}),
		});
		if (savedAgent.activeVersionId === null) return { status: 'configured' };

		return { status: 'connected' };
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
		await this.integrationManagementService.disconnect({
			agent,
			user: req.user,
			type,
			credentialId,
		});

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

		// Draft entries (`credentialId: ''`) written during the initial build so
		// the panel can show a needs-setup chip aren't a real connection — report
		// them as disconnected so channel-setup UIs don't render an already-
		// connected state and hide their own setup form.
		const chatIntegrations = (agent.integrations ?? [])
			.filter((i) => !isDraftIntegration(i))
			.map((i) => ({
				type: i.type,
				credentialId: i.credentialId,
				...('settings' in i ? { settings: i.settings } : {}),
			}));
		return {
			status:
				chatIntegrations.length === 0
					? 'disconnected'
					: agent.activeVersionId === null
						? 'configured'
						: 'connected',
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
		const integration = this.chatIntegrationRegistry.get(platform);
		const resolution = integration?.resolveWebhookRequest?.({
			headers: req.headers,
			body: req.body,
		});
		if (resolution?.type === 'reject') {
			res.status(resolution.response.status).json(resolution.response.body);
			return;
		}

		const webhookHandler =
			resolution?.type === 'no_match'
				? undefined
				: this.chatIntegrationService.getWebhookHandler(
						agentId,
						platform,
						resolution?.type === 'select' ? resolution.connectionSelector : undefined,
					);

		if (!webhookHandler) {
			// Allow platforms to respond to setup-time webhooks (e.g. Slack's
			// `url_verification` challenge) before credentials are configured,
			// so the user doesn't have to come back and re-verify URLs after
			// connecting the credential.
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
