import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { N8nMemory } from '../../agents/integrations/n8n-memory';
import { AgentExecutionThreadRepository } from '../../agents/repositories/agent-execution-thread.repository';
import { AgentThreadRepository } from '../../agents/repositories/agent-thread.repository';
import { SystemAgentExecutionService } from '../../agents/system-agents/system-agent-execution.service';
import type { ThreadRunSummary } from '../../agents/repositories/agent-execution.repository';
import { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { ThreadFactsService } from '../thread-overview/thread-facts.service';

/** Page source for the message double. Tests set `{ messages }`; the service
 *  reads the whole thread through `getMessages` and pages it itself. */
const mockListMessages = vi.fn();
const mockGetThread = vi.fn();
const mockSaveThread = vi.fn();
const mockPatchThread = vi.fn();
const mockDeleteThread = vi.fn();
const mockSaveMessages = vi.fn();
const mockAgentMemory = {
	getMessages: async () =>
		((await mockListMessages()) as { messages?: unknown[] } | undefined)?.messages ?? [],
	getThread: mockGetThread,
	saveThread: mockSaveThread,
	patchThread: mockPatchThread,
	deleteThread: mockDeleteThread,
	saveMessages: mockSaveMessages,
};

const mockThreads = {
	findOneBy: vi.fn(),
	findVisibleHistoryPage: vi.fn(),
	findVisibleByAgent: vi.fn(),
	findOwnedByAgent: vi.fn(),
	findWithoutOwnerByIds: vi.fn(),
	findIdsOwnedByAgent: vi.fn(),
	findByAgentUpdatedBefore: vi.fn(),
	delete: vi.fn(),
	updateOwned: vi.fn(),
};
const mockMemoryThreads = { findIdsByResourceId: vi.fn() };
const mockSystemAgentExecution = { createThread: vi.fn() };
const mockUserRepository = { findByIdWithRole: vi.fn() };
/** The two batch reads behind the thread states. The facts service itself is real. */
const mockExecutions = {
	findRunSummariesByThreadIds: vi.fn<(ids: string[]) => Promise<Map<string, ThreadRunSummary>>>(),
};
const mockCheckpointStorage = {
	findSuspendedThreadIds: vi.fn<(agentId: string, ids: string[]) => Promise<Set<string>>>(),
};
const mockLogger = {
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
	scoped: vi.fn(),
};
mockLogger.scoped.mockReturnValue(mockLogger);

Container.set(N8nMemory, { getImplementation: () => mockAgentMemory } as never);
Container.set(AgentExecutionThreadRepository, mockThreads as never);
Container.set(AgentThreadRepository, mockMemoryThreads as never);
Container.set(SystemAgentExecutionService, mockSystemAgentExecution as never);
Container.set(UserRepository, mockUserRepository as never);

function createService(options: { threadTtlDays?: number } = {}): InstanceAiMemoryService {
	const mockConfig = { instanceAi: { threadTtlDays: options.threadTtlDays ?? 0 } };
	const threadFacts = new ThreadFactsService(
		mockLogger as never,
		mockExecutions as never,
		mockCheckpointStorage as never,
	);
	return new InstanceAiMemoryService(mockLogger as never, mockConfig as never, threadFacts);
}

/** An Assistant session row as `AgentExecutionThreadRepository` returns it. */
function makeSession(id: string, updatedAt: string, ownerId: string | null = 'user-1') {
	return {
		id,
		agentId: 'n8n-assistant',
		title: id,
		ownerId,
		projectId: 'project-1',
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date(updatedAt),
	};
}

describe('InstanceAiMemoryService.listThreadHistory', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockThreads.findVisibleHistoryPage.mockReset();
		mockGetThread.mockResolvedValue(null);
	});

	it('encodes the last returned row as the cursor and stops on the final page', async () => {
		const rows = ['c', 'b', 'a'].map((id) => makeSession(id, '2026-02-01T00:00:00.000Z'));
		mockThreads.findVisibleHistoryPage.mockResolvedValueOnce(rows).mockResolvedValueOnce([rows[2]]);
		const service = createService();
		const first = await service.listThreadHistory('user-1', { limit: 2, search: 'invoice' });
		expect(first.threads.map((thread) => thread.id)).toEqual(['c', 'b']);
		expect(first.hasMore).toBe(true);
		expect(first.nextCursor).not.toBeNull();
		const second = await service.listThreadHistory('user-1', {
			limit: 2,
			search: 'invoice',
			cursor: first.nextCursor!,
		});
		const viewer = { userId: 'user-1', sharedProjectIds: [] };
		expect(mockThreads.findVisibleHistoryPage).toHaveBeenNthCalledWith(1, 'n8n-assistant', viewer, {
			limit: 2,
			search: 'invoice',
			before: undefined,
		});
		expect(mockThreads.findVisibleHistoryPage).toHaveBeenNthCalledWith(2, 'n8n-assistant', viewer, {
			limit: 2,
			search: 'invoice',
			before: { id: 'b', updatedAt: rows[1].updatedAt },
		});
		expect(second).toMatchObject({ hasMore: false, nextCursor: null });
		expect(second.threads.map((thread) => thread.id)).toEqual(['a']);
	});

	it('pages the threads shared in the given projects too', async () => {
		mockThreads.findVisibleHistoryPage.mockResolvedValueOnce([]);

		await createService().listThreadHistory('user-1', { limit: 30 }, ['project-1']);

		expect(mockThreads.findVisibleHistoryPage).toHaveBeenCalledWith(
			'n8n-assistant',
			{ userId: 'user-1', sharedProjectIds: ['project-1'] },
			{ limit: 30, search: undefined, before: undefined },
		);
	});

	it('returns an empty final page for a search with no matches', async () => {
		mockThreads.findVisibleHistoryPage.mockResolvedValueOnce([]);
		expect(
			await createService().listThreadHistory('user-1', { limit: 30, search: 'missing' }),
		).toEqual({ threads: [], hasMore: false, nextCursor: null });
	});

	it('rejects a malformed cursor before querying storage', async () => {
		await expect(
			createService().listThreadHistory('user-1', { limit: 30, cursor: 'invalid' }),
		).rejects.toThrow('Invalid thread history cursor');
		expect(mockThreads.findVisibleHistoryPage).not.toHaveBeenCalled();
	});
});

