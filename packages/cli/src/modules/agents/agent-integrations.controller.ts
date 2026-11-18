import {
	AgentConnectIntegrationDto,
	AgentDisconnectIntegrationDto,
	type AgentDisconnectIntegrationResponse,
	type AgentIntegrationConnectResponse,
	type AgentIntegrationStatusResponse,
	type AgentWebhookUrlResponse,
	type AgentWhatsAppVerifyTokenResponse,
} from '@n8n/api-types';
import { UrlService } from '@n8n/backend-services';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { InstanceSettings } from 'n8n-core';

import { AgentIntegrationManagementService } from './agent-integration-management.service';
import { AgentChannelStatusReporter } from './integrations/agent-channel-status-reporter';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { handleChannelWebhook } from './integrations/channel-webhook-handler';
import { buildChannelStatusReport } from './integrations/channel-status-report';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { deriveWhatsAppVerifyToken } from './integrations/integration-helpers';
import { AgentChannelStatusRepository } from './repositories/agent-channel-status.repository';
import { AgentRepository } from './repositories/agent.repository';

import { AgentWriteLockService } from './agent-write-lock.service';
import { NotFoundError } from '@n8n/errors';

@RestController('/projects/:projectId/agents/v2')
export class AgentIntegrationsController {
	constructor(
		private readonly integrationManagementService: AgentIntegrationManagementService,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly agentRepository: AgentRepository,
		private readonly chatIntegrationRegistry: ChatIntegrationRegistry,
		private readonly channelStatusRepository: AgentChannelStatusRepository,
		private readonly statusReporter: AgentChannelStatusReporter,
		private readonly instanceSettings: InstanceSettings,
		private readonly agentWriteLockService: AgentWriteLockService,
		private readonly urlService: UrlService,
	) {}

	@Post('/:agentId/integrations/connect')
	@ProjectScope('agent:update')
	async connectIntegration(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentConnectIntegrationDto,
	): Promise<AgentIntegrationConnectResponse> {
		await this.integrationManagementService.validateConfig(req.body);
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const clientId = req.headers?.['push-ref'];
		await this.agentWriteLockService.validateAgentWriteLock(
			req.user.id,
			clientId,
			req.params.projectId,
			agentId,
			'connect integration for',
		);
		const { savedAgent } = await this.integrationManagementService.connect({
			agent,
			user: req.user,
			integration: req.body,
			...(payload.replaces
				? { replaces: { type: payload.type, credentialId: payload.replaces.credentialId } }
				: {}),
			pushRef: req.headers?.['push-ref'],
		});
		return { status: savedAgent.activeVersionId === null ? 'configured' : 'connected' };
	}

	@Post('/:agentId/integrations/disconnect')
	@ProjectScope('agent:update')
	async disconnectIntegration(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentDisconnectIntegrationDto,
	): Promise<AgentDisconnectIntegrationResponse> {
		const { type, credentialId, deleteExternalResource } = payload;
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const clientId = req.headers?.['push-ref'];
		await this.agentWriteLockService.validateAgentWriteLock(
			req.user.id,
			clientId,
			req.params.projectId,
			agentId,
			'disconnect integration for',
		);
		const { warning } = await this.integrationManagementService.disconnect({
			agent,
			user: req.user,
			type,
			credentialId,
			deleteExternalResource,
			pushRef: req.headers?.['push-ref'],
		});
		return { status: 'disconnected', ...(warning ? { warning } : {}) };
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

		const statuses = await this.channelStatusRepository.findByAgentId(agentId, {});
		const now = new Date();

		return {
			...buildChannelStatusReport(
				agent.integrations,
				agent.activeVersionId,
				statuses,
				(row) => this.statusReporter.isLive(row, now),
				agent.activeVersion?.schema?.integrations ?? [],
			),
			n8nChat: {
				draftEnabled:
					agent.integrations?.some((integration) => integration.type === 'n8n_chat') ?? false,
				publishedEnabled:
					agent.activeVersionId !== null &&
					(agent.activeVersion?.schema?.integrations?.some(
						(integration) => integration.type === 'n8n_chat',
					) ??
						false),
			},
		};
	}

	// Meta has no API for n8n to register this secret with, so the user pastes it
	// in by hand — the setup screen needs it to display, not just verify.
	@Get('/:agentId/integrations/whatsapp/verify-token')
	@ProjectScope('agent:read')
	async whatsAppVerifyToken(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<AgentWhatsAppVerifyTokenResponse> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		return {
			verifyToken: deriveWhatsAppVerifyToken(this.instanceSettings.hmacSignatureSecret, agentId),
		};
	}

	// The URL comes from server settings that the frontend does not receive. It
	// depends on the agent ID alone, so an agent that is not saved yet has it too.
	@Get('/:agentId/integrations/webhook/url')
	@ProjectScope('agent:read')
	async webhookUrl(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<AgentWebhookUrlResponse> {
		return { url: this.urlService.getAgentWebhookUrl(agentId) };
	}

	// WhatsApp's Meta app verifies a webhook URL with a GET handshake
	// (hub.mode/hub.challenge/hub.verify_token) before it will deliver any
	// POST events to it. Every other platform here only ever sends POST, so a
	// GET for them is never meaningful — short-circuit to the same 404 the
	// POST path would give an unconnected integration, rather than falling
	// through to `handleWebhook`, which builds a Web Request assuming whatever
	// handler it finds can make sense of a GET.
	@Get('/:agentId/webhooks/:platform', { skipAuth: true, allowBots: true })
	async handleWebhookVerification(
		req: Request<{ projectId: string; agentId: string; platform: string }>,
		res: Response,
	) {
		const { agentId, platform } = req.params;
		if (platform !== 'whatsapp') {
			res.status(404).json({ error: `No active ${platform} integration for agent "${agentId}"` });
			return;
		}
		return await this.handleWebhook(req, res);
	}

	// Third-party webhook callback: do not add @ProjectScope. Auth happens
	// via per-platform signature verification inside webhookHandler.
	@Post('/:agentId/webhooks/:platform', { skipAuth: true, allowBots: true })
	async handleWebhook(
		req: Request<{ projectId: string; agentId: string; platform: string }>,
		res: Response,
	) {
		const { agentId, platform } = req.params;
		await handleChannelWebhook(
			{
				chatIntegrationRegistry: this.chatIntegrationRegistry,
				chatIntegrationService: this.chatIntegrationService,
			},
			req,
			res,
			{ agentId, platform },
		);
	}
}
