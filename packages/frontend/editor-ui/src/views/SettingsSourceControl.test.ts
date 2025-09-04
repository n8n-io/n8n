import { vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { setupServer } from '@/__tests__/server';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import SettingsSourceControl from '@/views/SettingsSourceControl.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { EnterpriseEditionFeature } from '@/constants';
import { nextTick } from 'vue';

let pinia: ReturnType<typeof createPinia>;
let server: ReturnType<typeof setupServer>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let sourceControlStore: ReturnType<typeof useSourceControlStore>;

const renderComponent = createComponentRenderer(SettingsSourceControl);

// Helper function to switch protocol in tests
const switchProtocol = async (
	protocolSelect: HTMLElement,
	getByText: (text: string) => HTMLElement,
	protocol: 'SSH' | 'HTTPS',
) => {
	await userEvent.click(within(protocolSelect).getByRole('combobox'));
	await waitFor(() => expect(getByText(protocol)).toBeVisible());
	await userEvent.click(getByText(protocol));
	await nextTick();
};

// Helper function to setup source control store with public key
const setupSourceControlStore = async () => {
	// Ensure public key is available
	if (!sourceControlStore.preferences.publicKey) {
		sourceControlStore.preferences.publicKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest';
	}
	await nextTick();
};

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
				stubs: ['teleport'],
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

	describe('should test repo URLs for SSH', () => {
		beforeEach(() => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
		});

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
			['https://github.com/user/repository', true], // HTTPS URLs are allowed by the regex
			['git@gitlab.com:something.net/n8n.git', true],
		])('%s should be %s for SSH', async (url: string, isValid: boolean) => {
			await nextTick();
			const { container, queryByText } = renderComponent({
				pinia,
			});

			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;

			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, url);
			await userEvent.tab();

			if (isValid) {
				expect(queryByText('The Git repository URL is not valid')).not.toBeInTheDocument();
			} else {
				expect(queryByText('The Git repository URL is not valid')).toBeInTheDocument();
			}
		});
	});

	describe('Protocol Selection and Field Visibility', () => {
		beforeEach(async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
			await nextTick();
			await setupSourceControlStore();
		});

		it('should render protocol dropdown with SSH and HTTPS options', async () => {
			const { getByTestId, getByText } = renderComponent({
				pinia,
			});

			const protocolSelect = getByTestId('source-control-protocol-select');
			expect(protocolSelect).toBeInTheDocument();

			// Click to open the dropdown and check if both options are available
			await userEvent.click(within(protocolSelect).getByRole('combobox'));

			await waitFor(() => {
				expect(getByText('SSH')).toBeVisible();
				expect(getByText('HTTPS')).toBeVisible();
			});
		});

		it('should default to SSH protocol for backward compatibility', async () => {
			const { getByTestId } = renderComponent({
				pinia,
			});

			expect(sourceControlStore.preferences.protocol).toBe('ssh');

			// Verify SSH fields are visible by default
			expect(getByTestId('source-control-ssh-key-type-select')).toBeInTheDocument();
		});

		it('should show SSH-specific fields when SSH protocol is selected', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				pinia,
			});

			// SSH should be default, verify SSH-specific fields
			expect(getByTestId('source-control-ssh-key-type-select')).toBeInTheDocument();
			expect(getByTestId('source-control-refresh-ssh-key-button')).toBeInTheDocument();

			// HTTPS fields should be hidden
			expect(queryByTestId('source-control-username-input')).not.toBeInTheDocument();
			expect(queryByTestId('source-control-pat-input')).not.toBeInTheDocument();
		});

		it('should show HTTPS-specific fields when HTTPS protocol is selected', async () => {
			const { getByTestId, getByText, queryByTestId } = renderComponent({
				pinia,
			});

			// Switch to HTTPS protocol
			const protocolSelect = getByTestId('source-control-protocol-select');
			await userEvent.click(within(protocolSelect).getByRole('combobox'));
			await waitFor(() => expect(getByText('HTTPS')).toBeVisible());
			await userEvent.click(getByText('HTTPS'));
			await nextTick();

			// HTTPS fields should be visible
			expect(getByTestId('source-control-username-input')).toBeInTheDocument();
			expect(getByTestId('source-control-pat-input')).toBeInTheDocument();

			// SSH fields should be hidden
			expect(queryByTestId('source-control-ssh-key-type-select')).not.toBeInTheDocument();
			expect(queryByTestId('source-control-refresh-ssh-key-button')).not.toBeInTheDocument();
		});

		it('should switch field visibility when protocol changes', async () => {
			const { getByTestId, getByText, queryByTestId } = renderComponent({
				pinia,
			});

			const protocolSelect = getByTestId('source-control-protocol-select');

			// Initially SSH should be selected
			expect(getByTestId('source-control-ssh-key-type-select')).toBeInTheDocument();
			expect(queryByTestId('source-control-username-input')).not.toBeInTheDocument();

			// Switch to HTTPS
			await switchProtocol(protocolSelect, getByText, 'HTTPS');

			expect(queryByTestId('source-control-ssh-key-type-select')).not.toBeInTheDocument();
			expect(getByTestId('source-control-username-input')).toBeInTheDocument();

			// Switch back to SSH
			await switchProtocol(protocolSelect, getByText, 'SSH');

			expect(getByTestId('source-control-ssh-key-type-select')).toBeInTheDocument();
			expect(queryByTestId('source-control-username-input')).not.toBeInTheDocument();
		});
	});

	describe('HTTPS Authentication Flow', () => {
		beforeEach(async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
			await nextTick();
			await setupSourceControlStore();
		});

		it('should handle complete HTTPS authentication flow', async () => {
			const savePreferencesSpy = vi.spyOn(sourceControlStore, 'savePreferences');

			const { container, getByTestId, getByText } = renderComponent({
				pinia,
				global: {
					stubs: ['teleport'],
				},
			});

			// Switch to HTTPS protocol
			const protocolSelect = getByTestId('source-control-protocol-select');
			await switchProtocol(protocolSelect, getByText, 'HTTPS');

			// Enter HTTPS repository URL
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'https://github.com/user/repo.git');
			await userEvent.tab();

			// Enter username
			const usernameInput = container.querySelector('input[name="username"]')!;
			await userEvent.click(usernameInput);
			await userEvent.type(usernameInput, 'testuser');
			await userEvent.tab();

			// Enter personal access token
			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;
			await userEvent.click(tokenInput);
			await userEvent.type(tokenInput, 'ghp_test_token_123');
			await userEvent.tab();

			// Connect button should be enabled
			const connectButton = getByTestId('source-control-connect-button');
			await waitFor(() => expect(connectButton).toBeEnabled());

			await userEvent.click(connectButton);

			// Should connect and show connected content
			await waitFor(() => expect(getByTestId('source-control-connected-content')).toBeVisible());

			expect(savePreferencesSpy).toHaveBeenCalledWith({
				repositoryUrl: 'https://github.com/user/repo.git',
				protocol: 'https',
				username: 'testuser',
				personalAccessToken: 'ghp_test_token_123',
			});
		});

		it('should validate HTTPS credential requirements', async () => {
			const { container, getByTestId, getByText } = renderComponent({
				pinia,
			});

			// Switch to HTTPS
			const protocolSelect = getByTestId('source-control-protocol-select');
			await switchProtocol(protocolSelect, getByText, 'HTTPS');

			const connectButton = getByTestId('source-control-connect-button');

			// Should be disabled without any credentials
			expect(connectButton).toBeDisabled();

			// Add repository URL but no credentials
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'https://github.com/user/repo.git');
			await userEvent.tab();

			expect(connectButton).toBeDisabled();

			// Add username but no token
			const usernameInput = container.querySelector('input[name="username"]')!;
			await userEvent.click(usernameInput);
			await userEvent.type(usernameInput, 'testuser');
			await userEvent.tab();

			expect(connectButton).toBeDisabled();

			// Add token - now should be enabled
			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;
			await userEvent.click(tokenInput);
			await userEvent.type(tokenInput, 'ghp_token');
			await userEvent.tab();

			await waitFor(() => expect(connectButton).toBeEnabled());
		});

		it('should clear HTTPS credentials when switching to SSH', async () => {
			const { container, getByText } = renderComponent({
				pinia,
			});

			const protocolSelect = document.querySelector(
				'[data-test-id="source-control-protocol-select"]',
			)! as HTMLElement;

			// Switch to HTTPS and enter credentials
			await switchProtocol(protocolSelect, getByText, 'HTTPS');

			const usernameInput = container.querySelector('input[name="username"]')!;
			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;

			await userEvent.click(usernameInput);
			await userEvent.type(usernameInput, 'testuser');
			await userEvent.tab();

			await userEvent.click(tokenInput);
			await userEvent.type(tokenInput, 'test_token');
			await userEvent.tab();

			expect(sourceControlStore.preferences.username).toBe('testuser');
			expect(sourceControlStore.formState.personalAccessToken).toBe('test_token');

			// Switch back to SSH
			await switchProtocol(protocolSelect, getByText, 'SSH');

			// Credentials should be cleared for security
			expect(sourceControlStore.preferences.username).toBe('');
			expect(sourceControlStore.formState.personalAccessToken).toBe('');
		});

		it('should handle connection errors gracefully for HTTPS', async () => {
			const savePreferencesSpy = vi.spyOn(sourceControlStore, 'savePreferences');
			savePreferencesSpy.mockRejectedValue(new Error('Invalid credentials'));

			const { container, getByTestId, getByText } = renderComponent({
				pinia,
				global: {
					stubs: ['teleport'],
				},
			});

			// Switch to HTTPS and fill form
			const protocolSelect = getByTestId('source-control-protocol-select');
			await switchProtocol(protocolSelect, getByText, 'HTTPS');

			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			const usernameInput = container.querySelector('input[name="username"]')!;
			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;

			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'https://github.com/user/repo.git');
			await userEvent.tab();

			await userEvent.click(usernameInput);
			await userEvent.type(usernameInput, 'testuser');
			await userEvent.tab();

			await userEvent.click(tokenInput);
			await userEvent.type(tokenInput, 'invalid_token');
			await userEvent.tab();

			const connectButton = getByTestId('source-control-connect-button');
			await waitFor(() => expect(connectButton).toBeEnabled());

			await userEvent.click(connectButton);

			// Should not show connected content on error
			await waitFor(() => {
				const connectedContent = document.querySelector(
					'[data-test-id="source-control-connected-content"]',
				);
				expect(connectedContent).not.toBeInTheDocument();
			});

			expect(savePreferencesSpy).toHaveBeenCalledWith({
				repositoryUrl: 'https://github.com/user/repo.git',
				protocol: 'https',
				username: 'testuser',
				personalAccessToken: 'invalid_token',
			});
		});

		test.each([
			['https://github.com/user/repository.git', true],
			['https://gitlab.com/user/repository.git', true],
			['https://bitbucket.org/user/repository.git', true],
			['https://dev.azure.com/user/_git/repository', true],
			['https://192.168.1.100/git/repo.git', true],
			['git@github.com:user/repository.git', true], // SSH URLs are allowed by the regex
			['http://github.com/user/repository', false],
			['ssh://git@github.com/user/repo.git', true], // SSH URLs are allowed by the regex
		])('HTTPS URL validation: %s should be %s', async (url: string, isValid: boolean) => {
			const { container, queryByText, getByText } = renderComponent({
				pinia,
			});

			// Switch to HTTPS
			const protocolSelect = document.querySelector(
				'[data-test-id="source-control-protocol-select"]',
			)! as HTMLElement;
			await switchProtocol(protocolSelect, getByText, 'HTTPS');
			await nextTick();

			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, url);
			await userEvent.tab();

			if (isValid) {
				expect(queryByText('The Git repository URL is not valid')).not.toBeInTheDocument();
			} else {
				expect(queryByText('The Git repository URL is not valid')).toBeInTheDocument();
			}
		});
	});

	describe('Store Integration Tests', () => {
		beforeEach(async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
			await nextTick();
			await setupSourceControlStore();
		});

		it('should update store state when protocol changes', async () => {
			const { getByText } = renderComponent({
				pinia,
			});

			// Initially SSH
			expect(sourceControlStore.preferences.protocol).toBe('ssh');
			expect(sourceControlStore.isSshProtocol).toBe(true);
			expect(sourceControlStore.isHttpsProtocol).toBe(false);

			// Switch to HTTPS
			const protocolSelect = document.querySelector(
				'[data-test-id="source-control-protocol-select"]',
			)! as HTMLElement;
			await switchProtocol(protocolSelect, getByText, 'HTTPS');
			await nextTick();

			expect(sourceControlStore.preferences.protocol).toBe('https');
			expect(sourceControlStore.isSshProtocol).toBe(false);
			expect(sourceControlStore.isHttpsProtocol).toBe(true);
		});

		it('should store HTTPS credentials separately from preferences', async () => {
			const { container, getByText } = renderComponent({
				pinia,
			});

			// Switch to HTTPS
			const protocolSelect = document.querySelector(
				'[data-test-id="source-control-protocol-select"]',
			)! as HTMLElement;
			await switchProtocol(protocolSelect, getByText, 'HTTPS');
			await nextTick();

			// Enter credentials
			const usernameInput = container.querySelector('input[name="username"]')!;
			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;

			await userEvent.click(usernameInput);
			await userEvent.type(usernameInput, 'testuser');
			await userEvent.tab();

			await userEvent.click(tokenInput);
			await userEvent.type(tokenInput, 'secret_token');
			await userEvent.tab();

			// Username stored in preferences
			expect(sourceControlStore.preferences.username).toBe('testuser');
			// Token stored separately in formState for security
			expect(sourceControlStore.formState.personalAccessToken).toBe('secret_token');
		});

		it('should validate connection requirements based on protocol', async () => {
			const { container, getByText } = renderComponent({
				pinia,
			});

			// SSH protocol - should require SSH key
			expect(sourceControlStore.canConnect).toBe(false); // No repo URL yet

			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'git@github.com:user/repo.git');
			await userEvent.tab();

			expect(sourceControlStore.canConnect).toBe(true); // Has repo URL and SSH key

			// Switch to HTTPS
			const protocolSelect = document.querySelector(
				'[data-test-id="source-control-protocol-select"]',
			)! as HTMLElement;
			await switchProtocol(protocolSelect, getByText, 'HTTPS');
			await nextTick();

			// Change URL to HTTPS
			await userEvent.clear(repoUrlInput);
			await userEvent.type(repoUrlInput, 'https://github.com/user/repo.git');
			await userEvent.tab();

			expect(sourceControlStore.canConnect).toBe(false); // No HTTPS credentials

			// Add credentials
			const usernameInput = container.querySelector('input[name="username"]')!;
			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;

			await userEvent.click(usernameInput);
			await userEvent.type(usernameInput, 'testuser');
			await userEvent.tab();

			expect(sourceControlStore.canConnect).toBe(false); // Still missing token

			await userEvent.click(tokenInput);
			await userEvent.type(tokenInput, 'token');
			await userEvent.tab();

			expect(sourceControlStore.canConnect).toBe(true); // All required fields filled
		});

		it('should maintain protocol requirements computed property', async () => {
			const { getByText } = renderComponent({
				pinia,
			});

			// SSH requirements
			expect(sourceControlStore.protocolRequirements.requiredFields).toContain('repositoryUrl');
			expect(sourceControlStore.protocolRequirements.requiredFields).toContain('publicKey');

			// Switch to HTTPS
			const protocolSelect = document.querySelector(
				'[data-test-id="source-control-protocol-select"]',
			)! as HTMLElement;
			await switchProtocol(protocolSelect, getByText, 'HTTPS');
			await nextTick();

			// HTTPS requirements
			expect(sourceControlStore.protocolRequirements.requiredFields).toContain('repositoryUrl');
			expect(sourceControlStore.protocolRequirements.requiredFields).toContain('username');
			expect(sourceControlStore.protocolRequirements.requiredFields).toContain(
				'personalAccessToken',
			);
		});
	});

	describe('Form Validation and User Experience', () => {
		beforeEach(async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
			await nextTick();
			await setupSourceControlStore();
		});

		it('should show proper validation messages for required HTTPS fields', async () => {
			const { container, getByText } = renderComponent({
				pinia,
			});

			// Switch to HTTPS
			const protocolSelect = document.querySelector(
				'[data-test-id="source-control-protocol-select"]',
			)! as HTMLElement;
			await switchProtocol(protocolSelect, getByText, 'HTTPS');
			await nextTick();

			// Try to submit form without credentials
			const usernameInput = container.querySelector('input[name="username"]')!;
			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;

			// Focus and blur to trigger validation
			await userEvent.click(usernameInput);
			await userEvent.tab();

			await userEvent.click(tokenInput);
			await userEvent.tab();

			// Form validation should prevent connection
			const connectButton = document.querySelector(
				'[data-test-id="source-control-connect-button"]',
			) as HTMLButtonElement;
			expect(connectButton.disabled).toBe(true);
		});

		it('should disable connection button until all HTTPS fields are valid', async () => {
			const { container, getByTestId, getByText } = renderComponent({
				pinia,
			});

			const connectButton = getByTestId('source-control-connect-button');
			const protocolSelect = document.querySelector(
				'[data-test-id="source-control-protocol-select"]',
			)! as HTMLElement;

			// Switch to HTTPS
			await switchProtocol(protocolSelect, getByText, 'HTTPS');
			await nextTick();

			expect(connectButton).toBeDisabled();

			// Add repo URL
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'https://github.com/user/repo.git');
			await userEvent.tab();

			expect(connectButton).toBeDisabled();

			// Add username
			const usernameInput = container.querySelector('input[name="username"]')!;
			await userEvent.click(usernameInput);
			await userEvent.type(usernameInput, 'user');
			await userEvent.tab();

			expect(connectButton).toBeDisabled();

			// Add token
			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;
			await userEvent.click(tokenInput);
			await userEvent.type(tokenInput, 'token');
			await userEvent.tab();

			await waitFor(() => expect(connectButton).toBeEnabled());
		});

		it('should preserve existing SSH functionality when protocol is SSH', async () => {
			const { container, getByTestId } = renderComponent({
				pinia,
			});

			// Ensure we're in SSH mode (default)
			expect(sourceControlStore.preferences.protocol).toBe('ssh');

			// SSH fields should be visible and functional
			const sshKeyTypeSelect = getByTestId('source-control-ssh-key-type-select');
			const refreshButton = getByTestId('source-control-refresh-ssh-key-button');

			expect(sshKeyTypeSelect).toBeInTheDocument();
			expect(refreshButton).toBeInTheDocument();

			// Should work with SSH URL
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'git@github.com:user/repo.git');
			await userEvent.tab();

			const connectButton = getByTestId('source-control-connect-button');
			await waitFor(() => expect(connectButton).toBeEnabled());
		});

		it('should handle password field type for personal access token', async () => {
			const { container, getByText } = renderComponent({
				pinia,
			});

			// Switch to HTTPS
			const protocolSelect = document.querySelector(
				'[data-test-id="source-control-protocol-select"]',
			)! as HTMLElement;
			await switchProtocol(protocolSelect, getByText, 'HTTPS');
			await nextTick();

			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;
			expect(tokenInput.getAttribute('type')).toBe('password');
		});
	});
});
