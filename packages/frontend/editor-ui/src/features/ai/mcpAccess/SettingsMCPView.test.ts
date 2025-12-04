import { createComponentRenderer } from '@/__tests__/render';
import SettingsMCPView from './SettingsMCPView.vue';
import { vi } from 'vitest';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useMCPStore } from './mcp.store';

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showError: vi.fn(),
	}),
}));

const renderComponent = createComponentRenderer(SettingsMCPView, {
	global: {
		stubs: {
			MCPConnectionInstructions: {
				template: '<div data-test-id="mcp-connection-instructions" />',
			},
		},
	},
});

let pinia: ReturnType<typeof createTestingPinia>;
let mcpStore: ReturnType<typeof mockedStore<typeof useMCPStore>>;
let rootStore: ReturnType<typeof mockedStore<typeof useRootStore>>;
let userStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;
let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

describe('SettingsMCPView', () => {
	beforeEach(() => {
		pinia = createTestingPinia();
		rootStore = mockedStore(useRootStore);
		userStore = mockedStore(useUsersStore);
		workflowsStore = mockedStore(useWorkflowsStore);
		mcpStore = mockedStore(useMCPStore);

		mcpStore.mcpAccessEnabled = false;
		rootStore.urlBaseEditor = 'http://localhost:5678';
		userStore.isInstanceOwner = true;
		workflowsStore.updateWorkflowSetting = vi.fn();
		mcpStore.fetchWorkflowsAvailableForMCP = vi.fn().mockResolvedValue([]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test('always renders the MCP access toggle', async () => {
		const { getByTestId, queryByTestId } = renderComponent({ pinia });
		await waitAllPromises();

		expect(getByTestId('mcp-access-toggle')).toBeInTheDocument();
		expect(getByTestId('mcp-access-toggle')).not.toHaveClass('is-disabled');
		expect(queryByTestId('mcp-enabled-section')).not.toBeInTheDocument();
	});

	test('renders the enabled section only when MCP access is enabled', async () => {
		mcpStore.mcpAccessEnabled = true;

		const { getByTestId } = renderComponent({ pinia });
		await waitAllPromises();

		expect(getByTestId('mcp-access-toggle')).toBeInTheDocument();
		expect(getByTestId('mcp-enabled-section')).toBeInTheDocument();
	});

	test('disables the MCP access toggle for non-owners', async () => {
		userStore.isInstanceOwner = false;

		const { getByTestId } = renderComponent({ pinia });
		await waitAllPromises();

		const toggle = getByTestId('mcp-access-toggle');

		expect(toggle).toHaveClass('is-disabled');
	});
});
