import { setActivePinia, createPinia } from 'pinia';
import { computed } from 'vue';
import { vi } from 'vitest';
import { useExternalSecretsStore } from './externalSecrets.ee.store';
import type { ExternalSecretsProvider } from '@n8n/api-types';
import { EnterpriseEditionFeature } from '@/app/constants/enterprise';

// Hoisted mocks for API functions
const {
	getExternalSecrets,
	getGlobalExternalSecrets,
	getProjectExternalSecrets,
	getExternalSecretsProviders,
	getExternalSecretsProvider,
	testExternalSecretsProviderConnection,
	reloadProvider,
	connectProvider,
	updateProvider,
} = vi.hoisted(() => ({
	getExternalSecrets: vi.fn(),
	getGlobalExternalSecrets: vi.fn(),
	getProjectExternalSecrets: vi.fn(),
	getExternalSecretsProviders: vi.fn(),
	getExternalSecretsProvider: vi.fn(),
	testExternalSecretsProviderConnection: vi.fn(),
	reloadProvider: vi.fn(),
	connectProvider: vi.fn(),
	updateProvider: vi.fn(),
}));

// Hoisted mock for feature flag composable
const { useEnvFeatureFlag } = vi.hoisted(() => ({
	useEnvFeatureFlag: vi.fn(),
}));

// Mock API client module
vi.mock('@n8n/rest-api-client', () => ({
	getExternalSecrets,
	getGlobalExternalSecrets,
	getProjectExternalSecrets,
	getExternalSecretsProviders,
	getExternalSecretsProvider,
	testExternalSecretsProviderConnection,
	reloadProvider,
	connectProvider,
	updateProvider,
}));

// Mock root store
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: 'http://localhost:5678', sessionId: 'test-session' },
	})),
}));

// Configurable RBAC mock
const mockRBACStore = {
	hasScope: vi.fn(() => true), // Default: has permission
};

vi.mock('@/app/stores/rbac.store', () => ({
	useRBACStore: vi.fn(() => mockRBACStore),
}));

// Mock settings store
vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({
		isEnterpriseFeatureEnabled: {
			[EnterpriseEditionFeature.ExternalSecrets]: true,
		},
	})),
}));

// Mock feature flag composable
vi.mock('@/features/shared/envFeatureFlag/useEnvFeatureFlag', () => ({
	useEnvFeatureFlag,
}));

// Test fixtures
const createMockProvider = (
	overrides?: Partial<ExternalSecretsProvider>,
): ExternalSecretsProvider => ({
	icon: 'aws-icon.svg',
	name: 'aws-secrets-manager',
	displayName: 'AWS Secrets Manager',
	connected: true,
	connectedAt: '2024-01-15T10:00:00.000Z',
	state: 'connected',
	data: {
		region: 'us-east-1',
		accessKeyId: 'rwieojroijewr',
	},
	properties: [],
	...overrides,
});

const mockProviders: ExternalSecretsProvider[] = [
	createMockProvider(),
	createMockProvider({
		name: 'vault',
		displayName: 'HashiCorp Vault',
		connected: false,
		connectedAt: false,
		state: 'initializing',
		data: {
			url: 'https://vault.example.com',
		},
	}),
];

const mockGlobalSecrets: Record<string, string[]> = {
	'aws-secrets-manager': ['fruits.apple', 'fruits.banana', 'vegetables.carrot'],
	vault: ['vegetables_tomato'],
};

const mockProjectSecrets: Record<string, string[]> = {
	projectVault: ['project.fruits.orange', 'project.fruits.grape'],
	projectGcpSecretsManager: ['vegetables.cucumber'],
};

const expectedGlobalSecretsObject = {
	'aws-secrets-manager': {
		fruits: {
			apple: '*********',
			banana: '*********',
		},
		vegetables: {
			carrot: '*********',
		},
	},
	vault: {
		vegetables_tomato: '*********',
	},
};

const expectedProjectSecretsObject = {
	projectVault: {
		project: {
			fruits: {
				orange: '*********',
				grape: '*********',
			},
		},
	},
	projectGcpSecretsManager: {
		vegetables: {
			cucumber: '*********',
		},
	},
};

