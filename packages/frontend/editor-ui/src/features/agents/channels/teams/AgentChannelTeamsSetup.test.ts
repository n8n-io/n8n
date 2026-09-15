import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor } from '@testing-library/vue';

import AgentChannelTeamsSetup from './AgentChannelTeamsSetup.vue';
import {
	checkTeamsCredential,
	fetchTeamsAppPackage,
	getTeamsDiscovery,
	getTeamsSetupState,
	startTeamsDiscovery,
	stopTeamsDiscovery,
} from './api';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		// Keeps interpolated values assertable, since the key stands in for the copy.
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join(' ')}` : key,
	}),
}));

vi.mock('./api', () => ({
	checkTeamsCredential: vi.fn(),
	getTeamsSetupState: vi.fn(),
	getTeamsDiscovery: vi.fn(),
	startTeamsDiscovery: vi.fn(),
	stopTeamsDiscovery: vi.fn(),
	fetchTeamsAppPackage: vi.fn(),
}));

// The shared default is `data-test-id`; these components use `data-testid`.
configure({ testIdAttribute: 'data-testid' });

// N8nStepper renders every step's slot, so one render covers the whole stepper.
const ENDPOINT = 'https://n8n.example.com/rest/projects/p/agents/v2/a/webhooks/teams';
const DEPLOY_URL = 'https://portal.azure.com/#create/Microsoft.Template/uri/encoded';
const CLIENT_ID = '11111111-2222-3333-4444-555555555555';
const TENANT_ID = '99999999-8888-7777-6666-555555555555';

const renderComponent = createComponentRenderer(AgentChannelTeamsSetup);

const props = (overrides: Record<string, unknown> = {}) => ({
	mode: 'setup' as const,
	modelValue: '',
	integration: {
		type: 'teams',
		label: 'Microsoft Teams',
		icon: 'teams',
		credentialTypes: ['microsoftEntraServicePrincipalApi'],
	},
	credentials: [],
	credentialPermissions: { create: true },
	agentName: 'Agent',
	projectId: 'p',
	agentId: 'a',
	...overrides,
});

describe('AgentChannelTeamsSetup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		vi.mocked(getTeamsSetupState).mockResolvedValue({
			messagingEndpointUrl: ENDPOINT,
			botId: null,
			deployToAzureUrl: DEPLOY_URL,
			suggestedBotName: 'support-bot-abc12345',
		});
		vi.mocked(startTeamsDiscovery).mockResolvedValue({ status: 'waiting' });
		vi.mocked(getTeamsDiscovery).mockResolvedValue({ status: 'waiting' });
		vi.mocked(fetchTeamsAppPackage).mockResolvedValue(new Blob(['zip']));
		vi.mocked(checkTeamsCredential).mockResolvedValue({ status: 'ok', clientId: CLIENT_ID });
	});

	afterEach(() => vi.useRealTimers());

	describe('step 1, create the bot', () => {
		it('shows the messaging endpoint URL', async () => {
			const { container } = renderComponent({ props: props() });

			await waitFor(() => {
				expect(container.querySelector('#teams-messaging-endpoint-url')).toHaveValue(ENDPOINT);
			});
		});

		it('offers the deployment before any credential exists', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => {
				expect(getByTestId('teams-deploy-to-azure')).toHaveAttribute('href', DEPLOY_URL);
			});
		});

		it('says up front what account and permissions the bot needs', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-create-bot-prerequisites')).toBeVisible());
		});

		it('offers the Entra registration the deployment depends on', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-entra-register-link')).toBeVisible());
		});
	});

	describe('step 2, connect the bot', () => {
		it('listens as soon as the stepper opens, with nothing to click', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-discovery-listening')).toBeVisible());
			expect(startTeamsDiscovery).toHaveBeenCalledWith(expect.anything(), 'p', 'a');
		});

		it('renews a lapsed window instead of surfacing it as an error', async () => {
			vi.mocked(getTeamsDiscovery).mockResolvedValue({ status: 'expired' });
			vi.useFakeTimers({ shouldAdvanceTime: true });

			const { getByTestId } = renderComponent({ props: props() });
			await waitFor(() => expect(getByTestId('teams-discovery-listening')).toBeVisible());
			await vi.advanceTimersByTimeAsync(2500);

			// Once on mount, once to renew.
			expect(vi.mocked(startTeamsDiscovery).mock.calls.length).toBeGreaterThan(1);
			expect(getByTestId('teams-discovery-listening')).toBeVisible();
		});

		it('stops listening when the stepper closes', async () => {
			const { unmount } = renderComponent({ props: props() });
			await waitFor(() => expect(startTeamsDiscovery).toHaveBeenCalled());

			unmount();

			expect(stopTeamsDiscovery).toHaveBeenCalledWith(expect.anything(), 'p', 'a');
		});

		it('shows the bot it found, and asks only for the secret', async () => {
			vi.mocked(getTeamsDiscovery).mockResolvedValue({
				status: 'found',
				clientId: CLIENT_ID,
				tenantId: TENANT_ID,
				existingCredentialId: null,
			});
			vi.useFakeTimers({ shouldAdvanceTime: true });

			const { getByTestId, container } = renderComponent({ props: props() });
			await waitFor(() => expect(getByTestId('teams-discovery-listening')).toBeVisible());
			await vi.advanceTimersByTimeAsync(2500);

			await waitFor(() => expect(getByTestId('teams-discovery-found')).toBeVisible());
			expect(container.textContent).toContain('connectBot.found');
			expect(getByTestId('teams-discovered-client-id').querySelector('input')).toHaveValue(
				CLIENT_ID,
			);
			expect(getByTestId('teams-discovered-tenant-id').querySelector('input')).toHaveValue(
				TENANT_ID,
			);
		});

		it('says so when the activity carried no tenant, rather than looking like a failure', async () => {
			vi.mocked(getTeamsDiscovery).mockResolvedValue({
				status: 'found',
				clientId: CLIENT_ID,
				tenantId: null,
				existingCredentialId: null,
			});
			vi.useFakeTimers({ shouldAdvanceTime: true });

			const { getByTestId, queryByTestId } = renderComponent({ props: props() });
			await waitFor(() => expect(getByTestId('teams-discovery-listening')).toBeVisible());
			await vi.advanceTimersByTimeAsync(2500);

			await waitFor(() => expect(getByTestId('teams-discovery-no-tenant')).toBeVisible());
			expect(queryByTestId('teams-discovered-tenant-id')).toBeNull();
		});

		it('points at an existing credential when one already holds the bot', async () => {
			vi.mocked(getTeamsDiscovery).mockResolvedValue({
				status: 'found',
				clientId: CLIENT_ID,
				tenantId: TENANT_ID,
				existingCredentialId: 'cred-1',
			});
			vi.useFakeTimers({ shouldAdvanceTime: true });

			const { getByTestId, container } = renderComponent({ props: props() });
			await waitFor(() => expect(getByTestId('teams-discovery-listening')).toBeVisible());
			await vi.advanceTimersByTimeAsync(2500);

			await waitFor(() => expect(container.textContent).toContain('connectBot.foundExisting'));
		});

		it('points at the bot by name, since the resource blade cannot be deep-linked', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-open-bot-link')).toBeVisible());
			expect(getByTestId('teams-open-bot-hint').textContent).toContain('support-bot-abc12345');
		});

		it('offers a way out while listening', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-discovery-manual')).toBeVisible());
		});
	});

	describe('step 3, availability', () => {
		// N8nCheckbox is a Reka UI checkbox: a button with aria-checked, not an input.
		const checked = (el: HTMLElement) => el.getAttribute('aria-checked') === 'true';

		it('has direct chat on and locked, and everything else off', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-scope-direct')).toBeVisible());
			expect(checked(getByTestId('teams-scope-direct'))).toBe(true);
			expect(getByTestId('teams-scope-direct')).toBeDisabled();
			expect(checked(getByTestId('teams-scope-channels'))).toBe(false);
			expect(checked(getByTestId('teams-scope-groups'))).toBe(false);
		});

		it('keeps a read permission locked until its surface is on', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-read-channels')).toBeVisible());
			expect(getByTestId('teams-read-channels')).toBeDisabled();

			await fireEvent.click(getByTestId('teams-scope-channels'));

			await waitFor(() => expect(getByTestId('teams-read-channels')).not.toBeDisabled());
		});

		it('clears a read permission when its surface is turned back off', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-scope-channels')).toBeVisible());
			await fireEvent.click(getByTestId('teams-scope-channels'));
			await waitFor(() => expect(getByTestId('teams-read-channels')).not.toBeDisabled());
			await fireEvent.click(getByTestId('teams-read-channels'));
			await waitFor(() => expect(checked(getByTestId('teams-read-channels'))).toBe(true));

			await fireEvent.click(getByTestId('teams-scope-channels'));

			await waitFor(() => expect(checked(getByTestId('teams-read-channels'))).toBe(false));
		});

		it('restores saved settings', async () => {
			const { getByTestId } = renderComponent({
				props: props({ savedSettings: { teamChannels: true, readAllChannelMessages: true } }),
			});

			await waitFor(() => expect(checked(getByTestId('teams-scope-channels'))).toBe(true));
			expect(checked(getByTestId('teams-read-channels'))).toBe(true);
		});
	});

	describe('step 4, install', () => {
		it('withholds the package until the bot is known', async () => {
			const { getByTestId, queryByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-package-blocked')).toBeVisible());
			expect(queryByTestId('teams-download-package')).toBeNull();
		});

		it('offers the package from the discovered bot, before connecting', async () => {
			vi.mocked(getTeamsDiscovery).mockResolvedValue({
				status: 'found',
				clientId: CLIENT_ID,
				tenantId: TENANT_ID,
				existingCredentialId: null,
			});
			vi.useFakeTimers({ shouldAdvanceTime: true });

			const { getByTestId } = renderComponent({ props: props() });
			await waitFor(() => expect(getByTestId('teams-discovery-listening')).toBeVisible());
			await vi.advanceTimersByTimeAsync(2500);

			await waitFor(() => expect(getByTestId('teams-download-package')).toBeVisible());
		});

		it('fetches the package rather than linking to it, so the session survives', async () => {
			vi.mocked(getTeamsSetupState).mockResolvedValue({
				messagingEndpointUrl: ENDPOINT,
				botId: CLIENT_ID,
				deployToAzureUrl: DEPLOY_URL,
				suggestedBotName: 'support-bot-abc12345',
			});

			const { getByTestId } = renderComponent({ props: props({ connected: true }) });
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeVisible());
			expect(getByTestId('teams-download-package')).not.toHaveAttribute('href');

			await fireEvent.click(getByTestId('teams-download-package'));

			await waitFor(() =>
				expect(fetchTeamsAppPackage).toHaveBeenCalledWith(expect.anything(), 'p', 'a'),
			);
		});

		it('reports a failed download instead of silently doing nothing', async () => {
			vi.mocked(getTeamsSetupState).mockResolvedValue({
				messagingEndpointUrl: ENDPOINT,
				botId: CLIENT_ID,
				deployToAzureUrl: DEPLOY_URL,
				suggestedBotName: 'support-bot-abc12345',
			});
			vi.mocked(fetchTeamsAppPackage).mockRejectedValue(new Error('401'));

			const { getByTestId } = renderComponent({ props: props({ connected: true }) });
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeVisible());
			await fireEvent.click(getByTestId('teams-download-package'));

			await waitFor(() => expect(getByTestId('teams-download-error')).toBeVisible());
		});

		it('keeps connecting locked until the credential reaches Microsoft', async () => {
			vi.mocked(checkTeamsCredential).mockResolvedValue({ status: 'failed', reason: 'rejected' });

			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() => expect(getByTestId('teams-credential-problem')).toBeVisible());
			expect(getByTestId('teams-connect')).toBeDisabled();
		});

		it('unlocks connecting once the credential checks out', async () => {
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() => expect(getByTestId('teams-credential-verified')).toBeVisible());
			expect(getByTestId('teams-connect')).not.toBeDisabled();
		});

		it('offers a retry when the check failed', async () => {
			vi.mocked(checkTeamsCredential).mockResolvedValue({
				status: 'failed',
				reason: 'unreachable',
			});

			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(getByTestId('teams-credential-recheck')).toBeVisible());

			vi.mocked(checkTeamsCredential).mockClear();
			await fireEvent.click(getByTestId('teams-credential-recheck'));

			await waitFor(() => expect(checkTeamsCredential).toHaveBeenCalled());
		});

		it('keeps connecting for last, because the modal closes on it', async () => {
			vi.mocked(getTeamsDiscovery).mockResolvedValue({
				status: 'found',
				clientId: CLIENT_ID,
				tenantId: TENANT_ID,
				existingCredentialId: 'cred-1',
			});
			vi.useFakeTimers({ shouldAdvanceTime: true });

			const { getByTestId, emitted } = renderComponent({ props: props() });
			await waitFor(() => expect(getByTestId('teams-discovery-listening')).toBeVisible());
			await vi.advanceTimersByTimeAsync(2500);

			await waitFor(() => expect(getByTestId('teams-connect')).toBeVisible());
			await fireEvent.click(getByTestId('teams-connect'));

			expect(emitted().connect).toBeTruthy();
		});

		it('adopts the credential discovery found, so connecting is possible', async () => {
			vi.mocked(getTeamsDiscovery).mockResolvedValue({
				status: 'found',
				clientId: CLIENT_ID,
				tenantId: TENANT_ID,
				existingCredentialId: 'cred-1',
			});
			vi.useFakeTimers({ shouldAdvanceTime: true });

			const { getByTestId, emitted } = renderComponent({ props: props() });
			await waitFor(() => expect(getByTestId('teams-discovery-listening')).toBeVisible());
			await vi.advanceTimersByTimeAsync(2500);

			await waitFor(() => expect(emitted()['update:modelValue']).toBeTruthy());
			expect(emitted()['update:modelValue']?.at(-1)).toEqual(['cred-1']);
		});
	});

	describe('edit mode', () => {
		it('shows the endpoint URL and nothing from the setup steps', async () => {
			const { container, queryByTestId } = renderComponent({
				props: props({ mode: 'edit', connected: true }),
			});

			await waitFor(() => {
				expect(container.querySelector('#teams-messaging-endpoint-url')).toHaveValue(ENDPOINT);
			});
			expect(queryByTestId('teams-deploy-to-azure')).toBeNull();
			expect(queryByTestId('teams-discovery-listening')).toBeNull();
			expect(queryByTestId('teams-scope-channels')).toBeNull();
		});
	});

	it('still shows the endpoint URL when the setup state cannot be loaded', async () => {
		vi.mocked(getTeamsSetupState).mockRejectedValue(new Error('offline'));

		const { container } = renderComponent({ props: props() });

		await waitFor(() => {
			expect(container.querySelector('#teams-messaging-endpoint-url')).toHaveValue(
				'http://localhost:5678/rest/projects/p/agents/v2/a/webhooks/teams',
			);
		});
	});
});
