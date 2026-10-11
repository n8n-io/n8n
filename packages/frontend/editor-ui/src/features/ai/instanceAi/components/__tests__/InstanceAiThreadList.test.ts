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
import { useAgentN8nChatThreadsStore } from '@/features/agents/n8nChatPage/n8nChatThreads.store';
import { useInstanceAiStore } from '../../instanceAi.store';

const routerPush = vi.fn();
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => ({ params: {} }),
	useRouter: () => ({ push: routerPush }),
}));

const { showMessage } = vi.hoisted(() => ({ showMessage: vi.fn() }));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage }),
}));

const { observe } = vi.hoisted(() => ({ observe: vi.fn() }));

// The composable creates a real IntersectionObserver, which jsdom doesn't implement.
vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: () => ({ observe }),
}));

// Flag off by default, matching production until the n8n Chat experiment is on.
const n8nChatFlag = { value: false };
vi.mock('@/features/agents/composables/useAgentsN8nChatFlag', () => ({
	useAgentsN8nChatFlag: () => n8nChatFlag,
}));

function agentThread(id: string, updatedAt: string, title: string | null = `Agent ${id}`) {
	return {
		id,
		title,
		updatedAt,
		agent: { id: `agent-${id}`, name: 'Support', projectId: 'project-1' },
	};
}

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
		showMessage.mockClear();
		routerPush.mockClear();
		n8nChatFlag.value = false;
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
		await vi.waitFor(() => {
			expect(showMessage).toHaveBeenCalledWith({ type: 'success', title: 'Chat renamed' });
		});
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

	describe('with the n8n Chat flag on', () => {
		beforeEach(() => {
			n8nChatFlag.value = true;
			const store = mockedStore(useInstanceAiStore);
			store.threadHistory = {
				search: '',
				threads: [thread('a', { agentId: 'agent-1' })],
				hasMore: false,
				loading: false,
				error: false,
			};
			store.threadHistory.threads[0].updatedAt = '2026-01-01T00:00:00.000Z';
		});

		it('shows only the 5 most recent chats, like the sidebar, with "View all" and no paging', async () => {
			const store = mockedStore(useInstanceAiStore);
			store.threadHistory.threads = ['a', 'b', 'c', 'd'].map((id, index) => ({
				...thread(id),
				updatedAt: `2026-01-0${index + 1}T00:00:00.000Z`,
			}));
			store.threadHistory.hasMore = true;
			mockedStore(useAgentN8nChatThreadsStore).recentThreads = [
				agentThread('g1', '2026-01-05T00:00:00.000Z'),
				agentThread('g2', '2026-01-06T00:00:00.000Z'),
				agentThread('g3', '2026-01-07T00:00:00.000Z'),
			];

			const { findAllByTestId, queryAllByTestId, queryByTestId, getByText } = await renderList();

			await findAllByTestId('instance-ai-agent-thread-item');
			const rows = [
				...queryAllByTestId('instance-ai-agent-thread-item'),
				...queryAllByTestId('instance-ai-thread-item'),
			];
			expect(rows).toHaveLength(5);
			expect(queryByTestId('instance-ai-thread-sentinel')).toBeNull();
			expect(getByText('View all')).toBeInTheDocument();
		});

		it('keeps an older active assistant thread visible past the top-5 cutoff', async () => {
			const store = mockedStore(useInstanceAiStore);
			const threads = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, index) => ({
				...thread(id),
				updatedAt: `2026-01-0${index + 1}T00:00:00.000Z`,
			}));
			store.threadHistory.threads = threads;
			store.threadHistory.hasMore = true;

			const { findAllByTestId } = await renderList({ props: { activeThreadId: 'a' } });

			const rows = await findAllByTestId('instance-ai-thread-item');
			expect(rows.map((row) => row.textContent)).toContainEqual(
				expect.stringContaining('Thread a'),
			);
		});

		it('pages through every Assistant match while searching, without the recent-chats limit', async () => {
			const store = mockedStore(useInstanceAiStore);
			store.threadHistory.search = 'invoice';
			store.threadHistory.threads = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => thread(id));
			store.threadHistory.hasMore = true;
			mockedStore(useAgentN8nChatThreadsStore).recentThreads = [
				agentThread('g1', '2026-01-09T00:00:00.000Z'),
			];

			const { getAllByTestId, queryAllByTestId, getByTestId } = await renderList();

			expect(getAllByTestId('instance-ai-thread-item')).toHaveLength(7);
			expect(queryAllByTestId('instance-ai-agent-thread-item')).toHaveLength(0);
			expect(getByTestId('instance-ai-thread-sentinel')).toBeInTheDocument();
		});

		it('refreshes the shared recent agent threads when the menu opens', async () => {
			await renderList();

			expect(mockedStore(useAgentN8nChatThreadsStore).fetchRecent).toHaveBeenCalledWith(10);
		});

		it('merges agent threads in by updatedAt, with icons and no rename/delete actions', async () => {
			mockedStore(useAgentN8nChatThreadsStore).recentThreads = [
				agentThread('g1', '2026-01-02T00:00:00.000Z'),
			];

			const { findAllByTestId, queryAllByTestId } = await renderList();

			const agentRows = await findAllByTestId('instance-ai-agent-thread-item');
			expect(agentRows).toHaveLength(1);
			expect(agentRows[0]).toHaveTextContent('Agent g1');
			expect(
				agentRows[0].querySelector('[data-test-id="agent-personalisation-icon-tile"]'),
			).not.toBeNull();
			expect(agentRows[0].querySelector('button')).toBeNull();

			const assistantRows = queryAllByTestId('instance-ai-thread-item');
			expect(assistantRows).toHaveLength(1);

			// Newer agent thread sorts above the older assistant one.
			const rowTestIds = [
				...document.body.querySelectorAll(
					'[data-test-id="instance-ai-agent-thread-item"], [data-test-id="instance-ai-thread-item"]',
				),
			].map((el) => el.getAttribute('data-test-id'));
			expect(rowTestIds).toEqual(['instance-ai-agent-thread-item', 'instance-ai-thread-item']);
		});

		it('falls back to the sidebar untitled label for an agent thread with no title', async () => {
			mockedStore(useAgentN8nChatThreadsStore).recentThreads = [
				agentThread('g1', '2026-01-02T00:00:00.000Z', null),
			];

			const { findByText } = await renderList();

			expect(await findByText('New conversation')).toBeInTheDocument();
		});

		it('navigates to the agent chat route when an agent item is selected', async () => {
			mockedStore(useAgentN8nChatThreadsStore).recentThreads = [
				agentThread('g1', '2026-01-02T00:00:00.000Z'),
			];

			const { findByText } = await renderList();
			const row = await findByText('Agent g1');

			await userEvent.click(row);

			await vi.waitFor(() => {
				expect(routerPush).toHaveBeenCalledWith({
					name: 'AgentN8nChatView',
					params: { agentId: 'agent-g1', agentThreadId: 'g1' },
				});
			});
		});

		it('shows only Assistant threads when the list is scoped by a filter', async () => {
			mockedStore(useAgentN8nChatThreadsStore).recentThreads = [
				agentThread('g1', '2026-01-02T00:00:00.000Z'),
			];

			const { findAllByTestId, queryAllByTestId } = await renderList({
				props: { filter: () => true },
			});

			await findAllByTestId('instance-ai-thread-item');
			expect(queryAllByTestId('instance-ai-agent-thread-item')).toHaveLength(0);
		});

		it('shows only Assistant threads when navigation is disabled', async () => {
			mockedStore(useAgentN8nChatThreadsStore).recentThreads = [
				agentThread('g1', '2026-01-02T00:00:00.000Z'),
			];

			const { findAllByTestId, queryAllByTestId } = await renderList({
				props: { navigate: false },
			});

			await findAllByTestId('instance-ai-thread-item');
			expect(queryAllByTestId('instance-ai-agent-thread-item')).toHaveLength(0);
		});
	});

	it('shows no icons and no agent threads while the flag is off, even with recent agent threads loaded', async () => {
		mockedStore(useAgentN8nChatThreadsStore).recentThreads = [
			agentThread('g1', '2026-01-02T00:00:00.000Z'),
		];

		const { getAllByTestId, queryAllByTestId } = await renderList();

		expect(getAllByTestId('instance-ai-thread-item')).toHaveLength(2);
		expect(queryAllByTestId('instance-ai-agent-thread-item')).toHaveLength(0);
	});
});
