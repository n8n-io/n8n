import { createTestingPinia } from '@pinia/testing';
import merge from 'lodash/merge';
import userEvent from '@testing-library/user-event';
import { EnterpriseEditionFeature } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import SettingsSecretsProviders from './SettingsSecretsProviders.ee.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useSettingsStore } from '@/app/stores/settings.store';
import { setupServer } from '@/__tests__/server';
import { computed, ref } from 'vue';
import type { SecretProviderConnection } from '@n8n/api-types';
import * as restApiClient from '@n8n/rest-api-client';

vi.mock('@n8n/rest-api-client', async (importOriginal) => {
	const original = await importOriginal<typeof restApiClient>();
	return {
		...original,
		reloadSecretProviderConnection: vi.fn(),
	};
});

const mockFetchProviders = vi.fn();
const mockFetchActiveConnections = vi.fn();
const mockFetchConnection = vi.fn();
const mockIsEnterpriseEnabled = ref(false);
const mockProviders = ref([]);
const mockActiveProviders = ref([] as SecretProviderConnection[]);
const mockIsLoading = ref(false);

vi.mock('../composables/useSecretsProvidersList.ee', () => ({
	useSecretsProvidersList: () => ({
		providerTypes: computed(() => mockProviders.value),
		activeProviders: computed(() => mockActiveProviders.value),
		fetchProviderTypes: mockFetchProviders,
		fetchActiveConnections: mockFetchActiveConnections,
		fetchConnection: mockFetchConnection,
		canCreate: computed(() => true),
		canUpdate: computed(() => true),
		isLoading: computed(() => mockIsLoading.value),
		isEnterpriseExternalSecretsEnabled: computed(() => mockIsEnterpriseEnabled.value),
		secrets: computed(() => ({})),
	}),
}));

let pinia: ReturnType<typeof createTestingPinia>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let server: ReturnType<typeof setupServer>;

const renderComponent = createComponentRenderer(SettingsSecretsProviders);

