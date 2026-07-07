<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';

import type { IUpdateInformation } from '@/Interface';
import type { ICredentialsResponse } from '../../credentials.types';

import type {
	CredentialInformation,
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	INode,
	INodeParameters,
	ITelemetryTrackProperties,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import CredentialIcon from '../CredentialIcon.vue';

import CredentialConfig from './CredentialConfig.vue';
import CredentialInfo from './CredentialInfo.vue';
import CredentialSharing from './CredentialSharing.ee.vue';
import Modal from '@/app/components/Modal.vue';
import SaveButton from '@/app/components/SaveButton.vue';
import { useMessage } from '@/app/composables/useMessage';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useToast } from '@/app/composables/useToast';
import { CREDENTIAL_EDIT_MODAL_KEY } from '../../credentials.constants';
import { EnterpriseEditionFeature, MODAL_CONFIRM } from '@/app/constants';
import { useCredentialsStore } from '../../credentials.store';
import { getTrustedOAuthOrigins, parseOAuthCallbackMessage } from '../../composables/oauthCallback';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { provideWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { Project, ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { assert } from '@n8n/utils/assert';
import { createEventBus } from '@n8n/utils/event-bus';

import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useExternalSecretsStore } from '@/features/integrations/externalSecrets.ee/externalSecrets.ee.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { sendUserEvent, type DynamicNotification } from '@n8n/rest-api-client/api/cloudPlans';
import {
	getAppNameFromCredType,
	getNodeCredentialForSelectedAuthType,
	updateNodeAuthType,
} from '@/app/utils/nodeTypesUtils';
import { isCredentialModalState, isValidCredentialResponse } from '@/app/utils/typeGuards';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useElementSize } from '@vueuse/core';
import { useRouter } from 'vue-router';

import {
	N8nIconButton,
	N8nInlineTextEdit,
	N8nMenuItem,
	N8nText,
	type IMenuItem,
} from '@n8n/design-system';
import { usePrivateCredentials } from '@/features/resolvers/composables/usePrivateCredentials';
import PrivateCredentialIcon from '@/features/resolvers/components/PrivateCredentialIcon.vue';
import TypeToConfirmDialog from './TypeToConfirmDialog.vue';
import { useQuickConnect } from '../../quickConnect/composables/useQuickConnect';
import { useCredentialForm } from '../../composables/useCredentialForm';
import type { CredentialModeOption } from './CredentialModeSelector.vue';

type Props = {
	modalName: string;
	activeId?: string;
	mode?: 'new' | 'edit';
};

const props = withDefaults(defineProps<Props>(), { mode: 'new', activeId: undefined });

const credentialsStore = useCredentialsStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const externalSecretsStore = useExternalSecretsStore();

const nodeHelpers = useNodeHelpers();
const externalHooks = useExternalHooks();
const toast = useToast();
const message = useMessage();
const i18n = useI18n();

const I18N_PREFIX = 'credentialEdit.credentialEdit.confirmMessage';

async function confirmModal(
	key: string,
	interpolate?: Record<string, string>,
	extra?: { cancelButtonText?: string },
): Promise<string | boolean> {
	const t = (suffix: string) =>
		i18n.baseText(
			`${I18N_PREFIX}.${key}.${suffix}` as BaseTextKey,
			interpolate ? { interpolate } : {},
		);

	const cancelButton =
		extra?.cancelButtonText !== undefined ? { cancelButtonText: extra.cancelButtonText } : {};

	return await message.confirm(t('message'), t('headline'), {
		confirmButtonText: i18n.baseText(`${I18N_PREFIX}.${key}.confirmButtonText` as BaseTextKey),
		...cancelButton,
	});
}

// Type-to-confirm dialog state for destructive end-user credential actions
// (deleting or switching to Fixed while other people are connected).
const typeToConfirmDialog = ref<{
	open: boolean;
	title: string;
	message: string;
	confirmLabel: string;
	keyword: string;
} | null>(null);
let typeToConfirmResolve: ((confirmed: boolean) => void) | null = null;

async function openTypeToConfirm(opts: {
	title: string;
	message: string;
	confirmLabel: string;
	keyword: string;
}): Promise<boolean> {
	return await new Promise<boolean>((resolve) => {
		typeToConfirmResolve = resolve;
		typeToConfirmDialog.value = { open: true, ...opts };
	});
}

