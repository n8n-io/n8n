import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { defineComponent, reactive } from 'vue';
import MCPOnboardingModal from './MCPOnboardingModal.vue';

const mockClipboardCopy = vi.fn();
const mockShowError = vi.fn();

vi.mock('@/app/composables/useClipboard', () => ({
	useClipboard: () => ({
		copy: mockClipboardCopy,
		copied: { value: false },
		isSupported: { value: true },
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showError: mockShowError,
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		urlBaseEditor: 'https://example.n8n.cloud/',
	}),
}));

const mockExperimentStore = {
	trackEnableClicked: vi.fn(),
	trackEnabled: vi.fn(),
	trackDismissed: vi.fn(),
	trackClientSelected: vi.fn(),
	trackCopiedParameter: vi.fn(),
	dismissFirstOpenModal: vi.fn(),
};

vi.mock('@/experiments/surfaceMcpToNewCloudUsers/stores/surfaceMcpToNewCloudUsers.store', () => ({
	useSurfaceMcpToNewCloudUsersStore: () => mockExperimentStore,
}));

type MockApiKey = { apiKey: string } | null;

type MockMcpStore = {
	mcpAccessEnabled: boolean;
	currentUserMCPKey: MockApiKey;
	setMcpAccessEnabled: ReturnType<typeof vi.fn>;
	getOrCreateApiKey: ReturnType<typeof vi.fn>;
	resetCurrentUserMCPKey: ReturnType<typeof vi.fn>;
};

let mockMcpStore: MockMcpStore;

vi.mock('@/features/ai/mcpAccess/mcp.store', () => ({
	useMCPStore: () => mockMcpStore,
}));

const ModalStub = defineComponent({
	props: ['name'],
	template: `
		<div :data-test-id="name">
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
});

const renderComponent = createComponentRenderer(MCPOnboardingModal, {
	props: {
		data: {
			surface: 'first_open_modal',
		},
	},
	global: {
		stubs: {
			Modal: ModalStub,
		},
	},
});

describe('MCPOnboardingModal', () => {
	beforeEach(() => {
		mockClipboardCopy.mockReset();
		mockShowError.mockReset();
		vi.clearAllMocks();

		mockMcpStore = reactive({
			mcpAccessEnabled: false,
			currentUserMCPKey: null,
			setMcpAccessEnabled: vi.fn().mockImplementation(async () => {
				mockMcpStore.mcpAccessEnabled = true;
				return true;
			}),
			getOrCreateApiKey: vi.fn().mockImplementation(async () => {
				mockMcpStore.currentUserMCPKey = { apiKey: 'n8n-test-token' };
				return mockMcpStore.currentUserMCPKey;
			}),
			resetCurrentUserMCPKey: vi.fn(),
		}) as MockMcpStore;
	});

	it('enables MCP and loads connection details inline', async () => {
		const user = userEvent.setup();
		const { getByRole, findByDisplayValue } = renderComponent();

		await user.click(getByRole('button', { name: 'Enable MCP access' }));

		expect(mockMcpStore.setMcpAccessEnabled).toHaveBeenCalledWith(true);
		expect(mockExperimentStore.trackEnableClicked).toHaveBeenCalledWith('first_open_modal');
		expect(mockMcpStore.getOrCreateApiKey).toHaveBeenCalled();
		expect(await findByDisplayValue('n8n-test-token')).toBeInTheDocument();
		expect(mockExperimentStore.trackEnabled).toHaveBeenCalledWith('first_open_modal');
	});

	it('loads connection details immediately when MCP is already enabled', async () => {
		mockMcpStore.mcpAccessEnabled = true;
		mockMcpStore.currentUserMCPKey = null;
		mockMcpStore.getOrCreateApiKey = vi.fn().mockImplementation(async () => {
			mockMcpStore.currentUserMCPKey = { apiKey: 'existing-token' };
			return mockMcpStore.currentUserMCPKey;
		});

		renderComponent();

		await waitFor(() => {
			expect(mockMcpStore.getOrCreateApiKey).toHaveBeenCalled();
		});
	});

	it('switches between Claude Code and Codex setup instructions', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;
		mockMcpStore.currentUserMCPKey = { apiKey: 'n8n-test-token' };

		const { getByText } = renderComponent();

		await user.click(getByText('Codex'));

		expect(mockExperimentStore.trackClientSelected).toHaveBeenCalledWith('codex');
		expect(getByText('Create or update `.codex/config.toml`.')).toBeInTheDocument();
	});
});
