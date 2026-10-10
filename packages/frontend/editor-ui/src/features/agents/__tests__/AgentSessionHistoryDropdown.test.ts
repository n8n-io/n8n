import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import ChatHistoryDropdownTrigger from '@/features/ai/shared/components/ChatHistoryDropdownTrigger.vue';

import AgentSessionHistoryDropdown from '../components/AgentSessionHistoryDropdown.vue';

const storeState = vi.hoisted(() => ({ loading: true }));

vi.mock('../agentSessions.store', () => ({
	useAgentSessionsStore: () => storeState,
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/i18n')>()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

describe('AgentSessionHistoryDropdown', () => {
	it('shows loading instead of the empty state while sessions load', async () => {
		storeState.loading = true;
		const renderComponent = createComponentRenderer(AgentSessionHistoryDropdown);
		const result = renderComponent({
			props: { sessionOptions: [] },
			slots: {
				trigger: '<button data-test-id="history-trigger">History</button>',
			},
		});

		await userEvent.click(result.getByTestId('history-trigger'));

		await waitFor(() => expect(document.querySelector('.n8n-loading')).toBeInTheDocument());
		expect(result.queryByText('agents.builder.chat.sessionPicker.empty')).not.toBeInTheDocument();
	});

	it('opens history from the session title, searches, and selects a session', async () => {
		storeState.loading = false;
		const renderComponent = createComponentRenderer(AgentSessionHistoryDropdown);
		const result = renderComponent({
			props: {
				sessionOptions: [
					{
						id: 'long-title',
						title: 'Review the quarterly customer invoices and reconcile overdue balances',
						label: 'Review the quarterly customer invoices',
					},
				],
			},
			slots: {
				trigger: () => h(ChatHistoryDropdownTrigger, { title: 'Quarterly review' }),
			},
		});

		const trigger = result.getByRole('button', { name: 'Quarterly review' });
		await userEvent.click(result.getByText('Quarterly review'));
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		await userEvent.type(
			result.getByPlaceholderText('agents.builder.chat.sessionPicker.searchPlaceholder'),
			'overdue balances',
		);

		await userEvent.click(await result.findByText('Review the quarterly customer invoices'));
		expect(result.emitted().select).toEqual([['long-title']]);
		await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
	});
});
