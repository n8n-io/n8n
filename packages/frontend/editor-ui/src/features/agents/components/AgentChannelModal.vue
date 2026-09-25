<script setup lang="ts">
import type { AgentApproval } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, onUnmounted, ref, watch } from 'vue';

import {
	agentChannelPlatforms,
	createAgentChannelRuntime,
	getAgentChannelPlatform,
} from '../channels/registry';
import type {
	AgentChannelRuntime,
	AgentChannelView,
	AgentChannelViewExpose,
} from '../channels/types';
import { useAgentChannelSetup } from '../composables/useAgentChannelSetup';
import { useAgentIntegrationStatus } from '../composables/useAgentIntegrationStatus';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import AgentChannelApprovalSetting from './AgentChannelApprovalSetting.vue';
import AgentChannelListItem from './AgentChannelListItem.vue';
import AgentModalMultiStep from './modals/AgentModalMultiStep.vue';

export type ChannelView = AgentChannelView;

interface Props {
	open: boolean;
	agentId: string;
	projectId: string;
	view: ChannelView;
	isPublished?: boolean;
	simpleSetup?: boolean;
	ensureAgentPersisted?: () => Promise<void>;
}

const props = withDefaults(defineProps<Props>(), {
	isPublished: false,
	simpleSetup: false,
	ensureAgentPersisted: undefined,
});

const emit = defineEmits<{
	'update:open': [value: boolean];
	'update:view': [view: ChannelView];
	'channel-connected': [channelType: string];
	'channel-disconnected': [channelType: string];
	'agent-changed': [];
}>();

const i18n = useI18n();
const toast = useToast();
const agentTelemetry = useAgentTelemetry();
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
const {
	fetchStatus,
	connectedCredentials,
	integrationSettings,
	integrationApproval,
	loadingMap,
	errorMessages,
	errorIsConflict,
	runtimeErrors,
	isConnected: isIntegrationConnected,
	isConfigured: isIntegrationConfigured,
	hasRuntimeError,
	connect,
	disconnect,
	clearError: clearIntegrationError,
} = useAgentIntegrationStatus(props.projectId, props.agentId);

const currentView = ref<ChannelView>(props.view);
const openedFromList = ref(props.view === 'list');
const viewSession = ref(0);
const credentialIdAtEditOpen = ref('');
const channelActionInFlight = ref(false);
const saveAttempted = ref(false);
const pendingDisconnect = ref<{
	channelType: string;
	credentialId: string;
	closeAfter: boolean;
} | null>(null);

function channelTypeFromView(view: ChannelView): string | null {
	if (view === 'list') return null;
	return view.replace(/_(setup|edit)$/, '');
}

function captureConnectedCredential(channelType: string | null) {
	credentialIdAtEditOpen.value = channelType ? (connectedCredentials.value[channelType] ?? '') : '';
}

watch(currentView, (newView) => {
	emit('update:view', newView);
});

const selectedChannelType = computed(() => {
	return channelTypeFromView(currentView.value);
});

const isSetupMode = computed(() => currentView.value.endsWith('_setup'));
const isEditMode = computed(() => currentView.value.endsWith('_edit'));

/** The channel whose setup view is on screen, so the close event fires once per start. */
let trackedSetupType: string | null = null;

function endSetupTracking(completed: boolean) {
	if (!trackedSetupType) return;
	agentTelemetry.trackClosedChannelSetup({
		agentId: props.agentId,
		channelType: trackedSetupType,
		completed,
	});
	trackedSetupType = null;
}

watch(
	() => (props.open && isSetupMode.value ? selectedChannelType.value : null),
	(channelType) => {
		if (channelType === trackedSetupType) return;
		endSetupTracking(false);
		if (!channelType) return;
		trackedSetupType = channelType;
		agentTelemetry.trackStartedChannelSetup({ agentId: props.agentId, channelType });
	},
	{ immediate: true },
);

onUnmounted(() => endSetupTracking(false));

function trackSetupFailure(channelType: string, stage: 'persist' | 'before_save' | 'connect') {
	// Only setup feeds the funnel; a failed save from the edit view is not part of it.
	if (!isSetupMode.value) return;
	agentTelemetry.trackFailedToConnectChannel({
		agentId: props.agentId,
		channelType,
		stage,
		conflict: stage === 'connect' && (errorIsConflict.value[channelType] ?? false),
	});
}

