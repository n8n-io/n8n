<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';

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
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();

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
	return props.connectedChannels.includes(channelType);
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
		size="xlarge"
		:class="$style.dialog"
		@interact-outside="(e) => e.preventDefault()"
		@update:open="$emit('update:open', $event)"
	>
		<N8nDialogHeader :class="$style.customHeader">
			<N8nButton
				v-if="currentView !== 'list'"
				variant="ghost"
				size="small"
				:icon-only="true"
				:class="$style.backButton"
				@click="goBackToList"
			>
				<template #icon>
					<N8nIcon icon="arrow-left" size="small" />
				</template>
			</N8nButton>
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
				<div :class="$style.channelList">
					<div v-for="integration in catalog" :key="integration.type" :class="$style.channelItem">
						<div :class="$style.iconWrapper">
							<N8nIcon
								:icon="integration.icon ? toIconName(integration.icon) : 'zap'"
								:size="28"
								:class="$style.channelIcon"
							/>
						</div>
						<div :class="$style.content">
							<N8nText :class="$style.name" size="small" color="text-dark">
								{{ integration.label }}
							</N8nText>
							<N8nText :class="$style.description" size="small" color="text-light">
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
							<N8nButton v-else variant="subtle" size="small" @click="goToSetup(integration.type)">
								{{ i18n.baseText('generic.connect') }}
							</N8nButton>
						</div>
					</div>
				</div>
			</div>

			<div v-else-if="isSetupMode" :class="$style.setupView">
				<N8nText size="small" color="text-light">
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
	height: 300px;
	overflow-y: auto;
}

.customHeader {
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--4xs);
	padding-bottom: var(--spacing--md);
	height: var(--height--2xl);
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	text-transform: capitalize;
}

.backButton {
	margin-left: calc(var(--spacing--2xs) * -1);
}

.listView {
	display: flex;
	flex-direction: column;
}

.channelList {
	display: flex;
	flex-direction: column;
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
