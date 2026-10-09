import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalSuggestionCard from '../AgentEvalSuggestionCard.vue';

const renderComponent = createComponentRenderer(AgentEvalSuggestionCard, {
	props: { suggestion: 'Politely decline requests outside invoice support.', testId: 'card' },
});

describe('AgentEvalSuggestionCard', () => {
	it('shows the heading, the suggestion and both actions', () => {
		const { getByText } = renderComponent();

		expect(getByText('Suggested instruction')).toBeInTheDocument();
		expect(getByText('Politely decline requests outside invoice support.')).toBeInTheDocument();
		expect(getByText('Apply suggestion')).toBeInTheDocument();
		expect(getByText('Keep as is')).toBeInTheDocument();
	});

	it('emits apply and dismiss from the matching buttons', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent();

		await user.click(getByTestId('card-apply'));
		await user.click(getByTestId('card-dismiss'));

		expect(emitted('apply')).toHaveLength(1);
		expect(emitted('dismiss')).toHaveLength(1);
	});

	it('does not emit while disabled', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent({ props: { disabled: true } });

		await user.click(getByTestId('card-apply'));
		await user.click(getByTestId('card-dismiss'));

		expect(emitted('apply')).toBeUndefined();
		expect(emitted('dismiss')).toBeUndefined();
	});

	it('disables "Keep as is" while applying', () => {
		const { getByTestId } = renderComponent({ props: { applying: true } });

		expect(getByTestId('card-dismiss')).toBeDisabled();
	});
});
