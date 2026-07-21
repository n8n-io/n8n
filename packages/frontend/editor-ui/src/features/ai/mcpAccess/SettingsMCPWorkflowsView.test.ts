import { nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import SettingsMCPWorkflowsView from '@/features/ai/mcpAccess/SettingsMCPWorkflowsView.vue';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { FrontendSettings } from '@n8n/api-types';
import {
	MCP_CONNECT_WORKFLOWS_MODAL_KEY,
	MCP_SETTINGS_VIEW,
} from '@/features/ai/mcpAccess/mcp.constants';
import { createWorkflow } from '@/features/ai/mcpAccess/mcp.test.utils';
import type { WorkflowListItem } from '@/Interface';

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

const createComponent = createComponentRenderer(SettingsMCPWorkflowsView, {
	global: {
		stubs: {
			WorkflowsTable: {
				inheritAttrs: true,
				template:
					'<div><button data-test-id="workflows-table-page-2" @click="$emit(\'update:options\', { page: 1, itemsPerPage: 10, sortBy: [] })">Page 2</button><button data-test-id="workflows-table-page-size-50" @click="$emit(\'update:options\', { page: 3, itemsPerPage: 50, sortBy: [] })">Page size 50</button><button data-test-id="workflows-table-bulk-remove" @click="$emit(\'bulkRemoveMcpAccess\', [\'wf-1\', \'wf-2\'])">Bulk remove</button>Workflows Table</div>',
			},
		},
	},
});

const workflowPage = (data: WorkflowListItem[] = []) => ({ data, count: data.length });

describe('SettingsMCPWorkflowsView', () => {
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

		mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(workflowPage());
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
		expect(mcpStore.fetchWorkflowsAvailableForMCP).not.toHaveBeenCalled();
	});

	describe('Workflow pagination', () => {
		beforeEach(() => {
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
		it('should not show the button when there are no workflows', async () => {
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(workflowPage());

			const { queryByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(queryByTestId('mcp-connect-workflows-header-button')).not.toBeInTheDocument();
			});
		});

		it('should open the Connect Workflows modal when the button is clicked', async () => {
			mcpStore.fetchWorkflowsAvailableForMCP.mockResolvedValue(
				workflowPage([createWorkflow({ id: '1', name: 'Workflow 1' })]),
			);

			const { getByTestId } = createComponent({ pinia });

			await waitFor(() => {
				expect(getByTestId('mcp-connect-workflows-header-button')).toBeVisible();
			});
			await userEvent.click(getByTestId('mcp-connect-workflows-header-button'));

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

	describe('Refresh button', () => {
		it('should refresh the workflows list', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			mcpStore.fetchWorkflowsAvailableForMCP.mockClear();

			await userEvent.click(getByTestId('mcp-workflows-refresh-button'));

			await waitFor(() => {
				expect(mcpStore.fetchWorkflowsAvailableForMCP).toHaveBeenCalled();
			});
		});
	});
});
