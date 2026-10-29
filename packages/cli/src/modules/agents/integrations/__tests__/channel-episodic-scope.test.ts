import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { UrlService } from '@n8n/backend-services';
import type { UserRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { AgentRepository } from '../../repositories/agent.repository';
import type { ChannelRateLimitGuard } from '../channel-rate-limit.guard';
import { DiscordIntegration } from '../platforms/discord/discord-integration';
import { N8nChatIntegration } from '../platforms/n8n-chat/n8n-chat-integration';
import { TeamsIntegration } from '../platforms/teams/teams-integration';
import { TelegramIntegration } from '../platforms/telegram/telegram-integration';
import { WhatsAppIntegration } from '../platforms/whatsapp/whatsapp-integration';
import type { WhatsAppWebhookVerificationStore } from '../platforms/whatsapp/whatsapp-webhook-verification.store';

describe('channel episodic memory policy', () => {
	const logger = mock<Logger>();
	const agentRepository = mock<AgentRepository>();
	const instanceSettings = mock<InstanceSettings>();
	const outboundHttp = mock<OutboundHttp>();

	it.each([
		[
			'Telegram',
			() =>
				new TelegramIntegration(
					logger,
					mock<UrlService>(),
					agentRepository,
					instanceSettings,
					outboundHttp,
				),
		],
		['Teams', () => new TeamsIntegration(logger, agentRepository)],
		[
			'WhatsApp',
			() =>
				new WhatsAppIntegration(
					logger,
					agentRepository,
					instanceSettings,
					mock<ChannelRateLimitGuard>(),
					mock<WhatsAppWebhookVerificationStore>(),
				),
		],
		[
			'Discord',
			() => new DiscordIntegration(logger, instanceSettings, agentRepository, outboundHttp),
		],
		['n8n Chat', () => new N8nChatIntegration(mock<UserRepository>())],
	])('%s returns no episodic scope', (_name, create) => {
		expect(create().resolveEpisodicScope()).toBeNull();
	});
});
