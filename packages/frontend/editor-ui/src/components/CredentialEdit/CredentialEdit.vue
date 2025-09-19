<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';

import type {
	ICredentialsDecryptedResponse,
	ICredentialsResponse,
	IUpdateInformation,
} from '@/Interface';

import CredentialIcon from '@/components/CredentialIcon.vue';
import type {
	CredentialInformation,
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	INode,
	INodeParameters,
	INodeProperties,
	ITelemetryTrackProperties,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import CredentialConfig from '@/components/CredentialEdit/CredentialConfig.vue';
import CredentialInfo from '@/components/CredentialEdit/CredentialInfo.vue';
import CredentialSharing from '@/components/CredentialEdit/CredentialSharing.ee.vue';
import Modal from '@/components/Modal.vue';
import SaveButton from '@/components/SaveButton.vue';
import { useMessage } from '@/composables/useMessage';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useToast } from '@/composables/useToast';
import { CREDENTIAL_EDIT_MODAL_KEY, EnterpriseEditionFeature, MODAL_CONFIRM } from '@/constants';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { Project, ProjectSharingData } from '@/types/projects.types';
import { N8nInlineTextEdit, N8nText, type IMenuItem } from '@n8n/design-system';
import { getResourcePermissions } from '@n8n/permissions';
import { assert } from '@n8n/utils/assert';
import { createEventBus } from '@n8n/utils/event-bus';

import { useExternalHooks } from '@/composables/useExternalHooks';
import { useTelemetry } from '@/composables/useTelemetry';
import { useProjectsStore } from '@/stores/projects.store';
import { isExpression, isTestableExpression } from '@/utils/expressions';
import {
	getNodeAuthOptions,
	getNodeCredentialForSelectedAuthType,
	updateNodeAuthType,
} from '@/utils/nodeTypesUtils';
import { isCredentialModalState, isValidCredentialResponse } from '@/utils/typeGuards';
import { useI18n } from '@n8n/i18n';
import { useElementSize } from '@vueuse/core';
import { useRouter } from 'vue-router';

type Props = {
	modalName: string;
	activeId?: string;
	mode?: 'new' | 'edit';
};

const props = withDefaults(defineProps<Props>(), { mode: 'new', activeId: undefined });

const credentialsStore = useCredentialsStore();
const ndvStore = useNDVStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const projectsStore = useProjectsStore();

const nodeHelpers = useNodeHelpers();
const externalHooks = useExternalHooks();
const toast = useToast();
const message = useMessage();
const i18n = useI18n();
const telemetry = useTelemetry();
const router = useRouter();

const activeTab = ref('connection');
const authError = ref('');
const credentialId = ref('');
const credentialName = ref('');
const selectedCredential = ref('');
const credentialData = ref<ICredentialDataDecryptedObject>({});
const currentCredential = ref<ICredentialsResponse | ICredentialsDecryptedResponse | null>(null);
const modalBus = ref(createEventBus());
const isDeleting = ref(false);
const isSaving = ref(false);
const isTesting = ref(false);
const hasUnsavedChanges = ref(false);
const isSaved = ref(false);
const loading = ref(false);
const showValidationWarning = ref(false);
const testedSuccessfully = ref(false);
const isRetesting = ref(false);
const hasUserSpecifiedName = ref(false);
const isSharedWithChanged = ref(false);
const requiredCredentials = ref(false); // Are credentials required or optional for the node
const contentRef = ref<HTMLDivElement>();

const activeNodeType = computed(() => {
	const activeNode = ndvStore.activeNode;

	if (activeNode) {
		return nodeTypesStore.getNodeType(activeNode.type, activeNode.typeVersion);
	}
	return null;
});

const selectedCredentialType = computed(() => {
	if (props.mode !== 'new') {
		return null;
	}

	// If there is already selected type, use it
	if (selectedCredential.value !== '') {
		return credentialsStore.getCredentialTypeByName(selectedCredential.value) ?? null;
	} else if (requiredCredentials.value) {
		// Otherwise, use credential type that corresponds to the first auth option in the node definition
		const nodeAuthOptions = getNodeAuthOptions(activeNodeType.value);
		// But only if there is zero or one auth options available
		if (nodeAuthOptions.length > 0 && activeNodeType.value?.credentials) {
			return getNodeCredentialForSelectedAuthType(activeNodeType.value, nodeAuthOptions[0].value);
		} else {
			return activeNodeType.value?.credentials ? activeNodeType.value.credentials[0] : null;
		}
	}

	return null;
});