describe('InstanceAiMemoryService.listThreads', () => {
	const STOPPED = new Date('2026-10-01T09:05:00.000Z');
	const STARTED = new Date('2026-10-01T09:00:00.000Z');
	const run = (status: ThreadRunSummary['latest']['status']): ThreadRunSummary => ({
		latest: {
			status,
			createdAt: STARTED,
			startedAt: STARTED,
			stoppedAt: status === 'running' ? null : STOPPED,
		},
		running: status === 'running',
	});

	/** Newest first, as `findVisibleByAgent` returns the sessions. */
	const storedSessions = (count: number) =>
		Array.from({ length: count }, (_, i) =>
			makeSession(`thread-${i}`, new Date(Date.UTC(2026, 9, 5) - i * 60_000).toISOString()),
		);
	const indexOf = (threadId: string) => Number(threadId.split('-')[1]);

	/** Cycles through the four server states, so each row of a long list has a known state. */
	const expected = (index: number, updatedAt: Date) =>
		[
			{ state: 'needs-you', needsInput: true, lastActivityAt: STOPPED.toISOString() },
			{ state: 'working', needsInput: false, lastActivityAt: STARTED.toISOString() },
			{ state: 'failed', needsInput: false, lastActivityAt: STOPPED.toISOString() },
			{ state: 'idle', needsInput: false, lastActivityAt: updatedAt.toISOString() },
		][index % 4];

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetThread.mockResolvedValue(null);
		mockCheckpointStorage.findSuspendedThreadIds.mockImplementation(
			async (_agentId, ids) => new Set(ids.filter((id) => indexOf(id) % 4 === 0)),
		);
		mockExecutions.findRunSummariesByThreadIds.mockImplementation(async (ids) => {
			const runs = new Map<string, ThreadRunSummary>();
			for (const id of ids) {
				const index = indexOf(id) % 4;
				if (index === 0) runs.set(id, run('success'));
				if (index === 1) runs.set(id, run('running'));
				if (index === 2) runs.set(id, run('error'));
			}
			return runs;
		});
	});

	it('adds the state fields to the first 50 threads only and keeps the stored order', async () => {
		const sessions = storedSessions(60);
		mockThreads.findVisibleByAgent.mockResolvedValueOnce(sessions);

		const result = await createService().listThreads('user-1');

		expect(result.threads.map((thread) => thread.id)).toEqual(sessions.map(({ id }) => id));
		expect(result).toMatchObject({ total: 60, page: 0, hasMore: false });
		result.threads.slice(0, 50).forEach((thread, index) => {
			expect(thread).toMatchObject(expected(index, sessions[index].updatedAt));
		});
		for (const thread of result.threads.slice(50)) {
			expect(thread).not.toHaveProperty('state');
			expect(thread).not.toHaveProperty('needsInput');
			expect(thread).not.toHaveProperty('lastActivityAt');
		}
	});

	it('reads the states of a page with exactly one checkpoint read and one execution read', async () => {
		const sessions = storedSessions(60);
		mockThreads.findVisibleByAgent.mockResolvedValueOnce(sessions);

		await createService().listThreads('user-1');

		const firstIds = sessions.slice(0, 50).map(({ id }) => id);
		expect(mockCheckpointStorage.findSuspendedThreadIds).toHaveBeenCalledTimes(1);
		expect(mockCheckpointStorage.findSuspendedThreadIds).toHaveBeenCalledWith(
			'n8n-assistant',
			firstIds,
		);
		expect(mockExecutions.findRunSummariesByThreadIds).toHaveBeenCalledTimes(1);
		expect(mockExecutions.findRunSummariesByThreadIds).toHaveBeenCalledWith(firstIds);
	});

	it('keeps the existing thread fields next to the new ones', async () => {
		const [session] = storedSessions(1);
		mockThreads.findVisibleByAgent.mockResolvedValueOnce([session]);
		mockGetThread.mockResolvedValueOnce({ id: session.id, title: 'Invoices', metadata: { a: 1 } });

		const result = await createService().listThreads('user-1');

		expect(result.threads).toEqual([
			{
				id: session.id,
				title: 'Invoices',
				resourceId: 'user-1',
				projectId: 'project-1',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: session.updatedAt.toISOString(),
				metadata: { a: 1 },
				state: 'needs-you',
				needsInput: true,
				lastActivityAt: STOPPED.toISOString(),
			},
		]);
	});

	it('reads the states of the requested page, not of the first page', async () => {
		const sessions = storedSessions(5);
		mockThreads.findVisibleByAgent.mockResolvedValueOnce(sessions);

		const result = await createService().listThreads('user-1', 1, 2);

		expect(result.threads.map((thread) => [thread.id, thread.state])).toEqual([
			['thread-2', 'failed'],
			['thread-3', 'idle'],
		]);
		expect(result).toMatchObject({ total: 5, page: 1, hasMore: true });
		expect(mockExecutions.findRunSummariesByThreadIds).toHaveBeenCalledWith([
			'thread-2',
			'thread-3',
		]);
	});

	it('returns the list without the state fields when a state read fails', async () => {
		mockThreads.findVisibleByAgent.mockResolvedValueOnce(storedSessions(3));
		mockExecutions.findRunSummariesByThreadIds.mockRejectedValueOnce(
			new Error('database is locked'),
		);

		const result = await createService().listThreads('user-1');

		expect(result.threads.map((thread) => thread.id)).toEqual(['thread-0', 'thread-1', 'thread-2']);
		for (const thread of result.threads) expect(thread).not.toHaveProperty('state');
		expect(mockLogger.warn).toHaveBeenCalledWith('Failed to read the states of Assistant threads', {
			error: 'database is locked',
		});
	});

	it('lists the own threads and the threads shared in the given projects', async () => {
		mockThreads.findVisibleByAgent.mockResolvedValue([]);

		await createService().listThreads('user-1');
		await createService().listThreads('user-1', 0, 100, ['project-1', 'project-2']);

		expect(mockThreads.findVisibleByAgent).toHaveBeenNthCalledWith(
			1,
			'n8n-assistant',
			'user-1',
			[],
		);
		expect(mockThreads.findVisibleByAgent).toHaveBeenNthCalledWith(2, 'n8n-assistant', 'user-1', [
			'project-1',
			'project-2',
		]);
	});

	it('returns an empty list and reads no states for a user without threads', async () => {
		mockThreads.findVisibleByAgent.mockResolvedValueOnce([]);

		await expect(createService().listThreads('user-1')).resolves.toEqual({
			threads: [],
			total: 0,
			page: 0,
			hasMore: false,
		});
		expect(mockExecutions.findRunSummariesByThreadIds).not.toHaveBeenCalled();
		expect(mockCheckpointStorage.findSuspendedThreadIds).not.toHaveBeenCalled();
	});
});

