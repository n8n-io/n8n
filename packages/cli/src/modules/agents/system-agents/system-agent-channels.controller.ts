import {
	SystemAgentChannelConnectDto,
	type SlackAgentAppManifestResponse,
	type SystemAgentSlackConnectionResponse,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Logger } from '@n8n/backend-common';
import { Body, Delete, Get, Param, Post, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import { handleChannelWebhook } from '../integrations/channel-webhook-handler';
import { readSlackStopEvent } from '../integrations/platforms/slack/slack-stop-event';
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
		private readonly logger: Logger,
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
		const status = await handleChannelWebhook(
			{
				chatIntegrationRegistry: this.chatIntegrationRegistry,
				chatIntegrationService: this.chatIntegrationService,
			},
			req,
			res,
			{ agentId, platform },
		);
		// The adapter accepts only a request with a valid signature, so a 2xx status
		// means that the request is genuine. The adapter ignores the Stop event.
		if (status >= 200 && status < 300) this.stopTurnOnPlatformRequest(agentId, platform, req.body);
	}

	/** The chat platform sent a Stop request. Slack answers it already, so run it in the background. */
	private stopTurnOnPlatformRequest(agentId: string, platform: string, body: unknown): void {
		const stop = readSlackStopEvent(body);
		if (platform !== 'slack' || !stop) return;
		void this.chatIntegrationService
			.getBridge(agentId, platform)
			?.stopSystemTurn(stop)
			.catch((error: unknown) => {
				this.logger.warn('[SystemAgentChannels] Could not stop a turn on request of the chat', {
					agentId,
					error: error instanceof Error ? error.message : String(error),
				});
			});
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
