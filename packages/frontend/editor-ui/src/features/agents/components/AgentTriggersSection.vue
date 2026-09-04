<script setup lang="ts">
import type { AgentConfigValidationIssue, AgentJsonTaskConfig } from '@n8n/api-types';
import { updatedIconSet, type IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { agentsEventBus } from '../agents.eventBus';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import { useAgentIntegrationStatus } from '../composables/useAgentIntegrationStatus';
import AgentChannelModal, { type ChannelView } from './AgentChannelModal.vue';
import AgentChipButton from './AgentChipButton.vue';
import AgentChipRow from './AgentChipRow.vue';
import AgentSchedulesRow from './AgentSchedulesRow.vue';

const props = withDefaults(
	defineProps<{
		connectedTriggers: string[];
		disabled?: boolean;
		projectId: string;
		agentId: string;
		isPublished?: boolean;
		validationIssues?: AgentConfigValidationIssue[];
		simpleChannelSetup?: boolean;
		taskRefs?: AgentJsonTaskConfig[];
		reloadKey?: number;
		/** No agent row exists yet — nothing can be connected to it. */
		agentUnsaved?: boolean;
		ensureAgentPersisted?: () => Promise<void>;
	}>(),
	{
		connectedTriggers: () => [],
		disabled: false,
		isPublished: false,
		validationIssues: () => [],
		simpleChannelSetup: false,
		taskRefs: () => [],
		ensureAgentPersisted: undefined,
	},
);

const emit = defineEmits<{
	'update:connected-triggers': [triggers: string[]];
	'trigger-added': [{ triggerType: string; triggers: string[] }];
	'toggle-task': [payload: { id: string; enabled: boolean }];
	'tasks-changed': [];
	'agent-changed': [];
}>();

const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
const { connectedCredentials, runtimeErrors, hasRuntimeError, fetchStatus } =
	useAgentIntegrationStatus(props.projectId, props.agentId);

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

function channelRuntimeErrorMessage(channel: string): string {
	return runtimeErrors.value[channel] || i18n.baseText('agents.channels.modal.notRunning.tooltip');
}

const channelRows = computed(() =>
	props.connectedTriggers.map((channel) => {
		const integration = catalog.value?.find(({ type }) => type === channel);
		const credentialId = connectedCredentials.value[channel];
		// A channel that is configured correctly but failed to start is just as
		// broken from here as a misconfigured one, so it uses the same affordance.
		const invalidReasons = [
			...(channelIssueMessages.value.get(channel) ?? []),
			...(hasRuntimeError(channel) ? [channelRuntimeErrorMessage(channel)] : []),
		];
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
	// Connection status is per agent, so there is nothing to ask for until one
	// exists. The catalog and credential list below are project-scoped and still
	// load, so the channel picker works on an unsaved agent.
	if (!props.agentUnsaved) {
		await fetchStatus(integrations.map(({ type }) => type));
	}

	try {
		credentialsStore.setCredentials([]);
		const credentials = await credentialsStore.fetchUsableCredentials({
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
	agentsEventBus.on('agentUpdated', onExternalAgentUpdated);
});

function onChannelSetup(event: { agentId?: string; source?: string } | undefined) {
	if (event?.agentId !== props.agentId || event.source !== 'channel-setup-card') return;
	void loadChannelDetails();
}

agentsEventBus.on('agentUpdated', onChannelSetup);

onBeforeUnmount(() => agentsEventBus.off('agentUpdated', onChannelSetup));

watch([() => props.projectId, () => props.agentId], () => {
	void loadChannelDetails();
});

// After IAI builds an agent we shold refetch credentials and channels
function onExternalAgentUpdated(event?: { agentId?: string; source?: string }) {
	if (event?.source === 'agent-builder') return;
	if (event?.agentId && event.agentId !== props.agentId) return;
	void loadChannelDetails();
}

onBeforeUnmount(() => {
	agentsEventBus.off('agentUpdated', onExternalAgentUpdated);
});

function openChannelModal() {
	channelModalView.value = 'list';
	channelModalOpen.value = true;
}

function openChannelEdit(channelType: string) {
	const hasEditableChannelView = catalog.value?.some(({ type }) => type === channelType) ?? false;
	channelModalView.value = hasEditableChannelView ? `${channelType}_edit` : 'list';
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
</script>

<template>
	<div
		:class="[$style.row, props.disabled && $style.disabled]"
		:inert="props.disabled || undefined"
	>
		<AgentChipRow
			:label="i18n.baseText('agents.builder.channel.title')"
			:item-count="channelRows.length"
			:add-label="i18n.baseText('agents.builder.channel.add')"
			add-button-test-id="agent-channels-add-channel"
			:disabled="props.disabled"
			@add="openChannelModal"
		>
			<AgentChipButton
				v-for="channel in channelRows"
				:key="channel.type"
				:icon="channel.icon"
				:invalid="channel.invalidReasons.length > 0"
				:invalid-reasons="channel.invalidReasons"
				:disabled="props.disabled"
				:class="$style.channelChip"
				@click="openChannelEdit(channel.type)"
			>
				{{ channel.label }}
			</AgentChipButton>
		</AgentChipRow>

		<AgentSchedulesRow
			:task-refs="props.taskRefs"
			:disabled="props.disabled"
			:project-id="props.projectId"
			:agent-id="props.agentId"
			:is-published="props.isPublished"
			:reload-key="props.reloadKey"
			:agent-unsaved="props.agentUnsaved"
			:validation-issues="props.validationIssues"
			@toggle-task="emit('toggle-task', $event)"
			@tasks-changed="emit('tasks-changed')"
		/>

		<AgentChannelModal
			v-if="channelModalOpen"
			v-model:open="channelModalOpen"
			v-model:view="channelModalView"
			:agent-id="agentId"
			:project-id="projectId"
			:is-published="isPublished"
			:simple-setup="simpleChannelSetup"
			:ensure-agent-persisted="ensureAgentPersisted"
			@channel-connected="handleChannelConnected"
			@channel-disconnected="handleChannelDisconnected"
			@agent-changed="emit('agent-changed')"
		/>
	</div>
</template>

<style module lang="scss">
.row {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.disabled {
	opacity: 0.5;
}

.channelChip {
	max-width: min(var(--spacing--5xl), 100%);
}
</style>