describe('InstanceAiMemoryService.ensureThread', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockThreads.findOneBy.mockReset();
		mockGetThread.mockReset();
	});

	it('creates the Assistant session and the memory thread with launch metadata', async () => {
		const user = { id: 'user-1' };
		mockUserRepository.findByIdWithRole.mockResolvedValueOnce(user);
		mockThreads.findOneBy
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(makeSession('thread-new', '2026-01-01T00:00:00.000Z'));
		mockGetThread.mockResolvedValue({
			id: 'thread-new',
			metadata: { source: 'template-view', origin: 'internal' },
		});

		const result = await createService().ensureThread('user-1', 'thread-new', 'project-1', {
			source: 'template-view',
			origin: 'internal',
			sourceContext: { templateId: '42' },
		});

		expect(mockSystemAgentExecution.createThread).toHaveBeenCalledWith({
			agentId: 'n8n-assistant',
			user,
			projectId: 'project-1',
			threadId: 'thread-new',
		});
		expect(mockSaveThread).toHaveBeenCalledWith({
			id: 'thread-new',
			resourceId: 'draft-chat:user-1',
			title: '',
			metadata: {
				source: 'template-view',
				origin: 'internal',
				sourceContext: { templateId: '42' },
			},
		});
		expect(result.created).toBe(true);
		expect(result.thread).toMatchObject({ id: 'thread-new', resourceId: 'user-1' });
	});

	it('omits sourceContext from metadata when not provided', async () => {
		mockUserRepository.findByIdWithRole.mockResolvedValueOnce({ id: 'user-1' });
		mockThreads.findOneBy
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(makeSession('thread-2', '2026-01-01T00:00:00.000Z'));

		await createService().ensureThread('user-1', 'thread-2', 'project-1', {
			source: 'website-template',
			origin: 'external',
		});

		expect(mockSaveThread).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: { source: 'website-template', origin: 'external' },
			}),
		);
	});

	it('returns the existing thread without rewriting it', async () => {
		mockThreads.findOneBy.mockResolvedValueOnce({
			...makeSession('thread-existing', '2026-01-02T00:00:00.000Z'),
			title: 'Existing',
		});

		const result = await createService().ensureThread('user-1', 'thread-existing', 'project-1', {
			source: 'assistant_page',
			origin: 'internal',
		});

		expect(mockSystemAgentExecution.createThread).not.toHaveBeenCalled();
		expect(mockSaveThread).not.toHaveBeenCalled();
		expect(result.created).toBe(false);
		expect(result.thread.title).toBe('Existing');
	});

	it('refuses a thread owned by another user', async () => {
		mockThreads.findOneBy.mockResolvedValueOnce(
			makeSession('thread-other', '2026-01-02T00:00:00.000Z', 'user-2'),
		);

		await expect(
			createService().ensureThread('user-1', 'thread-other', 'project-1', {
				source: 'assistant_page',
				origin: 'internal',
			}),
		).rejects.toThrow('is not owned by user user-1');
		expect(mockSaveThread).not.toHaveBeenCalled();
	});
});

