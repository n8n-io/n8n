import { reactive } from 'vue';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import type { AgentN8nChatThreadSummary } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useAgentN8nChatThreadsStore } from '../../n8nChatThreads.store';
import { AGENT_N8N_CHAT_VIEW } from '../../../constants';
import N8nChatThreadHistory from '../N8nChatThreadHistory.vue';

const listN8nChatThreadsMock = vi.fn();
vi.mock('../../../composables/useAgentApi', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../../composables/useAgentApi')>();
	return {
		...actual,
		listN8nChatThreads: (...args: unknown[]) => listN8nChatThreadsMock(...args),
	};
});

const actionDropdownStub = {
	name: 'ActionDropdown',
	template:
		'<div><slot name="activator" /><button data-test-id="thread-delete" @click.stop="$emit(\'select\', \'delete\')">Delete</button></div>',
	props: ['items', 'disabled', 'placement'],
	emits: ['select'],
};

const pushMock = vi.fn();
const route = reactive<{ params: Record<string, string | undefined> }>({ params: {} });
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => route,
	useRouter: () => ({ push: pushMock }),
}));

function thread(id: string, overrides: Partial<AgentN8nChatThreadSummary> = {}) {
	return {
		id,
		title: `Thread ${id}`,
		updatedAt: '2026-01-01T00:00:00.000Z',
		agent: { id: 'agent-1', name: 'Support', projectId: 'project-1' },
		...overrides,
	} satisfies AgentN8nChatThreadSummary;
}

const renderHistory = createComponentRenderer(N8nChatThreadHistory, {
	global: { stubs: { ActionDropdown: actionDropdownStub, N8nActionDropdown: actionDropdownStub } },
});

async function renderAndOpen(props: { agentId?: string } = {}) {
	const pinia = createTestingPinia();
	const result = renderHistory({
		props: { agentId: 'agent-1', ...props },
		global: { plugins: [pinia] },
	});
	await fireEvent.click(result.getByTestId('agent-n8n-chat-history-toggle'));
	return result;
}

