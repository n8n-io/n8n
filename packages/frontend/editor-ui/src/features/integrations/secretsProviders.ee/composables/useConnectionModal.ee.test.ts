import { ref } from 'vue';
import { useConnectionModal } from './useConnectionModal.ee';
import { vi } from 'vitest';
import type { SecretProviderTypeResponse } from '@n8n/api-types';

// Mock dependencies
const mockConnection = {
	getConnection: vi.fn(),
	createConnection: vi.fn(),
	updateConnection: vi.fn(),
	testConnection: vi.fn(),
	isLoading: ref(false),
	connectionState: ref('initializing'),
};

vi.mock('./useSecretsProviderConnection.ee', () => ({
	useSecretsProviderConnection: () => mockConnection,
}));

vi.mock('@/app/stores/rbac.store', () => ({
	useRBACStore: vi.fn(() => ({
		hasScope: vi.fn(() => true),
	})),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
	})),
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

			connectionName.value = 'valid-name-123';
			expect(isValidName.value).toBe(true);
			expect(connectionNameError.value).toBeNull();
		});

		it('should validate unique connection name', () => {
			const options = {
				...defaultOptions,
				existingProviderNames: ref(['existing-name']),
			};
			const { connectionName, isValidName, connectionNameError } = useConnectionModal(options);

			connectionName.value = 'existing-name';
			expect(isValidName.value).toBe(false);
			expect(connectionNameError.value).not.toBeNull();
		});

		it('should check for required fields', () => {
			const { selectedProviderType, connectionSettings, connectionName, canSave } =
				useConnectionModal(defaultOptions);

			selectedProviderType.value = mockProviderTypes[0];
			connectionName.value = 'valid-name';
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
			connectionName.value = 'new-provider';
			mockConnection.createConnection.mockResolvedValue({ id: 'new-id' });

			await saveConnection();

			expect(mockConnection.createConnection).toHaveBeenCalledWith({
				providerKey: 'new-provider',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
				projectIds: [],
			});
			expect(mockConnection.testConnection).toHaveBeenCalledWith('new-id');
		});

		it('should call updateConnection when saving existing connection', async () => {
			const options = { ...defaultOptions, providerKey: ref('existing-key') };

			// Set initial state as if loaded
			mockConnection.getConnection.mockResolvedValue({
				id: 'existing-id',
				name: 'existing-name',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
			});

			const modal = useConnectionModal(options);
			await modal.loadConnection();

			// Change a setting to enable save
			modal.updateSettings('region', 'us-west-2');

			await modal.saveConnection();

			expect(mockConnection.updateConnection).toHaveBeenCalledWith('existing-key', {
				isGlobal: true,
				settings: { region: 'us-west-2' },
				projectIds: [],
			});
			expect(mockConnection.testConnection).toHaveBeenCalledWith('existing-id');
		});
	});

	describe('computed properties', () => {
		it('should detect unsaved changes', async () => {
			const options = { ...defaultOptions, providerKey: ref('test-key') };
			mockConnection.getConnection.mockResolvedValue({
				id: 'test-id',
				name: 'test-connection',
				type: 'awsSecretsManager',
				settings: { region: 'us-east-1' },
			});

			const modal = useConnectionModal(options);
			await modal.loadConnection();

			expect(modal.hasUnsavedChanges.value).toBe(false);

			modal.connectionName.value = 'changed';
			expect(modal.hasUnsavedChanges.value).toBe(true);

			modal.connectionName.value = 'test-connection';
			expect(modal.hasUnsavedChanges.value).toBe(false);

			modal.updateSettings('region', 'us-west-2');
			expect(modal.hasUnsavedChanges.value).toBe(true);
		});

		it('should generate expression example', () => {
			const { expressionExample, originalConnectionName } = useConnectionModal(defaultOptions);

			originalConnectionName.value = 'my-vault';
			expect(expressionExample.value).toBe('{{ $secrets.my-vault.secret_name }}');
		});
	});
});
