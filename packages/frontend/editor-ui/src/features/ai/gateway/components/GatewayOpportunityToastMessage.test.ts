import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import GatewayOpportunityToastMessage from './GatewayOpportunityToastMessage.vue';

const renderComponent = createComponentRenderer(GatewayOpportunityToastMessage);

describe('GatewayOpportunityToastMessage', () => {
	it('renders the singular message for a single opportunity', () => {
		const { getByText } = renderComponent({ props: { opportunityCount: 1, canApply: true } });
		expect(
			getByText(
				'1 node in this workflow could use Gateway credits instead of your own credential.',
			),
		).toBeInTheDocument();
	});

	it('renders the plural message for multiple opportunities', () => {
		const { getByText } = renderComponent({ props: { opportunityCount: 3, canApply: true } });
		expect(
			getByText(
				'3 nodes in this workflow could use Gateway credits instead of your own credentials.',
			),
		).toBeInTheDocument();
	});

	it('emits dismiss when the Dismiss button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { opportunityCount: 2, canApply: true },
		});
		await userEvent.click(getByTestId('gateway-opportunity-nudge-dismiss'));
		expect(emitted()).toHaveProperty('dismiss');
	});

	it('emits neverShowAgain when the Never show again button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { opportunityCount: 2, canApply: true },
		});
		await userEvent.click(getByTestId('gateway-opportunity-nudge-never-show-again'));
		expect(emitted()).toHaveProperty('neverShowAgain');
	});

	it('emits reviewAndSwitch when the CTA is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { opportunityCount: 2, canApply: true },
		});
		await userEvent.click(getByTestId('gateway-opportunity-nudge-review-and-switch'));
		expect(emitted()).toHaveProperty('reviewAndSwitch');
	});

	it('hides the CTA when canApply is false', () => {
		const { queryByTestId } = renderComponent({
			props: { opportunityCount: 2, canApply: false },
		});
		expect(queryByTestId('gateway-opportunity-nudge-review-and-switch')).not.toBeInTheDocument();
	});

	it('still renders Dismiss and Never show again when the CTA is hidden', () => {
		const { getByTestId } = renderComponent({
			props: { opportunityCount: 2, canApply: false },
		});
		expect(getByTestId('gateway-opportunity-nudge-dismiss')).toBeInTheDocument();
		expect(getByTestId('gateway-opportunity-nudge-never-show-again')).toBeInTheDocument();
	});
});
