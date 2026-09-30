import { describe, expect, it } from 'vitest';
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
			{ rowId: 1, input: 'a', status: 'pass' as const, output: 'answer a' },
			{ rowId: 2, input: 'b', status: 'waiting' as const, output: null },
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
			{ rowId: 1, input: 'a', status: 'pass' as const, output: 'answer a' },
			{ rowId: 2, input: 'b', status: 'work' as const, output: 'answer b' },
			{ rowId: 3, input: 'c', status: 'fail' as const, output: null },
		];

		it('shows the pass/needs-work tally and hides the stop button', () => {
			const { getByText, queryByTestId } = renderComponent({ props: { caseRuns } });

			expect(getByText('1 of 3 went well, 2 need work')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-test-agent-examples-stop')).not.toBeInTheDocument();
		});

		it('collapses to the summary pill by default, expanding on click', async () => {
			const user = userEvent.setup();
			const { getByText, getByTestId, queryByTestId } = renderComponent({ props: { caseRuns } });

			expect(getByText('Saved 3 checks')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-test-agent-examples-case-1')).not.toBeInTheDocument();

			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));

			expect(getByTestId('instance-ai-test-agent-examples-case-1')).toBeInTheDocument();
		});

		it('shows the "View in Evals tab" button and emits view-evals', async () => {
			const user = userEvent.setup();
			const { getByTestId, emitted } = renderComponent({ props: { caseRuns } });

			await user.click(getByTestId('instance-ai-test-agent-examples-view-evals'));

			expect(emitted()['view-evals']).toEqual([[]]);
		});
	});
});
