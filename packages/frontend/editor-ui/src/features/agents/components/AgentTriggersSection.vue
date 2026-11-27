<script setup lang="ts">
import {
	N8N_CHAT_INTEGRATION_TYPE,
	WEBHOOK_INTEGRATION_TYPE,
	webhookAuthentication,
} from '@n8n/api-types';
import type {
	AgentConfigValidationIssue,
	AgentJsonTaskConfig,
	TeamsFileAccessConsentState,
} from '@n8n/api-types';
import { updatedIconSet, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { computed, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStorage } from '@n8n/composables/useStorage';
import { agentsEventBus } from '../agents.eventBus';
import { AGENT_SCHEDULE_VIEW_TYPE, N8N_CHAT_HINT_DISMISSED_STORAGE_KEYS } from '../constants';
import {
	agentChannelPlatforms,
	createAgentChannelRuntime,
	getAgentChannelPlatform,
} from '../channels/registry';
import { useAgentChannelRemoval } from '../composables/useAgentChannelRemoval';
import { useN8nChatChannel } from '../channels/n8nChat/useN8nChatChannel';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import { useAgentIntegrationStatus } from '../composables/useAgentIntegrationStatus';
import {
	MENTION_CHANNEL_TYPES,
	useAgentIntegrationAccounts,
} from '../composables/useAgentIntegrationAccounts';
import { useAgentTriggerRedesignFlag } from '../composables/useAgentTriggerRedesignFlag';
import { resolveAgentValidationIssueMessageKey } from '../utils/agentValidationIssueMessages';
import type { AgentTaskRow } from '../composables/useAgentTasks';
import AgentChannelModal, { type ChannelView } from './AgentChannelModal.vue';
import AgentChipButton from './AgentChipButton.vue';
import { metaTitleKey, presentWhatsAppMetaState } from '../channels/whatsapp/metaStatus';
import { useWhatsAppMetaStatus } from '../channels/whatsapp/useWhatsAppMetaStatus';
import AgentChipRow from './AgentChipRow.vue';
import AgentItemContextMenu from './AgentItemContextMenu.vue';
import AgentSchedulesRow from './AgentSchedulesRow.vue';
import AgentTriggersList from './AgentTriggersList.vue';
import type { AgentTriggerChannelItem } from './AgentTriggersList.types';
import N8nChatHintPopover from './N8nChatHintPopover.vue';
import { fileAccessJustApproved } from '../channels/teams/fileAccessConsent';

const props = withDefaults(
	defineProps<{
		connectedTriggers: string[];
		disabled?: boolean;
		projectId: string;
		agentId: string;
		isPublished?: boolean;
		isRunnable?: boolean;
		validationIssues?: AgentConfigValidationIssue[];
		previewDisabledReason?: string;
		simpleChannelSetup?: boolean;
		taskRefs?: AgentJsonTaskConfig[];
		reloadKey?: number;
		/** No agent row exists yet — nothing can be connected to it. */
		agentUnsaved?: boolean;
		ensureAgentPersisted?: () => Promise<void>;
		/** n8n Chat's saved description, forwarded to the channel modal. */
		savedDescription?: string;
		/** Persists n8n Chat's description, forwarded to the channel modal. */
		saveDescription?: (description: string) => Promise<void>;
	}>(),
	{
		connectedTriggers: () => [],
		disabled: false,
		isPublished: false,
		isRunnable: false,
		validationIssues: () => [],
		simpleChannelSetup: false,
		taskRefs: () => [],
		ensureAgentPersisted: undefined,
	},
);

const emit = defineEmits<{
	'update:connected-triggers': [triggers: string[]];
	'trigger-added': [{ triggerType: string; triggers: string[] }];
	'trigger-removed': [{ triggerType: string; triggers: string[] }];
	'toggle-task': [payload: { id: string; enabled: boolean }];
	'tasks-changed': [];
	'preview-task': [instructions: string];
	'agent-changed': [];
}>();

const i18n = useI18n();
const isTriggerRedesignEnabled = useAgentTriggerRedesignFlag();
const credentialsStore = useCredentialsStore();
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
const integrationStatus = useAgentIntegrationStatus(props.projectId, props.agentId);
const { connectedCredentials, integrationSettings, runtimeErrors, hasRuntimeError, fetchStatus } =
	integrationStatus;

// The chip reads Meta's status once, and again when the channel modal closes.
// The modal polls on its own while it is open.
const { status: whatsAppMetaStatus, refresh: refreshWhatsAppMetaStatus } = useWhatsAppMetaStatus(
	toRef(props, 'projectId'),
	toRef(props, 'agentId'),
	computed(() =>
		props.connectedTriggers.includes('whatsapp') ? connectedCredentials.value.whatsapp : undefined,
	),
	{ poll: false },
);

/**
 * Meta's review state for a channel, as the headline and how serious it is. Only
 * WhatsApp has one. The chip shows an error for the same states that show a red callout.
 */
function channelMetaNotice(channel: string) {
	if (channel !== 'whatsapp' || !whatsAppMetaStatus.value) return undefined;
	const presentation = presentWhatsAppMetaState(whatsAppMetaStatus.value.state);
	if (!presentation) return undefined;
	return {
		isError: presentation.theme === 'danger',
		message: i18n.baseText(metaTitleKey(presentation, whatsAppMetaStatus.value), {
			interpolate: {
				number: whatsAppMetaStatus.value.displayPhoneNumber ?? '',
				name: whatsAppMetaStatus.value.displayName ?? '',
			},
		}),
	};
}

const runtimeContext = {
	projectId: computed(() => props.projectId),
	agentId: computed(() => props.agentId),
	credentialModalOpen: ref(false),
	fetchStatus,
	isConnected: integrationStatus.isConnected,
	isConfigured: integrationStatus.isConfigured,
};
const runtimes = Object.fromEntries(
	Object.values(agentChannelPlatforms).map((platform) => [
		platform.type,
		createAgentChannelRuntime(platform, {
			...runtimeContext,
			selectedCredentialId: computed(() => connectedCredentials.value[platform.type] ?? ''),
		}),
	]),
);
const fallbackRuntime = createAgentChannelRuntime(getAgentChannelPlatform('unknown'), {
	...runtimeContext,
	selectedCredentialId: ref(''),
});
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
	disabled: () => props.disabled,
	status: integrationStatus,
	runtimeFor: async (channelType) => {
		const runtime = runtimes[channelType] ?? fallbackRuntime;
		await runtime.load();
		return runtime;
	},
	onRemoved: (channelType) => {
		if (!integrationStatus.isConfigured(channelType)) handleChannelDisconnected(channelType);
		emit('agent-changed');
	},
});
const { isEnabled: isN8nChatEnabled, withN8nChat } = useN8nChatChannel();
const channelList = computed(() => withN8nChat(catalog.value ?? []));

