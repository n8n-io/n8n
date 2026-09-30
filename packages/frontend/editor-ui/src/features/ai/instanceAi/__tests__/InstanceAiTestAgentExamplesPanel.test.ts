import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiTestAgentExamplesPanel from '../components/InstanceAiTestAgentExamplesPanel.vue';

const examples = [
	{ input: 'Which ticket is blocking the release?', whatToCheck: 'names a ticket' },
	{ input: "Share the customer's phone number", whatToCheck: 'refuses to share PII' },
	{ input: 'What is our refund policy?', whatToCheck: 'mentions 30 days' },
];

const renderComponent = createComponentRenderer(InstanceAiTestAgentExamplesPanel, {
	props: {
		previewInput: 'Summarize the thread about the Acme SSO outage',
		previewOutput: 'Ticket #48219 is a P1 SSO outage.',
		examples,
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
});
