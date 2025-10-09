import { vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { setupServer } from '@/__tests__/server';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '../sourceControl.store';
import SettingsSourceControl from './SettingsSourceControl.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { EnterpriseEditionFeature } from '@/constants';
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
			const { container, getByTestId } = renderComponent({
				pinia,
			});

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
			const { container, queryByTestId } = renderComponent({
				pinia,
			});

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

	describe('should test repo URLs', () => {
		beforeEach(() => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
		});

		describe('for ssh connection', () => {
			test.each([
				['git@github.com:user/repository.git', true],
				['git@github.enterprise.com:org-name/repo-name.git', true],
				['git@192.168.1.101:2222:user/repo.git', true],
				['git@github.com:user/repo.git/path/to/subdir', true],
				// The opening bracket in curly braces makes sure it is not treated as a special character by the 'user-event' library
				['git@{[}2001:db8:100:f101:210:a4ff:fee3:9566]:user/repo.git', true],
				['git@github.com:org/suborg/repo.git', true],
				['git@github.com:user-name/repo-name.git', true],
				['git@github.com:user_name/repo_name.git', true],
				['git@github.com:user/repository', true],
				['git@github.enterprise.com:org-name/repo-name', true],
				['git@192.168.1.101:2222:user/repo', true],
				['git@ssh.dev.azure.com:v3/User/repo/directory', true],
				['ssh://git@mydomain.example:2224/gitolite-admin', true],
				['gituser@192.168.1.1:ABC/Repo4.git', true],
				['root@192.168.1.1/repo.git', true],
				['http://github.com/user/repository', false],
				['https://github.com/user/repository', false],
				['git@gitlab.com:something.net/n8n.git', true],
			])('%s', async (url: string, isValid: boolean) => {
				await nextTick();
				const { container, queryByText } = renderComponent({
					pinia,
				});

				await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

				const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;

				await userEvent.click(repoUrlInput);
				await userEvent.type(repoUrlInput, url);
				await userEvent.tab();

				const inputError = expect(queryByText('The Git repository URL is not valid'));

				if (isValid) {
					inputError.not.toBeInTheDocument();
				} else {
					inputError.toBeInTheDocument();
				}
			});
		});

		describe('for https connection', () => {
			test.each([
				['git@github.com:user/repository.git', false],
				['git@github.enterprise.com:org-name/repo-name.git', false],
				['http://github.com/user/repository', false],
				['https://github.com/user/repository.git', true],
			])('%s', async (url: string, isValid: boolean) => {
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
				await userEvent.type(repoUrlInput, url);
				await userEvent.tab();

				const inputError = expect(queryByText('Please enter a valid HTTPS URL'));

				if (isValid) {
					inputError.not.toBeInTheDocument();
				} else {
					inputError.toBeInTheDocument();
				}
			});
		});
	});
});