const credentialType = computed(() => {
	if (!credentialTypeName.value) {
		return null;
	}

	const type = credentialsStore.getCredentialTypeByName(credentialTypeName.value);

	if (!type) {
		return null;
	}

	return {
		...type,
		properties: getCredentialProperties(credentialTypeName.value),
	};
});

const credentialTypeName = computed(() => {
	if (props.mode === 'edit') {
		if (currentCredential.value) {
			return currentCredential.value.type;
		}

		return null;
	}
	if (selectedCredentialType.value) {
		return selectedCredentialType.value.name;
	}
	return `${props.activeId}`;
});

const isEditingManagedCredential = computed(() => {
	if (!props.activeId) return false;
	return credentialsStore.getCredentialById(props.activeId)?.isManaged ?? false;
});

const isCredentialTestable = computed(() => {
	if (isOAuthType.value || !requiredPropertiesFilled.value) {
		return false;
	}

	const hasUntestableExpressions = credentialProperties.value.some((prop) => {
		const value = credentialData.value[prop.name];
		return typeof value === 'string' && isExpression(value) && !isTestableExpression(value);
	});
	if (hasUntestableExpressions) {
		return false;
	}

	const nodesThatCanTest = nodesWithAccess.value.filter((node) => {
		if (node.credentials) {
			// Returns a list of nodes that can test this credentials
			const eligibleTesters = node.credentials.filter((credential) => {
				return credential.name === credentialTypeName.value && credential.testedBy;
			});
			// If we have any node that can test, return true.
			return !!eligibleTesters.length;
		}
		return false;
	});

	return !!nodesThatCanTest.length || (!!credentialType.value && !!credentialType.value.test);
});

const nodesWithAccess = computed(() => {
	if (credentialTypeName.value) {
		return credentialsStore.getNodesWithAccess(credentialTypeName.value);
	}

	return [];
});

const parentTypes = computed(() => {
	if (credentialTypeName.value) {
		return getParentTypes(credentialTypeName.value);
	}

	return [];
});

const isOAuthType = computed(() => {
	return (
		!!credentialTypeName.value &&
		(((credentialTypeName.value === 'oAuth2Api' || parentTypes.value.includes('oAuth2Api')) &&
			(credentialData.value.grantType === 'authorizationCode' ||
				credentialData.value.grantType === 'pkce')) ||
			credentialTypeName.value === 'oAuth1Api' ||
			parentTypes.value.includes('oAuth1Api'))
	);
});

const allOAuth2BasePropertiesOverridden = computed(() => {
	if (credentialType.value?.__overwrittenProperties) {
		return (
			credentialType.value.__overwrittenProperties.includes('clientId') &&
			credentialType.value.__overwrittenProperties.includes('clientSecret')
		);
	}
	return false;
});

const isOAuthConnected = computed(() => isOAuthType.value && !!credentialData.value.oauthTokenData);
const credentialProperties = computed(() => {
	const type = credentialType.value;
	if (!type) {
		return [];
	}

	const properties = type.properties.filter((propertyData: INodeProperties) => {
		if (!displayCredentialParameter(propertyData)) {
			return false;
		}
		return !type.__overwrittenProperties?.includes(propertyData.name);
	});

	/**
	 * If after all credentials overrides are applied only "notice"
	 * properties are left, do not return them. This will avoid
	 * showing notices that refer to a property that was overridden.
	 */
	if (properties.every((p) => p.type === 'notice')) {
		return [];
	}

	return properties;
});

const requiredPropertiesFilled = computed(() => {
	for (const property of credentialProperties.value) {
		if (property.required !== true) {
			continue;
		}

		const credentialProperty = credentialData.value[property.name];

		if (property.type === 'string' && !credentialProperty) {
			return false;
		}

		if (property.type === 'number') {
			const containsExpression =
				typeof credentialProperty === 'string' && credentialProperty.startsWith('=');

			if (typeof credentialProperty !== 'number' && !containsExpression) {
				return false;
			}
		}
	}
	return true;
});

const credentialPermissions = computed(() => {
	return getResourcePermissions(
		(currentCredential.value as ICredentialsResponse)?.scopes ?? homeProject.value?.scopes,
	).credential;
});

