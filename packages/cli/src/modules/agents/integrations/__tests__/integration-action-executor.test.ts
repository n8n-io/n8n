/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return -- mocks the ESM-only Chat SDK card factories */
type MockFn = Mock<(...args: any[]) => any>;
const {
	mockButton,
	mockCard,
	mockActions,
	mockCardText,
	mockSection,
	mockDivider,
	mockImage,
	mockSelect,
	mockRadioSelect,
	mockFields,
	mockField,
} = vi.hoisted(() => ({
	mockButton: vi.fn((opts) => ({ type: 'button', ...opts })) as MockFn,
	mockCard: vi.fn((opts) => ({ type: 'card', ...opts })) as MockFn,
	mockActions: vi.fn((children) => ({ type: 'actions', children })) as MockFn,
	mockCardText: vi.fn((content) => ({ type: 'text', content })) as MockFn,
	mockSection: vi.fn((children) => ({ type: 'section', children })) as MockFn,
	mockDivider: vi.fn(() => ({ type: 'divider' })) as MockFn,
	mockImage: vi.fn((opts) => ({ type: 'image', ...opts })) as MockFn,
	mockSelect: vi.fn((opts) => ({ type: 'select', ...opts })) as MockFn,
	mockRadioSelect: vi.fn((opts) => ({ type: 'radio_select', ...opts })) as MockFn,
	mockFields: vi.fn((children) => ({ type: 'fields', children })) as MockFn,
	mockField: vi.fn((opts) => ({ type: 'field', ...opts })) as MockFn,
}));

vi.mock('../esm-loader', () => ({
	loadChatSdk: vi.fn().mockResolvedValue({
		Button: mockButton,
		Card: mockCard,
		Actions: mockActions,
		CardText: mockCardText,
		Section: mockSection,
		Divider: mockDivider,
		Image: mockImage,
		Select: mockSelect,
		RadioSelect: mockRadioSelect,
		Fields: mockFields,
		Field: mockField,
	}),
}));

import type { Mock } from 'vitest';
import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import {
	AgentChatIntegration,
	ChatIntegrationRegistry,
	type AgentChatIntegrationContext,
} from '../agent-chat-integration';
import { ChatIntegrationActionExecutor } from '../integration-action-executor';
import { getIntegrationToolConnectionDescriptors } from '../integration-tools';
import { LinearIntegration } from '../platforms/linear-integration';
import { SlackIntegration } from '../platforms/slack-integration';
import type { ChatIntegrationService, ChatInstance } from '../chat-integration.service';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { RichCardComponentType } from '@n8n/api-types';

const slack: AgentIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-a',
};

const linear: AgentIntegrationConfig = {
	type: 'linear',
	credentialId: 'cred-linear',
};

const telegram: AgentIntegrationConfig = {
	type: 'telegram',
	credentialId: 'cred-telegram',
};

class ShortCallbackTelegramIntegration extends AgentChatIntegration {
	readonly type = 'telegram';

	readonly credentialTypes = ['telegramApi'];

	readonly displayLabel = 'Telegram';

	readonly displayIcon = 'telegram';

	readonly supportedComponents: readonly RichCardComponentType[] = [
		'section',
		'button',
		'divider',
		'fields',
	];

	readonly needsShortCallbackData = true;

	async createAdapter(_ctx: AgentChatIntegrationContext): Promise<unknown> {
		return {};
	}
}

function buildRegistry(): ChatIntegrationRegistry {
	const registry = new ChatIntegrationRegistry();
	registry.register(new SlackIntegration());
	registry.register(new LinearIntegration(mock<Logger>(), mock<OutboundHttp>()));
	return registry;
}