const currentIntegration = computed(() => {
	if (!selectedChannelType.value) return null;
	return catalog.value?.find((i) => i.type === selectedChannelType.value) ?? null;
});

const {
	selectedCredentials,
	credentialsLoading,
	credentialPermissions,
	credentialModalOpen,
	getChannelCredentialId,
	getCredentials,
	loadChannelState: loadSharedChannelState,
	createCredential,
	editCredential,
} = useAgentChannelSetup({
	projectId: () => props.projectId,
	currentIntegration,
	connectedCredentials,
	fetchStatus,
});

watch(
	() => {
		const type = selectedChannelType.value;
		return {
			type,
			credentialId: type ? selectedCredentials.value[type] : undefined,
		};
	},
	(current, previous) => {
		if (
			current.type &&
			current.type === previous.type &&
			current.credentialId !== previous.credentialId
		) {
			clearIntegrationError(current.type);
		}
	},
);

const projectIdRef = computed(() => props.projectId);
const agentIdRef = computed(() => props.agentId);
const runtimes: Record<string, AgentChannelRuntime> = Object.fromEntries(
	Object.values(agentChannelPlatforms).map((platform) => [
		platform.type,
		createAgentChannelRuntime(platform, {
			projectId: projectIdRef,
			agentId: agentIdRef,
			selectedCredentialId: computed(() => getChannelCredentialId(platform.type)),
			credentialModalOpen,
			fetchStatus,
			isConnected: isIntegrationConnected,
			isConfigured: isIntegrationConfigured,
			ensureAgentPersisted: props.ensureAgentPersisted,
		}),
	]),
);
const fallbackRuntime = createAgentChannelRuntime(getAgentChannelPlatform('unknown'), {
	projectId: projectIdRef,
	agentId: agentIdRef,
	selectedCredentialId: ref(''),
	credentialModalOpen,
	fetchStatus,
	isConnected: isIntegrationConnected,
	isConfigured: isIntegrationConfigured,
	ensureAgentPersisted: props.ensureAgentPersisted,
});
const runtimeFor = (type: string): AgentChannelRuntime => runtimes[type] ?? fallbackRuntime;
const currentPlatform = computed(() =>
	getAgentChannelPlatform(selectedChannelType.value ?? 'unknown'),
);
const currentRuntime = computed(() => runtimeFor(selectedChannelType.value ?? 'unknown'));
const channelViewRef = ref<AgentChannelViewExpose>();
/** Pending approval edit for the channel being edited, seeded from what is saved. */
const channelApproval = ref<AgentApproval | undefined>();
const channelApprovalValid = ref(true);
const approvableActions = computed(() => currentIntegration.value?.approvableActions ?? []);
const channelViewLoading = computed(() => channelViewRef.value?.loading === true);
/**
 * Persisting the Agent and setting the channel up are one action from here: the
 * modal opens before the Agent row exists, so guarding on the connect request
 * alone leaves the whole `ensureAgentPersisted` await open to a second submit.
 */
const actionInFlight = computed(
	() =>
		channelActionInFlight.value ||
		channelViewLoading.value ||
		(selectedChannelType.value ? isLoading(selectedChannelType.value) : false),
);
const listLoading = computed(
	() => actionInFlight.value || Object.values(runtimes).some((runtime) => runtime.loading.value),
);
const disconnectConfirmationComponent = computed(() => {
	const pending = pendingDisconnect.value;
	return pending
		? getAgentChannelPlatform(pending.channelType).disconnectConfirmationComponent
		: undefined;
});
const disconnectConfirmationLoading = computed(() => {
	const pending = pendingDisconnect.value;
	return pending ? isLoading(pending.channelType) : false;
});

const headerContentDisabled = computed(
	() => currentRuntime.value.loading.value || actionInFlight.value,
);
const headerContentComponent = computed(() => {
	if (isSetupMode.value) {
		return currentPlatform.value.headerContent?.setupModal;
	}
	if (isEditMode.value) {
		return currentPlatform.value.headerContent?.editModal;
	}
	return undefined;
});
function prepareChannelEdit(channelType: string | null) {
	captureConnectedCredential(channelType);
	channelApproval.value = channelType ? integrationApproval.value[channelType] : undefined;
	if (!channelType) return;
	clearIntegrationError(channelType);
	if (credentialIdAtEditOpen.value) {
		selectedCredentials.value[channelType] = credentialIdAtEditOpen.value;
	}
}