const sidebarItems = computed(() => {
	const menuItems: IMenuItem[] = [
		{
			id: 'connection',
			label: i18n.baseText('credentialEdit.credentialEdit.connection'),
			position: 'top',
		},
		{
			id: 'sharing',
			label: i18n.baseText('credentialEdit.credentialEdit.sharing'),
			position: 'top',
		},
		{
			id: 'details',
			label: i18n.baseText('credentialEdit.credentialEdit.details'),
			position: 'top',
		},
	];

	return menuItems;
});

const defaultCredentialTypeName = computed(() => {
	let defaultName = credentialTypeName.value;
	if (!defaultName || defaultName === 'null') {
		if (activeNodeType.value?.credentials && activeNodeType.value.credentials.length > 0) {
			defaultName = activeNodeType.value.credentials[0].name;
		}
	}
	return defaultName ?? '';
});

const showSaveButton = computed(() => {
	return (
		(props.mode === 'new' || hasUnsavedChanges.value || isSaved.value) &&
		(credentialPermissions.value.create ?? credentialPermissions.value.update)
	);
});

const showSharingContent = computed(() => activeTab.value === 'sharing' && !!credentialType.value);

const homeProject = computed(() => {
	const { currentProject, personalProject } = projectsStore;
	return currentProject ?? personalProject;
});

onMounted(async () => {
	requiredCredentials.value =
		isCredentialModalState(uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]) &&
		uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY].showAuthSelector === true;

	if (props.mode === 'new' && credentialTypeName.value) {
		credentialName.value = await credentialsStore.getNewCredentialName({
			credentialTypeName: defaultCredentialTypeName.value,
		});

		credentialData.value = {
			...credentialData.value,
			...(homeProject.value ? { homeProject: homeProject.value } : {}),
		};
	} else {
		await loadCurrentCredential();
	}

	if (credentialType.value) {
		for (const property of credentialType.value.properties) {
			if (
				!credentialData.value.hasOwnProperty(property.name) &&
				!credentialType.value.__overwrittenProperties?.includes(property.name)
			) {
				credentialData.value = {
					...credentialData.value,
					[property.name]: property.default as CredentialInformation,
				};
			}
		}
	}

	await externalHooks.run('credentialsEdit.credentialModalOpened', {
		credentialType: credentialTypeName.value,
		isEditingCredential: props.mode === 'edit',
		activeNode: ndvStore.activeNode,
	});

	setTimeout(async () => {
		if (credentialId.value) {
			if (!requiredPropertiesFilled.value && credentialPermissions.value.update) {
				// sharees can't see properties, so this check would always fail for them
				// if the credential contains required fields.
				showValidationWarning.value = true;
			} else {
				await retestCredential();
			}
		}
	}, 0);

	loading.value = false;
});

async function beforeClose() {
	let keepEditing = false;

	if (hasUnsavedChanges.value) {
		const displayName = credentialType.value ? credentialType.value.displayName : '';
		const confirmAction = await message.confirm(
			i18n.baseText('credentialEdit.credentialEdit.confirmMessage.beforeClose1.message', {
				interpolate: { credentialDisplayName: displayName },
			}),
			i18n.baseText('credentialEdit.credentialEdit.confirmMessage.beforeClose1.headline'),
			{
				cancelButtonText: i18n.baseText(
					'credentialEdit.credentialEdit.confirmMessage.beforeClose1.cancelButtonText',
				),
				confirmButtonText: i18n.baseText(
					'credentialEdit.credentialEdit.confirmMessage.beforeClose1.confirmButtonText',
				),
			},
		);
		keepEditing = confirmAction === MODAL_CONFIRM;
	} else if (credentialPermissions.value.update && isOAuthType.value && !isOAuthConnected.value) {
		const confirmAction = await message.confirm(
			i18n.baseText('credentialEdit.credentialEdit.confirmMessage.beforeClose2.message'),
			i18n.baseText('credentialEdit.credentialEdit.confirmMessage.beforeClose2.headline'),
			{
				cancelButtonText: i18n.baseText(
					'credentialEdit.credentialEdit.confirmMessage.beforeClose2.cancelButtonText',
				),
				confirmButtonText: i18n.baseText(
					'credentialEdit.credentialEdit.confirmMessage.beforeClose2.confirmButtonText',
				),
			},
		);
		keepEditing = confirmAction === MODAL_CONFIRM;
	}

	if (!keepEditing) {
		uiStore.activeCredentialType = null;
		return true;
	} else if (!requiredPropertiesFilled.value) {
		showValidationWarning.value = true;
		scrollToTop();
	} else if (isOAuthType.value) {
		scrollToBottom();
	}

	return false;
}

