import { createComponentRenderer } from '@/__tests__/render';
import OAuthClientsTable from './OAuthClientsTable.vue';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import type { OAuthClientResponseDto } from '@n8n/api-types';

const renderComponent = createComponentRenderer(OAuthClientsTable);

let pinia: ReturnType<typeof createPinia>;

const mockOAuthClient = (
	id: string,
	overrides?: Partial<OAuthClientResponseDto>,
): OAuthClientResponseDto => ({
	id,
	name: `OAuth Client ${id}`,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-02T00:00:00.000Z',
	redirectUris: [],
	grantTypes: ['authorization_code'],
	tokenEndpointAuthMethod: 'client_secret_post',
	...overrides,
});

describe('OAuthClientsTable', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		vi.clearAllMocks();
	});

	describe('Component rendering', () => {
		it('should render loading state correctly', () => {
			const { container, getByTestId } = renderComponent({
				pinia,
				props: {
					clients: [],
					loading: true,
				},
			});

			const loadingElements = container.querySelectorAll('.n8n-loading');
			expect(loadingElements.length).toBeGreaterThan(0);

			expect(() => getByTestId('oauth-clients-data-table')).toThrow();
			expect(() => getByTestId('empty-workflow-list-box')).toThrow();
		});

		it('should render empty state when no clients exist', () => {
			const { getByTestId, getByText } = renderComponent({
				pinia,
				props: {
					clients: [],
					loading: false,
				},
			});

			expect(getByTestId('empty-oauth-clients-list-box')).toBeInTheDocument();
			expect(getByText('Connected oAuth clients (0)')).toBeInTheDocument();
		});

		it('should render clients table with correct data', () => {
			const clients = [mockOAuthClient('1'), mockOAuthClient('2', { name: 'Second Client' })];

			const { getByTestId, getByText } = renderComponent({
				pinia,
				props: {
					clients,
					loading: false,
				},
			});

			const table = getByTestId('oauth-clients-data-table');
			expect(table).toBeInTheDocument();

			expect(getByText(`Connected oAuth clients (${clients.length})`)).toBeInTheDocument();

			clients.forEach((client) => {
				expect(getByText(client.name)).toBeInTheDocument();
			});
		});

		it('should render refresh button', () => {
			const { getByTestId } = renderComponent({
				pinia,
				props: {
					clients: [mockOAuthClient('1')],
					loading: false,
				},
			});

			const refreshButton = getByTestId('mcp-oauth-clients-refresh-button');
			expect(refreshButton).toBeInTheDocument();
		});
	});

	describe('Table data display', () => {
		it('should display client name correctly', () => {
			const client = mockOAuthClient('1', { name: 'Test OAuth Client' });
			const { getByText } = renderComponent({
				pinia,
				props: {
					clients: [client],
					loading: false,
				},
			});

			expect(getByText(client.name)).toBeInTheDocument();
		});

		it('should display created at date', () => {
			const client = mockOAuthClient('1', {
				createdAt: '2024-01-01T12:00:00.000Z',
			});
			const { getByTestId } = renderComponent({
				pinia,
				props: {
					clients: [client],
					loading: false,
				},
			});

			const createdAtElement = getByTestId('mcp-client-created-at');
			expect(createdAtElement).toBeInTheDocument();
		});

		it('should display action toggle for each client', () => {
			const clients = [mockOAuthClient('1'), mockOAuthClient('2')];
			const { getAllByTestId } = renderComponent({
				pinia,
				props: {
					clients,
					loading: false,
				},
			});

			const actionToggles = getAllByTestId('mcp-oauth-client-action-toggle');
			expect(actionToggles).toHaveLength(clients.length);
		});
	});

	describe('User interactions and events', () => {
		it('should emit refresh event when refresh button is clicked', async () => {
			const { getByTestId, emitted } = renderComponent({
				pinia,
				props: {
					clients: [mockOAuthClient('1')],
					loading: false,
				},
			});

			const refreshButton = getByTestId('mcp-oauth-clients-refresh-button');
			await userEvent.click(refreshButton);

			expect(emitted()).toHaveProperty('refresh');
			expect(emitted().refresh).toHaveLength(1);
		});

		it('should emit revokeClient event when action is selected', async () => {
			const client = mockOAuthClient('1');
			const { getByTestId, emitted } = renderComponent({
				pinia,
				props: {
					clients: [client],
					loading: false,
				},
			});

			const actionToggle = getByTestId('mcp-oauth-client-action-toggle');
			expect(actionToggle).toBeInTheDocument();

			const actionButton = actionToggle?.querySelector('[role=button]');
			if (!actionButton) {
				throw new Error('Action button not found');
			}

			await userEvent.click(actionButton);

			const actionToggleId = actionButton.getAttribute('aria-controls');
			const actionDropdown = document.getElementById(actionToggleId as string) as HTMLElement;
			expect(actionDropdown).toBeInTheDocument();

			const revokeAction = actionDropdown.querySelector('[data-test-id="action-revokeClient"]');
			expect(revokeAction).toBeInTheDocument();
			await userEvent.click(revokeAction!);

			expect(emitted()).toHaveProperty('revokeClient');
			expect(emitted().revokeClient).toHaveLength(1);
			expect(emitted().revokeClient[0]).toEqual([client]);
		});

		it('should not emit events when loading', () => {
			const { queryByTestId, emitted } = renderComponent({
				pinia,
				props: {
					clients: [mockOAuthClient('1')],
					loading: true,
				},
			});

			const actionToggle = queryByTestId('mcp-oauth-client-action-toggle');
			expect(actionToggle).not.toBeInTheDocument();

			expect(emitted()).not.toHaveProperty('revokeClient');
			expect(emitted()).not.toHaveProperty('refresh');
		});
	});

	describe('Edge cases', () => {
		it('should handle empty client name gracefully', () => {
			const client = mockOAuthClient('1', { name: '' });
			const { container } = renderComponent({
				pinia,
				props: {
					clients: [client],
					loading: false,
				},
			});

			const table = container.querySelector('[data-test-id="oauth-clients-data-table"]');
			expect(table).toBeInTheDocument();
		});

		it('should handle large number of clients', () => {
			const clients = Array.from({ length: 50 }, (_, i) =>
				mockOAuthClient(`${i + 1}`, { name: `Client ${i + 1}` }),
			);

			const { getByText, getByTestId } = renderComponent({
				pinia,
				props: {
					clients,
					loading: false,
				},
			});

			expect(getByText('Connected oAuth clients (50)')).toBeInTheDocument();
			expect(getByTestId('oauth-clients-data-table')).toBeInTheDocument();
		});
	});
});