// Helper functions
const mockFeatureFlag = (featureName: string, enabled: boolean) => {
	vi.mocked(useEnvFeatureFlag).mockReturnValue({
		check: computed(() => (flag: string) => flag === featureName && enabled),
	} as ReturnType<typeof useEnvFeatureFlag>);
};

const setHasPermission = (hasPermission: boolean) => {
	mockRBACStore.hasScope.mockReturnValue(hasPermission);
};

describe('externalSecretsStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		// Reset to defaults
		mockFeatureFlag('EXTERNAL_SECRETS_FOR_PROJECTS', false);
		setHasPermission(true);
	});

	describe('State initialization', () => {
		it('should initialize with empty state', () => {
			const store = useExternalSecretsStore();

			expect(store.state.providers).toEqual([]);
			expect(store.state.secrets).toEqual({});
			expect(store.state.projectSecrets).toEqual({});
			expect(store.state.connectionState).toEqual({});
		});
	});

	describe('isEnterpriseExternalSecretsEnabled', () => {
		it('should return true when enterprise feature is enabled', () => {
			const store = useExternalSecretsStore();

			expect(store.isEnterpriseExternalSecretsEnabled).toBe(true);
		});
	});

	describe('projectSecretsAsObject', () => {
		it('should transform project secrets to nested object with masked values', () => {
			const store = useExternalSecretsStore();
			store.state.projectSecrets = mockProjectSecrets;

			const result = store.projectSecretsAsObject;

			expect(result).toEqual(expectedProjectSecretsObject);
		});

		it('should handle empty project secrets', () => {
			const store = useExternalSecretsStore();
			store.state.projectSecrets = {};

			const result = store.projectSecretsAsObject;

			expect(result).toEqual({});
		});
	});

	describe('secretsAsObject', () => {
		it('should only contain the global secrets if development feature flag for project secrets is disabled', () => {
			mockFeatureFlag('EXTERNAL_SECRETS_FOR_PROJECTS', false);
			const store = useExternalSecretsStore();
			store.state.secrets = mockGlobalSecrets;
			store.state.projectSecrets = mockProjectSecrets;

			const result = store.secretsAsObject;

			expect(result).toEqual(expectedGlobalSecretsObject);
		});

		it('should contain combined global and project secrets', () => {
			mockFeatureFlag('EXTERNAL_SECRETS_FOR_PROJECTS', true);
			const store = useExternalSecretsStore();
			store.state.secrets = mockGlobalSecrets;
			store.state.projectSecrets = mockProjectSecrets;

			const result = store.secretsAsObject;

			expect(result).toMatchObject({
				...expectedGlobalSecretsObject,
				...expectedProjectSecretsObject,
			});
		});

		it('should mask all secret values as "*********"', () => {
			const store = useExternalSecretsStore();
			store.state.secrets = mockGlobalSecrets;

			const result = store.secretsAsObject;

			// Verify all leaf values are masked
			const awsSecrets = result['aws-secrets-manager'] as Record<string, Record<string, string>>;
			expect(awsSecrets.fruits.apple).toBe('*********');
			expect(awsSecrets.fruits.banana).toBe('*********');
			expect(awsSecrets.vegetables.carrot).toBe('*********');
			const vaultSecrets = result.vault as Record<string, string>;
			expect(vaultSecrets.vegetables_tomato).toBe('*********');
		});
	});

	describe('fetchGlobalSecrets()', () => {
		it('should fetch and set global secrets when user has permission (feature flag disabled)', async () => {
			mockFeatureFlag('EXTERNAL_SECRETS_FOR_PROJECTS', false);
			setHasPermission(true);
			getExternalSecrets.mockResolvedValue(mockGlobalSecrets);
			const store = useExternalSecretsStore();

			await store.fetchGlobalSecrets();

			expect(mockRBACStore.hasScope).toHaveBeenCalledWith('externalSecret:list');
			expect(getExternalSecrets).toHaveBeenCalledWith(expect.anything());
			expect(getGlobalExternalSecrets).not.toHaveBeenCalled();
			expect(store.state.secrets).toEqual(mockGlobalSecrets);
		});

		it('should use new completions endpoint when feature flag is enabled', async () => {
			mockFeatureFlag('EXTERNAL_SECRETS_FOR_PROJECTS', true);
			setHasPermission(true);
			getGlobalExternalSecrets.mockResolvedValue(mockGlobalSecrets);
			const store = useExternalSecretsStore();

			await store.fetchGlobalSecrets();

			expect(mockRBACStore.hasScope).toHaveBeenCalledWith('externalSecret:list');
			expect(getGlobalExternalSecrets).toHaveBeenCalledWith(expect.anything());
			expect(getExternalSecrets).not.toHaveBeenCalled();
			expect(store.state.secrets).toEqual(mockGlobalSecrets);
		});

		it('should not fetch secrets when user lacks permission', async () => {
			setHasPermission(false);
			const store = useExternalSecretsStore();

			await store.fetchGlobalSecrets();

			expect(mockRBACStore.hasScope).toHaveBeenCalledWith('externalSecret:list');
			expect(getExternalSecrets).not.toHaveBeenCalled();
			expect(getGlobalExternalSecrets).not.toHaveBeenCalled();
			expect(store.state.secrets).toEqual({});
		});

		it('should set secrets to empty object on API error (feature flag disabled)', async () => {
			mockFeatureFlag('EXTERNAL_SECRETS_FOR_PROJECTS', false);
			setHasPermission(true);
			getExternalSecrets.mockRejectedValue(new Error('API Error'));
			const store = useExternalSecretsStore();

			await store.fetchGlobalSecrets();

			expect(store.state.secrets).toEqual({});
		});

		it('should set secrets to empty object on API error (feature flag enabled)', async () => {
			mockFeatureFlag('EXTERNAL_SECRETS_FOR_PROJECTS', true);
			setHasPermission(true);
			getGlobalExternalSecrets.mockRejectedValue(new Error('API Error'));
			const store = useExternalSecretsStore();

			await store.fetchGlobalSecrets();

			expect(store.state.secrets).toEqual({});
		});
	});

	describe('fetchProjectSecrets()', () => {
		it('should leave state.projectSecrets as empty object if development feature flag for project secrets is disabled', async () => {
			mockFeatureFlag('EXTERNAL_SECRETS_FOR_PROJECTS', false);
			setHasPermission(true);
			getProjectExternalSecrets.mockResolvedValue(mockProjectSecrets);
			const store = useExternalSecretsStore();

			await store.fetchProjectSecrets('project-123');

			expect(getProjectExternalSecrets).not.toHaveBeenCalled();
			expect(store.state.projectSecrets).toEqual({});
		});

		it('should set state.projectSecrets to response from API', async () => {
			mockFeatureFlag('EXTERNAL_SECRETS_FOR_PROJECTS', true);
			setHasPermission(true);
			getProjectExternalSecrets.mockResolvedValue(mockProjectSecrets);
			const store = useExternalSecretsStore();

			await store.fetchProjectSecrets('project-123');

			expect(getProjectExternalSecrets).toHaveBeenCalledWith(expect.anything(), 'project-123');
			expect(store.state.projectSecrets).toEqual(mockProjectSecrets);
		});

		it('should not fetch when feature flag is enabled but user lacks permission', async () => {
			mockFeatureFlag('EXTERNAL_SECRETS_FOR_PROJECTS', true);
			setHasPermission(false);
			const store = useExternalSecretsStore();

			await store.fetchProjectSecrets('project-123');

			expect(getProjectExternalSecrets).not.toHaveBeenCalled();
			expect(store.state.projectSecrets).toEqual({});
		});

		it('should set projectSecrets to empty object on API error', async () => {
			mockFeatureFlag('EXTERNAL_SECRETS_FOR_PROJECTS', true);
			setHasPermission(true);
			getProjectExternalSecrets.mockRejectedValue(new Error('API Error'));
			const store = useExternalSecretsStore();

			await store.fetchProjectSecrets('project-123');

			expect(store.state.projectSecrets).toEqual({});
		});
	});

	describe('reloadProvider()', () => {
		it('should reload provider and refetch secrets when updated', async () => {
			reloadProvider.mockResolvedValue({ updated: true });
			getExternalSecrets.mockResolvedValue(mockGlobalSecrets);
			setHasPermission(true);
			const store = useExternalSecretsStore();

			const result = await store.reloadProvider('aws-secrets-manager');

			expect(reloadProvider).toHaveBeenCalledWith(expect.anything(), 'aws-secrets-manager');
			expect(getExternalSecrets).toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it('should not refetch secrets when provider not updated', async () => {
			reloadProvider.mockResolvedValue({ updated: false });
			const store = useExternalSecretsStore();

			const result = await store.reloadProvider('vault');

			expect(reloadProvider).toHaveBeenCalledWith(expect.anything(), 'vault');
			expect(getExternalSecrets).not.toHaveBeenCalled();
			expect(result).toBe(false);
		});
	});

	describe('getProviders()', () => {
		it('should fetch and set providers list', async () => {
			getExternalSecretsProviders.mockResolvedValue(mockProviders);
			const store = useExternalSecretsStore();

			await store.getProviders();

			expect(getExternalSecretsProviders).toHaveBeenCalledWith(expect.anything());
			expect(store.state.providers).toEqual(mockProviders);
		});
	});

	describe('testProviderConnection()', () => {
		it('should call API and return test result', async () => {
			testExternalSecretsProviderConnection.mockResolvedValue({ testState: 'connected' });
			const store = useExternalSecretsStore();

			const result = await store.testProviderConnection('vault', { token: 'test-token' });

			expect(testExternalSecretsProviderConnection).toHaveBeenCalledWith(
				expect.anything(),
				'vault',
				{ token: 'test-token' },
			);
			expect(result).toEqual({ testState: 'connected' });
		});

		it('should handle test failure', async () => {
			testExternalSecretsProviderConnection.mockResolvedValue({ testState: 'error' });
			const store = useExternalSecretsStore();

			const result = await store.testProviderConnection('vault', {});

			expect(result).toEqual({ testState: 'error' });
		});
	});

	describe('getProvider()', () => {
		it('should fetch provider and add to state when not exists', async () => {
			getExternalSecretsProvider.mockResolvedValue(mockProviders[0]);
			const store = useExternalSecretsStore();
			store.state.providers = [];

			const result = await store.getProvider('aws-secrets-manager');

			expect(getExternalSecretsProvider).toHaveBeenCalledWith(
				expect.anything(),
				'aws-secrets-manager',
			);
			expect(result).toEqual(
				mockProviders.find((provider) => provider.name === 'aws-secrets-manager'),
			);
		});

		it('should fetch provider and update existing in state', async () => {
			const updatedProvider = createMockProvider({
				data: { region: 'us-west-2', accessKeyId: 'NEWKEY' },
			});
			getExternalSecretsProvider.mockResolvedValue(updatedProvider);
			const store = useExternalSecretsStore();
			store.state.providers = [
				mockProviders.find((provider) => provider.name === 'aws-secrets-manager')!,
			];

			await store.getProvider('aws-secrets-manager');

			expect(store.state.providers).toHaveLength(1);
			expect(store.state.providers[0]).toEqual(updatedProvider);
			expect(store.state.providers[0].data?.region).toBe('us-west-2');
		});
	});

	describe('setConnectionState()', () => {
		it('should set connection state for provider', () => {
			const store = useExternalSecretsStore();

			store.setConnectionState('aws-secrets-manager', 'error');

			expect(store.state.connectionState['aws-secrets-manager']).toBe('error');
		});

		it('should update existing connection state', () => {
			const store = useExternalSecretsStore();
			store.state.connectionState = { vault: 'initializing' };

			store.setConnectionState('vault', 'connected');

			expect(store.state.connectionState.vault).toBe('connected');
		});
	});
});
