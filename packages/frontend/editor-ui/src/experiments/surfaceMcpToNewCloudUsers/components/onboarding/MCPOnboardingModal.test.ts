import { createComponentRenderer } from '@/__tests__/render';
import { SURFACE_MCP_ONBOARDING_MODAL_KEY } from '@/experiments/surfaceMcpToNewCloudUsers/constants';
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
	trackEnableFailed: vi.fn(),
	trackDismissed: vi.fn(),
	trackClientSelected: vi.fn(),
	trackSetupShown: vi.fn(),
	trackCopiedParameter: vi.fn(),
	dismissFirstOpenModal: vi.fn(),
};

vi.mock('@/experiments/surfaceMcpToNewCloudUsers/stores/surfaceMcpToNewCloudUsers.store', () => ({
	useSurfaceMcpToNewCloudUsersStore: () => mockExperimentStore,
}));

type MockMcpStore = {
	mcpAccessEnabled: boolean;
	mcpManagedByEnv: boolean;
	setMcpAccessEnabled: ReturnType<typeof vi.fn>;
};

let mockMcpStore: MockMcpStore;

vi.mock('@/features/ai/mcpAccess/mcp.store', () => ({
	useMCPStore: () => mockMcpStore,
}));

const ModalStub = defineComponent({
	props: ['name', 'eventBus'],
	template: `
		<div :data-test-id="name">
			<slot name="content" />
			<slot name="footer" />
			<button data-test-id="mcp-onboarding-generic-close" @click="eventBus.emit('closed')" />
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
			setMcpAccessEnabled: vi.fn().mockImplementation(async () => {
				mockMcpStore.mcpAccessEnabled = true;
				return true;
			}),
		}) as MockMcpStore;
	});

	it('enables MCP, loads the prompt, and tracks enable telemetry when toggled on', async () => {
		const user = userEvent.setup();
		const { getByRole, findByText, getByTestId } = renderComponent();

		expect(getByTestId(SURFACE_MCP_ONBOARDING_MODAL_KEY)).toBeInTheDocument();
		await user.click(getByRole('switch'));

		expect(mockMcpStore.setMcpAccessEnabled).toHaveBeenCalledWith(true);
		expect(mockExperimentStore.trackEnableClicked).toHaveBeenCalledWith('first_open_modal');
		expect(await findByText(/Find the official n8n connector/)).toBeInTheDocument();
		expect(mockExperimentStore.trackEnabled).toHaveBeenCalledWith('first_open_modal');
	});

	it('hides the prompt when toggled off', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;
		mockMcpStore.setMcpAccessEnabled = vi.fn().mockImplementation(async () => {
			mockMcpStore.mcpAccessEnabled = false;
			return false;
		});

		const { getByRole, findByText, queryByTestId } = renderComponent();

		await findByText(/Find the official n8n connector/);
		await user.click(getByRole('switch'));

		expect(mockMcpStore.setMcpAccessEnabled).toHaveBeenCalledWith(false);
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

	it('renders the prompt immediately when MCP is already enabled on mount', async () => {
		mockMcpStore.mcpAccessEnabled = true;

		const { findByTestId, findByText, getByTestId } = renderComponent();

		expect(await findByText(/Find the official n8n connector/)).toBeInTheDocument();
		expect(await findByText('https://example.n8n.cloud/mcp-server/http')).toBeInTheDocument();
		expect(await findByText('Paste the prompt in Claude')).toBeInTheDocument();
		expect(await findByText('Paste Server URL')).toBeInTheDocument();
		expect(await findByTestId('mcp-onboarding-claude-server-url')).toBeInTheDocument();
		expect(getByTestId('mcp-onboarding-copy-server-url-button')).toBeEnabled();
		expect(mockExperimentStore.trackSetupShown).toHaveBeenCalledWith(
			'first_open_modal',
			'claude',
			'prompt',
		);
	});

	it('copies the Claude server URL with server-url telemetry', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;

		const { getByTestId } = renderComponent();

		await user.click(getByTestId('mcp-onboarding-copy-server-url-button'));

		expect(mockClipboardCopy).toHaveBeenCalledWith('https://example.n8n.cloud/mcp-server/http');
		expect(mockExperimentStore.trackCopiedParameter).toHaveBeenCalledWith(
			'first_open_modal',
			'claude',
			'server-url',
		);
	});

	it('preserves the resolved prompt if disabling MCP fails', async () => {
		const user = userEvent.setup();
		const error = new Error('disable failed');
		mockMcpStore.mcpAccessEnabled = true;
		mockMcpStore.setMcpAccessEnabled = vi.fn().mockRejectedValue(error);

		const { getByRole, findByText, getByTestId } = renderComponent();

		await findByText(/Find the official n8n connector/);
		await user.click(getByRole('switch'));

		await waitFor(() => {
			expect(mockShowError).toHaveBeenCalledWith(error, 'Error updating MCP access');
		});
		expect(await findByText(/Find the official n8n connector/)).toBeInTheDocument();
		expect(getByTestId('mcp-onboarding-copy-prompt-button')).toBeEnabled();
	});

	it('switches to Claude Code setup instructions', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;

		const { getByText, container } = renderComponent();

		await user.click(getByText('Claude Code'));

		expect(mockExperimentStore.trackClientSelected).toHaveBeenCalledWith(
			'first_open_modal',
			'claude_code',
		);
		expect(mockExperimentStore.trackSetupShown).toHaveBeenCalledWith(
			'first_open_modal',
			'claude_code',
			'prompt',
		);
		expect(container.textContent).toContain('claude mcp add --scope user --transport http n8n');
	});

	it('switches between Claude Code and Codex setup instructions', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;

		const { getByText, queryByTestId, container } = renderComponent();

		await user.click(getByText('Codex'));

		expect(mockExperimentStore.trackClientSelected).toHaveBeenCalledWith(
			'first_open_modal',
			'codex',
		);
		expect(container.textContent).toContain('Paste the prompt in Codex');
		expect(container.textContent).toContain('[mcp_servers.n8n]');
		expect(queryByTestId('mcp-onboarding-claude-server-url')).not.toBeInTheDocument();
	});

	it('switches to Claude setup instructions', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;

		const { getByText, container } = renderComponent();

		await user.click(getByText('Claude'));

		expect(mockExperimentStore.trackClientSelected).not.toHaveBeenCalled();
		expect(container.textContent).toContain('Find the official n8n connector');
		expect(container.textContent).toContain('Paste the prompt in Claude');
		expect(container.textContent).toContain('Paste Server URL');
		expect(container.textContent).not.toContain('claude mcp add --scope user --transport http n8n');
	});

	it('switches to ChatGPT setup instructions', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;

		const { getByText, getByTestId, queryByTestId, container } = renderComponent();

		await user.click(getByText('ChatGPT'));

		expect(mockExperimentStore.trackClientSelected).toHaveBeenCalledWith(
			'first_open_modal',
			'chatgpt',
		);
		expect(mockExperimentStore.trackSetupShown).toHaveBeenCalledWith(
			'first_open_modal',
			'chatgpt',
			'chatgpt_custom_app',
		);
		expect(getByTestId('mcp-onboarding-chatgpt-developer-mode-step')).toBeInTheDocument();
		expect(getByTestId('mcp-onboarding-chatgpt-custom-app-step')).toBeInTheDocument();
		expect(container.textContent).toContain('Enable developer mode in ChatGPT');
		expect(container.textContent).toContain('Turn on developer mode.');
		expect(container.textContent).toContain('App name');
		expect(container.textContent).toContain('n8n');
		expect(container.textContent).toContain('https://example.n8n.cloud/mcp-server/http');
		expect(container.textContent).not.toContain('After you turn it on');
		expect(container.textContent).not.toContain('Click Create, then use these values:');
		expect(container.textContent).not.toContain('Description');
		expect(container.textContent).not.toContain(
			'Connect ChatGPT to this n8n instance through MCP.',
		);
		expect(container.textContent).not.toContain('complete the n8n OAuth flow');
		expect(container.textContent).not.toContain('[mcp_servers.n8n]');
		expect(queryByTestId('mcp-onboarding-client-setup')).not.toBeInTheDocument();
		expect(queryByTestId('mcp-onboarding-claude-server-url')).not.toBeInTheDocument();
		expect(queryByTestId('mcp-onboarding-copy-prompt-button')).not.toBeInTheDocument();

		await user.click(getByTestId('mcp-onboarding-copy-chatgpt-server-url-button'));

		expect(mockClipboardCopy).toHaveBeenCalledWith('https://example.n8n.cloud/mcp-server/http');
		expect(mockExperimentStore.trackCopiedParameter).toHaveBeenCalledWith(
			'first_open_modal',
			'chatgpt',
			'server-url',
		);

		await user.click(getByTestId('mcp-onboarding-copy-chatgpt-app-name-button'));

		expect(mockClipboardCopy).toHaveBeenCalledWith('n8n');
		expect(mockExperimentStore.trackCopiedParameter).toHaveBeenCalledWith(
			'first_open_modal',
			'chatgpt',
			'chatgpt-app-name',
		);
	});

	it('switches to Cursor setup instructions', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;

		const { getByText, container } = renderComponent();

		await user.click(getByText('Cursor'));

		expect(mockExperimentStore.trackClientSelected).toHaveBeenCalledWith(
			'first_open_modal',
			'cursor',
		);
		expect(container.textContent).toContain('~/.cursor/mcp.json');
		expect(container.textContent).toContain('complete the n8n OAuth flow');
		expect(container.textContent).not.toContain('Authorization');
	});

	it('forwards prompt copy telemetry with the selected client', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;

		const { getByText, getByTestId } = renderComponent();

		await user.click(getByText('Cursor'));
		await user.click(getByTestId('mcp-onboarding-copy-prompt-button'));

		expect(mockExperimentStore.trackCopiedParameter).toHaveBeenCalledWith(
			'first_open_modal',
			'cursor',
			'agent-prompt',
		);
	});

	it('tracks tile modal close as a dismissal when MCP remains disabled', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderComponent({ props: { data: { surface: 'tile' } } });

		await user.click(getByTestId('mcp-onboarding-generic-close'));

		expect(mockExperimentStore.trackDismissed).toHaveBeenCalledWith('tile', {
			activeClient: 'claude',
			enabledDuringThisOpen: false,
			mcpAccessEnabled: false,
		});
		expect(mockExperimentStore.dismissFirstOpenModal).not.toHaveBeenCalled();
	});
});
