import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiOfferBubble from '../InstanceAiOfferBubble.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/i18n')>()),
	useI18n: () => ({
		baseText: (key: string) => {
			const map: Record<string, string> = {
				'instanceAi.proactiveOffer.accept': 'Get help',
				'instanceAi.proactiveOffer.dismiss': 'Dismiss',
			};
			return map[key] ?? key;
		},
	}),
}));

const renderComponent = createComponentRenderer(InstanceAiOfferBubble, {
	props: {
		title: 'I can help with that',
		detail: 'HTTP Request failed',
	},
});

describe('InstanceAiOfferBubble', () => {
	it('renders the title, detail, and actions', () => {
		const { getByTestId } = renderComponent();

		const bubble = getByTestId('instance-ai-offer-bubble');
		expect(bubble).toHaveTextContent('I can help with that');
		expect(bubble).toHaveTextContent('HTTP Request failed');
		expect(getByTestId('instance-ai-offer-bubble-dismiss')).toHaveTextContent('Dismiss');
		expect(getByTestId('instance-ai-offer-bubble-accept')).toHaveTextContent('Get help');
	});

	it('emits accept and dismiss', async () => {
		const user = userEvent.setup();
		const { emitted, getByTestId } = renderComponent();

		await user.click(getByTestId('instance-ai-offer-bubble-accept'));
		await user.click(getByTestId('instance-ai-offer-bubble-dismiss'));

		expect(emitted().accept).toEqual([[]]);
		expect(emitted().dismiss).toEqual([[]]);
	});
});
