import { describe, expect, it } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
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

const renderComponent = createComponentRenderer(InstanceAiTestAgentExamplesPanel, {
	props: {
		previewInput: 'Summarize the thread about the Acme SSO outage',
		previewOutput: 'Ticket #48219 is a P1 SSO outage.',
		previewScenario: 'Upset',
		examples,
		caseRuns: null,
	},
});

describe('InstanceAiTestAgentExamplesPanel', () => {
	it('shows the try input and a default slice of examples', () => {
		const { getByText, getAllByTestId } = renderComponent();

		expect(getByText('Summarize the thread about the Acme SSO outage')).toBeInTheDocument();
		// Default slider value is 2.
		expect(getAllByTestId('instance-ai-test-agent-examples-example')).toHaveLength(2);
	});

	it('expands the try row to show the full input/output', async () => {
		const user = userEvent.setup();
		const { getByTestId, queryByTestId, findByText } = renderComponent();

		expect(
			queryByTestId('instance-ai-test-agent-examples-try-placeholder'),
		).not.toBeInTheDocument();

		await user.click(getByTestId('instance-ai-test-agent-examples-try-toggle'));

		expect(getByTestId('instance-ai-test-agent-examples-try-placeholder')).toBeInTheDocument();
		expect(await findByText('Ticket #48219 is a P1 SSO outage.')).toBeInTheDocument();
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
			{ rowId: 1, input: 'a', label: 'Vague', status: 'pass' as const, output: 'answer a' },
			{ rowId: 2, input: 'b', label: 'Custom', status: 'waiting' as const, output: null },
		];

		it('hides the confirmed try and shows how many cases are left', () => {
			const { getByText, queryByTestId, queryByText } = renderComponent({
				props: { caseRuns },
			});

			expect(getByText('Checking, 1 left')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-test-agent-examples-try')).not.toBeInTheDocument();
			expect(queryByText(/Saved as your first check/)).not.toBeInTheDocument();
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
			{ rowId: 1, input: 'a', label: 'Vague', status: 'pass' as const, output: 'answer a' },
			{
				rowId: 2,
				input: 'b',
				label: 'Sensitive data',
				status: 'work' as const,
				output: 'answer b',
			},
			{ rowId: 3, input: 'c', label: 'Custom', status: 'fail' as const, output: null },
		];

		it('shows the pass/needs-work tally and hides the stop button', () => {
			const { getByText, queryByTestId } = renderComponent({ props: { caseRuns } });

			expect(getByText('1 of 3 went well, 2 need work')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-test-agent-examples-stop')).not.toBeInTheDocument();
		});

		it('keeps each row labeled with its scenario tag once the suite has run', async () => {
			const user = userEvent.setup();
			const { getByTestId, findByText, getByText } = renderComponent({ props: { caseRuns } });

			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));

			expect(await findByText('Vague')).toBeInTheDocument();
			expect(getByText('Sensitive data')).toBeInTheDocument();
			expect(getByText('Custom')).toBeInTheDocument();
		});

		it('collapses to the summary pill by default, expanding on click', async () => {
			const user = userEvent.setup();
			const { getByText, getByTestId, queryByTestId } = renderComponent({ props: { caseRuns } });

			expect(getByText('Saved 3 checks')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-test-agent-examples-case-1')).not.toBeInTheDocument();

			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));

			expect(getByTestId('instance-ai-test-agent-examples-case-1')).toBeInTheDocument();
		});

		it('"Actually fine" marks that row as passed and updates the tally, without touching other rows', async () => {
			const user = userEvent.setup();
			const { getByText, getByTestId } = renderComponent({ props: { caseRuns } });
			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-toggle'));

			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-actually-fine'));

			expect(getByText('2 of 3 went well, 1 need work')).toBeInTheDocument();
		});

		it('emits revise-case with the row id and typed suggestion on "Save check"', async () => {
			const user = userEvent.setup();
			const { getByTestId, emitted } = renderComponent({ props: { caseRuns } });
			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-toggle'));

			await user.type(
				getByTestId('instance-ai-test-agent-examples-case-2-suggestion'),
				'Apologise and link the open ticket.',
			);
			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-save-check'));

			expect(emitted()['revise-case']).toEqual([
				[{ rowId: 2, suggestion: 'Apologise and link the open ticket.' }],
			]);
		});

		it('clears an "Actually fine" override once that row goes back to waiting (a rerun)', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByText, rerender } = renderComponent({ props: { caseRuns } });
			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-toggle'));
			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-actually-fine'));

			expect(getByText('2 of 3 went well, 1 need work')).toBeInTheDocument();

			// A fresh run puts the row back to "waiting" — the override must not
			// keep it looking passed once its real status is live again.
			await rerender({
				caseRuns: [
					{ rowId: 1, input: 'a', label: 'Vague', status: 'pass' as const, output: 'answer a' },
					{
						rowId: 2,
						input: 'b',
						label: 'Sensitive data',
						status: 'waiting' as const,
						output: null,
					},
					{ rowId: 3, input: 'c', label: 'Custom', status: 'fail' as const, output: null },
				],
			});

			expect(getByText('Checking, 1 left')).toBeInTheDocument();
		});

		it('disables "Save check" for the row currently revising, even once a suggestion is typed', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderComponent({ props: { caseRuns, revisingRowId: 2 } });
			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-toggle'));

			await user.type(
				getByTestId('instance-ai-test-agent-examples-case-2-suggestion'),
				'Apologise and link the open ticket.',
			);

			expect(getByTestId('instance-ai-test-agent-examples-case-2-save-check')).toBeDisabled();
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
