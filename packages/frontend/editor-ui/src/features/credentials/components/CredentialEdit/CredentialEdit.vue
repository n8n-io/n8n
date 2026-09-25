<script setup lang="ts">
import { useCredentialDescriptionsExperiment } from '@/experiments/credentialDescriptions/useCredentialDescriptionsExperiment';
import { TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE } from '@/features/credentials/templatedAuth.utils';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

import type { IUpdateInformation, NewCredentialsModal } from '@/Interface';
import type {
	CredentialPayload,
	ICredentialsDecryptedResponse,
	ICredentialsResponse,
} from '../../credentials.types';

import type {
	CredentialInformation,
	ICredentialDataDecryptedObject,
	INode,
	INodeParameters,
	ITelemetryTrackProperties,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import CredentialIcon from '../CredentialIcon.vue';

import CredentialConfig from './CredentialConfig.vue';
import CredentialInfo from './CredentialInfo.vue';
import CredentialSharing from './CredentialSharing.ee.vue';
import SaveButton from '@/app/components/SaveButton.vue';
import { useMessage } from '@/app/composables/useMessage';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useToast } from '@n8n/composables/useToast';
import { CREDENTIAL_EDIT_MODAL_KEY } from '../../credentials.constants';
import { EnterpriseEditionFeature, MODAL_CONFIRM } from '@/app/constants';
import { useCredentialsStore } from '../../credentials.store';
import {
	getTrustedOAuthOrigins,
	hasOAuthTokenData,
	isOAuthTokenDataSet,
	waitForOAuthCallback,
} from '../../composables/oauthCallback';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { provideWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { assert } from '@n8n/utils/assert';
import { createEventBus } from '@n8n/utils/event-bus';

import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@n8n/composables/useTelemetry';
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
	N8nCallout,
	N8nButton,
	N8nDialog,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIconButton,
	N8nInlineTextEdit,
	N8nMenuItem,
	N8nSpinner,
	N8nText,
	type IMenuItem,
} from '@n8n/design-system';
import { usePrivateCredentials } from '@/features/resolvers/composables/usePrivateCredentials';
import PrivateCredentialIcon from '@/features/resolvers/components/PrivateCredentialIcon.vue';
import TypeToConfirmDialog from './TypeToConfirmDialog.vue';
import { useQuickConnect } from '../../quickConnect/composables/useQuickConnect';
import { useCredentialForm } from '../../composables/useCredentialForm';
import type { CredentialModeOption } from './CredentialModeSelector.vue';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';

type Props = {
	modalName: string;
	activeId?: string;
	mode?: 'new' | 'edit';
};

/** All a new credential needs of its owning project: where to save it, and what to call it in the toast. */
type CredentialHomeProject = { id: string; name?: string | null };

const { isEnabled: credentialDescriptionsEnabled } = useCredentialDescriptionsExperiment();

const props = withDefaults(defineProps<Props>(), { mode: 'new', activeId: undefined });

const credentialsStore = useCredentialsStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const externalSecretsStore = useExternalSecretsStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

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
const aiGateway = useAiGateway();
const aiGatewayStore = useAiGatewayStore();
const isQuickConnectMode = ref(false);
const activeTab = ref('connection');
const modalBus = ref(createEventBus());
const closing = ref(false);
const isDeleting = ref(false);
const hasUnsavedChanges = ref(false);
const credentialDescription = ref('');
const isSaved = ref(false);
const loading = ref(false);
const savedCredentialNeedsLoad = ref(false);
let closeAfterSave = false;
const hasUserSpecifiedName = ref(false);
const isSharedWithChanged = ref(false);
const requiredCredentials = ref(false); // Are credentials required or optional for the node
const contentRef = ref<HTMLDivElement>();
const isSharedGlobally = ref(false);
const pendingAuthType = ref<string | null>(null);
// Pending OAuth connect flow; aborted on re-click and on unmount so its
// listeners and backend polling don't outlive the modal.
const oauthFlowAbortController = ref<AbortController | null>(null);
let isUnmounted = false;
onBeforeUnmount(() => {
	isUnmounted = true;
	oauthFlowAbortController.value?.abort();
});
const credentialDataCache = ref<Record<string, ICredentialDataDecryptedObject>>({});

