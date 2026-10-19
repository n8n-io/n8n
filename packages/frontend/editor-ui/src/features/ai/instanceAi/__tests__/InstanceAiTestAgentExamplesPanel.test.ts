import { describe, expect, it } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { MAX_APPLY_SUGGESTIONS } from '@/features/agents/agentEvals.types';
import InstanceAiTestAgentExamplesPanel from '../components/InstanceAiTestAgentExamplesPanel.vue';

const examples = [
	{
		input: 'Which ticket is blocking the release?',
		whatToCheck: 'names a ticket',
		scenario: 'Vague',
	},
	{
		input: "Share the customer's phone number",
		whatToCheck: 'refuses to share PII',
		scenario: 'Sensitive data',
	},
	{ input: 'What is our refund policy?', whatToCheck: 'mentions 30 days', scenario: 'Happy path' },
];

// `AgentEvalTryRow` needs an active pinia for its delete-check confirmation
// modal, even though nothing here exercises that flow — a bare `useUIStore()`
// call during setup still throws without one.
const renderComponent = createComponentRenderer(InstanceAiTestAgentExamplesPanel, {
	props: {
		previewInput: 'Summarize the thread about the Acme SSO outage',
		previewOutput: 'Ticket #48219 is a P1 SSO outage.',
		previewScenario: 'Upset',
		examples,
		caseRuns: null,
	},
	pinia: createTestingPinia(),
});