function displayCredentialParameter(parameter: INodeProperties): boolean {
	if (parameter.type === 'hidden') {
		return false;
	}

	if (parameter.displayOptions?.hideOnCloud && settingsStore.isCloudDeployment) {
		return false;
	}

	if (parameter.displayOptions === undefined) {
		// If it is not defined no need to do a proper check
		return true;
	}

	return nodeHelpers.displayParameter(credentialData.value as INodeParameters, parameter, '', null);
}

function getCredentialProperties(name: string): INodeProperties[] {
	const credentialTypeData = credentialsStore.getCredentialTypeByName(name);

	if (!credentialTypeData) {
		return [];
	}

	if (credentialTypeData.extends === undefined) {
		return credentialTypeData.properties;
	}

	const combineProperties = [] as INodeProperties[];
	for (const credentialsTypeName of credentialTypeData.extends) {
		const mergeCredentialProperties = getCredentialProperties(credentialsTypeName);
		NodeHelpers.mergeNodeProperties(combineProperties, mergeCredentialProperties);
	}

	// The properties defined on the parent credentials take precedence
	NodeHelpers.mergeNodeProperties(combineProperties, credentialTypeData.properties);

	return combineProperties;
}

/**
 *
 * We might get credential with empty parameters from source-control
 * which breaks our types and Fe checks
 */
function removePropertiesWithEmptyStrings<T extends { [key: string]: unknown }>(data: T): T {
	const copy = structuredClone(data);
	Object.entries(copy).forEach(([key, value]) => {
		if (value === '') delete copy[key];
	});
	return copy;
}

async function loadCurrentCredential() {
	credentialId.value = props.activeId ?? '';

	try {
		const currentCredentials = await credentialsStore.getCredentialData({
			id: credentialId.value,
		});

		if (!currentCredentials) {
			throw new Error(
				i18n.baseText('credentialEdit.credentialEdit.couldNotFindCredentialWithId') +
					':' +
					credentialId.value,
			);
		}

		currentCredential.value = currentCredentials;

		credentialData.value = removePropertiesWithEmptyStrings(
			(currentCredentials.data as ICredentialDataDecryptedObject) || {},
		);

		if (currentCredentials.sharedWithProjects) {
			credentialData.value = {
				...credentialData.value,
				sharedWithProjects: currentCredentials.sharedWithProjects,
			};
		}
		if (currentCredentials.homeProject) {
			credentialData.value = {
				...credentialData.value,
				homeProject: currentCredentials.homeProject,
			};
		}

		credentialName.value = currentCredentials.name;
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('credentialEdit.credentialEdit.showError.loadCredential.title'),
		);
		closeDialog();

		return;
	}
}

function onTabSelect(tab: string) {
	activeTab.value = tab;
	const credType: string = credentialType.value ? credentialType.value.name : '';
	const activeNode: INode | null = ndvStore.activeNode;

	telemetry.track('User viewed credential tab', {
		credential_type: credType,
		node_type: activeNode ? activeNode.type : null,
		tab,
		workflow_id: workflowsStore.workflowId,
		credential_id: credentialId.value,
		sharing_enabled: EnterpriseEditionFeature.Sharing,
	});
}

function onChangeSharedWith(sharedWithProjects: ProjectSharingData[]) {
	credentialData.value = {
		...credentialData.value,
		sharedWithProjects,
	};
	isSharedWithChanged.value = true;
	hasUnsavedChanges.value = true;
}

function onDataChange({ name, value }: IUpdateInformation) {
	// skip update if new value matches the current
	if (credentialData.value[name] === value) return;

	hasUnsavedChanges.value = true;

	const { oauthTokenData, ...credData } = credentialData.value;

	credentialData.value = {
		...credData,
		[name]: value as CredentialInformation,
	};
}

function closeDialog() {
	modalBus.value.emit('close');
}

function getParentTypes(name: string): string[] {
	const type = credentialsStore.getCredentialTypeByName(name);

	if (type?.extends === undefined) {
		return [];
	}

	const types: string[] = [];
	for (const typeName of type.extends) {
		types.push(typeName);
		types.push.apply(types, getParentTypes(typeName));
	}

	return types;
}

function onNameEdit(text: string) {
	hasUnsavedChanges.value = true;
	hasUserSpecifiedName.value = true;
	credentialName.value = text;
}

function scrollToTop() {
	setTimeout(() => {
		if (contentRef.value) {
			contentRef.value.scrollTop = 0;
		}
	}, 0);
}

