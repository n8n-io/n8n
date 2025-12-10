import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useRootStore } from '@n8n/stores/useRootStore';
import McpConnectPopover from './McpConnectPopover.vue';

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: vi.fn(),
	}),
}));

const mockResetCurrentUserMCPKey = vi.fn();

vi.mock('@/features/ai/mcpAccess/mcp.store', () => ({
	useMCPStore: () => ({
		resetCurrentUserMCPKey: mockResetCurrentUserMCPKey,
	}),
}));

vi.mock('./MCPOAuthPopoverTab.vue', () => ({
	default: {
		name: 'MCPOAuthPopoverTab',
		template: '<div data-test-id="mcp-oauth-popover-tab">OAuth Tab Content</div>',
		props: ['serverUrl'],
	},
}));

vi.mock('./MCPAccessTokenPopoverTab.vue', () => ({
	default: {
		name: 'MCPAccessTokenPopoverTab',
		template: '<div data-test-id="mcp-access-token-popover-tab">Access Token Tab Content</div>',
		props: ['serverUrl'],
	},
}));

let rootStore: ReturnType<typeof mockedStore<typeof useRootStore>>;
let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('McpConnectPopover', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(McpConnectPopover, {
			pinia: createTestingPinia(),
		});

		rootStore = mockedStore(useRootStore);
		rootStore.urlBaseEditor = 'http://localhost:5678/';
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Initial rendering', () => {
		it('should render the Connect button', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('mcp-connect-popover-trigger-button')).toBeVisible();
			expect(getByTestId('mcp-connect-popover-trigger-button')).toHaveTextContent('Connect');
		});

		it('should not show popover content initially', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('mcp-connect-popover-content')).not.toBeInTheDocument();
		});
	});

	describe('Popover interaction', () => {
		it('should show popover when clicking the Connect button', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderComponent();

			await user.click(getByTestId('mcp-connect-popover-trigger-button'));

			await waitFor(() => {
				expect(getByTestId('mcp-connect-popover-content')).toBeVisible();
				expect(getByTestId('mcp-connect-popover-tabs')).toBeVisible();
			});
		});

		it('should show OAuth tab content by default', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = renderComponent();

			await user.click(getByTestId('mcp-connect-popover-trigger-button'));

			await waitFor(() => {
				expect(getByTestId('mcp-oauth-popover-tab')).toBeVisible();
				expect(queryByTestId('mcp-access-token-popover-tab')).not.toBeInTheDocument();
			});
		});

		it('should reset current user MCP key when popover closes', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderComponent();

			await user.click(getByTestId('mcp-connect-popover-trigger-button'));

			await waitFor(() => {
				expect(getByTestId('mcp-connect-popover-content')).toBeVisible();
			});

			await user.keyboard('{Escape}');

			await waitFor(() => {
				expect(mockResetCurrentUserMCPKey).toHaveBeenCalled();
			});
		});
	});

	describe('Tab switching', () => {
		it('should switch to Access Token tab when clicking the Access Token option', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = renderComponent();

			await user.click(getByTestId('mcp-connect-popover-trigger-button'));

			await waitFor(() => {
				expect(getByTestId('mcp-connect-popover-tabs')).toBeVisible();
			});

			await user.click(getByTestId('radio-button-accessToken'));

			await waitFor(() => {
				expect(getByTestId('mcp-access-token-popover-tab')).toBeVisible();
				expect(queryByTestId('mcp-oauth-popover-tab')).not.toBeInTheDocument();
			});
		});

		it('should switch back to OAuth tab when clicking the OAuth option', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = renderComponent();

			await user.click(getByTestId('mcp-connect-popover-trigger-button'));

			await waitFor(() => {
				expect(getByTestId('mcp-connect-popover-tabs')).toBeVisible();
			});

			// Switch to Access Token tab first
			await user.click(getByTestId('radio-button-accessToken'));

			await waitFor(() => {
				expect(getByTestId('mcp-access-token-popover-tab')).toBeVisible();
			});

			// Switch back to OAuth tab
			await user.click(getByTestId('radio-button-oauth'));

			await waitFor(() => {
				expect(getByTestId('mcp-oauth-popover-tab')).toBeVisible();
				expect(queryByTestId('mcp-access-token-popover-tab')).not.toBeInTheDocument();
			});
		});
	});
});
