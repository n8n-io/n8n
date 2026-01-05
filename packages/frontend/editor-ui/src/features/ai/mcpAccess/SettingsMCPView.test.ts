import { nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import SettingsMCPView from '@/features/ai/mcpAccess/SettingsMCPView.vue';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { FrontendSettings } from '@n8n/api-types';
import { MCP_CONNECT_WORKFLOWS_MODAL_KEY } from '@/features/ai/mcpAccess/mcp.constants';
import { createWorkflow } from '@/features/ai/mcpAccess/mcp.test.utils';

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: vi.fn(),
	useRoute: vi.fn(() => ({
		params: {},
	})),
	RouterLink: {
		template: '<a><slot /></a>',
	},
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
	}),
}));

vi.mock('@/features/ai/mcpAccess/composables/useMcp', () => ({
	useMcp: () => ({
		trackUserToggledMcpAccess: vi.fn(),
	}),
}));

let pinia: ReturnType<typeof createTestingPinia>;
let mcpStore: MockedStore<typeof useMCPStore>;
let usersStore: MockedStore<typeof useUsersStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let uiStore: MockedStore<typeof useUIStore>;

const createComponent = createComponentRenderer(SettingsMCPView, {
	global: {
		stubs: {
			MCPEmptyState: {
				props: ['disabled', 'loading'],
				template:
					'<div data-test-id="mcp-empty-state"><button data-test-id="enable-mcp-button" :disabled="disabled" @click="$emit(\'turnOnMcp\')">Turn On</button></div>',
			},
			MCpHeaderActions: {
				props: ['toggleDisabled', 'loading'],
				template:
					'<div data-test-id="mcp-header-actions"><button data-test-id="disable-mcp-button" :disabled="toggleDisabled" @click="$emit(\'disableMcpAccess\')">Disable</button></div>',
			},
			WorkflowsTable: {
				inheritAttrs: true,
				template: '<div>Workflows Table</div>',
			},
			OAuthClientsTable: {
				inheritAttrs: true,
				template: '<div>OAuth Clients Table</div>',
			},
		},
	},
});

const clickTab = async (container: Element, tabTestId: string) => {
	if (!(container instanceof HTMLElement)) {
		throw new Error('Container is not an HTMLElement');
	}
	const tabWrapper = within(container).getByTestId(tabTestId);
	const clickableTab = tabWrapper.querySelector('.tab');
	if (clickableTab) {
		await userEvent.click(clickableTab);
	}
};

