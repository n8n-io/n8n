import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor } from '@testing-library/vue';

import AgentChannelTeamsSetup from './AgentChannelTeamsSetup.vue';
import { getTeamsDiscovery, getTeamsSetupState, startTeamsDiscovery } from './api';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('./api', () => ({
	getTeamsSetupState: vi.fn(),
	getTeamsDiscovery: vi.fn(),
	startTeamsDiscovery: vi.fn(),
	stopTeamsDiscovery: vi.fn(),
	teamsAppPackageUrl: () => 'https://n8n.example.com/rest/teams/package',
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
		});
		vi.mocked(startTeamsDiscovery).mockResolvedValue({ status: 'waiting' });
		vi.mocked(getTeamsDiscovery).mockResolvedValue({ status: 'waiting' });
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

		it('keeps the plain portal link for someone who already has a bot', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-azure-portal-link')).toBeVisible());
		});
	});

	describe('step 2, connect the bot', () => {
		it('listens after the user starts it', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-start-discovery')).toBeVisible());
			await fireEvent.click(getByTestId('teams-start-discovery'));

			await waitFor(() => expect(getByTestId('teams-discovery-listening')).toBeVisible());
			expect(startTeamsDiscovery).toHaveBeenCalledWith(expect.anything(), 'p', 'a');
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
			await waitFor(() => expect(getByTestId('teams-start-discovery')).toBeVisible());
			await fireEvent.click(getByTestId('teams-start-discovery'));

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
			await waitFor(() => expect(getByTestId('teams-start-discovery')).toBeVisible());
			await fireEvent.click(getByTestId('teams-start-discovery'));
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
			await waitFor(() => expect(getByTestId('teams-start-discovery')).toBeVisible());
			await fireEvent.click(getByTestId('teams-start-discovery'));
			await vi.advanceTimersByTimeAsync(2500);

			await waitFor(() => expect(container.textContent).toContain('connectBot.foundExisting'));
		});

		it('offers a way out while listening', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-start-discovery')).toBeVisible());
			await fireEvent.click(getByTestId('teams-start-discovery'));

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
		it('withholds the package until the bot is connected', async () => {
			const { getByTestId, queryByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-package-blocked')).toBeVisible());
			expect(queryByTestId('teams-download-package')).toBeNull();
		});

		it('offers the package once the bot is connected', async () => {
			vi.mocked(getTeamsSetupState).mockResolvedValue({
				messagingEndpointUrl: ENDPOINT,
				botId: CLIENT_ID,
				deployToAzureUrl: DEPLOY_URL,
			});

			const { getByTestId } = renderComponent({ props: props({ connected: true }) });

			await waitFor(() => expect(getByTestId('teams-download-package')).toBeVisible());
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
			expect(queryByTestId('teams-start-discovery')).toBeNull();
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