const credentialNamesById = ref<Record<string, string>>({});
const { getAccount, loadAccount } = useAgentIntegrationAccounts();

/**
 * Says how users reach the agent. The platform name shows on its own line, so
 * it is not part of this text. Falls back to less detail when the platform does not say.
 */
function channelMentionLabel(channel: string): string | undefined {
	if (!MENTION_CHANNEL_TYPES.includes(channel)) return undefined;
	const account = getAccount({
		agentId: props.agentId,
		type: channel,
		credentialId: connectedCredentials.value[channel],
	});
	const bot = account?.botName;
	const workspaces = account?.workspaceNames ?? [];
	if (!bot) {
		return i18n.baseText('agents.builder.triggers.channel.mention');
	}
	if (account?.hasMoreWorkspaces) {
		return i18n.baseText('agents.builder.triggers.channel.mention.botInManyServers', {
			interpolate: { bot, count: String(workspaces.length) },
		});
	}
	if (workspaces.length === 1) {
		return i18n.baseText('agents.builder.triggers.channel.mention.botInWorkspace', {
			interpolate: { bot, workspace: workspaces[0] },
		});
	}
	if (workspaces.length > 1) {
		return i18n.baseText('agents.builder.triggers.channel.mention.botInServers', {
			interpolate: { bot, count: String(workspaces.length) },
		});
	}
	return i18n.baseText('agents.builder.triggers.channel.mention.bot', {
		interpolate: { bot },
	});
}

