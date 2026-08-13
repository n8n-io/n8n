import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import WizardNavigationFooter from './WizardNavigationFooter.vue';

const renderComponent = createComponentRenderer(WizardNavigationFooter);

describe('WizardNavigationFooter', () => {
	it('renders step counter', () => {
		const { getByText } = renderComponent({
			props: { stepIndex: 0, totalSteps: 3 },
		});
		expect(getByText('1 of 3')).toBeTruthy();
	});

	it('shows navigation arrows when totalSteps > 1', () => {
		const { getByTestId } = renderComponent({
			props: { stepIndex: 1, totalSteps: 3 },
		});
		expect(getByTestId('wizard-nav-prev')).toBeTruthy();
		expect(getByTestId('wizard-nav-next')).toBeTruthy();
	});

	it('hides navigation arrows when totalSteps = 1', () => {
		const { queryByTestId } = renderComponent({
			props: { stepIndex: 0, totalSteps: 1 },
		});
		expect(queryByTestId('wizard-nav-prev')).toBeNull();
		expect(queryByTestId('wizard-nav-next')).toBeNull();
	});

	it('disables prev button when isPrevDisabled', () => {
		const { getByTestId } = renderComponent({
			props: { stepIndex: 0, totalSteps: 3, isPrevDisabled: true },
		});
		expect(getByTestId('wizard-nav-prev')).toBeDisabled();
	});

	it('disables next button when isNextDisabled', () => {
		const { getByTestId } = renderComponent({
			props: { stepIndex: 2, totalSteps: 3, isNextDisabled: true },
		});
		expect(getByTestId('wizard-nav-next')).toBeDisabled();
	});

	it('emits prev when prev button clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { stepIndex: 1, totalSteps: 3, isPrevDisabled: false },
		});
		await userEvent.click(getByTestId('wizard-nav-prev'));
		expect(emitted().prev).toHaveLength(1);
	});

	it('emits next when next button clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { stepIndex: 0, totalSteps: 3, isNextDisabled: false },
		});
		await userEvent.click(getByTestId('wizard-nav-next'));
		expect(emitted().next).toHaveLength(1);
	});

	it('renders action slot content', () => {
		const { getByTestId } = renderComponent({
			props: { stepIndex: 0, totalSteps: 3 },
			slots: {
				actions: '<button data-test-id="custom-action">Go</button>',
			},
		});
		expect(getByTestId('custom-action')).toBeTruthy();
	});
});
