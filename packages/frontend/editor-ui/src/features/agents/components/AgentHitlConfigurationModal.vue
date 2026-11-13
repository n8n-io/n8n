<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useElementSize } from '@vueuse/core';
import { v4 as uuid } from 'uuid';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import {
	N8nButton,
	N8nCombobox2,
	N8nIcon,
	N8nIconButton,
	type ComboboxItem,
	N8nInput,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSelect2,
	N8nSwitch,
	type SelectOptionBase,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	AGENT_DECISION_TRIGGER_NODE_TYPE,
	type AgentHitlChannelDescriptor,
	type AgentHitlConfiguration,
	type AgentHitlOption,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { VIEWS } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { getAgentHitlChannels, getAgentHitlChannelOptions } from '../composables/useAgentApi';
import type { AgentHitlContext } from './agent-hitl.types';
import AgentModal from './modals/AgentModal.vue';
import AgentFormSettingRow from './AgentFormSettingRow.vue';
import AgentHitlDestinationPicker from './AgentHitlDestinationPicker.vue';
import AgentHitlToolsSelect from './AgentHitlToolsSelect.vue';
import { hitlConfigurationToolKeys } from '../utils/hitlConfiguration';

const props = defineProps<{
	projectId: string;
	context: AgentHitlContext;
	configuration?: AgentHitlConfiguration;
	nextNumber: number;
	hideRemove?: boolean;
}>();
const emit = defineEmits<{
	save: [configuration: AgentHitlConfiguration, toolKeys?: string[]];
	close: [];
	remove: [];
}>();
const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const rootStore = useRootStore();
const workflowsStore = useWorkflowsStore();
const workflowList = useWorkflowsListStore();
const customName = ref(props.configuration?.nameOverridden ? props.configuration.name : '');
const expirySeconds = ref<AgentHitlConfiguration['expirySeconds'] | 'none'>(
	props.configuration?.expirySeconds ?? 'none',
);
const method = ref<'workflow' | 'channel'>(props.configuration?.method ?? 'workflow');
const workflowId = ref(
	props.configuration?.method === 'workflow' ? props.configuration.workflowId : '',
);
const workflowHref = computed(() =>
	workflowId.value
		? router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId: workflowId.value } }).href
		: undefined,
);
const workflows = ref<Array<{ id: string; name: string }>>([]);
const channels = ref<AgentHitlChannelDescriptor[]>([]);
const channelKey = ref(
	props.configuration?.method === 'channel'
		? `${props.configuration.channel}:${props.configuration.credentialId}`
		: '',
);
const channel = computed(() =>
	channels.value.find((item) => `${item.channel}:${item.credentialId}` === channelKey.value),
);
function channelLabel(item: AgentHitlChannelDescriptor) {
	const connections = channels.value.filter((other) => other.channel === item.channel);
	return connections.length > 1 ? `${item.label} ${connections.indexOf(item) + 1}` : item.label;
}
const channelItems = computed<SelectOptionBase[]>(() =>
	channels.value.map((item) => ({
		value: `${item.channel}:${item.credentialId}`,
		label: channelLabel(item),
		icon: item.channel,
	})),
);
function updateMethod(value: boolean) {
	if (value && !channels.value.length) return;
	method.value = value ? 'channel' : 'workflow';
}
function updateExpiry(value: unknown) {
	if (typeof value !== 'string') return;
	const seconds = value === 'none' ? 'none' : Number(value);
	if (seconds === 'none' || seconds === 3600 || seconds === 86400 || seconds === 604800)
		expirySeconds.value = seconds;
}
function updateChannel(value: unknown) {
	channelKey.value = typeof value === 'string' ? value : '';
}
const recipient = ref<AgentHitlOption | undefined>(
	props.configuration?.method === 'channel'
		? {
				id: props.configuration.recipient.id,
				kind: props.configuration.recipient.kind,
				name: props.configuration.recipient.name ?? props.configuration.recipient.id,
			}
		: undefined,
);
const guild = ref<AgentHitlOption | undefined>(
	props.configuration?.method === 'channel' && props.configuration.guildId
		? { id: props.configuration.guildId, name: props.configuration.guildId }
		: undefined,
);
const telegramId = ref(
	props.configuration?.method === 'channel' && props.configuration.channel === 'telegram'
		? props.configuration.recipient.id
		: '',
);
const generatedName = computed(() => {
	const defaultName = i18n.baseText('agents.hitl.defaultName', {
		interpolate: { number: String(props.nextNumber) },
	});
	if (method.value === 'workflow') {
		return (
			workflows.value.find((workflow) => workflow.id === workflowId.value)?.name ??
			(props.configuration?.method === 'workflow' &&
			props.configuration.workflowId === workflowId.value
				? props.configuration.name
				: defaultName)
		);
	}
	const destination =
		channel.value?.channel === 'telegram' ? telegramId.value : recipient.value?.name;
	if (!channel.value || !destination) return defaultName;
	const destinationName =
		recipient.value?.kind === 'channel' && !destination.startsWith('#')
			? `#${destination}`
			: destination;
	return i18n.baseText('agents.hitl.channelName', {
		interpolate: { channel: channelLabel(channel.value), destination: destinationName },
	});
});
const name = computed({
	get: () => (customName.value.trim() ? customName.value : generatedName.value),
	set: (value: string) => {
		customName.value = value;
	},
});
const loading = ref(false);
const creating = ref(false);
const destinationValid = computed(() =>
	method.value === 'workflow'
		? Boolean(workflowId.value)
		: Boolean(
				channel.value &&
					(channel.value.channel === 'telegram'
						? /^\d+$/.test(telegramId.value)
						: recipient.value?.kind && (channel.value.channel !== 'discord' || guild.value)),
			),
);
const saveDisabledReason = computed(() => {
	if (!name.value.trim()) return i18n.baseText('agents.hitl.nameRequired');
	if (!destinationValid.value)
		return i18n.baseText(
			method.value === 'workflow' ? 'agents.hitl.workflowRequired' : 'agents.hitl.channelRequired',
		);
	return '';
});
const workflowSelectOpen = ref(false);
const selectedToolKeys = ref(
	hitlConfigurationToolKeys(props.context.getConfig(), props.configuration?.id),
);
const toolSelectionChanged = ref(false);
const workflowItems = computed<ComboboxItem[]>(() => [
	{
		value: '__create_hitl_workflow__',
		label: i18n.baseText('generic.create.workflow'),
		icon: 'plus',
		onSelect: (event: Event) => {
			event.preventDefault();
			workflowSelectOpen.value = false;
			void createWorkflow();
		},
	},
	{ type: 'separator' },
	...workflows.value.map((workflow) => ({
		value: workflow.id,
		label: workflow.name,
		icon: 'workflow' as const,
	})),
]);
function updateWorkflow(value: unknown) {
	workflowId.value = typeof value === 'string' ? value : '';
}
function updateTools(value: string[]) {
	selectedToolKeys.value = value;
	toolSelectionChanged.value = true;
}
function saveConfiguration(configuration: AgentHitlConfiguration) {
	if (toolSelectionChanged.value) emit('save', configuration, selectedToolKeys.value);
	else emit('save', configuration);
}
watch(channelKey, () => {
	recipient.value = undefined;
	guild.value = undefined;
	telegramId.value = '';
});
watch(guild, () => {
	recipient.value = undefined;
});