watch(
	connectedCredentials,
	(credentials) => {
		if (props.agentUnsaved) return;
		for (const [type, credentialId] of Object.entries(credentials)) {
			void loadAccount(props.projectId, { agentId: props.agentId, type, credentialId });
		}
	},
	{ immediate: true, deep: true },
);
const channelModalOpen = ref(false);

watch(channelModalOpen, (open, wasOpen) => {
	if (wasOpen && !open) refreshWhatsAppMetaStatus();
});
const channelModalView = ref<ChannelView>('list');
/** The task that the channel modal edits. Only set with the trigger redesign flag. */
const channelModalTask = ref<AgentTaskRow | null>(null);
const triggersListRef = ref<InstanceType<typeof AgentTriggersList>>();

function openTaskEdit(task: AgentTaskRow) {
	channelModalTask.value = task;
	channelModalView.value = `${AGENT_SCHEDULE_VIEW_TYPE}_edit`;
	channelModalOpen.value = true;
}

function handleTasksChanged() {
	void triggersListRef.value?.reloadTasks();
	emit('tasks-changed');
}

function isIconName(icon: unknown): icon is IconName {
	return typeof icon === 'string' && icon in updatedIconSet;
}

function channelIcon(integrationIcon?: string): IconName {
	if (isIconName(integrationIcon)) return integrationIcon;
	return 'zap';
}

