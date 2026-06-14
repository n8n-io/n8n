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
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';
import type { AgentIntegrationSettings, ChatIntegrationDescriptor } from '@n8n/api-types';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { getResourcePermissions } from '@n8n/permissions';
import { createSlackAgentApp } from '../composables/useAgentApi';
import { useAgentIntegrationStatus } from '../composables/useAgentIntegrationStatus';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import AgentChannelListItem from './AgentChannelListItem.vue';
import AgentChannelSlackSetup from './AgentChannelSlackSetup.vue';
import AgentChannelLinearSetup from './AgentChannelLinearSetup.vue';
import AgentChannelTelegramSetup from './AgentChannelTelegramSetup.vue';
import type { AgentCredentialOption } from './AgentCredentialSelect.vue';

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
const rootStore = useRootStore();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();
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

const SLACK_APP_SETUP_POLL_INTERVAL_MS = 2000;
const SLACK_APP_SETUP_TIMEOUT_MS = 2 * 60 * 1000;

const currentView = ref<ChannelView>(props.view);
const selectedCredentials = ref<Record<string, string>>({});
const credentialsByType = ref<Record<string, AgentCredentialOption[]>>({});
const credentialsLoading = ref(false);
const credentialIdsBeforeNew = ref<Record<string, Set<string>>>({});
const pendingNewCredentialType = ref<string | null>(null);
type ChannelSetupComponent = {
	credentialId: string;
	currentSettings?: AgentIntegrationSettings;
	validationError: string | null;
};

const channelSetupRef = ref<ChannelSetupComponent>();

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

const showFooterActions = computed(
	() =>
		isEditMode.value && selectedChannelType.value !== null && selectedChannelType.value !== 'slack',
);

const currentChannelCredentialId = computed(() => {
	const channelType = selectedChannelType.value;
	if (!channelType) return '';
	return selectedCredentials.value[channelType] || connectedCredentials.value[channelType] || '';
});

const projectForPermissions = computed(() => {
	if (projectsStore.currentProject?.id === props.projectId) return projectsStore.currentProject;
	if (projectsStore.personalProject?.id === props.projectId) return projectsStore.personalProject;
	return projectsStore.myProjects.find((project) => project.id === props.projectId) ?? null;
});

const credentialPermissions = computed(() => {
	const permissions = getResourcePermissions(projectForPermissions.value?.scopes).credential;
	return { ...permissions, create: !!permissions.create };
});

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

async function fetchCredentials(integrations: ChatIntegrationDescriptor[] = catalog.value ?? []) {
	credentialsLoading.value = true;
	try {
		credentialsStore.setCredentials([]);
		const allCredentials = await credentialsStore.fetchAllCredentialsForWorkflow({
			projectId: props.projectId,
		});

		for (const integration of integrations) {
			credentialsByType.value[integration.type] = allCredentials
				.filter((credential) => integration.credentialTypes.includes(credential.type))
				.map((credential) => ({
					id: credential.id,
					name: credential.name,
					typeDisplayName: credentialsStore.getCredentialTypeByName(credential.type)?.displayName,
					homeProject: credential.homeProject,
				}));
		}
	} catch {
		for (const integration of integrations) {
			credentialsByType.value[integration.type] = [];
		}
	} finally {
		credentialsLoading.value = false;
	}
}

function createCredential() {
	const integration = currentIntegration.value;
	const [primaryCredentialType] = integration?.credentialTypes ?? [];
	if (!integration || !primaryCredentialType) return;

	const existing = credentialsByType.value[integration.type] ?? [];
	credentialIdsBeforeNew.value[integration.type] = new Set(
		existing.map((credential) => credential.id),
	);
	pendingNewCredentialType.value = integration.type;
	uiStore.openNewCredential(
		primaryCredentialType,
		false,
		false,
		props.projectId,
		undefined,
		undefined,
		undefined,
		{
			hideAskAssistant: true,
		},
	);
}