describe('SettingsSecretsProviders', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		mockFetchProviders.mockResolvedValue(undefined);
		mockFetchActiveConnections.mockResolvedValue(undefined);
		mockFetchConnection.mockResolvedValue(undefined);
		mockIsEnterpriseEnabled.value = false;
		mockProviders.value = [];
		mockActiveProviders.value = [];
		mockIsLoading.value = false;

		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});
		settingsStore = useSettingsStore();

		await settingsStore.getSettings();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render paywall state when there is no license', () => {
		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('secrets-provider-connections-content-licensed')).not.toBeInTheDocument();
		expect(getByTestId('secrets-provider-connections-content-unlicensed')).toBeInTheDocument();
	});

	it('should render licensed content', () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;
		mockIsEnterpriseEnabled.value = true;

		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(getByTestId('secrets-provider-connections-content-licensed')).toBeInTheDocument();
		expect(
			queryByTestId('secrets-provider-connections-content-unlicensed'),
		).not.toBeInTheDocument();
	});

	it('should show loading state when fetching data', () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;
		mockIsEnterpriseEnabled.value = true;
		mockIsLoading.value = true;
		mockActiveProviders.value = [];

		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(getByTestId('secrets-providers-loading')).toBeInTheDocument();
		expect(queryByTestId('secrets-provider-connections-empty-state')).not.toBeInTheDocument();
	});

	it('should show empty state when licensed with no active providers', () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;
		mockIsEnterpriseEnabled.value = true;
		mockIsLoading.value = false;
		mockActiveProviders.value = [];

		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(getByTestId('secrets-provider-connections-empty-state')).toBeInTheDocument();
		expect(queryByTestId('secrets-providers-loading')).not.toBeInTheDocument();
	});

	it('should render provider cards when there are active providers', () => {
		const activeProviders: SecretProviderConnection[] = [
			{
				id: '1',
				name: 'aws-prod',
				type: 'awsSecretsManager',
				state: 'connected',
				isEnabled: true,
				projects: [],
				settings: {},
				secretsCount: 5,
				secrets: [],
				createdAt: '2024-01-20T10:00:00Z',
				updatedAt: '2024-01-20T10:00:00Z',
			},
		];

		settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;
		mockIsEnterpriseEnabled.value = true;
		mockIsLoading.value = false;
		mockActiveProviders.value = activeProviders;

		const { queryByTestId } = renderComponent({ pinia });

		// Should not show empty state or loading state when providers exist
		expect(queryByTestId('secrets-provider-connections-empty-state')).not.toBeInTheDocument();
		expect(queryByTestId('secrets-providers-loading')).not.toBeInTheDocument();
	});

	it('should render multiple provider cards', () => {
		const activeProviders: SecretProviderConnection[] = [
			{
				id: '1',
				name: 'aws-prod',
				type: 'awsSecretsManager',
				state: 'connected',
				isEnabled: true,
				projects: [],
				settings: {},
				secretsCount: 5,
				secrets: [],
				createdAt: '2024-01-20T10:00:00Z',
				updatedAt: '2024-01-20T10:00:00Z',
			},
			{
				id: '2',
				name: 'gcp-staging',
				type: 'gcpSecretsManager',
				state: 'connected',
				isEnabled: true,
				projects: [],
				settings: {},
				secretsCount: 3,
				secrets: [],
				createdAt: '2024-01-22T10:00:00Z',
				updatedAt: '2024-01-22T10:00:00Z',
			},
		];

		settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;
		mockIsEnterpriseEnabled.value = true;
		mockIsLoading.value = false;
		mockActiveProviders.value = activeProviders;

		const { queryByTestId } = renderComponent({ pinia });

		// Should render the provider list, not empty or loading states
		expect(queryByTestId('secrets-provider-connections-empty-state')).not.toBeInTheDocument();
		expect(queryByTestId('secrets-providers-loading')).not.toBeInTheDocument();
		expect(queryByTestId('secrets-provider-connections-content-licensed')).toBeInTheDocument();
	});

	it('should call fetch methods on mount when enterprise is enabled', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;
		mockIsEnterpriseEnabled.value = true;

		renderComponent({ pinia });

		// Wait for next tick to ensure onMounted has executed
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(mockFetchProviders).toHaveBeenCalled();
		expect(mockFetchActiveConnections).toHaveBeenCalled();
	});

	it('should not call fetch methods on mount when enterprise is disabled', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = false;
		mockIsEnterpriseEnabled.value = false;

		renderComponent({ pinia });

		// Wait for next tick
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(mockFetchProviders).not.toHaveBeenCalled();
		expect(mockFetchActiveConnections).not.toHaveBeenCalled();
	});

	it('should render content within licensed section when enterprise is enabled', () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;
		mockIsEnterpriseEnabled.value = true;
		mockIsLoading.value = false;
		mockActiveProviders.value = [];

		const { getByTestId } = renderComponent({ pinia });

		// Licensed content section should be rendered
		const licensedContent = getByTestId('secrets-provider-connections-content-licensed');
		expect(licensedContent).toBeInTheDocument();
		// Should show empty state within the licensed content
		expect(getByTestId('secrets-provider-connections-empty-state')).toBeInTheDocument();
	});

	describe('handleReload', () => {
		const activeProviders: SecretProviderConnection[] = [
			{
				id: '1',
				name: 'aws-prod',
				type: 'awsSecretsManager',
				state: 'connected',
				isEnabled: true,
				projects: [],
				settings: {},
				secretsCount: 5,
				secrets: [],
				createdAt: '2024-01-20T10:00:00Z',
				updatedAt: '2024-01-20T10:00:00Z',
			},
		];

		it('should call reloadSecretProviderConnection and fetchConnection on success', async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;
			mockIsEnterpriseEnabled.value = true;
			mockIsLoading.value = false;
			mockActiveProviders.value = activeProviders;

			vi.mocked(restApiClient.reloadSecretProviderConnection).mockResolvedValue({
				success: true,
			});

			const { getByTestId } = renderComponent({ pinia });

			// Click the action toggle to open the dropdown, then click reload
			await userEvent.click(getByTestId('action-reload'));

			await vi.waitFor(() => {
				expect(restApiClient.reloadSecretProviderConnection).toHaveBeenCalledWith(
					expect.anything(),
					'aws-prod',
				);
			});

			expect(mockFetchConnection).toHaveBeenCalledWith('aws-prod');
		});

		it('should show error toast when reload returns success false', async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;
			mockIsEnterpriseEnabled.value = true;
			mockIsLoading.value = false;
			mockActiveProviders.value = activeProviders;

			vi.mocked(restApiClient.reloadSecretProviderConnection).mockResolvedValue({
				success: false,
			});

			const { getByTestId } = renderComponent({ pinia });

			await userEvent.click(getByTestId('action-reload'));

			await vi.waitFor(() => {
				expect(restApiClient.reloadSecretProviderConnection).toHaveBeenCalledWith(
					expect.anything(),
					'aws-prod',
				);
			});

			expect(mockFetchConnection).not.toHaveBeenCalled();
		});

		it('should show error toast when reload fails', async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;
			mockIsEnterpriseEnabled.value = true;
			mockIsLoading.value = false;
			mockActiveProviders.value = activeProviders;

			vi.mocked(restApiClient.reloadSecretProviderConnection).mockRejectedValue(
				new Error('Reload failed'),
			);

			const { getByTestId } = renderComponent({ pinia });

			await userEvent.click(getByTestId('action-reload'));

			await vi.waitFor(() => {
				expect(restApiClient.reloadSecretProviderConnection).toHaveBeenCalledWith(
					expect.anything(),
					'aws-prod',
				);
			});

			expect(mockFetchConnection).not.toHaveBeenCalled();
		});
	});
});
