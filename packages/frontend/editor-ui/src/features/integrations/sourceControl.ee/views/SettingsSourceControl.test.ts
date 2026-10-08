import { vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { setupServer } from '@/__tests__/server';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useSourceControlStore } from '../sourceControl.store';
import SettingsSourceControl from './SettingsSourceControl.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { EnterpriseEditionFeature } from '@/app/constants';
import { registerToastNotifier } from '@/app/init/toastNotifier';
import { nextTick } from 'vue';

let pinia: ReturnType<typeof createPinia>;
let server: ReturnType<typeof setupServer>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let sourceControlStore: ReturnType<typeof useSourceControlStore>;

const renderComponent = createComponentRenderer(SettingsSourceControl);

describe('SettingsSourceControl', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		// The save-settings test asserts on rendered toast content, which needs the
		// notifier the app registers at bootstrap. Explicit here because it no longer
		// arrives as a side effect of importing `@n8n/composables/useToast` (N8N-104).
		registerToastNotifier();

		pinia = createPinia();
		setActivePinia(pinia);
		settingsStore = useSettingsStore();
		sourceControlStore = useSourceControlStore();

		await settingsStore.getSettings();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render paywall state when there is no license', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = false;
		await nextTick();

		const { getByTestId, queryByTestId } = renderComponent({
			pinia,
		});

		expect(queryByTestId('source-control-content-licensed')).not.toBeInTheDocument();
		expect(getByTestId('source-control-content-unlicensed')).toBeInTheDocument();
	});

	it('should render licensed content', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
		await nextTick();

		const { getByTestId, queryByTestId } = renderComponent({
			pinia,
		});

		expect(getByTestId('source-control-content-licensed')).toBeInTheDocument();
		expect(queryByTestId('source-control-content-unlicensed')).not.toBeInTheDocument();
		expect(queryByTestId('source-control-connected-content')).not.toBeInTheDocument();
	});

	it('should disable the connection form while preferences are loading', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
		await nextTick();

		let resolvePreferences!: () => void;
		const getPreferencesSpy = vi.spyOn(sourceControlStore, 'getPreferences').mockImplementation(
			async () =>
				await new Promise<void>((resolve) => {
					resolvePreferences = resolve;
				}),
		);

		try {
			const { container } = renderComponent({ pinia });

			await waitFor(() => expect(getPreferencesSpy).toHaveBeenCalled());

			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			expect(repoUrlInput).toBeDisabled();

			resolvePreferences();

			await waitFor(() => expect(repoUrlInput).toBeEnabled());
		} finally {
			getPreferencesSpy.mockRestore();
		}
	});

	it('should render user flow happy path', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
		await nextTick();

		const updatePreferencesSpy = vi.spyOn(sourceControlStore, 'updatePreferences');
		const generateKeyPairSpy = vi.spyOn(sourceControlStore, 'generateKeyPair');

		const { container, getByTestId, getByText, queryByTestId, getByRole } = renderComponent({
			pinia,
			global: {
				stubs: ['Teleport'],
			},
		});

		await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

		const connectButton = getByTestId('source-control-connect-button');
		expect(connectButton).toBeDisabled();

		const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;

		await userEvent.click(repoUrlInput);
		await userEvent.type(repoUrlInput, 'git@github');
		await userEvent.tab();
		expect(connectButton).toBeDisabled();

		await userEvent.click(repoUrlInput);
		await userEvent.type(repoUrlInput, '.com:john/n8n-data.git');
		await userEvent.tab();

		await waitFor(() => expect(connectButton).toBeEnabled());
		expect(queryByTestId('source-control-save-settings-button')).not.toBeInTheDocument();

		await userEvent.click(connectButton);
		await waitFor(() => expect(getByTestId('source-control-connected-content')).toBeVisible());

		const saveSettingsButton = getByTestId('source-control-save-settings-button');
		expect(saveSettingsButton).toBeInTheDocument();
		expect(saveSettingsButton).toBeDisabled();

		const branchSelect = getByTestId('source-control-branch-select');
		await userEvent.click(within(branchSelect).getByRole('combobox'));

		await waitFor(() => expect(getByText('main')).toBeVisible());
		await userEvent.click(getByText('main'));

		await waitFor(() => expect(saveSettingsButton).toBeEnabled());
		await userEvent.click(saveSettingsButton);

		expect(updatePreferencesSpy).toHaveBeenCalledWith({
			branchName: 'main',
			branchReadOnly: false,
			branchColor: '#1d6acb',
		});
		await waitFor(() => expect(screen.getByText('Settings successfully saved')).toBeVisible());

		await userEvent.click(getByTestId('source-control-disconnect-button'));
		const disconnectDialog = getByRole('dialog');
		await waitFor(() => expect(disconnectDialog).toBeVisible());

		await userEvent.click(within(disconnectDialog).getAllByRole('button')[1]);
		await waitFor(() => expect(disconnectDialog).not.toBeVisible());
		await waitFor(() =>
			expect(queryByTestId('source-control-connected-content')).not.toBeInTheDocument(),
		);

		const sshKeyTypeSelect = getByTestId('source-control-ssh-key-type-select');
		const refreshSshKeyButton = getByTestId('source-control-refresh-ssh-key-button');
		await waitFor(() => {
			expect(sshKeyTypeSelect).toBeVisible();
			expect(refreshSshKeyButton).toBeVisible();
		});

		await userEvent.click(within(sshKeyTypeSelect).getByRole('combobox'));
		await waitFor(() => expect(getByText('RSA')).toBeVisible());
		await userEvent.click(getByText('RSA'));
		await userEvent.click(refreshSshKeyButton);

		const refreshSshKeyDialog = getByRole('dialog');
		await waitFor(() => expect(refreshSshKeyDialog).toBeVisible());
		await userEvent.click(within(refreshSshKeyDialog).getAllByRole('button')[1]);
		await waitFor(() => expect(refreshSshKeyDialog).not.toBeVisible());

		expect(generateKeyPairSpy).toHaveBeenCalledWith('rsa');
	}, 10000);

	describe('Protocol Selection', () => {
		beforeEach(() => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
		});

		it('should show SSH-specific fields when SSH protocol is selected', async () => {
			await nextTick();
			const { container, getByTestId } = renderComponent({ pinia });

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

			// SSH should be selected by default
			const connectionTypeSelect = getByTestId('source-control-connection-type-select');
			expect(within(connectionTypeSelect).getByDisplayValue('SSH')).toBeInTheDocument();

			// SSH-specific fields should be visible
			expect(getByTestId('source-control-ssh-key-type-select')).toBeInTheDocument();
			expect(getByTestId('source-control-refresh-ssh-key-button')).toBeInTheDocument();
			expect(container.querySelector('input[name="repoUrl"]')).toBeInTheDocument();

			// HTTPS-specific fields should not be visible
			expect(container.querySelector('input[name="httpsUsername"]')).not.toBeInTheDocument();
			expect(container.querySelector('input[name="httpsPassword"]')).not.toBeInTheDocument();
		});

		it('should show HTTPS-specific fields when HTTPS protocol is selected', async () => {
			await nextTick();
			const { container, queryByTestId } = renderComponent({ pinia });

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

			// Change to HTTPS protocol
			const connectionTypeSelect = queryByTestId('source-control-connection-type-select')!;
			await userEvent.click(within(connectionTypeSelect).getByRole('combobox'));
			await waitFor(() => expect(screen.getByText('HTTPS')).toBeVisible());
			await userEvent.click(screen.getByText('HTTPS'));

			// HTTPS-specific fields should be visible
			expect(container.querySelector('input[name="httpsUsername"]')).toBeInTheDocument();
			expect(container.querySelector('input[name="httpsPassword"]')).toBeInTheDocument();
			expect(container.querySelector('input[name="repoUrl"]')).toBeInTheDocument();

			// SSH-specific fields should not be visible
			expect(queryByTestId('source-control-ssh-key-type-select')).not.toBeInTheDocument();
			expect(queryByTestId('source-control-refresh-ssh-key-button')).not.toBeInTheDocument();
		});
	});

	describe('repo URL validation', () => {
		beforeEach(() => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
		});

		// Types the URL into the SSH form and returns the validation error element, or null.
		async function queryUrlErrorAfterTypingSshUrl(url: string) {
			await nextTick();
			const { container, queryByText } = renderComponent({
				pinia,
			});

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;

			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, url);
			await userEvent.tab();

			return queryByText('The Git repository URL is not valid');
		}

		it('should accept a valid ssh URL', async () => {
			const urlError = await queryUrlErrorAfterTypingSshUrl('git@github.com:user/repository.git');

			expect(urlError).not.toBeInTheDocument();
		});

		it('should reject an invalid ssh URL', async () => {
			const urlError = await queryUrlErrorAfterTypingSshUrl('http://github.com/user/repository');

			expect(urlError).toBeInTheDocument();
		});

		it('should reject a non-https URL for https connection', async () => {
			await nextTick();
			const { container, queryByText, queryByTestId } = renderComponent({
				pinia,
			});

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));
			// Change to HTTPS protocol
			const connectionTypeSelect = queryByTestId('source-control-connection-type-select')!;
			await userEvent.click(within(connectionTypeSelect).getByRole('combobox'));
			await waitFor(() => expect(screen.getByText('HTTPS')).toBeVisible());
			await userEvent.click(screen.getByText('HTTPS'));

			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;

			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'git@github.com:user/repository.git');
			await userEvent.tab();

			expect(queryByText('Please enter a valid HTTPS URL')).toBeInTheDocument();
		});
	});
});
