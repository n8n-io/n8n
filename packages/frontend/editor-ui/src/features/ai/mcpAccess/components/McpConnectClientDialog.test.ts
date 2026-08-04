import { createTestingPinia } from '@pinia/testing';
import { within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import McpConnectClientDialog from '@/features/ai/mcpAccess/components/McpConnectClientDialog.vue';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useRootStore } from '@n8n/stores/useRootStore';

let pinia: ReturnType<typeof createTestingPinia>;
let mcpStore: MockedStore<typeof useMCPStore>;

const renderComponent = createComponentRenderer(McpConnectClientDialog, {
	global: {
		stubs: {
			McpAccessTokenTab: {
				template: '<div data-test-id="token-tab-stub" />',
			},
		},
	},
});

// The dialog teleports to document.body.
const body = () => within(document.body);

describe('McpConnectClientDialog', () => {
	beforeEach(() => {
		pinia = createTestingPinia();
		const rootStore = mockedStore(useRootStore);
		rootStore.urlBaseEditor = 'https://acme.app.n8n.cloud/';
		mcpStore = mockedStore(useMCPStore);
		mcpStore.connectPopoverOpen = true;
	});

	it('should default to Claude.ai and show the web setup steps', async () => {
		renderComponent({ pinia });

		// The dialog root is renderless; wait for its content instead.
		await waitFor(() => {
			expect(body().getByTestId('mcp-connect-client-picker-trigger')).toBeInTheDocument();
		});
		expect(body().getByTestId('mcp-connect-client-picker-trigger')).toHaveTextContent('Claude.ai');
		// Web client: one-click connector + mandatory server URL, no CLI/auth steps.
		expect(body().getByTestId('mcp-connect-one-click')).toHaveAttribute(
			'href',
			'https://claude.ai/directory/connectors/n8n',
		);
		expect(body().getByText('Server URL')).toBeInTheDocument();
		expect(body().queryByText('Or configure manually')).not.toBeInTheDocument();
		expect(body().queryByText('Authenticate')).not.toBeInTheDocument();
	});

	it('should switch to IDE setup steps when picking Cursor', async () => {
		renderComponent({ pinia });

		await waitFor(() => {
			expect(body().getByTestId('mcp-connect-client-picker-trigger')).toBeInTheDocument();
		});
		await userEvent.click(body().getByTestId('mcp-connect-client-picker-trigger'));
		await waitFor(() => {
			expect(body().getByText('Cursor')).toBeInTheDocument();
		});
		await userEvent.click(body().getByText('Cursor'));

		await waitFor(() => {
			expect(body().getByText('One-click setup')).toBeInTheDocument();
		});
		expect(body().getByText('Server URL')).toBeInTheDocument();
		expect(body().queryByText('Add n8n to Cursor')).not.toBeInTheDocument();
		expect(body().queryByText('Authenticate')).not.toBeInTheDocument();
	});

	it('should show only the server URL (no one-click) for web clients without a connector URL', async () => {
		renderComponent({ pinia });

		await waitFor(() => {
			expect(body().getByTestId('mcp-connect-client-picker-trigger')).toBeInTheDocument();
		});
		await userEvent.click(body().getByTestId('mcp-connect-client-picker-trigger'));
		await waitFor(() => {
			expect(body().getByText('ChatGPT')).toBeInTheDocument();
		});
		await userEvent.click(body().getByText('ChatGPT'));

		// ChatGPT has no one-click connector, so only the mandatory server URL shows.
		await waitFor(() => {
			expect(body().getByText('Server URL')).toBeInTheDocument();
		});
		expect(body().queryByTestId('mcp-connect-one-click')).not.toBeInTheDocument();
	});

	it('should show the OAuth client setup by default and switch to the API key tab', async () => {
		renderComponent({ pinia });

		await waitFor(() => {
			expect(body().getByTestId('mcp-connect-client-picker-trigger')).toBeInTheDocument();
		});
		expect(body().queryByTestId('token-tab-stub')).not.toBeInTheDocument();

		await userEvent.click(body().getByText('API key'));

		expect(body().getByTestId('token-tab-stub')).toBeInTheDocument();
		expect(body().queryByTestId('mcp-connect-client-picker-trigger')).not.toBeInTheDocument();
	});

	it('should close through the store', async () => {
		renderComponent({ pinia });

		await waitFor(() => {
			expect(body().getByTestId('mcp-connect-client-picker-trigger')).toBeInTheDocument();
		});
		await userEvent.keyboard('{Escape}');

		expect(mcpStore.closeConnectPopover).toHaveBeenCalled();
	});
});