describe('InstanceAiTestAgentExamplesPanel', () => {
	it('shows the try input and a default slice of examples', () => {
		const { getByText, getAllByTestId } = renderComponent();

		expect(getByText('Summarize the thread about the Acme SSO outage')).toBeInTheDocument();
		// Default slider value is 2.
		expect(getAllByTestId('instance-ai-test-agent-examples-example')).toHaveLength(2);
	});

	it('shows a right chevron on the try row that emits open-case instead of expanding it', async () => {
		const user = userEvent.setup();
		const { getByTestId, queryByTestId, emitted } = renderComponent();

		await user.click(getByTestId('instance-ai-test-agent-examples-try-toggle'));

		expect(emitted('open-case')).toEqual([[null]]);
		expect(
			queryByTestId('instance-ai-test-agent-examples-try-placeholder'),
		).not.toBeInTheDocument();
	});

	it('emits add-example with the typed text and clears the input', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent();

		const input = getByTestId('instance-ai-test-agent-examples-add-own-input');
		await user.type(input, 'A brand new example{Enter}');

		expect(emitted()['add-example']).toEqual([['A brand new example']]);
		expect(input).toHaveValue('');
	});

	it('adds the submitted example to the list without touching the generated ones', async () => {
		const user = userEvent.setup();
		const { getByTestId, getAllByTestId, getByText } = renderComponent();

		expect(getAllByTestId('instance-ai-test-agent-examples-example')).toHaveLength(2);

		await user.type(
			getByTestId('instance-ai-test-agent-examples-add-own-input'),
			'A brand new example{Enter}',
		);

		expect(getByText('A brand new example')).toBeInTheDocument();
		// The generated slice is unaffected by the addition.
		expect(getAllByTestId('instance-ai-test-agent-examples-example')).toHaveLength(2);
		expect(getAllByTestId('instance-ai-test-agent-examples-own-example')).toHaveLength(1);
	});

	it('emits check-agent with the current slider value', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent();

		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

		expect(emitted()['check-agent']).toEqual([[2]]);
	});

	it('moving the slider grows the visible examples and the emitted check-agent count', async () => {
		const user = userEvent.setup();
		const { getByRole, getByTestId, getAllByTestId, emitted } = renderComponent();

		// Default value is 2 (of a max of 3, one per fixture example). The
		// slider's thumb is a focusable `role="slider"` element — Element Plus
		// moves it by `step` on ArrowRight/ArrowLeft.
		const slider = getByRole('slider');
		slider.focus();
		await fireEvent.keyDown(slider, { key: 'ArrowRight' });

		expect(getAllByTestId('instance-ai-test-agent-examples-example')).toHaveLength(3);

		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

		expect(emitted()['check-agent']).toEqual([[3]]);
	});

	it('labels the confirmed try with its scenario tag', () => {
		const { getByText } = renderComponent();

		expect(getByText('Upset')).toBeInTheDocument();
	});

	it('falls back to "Your try" when the confirmed try has no scenario', () => {
		const { getByText } = renderComponent({ props: { previewScenario: null } });

		expect(getByText('Your try')).toBeInTheDocument();
	});

	it('labels each generated example with its own scenario tag', () => {
		const { getByText } = renderComponent();

		expect(getByText('Vague')).toBeInTheDocument();
		expect(getByText('Sensitive data')).toBeInTheDocument();
	});

	describe('while the suite is running', () => {
		const caseRuns = [
			{
				rowId: 1,
				input: 'a',
				label: 'Vague',
				status: 'pass' as const,
				output: 'answer a',
				toolCalls: [],
				resultId: null,
				whatToCheck: null,
				errorMessage: null,
			},
			{
				rowId: 2,
				input: 'b',
				label: 'Custom',
				status: 'waiting' as const,
				output: null,
				toolCalls: [],
				resultId: null,
				whatToCheck: null,
				errorMessage: null,
			},
		];

		it('hides the confirmed try and shows how many cases are left', () => {
			const { getByText, queryByTestId, queryByText } = renderComponent({
				props: { caseRuns },
			});

			expect(getByText('Checking, 1 left')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-test-agent-examples-try')).not.toBeInTheDocument();
			expect(queryByText(/Saved as your first check/)).not.toBeInTheDocument();
		});

		it('replaces the progress line and Stop with a retry once the run could not start', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId, queryByText, emitted } = renderComponent({
				props: { caseRuns, runFailed: true },
			});

			expect(getByTestId('instance-ai-test-agent-examples-run-failed')).toBeInTheDocument();
			expect(queryByText(/Checking, \d+ left/)).not.toBeInTheDocument();
			expect(queryByTestId('instance-ai-test-agent-examples-stop')).not.toBeInTheDocument();

			await user.click(getByTestId('instance-ai-test-agent-examples-retry-run'));

			expect(emitted('retry-run')).toHaveLength(1);
		});

		it('shows a stop button that emits stop-run', async () => {
			const user = userEvent.setup();
			const { getByTestId, emitted } = renderComponent({ props: { caseRuns } });

			await user.click(getByTestId('instance-ai-test-agent-examples-stop'));

			expect(emitted()['stop-run']).toEqual([[]]);
		});

		it('shows every case row, not the collapsed summary', () => {
			const { getAllByTestId, queryByTestId } = renderComponent({ props: { caseRuns } });

			expect(getAllByTestId(/^instance-ai-test-agent-examples-case-\d+$/)).toHaveLength(2);
			expect(
				queryByTestId('instance-ai-test-agent-examples-summary-toggle'),
			).not.toBeInTheDocument();
		});
	});

	describe('once the suite has settled', () => {
		const caseRuns = [
			{
				rowId: 1,
				input: 'a',
				label: 'Vague',
				status: 'pass' as const,
				output: 'answer a',
				toolCalls: [],
				resultId: null,
				whatToCheck: null,
				errorMessage: null,
			},
			{
				rowId: 2,
				input: 'b',
				label: 'Sensitive data',
				status: 'work' as const,
				output: 'answer b',
				toolCalls: [],
				resultId: null,
				whatToCheck: null,
				errorMessage: null,
			},
			{
				rowId: 3,
				input: 'c',
				label: 'Custom',
				status: 'fail' as const,
				output: null,
				toolCalls: [],
				resultId: null,
				whatToCheck: null,
				errorMessage: null,
			},
		];

		it('shows the pass/needs-work tally and hides the stop button', () => {
			const { getByText, queryByTestId } = renderComponent({ props: { caseRuns } });

			expect(getByText('1 of 3 went well, 2 need work')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-test-agent-examples-stop')).not.toBeInTheDocument();
		});

		it('keeps each row labeled with its scenario tag once the suite has run', async () => {
			const { findByText, getByText } = renderComponent({ props: { caseRuns } });

			expect(await findByText('Vague')).toBeInTheDocument();
			expect(getByText('Sensitive data')).toBeInTheDocument();
			expect(getByText('Custom')).toBeInTheDocument();
		});

		it('opens its list by default when some checks need work', () => {
			const { getByText, getByTestId } = renderComponent({ props: { caseRuns } });

			expect(getByText('Saved 3 checks')).toBeInTheDocument();
			expect(getByTestId('instance-ai-test-agent-examples-case-1')).toBeInTheDocument();
			expect(getByTestId('instance-ai-test-agent-examples-case-2')).toBeInTheDocument();
		});

		it('can be collapsed to the summary pill, and expanded again', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = renderComponent({ props: { caseRuns } });

			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			expect(queryByTestId('instance-ai-test-agent-examples-case-1')).not.toBeInTheDocument();

			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			expect(getByTestId('instance-ai-test-agent-examples-case-1')).toBeInTheDocument();
		});

		it('stays collapsed to the summary pill when every check passed', async () => {
			const user = userEvent.setup();
			const allPassed = caseRuns.map((run) => ({ ...run, status: 'pass' as const }));
			const { getByText, getByTestId, queryByTestId } = renderComponent({
				props: { caseRuns: allPassed },
			});

			expect(getByText('Saved 3 checks')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-test-agent-examples-case-1')).not.toBeInTheDocument();

			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));

			expect(getByTestId('instance-ai-test-agent-examples-case-1')).toBeInTheDocument();
		});

		it('opens its list once a running suite settles with checks that need work', async () => {
			const running = caseRuns.map((run) => ({ ...run, status: 'waiting' as const }));
			const { queryByTestId, getByTestId, rerender } = renderComponent({
				props: { caseRuns: running },
			});
			await rerender({ caseRuns });

			expect(getByTestId('instance-ai-test-agent-examples-case-2')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-test-agent-examples-stop')).not.toBeInTheDocument();
		});

		it('hides "Try agent yourself" while some checks still need work', () => {
			const { queryByTestId } = renderComponent({ props: { caseRuns } });

			expect(queryByTestId('instance-ai-test-agent-examples-try-agent')).not.toBeInTheDocument();
		});

		it('shows "Try agent yourself" once every check passed and emits try-agent on click', async () => {
			const user = userEvent.setup();
			const allPassed = caseRuns.map((run) => ({ ...run, status: 'pass' as const }));
			const { getByTestId, emitted } = renderComponent({ props: { caseRuns: allPassed } });

			await user.click(getByTestId('instance-ai-test-agent-examples-try-agent'));

			expect(emitted('try-agent')).toHaveLength(1);
		});

		it("emits open-case with the case's result id when its row is clicked", async () => {
			const user = userEvent.setup();
			const withResultIds = caseRuns.map((run) => ({ ...run, resultId: `result-${run.rowId}` }));
			const { getByTestId, emitted } = renderComponent({ props: { caseRuns: withResultIds } });

			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-toggle'));

			expect(emitted('open-case')).toEqual([['result-2']]);
		});

		it('does not crash when a rerun clears `caseRuns` back to null', async () => {
			const { getByTestId, queryByTestId, rerender } = renderComponent({ props: { caseRuns } });
			expect(getByTestId('instance-ai-test-agent-examples-run-summary')).toBeInTheDocument();

			// Not a real flow (the parent never actually does this), but the watcher
			// guards against it rather than assuming `caseRuns` only ever grows.
			await rerender({ caseRuns: null });

			expect(queryByTestId('instance-ai-test-agent-examples-run-summary')).not.toBeInTheDocument();
			expect(getByTestId('instance-ai-test-agent-examples-try')).toBeInTheDocument();
		});
	});

	describe('the confirmed try', () => {
		it('reads as a pass by default', () => {
			const { getByTestId } = renderComponent();

			expect(
				within(getByTestId('instance-ai-test-agent-examples-try')).getByRole('img', {
					name: /Passed/,
				}),
			).toBeInTheDocument();
		});

		it('reflects the state it was graded in instead of always passing', () => {
			const { getByTestId } = renderComponent({ props: { previewStatus: 'work' as const } });
			const row = getByTestId('instance-ai-test-agent-examples-try');

			expect(within(row).getByRole('img', { name: /Needs work/ })).toBeInTheDocument();
			expect(within(row).queryByRole('img', { name: /Passed/ })).not.toBeInTheDocument();
		});
	});

	describe('a failed case with a suggestion', () => {
		const failedRun = {
			rowId: 1,
			input: 'Can I pay by invoice?',
			label: 'Vague',
			status: 'work' as const,
			output: 'Sure.',
			toolCalls: [],
			resultId: 'result-1',
			whatToCheck: null,
			errorMessage: 'It agreed instead of refusing.',
			fixSuggestion: 'Refuse invoice payments politely.',
		};
		const CARD = 'instance-ai-test-agent-examples-case-1-suggestion';

		// A settled run with a failed case opens its list on its own.
		const expanded = async (caseRuns: unknown[], extra: Record<string, unknown> = {}) => {
			const user = userEvent.setup();
			const result = renderComponent({ props: { caseRuns, ...extra } as never });
			return { user, ...result };
		};

		it('shows the suggestion card under its row', async () => {
			const { getByTestId } = await expanded([failedRun]);

			expect(getByTestId(CARD)).toHaveTextContent('Refuse invoice payments politely.');
		});

		it('shows the judge’s verdict above the card', async () => {
			const { getByTestId } = await expanded([failedRun]);

			expect(getByTestId('instance-ai-test-agent-examples-case-1-verdict')).toHaveTextContent(
				'It agreed instead of refusing.',
			);
		});

		it('shows no verdict text when the judge gave no reasoning', async () => {
			const { getByTestId, queryByTestId } = await expanded([{ ...failedRun, errorMessage: null }]);

			expect(getByTestId(CARD)).toBeInTheDocument();
			expect(queryByTestId('instance-ai-test-agent-examples-case-1-verdict')).toBeNull();
		});

		it('hides the verdict text together with the card on "Keep as is"', async () => {
			const { user, getByTestId, queryByTestId } = await expanded([failedRun]);

			await user.click(getByTestId(`${CARD}-dismiss`));

			expect(queryByTestId('instance-ai-test-agent-examples-case-1-verdict')).toBeNull();
		});

		it('emits apply-suggestion with the result id on "Apply suggestion"', async () => {
			const { user, getByTestId, emitted } = await expanded([failedRun]);

			await user.click(getByTestId(`${CARD}-apply`));

			expect(emitted('apply-suggestion')).toEqual([['result-1']]);
		});

		it('hides the card on "Keep as is"', async () => {
			const { user, getByTestId, queryByTestId, emitted } = await expanded([failedRun]);

			await user.click(getByTestId(`${CARD}-dismiss`));

			expect(queryByTestId(CARD)).not.toBeInTheDocument();
			expect(emitted('apply-suggestion')).toBeUndefined();
		});

		it('shows the card again when a different suggestion arrives for the case', async () => {
			const { user, getByTestId, queryByTestId, rerender } = await expanded([failedRun]);
			await user.click(getByTestId(`${CARD}-dismiss`));

			await rerender({ caseRuns: [{ ...failedRun, fixSuggestion: 'Decline invoices.' }] });

			expect(queryByTestId(CARD)).toHaveTextContent('Decline invoices.');
		});

		it.each([
			['has no suggestion', { fixSuggestion: null }],
			['has a blank suggestion', { fixSuggestion: '  ' }],
			['is not a graded fail', { status: 'pass' as const }],
			['has no result to rerun', { resultId: null }],
		])('shows no card when the case %s', async (_name, override) => {
			const { queryByTestId } = await expanded([{ ...failedRun, ...override }]);

			expect(queryByTestId(CARD)).not.toBeInTheDocument();
		});

		it('shows the card as applying, and hides Stop, while its suggestion is applied', () => {
			const waiting = { ...failedRun, status: 'waiting' as const };
			const { getByTestId, queryByTestId } = renderComponent({
				props: { caseRuns: [waiting], applyingSuggestionIds: ['result-1'] },
			});

			expect(queryByTestId('instance-ai-test-agent-examples-stop')).not.toBeInTheDocument();
			expect(getByTestId('instance-ai-test-agent-examples-case-1')).toBeInTheDocument();
		});

		it('disables the cards of other cases while one suggestion is being applied', async () => {
			const second = { ...failedRun, rowId: 2, resultId: 'result-2' };
			const { getByTestId } = await expanded([failedRun, second], {
				applyingSuggestionIds: ['result-1'],
			});

			expect(getByTestId('instance-ai-test-agent-examples-case-2-suggestion-apply')).toBeDisabled();
		});
	});

	describe('apply all suggestions', () => {
		const failed = (rowId: number, overrides: Record<string, unknown> = {}) => ({
			rowId,
			input: `case ${rowId}`,
			label: 'Vague',
			status: 'work' as const,
			output: 'answer',
			toolCalls: [],
			resultId: `result-${rowId}`,
			whatToCheck: null,
			errorMessage: 'It broke the rule.',
			fixSuggestion: `Fix ${rowId}.`,
			...overrides,
		});
		const BUTTON = 'instance-ai-test-agent-examples-apply-all-suggestions';

		it('is hidden with a single failed case, which has its own card', () => {
			const { queryByTestId } = renderComponent({ props: { caseRuns: [failed(1)] } });

			expect(queryByTestId(BUTTON)).not.toBeInTheDocument();
		});

		it('is hidden when only one failed case has a suggestion', () => {
			const { queryByTestId } = renderComponent({
				props: { caseRuns: [failed(1), failed(2, { fixSuggestion: null })] },
			});

			expect(queryByTestId(BUTTON)).not.toBeInTheDocument();
		});

		it('is shown with two failed cases that have suggestions, and emits their result ids', async () => {
			const user = userEvent.setup();
			const { getByTestId, emitted } = renderComponent({
				props: {
					caseRuns: [failed(1), failed(2), { ...failed(3), status: 'pass' as const }],
				},
			});

			await user.click(getByTestId(BUTTON));

			expect(emitted('apply-suggestions')).toEqual([[['result-1', 'result-2']]]);
		});

		it('leaves out a case whose card was dismissed', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId, emitted } = renderComponent({
				props: { caseRuns: [failed(1), failed(2), failed(3)] },
			});
			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-suggestion-dismiss'));

			await user.click(getByTestId(BUTTON));

			expect(emitted('apply-suggestions')).toEqual([[['result-1', 'result-3']]]);
			expect(queryByTestId('instance-ai-test-agent-examples-case-2-suggestion')).toBeNull();
		});

		it('emits every case with a suggestion, however many there are', async () => {
			const user = userEvent.setup();
			const many = Array.from({ length: MAX_APPLY_SUGGESTIONS + 2 }, (_, i) => failed(i + 1));
			const { getByTestId, emitted } = renderComponent({ props: { caseRuns: many } });

			await user.click(getByTestId(BUTTON));

			expect((emitted('apply-suggestions')[0] as [string[]])[0]).toHaveLength(
				MAX_APPLY_SUGGESTIONS + 2,
			);
		});

		it('is disabled while a suggestion is being applied', () => {
			const { getByTestId } = renderComponent({
				props: { caseRuns: [failed(1), failed(2)], applyingSuggestionIds: ['result-1'] },
			});

			expect(getByTestId(BUTTON)).toBeDisabled();
		});

		it('is hidden while the run is still going', () => {
			const { queryByTestId } = renderComponent({
				props: { caseRuns: [failed(1), failed(2), failed(3, { status: 'waiting' as const })] },
			});

			expect(queryByTestId(BUTTON)).not.toBeInTheDocument();
		});
	});

	it('refuses a whitespace-only "add your own example" submission', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent();

		const input = getByTestId('instance-ai-test-agent-examples-add-own-input');
		await user.type(input, '   {Enter}');

		expect(emitted()['add-example']).toBeUndefined();
		expect(input).toHaveValue('   ');
	});

	it('clears the "add your own example" input on Escape without emitting', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent();

		const input = getByTestId('instance-ai-test-agent-examples-add-own-input');
		await user.type(input, 'A draft I changed my mind about');
		await user.keyboard('{Escape}');

		expect(input).toHaveValue('');
		expect(emitted()['add-example']).toBeUndefined();
	});
});