function resolveTypeToConfirm(confirmed: boolean): void {
	if (typeToConfirmDialog.value) typeToConfirmDialog.value.open = false;
	typeToConfirmResolve?.(confirmed);
	typeToConfirmResolve = null;
}

// Renders "1 person" / "N people" for the connected-user count in dialog copy.
function connectedPeopleText(count: number): string {
	return i18n.baseText('credentialEdit.credentialEdit.confirmMessage.connectedPeople', {
		adjustToNumber: count,
		interpolate: { count },
	});
}
const telemetry = useTelemetry();
const router = useRouter();
const rootStore = useRootStore();
const { isEnabled: isPrivateCredentialsEnabled } = usePrivateCredentials();
const { getQuickConnectOption, connect: quickConnect } = useQuickConnect();
const isQuickConnectMode = ref(false);
const activeTab = ref('connection');
const modalBus = ref(createEventBus());
const isDeleting = ref(false);
const hasUnsavedChanges = ref(false);
const isSaved = ref(false);
const loading = ref(false);
const hasUserSpecifiedName = ref(false);
const isSharedWithChanged = ref(false);
const requiredCredentials = ref(false); // Are credentials required or optional for the node
const contentRef = ref<HTMLDivElement>();
const isSharedGlobally = ref(false);
const pendingAuthType = ref<string | null>(null);
const credentialDataCache = ref<Record<string, ICredentialDataDecryptedObject>>({});

// The credential editor can open outside the workflow editor (e.g. the
// Credentials view), where no workflow document is provided. Re-provide the
// resolved document store so the reused NDV parameter components rendered below
// resolve a valid scoped store, and derive this modal's own NDV store from it
// (it cannot inject what it provides).
const workflowDocumentStore = provideWorkflowDocumentStore();
const ndvStore = computed(() => useNDVStore(workflowDocumentStore.value.documentId));

const contextNode = computed<INode | null>(() => {
	if (ndvStore.value.activeNode) return ndvStore.value.activeNode;
	const modalState = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
	if (isCredentialModalState(modalState) && modalState.contextNode) {
		return modalState.contextNode;
	}
	const fallbackName = isCredentialModalState(modalState) ? modalState.nodeName : undefined;
	return fallbackName ? (workflowDocumentStore.value?.getNodeByName(fallbackName) ?? null) : null;
});

const overrideProjectId = computed(() => {
	const modalState = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
	return isCredentialModalState(modalState) ? modalState.projectId : undefined;
});

const form = useCredentialForm({
	mode: () => props.mode,
	activeId: () => props.activeId,
	contextNode: () => contextNode.value,
	projectId: () => overrideProjectId.value,
	showAuthSelector: () => requiredCredentials.value,
	suggestedName: () => {
		const modalState = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
		return isCredentialModalState(modalState) ? modalState.suggestedName : undefined;
	},
	// Scroll the auth-error/success banner into view after a test (parity with the
	// modal's former testCredential, which ended with scrollToTop).
	onTestComplete: scrollToTop,
});

const {
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
	activeNodeType,
	credentialTypeName,
	credentialType,
	parentTypes,
	isOAuthType,
	isOAuthConnected,
	managedOAuthAvailable,
	isEditingManagedCredential,
	isNewCredential,
	credentialProperties,
	requiredPropertiesFilled,
	isCredentialTestable,
	credentialPermissions,
	usesExternalSecrets,
	setCredentialPropertyDefaults,
	resetCredentialData,
	testCredential,
	retestCredential,
	initialize,
	getChangedSharedFields,
} = form;

const hideAskAssistant = computed<boolean>(() => {
	const modalState = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
	return isCredentialModalState(modalState) && modalState.hideAskAssistant === true;
});

// The host's Instance AI credential-help behavior, stashed in the modal state by
// whoever opened the modal (the editor capability or the credentials list).
const instanceAiCredentialHelp = computed(() => {
	const modalState = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
	return isCredentialModalState(modalState) ? modalState.instanceAiCredentialHelp : undefined;
});

const closeOnSave = computed<boolean>(() => {
	const modalState = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
	return isCredentialModalState(modalState) && modalState.closeOnSave === true;
});

const appendToBody = computed<boolean>(() => {
	const modalState = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
	return isCredentialModalState(modalState) && modalState.appendToBody === true;
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
	if (isQuickConnectMode.value) return false;
	const hasPermission = credentialPermissions.value.create ?? credentialPermissions.value.update;
	if (!hasPermission) return false;
	return true;
});

