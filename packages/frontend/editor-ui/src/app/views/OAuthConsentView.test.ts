import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { useConsentStore } from '@/app/stores/consent.store';
import OAuthConsentView from '@/app/views/OAuthConsentView.vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

vi.mock('@n8n/rest-api-client/api/consent');

const renderComponent = createComponentRenderer(OAuthConsentView);

let locationHrefSpy: ReturnType<typeof vi.spyOn>;

describe('OAuthConsentView', () => {
	let consentStore: ReturnType<typeof mockedStore<typeof useConsentStore>>;

	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		consentStore = mockedStore(useConsentStore);

		consentStore.consentDetails = {
			clientName: 'Test MCP Client',
			clientId: 'test-client-id',
		};
		consentStore.isLoading = false;
		consentStore.error = null;

		locationHrefSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
			...window.location,
			href: '',
		} as Location);

		Object.defineProperty(window, 'location', {
			writable: true,
			value: { href: '' },
		});
	});

	afterEach(() => {
		locationHrefSpy?.mockRestore();
	});

	it('should show the workflow name and hide the permission list when a resource is named', async () => {
		consentStore.consentDetails = {
			clientName: 'Test MCP Client',
			clientId: 'test-client-id',
			resourceName: 'My Workflow',
		};
		consentStore.fetchConsentDetails.mockResolvedValue(consentStore.consentDetails);

		const { getByText, queryByText } = renderComponent();
		await waitAllPromises();

		expect(getByText('Test MCP Client requests access to workflow My Workflow')).toBeVisible();
		expect(queryByText('Get a list of your workflows')).toBeNull();
	});

	it('should show the generic heading and permission list when no resource is named', async () => {
		consentStore.fetchConsentDetails.mockResolvedValue(consentStore.consentDetails!);

		const { getByText } = renderComponent();
		await waitAllPromises();

		expect(getByText('Test MCP Client wants access to your n8n instance')).toBeVisible();
		expect(getByText('Get a list of your workflows')).toBeVisible();
	});

	it('should show the dedicated error and disable the buttons when the resource is unavailable', async () => {
		consentStore.error = 'Authorization target is no longer available';
		consentStore.errorCode = 'resource_unavailable';
		consentStore.fetchConsentDetails.mockResolvedValue(consentStore.consentDetails!);

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		expect(getByTestId('consent-error-notice')).toHaveTextContent(
			'This authorization can no longer be completed because the target is no longer available.',
		);
		expect(getByTestId('consent-deny-button')).toBeDisabled();
		expect(getByTestId('consent-allow-button')).toBeDisabled();
	});

	it('should redirect to home page when deny is clicked', async () => {
		consentStore.approveConsent.mockResolvedValue({
			status: 'denied',
			redirectUrl: 'https://malicious-site.com',
		});

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		const denyButton = getByTestId('consent-deny-button');
		await userEvent.click(denyButton);
		await waitAllPromises();

		expect(consentStore.approveConsent).toHaveBeenCalledWith(false);
		expect(window.location.href).toBe(window.BASE_PATH ?? '/');
	});

	it('should redirect to client redirect URL when allow is clicked', async () => {
		const redirectUrl = 'https://legitimate-client.com/callback?code=abc';
		consentStore.approveConsent.mockResolvedValue({
			status: 'approved',
			redirectUrl,
		});

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		const allowButton = getByTestId('consent-allow-button');
		await userEvent.click(allowButton);
		await waitAllPromises();

		expect(consentStore.approveConsent).toHaveBeenCalledWith(true);
		expect(window.location.href).toBe(redirectUrl);
	});
});
