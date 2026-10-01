import { nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer, mockedStore, type MockedStore } from '@n8n/frontend-test-utils';
import SettingsMCPAgentsView from '@/features/ai/mcpAccess/SettingsMCPAgentsView.vue';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { FrontendSettings } from '@n8n/api-types';
import { MCP_SETTINGS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';
import type { McpAgent } from '@/features/ai/mcpAccess/mcp.types';

const { routerPush, routerReplace } = vi.hoisted(() => ({
	routerPush: vi.fn(),
	routerReplace: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: routerPush, replace: routerReplace }),
	useRoute: vi.fn(() => ({
		params: {},
	})),
	RouterLink: {
		template: '<a><slot /></a>',
	},
}));

vi.mock('@n8n/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
	}),
}));

let pinia: ReturnType<typeof createTestingPinia>;
let mcpStore: MockedStore<typeof useMCPStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;

const createComponent = createComponentRenderer(SettingsMCPAgentsView, {
	global: {
		stubs: {
			AgentsTable: {
				inheritAttrs: true,
				template:
					'<div><button data-test-id="agents-table-page-2" @click="$emit(\'update:options\', { page: 1, itemsPerPage: 10, sortBy: [] })">Page 2</button><button data-test-id="agents-table-page-size-50" @click="$emit(\'update:options\', { page: 3, itemsPerPage: 50, sortBy: [] })">Page size 50</button><button data-test-id="agents-table-bulk-remove" @click="$emit(\'bulkRemoveMcpAccess\', [\'agent-1\', \'agent-2\'])">Bulk remove</button>Agents Table</div>',
			},
			MCPConnectAgentsModal: {
				props: ['open', 'enableMcpAccess'],
				template:
					'<div v-if="open" data-test-id="mcp-connect-agents-dialog-stub"><button data-test-id="stub-enable-access" @click="enableMcpAccess([\'agent-1\', \'agent-2\'])">Enable</button></div>',
			},
		},
	},
});

const createAgent = (overrides: Partial<McpAgent> = {}): McpAgent => ({
	id: 'agent-1',
	name: 'My Agent',
	projectId: 'project-1',
	...overrides,
});

const agentPage = (data: McpAgent[] = []) => ({ data, count: data.length });

const mockAgentPages = (data: McpAgent[] = []) => {
	mcpStore.fetchAgentsAvailableForMCPPage.mockImplementation(async (page: number) => ({
		...agentPage(data),
		page,
	}));
};

describe('SettingsMCPAgentsView', () => {
	beforeEach(() => {
		pinia = createTestingPinia();
		mcpStore = mockedStore(useMCPStore);
		settingsStore = mockedStore(useSettingsStore);

		settingsStore.settings = {
			enterprise: {},
		} as FrontendSettings;

		settingsStore.moduleSettings = {
			mcp: {
				mcpAccessEnabled: true,
				mcpManagedByEnv: false,
				autoExposeNewWorkflows: false,
			},
		};
		settingsStore.isModuleActive.mockReturnValue(true);

		mockAgentPages();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should redirect to the MCP settings view when MCP is disabled', async () => {
		settingsStore.moduleSettings = {
			mcp: {
				mcpAccessEnabled: false,
				mcpManagedByEnv: false,
				autoExposeNewWorkflows: false,
			},
		};

		createComponent({ pinia });
		await nextTick();

		expect(routerReplace).toHaveBeenCalledWith({ name: MCP_SETTINGS_VIEW });
		expect(mcpStore.fetchAgentsAvailableForMCPPage).not.toHaveBeenCalled();
	});

	it('should redirect to the MCP settings view when the agents module is inactive', async () => {
		settingsStore.isModuleActive.mockReturnValue(false);

		createComponent({ pinia });
		await nextTick();

		expect(routerReplace).toHaveBeenCalledWith({ name: MCP_SETTINGS_VIEW });
		expect(mcpStore.fetchAgentsAvailableForMCPPage).not.toHaveBeenCalled();
	});

	describe('Agent pagination', () => {
		beforeEach(() => {
			mockAgentPages([createAgent({ id: '1', name: 'Agent 1' })]);
		});

		it('should fetch the first agent page on mount', async () => {
			createComponent({ pinia });

			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCPPage).toHaveBeenCalledWith(1, 10);
			});
		});

		it('should fetch the selected agent page when table options change', async () => {
			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCPPage).toHaveBeenCalledWith(1, 10);
			});
			mcpStore.fetchAgentsAvailableForMCPPage.mockClear();

			await userEvent.click(getByTestId('agents-table-page-2'));

			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCPPage).toHaveBeenCalledWith(2, 10);
			});
		});

		it('should reset to first page when agent table page size changes', async () => {
			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCPPage).toHaveBeenCalledWith(1, 10);
			});
			mcpStore.fetchAgentsAvailableForMCPPage.mockClear();

			await userEvent.click(getByTestId('agents-table-page-size-50'));

			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCPPage).toHaveBeenCalledWith(1, 50);
			});
		});
	});

	describe('Connect Agents button', () => {
		it('should not show the button when there are no agents', async () => {
			mockAgentPages();

			const { queryByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(queryByTestId('mcp-connect-agents-header-button')).not.toBeInTheDocument();
			});
		});

		it('should open the Connect Agents modal when the button is clicked', async () => {
			mockAgentPages([createAgent({ id: '1', name: 'Agent 1' })]);

			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(getByTestId('mcp-connect-agents-header-button')).toBeVisible();
			});
			await userEvent.click(getByTestId('mcp-connect-agents-header-button'));

			expect(getByTestId('mcp-connect-agents-dialog-stub')).toBeInTheDocument();
		});
	});

	describe('Bulk agent actions', () => {
		beforeEach(() => {
			mockAgentPages([createAgent({ id: '1', name: 'Agent 1' })]);
			mcpStore.toggleAgentsMcpAccess.mockResolvedValue({
				updatedCount: 2,
				updatedIds: ['agent-1', 'agent-2'],
				unchangedIds: [],
			});
		});

		it('should bulk-enable the agents selected in the Connect Agents modal', async () => {
			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(getByTestId('mcp-connect-agents-header-button')).toBeVisible();
			});
			await userEvent.click(getByTestId('mcp-connect-agents-header-button'));
			mcpStore.fetchAgentsAvailableForMCPPage.mockClear();

			await userEvent.click(getByTestId('stub-enable-access'));

			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCPPage).toHaveBeenCalledWith(1, 10);
			});
			expect(mcpStore.toggleAgentsMcpAccess).toHaveBeenCalledWith(
				{ agentIds: ['agent-1', 'agent-2'] },
				true,
			);
		});

		it('should remove MCP access for bulk-selected agents and refresh the table', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();
			mcpStore.fetchAgentsAvailableForMCPPage.mockClear();

			await userEvent.click(getByTestId('agents-table-bulk-remove'));

			await waitFor(() => {
				expect(mcpStore.toggleAgentsMcpAccess).toHaveBeenCalledWith(
					{ agentIds: ['agent-1', 'agent-2'] },
					false,
				);
			});
			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCPPage).toHaveBeenCalled();
			});
		});
	});

	describe('Refresh button', () => {
		it('should refresh the agents list', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			mcpStore.fetchAgentsAvailableForMCPPage.mockClear();

			await userEvent.click(getByTestId('mcp-agents-refresh-button'));

			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCPPage).toHaveBeenCalled();
			});
		});
	});
});
