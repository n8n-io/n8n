import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiThreadList from '../InstanceAiThreadList.vue';
import { useInstanceAiStore } from '../../instanceAi.store';

// This suite covers only the props added for embedding the list outside the
// full assistant's popover (`filter`, `navigate`, `activeThreadId`, `disabled`)
// — the search/pagination/rename behaviour they leave untouched has its own
// coverage via `InstanceAiThreadsView.test.ts` and manual testing of the page.

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => ({ params: {} }),
	useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

// The composable creates a real IntersectionObserver, which jsdom doesn't implement.
vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: () => ({ observe: vi.fn() }),
}));

function thread(id: string, metadata?: Record<string, unknown>): InstanceAiThreadSummary {
	return {
		id,
		title: `Thread ${id}`,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		metadata,
	};
}

const actionDropdownStub = {
	name: 'ActionDropdown',
	template:
		'<button data-test-id="thread-actions" @click="$emit(\'select\', \'delete\')"><slot name="activator" /></button>',
	props: ['items', 'disabled', 'placement'],
	emits: ['select'],
};

const renderList = createComponentRenderer(InstanceAiThreadList, {
	global: { stubs: { ActionDropdown: actionDropdownStub, N8nActionDropdown: actionDropdownStub } },
});

describe('InstanceAiThreadList', () => {
	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		const store = mockedStore(useInstanceAiStore);
		store.threadHistory = {
			search: '',
			threads: [thread('a', { agentId: 'agent-1' }), thread('b', { agentId: 'agent-2' })],
			hasMore: false,
			loading: false,
			error: false,
		};
	});

	it('scopes the rows to threads the filter accepts', () => {
		const { getAllByTestId } = renderList({
			props: { filter: (t: InstanceAiThreadSummary) => t.metadata?.agentId === 'agent-1' },
		});

		const rows = getAllByTestId('instance-ai-thread-item');
		expect(rows).toHaveLength(1);
		expect(rows[0]).toHaveTextContent('Thread a');
	});

	it('renders every row when no filter is given', () => {
		const { getAllByTestId } = renderList();
		expect(getAllByTestId('instance-ai-thread-item')).toHaveLength(2);
	});

	it('renders rows as buttons instead of links when navigate is false, and hides "View all"', () => {
		const { getAllByTestId, queryByTestId } = renderList({ props: { navigate: false } });

		const rows = getAllByTestId('instance-ai-thread-item');
		expect(rows[0].querySelector('a')).toBeNull();
		expect(rows[0].querySelector('button')).not.toBeNull();
		expect(queryByTestId('instance-ai-view-all-threads')).not.toBeInTheDocument();
	});

	it('emits select instead of navigating when a row is clicked with navigate false', async () => {
		const { getAllByTestId, emitted } = renderList({ props: { navigate: false } });

		const [row] = getAllByTestId('instance-ai-thread-item');
		await userEvent.click(row.querySelector('button')!);

		expect(emitted().select).toEqual([['a']]);
	});

	it('disables rows and the action dropdown, and ignores select while disabled', async () => {
		const { getAllByTestId, emitted } = renderList({ props: { navigate: false, disabled: true } });

		const [row] = getAllByTestId('instance-ai-thread-item');
		expect(row.className).toMatch(/disabled/);
		const button = row.querySelector('button');
		expect(button).toBeDisabled();

		await userEvent.click(button!);
		expect(emitted().select).toBeUndefined();
	});

	it('emits deleted(true) instead of navigating when the active thread is deleted and navigate is false', async () => {
		const store = mockedStore(useInstanceAiStore);
		store.deleteThread.mockResolvedValue(true);

		const { getAllByTestId, emitted } = renderList({
			props: { navigate: false, activeThreadId: 'a' },
		});

		await userEvent.click(getAllByTestId('thread-actions')[0]);

		expect(store.deleteThread).toHaveBeenCalledWith('a');
		await vi.waitFor(() => {
			expect(emitted().deleted).toEqual([[true]]);
		});
	});

	it('ignores the delete action while disabled', async () => {
		const store = mockedStore(useInstanceAiStore);

		const { getAllByTestId } = renderList({
			props: { navigate: false, activeThreadId: 'a', disabled: true },
		});

		await userEvent.click(getAllByTestId('thread-actions')[0]);

		expect(store.deleteThread).not.toHaveBeenCalled();
	});
});
