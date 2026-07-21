import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import type {
	CredentialInformation,
	DeploymentCondition,
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialType,
	INode,
	INodeParameters,
	INodeProperties,
} from 'n8n-workflow';
import { CREDENTIAL_EMPTY_VALUE, deepCopy, NodeHelpers } from 'n8n-workflow';
import { getResourcePermissions } from '@n8n/permissions';
import { useI18n } from '@n8n/i18n';

import type { IUpdateInformation } from '@/Interface';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useSettingsStore } from '@/app/stores/settings.store';
import { setParameterValue } from '@/app/utils/parameterUtils';
import { isExpression, isTestableExpression } from '@/app/utils/expressions';
import {
	getNodeAuthOptions,
	getNodeCredentialForSelectedAuthType,
} from '@/app/utils/nodeTypesUtils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { useCredentialsStore } from '../credentials.store';
import type { ICredentialsDecryptedResponse, ICredentialsResponse } from '../credentials.types';

const MANAGED_CREDENTIAL_HIDDEN_PROPERTIES = new Set([
	'scope',
	'customScopes',
	'enabledScopes',
	'customScopesNotice',
]);

export interface UseCredentialFormOptions {
	mode: MaybeRefOrGetter<'new' | 'edit'>;
	/** In 'new' mode: the credential type to create. In 'edit' mode: the credential id to load. */
	activeId?: MaybeRefOrGetter<string | undefined>;
	/** Node whose credential is being configured — provides auth-option context (managed OAuth, recommended type). */
	contextNode?: MaybeRefOrGetter<INode | null>;
	/** Project the credential belongs to / is created in. Falls back to current/personal project. */
	projectId?: MaybeRefOrGetter<string | undefined>;
	/** Resolve the recommended auth type from the node when opening a fresh credential (modal auth selector). */
	showAuthSelector?: MaybeRefOrGetter<boolean>;
	/** Preferred name for a new credential; falls back to a generated default. */
	suggestedName?: MaybeRefOrGetter<string | undefined>;
	/** Ran after a connection test completes — host hook (e.g. scroll the result banner into view). */
	onTestComplete?: () => void;
}

/**
 * Controller for a credential form: resolves the credential type + its visible
 * properties, holds the editable data, and drives save / test. Host-agnostic —
 * the credential edit modal and inline surfaces (Instance AI) both drive
 * `CredentialConfig` from this. OAuth authorization stays with the host (it owns
 * the popup lifecycle via `useCredentialOAuth`); this only exposes the state and
 * persistence it needs.
 */
