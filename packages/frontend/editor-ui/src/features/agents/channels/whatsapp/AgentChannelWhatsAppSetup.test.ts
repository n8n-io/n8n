import { createComponentRenderer } from '@/__tests__/render';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import * as credentialsApi from '@/features/credentials/credentials.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import type { WhatsAppCredentialCheck } from '@n8n/api-types';

import AgentChannelWhatsAppSetup from './AgentChannelWhatsAppSetup.vue';
import { ResponseError } from '@n8n/rest-api-client';
import {
	checkWhatsAppCredential,
	getWhatsAppWebhookStatus,
	resetWhatsAppWebhookStatus,
} from './api';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join(' ')}` : key,
	}),
}));

// The real N8nStepper lists every step too. The stub keeps each step's slot plain to query.
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	N8nStepper: {
		props: ['steps'],
		template: `<div><div v-for="step in steps" :key="step.id" :data-testid="'step-' + step.id">{{ step.title }}<slot :step="step" /></div></div>`,
	},
}));

const { showMessage, showError } = vi.hoisted(() => ({ showMessage: vi.fn(), showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

vi.mock('@/features/credentials/credentials.api');

const { getWhatsAppVerifyToken } = vi.hoisted(() => ({ getWhatsAppVerifyToken: vi.fn() }));
vi.mock('../../composables/useAgentApi', () => ({ getWhatsAppVerifyToken }));

vi.mock('./api', () => ({
	checkWhatsAppCredential: vi.fn(),
	getWhatsAppWebhookStatus: vi.fn(),
	resetWhatsAppWebhookStatus: vi.fn(),
}));

vi.mock('../../components/AgentIntegrationCredentialConnection.vue', () => ({
	default: {
		name: 'AgentIntegrationCredentialConnection',
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template:
			'<button data-testid="whatsapp-credential-pick" @click="$emit(\'update:modelValue\', \'cred-picked\')" />',
	},
}));

// The shared default is `data-test-id`; these components use `data-testid`.
configure({ testIdAttribute: 'data-testid' });

const WEBHOOK_URL = 'https://n8n.example.com/rest/projects/p/agents/v2/a/webhooks/whatsapp';
const PROFILE = {
	verifiedName: 'Acme Support',
	displayPhoneNumber: '+1 555-010-0199',
	description: 'We help',
};
const POLL_MS = 3000;

const renderComponent = createComponentRenderer(AgentChannelWhatsAppSetup);

const props = (overrides: Record<string, unknown> = {}) => ({
	mode: 'setup' as const,
	modelValue: '',
	integration: {
		type: 'whatsapp',
		label: 'WhatsApp',
		icon: 'whatsapp',
		credentialTypes: ['whatsAppApi'],
	},
	credentials: [],
	credentialPermissions: { create: true },
	agentName: 'Agent',
	projectId: 'p',
	agentId: 'a',
	...overrides,
});

const deferred = <T>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
};

describe('AgentChannelWhatsAppSetup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		useRootStore().setUrlBaseWebhook('https://n8n.example.com/');
		getWhatsAppVerifyToken.mockResolvedValue({ verifyToken: 'verify-token-123' });
		vi.mocked(checkWhatsAppCredential).mockResolvedValue({ status: 'ok', profile: PROFILE });
		vi.mocked(getWhatsAppWebhookStatus).mockResolvedValue({ verified: false });
		vi.mocked(resetWhatsAppWebhookStatus).mockResolvedValue({ verified: false });
	});

	afterEach(() => vi.useRealTimers());

	describe('steps', () => {
		it('renders the five steps in order', async () => {
			const { container, getByTestId } = renderComponent({ props: props() });
			await flushPromises();

			const text = container.textContent ?? '';
			const titles = ['createApp', 'credential', 'webhook', 'verify', 'connect'].map((id) =>
				text.indexOf(`agents.channels.whatsapp.setup.${id}.title`),
			);
			expect(titles.every((index) => index >= 0)).toBe(true);
			expect([...titles].sort((x, y) => x - y)).toEqual(titles);
			expect(getByTestId('whatsapp-meta-dashboard-link')).toHaveAttribute(
				'href',
				'https://developers.facebook.com/apps',
			);
		});

		it('shows the webhook URL and the verify token', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() =>
				expect(getByTestId('whatsapp-verify-token')).toHaveValue('verify-token-123'),
			);
			expect(getByTestId('whatsapp-webhook-url')).toHaveValue(WEBHOOK_URL);
			expect(getWhatsAppVerifyToken).toHaveBeenCalledWith(expect.anything(), 'p', 'a');
		});

		it('does not show the edit fields in setup', async () => {
			const { queryByTestId } = renderComponent({ props: props() });
			await flushPromises();

			expect(queryByTestId('whatsapp-settings')).toBeNull();
			expect(queryByTestId('whatsapp-identity-field')).toBeNull();
		});
	});

	describe('webhook HTTPS', () => {
		it('says nothing when the webhook URL is HTTPS', async () => {
			const { queryByTestId } = renderComponent({ props: props() });
			await flushPromises();

			expect(queryByTestId('whatsapp-webhook-not-https')).toBeNull();
		});

		it('warns when the webhook URL is not HTTPS', async () => {
			useRootStore().setUrlBaseWebhook('http://localhost:5678/');
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() =>
				expect(getByTestId('whatsapp-webhook-not-https')).toHaveTextContent(
					'agents.channels.whatsapp.setup.webhook.httpsRequired',
				),
			);
		});
	});

	describe('credential check', () => {
		it('does not check until a credential is picked', async () => {
			const { queryByTestId } = renderComponent({ props: props() });
			await flushPromises();

			expect(checkWhatsAppCredential).not.toHaveBeenCalled();
			expect(queryByTestId('whatsapp-credential-checking')).toBeNull();
			expect(queryByTestId('whatsapp-credential-problem')).toBeNull();
			expect(queryByTestId('whatsapp-credential-verified')).toBeNull();
		});

		it('shows the check in progress, then the verified state', async () => {
			const answer = deferred<WhatsAppCredentialCheck>();
			vi.mocked(checkWhatsAppCredential).mockReturnValue(answer.promise);
			const { getByTestId, queryByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});

			await waitFor(() => expect(getByTestId('whatsapp-credential-checking')).toBeVisible());
			expect(checkWhatsAppCredential).toHaveBeenCalledWith(expect.anything(), 'p', 'a', 'cred-1');

			answer.resolve({ status: 'ok', profile: PROFILE });

			await waitFor(() => expect(getByTestId('whatsapp-credential-verified')).toBeVisible());
			expect(queryByTestId('whatsapp-credential-checking')).toBeNull();
		});

		it('saves a new agent before it checks the credential', async () => {
			const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);
			renderComponent({ props: props({ modelValue: 'cred-1', ensureAgentPersisted }) });

			await waitFor(() => expect(checkWhatsAppCredential).toHaveBeenCalled());
			expect(ensureAgentPersisted).toHaveBeenCalled();
			expect(ensureAgentPersisted.mock.invocationCallOrder[0]).toBeLessThan(
				vi.mocked(checkWhatsAppCredential).mock.invocationCallOrder[0],
			);
		});

		it('reports a failed save as unreachable without a check', async () => {
			const ensureAgentPersisted = vi.fn().mockRejectedValue(new Error('save failed'));
			const { getByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1', ensureAgentPersisted }),
			});

			await waitFor(() =>
				expect(getByTestId('whatsapp-credential-problem')).toHaveTextContent(
					'agents.channels.whatsapp.setup.credential.failed.unreachable',
				),
			);
			expect(showError).toHaveBeenCalled();
			expect(checkWhatsAppCredential).not.toHaveBeenCalled();
		});

		it.each(['incomplete', 'temporaryToken', 'mismatch', 'unreachable'] as const)(
			'explains the %s failure and offers a recheck',
			async (reason) => {
				vi.mocked(checkWhatsAppCredential).mockResolvedValue({ status: 'failed', reason });
				const { getByTestId, queryByTestId } = renderComponent({
					props: props({ modelValue: 'cred-1' }),
				});

				await waitFor(() =>
					expect(getByTestId('whatsapp-credential-problem')).toHaveTextContent(
						`agents.channels.whatsapp.setup.credential.failed.${reason}`,
					),
				);
				expect(getByTestId('whatsapp-credential-recheck')).toBeVisible();
				expect(queryByTestId('whatsapp-credential-verified')).toBeNull();
			},
		);

		it('reports a request that throws as unreachable', async () => {
			vi.mocked(checkWhatsAppCredential).mockRejectedValue(new Error('network'));
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() =>
				expect(getByTestId('whatsapp-credential-problem')).toHaveTextContent(
					'agents.channels.whatsapp.setup.credential.failed.unreachable',
				),
			);
		});

		it('explains a credential the caller cannot use instead of calling Meta unreachable', async () => {
			vi.mocked(checkWhatsAppCredential).mockRejectedValue(
				new ResponseError('Credential not found', { httpStatusCode: 404 }),
			);
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() =>
				expect(getByTestId('whatsapp-credential-problem')).toHaveTextContent(
					'agents.channels.whatsapp.setup.credential.failed.notFound',
				),
			);
			expect(getByTestId('whatsapp-credential-recheck')).toBeVisible();
		});

		it('checks again on Check again', async () => {
			vi.mocked(checkWhatsAppCredential).mockResolvedValue({
				status: 'failed',
				reason: 'mismatch',
			});
			const { getByTestId, queryByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await waitFor(() => expect(getByTestId('whatsapp-credential-recheck')).toBeVisible());

			vi.mocked(checkWhatsAppCredential).mockResolvedValue({ status: 'ok', profile: PROFILE });
			await fireEvent.click(getByTestId('whatsapp-credential-recheck'));

			await waitFor(() => expect(getByTestId('whatsapp-credential-verified')).toBeVisible());
			expect(checkWhatsAppCredential).toHaveBeenCalledTimes(2);
			expect(checkWhatsAppCredential).toHaveBeenLastCalledWith(
				expect.anything(),
				'p',
				'a',
				'cred-1',
			);
			expect(queryByTestId('whatsapp-credential-problem')).toBeNull();
		});

		it('ignores a late answer for a credential that was replaced', async () => {
			const first = deferred<WhatsAppCredentialCheck>();
			vi.mocked(checkWhatsAppCredential)
				.mockReturnValueOnce(first.promise)
				.mockResolvedValueOnce({ status: 'failed', reason: 'mismatch' });
			const { getByTestId, queryByTestId, rerender } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await waitFor(() => expect(checkWhatsAppCredential).toHaveBeenCalledTimes(1));

			await rerender(props({ modelValue: 'cred-2' }));
			await waitFor(() => expect(getByTestId('whatsapp-credential-problem')).toBeVisible());

			first.resolve({ status: 'ok', profile: PROFILE });
			await flushPromises();

			expect(getByTestId('whatsapp-credential-problem')).toHaveTextContent(
				'agents.channels.whatsapp.setup.credential.failed.mismatch',
			);
			expect(queryByTestId('whatsapp-credential-verified')).toBeNull();
		});

		const saveCredential = async (id: string) => {
			vi.mocked(credentialsApi.updateCredential).mockResolvedValue({
				id,
				name: 'WhatsApp',
				type: 'whatsAppApi',
			} as Awaited<ReturnType<typeof credentialsApi.updateCredential>>);
			await useCredentialsStore().updateCredential({ id, data: {} as never });
		};

		it('checks again when the picked credential is saved', async () => {
			vi.mocked(checkWhatsAppCredential).mockResolvedValue({
				status: 'failed',
				reason: 'temporaryToken',
			});
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(getByTestId('whatsapp-credential-problem')).toBeVisible());

			vi.mocked(checkWhatsAppCredential).mockResolvedValue({ status: 'ok', profile: PROFILE });
			await saveCredential('cred-1');

			await waitFor(() => expect(getByTestId('whatsapp-credential-verified')).toBeVisible());
		});

		it('clears the handshake and checks again when the picked credential is saved', async () => {
			vi.mocked(getWhatsAppWebhookStatus).mockResolvedValueOnce({ verified: true });
			const { getByTestId, queryByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await waitFor(() => expect(getByTestId('whatsapp-webhook-verified')).toBeVisible());

			await saveCredential('cred-1');
			await flushPromises();

			expect(resetWhatsAppWebhookStatus).toHaveBeenCalledTimes(2);
			expect(queryByTestId('whatsapp-webhook-verified')).toBeNull();
		});

		it('does not clear the handshake when the credential is saved in edit mode', async () => {
			renderComponent({ props: props({ mode: 'edit', connected: true, modelValue: 'cred-1' }) });
			await waitFor(() => expect(checkWhatsAppCredential).toHaveBeenCalledTimes(1));

			await saveCredential('cred-1');
			await flushPromises();

			expect(checkWhatsAppCredential).toHaveBeenCalledTimes(2);
			expect(resetWhatsAppWebhookStatus).not.toHaveBeenCalled();
		});

		it('stops listening for credential saves once the view is gone', async () => {
			const { unmount } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(checkWhatsAppCredential).toHaveBeenCalledTimes(1));

			unmount();
			await saveCredential('cred-1');
			await flushPromises();

			expect(checkWhatsAppCredential).toHaveBeenCalledTimes(1);
			expect(resetWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);
		});

		it('shows no error when saving the agent fails after the view is gone', async () => {
			let rejectPersist!: (error: Error) => void;
			const ensureAgentPersisted = vi.fn(
				async () => await new Promise<void>((_resolve, reject) => (rejectPersist = reject)),
			);
			const { unmount } = renderComponent({
				props: props({ modelValue: 'cred-1', ensureAgentPersisted }),
			});
			await flushPromises();
			expect(ensureAgentPersisted).toHaveBeenCalled();

			unmount();
			rejectPersist(new Error('save failed'));
			await flushPromises();

			expect(showError).not.toHaveBeenCalled();
		});

		it('does not check again when a different credential is saved', async () => {
			renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(checkWhatsAppCredential).toHaveBeenCalledTimes(1));

			await saveCredential('cred-2');
			await flushPromises();

			expect(checkWhatsAppCredential).toHaveBeenCalledTimes(1);
		});
	});

	describe('webhook verification polling', () => {
		it('clears an earlier handshake before the first poll', async () => {
			renderComponent({ props: props() });
			await flushPromises();

			expect(resetWhatsAppWebhookStatus).toHaveBeenCalledExactlyOnceWith(
				expect.anything(),
				'p',
				'a',
			);
			expect(vi.mocked(resetWhatsAppWebhookStatus).mock.invocationCallOrder[0]).toBeLessThan(
				vi.mocked(getWhatsAppWebhookStatus).mock.invocationCallOrder[0],
			);
		});

		it('does not show an earlier handshake as verified while the reset is pending', async () => {
			const reset = deferred<{ verified: boolean }>();
			vi.mocked(resetWhatsAppWebhookStatus).mockReturnValueOnce(reset.promise);
			vi.mocked(getWhatsAppWebhookStatus).mockResolvedValue({ verified: true });
			const { getByTestId, queryByTestId } = renderComponent({ props: props() });
			await flushPromises();

			expect(getWhatsAppWebhookStatus).not.toHaveBeenCalled();
			expect(queryByTestId('whatsapp-webhook-verified')).toBeNull();

			reset.resolve({ verified: false });
			await waitFor(() => expect(getByTestId('whatsapp-webhook-verified')).toBeVisible());
		});

		it('waits for the agent when the reset finds no saved agent', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			vi.mocked(resetWhatsAppWebhookStatus).mockRejectedValueOnce(
				new ResponseError('Agent not found', { httpStatusCode: 404 }),
			);
			vi.mocked(getWhatsAppWebhookStatus).mockResolvedValue({ verified: true });
			const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);
			const { getByTestId, rerender } = renderComponent({
				props: props({ ensureAgentPersisted }),
			});
			await flushPromises();
			await vi.advanceTimersByTimeAsync(POLL_MS * 3);

			expect(getWhatsAppWebhookStatus).not.toHaveBeenCalled();
			expect(showError).not.toHaveBeenCalled();

			await rerender(props({ modelValue: 'cred-1', ensureAgentPersisted }));
			await flushPromises();

			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);
			expect(getByTestId('whatsapp-webhook-verified')).toBeVisible();
		});

		it('retries a failed reset without polling, and says so once', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			const error = new Error('cache down');
			vi.mocked(resetWhatsAppWebhookStatus)
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)
				.mockResolvedValue({ verified: false });
			vi.mocked(getWhatsAppWebhookStatus).mockResolvedValue({ verified: true });
			const { getByTestId, queryByTestId } = renderComponent({ props: props() });
			await flushPromises();

			expect(showError).toHaveBeenCalledExactlyOnceWith(
				error,
				'agents.channels.whatsapp.setup.verify.resetError',
			);
			expect(getWhatsAppWebhookStatus).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(POLL_MS);
			expect(resetWhatsAppWebhookStatus).toHaveBeenCalledTimes(2);
			expect(getWhatsAppWebhookStatus).not.toHaveBeenCalled();
			expect(queryByTestId('whatsapp-webhook-verified')).toBeNull();

			await vi.advanceTimersByTimeAsync(POLL_MS);
			await flushPromises();
			expect(resetWhatsAppWebhookStatus).toHaveBeenCalledTimes(3);
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);
			expect(getByTestId('whatsapp-webhook-verified')).toBeVisible();
			expect(showError).toHaveBeenCalledTimes(1);
		});

		it('says nothing and stops when a reset fails after the view is gone', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			let rejectReset!: (error: Error) => void;
			vi.mocked(resetWhatsAppWebhookStatus).mockReturnValueOnce(
				new Promise((_resolve, reject) => (rejectReset = reject)),
			);
			const { unmount } = renderComponent({ props: props() });
			await flushPromises();

			unmount();
			rejectReset(new Error('cache down'));
			await vi.advanceTimersByTimeAsync(POLL_MS * 3);

			expect(showError).not.toHaveBeenCalled();
			expect(resetWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);
			expect(getWhatsAppWebhookStatus).not.toHaveBeenCalled();
		});

		it('polls every 3 seconds until Meta verifies the webhook, then stops', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			vi.mocked(getWhatsAppWebhookStatus)
				.mockResolvedValueOnce({ verified: false })
				.mockResolvedValueOnce({ verified: false })
				.mockResolvedValue({ verified: true });
			const { getByTestId, queryByTestId } = renderComponent({ props: props() });
			await flushPromises();

			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledWith(expect.anything(), 'p', 'a');
			expect(getByTestId('whatsapp-webhook-waiting')).toBeVisible();

			await vi.advanceTimersByTimeAsync(POLL_MS - 1);
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);
			await vi.advanceTimersByTimeAsync(1);
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(2);
			expect(queryByTestId('whatsapp-webhook-verified')).toBeNull();

			await vi.advanceTimersByTimeAsync(POLL_MS);
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(3);
			await flushPromises();
			expect(getByTestId('whatsapp-webhook-verified')).toBeVisible();
			expect(queryByTestId('whatsapp-webhook-waiting')).toBeNull();

			await vi.advanceTimersByTimeAsync(POLL_MS * 5);
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(3);
		});

		it('keeps polling after a failed request', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			vi.mocked(getWhatsAppWebhookStatus)
				.mockRejectedValueOnce(new Error('not saved'))
				.mockResolvedValue({ verified: true });
			const { getByTestId } = renderComponent({ props: props() });
			await flushPromises();

			await vi.advanceTimersByTimeAsync(POLL_MS);
			await flushPromises();

			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(2);
			expect(getByTestId('whatsapp-webhook-verified')).toBeVisible();
		});

		it('stops polling while the agent is not saved, then resumes once a credential saves it', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			vi.mocked(getWhatsAppWebhookStatus)
				.mockRejectedValueOnce(new ResponseError('Agent not found', { httpStatusCode: 404 }))
				.mockResolvedValue({ verified: true });
			const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);
			const { getByTestId, rerender } = renderComponent({
				props: props({ ensureAgentPersisted }),
			});
			await flushPromises();

			await vi.advanceTimersByTimeAsync(POLL_MS * 5);
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);

			await rerender(props({ modelValue: 'cred-1', ensureAgentPersisted }));
			await flushPromises();

			expect(ensureAgentPersisted).toHaveBeenCalled();
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(2);
			expect(getByTestId('whatsapp-webhook-verified')).toBeVisible();
		});

		it('clears the handshake again when the agent is saved before the reset finds it missing', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			let rejectReset!: (error: Error) => void;
			vi.mocked(resetWhatsAppWebhookStatus).mockReturnValueOnce(
				new Promise((_resolve, reject) => (rejectReset = reject)),
			);
			vi.mocked(getWhatsAppWebhookStatus).mockResolvedValue({ verified: true });
			const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);
			const { getByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1', ensureAgentPersisted }),
			});
			await flushPromises();
			expect(ensureAgentPersisted).toHaveBeenCalled();

			rejectReset(new ResponseError('Agent not found', { httpStatusCode: 404 }));
			await flushPromises();

			expect(resetWhatsAppWebhookStatus).toHaveBeenCalledTimes(2);
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);
			expect(getByTestId('whatsapp-webhook-verified')).toBeVisible();
		});

		it('polls again when the agent is saved before the poll finds it missing', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			let rejectStatus!: (error: Error) => void;
			vi.mocked(getWhatsAppWebhookStatus)
				.mockReturnValueOnce(new Promise((_resolve, reject) => (rejectStatus = reject)))
				.mockResolvedValue({ verified: true });
			const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);
			const { getByTestId, rerender } = renderComponent({
				props: props({ ensureAgentPersisted }),
			});
			await flushPromises();

			await rerender(props({ modelValue: 'cred-1', ensureAgentPersisted }));
			await flushPromises();
			rejectStatus(new ResponseError('Agent not found', { httpStatusCode: 404 }));
			await flushPromises();

			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(2);
			expect(getByTestId('whatsapp-webhook-verified')).toBeVisible();
		});

		it('clears the handshake and checks again when another credential is picked', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			vi.mocked(getWhatsAppWebhookStatus).mockResolvedValueOnce({ verified: true });
			const { getByTestId, queryByTestId, rerender } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await flushPromises();
			expect(getByTestId('whatsapp-webhook-verified')).toBeVisible();

			const reset = deferred<{ verified: boolean }>();
			vi.mocked(resetWhatsAppWebhookStatus).mockReturnValueOnce(reset.promise);
			await rerender(props({ modelValue: 'cred-2' }));
			await flushPromises();

			expect(resetWhatsAppWebhookStatus).toHaveBeenCalledTimes(2);
			expect(queryByTestId('whatsapp-webhook-verified')).toBeNull();

			reset.resolve({ verified: false });
			await flushPromises();
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(2);
			expect(queryByTestId('whatsapp-webhook-verified')).toBeNull();

			await vi.advanceTimersByTimeAsync(POLL_MS);
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(3);
		});

		it('keeps one poll running when the credential changes while polling', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			const { rerender } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await flushPromises();
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);

			await rerender(props({ modelValue: 'cred-2' }));
			await flushPromises();
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(POLL_MS);
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(3);
		});

		it('does not start a second poll when a credential is picked while polling', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			const { rerender } = renderComponent({ props: props() });
			await flushPromises();
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);

			await rerender(props({ modelValue: 'cred-1' }));
			await flushPromises();
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(POLL_MS);
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(2);
		});

		it('stops polling once the view is gone', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			const { unmount } = renderComponent({ props: props() });
			await flushPromises();
			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);

			unmount();
			await vi.advanceTimersByTimeAsync(POLL_MS * 5);

			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);
		});

		it('does not schedule another poll when a request lands after unmount', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			const status = deferred<{ verified: boolean }>();
			vi.mocked(getWhatsAppWebhookStatus).mockReturnValueOnce(status.promise);
			const { unmount } = renderComponent({ props: props() });
			await flushPromises();

			unmount();
			status.resolve({ verified: false });
			await vi.advanceTimersByTimeAsync(POLL_MS * 5);

			expect(getWhatsAppWebhookStatus).toHaveBeenCalledTimes(1);
		});

		it('does not poll in edit mode', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			renderComponent({ props: props({ mode: 'edit', connected: true, modelValue: 'cred-1' }) });
			await flushPromises();
			await vi.advanceTimersByTimeAsync(POLL_MS * 3);

			expect(getWhatsAppWebhookStatus).not.toHaveBeenCalled();
			expect(resetWhatsAppWebhookStatus).not.toHaveBeenCalled();
		});
	});

	describe('connect', () => {
		const NEEDS = 'agents.channels.whatsapp.setup.connect';

		it.each([
			{ credential: true, webhook: true, enabled: true, hint: null },
			{ credential: true, webhook: false, enabled: false, hint: `${NEEDS}.needsWebhook` },
			{ credential: false, webhook: true, enabled: false, hint: `${NEEDS}.needsCredential` },
			{ credential: false, webhook: false, enabled: false, hint: `${NEEDS}.needsBoth` },
		])(
			'credential verified $credential, webhook verified $webhook: enabled $enabled',
			async ({ credential, webhook, enabled, hint }) => {
				vi.mocked(checkWhatsAppCredential).mockResolvedValue(
					credential
						? { status: 'ok', profile: PROFILE }
						: { status: 'failed', reason: 'mismatch' },
				);
				vi.mocked(getWhatsAppWebhookStatus).mockResolvedValue({ verified: webhook });
				const { getByTestId, queryByTestId } = renderComponent({
					props: props({ modelValue: 'cred-1' }),
				});

				await waitFor(() => expect(checkWhatsAppCredential).toHaveBeenCalled());
				await flushPromises();

				if (enabled) {
					expect(getByTestId('whatsapp-connect')).toBeEnabled();
					expect(queryByTestId('whatsapp-connect-blocked')).toBeNull();
				} else {
					expect(getByTestId('whatsapp-connect')).toBeDisabled();
					expect(getByTestId('whatsapp-connect-blocked')).toHaveTextContent(hint ?? '');
				}
			},
		);

		it('needs both when no credential is picked yet', async () => {
			const { getByTestId } = renderComponent({ props: props() });
			await flushPromises();

			expect(getByTestId('whatsapp-connect')).toBeDisabled();
			expect(getByTestId('whatsapp-connect-blocked')).toHaveTextContent(`${NEEDS}.needsBoth`);
		});

		it('disables Connect with no hint once connected', async () => {
			vi.mocked(getWhatsAppWebhookStatus).mockResolvedValue({ verified: true });
			const { getByTestId, queryByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1', connected: true }),
			});
			await waitFor(() => expect(checkWhatsAppCredential).toHaveBeenCalled());
			await flushPromises();

			expect(getByTestId('whatsapp-connect')).toBeDisabled();
			expect(queryByTestId('whatsapp-connect-blocked')).toBeNull();
		});

		it('shows the verified profile in the identity card', async () => {
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() =>
				expect(getByTestId('whatsapp-identity-name')).toHaveTextContent('Acme Support'),
			);
		});

		it('emits connect on click when ready', async () => {
			vi.mocked(getWhatsAppWebhookStatus).mockResolvedValue({ verified: true });
			const { getByTestId, emitted } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await waitFor(() => expect(getByTestId('whatsapp-connect')).toBeEnabled());

			await fireEvent.click(getByTestId('whatsapp-connect'));

			expect(emitted().connect).toHaveLength(1);
		});

		it('does not connect when a credential is picked', async () => {
			vi.mocked(getWhatsAppWebhookStatus).mockResolvedValue({ verified: true });
			const { getByTestId, emitted, rerender } = renderComponent({ props: props() });
			await flushPromises();

			await fireEvent.click(getByTestId('whatsapp-credential-pick'));
			await waitFor(() => expect(emitted()['update:modelValue']).toContainEqual(['cred-picked']));
			await rerender(props({ modelValue: 'cred-picked' }));
			await waitFor(() => expect(getByTestId('whatsapp-credential-verified')).toBeVisible());
			await flushPromises();

			expect(emitted().connect).toBeUndefined();
		});

		it('shows a connect error next to Connect, but not a conflict', async () => {
			const { getByTestId, queryByTestId, rerender } = renderComponent({
				props: props({ modelValue: 'cred-1', errorMessage: 'Meta said no' }),
			});
			await waitFor(() =>
				expect(getByTestId('whatsapp-connect-error')).toHaveTextContent('Meta said no'),
			);

			await rerender(
				props({ modelValue: 'cred-1', errorMessage: 'Already used', errorIsConflict: true }),
			);

			await waitFor(() => expect(queryByTestId('whatsapp-connect-error')).toBeNull());
		});

		it('asks to publish a connected agent that is not published', async () => {
			const { getByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1', connected: true, isPublished: false }),
			});

			await waitFor(() => expect(getByTestId('whatsapp-publish-notice')).toBeVisible());
			expect(getByTestId('step-connect')).toContainElement(getByTestId('whatsapp-publish-notice'));
		});
	});

	describe('exposed state', () => {
		const Host = defineComponent({
			components: { AgentChannelWhatsAppSetup },
			props: { viewProps: { type: Object, required: true } },
			setup: () => ({ view: ref<InstanceType<typeof AgentChannelWhatsAppSetup>>() }),
			template: `<div>
				<AgentChannelWhatsAppSetup ref="view" v-bind="viewProps" />
				<span data-testid="current-settings">{{ JSON.stringify(view?.currentSettings) ?? 'none' }}</span>
				<button data-testid="after-save" @click="view?.afterSave()" />
			</div>`,
		});
		const renderHost = createComponentRenderer(Host);

		const currentSettings = (getByTestId: (id: string) => HTMLElement) => {
			const text = getByTestId('current-settings').textContent ?? '';
			return text === 'none' ? undefined : (JSON.parse(text) as unknown);
		};

		it('shows a success toast after saving in setup', async () => {
			const { getByTestId } = renderHost({ props: { viewProps: props() } });
			await flushPromises();

			await fireEvent.click(getByTestId('after-save'));

			expect(showMessage).toHaveBeenCalledExactlyOnceWith({
				type: 'success',
				title: 'agents.channels.whatsapp.setup.connect.connected',
			});
		});

		it('adds the publish notice to the toast for an unpublished agent', async () => {
			const { getByTestId } = renderHost({ props: { viewProps: props({ isPublished: false }) } });
			await flushPromises();

			await fireEvent.click(getByTestId('after-save'));

			expect(showMessage).toHaveBeenCalledExactlyOnceWith({
				type: 'success',
				title: 'agents.channels.whatsapp.setup.connect.connected',
				message: 'agents.channels.setup.publishNotice',
			});
		});

		it('shows no toast after saving in edit mode', async () => {
			const { getByTestId } = renderHost({
				props: { viewProps: props({ mode: 'edit', connected: true, isPublished: false }) },
			});
			await flushPromises();

			await fireEvent.click(getByTestId('after-save'));

			expect(showMessage).not.toHaveBeenCalled();
		});

		it('passes the saved settings through unchanged in setup', async () => {
			const savedSettings = { sessionIdleTimeoutMinutes: 15 };
			const setup = renderHost({ props: { viewProps: props({ savedSettings }) } });
			await flushPromises();
			expect(currentSettings(setup.getByTestId)).toEqual(savedSettings);
			setup.unmount();

			const empty = renderHost({ props: { viewProps: props() } });
			await flushPromises();
			expect(currentSettings(empty.getByTestId)).toBeUndefined();
		});

		it('leaves unchanged settings unset in edit mode, so they follow the defaults', async () => {
			const { getByTestId } = renderHost({
				props: { viewProps: props({ mode: 'edit', connected: true }) },
			});
			await flushPromises();
			expect(currentSettings(getByTestId)).toEqual({});

			await fireEvent.click(getByTestId('whatsapp-typing-indicator'));
			await waitFor(() => expect(currentSettings(getByTestId)).toEqual({ typingIndicator: false }));

			// Changing a setting back to its default leaves it unset again.
			await fireEvent.click(getByTestId('whatsapp-typing-indicator'));
			await waitFor(() => expect(currentSettings(getByTestId)).toEqual({}));
		});

		it('merges the saved settings with the edited ones in edit mode', async () => {
			const savedSettings = {
				sessionIdleTimeoutMinutes: 15,
				downloadMedia: false,
				mediaRetentionDays: 90,
			};
			const { getByTestId, rerender } = renderHost({
				props: { viewProps: props({ mode: 'edit', connected: true, savedSettings }) },
			});
			await flushPromises();
			expect(currentSettings(getByTestId)).toEqual(savedSettings);

			await fireEvent.click(getByTestId('whatsapp-typing-indicator'));

			await waitFor(() =>
				expect(currentSettings(getByTestId)).toEqual({
					sessionIdleTimeoutMinutes: 15,
					typingIndicator: false,
					downloadMedia: false,
					mediaRetentionDays: 90,
				}),
			);

			// An edit wins over settings that arrive afterwards.
			await rerender({
				viewProps: props({
					mode: 'edit',
					connected: true,
					savedSettings: { ...savedSettings, typingIndicator: true, downloadMedia: true },
				}),
			});
			await flushPromises();
			expect(currentSettings(getByTestId)).toMatchObject({
				typingIndicator: false,
				downloadMedia: false,
			});
		});

		it('follows saved settings that arrive before any edit', async () => {
			const { getByTestId, rerender } = renderHost({
				props: { viewProps: props({ mode: 'edit', connected: true }) },
			});
			await flushPromises();

			await rerender({
				viewProps: props({
					mode: 'edit',
					connected: true,
					savedSettings: { downloadMedia: false },
				}),
			});

			await waitFor(() => expect(currentSettings(getByTestId)).toEqual({ downloadMedia: false }));
		});
	});

	describe('edit mode', () => {
		it('shows the identity, settings and webhook fields, without the stepper', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: props({ mode: 'edit', connected: true, modelValue: 'cred-1' }),
			});

			await waitFor(() =>
				expect(getByTestId('whatsapp-identity-name')).toHaveTextContent('Acme Support'),
			);
			expect(getByTestId('whatsapp-settings')).toBeInTheDocument();
			expect(getByTestId('whatsapp-webhook-url')).toHaveValue(WEBHOOK_URL);
			expect(queryByTestId('step-credential')).toBeNull();
			expect(queryByTestId('whatsapp-connect')).toBeNull();
		});

		it('shows a credential problem under the identity', async () => {
			vi.mocked(checkWhatsAppCredential).mockResolvedValue({
				status: 'failed',
				reason: 'mismatch',
			});
			const ensureAgentPersisted = vi.fn();
			const { getByTestId } = renderComponent({
				props: props({ mode: 'edit', connected: true, modelValue: 'cred-1', ensureAgentPersisted }),
			});

			await waitFor(() =>
				expect(getByTestId('whatsapp-credential-problem')).toHaveTextContent(
					'agents.channels.whatsapp.setup.credential.failed.mismatch',
				),
			);
			expect(getByTestId('whatsapp-identity-field')).toContainElement(
				getByTestId('whatsapp-credential-problem'),
			);
			expect(ensureAgentPersisted).not.toHaveBeenCalled();
		});
	});
});
