<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { v4 as uuid } from 'uuid';
import {
	N8nButton,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nSwitch2,
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
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import type {
	ToolConnectionItem,
	WorkflowConnectionItem,
} from '@/features/shared/toolsConnection/types';
import { getAgentHitlChannels, getAgentHitlChannelOptions } from '../composables/useAgentApi';
import type { AgentHitlContext } from './agent-hitl.types';
import AgentModal from './modals/AgentModal.vue';
import AgentFormSettingRow from './AgentFormSettingRow.vue';
import AgentHitlDestinationPicker from './AgentHitlDestinationPicker.vue';

const props = defineProps<{
	projectId: string;
	context: AgentHitlContext;
	configuration?: AgentHitlConfiguration;
	nextNumber: number;
}>();
const emit = defineEmits<{
	save: [configuration: AgentHitlConfiguration];
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
const submitted = ref(false);
const titleError = computed(() =>
	submitted.value && !name.value.trim() ? i18n.baseText('agents.hitl.nameRequired') : '',
);
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
const workflowItems = computed<WorkflowConnectionItem[]>(() =>
	workflows.value.map((workflow) => ({
		id: workflow.id,
		workflowId: workflow.id,
		kind: 'workflow',
		title: workflow.name,
		status: workflow.id === workflowId.value ? 'connected' : 'none',
		iconSource: { type: 'icon', name: 'workflow' },
	})),
);
const recipientKinds = computed(
	() => channel.value?.fields.find((field) => field.name === 'recipient')?.kinds ?? [],
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
function selectWorkflow(item: ToolConnectionItem) {
	if (item.kind === 'workflow') workflowId.value = item.workflowId;
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
	submitted.value = true;
	if (!name.value.trim() || !destinationValid.value) return;
	const base = {
		id: props.configuration?.id ?? uuid(),
		name: name.value.trim(),
		disallowRequesterApproval: disallowRequesterApproval.value,
	};
	if (method.value === 'workflow')
		emit('save', { ...base, method: 'workflow', workflowId: workflowId.value });
	else if (channel.value) {
		const destination =
			channel.value.channel === 'telegram'
				? { id: telegramId.value, name: telegramId.value }
				: recipient.value;
		if (!destination) return;
		emit('save', {
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
		:title-error="titleError"
		:busy="creating"
		stable-height
		stacked
		@update:open="emit('close')"
	>
		<div :class="$style.fields">
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
			<N8nInputLabel :label="i18n.baseText('agents.hitl.method')">
				<N8nSelect v-model="method" :teleported="false" data-testid="agent-hitl-method">
					<N8nOption value="workflow" :label="i18n.baseText('agents.hitl.workflowMethod')" />
					<N8nOption value="channel" :label="i18n.baseText('agents.hitl.channelMethod')" />
				</N8nSelect>
			</N8nInputLabel>
			<div v-show="method === 'workflow'" :class="$style.workflowPicker">
				<N8nText color="text-light" size="small">{{
					i18n.baseText('agents.hitl.workflowHelp')
				}}</N8nText>
				<ToolsConnectionModal
					:open="method === 'workflow'"
					:items="workflowItems"
					:categories="['workflows']"
					embedded
					show-connect-actions
					persistent-scrollbar
					:loading="loading"
					:create-action="{
						category: 'workflows',
						label: i18n.baseText('generic.create.workflow'),
						description: i18n.baseText('agents.hitl.createWorkflowDescription'),
						testId: 'agent-hitl-create-workflow',
					}"
					:create-action-loading="creating"
					:search-placeholder="i18n.baseText('agents.tools.workflow.search.placeholder')"
					:empty-message="i18n.baseText('agents.hitl.noWorkflows')"
					:no-results-message="i18n.baseText('agents.tools.workflow.empty.noResults')"
					:connect-label="() => i18n.baseText('agents.hitl.selectWorkflow')"
					:connected-label="() => i18n.baseText('agents.hitl.selected')"
					@create="createWorkflow"
					@connect="selectWorkflow"
					@open-detail="selectWorkflow"
				/>
			</div>
			<template v-if="method === 'channel'">
				<N8nInputLabel :label="i18n.baseText('agents.hitl.channel')">
					<N8nSelect
						v-model="channelKey"
						:loading="loading"
						:teleported="false"
						data-testid="agent-hitl-channel"
					>
						<N8nOption
							v-for="item in channels"
							:key="`${item.channel}:${item.credentialId}`"
							:value="`${item.channel}:${item.credentialId}`"
							:label="
								channels.filter((other) => other.channel === item.channel).length > 1
									? `${item.label} ${channels.filter((other) => other.channel === item.channel).indexOf(item) + 1}`
									: item.label
							"
						/>
					</N8nSelect>
				</N8nInputLabel>
				<N8nText v-if="!loading && !channels.length" color="text-light">{{
					i18n.baseText('agents.hitl.noChannels')
				}}</N8nText>
				<N8nInputLabel
					v-if="channel?.fields.some((field) => field.name === 'guild')"
					:label="i18n.baseText('agents.hitl.server')"
				>
					<AgentHitlDestinationPicker
						:key="`${channelKey}:guild`"
						v-model="guild"
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
						<N8nSelect v-model="recipientKind" :teleported="false"
							><N8nOption
								v-for="kind in recipientKinds"
								:key="kind"
								:value="kind"
								:label="
									i18n.baseText(
										kind === 'user' ? 'agents.hitl.user' : 'agents.hitl.channelRecipient',
									)
								"
						/></N8nSelect>
					</N8nInputLabel>
					<N8nInputLabel :label="i18n.baseText('agents.hitl.recipient')">
						<AgentHitlDestinationPicker
							:key="`${channelKey}:${guild?.id}:${recipientKind}`"
							v-model="recipient"
							:label="i18n.baseText('agents.hitl.recipient')"
							:load="(query, cursor) => loadOptions(recipientKind, query, cursor)"
						/>
					</N8nInputLabel>
				</template>
				<N8nText
					v-if="channel?.channel === 'slack' && recipientKind === 'channel'"
					color="text-light"
					size="small"
					>{{ i18n.baseText('agents.hitl.slackChannelHelp') }}</N8nText
				>
				<N8nText
					v-if="channel?.channel === 'discord' && recipientKind === 'user'"
					color="text-light"
					size="small"
					>{{ i18n.baseText('agents.hitl.discordUserHelp') }}</N8nText
				>
			</template>
			<N8nText v-if="submitted && !destinationValid" color="danger" role="alert">{{
				i18n.baseText('agents.hitl.destinationRequired')
			}}</N8nText>
			<N8nText size="small" color="text-light">{{ i18n.baseText('agents.hitl.noExpiry') }}</N8nText>
		</div>
		<template v-if="configuration" #footerLeft
			><N8nButton
				type="tertiary"
				icon="trash-2"
				:label="i18n.baseText('generic.remove')"
				@click="emit('remove')"
		/></template>
		<template #footerActions
			><N8nButton :label="i18n.baseText('agents.hitl.save')" @click="save"
		/></template>
	</AgentModal>
</template>

<style module lang="scss">
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
.workflowPicker {
	display: flex;
	flex-direction: column;
	min-height: 0;
	gap: var(--spacing--sm);
}
.workflowPicker > :last-child {
	height: calc(var(--height--xl) * 8);
	min-height: 0;
}
</style>
