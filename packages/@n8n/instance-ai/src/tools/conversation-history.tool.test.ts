import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { executeTool } from '../__tests__/tool-test-utils';
import type { Logger } from '../logger';
import type {
	ConversationHistoryMessagesResult,
	ConversationHistorySearchResult,
	InstanceAiContext,
	InstanceAiConversationHistoryReader,
} from '../types';
import { createConversationHistoryTool } from './conversation-history.tool';

const UNAVAILABLE_ERROR = 'Conversation history is not available on this instance.';

const searchResult: ConversationHistorySearchResult = {
	hits: [
		{
			threadId: 'thread-1',
			title: 'Slack alerts workflow',
			updatedAt: '2026-08-20T12:00:00.000Z',
			matchedIn: ['title'],
			excerpts: [],
		},
	],
};

const messagesResult: ConversationHistoryMessagesResult = {
	threadId: 'thread-1',
	title: 'Slack alerts workflow',
	messages: [
		{
			messageId: 'msg-1',
			role: 'user',
			createdAt: '2026-08-20T12:00:00.000Z',
			text: 'Please always use UTC timestamps.',
		},
	],
	hasMoreBefore: false,
	hasMoreAfter: false,
};

interface SearchOutput extends ConversationHistorySearchResult {
	error?: string;
}

interface GetMessagesOutput extends ConversationHistoryMessagesResult {
	error?: string;
}

function makeService(
	overrides: Partial<InstanceAiConversationHistoryReader> = {},
): InstanceAiConversationHistoryReader {
	return {
		search: vi.fn().mockResolvedValue(searchResult),
		getMessages: vi.fn().mockResolvedValue(messagesResult),
		...overrides,
	};
}

function makeContext(
	conversationHistoryService?: InstanceAiConversationHistoryReader,
): InstanceAiContext {
	const context = mock<InstanceAiContext>();
	context.conversationHistoryService = conversationHistoryService;
	context.logger = mock<Logger>();
	return context;
}

