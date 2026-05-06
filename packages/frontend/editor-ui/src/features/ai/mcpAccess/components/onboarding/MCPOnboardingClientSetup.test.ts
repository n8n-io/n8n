import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import MCPOnboardingClientSetup from './MCPOnboardingClientSetup.vue';

const mockClipboardCopy = vi.fn();

vi.mock('@/app/composables/useClipboard', () => ({
	useClipboard: () => ({
		copy: mockClipboardCopy,
		copied: { value: false },
		isSupported: { value: true },
	}),
}));

const renderComponent = createComponentRenderer(MCPOnboardingClientSetup, {
	props: {
		client: 'claude_code',
		serverUrl: 'https://example.n8n.cloud/mcp-server/http',
		accessToken: 'n8n-real-token',
		isTokenReady: true,
	},
});

describe('MCPOnboardingClientSetup', () => {
	beforeEach(() => {
		mockClipboardCopy.mockReset();
	});

	it('renders the Claude Code prompt with the resolved token, server URL, and literal placeholder', () => {
		const { container } = renderComponent();
		const text = container.textContent ?? '';

		expect(text).toContain('claude mcp add --scope user --transport http n8n');
		expect(text).toContain('https://example.n8n.cloud/mcp-server/http');
		expect(text).toContain('export N8N_MCP_TOKEN="n8n-real-token"');
		expect(text).toContain("'Authorization: Bearer ${N8N_MCP_TOKEN}'");
		expect(text).not.toContain('claude mcp list');
	});

	it('renders the Codex prompt with the TOML section and home-dir path', () => {
		const { container } = renderComponent({ props: { client: 'codex' } });
		const text = container.textContent ?? '';

		expect(text).toContain('[mcp_servers.n8n]');
		expect(text).toContain('~/.codex/config.toml');
		expect(text).toContain('bearer_token_env_var = "N8N_MCP_TOKEN"');
		expect(text).toContain('https://example.n8n.cloud/mcp-server/http');
	});

	it('renders the placeholder and disables copy when the token is not ready', () => {
		const { container, getByTestId } = renderComponent({
			props: { isTokenReady: false, accessToken: '' },
		});
		const text = container.textContent ?? '';

		expect(text).toContain('<your-access-token>');
		expect(getByTestId('mcp-onboarding-copy-prompt-button')).toBeDisabled();
	});

	it('copies the prompt body and emits copy event on click', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent();

		await user.click(getByTestId('mcp-onboarding-copy-prompt-button'));

		expect(mockClipboardCopy).toHaveBeenCalledTimes(1);
		const copiedText = mockClipboardCopy.mock.calls[0][0] as string;
		expect(copiedText).toContain('claude mcp add --scope user');
		expect(copiedText).toContain('n8n-real-token');

		expect(emitted('copy')).toEqual([['agent-prompt']]);
	});
});