export function useCredentialForm(options: UseCredentialFormOptions) {
	const credentialsStore = useCredentialsStore();
	const projectsStore = useProjectsStore();
	const nodeTypesStore = useNodeTypesStore();
	const settingsStore = useSettingsStore();
	const nodeHelpers = useNodeHelpers();
	const i18n = useI18n();

	// --- state -------------------------------------------------------------
	const credentialData = ref<ICredentialDataDecryptedObject>({});
	const credentialName = ref('');
	const credentialId = ref('');
	const currentCredential = ref<ICredentialsResponse | ICredentialsDecryptedResponse | null>(null);
	/** Set when the host switches auth type; overrides `activeId` as the type source. */
	const selectedCredential = ref('');
	const authError = ref('');
	const testedSuccessfully = ref(false);
	const isRetesting = ref(false);
	const isSaving = ref(false);
	const isTesting = ref(false);
	const showValidationWarning = ref(false);
	const isResolvable = ref(false);
	const connectedByMe = ref(false);
	const useCustomOAuth = ref(false);

	// --- type resolution ---------------------------------------------------
	const activeNodeType = computed(() => {
		const node = toValue(options.contextNode);
		return node ? nodeTypesStore.getNodeType(node.type, node.typeVersion) : null;
	});

	const homeProject = computed(() => {
		const overrideProjectId = toValue(options.projectId);
		if (overrideProjectId) {
			const override = projectsStore.myProjects.find((p) => p.id === overrideProjectId);
			if (override) return override;
		}
		const { currentProject, personalProject } = projectsStore;
		return currentProject ?? personalProject ?? undefined;
	});

	const selectedCredentialType = computed(() => {
		if (toValue(options.mode) !== 'new') return null;
		if (selectedCredential.value !== '') {
			return credentialsStore.getCredentialTypeByName(selectedCredential.value) ?? null;
		}
		if (toValue(options.showAuthSelector)) {
			const nodeAuthOptions = getNodeAuthOptions(activeNodeType.value);
			if (nodeAuthOptions.length > 0 && activeNodeType.value?.credentials) {
				return getNodeCredentialForSelectedAuthType(activeNodeType.value, nodeAuthOptions[0].value);
			}
			const activeId = toValue(options.activeId);
			if (activeId) {
				const nodeCredential = activeNodeType.value?.credentials?.find((c) => c.name === activeId);
				if (nodeCredential) return nodeCredential;
			}
			return activeNodeType.value?.credentials?.[0] ?? null;
		}
		return null;
	});

	const credentialTypeName = computed<string | null>(() => {
		if (toValue(options.mode) === 'edit') {
			if (selectedCredential.value) return selectedCredential.value;
			return currentCredential.value?.type ?? null;
		}
		if (selectedCredentialType.value) return selectedCredentialType.value.name;
		return toValue(options.activeId) ?? null;
	});

	const credentialType = computed<ICredentialType | null>(() => {
		if (!credentialTypeName.value) return null;
		const type = credentialsStore.getCredentialTypeByName(credentialTypeName.value);
		if (!type) return null;
		return { ...type, properties: getCredentialProperties(credentialTypeName.value) };
	});

	// The full merged property set (extends chain resolved), before visibility or
	// overwrite filtering — e.g. for matching agent-supplied hint fields to the
	// type or looking up a field's display name. `credentialProperties` is the
	// filtered/visible subset; this is everything.
	const mergedProperties = computed<INodeProperties[]>(
		() => credentialType.value?.properties ?? [],
	);

	const parentTypes = computed(() =>
		credentialTypeName.value ? getParentTypes(credentialTypeName.value) : [],
	);

	const nodesWithAccess = computed(() =>
		credentialTypeName.value ? credentialsStore.getNodesWithAccess(credentialTypeName.value) : [],
	);

	// --- OAuth / managed derivations ---------------------------------------
	const isOAuthType = computed(
		() =>
			!!credentialTypeName.value &&
			(((credentialTypeName.value === 'oAuth2Api' || parentTypes.value.includes('oAuth2Api')) &&
				(credentialData.value.grantType === 'authorizationCode' ||
					credentialData.value.grantType === 'pkce')) ||
				credentialTypeName.value === 'oAuth1Api' ||
				parentTypes.value.includes('oAuth1Api')),
	);

	const managedOAuthAvailable = computed(() => {
		if (credentialTypeName.value && hasManagedOAuthCredentials(credentialTypeName.value)) {
			return true;
		}
		return (
			activeNodeType.value?.credentials?.some((type) => hasManagedOAuthCredentials(type.name)) ??
			false
		);
	});

	const isManagedOAuthMode = computed(
		() => isOAuthType.value && managedOAuthAvailable.value && !useCustomOAuth.value,
	);

	const isOAuthConnected = computed(() => {
		if (!isOAuthType.value) return false;
		if (isResolvable.value) return connectedByMe.value;
		return !!credentialData.value.oauthTokenData;
	});

	// Whether a surface can offer the "use my own OAuth app" toggle. Only meaningful
	// when a managed app exists to override (Cloud / instance overwrites); on
	// self-hosted the fields already show, so no toggle is needed. Opt-in: the base
	// exposes `useCustomOAuth` (writable) and this gate; surfaces render the control
	// (or not) themselves.
	const canUseCustomOAuth = computed(() => isOAuthType.value && managedOAuthAvailable.value);

	const isEditingManagedCredential = computed(() => {
		const activeId = toValue(options.activeId);
		if (!activeId) return false;
		return credentialsStore.getCredentialById(activeId)?.isManaged ?? false;
	});

	const isNewCredential = computed(() => toValue(options.mode) === 'new' && !credentialId.value);

	// New credentials of skip-list types default to custom mode (managed creation is disabled).
	watch(
		credentialType,
		(newType) => {
			if (toValue(options.mode) === 'new' && newType?.__skipManagedCreation) {
				useCustomOAuth.value = true;
			}
		},
		{ immediate: true },
	);

	// --- properties --------------------------------------------------------
	const credentialProperties = computed(() => {
		const type = credentialType.value;
		if (!type) return [];

		const properties = type.properties.filter((propertyData: INodeProperties) => {
			if (!displayCredentialParameter(propertyData)) return false;
			return useCustomOAuth.value || !type.__overwrittenProperties?.includes(propertyData.name);
		});

		// If only "notice" properties survive the overrides, drop them — they'd
		// reference a property that was overridden.
		if (properties.every((p) => p.type === 'notice')) return [];
		return properties;
	});

	const requiredPropertiesFilled = computed(() => {
		for (const property of credentialProperties.value) {
			if (property.required !== true) continue;
			const value = credentialData.value[property.name];

			if (property.type === 'string' && !value) return false;

			if (property.type === 'number') {
				const containsExpression = typeof value === 'string' && value.startsWith('=');
				if (typeof value !== 'number' && !containsExpression) return false;
			}

			if (property.type === 'json' && value) {
				const jsonValue = String(value);
				if (!isExpression(jsonValue) && jsonValue !== CREDENTIAL_EMPTY_VALUE) {
					try {
						JSON.parse(jsonValue);
					} catch {
						return false;
					}
				}
			}
		}
		return true;
	});

	const isCredentialTestable = computed(() => {
		if (isOAuthType.value || !requiredPropertiesFilled.value) return false;

		const hasUntestableExpressions = credentialProperties.value.some((prop) => {
			const value = credentialData.value[prop.name];
			return typeof value === 'string' && isExpression(value) && !isTestableExpression(value);
		});
		if (hasUntestableExpressions) return false;

		const nodesThatCanTest = nodesWithAccess.value.filter((node) =>
			node.credentials?.some(
				(credential) => credential.name === credentialTypeName.value && credential.testedBy,
			),
		);
		return !!nodesThatCanTest.length || (!!credentialType.value && !!credentialType.value.test);
	});

	const credentialPermissions = computed(
		() =>
			getResourcePermissions(
				(currentCredential.value as ICredentialsResponse | null)?.scopes ??
					homeProject.value?.scopes,
			).credential,
	);

	// --- helpers -----------------------------------------------------------
	function getParentTypes(name: string): string[] {
		const type = credentialsStore.getCredentialTypeByName(name);
		if (type?.extends === undefined) return [];
		const types: string[] = [];
		for (const typeName of type.extends) {
			types.push(typeName, ...getParentTypes(typeName));
		}
		return types;
	}

	function getCredentialProperties(name: string): INodeProperties[] {
		const credentialTypeData = credentialsStore.getCredentialTypeByName(name);
		if (!credentialTypeData) return [];
		if (credentialTypeData.extends === undefined) return credentialTypeData.properties;

		const combined: INodeProperties[] = [];
		for (const parentName of credentialTypeData.extends) {
			NodeHelpers.mergeNodeProperties(combined, getCredentialProperties(parentName));
		}
		// Parent credential properties take precedence.
		NodeHelpers.mergeNodeProperties(combined, credentialTypeData.properties);
		return combined;
	}

	function displayCredentialParameter(parameter: INodeProperties): boolean {
		if (parameter.type === 'hidden') return false;

		if (
			MANAGED_CREDENTIAL_HIDDEN_PROPERTIES.has(parameter.name) &&
			(isEditingManagedCredential.value || isManagedOAuthMode.value)
		) {
			return false;
		}

		const deployment: DeploymentCondition = settingsStore.isCloudDeployment ? 'cloud' : 'hosted';

		if (
			parameter.displayOptions?.showOnDeployment &&
			parameter.displayOptions.showOnDeployment !== deployment
		) {
			return false;
		}

		if (parameter.displayOptions?.hideOnCloud && settingsStore.isCloudDeployment) return false;
		if (parameter.displayOptions === undefined) return true;

		return nodeHelpers.displayParameter(
			credentialData.value as INodeParameters,
			parameter,
			'',
			null,
		);
	}

	function hasManagedOAuthCredentials(credType: string): boolean {
		const type = credentialsStore.getCredentialTypeByName(credType);
		if (type?.__skipManagedCreation) return false;
		return !!(
			type?.__overwrittenProperties?.includes('clientId') &&
			type.__overwrittenProperties.includes('clientSecret')
		);
	}

	function usesExternalSecrets(data: Record<string, unknown>): boolean {
		return Object.entries(data).some(
			([, value]) =>
				typeof value !== 'object' && /=.*\{\{[^}]*\$secrets\.[^}]+}}.*/.test(`${value}`),
		);
	}

	// --- data init ---------------------------------------------------------
	function setCredentialPropertyDefaults() {
		const type = credentialType.value;
		if (!type) return;
		for (const property of type.properties) {
			if (
				!credentialData.value.hasOwnProperty(property.name) &&
				!type.__overwrittenProperties?.includes(property.name)
			) {
				credentialData.value = {
					...credentialData.value,
					[property.name]: property.default as CredentialInformation,
				};
			}
		}
	}

	function resetCredentialData() {
		const type = credentialType.value;
		if (!type) return;
		for (const property of type.properties) {
			if (!type.__overwrittenProperties?.includes(property.name)) {
				credentialData.value = {
					...credentialData.value,
					[property.name]: property.default as CredentialInformation,
				};
			}
		}

		const resolvedProject = homeProject.value ?? {};
		const scopes = ('scopes' in resolvedProject ? resolvedProject.scopes : undefined) ?? [];
		credentialData.value = {
			...credentialData.value,
			scopes: scopes as unknown as CredentialInformation,
			homeProject: resolvedProject,
		};
	}

	/**
	 * Source-controlled credentials can arrive with empty-string parameters that
	 * break FE type checks — strip them.
	 */
	function removePropertiesWithEmptyStrings<T extends { [key: string]: unknown }>(data: T): T {
		const copy = structuredClone(data);
		Object.entries(copy).forEach(([key, value]) => {
			if (value === '') delete copy[key];
		});
		return copy;
	}

	async function loadCurrentCredential(id: string) {
		credentialId.value = id;
		const loaded = await credentialsStore.getCredentialData({ id });
		if (!loaded) {
			throw new Error(
				`${i18n.baseText('credentialEdit.credentialEdit.couldNotFindCredentialWithId')}:${id}`,
			);
		}

		currentCredential.value = loaded;
		credentialData.value = removePropertiesWithEmptyStrings(
			(loaded.data as ICredentialDataDecryptedObject) ?? {},
		);
		if (loaded.sharedWithProjects) {
			credentialData.value.sharedWithProjects = loaded.sharedWithProjects;
		}
		if (loaded.homeProject) {
			credentialData.value.homeProject = loaded.homeProject;
		}
		credentialName.value = loaded.name;
		isResolvable.value =
			'isResolvable' in loaded && typeof loaded.isResolvable === 'boolean'
				? loaded.isResolvable
				: false;
		connectedByMe.value =
			'connectedByMe' in loaded && typeof loaded.connectedByMe === 'boolean'
				? loaded.connectedByMe
				: false;
	}

	// An existing credential whose managed clientId/secret were overridden was
	// created in custom mode — reflect that so its fields render on edit.
	function detectCustomOAuth() {
		const type = credentialType.value;
		if (
			type?.__overwrittenProperties?.includes('clientId') &&
			credentialData.value.clientId &&
			credentialData.value.clientSecret
		) {
			useCustomOAuth.value = true;
		}
	}

	/**
	 * One-call setup for a fresh form: loads the credential (edit) or seeds a
	 * default name (new), then fills property defaults. Hosts with extra concerns
	 * (external secrets, hooks, quick connect) run those around this.
	 */
	async function initialize() {
		if (toValue(options.mode) === 'edit') {
			const id = toValue(options.activeId);
			if (id) await loadCurrentCredential(id);
			setCredentialPropertyDefaults();
			detectCustomOAuth();
			return;
		}
		credentialName.value =
			toValue(options.suggestedName) ||
			(credentialTypeName.value
				? await credentialsStore.getNewCredentialName({
						credentialTypeName: credentialTypeName.value,
					})
				: (credentialType.value?.displayName ?? ''));
		setCredentialPropertyDefaults();
		if (homeProject.value) {
			credentialData.value = { ...credentialData.value, homeProject: homeProject.value };
		}
	}

	// --- actions -----------------------------------------------------------
	/** Applies a field change to `credentialData`; returns false when the value was unchanged. */
	function onDataChange({ name, value }: IUpdateInformation): boolean {
		const currentValue = get(credentialData.value, name);
		if (currentValue === value) return false;

		// Changing OAuth client credentials invalidates any existing token.
		if (isOAuthType.value && (name === 'clientId' || name === 'clientSecret')) {
			const { oauthTokenData, ...rest } = credentialData.value;
			credentialData.value = deepCopy(rest);
		}

		setParameterValue(credentialData.value, name, value);
		return true;
	}

	/**
	 * Static (shared, non-resolvable) fields whose value in `data` differs from the
	 * loaded credential. Pass the payload to be saved (defaults stripped) so the
	 * result mirrors the backend's authoritative check.
	 */
	function getChangedSharedFields(data: ICredentialDataDecryptedObject): string[] {
		const original = (currentCredential.value?.data as ICredentialDataDecryptedObject) ?? {};
		return mergedProperties.value
			.filter((prop) => prop.resolvableField !== true)
			.map((prop) => prop.name)
			.filter((name) => name in data && !isEqual(original[name], data[name]));
	}

	async function testCredential(details: ICredentialsDecrypted) {
		const result = await credentialsStore.testCredential(details);
		if (result.status === 'Error') {
			authError.value = result.message;
			testedSuccessfully.value = false;
		} else {
			authError.value = '';
			testedSuccessfully.value = true;
		}
		options.onTestComplete?.();
	}

	async function retestCredential() {
		if (isEditingManagedCredential.value) return;
		if (!isCredentialTestable.value || !credentialTypeName.value) {
			authError.value = '';
			testedSuccessfully.value = false;
			return;
		}

		const { ownedBy, sharedWithProjects, ...data } = credentialData.value;
		isRetesting.value = true;
		await testCredential({
			id: credentialId.value,
			name: credentialName.value,
			type: credentialTypeName.value,
			data,
		});
		isRetesting.value = false;
	}

	return {
		// state
		credentialData,
		credentialName,
		credentialId,
		currentCredential,
		selectedCredential,
		authError,
		testedSuccessfully,
		isRetesting,
		isSaving,
		isTesting,
		showValidationWarning,
		isResolvable,
		connectedByMe,
		useCustomOAuth,
		// derived
		activeNodeType,
		homeProject,
		credentialTypeName,
		credentialType,
		mergedProperties,
		parentTypes,
		nodesWithAccess,
		isOAuthType,
		isOAuthConnected,
		isManagedOAuthMode,
		managedOAuthAvailable,
		isEditingManagedCredential,
		isNewCredential,
		credentialProperties,
		requiredPropertiesFilled,
		isCredentialTestable,
		credentialPermissions,
		canUseCustomOAuth,
		// helpers
		getParentTypes,
		getCredentialProperties,
		displayCredentialParameter,
		hasManagedOAuthCredentials,
		usesExternalSecrets,
		setCredentialPropertyDefaults,
		resetCredentialData,
		loadCurrentCredential,
		initialize,
		getChangedSharedFields,
		// actions
		onDataChange,
		testCredential,
		retestCredential,
	};
}
