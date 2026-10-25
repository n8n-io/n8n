import type { SystemAgentThreadSummary } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import {
	deleteSystemAgentThread,
	getSystemAgentThread,
	listSystemAgentThreads,
} from '@/features/agents/composables/useAgentApi';

import { knownAssistantThreadRuntime } from '../assistantAgentThreads';
import { useAssistantAgentThreadsStore } from '../assistantAgentThreads.store';

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	listSystemAgentThreads: vi.fn(),
	getSystemAgentThread: vi.fn(),
	deleteSystemAgentThread: vi.fn(),
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
		showError.mockReset();
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
