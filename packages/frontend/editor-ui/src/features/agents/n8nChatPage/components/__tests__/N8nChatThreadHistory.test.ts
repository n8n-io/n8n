import { reactive } from 'vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import type { AgentN8nChatThreadSummary } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';
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

const renderHistory = createComponentRenderer(N8nChatThreadHistory);

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

	it('shows an error with retry', async () => {
		listN8nChatThreadsMock.mockRejectedValueOnce(new Error('network down'));

		const { getByTestId } = await renderAndOpen();
		await waitFor(() => expect(getByTestId('agent-n8n-chat-history-retry')).toBeTruthy());

		listN8nChatThreadsMock.mockResolvedValueOnce({ data: [thread('t1')], nextCursor: null });
		await fireEvent.click(getByTestId('agent-n8n-chat-history-retry'));

		await waitFor(() => expect(getByTestId('agent-n8n-chat-history-item')).toBeTruthy());
	});
});