function scrollToBottom() {
	setTimeout(() => {
		if (contentRef.value) {
			contentRef.value.scrollTop = contentRef.value.scrollHeight;
		}
	}, 0);
}

async function retestCredential() {
	if (isEditingManagedCredential.value) {
		return;
	}

	if (!isCredentialTestable.value || !credentialTypeName.value) {
		authError.value = '';
		testedSuccessfully.value = false;

		return;
	}

	const { ownedBy, sharedWithProjects, ...otherCredData } = credentialData.value;
	const details: ICredentialsDecrypted = {
		id: credentialId.value,
		name: credentialName.value,
		type: credentialTypeName.value,
		data: otherCredData,
	};

	isRetesting.value = true;
	await testCredential(details);
	isRetesting.value = false;
}

async function testCredential(credentialDetails: ICredentialsDecrypted) {
	const result = await credentialsStore.testCredential(credentialDetails);
	if (result.status === 'Error') {
		authError.value = result.message;
		testedSuccessfully.value = false;
	} else {
		authError.value = '';
		testedSuccessfully.value = true;
	}

	scrollToTop();
}

function usesExternalSecrets(data: Record<string, unknown>): boolean {
	return Object.entries(data).some(
		([, value]) => typeof value !== 'object' && /=.*\{\{[^}]*\$secrets\.[^}]+}}.*/.test(`${value}`),
	);
}

async function saveCredential(): Promise<ICredentialsResponse | null> {
	if (!requiredPropertiesFilled.value) {
		showValidationWarning.value = true;
		scrollToTop();
	} else {
		showValidationWarning.value = false;
	}

	isSaving.value = true;

	// Save only the none default data
	assert(credentialType.value);
	const data = NodeHelpers.getNodeParameters(
		credentialType.value.properties,
		credentialData.value as INodeParameters,
		false,
		false,
		null,
		null,
	);

	assert(credentialTypeName.value);
	const credentialDetails: ICredentialsDecrypted = {
		id: credentialId.value,
		name: credentialName.value,
		type: credentialTypeName.value,
		data: data as unknown as ICredentialDataDecryptedObject,
	};

	if (
		settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing] &&
		credentialData.value.sharedWithProjects
	) {
		credentialDetails.sharedWithProjects = credentialData.value
			.sharedWithProjects as ProjectSharingData[];
	}

	if (credentialData.value.homeProject) {
		credentialDetails.homeProject = credentialData.value.homeProject as ProjectSharingData;
	}

	let credential: ICredentialsResponse | null = null;

	const isNewCredential = props.mode === 'new' && !credentialId.value;

	if (isNewCredential) {
		credential = await createCredential(credentialDetails, projectsStore.currentProject);
	} else {
		if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing]) {
			credentialDetails.sharedWithProjects = credentialData.value
				.sharedWithProjects as ProjectSharingData[];
		}

		credential = await updateCredential(credentialDetails);
	}

	isSaving.value = false;
	if (credential) {
		credentialId.value = credential.id;
		currentCredential.value = credential;

		if (isCredentialTestable.value) {
			isTesting.value = true;
			// Add the full data including defaults for testing
			credentialDetails.data = credentialData.value;

			credentialDetails.id = credentialId.value;

			await testCredential(credentialDetails);
			isTesting.value = false;
		} else {
			authError.value = '';
			testedSuccessfully.value = false;
		}

		const trackProperties: ITelemetryTrackProperties = {
			credential_type: credentialDetails.type,
			workflow_id: workflowsStore.workflowId,
			credential_id: credential.id,
			is_complete: !!requiredPropertiesFilled.value,
			is_new: isNewCredential,
			uses_external_secrets: usesExternalSecrets(credentialDetails.data ?? {}),
		};

		if (isOAuthType.value) {
			trackProperties.is_valid = !!isOAuthConnected.value;
		} else if (isCredentialTestable.value) {
			trackProperties.is_valid = !!testedSuccessfully.value;
		}

		if (ndvStore.activeNode) {
			trackProperties.node_type = ndvStore.activeNode.type;
		}

		if (authError.value && authError.value !== '') {
			trackProperties.authError = authError.value;
		}

		/**
		 * For non-OAuth credentials we track saving on clicking the `Save` button, but for
		 * OAuth credentials we track saving at the end of the flow (BroastcastChannel event)
		 * so that the `is_valid` property is correct.
		 */
		if (!isOAuthType.value) {
			telemetry.track('User saved credentials', trackProperties);
		}

		await externalHooks.run('credentialEdit.saveCredential', trackProperties);
	}

	return credential;
}

