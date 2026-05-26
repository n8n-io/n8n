import { mock } from 'jest-mock-extended';

import type { ChatIntegrationService, ChatInstance } from '../chat-integration.service';
import { ChatIntegrationContextQueryExecutor } from '../integration-context-query-executor';
import { getIntegrationToolConnectionDescriptors } from '../integration-tools';
import type { AgentCredentialIntegrationConfig } from '@n8n/api-types';

const slack: AgentCredentialIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-a',
};

const linear: AgentCredentialIntegrationConfig = {
	type: 'linear',
	credentialId: 'cred-b',
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

	it('gets Linear users through the selected integration connection', async () => {
		const linearClient = {
			user: jest.fn().mockResolvedValue({
				id: 'user-1',
				name: 'Michael Drury',
				displayName: 'Michael',
				email: 'michael@example.com',
				avatarUrl: 'https://example.com/avatar.png',
				active: true,
				app: false,
				isAssignable: true,
				isMentionable: true,
				url: 'https://linear.app/n8n/profiles/user-1',
			}),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue({ client: linearClient });

		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationContextQueryExecutor(chatIntegrationService);
		const descriptor = getIntegrationToolConnectionDescriptors([linear], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			query: 'get_user',
			input: { userId: 'user-1' },
		});

		expect(chatIntegrationService.getChatInstance).toHaveBeenCalledWith('agent-1', {
			type: 'linear',
			credentialId: 'cred-b',
		});
		expect(chat.getAdapter).toHaveBeenCalledWith('linear');
		expect(linearClient.user).toHaveBeenCalledWith('user-1');
		expect(result).toEqual({
			ok: true,
			user: {
				userId: 'user-1',
				name: 'Michael Drury',
				displayName: 'Michael',
				email: 'michael@example.com',
				avatarUrl: 'https://example.com/avatar.png',
				active: true,
				isBot: false,
				isAssignable: true,
				isMentionable: true,
				url: 'https://linear.app/n8n/profiles/user-1',
			},
		});
	});

	it('searches Linear users by query through the selected integration connection', async () => {
		const linearClient = {
			users: jest.fn().mockResolvedValue({
				nodes: [
					{
						id: 'user-1',
						name: 'Michael Drury',
						displayName: 'Michael',
						email: 'michael@example.com',
						active: true,
						app: false,
						isAssignable: true,
						isMentionable: true,
						url: 'https://linear.app/n8n/profiles/user-1',
					},
				],
				pageInfo: { hasNextPage: false },
			}),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue({ client: linearClient });

		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationContextQueryExecutor(chatIntegrationService);
		const descriptor = getIntegrationToolConnectionDescriptors([linear], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			query: 'search_users',
			input: { query: 'Michael', limit: 5 },
		});

		expect(linearClient.users).toHaveBeenCalledWith({
			filter: {
				and: [
					{
						or: [
							{ name: { containsIgnoreCase: 'Michael' } },
							{ displayName: { containsIgnoreCase: 'Michael' } },
							{ email: { containsIgnoreCase: 'Michael' } },
						],
					},
					{ app: { eq: false } },
				],
			},
			first: 5,
			includeArchived: false,
			includeDisabled: false,
		});
		expect(result).toEqual({
			ok: true,
			users: [
				expect.objectContaining({
					userId: 'user-1',
					name: 'Michael Drury',
					displayName: 'Michael',
					email: 'michael@example.com',
				}),
			],
			resultCount: 1,
		});
	});

	it('gets Linear issues with optional recent comments', async () => {
		const createdAt = new Date('2026-05-18T10:00:00.000Z');
		const updatedAt = new Date('2026-05-18T11:00:00.000Z');
		const commentAuthor = {
			id: 'user-2',
			name: 'Ada Lovelace',
			displayName: 'Ada',
			email: 'ada@example.com',
			active: true,
			app: false,
			isAssignable: true,
			isMentionable: true,
			url: 'https://linear.app/n8n/profiles/user-2',
		};
		const issue = {
			id: 'issue-uuid',
			identifier: 'ENG-123',
			title: 'Fix signup',
			description: 'Signup fails for invited users',
			url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
			priority: 2,
			priorityLabel: 'High',
			createdAt,
			updatedAt,
			state: Promise.resolve({ id: 'state-1', name: 'In Progress', type: 'started' }),
			assignee: Promise.resolve(commentAuthor),
			creator: Promise.resolve(commentAuthor),
			team: Promise.resolve({ id: 'team-1', key: 'ENG', name: 'Engineering' }),
			project: Promise.resolve({ id: 'project-1', name: 'Signup' }),
			labels: jest.fn().mockResolvedValue({ nodes: [{ id: 'label-1', name: 'Bug' }] }),
			comments: jest.fn().mockResolvedValue({
				nodes: [
					{
						id: 'comment-1',
						body: 'I can reproduce this.',
						url: 'https://linear.app/n8n/issue/ENG-123#comment-1',
						createdAt,
						updatedAt,
						user: Promise.resolve(commentAuthor),
					},
				],
			}),
		};
		const linearClient = {
			issue: jest.fn().mockResolvedValue(issue),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue({ client: linearClient });

		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationContextQueryExecutor(chatIntegrationService);
		const descriptor = getIntegrationToolConnectionDescriptors([linear], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			query: 'get_issue',
			input: { issueId: 'ENG-123', includeComments: true, commentsLimit: 3 },
		});

		expect(linearClient.issue).toHaveBeenCalledWith('ENG-123');
		expect(issue.comments).toHaveBeenCalledWith({ first: 3 });
		expect(result).toEqual({
			ok: true,
			issue: {
				issueId: 'issue-uuid',
				identifier: 'ENG-123',
				title: 'Fix signup',
				description: 'Signup fails for invited users',
				url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
				priority: { value: 2, label: 'High' },
				state: { id: 'state-1', name: 'In Progress', type: 'started' },
				assignee: expect.objectContaining({ userId: 'user-2', name: 'Ada Lovelace' }),
				creator: expect.objectContaining({ userId: 'user-2', name: 'Ada Lovelace' }),
				team: { teamId: 'team-1', key: 'ENG', name: 'Engineering' },
				project: { projectId: 'project-1', name: 'Signup' },
				labels: [{ labelId: 'label-1', name: 'Bug' }],
				createdAt: '2026-05-18T10:00:00.000Z',
				updatedAt: '2026-05-18T11:00:00.000Z',
				comments: [
					{
						commentId: 'comment-1',
						body: 'I can reproduce this.',
						url: 'https://linear.app/n8n/issue/ENG-123#comment-1',
						createdAt: '2026-05-18T10:00:00.000Z',
						updatedAt: '2026-05-18T11:00:00.000Z',
						author: expect.objectContaining({ userId: 'user-2', name: 'Ada Lovelace' }),
					},
				],
			},
		});
	});

	it('searches Linear issues through the selected integration connection', async () => {
		const linearClient = {
			searchIssues: jest.fn().mockResolvedValue({
				totalCount: 1,
				nodes: [
					{
						id: 'issue-uuid',
						identifier: 'ENG-123',
						title: 'Fix signup',
						description: 'Signup fails for invited users',
						url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
						priority: 2,
						priorityLabel: 'High',
						createdAt: new Date('2026-05-18T10:00:00.000Z'),
						updatedAt: new Date('2026-05-18T11:00:00.000Z'),
						state: Promise.resolve({ id: 'state-1', name: 'In Progress', type: 'started' }),
						assignee: Promise.resolve(undefined),
						creator: Promise.resolve(undefined),
						team: Promise.resolve({ id: 'team-1', key: 'ENG', name: 'Engineering' }),
						project: Promise.resolve(undefined),
						labels: jest.fn().mockResolvedValue({ nodes: [] }),
					},
				],
			}),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue({ client: linearClient });

		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationContextQueryExecutor(chatIntegrationService);
		const descriptor = getIntegrationToolConnectionDescriptors([linear], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			query: 'search_issues',
			input: { query: 'signup', teamId: 'team-1', includeArchived: true, limit: 5 },
		});

		expect(linearClient.searchIssues).toHaveBeenCalledWith('signup', {
			first: 5,
			teamId: 'team-1',
			includeArchived: true,
		});
		expect(result).toEqual({
			ok: true,
			issues: [
				expect.objectContaining({
					issueId: 'issue-uuid',
					identifier: 'ENG-123',
					title: 'Fix signup',
					team: { teamId: 'team-1', key: 'ENG', name: 'Engineering' },
				}),
			],
			resultCount: 1,
			totalCount: 1,
		});
	});
});