const channelIssueMessages = computed(() => {
	const messages = new Map<string, string[]>();
	for (const issue of props.validationIssues) {
		if (issue.capability.kind !== 'channel' || !issue.capability.id) continue;
		const message = i18n.baseText(resolveAgentValidationIssueMessageKey(issue), {
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

// n8n Chat always shows, even when it is not in the agent config.
const channelRows = computed<AgentTriggerChannelItem[]>(() =>
	[
		...(isN8nChatEnabled.value ? [N8N_CHAT_INTEGRATION_TYPE] : []),
		...props.connectedTriggers.filter((channel) => channel !== N8N_CHAT_INTEGRATION_TYPE),
	].map((channel) => {
		const integration = channelList.value.find(({ type }) => type === channel);
		const credentialId = connectedCredentials.value[channel];
		// A channel that is configured correctly but failed to start is just as
		// broken from here as a misconfigured one, so it uses the same affordance.
		const metaNotice = channelMetaNotice(channel);
		const invalidReasons = [
			...(channelIssueMessages.value.get(channel) ?? []),
			...(hasRuntimeError(channel) ? [channelRuntimeErrorMessage(channel)] : []),
			...(metaNotice?.isError ? [metaNotice.message] : []),
		];
		const label = integration?.label ?? channel;
		return {
			type: channel,
			label,
			mentionLabel: channelMentionLabel(channel),
			icon: channelIcon(integration?.icon),
			credentialName: credentialId ? credentialNamesById.value[credentialId] : undefined,
			invalidReasons,
			// A red callout in the channel settings shows a red cross on the chip too.
			invalidIcon: metaNotice?.isError ? ('circle-x' as const) : undefined,
			warningReasons: [
				...(metaNotice && !metaNotice.isError ? [metaNotice.message] : []),
				...(channel === WEBHOOK_INTEGRATION_TYPE &&
				webhookAuthentication({ settings: integrationSettings.value[channel] }) === 'none'
					? [i18n.baseText('agents.channels.webhook.authentication.noneNotice')]
					: []),
			],
			// The status fetch can confirm n8n Chat before `connectedTriggers` does.
			connected:
				props.connectedTriggers.includes(channel) || integrationStatus.isConfigured(channel),
		};
	}),
);

async function loadChannelDetails() {
	const integrations = await ensureLoaded(props.projectId).catch(() => catalog.value ?? []);
	// Connection status is per agent, so there is nothing to ask for until one
	// exists. The catalog and credential list below are project-scoped and still
	// load, so the channel picker works on an unsaved agent.
	if (!props.agentUnsaved) {
		await fetchStatus(withN8nChat(integrations).map(({ type }) => type));
	}
	openTeamsAfterFileAccessConsent(integrations);

	try {
		const credentials = await credentialsStore.fetchUsableCredentials({
			projectId: props.projectId,
			forAgent: true,
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

watch(
	[toRef(props, 'projectId'), toRef(props, 'agentId'), toRef(props, 'agentUnsaved')],
	loadChannelDetails,
);

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
	channelModalTask.value = null;
	channelModalView.value = 'list';
	channelModalOpen.value = true;
}

function openChannelEdit(channelType: string, connected: boolean) {
	const hasEditableChannelView = channelList.value.some(({ type }) => type === channelType);
	const mode = connected ? 'edit' : 'setup';
	channelModalView.value = hasEditableChannelView ? `${channelType}_${mode}` : 'list';
	channelModalOpen.value = true;
}

// The sidebar "New chat" hint shows on a user's first visit; this one follows it, never both at once.
const newChatHintStorage = useStorage(N8N_CHAT_HINT_DISMISSED_STORAGE_KEYS.new_chat_sidebar);
const newChatHintDismissed = computed(() => newChatHintStorage.value === 'true');

function handleChannelConnected(channelType: string) {
	const channels = Array.from(new Set([...props.connectedTriggers, channelType]));
	emit('update:connected-triggers', channels);
	emit('trigger-added', { triggerType: channelType, triggers: channels });
	void loadChannelDetails();
}

const FILE_ACCESS_CONSENT_STATE: TeamsFileAccessConsentState = 'teams-file-access';
const route = useRoute();
const router = useRouter();
const toast = useToast();

/**
 * Microsoft returns an administrator here after the Teams file access consent,
 * with `state` passed back unchanged. The Teams settings show the result. The
 * other query values are Microsoft's and only cleared, never shown. Runs after
 * the status fetch: the agent's channels can load later than this page, and
 * until then a connected Teams reads as not connected and opens the setup.
 */
function openTeamsAfterFileAccessConsent(integrations: Array<{ type: string }>) {
	// Optional: the section also renders outside the router, as in tests.
	if (route?.query.state !== FILE_ACCESS_CONSENT_STATE) return;
	if (!integrations.some(({ type }) => type === 'teams')) return;
	const { state, admin_consent, tenant, error, error_description, error_subcode, ...query } =
		route.query;
	void router.replace({ query });
	fileAccessJustApproved.value = admin_consent === 'True';
	// Microsoft's own error text arrives in the address, so only fixed text is shown.
	if (error) {
		toast.showMessage({
			type: 'error',
			title: i18n.baseText('agents.channels.teams.fileAccessConsentFailed'),
		});
	}
	openChannelEdit(
		'teams',
		props.connectedTriggers.includes('teams') || integrationStatus.isConfigured('teams'),
	);
}

defineExpose({ openChannelModal });

function handleChannelDisconnected(channelType: string) {
	const channels = props.connectedTriggers.filter((channel) => channel !== channelType);
	emit('update:connected-triggers', channels);
	emit('trigger-removed', { triggerType: channelType, triggers: channels });
}
</script>

<template>
	<div
		:class="[$style.row, props.disabled && $style.disabled]"
		:inert="props.disabled || undefined"
	>
		<AgentTriggersList
			v-if="isTriggerRedesignEnabled"
			ref="triggersListRef"
			:channels="channelRows"
			:project-id="props.projectId"
			:agent-id="props.agentId"
			:disabled="props.disabled"
			:removing-channel="removingChannel"
			:task-refs="props.taskRefs"
			:is-published="props.isPublished"
			:is-runnable="props.isRunnable"
			:reload-key="props.reloadKey"
			:agent-unsaved="props.agentUnsaved"
			:ensure-agent-persisted="props.ensureAgentPersisted"
			:validation-issues="props.validationIssues"
			:preview-disabled-reason="props.previewDisabledReason"
			@open-channel="openChannelEdit($event.type, $event.connected)"
			@add-channel="openChannelModal"
			@open-task="openTaskEdit"
			@toggle-task="emit('toggle-task', $event)"
			@tasks-changed="emit('tasks-changed')"
			@preview-task="emit('preview-task', $event)"
		/>

		<AgentChipRow
			v-else
			:label="i18n.baseText('agents.builder.channel.title')"
			:item-count="channelRows.length"
			:add-label="i18n.baseText('agents.builder.channel.add')"
			add-button-test-id="agent-channels-add-channel"
			:disabled="props.disabled"
			@add="openChannelModal"
		>
			<AgentItemContextMenu
				v-for="channel in channelRows"
				:key="channel.type"
				:disabled="props.disabled || removingChannel || !channel.connected"
				@remove="requestDisconnect(channel.type, connectedCredentials[channel.type] ?? '')"
			>
				<N8nChatHintPopover
					hint="channel_chip"
					:active="
						channel.type === N8N_CHAT_INTEGRATION_TYPE &&
						channel.connected &&
						!channelModalOpen &&
						!props.disabled &&
						newChatHintDismissed
					"
					:title="i18n.baseText('agents.n8nChatHint.channelAdded.title')"
					:body="i18n.baseText('agents.n8nChatHint.channelAdded.body')"
					:agent-id="props.agentId"
				>
					<AgentChipButton
						:icon="channel.icon"
						:deactivated="!channel.connected"
						:invalid="channel.invalidReasons.length > 0"
						:invalid-reasons="channel.invalidReasons"
						:invalid-icon="channel.invalidIcon"
						:warning="channel.warningReasons.length > 0"
						:warning-reasons="channel.warningReasons"
						:disabled="props.disabled || removingChannel"
						:class="$style.channelChip"
						@click="openChannelEdit(channel.type, channel.connected)"
					>
						{{ channel.label }}
					</AgentChipButton>
				</N8nChatHintPopover>
			</AgentItemContextMenu>
		</AgentChipRow>

		<AgentSchedulesRow
			v-if="!isTriggerRedesignEnabled"
			:preview-disabled-reason="props.previewDisabledReason"
			:task-refs="props.taskRefs"
			:disabled="props.disabled"
			:project-id="props.projectId"
			:agent-id="props.agentId"
			:is-published="props.isPublished"
			:is-runnable="props.isRunnable"
			:reload-key="props.reloadKey"
			:agent-unsaved="props.agentUnsaved"
			:ensure-agent-persisted="props.ensureAgentPersisted"
			:validation-issues="props.validationIssues"
			@toggle-task="emit('toggle-task', $event)"
			@tasks-changed="emit('tasks-changed')"
			@preview-task="emit('preview-task', $event)"
		/>

		<AgentChannelModal
			v-if="channelModalOpen"
			v-model:open="channelModalOpen"
			v-model:view="channelModalView"
			:agent-id="agentId"
			:project-id="projectId"
			:is-published="isPublished"
			:disabled="props.disabled"
			:simple-setup="simpleChannelSetup"
			:ensure-agent-persisted="ensureAgentPersisted"
			:saved-description="savedDescription"
			:save-description="saveDescription"
			:show-schedule="isTriggerRedesignEnabled"
			:task="channelModalTask"
			:task-enabled="channelModalTask?.enabled ?? true"
			:is-runnable="isRunnable"
			:validation-issues="validationIssues"
			:preview-disabled-reason="previewDisabledReason"
			@tasks-changed="handleTasksChanged"
			@preview-task="emit('preview-task', $event)"
			@channel-connected="handleChannelConnected"
			@channel-disconnected="handleChannelDisconnected"
			@agent-changed="emit('agent-changed')"
		/>

		<component
			:is="disconnectConfirmationComponent"
			v-if="pendingDisconnect && disconnectConfirmationComponent"
			:open="true"
			:loading="removingChannel"
			@cancel="pendingDisconnect = null"
			@confirm="confirmDisconnect"
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
