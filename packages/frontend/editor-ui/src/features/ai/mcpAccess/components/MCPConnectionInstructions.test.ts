import { createComponentRenderer } from '@/__tests__/render';
import MCPConnectionInstructions from './MCPConnectionInstructions.vue';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import type { ApiKey, OAuthClientResponseDto } from '@n8n/api-types';
import { MCP_DOCS_PAGE_URL } from '@/features/ai/mcpAccess/mcp.constants';

const renderComponent = createComponentRenderer(MCPConnectionInstructions);

let pinia: ReturnType<typeof createPinia>;

vi.mock(
	'@/features/ai/mcpAccess/components/connectionInstructions/OAuthConnectionInstructions.vue',
	() => ({
		default: {
			name: 'OAuthConnectionInstructions',
			template: '<div data-test-id="oauth-instructions">OAuth Instructions</div>',
			props: ['serverUrl', 'clients', 'clientsLoading'],
		},
	}),
);

vi.mock(
	'@/features/ai/mcpAccess/components/connectionInstructions/AccessTokenConnectionInstructions.vue',
	() => ({
		default: {
			name: 'AccessTokenConnectionInstructions',
			template: '<div data-test-id="token-instructions">Token Instructions</div>',
			props: ['serverUrl', 'apiKey', 'loadingApiKey'],
		},
	}),
);

describe('MCPConnectionInstructions', () => {
	const mockApiKey: ApiKey = {
		id: '123',
		label: 'Test Key',
		apiKey: 'test-api-key',
		createdAt: '2024-01-01',
		updatedAt: '2024-01-01',
		expiresAt: null,
		scopes: [],
	};

	const mockOAuthClients: OAuthClientResponseDto[] = [
		{
			id: '1',
			name: 'Test Client',
			redirectUris: ['http://localhost/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'client_secret_basic',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		},
	];

	const defaultProps = {
		baseUrl: 'http://localhost:5678',
		apiKey: mockApiKey,
		loadingApiKey: false,
		oAuthClients: mockOAuthClients,
		loadingOAuthClients: false,
	};

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it('should render default configuration correctly', () => {
		const { container, getByText, getByTestId } = renderComponent({
			pinia,
			props: defaultProps,
		});

		// Main heading
		expect(getByText('How to connect')).toBeInTheDocument();

		// Both tabs
		const tabs = container.querySelectorAll('.n8n-tabs .tab');
		expect(tabs).toHaveLength(2);
		expect(tabs[0]).toHaveTextContent('oAuth');
		expect(tabs[1]).toHaveTextContent('Access Token');
		// OAuth tab should be active by default
		expect(getByTestId('oauth-instructions')).toBeInTheDocument();
		expect(getByTestId('oauth-instructions')).toBeVisible();

		// Documentation link
		const docsText = getByTestId('mcp-connection-instructions-docs-text');
		expect(docsText).toBeInTheDocument();
		const docsLink = docsText.querySelector('a');
		expect(docsLink).toBeInTheDocument();
		expect(docsLink).toHaveAttribute('href', MCP_DOCS_PAGE_URL);
		expect(docsLink).toHaveAttribute('target', '_blank');
	});

	it('should switch to API Key tab when clicked', async () => {
		const { container, getByTestId, queryByTestId } = renderComponent({
			pinia,
			props: defaultProps,
		});

		// Find and click the API Key tab
		const tabs = container.querySelectorAll('.n8n-tabs .tab');
		const oauthTab = tabs[0];
		const apiKeyTab = tabs[1];
		expect(apiKeyTab).toHaveTextContent('Access Token');

		await userEvent.click(apiKeyTab);

		// OAuth instructions should be hidden
		expect(getByTestId('token-instructions')).toBeInTheDocument();
		expect(queryByTestId('oauth-instructions')).not.toBeVisible();
		expect(oauthTab).not.toHaveClass('activeTab');

		// Token instructions should be visible
		expect(getByTestId('token-instructions')).toBeInTheDocument();
		expect(getByTestId('token-instructions')).toBeVisible();
		expect(apiKeyTab).toHaveClass('activeTab');
	});

	it('should switch back to OAuth tab when clicked', async () => {
		const { container, getByTestId, queryByTestId } = renderComponent({
			pinia,
			props: defaultProps,
		});

		// First switch to API Key tab
		const tabs = container.querySelectorAll('.n8n-tabs .tab');
		const oauthTab = tabs[0];
		const apiKeyTab = tabs[1];
		await userEvent.click(apiKeyTab);

		// Verify API Key tab is active
		expect(queryByTestId('oauth-instructions')).not.toBeVisible();
		expect(oauthTab).not.toHaveClass('activeTab');
		expect(getByTestId('token-instructions')).toBeVisible();
		expect(apiKeyTab).toHaveClass('activeTab');

		// Switch back to OAuth tab
		await userEvent.click(oauthTab);

		// OAuth instructions should be visible again
		expect(getByTestId('oauth-instructions')).toBeVisible();
		expect(oauthTab).toHaveClass('activeTab');
		expect(queryByTestId('token-instructions')).not.toBeVisible();
		expect(apiKeyTab).not.toHaveClass('activeTab');
	});
});
