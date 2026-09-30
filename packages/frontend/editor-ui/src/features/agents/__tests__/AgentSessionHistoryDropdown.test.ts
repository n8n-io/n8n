import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

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

	it('finds a shortened label by a suffix in the full session title', async () => {
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
				trigger: '<button data-test-id="history-trigger">History</button>',
			},
		});

		await userEvent.click(result.getByTestId('history-trigger'));
		await userEvent.type(
			result.getByPlaceholderText('agents.builder.chat.sessionPicker.searchPlaceholder'),
			'overdue balances',
		);

		expect(await result.findByText('Review the quarterly customer invoices')).toBeInTheDocument();
	});
});
