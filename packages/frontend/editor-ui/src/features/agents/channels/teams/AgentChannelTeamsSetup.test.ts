import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor } from '@testing-library/vue';

import AgentChannelTeamsSetup from './AgentChannelTeamsSetup.vue';
import type { TeamsCredentialCheck } from '@n8n/api-types';

import { checkTeamsCredential, fetchTeamsAppPackage, getTeamsSetupState } from './api';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		// Keeps interpolated values assertable, since the key stands in for the copy.
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join(' ')}` : key,
	}),
}));

vi.mock('file-saver', () => ({
	saveAs: vi.fn(),
}));

vi.mock('./api', () => ({
	checkTeamsCredential: vi.fn(),
	getTeamsSetupState: vi.fn(),
	fetchTeamsAppPackage: vi.fn(),
}));

// The shared default is `data-test-id`; these components use `data-testid`.
configure({ testIdAttribute: 'data-testid' });

// N8nStepper renders every step's slot, so one render covers the whole stepper.
const ENDPOINT = 'https://n8n.example.com/rest/projects/p/agents/v2/a/webhooks/teams';
const DEPLOY_URL = 'https://portal.azure.com/#create/Microsoft.Template/uri/encoded';
const DEFAULT_NAME = 'Support Bot';
const DEFAULT_DESCRIPTION = 'Chat with Support Bot, an agent powered by n8n.';
const CLIENT_ID = '11111111-2222-3333-4444-555555555555';

const renderComponent = createComponentRenderer(AgentChannelTeamsSetup);

// N8nSwitch2 is a Reka UI switch: a button with aria-checked, not an input.
const checkedSwitch = (el: HTMLElement) => el.getAttribute('aria-checked') === 'true';

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
			credentialClaimedBy: null,
			defaultDisplayName: DEFAULT_NAME,
			defaultDescription: DEFAULT_DESCRIPTION,
		});
		vi.mocked(fetchTeamsAppPackage).mockResolvedValue(new Blob(['zip']));
		vi.mocked(checkTeamsCredential).mockResolvedValue({ status: 'ok' });
	});

	afterEach(() => vi.useRealTimers());

	describe('step 1, the credential', () => {
		it('leads with the Entra registration the rest is built from', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-entra-register-link')).toBeVisible());
		});

		it('says up front what account and permissions are needed', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-create-bot-prerequisites')).toBeVisible());
		});

		it('comes before the deployment, which cannot be filled in without it', async () => {
			const { container } = renderComponent({ props: props() });

			await waitFor(() => expect(container.textContent).toContain('setup.createCredential.title'));
			const text = container.textContent ?? '';
			expect(text.indexOf('setup.createCredential.title')).toBeLessThan(
				text.indexOf('setup.createBot.title'),
			);
		});
	});

	describe('step 2, deploy the bot', () => {
		it('keeps the endpoint URL out of the way, since the deployment sets it', async () => {
			const { getByTestId, container } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-show-endpoint')).toBeVisible());
			expect(container.querySelector('#teams-messaging-endpoint-url')).toBeNull();
		});

		it('reveals the endpoint URL for someone wiring up a bot they already have', async () => {
			const { getByTestId, container } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-show-endpoint')).toBeVisible());
			await fireEvent.click(getByTestId('teams-show-endpoint'));

			await waitFor(() => {
				expect(container.querySelector('#teams-messaging-endpoint-url')).toHaveValue(ENDPOINT);
			});
		});

		it('withholds the deployment until a credential supplies the Entra IDs', async () => {
			vi.mocked(getTeamsSetupState).mockResolvedValue({
				messagingEndpointUrl: ENDPOINT,
				botId: null,
				deployToAzureUrl: null,
				credentialClaimedBy: null,
				defaultDisplayName: DEFAULT_NAME,
				defaultDescription: DEFAULT_DESCRIPTION,
			});

			const { getByTestId, queryByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-deploy-blocked')).toBeVisible());
			expect(queryByTestId('teams-deploy-to-azure')).toBeNull();
		});

		it('offers the deployment once the credential is picked', async () => {
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() => {
				expect(getByTestId('teams-deploy-to-azure')).toHaveAttribute('href', DEPLOY_URL);
			});
		});

		it('rebuilds the deployment when the credential changes, since it is baked in', async () => {
			const { rerender } = renderComponent({ props: props() });
			await waitFor(() => expect(getTeamsSetupState).toHaveBeenCalled());
			vi.mocked(getTeamsSetupState).mockClear();

			await rerender(props({ modelValue: 'cred-2' }));

			await waitFor(() =>
				expect(getTeamsSetupState).toHaveBeenCalledWith(expect.anything(), 'p', 'a', 'cred-2'),
			);
		});
	});

	describe('step 3, availability', () => {
		it('shows direct chat as fixed, with no control to change it', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-scope-direct')).toBeVisible());
			expect(getByTestId('teams-scope-direct').querySelector('[role="switch"]')).toBeNull();
		});

		it('starts with everything else off', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-scope-channels')).toBeVisible());
			expect(checkedSwitch(getByTestId('teams-scope-channels'))).toBe(false);
			expect(checkedSwitch(getByTestId('teams-scope-groups'))).toBe(false);
		});

		it('summarises each panel, so a collapsed one still says what it is set to', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-where-summary')).toBeVisible());
			expect(getByTestId('teams-where-summary').textContent).toContain(
				'setup.availability.directChat',
			);
			expect(getByTestId('teams-reading-summary').textContent).toContain(
				'setup.availability.readingSummaryNone',
			);

			await fireEvent.click(getByTestId('teams-scope-channels'));

			await waitFor(() =>
				expect(getByTestId('teams-where-summary').textContent).toContain(
					'setup.availability.teamChannels',
				),
			);
		});

		it('collapses an open panel when its header is clicked', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-scope-channels')).toBeVisible());
			await fireEvent.click(getByTestId('teams-where-summary'));

			await waitFor(() => expect(getByTestId('teams-scope-channels')).not.toBeVisible());
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
			await waitFor(() => expect(checkedSwitch(getByTestId('teams-read-channels'))).toBe(true));

			await fireEvent.click(getByTestId('teams-scope-channels'));

			await waitFor(() => expect(checkedSwitch(getByTestId('teams-read-channels'))).toBe(false));
		});

		it('restores saved settings', async () => {
			const { getByTestId } = renderComponent({
				props: props({ savedSettings: { teamChannels: true, readAllChannelMessages: true } }),
			});

			await waitFor(() => expect(checkedSwitch(getByTestId('teams-scope-channels'))).toBe(true));
			expect(checkedSwitch(getByTestId('teams-read-channels'))).toBe(true);
		});
	});

	describe('step 4, install', () => {
		it('withholds the package until a credential is picked', async () => {
			const { getByTestId, queryByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-package-blocked')).toBeVisible());
			expect(queryByTestId('teams-download-package')).toBeNull();
		});

		it('fetches the package rather than linking to it, so the session survives', async () => {
			vi.mocked(getTeamsSetupState).mockResolvedValue({
				messagingEndpointUrl: ENDPOINT,
				botId: CLIENT_ID,
				deployToAzureUrl: DEPLOY_URL,
				credentialClaimedBy: null,
				defaultDisplayName: DEFAULT_NAME,
				defaultDescription: DEFAULT_DESCRIPTION,
			});

			const { getByTestId } = renderComponent({ props: props({ connected: true }) });
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeVisible());
			expect(getByTestId('teams-download-package')).not.toHaveAttribute('href');

			await fireEvent.click(getByTestId('teams-download-package'));

			await waitFor(() => expect(fetchTeamsAppPackage).toHaveBeenCalled());
			expect(vi.mocked(fetchTeamsAppPackage).mock.calls[0]?.slice(1, 3)).toEqual(['p', 'a']);
		});

		it('reports a failed download instead of silently doing nothing', async () => {
			vi.mocked(getTeamsSetupState).mockResolvedValue({
				messagingEndpointUrl: ENDPOINT,
				botId: CLIENT_ID,
				deployToAzureUrl: DEPLOY_URL,
				credentialClaimedBy: null,
				defaultDisplayName: DEFAULT_NAME,
				defaultDescription: DEFAULT_DESCRIPTION,
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

		it('unlocks saving once the credential checks out, without announcing it', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});

			await waitFor(() => expect(getByTestId('teams-connect')).not.toBeDisabled());
			// An enabled button says it already; a success line would only repeat it.
			expect(queryByTestId('teams-credential-problem')).toBeNull();
			expect(queryByTestId('teams-connect-blocked')).toBeNull();
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
			const { getByTestId, emitted } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() => expect(getByTestId('teams-connect')).toBeVisible());
			await fireEvent.click(getByTestId('teams-connect'));

			expect(emitted().connect).toBeTruthy();
		});
	});

	describe('settings', () => {
		const settingsProps = (overrides: Record<string, unknown> = {}) =>
			props({ mode: 'edit', connected: true, modelValue: 'cred-1', ...overrides });

		it('says that changes here mean downloading the package again', async () => {
			const { getByTestId } = renderComponent({ props: settingsProps() });

			await waitFor(() => expect(getByTestId('teams-update-notice')).toBeVisible());
		});

		it('lets the app name and description be changed after setup', async () => {
			const { getByTestId } = renderComponent({ props: settingsProps() });

			await waitFor(() => expect(getByTestId('teams-display-name')).toBeVisible());
			expect(getByTestId('teams-description')).toBeVisible();
		});

		it('starts the availability panels collapsed, summarised', async () => {
			const { getByTestId } = renderComponent({ props: settingsProps() });

			await waitFor(() => expect(getByTestId('teams-where-summary')).toBeVisible());
			// Rendered but folded away, so settings opens on the summary rather than
			// on five controls.
			expect(getByTestId('teams-scope-channels')).not.toBeVisible();
			expect(getByTestId('teams-reading-summary')).toBeVisible();
		});

		it('opens a collapsed panel when its header is clicked', async () => {
			const { getByTestId } = renderComponent({ props: settingsProps() });

			await waitFor(() => expect(getByTestId('teams-where-summary')).toBeVisible());
			await fireEvent.click(getByTestId('teams-where-summary'));

			await waitFor(() => expect(getByTestId('teams-scope-channels')).toBeVisible());
		});

		it('shows what the manifest would use as a placeholder, not as a value', async () => {
			const { getByTestId } = renderComponent({ props: settingsProps() });

			const name = () => getByTestId('teams-display-name').querySelector('input');
			await waitFor(() => expect(name()).toHaveAttribute('placeholder', DEFAULT_NAME));

			// Filling them in would save them as overrides, and the Teams app would
			// then keep the old name after the agent is renamed.
			expect(name()).toHaveValue('');
			expect(getByTestId('teams-description').querySelector('input')).toHaveAttribute(
				'placeholder',
				DEFAULT_DESCRIPTION,
			);
		});

		it('keeps a saved override rather than replacing it with the default', async () => {
			const { getByTestId } = renderComponent({
				props: settingsProps({ savedSettings: { displayName: 'Helpdesk' } }),
			});

			await waitFor(() =>
				expect(getByTestId('teams-display-name').querySelector('input')).toHaveValue('Helpdesk'),
			);
			// The description had no override, so it keeps following the agent.
			expect(getByTestId('teams-description').querySelector('input')).toHaveValue('');
		});

		it('restores saved settings, including the app identity', async () => {
			const { getByTestId } = renderComponent({
				props: settingsProps({
					savedSettings: {
						displayName: 'Support',
						description: 'Answers questions',
						teamChannels: true,
					},
				}),
			});

			await waitFor(() =>
				expect(getByTestId('teams-display-name').querySelector('input')).toHaveValue('Support'),
			);
			expect(getByTestId('teams-description').querySelector('input')).toHaveValue(
				'Answers questions',
			);
			// Mounted while collapsed, so its state is readable without expanding.
			expect(checkedSwitch(getByTestId('teams-scope-channels'))).toBe(true);
		});

		it('offers the package again, so a change can be applied', async () => {
			vi.mocked(getTeamsSetupState).mockResolvedValue({
				messagingEndpointUrl: ENDPOINT,
				botId: CLIENT_ID,
				deployToAzureUrl: DEPLOY_URL,
				credentialClaimedBy: null,
				defaultDisplayName: DEFAULT_NAME,
				defaultDescription: DEFAULT_DESCRIPTION,
			});

			const { getByTestId } = renderComponent({ props: settingsProps() });

			await waitFor(() => expect(getByTestId('teams-download-package')).toBeVisible());
		});

		it('keeps the endpoint URL tucked away here too', async () => {
			const { getByTestId, container } = renderComponent({ props: settingsProps() });

			await waitFor(() => expect(getByTestId('teams-show-endpoint')).toBeVisible());
			expect(container.querySelector('#teams-messaging-endpoint-url')).toBeNull();

			await fireEvent.click(getByTestId('teams-show-endpoint'));

			await waitFor(() =>
				expect(container.querySelector('#teams-messaging-endpoint-url')).toHaveValue(ENDPOINT),
			);
		});

		it('does not spend a Microsoft token request on a check nothing here reads', async () => {
			renderComponent({ props: settingsProps() });

			await waitFor(() => expect(getTeamsSetupState).toHaveBeenCalled());
			expect(checkTeamsCredential).not.toHaveBeenCalled();
		});

		it('shows nothing from the setup steps', async () => {
			const { queryByTestId } = renderComponent({ props: settingsProps() });

			await waitFor(() => expect(queryByTestId('teams-deploy-to-azure')).toBeNull());
			expect(queryByTestId('teams-entra-register-link')).toBeNull();
		});
	});

	it('downloads the package with the availability chosen in the stepper, not the stored one', async () => {
		vi.mocked(getTeamsSetupState).mockResolvedValue({
			messagingEndpointUrl: ENDPOINT,
			botId: CLIENT_ID,
			deployToAzureUrl: DEPLOY_URL,
			credentialClaimedBy: null,
			defaultDisplayName: DEFAULT_NAME,
			defaultDescription: DEFAULT_DESCRIPTION,
		});

		const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

		await waitFor(() => expect(getByTestId('teams-download-package')).toBeVisible());
		await fireEvent.click(getByTestId('teams-scope-channels'));
		await fireEvent.click(getByTestId('teams-download-package'));

		// Nothing is stored until connect, which happens after this download.
		await waitFor(() =>
			expect(fetchTeamsAppPackage).toHaveBeenCalledWith(
				expect.anything(),
				'p',
				'a',
				'cred-1',
				expect.objectContaining({ teamChannels: true }),
			),
		);
	});

	describe('a credential another agent already uses', () => {
		const claimed = () =>
			vi.mocked(getTeamsSetupState).mockResolvedValue({
				messagingEndpointUrl: ENDPOINT,
				botId: CLIENT_ID,
				// The server withholds the deployment for the same reason.
				deployToAzureUrl: null,
				credentialClaimedBy: 'Sales Bot',
				defaultDisplayName: DEFAULT_NAME,
				defaultDescription: DEFAULT_DESCRIPTION,
			});

		it('says so on the step where the credential is chosen', async () => {
			claimed();

			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() =>
				expect(getByTestId('teams-credential-claimed')).toHaveTextContent('Sales Bot'),
			);
		});

		it('offers neither the deployment nor the package', async () => {
			claimed();

			const { getByTestId, queryByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});

			await waitFor(() => expect(getByTestId('teams-credential-claimed')).toBeVisible());
			expect(queryByTestId('teams-deploy-to-azure')).toBeNull();
			expect(queryByTestId('teams-download-package')).toBeNull();
		});

		it('keeps connect disabled even though the credential itself works', async () => {
			claimed();

			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() => expect(getByTestId('teams-credential-claimed')).toBeVisible());
			expect(getByTestId('teams-connect')).toBeDisabled();
		});
	});

	describe('when the selected credential changes', () => {
		it('drops the previous verification, so Save cannot use it', async () => {
			let release: ((value: TeamsCredentialCheck) => void) | undefined;
			vi.mocked(checkTeamsCredential)
				.mockResolvedValueOnce({ status: 'ok' })
				.mockImplementationOnce(async () => await new Promise((resolve) => (release = resolve)));

			const { getByTestId, rerender } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await waitFor(() => expect(getByTestId('teams-connect')).toBeEnabled());

			await rerender(props({ modelValue: 'cred-2' }));

			// The second check has not answered yet, so nothing is verified.
			await waitFor(() => expect(getByTestId('teams-connect')).toBeDisabled());
			release?.({ status: 'ok' });
		});

		it('ignores an answer for the credential that is no longer selected', async () => {
			let releaseFirst: ((value: TeamsCredentialCheck) => void) | undefined;
			vi.mocked(checkTeamsCredential)
				.mockImplementationOnce(
					async () => await new Promise((resolve) => (releaseFirst = resolve)),
				)
				.mockResolvedValueOnce({ status: 'failed', reason: 'rejected' });

			const { getByTestId, rerender } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await rerender(props({ modelValue: 'cred-2' }));
			await waitFor(() => expect(getByTestId('teams-credential-problem')).toBeVisible());

			// The first credential's answer lands last and must be discarded.
			releaseFirst?.({ status: 'ok' });

			await waitFor(() => expect(getByTestId('teams-connect')).toBeDisabled());
		});
	});

	it('adopts saved settings that arrive after the view is rendered', async () => {
		const { getByTestId, rerender } = renderComponent({ props: props({ mode: 'edit' }) });

		// The panels start collapsed here, so the switch is present but not shown.
		await waitFor(() => expect(getByTestId('teams-scope-channels')).toBeInTheDocument());
		expect(checkedSwitch(getByTestId('teams-scope-channels'))).toBe(false);

		await rerender(props({ mode: 'edit', savedSettings: { teamChannels: true } }));

		await waitFor(() => expect(checkedSwitch(getByTestId('teams-scope-channels'))).toBe(true));
	});

	it('keeps an edit when saved settings arrive afterwards', async () => {
		const { getByTestId, rerender } = renderComponent({ props: props({ mode: 'edit' }) });

		await waitFor(() => expect(getByTestId('teams-scope-groups')).toBeInTheDocument());
		await fireEvent.click(getByTestId('teams-scope-groups'));

		await rerender(props({ mode: 'edit', savedSettings: { teamChannels: true } }));

		// The late arrival must not undo what the user just turned on.
		await waitFor(() => expect(checkedSwitch(getByTestId('teams-scope-groups'))).toBe(true));
	});

	it('asks for the setup state once on open, not once per trigger that wants it', async () => {
		renderComponent({ props: props() });

		await waitFor(() => expect(getTeamsSetupState).toHaveBeenCalled());
		expect(getTeamsSetupState).toHaveBeenCalledTimes(1);
	});

	it('still shows the endpoint URL when the setup state cannot be loaded', async () => {
		vi.mocked(getTeamsSetupState).mockRejectedValue(new Error('offline'));

		const { getByTestId, container } = renderComponent({ props: props() });

		await waitFor(() => expect(getByTestId('teams-show-endpoint')).toBeVisible());
		await fireEvent.click(getByTestId('teams-show-endpoint'));

		await waitFor(() => {
			expect(container.querySelector('#teams-messaging-endpoint-url')).toHaveValue(
				'http://localhost:5678/rest/projects/p/agents/v2/a/webhooks/teams',
			);
		});
	});
});
