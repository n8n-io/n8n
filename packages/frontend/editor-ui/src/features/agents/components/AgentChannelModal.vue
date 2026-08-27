<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nIconButton,
	updatedIconSet,
	type IconName,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { FocusScope } from 'reka-ui';
import { computed, ref, watch } from 'vue';

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
import AgentChannelListItem from './AgentChannelListItem.vue';

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
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
const {
	fetchStatus,
	connectedCredentials,
	integrationSettings,
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
const viewSession = ref(0);
const credentialIdAtEditOpen = ref('');
const channelActionInFlight = ref(false);
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
const canClose = computed(() => !actionInFlight.value);
function prepareChannelEdit(channelType: string | null) {
	captureConnectedCredential(channelType);
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
const canSaveChannelConfig = computed(() => {
	return (
		selectedChannelType.value !== null &&
		currentChannelCredentialId.value.length > 0 &&
		!channelViewLoading.value &&
		!channelViewRef.value?.validationError
	);
});

function isIconName(icon: string): icon is IconName {
	return icon in updatedIconSet;
}

const headerText = computed(() => {
	const isListMode = currentView.value === 'list';
	const channel = selectedChannelType.value;
	if (channel && !isListMode) {
		return channel;
	}
	return i18n.baseText('agents.channels.modal.title');
});

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
	currentView.value = `${channelType}_setup`;
}

function goToEdit(channelType: string) {
	prepareChannelEdit(channelType);
	currentView.value = `${channelType}_edit`;
}

function goBackToList() {
	if (actionInFlight.value) return;
	captureConnectedCredential(null);
	currentView.value = 'list';
}

function handleListDisconnect(channelType: string) {
	requestDisconnect(channelType, connectedCredentials.value[channelType] ?? '', false);
}

/**
 * Close once a flow has finished its own work. Separate from `closeModal`
 * because a platform reports `connected` from inside its setup flow, while that
 * flow still counts as in flight — the user-facing guard would refuse to close.
 */
function completeAndClose() {
	emit('update:open', false);
}

function closeModal() {
	if (actionInFlight.value) return;
	completeAndClose();
}

function handleModalOpenUpdate(isOpen: boolean) {
	if (!isOpen && actionInFlight.value) return;
	emit('update:open', isOpen);
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
	const channelType = selectedChannelType.value;
	const credentialId = currentChannelCredentialId.value;
	if (!channelType || !credentialId) return;
	if (channelViewRef.value?.validationError) return;

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
		if (!(await persistAgent())) return;
		if (!(await runBeforeSave())) return;
		await connect(channelType, credentialId, channelViewRef.value?.currentSettings, {
			...(credentialIdToReplace ? { replaces: { credentialId: credentialIdToReplace } } : {}),
		});
	} catch {
		// Only `connect` is left to throw here, and `useAgentIntegrationStatus`
		// exposes that failure to the setup view.
		return;
	} finally {
		channelActionInFlight.value = false;
	}

	emit('channel-connected', channelType);
	emit('agent-changed');
	completeAndClose();
}

function handlePlatformConnected() {
	const channelType = selectedChannelType.value;
	if (!channelType) return;
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
			currentView.value = props.view;
		} else {
			captureConnectedCredential(null);
		}
	},
	{ immediate: true },
);
</script>

