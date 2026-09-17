import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import PromotionCheckoutStatus from './PromotionCheckoutStatus.vue';

const renderComponent = createComponentRenderer(PromotionCheckoutStatus, {
	props: { branchName: 'main', busy: false },
});

describe('PromotionCheckoutStatus', () => {
	it('offers Connect when no checkout exists', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { checkout: { hasCheckout: false, matchesConfig: false } },
		});

		expect(getByTestId('promotion-checkout-connect')).toBeEnabled();
		expect(queryByTestId('promotion-checkout-reconnect')).toBeNull();
		expect(queryByTestId('promotion-checkout-disconnect')).toBeNull();
	});

	it('blocks Connect and explains why when a reason is given', () => {
		const { getByTestId } = renderComponent({
			props: {
				checkout: undefined,
				disabledReason: 'Save this connection before you connect.',
			},
		});

		expect(getByTestId('promotion-checkout-connect')).toBeDisabled();
		expect(getByTestId('promotion-checkout-status')).toHaveTextContent(
			'Save this connection before you connect.',
		);
	});

	it('offers Reconnect and Disconnect when connected', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { checkout: { hasCheckout: true, matchesConfig: true } },
		});

		expect(getByTestId('promotion-checkout-reconnect')).toBeInTheDocument();
		expect(getByTestId('promotion-checkout-disconnect')).toBeInTheDocument();
		expect(queryByTestId('promotion-checkout-connect')).toBeNull();
	});

	it('keeps the connected status visible when Reconnect is disabled', () => {
		const { getByTestId } = renderComponent({
			props: {
				checkout: { hasCheckout: true, matchesConfig: true },
				disabledReason: 'Save your changes before you connect.',
			},
		});

		expect(getByTestId('promotion-checkout-status')).toHaveTextContent('Connected to main');
		expect(getByTestId('promotion-checkout-reconnect')).toBeDisabled();
		expect(getByTestId('promotion-checkout-disconnect')).toBeEnabled();
	});

	it('offers Reconnect when the checkout is stale', () => {
		const { getByTestId } = renderComponent({
			props: { checkout: { hasCheckout: true, matchesConfig: false } },
		});

		expect(getByTestId('promotion-checkout-reconnect')).toBeInTheDocument();
		expect(getByTestId('promotion-checkout-disconnect')).toBeInTheDocument();
	});

	it('keeps the stale status visible when Reconnect is disabled', () => {
		const { getByTestId } = renderComponent({
			props: {
				checkout: { hasCheckout: true, matchesConfig: false },
				disabledReason: 'Save your changes before you connect.',
			},
		});

		expect(getByTestId('promotion-checkout-status')).toHaveTextContent(
			'The remote or branch changed. Reconnect to update the local copy.',
		);
		expect(getByTestId('promotion-checkout-reconnect')).toBeDisabled();
		expect(getByTestId('promotion-checkout-disconnect')).toBeEnabled();
	});

	it('emits connect and disconnect on click', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { checkout: { hasCheckout: true, matchesConfig: true } },
		});

		await userEvent.click(getByTestId('promotion-checkout-reconnect'));
		await userEvent.click(getByTestId('promotion-checkout-disconnect'));

		expect(emitted('connect')).toHaveLength(1);
		expect(emitted('disconnect')).toHaveLength(1);
	});
});
