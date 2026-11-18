import {
	SystemAgentChannelConnectDto,
	type SlackAgentAppManifestResponse,
	type SystemAgentSlackConnectionResponse,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Post, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import { handleChannelWebhook } from '../integrations/channel-webhook-handler';
import { ChatIntegrationService } from '../integrations/chat-integration.service';
import { SystemAgentChannelService } from './system-agent-channel.service';
import { SystemAgentRegistry } from './system-agent-registry';

/**
 * Chat channels of code-defined system agents. One connection serves the whole
 * instance, so these are not project routes. The setup routes check with the
 * provider of the agent who may use them. The webhook route is public like the
 * project one: the platform adapter checks the request signature.
 */
@RestController('/agents/system/:agentId/channels')
export class SystemAgentChannelsController {
	constructor(
		private readonly channels: SystemAgentChannelService,
		private readonly registry: SystemAgentRegistry,
		private readonly chatIntegrationRegistry: ChatIntegrationRegistry,
		private readonly chatIntegrationService: ChatIntegrationService,
	) {}

	// Third-party webhook callback: do not add a scope. Auth happens through
	// the signature check of the platform adapter.
	@Post('/:platform/webhook', { skipAuth: true, allowBots: true })
	async handleWebhook(
		req: Request<{ agentId: string; platform: string }>,
		res: Response,
	): Promise<void> {
		const { agentId, platform } = req.params;
		if (!this.registry.has(agentId)) {
			res.status(404).json({ error: `No active ${platform} integration for agent "${agentId}"` });
			return;
		}
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

	@Get('/slack/manifest')
	async manifest(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<SlackAgentAppManifestResponse> {
		return await this.channels.getManifest(agentId, req.user);
	}

	@Get('/slack')
	async slack(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<SystemAgentSlackConnectionResponse> {
		return await this.channels.getSlackConnection(agentId, req.user);
	}

	@Post('/slack/connect')
	async connectSlack(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: SystemAgentChannelConnectDto,
	): Promise<SystemAgentSlackConnectionResponse> {
		return await this.channels.connectSlack(agentId, req.user, payload.credentialId);
	}

	@Delete('/slack')
	async disconnectSlack(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<{ status: 'disconnected' }> {
		await this.channels.disconnectSlack(agentId, req.user);
		return { status: 'disconnected' };
	}
}
