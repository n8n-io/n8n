import { fireEvent } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import AssistantAgentResponseRating from '../AssistantAgentResponseRating.vue';

const renderComponent = createComponentRenderer(AssistantAgentResponseRating);

describe('AssistantAgentResponseRating', () => {
	it.each([
		['assistant-agent-rating-up', 'up'],
		['assistant-agent-rating-down', 'down'],
	])('emits the rating of the %s button', async (testId, rating) => {
		const { getByTestId, emitted } = renderComponent();

		await fireEvent.click(getByTestId(testId));

		expect(emitted('rate')).toEqual([[rating]]);
	});

	it('labels the buttons like the current Assistant', () => {
		const { getByRole } = renderComponent();

		expect(getByRole('button', { name: 'Helpful' })).toBeInTheDocument();
		expect(getByRole('button', { name: 'Not helpful' })).toBeInTheDocument();
	});

	it('shows a thank-you note instead of the buttons after a rating', () => {
		const { getByTestId, queryByTestId } = renderComponent({ props: { rating: 'up' } });

		expect(getByTestId('assistant-agent-rating-thanks')).toHaveTextContent(
			'Thanks for your feedback!',
		);
		expect(queryByTestId('assistant-agent-rating-up')).toBeNull();
		expect(queryByTestId('assistant-agent-rating-down')).toBeNull();
	});
});
