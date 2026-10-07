import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { N8nMemory } from '../../agents/integrations/n8n-memory';
import { AgentExecutionThreadRepository } from '../../agents/repositories/agent-execution-thread.repository';
import { SystemAgentExecutionService } from '../../agents/system-agents/system-agent-execution.service';
import { InstanceAiMemoryService } from '../instance-ai-memory.service';

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
	findOwnedHistoryPage: vi.fn(),
	findOwnedByAgent: vi.fn(),
	findIdsOwnedByAgent: vi.fn(),
	findByAgentUpdatedBefore: vi.fn(),
	delete: vi.fn(),
	updateOwned: vi.fn(),
};
const mockSystemAgentExecution = { createThread: vi.fn() };
const mockUserRepository = { findByIdWithRole: vi.fn() };

Container.set(N8nMemory, { getImplementation: () => mockAgentMemory } as never);
Container.set(AgentExecutionThreadRepository, mockThreads as never);
Container.set(SystemAgentExecutionService, mockSystemAgentExecution as never);
Container.set(UserRepository, mockUserRepository as never);

function createService(options: { threadTtlDays?: number } = {}): InstanceAiMemoryService {
	const mockConfig = { instanceAi: { threadTtlDays: options.threadTtlDays ?? 0 } };
	const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
	return new InstanceAiMemoryService(mockLogger as never, mockConfig as never);
}

/** An Assistant session row as `AgentExecutionThreadRepository` returns it. */
function makeSession(id: string, updatedAt: string, ownerId = 'user-1') {
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
		mockThreads.findOwnedHistoryPage.mockReset();
		mockGetThread.mockResolvedValue(null);
	});

	it('encodes the last returned row as the cursor and stops on the final page', async () => {
		const rows = ['c', 'b', 'a'].map((id) => makeSession(id, '2026-02-01T00:00:00.000Z'));
		mockThreads.findOwnedHistoryPage.mockResolvedValueOnce(rows).mockResolvedValueOnce([rows[2]]);
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
		expect(mockThreads.findOwnedHistoryPage).toHaveBeenNthCalledWith(
			1,
			'n8n-assistant',
			'user-1',
			2,
			'invoice',
			undefined,
		);
		expect(mockThreads.findOwnedHistoryPage).toHaveBeenNthCalledWith(
			2,
			'n8n-assistant',
			'user-1',
			2,
			'invoice',
			{
				id: 'b',
				updatedAt: rows[1].updatedAt,
			},
		);
		expect(second).toMatchObject({ hasMore: false, nextCursor: null });
		expect(second.threads.map((thread) => thread.id)).toEqual(['a']);
	});

	it('returns an empty final page for a search with no matches', async () => {
		mockThreads.findOwnedHistoryPage.mockResolvedValueOnce([]);
		expect(
			await createService().listThreadHistory('user-1', { limit: 30, search: 'missing' }),
		).toEqual({ threads: [], hasMore: false, nextCursor: null });
	});

	it('rejects a malformed cursor before querying storage', async () => {
		await expect(
			createService().listThreadHistory('user-1', { limit: 30, cursor: 'invalid' }),
		).rejects.toThrow('Invalid thread history cursor');
		expect(mockThreads.findOwnedHistoryPage).not.toHaveBeenCalled();
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
		mockThreads.findOwnedByAgent.mockResolvedValueOnce([
			makeSession('a', '2026-01-01T00:00:00.000Z'),
			makeSession('b', '2026-01-01T00:00:00.000Z'),
		]);

		const deleted = await createService().deleteThreadsForUser('user-1');

		expect(deleted).toBe(2);
		expect(mockThreads.findOwnedByAgent).toHaveBeenCalledWith('n8n-assistant', 'user-1');
		expect(mockDeleteThread).toHaveBeenCalledWith('a');
		expect(mockDeleteThread).toHaveBeenCalledWith('b');
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
