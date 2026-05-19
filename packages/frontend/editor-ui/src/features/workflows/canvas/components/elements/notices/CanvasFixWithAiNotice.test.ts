import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import CanvasFixWithAiNotice from './CanvasFixWithAiNotice.vue';

const renderComponent = createComponentRenderer(CanvasFixWithAiNotice, {
	props: {
		nodeName: 'Extract Emails',
		errorMessage: 'Intentional break [line 1]',
	},
});

describe('CanvasFixWithAiNotice', () => {
	it('renders the single-node title and the error message', () => {
		const { getByTestId } = renderComponent();
		const notice = getByTestId('fix-with-ai-notice');

		expect(notice).toHaveTextContent('Problem in node ‘Extract Emails’');
		expect(notice).toHaveTextContent('Intentional break [line 1]');
	});

	it('renders the multi-node title when failedCount > 1', () => {
		const { getByTestId } = renderComponent({ props: { failedCount: 3 } });

		expect(getByTestId('fix-with-ai-notice')).toHaveTextContent('3 nodes failed');
	});

	it('emits fix-with-ai when the action button is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();

		await userEvent.click(getByTestId('fix-with-ai-button'));

		expect(emitted()['fix-with-ai']).toEqual([[]]);
	});

	it('emits dismiss when the close button is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();

		await userEvent.click(getByTestId('fix-with-ai-notice-dismiss'));

		expect(emitted().dismiss).toEqual([[]]);
	});
});
