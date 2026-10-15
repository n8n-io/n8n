import { createComponentRenderer } from '@/__tests__/render';
import { configure } from '@testing-library/vue';
import type { WhatsAppAccountStatus } from '@n8n/api-types';

import AgentChannelWhatsAppAccountStatus from './AgentChannelWhatsAppAccountStatus.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

// The shared default is `data-test-id`; these components use `data-testid`.
configure({ testIdAttribute: 'data-testid' });

const renderComponent = createComponentRenderer(AgentChannelWhatsAppAccountStatus);

const ready: WhatsAppAccountStatus = {
	sending: 'available',
	reasons: [],
	displayName: 'approved',
	businessVerification: 'approved',
	accountReview: 'approved',
	sandbox: false,
};

describe('AgentChannelWhatsAppAccountStatus', () => {
	it('shows a loading state before Meta answers', () => {
		const { getByTestId } = renderComponent({ props: { status: null } });

		expect(getByTestId('whatsapp-account-status-loading')).toBeInTheDocument();
	});

	it('shows a ready number without the polling note', () => {
		const { getByTestId, queryByTestId } = renderComponent({ props: { status: ready } });

		expect(getByTestId('whatsapp-account-status-sending-available')).toBeInTheDocument();
		expect(queryByTestId('whatsapp-account-status-polling')).not.toBeInTheDocument();
	});

	it("shows Meta's reasons with the suggested fix, and the polling note", () => {
		const { getByText, getByTestId } = renderComponent({
			props: {
				status: {
					...ready,
					sending: 'blocked',
					reasons: [
						{
							description: 'The business is not verified.',
							solution: 'Verify the business in Business Manager.',
						},
					],
				},
			},
		});

		expect(getByTestId('whatsapp-account-status-sending-blocked')).toBeInTheDocument();
		expect(getByText('The business is not verified.')).toBeInTheDocument();
		expect(getByText('Verify the business in Business Manager.')).toBeInTheDocument();
		expect(getByTestId('whatsapp-account-status-polling')).toBeInTheDocument();
	});

	it('leaves out a review that Meta did not report', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { status: { ...ready, displayName: 'pending', accountReview: 'unknown' } },
		});

		expect(getByTestId('whatsapp-account-status-displayName')).toHaveTextContent(
			'agents.channels.whatsapp.status.state.pending',
		);
		expect(queryByTestId('whatsapp-account-status-accountReview')).not.toBeInTheDocument();
	});

	it('explains the limits of a test number', () => {
		const { getByTestId } = renderComponent({ props: { status: { ...ready, sandbox: true } } });

		expect(getByTestId('whatsapp-account-status-sandbox')).toBeInTheDocument();
	});
});
