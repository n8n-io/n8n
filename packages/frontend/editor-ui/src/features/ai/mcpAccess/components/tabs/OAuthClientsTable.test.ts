import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import OAuthClientsTable from '@/features/ai/mcpAccess/components/tabs/OAuthClientsTable.vue';
import type { OAuthClientResponseDto } from '@n8n/api-types';

vi.mock('@/app/components/TimeAgo.vue', () => ({
	default: {
		name: 'TimeAgo',
		props: ['date'],
		template: '<span>{{ date }}</span>',
	},
}));

vi.mock('@/features/ai/mcpAccess/mcp.store', () => ({
	useMCPStore: () => ({
		openConnectPopover: vi.fn(),
	}),
}));

const createComponent = createComponentRenderer(OAuthClientsTable, {
	pinia: createTestingPinia(),
});

const createClient = (overrides: Partial<OAuthClientResponseDto> = {}): OAuthClientResponseDto => ({
	id: 'client-1',
	name: 'Test Client',
	createdAt: '2025-09-09T14:14:04.155Z',
	updatedAt: '2025-09-09T14:14:04.155Z',
	redirectUris: [],
	grantTypes: ['authorization_code'],
	tokenEndpointAuthMethod: 'client_secret_basic',
	...overrides,
});

describe('OAuthClientsTable', () => {
	afterEach(() => {
		vi.clearAllMocks();
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
		it('should render client name and creation date', () => {
			const client = createClient({
				name: 'My OAuth Client',
				createdAt: '2025-10-15T10:30:00.000Z',
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

		it('should render multiple clients in the table', () => {
			const clients = [
				createClient({ id: 'client-1', name: 'First Client' }),
				createClient({ id: 'client-2', name: 'Second Client' }),
				createClient({ id: 'client-3', name: 'Third Client' }),
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

	describe('Actions menu', () => {
		it('should emit revokeClient event when revoke action is clicked', async () => {
			const client = createClient({ name: 'Client to Revoke' });

			const { getByTestId, emitted } = createComponent({
				props: {
					clients: [client],
					loading: false,
				},
			});

			const actionToggle = getByTestId('mcp-oauth-client-action-toggle');
			const toggleButton = within(actionToggle).getByRole('button');
			await userEvent.click(toggleButton);

			const menuItem = document.querySelector('[data-test-id="action-revokeClient"]');
			expect(menuItem).not.toBeNull();
			await userEvent.click(menuItem!);

			expect(emitted('revokeClient')).toBeTruthy();
			expect(emitted('revokeClient')[0]).toEqual([client]);
		});
	});
});
