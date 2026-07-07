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

		const details = {
			clientName: 'Test MCP Client',
			clientId: 'test-client-id',
			redirectUri: 'https://legitimate-client.com/callback',
			scopes: [],
		};
		consentStore.consentDetails = details;
		consentStore.fetchConsentDetails.mockImplementation(async () => {
			consentStore.consentDetails = details;
			return details;
		});
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
			scopes: [],
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

	it('should show the dedicated error and a Close action when the resource is unavailable', async () => {
		consentStore.error = 'Authorization target is no longer available';
		consentStore.errorCode = 'resource_unavailable';
		consentStore.fetchConsentDetails.mockResolvedValue(consentStore.consentDetails!);

		const { getByTestId, queryByTestId } = renderComponent();
		await waitAllPromises();

		expect(getByTestId('consent-error-notice')).toHaveTextContent(
			'This authorization can no longer be completed because the target is no longer available.',
		);
		// No grant controls on a rejected request — only a way out.
		expect(queryByTestId('consent-deny-button')).toBeNull();
		expect(queryByTestId('consent-allow-button')).toBeNull();
		expect(getByTestId('consent-close-button')).toBeVisible();
	});

	it('should redirect to home page when Close is clicked on the error screen', async () => {
		consentStore.error = 'Authorization target is no longer available';
		consentStore.errorCode = 'resource_unavailable';
		consentStore.fetchConsentDetails.mockResolvedValue(consentStore.consentDetails!);

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		await userEvent.click(getByTestId('consent-close-button'));
		await waitAllPromises();

		expect(consentStore.approveConsent).not.toHaveBeenCalled();
		expect(window.location.href).toBe(window.BASE_PATH ?? '/');
	});

	it('should not render the instance consent layout when the resource is unavailable', async () => {
		consentStore.error = 'Authorization target is no longer available';
		consentStore.errorCode = 'resource_unavailable';
		consentStore.fetchConsentDetails.mockResolvedValue(consentStore.consentDetails!);

		const { queryByText } = renderComponent();
		await waitAllPromises();

		// A rejected request must not present the broad instance permission grant.
		expect(queryByText('Test MCP Client wants access to your n8n instance')).toBeNull();
		expect(queryByText('Get a list of your workflows')).toBeNull();
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

		const { getByTestId, getByLabelText } = renderComponent();
		await waitAllPromises();

		await userEvent.click(getByLabelText('I recognize and trust this URL'));

		const allowButton = getByTestId('consent-allow-button');
		await userEvent.click(allowButton);
		await waitAllPromises();

		expect(consentStore.approveConsent).toHaveBeenCalledWith(true, undefined);
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

	describe('scope selection', () => {
		const scopedDetails = {
			clientName: 'Test MCP Client',
			clientId: 'test-client-id',
			redirectUri: 'https://legitimate-client.com/callback',
			scopes: ['workflow:read', 'workflow:write', 'execution:read'],
		};

		beforeEach(() => {
			consentStore.consentDetails = scopedDetails;
			consentStore.fetchConsentDetails.mockImplementation(async () => {
				consentStore.consentDetails = scopedDetails;
				return scopedDetails;
			});
		});

		it('should render the scope picker instead of the static permission list', async () => {
			const { getByTestId, queryByText } = renderComponent();
			await waitAllPromises();

			expect(getByTestId('consent-scopes')).toBeVisible();
			expect(getByTestId('consent-scopes-note')).toBeVisible();
			expect(queryByText('Get a list of your workflows')).toBeNull();
		});

		it('should preselect all scopes on a first-time consent', async () => {
			const { getByTestId } = renderComponent();
			await waitAllPromises();

			expect(getByTestId('scopes-count')).toHaveTextContent('3 of 3 scopes selected');
		});

		it('should preselect the scopes from the previous grant', async () => {
			const requestedDetails = { ...scopedDetails, previousScopes: ['workflow:read'] };
			consentStore.consentDetails = requestedDetails;
			consentStore.fetchConsentDetails.mockImplementation(async () => {
				consentStore.consentDetails = requestedDetails;
				return requestedDetails;
			});

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			expect(getByTestId('scopes-count')).toHaveTextContent('1 of 3 scopes selected');
		});

		it('should send the selected scopes on approval', async () => {
			consentStore.approveConsent.mockResolvedValue({
				status: 'approved',
				redirectUrl: 'https://legitimate-client.com/callback?code=abc',
			});

			const { getByTestId, getByLabelText } = renderComponent();
			await waitAllPromises();

			await userEvent.click(getByLabelText('I recognize and trust this URL'));
			await userEvent.click(getByTestId('consent-allow-button'));
			await waitAllPromises();

			expect(consentStore.approveConsent).toHaveBeenCalledWith(true, [
				'workflow:read',
				'workflow:write',
				'execution:read',
			]);
		});

		it('should show a tool count pill per scope group when scope tools are provided', async () => {
			const detailsWithTools = {
				...scopedDetails,
				scopeTools: {
					'workflow:read': ['search_workflows', 'get_workflow_details'],
					'workflow:write': ['update_workflow', 'search_workflows'],
					'execution:read': ['get_execution'],
				},
			};
			consentStore.consentDetails = detailsWithTools;
			consentStore.fetchConsentDetails.mockImplementation(async () => {
				consentStore.consentDetails = detailsWithTools;
				return detailsWithTools;
			});

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			await userEvent.click(getByTestId('scopes-tree-toggle'));

			// workflows group tools are deduplicated across its scopes
			expect(getByTestId('scope-group-tools-workflows')).toHaveTextContent('3 tools');
			expect(getByTestId('scope-group-tools-executions')).toHaveTextContent('1 tools');
		});

		it('should not render tool pills when scope tools are absent', async () => {
			const { getByTestId, queryByTestId } = renderComponent();
			await waitAllPromises();

			await userEvent.click(getByTestId('scopes-tree-toggle'));

			expect(queryByTestId('scope-group-tools-workflows')).not.toBeInTheDocument();
		});

		it('should disable Allow when no scopes are selected', async () => {
			const { getByTestId, getByLabelText } = renderComponent();
			await waitAllPromises();

			await userEvent.click(getByLabelText('I recognize and trust this URL'));
			expect(getByTestId('consent-allow-button')).not.toBeDisabled();

			// Custom mode starts with an empty selection
			await userEvent.click(getByTestId('scopes-mode-custom'));

			expect(getByTestId('consent-allow-button')).toBeDisabled();
		});
	});
});