const createToastMessagingForNewCredentials = (project?: Project | null) => {
	let toastTitle = i18n.baseText('credentials.create.personal.toast.title');
	let toastText = '';

	if (
		projectsStore.currentProject &&
		projectsStore.currentProject.id !== projectsStore.personalProject?.id
	) {
		toastTitle = i18n.baseText('credentials.create.project.toast.title', {
			interpolate: { projectName: project?.name ?? '' },
		});

		toastText = i18n.baseText('credentials.create.project.toast.text', {
			interpolate: { projectName: project?.name ?? '' },
		});
	}

	return {
		title: toastTitle,
		message: toastText,
	};
};

async function createCredential(
	credentialDetails: ICredentialsDecrypted,
	project?: Project | null,
): Promise<ICredentialsResponse | null> {
	let credential;

	try {
		credential = await credentialsStore.createNewCredential(
			credentialDetails,
			project?.id,
			router.currentRoute.value.query.uiContext?.toString(),
		);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { uiContext, ...rest } = router.currentRoute.value.query;
		void router.replace({ query: rest });

		hasUnsavedChanges.value = false;

		const { title, message } = createToastMessagingForNewCredentials(project);

		toast.showMessage({
			title,
			message,
			type: 'success',
		});
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('credentialEdit.credentialEdit.showError.createCredential.title'),
		);

		return null;
	}

	await externalHooks.run('credential.saved', {
		credential_type: credentialDetails.type,
		credential_id: credential.id,
		is_new: true,
	});

	telemetry.track('User created credentials', {
		credential_type: credentialDetails.type,
		credential_id: credential.id,
		workflow_id: workflowsStore.workflowId,
	});

	return credential;
}

async function updateCredential(
	credentialDetails: ICredentialsDecrypted,
): Promise<ICredentialsResponse | null> {
	let credential: ICredentialsResponse | null = null;
	try {
		if (credentialPermissions.value.update) {
			credential = await credentialsStore.updateCredential({
				id: credentialId.value,
				data: credentialDetails,
			});
		}
		if (
			credentialPermissions.value.share &&
			isSharedWithChanged.value &&
			credentialDetails.sharedWithProjects
		) {
			credential = await credentialsStore.setCredentialSharedWith({
				credentialId: credentialDetails.id,
				sharedWithProjects: credentialDetails.sharedWithProjects,
			});
			isSharedWithChanged.value = false;
		}
		hasUnsavedChanges.value = false;
		isSaved.value = true;

		if (credential) {
			await externalHooks.run('credential.saved', {
				credential_type: credentialDetails.type,
				credential_id: credential.id,
				is_new: false,
			});
		}
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('credentialEdit.credentialEdit.showError.updateCredential.title'),
		);

		return null;
	}

	// Now that the credentials changed check if any nodes use credentials
	// which have now a different name
	nodeHelpers.updateNodesCredentialsIssues();

	return credential;
}

async function deleteCredential() {
	if (!currentCredential.value) {
		return;
	}

	const savedCredentialName = currentCredential.value.name;

	const deleteConfirmed = await message.confirm(
		i18n.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.message', {
			interpolate: { savedCredentialName },
		}),
		i18n.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.headline'),
		{
			confirmButtonText: i18n.baseText(
				'credentialEdit.credentialEdit.confirmMessage.deleteCredential.confirmButtonText',
			),
		},
	);

	if (deleteConfirmed !== MODAL_CONFIRM) {
		return;
	}

	try {
		isDeleting.value = true;
		await credentialsStore.deleteCredential({ id: credentialId.value });
		hasUnsavedChanges.value = false;
		isSaved.value = true;
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('credentialEdit.credentialEdit.showError.deleteCredential.title'),
		);
		isDeleting.value = false;

		return;
	}

	isDeleting.value = false;
	// Now that the credentials were removed check if any nodes used them
	nodeHelpers.updateNodesCredentialsIssues();
	credentialData.value = {};

	toast.showMessage({
		title: i18n.baseText('credentialEdit.credentialEdit.showMessage.title'),
		type: 'success',
	});
	closeDialog();
}

