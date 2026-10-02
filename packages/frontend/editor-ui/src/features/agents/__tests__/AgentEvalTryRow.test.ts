import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalTryRow from '../components/AgentEvalTryRow.vue';

const renderComponent = createComponentRenderer(AgentEvalTryRow, {
	props: {
		status: 'pass',
		input: 'Where is my order?',
		output: 'Order #123 ships tomorrow.',
		view: 'complete',
	},
});

describe('AgentEvalTryRow', () => {
	describe('view="complete"', () => {
		it.each([
			['pass', 'Passes'],
			['strong', 'Passes'],
			['waiting', 'Running'],
			['idle', 'Never ran'],
			['work', 'Needs work'],
			['fail', 'Needs work'],
		] as const)('shows "%s" status as "%s", not the raw kind', (status, text) => {
			const { getByText, queryByText } = renderComponent({ props: { status } });

			expect(getByText(text)).toBeInTheDocument();
			expect(queryByText(status)).not.toBeInTheDocument();
		});

		it('shows a relative time for a row that has run', () => {
			const { getByText } = renderComponent({
				props: { date: new Date().toISOString() },
			});

			expect(getByText(/ago|just now/i)).toBeInTheDocument();
		});

		it('shows "Not run" for an idle row with no date', () => {
			const { getByText } = renderComponent({
				props: { status: 'idle', output: null, date: null },
			});

			expect(getByText('Not run')).toBeInTheDocument();
		});

		// A waiting row has no date either, but it's running, not never-run — the
		// date slot used to wrongly reuse the idle "Not run" copy for it too.
		it('leaves the date slot empty for a waiting row with no date, instead of saying "Not run"', () => {
			const { queryByText } = renderComponent({
				props: { status: 'waiting', output: null, date: null },
			});

			expect(queryByText('Not run')).not.toBeInTheDocument();
		});

		// Regression: the header used to render the idle "Not run" label a
		// second time (once in the date slot, once more in a separate block).
		it('shows "Not run" exactly once for an idle row', () => {
			const { getAllByText } = renderComponent({
				props: { status: 'idle', output: null, date: null },
			});

			expect(getAllByText('Not run')).toHaveLength(1);
		});
	});

	describe('correction controls', () => {
		const renderNeedsWork = (overrides: Record<string, unknown> = {}) =>
			renderComponent({
				props: { status: 'fail', output: 'Wrong answer.', ...overrides },
			});

		it('expands to show the correction form for a failing row', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = renderNeedsWork({ testId: 'row' });

			expect(queryByTestId('row-suggestion')).not.toBeInTheDocument();
			await user.click(getByTestId('row-toggle'));

			expect(getByTestId('row-suggestion')).toBeInTheDocument();
			expect(getByTestId('row-save-check')).toBeInTheDocument();
			expect(getByTestId('row-actually-fine')).toBeInTheDocument();
		});

		// No backend primitive exists yet to persist a correction on an
		// already-committed run's case — the note/Save-check flow hides, but
		// "Actually fine" (a local override, nothing to persist) still works.
		it('hides the note and Save-check button but keeps "Actually fine" when hideRevise is set', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = renderNeedsWork({ testId: 'row', hideRevise: true });

			await user.click(getByTestId('row-toggle'));

			expect(queryByTestId('row-suggestion')).not.toBeInTheDocument();
			expect(queryByTestId('row-save-check')).not.toBeInTheDocument();
			expect(getByTestId('row-actually-fine')).toBeInTheDocument();
		});

		it('emits actually-fine when clicked', async () => {
			const user = userEvent.setup();
			const { getByTestId, emitted } = renderNeedsWork({ testId: 'row' });
			await user.click(getByTestId('row-toggle'));

			await user.click(getByTestId('row-actually-fine'));

			expect(emitted('actually-fine')).toBeTruthy();
		});

		it('emits save-check with the typed suggestion', async () => {
			const user = userEvent.setup();
			const { getByTestId, emitted } = renderNeedsWork({ testId: 'row' });
			await user.click(getByTestId('row-toggle'));

			await user.type(getByTestId('row-suggestion'), 'Apologise and link the ticket.');
			await user.click(getByTestId('row-save-check'));

			expect(emitted('save-check')).toEqual([['Apologise and link the ticket.']]);
		});

		it('disables the correction controls for a read-only viewer', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderNeedsWork({ testId: 'row', disabled: true });
			await user.click(getByTestId('row-toggle'));

			expect(getByTestId('row-suggestion')).toBeDisabled();
			expect(getByTestId('row-save-check')).toBeDisabled();
			expect(getByTestId('row-actually-fine')).toBeDisabled();
		});
	});
});