async function load() {
	loading.value = true;
	const [workflowResult, channelResult] = await Promise.allSettled([
		workflowList.searchWorkflows({
			projectId: props.projectId,
			triggerNodeTypes: [AGENT_DECISION_TRIGGER_NODE_TYPE],
			isArchived: false,
			select: ['id', 'name'],
		}),
		props.context.agentId
			? getAgentHitlChannels(rootStore.restApiContext, props.projectId, props.context.agentId)
			: Promise.resolve([]),
	]);
	if (workflowResult.status === 'fulfilled') workflows.value = workflowResult.value;
	else toast.showError(workflowResult.reason, i18n.baseText('agents.hitl.workflowLoadFailed'));
	if (channelResult.status === 'fulfilled') channels.value = channelResult.value;
	else toast.showError(channelResult.reason, i18n.baseText('agents.hitl.loadFailed'));
	loading.value = false;
}

onMounted(load);
async function createWorkflow() {
	if (creating.value) return;
	creating.value = true;
	try {
		const triggerId = uuid();
		const agentName = props.context.getConfig()?.name ?? i18n.baseText('agents.hitl.unnamedAgent');
		const existing = await workflowList.searchWorkflows({
			projectId: props.projectId,
			select: ['name'],
		});
		let workflowNumber = 1;
		const workflowName = (value: number) =>
			i18n.baseText('agents.hitl.workflowDefaultName', {
				interpolate: { agent: agentName, number: String(value) },
			});
		while (existing.some((workflow) => workflow.name === workflowName(workflowNumber)))
			workflowNumber++;
		const workflow = await workflowsStore.createNewWorkflow({
			name: workflowName(workflowNumber),
			projectId: props.projectId,
			nodes: [
				{
					id: triggerId,
					name: 'Agent review',
					type: AGENT_DECISION_TRIGGER_NODE_TYPE,
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: uuid(),
					name: 'Respond to agent review',
					type: 'n8n-nodes-base.agentDecisionResponse',
					typeVersion: 1,
					position: [480, 0],
					parameters: { approved: false },
				},
			],
			connections: {
				'Agent review': {
					main: [[{ node: 'Respond to agent review', type: 'main', index: 0 }]],
				},
			},
		});
		workflows.value = [...workflows.value, { id: workflow.id, name: workflow.name }];
		workflowId.value = workflow.id;
		const { href } = router.resolve({
			name: VIEWS.WORKFLOW,
			params: { workflowId: workflow.id, nodeId: triggerId },
		});
		window.open(href, '_blank');
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.hitl.createFailed'));
	} finally {
		creating.value = false;
	}
}
async function loadOptions(field: 'guild' | 'recipient', query: string, cursor?: string) {
	if (!channel.value || !props.context.agentId) return { options: [] };
	return await getAgentHitlChannelOptions(
		rootStore.restApiContext,
		props.projectId,
		props.context.agentId,
		{
			channel: channel.value.channel,
			credentialId: channel.value.credentialId,
			field,
			query,
			cursor,
			guildId: guild.value?.id,
		},
	);
}
function save() {
	if (saveDisabledReason.value || creating.value) return;
	const base = {
		id: props.configuration?.id ?? `review_${generateNanoId()}`,
		name: name.value.trim(),
		nameOverridden: Boolean(customName.value.trim()),
		expirySeconds: expirySeconds.value === 'none' ? undefined : expirySeconds.value,
	};
	if (method.value === 'workflow')
		saveConfiguration({ ...base, method: 'workflow', workflowId: workflowId.value });
	else if (channel.value) {
		const destination =
			channel.value.channel === 'telegram'
				? { id: telegramId.value, name: telegramId.value, kind: 'user' as const }
				: recipient.value;
		if (!destination?.kind) return;
		saveConfiguration({
			...base,
			method: 'channel',
			channel: channel.value.channel,
			credentialId: channel.value.credentialId,
			recipient: {
				...destination,
				kind: destination.kind,
			},
			...(guild.value ? { guildId: guild.value.id } : {}),
		});
	}
}
const fieldsRef = ref<HTMLElement>();
const { width: fieldsWidth } = useElementSize(fieldsRef);
const rowLayout = computed(() => (fieldsWidth.value < 480 ? 'vertical' : 'horizontal'));
</script>