watch(
	() => props.view,
	(newView) => {
		currentView.value = newView;
		prepareChannelEdit(newView.endsWith('_edit') ? channelTypeFromView(newView) : null);
	},
);

const showFooterActions = computed(() => isEditMode.value && selectedChannelType.value !== null);

const currentChannelCredentialId = computed(() =>
	getChannelCredentialId(selectedChannelType.value),
);
const headerText = computed(() => {
	const isListMode = currentView.value === 'list';
	const channel = selectedChannelType.value;
	if (channel && !isListMode) {
		return currentIntegration.value?.label ?? channel;
	}
	return i18n.baseText('agents.channels.modal.title');
});
const currentStep = computed(() => (currentView.value === 'list' ? 'list' : 'configure'));

function isConnected(channelType: string): boolean {
	return isIntegrationConnected(channelType);
}

function isConfigured(channelType: string): boolean {
	return isIntegrationConfigured(channelType);
}

function isLoading(channelType: string): boolean {
	return loadingMap.value[channelType] ?? false;
}

function hasError(channelType: string): boolean {
	return (errorMessages.value[channelType] ?? '').length > 0;
}

function integrationConnectedText(channelType: string): string {
	if (!isIntegrationConnected(channelType)) return '';
	return (
		getAgentChannelPlatform(channelType).getConnectedDescription?.({
			text: (key) => i18n.baseText(key),
		}) ?? ''
	);
}

function connectAction(channelType: string) {
	return getAgentChannelPlatform(channelType).getConnectAction(
		{ text: (key) => i18n.baseText(key) },
		runtimeFor(channelType),
	);
}

function goToSetup(channelType: string) {
	clearIntegrationError(channelType);
	openedFromList.value = true;
	saveAttempted.value = false;
	currentView.value = `${channelType}_setup`;
}

function goToEdit(channelType: string) {
	prepareChannelEdit(channelType);
	openedFromList.value = true;
	saveAttempted.value = false;
	currentView.value = `${channelType}_edit`;
}

function goBackToList() {
	if (actionInFlight.value) return;
	prepareChannelEdit(null);
	saveAttempted.value = false;
	currentView.value = 'list';
}

/**
 * Close once a flow has finished its own work. Separate from `closeModal`
 * because a platform reports `connected` from inside its setup flow, while that
 * flow still counts as in flight — the user-facing guard would refuse to close.
 */
function completeAndClose() {
	emit('update:open', false);
}

function handleModalOpenUpdate(isOpen: boolean) {
	if (!isOpen && actionInFlight.value) return;
	emit('update:open', isOpen);
}

// Only block outside-close while the teleported credential modal is open.
function handleInteractOutside(event: Event) {
	if (credentialModalOpen.value) event.preventDefault();
}

async function persistAgent(): Promise<boolean> {
	try {
		await props.ensureAgentPersisted?.();
		return true;
	} catch (error) {
		// Needs a toast — unlike `connect`, this step has no inline error surface.
		toast.showError(error, i18n.baseText('agents.channels.modal.saveChannelError'));
		return false;
	}
}

/**
 * The platform's own pre-save step (Slack managed settings). Only some of its
 * failures render inline in the view, so a rejection is reported here rather
 * than closing the modal on settings that were never saved.
 */
async function runBeforeSave(): Promise<boolean> {
	try {
		await channelViewRef.value?.beforeSave?.();
		return true;
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.channels.modal.saveChannelError'));
		return false;
	}
}

async function saveChannelConfig() {
	if (actionInFlight.value) return;
	saveAttempted.value = true;
	const channelType = selectedChannelType.value;
	const credentialId = currentChannelCredentialId.value;
	if (!channelType || !credentialId) return;
	if (channelViewRef.value?.validationError) return;
	if (!channelApprovalValid.value) return;

	// Swapping the credential of a configured channel is one request: the
	// backend brings the new channel up, swaps both entries in a single write,
	// and only then releases the old one.
	const credentialIdToReplace =
		isEditMode.value &&
		credentialIdAtEditOpen.value &&
		credentialIdAtEditOpen.value !== credentialId
			? credentialIdAtEditOpen.value
			: undefined;

	channelActionInFlight.value = true;
	try {
		if (!(await persistAgent())) {
			trackSetupFailure(channelType, 'persist');
			return;
		}
		if (!(await runBeforeSave())) {
			trackSetupFailure(channelType, 'before_save');
			return;
		}
		await connect(channelType, credentialId, channelViewRef.value?.currentSettings, {
			...(credentialIdToReplace ? { replaces: { credentialId: credentialIdToReplace } } : {}),
			// Only the edit view shows the approval control, so only it may carry one.
			...(isEditMode.value && channelApproval.value ? { approval: channelApproval.value } : {}),
		});
	} catch {
		// Only `connect` is left to throw here, and `useAgentIntegrationStatus`
		// exposes that failure to the setup view.
		trackSetupFailure(channelType, 'connect');
		return;
	} finally {
		channelActionInFlight.value = false;
	}

	endSetupTracking(true);
	emit('channel-connected', channelType);
	emit('agent-changed');
	completeAndClose();
}