describe('conversation-history tool', () => {
	describe('search', () => {
		it('passes the query through with no limit, leaving the default to the service', async () => {
			const service = makeService();
			const tool = createConversationHistoryTool(makeContext(service));

			const output = await executeTool<SearchOutput>(tool, {
				action: 'search',
				query: 'timezone',
			});

			expect(service.search).toHaveBeenCalledWith({ query: 'timezone' });
			expect(output).toEqual(searchResult);
		});

		it('passes an explicit limit through', async () => {
			const service = makeService();
			const tool = createConversationHistoryTool(makeContext(service));

			await executeTool(tool, { action: 'search', query: 'timezone', limit: 5 });

			expect(service.search).toHaveBeenCalledWith({ query: 'timezone', limit: 5 });
		});

		it('returns the unavailable error shape when the host did not wire the service', async () => {
			const tool = createConversationHistoryTool(makeContext(undefined));

			const output = await executeTool<SearchOutput>(tool, {
				action: 'search',
				query: 'timezone',
			});

			expect(output).toEqual({ hits: [], error: UNAVAILABLE_ERROR });
		});

		it('passes an omitted query through — the service handles listing mode', async () => {
			const service = makeService();
			const tool = createConversationHistoryTool(makeContext(service));

			await executeTool(tool, { action: 'search' });

			expect(service.search).toHaveBeenCalledWith({});
		});

		it('passes a whitespace-only query through — the service treats it as a listing', async () => {
			const service = makeService();
			const tool = createConversationHistoryTool(makeContext(service));

			await executeTool(tool, { action: 'search', query: '  ' });

			expect(service.search).toHaveBeenCalledWith({ query: '  ' });
		});

		it('passes an explicit limit through when listing', async () => {
			const service = makeService();
			const tool = createConversationHistoryTool(makeContext(service));

			await executeTool(tool, { action: 'search', limit: 7 });

			expect(service.search).toHaveBeenCalledWith({ query: undefined, limit: 7 });
		});

		it('rejects a query shorter than 2 characters', async () => {
			const tool = createConversationHistoryTool(makeContext(makeService()));

			await expect(executeTool(tool, { action: 'search', query: 'a' })).rejects.toThrow();
		});

		it('rejects a limit above 10', async () => {
			const tool = createConversationHistoryTool(makeContext(makeService()));

			await expect(
				executeTool(tool, { action: 'search', query: 'timezone', limit: 11 }),
			).rejects.toThrow();
		});

		it('passes a UserError message through — it is written for the caller', async () => {
			const service = makeService({
				search: vi.fn().mockRejectedValue(new UserError('Conversation not found')),
			});
			const tool = createConversationHistoryTool(makeContext(service));

			const output = await executeTool<SearchOutput>(tool, {
				action: 'search',
				query: 'timezone',
			});

			expect(output).toEqual({
				hits: [],
				error: 'Conversation not found',
			});
		});

		it('hides an unexpected error behind the generic message instead of throwing', async () => {
			const service = makeService({
				search: vi.fn().mockRejectedValue(new Error('SQLITE_BUSY: database is locked')),
			});
			const tool = createConversationHistoryTool(makeContext(service));

			const output = await executeTool<SearchOutput>(tool, {
				action: 'search',
				query: 'timezone',
			});

			expect(output).toEqual({
				hits: [],
				error: 'Failed to search conversation history.',
			});
		});

		it('falls back to the generic message when the service throws a non-Error value', async () => {
			const service = makeService({ search: vi.fn().mockRejectedValue('boom') });
			const tool = createConversationHistoryTool(makeContext(service));

			const output = await executeTool<SearchOutput>(tool, {
				action: 'search',
				query: 'timezone',
			});

			expect(output.error).toBe('Failed to search conversation history.');
			expect(output.hits).toEqual([]);
		});
	});

	describe('get-messages', () => {
		it('passes threadId, aroundMessageId, before, and after through to the service unchanged', async () => {
			const service = makeService();
			const tool = createConversationHistoryTool(makeContext(service));

			const output = await executeTool<GetMessagesOutput>(tool, {
				action: 'get-messages',
				threadId: 'thread-1',
				aroundMessageId: 'msg-5',
				before: 3,
				after: 2,
			});

			expect(service.getMessages).toHaveBeenCalledWith({
				threadId: 'thread-1',
				aroundMessageId: 'msg-5',
				before: 3,
				after: 2,
			});
			expect(output).toEqual(messagesResult);
		});

		it('passes a bare threadId through without inventing defaults (the service applies them)', async () => {
			const service = makeService();
			const tool = createConversationHistoryTool(makeContext(service));

			await executeTool(tool, { action: 'get-messages', threadId: 'thread-1' });

			expect(service.getMessages).toHaveBeenCalledWith({
				threadId: 'thread-1',
				aroundMessageId: undefined,
				before: undefined,
				after: undefined,
			});
		});

		it('returns the unavailable error shape when the host did not wire the service', async () => {
			const tool = createConversationHistoryTool(makeContext(undefined));

			const output = await executeTool<GetMessagesOutput>(tool, {
				action: 'get-messages',
				threadId: 'thread-1',
			});

			expect(output).toEqual({
				threadId: 'thread-1',
				title: '',
				messages: [],
				hasMoreBefore: false,
				hasMoreAfter: false,
				error: UNAVAILABLE_ERROR,
			});
		});

		it('passes a UserError message through into the error field instead of throwing', async () => {
			const service = makeService({
				getMessages: vi.fn().mockRejectedValue(new UserError('Conversation not found')),
			});
			const tool = createConversationHistoryTool(makeContext(service));

			const output = await executeTool<GetMessagesOutput>(tool, {
				action: 'get-messages',
				threadId: 'thread-1',
			});

			expect(output).toEqual({
				threadId: 'thread-1',
				title: '',
				messages: [],
				hasMoreBefore: false,
				hasMoreAfter: false,
				error: 'Conversation not found',
			});
		});

		it('hides an unexpected error behind the generic message', async () => {
			const service = makeService({
				getMessages: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:5432')),
			});
			const tool = createConversationHistoryTool(makeContext(service));

			const output = await executeTool<GetMessagesOutput>(tool, {
				action: 'get-messages',
				threadId: 'thread-1',
			});

			expect(output).toEqual({
				threadId: 'thread-1',
				title: '',
				messages: [],
				hasMoreBefore: false,
				hasMoreAfter: false,
				error: 'Failed to read the conversation.',
			});
		});

		describe('before/after schema rules', () => {
			it('rejects before greater than 5', async () => {
				const tool = createConversationHistoryTool(makeContext(makeService()));

				await expect(
					executeTool(tool, { action: 'get-messages', threadId: 'thread-1', before: 6 }),
				).rejects.toThrow();
			});

			it('rejects after greater than 5', async () => {
				const tool = createConversationHistoryTool(makeContext(makeService()));

				await expect(
					executeTool(tool, { action: 'get-messages', threadId: 'thread-1', after: 6 }),
				).rejects.toThrow();
			});

			it('rejects before and after together without an anchor, with the exact guidance message', async () => {
				const tool = createConversationHistoryTool(makeContext(makeService()));

				await expect(
					executeTool(tool, {
						action: 'get-messages',
						threadId: 'thread-1',
						before: 2,
						after: 2,
					}),
				).rejects.toThrow('before and after can only be combined with aroundMessageId');
			});

			it('accepts before and after together when anchored with aroundMessageId', async () => {
				const service = makeService();
				const tool = createConversationHistoryTool(makeContext(service));

				await executeTool(tool, {
					action: 'get-messages',
					threadId: 'thread-1',
					aroundMessageId: 'msg-5',
					before: 2,
					after: 2,
				});

				expect(service.getMessages).toHaveBeenCalledWith({
					threadId: 'thread-1',
					aroundMessageId: 'msg-5',
					before: 2,
					after: 2,
				});
			});

			it('accepts before alone without an anchor', async () => {
				const service = makeService();
				const tool = createConversationHistoryTool(makeContext(service));

				await executeTool(tool, { action: 'get-messages', threadId: 'thread-1', before: 3 });

				expect(service.getMessages).toHaveBeenCalledWith({
					threadId: 'thread-1',
					aroundMessageId: undefined,
					before: 3,
					after: undefined,
				});
			});

			it('accepts after alone without an anchor', async () => {
				const service = makeService();
				const tool = createConversationHistoryTool(makeContext(service));

				await executeTool(tool, { action: 'get-messages', threadId: 'thread-1', after: 4 });

				expect(service.getMessages).toHaveBeenCalledWith({
					threadId: 'thread-1',
					aroundMessageId: undefined,
					before: undefined,
					after: 4,
				});
			});
		});
	});
});
