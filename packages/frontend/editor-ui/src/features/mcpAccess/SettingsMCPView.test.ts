import { screen } from '@testing-library/vue';
import { renderComponent } from '@/__tests__/render';
import SettingsMCPView from './SettingsMCPView.vue';
import { vi } from 'vitest';

const fetchWorkflowsAvailableForMCP = vi.fn();
const setMcpAccessEnabled = vi.fn();

const mcpStoreMock = {
	mcpAccessEnabled: false,
	fetchWorkflowsAvailableForMCP,
	setMcpAccessEnabled,
};

vi.mock('@/features/mcpAccess/mcp.store', () => ({
	useMCPStore: vi.fn(() => mcpStoreMock),
}));

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn(() => ({
		isInstanceOwner: true,
	})),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		urlBaseEditor: 'http://localhost:5678',
	})),
}));

vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		updateWorkflowSetting: vi.fn(),
	})),
}));

vi.mock('@/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
	}),
}));

vi.mock('@/composables/useToast', () => ({
	useToast: () => ({
		showError: vi.fn(),
	}),
}));

const renderSettingsMCPView = () =>
	renderComponent(SettingsMCPView, {
		global: {
			stubs: {
				MCPConnectionInstructions: {
					template: '<div data-test-id="mcp-connection-instructions" />',
				},
			},
		},
	});

describe('SettingsMCPView', () => {
	beforeEach(() => {
		mcpStoreMock.mcpAccessEnabled = false;
		fetchWorkflowsAvailableForMCP.mockResolvedValue([]);
		setMcpAccessEnabled.mockResolvedValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test('always renders the MCP access toggle', async () => {
		renderSettingsMCPView();

		expect(await screen.findByTestId('mcp-access-toggle')).toBeInTheDocument();
		expect(screen.queryByTestId('mcp-enabled-section')).not.toBeInTheDocument();
	});

	test('renders the enabled section only when MCP access is enabled', async () => {
		mcpStoreMock.mcpAccessEnabled = true;

		renderSettingsMCPView();

		expect(await screen.findByTestId('mcp-access-toggle')).toBeInTheDocument();
		expect(await screen.findByTestId('mcp-enabled-section')).toBeInTheDocument();
	});
});