describe('InstanceAiMemoryService.restoreThreadMessages', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('preserves message ids and content verbatim, coercing createdAt back to a Date', async () => {
		const service = createService();

		const result = await service.restoreThreadMessages('user-1', 'thread-1', [
			{
				id: 'msg-user',
				type: 'llm',
				role: 'user',
				content: [{ type: 'text', text: 'Send a daily digest to #cosmic-otter-alerts' }],
				createdAt: '2026-01-01T00:00:00.000Z',
			},
			{
				id: 'msg-assistant',
				type: 'llm',
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Built it.' },
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'build-workflow',
						state: 'resolved',
						input: { code: '…' },
						output: { success: true, workflowId: 'wf-1' },
					},
				],
				createdAt: '2026-01-01T00:00:01.000Z',
			},
		]);

		expect(mockSaveMessages).toHaveBeenCalledTimes(1);
		const args = mockSaveMessages.mock.calls[0][0];
		expect(args.threadId).toBe('thread-1');
		expect(args.resourceId).toBe('draft-chat:user-1');
		expect(args.messages).toHaveLength(2);
		// Verbatim restore: same ids and content blocks, createdAt as ascending Dates.
		expect(args.messages[0].id).toBe('msg-user');
		expect(args.messages[1].content[1].toolCallId).toBe('tc-1');
		expect(args.messages[0].createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
		expect(args.messages[1].createdAt).toEqual(new Date('2026-01-01T00:00:01.000Z'));
		expect(result).toEqual({ restored: 2 });
	});

	it('accepts custom messages (no role, data payload)', async () => {
		const service = createService();

		await service.restoreThreadMessages('user-1', 'thread-1', [
			{
				id: 'msg-custom',
				type: 'custom',
				data: { widget: 'setup-card' },
				createdAt: '2026-01-01T00:00:00.000Z',
			},
		]);

		expect(mockSaveMessages.mock.calls[0][0].messages[0].data).toEqual({ widget: 'setup-card' });
	});

	it.each([
		['missing id', { role: 'user', content: [], createdAt: '2026-01-01T00:00:00.000Z' }],
		['unparseable createdAt', { id: 'm', role: 'user', content: [], createdAt: 'not-a-date' }],
		['missing content', { id: 'm', role: 'user', createdAt: '2026-01-01T00:00:00.000Z' }],
		['custom without data', { id: 'm', type: 'custom', createdAt: '2026-01-01T00:00:00.000Z' }],
	])(
		'rejects a structurally invalid message (%s) without writing anything',
		async (_label, bad) => {
			const service = createService();

			await expect(service.restoreThreadMessages('user-1', 'thread-1', [bad])).rejects.toThrow(
				'Seed message at index 0',
			);
			expect(mockSaveMessages).not.toHaveBeenCalled();
		},
	);
});

