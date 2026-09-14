import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import AgentChatBlockConfig from '@/features/apps/components/blocks/AgentChatBlockConfig.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { AgentResource } from '@/features/agents/types';

const listAgentsPage = vi.fn();
vi.mock('@/features/agents/composables/useAgentApi', () => ({
	listAgentsPage: (...args: unknown[]) => listAgentsPage(...args),
}));

const agent = (id: string, name: string, activeVersionId: string | null) =>
	({ id, name, activeVersionId }) as AgentResource;

const renderComponent = createComponentRenderer(AgentChatBlockConfig, {
	pinia: createTestingPinia(),
});

describe('AgentChatBlockConfig', () => {
	beforeEach(() => {
		listAgentsPage.mockResolvedValue({
			count: 2,
			data: [agent('a1', 'Support bot', 'v1'), agent('a2', 'Draft bot', null)],
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('lists the agents of the project and disables the unpublished ones', async () => {
		const { getByTestId, getByText, queryByText } = renderComponent({
			props: { modelValue: {}, projectId: 'p1' },
		});

		await waitFor(() => expect(listAgentsPage).toHaveBeenCalled());
		expect(listAgentsPage.mock.calls[0][1]).toBe('p1');

		await userEvent.click(getByTestId('agent-chat-block-agent-select'));
		await waitFor(() => expect(getByText('Support bot')).toBeInTheDocument());
		const unpublished = getByText('Draft bot (not published)').closest('li');
		expect(unpublished?.classList.contains('is-disabled')).toBe(true);
		expect(queryByText('Draft bot (not published)')?.closest('li')).not.toBeNull();
	});

	it('emits the block data with welcome and placeholder only when set', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: { agentId: 'a1' }, projectId: 'p1' },
		});

		await userEvent.type(getByTestId('agent-chat-block-welcome'), 'Hi');

		await waitFor(() =>
			expect(emitted('update:modelValue').at(-1)).toEqual([{ agentId: 'a1', welcome: 'Hi' }]),
		);

		await userEvent.type(getByTestId('agent-chat-block-placeholder'), 'Ask');

		await waitFor(() =>
			expect(emitted('update:modelValue').at(-1)).toEqual([
				{ agentId: 'a1', welcome: 'Hi', placeholder: 'Ask' },
			]),
		);
	});

	it('shows an empty agent list when the agents endpoint is unavailable', async () => {
		listAgentsPage.mockRejectedValue(new Error('404'));
		const { getByTestId, queryByText } = renderComponent({
			props: { modelValue: {}, projectId: 'p1' },
		});

		await waitFor(() => expect(listAgentsPage).toHaveBeenCalled());
		await userEvent.click(getByTestId('agent-chat-block-agent-select'));

		expect(queryByText('Support bot')).toBeNull();
	});
});
