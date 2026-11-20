import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';

import type { DigestProvider } from '../workflows/dailyInboxDigest';
import FirstWorkflowConnectCard from './FirstWorkflowConnectCard.vue';

const renderComponent = createComponentRenderer(FirstWorkflowConnectCard);

const renderCard = (
	provider: DigestProvider,
	props: { isConnecting?: boolean; hasFailed?: boolean } = {},
) =>
	renderComponent({
		props: { provider, isConnecting: false, hasFailed: false, ...props },
		pinia: createTestingPinia(),
	});

describe('FirstWorkflowConnectCard', () => {
	it.each([
		{ provider: 'gmail' as const, button: 'Continue with Google', name: 'Gmail' },
		{ provider: 'outlook' as const, button: 'Continue with Microsoft', name: 'Outlook' },
	])('offers $button for $provider', ({ provider, button, name }) => {
		const { getByTestId, getByText } = renderCard(provider);

		expect(getByTestId('first-workflow-connect-button')).toHaveTextContent(button);
		expect(getByText(name)).toBeInTheDocument();
		expect(getByText('So I can read your unread emails.')).toBeInTheDocument();
	});

	it('asks to connect and to skip', async () => {
		const { getByTestId, emitted } = renderCard('gmail');

		await fireEvent.click(getByTestId('first-workflow-connect-button'));
		await fireEvent.click(getByTestId('first-workflow-connect-skip'));

		expect(emitted('connect')).toHaveLength(1);
		expect(emitted('skip')).toHaveLength(1);
	});

	it('shows an error only after a failed attempt', () => {
		const first = renderCard('gmail');
		expect(first.queryByTestId('first-workflow-connect-error')).not.toBeInTheDocument();
		first.unmount();

		const failed = renderCard('gmail', { hasFailed: true });
		expect(failed.getByTestId('first-workflow-connect-error')).toHaveTextContent(
			"I couldn't connect Gmail",
		);
	});
});
