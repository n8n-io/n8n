import { mock } from 'jest-mock-extended';

import { ChatIntegrationActionExecutor } from '../integration-action-executor';
import { getIntegrationToolConnectionDescriptors } from '../integration-tools';
import type { ChatIntegrationService, ChatInstance } from '../chat-integration.service';
import type { AgentCredentialIntegrationConfig } from '@n8n/api-types';

const slack: AgentCredentialIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-a',
};

describe('ChatIntegrationActionExecutor', () => {
	it('posts channel messages through the selected integration connection and returns message context', async () => {
		const sentMessage = {
			id: '123.456',
			threadId: 'slack:C123:123.456',
		};
		const channel = {
			post: jest.fn().mockResolvedValue(sentMessage),
		};
		const sentThread = {
			subscribe: jest.fn().mockResolvedValue(undefined),
		};
		const chat = mock<ChatInstance>();
		chat.channel.mockReturnValue(channel as never);
		chat.thread.mockReturnValue(sentThread as never);

		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService);
		const descriptor = getIntegrationToolConnectionDescriptors([slack], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			action: 'send_channel_message',
			input: { channelId: 'C123', message: { text: 'Hello channel' } },
			awaitResponse: false,
		});

		expect(chatIntegrationService.getChatInstance).toHaveBeenCalledWith('agent-1', {
			type: 'slack',
			credentialId: 'cred-a',
		});
		expect(chat.channel).toHaveBeenCalledWith('slack:C123');
		expect(channel.post).toHaveBeenCalledWith('Hello channel');
		expect(chat.thread).toHaveBeenCalledWith('slack:C123:123.456');
		expect(sentThread.subscribe).toHaveBeenCalled();
		expect(result).toEqual({
			ok: true,
			messageContext: {
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				target: {
					type: 'channel',
					channelId: 'slack:C123',
					threadId: 'slack:C123:123.456',
				},
				messageId: '123.456',
				updatedAt: expect.any(String),
			},
		});
	});

	it('subscribes Slack DM threads after sending messages', async () => {
		const sentMessage = {
			id: '123.456',
			threadId: 'slack:D123:123.456',
		};
		const thread = {
			id: 'slack:D123:123.456',
			post: jest.fn().mockResolvedValue(sentMessage),
			subscribe: jest.fn().mockResolvedValue(undefined),
		};
		const chat = mock<ChatInstance>();
		chat.openDM.mockResolvedValue(thread as never);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService);
		const descriptor = getIntegrationToolConnectionDescriptors([slack], 'agent-1')[0];

		await executor.execute({
			descriptor,
			action: 'send_dm',
			input: { userId: 'U123', message: { text: 'Hello' } },
			awaitResponse: false,
		});

		expect(thread.post).toHaveBeenCalledWith('Hello');
		expect(thread.subscribe).toHaveBeenCalled();
	});

	it('adds Slack reactions to the current message context', async () => {
		const slackAdapter = {
			addReaction: jest.fn().mockResolvedValue(undefined),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue(slackAdapter);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService);
		const descriptor = getIntegrationToolConnectionDescriptors([slack], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			action: 'add_reaction',
			input: { emoji: 'eyes' },
			awaitResponse: false,
			currentMessageContext: {
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				target: {
					type: 'thread',
					threadId: 'slack:C123:123.456',
					channelId: 'slack:C123',
				},
				messageId: '123.456',
				updatedAt: '2026-05-18T10:00:00.000Z',
			},
		});

		expect(slackAdapter.addReaction).toHaveBeenCalledWith('slack:C123:123.456', '123.456', 'eyes');
		expect(result).toEqual({
			ok: true,
			reaction: {
				emoji: 'eyes',
				threadId: 'slack:C123:123.456',
				messageId: '123.456',
			},
			messageContext: {
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				target: {
					type: 'thread',
					threadId: 'slack:C123:123.456',
					channelId: 'slack:C123',
				},
				messageId: '123.456',
				updatedAt: expect.any(String),
			},
		});
	});

	it('adds Slack reactions to an explicit message target', async () => {
		const slackAdapter = {
			addReaction: jest.fn().mockResolvedValue(undefined),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue(slackAdapter);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService);
		const descriptor = getIntegrationToolConnectionDescriptors([slack], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			action: 'add_reaction',
			input: {
				emoji: ':white_check_mark:',
				threadId: 'slack:C999:999.000',
				messageId: '999.000',
			},
			awaitResponse: false,
		});

		expect(slackAdapter.addReaction).toHaveBeenCalledWith(
			'slack:C999:999.000',
			'999.000',
			':white_check_mark:',
		);
		expect(result).toEqual({
			ok: true,
			reaction: {
				emoji: ':white_check_mark:',
				threadId: 'slack:C999:999.000',
				messageId: '999.000',
			},
			messageContext: {
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				target: {
					type: 'thread',
					threadId: 'slack:C999:999.000',
					channelId: 'slack:C999',
				},
				messageId: '999.000',
				updatedAt: expect.any(String),
			},
		});
	});

	it('returns a structured error when a Slack reaction has no message target', async () => {
		const slackAdapter = {
			addReaction: jest.fn().mockResolvedValue(undefined),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue(slackAdapter);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService);
		const descriptor = getIntegrationToolConnectionDescriptors([slack], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			action: 'add_reaction',
			input: { emoji: 'eyes' },
			awaitResponse: false,
		});

		expect(slackAdapter.addReaction).not.toHaveBeenCalled();
		expect(result).toEqual({
			ok: false,
			error: {
				code: 'NO_MESSAGE_CONTEXT',
				message: 'Slack reactions require a messageId and threadId or current message context.',
			},
		});
	});

	it('returns a structured error when the selected connection is unavailable', async () => {
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(undefined);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService);
		const descriptor = getIntegrationToolConnectionDescriptors([slack], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			action: 'send_dm',
			input: { userId: 'U123', message: { text: 'Hello' } },
			awaitResponse: false,
		});

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'CONNECTION_NOT_AVAILABLE',
				message: 'The integration connection is not currently available.',
			},
		});
	});
});