describe('N8nChatThreadHistory', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		route.params = {};
		listN8nChatThreadsMock.mockResolvedValue({ data: [], nextCursor: null });
	});

	it('loads threads scoped to agentId when the dropdown opens', async () => {
		listN8nChatThreadsMock.mockResolvedValue({
			data: [thread('t1'), thread('t2')],
			nextCursor: null,
		});

		const { getAllByTestId } = await renderAndOpen();

		await waitFor(() => {
			expect(listN8nChatThreadsMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ agentId: 'agent-1' }),
			);
		});
		await waitFor(() => {
			expect(getAllByTestId('agent-n8n-chat-history-item')).toHaveLength(2);
		});
	});

	it('shows a "New chat" entry that routes with only agentId', async () => {
		const { getByTestId } = await renderAndOpen();

		await fireEvent.click(getByTestId('agent-n8n-chat-history-new'));

		expect(pushMock).toHaveBeenCalledWith({
			name: AGENT_N8N_CHAT_VIEW,
			params: { agentId: 'agent-1' },
		});
	});

	it('highlights the currently open thread', async () => {
		route.params = { agentThreadId: 't2' };
		listN8nChatThreadsMock.mockResolvedValue({
			data: [thread('t1'), thread('t2')],
			nextCursor: null,
		});

		const { getAllByTestId } = await renderAndOpen();

		await waitFor(() => {
			expect(getAllByTestId('agent-n8n-chat-history-item')).toHaveLength(2);
		});
		const rows = getAllByTestId('agent-n8n-chat-history-item');
		expect(rows[1].querySelector('[data-icon="check"]')).not.toBeNull();
		expect(rows[0].querySelector('[data-icon="check"]')).toBeNull();
	});

	it('selecting a thread routes to it and closes the dropdown', async () => {
		listN8nChatThreadsMock.mockResolvedValue({ data: [thread('t1')], nextCursor: null });

		const { getAllByTestId, queryByTestId } = await renderAndOpen();
		await waitFor(() => expect(getAllByTestId('agent-n8n-chat-history-item')).toHaveLength(1));

		await fireEvent.click(getAllByTestId('agent-n8n-chat-history-item')[0]);

		expect(pushMock).toHaveBeenCalledWith({
			name: AGENT_N8N_CHAT_VIEW,
			params: { agentId: 'agent-1', agentThreadId: 't1' },
		});
		await waitFor(() => {
			expect(queryByTestId('agent-n8n-chat-history-list')).not.toBeInTheDocument();
		});
	});

	it('loads more threads using the cursor', async () => {
		listN8nChatThreadsMock.mockResolvedValueOnce({ data: [thread('t1')], nextCursor: 'cursor-1' });

		const { getByTestId, getAllByTestId } = await renderAndOpen();
		await waitFor(() => expect(getByTestId('agent-n8n-chat-history-load-more')).toBeTruthy());

		listN8nChatThreadsMock.mockResolvedValueOnce({ data: [thread('t2')], nextCursor: null });
		await fireEvent.click(getByTestId('agent-n8n-chat-history-load-more'));

		await waitFor(() => expect(getAllByTestId('agent-n8n-chat-history-item')).toHaveLength(2));
		expect(listN8nChatThreadsMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ cursor: 'cursor-1' }),
		);
	});

	it('drops a stale response from a previous open', async () => {
		let resolveFirst: (value: { data: AgentN8nChatThreadSummary[]; nextCursor: null }) => void =
			() => {};
		listN8nChatThreadsMock.mockImplementationOnce(
			async () =>
				await new Promise((resolve) => {
					resolveFirst = resolve;
				}),
		);

		const { getAllByTestId, getByTestId } = await renderAndOpen();
		// Close and reopen before the first request resolves — a second, newer request starts.
		await fireEvent.keyDown(document, { key: 'Escape' });
		listN8nChatThreadsMock.mockResolvedValueOnce({ data: [thread('fresh')], nextCursor: null });
		await fireEvent.click(getByTestId('agent-n8n-chat-history-toggle'));

		resolveFirst({ data: [thread('stale')], nextCursor: null });
		await waitFor(() => expect(getAllByTestId('agent-n8n-chat-history-item')).toHaveLength(1));
		expect(getAllByTestId('agent-n8n-chat-history-item')[0].textContent).toContain('fresh');
	});

	it('searches threads on the server, scoped to agentId', async () => {
		listN8nChatThreadsMock.mockResolvedValue({ data: [thread('t1')], nextCursor: null });
		const { getByPlaceholderText } = await renderAndOpen();
		await waitFor(() => expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(1));
		listN8nChatThreadsMock.mockClear();
		listN8nChatThreadsMock.mockResolvedValueOnce({ data: [thread('t2')], nextCursor: null });

		await userEvent.type(getByPlaceholderText('Search'), 'refund');

		await waitFor(() =>
			expect(listN8nChatThreadsMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ agentId: 'agent-1', search: 'refund' }),
			),
		);
	});

	it('shows an error with retry', async () => {
		listN8nChatThreadsMock.mockRejectedValueOnce(new Error('network down'));

		const { getByTestId } = await renderAndOpen();
		await waitFor(() => expect(getByTestId('agent-n8n-chat-history-retry')).toBeTruthy());

		listN8nChatThreadsMock.mockResolvedValueOnce({ data: [thread('t1')], nextCursor: null });
		await fireEvent.click(getByTestId('agent-n8n-chat-history-retry'));

		await waitFor(() => expect(getByTestId('agent-n8n-chat-history-item')).toBeTruthy());
	});

	it('deletes a thread through the store and drops it from the list', async () => {
		const t1 = thread('t1');
		listN8nChatThreadsMock.mockResolvedValue({ data: [t1], nextCursor: null });
		const { getByTestId, queryByTestId } = await renderAndOpen();
		await waitFor(() => expect(getByTestId('agent-n8n-chat-history-item')).toBeTruthy());
		const threadsStore = mockedStore(useAgentN8nChatThreadsStore);
		// The pager drops a row by watching `deletedThreadIds`, so the mock must fill it in,
		// same as the real action does.
		threadsStore.deleteThread.mockImplementation(async (deleted) => {
			threadsStore.deletedThreadIds.add(deleted.id);
			return true;
		});

		await userEvent.click(
			within(getByTestId('agent-n8n-chat-history-item')).getByTestId('thread-delete'),
		);

		expect(threadsStore.deleteThread).toHaveBeenCalledWith(t1);
		await waitFor(() =>
			expect(queryByTestId('agent-n8n-chat-history-item')).not.toBeInTheDocument(),
		);
	});

	it('does not navigate when the user moved to another thread while the delete ran', async () => {
		route.params = { agentThreadId: 't1' };
		listN8nChatThreadsMock.mockResolvedValue({ data: [thread('t1')], nextCursor: null });
		const { getByTestId } = await renderAndOpen();
		await waitFor(() => expect(getByTestId('agent-n8n-chat-history-item')).toBeTruthy());
		const threadsStore = mockedStore(useAgentN8nChatThreadsStore);
		threadsStore.deleteThread.mockImplementation(async () => {
			route.params = { agentThreadId: 't2' };
			return true;
		});

		await userEvent.click(
			within(getByTestId('agent-n8n-chat-history-item')).getByTestId('thread-delete'),
		);

		await waitFor(() => expect(threadsStore.deleteThread).toHaveBeenCalled());
		expect(pushMock).not.toHaveBeenCalled();
	});

	it.each([
		{
			name: 'navigates to a new chat for the same agent when the open thread is deleted',
			openThreadId: 't1',
			expectPush: true,
		},
		{
			name: 'does not navigate away when a thread other than the open one is deleted',
			openThreadId: 't2',
			expectPush: false,
		},
	])('$name', async ({ openThreadId, expectPush }) => {
		route.params = { agentThreadId: openThreadId };
		listN8nChatThreadsMock.mockResolvedValue({ data: [thread('t1')], nextCursor: null });
		const { getByTestId } = await renderAndOpen();
		await waitFor(() => expect(getByTestId('agent-n8n-chat-history-item')).toBeTruthy());
		const threadsStore = mockedStore(useAgentN8nChatThreadsStore);
		threadsStore.deleteThread.mockResolvedValue(true);

		await userEvent.click(
			within(getByTestId('agent-n8n-chat-history-item')).getByTestId('thread-delete'),
		);

		await waitFor(() => expect(threadsStore.deleteThread).toHaveBeenCalled());
		const push = { name: AGENT_N8N_CHAT_VIEW, params: { agentId: 'agent-1' } };
		if (expectPush) {
			await waitFor(() => expect(pushMock).toHaveBeenCalledWith(push));
		} else {
			expect(pushMock).not.toHaveBeenCalledWith(push);
		}
	});
});
