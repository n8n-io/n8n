<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { v4 as uuid } from 'uuid';
import {
	N8nButton,
	N8nCombobox2,
	N8nIcon,
	type ComboboxItem,
	N8nInput,
	N8nInputLabel,
	N8nSelect2,
	type SelectOptionBase,
	N8nText,
	N8nSwitch2,
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
const name = ref(
	props.configuration?.name ??
		i18n.baseText('agents.hitl.defaultName', { interpolate: { number: String(props.nextNumber) } }),
);
const disallowRequesterApproval = ref(props.configuration?.disallowRequesterApproval ?? false);
const expirySeconds = ref<AgentHitlConfiguration['expirySeconds'] | 'none'>(
	props.configuration?.expirySeconds ?? 'none',
);
const method = ref<'workflow' | 'channel'>(props.configuration?.method ?? 'workflow');
const workflowId = ref(
	props.configuration?.method === 'workflow' ? props.configuration.workflowId : '',
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
function updateMethod(value: unknown) {
	if (value === 'workflow' || value === 'channel') method.value = value;
}
function updateRecipientKind(value: unknown) {
	if (value === 'channel' || value === 'user') recipientKind.value = value;
}
function updateExpiry(value: unknown) {
	if (value === 'none' || value === 3600 || value === 86400 || value === 604800)
		expirySeconds.value = value;
}
function updateChannel(value: unknown) {
	channelKey.value = typeof value === 'string' ? value : '';
}
const recipientKind = ref<'channel' | 'user'>(
	props.configuration?.method === 'channel' ? props.configuration.recipient.kind : 'channel',
);
const recipient = ref<AgentHitlOption | undefined>(
	props.configuration?.method === 'channel'
		? {
				id: props.configuration.recipient.id,
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
const loading = ref(false);
const creating = ref(false);
const destinationValid = computed(() =>
	method.value === 'workflow'
		? Boolean(workflowId.value)
		: Boolean(
				channel.value &&
					(channel.value.channel === 'telegram'
						? /^\d+$/.test(telegramId.value)
						: recipient.value && (channel.value.channel !== 'discord' || guild.value)),
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
const recipientKinds = computed(
	() => channel.value?.fields.find((field) => field.name === 'recipient')?.kinds ?? [],
);
const recipientItems = computed(() =>
	recipientKinds.value.map<SelectOptionBase>((kind) => ({
		value: kind,
		label: i18n.baseText(kind === 'user' ? 'agents.hitl.user' : 'agents.hitl.channelRecipient'),
		icon: kind === 'user' ? 'user' : 'hash',
	})),
);
watch(channelKey, () => {
	recipient.value = undefined;
	guild.value = undefined;
	telegramId.value = '';
	recipientKind.value = recipientKinds.value[0] ?? 'user';
});
watch(recipientKind, () => {
	recipient.value = undefined;
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
					name: 'Agent decision',
					type: AGENT_DECISION_TRIGGER_NODE_TYPE,
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: uuid(),
					name: 'Respond to Agent decision',
					type: 'n8n-nodes-base.agentDecisionResponse',
					typeVersion: 1,
					position: [480, 0],
					parameters: { approved: false },
				},
			],
			connections: {
				'Agent decision': {
					main: [[{ node: 'Respond to Agent decision', type: 'main', index: 0 }]],
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
async function loadOptions(field: 'guild' | 'channel' | 'user', query: string, cursor?: string) {
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
		id: props.configuration?.id ?? uuid(),
		name: name.value.trim(),
		disallowRequesterApproval: disallowRequesterApproval.value,
		expirySeconds: expirySeconds.value === 'none' ? undefined : expirySeconds.value,
	};
	if (method.value === 'workflow')
		saveConfiguration({ ...base, method: 'workflow', workflowId: workflowId.value });
	else if (channel.value) {
		const destination =
			channel.value.channel === 'telegram'
				? { id: telegramId.value, name: telegramId.value }
				: recipient.value;
		if (!destination) return;
		saveConfiguration({
			...base,
			method: 'channel',
			channel: channel.value.channel,
			credentialId: channel.value.credentialId,
			recipient: {
				kind: channel.value.channel === 'telegram' ? 'user' : recipientKind.value,
				...destination,
			},
			...(guild.value ? { guildId: guild.value.id } : {}),
		});
	}
}
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
		<div :class="$style.fields">
			<N8nInputLabel :label="i18n.baseText('agents.hitl.method')">
				<N8nSelect2
					:model-value="method"
					@update:model-value="updateMethod"
					size="large"
					:items="[
						{ value: 'workflow', label: i18n.baseText('agents.hitl.workflowMethod') },
						{
							value: 'channel',
							label: i18n.baseText('agents.hitl.channelMethod'),
							disabled: !channels.length,
						},
					]"
					:aria-label="i18n.baseText('agents.hitl.method')"
					data-testid="agent-hitl-method"
				>
					<template #item-label="{ item }">
						<span :class="$style.channelMethodLabel">
							<span>{{ item.label }}</span>
							<N8nText
								v-if="item.value === 'channel' && !loading && !channels.length"
								size="small"
								color="text-light"
							>
								{{ i18n.baseText('agents.hitl.noChannels') }}
							</N8nText>
						</span>
					</template>
				</N8nSelect2>
			</N8nInputLabel>
			<N8nInputLabel v-if="method === 'workflow'" :label="i18n.baseText('agents.hitl.workflow')">
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
			</N8nInputLabel>
			<template v-if="method === 'channel'">
				<N8nInputLabel :label="i18n.baseText('agents.hitl.channel')">
					<N8nSelect2
						:model-value="channelKey || undefined"
						:items="channelItems"
						:disabled="loading"
						size="large"
						:aria-label="i18n.baseText('agents.hitl.channel')"
						data-testid="agent-hitl-channel"
						@update:model-value="updateChannel"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					v-if="channel?.fields.some((field) => field.name === 'guild')"
					:label="i18n.baseText('agents.hitl.server')"
				>
					<AgentHitlDestinationPicker
						:key="`${channelKey}:guild`"
						v-model="guild"
						icon="server"
						:label="i18n.baseText('agents.hitl.server')"
						:load="(query, cursor) => loadOptions('guild', query, cursor)"
					/>
				</N8nInputLabel>
				<template v-if="channel?.channel === 'telegram'">
					<N8nInputLabel :label="i18n.baseText('agents.hitl.telegramUserId')"
						><N8nInput
							v-model="telegramId"
							inputmode="numeric"
							data-testid="agent-hitl-telegram-user"
					/></N8nInputLabel>
					<N8nText color="text-light" size="small">{{
						i18n.baseText('agents.hitl.telegramHelp')
					}}</N8nText>
				</template>
				<template v-else-if="channel && (channel.channel !== 'discord' || guild)">
					<N8nInputLabel :label="i18n.baseText('agents.hitl.recipientType')">
						<N8nSelect2
							:model-value="recipientKind"
							@update:model-value="updateRecipientKind"
							size="large"
							:items="recipientItems"
							:aria-label="i18n.baseText('agents.hitl.recipientType')"
							data-testid="agent-hitl-recipient-type"
						/>
					</N8nInputLabel>
					<N8nInputLabel :label="i18n.baseText('agents.hitl.recipient')">
						<N8nText
							v-if="channel.channel === 'slack' && recipientKind === 'channel'"
							:class="$style.selectorSubtitle"
							color="text-light"
							size="small"
							>{{ i18n.baseText('agents.hitl.slackChannelHelp') }}</N8nText
						>
						<AgentHitlDestinationPicker
							:key="`${channelKey}:${guild?.id}:${recipientKind}`"
							v-model="recipient"
							:icon="recipientKind === 'user' ? 'user' : 'hash'"
							:label="i18n.baseText('agents.hitl.recipient')"
							:load="(query, cursor) => loadOptions(recipientKind, query, cursor)"
						/>
					</N8nInputLabel>
				</template>
				<N8nText
					v-if="channel?.channel === 'discord' && recipientKind === 'user'"
					color="text-light"
					size="small"
					>{{ i18n.baseText('agents.hitl.discordUserHelp') }}</N8nText
				>
			</template>
			<N8nInputLabel :label="i18n.baseText('agents.hitl.tools')">
				<AgentHitlToolsSelect
					:model-value="selectedToolKeys"
					:config="context.getConfig()"
					:get-custom-tool-name="context.getCustomToolName"
					@update:model-value="updateTools"
				/>
			</N8nInputLabel>
			<N8nInputLabel :label="i18n.baseText('agents.hitl.expiry')">
				<N8nSelect2
					:model-value="expirySeconds"
					@update:model-value="updateExpiry"
					size="large"
					:items="[
						{ value: 'none', label: i18n.baseText('agents.hitl.expiry.none') },
						{ value: 3600, label: i18n.baseText('agents.hitl.expiry.hour') },
						{ value: 86400, label: i18n.baseText('agents.hitl.expiry.day') },
						{ value: 604800, label: i18n.baseText('agents.hitl.expiry.week') },
					]"
					:aria-label="i18n.baseText('agents.hitl.expiry')"
					data-testid="agent-hitl-expiry"
				/>
			</N8nInputLabel>
			<N8nText size="small" color="text-light">{{
				i18n.baseText('agents.hitl.expiryHelp')
			}}</N8nText>
			<AgentFormSettingRow
				control-id="agent-hitl-disallow-requester"
				:title="i18n.baseText('agents.hitl.disallowRequester')"
				:description="i18n.baseText('agents.hitl.disallowRequesterHelp')"
			>
				<N8nSwitch2
					id="agent-hitl-disallow-requester"
					v-model="disallowRequesterApproval"
					:aria-label="i18n.baseText('agents.hitl.disallowRequester')"
					data-testid="agent-hitl-disallow-requester"
				/>
			</AgentFormSettingRow>
		</div>
		<template v-if="configuration" #footerLeft>
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
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
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
.selectorSubtitle {
	margin-bottom: var(--spacing--2xs);
}
</style>