function handlePlatformConnected() {
	const channelType = selectedChannelType.value;
	if (!channelType) return;
	endSetupTracking(true);
	emit('channel-connected', channelType);
	emit('agent-changed');
	completeAndClose();
}

async function handleDisconnected(
	channelType: string,
	credentialId?: string,
	options: { deleteExternalResource?: boolean } = {},
) {
	// Draft channels (configured but missing a credential) have no connected
	// credential — send '' so the backend removes the draft entry by type.
	const result = await disconnect(
		channelType,
		credentialId ?? connectedCredentials.value[channelType] ?? '',
		options,
	);
	await fetchStatus([channelType]);
	if (!isIntegrationConfigured(channelType)) {
		emit('channel-disconnected', channelType);
	}
	emit('agent-changed');
	return result;
}

async function disconnectChannel(
	channelType: string,
	credentialId: string,
	closeAfter: boolean,
	deleteExternalResource?: boolean,
) {
	try {
		const result = await handleDisconnected(channelType, credentialId, {
			deleteExternalResource,
		});
		if (result.warning) {
			const presentation = getAgentChannelPlatform(channelType).presentDisconnectWarning?.(
				result.warning,
				{ text: (key) => i18n.baseText(key) },
			);
			if (presentation) {
				toast.showMessage({
					type: 'warning',
					title: presentation.title,
					message: presentation.message,
					duration: 0,
				});
			}
		}
		pendingDisconnect.value = null;
		if (closeAfter) completeAndClose();
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.channels.modal.removeChannelError'));
	}
}

function requestDisconnect(channelType: string, credentialId: string, closeAfter: boolean) {
	// The list view can target a channel other than the selected one, so its own
	// loading state is checked on top of the modal-wide action.
	if (actionInFlight.value || isLoading(channelType)) return;
	const platform = getAgentChannelPlatform(channelType);
	if (
		platform.shouldConfirmDisconnect?.(runtimeFor(channelType), credentialId, {
			isPublished: props.isPublished,
		})
	) {
		pendingDisconnect.value = { channelType, credentialId, closeAfter };
		return;
	}
	void disconnectChannel(channelType, credentialId, closeAfter);
}

function confirmDisconnect(deleteExternalResource: boolean) {
	const pending = pendingDisconnect.value;
	if (!pending) return;
	void disconnectChannel(
		pending.channelType,
		pending.credentialId,
		pending.closeAfter,
		deleteExternalResource,
	);
}

function removeCurrentChannel() {
	const channelType = selectedChannelType.value;
	if (!channelType) return;
	requestDisconnect(
		channelType,
		credentialIdAtEditOpen.value || connectedCredentials.value[channelType] || '',
		true,
	);
}

async function loadChannelState() {
	const integrations = await ensureLoaded(props.projectId).catch(() => catalog.value ?? []);
	await Promise.all([
		loadSharedChannelState(integrations),
		...integrations.map(({ type }) => runtimeFor(type).load()),
	]);
	if (isEditMode.value) {
		prepareChannelEdit(selectedChannelType.value);
	}
}

watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) {
			viewSession.value += 1;
			void loadChannelState();
			openedFromList.value = props.view === 'list';
			saveAttempted.value = false;
			currentView.value = props.view;
		} else {
			captureConnectedCredential(null);
		}
	},
	{ immediate: true },
);
</script>

