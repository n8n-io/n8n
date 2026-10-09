<script setup lang="ts">
import type { AgentApproval } from '@n8n/api-types';
import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nIcon, N8nText, type DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, onUnmounted, ref, watch } from 'vue';

import {
	agentChannelPlatforms,
	createAgentChannelRuntime,
	getAgentChannelPlatform,
} from '../channels/registry';
import { useN8nChatChannel } from '../channels/n8nChat/useN8nChatChannel';
import type {
	AgentChannelRuntime,
	AgentChannelView,
	AgentChannelViewExpose,
} from '../channels/types';
import { useAgentChannelSetup } from '../composables/useAgentChannelSetup';
import { useAgentChannelRemoval } from '../composables/useAgentChannelRemoval';
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
	disabled?: boolean;
	isPublished?: boolean;
	simpleSetup?: boolean;
	ensureAgentPersisted?: () => Promise<void>;
	/** n8n Chat's saved description, seeded into its view when opened. */
	savedDescription?: string;
	/** Persists n8n Chat's description. It skips the request when nothing changed. */
	saveDescription?: (description: string) => Promise<void>;
}

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
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
const integrationStatus = useAgentIntegrationStatus(props.projectId, props.agentId);
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
	clearError: clearIntegrationError,
} = integrationStatus;

const currentView = ref<ChannelView>(props.view);
const openedFromList = ref(props.view === 'list');
const viewSession = ref(0);
const credentialIdAtEditOpen = ref('');
const channelActionInFlight = ref(false);
const saveAttempted = ref(false);

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
const isN8nChatSelected = computed(() => selectedChannelType.value === N8N_CHAT_INTEGRATION_TYPE);

const { withN8nChat } = useN8nChatChannel();
const channelList = computed(() => withN8nChat(catalog.value ?? []));
const n8nChatAvailableLabel = computed(() => i18n.baseText('agents.channels.n8nChat.available'));
const removeChannelLabel = computed(() =>
	i18n.baseText(
		isN8nChatSelected.value
			? 'agents.channels.n8nChat.makeUnavailable'
			: 'agents.channels.modal.removeChannel',
	),
);
const n8nChatSaveLabel = computed(() =>
	i18n.baseText(isSetupMode.value ? 'agents.channels.n8nChat.makeAvailable' : 'generic.save'),
);
const n8nChatMenuItems = computed<Array<DropdownMenuItemProps<string>>>(() => [
	{ id: 'edit', label: i18n.baseText('agents.channels.n8nChat.edit') },
	{ id: 'remove', label: i18n.baseText('agents.channels.n8nChat.makeUnavailable') },
]);

const currentIntegration = computed(() => {
	if (!selectedChannelType.value) return null;
	return channelList.value.find((i) => i.type === selectedChannelType.value) ?? null;
});

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
	// The template renders the setup view only once the catalog knows the channel.
	() =>
		props.open && isSetupMode.value && currentIntegration.value ? selectedChannelType.value : null,
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
		removingChannel.value ||
		channelViewLoading.value ||
		(selectedChannelType.value ? isLoading(selectedChannelType.value) : false),
);
const listLoading = computed(
	() => actionInFlight.value || Object.values(runtimes).some((runtime) => runtime.loading.value),
);
const {
	pendingDisconnect,
	disconnectConfirmationComponent,
	removing: removingChannel,
	requestDisconnect,
	confirmDisconnect,
} = useAgentChannelRemoval({
	projectId: () => props.projectId,
	agentId: () => props.agentId,
	isPublished: () => props.isPublished,
	disabled: () => props.disabled || channelActionInFlight.value || channelViewLoading.value,
	status: integrationStatus,
	runtimeFor,
	onRemoved: (channelType) => {
		if (!isIntegrationConfigured(channelType)) emit('channel-disconnected', channelType);
		emit('agent-changed');
		completeAndClose();
	},
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

// n8n Chat's setup view also needs a footer ("Make available"), unlike every
// other channel's setup, which connects straight from its own view.
const showFooterActions = computed(
	() =>
		selectedChannelType.value !== null &&
		(isEditMode.value || (isSetupMode.value && isN8nChatSelected.value)),
);

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
		await channelViewRef.value?.afterSave?.();
	} catch {
		// Only `connect` is left to throw here, and `useAgentIntegrationStatus`
		// exposes that failure to the setup view.
		trackSetupFailure(channelType, 'connect');
		return;
	} finally {
		channelActionInFlight.value = false;
	}

	finishConnect(channelType);
}

function finishConnect(channelType: string) {
	endSetupTracking(true);
	emit('channel-connected', channelType);
	emit('agent-changed');
	completeAndClose();
}

/** Same shape as `persistAgent`: reports its own failure and returns whether it saved. */
async function persistDescription(description: string): Promise<boolean> {
	try {
		await props.saveDescription?.(description);
		return true;
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.channels.modal.saveChannelError'));
		return false;
	}
}