async function oAuthCredentialAuthorize() {
	let url;

	const credential = await saveCredential();
	if (!credential) {
		return;
	}

	const types = parentTypes.value;

	try {
		const credData = { id: credential.id, ...credentialData.value };
		if (credentialTypeName.value === 'oAuth2Api' || types.includes('oAuth2Api')) {
			if (isValidCredentialResponse(credData)) {
				url = await credentialsStore.oAuth2Authorize(credData);
			}
		} else if (credentialTypeName.value === 'oAuth1Api' || types.includes('oAuth1Api')) {
			if (isValidCredentialResponse(credData)) {
				url = await credentialsStore.oAuth1Authorize(credData);
			}
		}
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('credentialEdit.credentialEdit.showError.generateAuthorizationUrl.title'),
			i18n.baseText('credentialEdit.credentialEdit.showError.generateAuthorizationUrl.message'),
		);

		return;
	}

	const params =
		'scrollbars=no,resizable=yes,status=no,titlebar=noe,location=no,toolbar=no,menubar=no,width=500,height=700';
	const oauthPopup = window.open(url, 'OAuth Authorization', params);

	credentialData.value = {
		...credentialData.value,
		oauthTokenData: null as unknown as CredentialInformation,
	};

	const oauthChannel = new BroadcastChannel('oauth-callback');
	const receiveMessage = (event: MessageEvent) => {
		const successfullyConnected = event.data === 'success';

		const trackProperties: ITelemetryTrackProperties = {
			credential_type: credentialTypeName.value,
			workflow_id: workflowsStore.workflowId,
			credential_id: credentialId.value,
			is_complete: !!requiredPropertiesFilled.value,
			is_new: props.mode === 'new' && !credentialId.value,
			is_valid: successfullyConnected,
			uses_external_secrets: usesExternalSecrets(credentialData.value),
		};

		if (ndvStore.activeNode) {
			trackProperties.node_type = ndvStore.activeNode.type;
		}

		telemetry.track('User saved credentials', trackProperties);

		if (successfullyConnected) {
			oauthChannel.removeEventListener('message', receiveMessage);

			// Set some kind of data that status changes.
			// As data does not get displayed directly it does not matter what data.
			credentialData.value = {
				...credentialData.value,
				oauthTokenData: {} as CredentialInformation,
			};

			// Close the window
			if (oauthPopup) {
				oauthPopup.close();
			}
		}
	};
	oauthChannel.addEventListener('message', receiveMessage);
}

async function onAuthTypeChanged(type: string): Promise<void> {
	if (!activeNodeType.value?.credentials) {
		return;
	}
	const credentialsForType = getNodeCredentialForSelectedAuthType(activeNodeType.value, type);
	if (credentialsForType) {
		selectedCredential.value = credentialsForType.name;
		uiStore.activeCredentialType = credentialsForType.name;
		resetCredentialData();
		// Update current node auth type so credentials dropdown can be displayed properly
		updateNodeAuthType(ndvStore.activeNode, type);
		// Also update credential name but only if the default name is still used
		if (hasUnsavedChanges.value && !hasUserSpecifiedName.value) {
			const newDefaultName = await credentialsStore.getNewCredentialName({
				credentialTypeName: defaultCredentialTypeName.value,
			});
			credentialName.value = newDefaultName;
		}
	}
}

function resetCredentialData(): void {
	if (!credentialType.value) {
		return;
	}
	for (const property of credentialType.value.properties) {
		if (!credentialType.value.__overwrittenProperties?.includes(property.name)) {
			credentialData.value = {
				...credentialData.value,
				[property.name]: property.default as CredentialInformation,
			};
		}
	}

	const { currentProject, personalProject } = projectsStore;
	const scopes = currentProject?.scopes ?? personalProject?.scopes ?? [];
	const homeProject = currentProject ?? personalProject ?? {};

	credentialData.value = {
		...credentialData.value,
		scopes: scopes as unknown as CredentialInformation,
		homeProject,
	};
}

const credNameRef = useTemplateRef('credNameRef');
const { width } = useElementSize(credNameRef);
</script>

