<script setup lang="ts">
import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { updatedIconSet, type IconName } from '@n8n/design-system/components/N8nIcon';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { computed, onMounted, ref, watch } from 'vue';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import { useAgentIntegrationStatus } from '../composables/useAgentIntegrationStatus';
import AgentChannelModal, { type ChannelView } from './AgentChannelModal.vue';

const props = withDefaults(
	defineProps<{
		connectedTriggers: string[];
		disabled?: boolean;
		projectId: string;
		agentId: string;
		isPublished: boolean;
		validationIssues?: AgentConfigValidationIssue[];
		simpleChannelSetup?: boolean;
	}>(),
	{
		connectedTriggers: () => [],
		disabled: false,
		validationIssues: () => [],
		simpleChannelSetup: false,
	},
);

const emit = defineEmits<{
	'update:connected-triggers': [triggers: string[]];
	'trigger-added': [{ triggerType: string; triggers: string[] }];
	'agent-changed': [];
}>();

const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
const { connectedCredentials, fetchStatus } = useAgentIntegrationStatus(
	props.projectId,
	props.agentId,
);

const credentialNamesById = ref<Record<string, string>>({});
const channelModalOpen = ref(false);
const channelModalView = ref<ChannelView>('list');

function isIconName(icon: unknown): icon is IconName {
	return typeof icon === 'string' && icon in updatedIconSet;
}

function channelIcon(integrationIcon?: string): IconName {
	if (isIconName(integrationIcon)) return integrationIcon;
	return 'zap';
}

const ISSUE_KEYS: Record<AgentConfigValidationIssue['code'], BaseTextKey> = {
	missing_required: 'agents.builder.validation.issue.missingRequired' as BaseTextKey,
	invalid_value: 'agents.builder.validation.issue.invalidValue' as BaseTextKey,
	missing_credential: 'agents.builder.validation.issue.missingCredential' as BaseTextKey,
	invalid_credential: 'agents.builder.validation.issue.invalidCredential' as BaseTextKey,
	incompatible_credential: 'agents.builder.validation.issue.incompatibleCredential' as BaseTextKey,
	missing_reference: 'agents.builder.validation.issue.missingReference' as BaseTextKey,
	incompatible_reference: 'agents.builder.validation.issue.incompatibleReference' as BaseTextKey,
};

const channelIssueMessages = computed(() => {
	const messages = new Map<string, string[]>();
	for (const issue of props.validationIssues) {
		if (issue.capability.kind !== 'channel' || !issue.capability.id) continue;
		const message = i18n.baseText(ISSUE_KEYS[issue.code], {
			interpolate: { id: issue.capability.id },
		});
		messages.set(issue.capability.id, [
			...new Set([...(messages.get(issue.capability.id) ?? []), message]),
		]);
	}
	return messages;
});

const channelRows = computed(() =>
	props.connectedTriggers.map((channel) => {
		const integration = catalog.value?.find(({ type }) => type === channel);
		const credentialId = connectedCredentials.value[channel];
		const invalidReasons = channelIssueMessages.value.get(channel) ?? [];
		return {
			type: channel,
			label: integration?.label ?? channel,
			icon: channelIcon(integration?.icon),
			credentialName: credentialId ? credentialNamesById.value[credentialId] : undefined,
			invalidReasons,
		};
	}),
);

async function loadChannelDetails() {
	const integrations = await ensureLoaded(props.projectId).catch(() => catalog.value ?? []);
	await fetchStatus(integrations.map(({ type }) => type));

	try {
		credentialsStore.setCredentials([]);
		const credentials = await credentialsStore.fetchAllCredentialsForWorkflow({
			projectId: props.projectId,
		});
		credentialNamesById.value = Object.fromEntries(
			credentials.map((credential) => [credential.id, credential.name]),
		);
	} catch {
		credentialNamesById.value = {};
	}
}

onMounted(() => {
	void loadChannelDetails();
});

watch([() => props.projectId, () => props.agentId], () => {
	void loadChannelDetails();
});

function openChannelModal() {
	channelModalView.value = 'list';
	channelModalOpen.value = true;
}

function openChannelEdit(channelType: string) {
	const hasEditableChannelView = catalog.value?.some(({ type }) => type === channelType) ?? false;
	channelModalView.value = hasEditableChannelView ? (`${channelType}_edit` as ChannelView) : 'list';
	channelModalOpen.value = true;
}