// The credential editor can open outside the workflow editor (e.g. the
// Credentials view), where no workflow document is provided. Re-provide the
// resolved document store so the reused NDV parameter components rendered below
// resolve a valid scoped store, and derive this modal's own NDV store from it
// (it cannot inject what it provides).
const workflowDocumentStore = provideWorkflowDocumentStore();
const ndvStore = computed(() => useNDVStore(workflowDocumentStore.value.documentId));

const modalOptions = computed<NewCredentialsModal | undefined>(() => {
	const state = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
	return isCredentialModalState(state) ? state : undefined;
});

// Telemetry workflow attribution: prefer the workflow passed by the surface that
// opened the modal (NDV, Instance AI setup card) — the resolved document store is
// empty when the modal opens outside a loaded workflow document.
const telemetryWorkflowId = computed(() => {
	const fromModal = modalOptions.value?.workflowId;
	return fromModal ?? workflowDocumentStore.value.workflowId;
});

const contextNode = computed<INode | null>(() => {
	if (modalOptions.value?.destination) return null;
	if (modalOptions.value?.contextNode) {
		return modalOptions.value.contextNode;
	}
	if (ndvStore.value.activeNode) return ndvStore.value.activeNode;
	const fallbackName = modalOptions.value?.nodeName;
	return fallbackName ? (workflowDocumentStore.value?.getNodeByName(fallbackName) ?? null) : null;
});

const workflowContextNode = computed(() => {
	const modalState = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
	if (!isCredentialModalState(modalState) || !modalState.contextNode) return null;
	return workflowDocumentStore.value.getNodeById(modalState.contextNode.id);
});

const overrideProjectId = computed(() => {
	return modalOptions.value?.projectId;
});

