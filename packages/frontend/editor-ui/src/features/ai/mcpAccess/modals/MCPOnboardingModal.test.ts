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
	mcpManagedByEnv: boolean;
	currentUserMCPKey: MockApiKey;
	setMcpAccessEnabled: ReturnType<typeof vi.fn>;
	getOrCreateApiKey: ReturnType<typeof vi.fn>;
	generateNewApiKey: ReturnType<typeof vi.fn>;
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
			// Stub ElSwitch to avoid jsdom-triggered spurious model updates.
			ElSwitch: {
				props: ['modelValue', 'disabled', 'loading'],
				template:
					'<button type="button" role="switch" :data-test-id="$attrs[\'data-test-id\']" :aria-checked="!!modelValue" :disabled="disabled || loading" @click="$emit(\'update:modelValue\')" />',
			},
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
			mcpManagedByEnv: false,
			currentUserMCPKey: null,
			setMcpAccessEnabled: vi.fn().mockImplementation(async () => {
				mockMcpStore.mcpAccessEnabled = true;
				return true;
			}),
			getOrCreateApiKey: vi.fn().mockImplementation(async () => {
				mockMcpStore.currentUserMCPKey = { apiKey: 'n8n-test-token' };
				return mockMcpStore.currentUserMCPKey;
			}),
			generateNewApiKey: vi.fn().mockImplementation(async () => {
				mockMcpStore.currentUserMCPKey = { apiKey: 'n8n-rotated-token' };
				return mockMcpStore.currentUserMCPKey;
			}),
			resetCurrentUserMCPKey: vi.fn(),
		}) as MockMcpStore;
	});

	it('enables MCP, loads the prompt, and tracks enable telemetry when toggled on', async () => {
		const user = userEvent.setup();
		const { getByRole, findByText, queryByTestId } = renderComponent();

		await user.click(getByRole('switch'));

		expect(mockMcpStore.setMcpAccessEnabled).toHaveBeenCalledWith(true);
		expect(mockExperimentStore.trackEnableClicked).toHaveBeenCalledWith('first_open_modal');
		expect(mockMcpStore.getOrCreateApiKey).toHaveBeenCalled();
		expect(await findByText(/n8n-test-token/)).toBeInTheDocument();
		expect(mockExperimentStore.trackEnabled).toHaveBeenCalledWith('first_open_modal');
		expect(queryByTestId('mcp-onboarding-pending-notice')).not.toBeInTheDocument();
	});

	it('hides the prompt and shows the pending notice when toggled off', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;
		mockMcpStore.currentUserMCPKey = { apiKey: 'existing-token' };
		mockMcpStore.getOrCreateApiKey = vi.fn().mockImplementation(async () => {
			mockMcpStore.currentUserMCPKey = { apiKey: 'existing-token' };
			return mockMcpStore.currentUserMCPKey;
		});
		mockMcpStore.setMcpAccessEnabled = vi.fn().mockImplementation(async () => {
			mockMcpStore.mcpAccessEnabled = false;
			return false;
		});

		const { getByRole, findByText, getByTestId, queryByTestId } = renderComponent();

		await findByText(/existing-token/);
		await user.click(getByRole('switch'));

		expect(mockMcpStore.setMcpAccessEnabled).toHaveBeenCalledWith(false);
		expect(getByTestId('mcp-onboarding-pending-notice')).toBeInTheDocument();
		expect(queryByTestId('mcp-onboarding-client-setup')).not.toBeInTheDocument();
		expect(mockExperimentStore.trackEnableClicked).not.toHaveBeenCalled();
		expect(mockExperimentStore.trackEnabled).not.toHaveBeenCalled();
	});

	it('disables the toggle when MCP is managed by the environment', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpManagedByEnv = true;

		const { getByRole } = renderComponent();

		const toggle = getByRole('switch');
		expect(toggle).toBeDisabled();

		await user.click(toggle);

		expect(mockMcpStore.setMcpAccessEnabled).not.toHaveBeenCalled();
	});

	it('loads the prompt immediately when MCP is already enabled on mount', async () => {
		mockMcpStore.mcpAccessEnabled = true;
		mockMcpStore.currentUserMCPKey = null;
		mockMcpStore.getOrCreateApiKey = vi.fn().mockImplementation(async () => {
			mockMcpStore.currentUserMCPKey = { apiKey: 'existing-token' };
			return mockMcpStore.currentUserMCPKey;
		});

		const { findByText } = renderComponent();

		await waitFor(() => {
			expect(mockMcpStore.getOrCreateApiKey).toHaveBeenCalled();
		});
		expect(await findByText(/existing-token/)).toBeInTheDocument();
		expect(await findByText(/https:\/\/example\.n8n\.cloud\/mcp-server\/http/)).toBeInTheDocument();
	});

	it('auto-rotates and surfaces a fresh token when the existing token is redacted on mount', async () => {
		mockMcpStore.mcpAccessEnabled = true;
		mockMcpStore.currentUserMCPKey = null;
		mockMcpStore.getOrCreateApiKey = vi.fn().mockImplementation(async () => {
			mockMcpStore.currentUserMCPKey = { apiKey: 'n8n_******' };
			return mockMcpStore.currentUserMCPKey;
		});
		mockMcpStore.generateNewApiKey = vi.fn().mockImplementation(async () => {
			mockMcpStore.currentUserMCPKey = { apiKey: 'n8n-fresh-token' };
			return mockMcpStore.currentUserMCPKey;
		});

		const { findByText, queryByTestId, getByTestId } = renderComponent();

		await waitFor(() => {
			expect(mockMcpStore.getOrCreateApiKey).toHaveBeenCalled();
		});
		await waitFor(() => {
			expect(mockMcpStore.generateNewApiKey).toHaveBeenCalled();
		});
		expect(await findByText(/n8n-fresh-token/)).toBeInTheDocument();
		expect(queryByTestId('mcp-onboarding-redacted-notice')).not.toBeInTheDocument();
		expect(getByTestId('mcp-onboarding-copy-prompt-button')).toBeEnabled();
	});

	it('falls back to the recovery notice when auto-rotation fails for a redacted token', async () => {
		const error = new Error('rotation failed');
		mockMcpStore.mcpAccessEnabled = true;
		mockMcpStore.currentUserMCPKey = null;
		mockMcpStore.getOrCreateApiKey = vi.fn().mockImplementation(async () => {
			mockMcpStore.currentUserMCPKey = { apiKey: 'n8n_******' };
			return mockMcpStore.currentUserMCPKey;
		});
		mockMcpStore.generateNewApiKey = vi.fn().mockRejectedValue(error);

		const { findByText, getByTestId } = renderComponent();

		await waitFor(() => {
			expect(mockMcpStore.generateNewApiKey).toHaveBeenCalled();
		});
		expect(mockShowError).toHaveBeenCalledWith(error, 'Error updating MCP access');
		expect(
			await findByText(/Rotate the access token in Settings > MCP to copy a new setup prompt\./),
		).toBeInTheDocument();
		expect(getByTestId('mcp-onboarding-copy-prompt-button')).toBeDisabled();
	});

	it('shows an error toast and keeps the prompt unresolved if mount-time token loading fails', async () => {
		const error = new Error('token fetch failed');
		mockMcpStore.mcpAccessEnabled = true;
		mockMcpStore.getOrCreateApiKey = vi.fn().mockRejectedValue(error);

		const { findByText, getByTestId } = renderComponent();

		await waitFor(() => {
			expect(mockShowError).toHaveBeenCalledWith(error, 'Error updating MCP access');
		});
		expect(await findByText(/<your-access-token>/)).toBeInTheDocument();
		expect(getByTestId('mcp-onboarding-copy-prompt-button')).toBeDisabled();
	});

	it('preserves the resolved prompt if disabling MCP fails', async () => {
		const user = userEvent.setup();
		const error = new Error('disable failed');
		mockMcpStore.mcpAccessEnabled = true;
		mockMcpStore.getOrCreateApiKey = vi.fn().mockImplementation(async () => {
			mockMcpStore.currentUserMCPKey = { apiKey: 'existing-token' };
			return mockMcpStore.currentUserMCPKey;
		});
		mockMcpStore.setMcpAccessEnabled = vi.fn().mockRejectedValue(error);

		const { getByRole, findByText, queryByTestId, getByTestId } = renderComponent();

		await findByText(/existing-token/);
		await user.click(getByRole('switch'));

		await waitFor(() => {
			expect(mockShowError).toHaveBeenCalledWith(error, 'Error updating MCP access');
		});
		expect(queryByTestId('mcp-onboarding-pending-notice')).not.toBeInTheDocument();
		expect(await findByText(/existing-token/)).toBeInTheDocument();
		expect(getByTestId('mcp-onboarding-copy-prompt-button')).toBeEnabled();
	});

	it('switches between Claude Code and Codex setup instructions', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;
		mockMcpStore.currentUserMCPKey = { apiKey: 'n8n-test-token' };

		const { getByText, container } = renderComponent();

		await user.click(getByText('Codex'));

		expect(mockExperimentStore.trackClientSelected).toHaveBeenCalledWith('codex');
		expect(container.textContent).toContain('[mcp_servers.n8n]');
	});

	it('switches to Cursor setup instructions', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;
		mockMcpStore.currentUserMCPKey = { apiKey: 'n8n-test-token' };

		const { getByText, container } = renderComponent();

		await user.click(getByText('Cursor'));

		expect(mockExperimentStore.trackClientSelected).toHaveBeenCalledWith('cursor');
		expect(container.textContent).toContain('~/.cursor/mcp.json');
		expect(container.textContent).toContain('Bearer ${env:N8N_MCP_TOKEN}');
	});

	it('forwards prompt copy telemetry with the selected client', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;
		mockMcpStore.currentUserMCPKey = { apiKey: 'n8n-test-token' };

		const { getByText, getByTestId } = renderComponent();

		await user.click(getByText('Cursor'));
		await user.click(getByTestId('mcp-onboarding-copy-prompt-button'));

		expect(mockExperimentStore.trackCopiedParameter).toHaveBeenCalledWith(
			'first_open_modal',
			'cursor',
			'agent-prompt',
		);
	});
});
