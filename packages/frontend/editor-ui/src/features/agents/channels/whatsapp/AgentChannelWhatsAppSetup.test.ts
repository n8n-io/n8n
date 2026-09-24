import { createComponentRenderer } from '@/__tests__/render';
import { configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import AgentChannelWhatsAppSetup from './AgentChannelWhatsAppSetup.vue';

// Components use `data-testid`; the global setup configures `data-test-id`.
configure({ testIdAttribute: 'data-testid' });

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const { getUrlBaseWebhook } = vi.hoisted(() => ({
	getUrlBaseWebhook: vi.fn(() => 'https://n8n.example.com/'),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
		get urlBaseWebhook() {
			return getUrlBaseWebhook();
		},
	}),
}));

// The real N8nStepper already renders every step's slot content at once (it's a
// vertical list, not a wizard), but WhatsApp's two steps ('webhook', 'credential')
// don't match the single hardcoded id the Telegram test's stub exposes. Keep the
// same "stub N8nStepper, keep the rest of the design system real" approach, just
// looping over the real `steps` prop so both steps' content is inspectable.
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	N8nStepper: {
		props: ['steps'],
		template: `<div><template v-for="step in steps" :key="step.id"><slot :step="step" /></template></div>`,
	},
}));

const { getWhatsAppVerifyToken } = vi.hoisted(() => ({
	getWhatsAppVerifyToken: vi.fn(),
}));

vi.mock('../../composables/useAgentApi', () => ({
	getWhatsAppVerifyToken,
}));

vi.mock('../../components/AgentIntegrationCredentialConnection.vue', () => ({
	default: {
		name: 'AgentIntegrationCredentialConnection',
		// `type: Boolean` matters: only a Boolean-typed prop gets Vue's special
		// value-less-attribute casting (`show-connect-button` -> `true`) — a
		// bare `props: ['showConnectButton']` would receive the literal `""`
		// instead, which is falsy and silently hides the button.
		props: { showConnectButton: { type: Boolean, default: false } },
		emits: ['connect'],
		template: `<div data-testid="whatsapp-credential-connection-stub">
			<button
				v-if="showConnectButton"
				data-testid="whatsapp-credential-connection-stub-connect"
				@click="$emit('connect')"
			/>
		</div>`,
	},
}));

const renderComponent = createComponentRenderer(AgentChannelWhatsAppSetup);

const baseProps = {
	mode: 'setup' as const,
	integration: {
		type: 'whatsapp',
		label: 'WhatsApp',
		icon: 'whatsapp',
		credentialTypes: ['whatsAppApi'],
	},
	credentials: [],
	credentialPermissions: { create: true },
	agentName: 'Agent',
	projectId: 'project-abc',
	agentId: 'agent-xyz',
};

const expectedWebhookUrl =
	'https://n8n.example.com/rest/projects/project-abc/agents/v2/agent-xyz/webhooks/whatsapp';

