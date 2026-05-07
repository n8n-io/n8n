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
			setMcpAccessEnabled: vi.fn().mockImplementation(async () => {
				mockMcpStore.mcpAccessEnabled = true;
				return true;
			}),
		}) as MockMcpStore;
	});

	it('enables MCP, loads the prompt, and tracks enable telemetry when toggled on', async () => {
		const user = userEvent.setup();
		const { getByRole, findByText } = renderComponent();

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

	it('renders a compact access row and footer links', () => {
		const { getByTestId, getByText, queryByText } = renderComponent();

		expect(getByText('Enable MCP access')).toBeInTheDocument();
		expect(getByTestId('mcp-onboarding-footer')).toHaveTextContent(
			'You can disable this later from Settings > Instance-level MCP. Read more about this feature here.',
		);
		expect(getByTestId('mcp-onboarding-settings-link')).toHaveTextContent(
			'Settings > Instance-level MCP',
		);
		expect(getByTestId('mcp-onboarding-docs-link')).toHaveAttribute(
			'href',
			'https://docs.n8n.io/advanced-ai/mcp/accessing-n8n-mcp-server/',
		);
		expect(getByTestId('mcp-onboarding-docs-link')).toHaveTextContent('here');
		expect(getByTestId('mcp-onboarding-footer')).toHaveClass('size-xsmall');
		expect(
			queryByText('Toggle this on so clients can connect with OAuth.'),
		).not.toBeInTheDocument();
		expect(queryByText('MCP access is on for this instance.')).not.toBeInTheDocument();
		expect(
			queryByText('Enable MCP access above to reveal the setup prompt.'),
		).not.toBeInTheDocument();
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
	});

	it('copies the Claude server URL without prompt telemetry', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;

		const { getByTestId } = renderComponent();

		await user.click(getByTestId('mcp-onboarding-copy-server-url-button'));

		expect(mockClipboardCopy).toHaveBeenCalledWith('https://example.n8n.cloud/mcp-server/http');
		expect(mockExperimentStore.trackCopiedParameter).not.toHaveBeenCalled();
	});

	it('renders selectable agent options with logos', () => {
		mockMcpStore.mcpAccessEnabled = true;

		const { getByTestId } = renderComponent();

		for (const agent of ['claude', 'claude-code', 'codex', 'cursor', 'chatgpt']) {
			expect(getByTestId(`mcp-onboarding-agent-option-${agent}`)).toBeInTheDocument();
			expect(getByTestId(`mcp-onboarding-agent-logo-${agent}`)).toBeInTheDocument();
		}
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

		expect(mockExperimentStore.trackClientSelected).toHaveBeenCalledWith('claude_code');
		expect(container.textContent).toContain('claude mcp add --scope user --transport http n8n');
	});

	it('switches between Claude Code and Codex setup instructions', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;

		const { getByText, queryByTestId, container } = renderComponent();

		await user.click(getByText('Codex'));

		expect(mockExperimentStore.trackClientSelected).toHaveBeenCalledWith('codex');
		expect(container.textContent).toContain('Paste the prompt in Codex');
		expect(container.textContent).toContain('[mcp_servers.n8n]');
		expect(queryByTestId('mcp-onboarding-claude-server-url')).not.toBeInTheDocument();
	});

	it('switches to Claude setup instructions', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;

		const { getByText, container } = renderComponent();

		await user.click(getByText('Claude'));

		expect(mockExperimentStore.trackClientSelected).toHaveBeenCalledWith('claude');
		expect(container.textContent).toContain('Find the official n8n connector');
		expect(container.textContent).toContain('Paste the prompt in Claude');
		expect(container.textContent).toContain('Paste Server URL');
		expect(container.textContent).not.toContain('claude mcp add --scope user --transport http n8n');
	});

	it('switches to ChatGPT setup instructions', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;

		const { getByText, container } = renderComponent();

		await user.click(getByText('ChatGPT'));

		expect(mockExperimentStore.trackClientSelected).toHaveBeenCalledWith('chatgpt');
		expect(container.textContent).toContain('[mcp_servers.n8n]');
	});

	it('switches to Cursor setup instructions', async () => {
		const user = userEvent.setup();
		mockMcpStore.mcpAccessEnabled = true;

		const { getByText, container } = renderComponent();

		await user.click(getByText('Cursor'));

		expect(mockExperimentStore.trackClientSelected).toHaveBeenCalledWith('cursor');
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
});
