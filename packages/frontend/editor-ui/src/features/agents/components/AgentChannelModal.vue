<script setup lang="ts">
import {
	N8nButton,
	N8nIconButton,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { useI18n } from '@n8n/i18n';
import { FocusScope } from 'reka-ui';
import { computed, ref, watch } from 'vue';
import { useAgentChannelSetup } from '../composables/useAgentChannelSetup';
import { useAgentIntegrationStatus } from '../composables/useAgentIntegrationStatus';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import AgentChannelListItem from './AgentChannelListItem.vue';
import AgentChannelSlackSetup from './AgentChannelSlackSetup.vue';
import AgentChannelLinearSetup from './AgentChannelLinearSetup.vue';
import AgentChannelTelegramSetup from './AgentChannelTelegramSetup.vue';
import AgentChannelDiscordSetup from './AgentChannelDiscordSetup.vue';
import AgentIntegrationCredentialConnection from './AgentIntegrationCredentialConnection.vue';

export type ChannelView =
	| 'list'
	| 'slack_setup'
	| 'slack_edit'
	| 'linear_setup'
	| 'linear_edit'
	| 'telegram_setup'
	| 'telegram_edit'
	| 'discord_setup'
	| 'discord_edit';

interface Props {
	open: boolean;
	agentId: string;
	projectId: string;
	isPublished: boolean;
	view: ChannelView;
	ensureAgentPersisted?: () => Promise<void>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	'update:view': [view: ChannelView];
	'channel-connected': [channelType: string];
	'channel-disconnected': [channelType: string];
	'agent-changed': [];
}>();

const i18n = useI18n();
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
const {
	fetchStatus,
	connectedCredentials,
	integrationSettings,
	loadingMap,
	errorMessages,
	errorIsConflict,
	isConnected: isIntegrationConnected,
	isConfigured: isIntegrationConfigured,
	connect,
	disconnect,
} = useAgentIntegrationStatus(props.projectId, props.agentId);

const currentView = ref<ChannelView>(props.view);
const credentialIdAtEditOpen = ref('');
const pendingCredentialReplacement = ref<{
	channelType: string;
	originalCredentialId: string;
	replacementCredentialId: string;
} | null>(null);
const credentialReplacementError = ref(false);

function channelTypeFromView(view: ChannelView): string | null {
	return view === 'list' ? null : view.split('_')[0];
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
	channelSetupRef,
	selectedCredentials,
	credentialsLoading,
	credentialPermissions,
	credentialModalOpen,
	getChannelCredentialId,
	getCredentials,
	loadChannelState: loadSharedChannelState,
	createCredential,
	editCredential,
	setupSlackApp: runSlackAppSetup,
} = useAgentChannelSetup({
	projectId: () => props.projectId,
	agentId: () => props.agentId,
	currentIntegration,
	connectedCredentials,
	fetchStatus,
	isIntegrationConfigured,
});

const hasPendingCredentialReplacement = computed(() => pendingCredentialReplacement.value !== null);
const isCredentialReplacementInProgress = computed(
	() => hasPendingCredentialReplacement.value && !credentialReplacementError.value,
);

function clearFailedCredentialReplacement() {
	if (!credentialReplacementError.value) return;
	pendingCredentialReplacement.value = null;
	credentialReplacementError.value = false;
}

function prepareChannelEdit(channelType: string | null) {
	credentialReplacementError.value = false;
	captureConnectedCredential(channelType);
	if (channelType && credentialIdAtEditOpen.value) {
		selectedCredentials.value[channelType] = credentialIdAtEditOpen.value;
	}
}

watch(
	() => props.view,
	(newView) => {
		if (isCredentialReplacementInProgress.value) return;
		clearFailedCredentialReplacement();
		currentView.value = newView;
		prepareChannelEdit(newView.endsWith('_edit') ? channelTypeFromView(newView) : null);
	},
);

const showFooterActions = computed(() => isEditMode.value && selectedChannelType.value !== null);

const currentChannelCredentialId = computed(() =>
	getChannelCredentialId(selectedChannelType.value),
);

const canSaveChannelConfig = computed(() => {
	const validationError = channelSetupRef.value?.validationError;
	return (
		selectedChannelType.value !== null &&
		currentChannelCredentialId.value.length > 0 &&
		!validationError
	);
});

// Backend integration descriptors ship icon names that may include legacy
// aliases; N8nIcon resolves them at runtime but the static IconName union
// doesn't enumerate them.
function toIconName(icon: string): IconName {
	return icon as IconName;
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

const CONNECTED_TEXT_KEYS = {
	telegram: 'agents.builder.addTrigger.connectedText.telegram',
	linear: 'agents.builder.addTrigger.connectedText.linear',
} as const;

function integrationConnectedText(channelType: string): string {
	if (!isIntegrationConnected(channelType)) return '';
	const key = CONNECTED_TEXT_KEYS[channelType as keyof typeof CONNECTED_TEXT_KEYS];
	return key ? i18n.baseText(key) : '';
}

function goToSetup(channelType: string) {
	currentView.value = `${channelType}_setup` as ChannelView;
}

function goToEdit(channelType: string) {
	prepareChannelEdit(channelType);
	currentView.value = `${channelType}_edit` as ChannelView;
}

function goBackToList() {
	if (
		isCredentialReplacementInProgress.value ||
		(selectedChannelType.value ? isLoading(selectedChannelType.value) : false)
	) {
		return;
	}
	clearFailedCredentialReplacement();
	captureConnectedCredential(null);
	currentView.value = 'list';
}

function handleListDisconnect(channelType: string) {
	void handleDisconnected(channelType);
}

function closeModal() {
	if (
		isCredentialReplacementInProgress.value ||
		(selectedChannelType.value ? isLoading(selectedChannelType.value) : false)
	) {
		return;
	}
	emit('update:open', false);
}

function handleModalOpenUpdate(isOpen: boolean) {
	if (
		!isOpen &&
		(isCredentialReplacementInProgress.value ||
			(selectedChannelType.value ? isLoading(selectedChannelType.value) : false))
	) {
		return;
	}
	emit('update:open', isOpen);
}

async function finishCredentialReplacement(
	pendingReplacement: NonNullable<typeof pendingCredentialReplacement.value>,
) {
	credentialReplacementError.value = false;
	try {
		await disconnect(pendingReplacement.channelType, pendingReplacement.originalCredentialId);
		await fetchStatus([pendingReplacement.channelType]);
		pendingCredentialReplacement.value = null;
	} catch (error) {
		credentialReplacementError.value = true;
		throw error;
	}
}

async function saveChannelConfig() {
	const channelType = selectedChannelType.value;
	const credentialId = currentChannelCredentialId.value;
	if (!channelType || !credentialId) return;
	if (channelSetupRef.value?.validationError) return;
	await props.ensureAgentPersisted?.();
	const pendingReplacement = pendingCredentialReplacement.value;
	if (pendingReplacement?.channelType === channelType) {
		selectedCredentials.value[channelType] = pendingReplacement.replacementCredentialId;
		await finishCredentialReplacement(pendingReplacement);
		emit('channel-connected', channelType);
		emit('agent-changed');
		closeModal();
		return;
	}
	const credentialIdToReplace =
		isEditMode.value &&
		credentialIdAtEditOpen.value &&
		credentialIdAtEditOpen.value !== credentialId
			? credentialIdAtEditOpen.value
			: null;

	await connect(channelType, credentialId, channelSetupRef.value?.currentSettings);
	if (credentialIdToReplace) {
		pendingCredentialReplacement.value = {
			channelType,
			originalCredentialId: credentialIdToReplace,
			replacementCredentialId: credentialId,
		};
		await finishCredentialReplacement(pendingCredentialReplacement.value);
	}
	emit('channel-connected', channelType);
	emit('agent-changed');
	closeModal();
}

async function setupSlackApp(appConfigurationToken: string): Promise<boolean> {
	await props.ensureAgentPersisted?.();
	return await runSlackAppSetup(appConfigurationToken, () => {
		emit('channel-connected', 'slack');
		emit('agent-changed');
		closeModal();
	});
}

async function handleDisconnected(channelType: string, credentialId?: string) {
	// Draft channel placeholders have no credential, so send '' to remove them by type.
	await disconnect(channelType, credentialId ?? connectedCredentials.value[channelType] ?? '');
	await fetchStatus([channelType]);
	if (!isIntegrationConfigured(channelType)) {
		emit('channel-disconnected', channelType);
	}
	emit('agent-changed');
}

async function removeCurrentChannel() {
	const channelType = selectedChannelType.value;
	if (!channelType || hasPendingCredentialReplacement.value || isLoading(channelType)) return;

	await handleDisconnected(
		channelType,
		credentialIdAtEditOpen.value || connectedCredentials.value[channelType] || '',
	);
	closeModal();
}

async function loadChannelState() {
	const integrations = await ensureLoaded(props.projectId).catch(() => catalog.value ?? []);
	await loadSharedChannelState(integrations);
	if (isEditMode.value) {
		prepareChannelEdit(selectedChannelType.value);
	}
}

watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) {
			void loadChannelState();
			currentView.value = props.view;
		} else {
			clearFailedCredentialReplacement();
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
		:show-close-button="
			!isCredentialReplacementInProgress &&
			!(selectedChannelType ? isLoading(selectedChannelType) : false)
		"
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
						:disabled="
							isCredentialReplacementInProgress ||
							(selectedChannelType ? isLoading(selectedChannelType) : false)
						"
						:class="$style.backButton"
						@click="goBackToList"
					>
						<template #icon>
							<N8nIcon icon="arrow-left" size="small" />
						</template>
					</N8nIconButton>
					<div :class="$style.headerTitle">
						<N8nIcon
							v-if="currentIntegration?.icon"
							:icon="toIconName(currentIntegration.icon)"
							size="large"
						/>
						<N8nDialogTitle>{{ headerText }}</N8nDialogTitle>
					</div>
				</div>
			</Transition>
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
							@setup="goToSetup"
							@edit="goToEdit"
							@disconnect="handleListDisconnect"
						/>
					</ul>
				</div>

				<div v-else-if="isSetupMode" :key="`setup-${currentView}`" :class="$style.setupView">
					<AgentChannelSlackSetup
						v-if="selectedChannelType === 'slack'"
						ref="channelSetupRef"
						v-model="selectedCredentials.slack"
						:connected="isConfigured('slack')"
						:setup-slack-app="setupSlackApp"
						:project-id="projectId"
						:agent-id="agentId"
						:integration="currentIntegration ?? undefined"
						:credentials="getCredentials('slack')"
						:credential-permissions="credentialPermissions"
						:credentials-loading="credentialsLoading"
						:loading="isLoading('slack')"
						:error-message="hasError('slack') ? errorMessages.slack : ''"
						:error-is-conflict="errorIsConflict.slack"
						@create="createCredential"
						@edit="editCredential"
						@connect="saveChannelConfig"
					/>
					<AgentChannelLinearSetup
						v-else-if="currentIntegration?.type === 'linear'"
						ref="channelSetupRef"
						v-model="selectedCredentials[currentIntegration.type]"
						mode="setup"
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
						:agent-name="agentId"
						:project-id="projectId"
						:agent-id="agentId"
						@create="createCredential"
						@edit="editCredential"
						@connect="saveChannelConfig"
					/>
					<AgentChannelTelegramSetup
						v-else-if="currentIntegration?.type === 'telegram'"
						ref="channelSetupRef"
						v-model="selectedCredentials[currentIntegration.type]"
						mode="setup"
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
						:agent-name="agentId"
						:project-id="projectId"
						:agent-id="agentId"
						@create="createCredential"
						@edit="editCredential"
						@connect="saveChannelConfig"
					/>
					<AgentChannelDiscordSetup
						v-else-if="currentIntegration?.type === 'discord'"
						ref="channelSetupRef"
						v-model="selectedCredentials[currentIntegration.type]"
						mode="setup"
						:integration="currentIntegration"
						:credentials="getCredentials(currentIntegration.type)"
						:credential-permissions="credentialPermissions"
						:credentials-loading="credentialsLoading"
						:loading="isLoading(currentIntegration.type)"
						:connected="isConfigured(currentIntegration.type)"
						:error-message="
							hasError(currentIntegration.type) ? errorMessages[currentIntegration.type] : ''
						"
						:error-is-conflict="errorIsConflict[currentIntegration.type]"
						:is-published="props.isPublished"
						:project-id="projectId"
						:agent-id="agentId"
						@create="createCredential"
						@edit="editCredential"
						@connect="saveChannelConfig"
					/>
				</div>

				<div v-else-if="isEditMode" :key="`edit-${currentView}`" :class="$style.editView">
					<AgentIntegrationCredentialConnection
						v-if="currentIntegration"
						v-model="selectedCredentials[currentIntegration.type]"
						:integration-type="currentIntegration.type"
						:integration-label="currentIntegration.label"
						:credentials="getCredentials(currentIntegration.type)"
						:credential-permissions="credentialPermissions"
						:credentials-loading="credentialsLoading"
						:disabled="hasPendingCredentialReplacement || isLoading(currentIntegration.type)"
						:loading="isLoading(currentIntegration.type)"
						:error-message="
							hasError(currentIntegration.type) ? errorMessages[currentIntegration.type] : ''
						"
						:error-is-conflict="errorIsConflict[currentIntegration.type]"
						:show-edit-button="!hasPendingCredentialReplacement"
						@create="createCredential"
						@edit="editCredential"
					/>
					<N8nText
						v-if="credentialReplacementError"
						:class="$style.errorText"
						size="small"
						data-testid="agent-channel-credential-replacement-error"
					>
						{{ i18n.baseText('agents.channels.modal.credentialReplacementError') }}
					</N8nText>
					<AgentChannelLinearSetup
						v-if="currentIntegration?.type === 'linear'"
						ref="channelSetupRef"
						v-model="selectedCredentials[currentIntegration.type]"
						mode="edit"
						:integration="currentIntegration"
						:credentials="getCredentials(currentIntegration.type)"
						:credential-permissions="credentialPermissions"
						:credentials-loading="credentialsLoading"
						:loading="hasPendingCredentialReplacement || isLoading(currentIntegration.type)"
						:connected="isConfigured(currentIntegration.type)"
						:saved-settings="integrationSettings[currentIntegration.type]"
						:agent-name="agentId"
						:project-id="projectId"
						:agent-id="agentId"
					/>
					<AgentChannelTelegramSetup
						v-else-if="currentIntegration?.type === 'telegram'"
						ref="channelSetupRef"
						v-model="selectedCredentials[currentIntegration.type]"
						mode="edit"
						:integration="currentIntegration"
						:credentials="getCredentials(currentIntegration.type)"
						:credential-permissions="credentialPermissions"
						:credentials-loading="credentialsLoading"
						:loading="hasPendingCredentialReplacement || isLoading(currentIntegration.type)"
						:connected="isConfigured(currentIntegration.type)"
						:saved-settings="integrationSettings[currentIntegration.type]"
						:agent-name="agentId"
						:project-id="projectId"
						:agent-id="agentId"
					/>
					<AgentChannelDiscordSetup
						v-else-if="currentIntegration?.type === 'discord'"
						ref="channelSetupRef"
						v-model="selectedCredentials[currentIntegration.type]"
						mode="edit"
						:integration="currentIntegration"
						:credentials="getCredentials(currentIntegration.type)"
						:credential-permissions="credentialPermissions"
						:credentials-loading="credentialsLoading"
						:loading="hasPendingCredentialReplacement || isLoading(currentIntegration.type)"
						:connected="isConfigured(currentIntegration.type)"
						:project-id="projectId"
						:agent-id="agentId"
					/>
					<N8nText v-else-if="currentIntegration?.type !== 'slack'" size="small" color="text-light">
						{{
							i18n.baseText('agents.channels.modal.editPlaceholder', {
								interpolate: { channel: selectedChannelType ?? '' },
							})
						}}
					</N8nText>
				</div>
			</Transition>
		</div>

		<Transition name="channel-footer-fade">
			<N8nDialogFooter v-if="showFooterActions" :class="$style.customFooter">
				<div :class="$style.footer">
					<N8nButton
						variant="destructive"
						size="medium"
						:loading="selectedChannelType ? isLoading(selectedChannelType) : false"
						:disabled="
							hasPendingCredentialReplacement ||
							(selectedChannelType ? isLoading(selectedChannelType) : true)
						"
						data-testid="agent-channel-remove-channel"
						@click="removeCurrentChannel"
					>
						{{ i18n.baseText('agents.channels.modal.removeChannel') }}
					</N8nButton>
					<div :class="$style.footerActions">
						<N8nButton
							variant="ghost"
							size="medium"
							:disabled="
								isCredentialReplacementInProgress ||
								(selectedChannelType ? isLoading(selectedChannelType) : false)
							"
							@click="closeModal"
						>
							{{ i18n.baseText('generic.cancel') }}
						</N8nButton>
						<N8nButton
							variant="solid"
							size="medium"
							:loading="selectedChannelType ? isLoading(selectedChannelType) : false"
							:disabled="
								!canSaveChannelConfig ||
								(selectedChannelType ? isLoading(selectedChannelType) : true)
							"
							data-testid="agent-channel-save-channel-config"
							@click="saveChannelConfig"
						>
							{{
								i18n.baseText(hasPendingCredentialReplacement ? 'generic.retry' : 'generic.save')
							}}
						</N8nButton>
					</div>
				</div>
			</N8nDialogFooter>
		</Transition>
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
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	text-transform: capitalize;
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
	height: var(--height--md);
}

.footerActions {
	display: flex;
	gap: var(--spacing--xs);
}

.errorText {
	color: var(--text-color--danger);
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