describe('InstanceAiMemoryService.deleteThread', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('deletes the memory thread and the Assistant session', async () => {
		await createService().deleteThread('thread-1');

		expect(mockDeleteThread).toHaveBeenCalledWith('thread-1');
		expect(mockThreads.delete).toHaveBeenCalledWith({ id: 'thread-1', agentId: 'n8n-assistant' });
	});
});

describe('InstanceAiMemoryService.deleteThreadsForUser', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('deletes every Assistant session the user owns and returns the count', async () => {
		mockMemoryThreads.findIdsByResourceId.mockResolvedValueOnce([]);
		mockThreads.findOwnedByAgent.mockResolvedValueOnce([
			makeSession('a', '2026-01-01T00:00:00.000Z'),
			makeSession('b', '2026-01-01T00:00:00.000Z'),
		]);
		mockThreads.findWithoutOwnerByIds.mockResolvedValueOnce([]);

		const deleted = await createService().deleteThreadsForUser('user-1');

		expect(deleted).toBe(2);
		expect(mockThreads.findOwnedByAgent).toHaveBeenCalledWith('n8n-assistant', 'user-1');
		expect(mockDeleteThread).toHaveBeenCalledWith('a');
		expect(mockDeleteThread).toHaveBeenCalledWith('b');
	});

	it('finds the sessions that lost their owner through the memory threads of the user', async () => {
		// The user row is gone, so the sessions of the user have no owner any more.
		mockMemoryThreads.findIdsByResourceId.mockResolvedValueOnce(['private', 'shared']);
		mockThreads.findOwnedByAgent.mockResolvedValueOnce([]);
		mockThreads.findWithoutOwnerByIds.mockResolvedValueOnce([
			makeSession('private', '2026-01-01T00:00:00.000Z', null),
			makeSession('shared', '2026-01-01T00:00:00.000Z', null),
		]);

		const deleted = await createService().deleteThreadsForUser('user-1');

		expect(deleted).toBe(2);
		expect(mockMemoryThreads.findIdsByResourceId).toHaveBeenCalledWith('draft-chat:user-1');
		expect(mockThreads.findWithoutOwnerByIds).toHaveBeenCalledWith('n8n-assistant', [
			'private',
			'shared',
		]);
		expect(mockDeleteThread).toHaveBeenCalledWith('private');
		expect(mockDeleteThread).toHaveBeenCalledWith('shared');
		expect(mockThreads.delete).toHaveBeenCalledWith({ id: 'shared', agentId: 'n8n-assistant' });
	});
});