/**
 * n8n Chat has no credential and no per-platform view logic, so it saves
 * separately rather than bending `saveChannelConfig` to a channel that skips
 * most of what that function does (credentials, `beforeSave`, approval).
 */
async function saveN8nChat() {
	if (actionInFlight.value) return;
	// Read the view before any await: it can unmount while a request runs.
	const description = channelViewRef.value?.description;
	if (description === undefined) return;
	const settingUp = isSetupMode.value;
	channelActionInFlight.value = true;
	try {
		if (!(await persistAgent())) {
			trackSetupFailure(N8N_CHAT_INTEGRATION_TYPE, 'persist');
			return;
		}
		if (!(await persistDescription(description))) return;
		if (settingUp) {
			await connect(N8N_CHAT_INTEGRATION_TYPE, '');
		}
	} catch (error) {
		// Only `connect` is left to throw here. The n8n Chat view shows no inline
		// error, so the failure goes to a toast.
		toast.showError(error, i18n.baseText('agents.channels.modal.saveChannelError'));
		trackSetupFailure(N8N_CHAT_INTEGRATION_TYPE, 'connect');
		return;
	} finally {
		channelActionInFlight.value = false;
	}

	if (settingUp) {
		finishConnect(N8N_CHAT_INTEGRATION_TYPE);
		return;
	}
	emit('agent-changed');
	completeAndClose();
}

function handlePlatformConnected() {
	const channelType = selectedChannelType.value;
	if (!channelType) return;
	finishConnect(channelType);
}

function removeCurrentChannel() {
	const channelType = selectedChannelType.value;
	if (!channelType) return;
	void requestDisconnect(
		channelType,
		credentialIdAtEditOpen.value || connectedCredentials.value[channelType] || '',
	);
}

/** The list's "Make unavailable" menu item. n8n Chat has no credential to carry. */
function handleChannelRemove(channelType: string) {
	void requestDisconnect(channelType, '');
}

async function loadChannelState() {
	const integrations = await ensureLoaded(props.projectId).catch(() => catalog.value ?? []);
	await Promise.all([
		// n8n Chat is not in the catalog, but its status must refresh too.
		loadSharedChannelState(withN8nChat(integrations)),
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
		:show-cancel="!isN8nChatSelected"
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
						v-for="integration in channelList"
						:key="integration.type"
						:integration="integration"
						:configured="isConfigured(integration.type)"
						:connected="isConnected(integration.type)"
						:not-running="hasRuntimeError(integration.type)"
						:runtime-error="runtimeErrors[integration.type]"
						:loading="listLoading"
						:connect-action="connectAction(integration.type)"
						:configured-label="
							integration.type === N8N_CHAT_INTEGRATION_TYPE ? n8nChatAvailableLabel : undefined
						"
						:menu-items="
							integration.type === N8N_CHAT_INTEGRATION_TYPE ? n8nChatMenuItems : undefined
						"
						@setup="goToSetup"
						@edit="goToEdit"
						@remove="handleChannelRemove"
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
					:ensure-agent-persisted="ensureAgentPersisted"
					:force-new-credential="false"
					:simple-setup="simpleSetup"
					:runtime="currentRuntime"
					:saved-description="isN8nChatSelected ? savedDescription : undefined"
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

		<template v-if="showFooterActions && isEditMode" #footerLeft>
			<N8nButton
				variant="ghost"
				size="medium"
				:loading="selectedChannelType ? isLoading(selectedChannelType) : false"
				:disabled="disabled || actionInFlight || !selectedChannelType"
				data-testid="agent-channel-remove-channel"
				@click="removeCurrentChannel"
			>
				<template v-if="!isN8nChatSelected" #icon><N8nIcon icon="trash-2" :size="16" /></template>
				{{ removeChannelLabel }}
			</N8nButton>
		</template>
		<template v-if="showFooterActions" #footerActions>
			<template v-if="isN8nChatSelected">
				<N8nButton
					variant="ghost"
					size="medium"
					:disabled="actionInFlight"
					data-testid="agent-channel-cancel"
					@click="handleModalOpenUpdate(false)"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					size="medium"
					:loading="actionInFlight"
					:disabled="actionInFlight"
					data-testid="agent-channel-save-channel-config"
					@click="saveN8nChat"
				>
					{{ n8nChatSaveLabel }}
				</N8nButton>
			</template>
			<N8nButton
				v-else
				variant="solid"
				size="medium"
				:loading="actionInFlight"
				:disabled="!channelApprovalValid || actionInFlight"
				data-testid="agent-channel-save-channel-config"
				@click="saveChannelConfig"
			>
				{{ channelViewRef?.saveLabel || i18n.baseText('generic.save') }}
			</N8nButton>
		</template>
		<component
			:is="disconnectConfirmationComponent"
			v-if="pendingDisconnect && disconnectConfirmationComponent"
			:open="true"
			:loading="removingChannel"
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
