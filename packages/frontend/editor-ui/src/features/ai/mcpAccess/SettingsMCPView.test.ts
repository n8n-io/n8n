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
import type { WorkflowListItem } from '@/Interface';
import { EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY } from '@/experiments/exposeAllWorkflowsToMcp/constants';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';

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
let exposeAllWorkflowsToMcpStore: MockedStore<typeof useExposeAllWorkflowsToMcpStore>;

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
				template:
					'<div><button data-test-id="workflows-table-page-2" @click="$emit(\'update:options\', { page: 1, itemsPerPage: 10, sortBy: [] })">Page 2</button><button data-test-id="workflows-table-page-size-50" @click="$emit(\'update:options\', { page: 3, itemsPerPage: 50, sortBy: [] })">Page size 50</button><button data-test-id="workflows-table-bulk-remove" @click="$emit(\'bulkRemoveMcpAccess\', [\'wf-1\', \'wf-2\'])">Bulk remove</button>Workflows Table</div>',
			},
			OAuthClientsTable: {
				inheritAttrs: true,
				template:
					"<div>OAuth Clients Table<button data-test-id=\"stub-revoke-client\" @click=\"$emit('revokeClient', { id: 'client-1', name: 'Claude Code', owner: { id: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@n8n.io' } })\">Revoke</button></div>",
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

const workflowPage = (data: WorkflowListItem[] = []) => ({ data, count: data.length });

describe('SettingsMCPView', () => {
	beforeEach(() => {
		pinia = createTestingPinia();
		mcpStore = mockedStore(useMCPStore);
		usersStore = mockedStore(useUsersStore);
		settingsStore = mockedStore(useSettingsStore);
		uiStore = mockedStore(useUIStore);
		exposeAllWorkflowsToMcpStore = mockedStore(useExposeAllWorkflowsToMcpStore);
		exposeAllWorkflowsToMcpStore.isEnabled = false;

		settingsStore.settings = {
			enterprise: {},
		} as FrontendSettings;

		settingsStore.moduleSettings = {
			mcp: {
				mcpAccessEnabled: false,
				mcpManagedByEnv: false,
			},
		};

		mcpStore.getAllOAuthClients.mockResolvedValue([]);
		mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(workflowPage());
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
					mcpManagedByEnv: false,
				},
			};
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(workflowPage());
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
					mcpManagedByEnv: false,
				},
			};
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(workflowPage());
			mcpStore.setMcpAccessEnabled.mockResolvedValue(false);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const disableButton = getByTestId('disable-mcp-button');
			await userEvent.click(disableButton);

			expect(mcpStore.setMcpAccessEnabled).toHaveBeenCalledWith(false);
		});

		it('should fetch workflows and oauth clients after enabling MCP', async () => {
			mcpStore.setMcpAccessEnabled.mockResolvedValue(true);
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(workflowPage());
			mcpStore.getAllOAuthClients.mockResolvedValue([]);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const enableButton = getByTestId('enable-mcp-button');
			await userEvent.click(enableButton);

			expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalled();
			expect(mcpStore.getAllOAuthClients).toHaveBeenCalled();
		});
	});

	describe('Expose all workflows experiment', () => {
		beforeEach(() => {
			usersStore.isAdmin = true;
			mcpStore.setMcpAccessEnabled.mockResolvedValue(true);
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(workflowPage());
			mcpStore.getAllOAuthClients.mockResolvedValue([]);
		});

		it('should offer to expose all workflows after enabling MCP when enrolled and eligible workflows exist', async () => {
			exposeAllWorkflowsToMcpStore.isEnabled = true;
			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({ count: 5, data: [] });

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('enable-mcp-button'));

			await waitFor(() => {
				expect(uiStore.openModalWithData).toHaveBeenCalledWith(
					expect.objectContaining({
						name: EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY,
						data: expect.objectContaining({ onExposed: expect.any(Function) }),
					}),
				);
			});
			// The connect popover must not stack on top of the expose-all modal
			expect(mcpStore.openConnectPopover).not.toHaveBeenCalled();
		});

		it('should not offer to expose all workflows when not enrolled in the experiment', async () => {
			exposeAllWorkflowsToMcpStore.isEnabled = false;

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('enable-mcp-button'));

			expect(mcpStore.getMcpEligibleWorkflows).not.toHaveBeenCalled();
			expect(uiStore.openModalWithData).not.toHaveBeenCalled();
			await waitFor(() => {
				expect(mcpStore.openConnectPopover).toHaveBeenCalled();
			});
		});

		it('should not offer to expose all workflows when there are no eligible workflows', async () => {
			exposeAllWorkflowsToMcpStore.isEnabled = true;
			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({ count: 0, data: [] });

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('enable-mcp-button'));

			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
			});
			expect(uiStore.openModalWithData).not.toHaveBeenCalled();
			await waitFor(() => {
				expect(mcpStore.openConnectPopover).toHaveBeenCalled();
			});
		});

		it('should not offer to expose all workflows when disabling MCP', async () => {
			exposeAllWorkflowsToMcpStore.isEnabled = true;
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: true,
					mcpManagedByEnv: false,
				},
			};
			mcpStore.setMcpAccessEnabled.mockResolvedValue(false);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('disable-mcp-button'));

			expect(mcpStore.getMcpEligibleWorkflows).not.toHaveBeenCalled();
			expect(uiStore.openModalWithData).not.toHaveBeenCalled();
			expect(mcpStore.openConnectPopover).not.toHaveBeenCalled();
		});
	});

	describe('Tab switching', () => {
		beforeEach(() => {
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: true,
					mcpManagedByEnv: false,
				},
			};
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(workflowPage());
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

		it('should confirm before revoking and pass the consent owner to the store', async () => {
			const { getByTestId, container } = createComponent({ pinia });
			await nextTick();

			await clickTab(container, 'tab-oauth');
			await waitFor(() => {
				expect(getByTestId('mcp-oauth-clients-table')).toBeVisible();
			});

			await userEvent.click(getByTestId('stub-revoke-client'));

			// nothing is revoked until the dialog is confirmed
			await waitFor(() => {
				expect(
					within(document.body).getByText('Revoke access for "Claude Code"?'),
				).toBeInTheDocument();
			});
			expect(mcpStore.removeOAuthClient).not.toHaveBeenCalled();

			await userEvent.click(within(document.body).getByRole('button', { name: 'Revoke' }));

			await waitFor(() => {
				expect(mcpStore.removeOAuthClient).toHaveBeenCalledWith('client-1', 'user-2');
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

		it('should disable toggle button for owner when MCP is managed by env', async () => {
			usersStore.isInstanceOwner = true;
			usersStore.isAdmin = false;
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: false,
					mcpManagedByEnv: true,
				},
			};

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const enableButton = getByTestId('enable-mcp-button');
			expect(enableButton).toBeDisabled();
		});

		it('should not call setMcpAccessEnabled when toggle is clicked under env management', async () => {
			usersStore.isInstanceOwner = true;
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: false,
					mcpManagedByEnv: true,
				},
			};

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const enableButton = getByTestId('enable-mcp-button');
			await userEvent.click(enableButton);

			expect(mcpStore.setMcpAccessEnabled).not.toHaveBeenCalled();
		});
	});

	describe('Refresh button', () => {
		beforeEach(() => {
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: true,
					mcpManagedByEnv: false,
				},
			};
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(workflowPage());
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

	describe('Workflow pagination', () => {
		beforeEach(() => {
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: true,
					mcpManagedByEnv: false,
				},
			};
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(
				workflowPage([createWorkflow({ id: '1', name: 'Workflow 1' })]),
			);
		});

		it('should fetch the first workflow page on mount', async () => {
			createComponent({ pinia });

			await waitFor(() => {
				expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalledWith(1, 10);
			});
		});

		it('should fetch the selected workflow page when table options change', async () => {
			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalledWith(1, 10);
			});
			mcpStore.fetchWorkflowsAvailableForMCP.mockClear();

			await userEvent.click(getByTestId('workflows-table-page-2'));

			await waitFor(() => {
				expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalledWith(2, 10);
			});
		});

		it('should reset to first page when workflow table page size changes', async () => {
			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalledWith(1, 10);
			});
			mcpStore.fetchWorkflowsAvailableForMCP.mockClear();

			await userEvent.click(getByTestId('workflows-table-page-size-50'));

			await waitFor(() => {
				expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalledWith(1, 50);
			});
		});
	});

	describe('Connect Workflows button', () => {
		beforeEach(() => {
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: true,
					mcpManagedByEnv: false,
				},
			};
		});

		it('should not show Connect Workflows button when there are no workflows', async () => {
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(workflowPage());

			const { queryByTestId } = createComponent({ pinia });
			await nextTick();

			await waitFor(() => {
				expect(queryByTestId('mcp-connect-workflows-header-button')).not.toBeInTheDocument();
			});
		});

		it('should show Connect Workflows button when there are workflows', async () => {
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(
				workflowPage([
					createWorkflow({ id: '1', name: 'Workflow 1' }),
					createWorkflow({ id: '2', name: 'Workflow 2' }),
				]),
			);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await waitFor(() => {
				expect(getByTestId('mcp-connect-workflows-header-button')).toBeVisible();
			});
		});

		it('should not show Connect Workflows button when on OAuth tab', async () => {
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(
				workflowPage([createWorkflow({ id: '1', name: 'Workflow 1' })]),
			);
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
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(
				workflowPage([createWorkflow({ id: '1', name: 'Workflow 1' })]),
			);

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

	describe('Bulk workflow actions', () => {
		beforeEach(() => {
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: true,
					mcpManagedByEnv: false,
				},
			};
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(
				workflowPage([createWorkflow({ id: '1', name: 'Workflow 1' })]),
			);
			mcpStore.toggleWorkflowsMcpAccess.mockResolvedValue({
				updatedCount: 2,
				unchangedCount: 0,
				skippedCount: 0,
				failedCount: 0,
				updatedIds: ['wf-1', 'wf-2'],
				unchangedIds: [],
			});
		});

		it('should bulk-enable the workflows selected in the Connect Workflows modal', async () => {
			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(getByTestId('mcp-connect-workflows-header-button')).toBeVisible();
			});
			await userEvent.click(getByTestId('mcp-connect-workflows-header-button'));

			const modalCall = vi.mocked(uiStore.openModalWithData).mock.calls.at(-1)?.[0] as unknown as {
				data: { onEnableMcpAccess: (workflowIds: string[]) => Promise<void> };
			};
			mcpStore.fetchWorkflowsAvailableForMCP.mockClear();

			await modalCall.data.onEnableMcpAccess(['wf-1', 'wf-2']);

			expect(mcpStore.toggleWorkflowsMcpAccess).toHaveBeenCalledWith(
				{ workflowIds: ['wf-1', 'wf-2'] },
				true,
			);
			expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalledWith(1, 10);
		});

		it('should remove MCP access for bulk-selected workflows and refresh the table', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();
			mcpStore.fetchWorkflowsAvailableForMCP.mockClear();

			await userEvent.click(getByTestId('workflows-table-bulk-remove'));

			await waitFor(() => {
				expect(mcpStore.toggleWorkflowsMcpAccess).toHaveBeenCalledWith(
					{ workflowIds: ['wf-1', 'wf-2'] },
					false,
				);
			});
			await waitFor(() => {
				expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalled();
			});
		});
	});

	describe('Instance capacity notice', () => {
		beforeEach(() => {
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: true,
					mcpManagedByEnv: false,
				},
			};
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(workflowPage());
			mcpStore.getInstanceClientStats.mockResolvedValue(null);
		});

		it('should render the notice for an instance owner when atCapacity is true', async () => {
			usersStore.isInstanceOwner = true;
			mcpStore.instanceClientStats = { count: 2, limit: 2, atCapacity: true };

			const { findByTestId } = createComponent({ pinia });

			const notice = await findByTestId('mcp-instance-capacity-notice');
			expect(notice).toBeVisible();
			expect(notice.textContent).toContain('2/2');
		});

		it('should render the notice for an admin when atCapacity is true', async () => {
			usersStore.isAdmin = true;
			mcpStore.instanceClientStats = { count: 5, limit: 5, atCapacity: true };

			const { findByTestId } = createComponent({ pinia });

			const notice = await findByTestId('mcp-instance-capacity-notice');
			expect(notice).toBeVisible();
		});

		it('should NOT render the notice for a non-admin member', async () => {
			usersStore.isInstanceOwner = false;
			usersStore.isAdmin = false;
			// Even if a stats payload sneaks in (shouldn't happen — store guards 403),
			// the view should still hide the notice for non-admins.
			mcpStore.instanceClientStats = { count: 2, limit: 2, atCapacity: true };

			const { queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(queryByTestId('mcp-instance-capacity-notice')).not.toBeInTheDocument();
		});

		it('should NOT render the notice when atCapacity is false', async () => {
			usersStore.isInstanceOwner = true;
			mcpStore.instanceClientStats = { count: 1, limit: 5, atCapacity: false };

			const { queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(queryByTestId('mcp-instance-capacity-notice')).not.toBeInTheDocument();
		});

		it('should NOT render the notice when stats have not been fetched', async () => {
			usersStore.isInstanceOwner = true;
			mcpStore.instanceClientStats = null;

			const { queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(queryByTestId('mcp-instance-capacity-notice')).not.toBeInTheDocument();
		});

		it('should fetch instance stats on mount for an admin/owner', async () => {
			usersStore.isInstanceOwner = true;

			createComponent({ pinia });
			await nextTick();

			expect(mcpStore.getInstanceClientStats).toHaveBeenCalled();
		});

		it('should not fetch instance stats on mount for a regular member', async () => {
			usersStore.isInstanceOwner = false;
			usersStore.isAdmin = false;

			createComponent({ pinia });
			await nextTick();

			expect(mcpStore.getInstanceClientStats).not.toHaveBeenCalled();
		});
	});
});
