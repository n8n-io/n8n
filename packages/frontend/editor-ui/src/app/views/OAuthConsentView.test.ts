import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { useConsentStore } from '@/app/stores/consent.store';
import OAuthConsentView from '@/app/views/OAuthConsentView.vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';

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

	it('should disable the allow button until the redirect URL is acknowledged', async () => {
		const { getByTestId, getByLabelText } = renderComponent();
		await waitAllPromises();

		const allowButton = getByTestId('consent-allow-button');
		expect(allowButton).toBeDisabled();

		await userEvent.click(getByLabelText('I recognize and trust this URL'));

		expect(allowButton).not.toBeDisabled();
	});

	it('should show the redirect URL inside the redirect callout', async () => {
		const { getByTestId } = renderComponent();
		await waitAllPromises();

		expect(getByTestId('consent-redirect-warning')).toBeVisible();
		expect(getByTestId('consent-redirect-uri')).toHaveTextContent(
			'https://legitimate-client.com/callback',
		);
	});

	it('should render the trust checkbox outside the redirect callout', async () => {
		const { getByTestId } = renderComponent();
		await waitAllPromises();

		expect(getByTestId('consent-redirect-warning')).not.toContainElement(
			getByTestId('consent-redirect-confirm'),
		);
	});

	describe('client icon', () => {
		it('should render the generic MCP icon for a client whose name matches a known brand', async () => {
			const details = { clientName: 'Claude Code', clientId: 'c1', scopes: [] };
			consentStore.consentDetails = details;
			consentStore.fetchConsentDetails.mockImplementation(async () => {
				consentStore.consentDetails = details;
				return details;
			});

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			expect(getByTestId('consent-client-icon')).toHaveAttribute('data-icon', 'mcp');
		});

		// Deliberately not a first-party client: the icon follows the resource, not the client.
		it('should render the icon supplied by the resource', async () => {
			const details = {
				clientName: 'Test MCP Client',
				clientId: 'c1',
				scopes: [],
				uiHints: { icon: 'square-pen' },
			};
			consentStore.consentDetails = details;
			consentStore.fetchConsentDetails.mockImplementation(async () => {
				consentStore.consentDetails = details;
				return details;
			});

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			expect(getByTestId('consent-client-icon')).toHaveAttribute('data-icon', 'square-pen');
		});

		it('should fall back to the generic MCP icon when the resource hint is blank', async () => {
			const details = {
				clientName: 'Test MCP Client',
				clientId: 'c1',
				scopes: [],
				uiHints: { icon: '' },
			};
			consentStore.consentDetails = details;
			consentStore.fetchConsentDetails.mockImplementation(async () => {
				consentStore.consentDetails = details;
				return details;
			});

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			expect(getByTestId('consent-client-icon')).toHaveAttribute('data-icon', 'mcp');
		});
	});

	describe('first-party consent', () => {
		const firstPartyDetails = {
			clientName: 'My Form',
			clientId: 'c1',
			redirectUri: 'https://instance.example/form/abc',
			resourceName: 'Feedback workflow',
			scopes: [],
			isFirstParty: true,
			uiHints: { icon: 'square-pen', consentType: 'form' },
		};

		beforeEach(() => {
			consentStore.consentDetails = firstPartyDetails;
			consentStore.fetchConsentDetails.mockImplementation(async () => {
				consentStore.consentDetails = firstPartyDetails;
				return firstPartyDetails;
			});
		});

		it('should hide the trust checkbox and enable Allow without acknowledgement', async () => {
			const { getByTestId, queryByTestId } = renderComponent();
			await waitAllPromises();

			expect(queryByTestId('consent-redirect-confirm')).toBeNull();
			expect(getByTestId('consent-allow-button')).not.toBeDisabled();
		});

		it('should not show the redirect URL or the redirect callout', async () => {
			const { queryByTestId } = renderComponent();
			await waitAllPromises();

			expect(queryByTestId('consent-redirect-warning')).toBeNull();
			expect(queryByTestId('consent-redirect-uri')).toBeNull();
		});

		it('should render the first-party heading and resource-driven description', async () => {
			const { getByText } = renderComponent();
			await waitAllPromises();

			expect(getByText('"Feedback workflow" wants to run using your n8n login')).toBeVisible();
			expect(
				getByText(
					'Running this form executes its workflow using your account and any connected credentials. Only continue if you trust the creator of this form.',
				),
			).toBeVisible();
		});
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

		it('should keep a custom scope selection when the trust checkbox is toggled', async () => {
			const { getByTestId, getByLabelText } = renderComponent();
			await waitAllPromises();

			await userEvent.click(getByTestId('scopes-mode-custom'));
			await userEvent.click(getByTestId('scope-group-executions'));
			expect(getByTestId('scopes-count')).toHaveTextContent('1 of 3 scopes selected');

			await userEvent.click(getByLabelText('I recognize and trust this URL'));

			expect(getByTestId('scopes-count')).toHaveTextContent('1 of 3 scopes selected');
			expect(getByTestId('scopes-mode-custom')).toBeChecked();
		});

		it('should show a tool count pill per scope group when scope tools are provided', async () => {
			const detailsWithTools = {
				...scopedDetails,
				scopeTools: {
					'workflow:read': ['search_workflows', 'get_workflow_details'],
					'workflow:write': ['update_workflow', 'search_workflows'],
					'execution:read': ['get_workflow_execution'],
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
			// a single tool uses the singular form (not "1 tools")
			expect(getByTestId('scope-group-tools-executions')).toHaveTextContent(/1 tool\b/);
		});

		it('should not render tool pills when scope tools are absent', async () => {
			const { getByTestId, queryByTestId } = renderComponent();
			await waitAllPromises();

			await userEvent.click(getByTestId('scopes-tree-toggle'));

			expect(queryByTestId('scope-group-tools-workflows')).not.toBeInTheDocument();
		});

		it('should open the tools popover on keyboard focus and link it to the pill', async () => {
			const detailsWithTools = {
				...scopedDetails,
				scopeTools: {
					'workflow:read': ['search_workflows', 'get_workflow_details'],
					'workflow:write': ['update_workflow', 'search_workflows'],
					'execution:read': ['get_workflow_execution'],
				},
			};
			consentStore.consentDetails = detailsWithTools;
			consentStore.fetchConsentDetails.mockImplementation(async () => {
				consentStore.consentDetails = detailsWithTools;
				return detailsWithTools;
			});

			const { getByTestId, queryByTestId } = renderComponent();
			await waitAllPromises();

			await userEvent.click(getByTestId('scopes-tree-toggle'));

			const pill = getByTestId('scope-group-tools-workflows');
			expect(pill).toHaveAttribute('tabindex', '0');

			pill.focus();
			await waitAllPromises();

			const popover = getByTestId('scope-group-tools-popover-workflows');
			expect(popover).toBeInTheDocument();

			// The trigger is described by a hidden role="tooltip" node holding the
			// flattened popover text — this is what a screen reader announces.
			const describedBy = pill.getAttribute('aria-describedby');
			expect(describedBy).toBeTruthy();
			const description = document.getElementById(describedBy as string);
			expect(description).toHaveAttribute('role', 'tooltip');
			expect(description).toHaveTextContent('3 of 3 tools enabled');

			pill.blur();
			await waitAllPromises();

			expect(queryByTestId('scope-group-tools-popover-workflows')).not.toBeInTheDocument();
		});

		it('should expose per-tool enabled state as text in the tools popover', async () => {
			const detailsWithTools = {
				...scopedDetails,
				scopeTools: {
					'workflow:read': ['search_workflows', 'get_workflow_details'],
					'workflow:write': ['update_workflow', 'search_workflows'],
					'execution:read': ['get_workflow_execution'],
				},
			};
			consentStore.consentDetails = detailsWithTools;
			consentStore.fetchConsentDetails.mockImplementation(async () => {
				consentStore.consentDetails = detailsWithTools;
				return detailsWithTools;
			});

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			await userEvent.click(getByTestId('scopes-mode-custom'));
			await userEvent.click(getByTestId('scope-group-executions'));

			const workflowsPill = getByTestId('scope-group-tools-workflows');
			workflowsPill.focus();
			await waitAllPromises();

			const workflowsPopover = getByTestId('scope-group-tools-popover-workflows');
			expect(workflowsPopover).toHaveTextContent('0 of 3 tools enabled');
			expect(within(workflowsPopover).getAllByText('not enabled')).toHaveLength(3);

			workflowsPill.blur();
			await waitAllPromises();

			const executionsPill = getByTestId('scope-group-tools-executions');
			executionsPill.focus();
			await waitAllPromises();

			const executionsPopover = getByTestId('scope-group-tools-popover-executions');
			expect(executionsPopover).toHaveTextContent('1 of 1 tools enabled');
			expect(within(executionsPopover).getAllByText('enabled')).toHaveLength(1);
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
