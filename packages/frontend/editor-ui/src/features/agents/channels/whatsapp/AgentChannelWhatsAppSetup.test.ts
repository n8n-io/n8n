import { createComponentRenderer } from '@/__tests__/render';
import { configure } from '@testing-library/vue';
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

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
		urlBaseWebhook: 'https://n8n.example.com/',
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
		template: '<div data-testid="whatsapp-credential-connection-stub" />',
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
});
