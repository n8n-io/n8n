import type { SystemAgentThreadSummary, SystemAgentThreadsResponse } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import {
	deleteSystemAgentThread,
	getSystemAgentThread,
	listSystemAgentThreads,
	renameSystemAgentThread,
} from '@/features/agents/composables/useAgentApi';

import { fetchAssistantAgentThreadCredits } from '../assistantAgentTabs.api';
import { knownAssistantThreadRuntime } from '../assistantAgentThreads';
import { useAssistantAgentThreadsStore } from '../assistantAgentThreads.store';

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	listSystemAgentThreads: vi.fn(),
	getSystemAgentThread: vi.fn(),
	deleteSystemAgentThread: vi.fn(),
	renameSystemAgentThread: vi.fn(),
}));

vi.mock('../assistantAgentTabs.api', () => ({
	fetchAssistantAgentThreadCredits: vi.fn(),
}));

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const thread = (id: string, updatedAt: string): SystemAgentThreadSummary => ({
	id,
	title: `Chat ${id}`,
	updatedAt,
	projectId: `project-${id}`,
});

const runtimeOf = (threadId: string) =>
	knownAssistantThreadRuntime(threadId, {
		assistantAgentEnabled: true,
		isAssistantThread: () => false,
	});

describe('useAssistantAgentThreadsStore', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.mocked(listSystemAgentThreads).mockReset();
		vi.mocked(getSystemAgentThread).mockReset();
		vi.mocked(deleteSystemAgentThread).mockReset();
		vi.mocked(renameSystemAgentThread).mockReset();
		vi.mocked(fetchAssistantAgentThreadCredits).mockReset();
		showError.mockReset();
	});

	describe('generated titles', () => {
		const titlePush = (threadId: string, agentId = 'assistant') => ({
			projectId: 'project-1',
			agentId,
			threadId,
			title: 'Berlin rain alert',
		});
		const untitled = (id: string): SystemAgentThreadSummary => ({
			...thread(id, '2026-01-02T00:00:00.000Z'),
			title: null,
		});

		it('shows a pushed title on a thread that the lists hold', async () => {
			vi.mocked(listSystemAgentThreads).mockResolvedValue({
				data: [untitled('t1')],
				nextCursor: null,
			});
			const store = useAssistantAgentThreadsStore();
			await store.fetchRecent();

			store.applyGeneratedTitle(titlePush('t1'));

			expect(store.threadsById.get('t1')?.title).toBe('Berlin rain alert');
			expect(getSystemAgentThread).not.toHaveBeenCalled();
		});

		it('loads a thread that the lists do not hold yet', async () => {
			vi.mocked(getSystemAgentThread).mockResolvedValue({
				...untitled('t1'),
				title: 'Berlin rain alert',
			});
			const store = useAssistantAgentThreadsStore();

			store.applyGeneratedTitle(titlePush('t1'));

			await vi.waitFor(() => expect(store.threadsById.get('t1')?.title).toBe('Berlin rain alert'));
		});

		it('keeps a title that the user renamed the thread to', async () => {
			vi.mocked(listSystemAgentThreads).mockResolvedValue({
				data: [untitled('t1')],
				nextCursor: null,
			});
			vi.mocked(renameSystemAgentThread).mockResolvedValue(undefined);
			const store = useAssistantAgentThreadsStore();
			await store.fetchRecent();
			await store.renameThread('t1', 'My alerts');

			store.applyGeneratedTitle(titlePush('t1'));

			expect(store.threadsById.get('t1')?.title).toBe('My alerts');
		});

		it('ignores titles of other agents and of deleted threads', async () => {
			vi.mocked(listSystemAgentThreads).mockResolvedValue({
				data: [untitled('t1'), untitled('t2')],
				nextCursor: null,
			});
			vi.mocked(deleteSystemAgentThread).mockResolvedValue(undefined);
			const store = useAssistantAgentThreadsStore();
			await store.fetchRecent();
			await store.deleteThread(untitled('t2'));

			store.applyGeneratedTitle(titlePush('t1', 'other-agent'));
			store.applyGeneratedTitle(titlePush('t2'));

			expect(store.threadsById.get('t1')?.title).toBeNull();
			expect(store.threadsById.has('t2')).toBe(false);
			expect(getSystemAgentThread).not.toHaveBeenCalled();
		});
	});

	describe('thread credits', () => {
		it('loads the stored credit total of a thread', async () => {
			vi.mocked(fetchAssistantAgentThreadCredits).mockResolvedValue({ creditsUsed: 2.5 });
			const store = useAssistantAgentThreadsStore();

			await store.loadThreadCredits('t1');

			expect(fetchAssistantAgentThreadCredits).toHaveBeenCalledWith(expect.anything(), 't1');
			expect(store.threadCreditsUsed('t1')).toBe(2.5);
		});

		it('reports whether the credit total loaded', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const store = useAssistantAgentThreadsStore();

			vi.mocked(fetchAssistantAgentThreadCredits).mockResolvedValue({ creditsUsed: null });
			await expect(store.loadThreadCredits('t1')).resolves.toBe(true);

			vi.mocked(fetchAssistantAgentThreadCredits).mockRejectedValue(new Error('offline'));
			await expect(store.loadThreadCredits('t2')).resolves.toBe(false);
			expect(store.threadCreditsUsed('t2')).toBeUndefined();
		});

		it('keeps a pushed total that a slower load would make older', async () => {
			let resolve: (value: { creditsUsed: number }) => void = () => {};
			vi.mocked(fetchAssistantAgentThreadCredits).mockReturnValue(
				new Promise((r) => {
					resolve = r;
				}),
			);
			const store = useAssistantAgentThreadsStore();

			const load = store.loadThreadCredits('t1');
			store.setThreadCreditsUsed('t1', 3);
			resolve({ creditsUsed: 2 });
			await load;

			expect(store.threadCreditsUsed('t1')).toBe(3);
			store.setThreadCreditsUsed('t1', 4.5);
			expect(store.threadCreditsUsed('t1')).toBe(4.5);
		});

		it('drops the total of a deleted thread', async () => {
			vi.mocked(deleteSystemAgentThread).mockResolvedValue(undefined);
			const store = useAssistantAgentThreadsStore();
			store.setThreadCreditsUsed('t1', 2);

			await store.deleteThread(thread('t1', '2026-01-02T00:00:00.000Z'));

			expect(store.threadCreditsUsed('t1')).toBeUndefined();
		});
	});

	it('loads the recent threads newest first, and remembers them as Assistant agent threads', async () => {
		vi.mocked(listSystemAgentThreads).mockResolvedValue({
			data: [thread('recent-new', '2026-01-02T00:00:00.000Z')],
			nextCursor: null,
		});
		vi.mocked(getSystemAgentThread).mockResolvedValue(
			thread('opened-old', '2026-01-01T00:00:00.000Z'),
		);
		const store = useAssistantAgentThreadsStore();

		await store.fetchRecent();
		await store.loadThread('opened-old');

		expect(listSystemAgentThreads).toHaveBeenCalledWith(expect.anything(), 'assistant', {
			limit: 10,
		});
		expect(store.knownThreads.map(({ id }) => id)).toEqual(['recent-new', 'opened-old']);
		expect(runtimeOf('recent-new')).toEqual({
			kind: 'assistant-agent',
			projectId: 'project-recent-new',
		});
		expect(runtimeOf('opened-old')).toEqual({
			kind: 'assistant-agent',
			projectId: 'project-opened-old',
		});
	});

	it('renames a thread and keeps the new title over a response that the rename overtook', async () => {
		let finishList!: (response: SystemAgentThreadsResponse) => void;
		const page = { data: [thread('a', '2026-01-02T00:00:00.000Z')], nextCursor: null };
		vi.mocked(listSystemAgentThreads)
			.mockResolvedValueOnce(page)
			.mockReturnValueOnce(
				new Promise((resolve) => {
					finishList = resolve;
				}),
			);
		const store = useAssistantAgentThreadsStore();
		await store.fetchRecent();

		// The list request starts before the rename and answers after it, with the old title.
		const staleFetch = store.fetchRecent();
		await store.renameThread('a', 'Invoices');
		finishList(page);
		await staleFetch;

		expect(renameSystemAgentThread).toHaveBeenCalledWith(
			expect.anything(),
			'assistant',
			'a',
			'Invoices',
		);
		expect(store.threadsById.get('a')?.title).toBe('Invoices');
	});

	it('restores the old title and rethrows when the rename fails', async () => {
		vi.mocked(listSystemAgentThreads).mockResolvedValue({
			data: [thread('a', '2026-01-02T00:00:00.000Z')],
			nextCursor: null,
		});
		vi.mocked(renameSystemAgentThread).mockRejectedValue(new Error('Request failed'));
		const store = useAssistantAgentThreadsStore();
		await store.fetchRecent();

		await expect(store.renameThread('a', 'Invoices')).rejects.toThrow('Request failed');

		expect(store.threadsById.get('a')?.title).toBe('Chat a');
	});

	it('keeps the title of a later rename when an earlier rename fails', async () => {
		vi.mocked(listSystemAgentThreads).mockResolvedValue({
			data: [thread('a', '2026-01-02T00:00:00.000Z')],
			nextCursor: null,
		});
		let failFirst: (error: Error) => void = () => {};
		vi.mocked(renameSystemAgentThread)
			.mockImplementationOnce(
				async () =>
					await new Promise<void>((_resolve, reject) => {
						failFirst = reject;
					}),
			)
			.mockResolvedValueOnce();
		const store = useAssistantAgentThreadsStore();
		await store.fetchRecent();

		const first = store.renameThread('a', 'Invoices');
		await store.renameThread('a', 'Receipts');
		failFirst(new Error('Request failed'));
		await expect(first).rejects.toThrow('Request failed');

		expect(store.threadsById.get('a')?.title).toBe('Receipts');
	});

	it('deletes a thread and keeps it out of the lists', async () => {
		vi.mocked(listSystemAgentThreads).mockResolvedValue({
			data: [thread('t1', '2026-01-02T00:00:00.000Z')],
			nextCursor: null,
		});
		const store = useAssistantAgentThreadsStore();
		await store.fetchRecent();

		await expect(store.deleteThread(thread('t1', '2026-01-02T00:00:00.000Z'))).resolves.toBe(true);

		expect(deleteSystemAgentThread).toHaveBeenCalledWith(expect.anything(), 'assistant', 't1');
		expect(store.knownThreads).toEqual([]);
		expect(store.deletedThreadIds.has('t1')).toBe(true);
		// Its URL now runs the lookup, and opens as a missing thread.
		expect(runtimeOf('t1')).toBeUndefined();
	});

	it('does not bring back a thread whose load a delete overtook', async () => {
		let finishLoad!: (summary: SystemAgentThreadSummary) => void;
		vi.mocked(getSystemAgentThread).mockReturnValue(
			new Promise((resolve) => {
				finishLoad = resolve;
			}),
		);
		const store = useAssistantAgentThreadsStore();

		const loading = store.loadThread('overtaken');
		await store.deleteThread(thread('overtaken', '2026-01-02T00:00:00.000Z'));
		finishLoad(thread('overtaken', '2026-01-02T00:00:00.000Z'));
		await loading;

		expect(store.knownThreads).toEqual([]);
		expect(runtimeOf('overtaken')).toBeUndefined();
	});

	it('keeps the sent text as the preview of a new thread that the server has no preview for yet', async () => {
		vi.mocked(getSystemAgentThread)
			.mockResolvedValueOnce({ ...thread('queued', '2026-01-02T00:00:00.000Z'), title: null })
			.mockResolvedValueOnce({
				...thread('admitted', '2026-01-02T00:00:00.000Z'),
				title: null,
				firstMessage: 'Server preview',
			});
		const store = useAssistantAgentThreadsStore();

		await store.loadThread('queued', 'Build a digest');
		await store.loadThread('admitted', 'Build a digest');

		expect(store.threadsById.get('queued')?.firstMessage).toBe('Build a digest');
		expect(store.threadsById.get('admitted')?.firstMessage).toBe('Server preview');
	});

	it('adds a thread that the route view looked up, so the thread view does not load it again', async () => {
		const store = useAssistantAgentThreadsStore();

		store.addOpenedThread(thread('looked-up', '2026-01-01T00:00:00.000Z'));
		await store.loadThread('looked-up');

		expect(getSystemAgentThread).not.toHaveBeenCalled();
		expect(store.knownThreads.map(({ id }) => id)).toEqual(['looked-up']);
		expect(runtimeOf('looked-up')).toEqual({
			kind: 'assistant-agent',
			projectId: 'project-looked-up',
		});
	});

	it('keeps the thread and shows the error when the delete fails', async () => {
		vi.mocked(deleteSystemAgentThread).mockRejectedValue(new Error('Turn still running'));
		const store = useAssistantAgentThreadsStore();
		store.recentThreads = [thread('t1', '2026-01-02T00:00:00.000Z')];

		await expect(store.deleteThread(thread('t1', '2026-01-02T00:00:00.000Z'))).resolves.toBe(false);

		expect(showError).toHaveBeenCalled();
		expect(store.knownThreads.map(({ id }) => id)).toEqual(['t1']);
	});
});