<template>
	<AgentModal
		:open="true"
		v-model:title="name"
		editable-title
		:busy="creating"
		stacked
		@update:open="emit('close')"
	>
		<div ref="fieldsRef" :class="$style.fields">
			<div :class="$style.destinationSettings">
				<AgentFormSettingRow
					:title="i18n.baseText('agents.hitl.method')"
					control-id="agent-hitl-method"
					:class="{ [$style.stackedMethodRow]: rowLayout === 'vertical' }"
				>
					<div :class="$style.methodChoices">
						<N8nText :color="method === 'workflow' ? 'text-dark' : 'text-light'">{{
							i18n.baseText('agents.hitl.workflowMethod')
						}}</N8nText>
						<N8nSwitch
							id="agent-hitl-method"
							:model-value="method === 'channel'"
							:disabled="loading || (!channels.length && method !== 'channel')"
							:aria-label="i18n.baseText('agents.hitl.method')"
							data-testid="agent-hitl-method"
							@update:model-value="updateMethod"
						/>
						<div :class="$style.channelMethodLabel">
							<N8nText :color="method === 'channel' ? 'text-dark' : 'text-light'">{{
								i18n.baseText('agents.hitl.channelMethod')
							}}</N8nText>
							<N8nText v-if="!loading && !channels.length" size="small" :class="$style.subtitle">{{
								i18n.baseText('agents.hitl.noChannels')
							}}</N8nText>
						</div>
					</div>
				</AgentFormSettingRow>
				<N8nSettingsRowGroup
					:class="$style.settingsGroup"
					data-testid="agent-hitl-destination-section"
				>
					<N8nSettingsRow
						v-if="method === 'workflow'"
						:title="i18n.baseText('agents.hitl.workflow')"
						:description="i18n.baseText('agents.hitl.workflowDescription')"
						:layout="rowLayout"
						action-max-width="66.666%"
						:class="{ [$style.stackedRow]: rowLayout === 'vertical' }"
					>
						<template #action>
							<div :class="$style.workflowRow">
								<N8nCombobox2
									size="large"
									:model-value="workflowId || undefined"
									v-model:open="workflowSelectOpen"
									:items="workflowItems"
									:loading="loading || creating"
									:disabled="creating"
									:teleported="false"
									:aria-label="i18n.baseText('agents.hitl.workflow')"
									:placeholder="i18n.baseText('agents.hitl.selectWorkflow')"
									:empty-text="i18n.baseText('agents.tools.workflow.empty.noResults')"
									data-testid="agent-hitl-workflow"
									@update:model-value="updateWorkflow"
								/>
								<N8nIconButton
									v-if="workflowHref"
									icon="external-link"
									variant="ghost"
									size="small"
									:href="workflowHref"
									target="_blank"
									rel="noopener noreferrer"
									:title="i18n.baseText('agents.toolConfig.workflow.target.open')"
									:aria-label="i18n.baseText('agents.toolConfig.workflow.target.open')"
									data-testid="agent-hitl-workflow-open"
								/>
							</div>
						</template>
					</N8nSettingsRow>
					<template v-else>
						<N8nSettingsRow
							:title="i18n.baseText('agents.hitl.channel')"
							:description="i18n.baseText('agents.hitl.channelDescription')"
							:layout="rowLayout"
							action-max-width="66.666%"
							:class="{ [$style.stackedRow]: rowLayout === 'vertical' }"
						>
							<template #action>
								<N8nSelect2
									:model-value="channelKey || undefined"
									:items="channelItems"
									:disabled="loading"
									size="large"
									:aria-label="i18n.baseText('agents.hitl.channel')"
									:class="$style.control"
									data-testid="agent-hitl-channel"
									@update:model-value="updateChannel"
								/>
							</template>
						</N8nSettingsRow>
						<N8nSettingsRow
							v-if="channel?.fields.some((field) => field.name === 'guild')"
							:title="i18n.baseText('agents.hitl.server')"
							:layout="rowLayout"
							action-max-width="66.666%"
							:class="{ [$style.stackedRow]: rowLayout === 'vertical' }"
						>
							<template #action>
								<AgentHitlDestinationPicker
									:class="$style.control"
									:key="`${channelKey}:guild`"
									v-model="guild"
									icon="server"
									:label="i18n.baseText('agents.hitl.server')"
									:load="(query, cursor) => loadOptions('guild', query, cursor)"
								/>
							</template>
						</N8nSettingsRow>
						<N8nSettingsRow
							v-if="channel?.channel === 'telegram'"
							:title="i18n.baseText('agents.hitl.recipient')"
							:description="i18n.baseText('agents.hitl.telegramHelp')"
							:layout="rowLayout"
							action-max-width="66.666%"
							:class="{ [$style.stackedRow]: rowLayout === 'vertical' }"
						>
							<template #action>
								<N8nInput
									v-model="telegramId"
									size="large"
									inputmode="numeric"
									:class="$style.control"
									data-testid="agent-hitl-telegram-user"
								/>
							</template>
						</N8nSettingsRow>
						<N8nSettingsRow
							v-else-if="channel && (channel.channel !== 'discord' || guild)"
							:title="i18n.baseText('agents.hitl.recipient')"
							:description="
								i18n.baseText(
									channel.channel === 'slack'
										? 'agents.hitl.slackChannelHelp'
										: 'agents.hitl.discordUserHelp',
								)
							"
							:layout="rowLayout"
							action-max-width="66.666%"
							:class="{ [$style.stackedRow]: rowLayout === 'vertical' }"
						>
							<template #action>
								<AgentHitlDestinationPicker
									:class="$style.control"
									:key="`${channelKey}:${guild?.id}`"
									v-model="recipient"
									icon="hash"
									:label="i18n.baseText('agents.hitl.recipient')"
									:load="(query, cursor) => loadOptions('recipient', query, cursor)"
								/>
							</template>
						</N8nSettingsRow>
					</template>
				</N8nSettingsRowGroup>
			</div>
			<section
				:class="$style.options"
				:aria-label="i18n.baseText('agents.hitl.options')"
				data-testid="agent-hitl-options-section"
			>
				<N8nText size="medium" bold>{{ i18n.baseText('agents.hitl.options') }}</N8nText>
				<N8nSettingsRowGroup :class="$style.settingsGroup">
					<N8nSettingsRow
						:title="i18n.baseText('agents.hitl.expiry')"
						:description="i18n.baseText('agents.hitl.expiryDescription')"
						:layout="rowLayout"
						action-max-width="66.666%"
						:class="{ [$style.stackedRow]: rowLayout === 'vertical' }"
					>
						<template #action>
							<N8nSelect2
								:model-value="String(expirySeconds)"
								@update:model-value="updateExpiry"
								size="large"
								:teleported="false"
								:items="[
									{ value: 'none', label: i18n.baseText('agents.hitl.expiry.none') },
									{ value: '3600', label: i18n.baseText('agents.hitl.expiry.hour') },
									{ value: '86400', label: i18n.baseText('agents.hitl.expiry.day') },
									{ value: '604800', label: i18n.baseText('agents.hitl.expiry.week') },
								]"
								:aria-label="i18n.baseText('agents.hitl.expiry')"
								:class="$style.control"
								data-testid="agent-hitl-expiry"
							/>
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow layout="custom">
						<AgentHitlToolsSelect
							embedded
							:model-value="selectedToolKeys"
							:config="context.getConfig()"
							:get-custom-tool-name="context.getCustomToolName"
							@update:model-value="updateTools"
						/>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</section>
		</div>
		<template v-if="configuration && !hideRemove" #footerLeft>
			<N8nButton variant="ghost" data-testid="agent-hitl-remove" @click="emit('remove')">
				<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
				{{ i18n.baseText('agents.builder.tools.remove') }}
			</N8nButton>
		</template>
		<template #footerActions>
			<N8nTooltip as-child :disabled="!saveDisabledReason" :teleported="false">
				<template #content>{{ saveDisabledReason }}</template>
				<span
					:class="$style.saveTrigger"
					:tabindex="saveDisabledReason ? 0 : undefined"
					data-testid="agent-hitl-save-trigger"
				>
					<N8nButton
						:label="i18n.baseText('agents.hitl.save')"
						:disabled="Boolean(saveDisabledReason) || creating"
						data-testid="agent-hitl-save"
						@click="save"
					/>
				</span>
			</N8nTooltip>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.destinationSettings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
