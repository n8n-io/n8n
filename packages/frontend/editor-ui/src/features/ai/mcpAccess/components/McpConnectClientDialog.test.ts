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
			MCPAccessTokenPopoverTab: {
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

	it('should default to Claude Code and show the CLI setup steps', async () => {
		renderComponent({ pinia });

		// The dialog root is renderless; wait for its content instead.
		await waitFor(() => {
			expect(body().getByTestId('mcp-connect-client-picker-trigger')).toBeInTheDocument();
		});
		expect(body().getByTestId('mcp-connect-client-picker-trigger')).toHaveTextContent(
			'Claude Code',
		);
		expect(body().getByText('Add n8n to Claude Code')).toBeInTheDocument();
		expect(body().getByText('Or configure manually')).toBeInTheDocument();
		expect(body().getByText('Authenticate')).toBeInTheDocument();
		expect(
			body().getByDisplayValue(
				'claude mcp add --transport http n8n https://acme.app.n8n.cloud/mcp-server/http',
			),
		).toBeInTheDocument();
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

	it('should show the one-click connector, server URL, and no token setup for web clients', async () => {
		renderComponent({ pinia });

		await waitFor(() => {
			expect(body().getByTestId('mcp-connect-client-picker-trigger')).toBeInTheDocument();
		});
		await userEvent.click(body().getByTestId('mcp-connect-client-picker-trigger'));
		await waitFor(() => {
			expect(body().getByText('ChatGPT')).toBeInTheDocument();
		});
		await userEvent.click(body().getByText('ChatGPT'));

		await waitFor(() => {
			expect(body().getByTestId('mcp-connect-one-click')).toBeInTheDocument();
		});
		expect(body().getByTestId('mcp-connect-one-click')).toHaveAttribute(
			'href',
			'https://chatgpt.com/#settings/connectors',
		);
		// Server URL is mandatory for web clients.
		expect(body().getByText('Server URL')).toBeInTheDocument();
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