describe('ChatIntegrationActionExecutor', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('posts channel messages through the selected integration connection and returns message context', async () => {
		const sentMessage = {
			id: '123.456',
			threadId: 'slack:C123:123.456',
		};
		const channel = {
			post: vi.fn().mockResolvedValue(sentMessage),
		};
		const sentThread = {
			subscribe: vi.fn().mockResolvedValue(undefined),
		};
		const chat = mock<ChatInstance>();
		chat.channel.mockReturnValue(channel as never);
		chat.thread.mockReturnValue(sentThread as never);

		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, buildRegistry());
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

	it('does not subscribe channel message threads for non-Slack integrations', async () => {
		const sentMessage = {
			id: 'linear-message-1',
		};
		const channel = {
			post: vi.fn().mockResolvedValue(sentMessage),
		};
		const chat = mock<ChatInstance>();
		chat.channel.mockReturnValue(channel as never);
		chat.thread.mockImplementation(() => {
			throw new Error('This integration does not support threads.');
		});

		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, buildRegistry());
		const descriptor = getIntegrationToolConnectionDescriptors([linear], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			action: 'send_channel_message',
			input: { channelId: 'team-1', message: { text: 'Hello channel' } },
			awaitResponse: false,
		});

		expect(chat.channel).toHaveBeenCalledWith('linear:team-1');
		expect(channel.post).toHaveBeenCalledWith('Hello channel');
		expect(chat.thread).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			ok: true,
			messageContext: {
				integrationConnectionId: 'linear:cred-linear',
				platform: 'linear',
				target: {
					type: 'channel',
					channelId: 'linear:team-1',
				},
				messageId: 'linear-message-1',
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
			post: vi.fn().mockResolvedValue(sentMessage),
			subscribe: vi.fn().mockResolvedValue(undefined),
		};
		const chat = mock<ChatInstance>();
		chat.openDM.mockResolvedValue(thread as never);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, buildRegistry());
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

	it('posts generic message card buttons with their labels', async () => {
		const sentMessage = {
			id: '123.456',
			threadId: 'slack:C123:123.456',
		};
		const thread = {
			post: vi.fn().mockResolvedValue(sentMessage),
			subscribe: vi.fn().mockResolvedValue(undefined),
		};
		const chat = mock<ChatInstance>();
		chat.thread.mockReturnValue(thread as never);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const registry = buildRegistry();
		Container.set(ChatIntegrationRegistry, registry);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, registry);
		const descriptor = getIntegrationToolConnectionDescriptors([slack], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			action: 'respond',
			input: {
				message: {
					text: 'Approve/Reject button demo',
					card: {
						title: 'Approve / Reject Demo',
						components: [
							{ type: 'section', text: 'Choose an action.' },
							{ type: 'button', label: 'Approve', value: 'approve', style: 'primary' },
							{ type: 'button', label: 'Reject', value: 'reject', style: 'danger' },
							{ type: 'button', label: 'Revise', value: 'revise' },
						],
					},
				},
			},
			awaitResponse: true,
			runId: 'run-1',
			toolCallId: 'tool-1',
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

		expect(result).toEqual(expect.objectContaining({ ok: true }));
		const postable = thread.post.mock.calls[0][0] as {
			card: { children: Array<{ type: string; children?: Array<{ label?: string }> }> };
		};
		const actions = postable.card.children.find((child) => child.type === 'actions');
		expect(actions?.children?.map((button) => button.label)).toEqual([
			'Approve',
			'Reject',
			'Revise',
		]);
	});

	it('shortens Telegram action card callback payloads before posting', async () => {
		const sentMessage = {
			id: 'telegram-message-1',
			threadId: 'telegram-thread-1',
		};
		const thread = {
			post: vi.fn().mockResolvedValue(sentMessage),
		};
		const chat = mock<ChatInstance>();
		chat.thread.mockReturnValue(thread as never);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const shortenCallback = vi.fn(async (_actionId: string, _value: string) => ({
			id: 'short1234',
			value: '',
		}));
		Object.assign(chatIntegrationService, {
			getShortenCallback: vi.fn().mockReturnValue(shortenCallback),
		});
		const registry = buildRegistry();
		registry.register(new ShortCallbackTelegramIntegration());
		Container.set(ChatIntegrationRegistry, registry);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, registry);
		const descriptor = getIntegrationToolConnectionDescriptors([telegram], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			action: 'respond',
			input: {
				message: {
					text: 'Telegram callback repro',
					card: {
						components: [
							{ type: 'section', text: 'Click Approve to continue.' },
							{ type: 'button', label: 'Approve', value: 'approve', style: 'primary' },
						],
					},
				},
			},
			awaitResponse: true,
			runId: 'run-1234567890',
			toolCallId: 'tool-call-1234567890',
			currentMessageContext: {
				integrationConnectionId: 'telegram:cred-telegram',
				platform: 'telegram',
				target: {
					type: 'thread',
					threadId: 'telegram-thread-1',
				},
				messageId: 'telegram-message-0',
				updatedAt: '2026-05-18T10:00:00.000Z',
			},
		});

		expect(result).toEqual(expect.objectContaining({ ok: true }));
		expect(chatIntegrationService.getShortenCallback).toHaveBeenCalledWith('agent-1', {
			type: 'telegram',
			credentialId: 'cred-telegram',
		});
		expect(shortenCallback).toHaveBeenCalledWith(
			'resume:run-1234567890:tool-call-1234567890:0',
			JSON.stringify({ type: 'button', value: 'approve' }),
		);
		expect(mockButton).toHaveBeenLastCalledWith({
			id: 'short1234',
			label: 'Approve',
			style: 'primary',
			value: '',
		});
	});

	it('adds Slack reactions to the current message context', async () => {
		const slackAdapter = {
			addReaction: vi.fn().mockResolvedValue(undefined),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue(slackAdapter);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, buildRegistry());
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
			addReaction: vi.fn().mockResolvedValue(undefined),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue(slackAdapter);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, buildRegistry());
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
			addReaction: vi.fn().mockResolvedValue(undefined),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue(slackAdapter);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, buildRegistry());
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
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, buildRegistry());
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

	it('creates Linear issues and returns issue message context', async () => {
		const issue = {
			id: 'issue-uuid',
			identifier: 'ENG-123',
			title: 'Fix signup',
			description: 'Signup fails for invited users',
			url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
			createdAt: new Date('2026-05-18T10:00:00.000Z'),
			updatedAt: new Date('2026-05-18T10:01:00.000Z'),
			state: Promise.resolve({ id: 'state-1', name: 'Todo', type: 'unstarted' }),
			assignee: Promise.resolve({
				id: 'user-1',
				name: 'Michael Drury',
				displayName: 'Michael',
				email: 'michael@example.com',
				active: true,
				app: false,
				isAssignable: true,
				isMentionable: true,
				url: 'https://linear.app/n8n/profiles/user-1',
			}),
			labels: vi.fn().mockResolvedValue({ nodes: [{ id: 'label-1', name: 'Bug' }] }),
		};
		const linearClient = {
			createIssue: vi.fn().mockResolvedValue({
				issue: Promise.resolve(issue),
				issueId: 'issue-uuid',
			}),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue({ client: linearClient });
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, buildRegistry());
		const descriptor = getIntegrationToolConnectionDescriptors([linear], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			action: 'create_issue',
			input: {
				teamId: 'team-1',
				title: 'Fix signup',
				description: 'Signup fails for invited users',
				assigneeId: 'user-1',
				projectId: 'project-1',
				labelIds: ['label-1'],
				priority: 2,
				stateId: 'state-1',
				parentId: 'parent-issue-1',
			},
			awaitResponse: false,
		});

		expect(linearClient.createIssue).toHaveBeenCalledWith({
			teamId: 'team-1',
			title: 'Fix signup',
			description: 'Signup fails for invited users',
			assigneeId: 'user-1',
			projectId: 'project-1',
			labelIds: ['label-1'],
			priority: 2,
			stateId: 'state-1',
			parentId: 'parent-issue-1',
		});
		expect(result).toEqual({
			ok: true,
			issue: {
				issueId: 'issue-uuid',
				identifier: 'ENG-123',
				title: 'Fix signup',
				description: 'Signup fails for invited users',
				url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
				state: { id: 'state-1', name: 'Todo', type: 'unstarted' },
				assignee: {
					userId: 'user-1',
					name: 'Michael Drury',
					displayName: 'Michael',
					email: 'michael@example.com',
					active: true,
					isBot: false,
					isAssignable: true,
					isMentionable: true,
					url: 'https://linear.app/n8n/profiles/user-1',
				},
				labels: [{ labelId: 'label-1', name: 'Bug' }],
				createdAt: '2026-05-18T10:00:00.000Z',
				updatedAt: '2026-05-18T10:01:00.000Z',
			},
			messageContext: {
				integrationConnectionId: 'linear:cred-linear',
				platform: 'linear',
				target: { type: 'thread', threadId: 'linear:issue-uuid' },
				subject: {
					type: 'issue',
					id: 'ENG-123',
					title: 'Fix signup',
					description: 'Signup fails for invited users',
					url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
					status: 'Todo',
					labels: ['Bug'],
					assignee: { id: 'user-1', name: 'Michael Drury' },
				},
				updatedAt: expect.any(String),
			},
		});
	});

	it('creates Linear comments and returns comment message context', async () => {
		const comment = {
			id: 'comment-1',
			body: 'I can reproduce this.',
			url: 'https://linear.app/n8n/issue/ENG-123#comment-1',
			createdAt: new Date('2026-05-18T10:02:00.000Z'),
			updatedAt: new Date('2026-05-18T10:03:00.000Z'),
			user: Promise.resolve({
				id: 'user-1',
				name: 'Michael Drury',
				displayName: 'Michael',
				email: 'michael@example.com',
				active: true,
				app: false,
			}),
		};
		const linearClient = {
			createComment: vi.fn().mockResolvedValue({
				comment: Promise.resolve(comment),
				commentId: 'comment-1',
			}),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue({ client: linearClient });
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, buildRegistry());
		const descriptor = getIntegrationToolConnectionDescriptors([linear], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			action: 'create_comment',
			input: {
				issueId: 'issue-uuid',
				body: 'I can reproduce this.',
				parentCommentId: 'parent-1',
			},
			awaitResponse: false,
		});

		expect(linearClient.createComment).toHaveBeenCalledWith({
			issueId: 'issue-uuid',
			body: 'I can reproduce this.',
			parentId: 'parent-1',
		});
		expect(result).toEqual({
			ok: true,
			comment: {
				commentId: 'comment-1',
				body: 'I can reproduce this.',
				url: 'https://linear.app/n8n/issue/ENG-123#comment-1',
				createdAt: '2026-05-18T10:02:00.000Z',
				updatedAt: '2026-05-18T10:03:00.000Z',
				author: {
					userId: 'user-1',
					name: 'Michael Drury',
					displayName: 'Michael',
					email: 'michael@example.com',
					active: true,
					isBot: false,
				},
			},
			messageContext: {
				integrationConnectionId: 'linear:cred-linear',
				platform: 'linear',
				target: { type: 'thread', threadId: 'linear:issue-uuid:c:parent-1' },
				messageId: 'comment-1',
				subject: { type: 'issue', id: 'issue-uuid' },
				updatedAt: expect.any(String),
			},
		});
	});

	it('updates Linear issues and returns updated issue message context', async () => {
		const issue = {
			id: 'issue-uuid',
			identifier: 'ENG-123',
			title: 'Updated signup fix',
			description: 'Updated description',
			url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
			updatedAt: new Date('2026-05-18T10:05:00.000Z'),
			state: Promise.resolve({ id: 'state-2', name: 'In Progress', type: 'started' }),
			labels: vi.fn().mockResolvedValue({ nodes: [{ id: 'label-2', name: 'Customer' }] }),
		};
		const linearClient = {
			updateIssue: vi.fn().mockResolvedValue({
				issue: Promise.resolve(issue),
			}),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue({ client: linearClient });
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, buildRegistry());
		const descriptor = getIntegrationToolConnectionDescriptors([linear], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			action: 'update_issue',
			input: {
				issueId: 'issue-uuid',
				title: 'Updated signup fix',
				description: null,
				assigneeId: null,
				projectId: 'project-1',
				labelIds: ['label-2'],
				priority: 3,
				stateId: 'state-2',
			},
			awaitResponse: false,
		});

		expect(linearClient.updateIssue).toHaveBeenCalledWith('issue-uuid', {
			title: 'Updated signup fix',
			description: null,
			assigneeId: null,
			projectId: 'project-1',
			labelIds: ['label-2'],
			priority: 3,
			stateId: 'state-2',
		});
		expect(result).toEqual({
			ok: true,
			issue: {
				issueId: 'issue-uuid',
				identifier: 'ENG-123',
				title: 'Updated signup fix',
				description: 'Updated description',
				url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
				state: { id: 'state-2', name: 'In Progress', type: 'started' },
				labels: [{ labelId: 'label-2', name: 'Customer' }],
				updatedAt: '2026-05-18T10:05:00.000Z',
			},
			messageContext: {
				integrationConnectionId: 'linear:cred-linear',
				platform: 'linear',
				target: { type: 'thread', threadId: 'linear:issue-uuid' },
				subject: {
					type: 'issue',
					id: 'ENG-123',
					title: 'Updated signup fix',
					description: 'Updated description',
					url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
					status: 'In Progress',
					labels: ['Customer'],
				},
				updatedAt: expect.any(String),
			},
		});
	});
});
