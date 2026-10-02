import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalExamplesSlider from '../components/AgentEvalExamplesSlider.vue';

const examples = [
	{
		input: 'Which ticket is blocking the release?',
		whatToCheck: 'names a ticket',
		scenario: 'Vague',
	},
	{ input: 'What is our refund policy?', whatToCheck: 'mentions 30 days', scenario: 'Happy path' },
];

const renderComponent = createComponentRenderer(AgentEvalExamplesSlider, {
	props: { examples },
});

describe('AgentEvalExamplesSlider', () => {
	it('renders the slider and generated examples by default', () => {
		const { getByTestId, getAllByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('instance-ai-test-agent-examples-slider')).toBeInTheDocument();
		expect(getAllByTestId('instance-ai-test-agent-examples-example')).toHaveLength(2);
		expect(queryByTestId('agent-eval-examples-slider-loading')).not.toBeInTheDocument();
	});

	it('shows a spinner saying cases are being generated, instead of the slider/list/input', () => {
		const { getByTestId, getByText, queryByTestId } = renderComponent({
			props: { loading: true, examples: [] },
		});

		expect(getByTestId('agent-eval-examples-slider-loading')).toBeInTheDocument();
		expect(getByText('Adding more cases to your eval suite…')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-test-agent-examples-slider')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-test-agent-examples-add-own-input')).not.toBeInTheDocument();
	});
});
