import { zodToJsonSchema, type InterruptibleToolContext } from '@n8n/agents';
import { mock } from 'jest-mock-extended';
import type { z } from 'zod';

import {
	createIntegrationActionTool,
	createIntegrationContextTool,
	getIntegrationToolConnectionDescriptors,
	type IntegrationActionExecutor,
	type IntegrationContextQueryExecutor,
	type IntegrationMessageContextStore,
} from '../integration-tools';
import type { AgentIntegrationConfig } from '@n8n/api-types';

const slackA: AgentIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-a',
};

const slackB: AgentIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-b',
};

const linear: AgentIntegrationConfig = {
	type: 'linear',
	credentialId: 'cred-c',
};

function makeInterruptibleCtx(
	overrides: Partial<InterruptibleToolContext> = {},
): InterruptibleToolContext {
	return {
		resumeData: undefined,
		suspend: jest.fn().mockResolvedValue(undefined as never),
		runId: 'run-1',
		toolCallId: 'tool-1',
		persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		...overrides,
	};
}

describe('integration tools', () => {
	it('generates canonical names for first connection and 2-based suffixes for duplicates', () => {
		const descriptors = getIntegrationToolConnectionDescriptors([slackB, linear, slackA]);

		expect(descriptors.map((descriptor) => descriptor.contextToolName)).toEqual([
			'linear_context',
			'slack_context',
			'slack_2_context',
		]);
		expect(descriptors.map((descriptor) => descriptor.actionToolName)).toEqual([
			'linear_action',
			'slack_action',
			'slack_2_action',
		]);
		expect(descriptors.map((descriptor) => descriptor.integration.credentialId)).toEqual([
			'cred-c',
			'cred-a',
			'cred-b',
		]);
	});

	it('context tool returns the latest message context for its integration connection', async () => {
		const messageContextStore = mock<IntegrationMessageContextStore>();
		messageContextStore.getLatest.mockResolvedValue({
			integrationConnectionId: 'slack:cred-a',
			platform: 'slack',
			target: { type: 'thread', threadId: 'slack:C123:123.456' },
			messageId: '123.456',
			updatedAt: '2026-05-18T10:00:00.000Z',
		});
		const queryExecutor = mock<IntegrationContextQueryExecutor>();

		const tool = createIntegrationContextTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore,
			queryExecutor,
		}).build();

		const result = await tool.handler!(
			{ query: 'get_current_message_context', input: {} },
			{ persistence: { threadId: 'thread-1', resourceId: 'resource-1' } },
		);

		expect(result).toEqual({
			ok: true,
			context: {
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				target: { type: 'thread', threadId: 'slack:C123:123.456' },
				messageId: '123.456',
				updatedAt: '2026-05-18T10:00:00.000Z',
			},
		});
		expect(queryExecutor.execute).not.toHaveBeenCalled();
	});

	it('context tool returns the current message subject when available', async () => {
		const messageContextStore = mock<IntegrationMessageContextStore>();
		messageContextStore.getLatest.mockResolvedValue({
			integrationConnectionId: 'linear:cred-c',
			platform: 'linear',
			target: { type: 'thread', threadId: 'linear:issue-comment-1' },
			messageId: 'comment-1',
			subject: {
				type: 'issue',
				id: 'ENG-123',
				title: 'Fix signup',
				description: 'Signup fails for invited users',
				status: 'In Progress',
				url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
				labels: ['Bug'],
				assignee: { id: 'user-1', name: 'Michael Drury' },
				author: { id: 'user-2', name: 'Ada Lovelace' },
			},
			updatedAt: '2026-05-18T10:00:00.000Z',
		});
		const queryExecutor = mock<IntegrationContextQueryExecutor>();

		const tool = createIntegrationContextTool({
			descriptor: getIntegrationToolConnectionDescriptors([linear])[0],
			messageContextStore,
			queryExecutor,
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(schema.safeParse({ query: 'get_current_subject', input: {} }).success).toBe(true);
		expect(tool.description).toContain('get_current_subject: no input');

		const result = await tool.handler!(
			{ query: 'get_current_subject', input: {} },
			{ persistence: { threadId: 'thread-1', resourceId: 'resource-1' } },
		);

		expect(result).toEqual({
			ok: true,
			subject: {
				type: 'issue',
				id: 'ENG-123',
				title: 'Fix signup',
				description: 'Signup fails for invited users',
				status: 'In Progress',
				url: 'https://linear.app/n8n/issue/ENG-123/fix-signup',
				labels: ['Bug'],
				assignee: { id: 'user-1', name: 'Michael Drury' },
				author: { id: 'user-2', name: 'Ada Lovelace' },
			},
		});
		expect(queryExecutor.execute).not.toHaveBeenCalled();
	});

	it('context tool schema requires platform IDs for user and channel lookups', () => {
		const tool = createIntegrationContextTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			queryExecutor: mock<IntegrationContextQueryExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(schema.safeParse({ query: 'get_user', input: { name: 'Michael Drury' } }).success).toBe(
			false,
		);
		expect(schema.safeParse({ query: 'get_user', input: { userId: 'U123' } }).success).toBe(true);
		expect(
			schema.safeParse({ query: 'get_channel_info', input: { name: '#support' } }).success,
		).toBe(false);
		expect(
			schema.safeParse({ query: 'get_channel_info', input: { channelId: 'C123' } }).success,
		).toBe(true);
		expect(tool.description).toContain('get_user: input.userId');
		expect(tool.description).toContain('get_channel_info: input.channelId');
	});

	it('context tool schema accepts search queries for users and channels', () => {
		const tool = createIntegrationContextTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA], 'agent-1', () => ({
				contextQueries: [
					'get_current_message_context',
					'get_current_user',
					'get_current_channel_info',
					'get_user',
					'get_channel_info',
					'search_users',
					'search_channels',
				],
			}))[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			queryExecutor: mock<IntegrationContextQueryExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(
			schema.safeParse({ query: 'search_users', input: { query: 'Michael Drury' } }).success,
		).toBe(true);
		expect(
			schema.safeParse({ query: 'search_users', input: { email: 'michael@example.com' } }).success,
		).toBe(true);
		expect(schema.safeParse({ query: 'search_users', input: {} }).success).toBe(false);
		expect(
			schema.safeParse({ query: 'search_channels', input: { query: '#product' } }).success,
		).toBe(true);
		expect(schema.safeParse({ query: 'search_channels', input: {} }).success).toBe(false);
		expect(tool.description).toContain('search_users: input.query or input.email');
		expect(tool.description).toContain('search_channels: input.query');
	});

	it('context tool schema accepts Linear resource lookup and search queries', () => {
		const tool = createIntegrationContextTool({
			descriptor: getIntegrationToolConnectionDescriptors([linear], 'agent-1', () => ({
				contextQueries: [
					'get_current_message_context',
					'get_current_subject',
					'get_current_user',
					'get_user',
					'search_users',
					'get_team',
					'search_teams',
					'get_project',
					'search_projects',
					'search_labels',
					'search_issue_states',
					'get_issue',
					'search_issues',
				],
			}))[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			queryExecutor: mock<IntegrationContextQueryExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(schema.safeParse({ query: 'get_issue', input: { issueId: 'ENG-123' } }).success).toBe(
			true,
		);
		expect(
			schema.safeParse({
				query: 'get_issue',
				input: { issueId: 'ENG-123', includeComments: true, commentsLimit: 5 },
			}).success,
		).toBe(true);
		expect(schema.safeParse({ query: 'get_issue', input: {} }).success).toBe(false);
		expect(
			schema.safeParse({ query: 'search_issues', input: { query: 'signup bug' } }).success,
		).toBe(true);
		expect(
			schema.safeParse({
				query: 'search_issues',
				input: { query: 'signup bug', teamId: 'team-1', includeArchived: true, limit: 5 },
			}).success,
		).toBe(true);
		expect(schema.safeParse({ query: 'search_issues', input: {} }).success).toBe(false);
		expect(schema.safeParse({ query: 'get_team', input: { teamId: 'team-1' } }).success).toBe(true);
		expect(schema.safeParse({ query: 'get_team', input: {} }).success).toBe(false);
		expect(schema.safeParse({ query: 'search_teams', input: {} }).success).toBe(true);
		expect(
			schema.safeParse({
				query: 'get_project',
				input: { projectId: 'project-1' },
			}).success,
		).toBe(true);
		expect(schema.safeParse({ query: 'get_project', input: {} }).success).toBe(false);
		expect(
			schema.safeParse({
				query: 'search_projects',
				input: { query: 'signup', teamId: 'team-1', includeArchived: true },
			}).success,
		).toBe(true);
		expect(schema.safeParse({ query: 'search_projects', input: {} }).success).toBe(true);
		expect(
			schema.safeParse({ query: 'search_labels', input: { query: 'bug', teamId: 'team-1' } })
				.success,
		).toBe(true);
		expect(schema.safeParse({ query: 'search_labels', input: {} }).success).toBe(true);
		expect(
			schema.safeParse({
				query: 'search_issue_states',
				input: { query: 'progress', teamId: 'team-1', type: 'started' },
			}).success,
		).toBe(true);
		expect(schema.safeParse({ query: 'search_issue_states', input: {} }).success).toBe(true);
		expect(tool.description).toContain('get_issue: input.issueId');
		expect(tool.description).toContain('search_issues: input.query');
		expect(tool.description).toContain('search_teams: optional input.query');
		expect(tool.description).toContain('search_projects: optional input.query');
		expect(tool.description).toContain('search_labels: optional input.query');
		expect(tool.description).toContain('search_issue_states: optional input.query');
	});

	it('context tool executes multiple queries in one batch', async () => {
		const queryExecutor = mock<IntegrationContextQueryExecutor>();
		queryExecutor.execute
			.mockResolvedValueOnce({
				ok: true,
				teams: [{ teamId: 'team-1', key: 'ENG', name: 'Engineering' }],
			})
			.mockResolvedValueOnce({
				ok: true,
				labels: [{ labelId: 'label-1', name: 'Bug' }],
			});

		const tool = createIntegrationContextTool({
			descriptor: getIntegrationToolConnectionDescriptors([linear], 'agent-1', () => ({
				contextQueries: ['search_teams', 'search_labels'],
			}))[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			queryExecutor,
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		const input = {
			queries: [
				{ query: 'search_teams', input: { query: 'eng' } },
				{ query: 'search_labels', input: { query: 'bug' } },
			],
		};

		expect(schema.safeParse(input).success).toBe(true);

		const result = await tool.handler!(input, {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});

		expect(result).toEqual({
			ok: true,
			results: [
				{
					query: 'search_teams',
					result: {
						ok: true,
						teams: [{ teamId: 'team-1', key: 'ENG', name: 'Engineering' }],
					},
				},
				{
					query: 'search_labels',
					result: { ok: true, labels: [{ labelId: 'label-1', name: 'Bug' }] },
				},
			],
		});
		expect(queryExecutor.execute).toHaveBeenNthCalledWith(1, {
			descriptor: expect.any(Object),
			query: 'search_teams',
			input: { query: 'eng' },
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});
		expect(queryExecutor.execute).toHaveBeenNthCalledWith(2, {
			descriptor: expect.any(Object),
			query: 'search_labels',
			input: { query: 'bug' },
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});
	});

	it('integration tool schemas convert to JSON Schema objects for model providers', () => {
		const descriptor = getIntegrationToolConnectionDescriptors([slackA], 'agent-1', () => ({
			contextQueries: [
				'get_current_message_context',
				'get_current_user',
				'get_current_channel_info',
				'get_user',
				'get_channel_info',
				'search_users',
				'search_channels',
			],
		}))[0];

		const contextTool = createIntegrationContextTool({
			descriptor,
			messageContextStore: mock<IntegrationMessageContextStore>(),
			queryExecutor: mock<IntegrationContextQueryExecutor>(),
		}).build();
		const actionTool = createIntegrationActionTool({
			descriptor,
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();

		expect(zodToJsonSchema(contextTool.inputSchema)).toMatchObject({ type: 'object' });
		expect(zodToJsonSchema(actionTool.inputSchema)).toMatchObject({ type: 'object' });
	});

	it('respond returns a structured error when no latest message context exists', async () => {
		const messageContextStore = mock<IntegrationMessageContextStore>();
		messageContextStore.getLatest.mockResolvedValue(null);
		const actionExecutor = mock<IntegrationActionExecutor>();

		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore,
			actionExecutor,
		}).build();

		const result = await tool.handler!(
			{ action: 'respond', input: { message: { text: 'Hello' } } },
			makeInterruptibleCtx(),
		);

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'NO_MESSAGE_CONTEXT',
				message: 'There is no current message context. Use an explicit send action.',
			},
		});
		expect(actionExecutor.execute).not.toHaveBeenCalled();
	});

	it('action tool schema requires platform IDs for explicit user and channel targets', () => {
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(
			schema.safeParse({
				action: 'send_dm',
				input: { name: 'Michael Drury', message: { text: 'Hello' } },
			}).success,
		).toBe(false);
		expect(
			schema.safeParse({
				action: 'send_dm',
				input: { userId: 'U123', message: { text: 'Hello' } },
			}).success,
		).toBe(true);
		expect(
			schema.safeParse({
				action: 'send_channel_message',
				input: { name: '#support', message: { text: 'Hello' } },
			}).success,
		).toBe(false);
		expect(
			schema.safeParse({
				action: 'send_channel_message',
				input: { channelId: 'C123', message: { text: 'Hello' } },
			}).success,
		).toBe(true);
		expect(tool.description).toContain('send_dm: input.userId');
		expect(tool.description).toContain('send_channel_message: input.channelId');
		expect(tool.description).toContain('Use message.card for cards');
		expect(tool.description).toContain('type: "radio_select"');
		expect(tool.description).toContain('For radio-style choices');
		expect(tool.description).toContain('Do not provide platform-native component payloads');
		expect(tool.description).toContain('Generic card examples');
		expect(tool.description).toContain('"card": {');
		expect(tool.description).toContain('"type": "radio_select"');
		expect(tool.description).toContain('"type": "button"');
		expect(tool.description).toContain('Never send message.blocks');
		expect(tool.description).toContain('radio_buttons');
		expect(tool.description).toContain('action_id');
	});

	it('action tool schema rejects platform-shaped text objects in message cards', () => {
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(
			schema.safeParse({
				action: 'respond',
				input: {
					message: {
						card: {
							title: 'Approve / Reject Demo',
							components: [
								{ type: 'section', text: 'Choose an action.' },
								{
									type: 'button',
									text: { format: 'native', text: 'Approve' },
									style: 'primary',
									value: 'approve',
								},
								{
									type: 'button',
									text: { format: 'native', text: 'Reject' },
									style: 'danger',
									value: 'reject',
								},
							],
						},
					},
				},
			}).success,
		).toBe(false);
	});

	it('action tool schema rejects unsupported card component types', () => {
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(
			schema.safeParse({
				action: 'respond',
				input: {
					message: {
						card: {
							components: [
								{
									type: 'actions',
									elements: [{ type: 'button', label: 'Approve', value: 'approve' }],
								},
							],
						},
					},
				},
			}).success,
		).toBe(false);
	});

	it('action tool schema rejects platform-shaped component keys', () => {
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(
			schema.safeParse({
				action: 'respond',
				input: {
					message: {
						card: {
							components: [
								{
									type: 'button',
									label: 'Approve',
									value: 'approve',
									action_id: 'approve',
								},
							],
						},
					},
				},
			}).success,
		).toBe(false);
	});

	it('action tool schema accepts default button style in message cards', () => {
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(
			schema.safeParse({
				action: 'respond',
				input: {
					message: {
						card: {
							components: [
								{
									type: 'button',
									label: 'Approve',
									value: 'approve',
									style: 'default',
								},
							],
						},
					},
				},
			}).success,
		).toBe(true);
	});

	it('action tool schema rejects empty fields components in message cards', () => {
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(
			schema.safeParse({
				action: 'respond',
				input: {
					message: {
						card: {
							components: [{ type: 'fields' }],
						},
					},
				},
			}).success,
		).toBe(false);
	});

	it('action tool schema preserves fields item aliases in message cards', () => {
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		const result = schema.safeParse({
			action: 'respond',
			input: {
				message: {
					card: {
						components: [
							{
								type: 'fields',
								items: [{ label: 'Account', value: 'Acme Corporation' }],
							},
						],
					},
				},
			},
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		const parsed = result.data as {
			input: {
				message: {
					card: {
						components: Array<{ items?: Array<{ label: string; value: string }> }>;
					};
				};
			};
		};
		expect(parsed.input.message.card.components[0].items).toEqual([
			{ label: 'Account', value: 'Acme Corporation' },
		]);
	});

	it('action tool schema rejects unknown message payload keys', () => {
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(
			schema.safeParse({
				action: 'respond',
				input: {
					message: {
						text: 'Approve or reject',
						platformPayload: [{ type: 'native' }],
					},
				},
			}).success,
		).toBe(false);
	});

	it('action tool schema accepts Slack emoji reaction actions', () => {
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA], 'agent-1', () => ({
				actions: ['respond', 'send_dm', 'send_channel_message', 'add_reaction'],
			}))[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(schema.safeParse({ action: 'add_reaction', input: { emoji: 'eyes' } }).success).toBe(
			true,
		);
		expect(
			schema.safeParse({
				action: 'add_reaction',
				input: {
					emoji: ':white_check_mark:',
					threadId: 'slack:C123:123.456',
					messageId: '123.456',
				},
			}).success,
		).toBe(true);
		expect(schema.safeParse({ action: 'add_reaction', input: {} }).success).toBe(false);
		expect(tool.description).toContain('add_reaction: input.emoji is required');
	});

	it('action tool schema accepts Linear issue and comment actions', () => {
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([linear], 'agent-1', () => ({
				actions: ['respond', 'create_issue', 'update_issue', 'create_comment'],
			}))[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(
			schema.safeParse({
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
			}).success,
		).toBe(true);
		expect(
			schema.safeParse({ action: 'create_issue', input: { title: 'Missing team' } }).success,
		).toBe(false);
		expect(
			schema.safeParse({
				action: 'update_issue',
				input: {
					issueId: 'issue-1',
					title: 'Updated title',
					description: null,
					assigneeId: null,
					projectId: 'project-1',
					labelIds: ['label-1'],
					priority: 3,
					stateId: 'state-1',
				},
			}).success,
		).toBe(true);
		expect(
			schema.safeParse({ action: 'update_issue', input: { issueId: 'issue-1' } }).success,
		).toBe(false);
		expect(
			schema.safeParse({
				action: 'create_comment',
				input: { issueId: 'issue-1', body: 'I can reproduce this.', parentCommentId: 'comment-1' },
			}).success,
		).toBe(true);
		expect(
			schema.safeParse({ action: 'create_comment', input: { issueId: 'issue-1' } }).success,
		).toBe(false);
		expect(tool.description).toContain('create_issue: input.teamId and input.title');
		expect(tool.description).toContain('update_issue: input.issueId');
		expect(tool.description).toContain('create_comment: input.issueId and input.body');
	});

	it('action tool executes multiple non-interactive actions in one batch', async () => {
		const messageContextStore = mock<IntegrationMessageContextStore>();
		const actionExecutor = mock<IntegrationActionExecutor>();
		actionExecutor.execute
			.mockResolvedValueOnce({
				ok: true,
				issue: { issueId: 'issue-1', title: 'Buy milk' },
				messageContext: {
					integrationConnectionId: 'linear:cred-c',
					platform: 'linear',
					target: { type: 'thread', threadId: 'linear:issue-1' },
					subject: { type: 'issue', id: 'issue-1', title: 'Buy milk' },
					updatedAt: '2026-05-18T10:00:00.000Z',
				},
			})
			.mockResolvedValueOnce({
				ok: true,
				comment: { commentId: 'comment-1', body: 'Created from agent' },
				messageContext: {
					integrationConnectionId: 'linear:cred-c',
					platform: 'linear',
					target: { type: 'thread', threadId: 'linear:issue-1' },
					messageId: 'comment-1',
					updatedAt: '2026-05-18T10:01:00.000Z',
				},
			});

		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([linear], 'agent-1', () => ({
				actions: ['create_issue', 'create_comment'],
			}))[0],
			messageContextStore,
			actionExecutor,
		}).build();
		const schema = tool.inputSchema as z.ZodType;
		const input = {
			actions: [
				{ action: 'create_issue', input: { teamId: 'team-1', title: 'Buy milk' } },
				{ action: 'create_comment', input: { issueId: 'issue-1', body: 'Created from agent' } },
			],
		};

		expect(schema.safeParse(input).success).toBe(true);

		const result = await tool.handler!(input, makeInterruptibleCtx());

		expect(result).toEqual({
			ok: true,
			results: [
				expect.objectContaining({
					action: 'create_issue',
					result: expect.objectContaining({
						ok: true,
						issue: { issueId: 'issue-1', title: 'Buy milk' },
					}),
				}),
				expect.objectContaining({
					action: 'create_comment',
					result: expect.objectContaining({
						ok: true,
						comment: { commentId: 'comment-1', body: 'Created from agent' },
						messageContext: expect.objectContaining({
							subject: { type: 'issue', id: 'issue-1', title: 'Buy milk' },
						}),
					}),
				}),
			],
		});
		expect(actionExecutor.execute).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ action: 'create_issue', awaitResponse: false }),
		);
		expect(actionExecutor.execute).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				action: 'create_comment',
				awaitResponse: false,
				currentMessageContext: expect.objectContaining({
					subject: { type: 'issue', id: 'issue-1', title: 'Buy milk' },
				}),
			}),
		);
		expect(messageContextStore.setLatest).toHaveBeenCalledTimes(2);
	});

	it('interactive action sends first, updates message context, then suspends', async () => {
		const messageContextStore = mock<IntegrationMessageContextStore>();
		const actionExecutor = mock<IntegrationActionExecutor>();
		actionExecutor.execute.mockResolvedValue({
			ok: true,
			messageContext: {
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				target: { type: 'channel', channelId: 'slack:C123', threadId: 'slack:C123:123.456' },
				messageId: '123.456',
				updatedAt: '2026-05-18T10:00:00.000Z',
			},
		});
		const ctx = makeInterruptibleCtx();

		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore,
			actionExecutor,
		}).build();

		await tool.handler!(
			{
				action: 'send_channel_message',
				input: {
					channelId: 'slack:C123',
					message: {
						text: 'Choose',
						card: {
							components: [{ type: 'button', label: 'Approve', value: 'approve' }],
						},
					},
				},
			},
			ctx,
		);

		expect(actionExecutor.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'send_channel_message',
				runId: 'run-1',
				toolCallId: 'tool-1',
				awaitResponse: true,
			}),
		);
		expect(messageContextStore.setLatest).toHaveBeenCalledWith(
			'thread-1',
			'resource-1',
			expect.objectContaining({
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				messageId: '123.456',
			}),
		);
		expect(ctx.suspend).toHaveBeenCalledWith({
			type: 'integration_action',
			action: 'send_channel_message',
			integrationConnectionId: 'slack:cred-a',
			messageContext: expect.objectContaining({
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				messageId: '123.456',
			}),
		});
	});

	it('section accessory button sends first, updates message context, then suspends', async () => {
		const messageContextStore = mock<IntegrationMessageContextStore>();
		messageContextStore.getLatest.mockResolvedValue({
			integrationConnectionId: 'slack:cred-a',
			platform: 'slack',
			target: { type: 'thread', threadId: 'slack:C123:123.456', channelId: 'slack:C123' },
			messageId: '123.456',
			updatedAt: '2026-05-18T10:00:00.000Z',
		});
		const actionExecutor = mock<IntegrationActionExecutor>();
		actionExecutor.execute.mockResolvedValue({
			ok: true,
			messageContext: {
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				target: { type: 'thread', threadId: 'slack:C123:123.456', channelId: 'slack:C123' },
				messageId: '123.789',
				updatedAt: '2026-05-18T10:01:00.000Z',
			},
		});
		const ctx = makeInterruptibleCtx();

		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore,
			actionExecutor,
		}).build();

		await tool.handler!(
			{
				action: 'respond',
				input: {
					message: {
						text: 'Section button repro',
						card: {
							title: 'Section button repro',
							components: [
								{
									type: 'section',
									text: 'Click the accessory button below.',
									button: { label: 'Approve', value: 'approve', style: 'primary' },
								},
							],
						},
					},
				},
			},
			ctx,
		);

		expect(actionExecutor.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'respond',
				runId: 'run-1',
				toolCallId: 'tool-1',
				awaitResponse: true,
			}),
		);
		expect(messageContextStore.setLatest).toHaveBeenCalledWith(
			'thread-1',
			'resource-1',
			expect.objectContaining({
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				messageId: '123.789',
			}),
		);
		expect(ctx.suspend).toHaveBeenCalledWith({
			type: 'integration_action',
			action: 'respond',
			integrationConnectionId: 'slack:cred-a',
			messageContext: expect.objectContaining({
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				messageId: '123.789',
			}),
		});
	});

	it('action tool preserves the current subject when updating message context', async () => {
		const messageContextStore = mock<IntegrationMessageContextStore>();
		messageContextStore.getLatest.mockResolvedValue({
			integrationConnectionId: 'slack:cred-a',
			platform: 'slack',
			target: { type: 'thread', threadId: 'slack:C123:123.456', channelId: 'slack:C123' },
			messageId: '123.456',
			agentUserId: 'U_BOT',
			subject: {
				type: 'issue',
				id: 'ENG-123',
				title: 'Fix signup',
			},
			updatedAt: '2026-05-18T10:00:00.000Z',
		});
		const actionExecutor = mock<IntegrationActionExecutor>();
		actionExecutor.execute.mockResolvedValue({
			ok: true,
			messageContext: {
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				target: { type: 'dm', userId: 'slack:U123', threadId: 'slack:D123' },
				messageId: '456.789',
				updatedAt: '2026-05-18T10:01:00.000Z',
			},
		});

		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore,
			actionExecutor,
		}).build();

		const result = await tool.handler!(
			{ action: 'send_dm', input: { userId: 'slack:U123', message: { text: 'Hello' } } },
			makeInterruptibleCtx(),
		);

		expect(messageContextStore.setLatest).toHaveBeenCalledWith(
			'thread-1',
			'resource-1',
			expect.objectContaining({
				target: { type: 'dm', userId: 'slack:U123', threadId: 'slack:D123' },
				subject: {
					type: 'issue',
					id: 'ENG-123',
					title: 'Fix signup',
				},
				agentUserId: 'U_BOT',
			}),
		);
		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				messageContext: expect.objectContaining({
					subject: {
						type: 'issue',
						id: 'ENG-123',
						title: 'Fix signup',
					},
					agentUserId: 'U_BOT',
				}),
			}),
		);
	});
});
