import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import GatewayOpportunityToastMessage from './GatewayOpportunityToastMessage.vue';

const renderComponent = createComponentRenderer(GatewayOpportunityToastMessage);

describe('GatewayOpportunityToastMessage', () => {
	it('renders the singular message for a single opportunity', () => {
		const { getByText } = renderComponent({ props: { opportunityCount: 1 } });
		expect(
			getByText(
				'1 node in this workflow could use Gateway credits instead of your own credential.',
			),
		).toBeInTheDocument();
	});

	it('renders the plural message for multiple opportunities', () => {
		const { getByText } = renderComponent({ props: { opportunityCount: 3 } });
		expect(
			getByText(
				'3 nodes in this workflow could use Gateway credits instead of your own credentials.',
			),
		).toBeInTheDocument();
	});

	it('emits dismiss when the Dismiss button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { opportunityCount: 2 } });
		await userEvent.click(getByTestId('gateway-opportunity-nudge-dismiss'));
		expect(emitted()).toHaveProperty('dismiss');
	});

	it('emits neverShowAgain when the Never show again button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { opportunityCount: 2 } });
		await userEvent.click(getByTestId('gateway-opportunity-nudge-never-show-again'));
		expect(emitted()).toHaveProperty('neverShowAgain');
	});
});
