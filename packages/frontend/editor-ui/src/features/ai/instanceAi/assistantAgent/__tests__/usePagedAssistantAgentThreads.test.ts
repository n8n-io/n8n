import type { SystemAgentThreadSummary } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';

import {
	getSystemAgentThread,
	listSystemAgentThreads,
} from '@/features/agents/composables/useAgentApi';

import { useAssistantAgentThreadsStore } from '../assistantAgentThreads.store';
import { usePagedAssistantAgentThreads } from '../usePagedAssistantAgentThreads';

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	listSystemAgentThreads: vi.fn(),
	getSystemAgentThread: vi.fn(),
	deleteSystemAgentThread: vi.fn(),
	renameSystemAgentThread: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));

const thread = (id: string, updatedAt: string, title = `Chat ${id}`): SystemAgentThreadSummary => ({
	id,
	title,
	updatedAt,
	projectId: 'project-1',
});

const ids = (threads: SystemAgentThreadSummary[]) => threads.map((t) => t.id);

describe('usePagedAssistantAgentThreads', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.mocked(listSystemAgentThreads).mockReset();
		vi.mocked(getSystemAgentThread).mockReset();
	});

	it('shows a thread that the store learned about after the page loaded', async () => {
		vi.mocked(listSystemAgentThreads).mockResolvedValue({
			data: [thread('old', '2026-01-01T00:00:00.000Z')],
			nextCursor: null,
		});
		const paged = usePagedAssistantAgentThreads({ pageSize: 30 });
		paged.loadNext();
		await flushPromises();

		vi.mocked(getSystemAgentThread).mockResolvedValue(thread('new', '2026-01-02T00:00:00.000Z'));
		await useAssistantAgentThreadsStore().loadThread('new');

		expect(ids(paged.items.value)).toEqual(['new', 'old']);
	});

	it('takes the newer title from the store for a thread that is on the page', async () => {
		vi.mocked(listSystemAgentThreads)
			.mockResolvedValueOnce({
				data: [thread('a', '2026-01-01T00:00:00.000Z', 'Untitled')],
				nextCursor: null,
			})
			.mockResolvedValueOnce({
				data: [thread('a', '2026-01-01T00:05:00.000Z', 'Current time')],
				nextCursor: null,
			});
		const paged = usePagedAssistantAgentThreads({ pageSize: 30 });
		paged.loadNext();
		await flushPromises();

		await useAssistantAgentThreadsStore().fetchRecent();

		expect(paged.items.value.map((t) => t.title)).toEqual(['Current time']);
	});

	it('leaves out store threads older than the loaded range while more pages remain', async () => {
		vi.mocked(listSystemAgentThreads).mockResolvedValue({
			data: [thread('loaded', '2026-01-05T00:00:00.000Z')],
			nextCursor: 'next',
		});
		const paged = usePagedAssistantAgentThreads({ pageSize: 1 });
		paged.loadNext();
		await flushPromises();

		vi.mocked(getSystemAgentThread).mockResolvedValue(thread('older', '2026-01-01T00:00:00.000Z'));
		await useAssistantAgentThreadsStore().loadThread('older');

		expect(ids(paged.items.value)).toEqual(['loaded']);
	});

	it('shows only the server matches while searching', async () => {
		const search = ref<string | undefined>(undefined);
		vi.mocked(listSystemAgentThreads).mockResolvedValue({
			data: [thread('match', '2026-01-01T00:00:00.000Z')],
			nextCursor: null,
		});
		const paged = usePagedAssistantAgentThreads({ pageSize: 30, search });
		vi.mocked(getSystemAgentThread).mockResolvedValue(thread('other', '2026-01-02T00:00:00.000Z'));
		await useAssistantAgentThreadsStore().loadThread('other');

		search.value = 'match';
		await flushPromises();

		expect(ids(paged.items.value)).toEqual(['match']);
	});
});
