import type { Logger } from '@n8n/backend-common';
import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { AgentChatBridge } from '../../integrations/agent-chat-bridge';
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
		mock<Logger>(),
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
	describe('a Stop request of the chat', () => {
		const stopBody = {
			type: 'event_callback',
			team_id: 'T1',
			event: { type: 'agent_session_stopped', channel: 'D1', thread_ts: '1.2', user: 'U1' },
		};

		function stopRequest(body: unknown) {
			return {
				params: { agentId: 'assistant', platform: 'slack' },
				method: 'POST',
				headers: { host: 'n8n.test', 'content-type': 'application/json' },
				originalUrl: '/rest/agents/system/assistant/channels/slack/webhook',
				protocol: 'https',
				query: {},
				body,
			} as unknown as Request<{ agentId: string; platform: string }>;
		}

		function connect(status: number) {
			const ctx = setup();
			ctx.chatIntegrationService.getWebhookHandler.mockReturnValue(
				vi.fn().mockResolvedValue(new Response('ok', { status })),
			);
			const bridge = mock<AgentChatBridge>();
			bridge.stopSystemTurn.mockResolvedValue(undefined);
			ctx.chatIntegrationService.getBridge.mockReturnValue(bridge);
			return { ...ctx, bridge };
		}

		it('stops the turn when the adapter accepted the request', async () => {
			const { controller, bridge } = connect(200);

			await controller.handleWebhook(stopRequest(stopBody), response());

			expect(bridge.stopSystemTurn).toHaveBeenCalledWith({
				platformThreadId: 'slack:D1:1.2',
				externalUserId: 'U1',
				tenantId: 'T1',
			});
		});

		it('does not stop anything when the adapter rejected the request', async () => {
			const { controller, bridge } = connect(401);

			await controller.handleWebhook(stopRequest(stopBody), response());

			expect(bridge.stopSystemTurn).not.toHaveBeenCalled();
		});

		it('does nothing for an ordinary event', async () => {
			const { controller, bridge } = connect(200);

			await controller.handleWebhook(
				stopRequest({ type: 'event_callback', event: { type: 'message' } }),
				response(),
			);

			expect(bridge.stopSystemTurn).not.toHaveBeenCalled();
		});
	});
});
