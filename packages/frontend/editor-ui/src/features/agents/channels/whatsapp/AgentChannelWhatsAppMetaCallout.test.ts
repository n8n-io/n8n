import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { configure } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentChannelWhatsAppMetaCallout from './AgentChannelWhatsAppMetaCallout.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

configure({ testIdAttribute: 'data-testid' });

const renderComponent = createComponentRenderer(AgentChannelWhatsAppMetaCallout);

describe('AgentChannelWhatsAppMetaCallout', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it.each([null, { state: 'connected' }, { state: 'unknown' }] as const)(
		'renders nothing for %j',
		(status) => {
			const { queryByTestId } = renderComponent({ props: { status } });

			expect(queryByTestId('whatsapp-meta-callout')).toBeNull();
		},
	);

	it('shows the headline and description for a wait', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { status: { state: 'numberPending', displayPhoneNumber: '+1 555-184-1090' } },
		});

		expect(getByTestId('whatsapp-meta-callout')).toHaveTextContent(
			'agents.channels.whatsapp.meta.numberPending.title',
		);
		expect(getByTestId('whatsapp-meta-callout')).toHaveTextContent(
			'agents.channels.whatsapp.meta.numberPending.description',
		);
		expect(queryByTestId('whatsapp-meta-callout-action')).toBeNull();
	});

	it.each([
		'numberPending',
		'dailyLimit',
		'nameInReviewBlocked',
		'nameDeclinedBlocked',
		'nameInReview',
		'nameDeclined',
		'businessNotVerified',
		'businessInReview',
	] as const)('renders the callout for %s', (state) => {
		const { getByTestId } = renderComponent({
			props: { status: { state, displayName: 'Acme Support', displayPhoneNumber: '+1 555' } },
		});

		expect(getByTestId('whatsapp-meta-callout')).toBeInTheDocument();
	});

	it('links a declined name to WhatsApp Manager', () => {
		const { getByTestId } = renderComponent({
			props: { status: { state: 'nameDeclined', displayName: 'Acme Support' } },
		});

		const action = getByTestId('whatsapp-meta-callout-action');
		expect(action).toHaveAttribute(
			'href',
			'https://business.facebook.com/latest/whatsapp_manager/phone_numbers/',
		);
		expect(action).toHaveAttribute('target', '_blank');
	});
});
