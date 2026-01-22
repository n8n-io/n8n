import { createTestingPinia } from '@pinia/testing';
import merge from 'lodash/merge';
import { useSecretsProviders } from './useSecretsProviders';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRBACStore } from '@/app/stores/rbac.store';
import { EnterpriseEditionFeature } from '@/app/constants';
import type { SecretProviderConnection, SecretProviderType } from '@n8n/api-types';
import * as secretsProviderApi from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';

vi.mock('@n8n/rest-api-client', () => ({
	getSecretProviderTypes: vi.fn(),
	getSecretProviderConnections: vi.fn(),
}));

describe('useSecretsProviders', () => {
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let rbacStore: ReturnType<typeof useRBACStore>;

	beforeEach(() => {
		createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});

		settingsStore = useSettingsStore();
		rbacStore = useRBACStore();

		vi.clearAllMocks();
	});

	describe('initialization', () => {
		it('should initialize with empty state', () => {
			const { providerTypes, activeProviders, isLoading, secrets } = useSecretsProviders({
				useMockApi: false,
			});

			expect(providerTypes.value).toEqual([]);
			expect(activeProviders.value).toEqual([]);
			expect(isLoading.value).toBe(false);
			expect(secrets.value).toEqual({});
		});
	});

	describe('isEnterpriseExternalSecretsEnabled', () => {
		it('should return true when enterprise feature is enabled', () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;

			const { isEnterpriseExternalSecretsEnabled } = useSecretsProviders({ useMockApi: false });

			expect(isEnterpriseExternalSecretsEnabled.value).toBe(true);
		});

		it('should return false when enterprise feature is disabled', () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = false;

			const { isEnterpriseExternalSecretsEnabled } = useSecretsProviders({ useMockApi: false });

			expect(isEnterpriseExternalSecretsEnabled.value).toBe(false);
		});
	});

	describe('fetchProviderTypes', () => {
		it('should fetch provider types successfully', async () => {
			const mockProviderTypes: SecretProviderType[] = [
				{
					type: 'awsSecretsManager',
					displayName: 'AWS Secrets Manager',
					icon: 'awsSecretsManager',
					properties: [],
				},
			];

			vi.mocked(secretsProviderApi.getSecretProviderTypes).mockResolvedValue(mockProviderTypes);

			const { fetchProviderTypes, providerTypes, isLoading } = useSecretsProviders({
				useMockApi: false,
			});

			expect(isLoading.value).toBe(false);

			const fetchPromise = fetchProviderTypes();
			expect(isLoading.value).toBe(true);

			await fetchPromise;

			expect(isLoading.value).toBe(false);
			expect(providerTypes.value).toEqual(mockProviderTypes);
			expect(secretsProviderApi.getSecretProviderTypes).toHaveBeenCalledTimes(1);
		});

		it('should set isLoading to false even if fetch fails', async () => {
			vi.mocked(secretsProviderApi.getSecretProviderTypes).mockRejectedValue(
				new Error('API error'),
			);

			const { fetchProviderTypes, isLoading } = useSecretsProviders({ useMockApi: false });

			expect(isLoading.value).toBe(false);

			const fetchPromise = fetchProviderTypes();
			expect(isLoading.value).toBe(true);

			await expect(fetchPromise).rejects.toThrow('API error');
			expect(isLoading.value).toBe(false);
		});
	});

	describe('fetchActiveConnections', () => {
		const mockConnections: SecretProviderConnection[] = [
			{
				id: '1',
				name: 'aws-prod',
				type: 'awsSecretsManager',
				displayName: 'AWS Secrets Manager',
				isGlobal: false,
				state: 'connected',
				enabled: true,
				secretsCount: 5,
				secrets: [],
				createdAt: '2024-01-20T10:00:00Z',
			},
			{
				id: '2',
				name: 'gcp-staging',
				type: 'gcpSecretsManager',
				displayName: 'GCP Secret Manager',
				isGlobal: false,
				state: 'connected',
				enabled: true,
				secretsCount: 3,
				secrets: [],
				createdAt: '2024-01-22T10:00:00Z',
			},
		];

		beforeEach(() => {
			vi.mocked(secretsProviderApi.getSecretProviderConnections).mockResolvedValue(mockConnections);
		});

		it('should not fetch if user lacks required scope', async () => {
			vi.spyOn(rbacStore, 'hasScope').mockReturnValue(false);

			const { fetchActiveConnections, activeProviders } = useSecretsProviders({
				useMockApi: false,
			});

			await fetchActiveConnections();

			expect(secretsProviderApi.getSecretProviderConnections).not.toHaveBeenCalled();
			expect(activeProviders.value).toEqual([]);
		});

		it('should fetch active connections with required scope', async () => {
			vi.spyOn(rbacStore, 'hasScope').mockReturnValue(true);

			const { fetchActiveConnections, activeProviders, isLoading } = useSecretsProviders({
				useMockApi: false,
			});

			expect(isLoading.value).toBe(false);

			const fetchPromise = fetchActiveConnections();
			expect(isLoading.value).toBe(true);

			await fetchPromise;

			expect(isLoading.value).toBe(false);
			expect(secretsProviderApi.getSecretProviderConnections).toHaveBeenCalledTimes(1);
			expect(activeProviders.value).toHaveLength(2);
		});

		it('should set empty array on fetch error', async () => {
			vi.spyOn(rbacStore, 'hasScope').mockReturnValue(true);
			vi.mocked(secretsProviderApi.getSecretProviderConnections).mockRejectedValue(
				new Error('Network error'),
			);

			const { fetchActiveConnections, activeProviders, isLoading } = useSecretsProviders({
				useMockApi: false,
			});

			await fetchActiveConnections();

			expect(isLoading.value).toBe(false);
			expect(activeProviders.value).toEqual([]);
		});
	});

	describe('activeProviders computed', () => {
		beforeEach(() => {
			vi.spyOn(rbacStore, 'hasScope').mockReturnValue(true);
		});

		it('should filter only enabled and connected providers', async () => {
			const mockConnections: SecretProviderConnection[] = [
				{
					id: '1',
					name: 'aws-prod',
					type: 'awsSecretsManager',
					displayName: 'AWS Secrets Manager',
					isGlobal: false,
					state: 'connected',
					enabled: true,
					secretsCount: 5,
					secrets: [],
					createdAt: '2024-01-20T10:00:00Z',
				},
				{
					id: '2',
					name: 'gcp-disabled',
					type: 'gcpSecretsManager',
					displayName: 'GCP Secret Manager',
					isGlobal: false,
					state: 'connected',
					enabled: false, // disabled
					secretsCount: 3,
					secrets: [],
					createdAt: '2024-01-21T10:00:00Z',
				},
				{
					id: '3',
					name: 'azure-initializing',
					type: 'azureKeyVault',
					displayName: 'Azure Key Vault',
					isGlobal: false,
					state: 'initializing', // not connected
					enabled: true,
					secretsCount: 2,
					secrets: [],
					createdAt: '2024-01-22T10:00:00Z',
				},
			];

			vi.mocked(secretsProviderApi.getSecretProviderConnections).mockResolvedValue(mockConnections);

			const { fetchActiveConnections, activeProviders } = useSecretsProviders({
				useMockApi: false,
			});

			await fetchActiveConnections();

			// Should only include the enabled AND connected provider
			expect(activeProviders.value).toHaveLength(1);
			expect(activeProviders.value[0].name).toBe('aws-prod');
		});

		it('should sort providers by name in descending order', async () => {
			const mockConnections: SecretProviderConnection[] = [
				{
					id: '1',
					name: 'alpha',
					type: 'awsSecretsManager',
					displayName: 'Alpha Provider',
					isGlobal: false,
					state: 'connected',
					enabled: true,
					secretsCount: 5,
					secrets: [],
					createdAt: '2024-01-20T10:00:00Z',
				},
				{
					id: '2',
					name: 'zulu',
					type: 'gcpSecretsManager',
					displayName: 'Zulu Provider',
					isGlobal: false,
					state: 'connected',
					enabled: true,
					secretsCount: 3,
					secrets: [],
					createdAt: '2024-01-21T10:00:00Z',
				},
				{
					id: '3',
					name: 'bravo',
					type: 'azureKeyVault',
					displayName: 'Bravo Provider',
					isGlobal: false,
					state: 'connected',
					enabled: true,
					secretsCount: 2,
					secrets: [],
					createdAt: '2024-01-22T10:00:00Z',
				},
			];

			vi.mocked(secretsProviderApi.getSecretProviderConnections).mockResolvedValue(mockConnections);

			const { fetchActiveConnections, activeProviders } = useSecretsProviders({
				useMockApi: false,
			});

			await fetchActiveConnections();

			expect(activeProviders.value).toHaveLength(3);
			expect(activeProviders.value[0].name).toBe('zulu');
			expect(activeProviders.value[1].name).toBe('bravo');
			expect(activeProviders.value[2].name).toBe('alpha');
		});

		it('should return empty array when no providers are enabled and connected', async () => {
			const mockConnections: SecretProviderConnection[] = [
				{
					id: '1',
					name: 'aws-disabled',
					type: 'awsSecretsManager',
					displayName: 'AWS',
					isGlobal: false,
					state: 'connected',
					enabled: false,
					secretsCount: 5,
					secrets: [],
					createdAt: '2024-01-20T10:00:00Z',
				},
			];

			vi.mocked(secretsProviderApi.getSecretProviderConnections).mockResolvedValue(mockConnections);

			const { fetchActiveConnections, activeProviders } = useSecretsProviders({
				useMockApi: false,
			});

			await fetchActiveConnections();

			expect(activeProviders.value).toHaveLength(0);
		});
	});
});
