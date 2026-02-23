import { ref } from 'vue';
import { useConnectionModal } from './useConnectionModal.ee';
import { vi } from 'vitest';
import type { SecretProviderTypeResponse } from '@n8n/api-types';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';

// Mock feature flag composable
const { useEnvFeatureFlag } = vi.hoisted(() => ({
	useEnvFeatureFlag: vi.fn(),
}));
vi.mock('@/features/shared/envFeatureFlag/useEnvFeatureFlag', () => ({
	useEnvFeatureFlag,
}));

// Mock dependencies
const mockConnection = {
	getConnection: vi.fn(),
	createConnection: vi.fn(),
	updateConnection: vi.fn(),
	testConnection: vi.fn(),
	isLoading: ref(false),
	connectionState: ref('initializing'),
};

const mockHasScope = vi.fn((_scope?: string) => true);
const mockShowError = vi.fn();
const mockShowMessage = vi.fn();

vi.mock('./useSecretsProviderConnection.ee', () => ({
	useSecretsProviderConnection: () => mockConnection,
}));

vi.mock('@/app/stores/rbac.store', () => ({
	useRBACStore: vi.fn(() => ({
		hasScope: mockHasScope,
	})),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: mockShowError,
		showMessage: mockShowMessage,
	})),
}));

const mockProjectsStore = {
	projects: [] as ProjectListItem[],
	myProjects: [] as ProjectListItem[],
	fetchProject: vi.fn(),
};

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: vi.fn(() => mockProjectsStore),
}));

