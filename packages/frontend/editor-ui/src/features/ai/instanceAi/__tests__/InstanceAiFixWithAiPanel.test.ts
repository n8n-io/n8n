import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiFixWithAiPanel from '../components/InstanceAiFixWithAiPanel.vue';

const renderComponent = createComponentRenderer(InstanceAiFixWithAiPanel, {
	props: {
		nodeName: 'Extract Emails',
		errorMessage: 'the emails were not extracted',
	},
});

describe('InstanceAiFixWithAiPanel', () => {
	it('renders the node failure title and fix action', () => {
		const { getByTestId } = renderComponent();

		const panel = getByTestId('instance-ai-fix-with-ai-panel');
		expect(panel).toHaveTextContent('Execution failed in ‘Extract Emails’ node');
		expect(getByTestId('instance-ai-fix-with-ai-dismiss')).toHaveTextContent('Dismiss');
		expect(getByTestId('instance-ai-fix-with-ai-button')).toHaveTextContent('Fix with AI');
	});

	it('emits dismiss when the dismiss button is clicked', async () => {
		const user = userEvent.setup();
		const { emitted, getByTestId } = renderComponent();

		await user.click(getByTestId('instance-ai-fix-with-ai-dismiss'));

		expect(emitted().dismiss).toEqual([[]]);
	});

	it('keeps error details collapsed by default', () => {
		const { getByTestId, queryByText } = renderComponent();

		expect(getByTestId('instance-ai-fix-with-ai-error-toggle')).toHaveTextContent('Error details');
		expect(queryByText('the emails were not extracted')).not.toBeInTheDocument();
	});

	it('expands the code view when error details is toggled', async () => {
		const user = userEvent.setup();
		const { getByTestId, getByText } = renderComponent();

		await user.click(getByTestId('instance-ai-fix-with-ai-error-toggle'));

		expect(getByText('the emails were not extracted')).toBeVisible();
	});
});
