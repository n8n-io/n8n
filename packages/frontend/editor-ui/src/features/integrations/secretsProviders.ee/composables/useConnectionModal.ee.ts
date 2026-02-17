import { computed, ref, watch, type Ref, type ComponentPublicInstance } from 'vue';
import type { IUpdateInformation } from '@/Interface';
import type { SecretProviderTypeResponse } from '@n8n/api-types';
import type { INodeProperties } from 'n8n-workflow';
import { useSecretsProviderConnection } from './useSecretsProviderConnection.ee';
import { useRBACStore } from '@/app/stores/rbac.store';
import { useToast } from '@/app/composables/useToast';
import { i18n } from '@n8n/i18n';
import type { Scope } from '@n8n/permissions';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { isComponentPublicInstance } from '@/app/utils/typeGuards';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

export type ConnectionProjectSummary = { id: string; name: string };

const CONNECTION_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9]*$/;
interface UseConnectionModalOptions {
	providerTypes: Ref<SecretProviderTypeResponse[]>;
	existingProviderNames?: Ref<string[]>;
	providerKey?: Ref<string>;
	useMockApi?: boolean;
	projectId?: string;
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
	const projectsStore = useProjectsStore();
	const { check: checkDevFeatureFlag } = useEnvFeatureFlag();

	// State
	const providerKey = ref<string | undefined>(options.providerKey?.value);
	const providerSecretsCount = ref(0);
	const connectionName = ref('');
	const originalConnectionName = ref('');
	const connectionNameBlurred = ref(false);
	const selectedProviderType = ref<SecretProviderTypeResponse | undefined>(undefined);
	const connectionSettings = ref<Record<string, IUpdateInformation['value']>>({});
	const originalSettings = ref<Record<string, IUpdateInformation['value']>>({});
	const isSaving = ref(false);
	const didSave = ref(false);
	const parameterValidationStates = ref<Record<string, boolean>>({});

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

	// Scope state (global = no project restriction; projectIds = shared with that project; max 1 project)
	const projectIds = ref<string[]>([]);
	const isSharedGlobally = ref(true);
	const originalProjectIds = ref<string[]>([]);
	const originalIsSharedGlobally = ref(true);
	const connectionProjects = ref<ConnectionProjectSummary[]>([]);

	// Fetch project data when connection projects change
	watch(
		connectionProjects,
		async (projects: ConnectionProjectSummary[]) => {
			if (projects.length === 0) return;

			// Fetch project if not in store
			const projectId = projects[0].id;
			if (!projectsStore.projects.find((p: ProjectSharingData) => p.id === projectId)) {
				await projectsStore.fetchProject(projectId);
			}
		},
		{ immediate: true },
	);

	const sharedWithProjects = computed(() => {
		if (projectIds.value.length === 0) return [];
		return projectsStore.projects.filter((p: ProjectSharingData) =>
			projectIds.value.includes(p.id),
		);
	});

	// Helper to check if a project has a specific scope
	const hasProjectScope = (projectId: string, scope: Scope): boolean => {
		const project = projectsStore.myProjects.find((p) => p.id === projectId);
		return project?.scopes?.includes(scope) ?? false;
	};

	// Permission checks
	const canCreateProjectScoped = computed(() => {
		if (!options.projectId) return false;
		return hasProjectScope(options.projectId, 'externalSecretsProvider:create');
	});

	const canUpdateProjectScoped = computed(() => {
		// Can update if user has update permission within the scope of the original project
		// This allows removing project from scope
		if (originalProjectIds.value.length === 0) return false;

		return originalProjectIds.value.every((id) =>
			hasProjectScope(id, 'externalSecretsProvider:update'),
		);
	});

	const canCreate = computed(
		() => rbacStore.hasScope('externalSecretsProvider:create') || canCreateProjectScoped.value,
	);

	const canUpdate = computed(() => {
		return rbacStore.hasScope('externalSecretsProvider:update') || canUpdateProjectScoped.value;
	});

	const canDelete = computed(() => {
		return rbacStore.hasScope('externalSecretsProvider:delete');
	});

	const canShareGlobally = computed(() => {
		// Only users with global update permission can share globally or with other projects
		return rbacStore.hasScope('externalSecretsProvider:update');
	});

	// Computed - State
	const isEditMode = computed(() => !!providerKey.value);

	const providerTypeOptions = computed(() => {
		const prvdrTypeOptions = providerTypes.value.map((type) => ({
			label: type.displayName,
			value: type.type,
		}));

		if (checkDevFeatureFlag.value('EXTERNAL_SECRETS_MULTIPLE_CONNECTIONS')) {
			// infisical has been deprecated for a long time.
			// In order to be able to fully remove the code for it
			// we are no longer showing users the option to create connections to infisical.
			// Any previously existing connections will keep working for now.
			return prvdrTypeOptions.filter((opt) => opt.value !== 'infisical');
		}

		return prvdrTypeOptions;
	});

	const settingsUpdated = computed(() => {
		return Object.keys(connectionSettings.value).some((key) => {
			const value = connectionSettings.value[key];
			const originalValue = originalSettings.value[key];
			return value !== originalValue;
		});
	});

	const scopeUpdated = computed(
		() =>
			isSharedGlobally.value !== originalIsSharedGlobally.value ||
			JSON.stringify(projectIds.value) !== JSON.stringify(originalProjectIds.value),
	);

