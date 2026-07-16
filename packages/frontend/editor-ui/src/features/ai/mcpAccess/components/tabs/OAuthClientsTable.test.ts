import { within } from '@testing-library/vue';
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

vi.mock('@/features/ai/mcpAccess/mcp.store', () => ({
	useMCPStore: () => ({
		openConnectPopover: vi.fn(),
	}),
}));

const createComponent = createComponentRenderer(OAuthClientsTable, {
	pinia: createTestingPinia(),
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
				scopes: ['workflow:read', 'workflow:write'],
			});

			const { getByTestId, queryByTestId } = createComponent({
				props: {
					clients: [client],
					loading: false,
				},
			});

			expect(queryByTestId('mcp-client-details-modal')).not.toBeInTheDocument();

			await userEvent.click(getByTestId('mcp-client-name'));

			const modal = document.querySelector('[data-test-id="mcp-client-details-modal"]');
			expect(modal).not.toBeNull();
			expect(
				within(modal as HTMLElement).getByTestId('mcp-client-details-access'),
			).toHaveTextContent('List workflows');
			expect(
				within(modal as HTMLElement).getByTestId('mcp-client-details-access'),
			).toHaveTextContent('Create and update workflows');
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
