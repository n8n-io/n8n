import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { nextTick } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiThreadList from '../InstanceAiThreadList.vue';
import { useInstanceAiStore } from '../../instanceAi.store';

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => ({ params: {} }),
	useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

const { observe } = vi.hoisted(() => ({ observe: vi.fn() }));

// The composable creates a real IntersectionObserver, which jsdom doesn't implement.
vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: () => ({ observe }),
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
		'<div @click="$emit(\'select\', \'rename\')"><slot name="activator" /><button data-test-id="thread-actions" :disabled="disabled" @click.stop="$emit(\'select\', \'delete\')">Delete</button></div>',
	props: ['items', 'disabled', 'placement'],
	emits: ['select'],
};

const renderThreadList = createComponentRenderer(InstanceAiThreadList, {
	global: { stubs: { ActionDropdown: actionDropdownStub, N8nActionDropdown: actionDropdownStub } },
});

async function renderList(options: Parameters<typeof renderThreadList>[0] = {}) {
	const result = renderThreadList({
		...options,
		slots: {
			trigger: '<button data-test-id="history-trigger">History</button>',
			...options.slots,
		},
	});
	await fireEvent.click(result.getByTestId('history-trigger'));
	return result;
}

describe('InstanceAiThreadList', () => {
	beforeEach(() => {
		observe.mockClear();
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

	it('uses the searchable dropdown for server-backed search', async () => {
		const user = userEvent.setup();
		const store = mockedStore(useInstanceAiStore);
		const { emitted, getByPlaceholderText } = await renderList({ props: { navigate: false } });
		const searchInput = getByPlaceholderText('Search conversations');

		await fireEvent.update(searchInput, 'customer onboarding');

		await vi.waitFor(() => {
			expect(store.resetThreadHistory).toHaveBeenCalledWith('customer onboarding');
		});

		store.threadHistory = {
			search: 'customer onboarding',
			threads: [],
			hasMore: false,
			loading: true,
			error: false,
		};
		await nextTick();

		store.threadHistory = {
			...store.threadHistory,
			threads: [thread('search-result')],
			loading: false,
		};
		await nextTick();
		await nextTick();

		searchInput.focus();
		await user.keyboard('{Enter}');

		expect(emitted().select).toEqual([['search-result']]);
	});

	it('shows only the paging sentinel until filtered history is exhausted', async () => {
		const store = mockedStore(useInstanceAiStore);
		store.threadHistory.hasMore = true;
		const { getAllByTestId, getByTestId, queryAllByTestId, queryByText, rerender } =
			await renderList();

		const rows = getAllByTestId('instance-ai-thread-item');
		expect(rows.at(-1)).toContainElement(getByTestId('instance-ai-thread-sentinel'));

		await rerender({ filter: () => false });
		expect(queryAllByTestId('instance-ai-thread-item')).toHaveLength(0);
		expect(getByTestId('instance-ai-thread-list-empty')).toContainElement(
			getByTestId('instance-ai-thread-sentinel'),
		);
		expect(queryByText('No conversations yet')).not.toBeInTheDocument();

		store.threadHistory.hasMore = false;
		await nextTick();

		expect(queryAllByTestId('instance-ai-thread-sentinel')).toHaveLength(0);
		expect(queryByText('No conversations yet')).toBeInTheDocument();
	});

	it('does not rearm paging after a page fails', async () => {
		const store = mockedStore(useInstanceAiStore);
		store.threadHistory = {
			...store.threadHistory,
			hasMore: true,
			loading: true,
		};
		const { queryByTestId } = await renderList();

		expect(queryByTestId('instance-ai-thread-sentinel')).not.toBeInTheDocument();

		store.threadHistory = {
			...store.threadHistory,
			loading: false,
			error: true,
		};
		await nextTick();
		await nextTick();

		expect(queryByTestId('instance-ai-thread-sentinel')).not.toBeInTheDocument();
		expect(observe).not.toHaveBeenCalled();
	});

	it('renames a thread and restores focus without selecting it', async () => {
		const store = mockedStore(useInstanceAiStore);
		const { emitted, findByLabelText, getAllByLabelText, getByPlaceholderText } = await renderList({
			props: { navigate: false },
		});
		const searchInput = getByPlaceholderText('Search conversations');

		searchInput.focus();
		await fireEvent.click(getAllByLabelText('Conversation actions')[0]);

		const renameInput = await findByLabelText('Rename conversation');
		expect(renameInput).toHaveFocus();
		await fireEvent.update(renameInput, 'Renamed conversation');
		await fireEvent.keyDown(renameInput, { key: 'Enter' });
		await nextTick();

		expect(store.renameThread).toHaveBeenCalledWith('a', 'Renamed conversation');
		expect(searchInput).toHaveFocus();
		expect(emitted().select).toBeUndefined();
	});

	it('starts renaming on double-click without selecting the thread first', async () => {
		const { emitted, findByLabelText, getByText } = await renderList({
			props: { navigate: false },
		});

		await userEvent.dblClick(getByText('Thread a'));

		expect(await findByLabelText('Rename conversation')).toHaveFocus();
		expect(emitted().select).toBeUndefined();
	});

	it('returns focus to the history trigger after Escape closes the menu', async () => {
		const user = userEvent.setup();
		const { getByPlaceholderText, getByTestId } = await renderList();

		getByPlaceholderText('Search conversations').focus();
		await user.keyboard('{Escape}');

		await vi.waitFor(() => {
			expect(getByTestId('history-trigger')).toHaveFocus();
		});
	});

	it('scopes the rows to threads the filter accepts', async () => {
		const { getAllByTestId } = await renderList({
			props: { filter: (t: InstanceAiThreadSummary) => t.metadata?.agentId === 'agent-1' },
		});

		const rows = getAllByTestId('instance-ai-thread-item');
		expect(rows).toHaveLength(1);
		expect(rows[0]).toHaveTextContent('Thread a');
	});

	it('renders every row when no filter is given', async () => {
		const { getAllByTestId } = await renderList();
		expect(getAllByTestId('instance-ai-thread-item')).toHaveLength(2);
	});

	it('renders selectable menu items and hides "View all" when navigation is disabled', async () => {
		const { getAllByTestId, queryByTestId } = await renderList({ props: { navigate: false } });

		const rows = getAllByTestId('instance-ai-thread-item');
		expect(rows[0].querySelector('a')).toBeNull();
		expect(rows[0]).toHaveAttribute('role', 'menuitem');
		expect(queryByTestId('instance-ai-view-all-threads')).not.toBeInTheDocument();
	});

	it('emits select instead of navigating when a row is clicked with navigate false', async () => {
		const { emitted, getByText } = await renderList({ props: { navigate: false } });

		await userEvent.click(getByText('Thread a'));

		await vi.waitFor(() => expect(emitted().select).toEqual([['a']]));
	});

	it('disables rows and the action dropdown, and ignores select while disabled', async () => {
		const { getAllByTestId, emitted } = await renderList({
			props: { navigate: false, disabled: true },
		});

		const [row] = getAllByTestId('instance-ai-thread-item');
		expect(row).toHaveAttribute('data-disabled');
		const button = row.querySelector('button');
		expect(button).toBeDisabled();

		await fireEvent.click(row);
		expect(emitted().select).toBeUndefined();
	});

	it('emits deleted(true) instead of navigating when the active thread is deleted and navigate is false', async () => {
		const store = mockedStore(useInstanceAiStore);
		store.deleteThread.mockResolvedValue(true);

		const { getAllByTestId, emitted } = await renderList({
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

		const { getAllByTestId } = await renderList({
			props: { navigate: false, activeThreadId: 'a', disabled: true },
		});

		await userEvent.click(getAllByTestId('thread-actions')[0]);

		expect(store.deleteThread).not.toHaveBeenCalled();
	});
});
