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
import { MCP_CLIENTS_VIEW, MCP_WORKFLOWS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';
import type { WorkflowListItem } from '@/Interface';
import { EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY } from '@/experiments/exposeAllWorkflowsToMcp/constants';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: routerPush, replace: vi.fn() }),
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
			McpStatusControl: {
				props: ['disabled', 'loading'],
				template:
					'<button data-test-id="disable-mcp-button" :disabled="disabled" @click="$emit(\'disable\')">Disable</button>',
			},
			McpConnectClientDialog: {
				template: '<div data-test-id="mcp-connect-dialog-stub" />',
			},
			McpAllowedCallbackUrlsDialog: {
				props: ['open', 'uris', 'saving'],
				template:
					'<div v-if="open" data-test-id="mcp-callback-urls-dialog-stub"><button data-test-id="stub-save-urls" @click="$emit(\'save\', [\'https://client.example.com/cb\'])">Save</button></div>',
			},
		},
	},
});

const workflowPage = (data: WorkflowListItem[] = [], count = data.length) => ({ data, count });

const enableMcpSettings = () => {
	settingsStore.moduleSettings = {
		mcp: {
			mcpAccessEnabled: true,
			mcpManagedByEnv: false,
		},
	};
};

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

		mcpStore.allowedRedirectUris = [];
		mcpStore.oauthClientTotals = { mine: 0 };
		mcpStore.getAllOAuthClients.mockResolvedValue([]);
		mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(workflowPage());
		mcpStore.fetchAllowedRedirectUris.mockResolvedValue([]);
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
			expect(queryByTestId('mcp-enabled-section')).not.toBeInTheDocument();
		});
	});

	describe('MCP enabled state', () => {
		beforeEach(() => {
			enableMcpSettings();
			mcpStore.oauthClientTotals = { mine: 2 };
		});

		it('should render the settings sections and the connected-clients row', async () => {
			const { getByTestId, queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('mcp-settings-header')).toBeVisible();
			expect(getByTestId('mcp-enabled-section')).toBeVisible();
			expect(getByTestId('mcp-workflows-exposed-row')).toBeVisible();
			expect(getByTestId('mcp-clients-view-all-row')).toBeVisible();
			expect(queryByTestId('mcp-empty-state')).not.toBeInTheDocument();
		});

		it('should show the no-clients empty state when there are no connected clients', async () => {
			mcpStore.oauthClientTotals = { mine: 0 };

			const { getByTestId, queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('mcp-clients-empty')).toBeVisible();
			expect(queryByTestId('mcp-clients-view-all-row')).not.toBeInTheDocument();
		});

		it('should navigate to the connected clients page from the view-all row', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('mcp-clients-view-all-row'));

			expect(routerPush).toHaveBeenCalledWith({ name: MCP_CLIENTS_VIEW });
		});

		it('should show the exposed workflows count on the access row', async () => {
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(workflowPage([], 3));

			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(getByTestId('mcp-workflows-exposed-row').textContent).toContain('3 workflows');
			});
			expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalledWith(1, 1);
		});

		it('should navigate to the workflows sub-view when the row is clicked', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('mcp-workflows-exposed-row'));

			expect(routerPush).toHaveBeenCalledWith({ name: MCP_WORKFLOWS_VIEW });
		});

		it('should open the connect dialog from the Your client row', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('mcp-connect-client-button'));

			expect(mcpStore.openConnectPopover).toHaveBeenCalled();
		});
	});

	describe('Allowed callback URLs', () => {
		beforeEach(() => {
			enableMcpSettings();
		});

		it('should show the callback URLs row for admins only', async () => {
			usersStore.isAdmin = true;
			const admin = createComponent({ pinia });
			await nextTick();
			expect(admin.getByTestId('mcp-callback-urls-row')).toBeVisible();
			admin.unmount();

			usersStore.isAdmin = false;
			usersStore.isInstanceOwner = false;
			const member = createComponent({ pinia });
			await nextTick();
			expect(member.queryByTestId('mcp-callback-urls-row')).not.toBeInTheDocument();
		});

		it('should show "All" when no URLs are configured and the count otherwise', async () => {
			usersStore.isAdmin = true;
			mcpStore.allowedRedirectUris = [];
			const all = createComponent({ pinia });
			await nextTick();
			expect(all.getByTestId('mcp-callback-urls-row').textContent).toContain('All');
			all.unmount();

			mcpStore.allowedRedirectUris = ['https://a.example.com/cb', 'https://b.example.com/cb'];
			const counted = createComponent({ pinia });
			await nextTick();
			expect(counted.getByTestId('mcp-callback-urls-row').textContent).toContain('2 URLs');
		});

		it('should open the dialog from the row and persist on save', async () => {
			usersStore.isAdmin = true;
			mcpStore.setAllowedRedirectUris.mockResolvedValue(undefined);

			const { getByTestId, queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(queryByTestId('mcp-callback-urls-dialog-stub')).not.toBeInTheDocument();
			await userEvent.click(getByTestId('mcp-callback-urls-row'));
			expect(getByTestId('mcp-callback-urls-dialog-stub')).toBeVisible();

			await userEvent.click(getByTestId('stub-save-urls'));

			await waitFor(() => {
				expect(mcpStore.setAllowedRedirectUris).toHaveBeenCalledWith([
					'https://client.example.com/cb',
				]);
			});
		});

		it('should load the redirect URIs on mount for admins', async () => {
			usersStore.isAdmin = true;
			createComponent({ pinia });
			await nextTick();

			expect(mcpStore.fetchAllowedRedirectUris).toHaveBeenCalled();
		});
	});

	describe('Toggle MCP on/off', () => {
		beforeEach(() => {
			usersStore.isAdmin = true;
		});

		it('should call setMcpAccessEnabled when turning on MCP', async () => {
			mcpStore.setMcpAccessEnabled.mockResolvedValue(true);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('enable-mcp-button'));

			expect(mcpStore.setMcpAccessEnabled).toHaveBeenCalledWith(true);
		});

		it('should fetch the workflow count and oauth clients after enabling MCP', async () => {
			mcpStore.setMcpAccessEnabled.mockResolvedValue(true);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('enable-mcp-button'));

			expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalledWith(1, 1);
			expect(mcpStore.getAllOAuthClients).toHaveBeenCalled();
		});

		it('should only disable after the confirmation dialog is confirmed', async () => {
			enableMcpSettings();
			mcpStore.setMcpAccessEnabled.mockResolvedValue(false);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('disable-mcp-button'));

			// nothing happens until the dialog is confirmed
			await waitFor(() => {
				expect(within(document.body).getByText('Disable MCP access?')).toBeInTheDocument();
			});
			expect(mcpStore.setMcpAccessEnabled).not.toHaveBeenCalled();

			await userEvent.click(
				within(document.body).getByRole('button', { name: 'Disable MCP access' }),
			);

			await waitFor(() => {
				expect(mcpStore.setMcpAccessEnabled).toHaveBeenCalledWith(false);
			});
		});

		it('should not disable when the confirmation dialog is cancelled', async () => {
			enableMcpSettings();

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('disable-mcp-button'));
			await waitFor(() => {
				expect(within(document.body).getByText('Disable MCP access?')).toBeInTheDocument();
			});

			await userEvent.click(within(document.body).getByRole('button', { name: 'Cancel' }));

			expect(mcpStore.setMcpAccessEnabled).not.toHaveBeenCalled();
		});

		it('should disable the enable button for non-owner/non-admin users', async () => {
			usersStore.isInstanceOwner = false;
			usersStore.isAdmin = false;

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('enable-mcp-button')).toBeDisabled();
		});

		it('should disable the enable button when MCP is managed by env', async () => {
			usersStore.isInstanceOwner = true;
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: false,
					mcpManagedByEnv: true,
				},
			};

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('enable-mcp-button')).toBeDisabled();
		});
	});

	describe('Expose all workflows experiment', () => {
		beforeEach(() => {
			usersStore.isAdmin = true;
			mcpStore.setMcpAccessEnabled.mockResolvedValue(true);
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
			// The connect dialog must not stack on top of the expose-all modal
			expect(mcpStore.openConnectPopover).not.toHaveBeenCalled();
		});

		it('should open the connect dialog instead when not enrolled in the experiment', async () => {
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

		it('should open the connect dialog when there are no eligible workflows', async () => {
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
	});

	describe('Instance capacity notice', () => {
		beforeEach(() => {
			enableMcpSettings();
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

		it('should NOT render the notice for a non-admin member', async () => {
			usersStore.isInstanceOwner = false;
			usersStore.isAdmin = false;
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
