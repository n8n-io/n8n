import { computed, ref, type Ref } from 'vue';
import type { IUpdateInformation } from '@/Interface';
import type { SecretProviderTypeResponse } from '@n8n/api-types';
import type { INodeProperties } from 'n8n-workflow';
import { useSecretsProviderConnection } from './useSecretsProviderConnection.ee';
import { useRBACStore } from '@/app/stores/rbac.store';
import { useToast } from '@/app/composables/useToast';
import { i18n } from '@n8n/i18n';

const CONNECTION_NAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
interface UseConnectionModalOptions {
	providerTypes: Ref<SecretProviderTypeResponse[]>;
	existingProviderNames?: Ref<string[]>;
	providerKey?: Ref<string>;
	useMockApi?: boolean;
}

/**
 * High-level composable for managing the secrets provider connection modal.
 * Handles modal state, validation, user feedback, and orchestrates API calls.
 */

function isValidConnectionName(name: string): boolean {
	return CONNECTION_NAME_REGEX.test(name);
}

export function useConnectionModal(options: UseConnectionModalOptions) {
	const { providerTypes } = options;

	// Composables
	const rbacStore = useRBACStore();
	const toast = useToast();

	// State
	const providerKey = ref<string | undefined>(options.providerKey?.value);
	const connectionId = ref<string | undefined>(undefined);
	const connectionName = ref('');
	const originalConnectionName = ref('');
	const connectionNameBlurred = ref(false);
	const selectedProviderType = ref<SecretProviderTypeResponse | undefined>(undefined);
	const connectionSettings = ref<Record<string, IUpdateInformation['value']>>({});
	const originalSettings = ref<Record<string, IUpdateInformation['value']>>({});
	const isSaving = ref(false);

	// Connection composable (low-level API operations)
	const connection = useSecretsProviderConnection();

	// Display logic - determines which properties should be shown
	function shouldDisplayProperty(property: INodeProperties): boolean {
		let visible = true;

		if (property.displayOptions?.show) {
			visible =
				visible &&
				Object.entries(property.displayOptions.show).every(([key, value]) => {
					return value?.includes(connectionSettings.value[key] as string);
				});
		}

		if (property.displayOptions?.hide) {
			visible =
				visible &&
				!Object.entries(property.displayOptions.hide).every(([key, value]) => {
					return value?.includes(connectionSettings.value[key] as string);
				});
		}

		return visible;
	}

	// Computed - Permissions
	const canCreate = computed(() => rbacStore.hasScope('externalSecretsProvider:create'));
	const canUpdate = computed(() => rbacStore.hasScope('externalSecretsProvider:update'));

	// Computed - State
	const isEditMode = computed(() => !!providerKey.value);

	const providerTypeOptions = computed(() =>
		providerTypes.value.map((type) => ({
			label: type.displayName,
			value: type.type,
		})),
	);

	const settingsUpdated = computed(() => {
		return Object.keys(connectionSettings.value).some((key) => {
			const value = connectionSettings.value[key];
			const originalValue = originalSettings.value[key];
			return value !== originalValue;
		});
	});

	const hasUnsavedChanges = computed(
		() => connectionName.value !== originalConnectionName.value || settingsUpdated.value,
	);

	const requiredFieldsFilled = computed(() => {
		if (!selectedProviderType.value) return true;

		return (
			selectedProviderType.value.properties
				?.filter((property) => property.required && shouldDisplayProperty(property))
				.every((property) => {
					const value = connectionSettings.value[property.name];
					return value !== undefined && value !== null && value !== '';
				}) ?? true
		);
	});

	// Normalized settings (only properties that should be displayed)
	const normalizedConnectionSettings = computed(() => {
		return Object.entries(connectionSettings.value).reduce(
			(acc, [key, value]) => {
				const property = selectedProviderType.value?.properties?.find((p) => p.name === key);
				if (property && shouldDisplayProperty(property)) {
					acc[key] = value;
				}
				return acc;
			},
			{} as Record<string, unknown>,
		);
	});

	const isNameTaken = computed(() => {
		const name = connectionName.value.trim();
		const existingNames = options.existingProviderNames?.value ?? [];
		return (
			existingNames.includes(name) && (!isEditMode.value || name !== originalConnectionName.value)
		);
	});

	const isValidName = computed(() => {
		const name = connectionName.value.trim();

		return name.length > 0 && isValidConnectionName(name) && !isNameTaken.value;
	});

	const connectionNameError = computed(() => {
		const name = connectionName.value.trim();
		if (name.length === 0) {
			return i18n.baseText(
				'settings.secretsProviderConnections.modal.validation.connectionName.required',
			);
		}
		if (!isValidConnectionName(name)) {
			return i18n.baseText(
				'settings.secretsProviderConnections.modal.validation.connectionName.format',
			);
		}
		if (isNameTaken.value) {
			return i18n.baseText('settings.secretsProviderConnections.modal.connectionName.unique');
		}
		return null;
	});

	const canSave = computed(() => {
		if (!isValidName.value) return false;
		if (!selectedProviderType.value) return false;

		const hasPermission = isEditMode.value ? canUpdate.value : canCreate.value;
		if (!hasPermission) return false;

		return requiredFieldsFilled.value && (settingsUpdated.value || !isEditMode.value);
	});

	const expressionExample = computed(() => {
		if (!originalConnectionName.value) return '';
		return `{{ $secrets.${originalConnectionName.value}.secret_name }}`;
	});

	function initializeSettings(providerType: SecretProviderTypeResponse) {
		const initialSettings: Record<string, IUpdateInformation['value']> = {};
		providerType.properties?.forEach((property) => {
			if (property.default !== undefined && property.default !== '') {
				initialSettings[property.name] = property.default;
			}
		});
		connectionSettings.value = initialSettings;
	}

	function updateSettings(name: string, value: IUpdateInformation['value']) {
		connectionSettings.value = {
			...connectionSettings.value,
			[name]: value,
		};
	}

	function hyphenateConnectionName(name: string): string {
		return name
			.trim()
			.replace(/\s+/g, '-')
			.replace(/([a-z])([A-Z])/g, '$1-$2')
			.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
			.toLowerCase();
	}

	function selectProviderType(providerTypeKey: string) {
		const provider = providerTypes.value.find((type) => type.type === providerTypeKey);
		if (!provider) return;

		selectedProviderType.value = provider;
		initializeSettings(provider);
	}

	async function loadConnection() {
		if (!providerKey.value) return;

		try {
			const { id, name, type, settings } = await connection.getConnection(providerKey.value);

			connectionId.value = id;
			connectionName.value = name;
			originalConnectionName.value = name;
			connectionNameBlurred.value = true;
			connectionSettings.value = { ...settings };
			originalSettings.value = { ...settings };

			selectedProviderType.value = providerTypes.value.find(
				(providerType) => providerType.type === type,
			);
		} catch (error) {
			toast.showError(error, i18n.baseText('generic.error'), error?.response?.data?.data.error);
		}
	}

	/**
	 * Creates a new secrets provider connection
	 */
	async function createNewConnection(): Promise<boolean> {
		if (!selectedProviderType.value) return false;

		const connectionData = {
			providerKey: connectionName.value.trim(),
			type: selectedProviderType.value.type,
			settings: normalizedConnectionSettings.value,
			projectIds: [],
		};

		const createdConnection = await connection.createConnection(connectionData);

		// Transition to edit mode after successful creation
		connectionId.value = createdConnection.id;
		providerKey.value = connectionName.value.trim();

		// Update saved state
		originalSettings.value = { ...connectionSettings.value };
		originalConnectionName.value = connectionName.value.trim();

		// Test connection automatically
		if (connectionId.value) {
			await connection.testConnection(connectionId.value);
		}

		return true;
	}

	/**
	 * Updates an existing secrets provider connection
	 */
	async function updateExistingConnection(): Promise<boolean> {
		if (!providerKey.value || !connectionId.value || !selectedProviderType.value) return false;

		const updateData = {
			isGlobal: true,
			settings: normalizedConnectionSettings.value,
			projectIds: [],
		};

		await connection.updateConnection(providerKey.value, updateData);

		// Update saved state
		originalSettings.value = { ...connectionSettings.value };
		originalConnectionName.value = connectionName.value.trim();

		// Test connection automatically
		await connection.testConnection(connectionId.value);

		return true;
	}

	/**
	 * Saves the connection (creates new or updates existing)
	 */
	async function saveConnection(): Promise<boolean> {
		if (!selectedProviderType.value || !canSave.value) {
			return false;
		}

		// RBAC permission check
		const hasPermission = isEditMode.value ? canUpdate.value : canCreate.value;
		if (!hasPermission) {
			toast.showError(
				new Error(i18n.baseText('generic.missing.permissions')),
				i18n.baseText('generic.error'),
				i18n.baseText('generic.missing.permissions'),
			);
			return false;
		}

		isSaving.value = true;

		try {
			const success = isEditMode.value
				? await updateExistingConnection()
				: await createNewConnection();

			return success;
		} catch (error) {
			toast.showError(error, i18n.baseText('generic.error'), error?.response?.data?.data.error);
			return false;
		} finally {
			isSaving.value = false;
		}
	}

	return {
		// State refs
		connectionName,
		connectionNameBlurred,
		originalConnectionName,
		selectedProviderType,
		connectionSettings,
		isSaving,
		connection,

		// Computed
		isEditMode,
		providerTypeOptions,
		hasUnsavedChanges,
		canSave,
		expressionExample,
		isValidName,
		connectionNameError,

		// Methods
		updateSettings,
		selectProviderType,
		hyphenateConnectionName,
		loadConnection,
		saveConnection,
		shouldDisplayProperty,
	};
}
