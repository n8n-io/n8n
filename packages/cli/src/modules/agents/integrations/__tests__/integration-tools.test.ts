import type { InterruptibleToolContext } from '@n8n/agents';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';
import {
	encodeIntegrationMessageContext,
	readIntegrationMessageContext,
} from '../integration-message-context';
import type { z } from 'zod';

import {
	createIntegrationActionTool,
	createIntegrationContextTool,
	getIntegrationToolConnectionDescriptors,
	type IntegrationActionExecutor,
	type IntegrationContextQueryExecutor,
	type IntegrationMessageContextStore,
	type IntegrationMessageContext,
} from '../integration-tools';
import { INTEGRATION_ACTION_RESUME_SCHEMA } from '../integration-tool-execution';

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

const telegram: AgentIntegrationConfig = {
	type: 'telegram',
	credentialId: 'cred-telegram',
};

function makeInterruptibleCtx(
	overrides: Partial<InterruptibleToolContext> = {},
): InterruptibleToolContext {
	return {
		resumeData: undefined,
		suspend: vi.fn().mockResolvedValue(undefined as never),
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
		expect(descriptors[0].contextToolDefinitions.map((definition) => definition.name)).toEqual(
			descriptors[0].contextQueries,
		);
		expect(descriptors[0].actionToolDefinitions.map((definition) => definition.name)).toEqual(
			descriptors[0].actions,
		);
	});

	it('keeps selected turn contexts separate when the thread context changes', async () => {
		const first = {
			integrationConnectionId: 'slack:cred-a',
			platform: 'slack',
			target: { type: 'thread' as const, threadId: 'slack:C123:123.456' },
			messageId: '123.456',
			interactingUserId: 'user-1',
			subject: { type: 'issue', id: 'issue-1' },
			replyTarget: { type: 'thread' as const, threadId: 'slack:C123:123.456' },
			updatedAt: '2026-05-18T10:00:00.000Z',
		};
		const second = {
			...first,
			messageId: '123.789',
			interactingUserId: 'user-2',
			subject: { type: 'issue', id: 'issue-2' },
			replyTarget: { type: 'thread' as const, threadId: 'slack:C456:123.789' },
		};
		const turns = [first, second].map((context, index) =>
			makeInterruptibleCtx({
				runId: `run-${index}`,
				persistence: {
					threadId: 'thread-1',
					resourceId: 'resource-1',
					hostMetadata: encodeIntegrationMessageContext(context),
				},
			}),
		);
		const queryExecutor = mock<IntegrationContextQueryExecutor>();
		const descriptor = getIntegrationToolConnectionDescriptors([slackA])[0];

		const tool = createIntegrationContextTool({
			descriptor,
			queryExecutor,
		}).build();

		for (const index of [0, 1, 0]) {
			const result = await tool.handler!(
				{ query: 'get_current_message_context', input: {} },
				turns[index],
			);
			expect(result).toEqual({ ok: true, context: [first, second][index] });
		}
		const sentContext = { ...second, messageId: 'sent-message' };
		const actionExecutor = mock<IntegrationActionExecutor>();
		actionExecutor.execute.mockResolvedValue({ ok: true, messageContext: sentContext });
		const messageContextStore = mock<IntegrationMessageContextStore>();
		const actionTool = createIntegrationActionTool({
			descriptor,
			messageContextStore,
			actionExecutor,
		}).build();
		await actionTool.handler!(
			{ action: 'respond', input: { message: { text: 'Done' } } },
			turns[1],
		);
		expect(messageContextStore.setLatest).toHaveBeenCalledWith(
			'thread-1',
			'resource-1',
			sentContext,
		);
		for (const index of [1, 0]) {
			expect(
				await tool.handler!({ query: 'get_current_message_context', input: {} }, turns[index]),
			).toEqual({ ok: true, context: [first, sentContext][index] });
		}
		expect(queryExecutor.execute).not.toHaveBeenCalled();
	});

	it('context tool returns the current message subject when available', async () => {
		const messageContext: IntegrationMessageContext | null = {
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
		};
		const queryExecutor = mock<IntegrationContextQueryExecutor>();

		const tool = createIntegrationContextTool({
			descriptor: getIntegrationToolConnectionDescriptors([linear])[0],
			queryExecutor,
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(schema.safeParse({ query: 'get_current_subject', input: {} }).success).toBe(true);
		expect(tool.description).toContain('get_current_subject: no input');

		const result = await tool.handler!(
			{ query: 'get_current_subject', input: {} },
			{
				persistence: {
					threadId: 'thread-1',
					resourceId: 'resource-1',
					hostMetadata: encodeIntegrationMessageContext(messageContext),
				},
			},
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

	it('context tool accepts an argument-free query without an input object', async () => {
		const messageContext: IntegrationMessageContext | null = {
			integrationConnectionId: 'slack:cred-a',
			platform: 'slack',
			target: { type: 'thread', threadId: 'slack:C123:123.456' },
			messageId: '123.456',
			interactingUserId: 'U123',
			updatedAt: '2026-05-18T10:00:00.000Z',
		};
		const queryExecutor = mock<IntegrationContextQueryExecutor>();
		queryExecutor.execute.mockResolvedValue({
			ok: true,
			user: { userId: 'U123', displayName: 'Ada Lovelace' },
		});

		const tool = createIntegrationContextTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			queryExecutor,
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(schema.safeParse({ query: 'get_current_user' }).success).toBe(true);

		const result = await tool.handler!(
			{ query: 'get_current_user' },
			{
				persistence: {
					threadId: 'thread-1',
					resourceId: 'resource-1',
					hostMetadata: encodeIntegrationMessageContext(messageContext),
				},
			},
		);

		expect(result).toEqual({
			ok: true,
			user: { userId: 'U123', displayName: 'Ada Lovelace' },
		});
		expect(queryExecutor.execute).toHaveBeenCalledWith({
			descriptor: expect.any(Object),
			query: 'get_user',
			input: { userId: 'U123' },
			persistence: {
				threadId: 'thread-1',
				resourceId: 'resource-1',
				hostMetadata: encodeIntegrationMessageContext(messageContext),
			},
		});
	});

	it('context tool schema requires platform IDs for user and channel lookups', () => {
		const tool = createIntegrationContextTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			queryExecutor: mock<IntegrationContextQueryExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(schema.safeParse({ query: 'get_user', input: { name: 'Michael Drury' } }).success).toBe(
			false,
		);
		expect(schema.safeParse({ query: 'get_user', input: { userId: 'U123' } }).success).toBe(true);
		expect(schema.safeParse({ query: 'get_user' }).success).toBe(false);
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
			queryExecutor,
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		const input = {
			queries: [{ query: 'search_teams', input: { query: 'eng' } }, { query: 'search_labels' }],
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
			input: {},
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
		const messageContext: IntegrationMessageContext | null = null;
		const actionExecutor = mock<IntegrationActionExecutor>();

		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore,
			actionExecutor,
		}).build();

		const result = await tool.handler!(
			{ action: 'respond', input: { message: { text: 'Hello' } } },
			makeInterruptibleCtx({
				persistence: {
					threadId: 'thread-1',
					resourceId: 'resource-1',
					hostMetadata: encodeIntegrationMessageContext(messageContext),
				},
			}),
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

	it('keeps the reply expectation through same-thread context rebuilds in a batch', async () => {
		const inboundContext = {
			integrationConnectionId: 'slack:cred-a',
			platform: 'slack',
			target: { type: 'thread' as const, threadId: 'slack:C1:1.1', channelId: 'slack:C1' },
			replyExpectation: 'optional' as const,
			updatedAt: '2026-07-31T10:00:00.000Z',
		};
		const rebuiltContext = {
			integrationConnectionId: 'slack:cred-a',
			platform: 'slack',
			target: { type: 'thread' as const, threadId: 'slack:C1:1.1', channelId: 'slack:C1' },
			messageId: '1.2',
			updatedAt: '2026-07-31T10:00:01.000Z',
		};
		const messageContextStore = mock<IntegrationMessageContextStore>();
		const messageContext: IntegrationMessageContext | null = inboundContext;
		const actionExecutor = mock<IntegrationActionExecutor>();
		actionExecutor.execute.mockImplementation(async ({ action }) =>
			action === 'respond'
				? { ok: true, messageContext: rebuiltContext }
				: { ok: true, silent: true },
		);

		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA], 'agent-1', () => ({
				actions: ['respond', 'do_not_respond'],
			}))[0],
			messageContextStore,
			actionExecutor,
		}).build();

		await tool.handler!(
			{
				actions: [
					{ action: 'respond', input: { message: { text: 'card summary' } } },
					{ action: 'do_not_respond' },
				],
			},
			{
				persistence: {
					threadId: 'thread-1',
					resourceId: 'resource-1',
					hostMetadata: encodeIntegrationMessageContext(messageContext),
				},
			},
		);

		expect(actionExecutor.execute).toHaveBeenLastCalledWith(
			expect.objectContaining({
				action: 'do_not_respond',
				currentMessageContext: expect.objectContaining({ replyExpectation: 'optional' }),
			}),
		);
		expect(messageContextStore.setLatest).toHaveBeenCalledWith(
			'thread-1',
			'resource-1',
			expect.objectContaining({ replyExpectation: 'optional' }),
		);
	});

	it('keeps the inbound reply context after sending a DM', async () => {
		const inboundContext = {
			integrationConnectionId: 'slack:cred-a',
			platform: 'slack',
			target: { type: 'thread' as const, threadId: 'slack:C1:1.1', channelId: 'slack:C1' },
			messageId: '1.1',
			replyExpectation: 'optional' as const,
			updatedAt: '2026-07-31T10:00:00.000Z',
		};
		const messageContextStore = mock<IntegrationMessageContextStore>();
		const messageContext: IntegrationMessageContext | null = inboundContext;
		const actionExecutor = mock<IntegrationActionExecutor>();
		actionExecutor.execute
			.mockResolvedValueOnce({
				ok: true,
				messageContext: {
					integrationConnectionId: 'slack:cred-a',
					platform: 'slack',
					target: { type: 'dm' as const, userId: 'U2', threadId: 'slack:D2:2.2' },
					messageId: '2.2',
					updatedAt: '2026-07-31T10:00:01.000Z',
				},
			})
			.mockResolvedValueOnce({ ok: true, silent: true });

		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA], 'agent-1', () => ({
				actions: ['respond', 'send_dm', 'do_not_respond'],
			}))[0],
			messageContextStore,
			actionExecutor,
		}).build();

		await tool.handler!(
			{
				actions: [
					{ action: 'send_dm', input: { userId: 'U2', message: { text: 'hi' } } },
					{ action: 'do_not_respond' },
				],
			},
			{
				persistence: {
					threadId: 'thread-1',
					resourceId: 'resource-1',
					hostMetadata: encodeIntegrationMessageContext(messageContext),
				},
			},
		);

		expect(actionExecutor.execute).toHaveBeenLastCalledWith(
			expect.objectContaining({
				action: 'do_not_respond',
				currentMessageContext: expect.objectContaining({
					replyExpectation: 'optional',
					replyTarget: inboundContext.target,
					replyMessageId: inboundContext.messageId,
				}),
			}),
		);
	});

	it('validates the opt-in edit_message action shape', () => {
		const telegramTool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([telegram], 'agent-1', () => ({
				actions: ['respond', 'send_dm', 'edit_message'],
			}))[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();
		const telegramSchema = telegramTool.inputSchema as z.ZodType;

		expect(
			telegramSchema.safeParse({
				action: 'edit_message',
				input: {
					messageId: '123456:1000',
					message: { text: 'Updated status' },
				},
			}).success,
		).toBe(true);
		expect(
			telegramSchema.safeParse({
				action: 'edit_message',
				input: { message: { text: 'Updated status' } },
			}).success,
		).toBe(false);
		expect(
			telegramSchema.safeParse({
				action: 'edit_message',
				input: { messageId: '', message: { text: 'Updated status' } },
			}).success,
		).toBe(false);
		expect(
			telegramSchema.safeParse({
				action: 'edit_message',
				input: { messageId: '123456:1000' },
			}).success,
		).toBe(false);
		expect(
			telegramSchema.safeParse({
				action: 'edit_message',
				input: {
					threadId: 'telegram:999999',
					messageId: '123456:1000',
					message: { text: 'Updated status' },
				},
			}).success,
		).toBe(false);
		expect(telegramTool.description).toContain(
			'Uses the latest message context to choose the conversation',
		);

		const slackTool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA], 'agent-1')[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();
		const slackSchema = slackTool.inputSchema as z.ZodType;

		expect(
			slackSchema.safeParse({
				action: 'edit_message',
				input: { messageId: '123456:1000', message: { text: 'Updated status' } },
			}).success,
		).toBe(false);
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

	it.each([
		{
			name: 'single action',
			input: { action: 'send_dm', input: { userId: 'U123', message: 'Hello' } },
		},
		{
			name: 'batch action',
			input: { actions: [{ action: 'send_dm', input: { userId: 'U123', message: 'Hello' } }] },
		},
	])('normalizes a plain-string message for a $name', async ({ input }) => {
		const actionExecutor = mock<IntegrationActionExecutor>();
		actionExecutor.execute.mockResolvedValue({ ok: true });
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor,
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		const parsedInput = schema.parse(input);
		await tool.handler!(parsedInput, makeInterruptibleCtx());

		expect(actionExecutor.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'send_dm',
				input: { userId: 'U123', message: { text: 'Hello' } },
			}),
		);
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
	});

	it('action tool schema accepts no-input actions without an input object', () => {
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA], 'agent-1', () => ({
				actions: ['respond', 'do_not_respond'],
			}))[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();
		const schema = tool.inputSchema as z.ZodType;

		expect(schema.safeParse({ action: 'do_not_respond' }).success).toBe(true);
		expect(schema.safeParse({ action: 'do_not_respond', input: {} }).success).toBe(true);
		expect(schema.safeParse({ actions: [{ action: 'do_not_respond' }] }).success).toBe(true);
		// Actions with required input still fail without it — at their own schema.
		expect(schema.safeParse({ action: 'respond' }).success).toBe(false);
		expect(schema.safeParse({}).success).toBe(false);
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

		expect(readIntegrationMessageContext(ctx.persistence)?.messageId).toBe('123.456');
		expect(ctx.suspend).toHaveBeenCalledWith(
			{
				type: 'integration_action',
				action: 'send_channel_message',
				integrationConnectionId: 'slack:cred-a',
				messageContext: expect.objectContaining({
					integrationConnectionId: 'slack:cred-a',
					platform: 'slack',
					messageId: '123.456',
				}),
			},
			{ resumeSchema: INTEGRATION_ACTION_RESUME_SCHEMA },
		);
	});

	it('keeps the turn context and propagates an action context write failure', async () => {
		const original: IntegrationMessageContext = {
			integrationConnectionId: 'slack:cred-a',
			platform: 'slack',
			target: { type: 'thread', threadId: 'slack:C1:1' },
			messageId: 'original',
			updatedAt: '2026-09-18T10:00:00.000Z',
		};
		const ctx = makeInterruptibleCtx({
			persistence: {
				threadId: 'thread-1',
				resourceId: 'resource-1',
				hostMetadata: encodeIntegrationMessageContext(original),
			},
		});
		const messageContextStore = mock<IntegrationMessageContextStore>();
		messageContextStore.setLatest.mockRejectedValue(new Error('database unavailable'));
		const actionExecutor = mock<IntegrationActionExecutor>();
		actionExecutor.execute.mockResolvedValue({
			ok: true,
			messageContext: { ...original, messageId: 'sent' },
		});
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore,
			actionExecutor,
		}).build();
		await expect(
			tool.handler!({ action: 'respond', input: { message: { text: 'hello' } } }, ctx),
		).rejects.toThrow('database unavailable');
		expect(readIntegrationMessageContext(ctx.persistence)).toEqual(original);
		expect(ctx.suspend).not.toHaveBeenCalled();
	});

	it('section accessory button sends first, updates message context, then suspends', async () => {
		const messageContextStore = mock<IntegrationMessageContextStore>();
		const messageContext: IntegrationMessageContext | null = {
			integrationConnectionId: 'slack:cred-a',
			platform: 'slack',
			target: { type: 'thread', threadId: 'slack:C123:123.456', channelId: 'slack:C123' },
			messageId: '123.456',
			updatedAt: '2026-05-18T10:00:00.000Z',
		};
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
		const ctx = makeInterruptibleCtx({
			persistence: {
				threadId: 'thread-1',
				resourceId: 'resource-1',
				hostMetadata: encodeIntegrationMessageContext(messageContext),
			},
		});

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
		expect(ctx.suspend).toHaveBeenCalledWith(
			{
				type: 'integration_action',
				action: 'respond',
				integrationConnectionId: 'slack:cred-a',
				messageContext: expect.objectContaining({
					integrationConnectionId: 'slack:cred-a',
					platform: 'slack',
					messageId: '123.789',
				}),
			},
			{ resumeSchema: INTEGRATION_ACTION_RESUME_SCHEMA },
		);
	});

	it('action tool description forbids claiming an action succeeded before the tool call returns', () => {
		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore: mock<IntegrationMessageContextStore>(),
			actionExecutor: mock<IntegrationActionExecutor>(),
		}).build();

		expect(tool.description).toContain(
			'Never state that an action has been performed before its tool call returns',
		);
	});

	describe('session binding on outbound sends', () => {
		const sentContext = {
			integrationConnectionId: 'slack:cred-a',
			platform: 'slack',
			target: { type: 'dm' as const, userId: 'U2', threadId: 'slack:D2:2.2' },
			messageId: '2.2',
			updatedAt: '2026-08-20T10:00:00.000Z',
		};

		const taskPersistence = { threadId: 'task-1-uuid', resourceId: 'task:task-1' };

		it('binds the outbound thread to the running session for send_dm', async () => {
			const messageContextStore = mock<IntegrationMessageContextStore>();
			const actionExecutor = mock<IntegrationActionExecutor>();
			actionExecutor.execute.mockResolvedValue({ ok: true, messageContext: sentContext });

			const tool = createIntegrationActionTool({
				descriptor: getIntegrationToolConnectionDescriptors([slackA], 'agent-1')[0],
				messageContextStore,
				actionExecutor,
			}).build();

			await tool.handler!(
				{ action: 'send_dm', input: { userId: 'U2', message: { text: 'hi' } } },
				makeInterruptibleCtx({ persistence: taskPersistence }),
			);

			expect(messageContextStore.bindSession).toHaveBeenCalledWith('agent-1:slack:D2:2.2', {
				threadId: 'task-1-uuid',
				resourceId: 'task:task-1',
			});
		});

		it('binds the outbound thread for send_channel_message too', async () => {
			const channelContext = {
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				target: { type: 'channel' as const, channelId: 'slack:C1', threadId: 'slack:C1:1.1' },
				messageId: '1.1',
				updatedAt: '2026-08-20T10:00:00.000Z',
			};
			const messageContextStore = mock<IntegrationMessageContextStore>();
			const actionExecutor = mock<IntegrationActionExecutor>();
			actionExecutor.execute.mockResolvedValue({ ok: true, messageContext: channelContext });

			const tool = createIntegrationActionTool({
				descriptor: getIntegrationToolConnectionDescriptors([slackA], 'agent-1')[0],
				messageContextStore,
				actionExecutor,
			}).build();

			await tool.handler!(
				{ action: 'send_channel_message', input: { channelId: 'C1', message: { text: 'hi' } } },
				makeInterruptibleCtx({ persistence: taskPersistence }),
			);

			expect(messageContextStore.bindSession).toHaveBeenCalledWith('agent-1:slack:C1:1.1', {
				threadId: 'task-1-uuid',
				resourceId: 'task:task-1',
			});
		});

		it('does not bind for respond (operates on an existing thread)', async () => {
			const messageContextStore = mock<IntegrationMessageContextStore>();
			const messageContext: IntegrationMessageContext | null = {
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				target: { type: 'thread' as const, threadId: 'slack:C1:1.1', channelId: 'slack:C1' },
				messageId: '1.1',
				updatedAt: '2026-08-20T10:00:00.000Z',
			};
			const actionExecutor = mock<IntegrationActionExecutor>();
			actionExecutor.execute.mockResolvedValue({ ok: true, messageContext: sentContext });

			const tool = createIntegrationActionTool({
				descriptor: getIntegrationToolConnectionDescriptors([slackA], 'agent-1')[0],
				messageContextStore,
				actionExecutor,
			}).build();

			await tool.handler!(
				{ action: 'respond', input: { message: { text: 'hi' } } },
				makeInterruptibleCtx({
					persistence: {
						threadId: 'thread-1',
						resourceId: 'resource-1',
						hostMetadata: encodeIntegrationMessageContext(messageContext),
					},
				}),
			);

			expect(messageContextStore.bindSession).not.toHaveBeenCalled();
		});

		it('does not bind when there is no persistence', async () => {
			const messageContextStore = mock<IntegrationMessageContextStore>();
			const actionExecutor = mock<IntegrationActionExecutor>();
			actionExecutor.execute.mockResolvedValue({ ok: true, messageContext: sentContext });

			const tool = createIntegrationActionTool({
				descriptor: getIntegrationToolConnectionDescriptors([slackA], 'agent-1')[0],
				messageContextStore,
				actionExecutor,
			}).build();

			await tool.handler!(
				{ action: 'send_dm', input: { userId: 'U2', message: { text: 'hi' } } },
				makeInterruptibleCtx({ persistence: undefined }),
			);

			expect(messageContextStore.bindSession).not.toHaveBeenCalled();
		});

		it('does not bind a chat-turn send_dm to the caller session', async () => {
			const messageContextStore = mock<IntegrationMessageContextStore>();
			const actionExecutor = mock<IntegrationActionExecutor>();
			actionExecutor.execute.mockResolvedValue({ ok: true, messageContext: sentContext });

			const tool = createIntegrationActionTool({
				descriptor: getIntegrationToolConnectionDescriptors([slackA], 'agent-1')[0],
				messageContextStore,
				actionExecutor,
			}).build();

			await tool.handler!(
				{ action: 'send_dm', input: { userId: 'U2', message: { text: 'hi' } } },
				makeInterruptibleCtx({
					persistence: {
						threadId: 'agent-1:slack:C123:1001',
						resourceId: 'integration:slack:U1',
					},
				}),
			);

			expect(messageContextStore.bindSession).not.toHaveBeenCalled();
		});
	});

	it('action tool preserves the current subject when updating message context', async () => {
		const messageContextStore = mock<IntegrationMessageContextStore>();
		const messageContext: IntegrationMessageContext | null = {
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
		};
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
			makeInterruptibleCtx({
				persistence: {
					threadId: 'thread-1',
					resourceId: 'resource-1',
					hostMetadata: encodeIntegrationMessageContext(messageContext),
				},
			}),
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

	describe('action approval', () => {
		const slackWithApproval: AgentIntegrationConfig = {
			...slackA,
			approval: { mode: 'selected', tools: ['send_channel_message'] },
		};

		function approvalTool(integration: AgentIntegrationConfig) {
			const actionExecutor = mock<IntegrationActionExecutor>();
			actionExecutor.execute.mockResolvedValue({ ok: true });
			const messageContextStore = mock<IntegrationMessageContextStore>();
			messageContextStore.getLatest.mockResolvedValue(null);

			const tool = createIntegrationActionTool({
				descriptor: getIntegrationToolConnectionDescriptors([integration], 'agent-1', () => ({
					actions: ['respond', 'send_channel_message', 'send_dm'],
				}))[0],
				messageContextStore,
				actionExecutor,
			}).build();

			return { tool, actionExecutor };
		}

		const sendToChannel = {
			action: 'send_channel_message' as const,
			input: { channelId: 'slack:C999', message: { text: 'Hi' } },
		};

		it('suspends for approval instead of running a gated action', async () => {
			const { tool, actionExecutor } = approvalTool(slackWithApproval);
			const ctx = makeInterruptibleCtx();

			await tool.handler!(sendToChannel, ctx);

			expect(actionExecutor.execute).not.toHaveBeenCalled();
			expect(ctx.suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'approval',
					toolName: 'send_channel_message',
					displayName: 'send_channel_message → slack:C999',
				}),
				expect.objectContaining({ resumeSchema: expect.anything() }),
			);
		});

		it('runs an action the channel does not gate', async () => {
			const { tool, actionExecutor } = approvalTool(slackWithApproval);
			const ctx = makeInterruptibleCtx();

			await tool.handler!(
				{ action: 'send_dm', input: { userId: 'slack:U1', message: { text: 'Hi' } } },
				ctx,
			);

			expect(ctx.suspend).not.toHaveBeenCalled();
			expect(actionExecutor.execute).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'send_dm' }),
			);
		});

		it('runs nothing when the channel has no approval config', async () => {
			const { tool, actionExecutor } = approvalTool(slackA);
			const ctx = makeInterruptibleCtx();

			await tool.handler!(sendToChannel, ctx);

			expect(ctx.suspend).not.toHaveBeenCalled();
			expect(actionExecutor.execute).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'send_channel_message' }),
			);
		});

		it('gates every action when the mode is global', async () => {
			const { tool, actionExecutor } = approvalTool({
				...slackA,
				approval: { mode: 'global' },
			});
			const ctx = makeInterruptibleCtx();

			await tool.handler!({ action: 'respond', input: { message: { text: 'Hi' } } }, ctx);

			expect(actionExecutor.execute).not.toHaveBeenCalled();
			expect(ctx.suspend).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'approval', toolName: 'respond' }),
				expect.anything(),
			);
		});

		it('never asks before staying silent, even in global mode', async () => {
			const actionExecutor = mock<IntegrationActionExecutor>();
			actionExecutor.execute.mockResolvedValue({ ok: true, silent: true });
			const messageContextStore = mock<IntegrationMessageContextStore>();
			messageContextStore.getLatest.mockResolvedValue(null);
			const tool = createIntegrationActionTool({
				descriptor: getIntegrationToolConnectionDescriptors(
					[{ ...slackA, approval: { mode: 'global' } }],
					'agent-1',
					() => ({ actions: ['respond', 'do_not_respond'] }),
				)[0],
				messageContextStore,
				actionExecutor,
			}).build();
			const ctx = makeInterruptibleCtx();

			await tool.handler!({ action: 'do_not_respond', input: {} }, ctx);

			expect(ctx.suspend).not.toHaveBeenCalled();
			expect(actionExecutor.execute).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'do_not_respond' }),
			);
		});

		it('runs the action once the user approves it', async () => {
			const { tool, actionExecutor } = approvalTool(slackWithApproval);

			await tool.handler!(
				sendToChannel,
				makeInterruptibleCtx({
					suspendPayload: {
						type: 'approval',
						toolName: 'send_channel_message',
						args: sendToChannel.input,
					},
					resumeData: { approved: true },
				}),
			);

			expect(actionExecutor.execute).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'send_channel_message' }),
			);
		});

		it('reports the refusal without running the action when the user denies it', async () => {
			const { tool, actionExecutor } = approvalTool(slackWithApproval);

			const result = await tool.handler!(
				sendToChannel,
				makeInterruptibleCtx({
					suspendPayload: {
						type: 'approval',
						toolName: 'send_channel_message',
						args: sendToChannel.input,
					},
					resumeData: { approved: false },
				}),
			);

			expect(actionExecutor.execute).not.toHaveBeenCalled();
			expect(result).toEqual({
				ok: false,
				error: {
					code: 'ACTION_DECLINED',
					message: 'The action "send_channel_message" was not approved.',
				},
			});
		});

		it('treats an unreadable approval resume as a refusal', async () => {
			const { tool, actionExecutor } = approvalTool(slackWithApproval);

			const result = await tool.handler!(
				sendToChannel,
				makeInterruptibleCtx({
					suspendPayload: {
						type: 'approval',
						toolName: 'send_channel_message',
						args: sendToChannel.input,
					},
					resumeData: { clicked: 'yes' },
				}),
			);

			expect(actionExecutor.execute).not.toHaveBeenCalled();
			expect(result).toMatchObject({ error: { code: 'ACTION_DECLINED' } });
		});

		it('does not leave an interactive follow-up card expecting an approval resume', async () => {
			const { tool, actionExecutor } = approvalTool(slackWithApproval);
			actionExecutor.execute.mockResolvedValue({
				ok: true,
				messageContext: {
					integrationConnectionId: 'slack:cred-a',
					platform: 'slack',
					target: { type: 'channel', channelId: 'slack:C999', threadId: 'slack:C999:1' },
					messageId: '1',
					updatedAt: '2026-05-18T10:00:00.000Z',
				},
			});
			const ctx = makeInterruptibleCtx({
				suspendPayload: {
					type: 'approval',
					toolName: 'send_channel_message',
					args: sendToChannel.input,
				},
				resumeData: { approved: true },
			});

			await tool.handler!(
				{
					action: 'send_channel_message',
					input: {
						channelId: 'slack:C999',
						message: {
							text: 'Choose',
							card: {
								components: [{ type: 'button', label: 'Go', value: 'go' }],
							},
						},
					},
				},
				ctx,
			);

			expect(ctx.suspend).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'integration_action', action: 'send_channel_message' }),
				{ resumeSchema: INTEGRATION_ACTION_RESUME_SCHEMA },
			);
		});

		it('still hands a card resume straight back to the model', async () => {
			const { tool } = approvalTool(slackWithApproval);

			const result = await tool.handler!(
				sendToChannel,
				makeInterruptibleCtx({
					suspendPayload: {
						type: 'integration_action',
						action: 'respond',
						integrationConnectionId: 'slack:cred-a',
						messageContext: null,
					},
					resumeData: { type: 'button', value: 'go' },
				}),
			);

			expect(result).toEqual({ type: 'button', value: 'go' });
		});

		// A batch cannot suspend, so without this the model could put a gated
		// action in a batch and skip the gate.
		it('refuses a gated action inside a batch rather than running it', async () => {
			const { tool, actionExecutor } = approvalTool(slackWithApproval);

			const result = await tool.handler!(
				{
					actions: [
						{ action: 'send_dm', input: { userId: 'slack:U1', message: { text: 'Hi' } } },
						sendToChannel,
					],
				},
				makeInterruptibleCtx(),
			);

			expect(actionExecutor.execute).toHaveBeenCalledTimes(1);
			expect(actionExecutor.execute).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'send_dm' }),
			);
			expect(result).toMatchObject({
				ok: true,
				results: [
					{ action: 'send_dm', result: { ok: true } },
					{
						action: 'send_channel_message',
						result: {
							ok: false,
							error: {
								code: 'ACTION_NEEDS_APPROVAL',
								message:
									'The action "send_channel_message" needs approval, which cannot be asked for here. Send that action on its own.',
							},
						},
					},
				],
			});
		});
	});
});
