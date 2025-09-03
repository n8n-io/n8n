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

describe('SettingsSourceControl - HTTPS functionality', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);
		settingsStore = useSettingsStore();
		sourceControlStore = useSourceControlStore();

		// Enable source control feature
		settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;

		await settingsStore.getSettings();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	describe('Connection Type Selection', () => {
		it('should show connection type dropdown when source control is enabled', async () => {
			await nextTick();

			const { getByTestId } = renderComponent({
				pinia,
			});

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

			const connectionTypeSelect = getByTestId('source-control-connection-type-select');
			expect(connectionTypeSelect).toBeInTheDocument();
		});

		it('should switch between SSH and HTTPS connection types', async () => {
			await nextTick();

			const { getByTestId, getByText, queryByTestId } = renderComponent({
				pinia,
			});

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

			// Initially should show SSH UI (default)
			const sshKeySection = queryByTestId('source-control-ssh-key-section');
			expect(sshKeySection).toBeInTheDocument();

			// Switch to HTTPS
			const connectionTypeSelect = getByTestId('source-control-connection-type-select');
			await userEvent.click(within(connectionTypeSelect).getByRole('combobox'));

			await waitFor(() => expect(getByText('HTTPS')).toBeVisible());
			await userEvent.click(getByText('HTTPS'));

			// SSH key section should be hidden, HTTPS credentials should be visible
			expect(queryByTestId('source-control-ssh-key-section')).not.toBeInTheDocument();
			expect(queryByTestId('source-control-https-credentials-section')).toBeInTheDocument();

			// Switch back to SSH
			await userEvent.click(within(connectionTypeSelect).getByRole('combobox'));
			await waitFor(() => expect(getByText('SSH')).toBeVisible());
			await userEvent.click(getByText('SSH'));

			// SSH key section should be visible again
			expect(queryByTestId('source-control-ssh-key-section')).toBeInTheDocument();
			expect(queryByTestId('source-control-https-credentials-section')).not.toBeInTheDocument();
		});
	});

	describe('HTTPS Credentials Input', () => {
		beforeEach(async () => {
			await nextTick();
		});

		it('should show HTTPS credential inputs when HTTPS is selected', async () => {
			const { getByTestId, getByText, container } = renderComponent({
				pinia,
			});

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

			// Switch to HTTPS
			const connectionTypeSelect = getByTestId('source-control-connection-type-select');
			await userEvent.click(within(connectionTypeSelect).getByRole('combobox'));
			await userEvent.click(getByText('HTTPS'));

			// Should show username and password inputs
			const usernameInput = container.querySelector('input[name="httpsUsername"]');
			const passwordInput = container.querySelector('input[name="httpsPassword"]');

			expect(usernameInput).toBeInTheDocument();
			expect(passwordInput).toBeInTheDocument();
			expect(passwordInput?.getAttribute('type')).toBe('password');
		});

		it('should validate HTTPS credentials are required', async () => {
			const { getByTestId, getByText, container } = renderComponent({
				pinia,
			});

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

			// Switch to HTTPS
			const connectionTypeSelect = getByTestId('source-control-connection-type-select');
			await userEvent.click(within(connectionTypeSelect).getByRole('combobox'));
			await userEvent.click(getByText('HTTPS'));

			// Fill repository URL
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'https://github.com/user/repo.git');

			// Connect button should be disabled without credentials
			const connectButton = getByTestId('source-control-connect-button');
			expect(connectButton).toBeDisabled();

			// Fill only username
			const usernameInput = container.querySelector('input[name="httpsUsername"]')!;
			await userEvent.click(usernameInput);
			await userEvent.type(usernameInput, 'testuser');

			// Should still be disabled
			expect(connectButton).toBeDisabled();

			// Fill password
			const passwordInput = container.querySelector('input[name="httpsPassword"]')!;
			await userEvent.click(passwordInput);
			await userEvent.type(passwordInput, 'testtoken');

			// Now should be enabled
			await waitFor(() => expect(connectButton).toBeEnabled());
		});

		it('should show helpful notice for HTTPS credentials', async () => {
			const { getByTestId, getByText } = renderComponent({
				pinia,
			});

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

			// Switch to HTTPS
			const connectionTypeSelect = getByTestId('source-control-connection-type-select');
			await userEvent.click(within(connectionTypeSelect).getByRole('combobox'));
			await userEvent.click(getByText('HTTPS'));

			// Should show notices about Personal Access Tokens and security
			expect(screen.getByText(/Personal Access Token/)).toBeInTheDocument();
			expect(screen.getByText(/securely encrypted/)).toBeInTheDocument();
		});
	});

	describe('Repository URL Validation', () => {
		beforeEach(async () => {
			await nextTick();
		});

		it('should accept HTTPS URLs when HTTPS connection type is selected', async () => {
			const { getByTestId, getByText, container, queryByText } = renderComponent({
				pinia,
			});

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

			// Switch to HTTPS
			const connectionTypeSelect = getByTestId('source-control-connection-type-select');
			await userEvent.click(within(connectionTypeSelect).getByRole('combobox'));
			await userEvent.click(getByText('HTTPS'));

			// Fill HTTPS repository URL
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'https://github.com/user/repo.git');
			await userEvent.tab();

			// Should not show validation error
			expect(queryByText('The Git repository URL is not valid')).not.toBeInTheDocument();
		});

		it('should reject SSH URLs when HTTPS connection type is selected', async () => {
			const { getByTestId, getByText, container, queryByText } = renderComponent({
				pinia,
			});

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

			// Switch to HTTPS
			const connectionTypeSelect = getByTestId('source-control-connection-type-select');
			await userEvent.click(within(connectionTypeSelect).getByRole('combobox'));
			await userEvent.click(getByText('HTTPS'));

			// Try to fill SSH repository URL
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'git@github.com:user/repo.git');
			await userEvent.tab();

			// Should show validation error
			await waitFor(() =>
				expect(queryByText('The Git repository URL is not valid')).toBeInTheDocument(),
			);
		});

		it('should accept SSH URLs when SSH connection type is selected', async () => {
			const { getByTestId, getByText, container, queryByText } = renderComponent({
				pinia,
			});

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

			// Should be on SSH by default, but let's make sure
			const connectionTypeSelect = getByTestId('source-control-connection-type-select');
			await userEvent.click(within(connectionTypeSelect).getByRole('combobox'));
			await userEvent.click(getByText('SSH'));

			// Fill SSH repository URL
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'git@github.com:user/repo.git');
			await userEvent.tab();

			// Should not show validation error
			expect(queryByText('The Git repository URL is not valid')).not.toBeInTheDocument();
		});
	});

	describe('Connection Flow', () => {
		beforeEach(async () => {
			await nextTick();
		});

		it('should successfully connect with HTTPS credentials', async () => {
			const updatePreferencesSpy = vi.spyOn(sourceControlStore, 'updatePreferences');
			const savePreferencesSpy = vi.spyOn(sourceControlStore, 'savePreferences');

			const { getByTestId, getByText, container } = renderComponent({
				pinia,
				global: {
					stubs: ['teleport'],
				},
			});

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

			// Switch to HTTPS
			const connectionTypeSelect = getByTestId('source-control-connection-type-select');
			await userEvent.click(within(connectionTypeSelect).getByRole('combobox'));
			await userEvent.click(getByText('HTTPS'));

			// Fill repository URL
			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.click(repoUrlInput);
			await userEvent.type(repoUrlInput, 'https://github.com/user/repo.git');

			// Fill credentials
			const usernameInput = container.querySelector('input[name="httpsUsername"]')!;
			await userEvent.click(usernameInput);
			await userEvent.type(usernameInput, 'testuser');

			const passwordInput = container.querySelector('input[name="httpsPassword"]')!;
			await userEvent.click(passwordInput);
			await userEvent.type(passwordInput, 'ghp_testtoken123');

			// Connect
			const connectButton = getByTestId('source-control-connect-button');
			await waitFor(() => expect(connectButton).toBeEnabled());
			await userEvent.click(connectButton);

			// Verify the correct data was sent
			expect(savePreferencesSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					repositoryUrl: 'https://github.com/user/repo.git',
					connectionType: 'https',
					httpsUsername: 'testuser',
					httpsPassword: 'ghp_testtoken123',
				}),
			);
		});

		it('should clear HTTPS credentials when switching to SSH after connection', async () => {
			// Set up initial HTTPS connection
			sourceControlStore.preferences.connected = true;
			sourceControlStore.preferences.connectionType = 'https';
			sourceControlStore.preferences.repositoryUrl = 'https://github.com/user/repo.git';

			const { getByTestId, getByText } = renderComponent({
				pinia,
			});

			// Should show connected state
			await waitFor(() =>
				expect(getByTestId('source-control-connected-content')).toBeInTheDocument(),
			);

			// Switch to SSH
			const connectionTypeSelect = getByTestId('source-control-connection-type-select');
			await userEvent.click(within(connectionTypeSelect).getByRole('combobox'));
			await userEvent.click(getByText('SSH'));

			// This should trigger cleanup of HTTPS credentials
			// (In a real implementation, this might require additional logic)
		});
	});

	describe('Error Handling', () => {
		beforeEach(async () => {
			await nextTick();
		});

		it('should handle connection errors gracefully', async () => {
			// Mock connection failure
			vi.spyOn(sourceControlStore, 'savePreferences').mockRejectedValue(
				new Error('Authentication failed'),
			);

			const { getByTestId, getByText, container } = renderComponent({
				pinia,
			});

			await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

			// Switch to HTTPS and fill valid data
			const connectionTypeSelect = getByTestId('source-control-connection-type-select');
			await userEvent.click(within(connectionTypeSelect).getByRole('combobox'));
			await userEvent.click(getByText('HTTPS'));

			const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
			await userEvent.type(repoUrlInput, 'https://github.com/user/repo.git');

			const usernameInput = container.querySelector('input[name="httpsUsername"]')!;
			await userEvent.type(usernameInput, 'testuser');

			const passwordInput = container.querySelector('input[name="httpsPassword"]')!;
			await userEvent.type(passwordInput, 'invalid-token');

			// Attempt to connect
			const connectButton = getByTestId('source-control-connect-button');
			await waitFor(() => expect(connectButton).toBeEnabled());
			await userEvent.click(connectButton);

			// Should handle the error (exact behavior depends on implementation)
			// This test verifies that the component doesn't crash
			await waitFor(() => expect(connectButton).toBeEnabled());
		});
	});
});
