import { createTestingPinia } from '@pinia/testing';
import { within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer, mockedStore, type MockedStore } from '@n8n/frontend-test-utils';
import McpConnectClientDialog from './McpConnectClientDialog.vue';
import { useMCPStore } from '../mcp.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type { McpPreferencesEntryPoints } from '@n8n/frontend-module-sdk';
import { mock } from 'vitest-mock-extended';
import { ref } from 'vue';

const { copySpy } = vi.hoisted(() => ({ copySpy: vi.fn() }));

vi.mock('@n8n/composables/useClipboard', () => ({
	useClipboard: () => ({ copy: copySpy, copied: ref(false), isSupported: ref(true) }),
}));

let pinia: ReturnType<typeof createTestingPinia>;
let mcpStore: MockedStore<typeof useMCPStore>;

const renderComponent = createComponentRenderer(McpConnectClientDialog, {
	global: {
		stubs: {
			McpAccessTokenTab: {
				template: '<div data-test-id="token-tab-stub" />',
			},
			RouterLink: {
				props: ['to'],
				template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
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

	it('should show the shared Antigravity config file and entry', async () => {
		renderComponent({ pinia });

		await waitFor(() => {
			expect(body().getByTestId('mcp-connect-client-picker-trigger')).toBeInTheDocument();
		});
		await userEvent.click(body().getByTestId('mcp-connect-client-picker-trigger'));
		const menuLabel = await body().findByText('Antigravity');
		expect(
			menuLabel.closest('[role="menuitem"]')?.querySelector('svg.brand-icon'),
		).toBeInTheDocument();
		await userEvent.click(menuLabel);

		expect(
			body().getByTestId('mcp-connect-client-picker-trigger').querySelector('svg.brand-icon'),
		).toBeInTheDocument();
		expect(body().getByText(/~\/\.gemini\/config\/mcp_config\.json/)).toHaveTextContent(
			'IDE, desktop app, and CLI (agy) share this file',
		);
		expect(body().getByTestId('mcp-config-snippet')).toHaveTextContent('mcpServers');
		expect(body().getByTestId('mcp-config-snippet')).toHaveTextContent('serverUrl');
		expect(body().queryByTestId('mcp-connect-one-click')).not.toBeInTheDocument();
	});

	it('should show the shared Devin config file and entry', async () => {
		renderComponent({ pinia });

		await waitFor(() => {
			expect(body().getByTestId('mcp-connect-client-picker-trigger')).toBeInTheDocument();
		});
		await userEvent.click(body().getByTestId('mcp-connect-client-picker-trigger'));
		const menuLabel = await body().findByText('Devin');
		expect(
			menuLabel.closest('[role="menuitem"]')?.querySelector('svg.brand-icon'),
		).toBeInTheDocument();
		await userEvent.click(menuLabel);

		expect(body().getByText(/~\/\.config\/devin\/mcp_config\.json/)).toHaveTextContent(
			'Devin desktop app and CLI share this file',
		);
		expect(body().getByTestId('mcp-config-snippet')).toHaveTextContent('"transport": "http"');
		expect(body().queryByTestId('mcp-connect-one-click')).not.toBeInTheDocument();
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

	describe('preferences prompt', () => {
		const provideEntryPoints = (
			entryPoint: ReturnType<McpPreferencesEntryPoints['entryPoint']>,
		) => {
			const entryPoints = mock<McpPreferencesEntryPoints>();
			entryPoints.entryPoint.mockReturnValue(entryPoint);
			capabilityRegistry.provide(capabilities.mcpPreferencesEntryPoints, entryPoints);
			return entryPoints;
		};

		afterEach(() => {
			capabilityRegistry.clear();
		});

		it('hides the prompt for control', async () => {
			provideEntryPoints(undefined);
			renderComponent({ pinia });

			await waitFor(() => {
				expect(body().getByTestId('mcp-connect-client-picker-trigger')).toBeInTheDocument();
			});
			expect(body().queryByTestId('mcp-connect-preferences-prompt')).not.toBeInTheDocument();
		});

		it('shows the prompt for the selected client and tracks the copy', async () => {
			const entryPoints = provideEntryPoints('connection_row');
			renderComponent({ pinia });

			const prompt = await body().findByTestId('mcp-connect-preferences-prompt');
			expect(prompt).toHaveTextContent('Teach Claude.ai how you build');
			expect(prompt).toHaveTextContent('Interview me about how I like to build in n8n');

			await userEvent.click(within(prompt).getByTestId('mcp-config-snippet-copy'));

			expect(copySpy).toHaveBeenCalledWith(
				expect.stringContaining('Interview me about how I like to build in n8n'),
			);
			expect(entryPoints.trackPromptCopied).toHaveBeenCalledWith('claude-ai');
		});

		it('closes the dialog when the user opens the preferences page', async () => {
			const entryPoints = provideEntryPoints('banner');
			renderComponent({ pinia });

			const link = await body().findByTestId('mcp-connect-preferences-link');
			expect(link).toHaveAttribute(
				'data-to',
				JSON.stringify({ name: 'SettingsContextPreferences' }),
			);
			await userEvent.click(link);

			expect(entryPoints.trackEntryPointClicked).toHaveBeenCalledWith('connect_dialog');
			expect(mcpStore.closeConnectPopover).toHaveBeenCalled();
			expect(mcpStore.resetCurrentUserMCPKey).toHaveBeenCalled();
		});
	});
});
