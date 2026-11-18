import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';

import PageTourCard from './PageTourCard.vue';

const renderComponent = createComponentRenderer(PageTourCard, {
	props: {
		pageTitle: 'Runbook',
		text: 'The Webhook node receives the order.',
		stepNumber: 2,
		stepCount: 3,
	},
});

describe('PageTourCard', () => {
	it('should show the title of the page, the position of the step and its text', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('page-tour-title')).toHaveTextContent('Runbook');
		expect(getByTestId('page-tour-step-count')).toHaveTextContent('Step 2 of 3');
		expect(getByTestId('page-tour-text')).toHaveTextContent('The Webhook node receives the order.');
	});

	it('should emit from its buttons', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('page-tour-previous'));
		await userEvent.click(getByTestId('page-tour-next'));
		await userEvent.click(getByTestId('page-tour-close'));

		expect(emitted('previous')).toHaveLength(1);
		expect(emitted('next')).toHaveLength(1);
		expect(emitted('close')).toHaveLength(1);
	});

	it('should turn off the previous button on the first step', () => {
		const { getByTestId } = renderComponent({ props: { stepNumber: 1 } });

		expect(getByTestId('page-tour-previous')).toBeDisabled();
		expect(getByTestId('page-tour-next')).toHaveTextContent('Next');
	});

	it('should finish from the next button on the last step', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { stepNumber: 3 } });

		expect(getByTestId('page-tour-next')).toHaveTextContent('Finish');
		await userEvent.click(getByTestId('page-tour-next'));

		expect(emitted('next')).toHaveLength(1);
	});

	it('should move with the arrow keys and close with Escape', async () => {
		const { emitted } = renderComponent();

		await userEvent.keyboard('{ArrowRight}{ArrowLeft}{Escape}');

		expect(emitted('next')).toHaveLength(1);
		expect(emitted('previous')).toHaveLength(1);
		expect(emitted('close')).toHaveLength(1);
	});

	it('should keep the arrow keys away from the other key handlers of the document', async () => {
		const otherHandler = vi.fn();
		document.addEventListener('keydown', otherHandler);
		renderComponent();

		await userEvent.keyboard('{ArrowRight}');
		await userEvent.keyboard('a');
		document.removeEventListener('keydown', otherHandler);

		expect(otherHandler).toHaveBeenCalledTimes(1);
		expect(otherHandler.mock.calls[0][0]).toHaveProperty('key', 'a');
	});

	it('should not go before the first step or past the last step with the arrow keys', async () => {
		const first = renderComponent({ props: { stepNumber: 1 } });
		await userEvent.keyboard('{ArrowLeft}');
		expect(first.emitted('previous')).toBeUndefined();
		first.unmount();

		const last = renderComponent({ props: { stepNumber: 3 } });
		await userEvent.keyboard('{ArrowRight}');
		expect(last.emitted('next')).toBeUndefined();
	});

	it('should leave alone the keys with a modifier and the keys typed in a field', async () => {
		const { emitted } = renderComponent();
		const field = document.createElement('input');
		document.body.appendChild(field);

		await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
		field.focus();
		await userEvent.keyboard('{ArrowRight}{Escape}');
		field.remove();

		expect(emitted('next')).toBeUndefined();
		expect(emitted('close')).toBeUndefined();
	});

	it('should stop listening to the keys after it is removed', async () => {
		const { emitted, unmount } = renderComponent();

		unmount();
		await userEvent.keyboard('{ArrowRight}');

		expect(emitted('next')).toBeUndefined();
	});
});
