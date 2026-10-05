import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { saveAs } from 'file-saver';

import AgentChannelTeamsSetup from './AgentChannelTeamsSetup.vue';
import type { TeamsCredentialCheck } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { checkTeamsCredential, fetchTeamsAppPackage, getTeamsSetupState } from './api';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		// Keeps interpolated values assertable, since the key stands in for the copy.
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join(' ')}` : key,
	}),
}));

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

vi.mock('file-saver', () => ({
	saveAs: vi.fn(),
}));

const { showMessage, showError } = vi.hoisted(() => ({ showMessage: vi.fn(), showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
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

// A picked credential has a bot ID, which unlocks the last two steps once verified.
const withBot = () =>
	vi.mocked(getTeamsSetupState).mockResolvedValue({
		messagingEndpointUrl: ENDPOINT,
		botId: CLIENT_ID,
		deployToAzureUrl: DEPLOY_URL,
		credentialClaimedBy: null,
		defaultDisplayName: DEFAULT_NAME,
		defaultDescription: DEFAULT_DESCRIPTION,
	});

const WHERE_TITLE = 'agents.channels.teams.setup.availability.whereTitle';
const SUMMARY_SEPARATOR = 'agents.channels.teams.setup.availability.summarySeparator';

// The panel starts collapsed and mounts its rows only once opened. In setup it
// also stays inert until the credential is verified.
const openAvailability = async (getByTestId: (id: string) => HTMLElement) => {
	await waitFor(() => expect(getByTestId('teams-availability').closest('[inert]')).toBeNull());
	await fireEvent.click(
		within(getByTestId('teams-availability')).getByLabelText(`Toggle ${WHERE_TITLE}`),
	);
	await waitFor(() => expect(getByTestId('teams-scope-channels')).toBeVisible());
};

const expectSummary = async (getByTestId: (id: string) => HTMLElement, summary: string) =>
	await waitFor(() =>
		expect(within(getByTestId('teams-availability')).getByText(summary)).toBeVisible(),
	);

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

	describe('step 1, register the app', () => {
		it('links to the Entra registration the rest is built from', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-entra-register-link')).toBeVisible());
		});

		it('comes before the credential, which is made from it', async () => {
			const { container } = renderComponent({ props: props() });

			await waitFor(() => expect(container.textContent).toContain('setup.registerApp.title'));
			const text = container.textContent ?? '';
			expect(text.indexOf('setup.registerApp.title')).toBeLessThan(
				text.indexOf('setup.createCredential.title'),
			);
			expect(text.indexOf('setup.createCredential.title')).toBeLessThan(
				text.indexOf('setup.createBot.title'),
			);
		});
	});

	describe('step 2, the credential', () => {
		it('confirms a credential that reaches Microsoft', async () => {
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() => expect(getByTestId('teams-credential-verified')).toBeVisible());
		});

		it('says nothing about a credential until one is picked', async () => {
			const { queryByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getTeamsSetupState).toHaveBeenCalled());
			expect(queryByTestId('teams-credential-verified')).toBeNull();
			expect(queryByTestId('teams-credential-problem')).toBeNull();
		});

		it('explains a rejected credential and offers a retry', async () => {
			vi.mocked(checkTeamsCredential).mockResolvedValue({
				status: 'failed',
				reason: 'unreachable',
			});

			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() =>
				expect(getByTestId('teams-credential-problem')).toHaveTextContent(
					'setup.install.failed.unreachable',
				),
			);

			vi.mocked(checkTeamsCredential).mockClear();
			await fireEvent.click(getByTestId('teams-credential-recheck'));

			await waitFor(() => expect(checkTeamsCredential).toHaveBeenCalled());
		});
	});

	describe('step 3, deploy the bot', () => {
		it('shows the Azure subscription hint', async () => {
			const { getByText } = renderComponent({ props: props() });

			await waitFor(() =>
				expect(getByText('agents.channels.teams.setup.createBot.hint')).toBeVisible(),
			);
		});

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

		it('disables the deployment until a credential supplies the Entra IDs', async () => {
			vi.mocked(getTeamsSetupState).mockResolvedValue({
				messagingEndpointUrl: ENDPOINT,
				botId: null,
				deployToAzureUrl: null,
				credentialClaimedBy: null,
				defaultDisplayName: DEFAULT_NAME,
				defaultDescription: DEFAULT_DESCRIPTION,
			});

			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-deploy-to-azure')).toBeDisabled());
			expect(getByTestId('teams-deploy-blocked')).toHaveTextContent('createBot.needsCredential');
		});

		it('offers the deployment once the credential checks out', async () => {
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() => {
				expect(getByTestId('teams-deploy-to-azure')).toHaveAttribute('href', DEPLOY_URL);
			});
		});

		it('withholds the deployment while the credential fails its check', async () => {
			vi.mocked(checkTeamsCredential).mockResolvedValue({ status: 'failed', reason: 'rejected' });

			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() => expect(getByTestId('teams-credential-problem')).toBeVisible());
			expect(getByTestId('teams-deploy-to-azure')).toBeDisabled();
			expect(getByTestId('teams-deploy-to-azure')).not.toHaveAttribute('href');
			expect(getByTestId('teams-deploy-blocked')).toHaveTextContent('createBot.needsCredential');
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

	describe('step 4, availability', () => {
		it('stays locked until the credential checks out', async () => {
			withBot();
			vi.mocked(checkTeamsCredential).mockResolvedValue({ status: 'failed', reason: 'rejected' });

			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() => expect(getByTestId('teams-credential-problem')).toBeVisible());
			// Inert, so keyboard focus cannot reach the panel either.
			expect(getByTestId('teams-availability-step')).toHaveAttribute('inert');
		});

		it('starts collapsed, summarised, with everything but direct chat off', async () => {
			withBot();
			const { getByTestId, queryByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});

			await expectSummary(getByTestId, 'agents.channels.teams.setup.availability.directChatOnly');
			expect(queryByTestId('teams-scope-channels')).toBeNull();

			await openAvailability(getByTestId);
			expect(checkedSwitch(getByTestId('teams-scope-channels'))).toBe(false);
			expect(checkedSwitch(getByTestId('teams-scope-groups'))).toBe(false);
		});

		it('does not offer the read permissions yet', async () => {
			withBot();
			const { getByTestId, queryByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await openAvailability(getByTestId);

			await fireEvent.click(getByTestId('teams-scope-channels'));
			await fireEvent.click(getByTestId('teams-scope-groups'));

			await waitFor(() => expect(checkedSwitch(getByTestId('teams-scope-groups'))).toBe(true));
			expect(queryByTestId('teams-read-channels')).toBeNull();
			expect(queryByTestId('teams-read-groups')).toBeNull();
		});

		it('summarises each choice, so the collapsed panel says what it is set to', async () => {
			withBot();
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await openAvailability(getByTestId);

			await fireEvent.click(getByTestId('teams-scope-channels'));

			await expectSummary(
				getByTestId,
				[
					'agents.channels.teams.setup.availability.directChat',
					'agents.channels.teams.setup.availability.teamChannels',
				].join(SUMMARY_SEPARATOR),
			);
		});

		it('restores saved settings', async () => {
			withBot();
			const { getByTestId } = renderComponent({
				props: props({
					modelValue: 'cred-1',
					savedSettings: { teamChannels: true, readAllChannelMessages: true },
				}),
			});

			await openAvailability(getByTestId);
			expect(checkedSwitch(getByTestId('teams-scope-channels'))).toBe(true);
		});
	});

	describe('step 5, connect', () => {
		it('shows the identity Teams will display', async () => {
			withBot();
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() => expect(getByTestId('teams-identity')).toHaveTextContent(DEFAULT_NAME));
			expect(getByTestId('teams-identity')).toHaveTextContent(DEFAULT_DESCRIPTION);
		});

		it('stays locked until the credential checks out', async () => {
			withBot();
			vi.mocked(checkTeamsCredential).mockResolvedValue({ status: 'failed', reason: 'rejected' });

			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() => expect(getByTestId('teams-credential-problem')).toBeVisible());
			expect(getByTestId('teams-download-package')).toBeDisabled();
		});

		it('stays locked while no credential is picked, and says why', async () => {
			const { getByTestId } = renderComponent({ props: props() });

			await waitFor(() => expect(getByTestId('teams-download-package')).toBeDisabled());
			expect(getByTestId('teams-package-blocked')).toBeVisible();
		});

		const connectAndFail = async () => {
			withBot();
			const utils = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(utils.getByTestId('teams-download-package')).toBeEnabled());
			await fireEvent.click(utils.getByTestId('teams-download-package'));
			await waitFor(() => expect(utils.emitted().connect).toHaveLength(1));
			await utils.rerender(props({ modelValue: 'cred-1', errorMessage: 'Bot rejected' }));
			return utils;
		};

		it('shows a failed connect next to the button that started it, and only there', async () => {
			const { getByTestId, queryByText } = await connectAndFail();

			await waitFor(() =>
				expect(getByTestId('teams-connect-error')).toHaveTextContent('Bot rejected'),
			);
			expect(queryByText('Bot rejected')).toBeNull();
		});

		it('retries a failed connect without downloading the package again', async () => {
			const { getByTestId, emitted } = await connectAndFail();
			await waitFor(() => expect(getByTestId('teams-connect-retry')).toBeVisible());

			await fireEvent.click(getByTestId('teams-connect-retry'));

			expect(emitted().connect).toHaveLength(2);
			expect(fetchTeamsAppPackage).toHaveBeenCalledTimes(1);
		});

		it('keeps a conflict in step 2, since it is about the credential', async () => {
			withBot();
			const { getByText, queryByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1', errorMessage: 'Bot in use', errorIsConflict: true }),
			});

			await waitFor(() => expect(getByText('Bot in use')).toBeVisible());
			expect(queryByTestId('teams-connect-error')).toBeNull();
		});

		it('does not connect a credential picked while the package downloads', async () => {
			withBot();
			let release: ((blob: Blob) => void) | undefined;
			vi.mocked(fetchTeamsAppPackage).mockImplementation(
				async () => await new Promise((resolve) => (release = resolve)),
			);
			const { getByTestId, emitted, rerender } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
			await fireEvent.click(getByTestId('teams-download-package'));
			await waitFor(() => expect(fetchTeamsAppPackage).toHaveBeenCalled());

			await rerender(props({ modelValue: 'cred-2' }));
			release?.(new Blob(['zip']));
			await flushPromises();

			expect(emitted().connect).toBeFalsy();
			expect(showMessage).not.toHaveBeenCalled();
			await waitFor(() => expect(getByTestId('teams-stale-download')).toBeVisible());
		});

		it('offers the package on a connected channel even when the check does not pass', async () => {
			withBot();
			vi.mocked(checkTeamsCredential).mockResolvedValue({
				status: 'failed',
				reason: 'unreachable',
			});

			const { getByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1', connected: true }),
			});

			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
		});

		it('does not connect again when the channel is already connected', async () => {
			withBot();
			const { getByTestId, emitted } = renderComponent({
				props: props({ modelValue: 'cred-1', connected: true }),
			});
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());

			await fireEvent.click(getByTestId('teams-download-package'));

			await waitFor(() => expect(saveAs).toHaveBeenCalled());
			expect(emitted().connect).toBeFalsy();
		});

		it('fetches the package rather than linking to it, so the session survives', async () => {
			withBot();
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
			expect(getByTestId('teams-download-package')).not.toHaveAttribute('href');

			await fireEvent.click(getByTestId('teams-download-package'));

			await waitFor(() => expect(fetchTeamsAppPackage).toHaveBeenCalled());
			expect(vi.mocked(fetchTeamsAppPackage).mock.calls[0]?.slice(1, 3)).toEqual(['p', 'a']);
		});

		it('connects once the package is saved', async () => {
			withBot();
			const { getByTestId, emitted } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());

			await fireEvent.click(getByTestId('teams-download-package'));

			await waitFor(() => expect(emitted().connect).toBeTruthy());
			expect(saveAs).toHaveBeenCalled();
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'agents.channels.teams.setup.install.downloaded' }),
			);
		});

		it('does nothing more once the view is gone before the download finishes', async () => {
			withBot();
			let release: ((blob: Blob) => void) | undefined;
			vi.mocked(fetchTeamsAppPackage).mockImplementation(
				async () => await new Promise((resolve) => (release = resolve)),
			);
			const { getByTestId, emitted, unmount } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
			await fireEvent.click(getByTestId('teams-download-package'));
			await waitFor(() => expect(fetchTeamsAppPackage).toHaveBeenCalled());

			unmount();
			release?.(new Blob(['zip']));
			await flushPromises();

			expect(showMessage).not.toHaveBeenCalled();
			expect(emitted().connect).toBeFalsy();
		});

		it('names the download step and what the package is built from', async () => {
			const { getByText } = renderComponent({ props: props() });

			await waitFor(() =>
				expect(getByText('agents.channels.teams.setup.download.title')).toBeVisible(),
			);
			expect(getByText('agents.channels.teams.setup.download.description')).toBeVisible();
		});

		it('reports a failed download and does not connect', async () => {
			withBot();
			vi.mocked(fetchTeamsAppPackage).mockRejectedValue(new Error('401'));

			const { getByTestId, emitted } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
			await fireEvent.click(getByTestId('teams-download-package'));

			await waitFor(() => expect(getByTestId('teams-download-error')).toBeVisible());
			expect(emitted().connect).toBeFalsy();
		});
	});

	describe('step 6, upload in Teams', () => {
		const UPLOAD = 'agents.channels.teams.setup.install.description';

		const downloadAndConnect = async () => {
			withBot();
			const utils = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(utils.getByTestId('teams-download-package')).toBeEnabled());
			await fireEvent.click(utils.getByTestId('teams-download-package'));
			await waitFor(() => expect(utils.emitted().connect).toBeTruthy());
			return utils;
		};

		it('says where to upload the zip, and what to do without the option', async () => {
			const { getByText, getByTestId } = renderComponent({ props: props() });

			await waitFor(() =>
				expect(getByText('agents.channels.teams.setup.install.title')).toBeVisible(),
			);
			expect(getByText(UPLOAD)).toBeVisible();
			expect(getByTestId('teams-upload-hint')).toHaveTextContent(
				'agents.channels.teams.setup.install.hint',
			);
		});

		it.each([
			[['teams-scope-channels'], 'agents.channels.teams.setup.install.addTo.teams'],
			[['teams-scope-groups'], 'agents.channels.teams.setup.install.addTo.chats'],
			[
				['teams-scope-channels', 'teams-scope-groups'],
				'agents.channels.teams.setup.install.addTo.both',
			],
		])('tells the user where to add the app for %j', async (scopes, addTo) => {
			withBot();
			const { getByTestId, getByText } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await openAvailability(getByTestId);

			for (const scope of scopes) await fireEvent.click(getByTestId(scope));

			await waitFor(() => expect(getByText(`${UPLOAD} ${addTo}`)).toBeVisible());
		});

		it('adds nothing about teams or chats for direct chat only', async () => {
			const { getByText } = renderComponent({ props: props() });

			await waitFor(() => expect(getByText(UPLOAD)).toBeVisible());
		});

		it('asks the modal to stay open after connecting in setup, but not in settings', async () => {
			const Host = defineComponent({
				components: { AgentChannelTeamsSetup },
				props: { viewProps: { type: Object, required: true } },
				setup: () => ({ view: ref<InstanceType<typeof AgentChannelTeamsSetup>>() }),
				template: `<div><AgentChannelTeamsSetup ref="view" v-bind="viewProps" /><span data-testid="keep-open">{{ String(view?.keepOpenAfterConnect) }}</span></div>`,
			});
			const renderHost = createComponentRenderer(Host);

			const setup = renderHost({ props: { viewProps: props() } });
			await waitFor(() => expect(setup.getByTestId('keep-open')).toHaveTextContent('true'));
			setup.unmount();

			const settings = renderHost({ props: { viewProps: props({ mode: 'edit' }) } });
			await waitFor(() => expect(settings.getByTestId('keep-open')).toHaveTextContent('false'));
		});

		it('keeps Done disabled until the package is downloaded and the channel connected', async () => {
			withBot();
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
			expect(getByTestId('teams-done')).toBeDisabled();
			await fireEvent.click(getByTestId('teams-download-package'));
			await waitFor(() => expect(saveAs).toHaveBeenCalled());

			expect(getByTestId('teams-done')).toBeDisabled();
		});

		it('keeps Done disabled on a connected channel until a package is downloaded', async () => {
			withBot();
			const { getByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1', connected: true }),
			});

			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
			expect(getByTestId('teams-done')).toBeDisabled();
		});

		it('finishes on Done once connected, without another toast', async () => {
			const { getByTestId, emitted, rerender } = await downloadAndConnect();
			await rerender(props({ modelValue: 'cred-1', connected: true }));
			await waitFor(() => expect(getByTestId('teams-done')).toBeEnabled());
			showMessage.mockClear();

			await fireEvent.click(getByTestId('teams-done'));

			expect(emitted().done).toHaveLength(1);
			expect(showMessage).not.toHaveBeenCalled();
		});

		it('shows a failed connect in this step, with Done still disabled', async () => {
			const { getByTestId, rerender } = await downloadAndConnect();

			await rerender(props({ modelValue: 'cred-1', errorMessage: 'Bot rejected' }));

			await waitFor(() => expect(getByTestId('teams-connect-retry')).toBeVisible());
			const step = getByTestId('teams-install-step');
			expect(step).toContainElement(getByTestId('teams-connect-error'));
			expect(step).toContainElement(getByTestId('teams-done'));
			expect(getByTestId('teams-done')).toBeDisabled();
		});

		it('asks to publish a connected agent that is not published, next to Done', async () => {
			withBot();
			const { getByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1', connected: true, isPublished: false }),
			});

			await waitFor(() => expect(getByTestId('teams-publish-notice')).toBeVisible());
			expect(getByTestId('teams-install-step')).toContainElement(
				getByTestId('teams-publish-notice'),
			);
		});

		it('locks the availability once connected, so a new download matches what was saved', async () => {
			const { getByTestId, rerender } = await downloadAndConnect();

			await rerender(props({ modelValue: 'cred-1', connected: true }));

			await waitFor(() => expect(getByTestId('teams-availability-step')).toHaveAttribute('inert'));
		});

		it('does not count a package for a credential that was swapped since', async () => {
			const { getByTestId, rerender } = await downloadAndConnect();

			await rerender(props({ modelValue: 'cred-2', connected: true }));

			await waitFor(() => expect(getByTestId('teams-done')).toBeDisabled());
		});
	});

	describe('settings', () => {
		const settingsProps = (overrides: Record<string, unknown> = {}) =>
			props({ mode: 'edit', connected: true, modelValue: 'cred-1', ...overrides });

		it('says that changes here mean downloading the package again', async () => {
			const { getByTestId } = renderComponent({ props: settingsProps() });

			await waitFor(() => expect(getByTestId('teams-update-notice')).toBeVisible());
		});

		it('says where to upload the package, for the saved places, and what to do without the option', async () => {
			const { getByTestId } = renderComponent({
				props: settingsProps({ savedSettings: { teamChannels: true } }),
			});

			await waitFor(() =>
				expect(getByTestId('teams-upload-instructions')).toHaveTextContent(
					'agents.channels.teams.setup.install.description agents.channels.teams.setup.install.addTo.teams',
				),
			);
			expect(getByTestId('teams-upload-instructions')).toHaveTextContent(
				'agents.channels.teams.setup.install.hint',
			);
		});

		it('adds the admin hint to the toast after a download from the card', async () => {
			withBot();
			const { getByTestId } = renderComponent({ props: settingsProps() });
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());

			await fireEvent.click(getByTestId('teams-download-package'));

			await waitFor(() =>
				expect(showMessage).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'agents.channels.teams.setup.install.downloaded',
						message: 'agents.channels.teams.setup.install.hint',
					}),
				),
			);
		});

		it('takes the app name and description from the agent, not from inputs here', async () => {
			const { getByTestId, queryByTestId } = renderComponent({ props: settingsProps() });

			await waitFor(() =>
				expect(getByTestId('teams-identity-name')).toHaveTextContent(DEFAULT_NAME),
			);
			expect(getByTestId('teams-identity-description')).toHaveTextContent(DEFAULT_DESCRIPTION);
			expect(queryByTestId('teams-display-name')).toBeNull();
			expect(queryByTestId('teams-description')).toBeNull();
		});

		it('starts the availability panel collapsed, summarised', async () => {
			const { getByTestId, queryByTestId } = renderComponent({ props: settingsProps() });

			// Settings opens on the summary rather than on every control.
			await expectSummary(getByTestId, 'agents.channels.teams.setup.availability.directChatOnly');
			expect(queryByTestId('teams-scope-channels')).toBeNull();
		});

		it('opens a collapsed panel with its chevron', async () => {
			const { getByTestId } = renderComponent({ props: settingsProps() });

			await openAvailability(getByTestId);
		});

		it('shows a saved override on the card, and the agent default otherwise', async () => {
			const { getByTestId } = renderComponent({
				props: settingsProps({ savedSettings: { displayName: 'Helpdesk' } }),
			});

			await waitFor(() => expect(getByTestId('teams-identity-name')).toHaveTextContent('Helpdesk'));
			// The description had no override, so it keeps following the agent.
			expect(getByTestId('teams-identity-description')).toHaveTextContent(DEFAULT_DESCRIPTION);
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

			await waitFor(() => expect(getByTestId('teams-identity-name')).toHaveTextContent('Support'));
			expect(getByTestId('teams-identity-description')).toHaveTextContent('Answers questions');
			await expectSummary(
				getByTestId,
				[
					'agents.channels.teams.setup.availability.directChat',
					'agents.channels.teams.setup.availability.teamChannels',
				].join(SUMMARY_SEPARATOR),
			);
		});

		it('offers the package again, so a change can be applied', async () => {
			withBot();

			const { getByTestId } = renderComponent({ props: settingsProps() });

			await waitFor(() => expect(getByTestId('teams-download-package')).toBeVisible());
		});

		it('keeps the endpoint URL out of the settings', async () => {
			const { queryByTestId, container } = renderComponent({ props: settingsProps() });

			await waitFor(() => expect(getTeamsSetupState).toHaveBeenCalled());
			expect(queryByTestId('teams-show-endpoint')).toBeNull();
			expect(container.querySelector('#teams-messaging-endpoint-url')).toBeNull();
		});

		it('labels where it works and how it appears', async () => {
			const { getByTestId } = renderComponent({ props: settingsProps() });

			await waitFor(() =>
				expect(getByTestId('teams-availability-field')).toHaveTextContent(
					'agents.channels.teams.settings.availabilityLabel',
				),
			);
			expect(getByTestId('teams-identity-field')).toHaveTextContent(
				'agents.channels.teams.settings.identityLabel',
			);
		});

		it('says a changed availability is saved with a new package', async () => {
			const { getByTestId } = renderComponent({ props: settingsProps() });

			await waitFor(() =>
				expect(getByTestId('teams-update-notice')).toHaveTextContent(
					'agents.channels.teams.settings.updateNotice',
				),
			);
			await openAvailability(getByTestId);
			await fireEvent.click(getByTestId('teams-scope-groups'));

			expect(getByTestId('teams-update-notice')).toHaveTextContent(
				'agents.channels.teams.settings.updateNoticeChanged',
			);
		});

		it('downloads the saved app from the card, not unsaved changes', async () => {
			withBot();
			vi.mocked(fetchTeamsAppPackage).mockResolvedValue(new Blob(['zip']));
			const { getByTestId } = renderComponent({
				props: settingsProps({ savedSettings: { teamChannels: true } }),
			});

			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
			await openAvailability(getByTestId);
			await fireEvent.click(getByTestId('teams-scope-groups'));
			await fireEvent.click(getByTestId('teams-download-package'));

			await waitFor(() => expect(saveAs).toHaveBeenCalled());
			const sent = vi.mocked(fetchTeamsAppPackage).mock.calls[0][4];
			expect(sent).toMatchObject({ teamChannels: true });
			expect(sent).not.toHaveProperty('groupChats', true);
		});

		it('explains where the identity comes from, unless a saved override is shown', async () => {
			const fromAgent = renderComponent({ props: settingsProps() });
			await waitFor(() =>
				expect(fromAgent.getByTestId('teams-identity-name')).toHaveTextContent(DEFAULT_NAME),
			);
			expect(fromAgent.getByTestId('teams-identity-info')).toBeInTheDocument();
			fromAgent.unmount();

			const overridden = renderComponent({
				props: settingsProps({ savedSettings: { displayName: 'Helpdesk' } }),
			});
			await waitFor(() =>
				expect(overridden.getByTestId('teams-identity-name')).toHaveTextContent('Helpdesk'),
			);
			expect(overridden.queryByTestId('teams-identity-info')).toBeNull();
		});

		it('only downloads the package here, keeping the saved identity', async () => {
			withBot();
			vi.mocked(fetchTeamsAppPackage).mockResolvedValue(new Blob(['zip']));
			const { getByTestId, emitted, queryByTestId } = renderComponent({
				props: settingsProps({ savedSettings: { displayName: 'Helpdesk' } }),
			});

			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
			await fireEvent.click(getByTestId('teams-download-package'));

			await waitFor(() => expect(saveAs).toHaveBeenCalled());
			expect(fetchTeamsAppPackage).toHaveBeenCalledWith(
				expect.anything(),
				'p',
				'a',
				'cred-1',
				expect.objectContaining({ displayName: 'Helpdesk' }),
			);
			expect(emitted().connect).toBeUndefined();
			expect(queryByTestId('teams-stale-download')).toBeNull();
		});

		it('sends every saved setting back unchanged', async () => {
			withBot();
			vi.mocked(fetchTeamsAppPackage).mockResolvedValue(new Blob(['zip']));
			const savedSettings = {
				displayName: 'Support',
				teamChannels: true,
				readAllChannelMessages: true,
				sessionIdleTimeoutMinutes: 30,
			};
			const { getByTestId } = renderComponent({ props: settingsProps({ savedSettings }) });

			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
			await fireEvent.click(getByTestId('teams-download-package'));

			await waitFor(() =>
				expect(fetchTeamsAppPackage).toHaveBeenCalledWith(
					expect.anything(),
					'p',
					'a',
					'cred-1',
					expect.objectContaining(savedSettings),
				),
			);
		});

		describe('saving', () => {
			// The modal drives these through the view's ref, so a host stands in for it.
			const Host = defineComponent({
				components: { AgentChannelTeamsSetup },
				props: { viewProps: { type: Object, required: true } },
				setup() {
					const view = ref<InstanceType<typeof AgentChannelTeamsSetup>>();
					const saved = ref('');
					async function save() {
						await view.value?.beforeSave();
						saved.value = JSON.stringify(view.value?.currentSettings);
						await view.value?.afterSave();
					}
					return { view, saved, save };
				},
				template: `
					<div>
						<AgentChannelTeamsSetup ref="view" v-bind="viewProps" />
						<span data-testid="save-label">{{ view?.saveLabel ?? '' }}</span>
						<span data-testid="saved-settings">{{ saved }}</span>
						<button data-testid="save" @click="save" />
						<button data-testid="before-save" @click="view?.beforeSave()" />
					</div>
				`,
			});
			const renderHost = createComponentRenderer(Host);
			const savedSettings = (getByTestId: (id: string) => HTMLElement) =>
				JSON.parse(getByTestId('saved-settings').textContent ?? '{}');

			beforeEach(() => {
				withBot();
				vi.mocked(fetchTeamsAppPackage).mockResolvedValue(new Blob(['zip']));
			});

			it('saves without a download while nothing in the app changes', async () => {
				const { getByTestId } = renderHost({ props: { viewProps: settingsProps() } });

				await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
				expect(getByTestId('save-label')).toHaveTextContent('');
				await fireEvent.click(getByTestId('save'));

				await waitFor(() => expect(getByTestId('saved-settings')).not.toBeEmptyDOMElement());
				expect(fetchTeamsAppPackage).not.toHaveBeenCalled();
			});

			it('downloads the new package only after the save, with what was saved', async () => {
				const { getByTestId } = renderHost({ props: { viewProps: settingsProps() } });

				await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
				await openAvailability(getByTestId);
				await fireEvent.click(getByTestId('teams-scope-groups'));
				expect(getByTestId('save-label')).toHaveTextContent(
					'agents.channels.teams.settings.saveAndDownload',
				);

				// Nothing downloads before the save went through.
				await fireEvent.click(getByTestId('before-save'));
				expect(fetchTeamsAppPackage).not.toHaveBeenCalled();

				await fireEvent.click(getByTestId('save'));

				await waitFor(() => expect(saveAs).toHaveBeenCalled());
				expect(fetchTeamsAppPackage).toHaveBeenCalledWith(
					expect.anything(),
					'p',
					'a',
					'cred-1',
					expect.objectContaining({ groupChats: true }),
				);
				expect(showMessage).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'agents.channels.teams.setup.install.downloaded',
						message: 'agents.channels.teams.setup.install.hint',
					}),
				);
			});

			it('treats a credential swap as an app change', async () => {
				const { getByTestId, rerender } = renderHost({ props: { viewProps: settingsProps() } });

				await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
				expect(getByTestId('save-label')).toHaveTextContent('');
				await rerender({ viewProps: settingsProps({ modelValue: 'cred-2' }) });

				await waitFor(() =>
					expect(getByTestId('save-label')).toHaveTextContent(
						'agents.channels.teams.settings.saveAndDownload',
					),
				);
			});

			it('drops a saved identity override, so the app follows the agent again', async () => {
				const { getByTestId } = renderHost({
					props: { viewProps: settingsProps({ savedSettings: { displayName: 'Helpdesk' } }) },
				});

				await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
				expect(getByTestId('save-label')).toHaveTextContent(
					'agents.channels.teams.settings.saveAndDownload',
				);
				await fireEvent.click(getByTestId('save'));

				await waitFor(() => expect(getByTestId('saved-settings')).not.toBeEmptyDOMElement());
				expect(savedSettings(getByTestId)).not.toHaveProperty('displayName');
			});

			it('turns off a read permission that this view no longer offers', async () => {
				const { getByTestId } = renderHost({
					props: {
						viewProps: settingsProps({
							savedSettings: { teamChannels: true, readAllChannelMessages: true },
						}),
					},
				});

				await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
				await fireEvent.click(getByTestId('save'));

				await waitFor(() => expect(getByTestId('saved-settings')).not.toBeEmptyDOMElement());
				expect(savedSettings(getByTestId)).toMatchObject({
					teamChannels: true,
					readAllChannelMessages: false,
				});
			});

			it('keeps the save when the package cannot be built, and says the download failed', async () => {
				vi.mocked(fetchTeamsAppPackage).mockRejectedValue(new Error('boom'));
				const { getByTestId } = renderHost({ props: { viewProps: settingsProps() } });

				await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
				await openAvailability(getByTestId);
				await fireEvent.click(getByTestId('teams-scope-groups'));
				await fireEvent.click(getByTestId('save'));

				await waitFor(() =>
					expect(showMessage).toHaveBeenCalledWith(
						expect.objectContaining({
							type: 'error',
							title: 'agents.channels.teams.setup.install.downloadFailed',
						}),
					),
				);
				expect(getByTestId('saved-settings')).not.toBeEmptyDOMElement();
			});

			it('still downloads after the save when the setup state did not load', async () => {
				vi.mocked(getTeamsSetupState).mockRejectedValue(new Error('unreachable'));
				const { getByTestId } = renderHost({ props: { viewProps: settingsProps() } });

				await waitFor(() => expect(getTeamsSetupState).toHaveBeenCalled());
				await openAvailability(getByTestId);
				await fireEvent.click(getByTestId('teams-scope-groups'));
				await fireEvent.click(getByTestId('save'));

				await waitFor(() => expect(saveAs).toHaveBeenCalled());
				expect(fetchTeamsAppPackage).toHaveBeenCalledWith(
					expect.anything(),
					'p',
					'a',
					'cred-1',
					expect.objectContaining({ groupChats: true }),
				);
			});

			it('reports a failed download when the setup state did not load either', async () => {
				vi.mocked(getTeamsSetupState).mockRejectedValue(new Error('unreachable'));
				vi.mocked(fetchTeamsAppPackage).mockRejectedValue(new Error('no bot'));
				const { getByTestId } = renderHost({ props: { viewProps: settingsProps() } });

				await waitFor(() => expect(getTeamsSetupState).toHaveBeenCalled());
				await openAvailability(getByTestId);
				await fireEvent.click(getByTestId('teams-scope-groups'));
				await fireEvent.click(getByTestId('save'));

				await waitFor(() =>
					expect(showMessage).toHaveBeenCalledWith(
						expect.objectContaining({
							type: 'error',
							title: 'agents.channels.teams.setup.install.downloadFailed',
						}),
					),
				);
				expect(getByTestId('saved-settings')).not.toBeEmptyDOMElement();
			});

			it('changes nothing about saving in the setup stepper', async () => {
				const { getByTestId } = renderHost({
					props: { viewProps: props({ modelValue: 'cred-1' }) },
				});

				await waitFor(() => expect(getTeamsSetupState).toHaveBeenCalled());
				await fireEvent.click(getByTestId('save'));

				await waitFor(() => expect(getByTestId('saved-settings')).not.toBeEmptyDOMElement());
				expect(getByTestId('save-label')).toHaveTextContent('');
				expect(fetchTeamsAppPackage).not.toHaveBeenCalled();
			});
		});

		it('keeps the package unavailable until the credential has a bot', async () => {
			const { getByTestId } = renderComponent({ props: settingsProps() });

			await waitFor(() => expect(getTeamsSetupState).toHaveBeenCalled());
			expect(getByTestId('teams-download-package')).toBeDisabled();
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
		withBot();

		const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

		await openAvailability(getByTestId);
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

		it('offers neither the deployment nor the package, though the credential works', async () => {
			claimed();

			const { getByTestId, queryByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});

			await waitFor(() => expect(getByTestId('teams-credential-claimed')).toBeVisible());
			expect(queryByTestId('teams-credential-verified')).toBeNull();
			expect(getByTestId('teams-deploy-to-azure')).toBeDisabled();
			expect(getByTestId('teams-download-package')).toBeDisabled();
		});
	});

	describe('an agent that is not saved yet', () => {
		it('saves the agent before asking for the setup state of a picked credential', async () => {
			const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);

			renderComponent({ props: props({ modelValue: 'cred-1', ensureAgentPersisted }) });

			await waitFor(() =>
				expect(getTeamsSetupState).toHaveBeenCalledWith(expect.anything(), 'p', 'a', 'cred-1'),
			);
			expect(ensureAgentPersisted.mock.invocationCallOrder[0]).toBeLessThan(
				vi.mocked(getTeamsSetupState).mock.invocationCallOrder[0],
			);
		});

		it('does not save the agent while no credential is picked', async () => {
			const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);

			renderComponent({ props: props({ ensureAgentPersisted }) });

			await waitFor(() => expect(getTeamsSetupState).toHaveBeenCalled());
			expect(ensureAgentPersisted).not.toHaveBeenCalled();
		});

		it('keeps the last steps locked when saving the agent fails', async () => {
			withBot();
			const ensureAgentPersisted = vi.fn().mockRejectedValue(new Error('offline'));

			const { getByTestId, emitted } = renderComponent({
				props: props({ modelValue: 'cred-1', ensureAgentPersisted }),
			});

			await waitFor(() => expect(getByTestId('teams-credential-verified')).toBeVisible());
			expect(getTeamsSetupState).not.toHaveBeenCalledWith(expect.anything(), 'p', 'a', 'cred-1');
			expect(getByTestId('teams-download-package')).toBeDisabled();
			expect(emitted().connect).toBeFalsy();
			expect(showError).toHaveBeenCalledWith(
				expect.any(Error),
				'agents.channels.modal.saveChannelError',
			);
		});

		it('offers a retry that saves the agent again', async () => {
			withBot();
			const ensureAgentPersisted = vi
				.fn()
				.mockRejectedValueOnce(new Error('offline'))
				.mockResolvedValue(undefined);

			const { getByTestId, queryByTestId } = renderComponent({
				props: props({ modelValue: 'cred-1', ensureAgentPersisted }),
			});

			await waitFor(() => expect(getByTestId('teams-setup-load-failed')).toBeVisible());
			// The credential is verified, so a hint pointing back at it would be wrong.
			expect(queryByTestId('teams-package-blocked')).toBeNull();

			await fireEvent.click(getByTestId('teams-setup-retry'));

			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
			expect(ensureAgentPersisted).toHaveBeenCalledTimes(2);
			expect(queryByTestId('teams-setup-load-failed')).toBeNull();
		});

		it('does not report a save failure when only the setup state fails to load', async () => {
			vi.mocked(getTeamsSetupState).mockRejectedValue(new Error('offline'));
			const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);

			renderComponent({ props: props({ modelValue: 'cred-1', ensureAgentPersisted }) });

			await waitFor(() =>
				expect(getTeamsSetupState).toHaveBeenCalledWith(expect.anything(), 'p', 'a', 'cred-1'),
			);
			await flushPromises();
			expect(showError).not.toHaveBeenCalled();
		});
	});

	describe('when the selected credential changes', () => {
		it('drops the previous verification, so Save cannot use it', async () => {
			let release: ((value: TeamsCredentialCheck) => void) | undefined;
			vi.mocked(checkTeamsCredential)
				.mockResolvedValueOnce({ status: 'ok' })
				.mockImplementationOnce(async () => await new Promise((resolve) => (release = resolve)));

			withBot();
			const { getByTestId, rerender } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());

			await rerender(props({ modelValue: 'cred-2' }));

			// The second check has not answered yet, so nothing is verified.
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeDisabled());
			release?.({ status: 'ok' });
		});

		it('ignores an answer for the credential that is no longer selected', async () => {
			let releaseFirst: ((value: TeamsCredentialCheck) => void) | undefined;
			vi.mocked(checkTeamsCredential)
				.mockImplementationOnce(
					async () => await new Promise((resolve) => (releaseFirst = resolve)),
				)
				.mockResolvedValueOnce({ status: 'failed', reason: 'rejected' });

			const { getByTestId, queryByTestId, rerender } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await rerender(props({ modelValue: 'cred-2' }));
			await waitFor(() => expect(getByTestId('teams-credential-problem')).toBeVisible());

			// The first credential's answer lands last and must be discarded.
			releaseFirst?.({ status: 'ok' });
			await flushPromises();

			expect(queryByTestId('teams-credential-verified')).toBeNull();
			expect(getByTestId('teams-credential-problem')).toBeVisible();
		});
	});

	it('adopts saved settings that arrive after the view is rendered', async () => {
		const { getByTestId, rerender } = renderComponent({ props: props({ mode: 'edit' }) });

		await openAvailability(getByTestId);
		expect(checkedSwitch(getByTestId('teams-scope-channels'))).toBe(false);

		await rerender(props({ mode: 'edit', savedSettings: { teamChannels: true } }));

		await waitFor(() => expect(checkedSwitch(getByTestId('teams-scope-channels'))).toBe(true));
	});

	it('keeps an edit when saved settings arrive afterwards', async () => {
		const { getByTestId, rerender } = renderComponent({ props: props({ mode: 'edit' }) });

		await openAvailability(getByTestId);
		await fireEvent.click(getByTestId('teams-scope-groups'));

		await rerender(props({ mode: 'edit', savedSettings: { teamChannels: true } }));

		// The late arrival must not undo what the user just turned on.
		await waitFor(() => expect(checkedSwitch(getByTestId('teams-scope-groups'))).toBe(true));
	});

	it('shows a saved identity that arrives after the view is rendered', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: props({ mode: 'edit', connected: true, modelValue: 'cred-1' }),
		});

		await waitFor(() => expect(getByTestId('teams-identity-name')).toHaveTextContent(DEFAULT_NAME));

		await rerender(
			props({
				mode: 'edit',
				connected: true,
				modelValue: 'cred-1',
				savedSettings: { displayName: 'Saved name' },
			}),
		);

		await waitFor(() => expect(getByTestId('teams-identity-name')).toHaveTextContent('Saved name'));
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

	describe('telemetry', () => {
		it('tracks a credential that checks out', async () => {
			renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() =>
				expect(trackMock).toHaveBeenCalledWith(
					TELEMETRY_EVENT.AGENTS.USER_CHECKED_TEAMS_CHANNEL_CREDENTIAL,
					expect.objectContaining({ agent_id: 'a', trigger: 'auto', status: 'ok' }),
				),
			);
		});

		it('tracks a failed check with its reason', async () => {
			vi.mocked(checkTeamsCredential).mockResolvedValue({ status: 'failed', reason: 'rejected' });

			renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() =>
				expect(trackMock).toHaveBeenCalledWith(
					TELEMETRY_EVENT.AGENTS.USER_CHECKED_TEAMS_CHANNEL_CREDENTIAL,
					expect.objectContaining({ agent_id: 'a', status: 'failed', reason: 'rejected' }),
				),
			);
		});

		it('tracks a recheck as one the user asked for', async () => {
			vi.mocked(checkTeamsCredential).mockResolvedValue({ status: 'failed', reason: 'rejected' });
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(getByTestId('teams-credential-recheck')).toBeVisible());

			await fireEvent.click(getByTestId('teams-credential-recheck'));

			await waitFor(() =>
				expect(trackMock).toHaveBeenCalledWith(
					TELEMETRY_EVENT.AGENTS.USER_CHECKED_TEAMS_CHANNEL_CREDENTIAL,
					expect.objectContaining({ trigger: 'recheck', status: 'failed', reason: 'rejected' }),
				),
			);
		});

		it('tracks a failed n8n request apart from Microsoft being unreachable', async () => {
			vi.mocked(checkTeamsCredential).mockRejectedValue(new Error('500'));

			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });

			await waitFor(() =>
				expect(trackMock).toHaveBeenCalledWith(
					TELEMETRY_EVENT.AGENTS.USER_CHECKED_TEAMS_CHANNEL_CREDENTIAL,
					expect.objectContaining({ status: 'failed', reason: 'request_failed' }),
				),
			);
			expect(getByTestId('teams-credential-problem')).toHaveTextContent(
				'setup.install.failed.unreachable',
			);
		});

		it('keeps a check in flight when the setup state reloads', async () => {
			let release: ((value: TeamsCredentialCheck) => void) | undefined;
			vi.mocked(checkTeamsCredential).mockImplementationOnce(
				async () => await new Promise((resolve) => (release = resolve)),
			);
			const { getByTestId, queryByTestId, rerender } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await waitFor(() => expect(getTeamsSetupState).toHaveBeenCalledTimes(1));

			// Each flip reloads the setup state; flipping back shows the check again.
			await rerender(props({ modelValue: 'cred-1', connected: true }));
			await rerender(props({ modelValue: 'cred-1', connected: false }));
			await waitFor(() => expect(getTeamsSetupState).toHaveBeenCalledTimes(3));
			expect(getByTestId('teams-credential-checking')).toBeVisible();
			release?.({ status: 'ok' });

			await waitFor(() =>
				expect(trackMock).toHaveBeenCalledWith(
					TELEMETRY_EVENT.AGENTS.USER_CHECKED_TEAMS_CHANNEL_CREDENTIAL,
					expect.objectContaining({ status: 'ok' }),
				),
			);
			await waitFor(() => expect(queryByTestId('teams-credential-checking')).toBeNull());
		});

		it('does not track an answer for a credential that is no longer selected', async () => {
			let releaseFirst: ((value: TeamsCredentialCheck) => void) | undefined;
			vi.mocked(checkTeamsCredential)
				.mockImplementationOnce(
					async () => await new Promise((resolve) => (releaseFirst = resolve)),
				)
				.mockResolvedValueOnce({ status: 'failed', reason: 'rejected' });

			const { getByTestId, queryByTestId, rerender } = renderComponent({
				props: props({ modelValue: 'cred-1' }),
			});
			await rerender(props({ modelValue: 'cred-2' }));
			await waitFor(() => expect(getByTestId('teams-credential-problem')).toBeVisible());
			releaseFirst?.({ status: 'ok' });
			await flushPromises();
			expect(queryByTestId('teams-credential-verified')).toBeNull();

			const checks = trackMock.mock.calls.filter(
				([event]) => event === TELEMETRY_EVENT.AGENTS.USER_CHECKED_TEAMS_CHANNEL_CREDENTIAL,
			);
			expect(checks).toHaveLength(1);
			expect(checks[0][1]).toMatchObject({ status: 'failed', reason: 'rejected' });
		});

		it('tracks a successful package download', async () => {
			withBot();
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());

			await fireEvent.click(getByTestId('teams-download-package'));

			await waitFor(() =>
				expect(trackMock).toHaveBeenCalledWith(
					TELEMETRY_EVENT.AGENTS.USER_DOWNLOADED_TEAMS_APP_PACKAGE,
					expect.objectContaining({ agent_id: 'a', status: 'success' }),
				),
			);
		});

		it('tracks a failed package download', async () => {
			withBot();
			vi.mocked(fetchTeamsAppPackage).mockRejectedValue(new Error('401'));
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());

			await fireEvent.click(getByTestId('teams-download-package'));

			await waitFor(() =>
				expect(trackMock).toHaveBeenCalledWith(
					TELEMETRY_EVENT.AGENTS.USER_DOWNLOADED_TEAMS_APP_PACKAGE,
					expect.objectContaining({ agent_id: 'a', status: 'error' }),
				),
			);
		});

		it('tracks a click on Deploy to Azure', async () => {
			const { getByTestId } = renderComponent({ props: props({ modelValue: 'cred-1' }) });
			await waitFor(() => expect(getByTestId('teams-deploy-to-azure')).toBeVisible());

			await fireEvent.click(getByTestId('teams-deploy-to-azure'));

			expect(trackMock).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_CLICKED_DEPLOY_TO_AZURE_FOR_TEAMS_CHANNEL,
				expect.objectContaining({ agent_id: 'a' }),
			);
		});
	});
});