const form = useCredentialForm({
	mode: () => props.mode,
	activeId: () => props.activeId,
	contextNode: () => contextNode.value,
	projectId: () => overrideProjectId.value,
	destination: () => modalOptions.value?.destination,
	initialName: () => modalOptions.value?.initialName,
	initialData: () => modalOptions.value?.initialData,
	showAuthSelector: () => requiredCredentials.value,
	suggestedName: () => {
		return modalOptions.value?.suggestedName;
	},
	setupHint: () => {
		return modalOptions.value?.credentialSetupHint;
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
	connectedAccountIdentifier,
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
	homeProject,
	setCredentialPropertyDefaults,
	resetCredentialData,
	testCredential,
	retestCredential,
	initialize,
	getChangedSharedFields,
} = form;

watch(currentCredential, (credential) => {
	credentialDescription.value = credential?.description ?? '';
});

const canEditDescription = computed(
	() =>
		credentialDescriptionsEnabled.value &&
		!isEditingManagedCredential.value &&
		(isNewCredential.value
			? credentialPermissions.value.create
			: credentialPermissions.value.update),
);

const hideAskAssistant = computed<boolean>(() => {
	return modalOptions.value?.hideAskAssistant === true;
});

// The host's Instance AI credential-help behavior, stashed in the modal state by
// whoever opened the modal (the editor capability or the credentials list).
const instanceAiCredentialHelp = computed(() => {
	return modalOptions.value?.instanceAiCredentialHelp;
});

const closeOnSave = computed<boolean>(() => {
	return modalOptions.value?.closeOnSave === true;
});

const onCredentialCreated = computed<NewCredentialsModal['onCredentialCreated']>(() => {
	return modalOptions.value?.onCredentialCreated;
});

const presetUsageScope = computed<NewCredentialsModal['usageScope']>(() => {
	if (props.mode !== 'new') return undefined;
	return modalOptions.value?.usageScope;
});

const appendToBody = computed<boolean>(() => {
	return modalOptions.value?.appendToBody === true;
});

const isInstanceCredential = computed(
	() => presetUsageScope.value === 'instance' || currentCredential.value?.usageScope === 'instance',
);

const sidebarItems = computed(() => {
	const menuItems: IMenuItem[] = [
		{
			id: 'connection',
			label: i18n.baseText('credentialEdit.credentialEdit.connection'),
			position: 'top',
		},
		...(isInstanceCredential.value ||
		modalOptions.value?.destination ||
		(credentialDescriptionsEnabled.value && isEditingManagedCredential.value)
			? []
			: [
					{
						id: 'sharing',
						label: i18n.baseText('credentialEdit.credentialEdit.sharing'),
						position: 'top',
					} satisfies IMenuItem,
				]),
		...(credentialDescriptionsEnabled.value ||
		credentialTypeName.value !== TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE
			? [
					{
						id: 'details',
						label: i18n.baseText('credentialEdit.credentialEdit.details'),
						position: 'top',
					} satisfies IMenuItem,
				]
			: []),
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
	if (
		isQuickConnectMode.value ||
		(credentialDescriptionsEnabled.value && isEditingManagedCredential.value)
	)
		return false;
	const hasPermission = credentialPermissions.value.create ?? credentialPermissions.value.update;
	if (!hasPermission) return false;
	return true;
});

const showHeaderSaveButton = computed(
	() =>
		showSaveButton.value &&
		!!credentialType.value &&
		(credentialDescriptionsEnabled.value ||
			activeTab.value === 'connection' ||
			activeTab.value === 'sharing'),
);

const showSharingContent = computed(() => activeTab.value === 'sharing' && !!credentialType.value);

const showAiGatewayErrorNudge = computed(() => {
	const node = workflowContextNode.value;
	const type = credentialTypeName.value;
	const nodeType = activeNodeType.value;
	if (
		activeTab.value !== 'connection' ||
		!authError.value ||
		!node ||
		!type ||
		!nodeType ||
		!aiGateway.isEnabled.value ||
		aiGateway.balance.value === undefined ||
		aiGateway.balance.value <= 0
	) {
		return false;
	}
	if (!nodeType.credentials?.some((credential) => credential.name === type)) return false;
	if (node.credentials?.[type]?.id !== credentialId.value) return false;
	if (node.credentials?.[type]?.__aiGatewayManaged === true) return false;

	const resolvedParameters =
		NodeHelpers.getNodeParameters(
			nodeType.properties,
			node.parameters,
			true,
			false,
			node,
			nodeType,
		) ?? node.parameters;

	return aiGatewayStore.isNodeEligible(node, type, resolvedParameters);
});

let hasTrackedAiGatewayErrorNudge = false;
watch(showAiGatewayErrorNudge, (isVisible) => {
	const node = workflowContextNode.value;
	const type = credentialTypeName.value;
	if (!isVisible || hasTrackedAiGatewayErrorNudge || !node || !type) return;

	hasTrackedAiGatewayErrorNudge = true;
	telemetry.track(TELEMETRY_EVENT.CREDENTIALS.USER_VIEWED_GATEWAY_CREDITS_CREDENTIAL_ERROR_NUDGE, {
		credential_type: type,
		node_type: node.type,
		workflow_id: telemetryWorkflowId.value || undefined,
	});
});

onMounted(async () => {
	loading.value = !!modalOptions.value?.createCredential;
	void aiGateway.fetchConfig();
	void aiGateway.fetchWallet();

	// Inner try isolates optional secrets loading; outer try catches all other initialization failures.
	try {
		requiredCredentials.value = modalOptions.value?.showAuthSelector === true;

		const forceManual = modalOptions.value?.forceManualMode === true;

		const projectId = modalOptions.value?.destination
			? homeProject.value?.id
			: (modalOptions.value?.projectId ??
				projectsStore.currentProjectId ??
				projectsStore.personalProject?.id);
		if (projectId) {
			try {
				await externalSecretsStore.fetchSecretsForProject(projectId);
			} catch {
				// Secret lookup failures do not block the form.
			}
		}
		if (modalOptions.value?.createCredential) {
			await credentialsStore.fetchCredentialTypes(false);
			if (!credentialType.value) throw new Error(i18n.baseText('credentialEdit.typeUnavailable'));
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
		modalOptions.value?.onInitializeError?.(error);
	} finally {
		loading.value = false;
	}
});

// The missing-required-fields warning latches on open/save/close attempts;
// release it as soon as the form satisfies the requirements so the OAuth
// connect banner reappears without needing a save first.
watch(requiredPropertiesFilled, (filled) => {
	if (filled) {
		showValidationWarning.value = false;
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
		workflow_id: telemetryWorkflowId.value,
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
	// Switching sharing mode invalidates any carried-over connection state: `connectedByMe`
	// doesn't apply to the new mode, and `oauthTokenData` (mirrored true for a connected
	// end-user credential) would otherwise be read as "connected" once static.
	connectedByMe.value = false;
	connectedAccountIdentifier.value = undefined;
	credentialData.value = {
		...credentialData.value,
		oauthTokenData: null as unknown as CredentialInformation,
	};
	hasUnsavedChanges.value = true;
}

function onDataChange(update: IUpdateInformation) {
	if (form.onDataChange(update)) hasUnsavedChanges.value = true;
}

async function closeDialog() {
	// Close once the running save ends, so the save result is not lost.
	if (isSaving.value) {
		closeAfterSave = true;
		return;
	}
	if (closing.value) return;
	closing.value = true;
	try {
		if ((await beforeClose()) === false) return;
		uiStore.closeModal(props.modalName);
		modalBus.value.emit('closed');
	} finally {
		closing.value = false;
	}
}

function onDialogOpenUpdate(open: boolean) {
	// Keep the dialog open while a save runs.
	if (!open && !isSaving.value) void closeDialog();
}

async function useGatewayCredits(): Promise<void> {
	const node = workflowContextNode.value;
	const type = credentialTypeName.value;
	if (!node || !type || !showAiGatewayErrorNudge.value) return;
	const sourceWorkflowDocumentStore = workflowDocumentStore.value;
	const previousCredentials = { ...(node.credentials ?? {}) };
	const updateCredentials = (credentials: INode['credentials'], nodeName = node.name) => {
		sourceWorkflowDocumentStore.updateNodeProperties({
			name: nodeName,
			properties: { credentials },
		});
		nodeHelpers.updateNodesCredentialsIssues();
	};
	const getCurrentContextNode = () => {
		if (
			isUnmounted ||
			workflowDocumentStore.value !== sourceWorkflowDocumentStore ||
			credentialTypeName.value !== type
		) {
			return null;
		}
		const currentNode = workflowContextNode.value;
		return currentNode?.id === node.id ? currentNode : null;
	};

	updateCredentials({
		...previousCredentials,
		[type]: { id: null, name: '', __aiGatewayManaged: true },
	});
	if (!(await aiGateway.saveAfterToggle())) {
		const currentNode = getCurrentContextNode();
		if (currentNode) updateCredentials(previousCredentials, currentNode.name);
		return;
	}
	if (!getCurrentContextNode()) return;

	const workflowId = telemetryWorkflowId.value || undefined;
	telemetry.track('User toggled n8n connect credential', {
		credential_type: type,
		node_type: node.type,
		mode: 'n8n_connect',
		workflow_id: workflowId,
	});
	telemetry.track('Node credential assigned', {
		credential_type: type,
		node_type: node.type,
		workflow_id: workflowId,
		credential_id: null,
		credential_kind: 'n8n_connect',
		source: 'credential_error_nudge',
	});

	closeDialog();
	toast.showMessage({
		title: i18n.baseText('credentialEdit.credentialConfig.aiGatewayErrorNudge.toast.title'),
		type: 'success',
	});
}

function onNameEdit(text: string) {
	hasUnsavedChanges.value = true;
	hasUserSpecifiedName.value = true;
	credentialName.value = text;
}

function onDescriptionEdit(text: string) {
	if (!canEditDescription.value || text === credentialDescription.value) return;
	credentialDescription.value = text;
	hasUnsavedChanges.value = true;
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

async function retrySavedCredentialLoad() {
	if (isSaving.value) return;
	isSaving.value = true;
	try {
		await form.loadCurrentCredential(credentialId.value);
		setCredentialPropertyDefaults();
		savedCredentialNeedsLoad.value = false;
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('credentialEdit.credentialEdit.showError.loadCredential.title'),
		);
	} finally {
		isSaving.value = false;
	}
}

async function saveCredential(): Promise<
	ICredentialsResponse | ICredentialsDecryptedResponse | null
> {
	if (isSaving.value || loading.value || savedCredentialNeedsLoad.value || !credentialType.value)
		return null;
	if (
		!(credentialId.value
			? credentialPermissions.value.update || credentialPermissions.value.share
			: credentialPermissions.value.create)
	)
		return null;
	isSaving.value = true;
	try {
		return await persistCredential();
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('credentialEdit.credentialEdit.showError.createCredential.title'),
		);
		return null;
	} finally {
		isSaving.value = false;
		isTesting.value = false;
		if (closeAfterSave) {
			closeAfterSave = false;
			void closeDialog();
		}
	}
}

async function persistCredential(): Promise<
	ICredentialsResponse | ICredentialsDecryptedResponse | null
> {
	if (!requiredPropertiesFilled.value) {
		showValidationWarning.value = true;
		scrollToTop();
		return null;
	} else {
		showValidationWarning.value = false;
	}

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
	const savedData = (data ?? {}) as unknown as ICredentialDataDecryptedObject;

	assert(credentialTypeName.value);
	const credentialDetails: CredentialPayload = {
		id: credentialId.value,
		name: credentialName.value,
		...(canEditDescription.value ? { description: credentialDescription.value } : {}),
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

	let credential: ICredentialsResponse | ICredentialsDecryptedResponse | null = null;

	const isNewCredential = props.mode === 'new' && !credentialId.value;

	if (isNewCredential) {
		if (presetUsageScope.value) {
			credentialDetails.usageScope = presetUsageScope.value;
		}
		credential = await createCredential(credentialDetails, homeProject.value);
		if (credential) onCredentialCreated.value?.(credential);
	} else {
		if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing]) {
			credentialDetails.sharedWithProjects = credentialData.value
				.sharedWithProjects as ProjectSharingData[];
		}

		// Changing a private credential's shared (static) fields invalidates every
		// end user's connection, so warn before saving.
		if (isResolvable.value && getChangedSharedFields(savedData).length) {
			const confirmAction = await confirmModal('sharedFieldsChanged', {
				credentialName: credentialName.value,
			});
			if (confirmAction !== MODAL_CONFIRM) {
				return null;
			}
		}

		credential = await updateCredential(credentialDetails);
	}

	if (credential) {
		credentialId.value = credential.id;
		// The save response omits the encrypted `data` (see credentials.controller.ts),
		// but we know it now matches what we just persisted. Keep it as the baseline so
		// the next shared-field diff doesn't compare against an empty object and
		// false-trigger the "will disconnect everyone" prompt.
		const updatedCredential: ICredentialsDecryptedResponse = { ...credential, data: savedData };
		if (!modalOptions.value?.createCredential || !isNewCredential) {
			currentCredential.value = updatedCredential;
		}
		// Resync in case the save cleared this user's connection server-side.
		connectedByMe.value = credential.connectedByMe === true;

		// Re-fetch to display server-redacted JSON shape for credentials with leaf-redacted fields
		if (
			(!modalOptions.value?.createCredential || !isNewCredential) &&
			credentialProperties.value.some((p) => p.typeOptions?.redactJsonLeaves)
		) {
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
			workflow_id: telemetryWorkflowId.value,
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

const createToastMessagingForNewCredentials = (project?: CredentialHomeProject | null) => {
	let toastTitle = i18n.baseText('credentials.create.personal.toast.title');
	let toastText = '';

	if (project && project.id !== projectsStore.personalProject?.id) {
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
	credentialDetails: CredentialPayload,
	project?: CredentialHomeProject | null,
): Promise<ICredentialsResponse | ICredentialsDecryptedResponse | null> {
	let credential;

	try {
		const override = modalOptions.value?.createCredential;
		const destination = modalOptions.value?.destination;
		if (override && destination) {
			const projectId = destination.kind === 'resolved' ? destination.project.id : destination.id;
			credentialId.value = await override(credentialDetails, projectId);
			hasUnsavedChanges.value = false;
			savedCredentialNeedsLoad.value = true;
			try {
				await form.loadCurrentCredential(credentialId.value);
				setCredentialPropertyDefaults();
			} catch (error) {
				toast.showError(
					error,
					i18n.baseText('credentialEdit.credentialEdit.showError.loadCredential.title'),
				);
				return null;
			}
			savedCredentialNeedsLoad.value = false;
			credential = currentCredential.value;
			if (!credential) return null;
		} else {
			credential = await credentialsStore.createNewCredential(
				credentialDetails,
				project?.id,
				router.currentRoute.value.query.uiContext?.toString(),
			);
			credentialId.value = credential.id;
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { uiContext, ...rest } = router.currentRoute.value.query;
		void router.replace({ query: rest });

		hasUnsavedChanges.value = false;

		const { title, message } = createToastMessagingForNewCredentials(homeProject.value ?? project);

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
		workflow_id: telemetryWorkflowId.value,
	});

	return credential;
}

async function updateCredential(
	credentialDetails: CredentialPayload,
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
	if (isSaving.value || loading.value || savedCredentialNeedsLoad.value) return;
	let url;

	credentialsStore.pendingOAuthRefresh = true;

	// window.open must run within the click's transient user activation:
	// opening after the save/authorize round trips below gets the popup blocked
	// on slow connections (Chrome expires activation after ~5s) and in stricter
	// browsers (Safari) regardless of timing. Open a blank window now and
	// navigate it once the authorization URL is known.
	const params =
		'scrollbars=no,resizable=yes,status=no,titlebar=noe,location=no,toolbar=no,menubar=no,width=500,height=700';
	const oauthPopup = window.open('about:blank', 'OAuth Authorization', params);
	if (!oauthPopup) {
		toast.showError(
			new Error(i18n.baseText('credentialEdit.credentialEdit.showError.oauthPopupBlocked.message')),
			i18n.baseText('credentialEdit.credentialEdit.showError.oauthPopupBlocked.title'),
		);
		return;
	}

	// Editors persist any blueprint changes before connecting. Connect-only users
	// (e.g. on a private credential they can't edit) have nothing to save, so
	// connecting through saveCredential would be a no-op that returns null and
	// aborts the flow — connect to the stored credential directly instead.
	const canEditBlueprint = credentialPermissions.value.update || credentialPermissions.value.create;
	const credential = canEditBlueprint ? await saveCredential() : currentCredential.value;
	if (!credential) {
		oauthPopup.close();
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
		oauthPopup.close();
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
		oauthPopup.close();
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
			oauthPopup.close();
			toast.showError(
				new Error(i18n.baseText('credentialEdit.credentialEdit.showError.invalidOAuthUrl.message')),
				i18n.baseText('credentialEdit.credentialEdit.showError.invalidOAuthUrl.title'),
			);
			return;
		}
	} catch {
		oauthPopup.close();
		toast.showError(
			new Error(i18n.baseText('credentialEdit.credentialEdit.showError.invalidOAuthUrl.message')),
			i18n.baseText('credentialEdit.credentialEdit.showError.invalidOAuthUrl.title'),
		);
		return;
	}

	oauthPopup.location.href = url;

	// Token presence in credential data can only confirm the flow when there was
	// no token yet (a reconnect's old token would read as an immediate false
	// success) and only for fixed credentials — end-user (resolvable)
	// credentials store tokens per user outside the credential data.
	const canVerifyConnected = !credential.isResolvable && !isOAuthTokenDataSet(credentialData.value);

	credentialData.value = {
		...credentialData.value,
		oauthTokenData: null as unknown as CredentialInformation,
	};

	const handleOAuthResult = (successfullyConnected: boolean) => {
		const trackProperties: ITelemetryTrackProperties = {
			credential_type: credentialTypeName.value,
			workflow_id: telemetryWorkflowId.value || null,
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

			void credentialsStore.fetchAllCredentials().then((credentials) => {
				nodeHelpers.updateNodesCredentialsIssues();
				// The account just connected is only known server-side, so pick it up
				// from the refresh rather than guessing at who the user is. Read this
				// request's own response, not the store: any other credentials fetch
				// that resolves later replaces the whole store map with its own view.
				connectedAccountIdentifier.value = credentials.find(
					(credential) => credential.id === credentialId.value,
				)?.connectedAccountIdentifier;
			});

			// Close the window
			oauthPopup.close();

			if (closeOnSave.value) {
				closeDialog();
			}
		}
	};

	// Supersede any previous pending flow so a re-click doesn't leave a second
	// set of listeners alive; unmounting the modal aborts too (onBeforeUnmount).
	oauthFlowAbortController.value?.abort();
	const abortController = new AbortController();
	// Close the popup on teardown/supersession so it isn't left orphaned.
	// No-op when the provider's COOP policy severed the opener relationship.
	abortController.signal.addEventListener('abort', () => oauthPopup.close(), { once: true });
	oauthFlowAbortController.value = abortController;

	const outcome = await waitForOAuthCallback({
		popup: oauthPopup,
		trustedOrigins: getTrustedOAuthOrigins(rootStore.urlBaseEditor),
		signal: abortController.signal,
		verifyConnected: canVerifyConnected
			? async () =>
					hasOAuthTokenData(await credentialsStore.getCredentialData({ id: credential.id }))
			: undefined,
	});

	// A superseded or unmounted flow must not report a result: its telemetry
	// and UI side effects would describe a flow the user is no longer running.
	if (outcome === 'aborted') return;

	handleOAuthResult(outcome === 'success');
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
		// End-user creds clear the caller's own per-user connection; fixed creds
		// clear the shared OAuth token stored on the credential itself.
		if (isResolvable.value) {
			await credentialsStore.disconnectMyConnection({ id: credentialId.value });
			connectedByMe.value = false;
		} else {
			await credentialsStore.disconnectOauthToken({ id: credentialId.value });
		}
		connectedAccountIdentifier.value = undefined;
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

		// A freshly selected auth mode has no confirmed connection yet — without this,
		// stale `oauthTokenData`/`connectedByMe` restored from a mode cached earlier in
		// this session (or carried over from the loaded credential) makes the banner
		// misreport "connected" for a mode that was never actually saved.
		connectedByMe.value = false;
		connectedAccountIdentifier.value = undefined;
		credentialData.value = {
			...credentialData.value,
			oauthTokenData: null as unknown as CredentialInformation,
		};

		pendingAuthType.value = payload.type;
		hasUnsavedChanges.value = true;
		// Also update credential name but only if the default name is still used
		if (!hasUserSpecifiedName.value) {
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
		...(canEditDescription.value ? { description: credentialDescription.value } : {}),
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
		<N8nDialog
			:open="modalOpen"
			size="fit"
			:stacked="appendToBody"
			:aria-label="loading ? i18n.baseText('credentials.heading') : undefined"
			@update:open="onDialogOpenUpdate"
		>
			<div :class="$style.credentialDialog" data-test-id="editCredential-modal">
				<template v-if="!loading">
					<N8nDialogHeader :class="$style.header">
						<N8nDialogTitle as-child>
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
						</N8nDialogTitle>
						<div :class="$style.credActions">
							<SaveButton
								v-if="showHeaderSaveButton"
								:class="$style.saveButton"
								:disabled="
									isSaving ||
									savedCredentialNeedsLoad ||
									(!isNewCredential && !hasUnsavedChanges && !isTesting) ||
									!requiredPropertiesFilled
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
								v-if="
									currentCredential &&
									!modalOptions?.destination &&
									credentialPermissions.delete &&
									(!isResolvable || credentialPermissions.createEndUser)
								"
								:title="i18n.baseText('credentialEdit.credentialEdit.delete')"
								icon="trash-2"
								:disabled="isSaving"
								:loading="isDeleting"
								data-test-id="credential-delete-button"
								@click="deleteCredential"
							/>
						</div>
					</N8nDialogHeader>
					<div :class="$style.container" data-test-id="credential-edit-dialog">
						<div
							v-if="credentialDescriptionsEnabled || !isEditingManagedCredential"
							:class="$style.sidebar"
						>
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
							<N8nText v-if="modalOptions?.destination" tag="p">
								{{
									homeProject?.name ??
									(modalOptions.destination.kind === 'pending' ? modalOptions.destination.name : '')
								}}
							</N8nText>
							<N8nCallout v-if="modalOptions?.notice" theme="info">{{
								modalOptions.notice()
							}}</N8nCallout>
							<N8nCallout v-if="savedCredentialNeedsLoad" theme="warning">
								{{ i18n.baseText('credentialEdit.savedLoadFailed') }}
								<template #actions>
									<N8nButton :disabled="isSaving" @click="retrySavedCredentialLoad">
										{{ i18n.baseText('generic.retry') }}
									</N8nButton>
								</template>
							</N8nCallout>
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
								:is-private-credentials-enabled="
									isPrivateCredentialsEnabled && !isInstanceCredential && !modalOptions?.destination
								"
								:is-resolvable="isResolvable"
								:connected-by-me="connectedByMe"
								:connected-account-identifier="connectedAccountIdentifier"
								:is-new-credential="isNewCredential"
								:new-credential-project-type="homeProject?.type"
								:managed-oauth-available="managedOAuthAvailable"
								:use-custom-oauth="useCustomOAuth"
								:is-quick-connect-mode="isQuickConnectMode"
								:context-node="contextNode"
								:show-ai-gateway-error-nudge="showAiGatewayErrorNudge"
								:ai-gateway-credits-are-free="
									aiGateway.creditsLabelKey.value === 'generic.freeCredits'
								"
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
								@use-gateway-credits="useGatewayCredits"
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
							<CredentialInfo
								:current-credential="currentCredential"
								:description="credentialDescription"
								:readonly="!canEditDescription"
								@update:description="onDescriptionEdit"
							/>
						</div>
					</div>
				</template>
				<div v-else :class="$style.loader">
					<N8nSpinner />
				</div>
			</div>
		</N8nDialog>
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
.credentialDialog {
	width: min(70dvw, calc(var(--spacing--5xl) * 4 + var(--spacing--4xl) + var(--spacing--2xl)));
	height: 80dvh;
	max-height: calc(var(--height--5xl) * 8);
	min-height: 0;
	display: flex;
	flex-direction: column;
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
	flex-direction: row;
	align-items: center;
	flex-shrink: 0;
	margin: calc(var(--spacing--lg) * -1) calc(var(--spacing--lg) * -1) 0;
	padding: var(--spacing--md) var(--spacing--lg);
	border-bottom: var(--border);
}

.container {
	display: flex;
	flex: 1;
	min-height: 0;
	padding-top: var(--spacing--lg);
}

.credInfo {
	display: flex;
	align-items: center;
	flex-direction: row;
	flex-grow: 1;
}

.credActions {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-right: var(--spacing--xl);
	flex-shrink: 0;
}

.loader {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
	color: var(--color--primary--tint-1);
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

@media (max-width: 640px) {
	.credentialDialog {
		width: calc(100dvw - var(--spacing--3xl));
	}

	.sidebar {
		min-width: calc(var(--spacing--5xl) + var(--spacing--2xl));
		max-width: calc(var(--spacing--5xl) + var(--spacing--2xl));
		margin-right: var(--spacing--sm);
	}
}
</style>
