import { nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore, waitAllPromises } from '@/__tests__/utils';
import SettingsMCPView from '@/features/ai/mcpAccess/SettingsMCPView.vue';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { FrontendSettings, OAuthClientResponseDto } from '@n8n/api-types';
import { MCP_CLIENTS_VIEW, MCP_WORKFLOWS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';
import type { WorkflowListItem } from '@/Interface';
import { EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY } from '@/experiments/exposeAllWorkflowsToMcp/constants';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';
import type { Agent } from '@/features/agents/agent.types';

import { UNKNOWN_COUNT_VALUE } from '@/features/ai/mcpAccess/mcp.constants';
import { createOAuthClient } from '@/features/ai/mcpAccess/mcp.test.utils';
import { useToast } from '@n8n/composables/useToast';

vi.mock('@/app/components/TimeAgo.vue', () => ({
	default: {
		name: 'TimeAgo',
		props: ['date'],
		template: '<span>{{ date }}</span>',
	},
}));

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));
const { hasPermissionMock } = vi.hoisted(() => ({
	hasPermissionMock: vi.fn().mockReturnValue(true),
}));
const {
	trackSpy,
	trackAutoExposeToggledSpy,
	trackConnectClientClickedSpy,
	trackClientAccessRevokedSpy,
} = vi.hoisted(() => ({
	trackSpy: vi.fn(),
	trackAutoExposeToggledSpy: vi.fn(),
	trackConnectClientClickedSpy: vi.fn(),
	trackClientAccessRevokedSpy: vi.fn(),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: hasPermissionMock,
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackSpy }),
}));

vi.mock('@n8n/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return {
		useToast: () => ({ showMessage, showError }),
	};
});

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
		trackAutoExposeToggled: trackAutoExposeToggledSpy,
		trackConnectClientClicked: trackConnectClientClickedSpy,
		trackClientAccessRevoked: trackClientAccessRevokedSpy,
	}),
}));

let pinia: ReturnType<typeof createTestingPinia>;
let mcpStore: MockedStore<typeof useMCPStore>;
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
			autoExposeNewWorkflows: false,
		},
	};
};

