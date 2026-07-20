import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import OAuthClientsTable from '@/features/ai/mcpAccess/components/tabs/OAuthClientsTable.vue';
import { createOAuthClient } from '@/features/ai/mcpAccess/mcp.test.utils';

vi.mock('@/app/components/TimeAgo.vue', () => ({
	default: {
		name: 'TimeAgo',
		props: ['date'],
		template: '<span>{{ date }}</span>',
	},
}));

const { mockMcpStore, mockHasScope } = vi.hoisted(() => ({
	mockMcpStore: {
		openConnectPopover: vi.fn(),
		oauthClientsOwnership: 'mine' as 'mine' | 'all',
		oauthClientTotals: { mine: 0 } as { mine: number; all?: number },
		oauthClientsPage: 0,
		oauthClientsPageSize: 10,
		oauthClientsCount: 0,
		oauthClientOwners: [] as Array<{
			id: string;
			firstName: string | null;
			lastName: string | null;
			email: string;
		}>,
	},
	mockHasScope: vi.fn().mockReturnValue(false),
}));

vi.mock('@/features/ai/mcpAccess/mcp.store', () => ({
	useMCPStore: () => mockMcpStore,
}));

vi.mock('@n8n/stores/rbac.store', () => ({
	useRBACStore: () => ({
		hasScope: mockHasScope,
	}),
}));

const createComponent = createComponentRenderer(OAuthClientsTable, {
	pinia: createTestingPinia(),
});

