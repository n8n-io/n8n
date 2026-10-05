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

	describe('"Run check"', () => {
		const renderPassing = (overrides: Record<string, unknown> = {}) =>
			renderComponent({
				props: { status: 'pass', output: 'Order #123 ships tomorrow.', ...overrides },
			});

		it('shows "Run check" instead of the correction controls for a row that needs no correction', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = renderPassing({ testId: 'row' });
			await user.click(getByTestId('row-toggle'));

			expect(getByTestId('row-run-check')).toBeInTheDocument();
			expect(queryByTestId('row-suggestion')).not.toBeInTheDocument();
			expect(queryByTestId('row-save-check')).not.toBeInTheDocument();
			expect(queryByTestId('row-actually-fine')).not.toBeInTheDocument();
		});

		it('emits rerun-check when clicked', async () => {
			const user = userEvent.setup();
			const { getByTestId, emitted } = renderPassing({ testId: 'row' });
			await user.click(getByTestId('row-toggle'));

			await user.click(getByTestId('row-run-check'));

			expect(emitted('rerun-check')).toBeTruthy();
		});

		it('disables "Run check" for a read-only viewer', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderPassing({ testId: 'row', disabled: true });
			await user.click(getByTestId('row-toggle'));

			expect(getByTestId('row-run-check')).toBeDisabled();
		});

		it('shows a loading state while runningCheck is true', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderPassing({ testId: 'row', runningCheck: true });
			await user.click(getByTestId('row-toggle'));

			expect(getByTestId('row-run-check')).toHaveAttribute('aria-busy', 'true');
		});
	});

	describe('rule editing', () => {
		const renderWithRule = (overrides: Record<string, unknown> = {}) =>
			renderComponent({
				props: { whatToCheck: 'Names the ticket and the priority.', ...overrides },
			});

		it('shows the rule as plain text with an edit button, not an input', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = renderWithRule({ testId: 'row' });
			await user.click(getByTestId('row-toggle'));

			expect(getByTestId('row')).toHaveTextContent('Names the ticket and the priority.');
			expect(getByTestId('row-edit-rule')).toBeInTheDocument();
			expect(queryByTestId('row-rule-input')).not.toBeInTheDocument();
		});

		it('shows nothing at all when there is no rule', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = renderWithRule({ testId: 'row', whatToCheck: null });
			await user.click(getByTestId('row-toggle'));

			expect(queryByTestId('row-edit-rule')).not.toBeInTheDocument();
		});

		it('switches to an input pre-filled with the current rule when the edit button is clicked', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = renderWithRule({ testId: 'row' });
			await user.click(getByTestId('row-toggle'));

			await user.click(getByTestId('row-edit-rule'));

			expect(getByTestId('row-rule-input')).toHaveValue('Names the ticket and the priority.');
			expect(queryByTestId('row-edit-rule')).not.toBeInTheDocument();
			expect(getByTestId('row-rule-save')).toBeInTheDocument();
			expect(getByTestId('row-rule-cancel')).toBeInTheDocument();
		});

		it('emits save-what-to-check with the edited text and returns to plain text', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId, emitted } = renderWithRule({ testId: 'row' });
			await user.click(getByTestId('row-toggle'));
			await user.click(getByTestId('row-edit-rule'));

			await user.clear(getByTestId('row-rule-input'));
			await user.type(getByTestId('row-rule-input'), 'Mentions the refund window.');
			await user.click(getByTestId('row-rule-save'));

			expect(emitted('save-what-to-check')).toEqual([['Mentions the refund window.']]);
			expect(queryByTestId('row-rule-input')).not.toBeInTheDocument();
			expect(getByTestId('row-edit-rule')).toBeInTheDocument();
		});

		it('discards the edit and emits nothing when "Cancel" is clicked', async () => {
			const user = userEvent.setup();
			const { getByTestId, emitted } = renderWithRule({ testId: 'row' });
			await user.click(getByTestId('row-toggle'));
			await user.click(getByTestId('row-edit-rule'));

			await user.clear(getByTestId('row-rule-input'));
			await user.type(getByTestId('row-rule-input'), 'Something else entirely.');
			await user.click(getByTestId('row-rule-cancel'));

			expect(emitted('save-what-to-check')).toBeUndefined();
			expect(getByTestId('row')).toHaveTextContent('Names the ticket and the priority.');
		});

		it('disables saving a blank rule', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderWithRule({ testId: 'row' });
			await user.click(getByTestId('row-toggle'));
			await user.click(getByTestId('row-edit-rule'));

			await user.clear(getByTestId('row-rule-input'));

			expect(getByTestId('row-rule-save')).toBeDisabled();
		});

		it('disables the edit button for a read-only viewer', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderWithRule({ testId: 'row', disabled: true });
			await user.click(getByTestId('row-toggle'));

			expect(getByTestId('row-edit-rule')).toBeDisabled();
		});
	});
});
