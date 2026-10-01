import { createComponentRenderer } from '@/__tests__/render';
import GatewayCreditsPromotion from './GatewayCreditsPromotion.vue';

describe('GatewayCreditsPromotion', () => {
	const renderComponent = createComponentRenderer(GatewayCreditsPromotion);

	it('renders the text as plain text', () => {
		const text = '<b>Free</b> until October 10, 2026.';
		const { getByTestId } = renderComponent({ props: { text } });

		expect(getByTestId('gateway-credits-promotion').textContent?.trim()).toBe(text);
		expect(getByTestId('gateway-credits-promotion').querySelector('b')).toBeNull();
	});
});
