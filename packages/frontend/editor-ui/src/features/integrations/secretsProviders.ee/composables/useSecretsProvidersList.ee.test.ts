import { createTestingPinia } from '@pinia/testing';
import merge from 'lodash/merge';
import { useSecretsProvidersList } from './useSecretsProvidersList.ee';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRBACStore } from '@/app/stores/rbac.store';
import { EnterpriseEditionFeature } from '@/app/constants';
import type { SecretProviderConnection, SecretProviderTypeResponse } from '@n8n/api-types';
import * as secretsProviderApi from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';

vi.mock('@n8n/rest-api-client', () => ({
	getSecretProviderTypes: vi.fn(),
	getSecretProviderConnections: vi.fn(),
}));

describe('useSecretsProvidersList', () => {
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
			const { providerTypes, activeProviders, isLoading, secrets } = useSecretsProvidersList({
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

			const { isEnterpriseExternalSecretsEnabled } = useSecretsProvidersList({ useMockApi: false });

			expect(isEnterpriseExternalSecretsEnabled.value).toBe(true);
		});

		it('should return false when enterprise feature is disabled', () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = false;

			const { isEnterpriseExternalSecretsEnabled } = useSecretsProvidersList({ useMockApi: false });

			expect(isEnterpriseExternalSecretsEnabled.value).toBe(false);
		});
	});

	describe('fetchProviderTypes', () => {
		it('should fetch provider types successfully', async () => {
			const mockProviderTypes: SecretProviderTypeResponse[] = [
				{
					type: 'awsSecretsManager',
					displayName: 'AWS Secrets Manager',
					icon: 'aws-secrets-manager',
					properties: [],
				},
			];

			vi.mocked(secretsProviderApi.getSecretProviderTypes).mockResolvedValue(
				mockProviderTypes as SecretProviderTypeResponse[],
			);

			const { fetchProviderTypes, providerTypes, isLoading } = useSecretsProvidersList({
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

			const { fetchProviderTypes, isLoading } = useSecretsProvidersList({ useMockApi: false });

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

		beforeEach(() => {
			vi.mocked(secretsProviderApi.getSecretProviderConnections).mockResolvedValue(mockConnections);
		});

		it('should not fetch if user lacks required scope', async () => {
			vi.spyOn(rbacStore, 'hasScope').mockReturnValue(false);

			const { fetchActiveConnections, activeProviders } = useSecretsProvidersList({
				useMockApi: false,
			});

			await fetchActiveConnections();

			expect(secretsProviderApi.getSecretProviderConnections).not.toHaveBeenCalled();
			expect(activeProviders.value).toEqual([]);
		});

		it('should set empty array on fetch error', async () => {
			vi.spyOn(rbacStore, 'hasScope').mockReturnValue(true);
			vi.mocked(secretsProviderApi.getSecretProviderConnections).mockRejectedValue(
				new Error('Network error'),
			);

			const { fetchActiveConnections, activeProviders, isLoading } = useSecretsProvidersList({
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

		it('should sort providers by name in descending order', async () => {
			const mockConnections: SecretProviderConnection[] = [
				{
					id: '1',
					name: 'alpha',
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
					name: 'zulu',
					type: 'gcpSecretsManager',
					state: 'connected',
					isEnabled: true,
					projects: [],
					settings: {},
					secretsCount: 3,
					secrets: [],
					createdAt: '2024-01-21T10:00:00Z',
					updatedAt: '2024-01-21T10:00:00Z',
				},
				{
					id: '3',
					name: 'bravo',
					type: 'azureKeyVault',
					state: 'connected',
					isEnabled: true,
					projects: [],
					settings: {},
					secretsCount: 2,
					secrets: [],
					createdAt: '2024-01-22T10:00:00Z',
					updatedAt: '2024-01-22T10:00:00Z',
				},
			];

			vi.mocked(secretsProviderApi.getSecretProviderConnections).mockResolvedValue(mockConnections);

			const { fetchActiveConnections, activeProviders } = useSecretsProvidersList({
				useMockApi: false,
			});

			await fetchActiveConnections();

			expect(activeProviders.value).toHaveLength(3);
			expect(activeProviders.value[0].name).toBe('zulu');
			expect(activeProviders.value[1].name).toBe('bravo');
			expect(activeProviders.value[2].name).toBe('alpha');
		});
	});
});
