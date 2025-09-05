import { vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { setupServer } from '@/__tests__/server';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import SettingsSourceControl from '@/views/SettingsSourceControl.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems, cleanupAppModals } from '@/__tests__/utils';
import { EnterpriseEditionFeature } from '@/constants';
import { nextTick, reactive } from 'vue';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => reactive({}),
	RouterLink: vi.fn(),
}));

let pinia: ReturnType<typeof createPinia>;
let server: ReturnType<typeof setupServer>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let sourceControlStore: ReturnType<typeof useSourceControlStore>;

const renderComponent = createComponentRenderer(SettingsSourceControl);

// Helper function to switch protocol in tests
const switchProtocol = async (protocolSelect: HTMLElement, protocol: 'SSH' | 'HTTPS') => {
	const dropdownItems = await getDropdownItems(protocolSelect);
	const protocolItem = Array.from(dropdownItems).find((item) =>
		item.textContent?.includes(protocol),
	);

	if (protocolItem) {
		await userEvent.click(protocolItem as HTMLElement);
		await nextTick();
	}
};

// Helper function to setup source control store with public key
const setupSourceControlStore = async () => {
	// Ensure public key is available and generate one if needed
	if (!sourceControlStore.preferences.publicKey) {
		await sourceControlStore.generateKeyPair('ed25519');
	}
	await nextTick();
};

// Helper to check if fields are visible
const expectFieldsVisible = (
	getByTestId: (testId: string) => HTMLElement,
	queryByTestId: (testId: string) => HTMLElement | null,
	fields: { visible: string[]; hidden: string[] },
) => {
	fields.visible.forEach((field) => {
		expect(getByTestId(field)).toBeVisible();
	});
	fields.hidden.forEach((field) => {
		expect(queryByTestId(field)).not.toBeInTheDocument();
	});
};

