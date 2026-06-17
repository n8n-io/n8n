import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { ChatIntegrationRegistry } from '../agent-chat-integration';
import type { ChatIntegrationService, ChatInstance } from '../chat-integration.service';
import { ChatIntegrationContextQueryExecutor } from '../integration-context-query-executor';
import { getIntegrationToolConnectionDescriptors } from '../integration-tools';
import { LinearIntegration } from '../platforms/linear-integration';
import { SlackIntegration } from '../platforms/slack-integration';
import type { AgentIntegrationConfig } from '@n8n/api-types';

const slack: AgentIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-a',
};

const linear: AgentIntegrationConfig = {
	type: 'linear',
	credentialId: 'cred-b',
};

function buildRegistry(): ChatIntegrationRegistry {
	const registry = new ChatIntegrationRegistry();
	registry.register(new SlackIntegration());
	registry.register(new LinearIntegration(mock<Logger>()));
	return registry;
}

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
		const executor = new ChatIntegrationContextQueryExecutor(
			chatIntegrationService,
			buildRegistry(),
		);
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
		expect(usersList).toHaveBeenCalledWith({ limit: 10, token: 'xoxb-token' });
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
		const executor = new ChatIntegrationContextQueryExecutor(
			chatIntegrationService,
			buildRegistry(),
		);
		const descriptor = getIntegrationToolConnectionDescriptors([slack], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			query: 'search_channels',
			input: { query: '#product' },
		});

		expect(chat.getAdapter).toHaveBeenCalledWith('slack');
		expect(conversationsList).toHaveBeenCalledWith({
			exclude_archived: true,
			limit: 10,
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
		const executor = new ChatIntegrationContextQueryExecutor(
			chatIntegrationService,
			buildRegistry(),
		);
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
		const executor = new ChatIntegrationContextQueryExecutor(
			chatIntegrationService,
			buildRegistry(),
		);
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

	it('gets Linear teams and projects through the selected integration connection', async () => {
		const linearClient = {
			team: jest.fn().mockResolvedValue({
				id: 'team-1',
				key: 'ENG',
				name: 'Engineering',
				description: 'Product engineering',
				url: 'https://linear.app/n8n/team/ENG',
				private: false,
			}),
			project: jest.fn().mockResolvedValue({
				id: 'project-1',
				name: 'Signup',
				description: 'Signup improvements',
				url: 'https://linear.app/n8n/project/signup',
				state: 'started',
			}),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue({ client: linearClient });

		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationContextQueryExecutor(
			chatIntegrationService,
			buildRegistry(),
		);
		const descriptor = getIntegrationToolConnectionDescriptors([linear], 'agent-1')[0];

		await expect(
			executor.execute({ descriptor, query: 'get_team', input: { teamId: 'team-1' } }),
		).resolves.toEqual({
			ok: true,
			team: {
				teamId: 'team-1',
				key: 'ENG',
				name: 'Engineering',
				description: 'Product engineering',
				url: 'https://linear.app/n8n/team/ENG',
				isPrivate: false,
			},
		});
		await expect(
			executor.execute({
				descriptor,
				query: 'get_project',
				input: { projectId: 'project-1' },
			}),
		).resolves.toEqual({
			ok: true,
			project: {
				projectId: 'project-1',
				name: 'Signup',
				description: 'Signup improvements',
				url: 'https://linear.app/n8n/project/signup',
				state: 'started',
			},
		});

		expect(linearClient.team).toHaveBeenCalledWith('team-1');
		expect(linearClient.project).toHaveBeenCalledWith('project-1');
	});

	it('searches Linear teams, projects, labels, and issue states for setup context', async () => {
		const team = {
			projects: jest.fn().mockResolvedValue({
				nodes: [
					{
						id: 'project-1',
						name: 'Shopping List',
						description: 'Grocery errands',
						url: 'https://linear.app/n8n/project/shopping',
						state: 'started',
					},
					{
						id: 'project-2',
						name: 'Billing',
					},
				],
				pageInfo: { hasNextPage: true, endCursor: 'project-cursor' },
			}),
			labels: jest.fn().mockResolvedValue({
				nodes: [
					{ id: 'label-1', name: 'Shopping', color: '#00ff00', description: 'Grocery work' },
					{ id: 'label-2', name: 'Bug', color: '#ff0000' },
				],
			}),
			states: jest.fn().mockResolvedValue({
				nodes: [
					{ id: 'state-1', name: 'Todo', type: 'unstarted', color: '#cccccc', position: 1 },
					{
						id: 'state-2',
						name: 'In Progress',
						type: 'started',
						color: '#0000ff',
						position: 2,
					},
				],
			}),
		};
		const linearClient = {
			team: jest.fn().mockResolvedValue(team),
			teams: jest.fn().mockResolvedValue({
				nodes: [
					{
						id: 'team-1',
						key: 'SHOP',
						name: 'Shopping',
						description: 'Personal errands',
						url: 'https://linear.app/n8n/team/SHOP',
					},
					{ id: 'team-2', key: 'ENG', name: 'Engineering' },
				],
			}),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue({ client: linearClient });
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationContextQueryExecutor(
			chatIntegrationService,
			buildRegistry(),
		);
		const descriptor = getIntegrationToolConnectionDescriptors([linear], 'agent-1')[0];

		await expect(
			executor.execute({
				descriptor,
				query: 'search_teams',
				input: { query: 'shop', limit: 5, includeArchived: true },
			}),
		).resolves.toEqual({
			ok: true,
			teams: [
				{
					teamId: 'team-1',
					key: 'SHOP',
					name: 'Shopping',
					description: 'Personal errands',
					url: 'https://linear.app/n8n/team/SHOP',
				},
			],
			resultCount: 1,
		});

		await expect(
			executor.execute({
				descriptor,
				query: 'search_projects',
				input: { teamId: 'team-1', query: 'shopping', limit: 5 },
			}),
		).resolves.toMatchObject({
			ok: true,
			projects: [
				{
					projectId: 'project-1',
					name: 'Shopping List',
					description: 'Grocery errands',
					url: 'https://linear.app/n8n/project/shopping',
					state: 'started',
				},
			],
			resultCount: 1,
			nextCursor: 'project-cursor',
		});

		await expect(
			executor.execute({
				descriptor,
				query: 'search_labels',
				input: { teamId: 'team-1', query: 'shop' },
			}),
		).resolves.toEqual({
			ok: true,
			labels: [
				{
					labelId: 'label-1',
					name: 'Shopping',
					color: '#00ff00',
					description: 'Grocery work',
				},
			],
			resultCount: 1,
		});

		await expect(
			executor.execute({
				descriptor,
				query: 'search_issue_states',
				input: { teamId: 'team-1', type: 'started' },
			}),
		).resolves.toEqual({
			ok: true,
			states: [
				{
					stateId: 'state-2',
					name: 'In Progress',
					type: 'started',
					color: '#0000ff',
					position: 2,
				},
			],
			resultCount: 1,
		});

		expect(linearClient.teams).toHaveBeenCalledWith({
			first: 5,
			includeArchived: true,
		});
		expect(linearClient.team).toHaveBeenCalledWith('team-1');
		expect(team.projects).toHaveBeenCalledWith({ first: 5, includeArchived: false });
		expect(team.labels).toHaveBeenCalledWith({ first: 10 });
		expect(team.states).toHaveBeenCalledWith({ first: 10 });
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
		const executor = new ChatIntegrationContextQueryExecutor(
			chatIntegrationService,
			buildRegistry(),
		);
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
		const executor = new ChatIntegrationContextQueryExecutor(
			chatIntegrationService,
			buildRegistry(),
		);
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
		// search_issues returns a lean summary — only fields present on the
		// issue node itself, no awaited relations. Hydrating 50 search results
		// would otherwise issue 250+ Linear API calls. The LLM should call
		// get_issue on a specific match to fetch state/team/assignee/labels.
		expect(result).toEqual({
			ok: true,
			issues: [
				{
					issueId: 'issue-uuid',
					identifier: 'ENG-123',
					title: 'Fix signup',
					url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
					priority: { value: 2, label: 'High' },
					createdAt: '2026-05-18T10:00:00.000Z',
					updatedAt: '2026-05-18T11:00:00.000Z',
				},
			],
			resultCount: 1,
			totalCount: 1,
		});
	});

	it('paginates Linear issue search via cursor', async () => {
		const linearClient = {
			searchIssues: jest.fn().mockResolvedValue({
				totalCount: 120,
				nodes: [
					{
						id: 'issue-uuid',
						identifier: 'ENG-124',
						title: 'Add pagination',
						url: 'https://linear.app/n8n/issue/ENG-124',
					},
				],
				pageInfo: { hasNextPage: true, endCursor: 'cursor-page-2' },
			}),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue({ client: linearClient });
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationContextQueryExecutor(
			chatIntegrationService,
			buildRegistry(),
		);
		const descriptor = getIntegrationToolConnectionDescriptors([linear], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			query: 'search_issues',
			input: { query: 'pagination', cursor: 'cursor-page-1', limit: 1 },
		});

		expect(linearClient.searchIssues).toHaveBeenCalledWith('pagination', {
			first: 1,
			after: 'cursor-page-1',
			includeArchived: false,
		});
		expect(result).toMatchObject({
			ok: true,
			resultCount: 1,
			totalCount: 120,
			nextCursor: 'cursor-page-2',
		});
	});

	it('omits nextCursor when Linear reports no more pages', async () => {
		const linearClient = {
			searchIssues: jest.fn().mockResolvedValue({
				totalCount: 1,
				nodes: [
					{
						id: 'issue-uuid',
						identifier: 'ENG-200',
						title: 'Last result',
						url: 'https://linear.app/n8n/issue/ENG-200',
					},
				],
				pageInfo: { hasNextPage: false, endCursor: 'cursor-ignored' },
			}),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue({ client: linearClient });
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationContextQueryExecutor(
			chatIntegrationService,
			buildRegistry(),
		);
		const descriptor = getIntegrationToolConnectionDescriptors([linear], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			query: 'search_issues',
			input: { query: 'last' },
		});

		expect(result).not.toHaveProperty('nextCursor');
	});

	it('paginates Slack user search via cursor', async () => {
		const usersList = jest.fn().mockResolvedValue({
			members: [
				{
					id: 'U200',
					name: 'pageuser',
					real_name: 'Page User',
					profile: { display_name: 'Page', email: 'page@example.com' },
				},
			],
			response_metadata: { next_cursor: 'cursor-page-3' },
		});
		const slackAdapter = {
			client: { users: { list: usersList } },
			withToken: jest.fn(async (options: Record<string, unknown>) => options),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue(slackAdapter);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationContextQueryExecutor(
			chatIntegrationService,
			buildRegistry(),
		);
		const descriptor = getIntegrationToolConnectionDescriptors([slack], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			query: 'search_users',
			input: { query: 'page', cursor: 'cursor-page-2', limit: 1 },
		});

		expect(usersList).toHaveBeenCalledWith({ limit: 1, cursor: 'cursor-page-2' });
		expect(result).toMatchObject({ ok: true, nextCursor: 'cursor-page-3' });
	});

	it('paginates Slack channel search using the requested result limit', async () => {
		const conversationsList = jest.fn().mockResolvedValue({
			channels: [
				{
					id: 'C200',
					name: 'page-channel',
					is_archived: false,
					is_member: true,
					is_private: false,
				},
			],
			response_metadata: { next_cursor: 'channel-cursor-page-3' },
		});
		const slackAdapter = {
			client: { conversations: { list: conversationsList } },
			withToken: jest.fn(async (options: Record<string, unknown>) => options),
		};
		const chat = mock<ChatInstance>();
		chat.getAdapter.mockReturnValue(slackAdapter);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getChatInstance.mockReturnValue(chat);
		const executor = new ChatIntegrationContextQueryExecutor(
			chatIntegrationService,
			buildRegistry(),
		);
		const descriptor = getIntegrationToolConnectionDescriptors([slack], 'agent-1')[0];

		const result = await executor.execute({
			descriptor,
			query: 'search_channels',
			input: { query: 'page', cursor: 'channel-cursor-page-2', limit: 1 },
		});

		expect(conversationsList).toHaveBeenCalledWith({
			exclude_archived: true,
			limit: 1,
			types: 'public_channel,private_channel',
			cursor: 'channel-cursor-page-2',
		});
		expect(result).toMatchObject({ ok: true, nextCursor: 'channel-cursor-page-3' });
	});
});
