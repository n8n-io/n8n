import { AgentMessageIntegrationOriginSchema } from '../agent-message-origin.schema';

describe('AgentMessageIntegrationOriginSchema', () => {
	it('accepts each integration with only its native identifiers', () => {
		const origins = [
			{ type: 'slack', workspaceId: 'T1', conversationKind: 'dm', channelId: 'D1' },
			{ type: 'discord', channelId: 'C1' },
			{
				type: 'linear',
				issueId: 'issue-1',
				projectId: 'project-1',
				teamId: 'team-1',
				teamName: 'Core',
			},
			{ type: 'telegram', chatId: '-100' },
			{ type: 'teams', conversationId: 'conv-1' },
			{ type: 'whatsapp', phoneNumberId: 'p1', userWaId: 'u1' },
		];

		for (const origin of origins) {
			expect(AgentMessageIntegrationOriginSchema.safeParse(origin).success).toBe(true);
		}
	});

	it('rejects missing identifiers, unknown fields and unknown integrations', () => {
		const invalid = [
			{ type: 'slack', conversationKind: 'channel', channelId: 'C1' },
			{ type: 'slack', workspaceId: 'T1', conversationKind: 'thread', channelId: 'C1' },
			{ type: 'discord', channelId: 'C1', guildName: 'Guild' },
			{ type: 'irc', channelId: 'C1' },
		];

		for (const origin of invalid) {
			expect(AgentMessageIntegrationOriginSchema.safeParse(origin).success).toBe(false);
		}
	});
});