describe('SettingsMCPView', () => {
	beforeEach(() => {
		hasPermissionMock.mockReturnValue(true);
		pinia = createTestingPinia();
		mcpStore = mockedStore(useMCPStore);
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
				autoExposeNewWorkflows: false,
			},
		};

		mcpStore.allowedRedirectUris = [];
		mcpStore.oauthClientTotals = { mine: 0 };
		mcpStore.oauthClientsPreview = [];
		mcpStore.fetchOAuthClientsPreview.mockResolvedValue([]);
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

		it('should keep the connected-clients row (stating the count) when there are none', async () => {
			mcpStore.oauthClientTotals = { mine: 0 };
			mcpStore.fetchOAuthClientsPreview.mockResolvedValue([]);

			const { getByTestId, queryByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(queryByTestId('mcp-clients-empty')).not.toBeInTheDocument();
				expect(queryByTestId('mcp-clients-preview')).not.toBeInTheDocument();
				const row = getByTestId('mcp-clients-view-all-row');
				expect(row).toBeVisible();
				expect(row).toHaveTextContent('0');
			});
		});

		it("should navigate to the user's own clients from the view-all row", async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('mcp-clients-view-all-row'));

			expect(routerPush).toHaveBeenCalledWith({
				name: MCP_CLIENTS_VIEW,
				query: { tab: 'mine' },
			});
		});

		it("should open everyone's clients when a manager has none of their own", async () => {
			mcpStore.oauthClientTotals = { mine: 0, all: 4 };

			const { getByTestId } = createComponent({ pinia });
			await waitFor(() => {
				expect(getByTestId('mcp-clients-view-all-row')).toHaveTextContent('4 clients have access');
			});

			await userEvent.click(getByTestId('mcp-clients-view-all-row'));

			expect(routerPush).toHaveBeenCalledWith({
				name: MCP_CLIENTS_VIEW,
				query: { tab: 'all' },
			});
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
			expect(trackConnectClientClickedSpy).toHaveBeenCalledWith('settings');
		});
	});

	describe('Connected clients loading state', () => {
		beforeEach(() => {
			enableMcpSettings();
		});

		it('should show placeholder instead of 0 while the clients preview is pending', async () => {
			// Create a promise we control so we can keep it pending
			let resolveClients!: (value: OAuthClientResponseDto[]) => void;
			const clientsPromise = new Promise<OAuthClientResponseDto[]>((res) => {
				resolveClients = res;
			});
			mcpStore.fetchOAuthClientsPreview.mockReturnValue(clientsPromise);

			const { getAllByText, queryByText, queryAllByText } = createComponent({ pinia });
			await nextTick();

			expect(getAllByText(UNKNOWN_COUNT_VALUE).length).toBeGreaterThan(0);
			expect(queryByText('0 clients have access')).not.toBeInTheDocument();

			resolveClients([]);
			await waitFor(() => {
				expect(queryAllByText(UNKNOWN_COUNT_VALUE)).toHaveLength(0);
			});
		});

		it('should show 0 after the clients preview resolves with zero clients', async () => {
			mcpStore.oauthClientTotals = { mine: 0 };
			mcpStore.fetchOAuthClientsPreview.mockResolvedValue([]);

			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				const row = getByTestId('mcp-clients-view-all-row');
				expect(row).not.toHaveTextContent(UNKNOWN_COUNT_VALUE);
				expect(row).toHaveTextContent('0');
			});
		});

		it('should keep — and not silently show 0 when the clients preview fails', async () => {
			mcpStore.fetchOAuthClientsPreview.mockRejectedValue(new Error('network error'));

			const { getAllByText, queryByText } = createComponent({ pinia });

			await waitFor(() => {
				expect(mcpStore.fetchOAuthClientsPreview).toHaveBeenCalled();
			});

			expect(getAllByText(UNKNOWN_COUNT_VALUE).length).toBeGreaterThan(0);
			expect(queryByText('0 clients have access')).not.toBeInTheDocument();
		});
	});

	describe('Connected clients preview', () => {
		const ownClients = [
			createOAuthClient({ id: 'client-1', name: 'Cursor' }),
			createOAuthClient({ id: 'client-2', name: 'Claude Code' }),
		];

		beforeEach(() => {
			enableMcpSettings();
			mcpStore.oauthClientsPreview = ownClients;
			mcpStore.oauthClientTotals = { mine: 2 };
			mcpStore.fetchOAuthClientsPreview.mockResolvedValue(ownClients);
		});

		it("should preview the user's own clients and drop the view-all row when it shows them all", async () => {
			const { getAllByTestId, queryByTestId } = createComponent({ pinia });
			await waitAllPromises();

			const rows = getAllByTestId('mcp-client-preview-row');
			expect(rows).toHaveLength(2);
			expect(rows[0]).toHaveTextContent('Cursor');
			expect(rows[0]).toHaveTextContent('IDE');
			expect(rows[1]).toHaveTextContent('Claude Code');
			expect(rows[1]).toHaveTextContent('CLI');
			expect(queryByTestId('mcp-clients-view-all-row')).not.toBeInTheDocument();
		});

		it('should keep the view-all row when the user has more clients than the preview shows', async () => {
			mcpStore.oauthClientTotals = { mine: 5 };

			const { getAllByTestId, getByTestId } = createComponent({ pinia });
			await waitAllPromises();

			expect(getAllByTestId('mcp-client-preview-row')).toHaveLength(2);
			expect(getByTestId('mcp-clients-view-all-row')).toHaveTextContent('5 clients have access');
		});

		it("should keep the view-all row for a manager when other users' clients exist", async () => {
			mcpStore.oauthClientTotals = { mine: 2, all: 6 };

			const { getAllByTestId, getByTestId } = createComponent({ pinia });
			await waitAllPromises();

			// Only the user's own clients are previewed; the others stay behind the clients page.
			expect(getAllByTestId('mcp-client-preview-row')).toHaveLength(2);
			expect(getByTestId('mcp-clients-view-all-row')).toHaveTextContent('6 clients have access');
		});

		it('should open the client details when a preview row is clicked', async () => {
			const { getAllByTestId } = createComponent({ pinia });
			await waitAllPromises();

			await userEvent.click(getAllByTestId('mcp-client-preview-row')[0]);

			await waitFor(() => {
				expect(within(document.body).getByTestId('mcp-client-details-modal')).toBeVisible();
			});
			expect(within(document.body).getByTestId('mcp-client-details-modal')).toHaveTextContent(
				'Cursor',
			);
		});

		it('should confirm before revoking from a preview row, then refresh the preview', async () => {
			mcpStore.removeOAuthClient.mockResolvedValue({ success: true, message: '' });

			const { getAllByTestId } = createComponent({ pinia });
			await waitAllPromises();
			mcpStore.fetchOAuthClientsPreview.mockClear();

			await userEvent.click(getAllByTestId('mcp-client-preview-revoke-button')[1]);

			// nothing is revoked until the dialog is confirmed
			await waitFor(() => {
				expect(
					within(document.body).getByText('Revoke access for "Claude Code"?'),
				).toBeInTheDocument();
			});
			expect(mcpStore.removeOAuthClient).not.toHaveBeenCalled();

			await userEvent.click(within(document.body).getByRole('button', { name: 'Revoke' }));

			await waitFor(() => {
				expect(mcpStore.removeOAuthClient).toHaveBeenCalledWith('client-2', undefined);
			});
			expect(trackClientAccessRevokedSpy).toHaveBeenCalledWith({
				clientId: 'client-2',
				clientName: 'Claude Code',
				revokedForOther: false,
			});
			await waitFor(() => {
				expect(mcpStore.fetchOAuthClientsPreview).toHaveBeenCalledTimes(1);
			});
		});

		it('should not open the client details when the revoke action is clicked', async () => {
			const { getAllByTestId } = createComponent({ pinia });
			await waitAllPromises();

			await userEvent.click(getAllByTestId('mcp-client-preview-revoke-button')[0]);

			await waitFor(() => {
				expect(within(document.body).getByText('Revoke access for "Cursor"?')).toBeInTheDocument();
			});
			expect(within(document.body).queryByTestId('mcp-client-details-modal')).toBeNull();
		});
	});

	describe('Workflows and agents loading state', () => {
		beforeEach(() => {
			enableMcpSettings();
			settingsStore.isModuleActive = vi.fn().mockReturnValue(true);
			mcpStore.fetchAgentsAvailableForMCP.mockResolvedValue({ data: [], count: 0 });
		});

		it('should show placeholder while fetchWorkflowsAvailableForMCP is pending', async () => {
			let resolveWorkflows!: (value: { data: WorkflowListItem[]; count: number }) => void;
			const workflowsPromise = new Promise<{ data: WorkflowListItem[]; count: number }>((res) => {
				resolveWorkflows = res;
			});
			mcpStore.fetchWorkflowsAvailableForMCP.mockReturnValue(workflowsPromise);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('mcp-workflows-exposed-row')).toHaveTextContent(UNKNOWN_COUNT_VALUE);

			resolveWorkflows({ data: [], count: 3 });
			await waitFor(() => {
				expect(getByTestId('mcp-workflows-exposed-row')).toHaveTextContent('3 workflows');
			});
		});

		it('should show 0 after fetchWorkflowsAvailableForMCP resolves with zero', async () => {
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue({ data: [], count: 0 });

			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(getByTestId('mcp-workflows-exposed-row')).not.toHaveTextContent(UNKNOWN_COUNT_VALUE);
				expect(getByTestId('mcp-workflows-exposed-row')).toHaveTextContent('0');
			});
		});

		it('should keep — when fetchWorkflowsAvailableForMCP fails', async () => {
			mcpStore.fetchWorkflowsAvailableForMCP.mockRejectedValue(new Error('network error'));

			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalled();
			});

			expect(getByTestId('mcp-workflows-exposed-row')).toHaveTextContent(UNKNOWN_COUNT_VALUE);
		});

		it('should show placeholder while fetchAgentsAvailableForMCP is pending', async () => {
			let resolveAgents!: (value: { data: Agent[]; count: number }) => void;
			const agentsPromise = new Promise<{ data: Agent[]; count: number }>((res) => {
				resolveAgents = res;
			});

			mcpStore.fetchAgentsAvailableForMCP.mockReturnValue(agentsPromise);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('mcp-agents-exposed-row')).toHaveTextContent(UNKNOWN_COUNT_VALUE);

			resolveAgents({ data: [], count: 2 });
			await waitFor(() => {
				expect(getByTestId('mcp-agents-exposed-row')).toHaveTextContent('2');
			});
		});

		it('should keep — when fetchAgentsAvailableForMCP fails', async () => {
			mcpStore.fetchAgentsAvailableForMCP.mockRejectedValue(new Error('network error'));

			const { getByTestId } = createComponent({ pinia });
			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCP).toHaveBeenCalled();
			});

			expect(getByTestId('mcp-agents-exposed-row')).toHaveTextContent(UNKNOWN_COUNT_VALUE);
		});
	});

	describe('Allowed callback URLs', () => {
		beforeEach(() => {
			enableMcpSettings();
		});

		it('should show the callback URLs row for admins only', async () => {
			hasPermissionMock.mockReturnValue(true);
			const admin = createComponent({ pinia });
			await nextTick();
			expect(admin.getByTestId('mcp-callback-urls-row')).toBeVisible();
			admin.unmount();

			hasPermissionMock.mockReturnValue(false);
			const member = createComponent({ pinia });
			await nextTick();
			expect(member.queryByTestId('mcp-callback-urls-row')).not.toBeInTheDocument();
		});

		it('should show "All" when no URLs are configured and the count otherwise', async () => {
			hasPermissionMock.mockReturnValue(true);
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
			hasPermissionMock.mockReturnValue(true);
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
			hasPermissionMock.mockReturnValue(true);
			createComponent({ pinia });
			await nextTick();

			expect(mcpStore.fetchAllowedRedirectUris).toHaveBeenCalled();
		});
	});

	describe('Toggle MCP on/off', () => {
		beforeEach(() => {
			hasPermissionMock.mockReturnValue(true);
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
			expect(mcpStore.fetchOAuthClientsPreview).toHaveBeenCalled();
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
			hasPermissionMock.mockReturnValue(false);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('enable-mcp-button')).toBeDisabled();
		});

		it('should disable the enable button when MCP is managed by env', async () => {
			hasPermissionMock.mockReturnValue(true);
			settingsStore.moduleSettings = {
				mcp: {
					mcpAccessEnabled: false,
					mcpManagedByEnv: true,
					autoExposeNewWorkflows: false,
				},
			};

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('enable-mcp-button')).toBeDisabled();
		});
	});

	describe('Expose all workflows experiment', () => {
		beforeEach(() => {
			hasPermissionMock.mockReturnValue(true);
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

		it('should not open the connect dialog when not enrolled in the experiment', async () => {
			exposeAllWorkflowsToMcpStore.isEnabled = false;

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('enable-mcp-button'));

			expect(mcpStore.getMcpEligibleWorkflows).not.toHaveBeenCalled();
			expect(uiStore.openModalWithData).not.toHaveBeenCalled();
			// Enabling MCP no longer auto-opens the connect dialog.
			expect(mcpStore.openConnectPopover).not.toHaveBeenCalled();
		});

		it('should not open the connect dialog when there are no eligible workflows', async () => {
			exposeAllWorkflowsToMcpStore.isEnabled = true;
			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({ count: 0, data: [] });

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await userEvent.click(getByTestId('enable-mcp-button'));

			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
			});
			expect(uiStore.openModalWithData).not.toHaveBeenCalled();
			expect(mcpStore.openConnectPopover).not.toHaveBeenCalled();
		});
	});

	describe('Instance capacity notice', () => {
		beforeEach(() => {
			enableMcpSettings();
			mcpStore.getInstanceClientStats.mockResolvedValue(null);
		});

		it('should render the notice for an instance owner when atCapacity is true', async () => {
			hasPermissionMock.mockReturnValue(true);
			mcpStore.instanceClientStats = { count: 2, limit: 2, atCapacity: true };

			const { findByTestId } = createComponent({ pinia });

			const notice = await findByTestId('mcp-instance-capacity-notice');
			expect(notice).toBeVisible();
			expect(notice.textContent).toContain('2/2');
		});

		it('should NOT render the notice for a non-admin member', async () => {
			hasPermissionMock.mockReturnValue(false);
			mcpStore.instanceClientStats = { count: 2, limit: 2, atCapacity: true };

			const { queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(queryByTestId('mcp-instance-capacity-notice')).not.toBeInTheDocument();
		});

		it('should NOT render the notice when atCapacity is false', async () => {
			hasPermissionMock.mockReturnValue(true);
			mcpStore.instanceClientStats = { count: 1, limit: 5, atCapacity: false };

			const { queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(queryByTestId('mcp-instance-capacity-notice')).not.toBeInTheDocument();
		});

		it('should fetch instance stats on mount for an admin/owner', async () => {
			hasPermissionMock.mockReturnValue(true);

			createComponent({ pinia });
			await nextTick();

			expect(mcpStore.getInstanceClientStats).toHaveBeenCalled();
		});

		it('should not fetch instance stats on mount for a regular member', async () => {
			hasPermissionMock.mockReturnValue(false);

			createComponent({ pinia });
			await nextTick();

			expect(mcpStore.getInstanceClientStats).not.toHaveBeenCalled();
		});
	});

	describe('auto-expose toggle', () => {
		beforeEach(() => {
			enableMcpSettings();
		});

		it('renders for a user with mcp:manage when the experiment is on', async () => {
			hasPermissionMock.mockReturnValue(true);
			exposeAllWorkflowsToMcpStore.isEnabled = true;

			const { getByTestId } = createComponent({ pinia });
			await waitAllPromises();

			expect(getByTestId('mcp-auto-expose-toggle')).toBeTruthy();
		});

		it('is hidden without the experiment flag', async () => {
			hasPermissionMock.mockReturnValue(true);
			exposeAllWorkflowsToMcpStore.isEnabled = false;

			const { queryByTestId } = createComponent({ pinia });
			await waitAllPromises();

			expect(queryByTestId('mcp-auto-expose-toggle')).toBeNull();
		});

		it('is hidden for a user without mcp:manage', async () => {
			hasPermissionMock.mockReturnValue(false);
			exposeAllWorkflowsToMcpStore.isEnabled = true;

			const { queryByTestId } = createComponent({ pinia });
			await waitAllPromises();

			expect(queryByTestId('mcp-auto-expose-toggle')).toBeNull();
		});

		it('persists the new state and tracks the resulting value', async () => {
			hasPermissionMock.mockReturnValue(true);
			exposeAllWorkflowsToMcpStore.isEnabled = true;
			mcpStore.setAutoExposeNewWorkflows.mockResolvedValue(true);

			const { getByTestId } = createComponent({ pinia });
			await waitAllPromises();

			await userEvent.click(getByTestId('mcp-auto-expose-toggle').querySelector('input')!);

			expect(mcpStore.setAutoExposeNewWorkflows).toHaveBeenCalledWith(true);
			expect(trackAutoExposeToggledSpy).toHaveBeenCalledWith({ enabled: true, source: 'settings' });
		});

		it('shows a toast error and does not track when persisting fails', async () => {
			hasPermissionMock.mockReturnValue(true);
			exposeAllWorkflowsToMcpStore.isEnabled = true;
			mcpStore.setAutoExposeNewWorkflows.mockRejectedValueOnce(new Error('nope'));

			const { getByTestId } = createComponent({ pinia });
			await waitAllPromises();

			await userEvent.click(getByTestId('mcp-auto-expose-toggle').querySelector('input')!);
			await waitAllPromises();

			expect(trackAutoExposeToggledSpy).not.toHaveBeenCalled();
			expect(useToast().showError).toHaveBeenCalledWith(
				expect.anything(),
				'Could not update setting',
			);
		});
	});
});