<template>
	<Modal
		:name="modalName"
		:custom-class="$style.credentialModal"
		:event-bus="modalBus"
		:loading="loading"
		:before-close="beforeClose"
		width="70%"
		height="80%"
	>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.credInfo">
					<div :class="$style.credIcon">
						<CredentialIcon :credential-type-name="defaultCredentialTypeName" />
					</div>
					<div ref="credNameRef" :class="$style.credName">
						<N8nInlineTextEdit
							v-if="credentialName"
							data-test-id="credential-name"
							:model-value="credentialName"
							:max-width="width - 10"
							:readonly="
								!credentialPermissions.update || !credentialType || isEditingManagedCredential
							"
							@update:model-value="onNameEdit"
						/>
						<N8nText v-if="credentialType" size="small" tag="p" color="text-light">{{
							credentialType.displayName
						}}</N8nText>
					</div>
				</div>
				<div :class="$style.credActions">
					<n8n-icon-button
						v-if="currentCredential && credentialPermissions.delete"
						:title="i18n.baseText('credentialEdit.credentialEdit.delete')"
						icon="trash-2"
						type="tertiary"
						:disabled="isSaving"
						:loading="isDeleting"
						data-test-id="credential-delete-button"
						@click="deleteCredential"
					/>
					<SaveButton
						v-if="showSaveButton"
						:saved="!hasUnsavedChanges && !isTesting && !!credentialId"
						:is-saving="isSaving || isTesting"
						:saving-label="
							isTesting
								? i18n.baseText('credentialEdit.credentialEdit.testing')
								: i18n.baseText('credentialEdit.credentialEdit.saving')
						"
						data-test-id="credential-save-button"
						@click="saveCredential"
					/>
				</div>
			</div>
		</template>
		<template #content>
			<div :class="$style.container" data-test-id="credential-edit-dialog">
				<div v-if="!isEditingManagedCredential" :class="$style.sidebar">
					<n8n-menu
						mode="tabs"
						:items="sidebarItems"
						:transparent-background="true"
						@select="onTabSelect"
					></n8n-menu>
				</div>
				<div
					v-if="activeTab === 'connection' && credentialType"
					ref="contentRef"
					:class="$style.mainContent"
				>
					<CredentialConfig
						:credential-type="credentialType"
						:credential-properties="credentialProperties"
						:credential-data="credentialData"
						:credential-id="credentialId"
						:is-managed="isEditingManagedCredential"
						:show-validation-warning="showValidationWarning"
						:auth-error="authError"
						:tested-successfully="testedSuccessfully"
						:is-o-auth-type="isOAuthType"
						:is-o-auth-connected="isOAuthConnected"
						:is-retesting="isRetesting"
						:parent-types="parentTypes"
						:required-properties-filled="requiredPropertiesFilled"
						:credential-permissions="credentialPermissions"
						:all-o-auth2-base-properties-overridden="allOAuth2BasePropertiesOverridden"
						:mode="mode"
						:selected-credential="selectedCredential"
						:show-auth-type-selector="requiredCredentials"
						@update="onDataChange"
						@oauth="oAuthCredentialAuthorize"
						@retest="retestCredential"
						@scroll-to-top="scrollToTop"
						@auth-type-changed="onAuthTypeChanged"
					/>
				</div>
				<div v-else-if="showSharingContent" :class="$style.mainContent">
					<CredentialSharing
						:credential="currentCredential"
						:credential-data="credentialData"
						:credential-id="credentialId"
						:credential-permissions="credentialPermissions"
						:modal-bus="modalBus"
						@update:model-value="onChangeSharedWith"
					/>
				</div>
				<div v-else-if="activeTab === 'details' && credentialType" :class="$style.mainContent">
					<CredentialInfo :current-credential="currentCredential" />
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.credentialModal {
	--dialog-max-width: 1200px;
	--dialog-close-top: 31px;
	--dialog-max-height: 750px;

	:global(.el-dialog__header) {
		padding-bottom: 0;
		border-bottom: var(--border-base);
	}

	:global(.el-dialog__body) {
		padding-top: var(--spacing-l);
		position: relative;
	}
}

.mainContent {
	flex: 1;
	overflow: auto;
	padding-bottom: 100px;
}

.credName {
	display: flex;
	width: 100%;
	flex-direction: column;
	gap: var(--spacing-4xs);
}

.sidebar {
	max-width: 170px;
	min-width: 170px;
	margin-right: var(--spacing-l);
	flex-grow: 1;

	ul {
		padding: 0 !important;
	}
}

.header {
	display: flex;
}

.container {
	display: flex;
	height: 100%;
}

.credInfo {
	display: flex;
	align-items: center;
	flex-direction: row;
	flex-grow: 1;
	margin-bottom: var(--spacing-l);
}

.credActions {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-right: var(--spacing-xl);
	margin-bottom: var(--spacing-l);

	> * {
		margin-left: var(--spacing-2xs);
	}
}

.credIcon {
	display: flex;
	align-items: center;
	margin-right: var(--spacing-xs);
}
</style>
