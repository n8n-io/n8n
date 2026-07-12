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
		expect(body().getByText('Install')).toBeInTheDocument();
		expect(body().getByText('Configure')).toBeInTheDocument();
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
		expect(body().queryByText('Install')).not.toBeInTheDocument();
	});

	it('should show the one-click connector button for web clients', async () => {
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
	});

	it('should reveal the access-token setup on demand', async () => {
		renderComponent({ pinia });

		await waitFor(() => {
			expect(body().getByTestId('mcp-connect-token-toggle')).toBeInTheDocument();
		});
		expect(body().queryByTestId('token-tab-stub')).not.toBeInTheDocument();

		await userEvent.click(body().getByTestId('mcp-connect-token-toggle'));

		expect(body().getByTestId('token-tab-stub')).toBeInTheDocument();
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
