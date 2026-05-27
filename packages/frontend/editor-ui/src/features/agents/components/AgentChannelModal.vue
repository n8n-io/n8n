<script setup lang="ts">
import {
	N8nButton,
	N8nIconButton,
	N8nDialog,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';
import { createSlackAgentApp } from '../composables/useAgentApi';
import { useAgentIntegrationStatus } from '../composables/useAgentIntegrationStatus';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import AgentChannelSlackSetup from './AgentChannelSlackSetup.vue';

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
}

const props = defineProps<Props>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	'update:view': [view: ChannelView];
	'channel-connected': [channelType: string];
	'channel-disconnected': [channelType: string];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
const { fetchStatus, isConnected: isIntegrationConnected } = useAgentIntegrationStatus(
	props.projectId,
	props.agentId,
);

const SLACK_APP_SETUP_POLL_INTERVAL_MS = 2000;
const SLACK_APP_SETUP_TIMEOUT_MS = 2 * 60 * 1000;

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

// Backend integration descriptors ship icon names that may include legacy
// aliases; N8nIcon resolves them at runtime but the static IconName union
// doesn't enumerate them.
function toIconName(icon: string): IconName {
	return icon as IconName;
}

const headerText = computed(() => {
	if (currentView.value === 'list') return i18n.baseText('agents.channels.modal.title');
	const channel = selectedChannelType.value;
	if (!channel) return '';
	if (isSetupMode.value) {
		return channel;
	}
	if (isEditMode.value) {
		return i18n.baseText('agents.channels.modal.editTitle', {
			interpolate: { channel },
		});
	}
	return '';
});

function isConnected(channelType: string): boolean {
	return props.connectedChannels.includes(channelType) || isIntegrationConnected(channelType);
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

function closeModal() {
	emit('update:open', false);
}

function openSlackAppAuthorizationPopup(installUrl: string): Window | null {
	const parsedUrl = new URL(installUrl);
	if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
		throw new Error('Invalid Slack installation URL');
	}

	const params =
		'scrollbars=no,resizable=yes,status=no,titlebar=no,location=no,toolbar=no,menubar=no,width=500,height=700,noopener';
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
	return true;
}

function handleDisconnected(channelType: string) {
	emit('channel-disconnected', channelType);
}

watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) {
			void ensureLoaded(props.projectId);
			currentView.value = props.view;
		}
	},
);
</script>

<template>
	<N8nDialog
		:open="open"
		size="2xlarge"
		@interact-outside="(e) => e.preventDefault()"
		@update:open="$emit('update:open', $event)"
	>
		<N8nDialogHeader :class="$style.customHeader">
			<N8nIconButton
				v-if="currentView !== 'list'"
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
		</N8nDialogHeader>

		<div :class="$style.container">
			<div v-if="currentView === 'list'" :class="$style.listView">
				<ul :class="$style.channelList">
					<li v-for="integration in catalog" :key="integration.type" :class="$style.channelItem">
						<div :class="$style.iconWrapper">
							<N8nIcon
								:icon="integration.icon ? toIconName(integration.icon) : 'zap'"
								:size="28"
								:class="$style.channelIcon"
							/>
						</div>
						<div :class="$style.content">
							<N8nText :class="$style.name" size="medium" bold color="text-dark">
								{{ integration.label }}
							</N8nText>
							<N8nText :class="$style.description" size="medium" color="text-light">
								{{
									i18n.baseText('agents.channels.modal.connectDescription', {
										interpolate: { channel: integration.label },
									})
								}}
							</N8nText>
						</div>

						<div :class="$style.channelActions">
							<template v-if="isConnected(integration.type)">
								<N8nButton variant="subtle" size="small" @click="goToEdit(integration.type)">
									{{ i18n.baseText('generic.edit') }}
								</N8nButton>
								<N8nButton
									variant="ghost"
									size="small"
									@click="handleDisconnected(integration.type)"
								>
									{{ i18n.baseText('generic.disconnect') }}
								</N8nButton>
							</template>
							<N8nButton v-else variant="subtle" size="medium" @click="goToSetup(integration.type)">
								{{ i18n.baseText('generic.connect') }}
							</N8nButton>
						</div>
					</li>
				</ul>
			</div>

			<div v-else-if="isSetupMode" :class="$style.setupView">
				<AgentChannelSlackSetup
					v-if="selectedChannelType === 'slack'"
					:connected="isConnected('slack')"
					:setup-slack-app="setupSlackApp"
				/>
				<N8nText v-else size="small" color="text-light">
					{{
						i18n.baseText('agents.channels.modal.setupPlaceholder', {
							interpolate: { channel: selectedChannelType ?? '' },
						})
					}}
				</N8nText>
			</div>

			<div v-else-if="isEditMode" :class="$style.editView">
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText('agents.channels.modal.editPlaceholder', {
							interpolate: { channel: selectedChannelType ?? '' },
						})
					}}
				</N8nText>
			</div>
		</div>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="ghost" size="medium" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
			</div>
		</template>
	</N8nDialog>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	min-height: var(--height--5xl);
	aspect-ratio: 4/3;
	overflow-y: auto;
	scrollbar-width: thin;
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

.channelItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding-block: var(--spacing--sm);
}

.iconWrapper {
	flex-shrink: 0;
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.channelIcon {
	color: var(--icon-color--strong);
}

.content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.name {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
}

.description {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
}

.channelActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.setupView,
.editView {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--md) 0;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
