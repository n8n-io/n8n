import type { Logger } from '@n8n/backend-common';
import { UserError } from 'n8n-workflow';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { InstanceAiMessage } from '../entities/instance-ai-message.entity';
import type { InstanceAiThread } from '../entities/instance-ai-thread.entity';
import {
	InstanceAiConversationHistoryService,
	type ScopedConversationHistory,
} from '../instance-ai-conversation-history.service';
import type {
	ConversationThreadSearchRow,
	InstanceAiConversationHistoryRepository,
} from '../repositories/instance-ai-conversation-history.repository';
import {
	askUserContent,
	assistantTextContent,
	assistantWorkingContent,
	userContent,
} from './conversation-history-content.fixtures';

const USER_ID = 'user-1';
const PROJECT_ID = 'project-1';
const CURRENT_THREAD_ID = 'thread-current';
const PAST_THREAD_ID = 'thread-past';

const CREATED_AT = new Date('2026-01-01T10:00:00.000Z');
const UPDATED_AT = new Date('2026-01-02T10:00:00.000Z');

function setup() {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const repository = mock<InstanceAiConversationHistoryRepository>();

	// Nothing matches and no thread exists unless a test says otherwise.
	repository.searchProjectThreadsForUser.mockResolvedValue([]);
	repository.listRecentProjectThreadsForUser.mockResolvedValue([]);
	repository.countProjectThreadsForUser.mockResolvedValue(0);
	repository.findOwnedThread.mockResolvedValue(null);
	repository.findSearchMatchRows.mockResolvedValue(new Map());
	repository.findFirstUserMessages.mockResolvedValue(new Map());
	repository.findMessageInThread.mockResolvedValue(null);
	repository.getConversationWindow.mockResolvedValue({
		rows: [],
		hasMoreBefore: false,
		hasMoreAfter: false,
	});

	const service = new InstanceAiConversationHistoryService(logger, repository);

	return {
		service,
		history: service.forContext(USER_ID, PROJECT_ID, CURRENT_THREAD_ID),
		repository,
		logger,
	};
}

function threadHit(
	overrides: Partial<ConversationThreadSearchRow> = {},
): ConversationThreadSearchRow {
	return {
		id: PAST_THREAD_ID,
		title: 'Weekly digest',
		updatedAt: UPDATED_AT,
		...overrides,
	};
}

function messageRow(overrides: {
	id?: string;
	role: string;
	content: string;
	threadId?: string;
	createdAt?: Date;
}): InstanceAiMessage {
	return mock<InstanceAiMessage>({
		id: overrides.id ?? 'message-1',
		threadId: overrides.threadId ?? PAST_THREAD_ID,
		role: overrides.role,
		content: overrides.content,
		createdAt: overrides.createdAt ?? CREATED_AT,
	});
}

/** A thread row plus its candidate message rows, as the repository returns them. */
function givenSearchHit(
	repos: { repository: MockProxy<InstanceAiConversationHistoryRepository> },
	options: {
		row?: ConversationThreadSearchRow;
		candidates?: InstanceAiMessage[];
		firstUserMessage?: InstanceAiMessage | null;
	} = {},
) {
	const row = options.row ?? threadHit();
	repos.repository.searchProjectThreadsForUser.mockResolvedValue([row]);
	repos.repository.findSearchMatchRows.mockResolvedValue(
		new Map([[row.id, options.candidates ?? []]]),
	);
	repos.repository.findFirstUserMessages.mockResolvedValue(
		options.firstUserMessage ? new Map([[row.id, options.firstUserMessage]]) : new Map(),
	);
}

