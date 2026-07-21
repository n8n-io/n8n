import { nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import SettingsMCPAgentsView from '@/features/ai/mcpAccess/SettingsMCPAgentsView.vue';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { FrontendSettings } from '@n8n/api-types';
import {
	MCP_CONNECT_AGENTS_MODAL_KEY,
	MCP_SETTINGS_VIEW,
} from '@/features/ai/mcpAccess/mcp.constants';
import type { Agent } from '@/features/agents/agent.types';

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

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
	}),
}));

let pinia: ReturnType<typeof createTestingPinia>;
let mcpStore: MockedStore<typeof useMCPStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let uiStore: MockedStore<typeof useUIStore>;

const createComponent = createComponentRenderer(SettingsMCPAgentsView, {
	global: {
		stubs: {
			AgentsTable: {
				inheritAttrs: true,
				template:
					'<div><button data-test-id="agents-table-page-2" @click="$emit(\'update:options\', { page: 1, itemsPerPage: 10, sortBy: [] })">Page 2</button><button data-test-id="agents-table-page-size-50" @click="$emit(\'update:options\', { page: 3, itemsPerPage: 50, sortBy: [] })">Page size 50</button><button data-test-id="agents-table-bulk-remove" @click="$emit(\'bulkRemoveMcpAccess\', [\'agent-1\', \'agent-2\'])">Bulk remove</button>Agents Table</div>',
			},
		},
	},
});

const createAgent = (overrides: Partial<Agent> = {}): Agent =>
	({
		id: 'agent-1',
		name: 'My Agent',
		projectId: 'project-1',
		availableInMCP: true,
		isCompiled: false,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		versionId: 'v1',
		activeVersionId: null,
		tools: {},
		skills: {},
		activeVersion: null,
		...overrides,
	}) as Agent;

const agentPage = (data: Agent[] = []) => ({ data, count: data.length });

describe('SettingsMCPAgentsView', () => {
	beforeEach(() => {
		pinia = createTestingPinia();
		mcpStore = mockedStore(useMCPStore);
		settingsStore = mockedStore(useSettingsStore);
		uiStore = mockedStore(useUIStore);

		settingsStore.settings = {
			enterprise: {},
		} as FrontendSettings;

		settingsStore.moduleSettings = {
			mcp: {
				mcpAccessEnabled: true,
				mcpManagedByEnv: false,
			},
		};
		settingsStore.isModuleActive.mockReturnValue(true);

		mcpStore.fetchAgentsAvailableForMCP.mockResolvedValue(agentPage());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should redirect to the MCP settings view when MCP is disabled', async () => {
		settingsStore.moduleSettings = {
			mcp: {
				mcpAccessEnabled: false,
				mcpManagedByEnv: false,
			},
		};

		createComponent({ pinia });
		await nextTick();

		expect(routerReplace).toHaveBeenCalledWith({ name: MCP_SETTINGS_VIEW });
		expect(mcpStore.fetchAgentsAvailableForMCP).not.toHaveBeenCalled();
	});

	it('should redirect to the MCP settings view when the agents module is inactive', async () => {
		settingsStore.isModuleActive.mockReturnValue(false);

		createComponent({ pinia });
		await nextTick();

		expect(routerReplace).toHaveBeenCalledWith({ name: MCP_SETTINGS_VIEW });
		expect(mcpStore.fetchAgentsAvailableForMCP).not.toHaveBeenCalled();
	});

	describe('Agent pagination', () => {
		beforeEach(() => {
			mcpStore.fetchAgentsAvailableForMCP.mockResolvedValue(
				agentPage([createAgent({ id: '1', name: 'Agent 1' })]),
			);
		});

		it('should fetch the first agent page on mount', async () => {
			createComponent({ pinia });

			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCP).toHaveBeenCalledWith(1, 10);
			});
		});

		it('should fetch the selected agent page when table options change', async () => {
			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCP).toHaveBeenCalledWith(1, 10);
			});
			mcpStore.fetchAgentsAvailableForMCP.mockClear();

			await userEvent.click(getByTestId('agents-table-page-2'));

			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCP).toHaveBeenCalledWith(2, 10);
			});
		});

		it('should reset to first page when agent table page size changes', async () => {
			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCP).toHaveBeenCalledWith(1, 10);
			});
			mcpStore.fetchAgentsAvailableForMCP.mockClear();

			await userEvent.click(getByTestId('agents-table-page-size-50'));

			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCP).toHaveBeenCalledWith(1, 50);
			});
		});
	});

	describe('Connect Agents button', () => {
		it('should not show the button when there are no agents', async () => {
			mcpStore.fetchAgentsAvailableForMCP.mockResolvedValue(agentPage());

			const { queryByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(queryByTestId('mcp-connect-agents-header-button')).not.toBeInTheDocument();
			});
		});

		it('should open the Connect Agents modal when the button is clicked', async () => {
			mcpStore.fetchAgentsAvailableForMCP.mockResolvedValue(
				agentPage([createAgent({ id: '1', name: 'Agent 1' })]),
			);

			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(getByTestId('mcp-connect-agents-header-button')).toBeVisible();
			});
			await userEvent.click(getByTestId('mcp-connect-agents-header-button'));

			expect(uiStore.openModalWithData).toHaveBeenCalledWith(
				expect.objectContaining({
					name: MCP_CONNECT_AGENTS_MODAL_KEY,
					data: expect.objectContaining({
						onEnableMcpAccess: expect.any(Function),
					}),
				}),
			);
		});
	});

	describe('Bulk agent actions', () => {
		beforeEach(() => {
			mcpStore.fetchAgentsAvailableForMCP.mockResolvedValue(
				agentPage([createAgent({ id: '1', name: 'Agent 1' })]),
			);
			mcpStore.toggleAgentsMcpAccess.mockResolvedValue({
				updatedCount: 2,
				unchangedCount: 0,
				skippedCount: 0,
				failedCount: 0,
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

			const modalCall = vi.mocked(uiStore.openModalWithData).mock.calls.at(-1)?.[0] as unknown as {
				data: { onEnableMcpAccess: (agentIds: string[]) => Promise<void> };
			};
			mcpStore.fetchAgentsAvailableForMCP.mockClear();

			await modalCall.data.onEnableMcpAccess(['agent-1', 'agent-2']);

			expect(mcpStore.toggleAgentsMcpAccess).toHaveBeenCalledWith(
				{ agentIds: ['agent-1', 'agent-2'] },
				true,
			);
			expect(mcpStore.fetchAgentsAvailableForMCP).toHaveBeenCalledWith(1, 10);
		});

		it('should remove MCP access for bulk-selected agents and refresh the table', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();
			mcpStore.fetchAgentsAvailableForMCP.mockClear();

			await userEvent.click(getByTestId('agents-table-bulk-remove'));

			await waitFor(() => {
				expect(mcpStore.toggleAgentsMcpAccess).toHaveBeenCalledWith(
					{ agentIds: ['agent-1', 'agent-2'] },
					false,
				);
			});
			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCP).toHaveBeenCalled();
			});
		});
	});

	describe('Refresh button', () => {
		it('should refresh the agents list', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			mcpStore.fetchAgentsAvailableForMCP.mockClear();

			await userEvent.click(getByTestId('mcp-agents-refresh-button'));

			await waitFor(() => {
				expect(mcpStore.fetchAgentsAvailableForMCP).toHaveBeenCalled();
			});
		});
	});
});