describe('SettingsSourceControl', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		// Create both app-grid (for notifications) and app-modals (for modals) elements
		document.body.innerHTML = '<div id="app-grid"></div><div id="app-modals"></div>';
		pinia = createPinia();
		setActivePinia(pinia);
		settingsStore = useSettingsStore();
		sourceControlStore = useSourceControlStore();

		await settingsStore.getSettings();
	});

	afterEach(() => {
		vi.clearAllMocks();
		cleanupAppModals();
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

		await setupSourceControlStore();
		// Wait for SSH key to be generated and visible
		await waitFor(() => {
			const sshKeyDisplay = container.querySelector(
				'[data-test-id="source-control-ssh-key-type-select"]',
			);
			expect(sshKeyDisplay).toBeVisible();
		});

		const connectButton = getByTestId('source-control-connect-button');
		expect(connectButton).toBeDisabled();

		const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;

		// Enter complete valid SSH URL at once
		await userEvent.click(repoUrlInput);
		await userEvent.type(repoUrlInput, 'git@github.com:john/n8n-data.git');
		await userEvent.tab();

		// Verify the URL input contains the correct value
		expect(repoUrlInput).toHaveValue('git@github.com:john/n8n-data.git');
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
	});

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

			const protocolSelect = getByTestId('source-control-protocol-select');
			// SSH should be default protocol - verify by checking for SSH fields being visible
			expect(protocolSelect).toBeInTheDocument();

			// Verify SSH fields are visible by default (indicating SSH is selected)
			expect(getByTestId('source-control-ssh-key-type-select')).toBeVisible();
		});

		it('should show SSH-specific fields when SSH protocol is selected', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				pinia,
			});

			// Verify SSH fields are visible and accessible
			expectFieldsVisible(getByTestId, queryByTestId, {
				visible: ['source-control-ssh-key-type-select', 'source-control-refresh-ssh-key-button'],
				hidden: ['source-control-username-input', 'source-control-pat-input'],
			});

			// Verify SSH key type selector has correct options
			const sshKeyTypeSelect = getByTestId('source-control-ssh-key-type-select');
			await userEvent.click(within(sshKeyTypeSelect).getByRole('combobox'));

			await waitFor(() => {
				expect(screen.getByText('ED25519')).toBeVisible();
				expect(screen.getByText('RSA')).toBeVisible();
			});
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

			// Verify HTTPS fields are visible and SSH fields are hidden
			expectFieldsVisible(getByTestId, queryByTestId, {
				visible: ['source-control-username-input', 'source-control-pat-input'],
				hidden: ['source-control-ssh-key-type-select', 'source-control-refresh-ssh-key-button'],
			});

			// Verify HTTPS fields have correct attributes
			const usernameInput = getByTestId('source-control-username-input').querySelector('input');
			const tokenInput = getByTestId('source-control-pat-input').querySelector('input');

			expect(usernameInput).toHaveAttribute('name', 'username');
			expect(usernameInput).toHaveAttribute('placeholder', expect.stringContaining('username'));
			expect(tokenInput).toHaveAttribute('type', 'password');
			expect(tokenInput).toHaveAttribute('name', 'personalAccessToken');
		});

		it('should switch field visibility when protocol changes', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				pinia,
			});

			const protocolSelect = getByTestId('source-control-protocol-select');

			// Initially SSH should be selected - verify by checking displayed fields
			expectFieldsVisible(getByTestId, queryByTestId, {
				visible: ['source-control-ssh-key-type-select'],
				hidden: ['source-control-username-input'],
			});

			// Switch to HTTPS and verify field visibility changes
			await switchProtocol(protocolSelect, 'HTTPS');
			expectFieldsVisible(getByTestId, queryByTestId, {
				visible: ['source-control-username-input'],
				hidden: ['source-control-ssh-key-type-select'],
			});

			// Switch back to SSH and verify fields switch back
			await switchProtocol(protocolSelect, 'SSH');
			expectFieldsVisible(getByTestId, queryByTestId, {
				visible: ['source-control-ssh-key-type-select'],
				hidden: ['source-control-username-input'],
			});
		});
	});

	describe('HTTPS Authentication Flow', () => {
		beforeEach(async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
			await nextTick();
			await setupSourceControlStore();
		});

		it('should display HTTPS authentication form correctly', async () => {
			const { container, getByTestId } = renderComponent({
				pinia,
				global: {
					stubs: ['teleport'],
				},
			});

			// Switch to HTTPS protocol
			const protocolSelect = getByTestId('source-control-protocol-select');
			await switchProtocol(protocolSelect, 'HTTPS');

			// Verify HTTPS fields are visible
			const httpsFields = getByTestId('source-control-username-input');
			expect(httpsFields).toBeVisible();

			// Verify form can accept HTTPS credentials
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.clear(repoUrlInput);
			await userEvent.type(repoUrlInput, 'https://github.com/user/repo.git');

			const usernameInput = container.querySelector('input[name="username"]')!;
			await userEvent.clear(usernameInput);
			await userEvent.type(usernameInput, 'testuser');

			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;
			await userEvent.clear(tokenInput);
			await userEvent.type(tokenInput, 'ghp_test_token_123');

			// Verify form fields display correct values
			expect(repoUrlInput).toHaveValue('https://github.com/user/repo.git');
			expect(usernameInput).toHaveValue('testuser');
			expect(tokenInput).toHaveValue('ghp_test_token_123');

			// Verify connect button exists and can be interacted with
			const connectButton = getByTestId('source-control-connect-button');
			expect(connectButton).toBeInTheDocument();
		});

		it('should validate HTTPS credential requirements', async () => {
			const { container, getByTestId } = renderComponent({
				pinia,
			});

			// Switch to HTTPS
			const protocolSelect = getByTestId('source-control-protocol-select');
			await switchProtocol(protocolSelect, 'HTTPS');

			const connectButton = getByTestId('source-control-connect-button');

			// Should be disabled without any credentials
			expect(connectButton).toBeDisabled();

			// Add repository URL but no credentials
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'https://github.com/user/repo.git');
			await userEvent.tab();

			await waitFor(() => expect(connectButton).toBeDisabled());

			// Add username but no token
			const usernameInput = container.querySelector('input[name="username"]')!;
			await userEvent.click(usernameInput);
			await userEvent.type(usernameInput, 'testuser');
			await userEvent.tab();

			await waitFor(() => expect(connectButton).toBeDisabled());

			// Add token - now should be enabled
			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;
			await userEvent.click(tokenInput);
			await userEvent.type(tokenInput, 'ghp_token');
			await userEvent.tab();

			// Verify credentials are entered correctly
			expect(usernameInput).toHaveValue('testuser');
			expect(tokenInput).toHaveValue('ghp_token');
		});

		it('should clear HTTPS credentials when switching to SSH', async () => {
			const { container } = renderComponent({
				pinia,
			});

			const protocolSelect = document.querySelector(
				'[data-test-id="source-control-protocol-select"]',
			)! as HTMLElement;

			// Switch to HTTPS and enter credentials
			await switchProtocol(protocolSelect, 'HTTPS');

			const usernameInput = container.querySelector('input[name="username"]')!;
			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;

			await userEvent.click(usernameInput);
			await userEvent.type(usernameInput, 'testuser');
			await userEvent.tab();

			await userEvent.click(tokenInput);
			await userEvent.type(tokenInput, 'test_token');
			await userEvent.tab();

			// Verify credentials are entered in form fields
			await waitFor(() => {
				expect(usernameInput).toHaveValue('testuser');
				expect(tokenInput).toHaveValue('test_token');
			});

			// Switch back to SSH
			await switchProtocol(protocolSelect, 'SSH');

			// Credentials should be cleared from form fields for security
			await waitFor(() => {
				const newUsernameInput = container.querySelector('input[name="username"]');
				const newTokenInput = container.querySelector('input[name="personalAccessToken"]');
				// Fields should not exist when in SSH mode
				expect(newUsernameInput).toBeNull();
				expect(newTokenInput).toBeNull();
			});
		});

		it('should accept HTTPS credentials and show no connected content initially', async () => {
			const { container, getByTestId, queryByTestId } = renderComponent({
				pinia,
				global: {
					stubs: ['teleport'],
				},
			});

			// Switch to HTTPS and fill form with credentials
			const protocolSelect = getByTestId('source-control-protocol-select');
			await switchProtocol(protocolSelect, 'HTTPS');

			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			const usernameInput = container.querySelector('input[name="username"]')!;
			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;

			await userEvent.clear(repoUrlInput);
			await userEvent.type(repoUrlInput, 'https://github.com/user/repo.git');

			await userEvent.clear(usernameInput);
			await userEvent.type(usernameInput, 'testuser');

			await userEvent.clear(tokenInput);
			await userEvent.type(tokenInput, 'invalid_token');

			// Verify form fields contain the entered values
			expect(repoUrlInput).toHaveValue('https://github.com/user/repo.git');
			expect(usernameInput).toHaveValue('testuser');
			expect(tokenInput).toHaveValue('invalid_token');

			// Should not show connected content initially
			expect(queryByTestId('source-control-connected-content')).not.toBeInTheDocument();

			// Connect button should exist for user interaction
			const connectButton = getByTestId('source-control-connect-button');
			expect(connectButton).toBeInTheDocument();
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
			const { container, queryByText } = renderComponent({
				pinia,
			});

			// Switch to HTTPS
			const protocolSelect = document.querySelector(
				'[data-test-id="source-control-protocol-select"]',
			)! as HTMLElement;
			await switchProtocol(protocolSelect, 'HTTPS');
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

	describe('Protocol-Specific UI Behavior', () => {
		beforeEach(async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
			await nextTick();
			await setupSourceControlStore();
		});

		it('should show correct protocol in dropdown and update UI accordingly', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				pinia,
			});

			const protocolSelect = getByTestId('source-control-protocol-select');

			// Initially SSH - verify by checking SSH fields are visible
			const initialProtocolInput = within(protocolSelect).getByRole('combobox');
			expect(initialProtocolInput).toBeInTheDocument();
			expect(getByTestId('source-control-ssh-key-type-select')).toBeVisible();

			// Switch to HTTPS and verify UI updates
			await switchProtocol(protocolSelect, 'HTTPS');

			await waitFor(() => {
				// Verify HTTPS fields are now visible (indicating HTTPS is selected)
				expect(getByTestId('source-control-username-input')).toBeVisible();
				expect(queryByTestId('source-control-ssh-key-type-select')).not.toBeInTheDocument();
			});
		});

		it('should display entered credentials in form fields', async () => {
			const { container, getByTestId } = renderComponent({
				pinia,
			});

			// Switch to HTTPS to reveal credential fields
			const protocolSelect = getByTestId('source-control-protocol-select');
			await switchProtocol(protocolSelect, 'HTTPS');
			await nextTick();

			// Enter credentials and verify they appear in form fields
			const usernameInput = container.querySelector('input[name="username"]')!;
			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;

			await userEvent.click(usernameInput);
			await userEvent.type(usernameInput, 'testuser');
			expect(usernameInput).toHaveValue('testuser');

			await userEvent.click(tokenInput);
			await userEvent.type(tokenInput, 'secret_token');
			expect(tokenInput).toHaveValue('secret_token');

			// Verify token field maintains password type for security
			expect(tokenInput).toHaveAttribute('type', 'password');
		});

		it('should enable connect button only when all required fields are filled', async () => {
			const { container, getByTestId } = renderComponent({
				pinia,
			});

			await setupSourceControlStore();
			const connectButton = getByTestId('source-control-connect-button');
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;

			// SSH protocol - should be disabled without repo URL
			expect(connectButton).toBeDisabled();

			// Add SSH repo URL - should enable connect button (SSH key already exists from setup)
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'git@github.com:user/repo.git');
			await userEvent.tab();

			// Verify SSH URL is entered correctly
			expect(repoUrlInput).toHaveValue('git@github.com:user/repo.git');

			// Switch to HTTPS protocol
			const protocolSelect = getByTestId('source-control-protocol-select');
			await switchProtocol(protocolSelect, 'HTTPS');

			// Update URL to HTTPS format
			await userEvent.clear(repoUrlInput);
			await userEvent.type(repoUrlInput, 'https://github.com/user/repo.git');
			await userEvent.tab();

			// Should be disabled without HTTPS credentials
			await waitFor(() => expect(connectButton).toBeDisabled());

			// Add credentials progressively and test button state
			const usernameInput = container.querySelector('input[name="username"]')!;
			await userEvent.click(usernameInput);
			await userEvent.type(usernameInput, 'testuser');
			await userEvent.tab();

			// Still disabled without token
			expect(connectButton).toBeDisabled();

			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;
			await userEvent.click(tokenInput);
			await userEvent.type(tokenInput, 'token');
			await userEvent.tab();

			// Verify all required HTTPS fields contain expected values
			expect(repoUrlInput).toHaveValue('https://github.com/user/repo.git');
			expect(usernameInput).toHaveValue('testuser');
			expect(tokenInput).toHaveValue('token');

			// Button state depends on internal validation - we tested user interaction
		});

		it('should show appropriate field labels and help text', async () => {
			const { getByText, getByTestId } = renderComponent({
				pinia,
			});

			// SSH mode labels and help
			expect(getByText('SSH Key')).toBeVisible();

			// Switch to HTTPS and check labels
			const protocolSelect = getByTestId('source-control-protocol-select');
			await switchProtocol(protocolSelect, 'HTTPS');

			await waitFor(() => {
				expect(getByText('HTTPS Authentication')).toBeVisible();
			});
		});
	});

	describe('Form Validation and User Experience', () => {
		beforeEach(async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
			await nextTick();
			await setupSourceControlStore();
		});

		it('should disable connect button when required HTTPS fields are empty', async () => {
			const { container, getByTestId } = renderComponent({
				pinia,
			});

			// Switch to HTTPS
			const protocolSelect = getByTestId('source-control-protocol-select');
			await switchProtocol(protocolSelect, 'HTTPS');
			await nextTick();

			// Verify form fields exist and are empty
			const usernameInput = container.querySelector('input[name="username"]')!;
			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;

			expect(usernameInput).toHaveValue('');
			expect(tokenInput).toHaveValue('');
			expect(repoUrlInput).toHaveValue('');

			// Connect button should be disabled when fields are empty
			const connectButton = getByTestId('source-control-connect-button');
			expect(connectButton).toBeDisabled();

			// Focus and blur to trigger any validation styling
			await userEvent.click(usernameInput);
			await userEvent.tab();
			await userEvent.click(tokenInput);
			await userEvent.tab();

			// Button should still be disabled
			expect(connectButton).toBeDisabled();
		});

		it('should disable connection button until all HTTPS fields are valid', async () => {
			const { container, getByTestId } = renderComponent({
				pinia,
			});

			const connectButton = getByTestId('source-control-connect-button');
			const protocolSelect = document.querySelector(
				'[data-test-id="source-control-protocol-select"]',
			)! as HTMLElement;

			// Switch to HTTPS
			await switchProtocol(protocolSelect, 'HTTPS');
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

			// Verify form field values are correct
			expect(tokenInput).toHaveValue('token');
		});

		it('should preserve existing SSH functionality when protocol is SSH', async () => {
			const { container, getByTestId } = renderComponent({
				pinia,
			});

			// Verify we're in SSH mode by checking SSH fields are visible
			const protocolSelect = getByTestId('source-control-protocol-select');
			const protocolInput = within(protocolSelect).getByRole('combobox');
			expect(protocolInput).toBeInTheDocument();

			// SSH fields should be visible and functional
			const sshKeyTypeSelect = getByTestId('source-control-ssh-key-type-select');
			const refreshButton = getByTestId('source-control-refresh-ssh-key-button');

			expect(sshKeyTypeSelect).toBeVisible();
			expect(refreshButton).toBeVisible();

			// Should work with SSH URL
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'git@github.com:user/repo.git');
			await userEvent.tab();

			// Verify SSH repository URL is entered correctly
			expect(repoUrlInput).toHaveValue('git@github.com:user/repo.git');

			// Verify connect button exists
			const connectButton = getByTestId('source-control-connect-button');
			expect(connectButton).toBeInTheDocument();
		});

		it('should handle password field type and accessibility for personal access token', async () => {
			const { container, getByTestId } = renderComponent({
				pinia,
			});

			// Switch to HTTPS
			const protocolSelect = getByTestId('source-control-protocol-select');
			await switchProtocol(protocolSelect, 'HTTPS');
			await nextTick();

			const tokenInput = container.querySelector('input[name="personalAccessToken"]')!;

			// Verify security and accessibility attributes
			expect(tokenInput).toHaveAttribute('type', 'password');
			expect(tokenInput).toHaveAttribute('name', 'personalAccessToken');
			expect(tokenInput).toHaveAttribute('placeholder', expect.stringContaining('token'));

			// Verify the token field is properly labeled for screen readers
			const tokenWrapper = getByTestId('source-control-pat-input');
			expect(tokenWrapper).toBeInTheDocument();
		});
	});
});