const showHeaderSaveButton = computed(
	() =>
		showSaveButton.value &&
		!!credentialType.value &&
		(activeTab.value === 'connection' || activeTab.value === 'sharing'),
);

const showSharingContent = computed(() => activeTab.value === 'sharing' && !!credentialType.value);

onMounted(async () => {
	// Inner try isolates optional secrets loading; outer try catches all other initialization failures.
	try {
		const modalState = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
		requiredCredentials.value =
			isCredentialModalState(modalState) && modalState.showAuthSelector === true;

		const forceManual = isCredentialModalState(modalState) && modalState.forceManualMode === true;

		const overrideProjectId = isCredentialModalState(modalState) ? modalState.projectId : undefined;
		const projectId =
			overrideProjectId ?? projectsStore.currentProjectId ?? projectsStore.personalProject?.id;
		if (projectId) {
			try {
				await externalSecretsStore.fetchSecretsForProject(projectId);
			} catch {
				// Secrets fetch failure should not block the credential modal
			}
		}

		try {
			// Name + defaults (new) or load + custom-OAuth detect (edit) — the same
			// core the inline surfaces use.
			await initialize();
		} catch (error) {
			// Edit-mode load failed: surface it and bail out of the modal.
			if (props.mode === 'edit') {
				toast.showError(
					error,
					i18n.baseText('credentialEdit.credentialEdit.showError.loadCredential.title'),
				);
				closeDialog();
			}
			throw error;
		}

		// Sharing "global" state is modal-only, derived from the loaded credential.
		if (props.mode === 'edit') {
			const cred = currentCredential.value;
			isSharedGlobally.value =
				!!cred && 'isGlobal' in cred && typeof cred.isGlobal === 'boolean' ? cred.isGlobal : false;
		}

		// Default to quick connect mode for new credentials when available and not forced to manual
		if (
			props.mode === 'new' &&
			!forceManual &&
			credentialTypeName.value &&
			ndvStore.value.activeNode
		) {
			const qcOption = getQuickConnectOption(
				credentialTypeName.value,
				ndvStore.value.activeNode.type,
			);
			if (qcOption) {
				isQuickConnectMode.value = true;
			}
		}

		// External hooks are fire-and-forget so slow or failing hooks cannot keep the modal loading.
		void externalHooks
			.run('credentialsEdit.credentialModalOpened', {
				credentialType: credentialTypeName.value,
				isEditingCredential: props.mode === 'edit',
				activeNode: ndvStore.value.activeNode,
			})
			.catch((error) => {
				console.error('[CredentialEdit] External hooks execution failed', error);
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
	} catch (error) {
		console.error('[CredentialEdit] Initialization error', error);
	} finally {
		loading.value = false;
	}
});

async function beforeClose() {
	let keepEditing = false;

	if (hasUnsavedChanges.value && !isNewCredential.value) {
		const displayName = credentialType.value ? credentialType.value.displayName : '';
		const confirmAction = await confirmModal(
			'beforeClose1',
			{ credentialDisplayName: displayName },
			{ cancelButtonText: i18n.baseText(`${I18N_PREFIX}.beforeClose1.cancelButtonText`) },
		);
		keepEditing = confirmAction === MODAL_CONFIRM;
	} else if (
		credentialPermissions.value.update &&
		isOAuthType.value &&
		!isOAuthConnected.value &&
		// Private credentials are only the reusable "blueprint" — connecting is a
		// per-user step done later, so we don't prompt to connect before closing.
		!isResolvable.value
	) {
		const confirmAction = await confirmModal('beforeClose2', undefined, {
			cancelButtonText: i18n.baseText(`${I18N_PREFIX}.beforeClose2.cancelButtonText`),
		});
		keepEditing = confirmAction === MODAL_CONFIRM;
	}

	if (!keepEditing) {
		pendingAuthType.value = null;
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

async function loadCurrentCredential(id = props.activeId ?? '') {
	try {
		await form.loadCurrentCredential(id);
		const cred = currentCredential.value;
		isSharedGlobally.value =
			!!cred && 'isGlobal' in cred && typeof cred.isGlobal === 'boolean' ? cred.isGlobal : false;
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('credentialEdit.credentialEdit.showError.loadCredential.title'),
		);
		closeDialog();
		throw error;
	}
}

function onTabSelect(tab: string) {
	activeTab.value = tab;
	const credType: string = credentialType.value ? credentialType.value.name : '';
	const activeNode: INode | null = ndvStore.value.activeNode;

	telemetry.track('User viewed credential tab', {
		credential_type: credType,
		node_type: activeNode ? activeNode.type : null,
		tab,
		workflow_id: workflowDocumentStore.value.workflowId,
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

function onShareWithAllUsersUpdate(shareWithAllUsers: boolean) {
	isSharedGlobally.value = shareWithAllUsers;
	hasUnsavedChanges.value = true;
}

function getCurrentModeCacheKey(): string {
	const base = credentialTypeName.value ?? '';
	if (isOAuthType.value) {
		return `${base}:${useCustomOAuth.value ? 'custom' : 'managed'}`;
	}
	return base;
}

function cacheCurrentData(): void {
	const key = getCurrentModeCacheKey();
	if (!key) return;

	credentialDataCache.value[key] = { ...credentialData.value };
}

function restoreOrReset(): void {
	const cached = credentialDataCache.value[getCurrentModeCacheKey()];
	if (cached) {
		credentialData.value = { ...cached };
	} else {
		resetCredentialData();
	}
}

async function onResolvableChange(value: boolean) {
	const credName = credentialName.value;
	const isTogglingToPrivate = value && !isResolvable.value;
	const isTogglingToStatic = !value && isResolvable.value;

	if (isTogglingToPrivate && credentialData.value.oauthTokenData) {
		// Fixed → end-user: warn only when there is a shared token to lose
		const confirmAction = await confirmModal('switchToEndUser', { credentialName: credName });

		if (confirmAction !== MODAL_CONFIRM) {
			return;
		}
	} else if (isTogglingToStatic) {
		// End-user → Fixed: warn only when there are connected users to disconnect.
		// `connectedUserCount` reflects the server state at modal-open and isn't
		// refreshed when the current user connects within the same session, so fold
		// in `connectedByMe` to make sure the warning still appears in that case.
		const serverConnectedCount = currentCredential.value?.connectedUserCount ?? 0;
		const connectedUserCount = Math.max(serverConnectedCount, connectedByMe.value ? 1 : 0);
		if (connectedUserCount > 0) {
			const confirmed = await openTypeToConfirm({
				title: i18n.baseText(
					'credentialEdit.credentialEdit.confirmMessage.switchToFixed.headline',
					{
						interpolate: { credentialName: credName },
					},
				),
				message: i18n.baseText(
					'credentialEdit.credentialEdit.confirmMessage.switchToFixed.message',
					{
						interpolate: { people: connectedPeopleText(connectedUserCount) },
					},
				),
				confirmLabel: i18n.baseText(
					'credentialEdit.credentialEdit.confirmMessage.switchToFixed.confirmButtonText',
				),
				keyword: 'disconnect',
			});

			if (!confirmed) {
				return;
			}
		}
	}

	isResolvable.value = value;
	// Switching sharing mode invalidates any carried-over connection state: a
	// freshly-private credential has no per-user connection for the current
	// user yet, so reset it to avoid rendering a stale "connected" state with a
	// Disconnect button that has nothing to disconnect.
	connectedByMe.value = false;
	hasUnsavedChanges.value = true;
}

function onDataChange(update: IUpdateInformation) {
	if (form.onDataChange(update)) hasUnsavedChanges.value = true;
}

function closeDialog() {
	modalBus.value.emit('close');
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

async function saveCredential(): Promise<ICredentialsResponse | null> {
	if (!requiredPropertiesFilled.value) {
		showValidationWarning.value = true;
		scrollToTop();
		return null;
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
		isGlobal: isSharedGlobally.value,
		isResolvable: isResolvable.value,
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

	const appliedAuthType = pendingAuthType.value;
	if (appliedAuthType && contextNode.value) {
		updateNodeAuthType(
			workflowDocumentStore.value.updateNodeProperties,
			contextNode.value,
			appliedAuthType,
		);
		pendingAuthType.value = null;
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

		// Changing a private credential's shared (static) fields invalidates every
		// end user's connection, so warn before saving.
		const savedData = (data ?? {}) as unknown as ICredentialDataDecryptedObject;
		if (isResolvable.value && getChangedSharedFields(savedData).length) {
			const confirmAction = await confirmModal('sharedFieldsChanged', {
				credentialName: credentialName.value,
			});
			if (confirmAction !== MODAL_CONFIRM) {
				isSaving.value = false;
				return null;
			}
		}

		credential = await updateCredential(credentialDetails);
	}

	isSaving.value = false;
	if (credential) {
		credentialId.value = credential.id;
		currentCredential.value = credential;

		// Re-fetch to display server-redacted JSON shape for credentials with leaf-redacted fields
		if (credentialProperties.value.some((p) => p.typeOptions?.redactJsonLeaves)) {
			await loadCurrentCredential(credential.id);
			setCredentialPropertyDefaults();
		}

		if (isCredentialTestable.value) {
			isTesting.value = true;
			// Add the full data including defaults for testing
			credentialDetails.data = credentialData.value;

			credentialDetails.id = credentialId.value;

			await testCredential(credentialDetails);
			isTesting.value = false;

			if (testedSuccessfully.value && closeOnSave.value) {
				closeDialog();
			}
		} else {
			authError.value = '';
			testedSuccessfully.value = false;

			if (!isOAuthType.value && closeOnSave.value) {
				closeDialog();
			}
		}

		const trackProperties: ITelemetryTrackProperties = {
			credential_type: credentialDetails.type,
			workflow_id: workflowDocumentStore.value.workflowId,
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

		if (ndvStore.value.activeNode) {
			trackProperties.node_type = ndvStore.value.activeNode.type;
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
			void handleDynamicNotification(!!trackProperties.is_valid);
		}

		await externalHooks.run('credentialEdit.saveCredential', trackProperties);
	}

	return credential;
}

async function handleDynamicNotification(isValid: boolean) {
	if (!isValid || !settingsStore.isCloudDeployment) {
		return;
	}

	try {
		const response: DynamicNotification = await sendUserEvent(rootStore.restApiContext, {
			eventType: 'credential-saved',
			metadata: {
				credential_type: credentialTypeName.value,
			},
		});

		if (response.title && response.message) {
			setTimeout(async () => {
				try {
					await message.confirm(response.message, response.title, {
						confirmButtonText: i18n.baseText('generic.keepBuilding'),
						cancelButtonText: '',
						showCancelButton: false,
						closeOnClickModal: true,
						closeOnPressEscape: true,
					});
				} catch (error) {
					// Silently fail
				}
			}, 15000);
		}
	} catch (error) {
		// Silently fail
	}
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
		workflow_id: workflowDocumentStore.value.workflowId,
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

		// Only surface the "saved" toast when something was actually persisted
		// (update/share). Connect-only users have neither, so nothing was saved.
		if (credential) {
			toast.showMessage({
				title: i18n.baseText('credentials.update.toast.title'),
				type: 'success',
			});

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

	// Deleting an end-user credential that people are connected to tears down
	// everyone's connection, so it requires an explicit type-to-confirm step.
	const serverConnectedCount = currentCredential.value.connectedUserCount ?? 0;
	const connectedUserCount = Math.max(serverConnectedCount, connectedByMe.value ? 1 : 0);

	if (isResolvable.value && connectedUserCount > 0) {
		const confirmed = await openTypeToConfirm({
			title: i18n.baseText(
				'credentialEdit.credentialEdit.confirmMessage.deleteConnected.headline',
				{
					interpolate: { credentialName: savedCredentialName },
				},
			),
			message: i18n.baseText(
				'credentialEdit.credentialEdit.confirmMessage.deleteConnected.message',
				{
					interpolate: { people: connectedPeopleText(connectedUserCount) },
				},
			),
			confirmLabel: i18n.baseText(
				'credentialEdit.credentialEdit.confirmMessage.deleteConnected.confirmButtonText',
			),
			keyword: 'delete',
		});

		if (!confirmed) {
			return;
		}
	} else {
		const deleteConfirmed = await confirmModal('deleteCredential', { savedCredentialName });

		if (deleteConfirmed !== MODAL_CONFIRM) {
			return;
		}
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

	credentialsStore.pendingOAuthRefresh = true;

	// Editors persist any blueprint changes before connecting. Connect-only users
	// (e.g. on a private credential they can't edit) have nothing to save, so
	// connecting through saveCredential would be a no-op that returns null and
	// aborts the flow — connect to the stored credential directly instead.
	const canEditBlueprint = credentialPermissions.value.update || credentialPermissions.value.create;
	const credential = canEditBlueprint ? await saveCredential() : currentCredential.value;
	if (!credential) {
		return;
	}

	const types = parentTypes.value;

	try {
		// The authorization endpoints only need the credential id; the backend re-fetches the
		// stored credential by id. Sending more (homeProject, scopes, etc.) bloats the GET query
		// string and can exceed proxy header size limits.
		const credData = { id: credential.id };

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
			{
				message: i18n.baseText(
					'credentialEdit.credentialEdit.showError.generateAuthorizationUrl.message',
				),
			},
		);

		return;
	}

	if (url === undefined || url === '') {
		toast.showError(
			new Error(i18n.baseText('credentialEdit.credentialEdit.showError.invalidOAuthUrl.message')),
			i18n.baseText('credentialEdit.credentialEdit.showError.invalidOAuthUrl.title'),
		);
		return;
	}

	// Prevent javascript:, data:, vbscript: and other non-http(s) protocols (XSS)
	const allowedOAuthUrlProtocols = ['http:', 'https:'];
	try {
		const parsedUrl = new URL(url);
		if (!allowedOAuthUrlProtocols.includes(parsedUrl.protocol)) {
			toast.showError(
				new Error(i18n.baseText('credentialEdit.credentialEdit.showError.invalidOAuthUrl.message')),
				i18n.baseText('credentialEdit.credentialEdit.showError.invalidOAuthUrl.title'),
			);
			return;
		}
	} catch {
		toast.showError(
			new Error(i18n.baseText('credentialEdit.credentialEdit.showError.invalidOAuthUrl.message')),
			i18n.baseText('credentialEdit.credentialEdit.showError.invalidOAuthUrl.title'),
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
	const trustedOrigins = getTrustedOAuthOrigins(rootStore.urlBaseEditor);
	let oauthResultHandled = false;

	// Fallback: if the popup is closed (or blocked) without ever delivering a
	// callback message, no handler fires and the listeners below would leak —
	// and stack up across attempts, so a later callback triggers duplicate side
	// effects. Poll for the closed popup so the result is handled and cleaned up.
	const popupClosedPoll = setInterval(() => {
		if (!oauthPopup || oauthPopup.closed) {
			handleOAuthResult(false);
		}
	}, 500);

	const cleanupOAuthListeners = () => {
		oauthChannel.removeEventListener('message', onChannelMessage);
		window.removeEventListener('message', onWindowMessage);
		oauthChannel.close();
		clearInterval(popupClosedPoll);
	};

	const handleOAuthResult = (successfullyConnected: boolean) => {
		if (oauthResultHandled) return;

		oauthResultHandled = true;
		cleanupOAuthListeners();

		const trackProperties: ITelemetryTrackProperties = {
			credential_type: credentialTypeName.value,
			workflow_id: workflowDocumentStore.value.workflowId || null,
			credential_id: credentialId.value,
			is_complete: !!requiredPropertiesFilled.value,
			is_new: props.mode === 'new' && !credentialId.value,
			is_valid: successfullyConnected,
			uses_external_secrets: usesExternalSecrets(credentialData.value),
		};

		if (ndvStore.value.activeNode) {
			trackProperties.node_type = ndvStore.value.activeNode.type;
		}

		telemetry.track('User saved credentials', trackProperties);
		void handleDynamicNotification(successfullyConnected);

		if (successfullyConnected) {
			// Set some kind of data that status changes.
			// As data does not get displayed directly it does not matter what data.
			credentialData.value = {
				...credentialData.value,
				oauthTokenData: {} as CredentialInformation,
			};

			connectedByMe.value = true;

			void credentialsStore.fetchAllCredentials().then(() => {
				nodeHelpers.updateNodesCredentialsIssues();
			});

			// Close the window
			if (oauthPopup) {
				oauthPopup.close();
			}

			if (closeOnSave.value) {
				closeDialog();
			}
		}
	};

	function onChannelMessage(event: MessageEvent) {
		handleOAuthResult(event.data === 'success');
	}

	// Cross-origin embed fallback: the callback page also posts to the opener.
	function onWindowMessage(event: MessageEvent) {
		const result = parseOAuthCallbackMessage(event, trustedOrigins);
		if (result === null) return;
		handleOAuthResult(result === 'success');
	}

	oauthChannel.addEventListener('message', onChannelMessage);
	window.addEventListener('message', onWindowMessage);
}

async function onDisconnectMyConnection(): Promise<void> {
	if (!credentialId.value) return;

	const confirmed = await message.confirm(
		i18n.baseText('credentialEdit.credentialEdit.confirmMessage.disconnectCredential.message', {
			interpolate: { savedCredentialName: credentialName.value },
		}),
		i18n.baseText('credentialEdit.credentialEdit.confirmMessage.disconnectCredential.headline'),
		{
			confirmButtonText: i18n.baseText(
				'credentialEdit.credentialEdit.confirmMessage.disconnectCredential.confirmButtonText',
			),
		},
	);

	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await credentialsStore.disconnectMyConnection({ id: credentialId.value });
		connectedByMe.value = false;
		credentialData.value = {
			...credentialData.value,
			oauthTokenData: null as unknown as CredentialInformation,
		};
		toast.showMessage({
			title: i18n.baseText('credentialEdit.credentialEdit.showMessage.disconnected.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('credentialEdit.credentialEdit.showError.disconnectCredential.title'),
		);
	}
}

async function onAuthTypeChanged(payload: CredentialModeOption): Promise<void> {
	if (payload.quickConnectEnabled) {
		isQuickConnectMode.value = true;
		return;
	}

	isQuickConnectMode.value = false;
	cacheCurrentData();
	authError.value = '';
	useCustomOAuth.value = payload.customOauth ?? false;

	if (!activeNodeType.value?.credentials) {
		return;
	}
	const credentialsForType = getNodeCredentialForSelectedAuthType(
		activeNodeType.value,
		payload.type,
	);
	if (credentialsForType) {
		selectedCredential.value = credentialsForType.name;
		uiStore.activeCredentialType = credentialsForType.name;

		restoreOrReset();

		pendingAuthType.value = payload.type;
		// Also update credential name but only if the default name is still used
		if (hasUnsavedChanges.value && !hasUserSpecifiedName.value) {
			const newDefaultName = await credentialsStore.getNewCredentialName({
				credentialTypeName: defaultCredentialTypeName.value,
			});
			credentialName.value = newDefaultName;
		}
	}
}

async function onQuickConnect(): Promise<void> {
	if (!credentialTypeName.value || !ndvStore.value.activeNode) return;

	const serviceName = getAppNameFromCredType(credentialType.value?.displayName ?? '');

	const credential = await quickConnect({
		credentialTypeName: credentialTypeName.value,
		nodeType: ndvStore.value.activeNode.type,
		source: 'credential_type',
		serviceName,
	});

	if (credential) {
		// Created credential does not include data, so we need to load it
		await loadCurrentCredential(credential.id);
		setCredentialPropertyDefaults();

		isQuickConnectMode.value = false;
		testedSuccessfully.value = true;
	}
}

const credNameRef = useTemplateRef('credNameRef');
const { width } = useElementSize(credNameRef);
</script>

<template>
	<div>
		<Modal
			:name="modalName"
			:custom-class="$style.credentialModal"
			:event-bus="modalBus"
			:loading="loading"
			:before-close="beforeClose"
			width="70%"
			height="80%"
			:append-to-body="appendToBody"
		>
			<template #header>
				<div :class="$style.header">
					<div :class="$style.credInfo">
						<div :class="$style.credIcon">
							<CredentialIcon :credential-type-name="defaultCredentialTypeName" />
						</div>
						<div ref="credNameRef" :class="$style.credName">
							<div :class="$style.credNameRow">
								<N8nInlineTextEdit
									v-if="credentialName"
									data-test-id="credential-name"
									:model-value="credentialName"
									:max-width="width - 10"
									:readonly="
										!(
											(credentialPermissions.create && props.mode === 'new') ||
											credentialPermissions.update
										) ||
										!credentialType ||
										isEditingManagedCredential
									"
									@update:model-value="onNameEdit"
								/>
								<span
									v-if="isResolvable"
									:class="$style.dynamicTag"
									data-test-id="credential-dynamic-tag"
								>
									<PrivateCredentialIcon
										:tooltip-title="i18n.baseText('credentials.private.tooltipTitle')"
										:tooltip-text="i18n.baseText('credentials.private.tooltip')"
									/>
								</span>
							</div>
							<N8nText v-if="credentialType" size="small" tag="p" color="text-light">{{
								credentialType.displayName
							}}</N8nText>
						</div>
					</div>
					<div :class="$style.credActions">
						<SaveButton
							v-if="showHeaderSaveButton"
							:class="$style.saveButton"
							:disabled="
								(!isNewCredential && !hasUnsavedChanges && !isTesting) || !requiredPropertiesFilled
							"
							:variant="hasUnsavedChanges || isTesting ? 'solid' : 'subtle'"
							:is-saving="isSaving || isTesting"
							:saved="!isNewCredential && isSaved && !hasUnsavedChanges && !isTesting"
							:saving-label="
								isTesting
									? i18n.baseText('credentialEdit.credentialEdit.testing')
									: i18n.baseText('credentialEdit.credentialEdit.saving')
							"
							data-test-id="credential-save-button"
							@click="saveCredential"
						/>
						<N8nIconButton
							variant="subtle"
							v-if="currentCredential && credentialPermissions.delete"
							:title="i18n.baseText('credentialEdit.credentialEdit.delete')"
							icon="trash-2"
							:disabled="isSaving"
							:loading="isDeleting"
							data-test-id="credential-delete-button"
							@click="deleteCredential"
						/>
					</div>
				</div>
			</template>
			<template #content>
				<div :class="$style.container" data-test-id="credential-edit-dialog">
					<div v-if="!isEditingManagedCredential" :class="$style.sidebar">
						<N8nMenuItem
							v-for="item in sidebarItems"
							:key="item.id"
							:item="item"
							:active="activeTab === item.id"
							@click="() => onTabSelect(item.id)"
						/>
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
							:mode="mode"
							:selected-credential="selectedCredential"
							:is-private-credentials-enabled="isPrivateCredentialsEnabled"
							:is-resolvable="isResolvable"
							:connected-by-me="connectedByMe"
							:is-new-credential="isNewCredential"
							:managed-oauth-available="managedOAuthAvailable"
							:use-custom-oauth="useCustomOAuth"
							:is-quick-connect-mode="isQuickConnectMode"
							:context-node="contextNode"
							:hide-ask-assistant="hideAskAssistant"
							:instance-ai-credential-help="instanceAiCredentialHelp"
							@update="onDataChange"
							@oauth="oAuthCredentialAuthorize"
							@disconnect="onDisconnectMyConnection"
							@quick-connect="onQuickConnect"
							@retest="retestCredential"
							@scroll-to-top="scrollToTop"
							@auth-type-changed="onAuthTypeChanged"
							@claimed="closeDialog"
							@update:is-resolvable="onResolvableChange"
						/>
					</div>
					<div v-else-if="showSharingContent" :class="$style.mainContent">
						<CredentialSharing
							:credential="currentCredential"
							:credential-data="credentialData"
							:credential-id="credentialId"
							:credential-permissions="credentialPermissions"
							:is-shared-globally="isSharedGlobally"
							:modal-bus="modalBus"
							@update:model-value="onChangeSharedWith"
							@update:share-with-all-users="onShareWithAllUsersUpdate"
						/>
					</div>
					<div v-else-if="activeTab === 'details' && credentialType" :class="$style.mainContent">
						<CredentialInfo :current-credential="currentCredential" />
					</div>
				</div>
			</template>
		</Modal>
		<TypeToConfirmDialog
			v-if="typeToConfirmDialog"
			:open="typeToConfirmDialog.open"
			:title="typeToConfirmDialog.title"
			:message="typeToConfirmDialog.message"
			:confirm-label="typeToConfirmDialog.confirmLabel"
			:confirm-keyword="typeToConfirmDialog.keyword"
			:loading="isDeleting"
			@confirm="resolveTypeToConfirm(true)"
			@update:open="(open: boolean) => !open && resolveTypeToConfirm(false)"
		/>
	</div>
</template>

<style module lang="scss">
.credentialModal {
	--dialog--max-width: 1200px;
	--dialog--close--spacing--top: 36px;
	--dialog--max-height: 750px;

	:global(.el-dialog__header) {
		padding-bottom: 0;
		border-bottom: var(--border);
	}

	:global(.el-dialog__body) {
		padding-top: var(--spacing--lg);
		position: relative;
	}
}

.mainContent {
	flex: 1;
	overflow: auto;
	padding-bottom: var(--spacing--lg);
	padding-inline: var(--spacing--4xs);
}

.credName {
	display: flex;
	width: 100%;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.credNameRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--md);
}

.dynamicTag {
	display: inline-flex;
	align-items: center;
}

.sidebar {
	max-width: 170px;
	min-width: 170px;
	margin-right: var(--spacing--lg);
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
	margin-bottom: var(--spacing--lg);
}

.credActions {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-right: var(--spacing--xl);
	margin-bottom: var(--spacing--lg);
	flex-shrink: 0;
}

.credIcon {
	display: flex;
	align-items: center;
	margin-right: var(--spacing--xs);
}

.saveButton {
	flex-shrink: 0;
	min-width: 57px;
}
</style>