	const hasUnsavedChanges = computed(
		() =>
			connectionName.value !== originalConnectionName.value ||
			settingsUpdated.value ||
			scopeUpdated.value,
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

	const hasValidationErrors = computed(() => {
		return Object.values(parameterValidationStates.value).some((isValid) => !isValid);
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

		if (hasValidationErrors.value) return false;

		return (
			// check if connection settings are filled
			requiredFieldsFilled.value &&
			// check if scope is set, either by project or globally
			(projectIds.value.length > 0 || isSharedGlobally.value) &&
			// check if there are unsaved changes
			(settingsUpdated.value || scopeUpdated.value || !isEditMode.value)
		);
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

	function setParameterValidationState(
		propertyName: string,
		el: Element | ComponentPublicInstance | null,
	) {
		if (!isComponentPublicInstance(el) || !('displaysIssues' in el)) return;
		parameterValidationStates.value[propertyName] = !el.displaysIssues;
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
			const { name, type, settings, projects, secretsCount } = await connection.getConnection(
				providerKey.value,
			);

			connectionName.value = name;
			originalConnectionName.value = name;
			connectionNameBlurred.value = true;
			connectionSettings.value = { ...settings };
			originalSettings.value = { ...settings };
			providerSecretsCount.value = secretsCount;

			connectionProjects.value = projects ?? [];
			projectIds.value = (projects ?? []).map((p) => p.id);
			isSharedGlobally.value = projectIds.value.length === 0;
			originalProjectIds.value = [...projectIds.value];
			originalIsSharedGlobally.value = isSharedGlobally.value;

			selectedProviderType.value = providerTypes.value.find(
				(providerType) => providerType.type === type,
			);
			await connection.testConnection(providerKey.value);
		} catch (error) {
			toast.showError(error, i18n.baseText('generic.error'), error?.response?.data?.data.error);
		}
	}

	/**
	 * Creates a new secrets provider connection
	 */
	async function createNewConnection(): Promise<boolean> {
		if (!selectedProviderType.value) return false;

		// Use current scope state: either global ([]) or project-specific (max 1 project)
		const scopeProjectIds = isSharedGlobally.value ? [] : projectIds.value.slice(0, 1);

		const connectionData = {
			providerKey: connectionName.value.trim(),
			type: selectedProviderType.value.type,
			settings: normalizedConnectionSettings.value,
			projectIds: scopeProjectIds,
		};

		const { secretsCount } = await connection.createConnection(connectionData);

		// Transition to edit mode after successful creation
		providerKey.value = connectionName.value.trim();
		providerSecretsCount.value = secretsCount;

		// Update saved state
		originalSettings.value = { ...connectionSettings.value };
		originalConnectionName.value = connectionName.value.trim();
		originalProjectIds.value = [...projectIds.value];
		originalIsSharedGlobally.value = isSharedGlobally.value;

		// Test connection automatically after creation
		if (providerKey.value) {
			await connection.testConnection(providerKey.value);
		}

		return true;
	}

	/**
	 * Updates an existing secrets provider connection
	 */
	async function updateExistingConnection(): Promise<boolean> {
		if (!providerKey.value || !selectedProviderType.value) return false;

		const scopeProjectIds = isSharedGlobally.value ? [] : projectIds.value.slice(0, 1);
		const updateData = {
			isGlobal: isSharedGlobally.value,
			settings: normalizedConnectionSettings.value,
			projectIds: scopeProjectIds,
		};

		const hasSettingsChanges = settingsUpdated.value;

		const { secretsCount, projects } = await connection.updateConnection(
			providerKey.value,
			updateData,
		);

		providerSecretsCount.value = secretsCount;

		// Update saved state
		originalSettings.value = { ...connectionSettings.value };
		originalConnectionName.value = connectionName.value.trim();
		originalProjectIds.value = [...projectIds.value];
		isSharedGlobally.value = projects.length === 0;
		originalIsSharedGlobally.value = projects.length === 0;

		// Test connection only if settings changed (not just scope/sharing)
		if (hasSettingsChanges && providerKey.value) {
			await connection.testConnection(providerKey.value);
		}

		return true;
	}

	function setScopeState(newProjectIds: string[], newIsSharedGlobally: boolean) {
		projectIds.value = newProjectIds.slice(0, 1);
		isSharedGlobally.value = newIsSharedGlobally;
	}

	/**
	 * Initialize the modal with project scope when creating from a project context
	 */
	function initializeProjectScope() {
		// Only initialize project scope for new connections (not edit mode)
		if (!providerKey.value && options.projectId) {
			const project = projectsStore.myProjects.find((p) => p.id === options.projectId);

			// Initialize scope state
			projectIds.value = [options.projectId];
			isSharedGlobally.value = false;
			originalProjectIds.value = [options.projectId];
			originalIsSharedGlobally.value = false;

			// Initialize connectionProjects with project info if available
			if (project?.name) {
				connectionProjects.value = [
					{
						id: project.id,
						name: project.name,
					},
				];
			}
		}
	}

	initializeProjectScope();

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

			if (success) {
				didSave.value = true;
			}

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
		providerSecretsCount,
		providerKey,
		connectionName,
		connectionNameBlurred,
		originalConnectionName,
		selectedProviderType,
		connectionSettings,
		isSaving,
		didSave,
		connection,

		// Scope state
		projectIds,
		isSharedGlobally,
		connectionProjects,
		sharedWithProjects,
		canUpdate,
		canDelete,
		canShareGlobally,
		setScopeState,

		// Computed
		isEditMode,
		providerTypeOptions,
		hasUnsavedChanges,
		hasValidationErrors,
		canSave,
		expressionExample,
		isValidName,
		connectionNameError,
		scopeUpdated,

		// Methods
		updateSettings,
		selectProviderType,
		loadConnection,
		saveConnection,
		shouldDisplayProperty,
		setParameterValidationState,
	};
}
