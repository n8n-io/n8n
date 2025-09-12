import { vi } from 'vitest';
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

describe('SettingsSourceControl - HTTPS Integration Tests', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);
		settingsStore = useSettingsStore();
		sourceControlStore = useSourceControlStore();

		await settingsStore.getSettings();
		settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;

		// Ensure public key is available
		if (!sourceControlStore.preferences.publicKey) {
			sourceControlStore.preferences.publicKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest';
		}
		await nextTick();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should show HTTPS fields when protocol is manually set to https', async () => {
		// Directly set the protocol to HTTPS to bypass the UI interaction
		sourceControlStore.preferences.protocol = 'https';
		await nextTick();

		const { getByTestId } = renderComponent({
			pinia,
		});

		// HTTPS fields should now be visible
		expect(getByTestId('source-control-username-input')).toBeInTheDocument();
		expect(getByTestId('source-control-pat-input')).toBeInTheDocument();
	});

	it('should verify HTTPS protocol computed property works', async () => {
		// Test the store's computed property directly
		expect(sourceControlStore.preferences.protocol).toBe('ssh'); // default
		expect(sourceControlStore.isHttpsProtocol).toBe(false);

		sourceControlStore.preferences.protocol = 'https';
		await nextTick();

		expect(sourceControlStore.isHttpsProtocol).toBe(true);
	});

	it('should handle HTTPS authentication requirements', async () => {
		sourceControlStore.preferences.protocol = 'https';
		sourceControlStore.preferences.repositoryUrl = 'https://github.com/user/repo.git';
		sourceControlStore.preferences.username = 'testuser';
		sourceControlStore.formState.personalAccessToken = 'test-token';
		await nextTick();

		expect(sourceControlStore.hasValidHttpsCredentials).toBe(true);
		expect(sourceControlStore.canConnect).toBe(true);
	});
});
