import { configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import AgentEvalCaseRow from '../components/AgentEvalCaseRow.vue';

configure({ testIdAttribute: 'data-testid' });

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => `mocked-${key}` }),
}));

const renderComponent = createComponentRenderer(AgentEvalCaseRow, {
	props: { index: 1, input: 'Plan a 5-day trip', whatToCheck: 'Asks for dates first' },
});

describe('AgentEvalCaseRow', () => {
	it('renders the position, the request and the check', () => {
		const { getByTestId, getByText } = renderComponent();

		expect(getByTestId('agent-evals-case-row')).toBeInTheDocument();
		expect(getByText('1')).toBeInTheDocument();
		expect(getByText('Plan a 5-day trip')).toBeInTheDocument();
		expect(getByText('Asks for dates first')).toBeInTheDocument();
	});

	it('omits the check line for a dataset that maps no check column', () => {
		const { queryByText } = renderComponent({ props: { whatToCheck: null } });

		expect(queryByText('Asks for dates first')).not.toBeInTheDocument();
	});

	it('offers no edit affordance when not editable', () => {
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('agent-evals-case-edit')).not.toBeInTheDocument();
	});

	it('emits edit when the pencil is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { editable: true } });

		await userEvent.click(getByTestId('agent-evals-case-edit'));

		expect(emitted('edit')).toHaveLength(1);
	});

	it('labels the edit control with the position, so it is distinguishable by name', () => {
		const { getByTestId } = renderComponent({ props: { index: 4, editable: true } });

		expect(getByTestId('agent-evals-case-edit')).toHaveAttribute(
			'aria-label',
			'mocked-agents.builder.agentEvals.cases.editCase',
		);
	});
});
