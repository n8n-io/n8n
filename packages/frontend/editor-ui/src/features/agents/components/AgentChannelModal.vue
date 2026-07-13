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
import { computed, ref, watch } from 'vue';
import { useAgentChannelSetup } from '../composables/useAgentChannelSetup';
import { useAgentIntegrationStatus } from '../composables/useAgentIntegrationStatus';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import AgentChannelListItem from './AgentChannelListItem.vue';
import AgentChannelSlackSetup from './AgentChannelSlackSetup.vue';
import AgentChannelLinearSetup from './AgentChannelLinearSetup.vue';
import AgentChannelTelegramSetup from './AgentChannelTelegramSetup.vue';

export type ChannelView =
	| 'list'
	| 'slack_setup'
	| 'slack_edit'
	| 'linear_setup'
	| 'linear_edit'
	| 'telegram_setup'
	| 'telegram_edit';

interface Props {
	open: boolean;
	agentId: string;
	projectId: string;
	view: ChannelView;
	connectedChannels: string[];
	isPublished: boolean;
	/**
	 * Force creating a new credential in the setup flow (hides the existing-credential
	 * picker). Used by the AIA channel-setup HITL so a new agent gets its own credential.
	 */
	forceNewCredential?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	forceNewCredential: false,
});

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
	connect,
	disconnect,
} = useAgentIntegrationStatus(props.projectId, props.agentId);

const currentView = ref<ChannelView>(props.view);

watch(
	() => props.view,
	(newView) => {
		currentView.value = newView;
	},
);

watch(currentView, (newView) => {
	emit('update:view', newView);
});

const selectedChannelType = computed(() => {
	if (currentView.value === 'list') return null;
	return currentView.value.split('_')[0];
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
	isIntegrationConnected,
});

const showFooterActions = computed(
	() =>
		isEditMode.value && selectedChannelType.value !== null && selectedChannelType.value !== 'slack',
);

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
	return props.connectedChannels.includes(channelType) || isIntegrationConnected(channelType);
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
	const key = CONNECTED_TEXT_KEYS[channelType as keyof typeof CONNECTED_TEXT_KEYS];
	return key ? i18n.baseText(key) : '';
}

function goToSetup(channelType: string) {
	currentView.value = `${channelType}_setup` as ChannelView;
}

function goToEdit(channelType: string) {
	currentView.value = `${channelType}_edit` as ChannelView;
}

function goBackToList() {
	currentView.value = 'list';
}

function handleListDisconnect(channelType: string) {
	void handleDisconnected(channelType);
}

function closeModal() {
	emit('update:open', false);
}

async function saveChannelConfig() {
	const channelType = selectedChannelType.value;
	const credentialId = currentChannelCredentialId.value;
	if (!channelType || !credentialId) return;
	if (channelSetupRef.value?.validationError) return;

	await connect(channelType, credentialId, channelSetupRef.value?.currentSettings);
	emit('channel-connected', channelType);
	emit('agent-changed');
	closeModal();
}

async function setupSlackApp(appConfigurationToken: string): Promise<boolean> {
	return await runSlackAppSetup(appConfigurationToken, () => {
		emit('channel-connected', 'slack');
		emit('agent-changed');
		closeModal();
	});
}

async function handleDisconnected(channelType: string) {
	const credentialId = connectedCredentials.value[channelType];
	if (!credentialId) return;

	await disconnect(channelType, credentialId);
	emit('channel-disconnected', channelType);
	emit('agent-changed');
}

async function disconnectSlackApp() {
	await handleDisconnected('slack');
	closeModal();
}

async function loadChannelState() {
	const integrations = await ensureLoaded(props.projectId).catch(() => catalog.value ?? []);
	await loadSharedChannelState(integrations);
}

watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) {
			void loadChannelState();
			currentView.value = props.view;
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
		@interact-outside="(e) => e.preventDefault()"
		@update:open="$emit('update:open', $event)"
	>
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

		<div :class="$style.container">
			<Transition name="channel-view-fade" mode="out-in">
				<div v-if="currentView === 'list'" key="list" :class="$style.listView">
					<ul :class="$style.channelList">
						<AgentChannelListItem
							v-for="integration in catalog"
							:key="integration.type"
							:integration="integration"
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
						mode="setup"
						:connected="isConnected('slack')"
						:is-published="isPublished"
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
						:force-new-credential="forceNewCredential"
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
						:connected="isConnected(currentIntegration.type)"
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
						:force-new-credential="forceNewCredential"
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
						:connected="isConnected(currentIntegration.type)"
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
						:force-new-credential="forceNewCredential"
						@create="createCredential"
						@edit="editCredential"
						@connect="saveChannelConfig"
					/>
				</div>

				<div v-else-if="isEditMode" :key="`edit-${currentView}`" :class="$style.editView">
					<AgentChannelSlackSetup
						v-if="currentIntegration?.type === 'slack'"
						ref="channelSetupRef"
						v-model="selectedCredentials.slack"
						mode="edit"
						:connected="isConnected('slack')"
						:is-published="isPublished"
						:disabled="isLoading('slack')"
						:disconnect-slack-app="disconnectSlackApp"
						:integration="currentIntegration"
						:credentials="getCredentials('slack')"
						:credential-permissions="credentialPermissions"
						:connected-credential-id="connectedCredentials.slack ?? ''"
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
						mode="edit"
						:integration="currentIntegration"
						:credentials="getCredentials(currentIntegration.type)"
						:credential-permissions="credentialPermissions"
						:credentials-loading="credentialsLoading"
						:loading="isLoading(currentIntegration.type)"
						:connected="isConnected(currentIntegration.type)"
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
						:loading="isLoading(currentIntegration.type)"
						:connected="isConnected(currentIntegration.type)"
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
					/>
					<N8nText v-else size="small" color="text-light">
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
					<N8nButton variant="ghost" size="medium" @click="closeModal">
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						size="medium"
						:disabled="!canSaveChannelConfig"
						data-testid="agent-channel-save-channel-config"
						@click="saveChannelConfig"
					>
						{{ i18n.baseText('generic.save') }}
					</N8nButton>
				</div>
			</N8nDialogFooter>
		</Transition>
	</N8nDialog>
</template>

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
	justify-content: flex-end;
	gap: var(--spacing--xs);
	height: var(--height--md);
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
