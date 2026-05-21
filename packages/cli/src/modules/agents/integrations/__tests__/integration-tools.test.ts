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
import type { AgentCredentialIntegrationConfig } from '@n8n/api-types';

const slackA: AgentCredentialIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-a',
};

const slackB: AgentCredentialIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-b',
};

const linear: AgentCredentialIntegrationConfig = {
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

	it('context tool schema accepts Linear issue lookup and search queries', () => {
		const tool = createIntegrationContextTool({
			descriptor: getIntegrationToolConnectionDescriptors([linear], 'agent-1', () => ({
				contextQueries: [
					'get_current_message_context',
					'get_current_subject',
					'get_current_user',
					'get_user',
					'search_users',
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
		expect(tool.description).toContain('get_issue: input.issueId');
		expect(tool.description).toContain('search_issues: input.query');
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
						richInteraction: {
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

	it('action tool preserves the current subject when updating message context', async () => {
		const messageContextStore = mock<IntegrationMessageContextStore>();
		messageContextStore.getLatest.mockResolvedValue({
			integrationConnectionId: 'slack:cred-a',
			platform: 'slack',
			target: { type: 'thread', threadId: 'slack:C123:123.456', channelId: 'slack:C123' },
			messageId: '123.456',
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
				}),
			}),
		);
	});
});