describe('InstanceAiMemoryService.checkThreadOwnership', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each([
		['owned', makeSession('t', '2026-01-01T00:00:00.000Z'), 'owned'],
		['missing', null, 'not_found'],
		['another owner', makeSession('t', '2026-01-01T00:00:00.000Z', 'user-2'), 'other_user'],
		[
			'another agent',
			{ ...makeSession('t', '2026-01-01T00:00:00.000Z'), agentId: 'other-agent' },
			'other_user',
		],
	])('reports a thread with %s', async (_label, session, expected) => {
		mockThreads.findOneBy.mockResolvedValueOnce(session);

		expect(await createService().checkThreadOwnership('user-1', 't')).toBe(expected);
	});
});

describe('InstanceAiMemoryService.findOwnedThreadIds', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('asks once for the Assistant sessions of the user, without repeated ids', async () => {
		mockThreads.findIdsOwnedByAgent.mockResolvedValueOnce(['t-1']);

		const owned = await createService().findOwnedThreadIds('user-1', ['t-1', 't-2', 't-1']);

		expect(owned).toEqual(new Set(['t-1']));
		expect(mockThreads.findIdsOwnedByAgent).toHaveBeenCalledTimes(1);
		expect(mockThreads.findIdsOwnedByAgent).toHaveBeenCalledWith('n8n-assistant', 'user-1', [
			't-1',
			't-2',
		]);
	});
});

describe('InstanceAiMemoryService.cleanupExpiredThreads', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockThreads.findByAgentUpdatedBefore.mockReset();
	});

	it('is a no-op when the thread TTL is disabled', async () => {
		expect(await createService({ threadTtlDays: 0 }).cleanupExpiredThreads()).toBe(0);
		expect(mockThreads.findByAgentUpdatedBefore).not.toHaveBeenCalled();
	});

	it('deletes threads older than the cutoff', async () => {
		const dateNow = vi
			.spyOn(Date, 'now')
			.mockReturnValue(new Date('2026-05-15T00:00:00.000Z').getTime());
		const expired = makeSession('expired-thread', '2026-05-01T00:00:00.000Z');
		mockThreads.findByAgentUpdatedBefore.mockResolvedValueOnce([expired]);
		const onThreadDeleted = vi.fn();

		const deletedCount = await createService({ threadTtlDays: 7 }).cleanupExpiredThreads(
			onThreadDeleted,
		);

		expect(deletedCount).toBe(1);
		expect(mockThreads.findByAgentUpdatedBefore).toHaveBeenCalledWith(
			'n8n-assistant',
			new Date('2026-05-08T00:00:00.000Z'),
			100,
		);
		expect(onThreadDeleted).toHaveBeenCalledWith('expired-thread');
		expect(mockDeleteThread).toHaveBeenCalledWith('expired-thread');

		dateNow.mockRestore();
	});

	it('stops before the next thread once the signal is aborted', async () => {
		const dateNow = vi
			.spyOn(Date, 'now')
			.mockReturnValue(new Date('2026-05-15T00:00:00.000Z').getTime());
		const first = makeSession('expired-1', '2026-05-01T00:00:00.000Z');
		const second = makeSession('expired-2', '2026-05-02T00:00:00.000Z');
		const controller = new AbortController();
		mockThreads.findByAgentUpdatedBefore.mockResolvedValue([first, second]);
		mockDeleteThread.mockImplementation(async () => controller.abort());

		const deletedCount = await createService({ threadTtlDays: 7 }).cleanupExpiredThreads(
			undefined,
			controller.signal,
		);

		expect(deletedCount).toBe(1);
		expect(mockDeleteThread).toHaveBeenCalledTimes(1);
		expect(mockDeleteThread).toHaveBeenCalledWith(first.id);
		expect(mockThreads.findByAgentUpdatedBefore).toHaveBeenCalledTimes(1);

		dateNow.mockRestore();
		mockDeleteThread.mockReset();
	});
});