<template>
	<AgentModalMultiStep
		:open="open"
		:step="currentStep"
		:title="headerText"
		:show-back="currentView !== 'list' && openedFromList"
		:show-footer="showFooterActions"
		:busy="actionInFlight"
		:trap-focus="!credentialModalOpen"
		:disable-outside-pointer-events="!credentialModalOpen"
		@interact-outside="handleInteractOutside"
		@update:open="handleModalOpenUpdate"
		@back="goBackToList"
	>
		<template #headerActions>
			<component
				:is="headerContentComponent"
				v-if="headerContentComponent"
				:runtime="currentRuntime"
				:disabled="headerContentDisabled"
			/>
		</template>

		<div data-testid="agent-channel-modal" :class="$style.container">
			<div v-show="currentView === 'list'" key="list" :class="$style.listView">
				<ul :class="$style.channelList">
					<AgentChannelListItem
						v-for="integration in catalog"
						:key="integration.type"
						:integration="integration"
						:configured="isConfigured(integration.type)"
						:connected="isConnected(integration.type)"
						:not-running="hasRuntimeError(integration.type)"
						:runtime-error="runtimeErrors[integration.type]"
						:loading="listLoading"
						:connect-action="connectAction(integration.type)"
						@setup="goToSetup"
						@edit="goToEdit"
					/>
				</ul>
			</div>

			<div
				v-if="currentView !== 'list' && currentIntegration"
				:key="`${isSetupMode ? 'setup' : 'edit'}-${currentView}`"
				:class="isSetupMode ? $style.setupView : $style.editView"
			>
				<component
					:is="isSetupMode ? currentPlatform.setupComponent : currentPlatform.editComponent"
					:key="viewSession"
					ref="channelViewRef"
					v-model="selectedCredentials[currentIntegration.type]"
					:mode="isSetupMode ? 'setup' : 'edit'"
					:integration="currentIntegration"
					:credentials="getCredentials(currentIntegration.type)"
					:credential-permissions="credentialPermissions"
					:credentials-loading="credentialsLoading"
					:loading="isLoading(currentIntegration.type)"
					:connected="isConfigured(currentIntegration.type)"
					:connected-description="integrationConnectedText(currentIntegration.type)"
					:error-message="
						hasError(currentIntegration.type) ? errorMessages[currentIntegration.type] : ''
					"
					:error-is-conflict="errorIsConflict[currentIntegration.type]"
					:saved-settings="integrationSettings[currentIntegration.type]"
					:is-published="isPublished"
					:agent-name="agentId"
					:project-id="projectId"
					:agent-id="agentId"
					:force-new-credential="false"
					:simple-setup="simpleSetup"
					:runtime="currentRuntime"
					@create="createCredential"
					@edit="editCredential"
					@connect="saveChannelConfig"
					@connected="handlePlatformConnected"
				/>
				<N8nText
					v-if="saveAttempted && !currentChannelCredentialId"
					size="small"
					color="danger"
					data-testid="agent-channel-credential-required"
				>
					{{ i18n.baseText('agents.channels.modal.credentialRequired' as BaseTextKey) }}
				</N8nText>

				<AgentChannelApprovalSetting
					v-if="isEditMode && approvableActions.length > 0"
					v-model="channelApproval"
					:actions="approvableActions"
					@update:valid="channelApprovalValid = $event"
				/>
			</div>
		</div>

		<template v-if="showFooterActions" #footerLeft>
			<N8nButton
				variant="ghost"
				size="medium"
				:loading="selectedChannelType ? isLoading(selectedChannelType) : false"
				:disabled="actionInFlight || !selectedChannelType"
				data-testid="agent-channel-remove-channel"
				@click="removeCurrentChannel"
			>
				<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
				{{ i18n.baseText('agents.channels.modal.removeChannel') }}
			</N8nButton>
		</template>
		<template v-if="showFooterActions" #footerActions>
			<N8nButton
				variant="solid"
				size="medium"
				:loading="actionInFlight"
				:disabled="!channelApprovalValid || actionInFlight"
				data-testid="agent-channel-save-channel-config"
				@click="saveChannelConfig"
			>
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</template>
		<component
			:is="disconnectConfirmationComponent"
			v-if="pendingDisconnect && disconnectConfirmationComponent"
			:open="true"
			:loading="disconnectConfirmationLoading"
			@cancel="pendingDisconnect = null"
			@confirm="confirmDisconnect"
		/>
	</AgentModalMultiStep>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.listView {
	display: flex;
	flex-direction: column;
}

.channelList {
	display: flex;
	flex-direction: column;
	padding-bottom: var(--spacing--xs);
}

.setupView,
.editView {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
</style>