.stackedMethodRow {
	flex-direction: column;
	align-items: flex-start;
}
.methodChoices {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}
.fields {
	container-type: inline-size;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
.workflowRow {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: center;
	gap: var(--spacing--2xs);

	> :first-child {
		min-width: 0;
	}
}
.saveTrigger {
	display: inline-flex;

	> button:disabled {
		pointer-events: none;
	}
}
.channelMethodLabel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	white-space: normal;
}
.subtitle {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtler);
}
.options {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.settingsGroup {
	background: transparent;
	overflow: visible;

	> :global([data-layout]) {
		padding: var(--spacing--sm) var(--spacing--md);
		min-height: 0;
	}

	> :global([data-layout='horizontal']),
	> :global([data-layout='vertical']) {
		> :first-child {
			min-height: 0;

			> :last-child {
				padding-block: 0;

				> :first-child {
					font-size: var(--font-size--sm);
				}

				> :not(:first-child),
				> :not(:first-child) :global(.n8n-text) {
					font-size: var(--font-size--2xs);
					color: var(--text-color--subtler);
				}
			}
		}
	}

	> :global([data-layout='vertical']) > :first-child {
		flex: 0 0 auto;
	}

	:global([data-test-id='settings-row-divider']) {
		inset-inline: 0;
	}
}
.control,
.workflowRow {
	width: max-content;
	min-width: calc((100cqi - 2 * var(--spacing--md)) / 3);
	max-width: 100%;
}
.stackedRow {
	.control,
	.workflowRow {
		width: 100%;
		min-width: 0;
	}
}
</style>
