import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { useConsentStore } from '@/app/stores/consent.store';
import OAuthConsentView from '@/app/views/OAuthConsentView.vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

vi.mock('@n8n/rest-api-client/api/consent');

const renderComponent = createComponentRenderer(OAuthConsentView);

describe('OAuthConsentView', () => {
	let consentStore: ReturnType<typeof mockedStore<typeof useConsentStore>>;

	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		consentStore = mockedStore(useConsentStore);

		const details = {
			clientName: 'Test MCP Client',
			clientId: 'test-client-id',
			redirectUri: 'https://legitimate-client.com/callback',
		};
		consentStore.consentDetails = details;
		consentStore.fetchConsentDetails.mockImplementation(async () => {
			consentStore.consentDetails = details;
			return details;
		});
		consentStore.isLoading = false;
		consentStore.error = null;

		Object.defineProperty(window, 'location', {
			writable: true,
			value: { href: '' },
		});
	});

	it('should redirect back to client with error when deny is clicked', async () => {
		const denyUrl =
			'https://legitimate-client.com/callback?error=access_denied&error_description=User+denied&state=xyz';
		consentStore.approveConsent.mockResolvedValue({
			status: 'success',
			redirectUrl: denyUrl,
		});

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		const denyButton = getByTestId('consent-deny-button');
		await userEvent.click(denyButton);
		await waitAllPromises();

		expect(consentStore.approveConsent).toHaveBeenCalledWith(false);
		expect(window.location.href).toBe(denyUrl);
	});

	it('should redirect to client redirect URL when allow is clicked', async () => {
		const redirectUrl = 'https://legitimate-client.com/callback?code=abc';
		consentStore.approveConsent.mockResolvedValue({
			status: 'success',
			redirectUrl,
		});

		const { getByTestId, getByLabelText } = renderComponent();
		await waitAllPromises();

		await userEvent.click(getByLabelText('I recognize and trust this URL'));

		const allowButton = getByTestId('consent-allow-button');
		await userEvent.click(allowButton);
		await waitAllPromises();

		expect(consentStore.approveConsent).toHaveBeenCalledWith(true);
		expect(window.location.href).toBe(redirectUrl);
	});

	it('should disable allow button until redirect URL is trusted', async () => {
		const { getByTestId, getByLabelText } = renderComponent();
		await waitAllPromises();

		const allowButton = getByTestId('consent-allow-button');
		expect(allowButton).toBeDisabled();

		await userEvent.click(getByLabelText('I recognize and trust this URL'));

		expect(allowButton).not.toBeDisabled();
	});
});