describe('InstanceAiConversationHistoryService', () => {
	describe('search', () => {
		it('scopes the query to the user, the project and away from the current thread', async () => {
			const { history, repository } = setup();

			await history.search({ query: 'Slack digest', limit: 10 });

			// The thread page is over-fetched, so the repository sees twice the limit.
			expect(repository.searchProjectThreadsForUser).toHaveBeenCalledWith({
				userId: USER_ID,
				projectId: PROJECT_ID,
				excludeThreadId: CURRENT_THREAD_ID,
				query: 'Slack digest',
				limit: 20,
			});
		});

		it('defaults the limit to 10 when searching and 5 when listing', async () => {
			const { history, repository } = setup();

			await history.search({ query: 'Slack digest' });
			await history.search({});

			expect(repository.searchProjectThreadsForUser).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 20 }),
			);
			expect(repository.listRecentProjectThreadsForUser).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 5 }),
			);
		});

		// LIKE escaping is the repository's job — covered by the integration test.
		it('passes wildcard characters through as part of the raw query', async () => {
			const { history, repository } = setup();

			await history.search({ query: '50% off_now', limit: 5 });

			expect(repository.searchProjectThreadsForUser).toHaveBeenCalledWith(
				expect.objectContaining({ query: '50% off_now' }),
			);
		});

		it('lists the most recent conversations when the query is absent or blank', async () => {
			const { history, repository } = setup();

			await history.search({ limit: 5 });
			await history.search({ query: '   ', limit: 5 });

			expect(repository.listRecentProjectThreadsForUser).toHaveBeenCalledTimes(2);
			expect(repository.listRecentProjectThreadsForUser).toHaveBeenCalledWith({
				userId: USER_ID,
				projectId: PROJECT_ID,
				excludeThreadId: CURRENT_THREAD_ID,
				limit: 5,
			});
			expect(repository.searchProjectThreadsForUser).not.toHaveBeenCalled();
		});

		it('builds listing hits without any match work', async () => {
			const { history, repository } = setup();
			repository.listRecentProjectThreadsForUser.mockResolvedValue([threadHit()]);
			repository.findFirstUserMessages.mockResolvedValue(
				new Map([
					[
						PAST_THREAD_ID,
						messageRow({ role: 'user', content: userContent('Build me a weekly digest workflow') }),
					],
				]),
			);

			const result = await history.search({ limit: 5 });

			expect(result).toEqual({
				hits: [
					{
						threadId: PAST_THREAD_ID,
						title: 'Weekly digest',
						updatedAt: UPDATED_AT.toISOString(),
						matchedIn: [],
						firstMessageExcerpt: 'Build me a weekly digest workflow',
						excerpts: [],
					},
				],
			});
			expect(repository.findSearchMatchRows).not.toHaveBeenCalled();
			expect(repository.countProjectThreadsForUser).not.toHaveBeenCalled();
		});

		it('centers each excerpt on the match and elides both open ends', async () => {
			const repos = setup();
			const text = `${'x'.repeat(300)} needle ${'y'.repeat(300)}`;
			givenSearchHit(repos, {
				candidates: [messageRow({ id: 'message-7', role: 'user', content: userContent(text) })],
			});

			const { hits } = await repos.history.search({ query: 'needle', limit: 10 });

			expect(hits).toHaveLength(1);
			expect(hits[0].excerpts).toHaveLength(1);
			const [excerpt] = hits[0].excerpts;
			expect(excerpt.messageId).toBe('message-7');
			expect(excerpt.createdAt).toBe(CREATED_AT.toISOString());
			expect(excerpt.text).toContain('needle');
			expect(excerpt.text.startsWith('…')).toBe(true);
			expect(excerpt.text.endsWith('…')).toBe(true);
			// 200 characters of context plus the two ellipses.
			expect(excerpt.text).toHaveLength(202);
		});

		it('keeps short matches whole', async () => {
			const repos = setup();
			givenSearchHit(repos, {
				candidates: [
					messageRow({ role: 'user', content: userContent('post the summary to Slack') }),
				],
			});

			const { hits } = await repos.history.search({ query: 'slack', limit: 10 });

			expect(hits[0].excerpts[0].text).toBe('post the summary to Slack');
		});

		it('caps excerpts per thread', async () => {
			const repos = setup();
			givenSearchHit(repos, {
				candidates: [1, 2, 3, 4, 5].map((n) =>
					messageRow({ id: `message-${n}`, role: 'user', content: userContent(`slack run ${n}`) }),
				),
			});

			const { hits } = await repos.history.search({ query: 'slack', limit: 10 });

			expect(hits[0].excerpts).toHaveLength(3);
			expect(hits[0].excerpts.map((excerpt) => excerpt.messageId)).toEqual([
				'message-1',
				'message-2',
				'message-3',
			]);
		});

		it('reports every matched source even when the excerpt cap fills first', async () => {
			const repos = setup();
			givenSearchHit(repos, {
				candidates: [
					...[1, 2, 3].map((n) =>
						messageRow({
							id: `message-${n}`,
							role: 'user',
							content: userContent(`slack run ${n}`),
						}),
					),
					messageRow({
						id: 'm-answer',
						role: 'assistant',
						content: askUserContent([
							{ question: 'Which slack channel?', selectedOptions: ['#ops'] },
						]),
					}),
				],
			});

			const { hits } = await repos.history.search({ query: 'slack', limit: 10 });

			expect(hits[0].excerpts).toHaveLength(3);
			expect(hits[0].matchedIn).toEqual(['messages', 'user-answers']);
		});

		it('strips internal enrichment from user text before matching and excerpting', async () => {
			const repos = setup();
			const stored =
				'can you see my other sessions?\n\n<project-context>\nThis conversation is scoped to the project "s d" (personal).\n</project-context>\n\n<current-date-time>\n## Current Date and Time\n\n2026-08-31\n</current-date-time>';
			givenSearchHit(repos, {
				candidates: [messageRow({ role: 'user', content: userContent(stored) })],
			});

			// Matches only inside the enrichment wrapper — not something the user wrote.
			const wrapperOnly = await repos.history.search({ query: 'scoped to the project', limit: 10 });
			expect(wrapperOnly.hits).toEqual([]);

			// Matches the real text; the excerpt shows the message as the user saw it.
			const real = await repos.history.search({ query: 'other sessions', limit: 10 });
			expect(real.hits[0].excerpts[0].text).toBe('can you see my other sessions?');
		});

		it('strips internal enrichment from the first-message excerpt', async () => {
			const repos = setup();
			// The default title "Weekly digest" makes this a title match for "digest".
			givenSearchHit(repos, {
				firstUserMessage: messageRow({
					role: 'user',
					content: userContent(
						'build a weekly digest\n\n<project-context>\nThis conversation is scoped to the project "x" (personal).\n</project-context>',
					),
				}),
			});

			const { hits } = await repos.history.search({ query: 'digest', limit: 10 });

			expect(hits[0].firstMessageExcerpt).toBe('build a weekly digest');
		});

		it('drops a thread whose match was only in the serialized JSON', async () => {
			const repos = setup();
			givenSearchHit(repos, {
				candidates: [
					messageRow({
						role: 'user',
						// The term sits in a sibling field, not in the text the user wrote.
						content: userContent('hello there', { metadata: { note: 'timezone' } }),
					}),
				],
			});

			const result = await repos.history.search({ query: 'timezone', limit: 10 });

			expect(result.hits).toEqual([]);
		});

		it('keeps a title-only hit even when no message excerpt survives', async () => {
			const repos = setup();
			givenSearchHit(repos, {
				row: threadHit({ title: 'Timezone setup' }),
				candidates: [messageRow({ role: 'user', content: userContent('hello there') })],
			});

			const { hits } = await repos.history.search({ query: 'timezone', limit: 10 });

			expect(hits).toHaveLength(1);
			expect(hits[0].matchedIn).toEqual(['title']);
			expect(hits[0].excerpts).toEqual([]);
		});

		it('renders resolved ask-user answers as question/answer pairs', async () => {
			const repos = setup();
			givenSearchHit(repos, {
				candidates: [
					messageRow({
						role: 'assistant',
						content: askUserContent([
							{ question: 'Which timezone?', selectedOptions: ['Europe/Berlin'] },
						]),
					}),
				],
			});

			const { hits } = await repos.history.search({ query: 'timezone', limit: 10 });

			expect(hits[0].excerpts[0].text).toBe('Q: Which timezone? → A: Europe/Berlin');
			expect(hits[0].matchedIn).toEqual(['user-answers']);
		});

		it('ignores ask-user calls that were never resolved', async () => {
			const repos = setup();
			givenSearchHit(repos, {
				candidates: [
					messageRow({
						role: 'assistant',
						content: askUserContent([{ question: 'Which timezone?', selectedOptions: [] }], {
							state: 'pending',
						}),
					}),
				],
			});

			const { hits } = await repos.history.search({ query: 'timezone', limit: 10 });

			expect(hits).toEqual([]);
		});

		it('ignores assistant text, which the agent can re-derive from its own turns', async () => {
			const repos = setup();
			givenSearchHit(repos, {
				candidates: [
					messageRow({
						role: 'assistant',
						content: assistantTextContent('I set the timezone to Europe/Berlin'),
					}),
				],
			});

			const { hits } = await repos.history.search({ query: 'timezone', limit: 10 });

			expect(hits).toEqual([]);
		});

		it('skips rows whose content is not readable JSON', async () => {
			const repos = setup();
			givenSearchHit(repos, {
				candidates: [
					messageRow({ id: 'broken', role: 'user', content: '{not json' }),
					messageRow({ id: 'intact', role: 'user', content: userContent('slack digest') }),
				],
			});

			const { hits } = await repos.history.search({ query: 'slack', limit: 10 });

			expect(hits[0].excerpts.map((excerpt) => excerpt.messageId)).toEqual(['intact']);
		});

		it('reports every source a thread matched in', async () => {
			const repos = setup();
			givenSearchHit(repos, {
				row: threadHit({ title: 'Slack digest' }),
				candidates: [
					messageRow({ id: 'm-user', role: 'user', content: userContent('send it to slack') }),
					messageRow({
						id: 'm-answer',
						role: 'assistant',
						content: askUserContent([
							{ question: 'Which slack channel?', selectedOptions: ['#ops'] },
						]),
					}),
				],
			});

			const { hits } = await repos.history.search({ query: 'slack', limit: 10 });

			expect(hits[0].matchedIn).toEqual(['title', 'messages', 'user-answers']);
		});

		it('includes the opening user message of a hit thread', async () => {
			const repos = setup();
			givenSearchHit(repos, {
				candidates: [messageRow({ role: 'user', content: userContent('add slack later') })],
				firstUserMessage: messageRow({
					id: 'message-first',
					role: 'user',
					content: userContent(`build a nightly report ${'z'.repeat(300)}`),
				}),
			});

			const { hits } = await repos.history.search({ query: 'slack', limit: 10 });

			expect(hits[0].firstMessageExcerpt).toHaveLength(201);
			expect(hits[0].firstMessageExcerpt?.startsWith('build a nightly report')).toBe(true);
			expect(hits[0].firstMessageExcerpt?.endsWith('…')).toBe(true);
		});

		it('keeps the recency order the repository returned', async () => {
			const { history, repository } = setup();
			repository.searchProjectThreadsForUser.mockResolvedValue([
				threadHit({ id: 'thread-new', title: 'Slack new' }),
				threadHit({ id: 'thread-old', title: 'Slack old' }),
			]);

			const result = await history.search({ query: 'slack', limit: 2 });

			expect(result.hits.map((hit) => hit.threadId)).toEqual(['thread-new', 'thread-old']);
			expect(result.hits[0].updatedAt).toBe(UPDATED_AT.toISOString());
		});

		it('does not let a false-positive thread cost a hit', async () => {
			const { history, repository } = setup();
			repository.searchProjectThreadsForUser.mockResolvedValue([
				threadHit({ id: 'thread-false', title: 'Recent work' }),
				threadHit({ id: 'thread-real', title: 'Older work' }),
			]);
			repository.findSearchMatchRows.mockResolvedValue(
				new Map([
					// Matches only in a sibling JSON field, not in the text the user wrote.
					[
						'thread-false',
						[messageRow({ role: 'user', content: userContent('hi', { note: 'slack' }) })],
					],
					['thread-real', [messageRow({ role: 'user', content: userContent('post to slack') })]],
				]),
			);

			const result = await history.search({ query: 'slack', limit: 1 });

			// The verified thread is only reachable because the page was over-fetched,
			// and its candidates are only fetched because the first page came up short.
			expect(repository.searchProjectThreadsForUser).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 2 }),
			);
			expect(repository.findSearchMatchRows).toHaveBeenCalledTimes(2);
			expect(result.hits.map((hit) => hit.threadId)).toEqual(['thread-real']);
		});

		it('verifies one page at a time and skips the remainder once the page is full', async () => {
			const { history, repository } = setup();
			repository.searchProjectThreadsForUser.mockResolvedValue([
				threadHit({ id: 'thread-1', title: 'Slack one' }),
				threadHit({ id: 'thread-2', title: 'Slack two' }),
				threadHit({ id: 'thread-3', title: 'Slack three' }),
			]);

			const result = await history.search({ query: 'slack', limit: 2 });

			expect(result.hits.map((hit) => hit.threadId)).toEqual(['thread-1', 'thread-2']);
			expect(repository.findSearchMatchRows).toHaveBeenCalledTimes(1);
			expect(repository.findSearchMatchRows).toHaveBeenCalledWith(
				['thread-1', 'thread-2'],
				'slack',
				expect.any(Number),
			);
			expect(repository.findFirstUserMessages).toHaveBeenCalledWith(['thread-1', 'thread-2']);
		});
	});

	describe('getMessages', () => {
		function givenThread(
			repository: MockProxy<InstanceAiConversationHistoryRepository>,
			overrides: Partial<Pick<InstanceAiThread, 'id' | 'resourceId' | 'projectId' | 'title'>> = {},
		) {
			repository.findOwnedThread.mockResolvedValue(
				mock<InstanceAiThread>({
					id: PAST_THREAD_ID,
					resourceId: USER_ID,
					projectId: PROJECT_ID,
					title: 'Weekly digest',
					...overrides,
				}),
			);
		}

		async function expectNotFound(history: ScopedConversationHistory) {
			const read = history.getMessages({ threadId: PAST_THREAD_ID });
			await expect(read).rejects.toThrow(UserError);
			await expect(read).rejects.toThrow('Conversation not found');
		}

		// Ownership and project binding are enforced in the query, so a thread the
		// caller may not read is indistinguishable from a missing one.
		it('rejects a thread the scoped lookup does not return', async () => {
			const { history, repository } = setup();
			repository.findOwnedThread.mockResolvedValue(null);

			await expectNotFound(history);
			expect(repository.findOwnedThread).toHaveBeenCalledWith(PAST_THREAD_ID, USER_ID, PROJECT_ID);
		});

		it('reads the current thread as well — only search excludes it', async () => {
			const { history, repository } = setup();
			givenThread(repository, { id: CURRENT_THREAD_ID });

			await expect(history.getMessages({ threadId: CURRENT_THREAD_ID })).resolves.toMatchObject({
				threadId: CURRENT_THREAD_ID,
			});
		});

		it('reads the last five messages for a bare request', async () => {
			const { history, repository } = setup();
			givenThread(repository);

			await history.getMessages({ threadId: PAST_THREAD_ID });

			expect(repository.getConversationWindow).toHaveBeenCalledWith({
				threadId: PAST_THREAD_ID,
				anchor: undefined,
				before: 5,
				after: 0,
				isVisibleRow: expect.any(Function),
			});
		});

		it('reads five messages either side of an anchor', async () => {
			const { history, repository } = setup();
			givenThread(repository);
			// Compare against the mock row's own createdAt: the deep-mock proxies the
			// Date override, so a fresh Date would not be strictly equal to it.
			const anchorRow = messageRow({ id: 'anchor-1', role: 'user', content: userContent('here') });
			repository.findMessageInThread.mockResolvedValue(anchorRow);

			await history.getMessages({ threadId: PAST_THREAD_ID, aroundMessageId: 'anchor-1' });

			expect(repository.getConversationWindow).toHaveBeenCalledWith({
				threadId: PAST_THREAD_ID,
				anchor: { id: 'anchor-1', createdAt: anchorRow.createdAt },
				before: 5,
				after: 5,
				isVisibleRow: expect.any(Function),
			});
		});

		it('keeps a one-sided request one-sided', async () => {
			const { history, repository } = setup();
			givenThread(repository);

			await history.getMessages({ threadId: PAST_THREAD_ID, after: 2 });

			expect(repository.getConversationWindow).toHaveBeenCalledWith(
				expect.objectContaining({ before: 0, after: 2 }),
			);
		});

		it('clamps oversized window requests', async () => {
			const { history, repository } = setup();
			givenThread(repository);
			repository.findMessageInThread.mockResolvedValue(
				messageRow({ id: 'anchor-1', role: 'user', content: userContent('here') }),
			);

			await history.getMessages({
				threadId: PAST_THREAD_ID,
				aroundMessageId: 'anchor-1',
				before: 99,
				after: 99,
			});

			expect(repository.getConversationWindow).toHaveBeenCalledWith(
				expect.objectContaining({ before: 5, after: 5 }),
			);
		});

		// The window spends its slots on rows this predicate accepts, so it has to
		// be the same check that decides what the reader gets back.
		it('hands the window the visibility check the returned messages use', async () => {
			const { history, repository } = setup();
			givenThread(repository);

			await history.getMessages({ threadId: PAST_THREAD_ID });

			const [params] = repository.getConversationWindow.mock.calls[0];
			expect(params.isVisibleRow(messageRow({ role: 'user', content: userContent('hello') }))).toBe(
				true,
			);
			expect(
				params.isVisibleRow(messageRow({ role: 'user', content: userContent('(continue)') })),
			).toBe(false);
		});

		it('rejects an anchor that is not in the thread', async () => {
			const { history, repository } = setup();
			givenThread(repository);
			repository.findMessageInThread.mockResolvedValue(null);

			const read = history.getMessages({ threadId: PAST_THREAD_ID, aroundMessageId: 'ghost' });
			await expect(read).rejects.toThrow(UserError);
			await expect(read).rejects.toThrow('Message not found in this conversation');
			expect(repository.getConversationWindow).not.toHaveBeenCalled();
		});

		it('returns the window with the thread title and the more-flags', async () => {
			const { history, repository } = setup();
			givenThread(repository);
			repository.getConversationWindow.mockResolvedValue({
				rows: [
					messageRow({ id: 'm-1', role: 'user', content: userContent('do the thing') }),
					messageRow({
						id: 'm-2',
						role: 'assistant',
						content: assistantTextContent('done'),
						createdAt: new Date('2026-01-01T10:05:00.000Z'),
					}),
				],
				hasMoreBefore: true,
				hasMoreAfter: false,
			});

			const result = await history.getMessages({ threadId: PAST_THREAD_ID });

			expect(result).toEqual({
				threadId: PAST_THREAD_ID,
				title: 'Weekly digest',
				messages: [
					{
						messageId: 'm-1',
						role: 'user',
						createdAt: CREATED_AT.toISOString(),
						text: 'do the thing',
					},
					{
						messageId: 'm-2',
						role: 'assistant',
						createdAt: '2026-01-01T10:05:00.000Z',
						text: 'done',
					},
				],
				hasMoreBefore: true,
				hasMoreAfter: false,
			});
		});

		it('returns user text as the user saw it and hides internal auto-follow-ups', async () => {
			const { history, repository } = setup();
			givenThread(repository);
			repository.getConversationWindow.mockResolvedValue({
				rows: [
					messageRow({
						id: 'm-enriched',
						role: 'user',
						content: userContent(
							'can you see my other sessions?\n\n<project-context>\nThis conversation is scoped to the project "s d" (personal).\n</project-context>',
						),
					}),
					messageRow({ id: 'm-continue', role: 'user', content: userContent('(continue)') }),
				],
				hasMoreBefore: false,
				hasMoreAfter: false,
			});

			const result = await history.getMessages({ threadId: PAST_THREAD_ID });

			expect(result.messages).toEqual([
				{
					messageId: 'm-enriched',
					role: 'user',
					createdAt: CREATED_AT.toISOString(),
					text: 'can you see my other sessions?',
				},
			]);
		});

		it('drops a user row with no visible text', async () => {
			const { history, repository } = setup();
			givenThread(repository);
			repository.getConversationWindow.mockResolvedValue({
				rows: [
					messageRow({
						id: 'm-handoff',
						role: 'user',
						content: userContent(
							'<editor-context>\n[]\nThe user opened "Digest".\n</editor-context>',
						),
					}),
					messageRow({ id: 'm-text', role: 'user', content: userContent('add Slack') }),
				],
				hasMoreBefore: false,
				hasMoreAfter: false,
			});

			const result = await history.getMessages({ threadId: PAST_THREAD_ID });

			expect(result.messages.map((message) => message.messageId)).toEqual(['m-text']);
		});

		it('renders ask-user answers, including custom text and skips', async () => {
			const { history, repository } = setup();
			givenThread(repository);
			repository.getConversationWindow.mockResolvedValue({
				rows: [
					messageRow({
						id: 'm-answers',
						role: 'assistant',
						content: askUserContent([
							{ question: 'Which timezone?', selectedOptions: ['Europe/Berlin'] },
							{ question: 'How often?', selectedOptions: ['Daily'], customText: 'at 9am' },
							{ question: 'Which channel?', selectedOptions: [], skipped: true },
						]),
					}),
				],
				hasMoreBefore: false,
				hasMoreAfter: false,
			});

			const result = await history.getMessages({ threadId: PAST_THREAD_ID });

			expect(result.messages[0].userAnswers).toEqual([
				{ question: 'Which timezone?', answer: 'Europe/Berlin' },
				{ question: 'How often?', answer: 'Daily, at 9am' },
				{ question: 'Which channel?', answer: '(skipped)' },
			]);
			// The row carried no text blocks, only tool activity.
			expect(result.messages[0].text).toBe('');
		});

		it('drops mid-turn narration and pure tool-call rows — only the final reply remains', async () => {
			const { history, repository } = setup();
			givenThread(repository);
			repository.getConversationWindow.mockResolvedValue({
				rows: [
					messageRow({
						id: 'm-tools-only',
						role: 'assistant',
						content: assistantWorkingContent(''),
					}),
					messageRow({
						id: 'm-narration',
						role: 'assistant',
						content: assistantWorkingContent('Validation is clean. Building the workflow now.'),
					}),
					messageRow({ id: 'm-reply', role: 'assistant', content: assistantTextContent('Done.') }),
				],
				hasMoreBefore: false,
				hasMoreAfter: false,
			});

			const result = await history.getMessages({ threadId: PAST_THREAD_ID });

			expect(result.messages.map((message) => message.messageId)).toEqual(['m-reply']);
		});

		it('truncates user text harder for assistant rows', async () => {
			const { history, repository } = setup();
			givenThread(repository);
			repository.getConversationWindow.mockResolvedValue({
				rows: [
					messageRow({ id: 'm-user', role: 'user', content: userContent('u'.repeat(2000)) }),
					messageRow({
						id: 'm-assistant',
						role: 'assistant',
						content: assistantTextContent('a'.repeat(2000)),
					}),
				],
				hasMoreBefore: false,
				hasMoreAfter: false,
			});

			const result = await history.getMessages({ threadId: PAST_THREAD_ID });

			expect(result.messages[0].text).toHaveLength(1501);
			expect(result.messages[0].text.endsWith('…')).toBe(true);
			expect(result.messages[1].text).toHaveLength(801);
			expect(result.messages[1].text.endsWith('…')).toBe(true);
		});

		it('drops rows whose content is not readable JSON', async () => {
			const { history, repository } = setup();
			givenThread(repository);
			repository.getConversationWindow.mockResolvedValue({
				rows: [
					messageRow({ id: 'broken', role: 'user', content: 'not json at all' }),
					messageRow({ id: 'intact', role: 'user', content: userContent('still here') }),
				],
				hasMoreBefore: false,
				hasMoreAfter: false,
			});

			const result = await history.getMessages({ threadId: PAST_THREAD_ID });

			expect(result.messages.map((message) => message.messageId)).toEqual(['intact']);
		});
	});

	describe('getPastConversationsSection', () => {
		/** Ages are relative, so the clock is pinned rather than the timestamps. */
		const NOW = new Date('2026-03-01T12:00:00.000Z');

		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(NOW);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		function daysAgo(days: number): Date {
			return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
		}

		it('asks for the three most recent conversations, scoped away from the current thread', async () => {
			const { history, repository } = setup();

			await history.getPastConversationsSection();

			expect(repository.listRecentProjectThreadsForUser).toHaveBeenCalledWith({
				userId: USER_ID,
				projectId: PROJECT_ID,
				excludeThreadId: CURRENT_THREAD_ID,
				limit: 3,
			});
		});

		it('names up to three conversations with their coarse ages, and the full count', async () => {
			const { history, repository } = setup();
			repository.listRecentProjectThreadsForUser.mockResolvedValue([
				threadHit({ id: 't-1', title: 'Weekly digest', updatedAt: daysAgo(0.2) }),
				threadHit({ id: 't-2', title: 'Slack alerts', updatedAt: daysAgo(3.1) }),
				threadHit({ id: 't-3', title: 'CRM sync', updatedAt: daysAgo(15) }),
			]);
			repository.countProjectThreadsForUser.mockResolvedValue(9);

			const section = await history.getPastConversationsSection();

			expect(section).toBe(
				'This project has 9 past conversations with you. Most recent: "Weekly digest" (today), "Slack alerts" (3d ago), "CRM sync" (2w ago).',
			);
		});

		it('uses the singular for a project with exactly one past conversation', async () => {
			const { history, repository } = setup();
			repository.listRecentProjectThreadsForUser.mockResolvedValue([
				threadHit({ title: 'Weekly digest', updatedAt: daysAgo(1.4) }),
			]);

			const section = await history.getPastConversationsSection();

			expect(section).toContain('This project has 1 past conversation with you.');
			expect(section).toContain('Most recent: "Weekly digest" (1d ago).');
			// A short page is its own count.
			expect(repository.countProjectThreadsForUser).not.toHaveBeenCalled();
		});

		it('neutralizes delimiter tags inside titles', async () => {
			const { history, repository } = setup();
			repository.listRecentProjectThreadsForUser.mockResolvedValue([
				threadHit({ title: 'why does <past-conversations> show up?', updatedAt: daysAgo(0) }),
			]);

			const section = await history.getPastConversationsSection();

			expect(section).toContain('"why does &lt;past-conversations&gt; show up?"');
			expect(section).not.toContain('<past-conversations>');
		});

		it('labels a conversation the titler never got to', async () => {
			const { history, repository } = setup();
			repository.listRecentProjectThreadsForUser.mockResolvedValue([
				threadHit({ id: 't-1', title: '', updatedAt: daysAgo(0) }),
				threadHit({ id: 't-2', title: '   ', updatedAt: daysAgo(0) }),
			]);

			const section = await history.getPastConversationsSection();

			expect(section).toContain('Most recent: "(untitled)" (today), "(untitled)" (today).');
		});

		it('returns undefined when the project has no other conversations', async () => {
			const { history } = setup();

			expect(await history.getPastConversationsSection()).toBeUndefined();
		});

		// Best-effort by design: a hint that cannot be built must not fail the turn.
		it('returns undefined and warns when a repository read fails', async () => {
			const { history, repository, logger } = setup();
			repository.listRecentProjectThreadsForUser.mockRejectedValue(new Error('db is down'));

			const section = await history.getPastConversationsSection();

			expect(section).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('past-conversations hint'),
				expect.objectContaining({ threadId: CURRENT_THREAD_ID, error: 'db is down' }),
			);
		});
	});
});
