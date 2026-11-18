import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { ChatIntegrationRegistry } from '../../integrations/agent-chat-integration';
import type { ChatIntegrationService } from '../../integrations/chat-integration.service';
import type { SystemAgentChannelService } from '../system-agent-channel.service';
import { SystemAgentChannelsController } from '../system-agent-channels.controller';
import { SystemAgentRegistry } from '../system-agent-registry';

function setup() {
	const registry = new SystemAgentRegistry();
	registry.register({
		agentId: 'assistant',
		name: 'Assistant',
		authorize: async () => true,
		prepareTurn: vi.fn(),
	});
	const chatIntegrationRegistry = mock<ChatIntegrationRegistry>();
	const chatIntegrationService = mock<ChatIntegrationService>();
	const controller = new SystemAgentChannelsController(
		mock<SystemAgentChannelService>(),
		registry,
		chatIntegrationRegistry,
		chatIntegrationService,
	);
	return { controller, chatIntegrationRegistry, chatIntegrationService };
}

function response() {
	const res = mock<Response>();
	res.status.mockReturnValue(res);
	return res;
}

describe('SystemAgentChannelsController webhook', () => {
	it('answers a webhook for an agent that is not a system agent with 404', async () => {
		const { controller, chatIntegrationService } = setup();
		const res = response();

		await controller.handleWebhook(
			mock<Request<{ agentId: string; platform: string }>>({
				params: { agentId: 'project-agent', platform: 'slack' },
			}),
			res,
		);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(chatIntegrationService.getWebhookHandler).not.toHaveBeenCalled();
	});

	it('hands the request of a system agent to its connected handler', async () => {
		const { controller, chatIntegrationService } = setup();
		const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
		chatIntegrationService.getWebhookHandler.mockReturnValue(handler);
		const res = response();

		await controller.handleWebhook(
			{
				params: { agentId: 'assistant', platform: 'slack' },
				method: 'POST',
				headers: { host: 'n8n.test', 'content-type': 'application/json' },
				originalUrl: '/rest/agents/system/assistant/channels/slack/webhook',
				protocol: 'https',
				query: {},
				body: { type: 'event_callback' },
			} as unknown as Request<{ agentId: string; platform: string }>,
			res,
		);

		expect(chatIntegrationService.getWebhookHandler).toHaveBeenCalledWith(
			'assistant',
			'slack',
			undefined,
		);
		expect(handler).toHaveBeenCalledOnce();
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.send).toHaveBeenCalledWith('ok');
	});
});