describe('bindAgentBuilderTarget', () => {
	const target = { agentId: 'aBcDeFgHiJkLmNoP', projectId: 'project-1', name: 'Support Triage' };

	function seedThread(metadata: Record<string, unknown>, resourceId = 'draft-chat:user-1') {
		let stored: unknown = {
			id: 'thread-1',
			title: 'Chat',
			resourceId,
			metadata,
			createdAt: new Date('2026-08-20T00:00:00.000Z'),
			updatedAt: new Date('2026-08-20T00:00:00.000Z'),
		};
		mockGetThread.mockImplementation(async () => stored);
		mockSaveThread.mockImplementation(async (thread: unknown) => {
			stored = thread;
			return thread;
		});
		mockThreads.findOneBy.mockResolvedValue(makeSession('thread-1', '2026-08-20T00:00:00.000Z'));
	}

	beforeEach(() => {
		mockGetThread.mockReset();
		mockSaveThread.mockReset();
		// Same contract as `N8nMemoryImpl.patchThread`: read, update, replace.
		mockPatchThread.mockImplementation(
			async (args: {
				threadId: string;
				update: (thread: Record<string, unknown>) => Record<string, unknown> | null;
			}) => {
				const thread = (await mockGetThread(args.threadId)) as Record<string, unknown> | null;
				if (!thread) return null;
				const patch = args.update({ ...thread });
				if (!patch) return thread;
				const updated = { ...thread, ...patch };
				await mockSaveThread(updated);
				return updated;
			},
		);
	});

	// A merge-style update cannot delete a key, and a thread carrying both makes a
	// reload show a phantom blank artifact next to the real agent.
	it('replaces the pending marker with the bound target in one write', async () => {
		seedThread({
			instanceAiPendingAgentTarget: { agentId: target.agentId, projectId: target.projectId },
			creditsUsed: 2,
		});

		const thread = await createService().bindAgentBuilderTarget('user-1', 'thread-1', target);

		expect(mockSaveThread).toHaveBeenCalledTimes(1);
		expect(thread.metadata?.instanceAiPendingAgentTarget).toBeUndefined();
		expect(thread.metadata?.instanceAiAgentBuilderTarget).toEqual(target);
		expect(thread.metadata?.creditsUsed).toBe(2);
	});

	it('refuses a thread owned by someone else instead of reporting success', async () => {
		seedThread({}, 'draft-chat:someone-else');

		await expect(
			createService().bindAgentBuilderTarget('user-1', 'thread-1', target),
		).rejects.toThrow('Not authorized for this thread');
		expect(mockSaveThread).not.toHaveBeenCalled();
	});

	it('reports a missing thread', async () => {
		mockGetThread.mockResolvedValue(null);

		await expect(
			createService().bindAgentBuilderTarget('user-1', 'thread-1', target),
		).rejects.toThrow('Thread thread-1 not found');
	});
});