describe('OAuthClientsTable', () => {
	afterEach(() => {
		vi.clearAllMocks();
		mockHasScope.mockReturnValue(false);
		mockMcpStore.oauthClientsOwnership = 'mine';
		mockMcpStore.oauthClientTotals = { mine: 0 };
		mockMcpStore.oauthClientsPage = 0;
		mockMcpStore.oauthClientsPageSize = 10;
		mockMcpStore.oauthClientsCount = 0;
		mockMcpStore.oauthClientOwners = [];
	});

	describe('Loading state', () => {
		it('should render loading skeleton when loading is true', () => {
			const { container, queryByTestId } = createComponent({
				props: {
					clients: [],
					loading: true,
				},
			});

			expect(container.querySelector('.n8n-loading')).toBeInTheDocument();
			expect(queryByTestId('oauth-clients-data-table')).not.toBeInTheDocument();
		});
	});

	describe('Empty state', () => {
		it('should render empty state when clients array is empty', () => {
			const { getByTestId } = createComponent({
				props: {
					clients: [],
					loading: false,
				},
			});

			expect(getByTestId('mcp-workflow-table-empty-state')).toBeVisible();
			expect(getByTestId('mcp-workflow-table-empty-state-description')).toBeVisible();
		});
	});

	describe('Client rendering', () => {
		it('should render client name and connection date', () => {
			const client = createOAuthClient({
				name: 'My OAuth Client',
				grantedAt: new Date('2025-10-15T10:30:00.000Z').getTime(),
			});

			const { getByTestId } = createComponent({
				props: {
					clients: [client],
					loading: false,
				},
			});

			expect(getByTestId('mcp-client-name')).toHaveTextContent('My OAuth Client');
			expect(getByTestId('mcp-client-created-at')).toBeVisible();
		});

		it('should render the client type for recognized clients', () => {
			const client = createOAuthClient({ name: 'Claude Code' });

			const { getByTestId } = createComponent({
				props: {
					clients: [client],
					loading: false,
				},
			});

			expect(getByTestId('mcp-client-type')).toHaveTextContent('CLI');
		});

		it('should summarize granted scopes in the access column', () => {
			const client = createOAuthClient({
				scopes: ['workflow:read', 'execution:read', 'tag:read'],
			});

			const { getByTestId } = createComponent({
				props: {
					clients: [client],
					loading: false,
				},
			});

			expect(getByTestId('mcp-client-access')).toHaveTextContent(
				'List workflows, Get execution details +1',
			);
		});

		it('should render multiple clients in the table', () => {
			const clients = [
				createOAuthClient({ id: 'client-1', name: 'First Client' }),
				createOAuthClient({ id: 'client-2', name: 'Second Client' }),
				createOAuthClient({ id: 'client-3', name: 'Third Client' }),
			];

			const { getAllByTestId } = createComponent({
				props: {
					clients,
					loading: false,
				},
			});

			const clientNames = getAllByTestId('mcp-client-name');
			expect(clientNames).toHaveLength(3);
			expect(clientNames[0]).toHaveTextContent('First Client');
			expect(clientNames[1]).toHaveTextContent('Second Client');
			expect(clientNames[2]).toHaveTextContent('Third Client');
		});
	});

	describe('Mine/All tabs', () => {
		it('should not render tabs for users without mcp:manage', () => {
			const { queryByTestId } = createComponent({
				props: {
					clients: [createOAuthClient()],
					loading: false,
				},
			});

			expect(queryByTestId('mcp-clients-tabs')).not.toBeInTheDocument();
		});

		it('should render tabs with unfiltered totals for managers', () => {
			mockHasScope.mockReturnValue(true);
			mockMcpStore.oauthClientTotals = { mine: 2, all: 5 };

			const { getByTestId } = createComponent({
				props: {
					clients: [createOAuthClient()],
					loading: false,
				},
			});

			const tabs = getByTestId('mcp-clients-tabs');
			expect(tabs).toHaveTextContent('Mine');
			expect(tabs).toHaveTextContent('2');
			expect(tabs).toHaveTextContent('All');
			expect(tabs).toHaveTextContent('5');
		});

		it('should emit update:ownership when switching tabs', async () => {
			mockHasScope.mockReturnValue(true);
			mockMcpStore.oauthClientTotals = { mine: 1, all: 2 };

			const { getByText, emitted } = createComponent({
				props: {
					clients: [createOAuthClient()],
					loading: false,
				},
			});

			await userEvent.click(getByText('All'));

			expect(emitted('update:ownership')).toEqual([['all']]);
		});
	});

	describe('Search and filters', () => {
		beforeEach(() => {
			// disable the search debounce so assertions can run synchronously
			sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', '0');
		});

		afterEach(() => {
			sessionStorage.removeItem('N8N_DEBOUNCE_MULTIPLIER');
		});

		it('should emit the debounced search term so the parent can filter server-side', async () => {
			mockMcpStore.oauthClientsCount = 2;

			const { getByTestId, emitted } = createComponent({
				props: {
					clients: [
						createOAuthClient({ id: 'client-1', name: 'Claude Code' }),
						createOAuthClient({ id: 'client-2', name: 'Cursor' }),
					],
					loading: false,
				},
			});

			await userEvent.type(getByTestId('mcp-clients-search'), 'cursor');

			await waitFor(() => {
				const emissions = emitted('update:filters') as Array<[{ search: string }]>;
				expect(emissions).toBeTruthy();
				expect(emissions[emissions.length - 1][0].search).toBe('cursor');
			});
		});

		it('should show a no-results message when the filtered set is empty', async () => {
			// the server matched nothing for the active search
			mockMcpStore.oauthClientsCount = 0;

			const { getByTestId, queryByTestId } = createComponent({
				props: {
					clients: [],
					loading: false,
				},
			});

			await userEvent.type(getByTestId('mcp-clients-search'), 'nothing matches this');

			await waitFor(() => {
				expect(getByTestId('mcp-clients-no-results')).toBeVisible();
			});
			// the connect CTA is reserved for a genuinely empty client list
			expect(queryByTestId('mcp-oauth-create-client-button')).not.toBeInTheDocument();
		});
	});

	describe('Connected by column', () => {
		it('should not render the owner column in the mine view', () => {
			const { queryByTestId } = createComponent({
				props: {
					clients: [createOAuthClient()],
					loading: false,
				},
			});

			expect(queryByTestId('mcp-client-owner-cell')).not.toBeInTheDocument();
		});

		it('should render the owner in the all view', () => {
			mockHasScope.mockReturnValue(true);
			mockMcpStore.oauthClientsOwnership = 'all';

			const { getByTestId } = createComponent({
				props: {
					clients: [
						createOAuthClient({
							owner: { id: 'user-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@n8n.io' },
						}),
					],
					loading: false,
				},
			});

			expect(getByTestId('mcp-client-owner-cell')).toHaveTextContent('Jane Doe');
		});
	});

	describe('Actions', () => {
		it('should emit revokeClient event when the revoke button is clicked', async () => {
			const client = createOAuthClient({ name: 'Client to Revoke' });

			const { getByTestId, emitted } = createComponent({
				props: {
					clients: [client],
					loading: false,
				},
			});

			await userEvent.click(getByTestId('mcp-oauth-client-revoke-button'));

			expect(emitted('revokeClient')).toBeTruthy();
			expect(emitted('revokeClient')[0]).toEqual([client]);
		});
	});

	describe('Details modal', () => {
		it('should open the details modal when a row is clicked', async () => {
			const client = createOAuthClient({
				name: 'Cursor',
				scopes: ['workflow:read', 'workflow:write', 'execution:read'],
			});

			const { getByTestId, queryByTestId } = createComponent({
				props: {
					clients: [client],
					loading: false,
					scopeTools: {
						'workflow:read': ['search_workflows', 'search_nodes'],
						'workflow:write': ['update_workflow', 'search_nodes'],
						'execution:read': ['get_execution'],
					},
				},
			});

			expect(queryByTestId('mcp-client-details-modal')).not.toBeInTheDocument();

			await userEvent.click(getByTestId('mcp-client-name'));

			const modal = document.querySelector('[data-test-id="mcp-client-details-modal"]');
			expect(modal).not.toBeNull();

			// granted scope tokens are grouped per resource, with read/write tags
			const workflowGroup = within(modal as HTMLElement).getByTestId(
				'mcp-client-details-group-workflow',
			);
			expect(workflowGroup).toHaveTextContent('Workflow');
			expect(workflowGroup).toHaveTextContent('workflow:read');
			expect(workflowGroup).toHaveTextContent('workflow:write');
			expect(workflowGroup).toHaveTextContent('Read');
			expect(workflowGroup).toHaveTextContent('Write');

			const executionGroup = within(modal as HTMLElement).getByTestId(
				'mcp-client-details-group-execution',
			);
			expect(executionGroup).toHaveTextContent('Execution');
			expect(executionGroup).toHaveTextContent('execution:read');
		});

		it('should emit revokeClient from the details modal revoke button', async () => {
			const client = createOAuthClient({ name: 'Client to Revoke' });

			const { getByTestId, emitted } = createComponent({
				props: {
					clients: [client],
					loading: false,
				},
			});

			await userEvent.click(getByTestId('mcp-client-name'));

			const revokeButton = document.querySelector(
				'[data-test-id="mcp-client-details-revoke"]',
			) as HTMLElement;
			expect(revokeButton).not.toBeNull();
			await userEvent.click(revokeButton);

			expect(emitted('revokeClient')).toBeTruthy();
			expect(emitted('revokeClient')[0]).toEqual([client]);
		});
	});
});