describe('SettingsMCPView', () => {
	beforeEach(() => {
		pinia = createTestingPinia();
		mcpStore = mockedStore(useMCPStore);
		usersStore = mockedStore(useUsersStore);
		settingsStore = mockedStore(useSettingsStore);
		uiStore = mockedStore(useUIStore);

		settingsStore.settings = {
			enterprise: {},
		} as FrontendSettings;

		settingsStore.moduleSettings = {
			mcp: {
				mcpAccessEnabled: false,
			},
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Empty state (MCP disabled)', () => {
		it('should render empty state when MCP access is disabled', async () => {
			const { getByTestId, queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('mcp-settings-header')).toBeVisible();
			expect(getByTestId('mcp-empty-state')).toBeVisible();
			expect(queryByTestId('mcp-header-actions')).toBeVisible();
			expect(queryByTestId('mcp-enabled-section')).not.toBeInTheDocument();
		});
	});

	describe('MCP enabled state', () => {
		beforeEach(() => {
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: true,
				},
			};
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue([]);
		});

		it('should render enabled section when MCP access is enabled', async () => {
			const { getByTestId, queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('mcp-settings-header')).toBeVisible();
			expect(getByTestId('mcp-header-actions')).toBeVisible();
			expect(getByTestId('mcp-enabled-section')).toBeVisible();
			expect(queryByTestId('mcp-empty-state')).not.toBeInTheDocument();
		});

		it('should render workflows table by default', async () => {
			const { getByTestId, queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('mcp-workflow-table')).toBeVisible();
			expect(queryByTestId('mcp-oauth-clients-table')).not.toBeInTheDocument();
		});
	});

	describe('Toggle MCP on/off', () => {
		beforeEach(() => {
			// Set user as admin to allow toggling
			usersStore.isAdmin = true;
		});

		it('should call setMcpAccessEnabled when turning on MCP', async () => {
			mcpStore.setMcpAccessEnabled.mockResolvedValue(true);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const enableButton = getByTestId('enable-mcp-button');
			await userEvent.click(enableButton);

			expect(mcpStore.setMcpAccessEnabled).toHaveBeenCalledWith(true);
		});

		it('should call setMcpAccessEnabled when turning off MCP', async () => {
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: true,
				},
			};
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue([]);
			mcpStore.setMcpAccessEnabled.mockResolvedValue(false);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const disableButton = getByTestId('disable-mcp-button');
			await userEvent.click(disableButton);

			expect(mcpStore.setMcpAccessEnabled).toHaveBeenCalledWith(false);
		});

		it('should fetch workflows and oauth clients after enabling MCP', async () => {
			mcpStore.setMcpAccessEnabled.mockResolvedValue(true);
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue([]);
			mcpStore.getAllOAuthClients.mockResolvedValue([]);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const enableButton = getByTestId('enable-mcp-button');
			await userEvent.click(enableButton);

			expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalled();
			expect(mcpStore.getAllOAuthClients).toHaveBeenCalled();
		});
	});

	describe('Tab switching', () => {
		beforeEach(() => {
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: true,
				},
			};
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue([]);
			mcpStore.getAllOAuthClients.mockResolvedValue([]);
		});

		it('should switch to OAuth tab and show OAuth clients table', async () => {
			const { getByTestId, queryByTestId, container } = createComponent({ pinia });
			await nextTick();

			// Initially workflows tab is active
			expect(getByTestId('mcp-workflow-table')).toBeVisible();
			expect(queryByTestId('mcp-oauth-clients-table')).not.toBeInTheDocument();

			// Click on OAuth tab
			await clickTab(container, 'tab-oauth');

			await waitFor(() => {
				expect(getByTestId('mcp-oauth-clients-table')).toBeVisible();
			});
			expect(queryByTestId('mcp-workflow-table')).not.toBeInTheDocument();
		});

		it('should fetch OAuth clients when switching to OAuth tab', async () => {
			const { container } = createComponent({ pinia });
			await nextTick();

			// Reset mock call count after initial render
			mcpStore.getAllOAuthClients.mockClear();

			// Click on OAuth tab
			await clickTab(container, 'tab-oauth');

			await waitFor(() => {
				expect(mcpStore.getAllOAuthClients).toHaveBeenCalled();
			});
		});

		it('should switch back to Workflows tab and show workflows table', async () => {
			const { getByTestId, queryByTestId, container } = createComponent({ pinia });
			await nextTick();

			// Click on OAuth tab first
			await clickTab(container, 'tab-oauth');
			await waitFor(() => {
				expect(getByTestId('mcp-oauth-clients-table')).toBeVisible();
			});

			// Then click on Workflows tab
			await clickTab(container, 'tab-workflows');

			await waitFor(() => {
				expect(getByTestId('mcp-workflow-table')).toBeVisible();
			});
			expect(queryByTestId('mcp-oauth-clients-table')).not.toBeInTheDocument();
		});
	});

	describe('Permissions', () => {
		it('should disable toggle button for non-owner/non-admin users', async () => {
			usersStore.isInstanceOwner = false;
			usersStore.isAdmin = false;

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const enableButton = getByTestId('enable-mcp-button');
			expect(enableButton).toBeDisabled();
		});

		it('should enable toggle button for admin users', async () => {
			usersStore.isInstanceOwner = false;
			usersStore.isAdmin = true;

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const enableButton = getByTestId('enable-mcp-button');
			expect(enableButton).not.toBeDisabled();
		});

		it('should enable toggle button for owner users', async () => {
			usersStore.isInstanceOwner = true;
			usersStore.isAdmin = false;

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const enableButton = getByTestId('enable-mcp-button');
			expect(enableButton).not.toBeDisabled();
		});
	});

	describe('Refresh button', () => {
		beforeEach(() => {
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: true,
				},
			};
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue([]);
			mcpStore.getAllOAuthClients.mockResolvedValue([]);
		});

		it('should refresh workflows when on workflows tab', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			// Clear mocks after initial load
			mcpStore.fetchWorkflowsAvailableForMCP.mockClear();
			mcpStore.getAllOAuthClients.mockClear();

			const refreshButton = getByTestId('mcp-workflows-refresh-button');
			await userEvent.click(refreshButton);

			await waitFor(() => {
				expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalled();
			});
			expect(mcpStore.getAllOAuthClients).not.toHaveBeenCalled();
		});

		it('should refresh OAuth clients when on OAuth tab', async () => {
			const { getByTestId, container } = createComponent({ pinia });
			await nextTick();

			// Switch to OAuth tab
			await clickTab(container, 'tab-oauth');
			await waitFor(() => {
				expect(getByTestId('mcp-oauth-clients-table')).toBeVisible();
			});

			// Clear mocks
			mcpStore.fetchWorkflowsAvailableForMCP.mockClear();
			mcpStore.getAllOAuthClients.mockClear();

			const refreshButton = getByTestId('mcp-workflows-refresh-button');
			await userEvent.click(refreshButton);

			await waitFor(() => {
				expect(mcpStore.getAllOAuthClients).toHaveBeenCalled();
			});
			expect(mcpStore.fetchWorkflowsAvailableForMCP).not.toHaveBeenCalled();
		});
	});

	describe('Connect Workflows button', () => {
		beforeEach(() => {
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: true,
				},
			};
		});

		it('should not show Connect Workflows button when there are no workflows', async () => {
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue([]);

			const { queryByTestId } = createComponent({ pinia });
			await nextTick();

			await waitFor(() => {
				expect(queryByTestId('mcp-connect-workflows-header-button')).not.toBeInTheDocument();
			});
		});

		it('should show Connect Workflows button when there are workflows', async () => {
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue([
				createWorkflow({ id: '1', name: 'Workflow 1' }),
				createWorkflow({ id: '2', name: 'Workflow 2' }),
			]);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await waitFor(() => {
				expect(getByTestId('mcp-connect-workflows-header-button')).toBeVisible();
			});
		});

		it('should not show Connect Workflows button when on OAuth tab', async () => {
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue([
				createWorkflow({ id: '1', name: 'Workflow 1' }),
			]);
			mcpStore.getAllOAuthClients.mockResolvedValue([]);

			const { queryByTestId, getByTestId, container } = createComponent({ pinia });
			await nextTick();

			// Initially button should be visible on workflows tab
			await waitFor(() => {
				expect(getByTestId('mcp-connect-workflows-header-button')).toBeVisible();
			});

			// Switch to OAuth tab
			await clickTab(container, 'tab-oauth');

			await waitFor(() => {
				expect(queryByTestId('mcp-connect-workflows-header-button')).not.toBeInTheDocument();
			});
		});

		it('should open Connect Workflows modal when button is clicked', async () => {
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue([
				createWorkflow({ id: '1', name: 'Workflow 1' }),
			]);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await waitFor(() => {
				expect(getByTestId('mcp-connect-workflows-header-button')).toBeVisible();
			});

			const connectButton = getByTestId('mcp-connect-workflows-header-button');
			await userEvent.click(connectButton);

			expect(uiStore.openModalWithData).toHaveBeenCalledWith(
				expect.objectContaining({
					name: MCP_CONNECT_WORKFLOWS_MODAL_KEY,
					data: expect.objectContaining({
						onEnableMcpAccess: expect.any(Function),
					}),
				}),
			);
		});
	});
});
