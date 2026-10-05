import { randomUUID } from 'node:crypto';

import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, type Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { createUserShell } from '@test-integration/db/users';

import { AgentExecutionThread } from '../../../agents/entities/agent-execution-thread.entity';
import { AgentMessageEntity } from '../../../agents/entities/agent-message.entity';
import { AgentResourceEntity } from '../../../agents/entities/agent-resource.entity';
import { AgentThreadEntity } from '../../../agents/entities/agent-thread.entity';
import { AgentRepository } from '../../../agents/repositories/agent.repository';
import { draftChatMemoryResourceId } from '../../../agents/utils/agent-memory-scope';
import {
	askUserContent,
	assistantTextContent,
	assistantWorkingContent,
	toolRowContent,
	userContent,
} from '../../__tests__/conversation-history-content.fixtures';
import { ASSISTANT_AGENT_ID, ASSISTANT_AGENT_NAME } from '../../assistant-turn-options';
import { InstanceAiConversationHistoryRepository } from '../instance-ai-conversation-history.repository';

describe('InstanceAiConversationHistoryRepository', () => {
	let repository: InstanceAiConversationHistoryRepository;
	// Fixture rows go straight into the Agents tables — the reads under test all
	// belong to the conversation-history repository.
	let dataSource: DataSource;
	let userId: string;
	let otherUserId: string;
	let project: Project;
	let otherProject: Project;
	let currentThreadId: string;

	const base = new Date('2026-01-01T10:00:00.000Z');
	const at = (offsetMs: number) => new Date(base.getTime() + offsetMs);

	beforeAll(async () => {
		await testModules.loadModules(['agents', 'instance-ai']);
		await testDb.init();
		repository = Container.get(InstanceAiConversationHistoryRepository);
		dataSource = Container.get(DataSource);
		await Container.get(AgentRepository).ensureInstanceAgent(
			ASSISTANT_AGENT_ID,
			ASSISTANT_AGENT_NAME,
		);
		userId = (await createUserShell(GLOBAL_MEMBER_ROLE)).id;
		otherUserId = (await createUserShell(GLOBAL_MEMBER_ROLE)).id;
		project = await createTeamProject();
		otherProject = await createTeamProject();
	});

	beforeEach(async () => {
		await dataSource.getRepository(AgentMessageEntity).delete({});
		await dataSource.getRepository(AgentThreadEntity).delete({});
		await dataSource.getRepository(AgentExecutionThread).delete({});
		currentThreadId = await createThread({ title: 'Current conversation' });
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** A thread with one opening message, as a thread the user actually sent to. */
	async function createThread(options: {
		ownerId?: string;
		projectId?: string;
		title?: string;
		updatedAt?: Date;
		/** Set for a delegated child run, which is not a conversation of its own. */
		parentThreadId?: string;
		/** `false` mimics a thread created by the client whose first send never happened. */
		withOpeningMessage?: boolean;
	}): Promise<string> {
		const id = randomUUID();
		const ownerId = options.ownerId ?? userId;
		const resourceId = draftChatMemoryResourceId(ownerId);
		await dataSource
			.getRepository(AgentResourceEntity)
			.createQueryBuilder()
			.insert()
			.values({ id: resourceId, metadata: null })
			.orIgnore()
			.execute();
		await dataSource
			.getRepository(AgentThreadEntity)
			.insert({ id, resourceId, title: null, metadata: null });
		await dataSource.getRepository(AgentExecutionThread).insert({
			id,
			agentId: ASSISTANT_AGENT_ID,
			agentName: ASSISTANT_AGENT_NAME,
			ownerId,
			accessScope: 'user',
			projectId: options.projectId ?? project.id,
			title: options.title ?? '',
			parentThreadId: options.parentThreadId ?? null,
			updatedAt: options.updatedAt ?? base,
		});
		if (options.withOpeningMessage !== false) {
			await createMessage({ threadId: id, role: 'user', content: userContent('opening message') });
		}
		return id;
	}

	async function createMessage(options: {
		threadId: string;
		role: string;
		content: string;
		id?: string;
		createdAt?: Date;
	}): Promise<string> {
		const id = options.id ?? randomUUID();
		const messages = dataSource.getRepository(AgentMessageEntity);
		await messages.save(
			messages.create({
				id,
				threadId: options.threadId,
				content: JSON.parse(options.content) as AgentMessageEntity['content'],
				role: options.role,
				type: null,
				resourceId: draftChatMemoryResourceId(userId),
				createdAt: options.createdAt ?? base,
				updatedAt: options.createdAt ?? base,
			}),
		);
		return id;
	}

	async function setTitle(threadId: string, title: string) {
		await dataSource.getRepository(AgentExecutionThread).update({ id: threadId }, { title });
	}

	async function search(query: string, limit = 10) {
		return await repository.searchProjectThreadsForUser({
			userId,
			projectId: project.id,
			excludeThreadId: currentThreadId,
			query,
			limit,
		});
	}

	describe('searchProjectThreadsForUser', () => {
		it('returns only threads of this user in this project', async () => {
			const mine = await createThread({ title: 'Slack digest workflow' });
			await createThread({ title: 'Slack alerts', ownerId: otherUserId });
			await createThread({ title: 'Slack reports', projectId: otherProject.id });

			const rows = await search('slack');

			expect(rows.map((row) => row.id)).toEqual([mine]);
		});

		it('excludes the thread the user is currently in', async () => {
			await setTitle(currentThreadId, 'Slack digest');
			const other = await createThread({ title: 'Slack archive' });

			const rows = await search('slack');

			expect(rows.map((row) => row.id)).toEqual([other]);
		});

		it('excludes sub-agent threads', async () => {
			const subAgentThread = await createThread({
				title: 'Slack sub-agent work',
				parentThreadId: currentThreadId,
			});
			await createMessage({
				threadId: subAgentThread,
				role: 'user',
				content: userContent('post to slack'),
			});

			const rows = await search('slack');

			expect(rows).toEqual([]);
		});

		it('matches on the title', async () => {
			const threadId = await createThread({ title: 'Weekly Slack digest' });
			await createMessage({
				threadId,
				role: 'user',
				content: userContent('summarize my inbox'),
			});

			const rows = await search('slack');

			expect(rows).toEqual([
				expect.objectContaining({ id: threadId, title: 'Weekly Slack digest' }),
			]);
		});

		it('matches on user messages without matching the title', async () => {
			const threadId = await createThread({ title: 'Weekly digest' });
			await createMessage({
				threadId,
				role: 'user',
				content: userContent('post the summary to Slack every Monday'),
			});

			const rows = await search('slack');

			expect(rows).toEqual([expect.objectContaining({ id: threadId })]);
		});

		it('matches ask-user answers but not plain assistant text', async () => {
			const answered = await createThread({ title: 'Timezone setup' });
			await createMessage({
				threadId: answered,
				role: 'assistant',
				content: askUserContent([
					{ question: 'Which timezone?', selectedOptions: ['Europe/Berlin'] },
				]),
			});

			const narrated = await createThread({ title: 'Calendar sync' });
			await createMessage({
				threadId: narrated,
				role: 'assistant',
				content: assistantTextContent('I set the timezone to Europe/Berlin for you.'),
			});

			const rows = await search('berlin');

			expect(rows.map((row) => row.id)).toEqual([answered]);
		});

		it('treats wildcards in the query as literal characters', async () => {
			const literal = await createThread({ title: 'Discount 50% off campaign' });
			await createThread({ title: 'Discount 5012 off campaign' });

			const percentMatches = await search('50%');
			expect(percentMatches.map((row) => row.id)).toEqual([literal]);

			const underscore = await createThread({ title: 'Export report_v2 nightly' });
			await createThread({ title: 'Export reportXv2 nightly' });

			const underscoreMatches = await search('report_v2');
			expect(underscoreMatches.map((row) => row.id)).toEqual([underscore]);
		});

		it('ignores a thread that never received a message, even on a title match', async () => {
			const sent = await createThread({ title: 'Slack digest' });
			await createThread({ title: 'Slack digest draft', withOpeningMessage: false });

			const rows = await search('slack');

			expect(rows.map((row) => row.id)).toEqual([sent]);
		});

		it('returns the most recently updated threads first', async () => {
			const oldest = await createThread({ title: 'Slack A', updatedAt: at(0) });
			const newest = await createThread({ title: 'Slack B', updatedAt: at(2000) });
			const middle = await createThread({ title: 'Slack C', updatedAt: at(1000) });

			const rows = await search('slack');

			expect(rows.map((row) => row.id)).toEqual([newest, middle, oldest]);
		});

		it('applies the limit', async () => {
			await createThread({ title: 'Slack A', updatedAt: at(0) });
			const second = await createThread({ title: 'Slack B', updatedAt: at(1000) });
			const first = await createThread({ title: 'Slack C', updatedAt: at(2000) });

			const rows = await search('slack', 2);

			expect(rows.map((row) => row.id)).toEqual([first, second]);
		});
	});

	describe('listRecentProjectThreadsForUser', () => {
		async function listRecent(limit = 5) {
			return await repository.listRecentProjectThreadsForUser({
				userId,
				projectId: project.id,
				excludeThreadId: currentThreadId,
				limit,
			});
		}

		it('returns only this user and project, excluding the current thread', async () => {
			const mine = await createThread({ title: 'Mine' });
			await createThread({ title: 'Other user', ownerId: otherUserId });
			await createThread({ title: 'Other project', projectId: otherProject.id });
			await createThread({
				title: 'Sub-agent',
				parentThreadId: currentThreadId,
			});

			const rows = await listRecent();

			expect(rows.map((row) => row.id)).toEqual([mine]);
		});

		it('ignores threads that never received a message', async () => {
			const sent = await createThread({ title: 'Sent' });
			await createThread({ title: 'Never sent', withOpeningMessage: false });

			const rows = await listRecent();

			expect(rows.map((row) => row.id)).toEqual([sent]);
		});

		it('orders by recency and applies the limit', async () => {
			await createThread({ title: 'Oldest', updatedAt: at(0) });
			const middle = await createThread({ title: 'Middle', updatedAt: at(1000) });
			const newest = await createThread({ title: 'Newest', updatedAt: at(2000) });

			const rows = await listRecent(2);

			expect(rows.map((row) => row.id)).toEqual([newest, middle]);
		});
	});

	describe('countProjectThreadsForUser', () => {
		it('counts exactly the threads the listing pages over', async () => {
			await createThread({ title: 'A' });
			await createThread({ title: 'B' });
			await createThread({ title: 'Other user', ownerId: otherUserId });
			await createThread({ title: 'Other project', projectId: otherProject.id });
			await createThread({ title: 'Never sent', withOpeningMessage: false });

			await expect(
				repository.countProjectThreadsForUser({
					userId,
					projectId: project.id,
					excludeThreadId: currentThreadId,
				}),
			).resolves.toBe(2);
		});
	});

	// The ownership check behind every `get-messages` read.
	describe('findOwnedThread', () => {
		it('returns the thread for its owner in its project', async () => {
			const threadId = await createThread({ title: 'Mine' });

			await expect(repository.findOwnedThread(threadId, userId, project.id)).resolves.toEqual(
				expect.objectContaining({ id: threadId }),
			);
		});

		it('is null for another user, another project, and an unknown id', async () => {
			const threadId = await createThread({ title: 'Mine' });

			await expect(
				repository.findOwnedThread(threadId, otherUserId, project.id),
			).resolves.toBeNull();
			await expect(
				repository.findOwnedThread(threadId, userId, otherProject.id),
			).resolves.toBeNull();
			await expect(
				repository.findOwnedThread(randomUUID(), userId, project.id),
			).resolves.toBeNull();
		});
	});

	describe('findSearchMatchRows', () => {
		it('returns the newest matching rows per thread, capped', async () => {
			const threadId = await createThread({ title: 'Deploys' });
			await createMessage({
				threadId,
				role: 'user',
				content: userContent('deploy one'),
				createdAt: at(0),
			});
			await createMessage({
				threadId,
				role: 'user',
				content: userContent('deploy two'),
				createdAt: at(1000),
			});
			const newest = await createMessage({
				threadId,
				role: 'user',
				content: userContent('deploy three'),
				createdAt: at(2000),
			});
			await createMessage({
				threadId,
				role: 'user',
				content: userContent('unrelated'),
				createdAt: at(3000),
			});

			const byThread = await repository.findSearchMatchRows([threadId], 'deploy', 2);

			const rows = byThread.get(threadId) ?? [];
			expect(rows).toHaveLength(2);
			expect(rows[0].id).toBe(newest);
		});

		it('caps candidates per thread without starving other threads', async () => {
			// A single shared budget would go to the match-heavy thread and leave
			// the quiet thread with no candidate row at all.
			const busy = await createThread({ title: 'Busy' });
			const busyIds: string[] = [];
			for (let n = 0; n < 9; n++) {
				busyIds.push(
					await createMessage({
						threadId: busy,
						role: 'user',
						content: userContent(`deploy ${n}`),
						createdAt: at(n * 1000),
					}),
				);
			}

			const quiet = await createThread({ title: 'Quiet' });
			const onlyMatch = await createMessage({
				threadId: quiet,
				role: 'user',
				content: userContent('deploy once'),
				createdAt: at(0),
			});

			const byThread = await repository.findSearchMatchRows([busy, quiet], 'deploy', 2);

			expect(byThread.get(busy)?.map((row) => row.id)).toEqual([busyIds[8], busyIds[7]]);
			expect(byThread.get(quiet)?.map((row) => row.id)).toEqual([onlyMatch]);
		});
	});

	describe('findFirstUserMessages', () => {
		it('returns the earliest user row of each thread', async () => {
			const threadId = await createThread({ title: 'Onboarding', withOpeningMessage: false });
			const first = await createMessage({
				threadId,
				role: 'user',
				content: userContent('build me a workflow'),
				createdAt: at(1000),
			});
			await createMessage({
				threadId,
				role: 'user',
				content: userContent('and add Slack'),
				createdAt: at(2000),
			});
			await createMessage({
				threadId,
				role: 'assistant',
				content: assistantTextContent('on it'),
				createdAt: at(0),
			});
			const emptyThreadId = await createThread({
				title: 'No messages yet',
				withOpeningMessage: false,
			});

			const byThread = await repository.findFirstUserMessages([threadId, emptyThreadId]);

			expect(byThread.get(threadId)?.id).toBe(first);
			expect(byThread.has(emptyThreadId)).toBe(false);
		});
	});

	it('uses the same id tie-break for search, opening messages, and windows', async () => {
		const threadId = await createThread({ withOpeningMessage: false });
		const createdAt = at(9000);
		for (const id of ['msg-bbb', 'msg-ccc', 'msg-aaa']) {
			await createMessage({
				threadId,
				id,
				role: 'user',
				content: userContent('deploy'),
				createdAt,
			});
		}

		const matches = await repository.findSearchMatchRows([threadId], 'deploy', 2);
		const first = await repository.findFirstUserMessages([threadId]);
		const tail = await repository.getConversationWindow({
			threadId,
			before: 2,
			after: 0,
			project: (row) => row,
		});
		const head = await repository.getConversationWindow({
			threadId,
			before: 0,
			after: 2,
			project: (row) => row,
		});

		expect(matches.get(threadId)?.map((row) => row.id)).toEqual(['msg-ccc', 'msg-bbb']);
		expect(first.get(threadId)?.id).toBe('msg-aaa');
		expect(tail.rows.map((row) => row.id)).toEqual(['msg-bbb', 'msg-ccc']);
		expect(head.rows.map((row) => row.id)).toEqual(['msg-aaa', 'msg-bbb']);
	});

	describe('findMessageInThread', () => {
		it('finds a conversation row and ignores rows of other threads', async () => {
			const threadId = await createThread({ title: 'Anchors' });
			const otherThreadId = await createThread({ title: 'Elsewhere' });
			const messageId = await createMessage({
				threadId,
				role: 'user',
				content: userContent('anchor me'),
			});

			await expect(repository.findMessageInThread(threadId, messageId)).resolves.toEqual(
				expect.objectContaining({ id: messageId }),
			);
			await expect(repository.findMessageInThread(otherThreadId, messageId)).resolves.toBeNull();
		});

		it('ignores rows that can never appear in a window', async () => {
			const threadId = await createThread({ title: 'Anchors' });
			const toolMessageId = await createMessage({
				threadId,
				role: 'tool',
				content: toolRowContent(),
			});
			const narrationId = await createMessage({
				threadId,
				role: 'assistant',
				content: assistantWorkingContent('Building the workflow now.'),
			});

			await expect(repository.findMessageInThread(threadId, toolMessageId)).resolves.toBeNull();
			await expect(repository.findMessageInThread(threadId, narrationId)).resolves.toBeNull();
		});
	});

	describe('getConversationWindow', () => {
		let threadId: string;
		let messageIds: Record<'a' | 'b' | 'c' | 'd' | 'e', string>;

		beforeEach(async () => {
			threadId = await createThread({ title: 'Long conversation', withOpeningMessage: false });
			messageIds = {
				a: await createMessage({
					threadId,
					role: 'user',
					content: userContent('one'),
					createdAt: at(0),
				}),
				b: await createMessage({
					threadId,
					role: 'assistant',
					content: assistantTextContent('two'),
					createdAt: at(1000),
				}),
				c: await createMessage({
					threadId,
					role: 'user',
					content: userContent('three'),
					createdAt: at(2000),
				}),
				d: await createMessage({
					threadId,
					role: 'assistant',
					content: assistantTextContent('four'),
					createdAt: at(3000),
				}),
				e: await createMessage({
					threadId,
					role: 'user',
					content: userContent('five'),
					createdAt: at(4000),
				}),
			};
			await createMessage({
				threadId,
				role: 'tool',
				content: toolRowContent(),
				createdAt: at(2500),
			});
		});

		it('reads the tail when no anchor is given', async () => {
			const window = await repository.getConversationWindow({
				threadId,
				before: 2,
				after: 0,
				project: (row) => row,
			});

			expect(window.rows.map((row) => row.id)).toEqual([messageIds.d, messageIds.e]);
			expect(window.hasMoreBefore).toBe(true);
			expect(window.hasMoreAfter).toBe(false);
		});

		it('reads the head when only `after` is given', async () => {
			const window = await repository.getConversationWindow({
				threadId,
				before: 0,
				after: 2,
				project: (row) => row,
			});

			expect(window.rows.map((row) => row.id)).toEqual([messageIds.a, messageIds.b]);
			expect(window.hasMoreBefore).toBe(false);
			expect(window.hasMoreAfter).toBe(true);
		});

		it('returns the whole conversation without more-flags when it fits', async () => {
			const window = await repository.getConversationWindow({
				threadId,
				before: 5,
				after: 0,
				project: (row) => row,
			});

			expect(window.rows.map((row) => row.id)).toEqual([
				messageIds.a,
				messageIds.b,
				messageIds.c,
				messageIds.d,
				messageIds.e,
			]);
			expect(window.hasMoreBefore).toBe(false);
			expect(window.hasMoreAfter).toBe(false);
		});

		it('reads around an anchor, including the anchor row', async () => {
			const window = await repository.getConversationWindow({
				threadId,
				anchor: { createdAt: at(2000), id: messageIds.c },
				before: 1,
				after: 1,
				project: (row) => row,
			});

			expect(window.rows.map((row) => row.id)).toEqual([messageIds.b, messageIds.c, messageIds.d]);
			expect(window.hasMoreBefore).toBe(true);
			expect(window.hasMoreAfter).toBe(true);
		});

		it('reports no more rows past the ends of the conversation', async () => {
			const fromStart = await repository.getConversationWindow({
				threadId,
				anchor: { createdAt: at(0), id: messageIds.a },
				before: 2,
				after: 1,
				project: (row) => row,
			});
			expect(fromStart.rows.map((row) => row.id)).toEqual([messageIds.a, messageIds.b]);
			expect(fromStart.hasMoreBefore).toBe(false);
			expect(fromStart.hasMoreAfter).toBe(true);

			const fromEnd = await repository.getConversationWindow({
				threadId,
				anchor: { createdAt: at(4000), id: messageIds.e },
				before: 1,
				after: 2,
				project: (row) => row,
			});
			expect(fromEnd.rows.map((row) => row.id)).toEqual([messageIds.d, messageIds.e]);
			expect(fromEnd.hasMoreBefore).toBe(true);
			expect(fromEnd.hasMoreAfter).toBe(false);
		});

		it('does not let narration and tool-call rows consume window slots', async () => {
			// Interleave the visible conversation with mid-turn rows a reader
			// never sees: `before` must count visible messages, not storage rows.
			await createMessage({
				threadId,
				role: 'assistant',
				content: assistantWorkingContent('Validating…'),
				createdAt: at(3500),
			});
			await createMessage({
				threadId,
				role: 'assistant',
				content: assistantWorkingContent(''),
				createdAt: at(4500),
			});

			const window = await repository.getConversationWindow({
				threadId,
				before: 2,
				after: 0,
				project: (row) => row,
			});

			expect(window.rows.map((row) => row.id)).toEqual([messageIds.d, messageIds.e]);
			expect(window.hasMoreBefore).toBe(true);
		});

		it('keeps ask-user rows visible in windows', async () => {
			const askUserId = await createMessage({
				threadId,
				role: 'assistant',
				content: askUserContent([{ question: 'Which channel?', selectedOptions: ['#alerts'] }]),
				createdAt: at(5000),
			});

			const window = await repository.getConversationWindow({
				threadId,
				before: 2,
				after: 0,
				project: (row) => row,
			});

			expect(window.rows.map((row) => row.id)).toEqual([messageIds.e, askUserId]);
		});

		it('orders rows written in the same millisecond by id', async () => {
			const sameTimestampThread = await createThread({ title: 'Burst', withOpeningMessage: false });
			const sameMoment = at(9000);
			await createMessage({
				threadId: sameTimestampThread,
				role: 'user',
				id: 'msg-aaa',
				content: userContent('first'),
				createdAt: sameMoment,
			});
			await createMessage({
				threadId: sameTimestampThread,
				role: 'assistant',
				id: 'msg-bbb',
				content: assistantTextContent('second'),
				createdAt: sameMoment,
			});

			const tail = await repository.getConversationWindow({
				threadId: sameTimestampThread,
				before: 1,
				after: 0,
				project: (row) => row,
			});
			expect(tail.rows.map((row) => row.id)).toEqual(['msg-bbb']);
			expect(tail.hasMoreBefore).toBe(true);

			const around = await repository.getConversationWindow({
				threadId: sameTimestampThread,
				anchor: { createdAt: sameMoment, id: 'msg-bbb' },
				before: 1,
				after: 1,
				project: (row) => row,
			});
			expect(around.rows.map((row) => row.id)).toEqual(['msg-aaa', 'msg-bbb']);
			expect(around.hasMoreBefore).toBe(false);
			expect(around.hasMoreAfter).toBe(false);
		});

		it("spends window slots only on rows the caller's projector keeps", async () => {
			// The SQL filter cannot tell an internal auto-follow-up from a real user
			// message, so the caller's projector decides what a slot is spent on.
			const mixedThread = await createThread({
				title: 'Auto follow-ups',
				withOpeningMessage: false,
			});
			const project = (row: AgentMessageEntity) =>
				JSON.stringify(row.content).includes('(continue)') ? undefined : row;

			await createMessage({
				threadId: mixedThread,
				role: 'user',
				content: userContent('(continue)'),
				createdAt: at(0),
			});
			await createMessage({
				threadId: mixedThread,
				role: 'user',
				content: userContent('(continue)'),
				createdAt: at(1000),
			});
			const realOne = await createMessage({
				threadId: mixedThread,
				role: 'user',
				content: userContent('set up the digest'),
				createdAt: at(2000),
			});
			await createMessage({
				threadId: mixedThread,
				role: 'user',
				content: userContent('(continue)'),
				createdAt: at(3000),
			});
			const realTwo = await createMessage({
				threadId: mixedThread,
				role: 'assistant',
				content: assistantTextContent('done'),
				createdAt: at(4000),
			});
			await createMessage({
				threadId: mixedThread,
				role: 'user',
				content: userContent('(continue)'),
				createdAt: at(5000),
			});
			const realThree = await createMessage({
				threadId: mixedThread,
				role: 'user',
				content: userContent('now add Slack'),
				createdAt: at(6000),
			});

			const partial = await repository.getConversationWindow({
				threadId: mixedThread,
				before: 2,
				after: 0,
				project,
			});
			expect(partial.rows.map((row) => row.id)).toEqual([realTwo, realThree]);
			expect(partial.hasMoreBefore).toBe(true);

			// Only internal rows are left older than these, and the fetch reached the
			// thread's start: the flags count visible rows, not storage rows.
			const whole = await repository.getConversationWindow({
				threadId: mixedThread,
				before: 3,
				after: 0,
				project,
			});
			expect(whole.rows.map((row) => row.id)).toEqual([realOne, realTwo, realThree]);
			expect(whole.hasMoreBefore).toBe(false);
		});
	});

	describe('hasAtLeastAssistantUserMessages', () => {
		it('counts user messages in Assistant threads only', async () => {
			// `beforeEach` gives the current thread one opening user message.
			await expect(repository.hasAtLeastAssistantUserMessages(1)).resolves.toBe(true);
			await expect(repository.hasAtLeastAssistantUserMessages(2)).resolves.toBe(false);

			// A memory thread with no Assistant session row belongs to another agent.
			const foreignThreadId = randomUUID();
			await dataSource.getRepository(AgentThreadEntity).insert({
				id: foreignThreadId,
				resourceId: draftChatMemoryResourceId(userId),
				title: null,
				metadata: null,
			});
			await createMessage({
				threadId: foreignThreadId,
				role: 'user',
				content: userContent('hello other agent'),
			});
			await createMessage({
				threadId: currentThreadId,
				role: 'assistant',
				content: assistantTextContent('hi'),
			});
			await expect(repository.hasAtLeastAssistantUserMessages(2)).resolves.toBe(false);

			await createMessage({
				threadId: currentThreadId,
				role: 'user',
				content: userContent('second message'),
			});
			await expect(repository.hasAtLeastAssistantUserMessages(2)).resolves.toBe(true);
		});

		it('is true for a threshold of zero', async () => {
			await expect(repository.hasAtLeastAssistantUserMessages(0)).resolves.toBe(true);
		});
	});
});
