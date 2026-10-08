import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalTryRow from '../components/AgentEvalTryRow.vue';

const PRACTICE_BANNER_STORAGE_KEY = 'N8N_AGENT_EVAL_PRACTICE_BANNER_DISMISSED';

const { openAgentConfirmationModal } = vi.hoisted(() => ({
	openAgentConfirmationModal: vi.fn(),
}));

vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal }),
}));

const renderComponent = createComponentRenderer(AgentEvalTryRow, {
	props: {
		status: 'pass',
		input: 'Where is my order?',
		output: 'Order #123 ships tomorrow.',
		view: 'complete',
	},
});

describe('AgentEvalTryRow', () => {
	beforeEach(() => {
		openAgentConfirmationModal.mockReset();
	});

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

	describe('view="small"', () => {
		it('shows a right chevron and emits open on click, without expanding in place', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId, emitted } = renderComponent({
				props: { view: 'small', testId: 'row' },
			});

			await user.click(getByTestId('row-toggle'));

			expect(emitted('open')).toHaveLength(1);
			expect(queryByTestId('row-placeholder')).not.toBeInTheDocument();
		});

		it('emits open when the row itself is clicked', async () => {
			const user = userEvent.setup();
			const { getByText, emitted } = renderComponent({ props: { view: 'small' } });

			await user.click(getByText('Where is my order?'));

			expect(emitted('open')).toHaveLength(1);
		});

		it('hides the chevron and emits nothing for a case with nothing to open', async () => {
			const user = userEvent.setup();
			const { queryByTestId, getByText, emitted } = renderComponent({
				props: { view: 'small', status: 'idle', output: null, testId: 'row' },
			});

			await user.click(getByText('Where is my order?'));

			expect(queryByTestId('row-toggle')).not.toBeInTheDocument();
			expect(emitted('open')).toBeUndefined();
		});

		it('still opens a failed case that has no output, to reach the correction form', async () => {
			const user = userEvent.setup();
			const { getByTestId, emitted } = renderComponent({
				props: { view: 'small', status: 'fail', output: null, testId: 'row' },
			});

			await user.click(getByTestId('row-toggle'));

			expect(emitted('open')).toHaveLength(1);
		});
	});

	describe('focused', () => {
		it('starts expanded and scrolls into view when focused', async () => {
			// jsdom has no `scrollIntoView`; put back exactly what was there (including
			// "nothing") so the mock can't leak into later tests.
			const original = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
			const scrollIntoView = vi.fn();
			Element.prototype.scrollIntoView = scrollIntoView;
			try {
				const { findByTestId } = renderComponent({ props: { focused: true, testId: 'row' } });

				expect(await findByTestId('row-placeholder')).toBeInTheDocument();
				await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
			} finally {
				if (original) {
					Object.defineProperty(Element.prototype, 'scrollIntoView', original);
				} else {
					Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
				}
			}
		});

		it('expands when focus arrives after mount', async () => {
			const { queryByTestId, findByTestId, rerender } = renderComponent({
				props: { testId: 'row' },
			});
			expect(queryByTestId('row-placeholder')).not.toBeInTheDocument();

			await rerender({ focused: true });

			expect(await findByTestId('row-placeholder')).toBeInTheDocument();
		});

		it('does not expand a row with nothing to expand', () => {
			const { queryByTestId } = renderComponent({
				props: { focused: true, status: 'idle', output: null, testId: 'row' },
			});

			expect(queryByTestId('row-placeholder')).not.toBeInTheDocument();
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

		it('keeps "Run check" on a row that needs no correction when hideRevise is set', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderPassing({ testId: 'row', hideRevise: true });
			await user.click(getByTestId('row-toggle'));

			expect(getByTestId('row-run-check')).toBeInTheDocument();
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

	describe('deleting the check', () => {
		const renderWithRule = (overrides: Record<string, unknown> = {}) =>
			renderComponent({
				props: { whatToCheck: 'Names the ticket and the priority.', ...overrides },
			});

		it('disables the rule editor while the case is running, so an edit cannot be dropped', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderWithRule({ testId: 'row', runningCheck: true });
			await user.click(getByTestId('row-toggle'));

			expect(getByTestId('row-edit-rule')).toBeDisabled();
		});

		it('asks for confirmation naming the case, and emits delete-check once confirmed', async () => {
			openAgentConfirmationModal.mockResolvedValue(MODAL_CONFIRM);
			const user = userEvent.setup();
			const { getByTestId, emitted } = renderWithRule({ testId: 'row' });
			await user.click(getByTestId('row-toggle'));

			await user.click(getByTestId('row-delete-check'));

			expect(openAgentConfirmationModal).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Delete “Where is my order?”?',
					description: 'This removes the check and its example. You can’t undo this.',
					confirmButtonText: 'Delete check',
					cancelButtonText: 'Cancel',
				}),
			);
			expect(emitted('delete-check')).toBeTruthy();
		});

		it('emits nothing when the confirmation is cancelled', async () => {
			openAgentConfirmationModal.mockResolvedValue(MODAL_CANCEL);
			const user = userEvent.setup();
			const { getByTestId, emitted } = renderWithRule({ testId: 'row' });
			await user.click(getByTestId('row-toggle'));

			await user.click(getByTestId('row-delete-check'));

			expect(emitted('delete-check')).toBeUndefined();
		});

		it('still offers delete, but no rule editor, when the case has no criteria', async () => {
			openAgentConfirmationModal.mockResolvedValue(MODAL_CONFIRM);
			const user = userEvent.setup();
			const { getByTestId, queryByTestId, emitted } = renderComponent({
				props: { testId: 'row', whatToCheck: null },
			});
			await user.click(getByTestId('row-toggle'));

			expect(queryByTestId('row-edit-rule')).not.toBeInTheDocument();
			await user.click(getByTestId('row-delete-check'));

			expect(emitted('delete-check')).toBeTruthy();
		});

		it('disables the delete button for a read-only viewer', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderWithRule({ testId: 'row', disabled: true });
			await user.click(getByTestId('row-toggle'));

			expect(getByTestId('row-delete-check')).toBeDisabled();
		});
	});

	describe('practice run banner', () => {
		beforeEach(() => {
			sessionStorage.removeItem(PRACTICE_BANNER_STORAGE_KEY);
		});

		it('shows the reassurance banner by default when expanded', async () => {
			const user = userEvent.setup();
			const { getByText, getByTestId } = renderComponent({ props: { testId: 'row' } });

			await user.click(getByTestId('row-toggle'));

			expect(getByText('Nothing was sent, saved or changed.')).toBeInTheDocument();
		});

		it('hides the banner and persists the dismissal when "Got it" is clicked', async () => {
			const user = userEvent.setup();
			const { queryByText, getByTestId } = renderComponent({ props: { testId: 'row' } });
			await user.click(getByTestId('row-toggle'));

			await user.click(getByTestId('row-practice-banner-dismiss'));

			expect(queryByText('Nothing was sent, saved or changed.')).not.toBeInTheDocument();
			expect(sessionStorage.getItem(PRACTICE_BANNER_STORAGE_KEY)).toBe('true');
		});

		// The whole point of the ask: dismissing on one row hides it on every
		// other row too, not just the one that was clicked.
		it('hides the banner on a different, already-rendered row once any row dismisses it', async () => {
			const user = userEvent.setup();
			const rowOne = renderComponent({ props: { testId: 'row-one' } });
			const rowTwo = renderComponent({ props: { testId: 'row-two' } });
			await user.click(rowOne.getByTestId('row-one-toggle'));
			await user.click(rowTwo.getByTestId('row-two-toggle'));

			await user.click(rowOne.getByTestId('row-one-practice-banner-dismiss'));

			expect(rowTwo.queryByText('Nothing was sent, saved or changed.')).not.toBeInTheDocument();
		});

		it('starts dismissed for a freshly mounted row once the session already has it set', async () => {
			sessionStorage.setItem(PRACTICE_BANNER_STORAGE_KEY, 'true');
			const user = userEvent.setup();
			const { queryByText, getByTestId } = renderComponent({ props: { testId: 'row' } });

			await user.click(getByTestId('row-toggle'));

			expect(queryByText('Nothing was sent, saved or changed.')).not.toBeInTheDocument();
		});
	});
});
