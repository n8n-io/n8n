import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { useConsentStore } from '@/app/stores/consent.store';
import OAuthConsentView from '@/app/views/OAuthConsentView.vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import * as consentApi from '@n8n/rest-api-client/api/consent';

vi.mock('@n8n/rest-api-client/api/consent');

const renderComponent = createComponentRenderer(OAuthConsentView);

// The localized label each known scope must render — mirrors `oauth.consentView.scope.*` in en.json.
const KNOWN_SCOPE_LABELS: Record<string, string> = {
	'instanceAi:message': 'Chat with the AI Assistant on your behalf',
	'instanceAi:gateway': 'Run local automation tools on your machine',
	'workflow:read': 'View your workflows',
	'workflow:execute': 'Execute workflows on your behalf',
	'execution:read': 'View workflow execution details',
	'execution:list': 'List your workflow executions',
};

let locationHrefSpy: ReturnType<typeof vi.spyOn>;

describe('OAuthConsentView', () => {
	let consentStore: ReturnType<typeof mockedStore<typeof useConsentStore>>;

	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		consentStore = mockedStore(useConsentStore);

		consentStore.consentDetails = {
			clientName: 'Test MCP Client',
			clientId: 'test-client-id',
			scopes: [],
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

	it('renders the localized label for every known scope, not the raw slug', async () => {
		const scopes = Object.keys(KNOWN_SCOPE_LABELS);
		vi.mocked(consentApi.getConsentDetails).mockResolvedValue({
			clientName: 'Test MCP Client',
			clientId: 'test-client-id',
			scopes,
		});

		const { getByText, queryByText } = renderComponent();
		await waitAllPromises();

		for (const [scope, label] of Object.entries(KNOWN_SCOPE_LABELS)) {
			expect(getByText(label)).toBeInTheDocument();
			// The raw slug must never leak through for a mapped scope.
			expect(queryByText(scope)).not.toBeInTheDocument();
		}
	});

	it('falls back to the raw scope slug when no translation exists', async () => {
		vi.mocked(consentApi.getConsentDetails).mockResolvedValue({
			clientName: 'Test MCP Client',
			clientId: 'test-client-id',
			scopes: ['some:unmappedScope'],
		});

		const { getByText } = renderComponent();
		await waitAllPromises();

		expect(getByText('some:unmappedScope')).toBeInTheDocument();
	});
});
