import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalTryRow from '../AgentEvalTryRow.vue';

// The delete-check button's confirmation dialog needs `useUIStore()`, which
// needs an active pinia — mocked out here since nothing in this file exercises
// that flow (covered in `agents/__tests__/AgentEvalTryRow.test.ts` instead).
vi.mock('../../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal: vi.fn() }),
}));

// The complete view expands in place; the small view hands off via `open` and
// is covered in `agents/__tests__/AgentEvalTryRow.test.ts`.
const renderComponent = createComponentRenderer(AgentEvalTryRow, { props: { view: 'complete' } });

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
			props: { status: 'pass', input: 'x', output: 'y', label: 'Your try', view: 'small' },
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

	it('hides the toggle and never renders a sample when output is null and nothing needs correcting', () => {
		const { queryByTestId } = renderComponent({
			props: { status: 'waiting', input: 'x', output: null, testId: 'row-1' },
		});

		expect(queryByTestId('row-1-toggle')).not.toBeInTheDocument();
		expect(queryByTestId('row-1-placeholder')).not.toBeInTheDocument();
	});

	it.each(['work', 'fail'] as const)(
		'still expands to the correction form for a %s case with no output at all',
		async (status) => {
			const user = userEvent.setup();
			const { getByTestId, findByText } = renderComponent({
				props: { status, input: 'x', output: null, testId: 'row-1' },
			});

			await user.click(getByTestId('row-1-toggle'));

			expect(await findByText('What should have happened?')).toBeInTheDocument();
		},
	);

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

	it.each(['work', 'fail'] as const)(
		'shows the correction form once expanded for a %s case',
		async (status) => {
			const user = userEvent.setup();
			const { getByTestId, findByText } = renderComponent({
				props: { status, input: 'x', output: 'y', testId: 'row-1' },
			});

			await user.click(getByTestId('row-1-toggle'));

			expect(await findByText('What should have happened?')).toBeInTheDocument();
			expect(getByTestId('row-1-save-check')).toBeInTheDocument();
			expect(getByTestId('row-1-actually-fine')).toBeInTheDocument();
		},
	);

	it('never shows the correction form for a passed case, even expanded', async () => {
		const user = userEvent.setup();
		const { getByTestId, queryByText } = renderComponent({
			props: { status: 'pass', input: 'x', output: 'y', testId: 'row-1' },
		});

		await user.click(getByTestId('row-1-toggle'));

		expect(queryByText('What should have happened?')).not.toBeInTheDocument();
	});

	it('"Save check" is disabled until a suggestion is typed, then emits it', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent({
			props: { status: 'fail', input: 'x', output: 'y', testId: 'row-1' },
		});
		await user.click(getByTestId('row-1-toggle'));

		expect(getByTestId('row-1-save-check')).toBeDisabled();

		await user.type(getByTestId('row-1-suggestion'), 'Apologise and link the ticket.');
		expect(getByTestId('row-1-save-check')).toBeEnabled();

		await user.click(getByTestId('row-1-save-check'));

		expect(emitted()['save-check']).toEqual([['Apologise and link the ticket.']]);
	});

	it('emits "actually-fine" on click', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent({
			props: { status: 'work', input: 'x', output: 'y', testId: 'row-1' },
		});
		await user.click(getByTestId('row-1-toggle'));

		await user.click(getByTestId('row-1-actually-fine'));

		expect(emitted()['actually-fine']).toEqual([[]]);
	});

	it('disables "Save check" and shows a loading state while savingCheck is true', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderComponent({
			props: { status: 'fail', input: 'x', output: 'y', testId: 'row-1', savingCheck: true },
		});
		await user.click(getByTestId('row-1-toggle'));

		expect(getByTestId('row-1-save-check')).toBeDisabled();
		expect(getByTestId('row-1-actually-fine')).toBeDisabled();
	});

	it('does not emit "save-check" for a whitespace-only suggestion', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent({
			props: { status: 'fail', input: 'x', output: 'y', testId: 'row-1' },
		});
		await user.click(getByTestId('row-1-toggle'));

		// The keyboard shortcut calls the handler directly, bypassing the
		// disabled button — it must still refuse a blank suggestion.
		await user.type(getByTestId('row-1-suggestion'), '   {Meta>}{Enter}{/Meta}');

		expect(emitted()['save-check']).toBeUndefined();
	});

	it('clears a typed suggestion once the case stops needing correction', async () => {
		const user = userEvent.setup();
		const { getByTestId, rerender } = renderComponent({
			props: { status: 'fail', input: 'x', output: 'y', testId: 'row-1' },
		});
		await user.click(getByTestId('row-1-toggle'));
		await user.type(getByTestId('row-1-suggestion'), 'Apologise and link the ticket.');
		expect(getByTestId('row-1-suggestion')).toHaveValue('Apologise and link the ticket.');

		// The parent accepted or regenerated the case — it no longer needs
		// correction.
		await rerender({ status: 'pass', input: 'x', output: 'y', testId: 'row-1' });
		// Back to a failing case: the note must start blank, not reshow the
		// stale text from before.
		await rerender({ status: 'fail', input: 'x', output: 'y', testId: 'row-1' });

		expect(getByTestId('row-1-suggestion')).toHaveValue('');
	});

	describe('fix suggestion', () => {
		const suggestionProps = {
			status: 'work',
			input: 'x',
			output: 'y',
			testId: 'row-1',
			fixSuggestion: 'Politely decline requests outside invoice support.',
		} as const;

		it('shows the suggestion card once a failed case is expanded', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByText } = renderComponent({ props: suggestionProps });
			await user.click(getByTestId('row-1-toggle'));

			expect(getByTestId('row-1-suggestion-card')).toBeInTheDocument();
			expect(getByText('Politely decline requests outside invoice support.')).toBeInTheDocument();
		});

		it.each([
			['no suggestion', { fixSuggestion: null }],
			['a blank suggestion', { fixSuggestion: '   ' }],
			['a passed case', { status: 'pass' }],
		] as const)('does not show the card for %s', async (_label, override) => {
			const user = userEvent.setup();
			const { queryByTestId, getByTestId } = renderComponent({
				props: { ...suggestionProps, ...override },
			});
			await user.click(getByTestId('row-1-toggle'));

			expect(queryByTestId('row-1-suggestion-card')).not.toBeInTheDocument();
		});

		it('does not show the card in the small view', () => {
			const { queryByTestId } = renderComponent({
				props: { ...suggestionProps, view: 'small' },
			});

			expect(queryByTestId('row-1-suggestion-card')).not.toBeInTheDocument();
		});

		it('emits "apply-suggestion" from the card', async () => {
			const user = userEvent.setup();
			const { getByTestId, emitted } = renderComponent({ props: suggestionProps });
			await user.click(getByTestId('row-1-toggle'));

			await user.click(getByTestId('row-1-suggestion-card-apply'));

			expect(emitted()['apply-suggestion']).toHaveLength(1);
		});

		it('hides the card on "Keep as is" and brings back a new suggestion', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId, rerender } = renderComponent({
				props: suggestionProps,
			});
			await user.click(getByTestId('row-1-toggle'));

			await user.click(getByTestId('row-1-suggestion-card-dismiss'));
			expect(queryByTestId('row-1-suggestion-card')).not.toBeInTheDocument();

			await rerender({ ...suggestionProps, fixSuggestion: 'Always cite the invoice number.' });
			expect(getByTestId('row-1-suggestion-card')).toBeInTheDocument();
		});

		it('disables the card actions while the row is disabled', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderComponent({ props: { ...suggestionProps, disabled: true } });
			await user.click(getByTestId('row-1-toggle'));

			expect(getByTestId('row-1-suggestion-card-apply')).toBeDisabled();
		});
	});
});