describe('AgentChannelWhatsAppSetup', () => {
	beforeEach(() => {
		getWhatsAppVerifyToken.mockReset();
		getWhatsAppVerifyToken.mockResolvedValue({ verifyToken: 'verify-token-123' });
		getUrlBaseWebhook.mockReset();
		getUrlBaseWebhook.mockReturnValue('https://n8n.example.com/');
		Object.defineProperty(window.navigator, 'clipboard', {
			value: { writeText: vi.fn().mockResolvedValue(undefined) },
			configurable: true,
		});
	});

	afterEach(() => {
		Reflect.deleteProperty(window.navigator, 'clipboard');
	});

	describe('webhook URL', () => {
		it('renders the URL built from projectId, agentId, and the root store base webhook URL', async () => {
			const { getByTestId } = renderComponent({ props: baseProps });
			await flushPromises();

			const input = getByTestId('whatsapp-webhook-url') as HTMLInputElement;
			expect(input.value).toBe(expectedWebhookUrl);
		});

		it('copies the webhook URL to the clipboard', async () => {
			const { getByTestId } = renderComponent({ props: baseProps });
			await flushPromises();

			getByTestId('whatsapp-copy-webhook-url').click();
			await flushPromises();

			expect(navigator.clipboard.writeText).toHaveBeenCalledExactlyOnceWith(expectedWebhookUrl);
		});

		it('warns instead of showing the normal hint when the callback URL is not HTTPS', async () => {
			getUrlBaseWebhook.mockReturnValue('http://localhost:5678/');
			const { getByTestId, queryByText } = renderComponent({ props: baseProps });
			await flushPromises();

			expect(getByTestId('whatsapp-webhook-https-warning')).toBeInTheDocument();
			expect(queryByText('agents.channels.whatsapp.setup.webhookHint')).toBeNull();
		});
	});

	describe('create Meta app step', () => {
		it('links to the Meta App Dashboard, opening in a new tab', async () => {
			const { getByTestId } = renderComponent({ props: baseProps });
			await flushPromises();

			const link = getByTestId('whatsapp-app-dashboard-link');
			expect(link.getAttribute('href')).toBe('https://developers.facebook.com/apps');
			expect(link.getAttribute('target')).toBe('_blank');
		});
	});

	describe('verify token', () => {
		it('fetches and renders the verify token on mount', async () => {
			const { getByTestId } = renderComponent({ props: baseProps });
			await flushPromises();

			expect(getWhatsAppVerifyToken).toHaveBeenCalledExactlyOnceWith(
				{},
				'project-abc',
				'agent-xyz',
			);
			const input = getByTestId('whatsapp-verify-token') as HTMLInputElement;
			expect(input.value).toBe('verify-token-123');
		});

		it('leaves the field blank without crashing when the fetch fails', async () => {
			getWhatsAppVerifyToken.mockReset().mockRejectedValueOnce(new Error('network error'));

			const { getByTestId } = renderComponent({ props: baseProps });
			await flushPromises();

			const input = getByTestId('whatsapp-verify-token') as HTMLInputElement;
			expect(input.value).toBe('');
		});
	});

	describe('credential connection state', () => {
		it('renders the credential connection component when not connected', async () => {
			const { getByTestId } = renderComponent({ props: { ...baseProps, connected: false } });
			await flushPromises();

			expect(getByTestId('whatsapp-credential-connection-stub')).toBeInTheDocument();
		});

		it('renders the connected description instead of the credential connection when connected', async () => {
			const { getByText, queryByTestId } = renderComponent({
				props: {
					...baseProps,
					connected: true,
					connectedDescription: 'Connected to +1 555 0100',
				},
			});
			await flushPromises();

			expect(getByText('Connected to +1 555 0100')).toBeInTheDocument();
			expect(queryByTestId('whatsapp-credential-connection-stub')).toBeNull();
		});
	});

	describe('connecting via the explicit connect button', () => {
		// WhatsApp now has the same explicit connect step Telegram/Discord/Slack
		// use, rather than connecting automatically the moment a credential is
		// picked — see the module doc on `steps` above.
		it('shows a connect button during setup and emits connect when clicked', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: { ...baseProps, mode: 'setup', connected: false },
			});
			await flushPromises();

			getByTestId('whatsapp-credential-connection-stub-connect').click();

			expect(emitted().connect).toHaveLength(1);
		});

		it('does not show a connect button in edit mode', async () => {
			const { queryByTestId } = renderComponent({
				props: { ...baseProps, mode: 'edit', connected: false },
			});
			await flushPromises();

			expect(queryByTestId('whatsapp-credential-connection-stub-connect')).toBeNull();
		});
	});

	describe('error message state', () => {
		it('renders the error message without an edit link when no credential is selected', async () => {
			const { getByText, queryByText } = renderComponent({
				props: { ...baseProps, errorMessage: 'Something went wrong' },
			});
			await flushPromises();

			expect(getByText('Something went wrong')).toBeInTheDocument();
			expect(queryByText('agents.builder.addTrigger.editCredential')).toBeNull();
		});

		it('renders an edit-credential link that emits edit when a credential is selected and the error is not a conflict', async () => {
			const { container, getByText, emitted } = renderComponent({
				props: {
					...baseProps,
					modelValue: 'whatsapp-credential-id',
					errorMessage: 'Something went wrong',
					errorIsConflict: false,
				},
			});
			await flushPromises();

			expect(container.textContent).toContain('Something went wrong');
			const link = getByText('agents.builder.addTrigger.editCredential');
			link.click();

			expect(emitted().edit).toHaveLength(1);
		});

		it('hides the edit-credential link when the error is a conflict, even with a credential selected', async () => {
			const { container, queryByText } = renderComponent({
				props: {
					...baseProps,
					modelValue: 'whatsapp-credential-id',
					errorMessage: 'Already connected',
					errorIsConflict: true,
				},
			});
			await flushPromises();

			expect(container.textContent).toContain('Already connected');
			expect(queryByText('agents.builder.addTrigger.editCredential')).toBeNull();
		});
	});

	describe('channel settings', () => {
		it('defaults to media download on and typing indicator off when nothing is saved yet', async () => {
			const { getByTestId } = renderComponent({
				props: { ...baseProps, mode: 'edit', connected: true },
			});
			await flushPromises();

			expect(getByTestId('whatsapp-download-media-toggle')).toHaveAttribute(
				'data-state',
				'checked',
			);
			expect(getByTestId('whatsapp-typing-indicator-toggle')).toHaveAttribute(
				'data-state',
				'unchecked',
			);
		});

		it('renders the saved settings values', async () => {
			const { getByTestId } = renderComponent({
				props: {
					...baseProps,
					mode: 'edit',
					connected: true,
					savedSettings: { downloadMedia: false, typingIndicator: true },
				},
			});
			await flushPromises();

			expect(getByTestId('whatsapp-download-media-toggle')).toHaveAttribute(
				'data-state',
				'unchecked',
			);
			expect(getByTestId('whatsapp-typing-indicator-toggle')).toHaveAttribute(
				'data-state',
				'checked',
			);
		});

		it('toggles the download-media switch on click', async () => {
			const { getByTestId } = renderComponent({
				props: { ...baseProps, mode: 'edit', connected: true },
			});
			await flushPromises();

			const toggle = getByTestId('whatsapp-download-media-toggle');
			expect(toggle).toHaveAttribute('data-state', 'checked');

			await userEvent.click(toggle);

			expect(toggle).toHaveAttribute('data-state', 'unchecked');
		});
	});
});
