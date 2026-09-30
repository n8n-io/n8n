import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalTryRow from '../AgentEvalTryRow.vue';

const renderComponent = createComponentRenderer(AgentEvalTryRow);

describe('AgentEvalTryRow', () => {
	it('renders the status avatar and input, with an optional label', () => {
		const { getByRole, getByText, queryByText } = renderComponent({
			props: { status: 'pass', input: 'Summarize the thread', output: 'It is a P1.' },
		});

		expect(getByRole('img')).toHaveAttribute('aria-label', 'Passed');
		expect(getByText('Summarize the thread')).toBeInTheDocument();
		expect(queryByText('Your try')).not.toBeInTheDocument();
	});

	it('shows the label when provided', () => {
		const { getByText } = renderComponent({
			props: { status: 'pass', input: 'x', output: 'y', label: 'Your try' },
		});

		expect(getByText('Your try')).toBeInTheDocument();
	});

	it('expands to the full sample on toggle click, using the given test id', async () => {
		const user = userEvent.setup();
		const { getByTestId, queryByTestId, findByText } = renderComponent({
			props: {
				status: 'pass',
				input: 'Summarize the thread',
				output: 'It is a P1.',
				testId: 'row-1',
			},
		});

		expect(queryByTestId('row-1-placeholder')).not.toBeInTheDocument();

		await user.click(getByTestId('row-1-toggle'));

		expect(getByTestId('row-1-placeholder')).toBeInTheDocument();
		expect(await findByText('It is a P1.')).toBeInTheDocument();
	});

	it('hides the toggle and never renders a sample when output is null', () => {
		const { queryByTestId } = renderComponent({
			props: { status: 'work', input: 'x', output: null, testId: 'row-1' },
		});

		expect(queryByTestId('row-1-toggle')).not.toBeInTheDocument();
		expect(queryByTestId('row-1-placeholder')).not.toBeInTheDocument();
	});

	it('shows "Not run" in place of the toggle for an idle case with no output', () => {
		const { getByText, queryByTestId } = renderComponent({
			props: { status: 'idle', input: 'x', output: null },
		});

		expect(getByText('Not run')).toBeInTheDocument();
		expect(queryByTestId(/toggle/)).not.toBeInTheDocument();
	});

	it('does not show "Not run" for a non-idle status with no output', () => {
		const { queryByText } = renderComponent({
			props: { status: 'waiting', input: 'x', output: null },
		});

		expect(queryByText('Not run')).not.toBeInTheDocument();
	});
});