function editCredential() {
	const credentialId = currentChannelCredentialId.value;
	if (credentialId) {
		uiStore.openExistingCredential(credentialId, { hideAskAssistant: true });
	}
}

function openSlackAppAuthorizationPopup(installUrl: string): Window | null {
	const parsedUrl = new URL(installUrl);
	if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
		throw new Error('Invalid Slack installation URL');
	}

	const params =
		'scrollbars=no,resizable=yes,status=no,titlebar=no,location=no,toolbar=no,menubar=no,width=500,height=700';
	return window.open(parsedUrl.toString(), 'Slack App Authorization', params);
}

async function waitForSlackAppSetupCompletion(popup: Window | null): Promise<boolean> {
	return await new Promise((resolve) => {
		const oauthChannel = new BroadcastChannel('oauth-callback');
		let pollInFlight = false;
		let settled = false;

		const closePopup = () => {
			if (!popup) return;
			try {
				popup.close();
			} catch {}
		};

		const settle = (success: boolean) => {
			if (settled) return;
			settled = true;
			window.clearInterval(pollInterval);
			window.clearTimeout(timeout);
			oauthChannel.close();
			if (success) closePopup();
			resolve(success);
		};

		const pollStatus = async () => {
			if (pollInFlight || settled) return;
			pollInFlight = true;
			try {
				await fetchStatus(['slack']);
				if (isIntegrationConnected('slack')) settle(true);
			} finally {
				pollInFlight = false;
			}
		};

		const pollInterval = window.setInterval(
			() => void pollStatus(),
			SLACK_APP_SETUP_POLL_INTERVAL_MS,
		);
		const timeout = window.setTimeout(() => settle(false), SLACK_APP_SETUP_TIMEOUT_MS);

		oauthChannel.addEventListener('message', (event: MessageEvent) => {
			settle(event.data === 'success');
		});

		void pollStatus();
	});
}

async function setupSlackApp(appConfigurationToken: string): Promise<boolean> {
	const { installUrl } = await createSlackAgentApp(
		rootStore.restApiContext,
		props.projectId,
		props.agentId,
		appConfigurationToken,
	);
	const popup = openSlackAppAuthorizationPopup(installUrl);
	const connected = await waitForSlackAppSetupCompletion(popup);
	if (!connected) {
		throw new Error('Slack app installation was not completed');
	}

	await fetchStatus(['slack']);
	emit('channel-connected', 'slack');
	emit('agent-changed');
	closeModal();
	return true;
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
	await Promise.all([
		fetchStatus(integrations.map((integration) => integration.type)),
		fetchCredentials(integrations),
	]);

	for (const [channelType, credentialId] of Object.entries(connectedCredentials.value)) {
		if (!selectedCredentials.value[channelType]) {
			selectedCredentials.value[channelType] = credentialId;
		}
	}
}

const credentialModalOpen = computed(
	() => uiStore.isModalActiveById?.[CREDENTIAL_EDIT_MODAL_KEY] ?? false,
);

watch(credentialModalOpen, async (isOpen, wasOpen) => {
	if (!wasOpen || isOpen) return;
	const type = pendingNewCredentialType.value;
	pendingNewCredentialType.value = null;
	await fetchCredentials();
	if (!type) return;

	const before = credentialIdsBeforeNew.value[type];
	const after = credentialsByType.value[type] ?? [];
	const newCredential = before ? after.find((credential) => !before.has(credential.id)) : undefined;
	if (newCredential) {
		selectedCredentials.value[type] = newCredential.id;
	}
	delete credentialIdsBeforeNew.value[type];
});

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
						:credentials="credentialsByType.slack ?? []"
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
						:credentials="credentialsByType[currentIntegration.type] ?? []"
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
						:credentials="credentialsByType[currentIntegration.type] ?? []"
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
						:credentials="credentialsByType.slack ?? []"
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
						:credentials="credentialsByType[currentIntegration.type] ?? []"
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
						:credentials="credentialsByType[currentIntegration.type] ?? []"
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