describe('useConnectionModal', () => {
	const mockProviderTypes: SecretProviderTypeResponse[] = [
		{
			type: 'awsSecretsManager',
			displayName: 'AWS Secrets Manager',
			icon: 'aws',
			properties: [
				{
					name: 'region',
					displayName: 'Region',
					type: 'string',
					default: 'us-east-1',
					required: true,
				},
			],
		},
	];

	const defaultOptions = {
		providerTypes: ref(mockProviderTypes),
		existingProviderNames: ref([]),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockHasScope.mockReturnValue(true);
		mockProjectsStore.projects = [];
		mockProjectsStore.myProjects = [];
		mockConnection.connectionState.value = 'initializing';
		mockConnection.testConnection.mockImplementation(async () => {
			mockConnection.connectionState.value = 'connected';
		});
		mockShowError.mockClear();
		mockShowMessage.mockClear();
		// Mock feature flag to return false by default
		useEnvFeatureFlag.mockReturnValue({
			check: ref(() => false),
		});
	});

	describe('initialization', () => {
		it('should initialize settings with empty object', () => {
			const { connectionSettings } = useConnectionModal(defaultOptions);

			expect(connectionSettings.value).toEqual({});
		});
	});

	describe('validation', () => {
		it('should validate connection name format', () => {
			const { connectionName, isValidName, connectionNameError } =
				useConnectionModal(defaultOptions);

			connectionName.value = 'Invalid Name!';
			expect(isValidName.value).toBe(false);
			expect(connectionNameError.value).not.toBeNull();

			connectionName.value = 'validName123';
			expect(isValidName.value).toBe(true);
			expect(connectionNameError.value).toBeNull();
		});

		it('should validate unique connection name', () => {
			const options = {
				...defaultOptions,
				existingProviderNames: ref(['existingName']),
			};
			const { connectionName, isValidName, connectionNameError } = useConnectionModal(options);

			connectionName.value = 'existingName';
			expect(isValidName.value).toBe(false);
			expect(connectionNameError.value).not.toBeNull();
		});

		it('should check for required fields', () => {
			const { selectedProviderType, connectionSettings, connectionName, canSave } =
				useConnectionModal(defaultOptions);

			selectedProviderType.value = mockProviderTypes[0];
			connectionName.value = 'validName';
			connectionSettings.value.region = '';
			expect(canSave.value).toBe(false);

			connectionSettings.value.region = 'us-west-1';
			expect(canSave.value).toBe(true);
		});
	});

	describe('actions', () => {
		it('should select provider type and initialize settings', () => {
			const providerTypes = ref([
				...mockProviderTypes,
				{ type: 'azureKeyVault' as const, displayName: 'Azure', icon: 'azure', properties: [] },
			]);
			const { selectProviderType, selectedProviderType, connectionSettings } = useConnectionModal({
				...defaultOptions,
				providerTypes,
			});

			selectProviderType('awsSecretsManager');
			expect(selectedProviderType.value?.type).toBe('awsSecretsManager');
			expect(connectionSettings.value.region).toBe('us-east-1');
		});

		it('should call createConnection when saving new connection', async () => {
			const { saveConnection, connectionName, selectProviderType } =
				useConnectionModal(defaultOptions);

			// Set up required state for creating a connection
			selectProviderType('awsSecretsManager');
			connectionName.value = 'newProvider';
			mockConnection.createConnection.mockResolvedValue({ id: 'new-id' });

			await saveConnection();

			expect(mockConnection.createConnection).toHaveBeenCalledWith({
				providerKey: 'newProvider',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
				projectIds: [],
			});
			expect(mockConnection.testConnection).toHaveBeenCalledWith('newProvider');
		});

		it('should call updateConnection when saving existing connection', async () => {
			const options = { ...defaultOptions, providerKey: ref('existingKey') };

			// Set initial state as if loaded
			mockConnection.getConnection.mockResolvedValue({
				id: 'existing-id',
				name: 'existingKey',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
			});

			const modal = useConnectionModal(options);
			await modal.loadConnection();

			// Change a setting to enable save
			modal.updateSettings('region', 'us-west-2');

			await modal.saveConnection();

			expect(mockConnection.updateConnection).toHaveBeenCalledWith('existingKey', {
				isGlobal: true,
				settings: { region: 'us-west-2' },
				projectIds: [],
			});
			expect(mockConnection.testConnection).toHaveBeenCalledWith('existingKey');
		});
	});

	describe('infisical deprecation', () => {
		beforeEach(() => {
			useEnvFeatureFlag.mockReturnValue({
				check: ref((key: string) => key === 'EXTERNAL_SECRETS_MULTIPLE_CONNECTIONS'),
			});
		});
		it('should not provide option to create new infisical connection if new feature flag is enabled', () => {
			const providerTypesWithInfisical = ref([
				...mockProviderTypes,
				{
					type: 'infisical',
					displayName: 'Infisical',
					icon: 'infisical',
					properties: [],
				} as SecretProviderTypeResponse,
			]);

			const { providerTypeOptions } = useConnectionModal({
				...defaultOptions,
				providerTypes: providerTypesWithInfisical,
			});

			expect(providerTypeOptions.value.find((opt) => opt.value === 'infisical')).toBeUndefined();
			expect(providerTypeOptions.value.length).toEqual(1);
			expect(providerTypeOptions.value[0].value).toEqual('awsSecretsManager');
		});

		it('should still set selectedProviderType to infisical on existing infisical connection', async () => {
			const providerTypesWithInfisical = ref([
				...mockProviderTypes,
				{
					type: 'infisical',
					displayName: 'Infisical',
					icon: 'infisical',
					properties: [],
				} as SecretProviderTypeResponse,
			]);

			// Mock existing infisical connection
			mockConnection.getConnection.mockResolvedValue({
				id: 'infisical-id',
				name: 'infisical-connection',
				type: 'infisical',
				settings: {},
			});

			const options = {
				...defaultOptions,
				providerTypes: providerTypesWithInfisical,
				providerKey: ref('infisical-key'),
			};

			const { selectedProviderType, loadConnection } = useConnectionModal(options);

			await loadConnection();

			expect(selectedProviderType.value?.type).toBe('infisical');
		});
	});

	describe('computed properties', () => {
		it('should detect unsaved changes', async () => {
			const options = { ...defaultOptions, providerKey: ref('testKey') };
			mockConnection.getConnection.mockResolvedValue({
				id: 'test-id',
				name: 'testConnection',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
			});

			const modal = useConnectionModal(options);
			await modal.loadConnection();

			expect(modal.hasUnsavedChanges.value).toBe(false);

			modal.connectionName.value = 'changed';
			expect(modal.hasUnsavedChanges.value).toBe(true);

			modal.connectionName.value = 'testConnection';
			expect(modal.hasUnsavedChanges.value).toBe(false);

			modal.updateSettings('region', 'us-west-2');
			expect(modal.hasUnsavedChanges.value).toBe(true);
		});

		it('should generate expression example', () => {
			const { expressionExample, originalConnectionName } = useConnectionModal(defaultOptions);

			originalConnectionName.value = 'myVault';
			expect(expressionExample.value).toBe('{{ $secrets.myVault.secret_name }}');
		});

		it('should detect scope changes', async () => {
			const options = { ...defaultOptions, providerKey: ref('testKey') };
			mockConnection.getConnection.mockResolvedValue({
				id: 'test-id',
				name: 'testConnection',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
				projects: [],
			});

			const modal = useConnectionModal(options);
			await modal.loadConnection();

			expect(modal.scopeUpdated.value).toBe(false);

			modal.setScopeState(['project-1'], false);
			expect(modal.scopeUpdated.value).toBe(true);
		});

		it('should return empty expression example when no connection name', () => {
			const { expressionExample } = useConnectionModal(defaultOptions);
			expect(expressionExample.value).toBe('');
		});
	});

	describe('permission handling', () => {
		it('should disable save when user lacks create permission in create mode', () => {
			mockHasScope.mockImplementation(() => false);

			const { selectProviderType, connectionName, canSave } = useConnectionModal(defaultOptions);

			selectProviderType('awsSecretsManager');
			connectionName.value = 'newConnection';

			expect(canSave.value).toBe(false);
		});

		it('should disable save when user lacks update permission in edit mode', async () => {
			mockHasScope.mockImplementation(() => false);

			const options = { ...defaultOptions, providerKey: ref('existingKey') };
			mockConnection.getConnection.mockResolvedValue({
				id: 'existing-id',
				name: 'existingKey',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
			});

			const modal = useConnectionModal(options);
			await modal.loadConnection();
			modal.updateSettings('region', 'us-west-2');

			expect(modal.canSave.value).toBe(false);
		});

		it('should prevent saving when lacking permission via canSave', async () => {
			mockHasScope.mockReturnValue(false);

			const { selectProviderType, connectionName, saveConnection, canSave } =
				useConnectionModal(defaultOptions);

			selectProviderType('awsSecretsManager');
			connectionName.value = 'newConnection';

			expect(canSave.value).toBe(false);

			const result = await saveConnection();

			expect(result).toBe(false);
			expect(mockConnection.createConnection).not.toHaveBeenCalled();
		});

		it('should allow update with global permission', async () => {
			mockHasScope.mockImplementation((scope?: string): boolean => {
				return scope === 'externalSecretsProvider:update';
			});

			const options = { ...defaultOptions, providerKey: ref('existingKey') };
			mockConnection.getConnection.mockResolvedValue({
				id: 'existing-id',
				name: 'existingKey',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
			});

			const modal = useConnectionModal(options);
			await modal.loadConnection();
			modal.updateSettings('region', 'us-west-2');

			expect(modal.canSave.value).toBe(true);
		});

		it('should allow update with project-scoped permission', async () => {
			mockHasScope.mockReturnValue(false);

			mockProjectsStore.myProjects = [
				{
					id: 'project-1',
					name: 'Project 1',
					type: 'team',
					createdAt: '',
					updatedAt: '',
					icon: null,
					role: 'owner',
					scopes: ['externalSecretsProvider:update'],
				},
			];

			const options = { ...defaultOptions, providerKey: ref('existingKey') };
			mockConnection.getConnection.mockResolvedValue({
				id: 'existing-id',
				name: 'existingKey',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
				projects: [{ id: 'project-1', name: 'Project 1' }],
			});

			const modal = useConnectionModal(options);
			await modal.loadConnection();
			modal.updateSettings('region', 'us-west-2');

			expect(modal.canSave.value).toBe(true);
		});

		it('should not allow update without any permission', async () => {
			mockHasScope.mockReturnValue(false);

			mockProjectsStore.myProjects = [
				{
					id: 'project-1',
					name: 'Project 1',
					type: 'team',
					createdAt: '',
					updatedAt: '',
					icon: null,
					role: '',
					scopes: [], // No update scope
				},
			];

			const options = { ...defaultOptions, providerKey: ref('existingKey') };
			mockConnection.getConnection.mockResolvedValue({
				id: 'existing-id',
				name: 'existingKey',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
				projects: [{ id: 'project-1', name: 'Project 1' }],
			});

			const modal = useConnectionModal(options);
			await modal.loadConnection();
			modal.updateSettings('region', 'us-west-2');

			expect(modal.canSave.value).toBe(false);
		});

		it('should allow global sharing only with global update permission', () => {
			mockHasScope.mockImplementation((scope?: string): boolean => {
				return scope === 'externalSecretsProvider:update';
			});

			const modal = useConnectionModal(defaultOptions);

			expect(modal.canShareGlobally.value).toBe(true);
		});

		it('should not allow global sharing without global update permission', async () => {
			mockHasScope.mockReturnValue(false);

			mockProjectsStore.myProjects = [
				{
					id: 'project-1',
					name: 'Project 1',
					type: 'team',
					createdAt: '',
					updatedAt: '',
					icon: null,
					role: 'owner',
					scopes: ['externalSecretsProvider:update'], // Project scope only
				},
			];

			const options = { ...defaultOptions, providerKey: ref('existingKey') };
			mockConnection.getConnection.mockResolvedValue({
				id: 'existing-id',
				name: 'existingKey',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
				projects: [{ id: 'project-1', name: 'Project 1' }],
			});

			const modal = useConnectionModal(options);
			await modal.loadConnection();

			expect(modal.canShareGlobally.value).toBe(false);
		});

		it('should require update permission on all original project IDs', async () => {
			mockHasScope.mockReturnValue(false);

			mockProjectsStore.myProjects = [
				{
					id: 'project-1',
					name: 'Project 1',
					type: 'team',
					createdAt: '',
					updatedAt: '',
					icon: null,
					role: 'owner',
					scopes: ['externalSecretsProvider:update'],
				},
				{
					id: 'project-2',
					name: 'Project 2',
					type: 'team',
					createdAt: '',
					updatedAt: '',
					icon: null,
					role: '',
					scopes: [], // Missing update permission
				},
			];

			const options = { ...defaultOptions, providerKey: ref('existingKey') };
			mockConnection.getConnection.mockResolvedValue({
				id: 'existing-id',
				name: 'existingKey',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
				projects: [
					{ id: 'project-1', name: 'Project 1' },
					{ id: 'project-2', name: 'Project 2' },
				],
			});

			const modal = useConnectionModal(options);
			await modal.loadConnection();
			modal.updateSettings('region', 'us-west-2');

			// Should fail because project-2 doesn't have update permission
			expect(modal.canSave.value).toBe(false);
		});
	});

	describe('error handling', () => {
		it('should handle error when loading connection', async () => {
			const error = new Error('Failed to load');
			mockConnection.getConnection.mockRejectedValue(error);

			const options = { ...defaultOptions, providerKey: ref('testKey') };
			const modal = useConnectionModal(options);

			await modal.loadConnection();

			expect(mockShowError).toHaveBeenCalledWith(error, expect.any(String), undefined);
		});

		it('should handle error with response data when loading connection', async () => {
			const error = {
				message: 'Failed to load',
				response: {
					data: {
						data: {
							error: 'Detailed error message',
						},
					},
				},
			};
			mockConnection.getConnection.mockRejectedValue(error);

			const options = { ...defaultOptions, providerKey: ref('testKey') };
			const modal = useConnectionModal(options);

			await modal.loadConnection();

			expect(mockShowError).toHaveBeenCalledWith(
				error,
				expect.any(String),
				'Detailed error message',
			);
		});

		it('should handle error when saving connection', async () => {
			const error = new Error('Failed to save');
			mockConnection.createConnection.mockRejectedValue(error);

			const { selectProviderType, connectionName, saveConnection, isSaving } =
				useConnectionModal(defaultOptions);

			selectProviderType('awsSecretsManager');
			connectionName.value = 'newConnection';

			const result = await saveConnection();

			expect(result).toBe(false);
			expect(mockShowError).toHaveBeenCalledWith(error, expect.any(String), undefined);
			expect(isSaving.value).toBe(false);
		});

		it('should set isSaving to false after save completes', async () => {
			mockConnection.createConnection.mockResolvedValue({ id: 'new-id' });

			const { selectProviderType, connectionName, saveConnection, isSaving } =
				useConnectionModal(defaultOptions);

			selectProviderType('awsSecretsManager');
			connectionName.value = 'newConnection';

			expect(isSaving.value).toBe(false);

			const savePromise = saveConnection();
			expect(isSaving.value).toBe(true);

			await savePromise;
			expect(isSaving.value).toBe(false);
		});

		it('should set didSave to true when save succeeds', async () => {
			const { selectProviderType, connectionName, saveConnection, didSave } =
				useConnectionModal(defaultOptions);

			mockConnection.createConnection.mockResolvedValue({
				id: 'new-id',
				name: 'newConnection',
				type: 'awsSecretsManager',
				settings: {},
				secretsCount: 5,
			});

			selectProviderType('awsSecretsManager');
			connectionName.value = 'newConnection';

			expect(didSave.value).toBe(false);

			await saveConnection();

			expect(didSave.value).toBe(true);
		});

		it('should not set didSave to true when save fails', async () => {
			const { selectProviderType, connectionName, saveConnection, didSave } =
				useConnectionModal(defaultOptions);

			mockConnection.createConnection.mockRejectedValue(new Error('Save failed'));

			selectProviderType('awsSecretsManager');
			connectionName.value = 'newConnection';

			expect(didSave.value).toBe(false);

			await saveConnection();

			expect(didSave.value).toBe(false);
		});
	});

	describe('scope management', () => {
		it('should limit project IDs to one when setting scope', () => {
			const { setScopeState, projectIds } = useConnectionModal(defaultOptions);

			setScopeState(['project-1', 'project-2', 'project-3'], false);
			expect(projectIds.value).toEqual(['project-1']);
		});

		it('should load connection with project scope', async () => {
			const options = { ...defaultOptions, providerKey: ref('testKey') };
			mockConnection.getConnection.mockResolvedValue({
				id: 'test-id',
				name: 'testConnection',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
				projects: [{ id: 'project-1', name: 'Project 1' }],
			});

			const modal = useConnectionModal(options);
			await modal.loadConnection();

			expect(modal.projectIds.value).toEqual(['project-1']);
			expect(modal.isSharedGlobally.value).toBe(false);
			expect(modal.connectionProjects.value).toEqual([{ id: 'project-1', name: 'Project 1' }]);
		});

		it('should update connection with project scope', async () => {
			const options = { ...defaultOptions, providerKey: ref('existingKey') };
			mockConnection.getConnection.mockResolvedValue({
				id: 'existing-id',
				name: 'existingKey',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
			});

			const modal = useConnectionModal(options);
			await modal.loadConnection();

			modal.setScopeState(['project-1'], false);
			modal.updateSettings('region', 'us-west-2');

			await modal.saveConnection();

			expect(mockConnection.updateConnection).toHaveBeenCalledWith('existingKey', {
				isGlobal: false,
				settings: { region: 'us-west-2' },
				projectIds: ['project-1'],
			});
		});
	});
});