<template>
	<N8nDialog
		:open="open"
		size="2xlarge"
		:trap-focus="!credentialModalOpen"
		:disable-outside-pointer-events="!credentialModalOpen"
		:show-close-button="false"
		@interact-outside="(e) => e.preventDefault()"
		@update:open="handleModalOpenUpdate"
	>
		<FocusScope
			v-if="credentialModalOpen"
			as-child
			@mount-auto-focus.prevent
			@unmount-auto-focus.prevent
		>
			<span hidden aria-hidden="true" />
		</FocusScope>

		<N8nDialogHeader :class="$style.customHeader">
			<Transition name="channel-header-fade" mode="out-in">
				<div v-if="currentView === 'list'" key="list" :class="$style.headerContent">
					<div :class="$style.headerTitle">
						<N8nDialogTitle>{{ headerText }}</N8nDialogTitle>
					</div>
				</div>
				<div v-else :key="currentView" :class="$style.headerContent">
					<N8nIconButton
						variant="ghost"
						size="small"
						icon-size="medium"
						icon="arrow-left"
						:disabled="actionInFlight"
						:class="$style.backButton"
						data-testid="agent-channel-back"
						@click="goBackToList"
					>
						<template #icon>
							<N8nIcon icon="arrow-left" size="small" />
						</template>
					</N8nIconButton>
					<div :class="$style.headerTitle">
						<N8nIcon
							v-if="currentIntegration?.icon && isIconName(currentIntegration.icon)"
							:icon="currentIntegration.icon"
							size="large"
						/>
						<N8nDialogTitle>{{ headerText }}</N8nDialogTitle>
					</div>
					<div :class="$style.headerActions">
						<component
							:is="headerContentComponent"
							v-if="headerContentComponent"
							:runtime="currentRuntime"
							:disabled="headerContentDisabled"
						/>
					</div>
				</div>
			</Transition>
			<N8nIconButton
				variant="ghost"
				size="small"
				icon-size="medium"
				icon="x"
				:class="$style.closeButton"
				aria-label="Close dialog"
				data-test-id="dialog-close-button"
				:disabled="!canClose"
				@click="closeModal"
			/>
		</N8nDialogHeader>

		<div data-testid="agent-channel-modal" :class="$style.container">
			<Transition name="channel-view-fade" mode="out-in">
				<div v-if="currentView === 'list'" key="list" :class="$style.listView">
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
							@disconnect="handleListDisconnect"
						/>
					</ul>
				</div>

				<div
					v-else-if="currentIntegration"
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
				</div>
			</Transition>
		</div>

		<Transition name="channel-footer-fade">
			<N8nDialogFooter v-if="showFooterActions" :class="$style.customFooter">
				<div :class="$style.footer">
					<N8nButton
						variant="ghost"
						size="medium"
						:loading="selectedChannelType ? isLoading(selectedChannelType) : false"
						:disabled="actionInFlight || !selectedChannelType"
						data-testid="agent-channel-remove-channel"
						@click="removeCurrentChannel"
					>
						{{ i18n.baseText('agents.channels.modal.removeChannel') }}
					</N8nButton>
					<div :class="$style.footerActions">
						<N8nButton
							variant="outline"
							size="medium"
							:disabled="actionInFlight"
							@click="closeModal"
						>
							{{ i18n.baseText('generic.cancel') }}
						</N8nButton>
						<N8nButton
							variant="solid"
							size="medium"
							:loading="actionInFlight"
							:disabled="!canSaveChannelConfig || actionInFlight"
							data-testid="agent-channel-save-channel-config"
							@click="saveChannelConfig"
						>
							{{ i18n.baseText('generic.save') }}
						</N8nButton>
					</div>
				</div>
			</N8nDialogFooter>
		</Transition>
		<component
			:is="disconnectConfirmationComponent"
			v-if="pendingDisconnect && disconnectConfirmationComponent"
			:open="true"
			:loading="disconnectConfirmationLoading"
			@cancel="pendingDisconnect = null"
			@confirm="confirmDisconnect"
		/>
	</N8nDialog>
</template>

<style lang="scss">
body:has([data-testid='agent-channel-modal'])
	.el-overlay:has([data-test-id='editCredential-modal']) {
	pointer-events: auto;
}
</style>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	min-height: var(--height--5xl);
	aspect-ratio: 4/3;
	overflow-y: auto;
	scrollbar-width: thin;
	margin-bottom: calc(var(--spacing--lg) * -1);
	scrollbar-color: transparent transparent;
}

.customHeader {
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--md);
	padding-inline: var(--spacing--lg);
	padding-bottom: var(--spacing--md);
	height: var(--height--2xl);
	border-bottom: var(--border);
	margin-inline: calc(var(--spacing--lg) * -1);
}

.headerContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--md);
	flex: 1;
	min-width: 0;
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	text-transform: capitalize;
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-left: auto;
}

.closeButton {
	flex-shrink: 0;
}

.listView {
	display: flex;
	flex-direction: column;
}

.channelList {
	display: flex;
	flex-direction: column;
	padding-block: var(--spacing--xs);
}

.setupView,
.editView {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--md) 0;
}

.customFooter {
	position: absolute;
	inset-inline: 0;
	bottom: 0;
	padding: var(--spacing--md) var(--spacing--lg);
	border-top: var(--border);
	background: light-dark(var(--color--neutral-white), var(--color--neutral-800));
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	gap: var(--spacing--2xs);
	height: var(--height--md);
}

.footerActions {
	display: flex;
	gap: var(--spacing--2xs);
}

:global(.channel-view-fade-enter-active) {
	--animation--fade-in--duration: var(--duration--snappy);
	--animation--fade-in--translate: 0;
	@include motion.fade-in;
}

:global(.channel-view-fade-leave-active) {
	--animation--fade-out--duration: var(--duration--snappy);

	@include motion.fade-out;
}

:global(.channel-header-fade-enter-active),
:global(.channel-footer-fade-enter-active) {
	--animation--fade-in--duration: var(--duration--snappy);
	--animation--fade-in--translate: 0;

	@include motion.fade-in;
}

:global(.channel-header-fade-leave-active),
:global(.channel-footer-fade-leave-active) {
	--animation--fade-out--duration: var(--duration--snappy);

	@include motion.fade-out;
}
</style>
