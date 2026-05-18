import { mock } from 'jest-mock-extended';

import type { ChatIntegrationService, ChatInstance } from '../chat-integration.service';
import { ChatIntegrationContextQueryExecutor } from '../integration-context-query-executor';
import { getIntegrationToolConnectionDescriptors } from '../integration-tools';
import type { AgentCredentialIntegrationConfig } from '@n8n/api-types';

const slack: AgentCredentialIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-a',
};

describe('ChatIntegrationContextQueryExecutor', () => {
	it('searches Slack users by name through the selected integration connection', async () => {
		const usersList = jest.fn().mockResolvedValue({
			members: [
				{
					id: 'U123',
					name: 'mdrury',
					real_name: 'Michael Drury',
					profile: {
						display_name: 'Michael',
						email: 'michael@example.com',
						image_192: 'https://example.com/avatar.png',
					},
				},
				{
					id: 'U999',
					name: 'other',
					real_name: 'Someone Else',
					profile: { display_name: 'Someone' },
				},
			],
			response_metadata: {},
		});
		const slackAdapter = {
			client: { users: { list: usersList } },
			withToken: jest.fn(async (options: Record<string, unknown>) => ({
				...options,
				token: 'xoxb-token',
			})),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue(slackAdapter);

		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationContextQueryExecutor(chatIntegrationService);
		const descriptor = getIntegrationToolConnectionDescriptors([slack], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			query: 'search_users',
			input: { query: 'Michael Drury' },
		});

		expect(chatIntegrationService.getChatInstance).toHaveBeenCalledWith('agent-1', {
			type: 'slack',
			credentialId: 'cred-a',
		});
		expect(chat.getAdapter).toHaveBeenCalledWith('slack');
		expect(usersList).toHaveBeenCalledWith({ limit: 200, token: 'xoxb-token' });
		expect(result).toEqual({
			ok: true,
			users: [
				{
					userId: 'U123',
					userName: 'mdrury',
					fullName: 'Michael Drury',
					email: 'michael@example.com',
					avatarUrl: 'https://example.com/avatar.png',
					isBot: false,
				},
			],
			resultCount: 1,
		});
	});

	it('searches Slack channels by name through the selected integration connection', async () => {
		const conversationsList = jest.fn().mockResolvedValue({
			channels: [
				{
					id: 'C123',
					name: 'product',
					is_archived: false,
					is_member: true,
					is_private: false,
					num_members: 42,
				},
				{
					id: 'C999',
					name: 'random',
					is_archived: false,
					is_member: true,
					is_private: false,
					num_members: 8,
				},
			],
			response_metadata: {},
		});
		const slackAdapter = {
			client: { conversations: { list: conversationsList } },
			withToken: jest.fn(async (options: Record<string, unknown>) => ({
				...options,
				token: 'xoxb-token',
			})),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue(slackAdapter);

		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationContextQueryExecutor(chatIntegrationService);
		const descriptor = getIntegrationToolConnectionDescriptors([slack], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			query: 'search_channels',
			input: { query: '#product' },
		});

		expect(chat.getAdapter).toHaveBeenCalledWith('slack');
		expect(conversationsList).toHaveBeenCalledWith({
			exclude_archived: true,
			limit: 200,
			types: 'public_channel,private_channel',
			token: 'xoxb-token',
		});
		expect(result).toEqual({
			ok: true,
			channels: [
				{
					channelId: 'C123',
					name: '#product',
					isArchived: false,
					isMember: true,
					isPrivate: false,
					memberCount: 42,
				},
			],
			resultCount: 1,
		});
	});
});