function handleChannelConnected(channelType: string) {
	const channels = Array.from(new Set([...props.connectedTriggers, channelType]));
	emit('update:connected-triggers', channels);
	emit('trigger-added', { triggerType: channelType, triggers: channels });
	void loadChannelDetails();
}

function handleChannelDisconnected(channelType: string) {
	emit(
		'update:connected-triggers',
		props.connectedTriggers.filter((channel) => channel !== channelType),
	);
}

const remainingChannelOptionLabels = computed(() => {
	const remainingChannels = (catalog.value ?? []).filter(
		(channel) => !props.connectedTriggers.includes(channel.type),
	);
	const remainingCount = remainingChannels.length - 3;

	const labels = remainingChannels
		.map((channel) => channel.label)
		.slice(0, 3)
		.join(', ');

	return remainingCount > 0
		? i18n.baseText('agents.builder.triggers.remaining', {
				interpolate: { labels, count: remainingCount },
			})
		: labels;
});
</script>

<template>
	<div
		:class="[$style.row, props.disabled && $style.disabled]"
		:inert="props.disabled || undefined"
	>
		<N8nText size="small" :class="$style.rowLabel">
			{{ i18n.baseText('agents.builder.triggers.title') }}
		</N8nText>
		<div :class="$style.innerRow" :inert="props.disabled || undefined">
			<button
				v-for="channel in channelRows"
				:key="channel.type"
				:class="[
					$style.channelCard,
					channel.invalidReasons.length > 0 && $style.channelCardInvalid,
				]"
				:disabled="props.disabled"
				:aria-invalid="channel.invalidReasons.length > 0"
				:title="channel.invalidReasons.join('\n')"
				@click="openChannelEdit(channel.type)"
			>
				<N8nIcon v-if="channel.icon" :icon="channel.icon" size="large" />
				<div :class="$style.channelCardText">
					<N8nText step="sm" bold>{{ channel.label }}</N8nText>
					<N8nText v-if="channel.credentialName" step="xs" color="text-light">
						{{ channel.credentialName }}
					</N8nText>
					<div v-else :class="$style.credentialnameSkeleton" />
				</div>
			</button>

			<button
				:class="$style.channelCard"
				:disabled="props.disabled"
				data-testid="agent-channels-add-channel"
				@click="openChannelModal"
			>
				<N8nIcon icon="plus" size="xlarge" color="text-light" />
				<div :class="$style.channelCardText">
					<N8nText step="sm" bold>{{ i18n.baseText('agents.builder.triggers.add') }}</N8nText>
					<N8nText step="xs" color="text-light">{{ remainingChannelOptionLabels }}</N8nText>
				</div>
			</button>
		</div>

		<AgentChannelModal
			v-if="channelModalOpen"
			v-model:open="channelModalOpen"
			v-model:view="channelModalView"
			:agent-id="agentId"
			:project-id="projectId"
			:connected-channels="connectedTriggers"
			:is-published="isPublished"
			:simple-setup="simpleChannelSetup"
			@channel-connected="handleChannelConnected"
			@channel-disconnected="handleChannelDisconnected"
			@agent-changed="emit('agent-changed')"
		/>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;
@use '@/app/css/variables' as vars;
@use '@n8n/design-system/css/mixins/motion.scss' as motion;

.row {
	display: flex;
	flex-direction: column;
}

.disabled {
	opacity: 0.5;
}

.rowLabel {
	line-height: var(--height--lg);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.innerRow {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: var(--spacing--xs);
}

.channelCard {
	outline: none;
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: var(--spacing--xs);
	border-radius: var(--radius--xs);
	gap: var(--spacing--xs);
	background-color: var(--background--surface);
	border: var(--border);
	box-shadow: var(--shadow--xs);
	cursor: pointer;

	&:focus-visible {
		@include focus.focus-ring-with-border;
	}

	&:hover {
		background-color: var(--background--hover);
	}
}

.channelCardInvalid {
	border-color: var(--border-color--danger);
}

.channelCardText {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	min-width: 0;
	white-space: nowrap;
}

.credentialnameSkeleton {
	width: calc(var(--height--sm) * 4);
	border-radius: var(--radius);
	height: var(--height--3xs);
	background-color: var(--background--active);

	@include motion.skeleton-pulse;
}
</style>
